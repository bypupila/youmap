import type { MapPollRecord } from "@/lib/map-polls";
import type { TravelVideoLocation } from "@/lib/types";

export type CountryBucket = {
  country_code: string;
  country_name: string;
  count: number;
  views: number;
  cities: string[];
};

export type DestinationCandidate = {
  country_code: string;
  country_name: string;
  cities: string[];
  votes: number;
  percent: number;
  source: "poll" | "videos";
};

/**
 * Group the filtered video set into country buckets sorted by video count.
 * Cities are deduped while preserving first-seen order so the user gets a
 * predictable preview ("Mexico City, Cancun, Oaxaca") rather than a jumbled
 * list. Falls back to the country code when a video is missing a name so the
 * UI never renders an empty cell.
 */
export function buildCountryBuckets(videos: TravelVideoLocation[]): CountryBucket[] {
  const buckets = new Map<string, CountryBucket>();
  for (const video of videos) {
    const countryCode = String(video.country_code || "").toUpperCase();
    if (!countryCode) continue;
    const row = buckets.get(countryCode) || {
      country_code: countryCode,
      country_name: video.country_name || countryCode,
      count: 0,
      views: 0,
      cities: [],
    };
    row.count += 1;
    row.views += Number(video.view_count || 0);
    const city = String(video.city || video.location_label || "").trim();
    if (city && !row.cities.includes(city)) row.cities.push(city);
    buckets.set(countryCode, row);
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

/**
 * Produce a unified "next destination" leaderboard. When the channel owner
 * is running a fan-vote poll we trust the live tally and convert it into the
 * shared `DestinationCandidate` shape; otherwise we synthesise candidates
 * from existing video buckets so the right-rail UI always has something
 * meaningful to show, with a `source` flag the UI uses to switch the
 * "Votacion activa" label to "Basado en videos".
 */
export function buildDestinationCandidates(
  poll: MapPollRecord | null,
  buckets: CountryBucket[]
): DestinationCandidate[] {
  if (poll?.country_options?.length) {
    const totalVotes = Math.max(1, Number(poll.total_votes || 0));
    return poll.country_options
      .map((country) => ({
        country_code: country.country_code,
        country_name: country.country_name || country.country_code,
        cities: country.cities.map((city) => city.city),
        votes: Number(country.votes || 0),
        percent: Math.round((Number(country.votes || 0) / totalVotes) * 100),
        source: "poll" as const,
      }))
      .sort((a, b) => b.votes - a.votes);
  }

  const maxScore = Math.max(1, buckets[0]?.count || 1);
  return buckets.slice(0, 6).map((country) => ({
    country_code: country.country_code,
    country_name: country.country_name,
    cities: country.cities,
    votes: 0,
    percent: Math.max(12, Math.round((country.count / maxScore) * 100)),
    source: "videos" as const,
  }));
}
