import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { DEMO_ANALYTICS } from "@/lib/demo-data";

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
            clicks: 148,
            unique_clickers: 97,
          },
          {
            sponsor_id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
            sponsor_name: "RailPass Japan",
            clicks: 82,
            unique_clickers: 61,
          },
          {
            sponsor_id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
            sponsor_name: "Andes Outdoor",
            clicks: 64,
            unique_clickers: 44,
          },
        ],
        demo: DEMO_ANALYTICS,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceRoleClient();

    const { data: sponsors } = await service
      .from("sponsors")
      .select("id,brand_name")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(100);

    if (!sponsors?.length) {
      return NextResponse.json({ sponsors: [] });
    }

    const sponsorIds = sponsors.map((s) => s.id);

    const { data: clicks } = await service
      .from("sponsor_clicks")
      .select("sponsor_id,clicked_at,ip_hash")
      .in("sponsor_id", sponsorIds)
      .gte("clicked_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const grouped = new Map<string, { clicks: number; unique: Set<string> }>();

    for (const sponsor of sponsors) {
      grouped.set(sponsor.id, { clicks: 0, unique: new Set<string>() });
    }

    for (const row of clicks || []) {
      const bucket = grouped.get(row.sponsor_id);
      if (!bucket) continue;
      bucket.clicks += 1;
      if (row.ip_hash) bucket.unique.add(row.ip_hash);
    }

    const response = sponsors.map((sponsor) => {
      const stats = grouped.get(sponsor.id);
      const clickCount = stats?.clicks || 0;
      const unique = stats?.unique.size || 0;
      return {
        sponsor_id: sponsor.id,
        sponsor_name: sponsor.brand_name,
        clicks: clickCount,
        unique_clickers: unique,
      };
    });

    return NextResponse.json({ sponsors: response });
  } catch (error) {
    console.error("[api/sponsors/stats]", error);
    return NextResponse.json({ error: "Could not load sponsor stats" }, { status: 500 });
  }
}
