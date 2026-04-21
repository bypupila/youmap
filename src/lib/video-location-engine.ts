import { randomUUID } from "crypto";
import { z } from "zod";
import { geocodeCoordinates, geocodeLocation, type GeocodeMatch } from "@/lib/geocode";
import { getGeminiClient, getGeminiModel, hasGeminiApiKey } from "@/lib/gemini";
import { sql } from "@/lib/neon";
import {
  containsWholePhrase,
  detectCatalogPlaces,
  flagToCountryCode,
  getCountryCatalogEntry,
  normalizeForLookup,
  stripBoilerplate,
  TRAVEL_KEYWORDS,
} from "@/lib/video-location-catalog";
import { LOCATION_PROMPT } from "@/lib/youtube-location-prompt";
import type { TravelVideoLocation } from "@/lib/types";
import type { YouTubePlaylistGeoSignal } from "@/lib/youtube";

const travelTypeSchema = z.enum(["city_tour", "nature", "food", "culture", "adventure", "beach", "road_trip", "other"]);

const locationSchema = z
  .object({
    country_code: z.string().length(2).optional().nullable(),
    country_name: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    location_label: z.string().optional().nullable(),
    confidence: z.number().min(0).max(1).optional().nullable(),
    travel_type: travelTypeSchema.optional().nullable(),
  })
  .passthrough();

const extractionSchema = z
  .object({
    has_location: z.boolean(),
    primary_location: locationSchema.optional().nullable(),
    additional_locations: z.array(locationSchema).optional().default([]),
    summary: z.string().optional().nullable(),
  })
  .passthrough();

const geminiJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    has_location: { type: "boolean" },
    primary_location: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        country_code: { type: ["string", "null"] },
        country_name: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        location_label: { type: ["string", "null"] },
        confidence: { type: ["number", "null"] },
        travel_type: { type: ["string", "null"] },
      },
      required: [],
    },
    additional_locations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          country_code: { type: ["string", "null"] },
          country_name: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          region: { type: ["string", "null"] },
          location_label: { type: ["string", "null"] },
          confidence: { type: ["number", "null"] },
          travel_type: { type: ["string", "null"] },
        },
        required: [],
      },
    },
    summary: { type: ["string", "null"] },
  },
  required: ["has_location", "additional_locations"],
} as const;

type VerificationSource = "heuristic" | "gemini" | "manual" | "youtube_recording_details";
type LocationPrecision = "city" | "region" | "country" | "unresolved";
type EngineMode = "initial" | "incremental" | "second_check";

interface GeoEvidence {
  source: "title" | "description" | "recording_location_description" | "playlist" | "flag" | "geocoder" | "gemini";
  matched_text: string;
  normalized_place: string;
  place_type: "country" | "city";
  country_code: string;
  country_name: string;
  city?: string | null;
  region?: string | null;
  weight: number;
  ambiguous?: boolean;
  notes?: string | null;
}

interface CandidateScore {
  key: string;
  placeType: "country" | "city";
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  weight: number;
  evidence: GeoEvidence[];
  ambiguous: boolean;
  sourceSet: Set<string>;
}

interface VideoLocationEngineInput {
  channelName: string;
  channelDescription: string | null;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  playlistSignals: YouTubePlaylistGeoSignal[];
  recordingLat: number | null;
  recordingLng: number | null;
  recordingLocationDescription: string | null;
  mode: EngineMode;
}

export interface PersistVideoAnalysisInput {
  channelId: string;
  videoRecordId: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
  recordingLat: number | null;
  recordingLng: number | null;
  recordingLocationDescription: string | null;
  analysis: VideoLocationAnalysis;
}

export interface VideoLocationAnalysis {
  isTravel: boolean;
  travelScore: number;
  travelSignals: string[];
  inclusionReason: string | null;
  exclusionReason: string | null;
  locationStatus: "verified_auto" | "needs_manual" | "no_location";
  verificationSource: VerificationSource | null;
  locationScore: number;
  locationEvidence: Record<string, unknown>;
  needsManualReason: string | null;
  locationPrecision: LocationPrecision;
  playlistSignals: Array<Record<string, unknown>>;
  geoHints: Array<Record<string, unknown>>;
  primaryLocation: TravelVideoLocation | null;
  extractionOutput?: Record<string, unknown> | null;
}

const geocodeCache = new Map<string, Promise<GeocodeMatch | null>>();
const reverseGeocodeCache = new Map<string, Promise<GeocodeMatch | null>>();

