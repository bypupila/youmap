export interface TravelVideo {
  id?: string;
  youtube_video_id: string;
  video_url?: string | null;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  published_at?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  duration_seconds?: number | null;
  is_short?: boolean | null;
  is_travel?: boolean | null;
  travel_score?: number | null;
  travel_signals?: string[] | null;
  inclusion_reason?: string | null;
  exclusion_reason?: string | null;
  recording_lat?: number | null;
  recording_lng?: number | null;
  recording_location_description?: string | null;
  travel_type?: string | null;
  city?: string | null;
  region?: string | null;
  location_status?: "pending" | "processing" | "mapped" | "no_location" | "failed" | "verified_auto" | "needs_manual" | "verified_manual" | null;
  location_source?: string | null;
  verification_source?: "heuristic" | "nominatim" | "gemini" | "manual" | "youtube_recording_details" | null;
  location_score?: number | null;
  location_evidence?: Record<string, unknown> | null;
  needs_manual_reason?: string | null;
}

export interface TravelVideoLocation extends TravelVideo {
  country_code: string;
  country_name?: string | null;
  location_label?: string | null;
  lat: number;
  lng: number;
  confidence_score?: number | null;
}

export interface TravelChannel {
  id: string;
  user_id: string;
  channel_name: string;
  channel_handle?: string | null;
  canonicalHandle?: string | null;
  youtube_channel_id?: string | null;
  thumbnail_url?: string | null;
  subscriber_count?: number | null;
  last_synced_at?: string | null;
}
