import { NextResponse } from "next/server";
import { z } from "zod";
import { createPolarCheckoutSession } from "@/lib/polar";
import { getSessionUserById, getSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  plan: z.string().min(2),
  lang: z.enum(["es", "en"]).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { plan, lang } = querySchema.parse({
      plan: url.searchParams.get("plan") || "",
      lang: url.searchParams.get("lang") === "en" ? "en" : "es",
    });
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
      return NextResponse.redirect(new URL(`/onboarding?lang=${encodeURIComponent(lang || "es")}&error=plan_unavailable`, url.origin));
    }

    const checkout = await createPolarCheckoutSession({
      productPriceId: planRow.polar_price_id,
      successUrl: `${url.origin}/onboarding/processing?checkout=success&plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(lang || "es")}`,
      customerEmail: users.email || undefined,
      externalCustomerId: userId,
      discountId: process.env.POLAR_TRIAL_DISCOUNT_ID || null,
    });

    if (!checkout.url) {
      return NextResponse.redirect(new URL(`/onboarding?lang=${encodeURIComponent(lang || "es")}&error=checkout_failed`, url.origin));
    }

    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[api/billing/polar/checkout]", error);
    return NextResponse.json({ error: "Could not create Polar checkout session" }, { status: 400 });
  }
}
