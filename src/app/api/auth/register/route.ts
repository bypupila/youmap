import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { importYoutubeChannel } from "@/lib/youtube-import";
import { hashPassword } from "@/lib/auth-password";
import { setSessionCookie } from "@/lib/auth-session";
import { isValidUsername, normalizeEmail, normalizeUsername, toPublicMapPath } from "@/lib/auth-identifiers";
import { sql } from "@/lib/neon";
import { getPostHogClient } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payloadSchema = z.object({
  displayName: z.string().trim().min(1, "Escribe tu nombre."),
  email: z.string().trim().email("Escribe un email válido."),
  username: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128),
  selectedPlan: z.string().trim().min(2, "Selecciona un plan."),
  channelUrl: z.string().min(3).optional().nullable(),
  youtubeChannelId: z.string().min(8).optional().nullable(),
  activateWithoutPayment: z.boolean().optional().default(false),
  deferImportToProcessing: z.boolean().optional().default(false),
});

function buildValidationMessage(error: z.ZodError) {
  const firstIssue = error.issues[0];
  const field = String(firstIssue?.path?.[0] || "");
  const fallback = "Revisa los datos de registro e inténtalo de nuevo.";
  if (!firstIssue) return fallback;

  if (field === "displayName") return "Escribe tu nombre para continuar.";
  if (field === "email") return "Escribe un email válido para continuar.";
  if (field === "username") return "Elige un usuario válido (mínimo 3 caracteres).";
  if (field === "password") return "La contraseña debe tener al menos 8 caracteres.";
  if (field === "selectedPlan") return "Selecciona un plan para continuar.";
  if (field === "channelUrl" || field === "youtubeChannelId") return "Revisa el canal de YouTube e inténtalo de nuevo.";

  return firstIssue.message || fallback;
}

function buildChannelInput(payload: z.infer<typeof payloadSchema>) {
  const youtubeChannelId = String(payload.youtubeChannelId || "").trim();
  if (youtubeChannelId) return youtubeChannelId;

  const channelUrl = String(payload.channelUrl || "").trim();
  if (channelUrl) return channelUrl;

  return null;
}

