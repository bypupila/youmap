import { isUuid } from "@/lib/map-events";
import { sql } from "@/lib/neon";
import type { TravelVideoLocation } from "@/lib/types";

export const MAP_FAN_VOTE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface MapFanVoteCountryRank {
  country_code: string;
  country_name: string;
  votes: number;
}

export interface MapFanVoteCityRank {
  country_code: string;
  country_name: string;
  city: string;
  votes: number;
}

export interface MapFanVoteSummary {
  total_votes: number;
  country_rankings: MapFanVoteCountryRank[];
  city_rankings: MapFanVoteCityRank[];
  viewer_can_vote: boolean;
  viewer_last_voted_at: string | null;
  viewer_next_vote_at: string | null;
  viewer_vote_country_code: string | null;
  viewer_vote_city: string | null;
  viewer_cooldown_remaining_ms: number;
}

export interface MapFanVoteOption {
  country_code: string;
  country_name: string;
  cities: Array<{ city: string }>;
}

interface FanVoteCountryRow {
  country_code: string;
  votes: number | string;
}

interface FanVoteCityRow {
  country_code: string;
  city: string;
  votes: number | string;
}

interface FanVoteViewerRow {
  country_code: string;
  city: string | null;
  created_at: string;
}

interface RecordMapFanVoteInput {
  channelId: string;
  countryCode: string;
  city?: string | null;
  voteScope?: "country" | "city";
  voterIdentity: string;
  voterFingerprint: string;
  voterUserId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  availableOptions: MapFanVoteOption[];
}

interface FanVoteCooldownInfo {
  canVote: boolean;
  lastVotedAt: string | null;
  nextVoteAt: string | null;
  remainingMs: number;
  lastVoteCountryCode: string | null;
  lastVoteCity: string | null;
}

export class MapFanVoteError extends Error {
  status: number;
  nextVoteAt: string | null;

  constructor(message: string, status = 400, nextVoteAt: string | null = null) {
    super(message);
    this.name = "MapFanVoteError";
    this.status = status;
    this.nextVoteAt = nextVoteAt;
  }
}

export function buildMapFanVoteIdentity({
  userId,
  voterFingerprint,
}: {
  userId?: string | null;
  voterFingerprint?: string | null;
}) {
  if (userId && isUuid(userId)) return `user:${userId}`;
  const fingerprint = String(voterFingerprint || "").trim();
  if (!fingerprint) return null;
  return `device:${fingerprint}`;
}

export function createEmptyFanVoteSummary(): MapFanVoteSummary {
  return {
    total_votes: 0,
    country_rankings: [],
    city_rankings: [],
    viewer_can_vote: true,
    viewer_last_voted_at: null,
    viewer_next_vote_at: null,
    viewer_vote_country_code: null,
    viewer_vote_city: null,
    viewer_cooldown_remaining_ms: 0,
  };
}

export async function loadMapFanVoteSummary({
  channelId,
  videoLocations,
  voterIdentity,
}: {
  channelId: string;
  videoLocations: TravelVideoLocation[];
  voterIdentity?: string | null;
}): Promise<MapFanVoteSummary> {
  if (!isUuid(channelId)) return createEmptyFanVoteSummary();

  const countryNameMap = buildCountryNameMap(videoLocations);
  const [countryRows, cityRows, viewerRows] = await Promise.all([
    sql<FanVoteCountryRow[]>`
      select country_code, count(*)::int as votes
      from public.map_fan_votes
      where channel_id = ${channelId}
      group by country_code
      order by count(*) desc, country_code asc
    `,
    sql<FanVoteCityRow[]>`
      select country_code, city, count(*)::int as votes
      from public.map_fan_votes
      where channel_id = ${channelId}
        and city is not null
      group by country_code, city
      order by count(*) desc, country_code asc, city asc
    `,
    voterIdentity
      ? sql<FanVoteViewerRow[]>`
          select country_code, city, created_at
          from public.map_fan_votes
          where channel_id = ${channelId}
            and voter_identity = ${voterIdentity}
          order by created_at desc
          limit 1
        `
      : Promise.resolve([] as FanVoteViewerRow[]),
  ]);

  const countryRankings = (countryRows || []).map((row) => {
    const countryCode = normalizeCountryCode(row.country_code);
    return {
      country_code: countryCode,
      country_name: countryNameMap.get(countryCode) || countryCode,
      votes: Number(row.votes || 0),
    };
  });

  const cityRankings = (cityRows || []).map((row) => {
    const countryCode = normalizeCountryCode(row.country_code);
    return {
      country_code: countryCode,
      country_name: countryNameMap.get(countryCode) || countryCode,
      city: normalizeCity(row.city || ""),
      votes: Number(row.votes || 0),
    };
  });

  const cooldownInfo = resolveCooldownFromViewerRow(viewerRows[0] || null);
  return {
    total_votes: countryRankings.reduce((sum, country) => sum + country.votes, 0),
    country_rankings: countryRankings,
    city_rankings: cityRankings,
    viewer_can_vote: cooldownInfo.canVote,
    viewer_last_voted_at: cooldownInfo.lastVotedAt,
    viewer_next_vote_at: cooldownInfo.nextVoteAt,
    viewer_vote_country_code: cooldownInfo.lastVoteCountryCode,
    viewer_vote_city: cooldownInfo.lastVoteCity,
    viewer_cooldown_remaining_ms: cooldownInfo.remainingMs,
  };
}

