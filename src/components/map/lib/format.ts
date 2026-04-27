import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

/**
 * Pure formatting helpers shared across every map shell component.
 *
 * They were previously inlined at the bottom of `map-experience.tsx` (which
 * had grown past 1,800 lines and was impossible to navigate). Pulling the
 * functions out keeps the orchestrator focused on state and lets the desktop
 * and mobile shells import without circular concerns.
 */

export function formatExactNumber(value: number) {
  if (!value) return "0";
  return Number(value).toLocaleString("en-US");
}

export function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDuration(value?: number | null) {
  const totalSeconds = Math.max(0, Number(value || 0));
  if (!totalSeconds) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Build a "City, Country" label, falling back gracefully so a video that
 * was geo-tagged at country granularity still shows useful text instead of
 * a stray comma or "undefined".
 */
export function formatPlace(video: TravelVideoLocation) {
  return [video.city, video.country_name || video.country_code].filter(Boolean).join(", ") || "Ubicacion mapeada";
}

/**
 * Two-letter uppercase ISO code, defaulting to "TM" (TravelMap) so empty
 * data still renders a stable monogram instead of a blank circle.
 */
export function formatCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "TM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return code || "TM";
}

export function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "YT";
}

export function buildChannelUrl(channel: TravelChannel) {
  if (channel.youtube_channel_id) return `https://www.youtube.com/channel/${channel.youtube_channel_id}`;
  const handle = String(channel.channel_handle || channel.canonicalHandle || "").trim().replace(/^@+/, "");
  if (!handle) return null;
  return `https://www.youtube.com/@${handle}`;
}

export function buildMapHref(channel: TravelChannel) {
  return `/map?channelId=${encodeURIComponent(channel.id)}`;
}

export function sortRecentVideos(a: TravelVideoLocation, b: TravelVideoLocation) {
  const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
  const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
  return bTime - aTime;
}
