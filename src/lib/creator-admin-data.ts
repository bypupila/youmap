import { normalizeCity, normalizeCountryCode, type MapPollMode, type MapPollStatus } from "@/lib/map-polls";
import { columnExists, tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";
import type { TravelChannel } from "@/lib/types";
import { buildPublicMapUrl } from "@/lib/map-urls";
import { normalizeSponsorCardStyle } from "@/lib/sponsor-card-style";

export type CreatorAdminTab = "resumen" | "videos" | "paises" | "votaciones" | "sponsors" | "audiencia" | "actividad";
export type CreatorAdminUiStatus = "auto" | "manual" | "pending" | "unlocated";
export type CreatorAdminSeverity = "info" | "warning" | "error";

export interface CreatorAdminVideo {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  raw_location_status: string;
  ui_status: CreatorAdminUiStatus;
  verification_source: string | null;
  visible_on_map: boolean;
  featured: boolean;
  internal_notes: string | null;
  location_id: string | null;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  label_public: string | null;
  location_internal_notes: string | null;
  sponsor_ids: string[];
  sponsor_names: string[];
  sponsor_detection_status: "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible";
  sponsor_detectado_texto: string | null;
  sponsor_detectado_confianza: number | null;
  sponsor_detectado_fuente: string | null;
  sponsor_card_style: "cta_red" | "coupon_yellow" | "premium_strip" | null;
  updated_at: string | null;
}

export interface CreatorAdminSponsor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  website_url: string | null;
  affiliate_url: string | null;
  discount_code: string | null;
  description: string | null;
  active: boolean;
  country_codes: string[];
  video_ids: string[];
  scope: "global" | "country" | "video";
  sponsor_card_style: "cta_red" | "coupon_yellow" | "premium_strip" | null;
  click_count: number;
  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;
}

export interface CreatorAdminCountry {
  country_code: string;
  country_name: string;
  videos_count: number;
  visible_videos_count: number;
  cities_count: number;
  top_cities: string[];
  total_views: number;
  total_likes: number;
  sponsor_ids: string[];
  sponsor_names: string[];
  has_sponsor: boolean;
}

export interface CreatorAdminPollOption {
  country_code: string;
  country_name: string;
  city: string | null;
  votes: number;
  percentage: number;
}

export interface CreatorAdminPoll {
  id: string;
  title: string;
  prompt: string;
  status: MapPollStatus;
  poll_mode: MapPollMode;
  visibility: "public" | "link_only";
  show_popup: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
  total_votes: number;
  winner_country_code: string | null;
  winner_city: string | null;
  converted_to_destination: boolean;
  sponsor_id: string | null;
  sponsor_url: string | null;
  options: CreatorAdminPollOption[];
}

export interface CreatorAdminActivity {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  severity: CreatorAdminSeverity;
  created_at: string;
}

export interface CreatorAdminAlert {
  id: string;
  severity: CreatorAdminSeverity;
  title: string;
  description: string;
  href: string;
}

export interface CreatorAdminAudience {
  top_countries: Array<{ country_code: string; events: number }>;
  top_videos: Array<{ youtube_video_id: string; title: string; events: number }>;
  sponsor_clicks: Array<{ sponsor_id: string; brand_name: string; clicks: number }>;
  poll_votes: number;
}

