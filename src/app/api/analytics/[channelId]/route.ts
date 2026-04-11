import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { DEMO_ANALYTICS, isDemoChannelId } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const channelId = params.channelId;

    if (isDemoChannelId(channelId)) {
      return NextResponse.json(DEMO_ANALYTICS);
    }

    const supabase = createServiceRoleClient();

    const [topCountries, videosByMonth, unlocatedVideos, totalStats] = await Promise.all([
      supabase.rpc("get_top_countries_for_channel", { p_channel_id: channelId }),
      supabase.rpc("get_videos_by_month", { p_channel_id: channelId }),
      supabase
        .from("videos")
        .select("id,title,thumbnail_url,published_at,view_count")
        .eq("channel_id", channelId)
        .in("location_status", ["no_location", "failed", "needs_manual"])
        .order("view_count", { ascending: false })
        .limit(20),
      supabase.rpc("get_channel_stats", { p_channel_id: channelId }),
    ]);

    return NextResponse.json({
      top_countries: topCountries.data || [],
      videos_by_month: videosByMonth.data || [],
      unlocated_videos: unlocatedVideos.data || [],
      total_countries: totalStats.data?.[0]?.total_countries || 0,
      total_mapped_videos: totalStats.data?.[0]?.total_mapped || 0,
      total_views: totalStats.data?.[0]?.total_views || 0,
      monthly_visitors: totalStats.data?.[0]?.monthly_visitors || 0,
    });
  } catch (error) {
    console.error("[api/analytics]", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500 });
  }
}
