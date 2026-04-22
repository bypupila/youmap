import { NextResponse } from "next/server";
import { DEMO_ANALYTICS, isDemoChannelId } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    if (isDemoChannelId(channelId)) {
      return NextResponse.json(DEMO_ANALYTICS);
    }

    const [topCountries, videosByMonth, unlocatedVideos, totalStats] = await Promise.all([
      sql<Array<{ country_name: string; video_count: number }>>`
        select
          coalesce(vl.country_name, vl.country_code) as country_name,
          count(*)::bigint as video_count
        from public.video_locations vl
        where vl.channel_id = ${channelId}
          and vl.is_primary = true
        group by 1
        order by video_count desc, country_name asc
      `,
      sql<Array<{ month: string; count: number }>>`
        select
          to_char(date_trunc('month', v.published_at), 'YYYY-MM') as month,
          count(*)::bigint as count
        from public.videos v
        where v.channel_id = ${channelId}
          and v.published_at is not null
        group by 1
        order by 1 asc
      `,
      sql<
        Array<{
          id: string;
          title: string;
          thumbnail_url: string | null;
          published_at: string | null;
          view_count: number;
        }>
      >`
        select id, title, thumbnail_url, published_at, view_count
        from public.videos
        where channel_id = ${channelId}
          and location_status in ('no_location', 'failed', 'needs_manual')
        order by view_count desc
        limit 20
      `,
      sql<
        Array<{
          total_countries: number;
          total_mapped: number;
          total_views: number;
          monthly_visitors: number;
        }>
      >`
        with latest_metrics as (
          select *
          from public.channel_monthly_metrics
          where channel_id = ${channelId}
          order by metric_month desc
          limit 1
        ),
        fallback as (
          select
            count(distinct vl.country_code)::int as total_countries,
            count(*) filter (where v.location_status in ('mapped', 'verified_auto', 'verified_manual'))::int as total_mapped,
            coalesce(sum(v.view_count), 0)::bigint as total_views
          from public.videos v
          left join public.video_locations vl on vl.video_id = v.id and vl.is_primary = true
          where v.channel_id = ${channelId}
        )
        select
          coalesce(lm.total_countries, fb.total_countries) as total_countries,
          coalesce(lm.total_mapped_videos, fb.total_mapped) as total_mapped,
          coalesce(lm.total_views, fb.total_views) as total_views,
          coalesce(lm.monthly_visitors, 0) as monthly_visitors
        from fallback fb
        left join latest_metrics lm on true
      `,
    ]);

    return NextResponse.json({
      top_countries: topCountries || [],
      videos_by_month: videosByMonth || [],
      unlocated_videos: unlocatedVideos || [],
      total_countries: totalStats?.[0]?.total_countries || 0,
      total_mapped_videos: totalStats?.[0]?.total_mapped || 0,
      total_views: totalStats?.[0]?.total_views || 0,
      monthly_visitors: totalStats?.[0]?.monthly_visitors || 0,
    });
  } catch (error) {
    console.error("[api/analytics]", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500 });
  }
}