export interface CreatorAdminSyncStatus {
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export interface CreatorAdminQuickAction {
  severity: CreatorAdminSeverity | "success";
  label: string;
  cta: string;
  href: string | null;
}

export interface CreatorAdminSummary {
  videos_mapped: number;
  videos_hidden: number;
  countries_covered: number;
  cities_covered: number;
  pending_review: number;
  active_vote_count: number;
}

export interface CreatorAdminPayload {
  channel: TravelChannel & { canonicalHandle: string | null };
  mapUrl: string;
  videos: CreatorAdminVideo[];
  countries: CreatorAdminCountry[];
  sponsors: CreatorAdminSponsor[];
  polls: CreatorAdminPoll[];
  activity: CreatorAdminActivity[];
  alerts: CreatorAdminAlert[];
  audience: CreatorAdminAudience;
  syncStatus: CreatorAdminSyncStatus;
  quickAction: CreatorAdminQuickAction;
  summary: CreatorAdminSummary;
}

interface LoadCreatorAdminPayloadInput {
  channelId: string;
  baseUrl?: string;
}

interface ChannelRow {
  id: string;
  user_id: string;
  username: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  youtube_channel_id: string | null;
  last_synced_at: string | null;
}

interface VideoRow {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  location_status: string | null;
  verification_source: string | null;
  visible_on_map: boolean | null;
  featured: boolean | null;
  internal_notes: string | null;
  location_id: string | null;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  lat: number | string | null;
  lng: number | string | null;
  location_label: string | null;
  location_internal_notes: string | null;
  video_sponsor_ids: string[] | null;
  video_sponsor_names: string[] | null;
  sponsor_detection_status: string | null;
  sponsor_detectado_texto: string | null;
  sponsor_detectado_confianza: number | string | null;
  sponsor_detectado_fuente: string | null;
  sponsor_card_style: string | null;
  updated_at: string | null;
}

interface SponsorRow {
  id: string;
  brand_name: string;
  logo_url: string | null;
  website_url: string | null;
  affiliate_url: string | null;
  discount_code: string | null;
  description: string | null;
  sponsor_card_style: string | null;
  active: boolean;
  country_codes: string[] | null;
  video_ids: string[] | null;
  click_count: number | string | null;
  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;
}

interface PollRow {
  id: string;
  title: string;
  prompt: string;
  status: MapPollStatus;
  poll_mode: string | null;
  visibility: string | null;
  show_popup: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
  winner_country_code: string | null;
  winner_city: string | null;
  converted_to_destination: boolean | null;
  sponsor_id: string | null;
  sponsor_url: string | null;
}

interface CreatorAdminSchemaFeatures {
  hasSponsorVideoRules: boolean;
  hasCreatorActivityLog: boolean;
  hasVideoVisibleOnMap: boolean;
  hasVideoFeatured: boolean;
  hasVideoInternalNotes: boolean;
  hasVideoSponsorCardStyle: boolean;
  hasVideoLocationInternalNotes: boolean;
  hasSponsorCardStyle: boolean;
  hasSponsorDates: boolean;
  hasSponsorInternalNotes: boolean;
  hasPollVisibility: boolean;
  hasPollWinnerFields: boolean;
  hasPollSponsorFields: boolean;
}

export const CREATOR_ADMIN_TABS: CreatorAdminTab[] = [
  "resumen",
  "videos",
  "paises",
  "votaciones",
  "sponsors",
  "audiencia",
  "actividad",
];

export function normalizeCreatorAdminTab(value: string | null | undefined): CreatorAdminTab {
  return CREATOR_ADMIN_TABS.includes(value as CreatorAdminTab) ? (value as CreatorAdminTab) : "resumen";
}

export function mapAdminLocationStatus(status: string | null | undefined): CreatorAdminUiStatus {
  if (status === "verified_auto" || status === "mapped") return "auto";
  if (status === "verified_manual") return "manual";
  if (status === "no_location" || status === "failed") return "unlocated";
  return "pending";
}

export function formatAdminRelativeTime(value: string | null | undefined) {
  if (!value) return "sin datos";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return "sin datos";
  const diff = Date.now() - ms;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 45) return `hace ${days} dias`;
  const months = Math.round(days / 30);
  return `hace ${months} meses`;
}

async function detectCreatorAdminSchemaFeatures(): Promise<CreatorAdminSchemaFeatures> {
  const [
    hasSponsorVideoRules,
    hasCreatorActivityLog,
    hasVideoVisibleOnMap,
    hasVideoFeatured,
    hasVideoInternalNotes,
    hasVideoSponsorCardStyle,
    hasVideoLocationInternalNotes,
    hasSponsorCardStyle,
    hasSponsorStartDate,
    hasSponsorEndDate,
    hasSponsorInternalNotes,
    hasPollVisibility,
    hasPollWinnerCountryCode,
    hasPollWinnerCity,
    hasPollConvertedToDestination,
    hasPollSponsorId,
    hasPollSponsorUrl,
  ] = await Promise.all([
    tableExists("public", "sponsor_video_rules"),
    tableExists("public", "creator_activity_log"),
    columnExists("public", "videos", "visible_on_map"),
    columnExists("public", "videos", "featured"),
    columnExists("public", "videos", "internal_notes"),
    columnExists("public", "videos", "sponsor_card_style"),
    columnExists("public", "video_locations", "internal_notes"),
    columnExists("public", "sponsors", "sponsor_card_style"),
    columnExists("public", "sponsors", "start_date"),
    columnExists("public", "sponsors", "end_date"),
    columnExists("public", "sponsors", "internal_notes"),
    columnExists("public", "map_polls", "visibility"),
    columnExists("public", "map_polls", "winner_country_code"),
    columnExists("public", "map_polls", "winner_city"),
    columnExists("public", "map_polls", "converted_to_destination"),
    columnExists("public", "map_polls", "sponsor_id"),
    columnExists("public", "map_polls", "sponsor_url"),
  ]);

  return {
    hasSponsorVideoRules,
    hasCreatorActivityLog,
    hasVideoVisibleOnMap,
    hasVideoFeatured,
    hasVideoInternalNotes,
    hasVideoSponsorCardStyle,
    hasVideoLocationInternalNotes,
    hasSponsorCardStyle,
    hasSponsorDates: hasSponsorStartDate && hasSponsorEndDate,
    hasSponsorInternalNotes,
    hasPollVisibility,
    hasPollWinnerFields: hasPollWinnerCountryCode && hasPollWinnerCity && hasPollConvertedToDestination,
    hasPollSponsorFields: hasPollSponsorId && hasPollSponsorUrl,
  };
}

