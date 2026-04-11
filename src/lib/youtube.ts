import { readRequiredEnv, sanitizeEnvValue } from "@/lib/env";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannelResolution {
  youtube_channel_id: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  description: string | null;
  uploads_playlist_id: string;
  published_at: string | null;
  raw: unknown;
}

export interface YouTubeVideoRecord {
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration_seconds: number | null;
  is_short: boolean;
  recording_lat: number | null;
  recording_lng: number | null;
  recording_location_description: string | null;
  raw: unknown;
}

interface YouTubePlaylistItem {
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  recordingDetails?: {
    location?: {
      latitude?: number;
      longitude?: number;
    };
    locationDescription?: string;
  };
}

function parseIsoDurationToSeconds(duration?: string) {
  if (!duration || typeof duration !== "string" || !duration.startsWith("P")) return null;
  const matches = duration.match(
    /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/
  );
  if (!matches) return null;

  const years = Number(matches[1] || 0);
  const months = Number(matches[2] || 0);
  const weeks = Number(matches[3] || 0);
  const days = Number(matches[4] || 0);
  const hours = Number(matches[5] || 0);
  const minutes = Number(matches[6] || 0);
  const seconds = Number(matches[7] || 0);

  return (
    years * 31_536_000 +
    months * 2_592_000 +
    weeks * 604_800 +
    days * 86_400 +
    hours * 3_600 +
    minutes * 60 +
    seconds
  );
}

function isYouTubeShort(params: { durationSeconds: number | null; title?: string; description?: string }) {
  const { durationSeconds, title, description } = params;
  if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds <= 60) {
    return true;
  }

  const text = `${title || ""} ${description || ""}`.toLowerCase();
  if (text.includes("#shorts") && typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds <= 90) {
    return true;
  }

  return false;
}

const TRAVEL_PLAYLIST_HINTS = [
  "travel",
  "trip",
  "journey",
  "world",
  "viaje",
  "viajes",
  "turismo",
  "aventura",
  "adventure",
  "vacation",
  "vacaciones",
  "backpacking",
  "roadtrip",
  "road trip",
  "nomad",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function looksLikeTravelPlaylist(input: { title?: string; description?: string }) {
  const merged = normalize(`${input.title || ""} ${input.description || ""}`);
  return TRAVEL_PLAYLIST_HINTS.some((hint) => merged.includes(normalize(hint)));
}

function getYoutubeApiKey() {
  return readRequiredEnv(process.env.YOUTUBE_API_KEY, "YOUTUBE_API_KEY");
}

function extractHandleFromInput(value: string) {
  const trimmed = sanitizeEnvValue(value);
  if (!trimmed) return null;

  if (trimmed.startsWith("@")) {
    return trimmed.slice(1);
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "@") return parts[1] || null;
    if (parts[0]?.startsWith("@")) return parts[0].slice(1);
    if (parts[0] === "channel") return parts[1] || null;
    if (parts[0] === "user" || parts[0] === "c") return parts[1] || null;
    return parts[0] || null;
  } catch {
    const withoutAt = trimmed.replace(/^https?:\/\/(www\.)?youtube\.com\//i, "");
    const parts = withoutAt.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return parts[0].slice(1);
    return parts[0] || null;
  }
}

function extractChannelIdFromInput(value: string) {
  const trimmed = sanitizeEnvValue(value);
  if (!trimmed) return null;

  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel") return parts[1] || null;
  } catch {
    // fall through
  }

  return null;
}

async function youtubeFetch<T>(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  url.searchParams.set("key", getYoutubeApiKey());

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API error on ${path}: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

async function resolveChannelById(channelId: string): Promise<YouTubeChannelResolution | null> {
  const response = await youtubeFetch<{
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      statistics?: {
        subscriberCount?: string;
      };
      contentDetails?: {
        relatedPlaylists?: {
          uploads?: string;
        };
      };
    }>;
  }>("channels", {
    part: "snippet,statistics,contentDetails",
    id: channelId,
    maxResults: 1,
  });

  const channel = response.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads || "";
  if (!channel?.id || !uploadsPlaylistId) return null;

  return {
    youtube_channel_id: channel.id,
    channel_name: channel.snippet?.title || "YouTube channel",
    channel_handle: null,
    thumbnail_url:
      channel.snippet?.thumbnails?.high?.url ||
      channel.snippet?.thumbnails?.medium?.url ||
      channel.snippet?.thumbnails?.default?.url ||
      null,
    subscriber_count: channel.statistics?.subscriberCount ? Number(channel.statistics.subscriberCount) : null,
    description: channel.snippet?.description || null,
    uploads_playlist_id: uploadsPlaylistId,
    published_at: channel.snippet?.publishedAt || null,
    raw: channel,
  };
}

