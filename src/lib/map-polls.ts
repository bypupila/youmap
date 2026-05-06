import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import type { TravelVideoLocation } from "@/lib/types";
import { sql } from "@/lib/neon";
import { getPostHogClient } from "@/lib/posthog-server";

export const MAP_VOTER_COOKIE = "travelyourmap_voter";
export const LEGACY_MAP_VOTER_COOKIE = "travelmap_voter";
export const MAP_VOTER_COOKIE_NAMES = [MAP_VOTER_COOKIE, LEGACY_MAP_VOTER_COOKIE] as const;
export const MAP_POLL_COUNTRY_VOTE_CITY = "__country__";
export const MAP_POLL_DEFAULT_MODE: MapPollMode = "country_city";

export type MapPollStatus = "draft" | "live" | "closed";
export type MapPollMode = "country" | "country_city";

export interface MapPollCityOption {
  country_code: string;
  city: string;
  sort_order: number;
  votes: number;
}

export interface MapPollCountryOption {
  country_code: string;
  country_name: string;
  sort_order: number;
  votes: number;
  cities: MapPollCityOption[];
}

export interface MapPollRecord {
  id: string;
  channel_id: string;
  title: string;
  prompt: string;
  status: MapPollStatus;
  poll_mode: MapPollMode;
  show_popup: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_by_user_id: string;
  total_votes: number;
  has_voted: boolean;
  country_options: MapPollCountryOption[];
}

export interface MapPollUpsertInput {
  pollId?: string | null;
  channelId: string;
  userId: string;
  title: string;
  prompt: string;
  pollMode: MapPollMode;
  showPopup: boolean;
  status: MapPollStatus;
  closesAt?: string | null;
  countryOptions: Array<{
    country_code: string;
    country_name?: string | null;
    sort_order?: number;
    cities: Array<{ city: string; sort_order?: number }>;
  }>;
}

interface PollRow {
  id: string;
  channel_id: string;
  title: string;
  prompt: string;
  status: MapPollStatus;
  poll_mode: string | null;
  show_popup: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_by_user_id: string;
}

type PollClosureRow = Pick<PollRow, "id" | "channel_id" | "title" | "poll_mode" | "closes_at" | "created_by_user_id">;
type PollCloseSource = "cron" | "lazy";

interface PollCountryRow {
  country_code: string;
  sort_order: number | string;
}

interface PollCityRow {
  country_code: string;
  city: string;
  sort_order: number | string;
}

interface PollVoteRow {
  country_code: string;
  city: string;
  votes: number | string;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export class MapPollVoteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MapPollVoteError";
    this.status = status;
  }
}

export function normalizeCountryCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeCity(value: string) {
  return String(value || "").trim();
}

export function normalizePollMode(value: string | null | undefined): MapPollMode {
  return value === "country" ? "country" : "country_city";
}

function resolvePollMode(value: string | null | undefined): MapPollMode {
  return normalizePollMode(value);
}

export function buildPollOptionsFromVideos(videoLocations: TravelVideoLocation[]) {
  const countries = new Map<string, { country_name: string; cities: Map<string, number> }>();

  for (const video of videoLocations) {
    const countryCode = normalizeCountryCode(video.country_code || "");
    const city = normalizeCity(video.city || video.location_label || "");
    if (!countryCode || !city) continue;

    const bucket = countries.get(countryCode) || {
      country_name: String(video.country_name || countryCode),
      cities: new Map<string, number>(),
    };

    bucket.cities.set(city, (bucket.cities.get(city) || 0) + 1);
    countries.set(countryCode, bucket);
  }

  return Array.from(countries.entries())
    .map(([country_code, value], index) => ({
      country_code,
      country_name: value.country_name,
      sort_order: index,
      cities: Array.from(value.cities.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([city], cityIndex) => ({ city, sort_order: cityIndex })),
    }))
    .sort((a, b) => a.country_name.localeCompare(b.country_name));
}