export async function loadCreatorAdminPayload({ channelId, baseUrl }: LoadCreatorAdminPayloadInput): Promise<CreatorAdminPayload | null> {
  const channelRows = await sql<ChannelRow[]>`
    select
      c.id,
      c.user_id,
      u.username,
      c.channel_name,
      c.channel_handle,
      c.thumbnail_url,
      c.subscriber_count,
      c.youtube_channel_id,
      c.last_synced_at
    from public.channels c
    inner join public.users u on u.id = c.user_id
    where c.id = ${channelId}
    limit 1
  `;
  const channelRow = channelRows[0] || null;
  if (!channelRow) return null;

  const features = await detectCreatorAdminSchemaFeatures();

  const [videoRows, sponsorRows, pollRows, activityRows, syncRows, audienceRows, topVideoRows, sponsorClickRows] = await Promise.all([
    loadAdminVideos(channelId, features),
    loadAdminSponsors(channelRow.user_id, features),
    loadAdminPollRows(channelId, features),
    loadAdminActivity(channelId, features),
    loadAdminSyncRows(channelId),
    loadAudienceCountryRows(channelId),
    loadAudienceVideoRows(channelId),
    loadSponsorClickRows(channelId),
  ]);

  const sponsors = sponsorRows.map(normalizeSponsorRow);
  const sponsorByCountry = buildSponsorCountryMap(sponsors);
  const sponsorByVideo = buildSponsorVideoMap(sponsors);
  const globalSponsors = sponsors.filter((sponsor) => sponsor.scope === "global" && sponsor.active);
  const videos = videoRows
    .map((row) => normalizeVideoRow(row, sponsorByVideo.get(row.id) || []))
    .map((video) => attachScopedSponsorsToVideo(video, sponsorByCountry, globalSponsors));
  const countries = buildCountryRollups(videos, sponsors, sponsorByCountry, globalSponsors);
  const polls = await hydrateAdminPolls(pollRows, videos);
  const summary = buildSummary(videos, countries, polls);
  const syncStatus = normalizeSyncStatus(syncRows[0] || null, channelRow.last_synced_at);
  const alerts = buildAlerts(videos, sponsors, polls, syncRows[0] || null);
  const activity = buildActivity(activityRows, videos, syncRows[0] || null);
  const audience = {
    top_countries: audienceRows.map((row) => ({ country_code: normalizeCountryCode(row.country_code), events: Number(row.events || 0) })),
    top_videos: topVideoRows.map((row) => ({
      youtube_video_id: row.youtube_video_id,
      title: row.title || row.youtube_video_id,
      events: Number(row.events || 0),
    })),
    sponsor_clicks: sponsorClickRows.map((row) => ({
      sponsor_id: row.sponsor_id,
      brand_name: row.brand_name,
      clicks: Number(row.clicks || 0),
    })),
    poll_votes: polls.reduce((sum, poll) => sum + poll.total_votes, 0),
  };
  const quickAction = buildQuickAction({ videos, countries, polls, sponsors, syncStatus });
  const handle = channelRow.channel_handle || channelRow.username;
  const publicUrl = buildPublicMapUrl(channelRow.id);

  return {
    channel: {
      id: channelRow.id,
      user_id: channelRow.user_id,
      channel_name: channelRow.channel_name,
      channel_handle: channelRow.channel_handle,
      canonicalHandle: handle,
      youtube_channel_id: channelRow.youtube_channel_id,
      thumbnail_url: channelRow.thumbnail_url,
      subscriber_count: channelRow.subscriber_count,
      last_synced_at: channelRow.last_synced_at,
    },
    mapUrl: baseUrl ? `${baseUrl}/map?channelId=${encodeURIComponent(channelRow.id)}` : publicUrl,
    videos,
    countries,
    sponsors,
    polls,
    activity,
    alerts,
    audience,
    syncStatus,
    quickAction,
    summary,
  };
}