export async function recordMapFanVote({
  channelId,
  countryCode,
  city = null,
  voteScope = "country",
  voterIdentity,
  voterFingerprint,
  voterUserId,
  ipHash,
  userAgentHash,
  availableOptions,
}: RecordMapFanVoteInput) {
  if (!isUuid(channelId)) {
    throw new MapFanVoteError("Canal invalido.", 400);
  }

  const normalizedCountry = normalizeCountryCode(countryCode);
  if (!normalizedCountry) {
    throw new MapFanVoteError("Pais invalido.", 400);
  }

  const selectedCountry = availableOptions.find((option) => option.country_code === normalizedCountry);
  if (!selectedCountry) {
    throw new MapFanVoteError("Este pais no esta disponible para votar.", 400);
  }

  const cityOptions = selectedCountry.cities.map((entry) => normalizeCity(entry.city)).filter(Boolean);
  const normalizedCityInput = normalizeCity(city || "");
  const shouldVoteCity = voteScope === "city" && cityOptions.length > 0;

  let resolvedCity: string | null = null;
  if (shouldVoteCity) {
    if (!normalizedCityInput) {
      throw new MapFanVoteError("Selecciona una ciudad valida.", 400);
    }
    if (!cityOptions.some((entry) => entry.toLowerCase() === normalizedCityInput.toLowerCase())) {
      throw new MapFanVoteError(`La ciudad ${normalizedCityInput} no existe en ${normalizedCountry}.`, 400);
    }
    resolvedCity = cityOptions.find((entry) => entry.toLowerCase() === normalizedCityInput.toLowerCase()) || normalizedCityInput;
  }

  const viewerRows = await sql<FanVoteViewerRow[]>`
    select country_code, city, created_at
    from public.map_fan_votes
    where channel_id = ${channelId}
      and voter_identity = ${voterIdentity}
    order by created_at desc
    limit 1
  `;

  const cooldown = resolveCooldownFromViewerRow(viewerRows[0] || null);
  if (!cooldown.canVote) {
    throw new MapFanVoteError(
      "Ya votaste esta semana. Espera para volver a votar.",
      429,
      cooldown.nextVoteAt
    );
  }

  await sql`
    insert into public.map_fan_votes (
      channel_id,
      country_code,
      city,
      voter_identity,
      voter_fingerprint,
      voter_user_id,
      ip_hash,
      user_agent_hash
    )
    values (
      ${channelId},
      ${normalizedCountry},
      ${resolvedCity},
      ${voterIdentity},
      ${voterFingerprint},
      ${voterUserId && isUuid(voterUserId) ? voterUserId : null},
      ${normalizeNullableText(ipHash)},
      ${normalizeNullableText(userAgentHash)}
    )
  `;
}

function resolveCooldownFromViewerRow(row: FanVoteViewerRow | null): FanVoteCooldownInfo {
  if (!row?.created_at) {
    return {
      canVote: true,
      lastVotedAt: null,
      nextVoteAt: null,
      remainingMs: 0,
      lastVoteCountryCode: null,
      lastVoteCity: null,
    };
  }

  const lastVoteMs = new Date(row.created_at).getTime();
  if (!Number.isFinite(lastVoteMs)) {
    return {
      canVote: true,
      lastVotedAt: null,
      nextVoteAt: null,
      remainingMs: 0,
      lastVoteCountryCode: null,
      lastVoteCity: null,
    };
  }

  const nextVoteMs = lastVoteMs + MAP_FAN_VOTE_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextVoteMs - Date.now());
  const canVote = remainingMs <= 0;

  return {
    canVote,
    lastVotedAt: row.created_at,
    nextVoteAt: canVote ? null : new Date(nextVoteMs).toISOString(),
    remainingMs,
    lastVoteCountryCode: normalizeCountryCode(row.country_code),
    lastVoteCity: normalizeCity(row.city || "") || null,
  };
}

function normalizeCountryCode(value: string) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function normalizeCity(value: string) {
  return String(value || "").trim();
}

function normalizeNullableText(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function buildCountryNameMap(videoLocations: TravelVideoLocation[]) {
  const byCountry = new Map<string, string>();
  for (const video of videoLocations) {
    const countryCode = normalizeCountryCode(video.country_code || "");
    if (!countryCode) continue;
    if (!byCountry.has(countryCode)) {
      byCountry.set(countryCode, String(video.country_name || countryCode));
    }
  }
  return byCountry;
}
