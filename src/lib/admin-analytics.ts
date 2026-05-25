import { sql } from "@/lib/neon";
import { tableExists } from "@/lib/db-schema";

export interface AdminOverviewMetrics {
  window_days: number;
  product: {
    registered_viewers: number;
    registered_creators: number;
    monthly_active_viewers: number;
    monthly_active_creators: number;
    map_views_30d: number;
    video_opens_30d: number;
    votes_30d: number;
    sponsor_clicks_30d: number;
    saved_30d: number;
    favorites_30d: number;
    watch_later_30d: number;
    watch_time_hours_30d: number;
  };
  creators: Array<{
    channel_id: string;
    channel_name: string;
    owner_username: string;
    videos_count: number;
    map_views_30d: number;
    votes_30d: number;
  }>;
  sponsors: Array<{
    sponsor_id: string;
    brand_name: string;
    videos_count: number;
    clicks_30d: number;
  }>;
  geography: {
    top_viewer_countries: Array<{ country_code: string; users: number }>;
    top_event_countries: Array<{ country_code: string; events: number }>;
  };
}

export async function loadAdminOverviewMetrics(input?: { windowDays?: number }): Promise<AdminOverviewMetrics> {
  const requestedDays = Number(input?.windowDays || 30);
  const windowDays = [7, 30, 90, 180].includes(requestedDays) ? requestedDays : 30;
  const [
    usersTable,
    creatorActivityTable,
    mapEventsTable,
    channelsTable,
    videosTable,
    sponsorsTable,
    sponsorRulesTable,
    sponsorClicksTable,
    viewerProfilesTable,
    fanVotesTable,
  ] = await Promise.all([
    tableExists("public", "users"),
    tableExists("public", "creator_activity_log"),
    tableExists("public", "map_events"),
    tableExists("public", "channels"),
    tableExists("public", "videos"),
    tableExists("public", "sponsors"),
    tableExists("public", "sponsor_video_rules"),
    tableExists("public", "sponsor_clicks"),
    tableExists("public", "viewer_profiles"),
    tableExists("public", "map_fan_votes"),
  ]);

  const userCountRowsPromise = usersTable
    ? sql<Array<{ viewers: number; creators: number }>>`
        select
          count(*) filter (where role = 'viewer')::int as viewers,
          count(*) filter (where role in ('creator', 'superadmin'))::int as creators
        from public.users
      `
    : Promise.resolve([{ viewers: 0, creators: 0 }]);

  const monthlyActiveRowsPromise = usersTable
    ? sql<Array<{ mav_viewers: number; mav_creators: number }>>`
        with active_users as (
          ${creatorActivityTable
            ? sql`select distinct actor_user_id as user_id
                 from public.creator_activity_log
                 where created_at >= now() - make_interval(days => ${windowDays})
                   and actor_user_id is not null`
            : sql`select null::uuid as user_id where false`}
          union
          ${fanVotesTable
            ? sql`select distinct voter_user_id as user_id
                 from public.map_fan_votes
                 where created_at >= now() - make_interval(days => ${windowDays})
                   and voter_user_id is not null`
            : sql`select null::uuid as user_id where false`}
        )
        select
          count(*) filter (where u.role = 'viewer')::int as mav_viewers,
          count(*) filter (where u.role in ('creator', 'superadmin'))::int as mav_creators
        from active_users au
        inner join public.users u on u.id = au.user_id
      `
    : Promise.resolve([{ mav_viewers: 0, mav_creators: 0 }]);

  const eventSummaryRowsPromise = mapEventsTable
    ? sql<
        Array<{
          map_views: number;
          video_opens: number;
          votes: number;
          sponsor_clicks: number;
          saved: number;
          favorites: number;
          watch_later: number;
          watch_seconds: number;
        }>
      >`
        select
          count(*) filter (where event_type = 'map_view')::int as map_views,
          count(*) filter (where event_type = 'video_panel_open')::int as video_opens,
          count(*) filter (where event_type = 'poll_vote')::int as votes,
          count(*) filter (where event_type = 'sponsor_click')::int as sponsor_clicks,
          count(*) filter (where event_type = 'video_saved_added')::int as saved,
          count(*) filter (where event_type = 'video_favorite_added')::int as favorites,
          count(*) filter (where event_type = 'video_watch_later_added')::int as watch_later,
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
        where created_at >= now() - make_interval(days => ${windowDays})
      `
    : Promise.resolve([{ map_views: 0, video_opens: 0, votes: 0, sponsor_clicks: 0, saved: 0, favorites: 0, watch_later: 0, watch_seconds: 0 }]);

  const creatorRowsPromise =
    channelsTable && usersTable
      ? sql<Array<{
          channel_id: string;
          channel_name: string;
          owner_username: string;
          videos_count: number;
          map_views_30d: number;
          votes_30d: number;
        }>>`
          select
            c.id as channel_id,
            c.channel_name,
            u.username as owner_username,
            ${
              videosTable
                ? sql`count(distinct v.id)::int`
                : sql`0::int`
            } as videos_count,
            ${
              mapEventsTable
                ? sql`count(me.*) filter (where me.event_type = 'map_view' and me.created_at >= now() - make_interval(days => ${windowDays}))::int`
                : sql`0::int`
            } as map_views_30d,
            ${
              mapEventsTable
                ? sql`count(me.*) filter (where me.event_type = 'poll_vote' and me.created_at >= now() - make_interval(days => ${windowDays}))::int`
                : sql`0::int`
            } as votes_30d
          from public.channels c
          inner join public.users u on u.id = c.user_id
          ${videosTable ? sql`left join public.videos v on v.channel_id = c.id` : sql``}
          ${mapEventsTable ? sql`left join public.map_events me on me.channel_id = c.id` : sql``}
          group by c.id, c.channel_name, u.username
          order by map_views_30d desc, videos_count desc, c.channel_name asc
          limit 10
        `
      : Promise.resolve([]);

  const sponsorRowsPromise =
    sponsorsTable
      ? sql<Array<{ sponsor_id: string; brand_name: string; videos_count: number; clicks_30d: number }>>`
          select
            s.id::text as sponsor_id,
            s.brand_name,
            ${
              sponsorRulesTable
                ? sql`count(distinct svr.video_id)::int`
                : sql`0::int`
            } as videos_count,
            ${
              sponsorClicksTable
                ? sql`count(sc.*) filter (where sc.clicked_at >= now() - make_interval(days => ${windowDays}))::int`
                : sql`0::int`
            } as clicks_30d
          from public.sponsors s
          ${sponsorRulesTable ? sql`left join public.sponsor_video_rules svr on svr.sponsor_id = s.id` : sql``}
          ${sponsorClicksTable ? sql`left join public.sponsor_clicks sc on sc.sponsor_id = s.id` : sql``}
          where s.active = true
          group by s.id, s.brand_name
          order by clicks_30d desc, videos_count desc, s.brand_name asc
          limit 10
        `
      : Promise.resolve([]);

  const viewerCountryRowsPromise = viewerProfilesTable
    ? sql<Array<{ country_code: string; users: number }>>`
        select upper(country_code) as country_code, count(*)::int as users
        from public.viewer_profiles
        where country_code is not null
        group by upper(country_code)
        order by users desc, country_code asc
        limit 10
      `
    : Promise.resolve([]);

  const eventCountryRowsPromise = mapEventsTable
    ? sql<Array<{ country_code: string; events: number }>>`
        select upper(country_code) as country_code, count(*)::int as events
        from public.map_events
        where country_code is not null
          and created_at >= now() - make_interval(days => ${windowDays})
        group by upper(country_code)
        order by events desc, country_code asc
        limit 10
      `
    : Promise.resolve([]);

  const [
    userCountRows,
    monthlyActiveRows,
    eventSummaryRows,
    creatorRows,
    sponsorRows,
    viewerCountryRows,
    eventCountryRows,
  ] = await Promise.all([
    userCountRowsPromise,
    monthlyActiveRowsPromise,
    eventSummaryRowsPromise,
    creatorRowsPromise,
    sponsorRowsPromise,
    viewerCountryRowsPromise,
    eventCountryRowsPromise,
  ]);

  const users = userCountRows[0] || { viewers: 0, creators: 0 };
  const active = monthlyActiveRows[0] || { mav_viewers: 0, mav_creators: 0 };
  const events = eventSummaryRows[0] || { map_views: 0, video_opens: 0, votes: 0, sponsor_clicks: 0, saved: 0, favorites: 0, watch_later: 0, watch_seconds: 0 };

  return {
    window_days: windowDays,
    product: {
      registered_viewers: users.viewers || 0,
      registered_creators: users.creators || 0,
      monthly_active_viewers: active.mav_viewers || 0,
      monthly_active_creators: active.mav_creators || 0,
      map_views_30d: events.map_views || 0,
      video_opens_30d: events.video_opens || 0,
      votes_30d: events.votes || 0,
      sponsor_clicks_30d: events.sponsor_clicks || 0,
      saved_30d: events.saved || 0,
      favorites_30d: events.favorites || 0,
      watch_later_30d: events.watch_later || 0,
      watch_time_hours_30d: Math.round(((events.watch_seconds || 0) / 3600) * 10) / 10,
    },
    creators: creatorRows || [],
    sponsors: sponsorRows || [],
    geography: {
      top_viewer_countries: viewerCountryRows || [],
      top_event_countries: eventCountryRows || [],
    },
  };
}