async function loadAdminVideos(channelId: string, features: CreatorAdminSchemaFeatures) {
  const hasVideoSponsorRules = features.hasSponsorVideoRules;
  const selectVisible = features.hasVideoVisibleOnMap ? "v.visible_on_map" : "true::boolean as visible_on_map";
  const selectFeatured = features.hasVideoFeatured ? "v.featured" : "false::boolean as featured";
  const selectInternalNotes = features.hasVideoInternalNotes ? "v.internal_notes" : "null::text as internal_notes";
  const selectSponsorCardStyle = features.hasVideoSponsorCardStyle
    ? "v.sponsor_card_style::text as sponsor_card_style"
    : "null::text as sponsor_card_style";
  const selectLocationNotes = features.hasVideoLocationInternalNotes
    ? "vl.internal_notes as location_internal_notes"
    : "null::text as location_internal_notes";
  const selectVideoSponsorIds = hasVideoSponsorRules
    ? "coalesce(array_remove(array_agg(distinct svr.sponsor_id::text), null), '{}'::text[]) as video_sponsor_ids"
    : "'{}'::text[] as video_sponsor_ids";
  const selectVideoSponsorNames = hasVideoSponsorRules
    ? "coalesce(array_remove(array_agg(distinct ss.brand_name), null), '{}'::text[]) as video_sponsor_names"
    : "'{}'::text[] as video_sponsor_names";
  const joinVideoSponsorRules = hasVideoSponsorRules ? "left join public.sponsor_video_rules svr on svr.video_id = v.id" : "";
  const joinVideoSponsorNames = hasVideoSponsorRules
    ? "left join public.sponsors ss on ss.id = svr.sponsor_id and ss.active = true"
    : "";
  const groupBy = hasVideoSponsorRules ? "group by v.id, vl.id" : "";

  return sql.query<VideoRow[]>(
    `
      select
        v.id,
        v.youtube_video_id,
        v.title,
        v.thumbnail_url,
        v.published_at,
        v.view_count,
        v.like_count,
        v.comment_count,
        v.location_status::text as location_status,
        v.verification_source,
        ${selectVisible},
        ${selectFeatured},
        ${selectInternalNotes},
        ${selectSponsorCardStyle},
        vl.id as location_id,
        vl.country_code,
        vl.country_name,
        vl.city,
        vl.region,
        vl.lat,
        vl.lng,
        vl.location_label,
        ${selectLocationNotes},
        ${selectVideoSponsorIds},
        ${selectVideoSponsorNames},
        v.sponsor_detection_status::text as sponsor_detection_status,
        v.sponsor_detectado_texto,
        v.sponsor_detectado_confianza,
        v.sponsor_detectado_fuente,
        v.updated_at
      from public.videos v
      left join public.video_locations vl on vl.video_id = v.id and vl.is_primary = true
      ${joinVideoSponsorRules}
      ${joinVideoSponsorNames}
      where v.channel_id = $1
        and coalesce(v.is_travel, true) = true
        and coalesce(v.is_short, false) = false
      ${groupBy}
      order by coalesce(v.published_at, v.created_at) desc
      limit 1200
    `,
    [channelId]
  );
}

async function loadAdminSponsors(ownerUserId: string, features: CreatorAdminSchemaFeatures) {
  const hasVideoSponsorRules = features.hasSponsorVideoRules;
  const selectStartDate = features.hasSponsorDates ? "s.start_date" : "null::timestamptz as start_date";
  const selectEndDate = features.hasSponsorDates ? "s.end_date" : "null::timestamptz as end_date";
  const selectInternalNotes = features.hasSponsorInternalNotes ? "s.internal_notes" : "null::text as internal_notes";
  const selectSponsorCardStyle = features.hasSponsorCardStyle ? "s.sponsor_card_style::text as sponsor_card_style" : "null::text as sponsor_card_style";
  const selectVideoIds = hasVideoSponsorRules
    ? "coalesce(array_remove(array_agg(distinct svr.video_id::text), null), '{}'::text[]) as video_ids"
    : "'{}'::text[] as video_ids";
  const joinVideoSponsorRules = hasVideoSponsorRules ? "left join public.sponsor_video_rules svr on svr.sponsor_id = s.id" : "";

  return sql.query<SponsorRow[]>(
    `
      select
        s.id,
        s.brand_name,
        s.logo_url,
        s.website_url,
        s.affiliate_url,
        s.discount_code,
        s.description,
        ${selectSponsorCardStyle},
        s.active,
        ${selectStartDate},
        ${selectEndDate},
        ${selectInternalNotes},
        coalesce(array_remove(array_agg(distinct sgr.country_code), null), '{}'::text[]) as country_codes,
        ${selectVideoIds},
        coalesce(count(distinct sc.id), 0)::int as click_count
      from public.sponsors s
      left join public.sponsor_geo_rules sgr on sgr.sponsor_id = s.id
      ${joinVideoSponsorRules}
      left join public.sponsor_clicks sc on sc.sponsor_id = s.id
      where s.user_id = $1
      group by s.id
      order by s.active desc, s.created_at desc
      limit 200
    `,
    [ownerUserId]
  );
}

async function loadAdminPollRows(channelId: string, features: CreatorAdminSchemaFeatures) {
  const selectVisibility = features.hasPollVisibility ? "visibility" : "'public'::text as visibility";
  const selectWinnerCountry = features.hasPollWinnerFields ? "winner_country_code" : "null::text as winner_country_code";
  const selectWinnerCity = features.hasPollWinnerFields ? "winner_city" : "null::text as winner_city";
  const selectConverted = features.hasPollWinnerFields
    ? "converted_to_destination"
    : "false::boolean as converted_to_destination";
  const selectSponsorId = features.hasPollSponsorFields ? "sponsor_id" : "null::uuid as sponsor_id";
  const selectSponsorUrl = features.hasPollSponsorFields ? "sponsor_url" : "null::text as sponsor_url";

  return sql.query<PollRow[]>(
    `
      select
        id,
        title,
        prompt,
        status::text as status,
        poll_mode,
        ${selectVisibility},
        show_popup,
        published_at,
        closes_at,
        created_at,
        updated_at,
        ${selectWinnerCountry},
        ${selectWinnerCity},
        ${selectConverted},
        ${selectSponsorId},
        ${selectSponsorUrl}
      from public.map_polls
      where channel_id = $1
      order by
        case when status = 'live' then 0 when status = 'draft' then 1 else 2 end,
        updated_at desc
      limit 40
    `,
    [channelId]
  );
}

