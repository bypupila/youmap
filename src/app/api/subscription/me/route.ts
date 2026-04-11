import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const isDemoMode = new URL(request.url).searchParams.get("demo") === "1";
    if (isDemoMode) {
      return NextResponse.json({
        active: true,
        status: "trialing",
        plan: "Pro",
        current_period_end: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
        channel_slug: DEMO_CHANNEL_SLUG,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ active: false, plan: null, current_period_end: null }, { status: 401 });
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("status,current_period_end,subscription_plans(name,price_usd)")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planRelation = data?.subscription_plans as
      | { name?: string | null }
      | Array<{ name?: string | null }>
      | null
      | undefined;
    const planName = Array.isArray(planRelation)
      ? planRelation[0]?.name || null
      : planRelation?.name || null;

    return NextResponse.json({
      active: Boolean(data && (data.status === "active" || data.status === "trialing")),
      status: data?.status || null,
      plan: planName,
      current_period_end: data?.current_period_end || null,
    });
  } catch (error) {
    console.error("[api/subscription/me]", error);
    return NextResponse.json({ active: false, plan: null, current_period_end: null }, { status: 500 });
  }
}
