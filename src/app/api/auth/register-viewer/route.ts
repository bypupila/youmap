import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth-password";
import { normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";
import { setSessionCookie } from "@/lib/auth-session";
import { normalizeAttributionChannelId } from "@/lib/creator-viewer-subscriptions";
import { normalizeAppUserRole } from "@/lib/current-user";
import { buildWelcomeEmail, sendAppEmail } from "@/lib/email";
import { sql } from "@/lib/neon";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payloadSchema = z
  .object({
    displayName: z.string().trim().min(1, "Escribe tu nombre."),
    email: z.string().trim().email("Escribe un email válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128),
    countryCode: z.string().trim().length(2),
    city: z.string().trim().min(1),
    hasYouTubeTravelChannel: z.boolean().optional().default(false),
    youtubeChannelUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    acceptTerms: z.boolean().optional().default(false),
    consentPlatformPromotions: z.boolean().optional().default(false),
    consentCreatorPromotions: z.boolean().optional().default(false),
    consentVersion: z.string().trim().min(1).default("v1"),
    registrationSource: z.enum(["platform", "creator_map"]).optional().default("platform"),
    registrationChannelId: z.string().trim().optional().nullable(),
    utmSource: z.string().trim().max(120).optional().nullable(),
    utmMedium: z.string().trim().max(120).optional().nullable(),
    utmCampaign: z.string().trim().max(160).optional().nullable(),
  })
  .strict();

async function buildUniqueViewerUsername(email: string) {
  const local = normalizeUsername(email.split("@")[0] || "viewer");
  const base = (local.replace(/[^a-z0-9._-]/g, "").slice(0, 18) || "viewer").replace(/[._-]+$/g, "") || "viewer";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Math.floor(Math.random() * 9000 + 1000)}`;
    const candidate = normalizeUsername(`${base}${suffix}`).slice(0, 30) || `viewer-${Math.floor(Math.random() * 90000 + 10000)}`;
    const existsRows = await sql<Array<{ id: string }>>`
      select id
      from public.users
      where username = ${candidate}
      limit 1
    `;
    if (!existsRows[0]?.id) return candidate;
  }
  return `viewer-${Date.now().toString(36)}`.slice(0, 30);
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRequestRateLimit({
      request,
      scope: "api:auth-register-viewer",
      windowMinutes: 15,
      maxAttempts: 8,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Reintenta en unos minutos." },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
        }
      );
    }

    const payload = payloadSchema.parse(await request.json());
    if (!payload.acceptTerms) {
      return NextResponse.json({ error: "Debes aceptar términos para crear tu cuenta." }, { status: 400 });
    }

    const email = normalizeEmail(payload.email);
    const countryCode = payload.countryCode.toUpperCase();
    const city = payload.city.trim();
    const registrationChannelId = normalizeAttributionChannelId(payload.registrationChannelId);

    const existingRows = await sql<Array<{ id: string; username: string; role: string | null }>>`
      select id, username, role::text as role
      from public.users
      where email = ${email}
      limit 1
    `;
    const existing = existingRows[0] || null;
    if (existing && normalizeAppUserRole(existing.role) !== "viewer") {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email. Inicia sesión." }, { status: 409 });
    }

    const userId = existing?.id || randomUUID();
    const username = existing?.username || (await buildUniqueViewerUsername(email));
    const now = new Date().toISOString();
    const currentStateRows = existing
      ? await sql<Array<{ has_credentials: boolean; has_profile: boolean; consent_types: number }>>`
          select
            exists (
              select 1
              from public.user_credentials uc
              where uc.user_id = ${userId}
            ) as has_credentials,
            exists (
              select 1
              from public.viewer_profiles vp
              where vp.user_id = ${userId}
            ) as has_profile,
            (
              select count(distinct consent_type)::int
              from public.user_consents uc
              where uc.user_id = ${userId}
                and uc.consent_type in ('account_operation', 'platform_promotions', 'creator_promotions')
            ) as consent_types
        `
      : [{ has_credentials: false, has_profile: false, consent_types: 0 }];
    const currentState = currentStateRows[0] || {
      has_credentials: false,
      has_profile: false,
      consent_types: 0,
    };
    const hasSubscriptionRows =
      existing && registrationChannelId
        ? await sql<Array<{ has_subscription: boolean }>>`
            select exists (
              select 1
              from public.creator_viewer_subscriptions cvs
              where cvs.viewer_user_id = ${userId}
                and cvs.channel_id = ${registrationChannelId}
            ) as has_subscription
          `
        : [{ has_subscription: false }];
    const hasSubscription = Boolean(hasSubscriptionRows[0]?.has_subscription);

    const registrationAlreadyComplete =
      Boolean(existing) &&
      currentState.has_credentials &&
      currentState.has_profile &&
      currentState.consent_types >= 3 &&
      (!registrationChannelId || hasSubscription);

    if (registrationAlreadyComplete) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email. Inicia sesión." }, { status: 409 });
    }

    await sql.transaction((txn) => {
      const queries = [
        txn`
          insert into public.users (id, email, username, display_name, role, updated_at)
          values (${userId}, ${email}, ${username}, ${payload.displayName.trim()}, 'viewer', ${now})
          on conflict (email)
          do update set
            display_name = excluded.display_name,
            role = 'viewer',
            updated_at = excluded.updated_at
        `,
        txn`
          insert into public.user_credentials (user_id, password_hash, updated_at)
          values (${userId}, ${hashPassword(payload.password)}, ${now})
          on conflict (user_id)
          do update set
            password_hash = excluded.password_hash,
            updated_at = excluded.updated_at
        `,
        txn`
          insert into public.viewer_profiles (
            user_id,
            country_code,
            city,
            has_youtube_travel_channel,
            youtube_channel_url,
            registration_source,
            registration_channel_id,
            registration_utm_source,
            registration_utm_medium,
            registration_utm_campaign,
            created_at,
            updated_at
          )
          values (
            ${userId},
            ${countryCode},
            ${city},
            ${payload.hasYouTubeTravelChannel},
            ${String(payload.youtubeChannelUrl || "").trim() || null},
            ${registrationChannelId ? payload.registrationSource : "platform"},
            ${registrationChannelId},
            ${payload.utmSource || null},
            ${payload.utmMedium || null},
            ${payload.utmCampaign || null},
            ${now},
            ${now}
          )
          on conflict (user_id)
          do update set
            country_code = excluded.country_code,
            city = excluded.city,
            has_youtube_travel_channel = excluded.has_youtube_travel_channel,
            youtube_channel_url = excluded.youtube_channel_url,
            registration_source = excluded.registration_source,
            registration_channel_id = excluded.registration_channel_id,
            registration_utm_source = excluded.registration_utm_source,
            registration_utm_medium = excluded.registration_utm_medium,
            registration_utm_campaign = excluded.registration_utm_campaign,
            updated_at = excluded.updated_at
        `,
        txn`
          delete from public.user_consents
          where user_id = ${userId}
        `,
        txn`
          insert into public.user_consents (user_id, consent_type, accepted, consent_version, accepted_at, metadata, created_at, updated_at)
          values
            (${userId}, 'account_operation', true, ${payload.consentVersion}, ${now}, ${JSON.stringify({ source: payload.registrationSource, channelId: registrationChannelId })}::jsonb, ${now}, ${now}),
            (${userId}, 'platform_promotions', ${payload.consentPlatformPromotions}, ${payload.consentVersion}, ${now}, '{}'::jsonb, ${now}, ${now}),
            (${userId}, 'creator_promotions', ${payload.consentCreatorPromotions}, ${payload.consentVersion}, ${now}, '{}'::jsonb, ${now}, ${now})
        `,
      ];

      if (registrationChannelId) {
        queries.push(
          txn`
            with channel_owner as (
              select user_id as creator_user_id
              from public.channels
              where id = ${registrationChannelId}
                and is_public = true
              limit 1
            )
            insert into public.creator_viewer_subscriptions (
              channel_id,
              creator_user_id,
              viewer_user_id,
              source,
              registration_utm_source,
              registration_utm_medium,
              registration_utm_campaign,
              subscribed_at,
              unsubscribed_at,
              updated_at
            )
            select
              ${registrationChannelId},
              channel_owner.creator_user_id,
              ${userId},
              'viewer_register',
              ${payload.utmSource || null},
              ${payload.utmMedium || null},
              ${payload.utmCampaign || null},
              now(),
              null,
              now()
            from channel_owner
            where channel_owner.creator_user_id is not null
              and channel_owner.creator_user_id <> ${userId}
            on conflict (channel_id, viewer_user_id)
            do update set
              source = excluded.source,
              creator_user_id = excluded.creator_user_id,
              registration_utm_source = coalesce(excluded.registration_utm_source, public.creator_viewer_subscriptions.registration_utm_source),
              registration_utm_medium = coalesce(excluded.registration_utm_medium, public.creator_viewer_subscriptions.registration_utm_medium),
              registration_utm_campaign = coalesce(excluded.registration_utm_campaign, public.creator_viewer_subscriptions.registration_utm_campaign),
              unsubscribed_at = null,
              updated_at = excluded.updated_at
          `
        );
      }

      return queries;
    });

    const creatorSubscriptionId = registrationChannelId
      ? (
          await sql<Array<{ id: string }>>`
            select id
            from public.creator_viewer_subscriptions
            where viewer_user_id = ${userId}
              and channel_id = ${registrationChannelId}
            limit 1
          `
        )[0]?.id || null
      : null;

    const response = NextResponse.json({
      ok: true,
      user_id: userId,
      username,
      role: "viewer",
      country_code: countryCode,
      city,
      creator_subscription_id: creatorSubscriptionId,
    });
    setSessionCookie(response, userId, request.headers.get("host"));

    const welcomeEmail = buildWelcomeEmail({
      displayName: payload.displayName.trim(),
      role: "viewer",
    });
    const emailResult = await sendAppEmail({
      from: "noreply",
      to: email,
      subject: welcomeEmail.subject,
      text: welcomeEmail.text,
      html: welcomeEmail.html,
    });
    if (!emailResult.sent) {
      console.warn("[api/auth/register-viewer] welcome email skipped", emailResult.error);
    }

    return response;
  } catch (error) {
    console.error("[api/auth/register-viewer POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos para registro viewer.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo registrar el viewer." }, { status: 400 });
  }
}