async function loadAdminActivity(channelId: string, features: CreatorAdminSchemaFeatures) {
  if (!features.hasCreatorActivityLog) return [];
  return sql<CreatorAdminActivity[]>`
    select id, event_type, entity_type, entity_id, description, severity, created_at
    from public.creator_activity_log
    where channel_id = ${channelId}
    order by created_at desc
    limit 40
  `;
}

async function loadAdminSyncRows(channelId: string) {
  return sql<Array<{ status: string; error_message: string | null; finished_at: string | null; started_at: string | null; created_at: string }>>`
    select status::text as status, error_message, finished_at, started_at, created_at
    from public.map_sync_runs
    where channel_id = ${channelId}
    order by created_at desc
    limit 5
  `;
}

async function loadAudienceCountryRows(channelId: string) {
  return sql<Array<{ country_code: string; events: number | string }>>`
    select country_code, count(*)::int as events
    from public.map_events
    where channel_id = ${channelId}
      and country_code is not null
    group by country_code
    order by count(*) desc, country_code asc
    limit 10
  `;
}

async function loadAudienceVideoRows(channelId: string) {
  return sql<Array<{ youtube_video_id: string; title: string | null; events: number | string }>>`
    select me.youtube_video_id, max(v.title) as title, count(*)::int as events
    from public.map_events me
    left join public.videos v on v.youtube_video_id = me.youtube_video_id and v.channel_id = me.channel_id
    where me.channel_id = ${channelId}
      and me.youtube_video_id is not null
    group by me.youtube_video_id
    order by count(*) desc
    limit 10
  `;
}

async function loadSponsorClickRows(channelId: string) {
  return sql<Array<{ sponsor_id: string; brand_name: string; clicks: number | string }>>`
    select sc.sponsor_id::text as sponsor_id, s.brand_name, count(*)::int as clicks
    from public.sponsor_clicks sc
    inner join public.sponsors s on s.id = sc.sponsor_id
    where sc.channel_id = ${channelId}
    group by sc.sponsor_id, s.brand_name
    order by count(*) desc
    limit 10
  `;
}

function normalizeVideoRow(row: VideoRow, videoSponsors: CreatorAdminSponsor[]): CreatorAdminVideo {
  return {
    id: row.id,
    youtube_video_id: row.youtube_video_id,
    youtube_url: `https://youtube.com/watch?v=${row.youtube_video_id}`,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    published_at: row.published_at,
    view_count: row.view_count === null ? null : Number(row.view_count),
    like_count: row.like_count === null ? null : Number(row.like_count),
    comment_count: row.comment_count === null ? null : Number(row.comment_count),
    raw_location_status: row.location_status || "pending",
    ui_status: mapAdminLocationStatus(row.location_status),
    verification_source: row.verification_source,
    visible_on_map: row.visible_on_map !== false,
    featured: Boolean(row.featured),
    internal_notes: row.internal_notes,
    sponsor_card_style: row.sponsor_card_style as CreatorAdminVideo["sponsor_card_style"],
    location_id: row.location_id,
    country_code: row.country_code ? normalizeCountryCode(row.country_code) : null,
    country_name: row.country_name || row.country_code,
    city: row.city,
    region: row.region,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    label_public: row.location_label,
    location_internal_notes: row.location_internal_notes,
    sponsor_ids: Array.from(new Set([...(row.video_sponsor_ids || []), ...videoSponsors.map((sponsor) => sponsor.id)])),
    sponsor_names: Array.from(new Set([...(row.video_sponsor_names || []), ...videoSponsors.map((sponsor) => sponsor.brand_name)])),
    sponsor_detection_status:
      (row.sponsor_detection_status as CreatorAdminVideo["sponsor_detection_status"]) || "no_disponible",
    sponsor_detectado_texto: row.sponsor_detectado_texto || null,
    sponsor_detectado_confianza: row.sponsor_detectado_confianza === null ? null : Number(row.sponsor_detectado_confianza),
    sponsor_detectado_fuente: row.sponsor_detectado_fuente || null,
    updated_at: row.updated_at || null,
  };
}

function normalizeSponsorRow(row: SponsorRow): CreatorAdminSponsor {
  const countryCodes = (row.country_codes || []).map(normalizeCountryCode).filter(Boolean);
  const videoIds = row.video_ids || [];
  const scope = videoIds.length > 0 ? "video" : countryCodes.length > 0 ? "country" : "global";

  return {
    id: row.id,
    brand_name: row.brand_name,
    logo_url: row.logo_url,
    website_url: row.website_url,
    affiliate_url: row.affiliate_url,
    discount_code: row.discount_code,
    description: row.description,
    sponsor_card_style: normalizeSponsorCardStyle(row.sponsor_card_style),
    active: row.active,
    country_codes: countryCodes,
    video_ids: videoIds,
    scope,
    click_count: Number(row.click_count || 0),
    start_date: row.start_date,
    end_date: row.end_date,
    internal_notes: row.internal_notes,
  };
}

