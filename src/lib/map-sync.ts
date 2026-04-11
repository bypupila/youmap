import { randomUUID } from "crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeCoordinates, geocodeLocation } from "@/lib/geocode";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import { LOCATION_PROMPT } from "@/lib/youtube-location-prompt";
import { loadTravelPlaylistVideoIds, loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";
import type { ManualVerificationItem } from "@/lib/map-data";
import type { TravelVideoLocation } from "@/lib/types";

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

const COUNTRY_HINTS: Record<string, string[]> = {
  MX: ["mexico", "mexico df", "cdmx", "ciudad de mexico", "mexicano"],
  US: ["usa", "united states", "estados unidos", "eeuu", "new york", "los angeles", "las vegas", "miami"],
  JP: ["japan", "japon", "tokyo", "kyoto", "osaka"],
  ES: ["spain", "espana", "madrid", "barcelona", "sevilla", "valencia"],
  FR: ["france", "francia", "paris"],
  IT: ["italy", "italia", "rome", "roma", "milan", "venice", "venecia"],
  BR: ["brazil", "brasil", "rio de janeiro", "sao paulo"],
  AR: ["argentina", "buenos aires", "mendoza", "patagonia"],
  CL: ["chile", "santiago", "valparaiso"],
  CO: ["colombia", "bogota", "medellin", "cartagena"],
  PE: ["peru", "lima", "cusco", "machu picchu"],
  GB: ["uk", "united kingdom", "reino unido", "london", "inglaterra"],
  DE: ["germany", "alemania", "berlin", "munich"],
  IN: ["india", "nueva delhi", "mumbai", "delhi"],
  TH: ["thailand", "tailandia", "bangkok", "phuket"],
  KR: ["korea", "corea", "seoul"],
  CN: ["china", "beijing", "shanghai"],
  EG: ["egypt", "egipto", "cairo"],
  MA: ["morocco", "marruecos", "marrakesh", "casablanca"],
  ZA: ["south africa", "sudafrica", "cape town"],
  AU: ["australia", "sydney", "melbourne"],
  NZ: ["new zealand", "nueva zelanda", "auckland", "queenstown"],
  TR: ["turkey", "turquia", "istanbul"],
  PT: ["portugal", "lisbon", "lisboa", "porto"],
  SA: ["saudi", "arabia saudita", "riyadh", "jeddah"],
  SG: ["singapore", "singapur"],
  VN: ["vietnam", "hanoi", "ho chi minh"],
  ID: ["indonesia", "bali", "jakarta"],
  CA: ["canada", "toronto", "montreal", "vancouver"],
  IS: ["iceland", "islandia", "reykjavik"],
};

const TRAVEL_KEYWORDS = [
  "travel",
  "trip",
  "viaje",
  "viajes",
  "turismo",
  "adventure",
  "aventura",
  "vacaciones",
  "vacation",
  "world tour",
  "road trip",
  "backpacking",
  "nomad",
  "hotel",
  "hostel",
  "aeropuerto",
  "airport",
  "flight",
  "vuelo",
  "pais",
  "country",
  "ciudad",
  "city",
  "capital",
  "playa",
  "beach",
  "island",
  "isla",
  "mountain",
  "montana",
];

function collectTravelSignals(input: {
  title: string;
  description: string | null;
  hasRecordingLocation: boolean;
  inTravelPlaylist: boolean;
  heuristicHit: boolean;
}) {
  const signals: string[] = [];
  if (input.hasRecordingLocation) signals.push("youtube_recording_details");
  if (input.inTravelPlaylist) signals.push("travel_playlist_match");
  if (input.heuristicHit) signals.push("geo_keyword_or_flag");

  const merged = normalize(`${input.title} ${input.description || ""}`);
  const matchedKeywords = TRAVEL_KEYWORDS.filter((keyword) => merged.includes(normalize(keyword))).slice(0, 5);
  if (matchedKeywords.length > 0) {
    signals.push(`travel_keywords:${matchedKeywords.join(",")}`);
  }

  let score = 0;
  if (input.hasRecordingLocation) score += 0.6;
  if (input.inTravelPlaylist) score += 0.45;
  if (input.heuristicHit) score += 0.3;
  if (matchedKeywords.length > 0) score += 0.18;
  score = Math.min(1, score);

  const isTravel =
    input.hasRecordingLocation ||
    input.inTravelPlaylist ||
    input.heuristicHit ||
    matchedKeywords.length > 0;

  return {
    isTravel,
    score,
    signals,
    inclusionReason: isTravel
      ? input.hasRecordingLocation
        ? "youtube_geolocation"
        : input.inTravelPlaylist
          ? "travel_playlist"
          : input.heuristicHit
            ? "geo_heuristic"
            : "travel_keyword"
      : null,
    exclusionReason: isTravel ? null : "No travel evidence (playlist/location/text).",
  };
}

function normalize(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function flagToCountryCode(text: string): string | null {
  const codepoints = Array.from(text).map((char) => char.codePointAt(0) || 0);
  const base = 0x1f1e6;
  for (let index = 0; index < codepoints.length - 1; index += 1) {
    const first = codepoints[index];
    const second = codepoints[index + 1];
    if (first < base || first > base + 25) continue;
    if (second < base || second > base + 25) continue;
    return `${String.fromCharCode(first - base + 65)}${String.fromCharCode(second - base + 65)}`;
  }
  return null;
}

function runHeuristicLocation(title: string, description: string | null) {
  const merged = `${title} ${(description || "").slice(0, 2500)}`;
  const normalized = normalize(merged);
  const fromFlag = flagToCountryCode(merged);

  if (fromFlag) {
    return {
      query: fromFlag,
      countryCode: fromFlag,
      locationSource: "heuristic",
      score: 0.9,
      evidence: { type: "flag_emoji", country_code: fromFlag },
    };
  }

  for (const [countryCode, hints] of Object.entries(COUNTRY_HINTS)) {
    for (const hint of hints) {
      const token = normalize(hint);
      if (!token) continue;
      if (!normalized.includes(token)) continue;
      const isCityHint = hint.includes(" ");
      return {
        query: hint,
        countryCode,
        locationSource: "heuristic",
        score: isCityHint ? 0.82 : 0.68,
        evidence: { type: "keyword", keyword: hint, country_code: countryCode },
      };
    }
  }

  return null;
}

function createGeoQuery(primaryLocation: z.infer<typeof locationSchema>) {
  return [primaryLocation.location_label, primaryLocation.city, primaryLocation.region, primaryLocation.country_name]
    .filter(Boolean)
    .join(", ");
}

async function extractLocationWithGemini(input: {
  channelName: string;
  channelDescription: string | null;
  title: string;
  description: string | null;
  publishedAt: string | null;
}) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: `${LOCATION_PROMPT}

Channel: ${input.channelName}
Channel description: ${input.channelDescription || "No description"}
Video title: ${input.title}
Video description: ${(input.description || "").slice(0, 5000)}
Published at: ${input.publishedAt || "unknown"}

Return the location data only. If there are several places, focus on the main filming destination.`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: geminiJsonSchema,
    },
  });

  return extractionSchema.parse(JSON.parse(response.text || "{}"));
}

