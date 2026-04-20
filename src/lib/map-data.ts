import { DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_VIDEO_LOCATIONS, isDemoChannelId } from "@/lib/demo-data";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";
import { loadDrewMapData } from "@/lib/drew-map-data";
import { sql } from "@/lib/neon";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export interface MapSummary {
  total_videos: number;
  total_countries: number;
  verified_auto: number;
  verified_manual: number;
  needs_manual: number;
}

export interface ManualVerificationItem {
  video_id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  country_code: string | null;
  city: string | null;
  needs_manual_reason: string | null;
}

export interface MapDataPayload {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  manualQueue: ManualVerificationItem[];
  summary: MapSummary;
}

interface RawLocationRow {
  country_code: string;
  country_name: string | null;
  location_label: string | null;
  city: string | null;
  region: string | null;
  lat: number | string;
  lng: number | string;
  confidence_score: number | string | null;
  location_score: number | string | null;
  verification_source: string | null;
  location_evidence: Record<string, unknown> | null;
  needs_manual_reason: string | null;
  source: string | null;
  video_id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  duration_seconds: number | string | null;
  is_short: boolean | null;
  is_travel: boolean | null;
  travel_score: number | string | null;
  travel_signals: string[] | null;
  inclusion_reason: string | null;
  exclusion_reason: string | null;
  recording_lat: number | string | null;
  recording_lng: number | string | null;
  recording_location_description: string | null;
  published_at: string | null;
  travel_type: string | null;
  location_status: string | null;
  video_verification_source: string | null;
  video_location_score: number | string | null;
  video_location_evidence: Record<string, unknown> | null;
  video_needs_manual_reason: string | null;
}

function computeSummary(videoLocations: TravelVideoLocation[], manualQueue: ManualVerificationItem[]): MapSummary {
  const totalCountries = new Set(videoLocations.map((row) => row.country_code).filter(Boolean)).size;
  let verifiedAuto = 0;
  let verifiedManual = 0;

  for (const video of videoLocations) {
    if (video.location_status === "verified_manual") {
      verifiedManual += 1;
      continue;
    }
    if (video.location_status === "verified_auto" || video.location_status === "mapped") {
      verifiedAuto += 1;
    }
  }

  return {
    total_videos: videoLocations.length + manualQueue.length,
    total_countries: totalCountries,
    verified_auto: verifiedAuto,
    verified_manual: verifiedManual,
    needs_manual: manualQueue.length,
  };
}

function normalizeDemoVideoRows(): TravelVideoLocation[] {
  return DEMO_VIDEO_LOCATIONS.map((video) => ({
    ...video,
    video_url: `https://youtube.com/watch?v=${video.youtube_video_id}`,
    like_count: null,
    comment_count: null,
    location_status: "verified_auto",
    verification_source: "heuristic",
    location_source: "demo",
    location_score: video.confidence_score || 0.8,
    city: video.location_label || null,
    region: null,
    location_evidence: { source: "demo_seed" },
    needs_manual_reason: null,
    is_short: false,
    is_travel: true,
  }));
}

