import { createHash } from "crypto";
import { sql } from "@/lib/neon";

let ensureRequestRateLimitTablePromise: Promise<void> | null = null;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readClientIp(request: Request) {
  const forwardedFor = String(request.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    ?.trim();
  if (forwardedFor) return forwardedFor;
  return String(request.headers.get("x-real-ip") || "").trim();
}

function readUserAgent(request: Request) {
  return String(request.headers.get("user-agent") || "").trim();
}

async function ensureRequestRateLimitTable() {
  if (!ensureRequestRateLimitTablePromise) {
    ensureRequestRateLimitTablePromise = (async () => {
      await sql`
        create table if not exists public.security_request_rate_limits (
          id bigserial primary key,
          scope text not null,
          actor_hash text not null,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists security_request_rate_limits_scope_actor_created_idx
        on public.security_request_rate_limits (scope, actor_hash, created_at desc)
      `;
      await sql`
        create index if not exists security_request_rate_limits_created_idx
        on public.security_request_rate_limits (created_at desc)
      `;
    })();
  }

  return ensureRequestRateLimitTablePromise;
}

function resolveActorHash(request: Request) {
  const ip = readClientIp(request);
  if (ip) return hashValue(`ip:${ip}`);

  const userAgent = readUserAgent(request);
  if (userAgent) return hashValue(`ua:${userAgent}`);

  return null;
}

export async function enforceRequestRateLimit(params: {
  request: Request;
  scope: string;
  windowMinutes: number;
  maxAttempts: number;
}) {
  const { request, scope, windowMinutes, maxAttempts } = params;
  const actorHash = resolveActorHash(request);
  if (!actorHash) {
    // If we cannot fingerprint the actor, avoid hard-failing legitimate traffic.
    return { allowed: true as const, retryAfterSeconds: null as number | null };
  }

  try {
    await ensureRequestRateLimitTable();
    const rows = await sql<Array<{ attempts: number }>>`
      select count(*)::int as attempts
      from public.security_request_rate_limits
      where scope = ${scope}
        and actor_hash = ${actorHash}
        and created_at >= now() - ${`${windowMinutes} minutes`}::interval
    `;
    const attempts = rows[0]?.attempts || 0;
    if (attempts >= maxAttempts) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(60, Math.ceil((windowMinutes * 60) / Math.max(1, maxAttempts))),
      };
    }

    await sql`
      insert into public.security_request_rate_limits (scope, actor_hash, created_at)
      values (${scope}, ${actorHash}, now())
    `;
    if (Math.random() < 0.01) {
      await sql`
        delete from public.security_request_rate_limits
        where created_at < now() - interval '7 days'
      `;
    }
    return { allowed: true as const, retryAfterSeconds: null as number | null };
  } catch (error) {
    console.error("[request-rate-limit] failed, allowing request", { scope, error });
    return { allowed: true as const, retryAfterSeconds: null as number | null };
  }
}
