import { NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { importYoutubeChannel } from "@/lib/youtube-import";

export const runtime = "nodejs";

interface PolarSubscriptionWebhookData {
  id: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  customer?: {
    id?: string;
    external_id?: string | null;
    email?: string | null;
  } | null;
  product?: {
    id?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

async function resolvePlanIdByProductId(productId: string | null | undefined) {
  if (!productId) return null;

  const service = createServiceRoleClient();
  const { data } = await service
    .from("subscription_plans")
    .select("id")
    .eq("polar_product_id", productId)
    .maybeSingle();

  return data?.id || null;
}

async function resolveUserId(payload: PolarSubscriptionWebhookData) {
  const service = createServiceRoleClient();
  const externalUserId =
    (typeof payload.customer?.external_id === "string" && payload.customer.external_id) ||
    (typeof payload.metadata?.user_id === "string" && payload.metadata.user_id) ||
    null;

  if (externalUserId) {
    return externalUserId;
  }

  const email = payload.customer?.email;
  if (!email) return null;

  const { data } = await service.from("users").select("id").eq("email", email).maybeSingle();
  return data?.id || null;
}

async function upsertSubscription(payload: {
  id: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  customer?: {
    id?: string;
    external_id?: string | null;
    email?: string | null;
  } | null;
  product?: {
    id?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}) {
  const service = createServiceRoleClient();
  const userId = await resolveUserId(payload);

  if (!userId) {
    console.warn("[polar webhook] missing user id", payload.id);
    return;
  }

  const planId = await resolvePlanIdByProductId(payload.product?.id);

  await service.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: planId,
      polar_subscription_id: payload.id,
      polar_customer_id: payload.customer?.id || "",
      status: payload.status,
      current_period_start: payload.current_period_start || null,
      current_period_end: payload.current_period_end || null,
      cancel_at_period_end: Boolean(payload.cancel_at_period_end),
      metadata: payload.metadata || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "polar_subscription_id" }
  );

  if (payload.status === "active" || payload.status === "trialing") {
    await triggerInitialImportIfNeeded(userId);
  }
}

async function triggerInitialImportIfNeeded(userId: string) {
  const service = createServiceRoleClient();
  const { data: existingChannel } = await service
    .from("channels")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingChannel?.id) return;

  const { data: onboarding } = await service
    .from("onboarding_state")
    .select("youtube_channel_id")
    .eq("user_id", userId)
    .maybeSingle();

  const channelReference = String(onboarding?.youtube_channel_id || "").trim();
  if (!channelReference) return;

  try {
    await importYoutubeChannel({
      userId,
      channelUrl: channelReference,
      service,
    });
  } catch (error) {
    console.error("[polar webhook] initial import failed", error);
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const webhook = new Webhook(process.env.POLAR_WEBHOOK_SECRET || "");
    const event = webhook.verify(body, {
      "webhook-id": request.headers.get("webhook-id") || "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
      "webhook-signature": request.headers.get("webhook-signature") || "",
    }) as {
      type: string;
      data: PolarSubscriptionWebhookData;
    };

    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
      case "subscription.canceled":
      case "subscription.revoked":
      case "subscription.uncanceled": {
        await upsertSubscription(event.data);
        break;
      }
      case "checkout.created":
      case "checkout.updated":
      case "order.created":
      case "order.paid":
      default:
        break;
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid Polar webhook signature" }, { status: 403 });
    }

    console.error("[api/billing/polar/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