export function normalizePollOptions(
  options: MapPollUpsertInput["countryOptions"],
  available: ReturnType<typeof buildPollOptionsFromVideos>,
  pollMode: MapPollMode
) {
  const availableByCountry = new Map(
    available.map((country) => [country.country_code, new Set(country.cities.map((city) => city.city))])
  );
  const availableNames = new Map(available.map((country) => [country.country_code, country.country_name]));

  const seenCountries = new Set<string>();

  const normalized = options.map((country, index) => {
    const countryCode = normalizeCountryCode(country.country_code);
    if (!countryCode) {
      throw new Error("Cada opcion debe incluir un pais valido.");
    }
    if (!availableByCountry.has(countryCode)) {
      throw new Error(`El pais ${countryCode} no existe en el mapa para esta votacion.`);
    }
    if (seenCountries.has(countryCode)) {
      throw new Error(`El pais ${countryCode} esta repetido.`);
    }
    seenCountries.add(countryCode);

    const countrySortOrder = Number.isFinite(Number(country.sort_order)) ? Number(country.sort_order) : index;
    const countryName = country.country_name || availableNames.get(countryCode) || countryCode;

    if (pollMode === "country") {
      return {
        country_code: countryCode,
        country_name: countryName,
        sort_order: countrySortOrder,
        cities: [] as Array<{ city: string; sort_order: number }> ,
      };
    }

    const availableCities = availableByCountry.get(countryCode) || new Set<string>();
    const seenCities = new Set<string>();

    const normalizedCities = country.cities.map((city, cityIndex) => {
      const normalizedCity = normalizeCity(city.city);
      if (!normalizedCity) {
        throw new Error(`El pais ${countryCode} tiene una ciudad vacia.`);
      }

      if (!availableCities.has(normalizedCity)) {
        throw new Error(`La ciudad ${normalizedCity} no existe en ${countryCode} para esta votacion.`);
      }

      const cityKey = normalizedCity.toLowerCase();
      if (seenCities.has(cityKey)) {
        throw new Error(`La ciudad ${normalizedCity} esta repetida en ${countryCode}.`);
      }
      seenCities.add(cityKey);

      return {
        city: normalizedCity,
        sort_order: Number.isFinite(Number(city.sort_order)) ? Number(city.sort_order) : cityIndex,
      };
    });

    if (!normalizedCities.length) {
      throw new Error(`En modo pais + ciudad, ${countryCode} debe tener al menos una ciudad.`);
    }

    return {
      country_code: countryCode,
      country_name: countryName,
      sort_order: countrySortOrder,
      cities: normalizedCities,
    };
  });

  if (!normalized.length) {
    throw new Error("Selecciona al menos un pais para la votacion.");
  }

  return normalized;
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getMapVoterCookieInfo(cookieStore: CookieStore) {
  for (const cookieName of MAP_VOTER_COOKIE_NAMES) {
    const value = String(cookieStore.get(cookieName)?.value || "").trim();
    if (value) {
      return { raw: value, cookieName };
    }
  }
  return null;
}

export function getMapVoterFingerprintFromCookieStore(cookieStore: CookieStore) {
  const info = getMapVoterCookieInfo(cookieStore);
  return info ? hashValue(info.raw) : null;
}

export function setMapVoterCookies(response: NextResponse, raw: string) {
  for (const cookieName of MAP_VOTER_COOKIE_NAMES) {
    response.cookies.set(cookieName, raw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
}

export async function getOrCreateVoterFingerprint() {
  const cookieStore = await cookies();
  const existing = getMapVoterCookieInfo(cookieStore);
  if (existing) {
    return {
      raw: existing.raw,
      hashed: hashValue(existing.raw),
      shouldSetCookie: existing.cookieName !== MAP_VOTER_COOKIE,
    };
  }

  const generated = randomUUID();
  return { raw: generated, hashed: hashValue(generated), shouldSetCookie: true };
}

export async function getRequestHashes() {
  const headerStore = await headers();
  const forwardedFor = String(headerStore.get("x-forwarded-for") || "").split(",")[0]?.trim() || "";
  const realIp = String(headerStore.get("x-real-ip") || "").trim();
  const userAgent = String(headerStore.get("user-agent") || "").trim();

  return {
    ipHash: forwardedFor || realIp ? hashValue(forwardedFor || realIp) : null,
    userAgentHash: userAgent ? hashValue(userAgent) : null,
  };
}

async function ensurePollFreshState(poll: PollRow | null) {
  if (!poll) return null;
  const closesAtMs = poll.closes_at ? new Date(poll.closes_at).getTime() : Number.NaN;
  const expired = poll.status === "live" && Number.isFinite(closesAtMs) && closesAtMs <= Date.now();

  if (!expired) return poll;

  const closedRows = await sql<PollClosureRow[]>`
    update public.map_polls
    set status = 'closed', show_popup = false, updated_at = ${new Date().toISOString()}
    where id = ${poll.id}
      and status = 'live'
      and closes_at is not null
      and closes_at <= now()
    returning id, channel_id, title, poll_mode, closes_at, created_by_user_id
  `;

  await recordPollClosure(closedRows, "lazy");

  const fallbackRows = await sql<PollRow[]>`
    select id, channel_id, title, prompt, status::text as status, poll_mode, show_popup, published_at, closes_at, created_by_user_id
    from public.map_polls
    where id = ${poll.id}
    limit 1
  `;

  return fallbackRows[0] || null;
}

export async function closeExpiredMapPolls(channelId?: string | null) {
  const rows = channelId
    ? await sql<PollClosureRow[]>`
        update public.map_polls
        set status = 'closed', show_popup = false, updated_at = ${new Date().toISOString()}
        where status = 'live'
          and channel_id = ${channelId}
          and closes_at is not null
          and closes_at <= now()
        returning id, channel_id, title, poll_mode, closes_at, created_by_user_id
      `
    : await sql<PollClosureRow[]>`
        update public.map_polls
        set status = 'closed', show_popup = false, updated_at = ${new Date().toISOString()}
        where status = 'live'
          and closes_at is not null
          and closes_at <= now()
        returning id, channel_id, title, poll_mode, closes_at, created_by_user_id
      `;

  await recordPollClosure(rows, "cron");
  return rows;
}

async function recordPollClosure(rows: PollClosureRow[], source: PollCloseSource) {
  if (!rows.length) return;

  console.info("[map/polls] closed expired poll(s)", {
    count: rows.length,
    source,
    pollIds: rows.map((row) => row.id),
  });

  const posthog = getPostHogClient();
  for (const row of rows) {
    posthog.capture({
      distinctId: row.created_by_user_id || row.channel_id,
      event: "poll_auto_closed",
      properties: {
        poll_id: row.id,
        channel_id: row.channel_id,
        poll_mode: resolvePollMode(row.poll_mode),
        closes_at: row.closes_at,
        source,
      },
    });
  }

  await posthog.flush();
}

export async function loadMapPoll(
  channelId: string,
  {
    includeDraft = false,
    voterFingerprint,
  }: { includeDraft?: boolean; voterFingerprint?: string | null } = {}
): Promise<MapPollRecord | null> {
  const pollRows = await sql<PollRow[]>`
    select id, channel_id, title, prompt, status::text as status, poll_mode, show_popup, published_at, closes_at, created_by_user_id
    from public.map_polls
    where channel_id = ${channelId}
      and (
        status = 'live'
        or (${includeDraft} = true and status = 'draft')
        or status = 'closed'
      )
    order by
      case
        when status = 'live' then 0
        when status = 'draft' and ${includeDraft} = true then 1
        when status = 'closed' then 2
        else 3
      end,
      updated_at desc
    limit 1
  `;

  const poll = await ensurePollFreshState(pollRows[0] || null);
  if (!poll) return null;

  return hydratePollRecord(poll, voterFingerprint || null);
}

export async function loadMapPollById(pollId: string, voterFingerprint?: string | null) {
  const pollRows = await sql<PollRow[]>`
    select id, channel_id, title, prompt, status::text as status, poll_mode, show_popup, published_at, closes_at, created_by_user_id
    from public.map_polls
    where id = ${pollId}
    limit 1
  `;
  const poll = await ensurePollFreshState(pollRows[0] || null);
  if (!poll) return null;
  return hydratePollRecord(poll, voterFingerprint || null);
}

async function hydratePollRecord(poll: PollRow, voterFingerprint: string | null) {
  const pollMode = resolvePollMode(poll.poll_mode);

  const [countryRows, cityRows, voteRows, existingVoteRows] = await Promise.all([
    sql<PollCountryRow[]>`
      select country_code, sort_order
      from public.map_poll_country_options
      where poll_id = ${poll.id}
      order by sort_order asc, country_code asc
    `,
    sql<PollCityRow[]>`
      select country_code, city, sort_order
      from public.map_poll_city_options
      where poll_id = ${poll.id}
      order by country_code asc, sort_order asc, city asc
    `,
    sql<PollVoteRow[]>`
      select country_code, city, count(*)::int as votes
      from public.map_poll_votes
      where poll_id = ${poll.id}
      group by country_code, city
    `,
    voterFingerprint
      ? sql<Array<{ id: string }>>`
          select id
          from public.map_poll_votes
          where poll_id = ${poll.id}
            and voter_fingerprint = ${voterFingerprint}
          limit 1
        `
      : Promise.resolve([] as Array<{ id: string }>),
  ]);

  const cityVoteMap = new Map<string, number>();
  const countryVoteMap = new Map<string, number>();
  let totalVotes = 0;

  for (const row of voteRows || []) {
    const countryCode = normalizeCountryCode(row.country_code);
    const city = normalizeCity(row.city);
    const key = `${countryCode}::${city.toLowerCase()}`;
    const count = Number(row.votes || 0);
    cityVoteMap.set(key, count);
    countryVoteMap.set(countryCode, (countryVoteMap.get(countryCode) || 0) + count);
    totalVotes += count;
  }

  const cityGroups = new Map<string, MapPollCityOption[]>();
  for (const row of cityRows || []) {
    const countryCode = normalizeCountryCode(row.country_code);
    const city = normalizeCity(row.city);
    const key = `${countryCode}::${city.toLowerCase()}`;
    const bucket = cityGroups.get(countryCode) || [];
    bucket.push({
      country_code: countryCode,
      city,
      sort_order: Number(row.sort_order || 0),
      votes: cityVoteMap.get(key) || 0,
    });
    cityGroups.set(countryCode, bucket);
  }

  const countryOptions = (countryRows || []).map((row) => {
    const countryCode = normalizeCountryCode(row.country_code);
    const cities = (cityGroups.get(countryCode) || []).sort(
      (a, b) => b.votes - a.votes || a.sort_order - b.sort_order || a.city.localeCompare(b.city)
    );

    return {
      country_code: countryCode,
      country_name: countryCode,
      sort_order: Number(row.sort_order || 0),
      votes: countryVoteMap.get(countryCode) || 0,
      cities: pollMode === "country" ? [] : cities,
    } satisfies MapPollCountryOption;
  });

  return {
    ...poll,
    poll_mode: pollMode,
    total_votes: totalVotes,
    has_voted: Boolean(existingVoteRows[0]?.id),
    country_options: countryOptions,
  } satisfies MapPollRecord;
}

export async function upsertMapPoll(input: MapPollUpsertInput) {
  const now = new Date().toISOString();

  const existingRows = input.pollId
    ? await sql<Array<{ id: string; status: MapPollStatus }>>`
        select id, status::text as status
        from public.map_polls
        where id = ${input.pollId}
          and channel_id = ${input.channelId}
        limit 1
      `
    : await sql<Array<{ id: string; status: MapPollStatus }>>`
        select id, status::text as status
        from public.map_polls
        where channel_id = ${input.channelId}
          and status in ('draft', 'live')
        order by updated_at desc
        limit 1
      `;

  const existing = existingRows[0] || null;
  let pollId = existing?.id || null;

  if (input.status === "live") {
    if (existing?.id) {
      await sql`
        update public.map_polls
        set status = 'closed', show_popup = false, updated_at = ${now}
        where channel_id = ${input.channelId}
          and status = 'live'
          and id <> ${existing.id}
      `;
    } else {
      await sql`
        update public.map_polls
        set status = 'closed', show_popup = false, updated_at = ${now}
        where channel_id = ${input.channelId}
          and status = 'live'
      `;
    }
  }

  if (pollId) {
    await sql`
      update public.map_polls
      set
        title = ${input.title},
        prompt = ${input.prompt},
        poll_mode = ${input.pollMode},
        status = ${input.status},
        show_popup = ${input.showPopup},
        closes_at = ${input.closesAt || null},
        published_at = ${input.status === "live" ? now : null},
        updated_at = ${now}
      where id = ${pollId}
    `;
  } else {
    const rows = await sql<Array<{ id: string }>>`
      insert into public.map_polls (
        channel_id,
        title,
        prompt,
        poll_mode,
        status,
        show_popup,
        published_at,
        closes_at,
        created_by_user_id,
        created_at,
        updated_at
      )
      values (
        ${input.channelId},
        ${input.title},
        ${input.prompt},
        ${input.pollMode},
        ${input.status},
        ${input.showPopup},
        ${input.status === "live" ? now : null},
        ${input.closesAt || null},
        ${input.userId},
        ${now},
        ${now}
      )
      returning id
    `;
    pollId = rows[0]?.id || null;
  }

  if (!pollId) {
    throw new Error("No se pudo guardar la votacion");
  }

  await sql`delete from public.map_poll_city_options where poll_id = ${pollId}`;
  await sql`delete from public.map_poll_country_options where poll_id = ${pollId}`;

  for (const country of input.countryOptions) {
    await sql`
      insert into public.map_poll_country_options (poll_id, country_code, sort_order, created_at, updated_at)
      values (${pollId}, ${country.country_code}, ${country.sort_order}, ${now}, ${now})
    `;

    for (const city of country.cities) {
      await sql`
        insert into public.map_poll_city_options (poll_id, country_code, city, sort_order, created_at, updated_at)
        values (${pollId}, ${country.country_code}, ${city.city}, ${city.sort_order}, ${now}, ${now})
      `;
    }
  }

  return loadMapPollById(pollId);
}

export async function closeMapPoll(channelId: string, pollId: string) {
  await sql`
    update public.map_polls
    set status = 'closed', show_popup = false, updated_at = ${new Date().toISOString()}
    where id = ${pollId}
      and channel_id = ${channelId}
  `;
  return loadMapPollById(pollId);
}

export async function recordMapPollVote({
  pollId,
  countryCode,
  city,
  voterFingerprint,
  ipHash,
  userAgentHash,
}: {
  pollId: string;
  countryCode: string;
  city?: string | null;
  voterFingerprint: string;
  ipHash: string | null;
  userAgentHash: string | null;
}) {
  const now = new Date().toISOString();
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedCity = normalizeCity(city || "");

  const [pollRows, countryRows, existingVoteRows] = await Promise.all([
    sql<PollRow[]>`
      select id, channel_id, title, prompt, status::text as status, poll_mode, show_popup, published_at, closes_at, created_by_user_id
      from public.map_polls
      where id = ${pollId}
      limit 1
    `,
    sql<PollCountryRow[]>`
      select country_code, sort_order
      from public.map_poll_country_options
      where poll_id = ${pollId}
        and country_code = ${normalizedCountry}
      limit 1
    `,
    sql<Array<{ id: string }>>`
      select id
      from public.map_poll_votes
      where poll_id = ${pollId}
        and voter_fingerprint = ${voterFingerprint}
      limit 1
    `,
  ]);

  const poll = await ensurePollFreshState(pollRows[0] || null);

  if (!poll || poll.status !== "live") {
    throw new MapPollVoteError("La votacion no esta disponible.", 400);
  }

  if (!countryRows[0]) {
    throw new MapPollVoteError("El pais elegido no es valido.", 400);
  }

  if (existingVoteRows[0]?.id) {
    throw new MapPollVoteError("Este dispositivo ya voto en esta encuesta.", 400);
  }

  const pollMode = resolvePollMode(poll.poll_mode);

  let voteCity = MAP_POLL_COUNTRY_VOTE_CITY;
  if (pollMode === "country_city") {
    if (!normalizedCity) {
      throw new MapPollVoteError("Debes elegir una ciudad valida.", 400);
    }

    const cityRows = await sql<PollCityRow[]>`
      select country_code, city, sort_order
      from public.map_poll_city_options
      where poll_id = ${pollId}
        and country_code = ${normalizedCountry}
        and lower(city) = lower(${normalizedCity})
      limit 1
    `;

    if (!cityRows[0]) {
      throw new MapPollVoteError("La ciudad elegida no es valida.", 400);
    }

    voteCity = normalizeCity(cityRows[0].city);
  }

  const rateWindowRows = ipHash
    ? await sql<Array<{ attempts: number }>>`
        select count(*)::int as attempts
        from public.map_poll_votes
        where poll_id = ${pollId}
          and ip_hash = ${ipHash}
          and created_at >= now() - interval '1 minute'
      `
    : await sql<Array<{ attempts: number }>>`
        select count(*)::int as attempts
        from public.map_poll_votes
        where poll_id = ${pollId}
          and voter_fingerprint = ${voterFingerprint}
          and created_at >= now() - interval '1 minute'
      `;

  if ((rateWindowRows[0]?.attempts || 0) >= 10) {
    throw new MapPollVoteError("Demasiados intentos de voto. Reintenta en un minuto.", 429);
  }

  await sql`
    insert into public.map_poll_votes (
      poll_id,
      country_code,
      city,
      voter_fingerprint,
      ip_hash,
      user_agent_hash,
      created_at
    )
    values (
      ${pollId},
      ${normalizedCountry},
      ${voteCity},
      ${voterFingerprint},
      ${ipHash},
      ${userAgentHash},
      ${now}
    )
  `;

  return loadMapPollById(pollId, voterFingerprint);
}
