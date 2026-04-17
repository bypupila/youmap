import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { DEMO_CHANNEL, DEMO_VIDEO_LOCATIONS, DEMO_CHANNEL_SLUG, isDemoChannelId } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

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
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  published_at: string | null;
  location_status: string | null;
  video_verification_source: string | null;
  video_location_score: number | string | null;
  video_location_evidence: Record<string, unknown> | null;
  video_needs_manual_reason: string | null;
}

export async function loadChannelViewByChannelId(channelId: string): Promise<{ channel: TravelChannel; videoLocations: TravelVideoLocation[] } | null> {
  if (isDemoChannelId(channelId) || channelId === DEMO_CHANNEL_SLUG) {
    return {
      channel: DEMO_CHANNEL,
      videoLocations: DEMO_VIDEO_LOCATIONS,
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
    }>
  >`
    select id, user_id, channel_name, channel_handle, thumbnail_url, subscriber_count
    from public.channels
    where id = ${channelId}
    limit 1
  `;
  const channel = channelRows[0] || null;
  if (!channel) return null;

  const locations = await sql<RawLocationRow[]>`
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
      vl.travel_type,
      v.youtube_video_id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.view_count,
      v.like_count,
      v.comment_count,
      v.published_at,
      v.location_status,
      v.verification_source as video_verification_source,
      v.location_score as video_location_score,
      v.location_evidence as video_location_evidence,
      v.needs_manual_reason as video_needs_manual_reason
    from public.video_locations vl
    inner join public.videos v on v.id = vl.video_id
    where vl.channel_id = ${channel.id}
      and vl.is_primary = true
    limit 2000
  `;

  const normalized: TravelVideoLocation[] = (locations || [])
    .map((row) => ({
      country_code: row.country_code,
      country_name: row.country_name || row.country_code,
      location_label: row.location_label,
      city: row.city,
      region: row.region,
      lat: Number(row.lat),
      lng: Number(row.lng),
      confidence_score: Number(row.confidence_score || 0),
      location_score: Number(row.video_location_score || row.location_score || 0) || null,
      verification_source: (row.video_verification_source || row.verification_source || null) as TravelVideoLocation["verification_source"],
      location_source: row.source || null,
      location_evidence: (row.video_location_evidence || row.location_evidence || null) as Record<string, unknown> | null,
      needs_manual_reason: row.video_needs_manual_reason || row.needs_manual_reason || null,
      location_status: row.location_status as TravelVideoLocation["location_status"],
      travel_type: row.travel_type,
      youtube_video_id: row.youtube_video_id,
      video_url: `https://youtube.com/watch?v=${row.youtube_video_id}`,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      view_count: Number(row.view_count || 0),
      like_count: Number(row.like_count || 0) || null,
      comment_count: Number(row.comment_count || 0) || null,
      published_at: row.published_at,
    }))
    .filter(Boolean) as TravelVideoLocation[];

  return {
    channel,
    videoLocations: normalized,
  };
}
