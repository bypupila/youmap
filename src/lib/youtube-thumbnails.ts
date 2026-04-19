const YOUTUBE_THUMBNAIL_PATTERN = /\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.(jpg|webp)(\?.*)?$/i;

export type YouTubeThumbnailVariant = "maxresdefault" | "sddefault" | "hqdefault" | "mqdefault" | "default";

export function toYouTubeThumbnailVariant(url: string | null | undefined, variant: YouTubeThumbnailVariant): string | null {
  const source = String(url || "").trim();
  if (!source) return null;
  if (!/i\.ytimg\.com\/vi\//i.test(source)) return source;
  return source.replace(YOUTUBE_THUMBNAIL_PATTERN, `/${variant}.jpg$3`);
}

export function toCompactYouTubeThumbnail(url: string | null | undefined) {
  return toYouTubeThumbnailVariant(url, "hqdefault");
}
