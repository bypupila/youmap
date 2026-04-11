import { NextResponse } from "next/server";
import { z } from "zod";
import { getPolarClient } from "@/lib/polar";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  plan: z.string().min(2),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { plan } = querySchema.parse({ plan: url.searchParams.get("plan") || "" });
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL(`/onboarding?plan=${encodeURIComponent(plan)}`, url.origin));
    }

    const { data: planRow, error: planError } = await supabase
      .from("subscription_plans")
      .select("id,slug,name,polar_product_id,polar_price_id")
      .eq("slug", plan)
      .maybeSingle();

    if (planError || !planRow?.polar_price_id) {
      return NextResponse.redirect(new URL("/pricing?error=plan_unavailable", url.origin));
    }

    const { data: channelRow } = await supabase
      .from("channels")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      productPriceId: planRow.polar_price_id,
      successUrl: channelRow?.id
        ? `${url.origin}/dashboard?channelId=${channelRow.id}&checkout=success`
        : `${url.origin}/dashboard?checkout=success`,
      customerEmail: user.email || undefined,
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
