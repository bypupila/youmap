import { createHash } from "crypto";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

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
    if (!(await tableExists("public", "security_request_rate_limits"))) {
      return { allowed: true as const, retryAfterSeconds: null as number | null };
    }
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
