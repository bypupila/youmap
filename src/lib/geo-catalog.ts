import { City, Country } from "country-state-city";

type CountryCityCatalog = {
  cities: string[];
  normalizedToCanonical: Map<string, string>;
  normalizedSet: Set<string>;
};

const countryCityCatalogCache = new Map<string, CountryCityCatalog>();

export function normalizeGeoComparable(value: string) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeGeoLabel(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeCountryCodeForCatalog(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function buildCountryCityCatalog(countryCode: string): CountryCityCatalog {
  const canonicalByNormalized = new Map<string, string>();
  const rawCities = City.getCitiesOfCountry(countryCode) || [];

  for (const rawCity of rawCities) {
    const cityName = normalizeGeoLabel(rawCity.name);
    if (!cityName) continue;
    const normalized = normalizeGeoComparable(cityName);
    if (!normalized || canonicalByNormalized.has(normalized)) continue;
    canonicalByNormalized.set(normalized, cityName);
  }

  const cities = Array.from(canonicalByNormalized.values()).sort((a, b) => a.localeCompare(b));

  return {
    cities,
    normalizedToCanonical: canonicalByNormalized,
    normalizedSet: new Set(canonicalByNormalized.keys()),
  };
}

function getCountryCityCatalog(countryCode: string): CountryCityCatalog {
  const normalizedCode = normalizeCountryCodeForCatalog(countryCode);
  if (!normalizedCode) {
    return { cities: [], normalizedToCanonical: new Map<string, string>(), normalizedSet: new Set<string>() };
  }

  const cached = countryCityCatalogCache.get(normalizedCode);
  if (cached) return cached;

  const next = buildCountryCityCatalog(normalizedCode);
  countryCityCatalogCache.set(normalizedCode, next);
  return next;
}

export function getCountryDisplayName(countryCode: string) {
  const normalizedCode = normalizeCountryCodeForCatalog(countryCode);
  return Country.getCountryByCode(normalizedCode)?.name || normalizedCode;
}

export function getAllCitiesForCountry(countryCode: string) {
  return getCountryCityCatalog(countryCode).cities;
}

export function isKnownCityForCountry(countryCode: string, city: string) {
  const normalizedCode = normalizeCountryCodeForCatalog(countryCode);
  const normalizedCity = normalizeGeoComparable(city);
  if (!normalizedCode || !normalizedCity) return false;
  return getCountryCityCatalog(normalizedCode).normalizedSet.has(normalizedCity);
}

export function resolveCanonicalCityForCountry(countryCode: string, city: string) {
  const normalizedCode = normalizeCountryCodeForCatalog(countryCode);
  const normalizedCity = normalizeGeoComparable(city);
  if (!normalizedCode || !normalizedCity) return null;
  return getCountryCityCatalog(normalizedCode).normalizedToCanonical.get(normalizedCity) || null;
}

export function getRecommendedCitiesForCountry(input: {
  countryCode: string;
  limit: number;
  seenCities?: Set<string>;
}) {
  const normalizedCode = normalizeCountryCodeForCatalog(input.countryCode);
  if (!normalizedCode) return [];

  const allCities = getCountryCityCatalog(normalizedCode).cities;
  const seenCities = input.seenCities || new Set<string>();
  const unseen = allCities.filter((city) => !seenCities.has(normalizeGeoComparable(city)));
  const source = unseen.length ? unseen : allCities;

  return source.slice(0, Math.max(0, input.limit));
}
