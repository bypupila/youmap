import { getCountryDisplayName, getRecommendedCitiesForCountry as getRecommendedCitiesFromCatalog, normalizeCountryCodeForCatalog, normalizeGeoComparable, normalizeGeoLabel } from "@/lib/geo-catalog";
import type { TravelVideoLocation } from "@/lib/types";

export const MAX_FAN_VOTE_CITY_OPTIONS = 40;

export interface FanVoteOptionInput {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

export function buildRecommendedFanVoteOptions(videoLocations: TravelVideoLocation[]): FanVoteOptionInput[] {
  const countries = new Map<string, { country_name: string; seenCities: Set<string> }>();

  for (const video of videoLocations) {
    const countryCode = normalizeCountryCodeForCatalog(video.country_code || "");
    if (!countryCode) continue;

    const countryName = normalizeText(video.country_name || "") || getCountryDisplayName(countryCode) || countryCode;
    const bucket = countries.get(countryCode) || { country_name: countryName, seenCities: new Set<string>() };
    const city = normalizeCity(video.city || "");

    if (city) {
      bucket.seenCities.add(normalizeComparable(city));
    }

    countries.set(countryCode, bucket);
  }

  return Array.from(countries.entries())
    .map(([countryCode, country], index) => {
      const recommendedCities = getRecommendedCitiesForCountry(countryCode, country.country_name, country.seenCities);

      return {
        country_code: countryCode,
        country_name: country.country_name,
        sort_order: index,
        cities: recommendedCities.map((city, cityIndex) => ({ city, sort_order: cityIndex })),
      };
    })
    .sort((a, b) => a.country_name.localeCompare(b.country_name));
}

function getRecommendedCitiesForCountry(countryCode: string, countryName: string, seenCities: Set<string>) {
  return getRecommendedCitiesFromCatalog({
    countryCode,
    seenCities,
    limit: MAX_FAN_VOTE_CITY_OPTIONS,
  }).filter((city) => !isCountryLabel(city, countryCode, countryName));
}

function isCountryLabel(city: string, countryCode: string, countryName: string) {
  const cityKey = normalizeComparable(city);
  return cityKey === normalizeComparable(countryCode) || cityKey === normalizeComparable(countryName);
}

function normalizeCity(value: string) {
  return normalizeGeoLabel(value);
}

function normalizeText(value: string) {
  return String(value || "").trim();
}

function normalizeComparable(value: string) {
  return normalizeGeoComparable(value);
}