export async function loadMapDataByChannelId(channelId: string): Promise<MapDataPayload | null> {
  if (!channelId) return null;

  if (channelId === "luisito-global-map") {
    const local = await loadLuisitoMapData();
    const rows = local.videoLocations.map((video) => ({
      ...video,
      video_url: video.video_url || `https://youtube.com/watch?v=${video.youtube_video_id}`,
      location_status: video.location_status || "verified_auto",
      verification_source: video.verification_source || "heuristic",
      location_score: video.location_score || video.confidence_score || 0.75,
      needs_manual_reason: video.needs_manual_reason || null,
      is_short: false,
      is_travel: true,
    }));
    return {
      channel: local.channel,
      videoLocations: rows,
      manualQueue: [],
      summary: computeSummary(rows, []),
    };
  }

  if (channelId === "drew-global-map") {
    const local = await loadDrewMapData();
    const rows = local.videoLocations.map((video) => ({
      ...video,
      video_url: video.video_url || `https://youtube.com/watch?v=${video.youtube_video_id}`,
      location_status: video.location_status || "verified_auto",
      verification_source: video.verification_source || "heuristic",
      location_score: video.location_score || video.confidence_score || 0.75,
      needs_manual_reason: video.needs_manual_reason || null,
      is_short: false,
      is_travel: true,
    }));
    return {
      channel: local.channel,
      videoLocations: rows,
      manualQueue: [],
      summary: computeSummary(rows, []),
    };
  }

  if (isDemoChannelId(channelId) || channelId === DEMO_CHANNEL_SLUG) {
    const demoRows = normalizeDemoVideoRows();
    const summary = computeSummary(demoRows, []);
    return {
      channel: DEMO_CHANNEL,
      videoLocations: demoRows,
      manualQueue: [],
      summary,
    };
  }

  const channelRows = await sql<
    Array<{
      id: string;
      user_id: string;
      channel_name: string;
      channel_handle: string | null;
      thumbnail_url: string | null;
      subscriber_count: number | null;
      youtube_channel_id: string | null;
      last_synced_at: string | null;
    }>
  >`
    select
      id,
      user_id,
      channel_name,
      channel_handle,
      thumbnail_url,
      subscriber_count,
      youtube_channel_id,
      last_synced_at
    from public.channels
    where id = ${channelId}
    limit 1
  `;

  const channelRow = channelRows[0];
  if (!channelRow) return null;

  const [locationRows, manualRows] = await Promise.all([
    sql<RawLocationRow[]>`
      select
        vl.country_code,
        vl.country_name,
        vl.location_label,
        vl.city,
        vl.region,
        vl.lat,
        vl.lng,
        vl.confidence_score,
        vl.location_score,
        vl.verification_source,
        vl.location_evidence,
        vl.needs_manual_reason,
        vl.source,
        v.id as video_id,
        v.youtube_video_id,
        v.title,
        v.description,
        v.thumbnail_url,
        v.view_count,
        v.like_count,
        v.comment_count,
        v.duration_seconds,
        v.is_short,
        v.is_travel,
        v.travel_score,
        v.travel_signals,
        v.inclusion_reason,
        v.exclusion_reason,
        v.recording_lat,
        v.recording_lng,
        v.recording_location_description,
        v.published_at,
        v.travel_type,
        v.location_status,
        v.verification_source as video_verification_source,
        v.location_score as video_location_score,
        v.location_evidence as video_location_evidence,
        v.needs_manual_reason as video_needs_manual_reason
      from public.video_locations vl
      inner join public.videos v on v.id = vl.video_id
      where vl.channel_id = ${channelRow.id}
        and vl.is_primary = true
        and v.location_status in ('mapped', 'verified_auto', 'verified_manual')
        and coalesce(v.is_travel, true) = true
        and coalesce(v.is_short, false) = false
      limit 4000
    `,
    sql<
      Array<{
        id: string;
        youtube_video_id: string;
        title: string;
        thumbnail_url: string | null;
        published_at: string | null;
        location_status: string | null;
        needs_manual_reason: string | null;
      }>
    >`
      select
        id,
        youtube_video_id,
        title,
        thumbnail_url,
        published_at,
        location_status,
        needs_manual_reason
      from public.videos
      where channel_id = ${channelRow.id}
        and (
          location_status = 'needs_manual'
          or (
            coalesce(is_travel, true) = true
            and coalesce(is_short, false) = false
            and location_status in ('no_location', 'failed')
          )
        )
      order by published_at desc
      limit 300
    `,
  ]);

  const locations = (locationRows || [])
    .map((row) => {
      const locationStatus = row.location_status as TravelVideoLocation["location_status"];
      const verificationSource =
        (row.video_verification_source as TravelVideoLocation["verification_source"]) ||
        (row.verification_source as TravelVideoLocation["verification_source"]) ||
        null;

      return {
        youtube_video_id: row.youtube_video_id,
        video_url: `https://youtube.com/watch?v=${row.youtube_video_id}`,
        title: row.title,
        description: row.description,
        thumbnail_url: row.thumbnail_url,
        published_at: row.published_at,
        view_count: Number(row.view_count || 0),
        like_count: Number(row.like_count || 0) || null,
        comment_count: Number(row.comment_count || 0) || null,
        duration_seconds: Number(row.duration_seconds || 0) || null,
        is_short: Boolean(row.is_short),
        is_travel: row.is_travel !== false,
        travel_score: Number(row.travel_score || 0) || null,
        travel_signals: Array.isArray(row.travel_signals) ? row.travel_signals : [],
        inclusion_reason: row.inclusion_reason || null,
        exclusion_reason: row.exclusion_reason || null,
        recording_lat: Number(row.recording_lat || 0) || null,
        recording_lng: Number(row.recording_lng || 0) || null,
        recording_location_description: row.recording_location_description || null,
        travel_type: row.travel_type,
        country_code: row.country_code,
        country_name: row.country_name || row.country_code,
        location_label: row.location_label,
        city: row.city,
        region: row.region,
        lat: Number(row.lat),
        lng: Number(row.lng),
        confidence_score: Number(row.confidence_score || 0) || null,
        location_status: locationStatus,
        location_source: row.source || null,
        verification_source: verificationSource,
        location_score: Number(row.video_location_score || row.location_score || 0) || null,
        location_evidence: (row.video_location_evidence || row.location_evidence || null) as Record<string, unknown> | null,
        needs_manual_reason: row.video_needs_manual_reason || row.needs_manual_reason || null,
      } satisfies TravelVideoLocation;
    })
    .filter(Boolean) as TravelVideoLocation[];

  const manualQueue = (manualRows || []).map((video) => ({
    video_id: video.id,
    youtube_video_id: video.youtube_video_id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    published_at: video.published_at,
    country_code: null,
    city: null,
    needs_manual_reason:
      video.needs_manual_reason ||
      (video.location_status === "failed"
        ? "No se pudo geocodificar automaticamente la ubicacion detectada."
        : "No se pudo confirmar la ubicacion automaticamente."),
  }));

  return {
    channel: channelRow as TravelChannel,
    videoLocations: locations,
    manualQueue,
    summary: computeSummary(locations, manualQueue),
  };
}
