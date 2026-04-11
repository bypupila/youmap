import { sanitizeEnvValue } from "@/lib/env";

export interface GeocodeMatch {
  lat: number;
  lng: number;
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  region: string | null;
  label: string;
  raw: unknown;
}

export async function geocodeLocation(query: string): Promise<GeocodeMatch | null> {
  const normalizedQuery = sanitizeEnvValue(query);
  if (!normalizedQuery) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const contactEmail = sanitizeEnvValue(process.env.NOMINATIM_EMAIL);
  const fallbackContact = sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL || "travelmap.local");
  const userAgentName = sanitizeEnvValue(process.env.NOMINATIM_USER_AGENT || "TravelMap");
  const contactForHeaders = contactEmail || fallbackContact;
  if (contactEmail) {
    url.searchParams.set("email", contactEmail);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": `${userAgentName}/1.0 (${contactForHeaders})`,
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      country_code?: string;
      country?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
      region?: string;
    };
  }>;

  const first = results[0];
  if (!first) return null;

  const address = first.address || {};
  const city = address.city || address.town || address.village || address.municipality || null;
  const region = address.state || address.region || null;

  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    countryCode: address.country_code?.toUpperCase() || null,
    countryName: address.country || null,
    city,
    region,
    label: first.display_name,
    raw: first,
  };
}

export async function geocodeCoordinates(lat: number, lng: number): Promise<GeocodeMatch | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const contactEmail = sanitizeEnvValue(process.env.NOMINATIM_EMAIL);
  const fallbackContact = sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL || "travelmap.local");
  const userAgentName = sanitizeEnvValue(process.env.NOMINATIM_USER_AGENT || "TravelMap");
  const contactForHeaders = contactEmail || fallbackContact;
  if (contactEmail) {
    url.searchParams.set("email", contactEmail);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": `${userAgentName}/1.0 (${contactForHeaders})`,
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: {
      country_code?: string;
      country?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
      region?: string;
    };
  };

  const address = payload.address || {};
  const city = address.city || address.town || address.village || address.municipality || null;
  const region = address.state || address.region || null;

  return {
    lat: Number(payload.lat || lat),
    lng: Number(payload.lon || lng),
    countryCode: address.country_code?.toUpperCase() || null,
    countryName: address.country || null,
    city,
    region,
    label: payload.display_name || `${lat}, ${lng}`,
    raw: payload,
  };
}
