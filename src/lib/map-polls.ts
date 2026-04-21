import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import type { TravelVideoLocation } from "@/lib/types";
import { sql } from "@/lib/neon";

export const MAP_VOTER_COOKIE = "travelmap_voter";

export type MapPollStatus = "draft" | "live" | "closed";

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
  show_popup: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_by_user_id: string;
}

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

export function normalizeCountryCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeCity(value: string) {
  return String(value || "").trim();
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
  available: ReturnType<typeof buildPollOptionsFromVideos>
) {
  const availableByCountry = new Map(
    available.map((country) => [country.country_code, new Set(country.cities.map((city) => city.city))])
  );
  const availableNames = new Map(available.map((country) => [country.country_code, country.country_name]));

  return options
    .map((country, index) => {
      const countryCode = normalizeCountryCode(country.country_code);
      if (!countryCode || !availableByCountry.has(countryCode)) return null;

      const seenCities = new Set<string>();
      const cities = country.cities
        .map((city, cityIndex) => {
          const normalizedCity = normalizeCity(city.city);
          if (!normalizedCity) return null;
          if (!availableByCountry.get(countryCode)?.has(normalizedCity)) return null;
          const dedupeKey = normalizedCity.toLowerCase();
          if (seenCities.has(dedupeKey)) return null;
          seenCities.add(dedupeKey);
          return {
            city: normalizedCity,
            sort_order: Number.isFinite(Number(city.sort_order)) ? Number(city.sort_order) : cityIndex,
          };
        })
        .filter(Boolean) as Array<{ city: string; sort_order: number }>;

      if (!cities.length) return null;

      return {
        country_code: countryCode,
        country_name: country.country_name || availableNames.get(countryCode) || countryCode,
        sort_order: Number.isFinite(Number(country.sort_order)) ? Number(country.sort_order) : index,
        cities,
      };
    })
    .filter(Boolean) as Array<{
    country_code: string;
    country_name: string;
    sort_order: number;
    cities: Array<{ city: string; sort_order: number }>;
  }>;
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getOrCreateVoterFingerprint() {
  const cookieStore = await cookies();
  const existing = String(cookieStore.get(MAP_VOTER_COOKIE)?.value || "").trim();
  if (existing) {
    return { raw: existing, hashed: hashValue(existing), shouldSetCookie: false };
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

export async function loadMapPoll(
  channelId: string,
  {
    includeDraft = false,
    voterFingerprint,
  }: { includeDraft?: boolean; voterFingerprint?: string | null } = {}
): Promise<MapPollRecord | null> {
  const pollRows = await sql<PollRow[]>`
    select id, channel_id, title, prompt, status, show_popup, published_at, closes_at, created_by_user_id
    from public.map_polls
    where channel_id = ${channelId}
      and (${includeDraft} = true or status = 'live')
    order by
      case status when 'live' then 0 when 'draft' then 1 else 2 end,
      updated_at desc
    limit 1
  `;

  const poll = pollRows[0] || null;
  if (!poll) return null;

  return hydratePollRecord(poll, voterFingerprint || null);
}

export async function loadMapPollById(pollId: string, voterFingerprint?: string | null) {
  const pollRows = await sql<PollRow[]>`
    select id, channel_id, title, prompt, status, show_popup, published_at, closes_at, created_by_user_id
    from public.map_polls
    where id = ${pollId}
    limit 1
  `;
  const poll = pollRows[0] || null;
  if (!poll) return null;
  return hydratePollRecord(poll, voterFingerprint || null);
}

async function hydratePollRecord(poll: PollRow, voterFingerprint: string | null) {
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

  const voteMap = new Map<string, number>();
  let totalVotes = 0;
  for (const row of voteRows || []) {
    const key = `${normalizeCountryCode(row.country_code)}::${normalizeCity(row.city).toLowerCase()}`;
    const count = Number(row.votes || 0);
    voteMap.set(key, count);
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
      votes: voteMap.get(key) || 0,
    });
    cityGroups.set(countryCode, bucket);
  }

  const countryOptions = (countryRows || []).map((row) => {
    const countryCode = normalizeCountryCode(row.country_code);
    const cities = (cityGroups.get(countryCode) || []).sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order || a.city.localeCompare(b.city));
    return {
      country_code: countryCode,
      country_name: countryCode,
      sort_order: Number(row.sort_order || 0),
      votes: cities.reduce((sum, city) => sum + city.votes, 0),
      cities,
    } satisfies MapPollCountryOption;
  });

  return {
    ...poll,
    total_votes: totalVotes,
    has_voted: Boolean(existingVoteRows[0]?.id),
    country_options: countryOptions,
  } satisfies MapPollRecord;
}

export async function upsertMapPoll(input: MapPollUpsertInput) {
  const now = new Date().toISOString();
  const existingRows = input.pollId
    ? await sql<Array<{ id: string; status: MapPollStatus }>>`
        select id, status
        from public.map_polls
        where id = ${input.pollId}
          and channel_id = ${input.channelId}
        limit 1
      `
    : await sql<Array<{ id: string; status: MapPollStatus }>>`
        select id, status
        from public.map_polls
        where channel_id = ${input.channelId}
          and status in ('draft', 'live')
        order by updated_at desc
        limit 1
      `;

  const existing = existingRows[0] || null;
  let pollId = existing?.id || null;

  if (input.status === "live") {
    await sql`
      update public.map_polls
      set status = 'closed', updated_at = ${now}
      where channel_id = ${input.channelId}
        and status = 'live'
        and (${existing?.id || null} is null or id <> ${existing?.id || null})
    `;
  }

  if (pollId) {
    await sql`
      update public.map_polls
      set
        title = ${input.title},
        prompt = ${input.prompt},
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
  city: string;
  voterFingerprint: string;
  ipHash: string | null;
  userAgentHash: string | null;
}) {
  const now = new Date().toISOString();
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedCity = normalizeCity(city);

  const [poll, countryRows, cityRows, existingVoteRows] = await Promise.all([
    sql<PollRow[]>`
      select id, channel_id, title, prompt, status, show_popup, published_at, closes_at, created_by_user_id
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
    sql<PollCityRow[]>`
      select country_code, city, sort_order
      from public.map_poll_city_options
      where poll_id = ${pollId}
        and country_code = ${normalizedCountry}
        and lower(city) = lower(${normalizedCity})
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

  if (!poll[0] || poll[0].status !== "live") {
    throw new Error("La votacion no esta disponible.");
  }
  if (!countryRows[0] || !cityRows[0]) {
    throw new Error("La opcion elegida no es valida.");
  }
  if (existingVoteRows[0]?.id) {
    throw new Error("Este dispositivo ya voto en esta encuesta.");
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
      ${normalizedCity},
      ${voterFingerprint},
      ${ipHash},
      ${userAgentHash},
      ${now}
    )
  `;

  return loadMapPollById(pollId, voterFingerprint);
}
