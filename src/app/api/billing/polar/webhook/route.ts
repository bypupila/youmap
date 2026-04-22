import { NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { sql } from "@/lib/neon";
import { getPostHogClient } from "@/lib/posthog-server";

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

function resolveWebhookSecret() {
  let rawSecret = String(process.env.POLAR_WEBHOOK_SECRET || "").trim();
  if (
    (rawSecret.startsWith('"') && rawSecret.endsWith('"')) ||
    (rawSecret.startsWith("'") && rawSecret.endsWith("'"))
  ) {
    rawSecret = rawSecret.slice(1, -1).trim();
  }
  if (!rawSecret) return "";
  if (rawSecret.startsWith("polar_whs_")) {
    return `whsec_${rawSecret.slice("polar_whs_".length)}`;
  }
  return rawSecret;
}

async function resolvePlanIdByProductId(productId: string | null | undefined) {
  if (!productId) return null;
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.subscription_plans
    where polar_product_id = ${productId}
    limit 1
  `;
  return rows[0]?.id || null;
}

async function resolveUserId(payload: PolarSubscriptionWebhookData) {
  const externalUserId =
    (typeof payload.customer?.external_id === "string" && payload.customer.external_id) ||
    (typeof payload.metadata?.user_id === "string" && payload.metadata.user_id) ||
    null;
  if (externalUserId) return externalUserId;

  const email = payload.customer?.email;
  if (!email) return null;
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.users
    where email = ${email.toLowerCase()}
    limit 1
  `;
  return rows[0]?.id || null;
}

async function upsertSubscription(payload: PolarSubscriptionWebhookData) {
  const userId = await resolveUserId(payload);
  if (!userId) {
    console.warn("[polar webhook] missing user id", payload.id);
    return;
  }

  const planId = await resolvePlanIdByProductId(payload.product?.id);
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
      ${userId},
      ${planId},
      ${payload.id},
      ${payload.customer?.id || ""},
      ${payload.status},
      ${payload.current_period_start || null},
      ${payload.current_period_end || null},
      ${Boolean(payload.cancel_at_period_end)},
      ${JSON.stringify(payload.metadata || {})}::jsonb,
      ${new Date().toISOString()}
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

  if (payload.status === "active" || payload.status === "trialing") {
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "subscription_activated",
      properties: {
        subscription_id: payload.id,
        status: payload.status,
        plan_id: planId,
        polar_product_id: payload.product?.id || null,
        current_period_end: payload.current_period_end || null,
      },
    });
    return;
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const webhookSecret = resolveWebhookSecret();
    const webhook = new Webhook(webhookSecret);
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

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
