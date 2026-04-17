import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

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

    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ active: false, plan: null, current_period_end: null }, { status: 401 });
    }

    const rows = await sql<
      Array<{
        status: string;
        current_period_end: string | null;
        plan_name: string | null;
      }>
    >`
      select
        s.status,
        s.current_period_end,
        p.name as plan_name
      from public.subscriptions s
      left join public.subscription_plans p on p.id = s.plan_id
      where s.user_id = ${userId}
        and s.status in ('active', 'trialing', 'past_due')
      order by s.updated_at desc
      limit 1
    `;
    const data = rows[0] || null;

    return NextResponse.json({
      active: Boolean(data && (data.status === "active" || data.status === "trialing")),
      status: data?.status || null,
      plan: data?.plan_name || null,
      current_period_end: data?.current_period_end || null,
    });
  } catch (error) {
    console.error("[api/subscription/me]", error);
    return NextResponse.json({ active: false, plan: null, current_period_end: null }, { status: 500 });
  }
}