function buildSponsorCountryMap(sponsors: CreatorAdminSponsor[]) {
  const map = new Map<string, CreatorAdminSponsor[]>();
  for (const sponsor of sponsors) {
    if (!sponsor.active) continue;
    for (const code of sponsor.country_codes) {
      const current = map.get(code) || [];
      current.push(sponsor);
      map.set(code, current);
    }
  }
  return map;
}

function buildSponsorVideoMap(sponsors: CreatorAdminSponsor[]) {
  const map = new Map<string, CreatorAdminSponsor[]>();
  for (const sponsor of sponsors) {
    if (!sponsor.active) continue;
    for (const videoId of sponsor.video_ids) {
      const current = map.get(videoId) || [];
      current.push(sponsor);
      map.set(videoId, current);
    }
  }
  return map;
}

function attachScopedSponsorsToVideo(
  video: CreatorAdminVideo,
  sponsorByCountry: Map<string, CreatorAdminSponsor[]>,
  globalSponsors: CreatorAdminSponsor[]
) {
  const scopedSponsors = [...globalSponsors, ...(video.country_code ? sponsorByCountry.get(video.country_code) || [] : [])];
  return {
    ...video,
    sponsor_ids: Array.from(new Set([...video.sponsor_ids, ...scopedSponsors.map((sponsor) => sponsor.id)])),
    sponsor_names: Array.from(new Set([...video.sponsor_names, ...scopedSponsors.map((sponsor) => sponsor.brand_name)])),
  };
}

function buildCountryRollups(
  videos: CreatorAdminVideo[],
  sponsors: CreatorAdminSponsor[],
  sponsorByCountry: Map<string, CreatorAdminSponsor[]>,
  globalSponsors: CreatorAdminSponsor[]
): CreatorAdminCountry[] {
  const map = new Map<string, CreatorAdminCountry & { cityCounts: Map<string, number> }>();

  for (const video of videos) {
    if (!video.country_code) continue;
    const current = map.get(video.country_code) || {
      country_code: video.country_code,
      country_name: video.country_name || video.country_code,
      videos_count: 0,
      visible_videos_count: 0,
      cities_count: 0,
      top_cities: [],
      total_views: 0,
      total_likes: 0,
      sponsor_ids: [],
      sponsor_names: [],
      has_sponsor: false,
      cityCounts: new Map<string, number>(),
    };

    current.videos_count += 1;
    if (video.visible_on_map) current.visible_videos_count += 1;
    current.total_views += video.view_count || 0;
    current.total_likes += video.like_count || 0;
    const city = normalizeCity(video.city || "");
    if (city) current.cityCounts.set(city, (current.cityCounts.get(city) || 0) + 1);
    map.set(video.country_code, current);
  }

  return Array.from(map.values())
    .map((country) => {
      const scoped = [...globalSponsors, ...(sponsorByCountry.get(country.country_code) || [])];
      const countryVideoSponsorIds = new Set<string>();
      const countryVideoSponsorNames = new Set<string>();
      for (const sponsor of sponsors) {
        if (!sponsor.active || sponsor.scope !== "video") continue;
        const hasCountryVideo = videos.some((video) => video.country_code === country.country_code && sponsor.video_ids.includes(video.id));
        if (hasCountryVideo) {
          countryVideoSponsorIds.add(sponsor.id);
          countryVideoSponsorNames.add(sponsor.brand_name);
        }
      }
      const sponsorIds = Array.from(new Set([...scoped.map((sponsor) => sponsor.id), ...countryVideoSponsorIds]));
      const sponsorNames = Array.from(new Set([...scoped.map((sponsor) => sponsor.brand_name), ...countryVideoSponsorNames]));
      const topCities = Array.from(country.cityCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([city]) => city);

      return {
        country_code: country.country_code,
        country_name: country.country_name,
        videos_count: country.videos_count,
        visible_videos_count: country.visible_videos_count,
        cities_count: country.cityCounts.size,
        top_cities: topCities,
        total_views: country.total_views,
        total_likes: country.total_likes,
        sponsor_ids: sponsorIds,
        sponsor_names: sponsorNames,
        has_sponsor: sponsorIds.length > 0,
      };
    })
    .sort((a, b) => b.videos_count - a.videos_count || a.country_name.localeCompare(b.country_name));
}

