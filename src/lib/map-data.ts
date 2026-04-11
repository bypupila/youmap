import { createServiceRoleClient } from "@/lib/supabase-service";
import { DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_VIDEO_LOCATIONS, isDemoChannelId } from "@/lib/demo-data";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";
import { loadDrewMapData } from "@/lib/drew-map-data";
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
  videos: Array<{
    id: string;
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
    verification_source: string | null;
    location_score: number | string | null;
    location_evidence: Record<string, unknown> | null;
    needs_manual_reason: string | null;
  }>;
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
    total_videos: videoLocations.length,
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

  const service = createServiceRoleClient();

  const { data: channelRow, error: channelError } = await service
    .from("channels")
    .select("id,user_id,channel_name,channel_handle,thumbnail_url,subscriber_count,youtube_channel_id,last_synced_at")
    .eq("id", channelId)
    .maybeSingle();

  if (channelError || !channelRow) {
    return null;
  }

  const [locationsResult, manualQueueResult] = await Promise.all([
    service
      .from("video_locations")
      .select(
        `
        country_code,
        country_name,
        location_label,
        city,
        region,
        lat,
        lng,
        confidence_score,
        location_score,
        verification_source,
        location_evidence,
        needs_manual_reason,
        source,
        videos!inner(
          id,
          youtube_video_id,
          title,
          description,
          thumbnail_url,
          view_count,
          like_count,
          comment_count,
          duration_seconds,
          is_short,
          is_travel,
          travel_score,
          travel_signals,
          inclusion_reason,
          exclusion_reason,
          recording_lat,
          recording_lng,
          recording_location_description,
          published_at,
          travel_type,
          location_status,
          verification_source,
          location_score,
          location_evidence,
          needs_manual_reason
        )
      `
      )
      .eq("channel_id", channelRow.id)
      .eq("is_primary", true)
      .eq("videos.is_travel", true)
      .eq("videos.is_short", false)
      .limit(4000),
    service
      .from("videos")
      .select("id,youtube_video_id,title,thumbnail_url,published_at,location_status,needs_manual_reason")
      .eq("channel_id", channelRow.id)
      .eq("location_status", "needs_manual")
      .order("published_at", { ascending: false })
      .limit(300),
  ]);

  if (locationsResult.error) {
    console.error("[map-data] locations error", locationsResult.error.message);
    return {
      channel: channelRow as TravelChannel,
      videoLocations: [],
      manualQueue: [],
      summary: {
        total_videos: 0,
        total_countries: 0,
        verified_auto: 0,
        verified_manual: 0,
        needs_manual: 0,
      },
    };
  }

  const locations = ((locationsResult.data || []) as RawLocationRow[])
    .map((row) => {
      const video = row.videos?.[0];
      if (!video) return null;
      const locationStatus = video.location_status as TravelVideoLocation["location_status"];
      const verificationSource =
        (video.verification_source as TravelVideoLocation["verification_source"]) ||
        (row.verification_source as TravelVideoLocation["verification_source"]) ||
        null;

      return {
        youtube_video_id: video.youtube_video_id,
        video_url: `https://youtube.com/watch?v=${video.youtube_video_id}`,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnail_url,
        published_at: video.published_at,
        view_count: Number(video.view_count || 0),
        like_count: Number(video.like_count || 0) || null,
        comment_count: Number(video.comment_count || 0) || null,
        duration_seconds: Number(video.duration_seconds || 0) || null,
        is_short: Boolean(video.is_short),
        is_travel: video.is_travel !== false,
        travel_score: Number(video.travel_score || 0) || null,
        travel_signals: Array.isArray(video.travel_signals) ? video.travel_signals : [],
        inclusion_reason: video.inclusion_reason || null,
        exclusion_reason: video.exclusion_reason || null,
        recording_lat: Number(video.recording_lat || 0) || null,
        recording_lng: Number(video.recording_lng || 0) || null,
        recording_location_description: video.recording_location_description || null,
        travel_type: video.travel_type,
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
        location_score: Number(video.location_score || row.location_score || 0) || null,
        location_evidence: (video.location_evidence || row.location_evidence || null) as Record<string, unknown> | null,
        needs_manual_reason: video.needs_manual_reason || row.needs_manual_reason || null,
      } satisfies TravelVideoLocation;
    })
    .filter(Boolean) as TravelVideoLocation[];

  const manualQueue = ((manualQueueResult.data || []) as Array<{
    id: string;
    youtube_video_id: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
    needs_manual_reason: string | null;
  }>).map((video) => ({
    video_id: video.id,
    youtube_video_id: video.youtube_video_id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    published_at: video.published_at,
    country_code: null,
    city: null,
    needs_manual_reason: video.needs_manual_reason || "No se pudo confirmar la ubicacion automaticamente.",
  }));

  return {
    channel: channelRow as TravelChannel,
    videoLocations: locations,
    manualQueue,
    summary: computeSummary(locations, manualQueue),
  };
}
