import { NextResponse } from "next/server";
import { z } from "zod";
import { getPolarClient } from "@/lib/polar";
import { getSessionUserById, getSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  plan: z.string().min(2),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { plan } = querySchema.parse({ plan: url.searchParams.get("plan") || "" });
    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.redirect(new URL(`/onboarding?plan=${encodeURIComponent(plan)}`, url.origin));
    }

    const users = await getSessionUserById(userId);
    if (!users) {
      return NextResponse.redirect(new URL("/auth", url.origin));
    }

    const planRows = await sql<
      Array<{
        id: string;
        slug: string;
        name: string;
        polar_product_id: string | null;
        polar_price_id: string | null;
      }>
    >`
      select id, slug, name, polar_product_id, polar_price_id
      from public.subscription_plans
      where slug = ${plan}
      limit 1
    `;
    const planRow = planRows[0] || null;

    if (!planRow?.polar_price_id) {
      return NextResponse.redirect(new URL("/pricing?error=plan_unavailable", url.origin));
    }

    const channelRows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where user_id = ${userId}
      limit 1
    `;
    const channelRow = channelRows[0] || null;

    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      productPriceId: planRow.polar_price_id,
      successUrl: channelRow?.id
        ? `${url.origin}/dashboard?channelId=${channelRow.id}&checkout=success`
        : `${url.origin}/dashboard?checkout=success`,
      customerEmail: users.email || undefined,
    });

    if (!checkout.url) {
      return NextResponse.redirect(new URL("/pricing?error=checkout_failed", url.origin));
    }

    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[api/billing/polar/checkout]", error);
    return NextResponse.json({ error: "Could not create Polar checkout session" }, { status: 400 });
  }
}
