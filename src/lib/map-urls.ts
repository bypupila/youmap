const FALLBACK_APP_HOST = "https://travelyourmap.bypupila.com";

function getAppHost() {
  return String(process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_HOST).trim().replace(/\/+$/, "");
}

function buildAbsoluteAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppHost()}${normalizedPath}`;
}

export function buildPublicMapUrl(channelId: string) {
  return buildAbsoluteAppUrl(`/map?channelId=${encodeURIComponent(channelId)}`);
}

export function buildViewerRegisterUrl(params: {
  channelId?: string | null;
  next?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sharedFrom?: string | null;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("intent", "viewer");
  if (params.channelId) searchParams.set("channelId", params.channelId);
  if (params.next) searchParams.set("next", params.next);
  if (params.utmSource) searchParams.set("utm_source", params.utmSource);
  if (params.utmMedium) searchParams.set("utm_medium", params.utmMedium);
  if (params.utmCampaign) searchParams.set("utm_campaign", params.utmCampaign);
  if (params.sharedFrom) searchParams.set("sharedFrom", params.sharedFrom);
  return buildAbsoluteAppUrl(`/auth/viewer-register?${searchParams.toString()}`);
}
