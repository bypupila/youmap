import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { DEMO_ANALYTICS } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const isDemoMode = new URL(request.url).searchParams.get("demo") === "1";
    if (isDemoMode) {
      return NextResponse.json({
        sponsors: [
          {
            sponsor_id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
            sponsor_name: "Nomad Gear",
            impressions: 1840,
            clicks: 148,
            unique_clickers: 97,
            ctr: 0.0804,
          },
          {
            sponsor_id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
            sponsor_name: "RailPass Japan",
            impressions: 1090,
            clicks: 82,
            unique_clickers: 61,
            ctr: 0.0752,
          },
          {
            sponsor_id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
            sponsor_name: "Andes Outdoor",
            impressions: 870,
            clicks: 64,
            unique_clickers: 44,
            ctr: 0.0736,
          },
        ],
        demo: DEMO_ANALYTICS,
      });
    }

    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sponsors = await sql<Array<{ id: string; brand_name: string }>>`
      select id, brand_name
      from public.sponsors
      where user_id = ${userId}
        and active = true
      limit 100
    `;

    if (!sponsors?.length) {
      return NextResponse.json({ sponsors: [] });
    }

    const sponsorIds = sponsors.map((s) => s.id);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const clicks = await sql<Array<{ sponsor_id: string; clicked_at: string; ip_hash: string | null }>>`
      select sponsor_id, clicked_at, ip_hash
      from public.sponsor_clicks
      where sponsor_id = any(${sponsorIds})
        and clicked_at >= ${since}
    `;
    let impressions: Array<{ sponsor_id: string; impressions: number | string }> = [];

    try {
      impressions = await sql<Array<{ sponsor_id: string; impressions: number | string }>>`
        select sponsor_id, count(*)::int as impressions
        from public.map_events
        where sponsor_id = any(${sponsorIds})
          and event_type = 'sponsor_impression'
          and created_at >= ${since}
        group by sponsor_id
      `;
    } catch (eventError) {
      console.warn("[api/sponsors/stats] sponsor impressions unavailable", eventError);
    }

    const grouped = new Map<string, { clicks: number; impressions: number; unique: Set<string> }>();

    for (const sponsor of sponsors) {
      grouped.set(sponsor.id, { clicks: 0, impressions: 0, unique: new Set<string>() });
    }

    for (const row of clicks || []) {
      const bucket = grouped.get(row.sponsor_id);
      if (!bucket) continue;
      bucket.clicks += 1;
      if (row.ip_hash) bucket.unique.add(row.ip_hash);
    }

    for (const row of impressions || []) {
      const bucket = grouped.get(row.sponsor_id);
      if (!bucket) continue;
      bucket.impressions = Number(row.impressions || 0);
    }

    const response = sponsors.map((sponsor) => {
      const stats = grouped.get(sponsor.id);
      const clickCount = stats?.clicks || 0;
      const impressionCount = stats?.impressions || 0;
      const unique = stats?.unique.size || 0;
      return {
        sponsor_id: sponsor.id,
        sponsor_name: sponsor.brand_name,
        impressions: impressionCount,
        clicks: clickCount,
        unique_clickers: unique,
        ctr: impressionCount > 0 ? Number((clickCount / impressionCount).toFixed(4)) : 0,
      };
    });

    return NextResponse.json({ sponsors: response });
  } catch (error) {
    console.error("[api/sponsors/stats]", error);
    return NextResponse.json({ error: "Could not load sponsor stats" }, { status: 500 });
  }
}
