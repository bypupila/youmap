import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { importYoutubeChannel } from "@/lib/youtube-import";
import { createServiceRoleClient } from "@/lib/supabase-service";
import {
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  toPublicMapPath,
} from "@/lib/auth-identifiers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payloadSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8).max(128),
  selectedPlan: z.string().min(2),
  channelUrl: z.string().min(3).optional().nullable(),
  youtubeChannelId: z.string().min(8).optional().nullable(),
  activateWithoutPayment: z.boolean().optional().default(false),
});

function buildChannelInput(payload: z.infer<typeof payloadSchema>) {
  const youtubeChannelId = String(payload.youtubeChannelId || "").trim();
  if (youtubeChannelId) return youtubeChannelId;

  const channelUrl = String(payload.channelUrl || "").trim();
  if (channelUrl) return channelUrl;

  return null;
}

async function ensureAuthUser(args: {
  userId: string | null;
  email: string;
  password: string;
  displayName: string;
}) {
  const service = createServiceRoleClient();
  const metadata = { display_name: args.displayName };

  if (args.userId) {
    const { data, error } = await service.auth.admin.updateUserById(args.userId, {
      email: args.email,
      password: args.password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user?.id) {
      throw new Error(error?.message || "No se pudo actualizar la cuenta de autenticación");
    }
    return data.user.id;
  }

  const { data, error } = await service.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user?.id) {
    throw new Error(error?.message || "No se pudo crear la cuenta de autenticación");
  }

  return data.user.id;
}

async function upsertTrialSubscription(args: { userId: string; selectedPlan: string }) {
  const service = createServiceRoleClient();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const manualSubscriptionId = `manual-test-${args.userId}`;

  const { data: planRow } = await service
    .from("subscription_plans")
    .select("id")
    .eq("slug", args.selectedPlan)
    .maybeSingle();

  await service.from("subscriptions").upsert(
    {
      user_id: args.userId,
      plan_id: planRow?.id || null,
      polar_subscription_id: manualSubscriptionId,
      polar_customer_id: "manual-test",
      status: "trialing",
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      metadata: {
        source: "manual_test_mode",
      },
      updated_at: now.toISOString(),
    },
    { onConflict: "polar_subscription_id" }
  );
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const service = createServiceRoleClient();

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

    const [{ data: existingByUsername, error: usernameError }, { data: existingByEmail, error: emailError }] =
      await Promise.all([
        service.from("users").select("id,email,username").eq("username", username).maybeSingle(),
        service.from("users").select("id,email,username").eq("email", email).maybeSingle(),
      ]);

    if (usernameError || emailError) {
      return NextResponse.json(
        { error: usernameError?.message || emailError?.message || "No se pudo validar la cuenta" },
        { status: 400 }
      );
    }

    if (existingByUsername && existingByUsername.email !== email) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
    }

    const existingUserId = existingByEmail?.id || existingByUsername?.id || null;

    const authUserId = await ensureAuthUser({
      userId: existingUserId,
      email,
      password: payload.password,
      displayName,
    });

    await service.from("users").upsert(
      {
        id: authUserId,
        email,
        username,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    await service.from("onboarding_state").upsert(
      {
        user_id: authUserId,
        current_step: "plan",
        completed_steps: ["welcome", "youtube"],
        selected_plan: selectedPlan,
        youtube_channel_id: String(payload.youtubeChannelId || "").trim() || null,
        is_complete: false,
        demo_mode: false,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    let channelId: string | null = null;
    let importSummary: {
      importedVideos: number;
      mappedVideos: number;
      skippedVideos: number;
    } | null = null;
    let importError: string | null = null;

    if (payload.activateWithoutPayment) {
      await upsertTrialSubscription({
        userId: authUserId,
        selectedPlan,
      });

      if (channelInput) {
        try {
          const importResult = await importYoutubeChannel({
            userId: authUserId,
            channelUrl: channelInput,
            service,
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

    return NextResponse.json({
      ok: true,
      user_id: authUserId,
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
  } catch (error) {
    console.error("[api/auth/register]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la cuenta" },
      { status: 400 }
    );
  }
}