async function hydrateAdminPolls(polls: PollRow[], videos: CreatorAdminVideo[]) {
  const countryNames = new Map(videos.map((video) => [video.country_code || "", video.country_name || video.country_code || ""]));
  const hydrated: CreatorAdminPoll[] = [];

  for (const poll of polls) {
    const [countryRows, cityRows, voteRows] = await Promise.all([
      sql<Array<{ country_code: string; sort_order: number | string }>>`
        select country_code, sort_order
        from public.map_poll_country_options
        where poll_id = ${poll.id}
        order by sort_order asc, country_code asc
      `,
      sql<Array<{ country_code: string; city: string; sort_order: number | string }>>`
        select country_code, city, sort_order
        from public.map_poll_city_options
        where poll_id = ${poll.id}
        order by country_code asc, sort_order asc, city asc
      `,
      sql<Array<{ country_code: string; city: string; votes: number | string }>>`
        select country_code, city, count(*)::int as votes
        from public.map_poll_votes
        where poll_id = ${poll.id}
        group by country_code, city
      `,
    ]);

    const voteMap = new Map<string, number>();
    let totalVotes = 0;
    for (const vote of voteRows) {
      const key = pollOptionKey(vote.country_code, vote.city);
      const count = Number(vote.votes || 0);
      voteMap.set(key, count);
      totalVotes += count;
    }

    const cityByCountry = new Map<string, string[]>();
    for (const city of cityRows) {
      const countryCode = normalizeCountryCode(city.country_code);
      const bucket = cityByCountry.get(countryCode) || [];
      bucket.push(normalizeCity(city.city));
      cityByCountry.set(countryCode, bucket);
    }

    const options: CreatorAdminPollOption[] = [];
    for (const country of countryRows) {
      const countryCode = normalizeCountryCode(country.country_code);
      const cities = cityByCountry.get(countryCode) || [];
      if (cities.length > 0) {
        for (const city of cities) {
          const votes = voteMap.get(pollOptionKey(countryCode, city)) || 0;
          options.push({
            country_code: countryCode,
            country_name: countryNames.get(countryCode) || countryCode,
            city,
            votes,
            percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
          });
        }
      } else {
        const votes = Array.from(voteMap.entries())
          .filter(([key]) => key.startsWith(`${countryCode}::`))
          .reduce((sum, [, count]) => sum + count, 0);
        options.push({
          country_code: countryCode,
          country_name: countryNames.get(countryCode) || countryCode,
          city: null,
          votes,
          percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
        });
      }
    }

    hydrated.push({
      id: poll.id,
      title: poll.title,
      prompt: poll.prompt,
      status: poll.status,
      poll_mode: poll.poll_mode === "country" ? "country" : "country_city",
      visibility: poll.visibility === "link_only" ? "link_only" : "public",
      show_popup: poll.show_popup,
      published_at: poll.published_at,
      closes_at: poll.closes_at,
      created_at: poll.created_at,
      updated_at: poll.updated_at,
      total_votes: totalVotes,
      winner_country_code: poll.winner_country_code,
      winner_city: poll.winner_city,
      converted_to_destination: Boolean(poll.converted_to_destination),
      sponsor_id: poll.sponsor_id,
      sponsor_url: poll.sponsor_url,
      options: options.sort((a, b) => b.votes - a.votes || a.country_name.localeCompare(b.country_name)),
    });
  }

  return hydrated;
}

function pollOptionKey(countryCode: string, city: string | null | undefined) {
  return `${normalizeCountryCode(countryCode)}::${normalizeCity(city || "__country__").toLowerCase()}`;
}

function buildSummary(videos: CreatorAdminVideo[], countries: CreatorAdminCountry[], polls: CreatorAdminPoll[]): CreatorAdminSummary {
  const activePoll = polls.find((poll) => poll.status === "live") || null;
  return {
    videos_mapped: videos.filter((video) => Boolean(video.country_code) && video.visible_on_map).length,
    videos_hidden: videos.filter((video) => !video.visible_on_map).length,
    countries_covered: countries.length,
    cities_covered: new Set(videos.map((video) => normalizeCity(video.city || "")).filter(Boolean)).size,
    pending_review: videos.filter((video) => video.ui_status === "pending" || video.ui_status === "unlocated").length,
    active_vote_count: activePoll?.total_votes || 0,
  };
}

function normalizeSyncStatus(
  row: { status: string; error_message: string | null; finished_at: string | null; started_at: string | null; created_at: string } | null,
  fallbackSyncedAt: string | null
): CreatorAdminSyncStatus {
  return {
    last_run_at: row?.finished_at || row?.started_at || fallbackSyncedAt || null,
    last_status: row?.status || (fallbackSyncedAt ? "completed" : null),
    last_error: row?.error_message || null,
  };
}

