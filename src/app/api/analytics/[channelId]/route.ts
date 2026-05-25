import { NextResponse } from "next/server";
import { DEMO_ANALYTICS, isDemoChannelId } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const url = new URL(request.url);
    const requestedDays = Number(url.searchParams.get("days") || "30");
    const windowDays = [7, 30, 90, 180].includes(requestedDays) ? requestedDays : 30;

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

    const [internalSummaryRows, internalCountryRows] = await Promise.all([
      sql<
        Array<{
          map_views: number;
          video_panel_opens: number;
          sponsor_clicks: number;
          poll_votes: number;
          saved_added: number;
          favorites_added: number;
          watch_later_added: number;
          watch_seconds: number;
        }>
      >`
        select
          count(*) filter (where event_type = 'map_view')::int as map_views,
          count(*) filter (where event_type = 'video_panel_open')::int as video_panel_opens,
          count(*) filter (where event_type = 'sponsor_click')::int as sponsor_clicks,
          count(*) filter (where event_type = 'poll_vote')::int as poll_votes,
          count(*) filter (where event_type = 'video_saved_added')::int as saved_added,
          count(*) filter (where event_type = 'video_favorite_added')::int as favorites_added,
          count(*) filter (where event_type = 'video_watch_later_added')::int as watch_later_added,
          coalesce(
            sum(
              case
                when event_type = 'video_watch_time_logged'
                  and coalesce(metadata->>'watch_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
                then (metadata->>'watch_seconds')::numeric
                else 0
              end
            ),
            0
          )::int as watch_seconds
        from public.map_events
        where channel_id = ${channelId}
          and created_at >= now() - make_interval(days => ${windowDays})
      `,
      sql<Array<{ country_code: string; interactions: number }>>`
        select country_code, count(*)::int as interactions
        from public.map_events
        where channel_id = ${channelId}
          and country_code is not null
          and event_type in (
            'map_view',
            'video_panel_open',
            'country_select',
            'poll_vote',
            'video_favorite_added',
            'video_watch_later_added',
            'video_watch_time_logged'
          )
          and created_at >= now() - make_interval(days => ${windowDays})
        group by country_code
        order by interactions desc, country_code asc
        limit 10
      `,
    ]);

    const internalSummary = internalSummaryRows[0] || {
      map_views: 0,
      video_panel_opens: 0,
      sponsor_clicks: 0,
      poll_votes: 0,
      saved_added: 0,
      favorites_added: 0,
      watch_later_added: 0,
      watch_seconds: 0,
    };

    return NextResponse.json({
      window_days: windowDays,
      top_countries: topCountries || [],
      videos_by_month: videosByMonth || [],
      unlocated_videos: unlocatedVideos || [],
      total_countries: totalStats?.[0]?.total_countries || 0,
      total_mapped_videos: totalStats?.[0]?.total_mapped || 0,
      total_views: totalStats?.[0]?.total_views || 0,
      monthly_visitors: totalStats?.[0]?.monthly_visitors || 0,
      internal_metrics: {
        map_views: internalSummary.map_views || 0,
        video_panel_opens: internalSummary.video_panel_opens || 0,
        sponsor_clicks: internalSummary.sponsor_clicks || 0,
        poll_votes: internalSummary.poll_votes || 0,
        saved_added: internalSummary.saved_added || 0,
        favorites_added: internalSummary.favorites_added || 0,
        watch_later_added: internalSummary.watch_later_added || 0,
        watch_time_hours: Math.round(((internalSummary.watch_seconds || 0) / 3600) * 10) / 10,
      },
      internal_top_countries: internalCountryRows || [],
      metric_sources: {
        total_views: "youtube",
        top_countries: "youtube",
        monthly_visitors: "travelyourmap",
        internal_metrics: "travelyourmap",
      },
    });
  } catch (error) {
    console.error("[api/analytics]", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500 });
  }
}