async function upsertTrialSubscription(args: { userId: string; selectedPlan: string }) {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const manualSubscriptionId = `manual-test-${args.userId}`;

  const planRows = await sql<Array<{ id: string }>>`
    select id
    from public.subscription_plans
    where slug = ${args.selectedPlan}
    limit 1
  `;
  const planId = planRows[0]?.id || null;

  await sql`
    insert into public.subscriptions (
      user_id,
      plan_id,
      polar_subscription_id,
      polar_customer_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      metadata,
      updated_at
    )
    values (
      ${args.userId},
      ${planId},
      ${manualSubscriptionId},
      'manual-test',
      'trialing',
      ${now.toISOString()},
      ${trialEnd.toISOString()},
      false,
      ${JSON.stringify({ source: "manual_test_mode" })}::jsonb,
      ${now.toISOString()}
    )
    on conflict (polar_subscription_id)
    do update set
      user_id = excluded.user_id,
      plan_id = excluded.plan_id,
      polar_customer_id = excluded.polar_customer_id,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `;
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const username = normalizeUsername(payload.username);
    const email = normalizeEmail(payload.email);
    const displayName = payload.displayName.trim();
    const selectedPlan = payload.selectedPlan.trim();

    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          error:
            "El usuario debe tener 3-30 caracteres en minúsculas (a-z, 0-9, ., _, -).",
        },
        { status: 400 }
      );
    }

    const channelInput = buildChannelInput(payload);
    if (payload.activateWithoutPayment && !channelInput) {
      return NextResponse.json(
        { error: "Para procesar sin pago necesitamos la URL o ID del canal de YouTube." },
        { status: 400 }
      );
    }

    const existingByUsernameRows = await sql<Array<{ id: string; email: string; username: string }>>`
      select id, email, username
      from public.users
      where username = ${username}
      limit 1
    `;
    const existingByEmailRows = await sql<Array<{ id: string; email: string; username: string }>>`
      select id, email, username
      from public.users
      where email = ${email}
      limit 1
    `;

    const existingByUsername = existingByUsernameRows[0] || null;
    const existingByEmail = existingByEmailRows[0] || null;

    if (existingByUsername && existingByUsername.email !== email) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
    }

    const userId = existingByEmail?.id || existingByUsername?.id || randomUUID();
    const nowIso = new Date().toISOString();
    const passwordHash = hashPassword(payload.password);

    await sql`
      insert into public.users (id, email, username, display_name, role, updated_at)
      values (${userId}, ${email}, ${username}, ${displayName}, 'creator', ${nowIso})
      on conflict (id)
      do update set
        email = excluded.email,
        username = excluded.username,
        display_name = excluded.display_name,
        updated_at = excluded.updated_at
    `;

    await sql`
      insert into public.user_credentials (user_id, password_hash, updated_at)
      values (${userId}, ${passwordHash}, ${nowIso})
      on conflict (user_id)
      do update set
        password_hash = excluded.password_hash,
        updated_at = excluded.updated_at
    `;

    await sql`
      insert into public.onboarding_state (
        user_id,
        current_step,
        completed_steps,
        selected_plan,
        youtube_channel_id,
        is_complete,
        demo_mode,
        last_seen_at,
        updated_at
      )
      values (
        ${userId},
        'plan',
        array['welcome', 'youtube']::text[],
        ${selectedPlan},
        ${channelInput},
        false,
        false,
        ${nowIso},
        ${nowIso}
      )
      on conflict (user_id)
      do update set
        current_step = excluded.current_step,
        completed_steps = excluded.completed_steps,
        selected_plan = excluded.selected_plan,
        youtube_channel_id = excluded.youtube_channel_id,
        is_complete = excluded.is_complete,
        demo_mode = excluded.demo_mode,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `;

    let channelId: string | null = null;
    let importSummary: {
      importedVideos: number;
      mappedVideos: number;
      skippedVideos: number;
    } | null = null;
    let importError: string | null = null;

    if (payload.activateWithoutPayment) {
      await upsertTrialSubscription({
        userId,
        selectedPlan,
      });

      if (channelInput && !payload.deferImportToProcessing) {
        try {
          const importResult = await importYoutubeChannel({
            userId,
            channelUrl: channelInput,
          });
          channelId = importResult.channel.id;
          importSummary = {
            importedVideos: importResult.importedVideos,
            mappedVideos: importResult.mappedVideos,
            skippedVideos: importResult.skippedVideos,
          };
        } catch (error) {
          importError = error instanceof Error ? error.message : "No se pudo iniciar la extracción.";
        }
      }
    }

    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: userId,
      properties: {
        email,
        username,
        display_name: displayName,
        selected_plan: selectedPlan,
      },
    });
    posthog.capture({
      distinctId: userId,
      event: "user_registered",
      properties: {
        username,
        email,
        selected_plan: selectedPlan,
        activation_mode: payload.activateWithoutPayment ? "test_no_payment" : "payment_required",
        has_youtube_channel: Boolean(channelInput),
      },
    });

    const response = NextResponse.json({
      ok: true,
      user_id: userId,
      username,
      email,
      selected_plan: selectedPlan,
      public_map_path: toPublicMapPath(username),
      channel_id: channelId,
      import_summary: importSummary,
      import_error: importError,
      activate_without_payment: payload.activateWithoutPayment,
      activation_mode: payload.activateWithoutPayment ? "test_no_payment" : "payment_required",
      request_id: randomUUID(),
    });
    setSessionCookie(response, userId);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: buildValidationMessage(error),
          field_errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("[api/auth/register]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la cuenta" },
      { status: 400 }
    );
  }
}