function getCachedGeocode(query: string) {
  const normalized = normalizeForLookup(query);
  if (!normalized) return Promise.resolve(null);
  if (!geocodeCache.has(normalized)) {
    geocodeCache.set(normalized, geocodeLocation(query));
  }
  return geocodeCache.get(normalized)!;
}

function getCachedReverseGeocode(lat: number, lng: number) {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (!reverseGeocodeCache.has(key)) {
    reverseGeocodeCache.set(key, geocodeCoordinates(lat, lng));
  }
  return reverseGeocodeCache.get(key)!;
}

function createGeoQuery(primaryLocation: z.infer<typeof locationSchema>) {
  return [primaryLocation.city, primaryLocation.region, primaryLocation.country_name, primaryLocation.country_code, primaryLocation.location_label]
    .filter(Boolean)
    .join(", ");
}

function addEvidence(target: GeoEvidence[], input: Omit<GeoEvidence, "normalized_place"> & { normalized_place?: string }) {
  target.push({
    ...input,
    normalized_place: input.normalized_place || normalizeForLookup([input.city, input.country_name].filter(Boolean).join(", ")),
  });
}

function collectTextEvidence(source: GeoEvidence["source"], rawText: string | null | undefined, titleBias = 1) {
  const evidence: GeoEvidence[] = [];
  const cleanText = stripBoilerplate(rawText);
  const places = detectCatalogPlaces(cleanText);
  for (const place of places) {
    const weight = place.kind === "city" ? 0.34 * titleBias : 0.2 * titleBias;
    addEvidence(evidence, {
      source,
      matched_text: place.matchedText,
      place_type: place.kind,
      country_code: place.countryCode,
      country_name: place.countryName,
      city: place.city || null,
      region: place.region || null,
      weight,
      ambiguous: place.ambiguous,
    });
  }

  const flagCode = flagToCountryCode(cleanText);
  if (flagCode) {
    const country = getCountryCatalogEntry(flagCode);
    addEvidence(evidence, {
      source: "flag",
      matched_text: flagCode,
      place_type: "country",
      country_code: flagCode,
      country_name: country?.countryName || flagCode,
      city: null,
      region: null,
      weight: 0.32,
      ambiguous: false,
      notes: "flag_emoji",
    });
  }

  return evidence;
}

function collectPlaylistEvidence(playlistSignals: YouTubePlaylistGeoSignal[]) {
  const evidence: GeoEvidence[] = [];
  const serializedSignals = playlistSignals.map((playlist) => ({
    playlist_id: playlist.playlistId,
    title: playlist.title,
    classification: playlist.classification,
    matched_places: playlist.matchedPlaces.map((place) => ({
      kind: place.kind,
      country_code: place.countryCode,
      country_name: place.countryName,
      city: place.city || null,
      matched_text: place.matchedText,
      ambiguous: place.ambiguous,
    })),
  }));

  for (const playlist of playlistSignals) {
    for (const place of playlist.matchedPlaces) {
      addEvidence(evidence, {
        source: "playlist",
        matched_text: `${playlist.title}: ${place.matchedText}`,
        place_type: place.kind,
        country_code: place.countryCode,
        country_name: place.countryName,
        city: place.city || null,
        region: place.region || null,
        weight: place.kind === "city" ? 0.31 : 0.22,
        ambiguous: place.ambiguous,
        notes: playlist.classification,
      });
    }
  }

  return { evidence, serializedSignals };
}

function collectTravelSignals(input: {
  title: string;
  description: string | null;
  hasRecordingLocation: boolean;
  playlistSignals: YouTubePlaylistGeoSignal[];
  geoEvidence: GeoEvidence[];
}) {
  const signals: string[] = [];
  if (input.hasRecordingLocation) signals.push("youtube_recording_details");
  if (input.playlistSignals.some((playlist) => playlist.classification === "travel")) signals.push("travel_playlist_match");
  if (input.playlistSignals.some((playlist) => playlist.classification === "geo-specific")) signals.push("geo_playlist_match");
  if (input.geoEvidence.length > 0) signals.push("geo_evidence_detected");

  const merged = normalizeForLookup(`${input.title} ${input.description || ""}`);
  const matchedKeywords = TRAVEL_KEYWORDS.filter((keyword) => containsWholePhrase(merged, keyword)).slice(0, 6);
  if (matchedKeywords.length > 0) signals.push(`travel_keywords:${matchedKeywords.join(",")}`);

  let score = 0;
  if (input.hasRecordingLocation) score += 0.6;
  if (input.playlistSignals.some((playlist) => playlist.classification === "geo-specific")) score += 0.36;
  if (input.playlistSignals.some((playlist) => playlist.classification === "travel")) score += 0.24;
  if (input.geoEvidence.length > 0) score += 0.28;
  if (matchedKeywords.length > 0) score += 0.14;
  score = Math.min(1, score);

  const isTravel =
    input.hasRecordingLocation ||
    input.geoEvidence.length > 0 ||
    input.playlistSignals.some((playlist) => playlist.classification === "travel" || playlist.classification === "geo-specific") ||
    matchedKeywords.length > 0;

  return {
    isTravel,
    score,
    signals,
    inclusionReason: isTravel
      ? input.hasRecordingLocation
        ? "youtube_geolocation"
        : input.playlistSignals.some((playlist) => playlist.classification === "geo-specific")
          ? "geo_playlist"
          : input.playlistSignals.some((playlist) => playlist.classification === "travel")
            ? "travel_playlist"
            : input.geoEvidence.length > 0
              ? "geo_heuristic"
              : "travel_keyword"
      : null,
    exclusionReason: isTravel ? null : "No travel evidence (playlist/location/text).",
  };
}

