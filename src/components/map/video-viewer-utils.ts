import type { TravelVideoLocation } from "@/lib/types";

export type CountryVideoBucket = {
  country_code: string;
  country_name: string;
  videos: TravelVideoLocation[];
};

export function buildCountryVideoSections(videos: TravelVideoLocation[], currentVideo: TravelVideoLocation | null) {
  const currentCountryCode = String(currentVideo?.country_code || "").toUpperCase();
  const buckets = new Map<string, CountryVideoBucket>();

  for (const video of videos) {
    const code = String(video.country_code || "").toUpperCase() || "TM";
    const bucket = buckets.get(code) || {
      country_code: code,
      country_name: video.country_name || code,
      videos: [],
    };
    bucket.videos.push(video);
    buckets.set(code, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      videos: bucket.videos.slice().sort(sortRecentVideos),
    }))
    .sort((a, b) => {
      if (a.country_code === currentCountryCode) return -1;
      if (b.country_code === currentCountryCode) return 1;
      return b.videos.length - a.videos.length || a.country_name.localeCompare(b.country_name);
    });
}

export function getYouTubeHref(video?: TravelVideoLocation | null) {
  if (!video) return "";
  return video.video_url || `https://youtube.com/watch?v=${video.youtube_video_id}`;
}

export function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌐";
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "🌐";
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}

export function sortRecentVideos(a: TravelVideoLocation, b: TravelVideoLocation) {
  const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
  const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
  return bTime - aTime;
}

export function formatVideoPlace(video?: TravelVideoLocation | null) {
  if (!video) return "Ubicacion mapeada";
  return [video.city, video.country_name || video.country_code].filter(Boolean).join(", ") || "Ubicacion mapeada";
}

export function formatCompactNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function formatVideoDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
}

export function formatVideoDuration(value?: number | null) {
  const totalSeconds = Math.max(0, Number(value || 0));
  if (!totalSeconds) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
