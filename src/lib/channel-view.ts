import { createServiceRoleClient } from "@/lib/supabase-service";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { DEMO_CHANNEL, DEMO_VIDEO_LOCATIONS, DEMO_CHANNEL_SLUG, isDemoChannelId } from "@/lib/demo-data";

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
  travel_type: string | null;
  videos: Array<{
    youtube_video_id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    view_count: number | string | null;
    like_count: number | string | null;
    comment_count: number | string | null;
    published_at: string | null;
    location_status: string | null;
    verification_source: string | null;
    location_score: number | string | null;
    location_evidence: Record<string, unknown> | null;
    needs_manual_reason: string | null;
  }>;
}

export async function loadChannelViewByChannelId(channelId: string): Promise<{ channel: TravelChannel; videoLocations: TravelVideoLocation[] } | null> {
  if (isDemoChannelId(channelId) || channelId === DEMO_CHANNEL_SLUG) {
    return {
      channel: DEMO_CHANNEL,
      videoLocations: DEMO_VIDEO_LOCATIONS,
    };
  }

  const supabase = createServiceRoleClient();

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("id,user_id,channel_name,channel_handle,thumbnail_url,subscriber_count")
    .eq("id", channelId)
    .maybeSingle();

  if (channelError || !channel) return null;

  const { data: locations, error: locationError } = await supabase
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
      travel_type,
      videos!inner(
        youtube_video_id,
        title,
        description,
        thumbnail_url,
        view_count,
        like_count,
        comment_count,
        published_at,
        location_status,
        verification_source,
        location_score,
        location_evidence,
        needs_manual_reason
      )
    `
    )
    .eq("videos.channel_id", channel.id)
    .eq("is_primary", true)
    .limit(2000);

  if (locationError) {
    console.error("[channel-view] locations error", locationError.message);
    return {
      channel,
      videoLocations: [],
    };
  }

  const normalized: TravelVideoLocation[] = ((locations || []) as RawLocationRow[])
    .map((row) => {
      const video = row.videos?.[0];
      if (!video) return null;

      return {
        country_code: row.country_code,
        country_name: row.country_name || row.country_code,
        location_label: row.location_label,
        city: row.city,
        region: row.region,
        lat: Number(row.lat),
        lng: Number(row.lng),
        confidence_score: Number(row.confidence_score || 0),
        location_score: Number(video.location_score || row.location_score || 0) || null,
        verification_source: (video.verification_source || row.verification_source || null) as TravelVideoLocation["verification_source"],
        location_source: row.source || null,
        location_evidence: (video.location_evidence || row.location_evidence || null) as Record<string, unknown> | null,
        needs_manual_reason: video.needs_manual_reason || row.needs_manual_reason || null,
        location_status: video.location_status as TravelVideoLocation["location_status"],
        travel_type: row.travel_type,
        youtube_video_id: video.youtube_video_id,
        video_url: `https://youtube.com/watch?v=${video.youtube_video_id}`,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnail_url,
        view_count: Number(video.view_count || 0),
        like_count: Number(video.like_count || 0) || null,
        comment_count: Number(video.comment_count || 0) || null,
        published_at: video.published_at,
      } satisfies TravelVideoLocation;
    })
    .filter(Boolean) as TravelVideoLocation[];

  return {
    channel,
    videoLocations: normalized,
  };
}
