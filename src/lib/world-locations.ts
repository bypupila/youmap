"use client";

import { City, Country } from "country-state-city";

export interface WorldCountry {
  isoCode: string;
  name: string;
  flag: string;
}

export interface WorldCity {
  name: string;
  stateCode: string;
}

let countriesCache: WorldCountry[] | null = null;
const citiesCache = new Map<string, WorldCity[]>();

export function getAllWorldCountries(): WorldCountry[] {
  if (!countriesCache) {
    countriesCache = Country.getAllCountries()
      .map((country) => ({
        isoCode: country.isoCode,
        name: country.name,
        flag: country.flag || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return countriesCache;
}

export function getCitiesForCountry(isoCode: string): WorldCity[] {
  const code = String(isoCode || "").toUpperCase();
  if (!code) return [];

  const cached = citiesCache.get(code);
  if (cached) return cached;

  const raw = City.getCitiesOfCountry(code) || [];
  const seen = new Set<string>();
  const deduped: WorldCity[] = [];

  for (const city of raw) {
    const key = String(city.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push({ name: city.name, stateCode: city.stateCode });
  }

  deduped.sort((a, b) => a.name.localeCompare(b.name));
  citiesCache.set(code, deduped);
  return deduped;
}

export function getCountryByIsoCode(isoCode: string): WorldCountry | null {
  const code = String(isoCode || "").toUpperCase();
  if (!code) return null;
  return getAllWorldCountries().find((country) => country.isoCode === code) || null;
}
