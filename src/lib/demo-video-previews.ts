const DEMO_MAP_PREVIEW_TOTAL = 20;

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDemoMapPreviewImage(videoId: string | null | undefined) {
  const normalized = String(videoId || "").trim();
  if (!normalized) return "/images/demo/map-previews/preview-01.svg";
  const bucket = (hashString(normalized) % DEMO_MAP_PREVIEW_TOTAL) + 1;
  return `/images/demo/map-previews/preview-${String(bucket).padStart(2, "0")}.svg`;
}