async function upsertPrimaryLocation(service: SupabaseClient, input: {
  channelId: string;
  videoId: string;
  location: TravelVideoLocation;
  verificationSource: "heuristic" | "nominatim" | "gemini" | "manual" | "youtube_recording_details";
  locationEvidence: Record<string, unknown>;
  locationSource: string;
  needsManualReason?: string | null;
}) {
  await service.from("video_locations").delete().eq("video_id", input.videoId).eq("is_primary", true);
  await service.from("video_locations").insert({
    id: randomUUID(),
    channel_id: input.channelId,
    video_id: input.videoId,
    is_primary: true,
    country_code: input.location.country_code,
    country_name: input.location.country_name,
    location_label: input.location.location_label,
    city: input.location.city || null,
    region: input.location.region || null,
    lat: input.location.lat,
    lng: input.location.lng,
    confidence_score: input.location.confidence_score,
    location_score: input.location.location_score || input.location.confidence_score || null,
    travel_type: input.location.travel_type || null,
    source: input.locationSource,
    verification_source: input.verificationSource,
    location_evidence: input.locationEvidence,
    needs_manual_reason: input.needsManualReason || null,
    raw_payload: input.location.location_evidence || {},
  });
}

function buildVideoLocation(input: {
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  countryCode: string;
  countryName: string | null;
  city: string | null;
  region: string | null;
  label: string;
  lat: number;
  lng: number;
  travelType?: string | null;
  score: number;
  verificationSource: "heuristic" | "nominatim" | "gemini" | "manual" | "youtube_recording_details";
  locationSource: string;
  evidence: Record<string, unknown>;
}): TravelVideoLocation {
  return {
    youtube_video_id: input.videoId,
    video_url: `https://youtube.com/watch?v=${input.videoId}`,
    title: input.title,
    description: input.description,
    thumbnail_url: input.thumbnailUrl,
    published_at: input.publishedAt,
    view_count: input.viewCount,
    like_count: input.likeCount,
    comment_count: input.commentCount,
    travel_type: input.travelType || null,
    country_code: input.countryCode,
    country_name: input.countryName || input.countryCode,
    location_label: input.label,
    city: input.city,
    region: input.region,
    lat: input.lat,
    lng: input.lng,
    confidence_score: input.score,
    location_status: "verified_auto",
    verification_source: input.verificationSource,
    location_score: input.score,
    location_source: input.locationSource,
    location_evidence: input.evidence,
    needs_manual_reason: null,
  };
}

