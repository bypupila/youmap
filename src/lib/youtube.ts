import { readRequiredEnv, sanitizeEnvValue } from "@/lib/env";
import { detectCatalogPlaces, NON_TRAVEL_PLAYLIST_KEYWORDS, normalizeForLookup, TRAVEL_KEYWORDS } from "@/lib/video-location-catalog";
import { loadPublicChannelFeedVideos, validateYouTubeChannelWithoutApiKey } from "@/lib/youtube-public";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const PUBLIC_FEED_PLAYLIST_PREFIX = "public_feed:";
const publicFeedVideoCache = new Map<string, Omit<YouTubeVideoRecord, "youtube_video_id">>();
const playlistSignalCache = new Map<string, { expiresAt: number; signals: Map<string, YouTubePlaylistGeoSignal[]> }>();
const PLAYLIST_SIGNAL_CACHE_TTL_MS = 10 * 60 * 1000;

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

export interface ChannelImportReadiness {
  totalVideosSampled: number;
  extractableVideosSampled: number;
  hasAnyVideos: boolean;
  hasExtractableVideos: boolean;
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

interface YouTubeChannelItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    customUrl?: string;
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

function createPublicFeedPlaylistId(channelId: string) {
  return `${PUBLIC_FEED_PLAYLIST_PREFIX}${channelId}`;
}

function extractChannelIdFromPublicFeedPlaylistId(playlistId: string) {
  if (!playlistId.startsWith(PUBLIC_FEED_PLAYLIST_PREFIX)) return null;
  return sanitizeEnvValue(playlistId.slice(PUBLIC_FEED_PLAYLIST_PREFIX.length)) || null;
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

function looksLikeTravelPlaylist(input: { title?: string; description?: string }) {
  const merged = normalizeForLookup(`${input.title || ""} ${input.description || ""}`);
  return TRAVEL_KEYWORDS.some((hint) => merged.includes(normalizeForLookup(hint)));
}

function looksLikeNonTravelPlaylist(input: { title?: string; description?: string }) {
  const merged = normalizeForLookup(`${input.title || ""} ${input.description || ""}`);
  return NON_TRAVEL_PLAYLIST_KEYWORDS.some((hint) => merged.includes(normalizeForLookup(hint)));
}

export type PlaylistSignalClassification = "travel" | "geo-specific" | "non-travel" | "ambiguous";

export interface YouTubePlaylistGeoSignal {
  playlistId: string;
  title: string;
  description: string | null;
  classification: PlaylistSignalClassification;
  matchedPlaces: ReturnType<typeof detectCatalogPlaces>;
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

function toChannelResolution(channel: YouTubeChannelItem | null | undefined, fallbackHandle?: string | null): YouTubeChannelResolution | null {
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads || "";
  if (!channel?.id || !uploadsPlaylistId) return null;

  const normalizedCustomUrl = sanitizeEnvValue(channel.snippet?.customUrl || "");
  const handleFromCustomUrl = normalizedCustomUrl.startsWith("@") ? normalizedCustomUrl : normalizedCustomUrl ? `@${normalizedCustomUrl}` : null;
  const normalizedFallbackHandle = sanitizeEnvValue(fallbackHandle || "");
  const fallbackWithAt = normalizedFallbackHandle ? (normalizedFallbackHandle.startsWith("@") ? normalizedFallbackHandle : `@${normalizedFallbackHandle}`) : null;

  return {
    youtube_channel_id: channel.id,
    channel_name: channel.snippet?.title || "YouTube channel",
    channel_handle: handleFromCustomUrl || fallbackWithAt || null,
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

async function resolveChannelById(channelId: string): Promise<YouTubeChannelResolution | null> {
  const response = await youtubeFetch<{
    items?: YouTubeChannelItem[];
  }>("channels", {
    part: "snippet,statistics,contentDetails",
    id: channelId,
    maxResults: 1,
  });

  return toChannelResolution(response.items?.[0] || null);
}

async function resolveChannelByHandle(handle: string): Promise<YouTubeChannelResolution | null> {
  const normalized = sanitizeEnvValue(handle).replace(/^@+/, "");
  if (!normalized) return null;

  const candidates = [`@${normalized}`, normalized];
  for (const candidate of candidates) {
    const response = await youtubeFetch<{
      items?: YouTubeChannelItem[];
    }>("channels", {
      part: "snippet,statistics,contentDetails",
      forHandle: candidate,
      maxResults: 1,
    });
    const resolved = toChannelResolution(response.items?.[0] || null, `@${normalized}`);
    if (resolved) return resolved;
  }

  return null;
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
    channel_handle: resolved.channel_handle || (query.startsWith("@") ? query : `@${normalized}`),
  };
}

export async function resolveYouTubeChannel(input: string): Promise<YouTubeChannelResolution> {
  let lastError: Error | null = null;

  const channelId = extractChannelIdFromInput(input);
  if (channelId) {
    try {
      const resolved = await resolveChannelById(channelId);
      if (resolved) return resolved;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  const handle = extractHandleFromInput(input);
  if (handle) {
    try {
      const resolvedByHandle = await resolveChannelByHandle(handle);
      if (resolvedByHandle) return resolvedByHandle;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    try {
      const resolved = await searchChannelByHandleOrName(handle);
      if (resolved) return resolved;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  try {
    const publicChannel = await validateYouTubeChannelWithoutApiKey(input);
    const handleFromCanonical = (() => {
      try {
        const parts = new URL(publicChannel.canonicalUrl).pathname.split("/").filter(Boolean);
        if (parts[0]?.startsWith("@")) return parts[0];
        return null;
      } catch {
        return null;
      }
    })();

    return {
      youtube_channel_id: publicChannel.channelId,
      channel_name: publicChannel.channelName,
      channel_handle: handleFromCanonical,
      thumbnail_url: null,
      subscriber_count: null,
      description: null,
      uploads_playlist_id: createPublicFeedPlaylistId(publicChannel.channelId),
      published_at: null,
      raw: {
        source: "youtube_public_fallback",
        canonical_url: publicChannel.canonicalUrl,
      },
    };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  }

  if (lastError) throw lastError;
  throw new Error("No pudimos resolver el canal de YouTube. Usa un enlace a /channel/... o /@handle.");
}

export async function getChannelImportReadiness(channel: Pick<YouTubeChannelResolution, "uploads_playlist_id">): Promise<ChannelImportReadiness> {
  const sampledVideoIds: string[] = [];
  let pageToken: string | undefined;
  let pagesRead = 0;

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
      playlistId: channel.uploads_playlist_id,
      maxResults: 50,
      pageToken,
    });

    for (const item of response.items || []) {
      const videoId = sanitizeEnvValue(item.contentDetails?.videoId || "");
      if (!videoId) continue;
      sampledVideoIds.push(videoId);
      if (sampledVideoIds.length >= 150) break;
    }

    pagesRead += 1;
    if (sampledVideoIds.length >= 150) break;
    if (pagesRead >= 3) break;
    pageToken = response.nextPageToken;
  } while (pageToken);

  const uniqueVideoIds = Array.from(new Set(sampledVideoIds));
  if (uniqueVideoIds.length === 0) {
    return {
      totalVideosSampled: 0,
      extractableVideosSampled: 0,
      hasAnyVideos: false,
      hasExtractableVideos: false,
    };
  }

  const detailsMap = await loadVideoDetails(uniqueVideoIds);
  const detailedVideos = Array.from(detailsMap.values());
  const extractableVideos = detailedVideos.filter((video) => !video.is_short).length;

  return {
    totalVideosSampled: detailedVideos.length,
    extractableVideosSampled: extractableVideos,
    hasAnyVideos: detailedVideos.length > 0,
    hasExtractableVideos: extractableVideos > 0,
  };
}

export async function loadUploadsPlaylistVideos(playlistId: string) {
  const publicFeedChannelId = extractChannelIdFromPublicFeedPlaylistId(playlistId);
  if (publicFeedChannelId) {
    const feedVideos = await loadPublicChannelFeedVideos(publicFeedChannelId);
    for (const video of feedVideos) {
      publicFeedVideoCache.set(video.videoId, {
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnailUrl,
        published_at: video.publishedAt,
        view_count: null,
        like_count: null,
        comment_count: null,
        duration_seconds: null,
        is_short: isYouTubeShort({
          durationSeconds: null,
          title: video.title,
          description: video.description || "",
        }),
        recording_lat: null,
        recording_lng: null,
        recording_location_description: null,
        raw: { source: "youtube_public_feed" },
      });
    }

    return feedVideos.map((video) => ({
      contentDetails: {
        videoId: video.videoId,
        videoPublishedAt: video.publishedAt || undefined,
      },
      snippet: {
        title: video.title,
        description: video.description || undefined,
        publishedAt: video.publishedAt || undefined,
        thumbnails: {
          high: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
          medium: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
          default: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
        },
      },
    } satisfies YouTubePlaylistItem));
  }

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
  const allFromPublicFeedCache = videoIds.every((videoId) => publicFeedVideoCache.has(videoId));

  if (allFromPublicFeedCache) {
    for (const videoId of videoIds) {
      const cached = publicFeedVideoCache.get(videoId);
      if (!cached) continue;
      details.set(videoId, {
        youtube_video_id: videoId,
        ...cached,
      });
    }
    return details;
  }

  for (let index = 0; index < videoIds.length; index += 50) {
    const batch = videoIds.slice(index, index + 50);
    let response: {
      items?: YouTubeVideoItem[];
    } | null = null;
    try {
      response = await youtubeFetch<{
        items?: YouTubeVideoItem[];
      }>("videos", {
        part: "snippet,statistics,contentDetails,recordingDetails",
        id: batch.join(","),
        maxResults: batch.length,
      });
    } catch (error) {
      const batchFromPublicFeedCache = batch.every((videoId) => publicFeedVideoCache.has(videoId));
      if (!batchFromPublicFeedCache) {
        throw error;
      }

      for (const videoId of batch) {
        const cached = publicFeedVideoCache.get(videoId);
        if (!cached) continue;
        details.set(videoId, {
          youtube_video_id: videoId,
          ...cached,
        });
      }
      continue;
    }

    for (const video of response?.items || []) {
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
  const signalMap = await loadChannelPlaylistSignals(channelId);
  const videoIds = new Set<string>();
  for (const [videoId, signals] of signalMap.entries()) {
    if (signals.some((signal) => signal.classification === "travel" || signal.classification === "geo-specific")) {
      videoIds.add(videoId);
    }
  }
  return videoIds;
}

export async function loadChannelPlaylistSignals(channelId: string) {
  const cacheKey = sanitizeEnvValue(channelId);
  const now = Date.now();
  const cached = playlistSignalCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.signals;
  }

  const relevantPlaylists: YouTubePlaylistGeoSignal[] = [];
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
      const matchedPlaces = detectCatalogPlaces(`${playlist.snippet?.title || ""}\n${playlist.snippet?.description || ""}`);
      const classification: PlaylistSignalClassification = matchedPlaces.length > 0
        ? "geo-specific"
        : looksLikeTravelPlaylist({
              title: playlist.snippet?.title,
              description: playlist.snippet?.description,
            })
          ? "travel"
          : looksLikeNonTravelPlaylist({
                title: playlist.snippet?.title,
                description: playlist.snippet?.description,
              })
            ? "non-travel"
            : "ambiguous";

      if (classification === "non-travel") continue;

      relevantPlaylists.push({
        playlistId: playlist.id,
        title: playlist.snippet?.title || "Untitled playlist",
        description: playlist.snippet?.description || null,
        classification,
        matchedPlaces,
      });
    }

    playlistToken = response.nextPageToken;
  } while (playlistToken);

  const signalMap = new Map<string, YouTubePlaylistGeoSignal[]>();
  for (const playlist of relevantPlaylists) {
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
        playlistId: playlist.playlistId,
        maxResults: 50,
        pageToken: itemToken,
      });

      for (const item of response.items || []) {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) continue;
        const current = signalMap.get(videoId) || [];
        current.push(playlist);
        signalMap.set(videoId, current);
      }

      itemToken = response.nextPageToken;
    } while (itemToken);
  }

  playlistSignalCache.set(cacheKey, {
    expiresAt: now + PLAYLIST_SIGNAL_CACHE_TTL_MS,
    signals: signalMap,
  });

  return signalMap;
}