async function searchChannelByHandleOrName(query: string): Promise<YouTubeChannelResolution | null> {
  const normalized = sanitizeEnvValue(query).replace(/^@/, "");
  if (!normalized) return null;

  const searchResponse = await youtubeFetch<{
    items?: Array<{
      id?: {
        channelId?: string;
      };
    }>;
  }>("search", {
    part: "snippet",
    type: "channel",
    q: normalized,
    maxResults: 5,
  });

  const candidateId = searchResponse.items?.[0]?.id?.channelId || null;
  if (!candidateId) return null;

  const resolved = await resolveChannelById(candidateId);
  if (!resolved) return null;

  return {
    ...resolved,
    channel_handle: query.startsWith("@") ? query : `@${normalized}`,
  };
}

export async function resolveYouTubeChannel(input: string): Promise<YouTubeChannelResolution> {
  const channelId = extractChannelIdFromInput(input);
  if (channelId) {
    const resolved = await resolveChannelById(channelId);
    if (resolved) return resolved;
  }

  const handle = extractHandleFromInput(input);
  if (handle) {
    const resolved = await searchChannelByHandleOrName(handle);
    if (resolved) return resolved;
  }

  throw new Error("No pudimos resolver el canal de YouTube. Usa un enlace a /channel/... o /@handle.");
}

export async function loadUploadsPlaylistVideos(playlistId: string) {
  const videos: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const response = await youtubeFetch<{
      items?: YouTubePlaylistItem[];
      nextPageToken?: string;
    }>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: 50,
      pageToken,
    });

    videos.push(...(response.items || []));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return videos;
}

export async function loadVideoDetails(videoIds: string[]) {
  const details = new Map<string, YouTubeVideoRecord>();

  for (let index = 0; index < videoIds.length; index += 50) {
    const batch = videoIds.slice(index, index + 50);
    const response = await youtubeFetch<{
      items?: YouTubeVideoItem[];
    }>("videos", {
      part: "snippet,statistics,contentDetails,recordingDetails",
      id: batch.join(","),
      maxResults: batch.length,
    });

    for (const video of response.items || []) {
      if (!video.id) continue;
      const durationSeconds = parseIsoDurationToSeconds(video.contentDetails?.duration);
      const isShort = isYouTubeShort({
        durationSeconds,
        title: video.snippet?.title,
        description: video.snippet?.description,
      });
      details.set(video.id, {
        youtube_video_id: video.id,
        title: video.snippet?.title || "Untitled video",
        description: video.snippet?.description || null,
        thumbnail_url:
          video.snippet?.thumbnails?.high?.url ||
          video.snippet?.thumbnails?.medium?.url ||
          video.snippet?.thumbnails?.default?.url ||
          null,
        published_at: video.snippet?.publishedAt || null,
        view_count: video.statistics?.viewCount ? Number(video.statistics.viewCount) : null,
        like_count: video.statistics?.likeCount ? Number(video.statistics.likeCount) : null,
        comment_count: video.statistics?.commentCount ? Number(video.statistics.commentCount) : null,
        duration_seconds: durationSeconds,
        is_short: isShort,
        recording_lat:
          typeof video.recordingDetails?.location?.latitude === "number" ? Number(video.recordingDetails.location.latitude) : null,
        recording_lng:
          typeof video.recordingDetails?.location?.longitude === "number" ? Number(video.recordingDetails.location.longitude) : null,
        recording_location_description: video.recordingDetails?.locationDescription || null,
        raw: video,
      });
    }
  }

  return details;
}

export async function loadTravelPlaylistVideoIds(channelId: string) {
  const playlistIds: string[] = [];
  let playlistToken: string | undefined;

  do {
    const response = await youtubeFetch<{
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          description?: string;
        };
      }>;
      nextPageToken?: string;
    }>("playlists", {
      part: "snippet",
      channelId,
      maxResults: 50,
      pageToken: playlistToken,
    });

    for (const playlist of response.items || []) {
      if (!playlist.id) continue;
      if (!looksLikeTravelPlaylist({
        title: playlist.snippet?.title,
        description: playlist.snippet?.description,
      })) {
        continue;
      }
      playlistIds.push(playlist.id);
    }

    playlistToken = response.nextPageToken;
  } while (playlistToken);

  const videoIds = new Set<string>();
  for (const playlistId of playlistIds) {
    let itemToken: string | undefined;
    do {
      const response = await youtubeFetch<{
        items?: Array<{
          contentDetails?: {
            videoId?: string;
          };
        }>;
        nextPageToken?: string;
      }>("playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: 50,
        pageToken: itemToken,
      });

      for (const item of response.items || []) {
        const videoId = item.contentDetails?.videoId;
        if (videoId) videoIds.add(videoId);
      }

      itemToken = response.nextPageToken;
    } while (itemToken);
  }

  return videoIds;
}