async function getManualQueue(service: SupabaseClient, channelId: string): Promise<ManualVerificationItem[]> {
  const { data } = await service
    .from("videos")
    .select("id,youtube_video_id,title,thumbnail_url,published_at,needs_manual_reason")
    .eq("channel_id", channelId)
    .eq("location_status", "needs_manual")
    .order("published_at", { ascending: false })
    .limit(250);

  return ((data || []) as Array<{
    id: string;
    youtube_video_id: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
    needs_manual_reason: string | null;
  }>).map((row) => ({
    video_id: row.id,
    youtube_video_id: row.youtube_video_id,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    published_at: row.published_at,
    country_code: null,
    city: null,
    needs_manual_reason: row.needs_manual_reason || "No se pudo verificar automaticamente.",
  }));
}

export interface MapSyncSummary {
  runId: string;
  videos_scanned: number;
  videos_extracted: number;
  videos_verified_auto: number;
  videos_needs_manual: number;
  videos_verified_manual: number;
  excluded_shorts: number;
  excluded_non_travel: number;
  manualQueue: ManualVerificationItem[];
}

export async function syncChannelIncremental(input: {
  channelId: string;
  service: SupabaseClient;
}): Promise<MapSyncSummary> {
  const now = new Date().toISOString();
  const runId = randomUUID();

  await input.service.from("map_sync_runs").insert({
    id: runId,
    channel_id: input.channelId,
    status: "running",
    source: "manual_refresh",
    started_at: now,
    input: {},
    output: {},
  });

  try {
    const { data: channelRow, error: channelError } = await input.service
      .from("channels")
      .select("id,channel_name,channel_handle,youtube_channel_id,description")
      .eq("id", input.channelId)
      .single();

    if (channelError || !channelRow) {
      throw new Error(channelError?.message || "Canal no encontrado.");
    }

    const channelReference = channelRow.youtube_channel_id || channelRow.channel_handle;
    if (!channelReference) {
      throw new Error("El canal no tiene youtube_channel_id ni channel_handle para sincronizar.");
    }

    const source = await resolveYouTubeChannel(channelReference);
    const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
    const youtubeIds = playlistVideos.map((row) => row.contentDetails?.videoId).filter(Boolean) as string[];
    const videoDetailsMap = youtubeIds.length ? await loadVideoDetails(youtubeIds) : new Map();
    const travelPlaylistVideoIds = source.youtube_channel_id ? await loadTravelPlaylistVideoIds(source.youtube_channel_id) : new Set<string>();
    const nonShortVideoIds = youtubeIds.filter((youtubeVideoId) => !videoDetailsMap.get(youtubeVideoId)?.is_short);
    const excludedShorts = youtubeIds.length - nonShortVideoIds.length;

    const existingVideosResult = nonShortVideoIds.length
      ? await input.service
          .from("videos")
          .select("youtube_video_id")
          .eq("channel_id", input.channelId)
          .in("youtube_video_id", nonShortVideoIds)
      : { data: [], error: null };
    if (existingVideosResult.error) {
      throw new Error(existingVideosResult.error.message);
    }
    const existingVideos = existingVideosResult.data || [];

    const existingIdSet = new Set(((existingVideos || []) as Array<{ youtube_video_id: string }>).map((row) => row.youtube_video_id));
    const newVideoIds = nonShortVideoIds.filter((youtubeVideoId) => !existingIdSet.has(youtubeVideoId));

    let verifiedAuto = 0;
    let needsManual = 0;
    let excludedNonTravel = 0;

    for (const youtubeVideoId of newVideoIds) {
      const details = videoDetailsMap.get(youtubeVideoId);
      const title = details?.title || "Untitled video";
      const description = details?.description || null;
      const thumbnailUrl = details?.thumbnail_url || null;
      const publishedAt = details?.published_at || null;
      const viewCount = details?.view_count ?? 0;
      const likeCount = details?.like_count ?? null;
      const commentCount = details?.comment_count ?? null;
      const durationSeconds = details?.duration_seconds ?? null;
      const recordingLat = details?.recording_lat ?? null;
      const recordingLng = details?.recording_lng ?? null;
      const recordingLocationDescription = details?.recording_location_description ?? null;
      const currentTs = new Date().toISOString();
      const heuristic = runHeuristicLocation(title, description);
      const travelSignals = collectTravelSignals({
        title,
        description,
        hasRecordingLocation:
          typeof recordingLat === "number" &&
          Number.isFinite(recordingLat) &&
          typeof recordingLng === "number" &&
          Number.isFinite(recordingLng),
        inTravelPlaylist: travelPlaylistVideoIds.has(youtubeVideoId),
        heuristicHit: Boolean(heuristic),
      });
      const isTravel = travelSignals.isTravel;

      const { data: insertedVideo, error: insertError } = await input.service
        .from("videos")
        .upsert(
          {
            channel_id: input.channelId,
            youtube_video_id: youtubeVideoId,
            title,
            description,
            thumbnail_url: thumbnailUrl,
            published_at: publishedAt,
            view_count: viewCount ?? 0,
            like_count: likeCount,
            comment_count: commentCount,
            duration_seconds: durationSeconds,
            is_short: false,
            is_travel: isTravel,
            travel_score: travelSignals.score,
            travel_signals: travelSignals.signals,
            inclusion_reason: travelSignals.inclusionReason,
            exclusion_reason: travelSignals.exclusionReason,
            recording_lat: recordingLat,
            recording_lng: recordingLng,
            recording_location_description: recordingLocationDescription,
            location_status: "processing",
            verification_source: null,
            location_score: null,
            location_evidence: {},
            needs_manual_reason: isTravel ? null : "Video sin señales claras de viaje.",
            last_location_checked_at: null,
            source_payload: {
              video_details: details?.raw || null,
            },
            updated_at: currentTs,
          },
          { onConflict: "channel_id,youtube_video_id" }
        )
        .select("id")
        .single();

      if (insertError || !insertedVideo?.id) {
        throw new Error(insertError?.message || `No se pudo guardar el video ${youtubeVideoId}.`);
      }

      const videoId = insertedVideo.id as string;
      if (!isTravel) {
        excludedNonTravel += 1;
        await input.service
          .from("videos")
          .update({
            location_status: "no_location",
            verification_source: "heuristic",
            location_score: travelSignals.score,
            location_evidence: {
              stage: "travel_filter",
              travel_signals: travelSignals.signals,
            },
            needs_manual_reason: "Video filtrado: no se detecto evidencia suficiente de viaje.",
            last_location_checked_at: currentTs,
            updated_at: currentTs,
          })
          .eq("id", videoId);
        continue;
      }

      if (
        typeof recordingLat === "number" &&
        Number.isFinite(recordingLat) &&
        typeof recordingLng === "number" &&
        Number.isFinite(recordingLng)
      ) {
        const reverseGeo = await geocodeCoordinates(recordingLat, recordingLng);
        const score = 0.98;
        const location = buildVideoLocation({
          videoId: youtubeVideoId,
          title,
          description,
          thumbnailUrl,
          publishedAt,
          viewCount,
          likeCount,
          commentCount,
          countryCode: reverseGeo?.countryCode || heuristic?.countryCode || "XX",
          countryName: reverseGeo?.countryName || heuristic?.countryCode || "Unknown",
          city: reverseGeo?.city || null,
          region: reverseGeo?.region || null,
          label: recordingLocationDescription || reverseGeo?.label || `${recordingLat.toFixed(4)},${recordingLng.toFixed(4)}`,
          lat: recordingLat,
          lng: recordingLng,
          score,
          verificationSource: "youtube_recording_details",
          locationSource: "youtube_recording_details",
          evidence: {
            source: "youtube_recording_details",
            recording_lat: recordingLat,
            recording_lng: recordingLng,
            recording_location_description: recordingLocationDescription,
            reverse_geocode: reverseGeo?.raw || null,
          },
        });

        await upsertPrimaryLocation(input.service, {
          channelId: input.channelId,
          videoId,
          location,
          verificationSource: "youtube_recording_details",
          locationSource: "youtube_recording_details",
          locationEvidence: {
            source: "youtube_recording_details",
            recording_lat: recordingLat,
            recording_lng: recordingLng,
            recording_location_description: recordingLocationDescription,
            reverse_geocode: reverseGeo?.raw || null,
          },
        });

        await input.service
          .from("videos")
          .update({
            location_status: "verified_auto",
            verification_source: "youtube_recording_details",
            location_score: score,
            location_evidence: {
              source: "youtube_recording_details",
              recording_lat: recordingLat,
              recording_lng: recordingLng,
              recording_location_description: recordingLocationDescription,
              reverse_geocode: reverseGeo?.raw || null,
            },
            needs_manual_reason: null,
            last_location_checked_at: currentTs,
            updated_at: currentTs,
          })
          .eq("id", videoId);

        verifiedAuto += 1;
        continue;
      }

      if (heuristic) {
        const geo = await geocodeLocation(heuristic.query);
        if (geo && heuristic.score >= 0.75) {
          const location = buildVideoLocation({
            videoId: youtubeVideoId,
            title,
            description,
            thumbnailUrl,
            publishedAt,
            viewCount,
            likeCount,
            commentCount,
            countryCode: geo.countryCode || heuristic.countryCode || "XX",
            countryName: geo.countryName || heuristic.countryCode || "Unknown",
            city: geo.city,
            region: geo.region,
            label: geo.label,
            lat: geo.lat,
            lng: geo.lng,
            score: heuristic.score,
            verificationSource: "heuristic",
            locationSource: "heuristic+nominatim",
            evidence: heuristic.evidence,
          });

          await upsertPrimaryLocation(input.service, {
            channelId: input.channelId,
            videoId,
            location,
            verificationSource: "heuristic",
            locationSource: "heuristic+nominatim",
            locationEvidence: heuristic.evidence,
          });

          await input.service
            .from("videos")
            .update({
              location_status: "verified_auto",
              verification_source: "heuristic",
              location_score: heuristic.score,
              location_evidence: {
                ...heuristic.evidence,
                travel_signals: travelSignals.signals,
              },
              needs_manual_reason: null,
              last_location_checked_at: currentTs,
              updated_at: currentTs,
            })
            .eq("id", videoId);

          verifiedAuto += 1;
          continue;
        }
      }

      let resolvedWithGemini = false;
      try {
        const extraction = await extractLocationWithGemini({
          channelName: channelRow.channel_name || source.channel_name,
          channelDescription: channelRow.description || source.description || null,
          title,
          description,
          publishedAt,
        });

        if (extraction.has_location && extraction.primary_location) {
          const geo = await geocodeLocation(createGeoQuery(extraction.primary_location));
          const score = Number(extraction.primary_location.confidence || 0.55);
          if (geo && score >= 0.55) {
            const location = buildVideoLocation({
              videoId: youtubeVideoId,
              title,
              description,
              thumbnailUrl,
              publishedAt,
              viewCount,
              likeCount,
              commentCount,
              countryCode: geo.countryCode || extraction.primary_location.country_code || "XX",
              countryName: geo.countryName || extraction.primary_location.country_name || "Unknown",
              city: extraction.primary_location.city || geo.city,
              region: extraction.primary_location.region || geo.region,
              label: extraction.primary_location.location_label || geo.label,
              lat: geo.lat,
              lng: geo.lng,
              travelType: extraction.primary_location.travel_type || null,
              score,
              verificationSource: "gemini",
              locationSource: "gemini+nominatim",
              evidence: { gemini: extraction },
            });

            await upsertPrimaryLocation(input.service, {
              channelId: input.channelId,
              videoId,
              location,
              verificationSource: "gemini",
              locationSource: "gemini+nominatim",
              locationEvidence: { gemini: extraction, geocode: geo.raw },
            });

            await input.service
              .from("videos")
              .update({
                location_status: "verified_auto",
                verification_source: "gemini",
                location_score: score,
                location_evidence: { gemini: extraction, geocode: geo.raw, travel_signals: travelSignals.signals },
                needs_manual_reason: null,
                last_location_checked_at: currentTs,
                updated_at: currentTs,
              })
              .eq("id", videoId);

            resolvedWithGemini = true;
            verifiedAuto += 1;
          }
        }
      } catch (error) {
        console.error("[map-sync] gemini error", error);
      }

      if (!resolvedWithGemini) {
        needsManual += 1;
        await input.service
          .from("videos")
          .update({
            location_status: "needs_manual",
            verification_source: null,
            location_score: 0.0,
            needs_manual_reason: "Ambiguo o sin evidencia suficiente tras verificacion automatica.",
            location_evidence: { stage: "manual_queue", travel_signals: travelSignals.signals },
            last_location_checked_at: currentTs,
            updated_at: currentTs,
          })
          .eq("id", videoId);
      }
    }

    const manualQueue = await getManualQueue(input.service, input.channelId);
    const finishedAt = new Date().toISOString();

    await input.service
      .from("channels")
      .update({
        last_synced_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq("id", input.channelId);

    await input.service
      .from("map_sync_runs")
      .update({
        status: "completed",
        videos_scanned: nonShortVideoIds.length,
        videos_extracted: newVideoIds.length,
        videos_verified_auto: verifiedAuto,
        videos_needs_manual: needsManual,
        videos_verified_manual: 0,
        output: {
          videos_scanned: nonShortVideoIds.length,
          videos_extracted: newVideoIds.length,
          videos_verified_auto: verifiedAuto,
          videos_needs_manual: needsManual,
          excluded_shorts: excludedShorts,
          excluded_non_travel: excludedNonTravel,
          manual_queue: manualQueue.length,
        },
        finished_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq("id", runId);

    return {
      runId,
      videos_scanned: nonShortVideoIds.length,
      videos_extracted: newVideoIds.length,
      videos_verified_auto: verifiedAuto,
      videos_needs_manual: needsManual,
      videos_verified_manual: 0,
      excluded_shorts: excludedShorts,
      excluded_non_travel: excludedNonTravel,
      manualQueue,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await input.service
      .from("map_sync_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Sync failed",
        finished_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq("id", runId);
    throw error;
  }
}

export async function fetchMapSyncRun(service: SupabaseClient, runId: string) {
  const { data, error } = await service
    .from("map_sync_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function confirmManualLocation(input: {
  service: SupabaseClient;
  channelId: string;
  videoId: string;
  countryCode: string;
  city: string;
}): Promise<TravelVideoLocation> {
  const { data: videoRow, error: videoError } = await input.service
    .from("videos")
    .select("id,youtube_video_id,title,description,thumbnail_url,published_at,view_count,like_count,comment_count")
    .eq("id", input.videoId)
    .eq("channel_id", input.channelId)
    .single();

  if (videoError || !videoRow) {
    throw new Error(videoError?.message || "Video no encontrado.");
  }

  const geoQuery = [input.city, input.countryCode].filter(Boolean).join(", ");
  const geo = await geocodeLocation(geoQuery);
  if (!geo) {
    throw new Error("No se pudo geocodificar la ubicacion manual.");
  }

  const score = 0.98;
  const location = buildVideoLocation({
    videoId: videoRow.youtube_video_id,
    title: videoRow.title,
    description: videoRow.description,
    thumbnailUrl: videoRow.thumbnail_url,
    publishedAt: videoRow.published_at,
    viewCount: Number(videoRow.view_count || 0),
    likeCount: Number(videoRow.like_count || 0) || null,
    commentCount: Number(videoRow.comment_count || 0) || null,
    countryCode: geo.countryCode || input.countryCode.toUpperCase(),
    countryName: geo.countryName || input.countryCode.toUpperCase(),
    city: input.city || geo.city,
    region: geo.region,
    label: `${input.city}, ${geo.countryName || input.countryCode.toUpperCase()}`,
    lat: geo.lat,
    lng: geo.lng,
    score,
    verificationSource: "manual",
    locationSource: "manual+nominatim",
    evidence: {
      manual: {
        city: input.city,
        country_code: input.countryCode.toUpperCase(),
      },
      geocode: geo.raw,
    },
  });

  await upsertPrimaryLocation(input.service, {
    channelId: input.channelId,
    videoId: videoRow.id,
    location,
    verificationSource: "manual",
    locationSource: "manual+nominatim",
    locationEvidence: location.location_evidence || {},
  });

  const now = new Date().toISOString();
  await input.service
    .from("videos")
    .update({
      location_status: "verified_manual",
      verification_source: "manual",
      location_score: score,
      needs_manual_reason: null,
      location_evidence: location.location_evidence || {},
      last_location_checked_at: now,
      updated_at: now,
    })
    .eq("id", input.videoId);

  return location;
}
