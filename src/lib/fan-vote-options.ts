import { City, Country } from "country-state-city";
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
    const countryCode = normalizeCountryCode(video.country_code || "");
    if (!countryCode) continue;

    const countryName = normalizeText(video.country_name || "") || Country.getCountryByCode(countryCode)?.name || countryCode;
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
  const allCities = (City.getCitiesOfCountry(countryCode) || [])
    .map((city) => normalizeCity(city.name))
    .filter(Boolean);
  const uniqueCities = dedupeCities(allCities).filter((city) => !isCountryLabel(city, countryCode, countryName));
  const unseenCities = uniqueCities.filter((city) => !seenCities.has(normalizeComparable(city)));
  const source = unseenCities.length ? unseenCities : uniqueCities;

  return source.slice(0, MAX_FAN_VOTE_CITY_OPTIONS);
}

function dedupeCities(cities: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const city of cities) {
    const key = normalizeComparable(city);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(city);
  }

  return deduped;
}

function isCountryLabel(city: string, countryCode: string, countryName: string) {
  const cityKey = normalizeComparable(city);
  return cityKey === normalizeComparable(countryCode) || cityKey === normalizeComparable(countryName);
}

function normalizeCountryCode(value: string) {
  const normalized = normalizeText(value).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function normalizeCity(value: string) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeText(value: string) {
  return String(value || "").trim();
}

function normalizeComparable(value: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
