import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";
import { verifyPassword } from "@/lib/auth-password";
import { setSessionCookie } from "@/lib/auth-session";
import { normalizeAttributionChannelId, upsertCreatorViewerSubscription } from "@/lib/creator-viewer-subscriptions";
import { tableExists } from "@/lib/db-schema";
import { normalizeAppUserRole } from "@/lib/current-user";
import { sql } from "@/lib/neon";
import { getPostHogClient } from "@/lib/posthog-server";

const payloadSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
  registrationChannelId: z.string().trim().optional().nullable(),
  utmSource: z.string().trim().max(120).optional().nullable(),
  utmMedium: z.string().trim().max(120).optional().nullable(),
  utmCampaign: z.string().trim().max(160).optional().nullable(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS_PER_WINDOW = 10;

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

async function hasTooManyRecentFailures(identifierHash: string, ipHash: string | null) {
  try {
    if (!(await tableExists("public", "auth_login_attempts"))) {
      return false;
    }
    const rows = ipHash
      ? await sql<Array<{ attempts: number }>>`
          select count(*)::int as attempts
          from public.auth_login_attempts
          where created_at >= now() - ${`${LOGIN_WINDOW_MINUTES} minutes`}::interval
            and (identifier_hash = ${identifierHash} or ip_hash = ${ipHash})
        `
      : await sql<Array<{ attempts: number }>>`
          select count(*)::int as attempts
          from public.auth_login_attempts
          where created_at >= now() - ${`${LOGIN_WINDOW_MINUTES} minutes`}::interval
            and identifier_hash = ${identifierHash}
        `;
    return (rows[0]?.attempts || 0) >= MAX_FAILED_ATTEMPTS_PER_WINDOW;
  } catch (error) {
    console.error("[api/auth/login] rate-limit check failed", error);
    return false;
  }
}

async function recordFailedLoginAttempt(identifierHash: string, ipHash: string | null) {
  try {
    if (!(await tableExists("public", "auth_login_attempts"))) {
      return;
    }
    await sql`
      insert into public.auth_login_attempts (identifier_hash, ip_hash, created_at)
      values (${identifierHash}, ${ipHash}, now())
    `;
  } catch (error) {
    console.error("[api/auth/login] failed to record login attempt", error);
  }
}

async function clearRecentFailedAttempts(identifierHash: string, ipHash: string | null) {
  try {
    if (!(await tableExists("public", "auth_login_attempts"))) {
      return;
    }
    if (ipHash) {
      await sql`
        delete from public.auth_login_attempts
        where created_at >= now() - ${`${LOGIN_WINDOW_MINUTES} minutes`}::interval
          and (identifier_hash = ${identifierHash} or ip_hash = ${ipHash})
      `;
      return;
    }

    await sql`
      delete from public.auth_login_attempts
      where created_at >= now() - ${`${LOGIN_WINDOW_MINUTES} minutes`}::interval
        and identifier_hash = ${identifierHash}
    `;
  } catch (error) {
    console.error("[api/auth/login] failed to clear login attempts", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const identifier = String(payload.identifier || "").trim();
    const isEmail = identifier.includes("@");
    const normalizedIdentifier = isEmail ? normalizeEmail(identifier) : normalizeUsername(identifier);
    const identifierHash = hashValue(normalizedIdentifier);
    const ipValue = readClientIp(request);
    const ipHash = ipValue ? hashValue(ipValue) : null;

    if (await hasTooManyRecentFailures(identifierHash, ipHash)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Reintenta en unos minutos." },
        { status: 429 }
      );
    }

    const userRows = isEmail
      ? await sql<
          Array<{ id: string; email: string; username: string; display_name: string; role: string | null }>
        >`
          select id, email, username, display_name, role::text as role
          from public.users
          where email = ${normalizedIdentifier}
          limit 1
        `
      : await sql<
          Array<{ id: string; email: string; username: string; display_name: string; role: string | null }>
        >`
          select id, email, username, display_name, role::text as role
          from public.users
          where username = ${normalizedIdentifier}
          limit 1
        `;

    const user = userRows[0];
    if (!user) {
      await recordFailedLoginAttempt(identifierHash, ipHash);
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const credentials = await sql<Array<{ password_hash: string }>>`
      select password_hash
      from public.user_credentials
      where user_id = ${user.id}
      limit 1
    `;
    const storedHash = credentials[0]?.password_hash || "";
    if (!storedHash || !verifyPassword(payload.password, storedHash)) {
      await recordFailedLoginAttempt(identifierHash, ipHash);
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    await clearRecentFailedAttempts(identifierHash, ipHash);
    const normalizedRole = normalizeAppUserRole(user.role);
    const registrationChannelId = normalizeAttributionChannelId(payload.registrationChannelId);
    const creatorSubscriptionId =
      normalizedRole === "viewer"
        ? await upsertCreatorViewerSubscription({
            channelId: registrationChannelId,
            viewerUserId: user.id,
            source: "viewer_login",
            utmSource: payload.utmSource,
            utmMedium: payload.utmMedium,
            utmCampaign: payload.utmCampaign,
          })
        : null;

    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        username: user.username,
        display_name: user.display_name,
      },
    });
    posthog.capture({
      distinctId: user.id,
      event: "user_logged_in",
      properties: {
        username: user.username,
        identifier_type: isEmail ? "email" : "username",
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        role: normalizedRole,
      },
      creator_subscription_id: creatorSubscriptionId,
    });
    setSessionCookie(response, user.id, request.headers.get("host"));
    return response;
  } catch (error) {
    console.error("[api/auth/login]", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 400 }
    );
  }
}