function aggregateCandidates(evidence: GeoEvidence[]) {
  const map = new Map<string, CandidateScore>();

  for (const item of evidence) {
    const key = item.place_type === "city" ? `city:${item.city}:${item.country_code}` : `country:${item.country_code}`;
    const current = map.get(key) || {
      key,
      placeType: item.place_type,
      countryCode: item.country_code,
      countryName: item.country_name,
      city: item.city || null,
      region: item.region || null,
      weight: 0,
      evidence: [],
      ambiguous: Boolean(item.ambiguous),
      sourceSet: new Set<string>(),
    };
    current.weight += item.weight;
    current.evidence.push(item);
    current.sourceSet.add(item.source);
    current.ambiguous = current.ambiguous || Boolean(item.ambiguous);
    map.set(key, current);
  }

  const candidates = Array.from(map.values()).map((candidate) => {
    const repetitionBonus = Math.min(0.1, Math.max(0, candidate.evidence.length - 1) * 0.05);
    const multiSourceBonus = candidate.sourceSet.size > 1 ? 0.05 : 0;
    const ambiguityPenalty = candidate.ambiguous ? 0.2 : 0;
    const countrySupport = candidate.placeType === "city"
      ? evidence.some((item) => item.place_type === "country" && item.country_code === candidate.countryCode && item.source !== "playlist")
      : false;
    const unsupportedAmbiguityPenalty = candidate.ambiguous && !countrySupport ? 0.18 : 0;

    return {
      ...candidate,
      weight: Math.max(0, Math.min(1, candidate.weight + repetitionBonus + multiSourceBonus - ambiguityPenalty - unsupportedAmbiguityPenalty)),
    };
  });

  candidates.sort((left, right) => {
    if (right.weight !== left.weight) return right.weight - left.weight;
    if (left.placeType !== right.placeType) return left.placeType === "city" ? -1 : 1;
    return right.evidence.length - left.evidence.length;
  });

  return candidates;
}

function buildLocation(input: {
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  geo: GeocodeMatch;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
  label: string;
  score: number;
  verificationSource: VerificationSource;
  locationSource: string;
  locationPrecision: LocationPrecision;
  evidence: Record<string, unknown>;
}) {
  return {
    youtube_video_id: input.youtubeVideoId,
    video_url: `https://youtube.com/watch?v=${input.youtubeVideoId}`,
    title: input.title,
    description: input.description,
    thumbnail_url: input.thumbnailUrl,
    published_at: input.publishedAt,
    view_count: input.viewCount,
    like_count: input.likeCount,
    comment_count: input.commentCount,
    country_code: input.countryCode,
    country_name: input.countryName,
    location_label: input.label,
    city: input.city,
    region: input.region,
    lat: input.geo.lat,
    lng: input.geo.lng,
    confidence_score: input.score,
    location_status: "verified_auto",
    verification_source: input.verificationSource,
    location_source: input.locationSource,
    location_score: input.score,
    location_precision: input.locationPrecision,
    location_evidence: input.evidence,
    needs_manual_reason: null,
  } satisfies TravelVideoLocation;
}

