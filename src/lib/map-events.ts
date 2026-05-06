import { createHash } from "crypto";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import type { MapEventType, MapEventViewerMode } from "@/lib/map-event-types";
import { sql } from "@/lib/neon";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_PATH_PREFIXES = ["/api", "/admin", "/auth", "/dashboard", "/onboarding", "/pricing", "/monitoring"];
const RESERVED_ROOT_SEGMENTS = new Set(["", "admin", "auth", "dashboard", "onboarding", "pricing", "explore", "map", "api", "u", "_next", "monitoring"]);

export interface MapEventInput {
  channelId: string;
  eventType: MapEventType;
  viewerMode?: MapEventViewerMode | null;
  path?: string | null;
  referrer?: string | null;
  countryCode?: string | null;
  youtubeVideoId?: string | null;
  sponsorId?: string | null;
  pollId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RequestMapEventInput extends Omit<MapEventInput, "ipHash" | "userAgentHash" | "referrer" | "path"> {
  path?: string | null;
  referrer?: string | null;
}

export function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function normalizeOptionalString(value: string | null | undefined, maxLength = 240) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizeCountryCode(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value, 2)?.toUpperCase() || null;
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function hashValue(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export function readClientIp(headers: Headers) {
  const forwardedFor = normalizeOptionalString(headers.get("x-forwarded-for"), 120);
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return normalizeOptionalString(headers.get("x-real-ip"), 120);
}

export function getRequestHashesFromHeaders(headers: Headers) {
  return {
    ipHash: hashValue(readClientIp(headers)),
    userAgentHash: hashValue(normalizeOptionalString(headers.get("user-agent"), 500)),
  };
}

export function resolvePathFromRequest(request: Request, explicitPath?: string | null) {
  const normalizedPath = normalizeOptionalString(explicitPath, 240);
  if (normalizedPath) {
    return normalizedPath.startsWith("/") ? normalizedPath : readPathFromUrl(normalizedPath) || normalizedPath;
  }

  const refererPath = readPathFromUrl(request.headers.get("referer"));
  if (refererPath) return refererPath;

  return null;
}

export function resolveReferrerFromRequest(request: Request, explicitReferrer?: string | null) {
  return normalizeOptionalString(explicitReferrer, 500) || normalizeOptionalString(request.headers.get("referer"), 500);
}

export function isPublicMapPath(path: string | null | undefined) {
  if (!path) return false;
  const normalized = path.startsWith("/") ? path : readPathFromUrl(path) || path;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return false;
  }
  if (normalized === "/map" || normalized.startsWith("/map?") || normalized.startsWith("/u/")) return true;

  const firstSegment = normalized.replace(/^\//, "").split(/[/?#]/)[0] || "";
  return Boolean(firstSegment && !RESERVED_ROOT_SEGMENTS.has(firstSegment) && !normalized.replace(/^\//, "").includes("/"));
}

export async function requestUserOwnsChannel(request: Request, channelId: string) {
  if (!isUuid(channelId)) return false;
  const userId = await getValidSessionUserIdFromRequest(request);
  if (!userId) return false;

  const rows = await sql<Array<{ user_id: string }>>`
    select user_id
    from public.channels
    where id = ${channelId}
    limit 1
  `;

  return rows[0]?.user_id === userId;
}

export async function isMadeForKidsVideo(channelId: string, youtubeVideoId: string | null | undefined) {
  const videoId = normalizeOptionalString(youtubeVideoId, 64);
  if (!isUuid(channelId) || !videoId) return false;

  const rows = await sql<Array<{ made_for_kids: boolean | null }>>`
    select made_for_kids
    from public.videos
    where channel_id = ${channelId}
      and youtube_video_id = ${videoId}
    limit 1
  `;

  return rows[0]?.made_for_kids === true;
}

export async function recordMapEvent(input: MapEventInput) {
  if (!isUuid(input.channelId)) return null;

  const rows = await sql<Array<{ id: string }>>`
    insert into public.map_events (
      channel_id,
      event_type,
      viewer_mode,
      path,
      referrer,
      country_code,
      youtube_video_id,
      sponsor_id,
      poll_id,
      ip_hash,
      user_agent_hash,
      metadata
    )
    values (
      ${input.channelId},
      ${input.eventType},
      ${input.viewerMode || null},
      ${normalizeOptionalString(input.path, 240)},
      ${normalizeOptionalString(input.referrer, 500)},
      ${normalizeCountryCode(input.countryCode)},
      ${normalizeOptionalString(input.youtubeVideoId, 64)},
      ${isUuid(input.sponsorId) ? input.sponsorId : null},
      ${isUuid(input.pollId) ? input.pollId : null},
      ${normalizeOptionalString(input.ipHash, 128)},
      ${normalizeOptionalString(input.userAgentHash, 128)},
      ${JSON.stringify(sanitizeMetadata(input.metadata))}::jsonb
    )
    returning id
  `;

  return rows[0]?.id || null;
}

export async function recordMapEventFromRequest(request: Request, input: RequestMapEventInput) {
  const hashes = getRequestHashesFromHeaders(request.headers);

  return recordMapEvent({
    ...input,
    path: resolvePathFromRequest(request, input.path),
    referrer: resolveReferrerFromRequest(request, input.referrer),
    ipHash: hashes.ipHash,
    userAgentHash: hashes.userAgentHash,
  });
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return {};

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 30)) {
    const normalizedKey = normalizeOptionalString(key, 80);
    if (!normalizedKey) continue;

    const sanitized = sanitizeMetadataValue(value);
    if (sanitized !== undefined) {
      output[normalizedKey] = sanitized;
    }
  }

  return output;
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return normalizeOptionalString(value, 280);

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeMetadataValue).filter((item) => item !== undefined);
  }

  return undefined;
}

function readPathFromUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value.startsWith("/") ? value : null;
  }
}
