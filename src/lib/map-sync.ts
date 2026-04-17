import { randomUUID } from "crypto";
import { z } from "zod";
import { geocodeCoordinates, geocodeLocation } from "@/lib/geocode";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import { LOCATION_PROMPT } from "@/lib/youtube-location-prompt";
import { loadTravelPlaylistVideoIds, loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";
import type { ManualVerificationItem } from "@/lib/map-data";
import type { TravelVideoLocation } from "@/lib/types";
import { sql } from "@/lib/neon";

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

async function upsertPrimaryLocation(input: {
  channelId: string;
  videoId: string;
  location: TravelVideoLocation;
  verificationSource: "heuristic" | "nominatim" | "gemini" | "manual" | "youtube_recording_details";
  locationEvidence: Record<string, unknown>;
  locationSource: string;
  needsManualReason?: string | null;
}) {
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
      travel_type,
      source,
      verification_source,
      location_evidence,
      needs_manual_reason,
      raw_payload
    )
    values (
      ${randomUUID()},
      ${input.channelId},
      ${input.videoId},
      true,
      ${input.location.country_code},
      ${input.location.country_name || null},
      ${input.location.location_label || null},
      ${input.location.city || null},
      ${input.location.region || null},
      ${input.location.lat},
      ${input.location.lng},
      ${input.location.confidence_score || null},
      ${input.location.location_score || input.location.confidence_score || null},
      ${input.location.travel_type || null},
      ${input.locationSource},
      ${input.verificationSource},
      ${JSON.stringify(input.locationEvidence || {})}::jsonb,
      ${input.needsManualReason || null},
      ${JSON.stringify(input.location.location_evidence || {})}::jsonb
    )
  `;
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

async function getManualQueue(channelId: string): Promise<ManualVerificationItem[]> {
  const data = await sql<Array<{
    id: string;
    youtube_video_id: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
    needs_manual_reason: string | null;
  }>>`
    select id, youtube_video_id, title, thumbnail_url, published_at, needs_manual_reason
    from public.videos
    where channel_id = ${channelId}
      and location_status = 'needs_manual'
    order by published_at desc
    limit 250
  `;

  return data.map((row) => ({
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
}): Promise<MapSyncSummary> {
  const now = new Date().toISOString();
  const runId = randomUUID();

  await sql`
    insert into public.map_sync_runs (id, channel_id, status, source, started_at, input, output)
    values (
      ${runId},
      ${input.channelId},
      'running',
      'manual_refresh',
      ${now},
      '{}'::jsonb,
      '{}'::jsonb
    )
  `;

  try {
    const channelRows = await sql<
      Array<{
        id: string;
        channel_name: string;
        channel_handle: string | null;
        youtube_channel_id: string | null;
        description: string | null;
      }>
    >`
      select id, channel_name, channel_handle, youtube_channel_id, description
      from public.channels
      where id = ${input.channelId}
      limit 1
    `;
    const channelRow = channelRows[0];
    if (!channelRow) throw new Error("Canal no encontrado.");

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

    const existingVideos = nonShortVideoIds.length
      ? await sql<Array<{ youtube_video_id: string }>>`
          select youtube_video_id
          from public.videos
          where channel_id = ${input.channelId}
            and youtube_video_id = any(${nonShortVideoIds})
        `
      : [];

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

      const insertedVideos = await sql<Array<{ id: string }>>`
        insert into public.videos (
          channel_id,
          youtube_video_id,
          title,
          description,
          thumbnail_url,
          published_at,
          view_count,
          like_count,
          comment_count,
          duration_seconds,
          is_short,
          is_travel,
          travel_score,
          travel_signals,
          inclusion_reason,
          exclusion_reason,
          recording_lat,
          recording_lng,
          recording_location_description,
          location_status,
          verification_source,
          location_score,
          location_evidence,
          needs_manual_reason,
          last_location_checked_at,
          source_payload,
          updated_at
        )
        values (
          ${input.channelId},
          ${youtubeVideoId},
          ${title},
          ${description},
          ${thumbnailUrl},
          ${publishedAt},
          ${viewCount ?? 0},
          ${likeCount},
          ${commentCount},
          ${durationSeconds},
          false,
          ${isTravel},
          ${travelSignals.score},
          ${JSON.stringify(travelSignals.signals)}::jsonb,
          ${travelSignals.inclusionReason},
          ${travelSignals.exclusionReason},
          ${recordingLat},
          ${recordingLng},
          ${recordingLocationDescription},
          'processing',
          null,
          null,
          '{}'::jsonb,
          ${isTravel ? null : "Video sin señales claras de viaje."},
          null,
          ${JSON.stringify({ video_details: details?.raw || null })}::jsonb,
          ${currentTs}
        )
        on conflict (channel_id, youtube_video_id)
        do update set
          title = excluded.title,
          description = excluded.description,
          thumbnail_url = excluded.thumbnail_url,
          published_at = excluded.published_at,
          view_count = excluded.view_count,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          duration_seconds = excluded.duration_seconds,
          is_short = excluded.is_short,
          is_travel = excluded.is_travel,
          travel_score = excluded.travel_score,
          travel_signals = excluded.travel_signals,
          inclusion_reason = excluded.inclusion_reason,
          exclusion_reason = excluded.exclusion_reason,
          recording_lat = excluded.recording_lat,
          recording_lng = excluded.recording_lng,
          recording_location_description = excluded.recording_location_description,
          location_status = excluded.location_status,
          verification_source = excluded.verification_source,
          location_score = excluded.location_score,
          location_evidence = excluded.location_evidence,
          needs_manual_reason = excluded.needs_manual_reason,
          last_location_checked_at = excluded.last_location_checked_at,
          source_payload = excluded.source_payload,
          updated_at = excluded.updated_at
        returning id
      `;
      const videoId = insertedVideos[0]?.id;
      if (!videoId) throw new Error(`No se pudo guardar el video ${youtubeVideoId}.`);
      if (!isTravel) {
        excludedNonTravel += 1;
        await sql`
          update public.videos
          set
            location_status = 'no_location',
            verification_source = 'heuristic',
            location_score = ${travelSignals.score},
            location_evidence = ${JSON.stringify({
              stage: "travel_filter",
              travel_signals: travelSignals.signals,
            })}::jsonb,
            needs_manual_reason = 'Video filtrado: no se detecto evidencia suficiente de viaje.',
            last_location_checked_at = ${currentTs},
            updated_at = ${currentTs}
          where id = ${videoId}
        `;
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

        await upsertPrimaryLocation({
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

        await sql`
          update public.videos
          set
            location_status = 'verified_auto',
            verification_source = 'youtube_recording_details',
            location_score = ${score},
            location_evidence = ${JSON.stringify({
              source: "youtube_recording_details",
              recording_lat: recordingLat,
              recording_lng: recordingLng,
              recording_location_description: recordingLocationDescription,
              reverse_geocode: reverseGeo?.raw || null,
            })}::jsonb,
            needs_manual_reason = null,
            last_location_checked_at = ${currentTs},
            updated_at = ${currentTs}
          where id = ${videoId}
        `;

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

          await upsertPrimaryLocation({
            channelId: input.channelId,
            videoId,
            location,
            verificationSource: "heuristic",
            locationSource: "heuristic+nominatim",
            locationEvidence: heuristic.evidence,
          });

          await sql`
            update public.videos
            set
              location_status = 'verified_auto',
              verification_source = 'heuristic',
              location_score = ${heuristic.score},
              location_evidence = ${JSON.stringify({
                ...heuristic.evidence,
                travel_signals: travelSignals.signals,
              })}::jsonb,
              needs_manual_reason = null,
              last_location_checked_at = ${currentTs},
              updated_at = ${currentTs}
            where id = ${videoId}
          `;

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

            await upsertPrimaryLocation({
              channelId: input.channelId,
              videoId,
              location,
              verificationSource: "gemini",
              locationSource: "gemini+nominatim",
              locationEvidence: { gemini: extraction, geocode: geo.raw },
            });

            await sql`
              update public.videos
              set
                location_status = 'verified_auto',
                verification_source = 'gemini',
                location_score = ${score},
                location_evidence = ${JSON.stringify({
                  gemini: extraction,
                  geocode: geo.raw,
                  travel_signals: travelSignals.signals,
                })}::jsonb,
                needs_manual_reason = null,
                last_location_checked_at = ${currentTs},
                updated_at = ${currentTs}
              where id = ${videoId}
            `;

            resolvedWithGemini = true;
            verifiedAuto += 1;
          }
        }
      } catch (error) {
        console.error("[map-sync] gemini error", error);
      }

      if (!resolvedWithGemini) {
        needsManual += 1;
        await sql`
          update public.videos
          set
            location_status = 'needs_manual',
            verification_source = null,
            location_score = 0.0,
            needs_manual_reason = 'Ambiguo o sin evidencia suficiente tras verificacion automatica.',
            location_evidence = ${JSON.stringify({
              stage: "manual_queue",
              travel_signals: travelSignals.signals,
            })}::jsonb,
            last_location_checked_at = ${currentTs},
            updated_at = ${currentTs}
          where id = ${videoId}
        `;
      }
    }

    const manualQueue = await getManualQueue(input.channelId);
    const finishedAt = new Date().toISOString();

    await sql`
      update public.channels
      set
        last_synced_at = ${finishedAt},
        updated_at = ${finishedAt}
      where id = ${input.channelId}
    `;

    await sql`
      update public.map_sync_runs
      set
        status = 'completed',
        videos_scanned = ${nonShortVideoIds.length},
        videos_extracted = ${newVideoIds.length},
        videos_verified_auto = ${verifiedAuto},
        videos_needs_manual = ${needsManual},
        videos_verified_manual = 0,
        output = ${JSON.stringify({
          videos_scanned: nonShortVideoIds.length,
          videos_extracted: newVideoIds.length,
          videos_verified_auto: verifiedAuto,
          videos_needs_manual: needsManual,
          excluded_shorts: excludedShorts,
          excluded_non_travel: excludedNonTravel,
          manual_queue: manualQueue.length,
        })}::jsonb,
        finished_at = ${finishedAt},
        updated_at = ${finishedAt}
      where id = ${runId}
    `;

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
    await sql`
      update public.map_sync_runs
      set
        status = 'failed',
        error_message = ${error instanceof Error ? error.message : "Sync failed"},
        finished_at = ${finishedAt},
        updated_at = ${finishedAt}
      where id = ${runId}
    `;
    throw error;
  }
}

export async function fetchMapSyncRun(runId: string) {
  const runs = await sql<Array<Record<string, unknown>>>`
    select *
    from public.map_sync_runs
    where id = ${runId}
    limit 1
  `;
  return runs[0] || null;
}

export async function confirmManualLocation(input: {
  channelId: string;
  videoId: string;
  countryCode: string;
  city: string;
}): Promise<TravelVideoLocation> {
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
    }>
  >`
    select id, youtube_video_id, title, description, thumbnail_url, published_at, view_count, like_count, comment_count
    from public.videos
    where id = ${input.videoId}
      and channel_id = ${input.channelId}
    limit 1
  `;
  const videoRow = videoRows[0];
  if (!videoRow) throw new Error("Video no encontrado.");

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

  await upsertPrimaryLocation({
    channelId: input.channelId,
    videoId: videoRow.id,
    location,
    verificationSource: "manual",
    locationSource: "manual+nominatim",
    locationEvidence: location.location_evidence || {},
  });

  const now = new Date().toISOString();
  await sql`
    update public.videos
    set
      location_status = 'verified_manual',
      verification_source = 'manual',
      location_score = ${score},
      needs_manual_reason = null,
      location_evidence = ${JSON.stringify(location.location_evidence || {})}::jsonb,
      last_location_checked_at = ${now},
      updated_at = ${now}
    where id = ${input.videoId}
  `;

  return location;
}