async function extractLocationWithGemini(input: {
  channelName: string;
  channelDescription: string | null;
  title: string;
  description: string | null;
  publishedAt: string | null;
  recordingLocationDescription: string | null;
  playlistSignals: YouTubePlaylistGeoSignal[];
}) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: `${LOCATION_PROMPT}

Return only the main filming destination and never invent city-level precision.

Channel: ${input.channelName}
Channel description: ${input.channelDescription || "No description"}
Video title: ${input.title}
Video description: ${(input.description || "").slice(0, 5000)}
Recording location description: ${input.recordingLocationDescription || "No recording description"}
Playlist context: ${input.playlistSignals.map((playlist) => `${playlist.title} [${playlist.classification}]`).join(" | ") || "none"}
Published at: ${input.publishedAt || "unknown"}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: geminiJsonSchema,
    },
  });

  return extractionSchema.parse(JSON.parse(response.text || "{}"));
}

function chooseManualReason(input: {
  isTravel: boolean;
  candidates: CandidateScore[];
  hasStrongCountryOnly: boolean;
  geocodeConflict?: boolean;
  weakTextOnly?: boolean;
}) {
  if (!input.isTravel) return "non_travel_filtered";
  if (input.geocodeConflict) return "geocode_conflict";
  if (input.candidates.some((candidate) => candidate.ambiguous && candidate.placeType === "city")) return "ambiguous_city";
  if (input.candidates.length > 1 && input.candidates[0].countryCode !== input.candidates[1].countryCode) return "country_conflict";
  if (input.weakTextOnly) return "weak_text_only";
  if (!input.hasStrongCountryOnly && input.candidates.length === 0) return "travel_but_no_location";
  return "travel_but_no_location";
}

function manualReasonMessage(reason: string) {
  switch (reason) {
    case "ambiguous_city":
      return "Ciudad ambigua: la evidencia no alcanza para desambiguar el destino.";
    case "country_conflict":
      return "Hay conflicto entre paises candidatos y no se puede resolver con seguridad.";
    case "geocode_conflict":
      return "El geocoder contradice la evidencia textual principal.";
    case "weak_text_only":
      return "Solo hay pistas textuales debiles; requiere revision manual.";
    case "non_travel_filtered":
      return "Video filtrado: no se detecto evidencia suficiente de viaje.";
    case "travel_but_no_location":
    default:
      return "Es un video de viaje, pero no hay evidencia suficiente para ubicarlo con precision.";
  }
}

function serializeEvidence(evidence: GeoEvidence[]) {
  return evidence.map((item) => ({
    source: item.source,
    matched_text: item.matched_text,
    normalized_place: item.normalized_place,
    place_type: item.place_type,
    country_code: item.country_code,
    country_name: item.country_name,
    city: item.city || null,
    region: item.region || null,
    weight: Number(item.weight.toFixed(3)),
    ambiguous: Boolean(item.ambiguous),
    notes: item.notes || null,
  }));
}

export async function analyzeVideoLocation(input: VideoLocationEngineInput): Promise<VideoLocationAnalysis> {
  const titleEvidence = collectTextEvidence("title", input.title, 1.2);
  const descriptionEvidence = collectTextEvidence("description", input.description, 0.85);
  const recordingDescriptionEvidence = collectTextEvidence(
    "recording_location_description",
    input.recordingLocationDescription,
    1
  );
  const { evidence: playlistEvidence, serializedSignals } = collectPlaylistEvidence(input.playlistSignals);
  const geoEvidence = [...titleEvidence, ...descriptionEvidence, ...recordingDescriptionEvidence, ...playlistEvidence];

  const travelSignals = collectTravelSignals({
    title: input.title,
    description: input.description,
    hasRecordingLocation:
      typeof input.recordingLat === "number" &&
      Number.isFinite(input.recordingLat) &&
      typeof input.recordingLng === "number" &&
      Number.isFinite(input.recordingLng),
    playlistSignals: input.playlistSignals,
    geoEvidence,
  });

  if (!travelSignals.isTravel) {
    return {
      isTravel: false,
      travelScore: Number(travelSignals.score.toFixed(3)),
      travelSignals: travelSignals.signals,
      inclusionReason: null,
      exclusionReason: travelSignals.exclusionReason,
      locationStatus: "no_location",
      verificationSource: null,
      locationScore: Number(travelSignals.score.toFixed(3)),
      locationEvidence: {
        stage: "travel_filter",
        travel_signals: travelSignals.signals,
      },
      needsManualReason: manualReasonMessage("non_travel_filtered"),
      locationPrecision: "unresolved",
      playlistSignals: serializedSignals,
      geoHints: serializeEvidence(geoEvidence),
      primaryLocation: null,
    };
  }

  const candidates = aggregateCandidates(geoEvidence);
  const strongCountryOnly = candidates.find((candidate) => candidate.placeType === "country" && candidate.weight >= 0.45) || null;
  const strongCityCandidate = candidates.find((candidate) => candidate.placeType === "city" && candidate.weight >= 0.72) || null;
  const manualBase = {
    isTravel: true,
    travelScore: Number(travelSignals.score.toFixed(3)),
    travelSignals: travelSignals.signals,
    inclusionReason: travelSignals.inclusionReason,
    exclusionReason: null,
    playlistSignals: serializedSignals,
    geoHints: serializeEvidence(geoEvidence),
  };

  if (
    typeof input.recordingLat === "number" &&
    Number.isFinite(input.recordingLat) &&
    typeof input.recordingLng === "number" &&
    Number.isFinite(input.recordingLng)
  ) {
    const reverseGeo = await getCachedReverseGeocode(input.recordingLat, input.recordingLng);
    const strongestCountryCandidate = candidates.find((candidate) => candidate.placeType === "country" || candidate.placeType === "city") || null;
    const hasCountryConflict =
      reverseGeo?.countryCode &&
      strongestCountryCandidate?.countryCode &&
      reverseGeo.countryCode !== strongestCountryCandidate.countryCode &&
      strongestCountryCandidate.weight >= 0.45;

    if (!hasCountryConflict) {
      const countryCode = reverseGeo?.countryCode || strongestCountryCandidate?.countryCode || "XX";
      const countryName = reverseGeo?.countryName || strongestCountryCandidate?.countryName || countryCode;
      const locationPrecision: LocationPrecision = reverseGeo?.city ? "city" : "country";
      const evidence = {
        source: "youtube_recording_details",
        recording_lat: input.recordingLat,
        recording_lng: input.recordingLng,
        recording_location_description: input.recordingLocationDescription,
        reverse_geocode: reverseGeo?.raw || null,
        geo_hints: serializeEvidence(geoEvidence),
      };

      return {
        ...manualBase,
        locationStatus: "verified_auto",
        verificationSource: "youtube_recording_details",
        locationScore: 0.98,
        locationEvidence: evidence,
        needsManualReason: null,
        locationPrecision,
        primaryLocation: buildLocation({
          youtubeVideoId: input.youtubeVideoId,
          title: input.title,
          description: input.description,
          thumbnailUrl: null,
          publishedAt: input.publishedAt,
          viewCount: null,
          likeCount: null,
          commentCount: null,
          geo: reverseGeo || {
            lat: input.recordingLat,
            lng: input.recordingLng,
            countryCode,
            countryName,
            city: null,
            region: null,
            label: input.recordingLocationDescription || `${input.recordingLat}, ${input.recordingLng}`,
            raw: null,
          },
          countryCode,
          countryName,
          city: reverseGeo?.city || null,
          region: reverseGeo?.region || null,
          label: input.recordingLocationDescription || reverseGeo?.label || `${input.recordingLat}, ${input.recordingLng}`,
          score: 0.98,
          verificationSource: "youtube_recording_details",
          locationSource: "youtube_recording_details",
          locationPrecision,
          evidence,
        }),
      };
    }
  }

  if (strongCityCandidate) {
    const cityQuery = [strongCityCandidate.city, strongCityCandidate.countryName].filter(Boolean).join(", ");
    const geo = await getCachedGeocode(cityQuery);
    const geocodeConflict = Boolean(geo?.countryCode && geo.countryCode !== strongCityCandidate.countryCode);
    if (geo && !geocodeConflict) {
      const evidence = {
        source: "heuristic",
        candidate: strongCityCandidate,
        geocode: geo.raw,
        geo_hints: serializeEvidence(geoEvidence),
      };

      return {
        ...manualBase,
        locationStatus: "verified_auto",
        verificationSource: "heuristic",
        locationScore: Number(strongCityCandidate.weight.toFixed(3)),
        locationEvidence: evidence,
        needsManualReason: null,
        locationPrecision: "city",
        primaryLocation: buildLocation({
          youtubeVideoId: input.youtubeVideoId,
          title: input.title,
          description: input.description,
          thumbnailUrl: null,
          publishedAt: input.publishedAt,
          viewCount: null,
          likeCount: null,
          commentCount: null,
          geo,
          countryCode: strongCityCandidate.countryCode,
          countryName: strongCityCandidate.countryName,
          city: strongCityCandidate.city,
          region: geo.region || strongCityCandidate.region || null,
          label: `${strongCityCandidate.city}, ${strongCityCandidate.countryName}`,
          score: Number(strongCityCandidate.weight.toFixed(3)),
          verificationSource: "heuristic",
          locationSource: "title_or_description+nominatim",
          locationPrecision: "city",
          evidence,
        }),
      };
    }
  }

  if (strongCountryOnly) {
    const geo = await getCachedGeocode(strongCountryOnly.countryName);
    if (geo && (!geo.countryCode || geo.countryCode === strongCountryOnly.countryCode)) {
      const score = Math.min(0.65, Number(strongCountryOnly.weight.toFixed(3)));
      const evidence = {
        source: "country_only",
        candidate: strongCountryOnly,
        geocode: geo.raw,
        geo_hints: serializeEvidence(geoEvidence),
      };

      return {
        ...manualBase,
        locationStatus: "verified_auto",
        verificationSource: "heuristic",
        locationScore: score,
        locationEvidence: evidence,
        needsManualReason: null,
        locationPrecision: "country",
        primaryLocation: buildLocation({
          youtubeVideoId: input.youtubeVideoId,
          title: input.title,
          description: input.description,
          thumbnailUrl: null,
          publishedAt: input.publishedAt,
          viewCount: null,
          likeCount: null,
          commentCount: null,
          geo,
          countryCode: strongCountryOnly.countryCode,
          countryName: strongCountryOnly.countryName,
          city: null,
          region: null,
          label: strongCountryOnly.countryName,
          score,
          verificationSource: "heuristic",
          locationSource: "country_only+nominatim",
          locationPrecision: "country",
          evidence,
        }),
      };
    }
  }

  const shouldUseGemini =
    hasGeminiApiKey() &&
    (
      input.mode === "second_check"
        ? candidates.length > 0 || geoEvidence.length > 0 || input.playlistSignals.length > 0
        : candidates.some((candidate) => candidate.ambiguous) ||
          (candidates[0]?.weight || 0) >= 0.35
    );

  if (shouldUseGemini) {
    try {
      const extraction = await extractLocationWithGemini({
        channelName: input.channelName,
        channelDescription: input.channelDescription,
        title: input.title,
        description: input.description,
        publishedAt: input.publishedAt,
        recordingLocationDescription: input.recordingLocationDescription,
        playlistSignals: input.playlistSignals,
      });

      if (extraction.has_location && extraction.primary_location) {
        const geo = await getCachedGeocode(createGeoQuery(extraction.primary_location));
        const strongCountry = candidates.find((candidate) => candidate.weight >= 0.42) || null;
        const geminiCountry = String(extraction.primary_location.country_code || geo?.countryCode || "").toUpperCase() || null;
        const geocodeConflict =
          Boolean(geo?.countryCode && strongCountry?.countryCode && geo.countryCode !== strongCountry.countryCode && strongCountry.weight >= 0.45) ||
          Boolean(geminiCountry && strongCountry?.countryCode && geminiCountry !== strongCountry.countryCode && strongCountry.weight >= 0.45);

        if (geo && !geocodeConflict) {
          const geminiHasCity = Boolean(extraction.primary_location.city);
          const scoreCap = geminiHasCity ? 0.55 : 0.5;
          const score = Math.min(
            scoreCap,
            Math.max(candidates[0]?.weight || 0.42, Number(extraction.primary_location.confidence || 0.45))
          );
          const locationPrecision: LocationPrecision = geminiHasCity ? "city" : "country";
          const evidence = {
            source: "gemini",
            gemini: extraction,
            geocode: geo.raw,
            geo_hints: serializeEvidence(geoEvidence),
          };

          return {
            ...manualBase,
            locationStatus: "verified_auto",
            verificationSource: "gemini",
            locationScore: Number(score.toFixed(3)),
            locationEvidence: evidence,
            needsManualReason: null,
            locationPrecision,
            primaryLocation: buildLocation({
              youtubeVideoId: input.youtubeVideoId,
              title: input.title,
              description: input.description,
              thumbnailUrl: null,
              publishedAt: input.publishedAt,
              viewCount: null,
              likeCount: null,
              commentCount: null,
              geo,
              countryCode: geo.countryCode || geminiCountry || strongCountry?.countryCode || "XX",
              countryName: geo.countryName || extraction.primary_location.country_name || strongCountry?.countryName || "Unknown",
              city: geminiHasCity ? extraction.primary_location.city || geo.city : null,
              region: extraction.primary_location.region || geo.region || null,
              label:
                extraction.primary_location.location_label ||
                (geminiHasCity
                  ? [extraction.primary_location.city, geo.countryName || extraction.primary_location.country_name].filter(Boolean).join(", ")
                  : geo.countryName || extraction.primary_location.country_name || geo.label),
              score: Number(score.toFixed(3)),
              verificationSource: "gemini",
              locationSource: "llm-assisted+nominatim",
              locationPrecision,
              evidence,
            }),
            extractionOutput: extraction,
          };
        }
      }
    } catch (error) {
      console.error("[video-location-engine:gemini]", error);
    }
  }

  const manualReasonCode = chooseManualReason({
    isTravel: true,
    candidates,
    hasStrongCountryOnly: Boolean(strongCountryOnly),
    geocodeConflict: false,
    weakTextOnly: geoEvidence.length > 0 && !input.playlistSignals.some((playlist) => playlist.classification !== "ambiguous"),
  });

  return {
    ...manualBase,
    locationStatus: "needs_manual",
    verificationSource: null,
    locationScore: Number((candidates[0]?.weight || travelSignals.score || 0).toFixed(3)),
    locationEvidence: {
      stage: "manual_queue",
      top_candidates: candidates.slice(0, 5).map((candidate) => ({
        place_type: candidate.placeType,
        country_code: candidate.countryCode,
        country_name: candidate.countryName,
        city: candidate.city,
        weight: Number(candidate.weight.toFixed(3)),
        ambiguous: candidate.ambiguous,
      })),
      geo_hints: serializeEvidence(geoEvidence),
      playlist_signals: serializedSignals,
    },
    needsManualReason: manualReasonMessage(manualReasonCode),
    locationPrecision: "unresolved",
    primaryLocation: null,
  };
}

export async function persistVideoAnalysis(input: PersistVideoAnalysisInput) {
  const now = new Date().toISOString();
  const primaryLocation = input.analysis.primaryLocation
    ? {
        ...input.analysis.primaryLocation,
        thumbnail_url: input.thumbnailUrl,
        published_at: input.publishedAt,
        view_count: input.viewCount,
        like_count: input.likeCount,
        comment_count: input.commentCount,
      }
    : null;

  await sql`
    delete from public.video_locations
    where video_id = ${input.videoRecordId}
      and is_primary = true
  `;

  if (primaryLocation) {
    await sql`
      insert into public.video_locations (
        id,
        channel_id,
        video_id,
        is_primary,
        country_code,
        country_name,
        location_label,
        city,
        region,
        lat,
        lng,
        confidence_score,
        location_score,
        verification_source,
        location_evidence,
        needs_manual_reason,
        location_precision,
        source,
        raw_payload
      )
      values (
        ${randomUUID()},
        ${input.channelId},
        ${input.videoRecordId},
        true,
        ${primaryLocation.country_code},
        ${primaryLocation.country_name || null},
        ${primaryLocation.location_label || null},
        ${primaryLocation.city || null},
        ${primaryLocation.region || null},
        ${primaryLocation.lat},
        ${primaryLocation.lng},
        ${primaryLocation.confidence_score || null},
        ${primaryLocation.location_score || primaryLocation.confidence_score || null},
        ${input.analysis.verificationSource},
        ${JSON.stringify(input.analysis.locationEvidence || {})}::jsonb,
        ${input.analysis.needsManualReason || null},
        ${input.analysis.locationPrecision},
        ${primaryLocation.location_source || "engine"},
        ${JSON.stringify(primaryLocation.location_evidence || {})}::jsonb
      )
    `;
  }

  await sql`
    update public.videos
    set
      is_travel = ${input.analysis.isTravel},
      travel_score = ${input.analysis.travelScore},
      travel_signals = ${JSON.stringify(input.analysis.travelSignals)}::jsonb,
      inclusion_reason = ${input.analysis.inclusionReason},
      exclusion_reason = ${input.analysis.exclusionReason},
      recording_lat = ${input.recordingLat},
      recording_lng = ${input.recordingLng},
      recording_location_description = ${input.recordingLocationDescription},
      travel_type = ${primaryLocation?.travel_type || null},
      location_status = ${input.analysis.locationStatus},
      verification_source = ${input.analysis.verificationSource},
      location_score = ${input.analysis.locationScore},
      location_evidence = ${JSON.stringify(input.analysis.locationEvidence || {})}::jsonb,
      playlist_signals = ${JSON.stringify(input.analysis.playlistSignals || [])}::jsonb,
      geo_hints = ${JSON.stringify(input.analysis.geoHints || [])}::jsonb,
      location_precision = ${input.analysis.locationPrecision},
      needs_manual_reason = ${input.analysis.needsManualReason},
      last_location_checked_at = ${now},
      updated_at = ${now}
    where id = ${input.videoRecordId}
  `;

  return primaryLocation;
}

export async function confirmManualLocationWithPrecision(input: {
  channelId: string;
  videoId: string;
  countryCode: string;
  city?: string | null;
}) {
  const videoRows = await sql<
    Array<{
      id: string;
      youtube_video_id: string;
      title: string;
      description: string | null;
      thumbnail_url: string | null;
      published_at: string | null;
      view_count: number | string | null;
      like_count: number | string | null;
      comment_count: number | string | null;
      travel_signals: string[] | null;
      playlist_signals: Array<Record<string, unknown>> | null;
      geo_hints: Array<Record<string, unknown>> | null;
    }>
  >`
    select
      id,
      youtube_video_id,
      title,
      description,
      thumbnail_url,
      published_at,
      view_count,
      like_count,
      comment_count,
      travel_signals,
      playlist_signals,
      geo_hints
    from public.videos
    where id = ${input.videoId}
      and channel_id = ${input.channelId}
    limit 1
  `;
  const videoRow = videoRows[0];
  if (!videoRow) throw new Error("Video no encontrado.");

  const normalizedCountry = String(input.countryCode || "").trim().toUpperCase();
  const country = getCountryCatalogEntry(normalizedCountry);
  const geoQuery = [input.city?.trim(), country?.countryName || normalizedCountry].filter(Boolean).join(", ");
  const geo = await getCachedGeocode(geoQuery);
  if (!geo) {
    throw new Error("No se pudo geocodificar la ubicacion manual.");
  }

  const locationPrecision: LocationPrecision = input.city?.trim() ? "city" : "country";
  const score = input.city?.trim() ? 0.98 : 0.9;
  const location = buildLocation({
    youtubeVideoId: videoRow.youtube_video_id,
    title: videoRow.title,
    description: videoRow.description,
    thumbnailUrl: videoRow.thumbnail_url,
    publishedAt: videoRow.published_at,
    viewCount: Number(videoRow.view_count || 0),
    likeCount: Number(videoRow.like_count || 0) || null,
    commentCount: Number(videoRow.comment_count || 0) || null,
    geo,
    countryCode: geo.countryCode || normalizedCountry,
    countryName: geo.countryName || country?.countryName || normalizedCountry,
    city: input.city?.trim() || null,
    region: geo.region || null,
    label: input.city?.trim() ? `${input.city.trim()}, ${geo.countryName || normalizedCountry}` : geo.countryName || normalizedCountry,
    score,
    verificationSource: "manual",
    locationSource: input.city?.trim() ? "manual+nominatim" : "manual_country_only+nominatim",
    locationPrecision,
    evidence: {
      manual: {
        country_code: normalizedCountry,
        city: input.city?.trim() || null,
      },
      geocode: geo.raw,
      geo_hints: videoRow.geo_hints || [],
      playlist_signals: videoRow.playlist_signals || [],
    },
  });
  const manualLocation: TravelVideoLocation = {
    ...location,
    location_status: "verified_manual",
    verification_source: "manual",
  };

  await sql`
    delete from public.video_locations
    where video_id = ${input.videoId}
      and is_primary = true
  `;

  await sql`
    insert into public.video_locations (
      id,
      channel_id,
      video_id,
      is_primary,
      country_code,
      country_name,
      location_label,
      city,
      region,
      lat,
      lng,
      confidence_score,
      location_score,
      verification_source,
      location_evidence,
      needs_manual_reason,
      location_precision,
      source,
      raw_payload
    )
    values (
      ${randomUUID()},
      ${input.channelId},
      ${input.videoId},
      true,
      ${manualLocation.country_code},
      ${manualLocation.country_name || null},
      ${manualLocation.location_label || null},
      ${manualLocation.city || null},
      ${manualLocation.region || null},
      ${manualLocation.lat},
      ${manualLocation.lng},
      ${manualLocation.confidence_score || null},
      ${manualLocation.location_score || manualLocation.confidence_score || null},
      'manual',
      ${JSON.stringify(manualLocation.location_evidence || {})}::jsonb,
      null,
      ${locationPrecision},
      ${manualLocation.location_source || "manual"},
      ${JSON.stringify(manualLocation.location_evidence || {})}::jsonb
    )
  `;

  const now = new Date().toISOString();
  await sql`
    update public.videos
    set
      location_status = 'verified_manual',
      verification_source = 'manual',
      location_score = ${score},
      location_evidence = ${JSON.stringify(manualLocation.location_evidence || {})}::jsonb,
      location_precision = ${locationPrecision},
      needs_manual_reason = null,
      last_location_checked_at = ${now},
      updated_at = ${now}
    where id = ${input.videoId}
  `;

  return manualLocation;
}