function buildAlerts(
  videos: CreatorAdminVideo[],
  sponsors: CreatorAdminSponsor[],
  polls: CreatorAdminPoll[],
  syncRow: { status: string; error_message: string | null } | null
): CreatorAdminAlert[] {
  const alerts: CreatorAdminAlert[] = [];
  const pendingCount = videos.filter((video) => video.ui_status === "pending" || video.ui_status === "unlocated").length;
  if (pendingCount > 0) {
    alerts.push({
      id: "pending-videos",
      severity: "warning",
      title: `${pendingCount} videos necesitan ubicacion`,
      description: "Revisalos para que el mapa publico no pierda cobertura.",
      href: "/map-admin-proposal?tab=videos&status=pending",
    });
  }
  if (syncRow?.status === "failed") {
    alerts.push({
      id: "sync-failed",
      severity: "error",
      title: "La ultima sync fallo",
      description: syncRow.error_message || "Revisar el importador antes de publicar nuevos cambios.",
      href: "/map-admin-proposal?tab=actividad",
    });
  }
  const brokenSponsors = sponsors.filter((sponsor) => sponsor.active && !sponsor.affiliate_url && !sponsor.website_url);
  if (brokenSponsors.length > 0) {
    alerts.push({
      id: "sponsors-without-url",
      severity: "warning",
      title: `${brokenSponsors.length} sponsors sin URL`,
      description: "No van a poder convertir clicks desde el mapa.",
      href: "/map-admin-proposal?tab=sponsors",
    });
  }
  const unpublishedClosed = polls.filter((poll) => poll.status === "closed" && !poll.published_at);
  if (unpublishedClosed.length > 0) {
    alerts.push({
      id: "closed-polls",
      severity: "info",
      title: "Hay votaciones cerradas sin publicar",
      description: "Publicar el resultado ayuda a conectar audiencia, destino y sponsor.",
      href: "/map-admin-proposal?tab=votaciones",
    });
  }
  return alerts;
}

function buildActivity(
  rows: CreatorAdminActivity[],
  videos: CreatorAdminVideo[],
  syncRow: { status: string; finished_at: string | null; started_at: string | null; created_at: string } | null
): CreatorAdminActivity[] {
  if (rows.length > 0) return rows;
  const synthetic: CreatorAdminActivity[] = [];
  const latestVideo = videos[0] || null;
  if (latestVideo) {
    synthetic.push({
      id: `video-${latestVideo.id}`,
      event_type: "video_imported",
      entity_type: "video",
      entity_id: latestVideo.id,
      description: `Video "${latestVideo.title}" disponible en el panel`,
      severity: latestVideo.ui_status === "unlocated" ? "warning" : "info",
      created_at: latestVideo.published_at || new Date().toISOString(),
    });
  }
  if (syncRow) {
    synthetic.push({
      id: `sync-${syncRow.created_at}`,
      event_type: syncRow.status === "failed" ? "sync_error" : "sync_completed",
      entity_type: "sync",
      entity_id: null,
      description: syncRow.status === "failed" ? "Ultima sincronizacion con error" : "Ultima sincronizacion completada",
      severity: syncRow.status === "failed" ? "error" : "info",
      created_at: syncRow.finished_at || syncRow.started_at || syncRow.created_at,
    });
  }
  return synthetic;
}

export function buildQuickAction({
  videos,
  countries,
  polls,
  syncStatus,
}: {
  videos: CreatorAdminVideo[];
  countries: CreatorAdminCountry[];
  polls: CreatorAdminPoll[];
  sponsors: CreatorAdminSponsor[];
  syncStatus: CreatorAdminSyncStatus;
}): CreatorAdminQuickAction {
  const pendingCount = videos.filter((video) => video.ui_status === "pending" || video.ui_status === "unlocated").length;
  if (pendingCount > 0) {
    return {
      severity: "warning",
      label: `Tenes ${pendingCount} videos sin ubicacion final.`,
      cta: "Ubicar ahora",
      href: "/map-admin-proposal?tab=videos&status=pending",
    };
  }

  const activePoll = polls.find((poll) => poll.status === "live" && poll.total_votes > 0) || null;
  if (activePoll) {
    const createdMs = new Date(activePoll.created_at).getTime();
    const ageDays = Number.isFinite(createdMs) ? (Date.now() - createdMs) / 86400000 : 0;
    if (ageDays > 7) {
      return {
        severity: "info",
        label: "La votacion activa ya tiene ganador provisional.",
        cta: "Ver resultado",
        href: "/map-admin-proposal?tab=votaciones",
      };
    }
  }

  const countryOpportunity = countries.find((country) => country.videos_count > 5 && !country.has_sponsor) || null;
  if (countryOpportunity) {
    return {
      severity: "warning",
      label: `${countryOpportunity.country_name} tiene ${countryOpportunity.videos_count} videos sin sponsor asociado.`,
      cta: "Crear oportunidad",
      href: `/map-admin-proposal?tab=paises&country=${encodeURIComponent(countryOpportunity.country_code)}`,
    };
  }

  const latestPollMs = polls[0]?.created_at ? new Date(polls[0].created_at).getTime() : 0;
  const hasRecentPoll = latestPollMs > 0 && Date.now() - latestPollMs < 30 * 86400000;
  if (!polls.some((poll) => poll.status === "live") && !hasRecentPoll) {
    return {
      severity: "info",
      label: "No hay votacion activa para orientar el proximo destino.",
      cta: "Crear votacion",
      href: "/map-admin-proposal?tab=votaciones&modal=new-vote",
    };
  }

  return {
    severity: "success",
    label: `Todo al dia. Ultima sync: ${formatAdminRelativeTime(syncStatus.last_run_at)}.`,
    cta: "Ver actividad",
    href: "/map-admin-proposal?tab=actividad",
  };
}
