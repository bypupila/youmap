import { sanitizeEnvValue } from "@/lib/env";

const CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{20,}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export interface PublicYouTubeChannelValidation {
  channelId: string;
  channelName: string;
  canonicalUrl: string;
  inputUrl: string;
  hasVideos: boolean;
  videosSampled: number;
  totalVideos: number | null;
  totalViews: number | null;
}

export interface PublicYouTubeFeedVideo {
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
}

function normalizeYoutubeChannelUrl(input: string) {
  const raw = sanitizeEnvValue(input);
  if (!raw) {
    throw new Error("Ingresa un link de canal de YouTube.");
  }

  if (CHANNEL_ID_REGEX.test(raw)) {
    return `https://www.youtube.com/channel/${raw}`;
  }

  if (raw.startsWith("@")) {
    return `https://www.youtube.com/${raw}`;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("El link del canal no es válido.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(hostname)) {
    throw new Error("El link debe ser de youtube.com.");
  }

  const path = sanitizeEnvValue(parsed.pathname);
  if (!path || path === "/") {
    throw new Error("Usa un link de canal (por ejemplo /@canal o /channel/UC...).");
  }

  return parsed.toString();
}

function extractChannelIdFromUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && CHANNEL_ID_REGEX.test(parts[1] || "")) {
      return parts[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function extractMatch(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  return sanitizeEnvValue(match?.[1] || "");
}

function parseChannelPage(html: string, resolvedUrl: string) {
  const title = extractMatch(/<title>([^<]+)<\/title>/i, html);
  if (!title || /^404\b/i.test(title)) {
    throw new Error("No encontramos ese canal en YouTube.");
  }

  const fromResolvedUrl = extractChannelIdFromUrl(resolvedUrl);
  const canonicalUrl = extractMatch(/<link rel="canonical" href="([^"]+)"/i, html) || resolvedUrl;
  const fromCanonical = extractChannelIdFromUrl(canonicalUrl);
  const fromChannelIdTag = extractMatch(/"channelId":"(UC[a-zA-Z0-9_-]{20,})"/, html);
  const fromExternalId = extractMatch(/"externalId":"(UC[a-zA-Z0-9_-]{20,})"/, html);

  const channelId = fromResolvedUrl || fromCanonical || fromChannelIdTag || fromExternalId;
  if (!CHANNEL_ID_REGEX.test(channelId || "")) {
    throw new Error("No pudimos identificar el canal. Verifica que el link apunte a un canal real.");
  }

  const channelName = sanitizeEnvValue(title.replace(/\s*-\s*YouTube\s*$/i, ""));
  return {
    channelId,
    channelName: channelName || "YouTube channel",
    canonicalUrl,
  };
}

async function fetchChannelPage(urlValue: string) {
  const response = await fetch(urlValue, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("No encontramos ese canal en YouTube.");
  }

  return {
    html: await response.text(),
    resolvedUrl: response.url || urlValue,
  };
}

async function fetchChannelFeedXml(channelId: string) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const response = await fetch(feedUrl, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    },
  });
  if (!response.ok) return null;
  return response.text();
}

async function countVideosFromFeed(channelId: string) {
  const xml = await fetchChannelFeedXml(channelId);
  if (!xml) return null;
  const entries = xml.match(/<entry\b/g);
  return entries ? entries.length : 0;
}

function extractTagValue(input: string, tag: string) {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return sanitizeEnvValue(match?.[1] || "");
}

function extractThumbnailUrl(entryXml: string) {
  const thumbMatch = entryXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  return sanitizeEnvValue(thumbMatch?.[1] || "") || null;
}

export async function loadPublicChannelFeedVideos(channelId: string): Promise<PublicYouTubeFeedVideo[]> {
  const xml = await fetchChannelFeedXml(channelId);
  if (!xml) return [];

  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return entries
    .map((entryXml) => {
      const videoId = extractTagValue(entryXml, "yt:videoId");
      if (!videoId) return null;
      return {
        videoId,
        title: extractTagValue(entryXml, "title") || "Untitled video",
        description: extractTagValue(entryXml, "media:description") || null,
        publishedAt: extractTagValue(entryXml, "published") || null,
        thumbnailUrl: extractThumbnailUrl(entryXml),
      } satisfies PublicYouTubeFeedVideo;
    })
    .filter((row): row is PublicYouTubeFeedVideo => Boolean(row));
}

function parseLocalizedCount(input: string) {
  const raw = sanitizeEnvValue(input);
  if (!raw) return null;

  const compact = raw.match(/(\d[\d.,\s]*)\s*([kmb])\b/i);
  if (compact) {
    let numberToken = compact[1].replace(/\s+/g, "");
    const suffix = compact[2].toLowerCase();

    if (numberToken.includes(",") && numberToken.includes(".")) {
      if (numberToken.lastIndexOf(",") > numberToken.lastIndexOf(".")) {
        numberToken = numberToken.replace(/\./g, "").replace(",", ".");
      } else {
        numberToken = numberToken.replace(/,/g, "");
      }
    } else if (numberToken.includes(",")) {
      const parts = numberToken.split(",");
      numberToken = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : numberToken.replace(/,/g, "");
    } else if (numberToken.includes(".")) {
      const parts = numberToken.split(".");
      numberToken = parts.length === 2 && parts[1].length <= 2 ? numberToken : numberToken.replace(/\./g, "");
    }

    const base = Number.parseFloat(numberToken);
    if (!Number.isFinite(base)) return null;

    const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1_000_000_000;
    return Math.round(base * multiplier);
  }

  const digitsOnly = raw.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseChannelStatsFromAbout(html: string) {
  const aboutStart = html.indexOf('"aboutChannelViewModel":{');
  const scope = aboutStart === -1 ? html : html.slice(aboutStart, aboutStart + 10_000);

  const viewCountText = extractMatch(/"viewCountText":"([^"]+)"/i, scope);
  const videoCountText = extractMatch(/"videoCountText":"([^"]+)"/i, scope);

  return {
    totalViews: parseLocalizedCount(viewCountText),
    totalVideos: parseLocalizedCount(videoCountText),
  };
}

async function fetchChannelAboutStats(channelId: string) {
  try {
    const aboutUrl = `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/about`;
    const { html } = await fetchChannelPage(aboutUrl);
    return parseChannelStatsFromAbout(html);
  } catch {
    return {
      totalViews: null,
      totalVideos: null,
    };
  }
}

export async function validateYouTubeChannelWithoutApiKey(input: string): Promise<PublicYouTubeChannelValidation> {
  const inputUrl = normalizeYoutubeChannelUrl(input);
  const { html, resolvedUrl } = await fetchChannelPage(inputUrl);
  const parsed = parseChannelPage(html, resolvedUrl);
  const [videosSampledRaw, channelStats] = await Promise.all([countVideosFromFeed(parsed.channelId), fetchChannelAboutStats(parsed.channelId)]);
  const videosSampled = videosSampledRaw ?? 0;
  const hasVideos = videosSampled > 0 || (channelStats.totalVideos ?? 0) > 0;

  return {
    channelId: parsed.channelId,
    channelName: parsed.channelName,
    canonicalUrl: parsed.canonicalUrl,
    inputUrl,
    hasVideos,
    videosSampled,
    totalVideos: channelStats.totalVideos,
    totalViews: channelStats.totalViews,
  };
}
