import { randomUUID } from "crypto";
import { z } from "zod";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { geocodeLocation } from "@/lib/geocode";
import { getGeminiClient, getGeminiModel, hasGeminiApiKey } from "@/lib/gemini";
import { LOCATION_PROMPT } from "@/lib/youtube-location-prompt";
import { loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";
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

interface ImportYoutubeChannelInput {
  userId: string;
  channelUrl: string;
  importRunId?: string;
}

export interface ImportYoutubeChannelResult {
  import_run_id: string;
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  importedVideos: number;
  mappedVideos: number;
  skippedVideos: number;
  preview_session_id?: string;
  preview_mode?: boolean;
  channelSource: {
    youtube_channel_id: string;
    channel_name: string;
    channel_handle: string | null;
    uploads_playlist_id: string;
  };
}

async function upsertExtractionRun(input: {
  channelId: string;
  videoId: string;
  status: string;
  promptVersion: string;
  model: string | null;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  errorMessage?: string | null;
  attempts?: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}) {
  const existingRows = await sql<Array<{ id: string }>>`
    select id
    from public.location_extraction_runs
    where video_id = ${input.videoId}
    limit 1
  `;
  const existing = existingRows[0] || null;

  if (existing?.id) {
    await sql`
      update public.location_extraction_runs
      set
        channel_id = ${input.channelId},
        video_id = ${input.videoId},
        status = ${input.status},
        prompt_version = ${input.promptVersion},
        model = ${input.model},
        input = ${JSON.stringify(input.inputPayload || {})}::jsonb,
        output = ${JSON.stringify(input.outputPayload || {})}::jsonb,
        error_message = ${input.errorMessage || null},
        attempts = ${input.attempts ?? 1},
        started_at = ${input.startedAt || null},
        finished_at = ${input.finishedAt || null},
        updated_at = ${new Date().toISOString()}
      where id = ${existing.id}
    `;
    return existing.id;
  }

  const inserted = await sql<Array<{ id: string }>>`
    insert into public.location_extraction_runs (
      channel_id,
      video_id,
      status,
      prompt_version,
      model,
      input,
      output,
      error_message,
      attempts,
      started_at,
      finished_at,
      updated_at
    )
    values (
      ${input.channelId},
      ${input.videoId},
      ${input.status},
      ${input.promptVersion},
      ${input.model},
      ${JSON.stringify(input.inputPayload || {})}::jsonb,
      ${JSON.stringify(input.outputPayload || {})}::jsonb,
      ${input.errorMessage || null},
      ${input.attempts ?? 1},
      ${input.startedAt || null},
      ${input.finishedAt || null},
      ${new Date().toISOString()}
    )
    returning id
  `;
  const row = inserted[0];
  if (!row?.id) throw new Error("Could not create extraction run");
  return row.id;
}

async function upsertChannelImportRun(input: {
  importRunId: string;
  channelId: string;
  status: string;
  source: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}) {
  const existingRows = await sql<Array<{ id: string }>>`
    select id
    from public.channel_import_runs
    where id = ${input.importRunId}
    limit 1
  `;
  const existing = existingRows[0] || null;

  if (existing?.id) {
    await sql`
      update public.channel_import_runs
      set
        channel_id = ${input.channelId},
        status = ${input.status},
        source = ${input.source},
        input = ${JSON.stringify(input.inputPayload || {})}::jsonb,
        output = ${JSON.stringify(input.outputPayload || {})}::jsonb,
        error_message = ${input.errorMessage || null},
        started_at = ${input.startedAt || null},
        finished_at = ${input.finishedAt || null},
        updated_at = ${new Date().toISOString()}
      where id = ${existing.id}
    `;
    return existing.id;
  }

  await sql`
    insert into public.channel_import_runs (
      id,
      channel_id,
      status,
      source,
      input,
      output,
      error_message,
      started_at,
      finished_at,
      updated_at
    )
    values (
      ${input.importRunId},
      ${input.channelId},
      ${input.status},
      ${input.source},
      ${JSON.stringify(input.inputPayload || {})}::jsonb,
      ${JSON.stringify(input.outputPayload || {})}::jsonb,
      ${input.errorMessage || null},
      ${input.startedAt || null},
      ${input.finishedAt || null},
      ${new Date().toISOString()}
    )
  `;
  return input.importRunId;
}

async function extractLocationForVideo(channel: { channel_name: string; description: string | null }, video: {
  title: string;
  description: string | null;
  published_at: string | null;
  youtube_video_id: string;
}) {
  type ExtractionOrigin = "gemini" | "heuristic";

  function buildHeuristicFallback() {
    const heuristic = runHeuristicLocation(video.title, video.description || null);
    if (!heuristic) {
      return {
        extraction: extractionSchema.parse({
          has_location: false,
          primary_location: null,
          additional_locations: [],
          summary: "heuristic_fallback_no_match",
        }),
        origin: "heuristic" as ExtractionOrigin,
      };
    }

    return {
      extraction: extractionSchema.parse({
        has_location: true,
        primary_location: {
          country_code: heuristic.countryCode,
          country_name: heuristic.countryCode,
          city: null,
          region: null,
          location_label: heuristic.query,
          confidence: heuristic.score,
          travel_type: null,
        },
        additional_locations: [],
        summary: "heuristic_fallback",
      }),
      origin: "heuristic" as ExtractionOrigin,
    };
  }

  if (!hasGeminiApiKey()) {
    return buildHeuristicFallback();
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: `${LOCATION_PROMPT}

Channel: ${channel.channel_name}
Channel description: ${channel.description || "No description"}
Video title: ${video.title}
Video description: ${(video.description || "").slice(0, 5000)}
Published at: ${video.published_at || "unknown"}

Return the location data only. If there are several places, focus on the main filming destination.`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: geminiJsonSchema,
      },
    });

    return {
      extraction: extractionSchema.parse(JSON.parse(response.text || "{}")),
      origin: "gemini" as ExtractionOrigin,
    };
  } catch {
    return buildHeuristicFallback();
  }
}

function createGeoQuery(primaryLocation: z.infer<typeof locationSchema>) {
  return [primaryLocation.location_label, primaryLocation.city, primaryLocation.region, primaryLocation.country_name]
    .filter(Boolean)
    .join(", ");
}

function normalize(text: string) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function flagToCountryCode(text: string) {
  const codepoints = Array.from(String(text || "")).map((char) => char.codePointAt(0) || 0);
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
      score: 0.9,
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
        score: isCityHint ? 0.82 : 0.68,
      };
    }
  }

  return null;
}

function toTravelVideoLocation(input: {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number | null;
  location: z.infer<typeof locationSchema>;
  geo: Awaited<ReturnType<typeof geocodeLocation>>;
}): TravelVideoLocation | null {
  if (!input.geo) return null;

  return {
    youtube_video_id: input.youtubeVideoId,
    title: input.title,
    thumbnail_url: input.thumbnailUrl,
    published_at: input.publishedAt,
    view_count: input.viewCount,
    travel_type: input.location.travel_type || null,
    country_code: input.geo.countryCode || input.location.country_code || "XX",
    country_name: input.geo.countryName || input.location.country_name || input.geo.countryCode || "Unknown",
    location_label: input.location.location_label || input.geo.label,
    lat: input.geo.lat,
    lng: input.geo.lng,
    confidence_score: input.location.confidence ?? null,
  };
}

async function processVideosInBatches<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
}

function filterOutShortPlaylistItems<T extends { contentDetails?: { videoId?: string } }>(
  playlistItems: T[],
  detailsByVideoId: Map<string, { is_short?: boolean }>
) {
  return playlistItems.filter((item) => {
    const videoId = item.contentDetails?.videoId;
    if (!videoId) return false;
    const details = detailsByVideoId.get(videoId);
    return !details?.is_short;
  });
}

export async function importYoutubeChannelPreview(channelUrl: string): Promise<ImportYoutubeChannelResult> {
  const source = await resolveYouTubeChannel(channelUrl);
  const channelId = randomUUID();
  const userId = randomUUID();
  const importRunId = randomUUID();

  const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
  const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
  const videoDetails = videoIds.length ? await loadVideoDetails(videoIds) : new Map();
  const eligiblePlaylistVideos = filterOutShortPlaylistItems(playlistVideos, videoDetails);

  const extractedLocations = await processVideosInBatches(eligiblePlaylistVideos, 3, async (playlistItem) => {
    const videoId = playlistItem.contentDetails?.videoId;
    if (!videoId) return null;

    const details = videoDetails.get(videoId);
    const title = details?.title || playlistItem.snippet?.title || "Untitled video";
    const description = details?.description || playlistItem.snippet?.description || null;
    const thumbnailUrl =
      details?.thumbnail_url ||
      playlistItem.snippet?.thumbnails?.high?.url ||
      playlistItem.snippet?.thumbnails?.medium?.url ||
      playlistItem.snippet?.thumbnails?.default?.url ||
      null;
    const publishedAt = details?.published_at || playlistItem.snippet?.publishedAt || playlistItem.contentDetails?.videoPublishedAt || null;
    const viewCount = details?.view_count ?? null;

    const extractionAttempt = await extractLocationForVideo(
      { channel_name: source.channel_name, description: source.description },
      {
        title,
        description,
        published_at: publishedAt,
        youtube_video_id: videoId,
      }
    );
    const extraction = extractionAttempt.extraction;

    if (extractionAttempt.origin !== "gemini") {
      return null;
    }

    if (!extraction.has_location || !extraction.primary_location) {
      return null;
    }

    const geo = await geocodeLocation(createGeoQuery(extraction.primary_location));
    if (!geo) {
      return null;
    }

    return toTravelVideoLocation({
      youtubeVideoId: videoId,
      title,
      thumbnailUrl,
      publishedAt,
      viewCount,
      location: extraction.primary_location,
      geo,
    });
  });

  const videoLocations = extractedLocations.filter(Boolean) as TravelVideoLocation[];
  const importedVideos = eligiblePlaylistVideos.length;

  return {
    import_run_id: importRunId,
    preview_mode: true,
    channel: {
      id: channelId,
      user_id: userId,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      thumbnail_url: source.thumbnail_url,
      subscriber_count: source.subscriber_count,
    },
    videoLocations,
    importedVideos,
    mappedVideos: videoLocations.length,
    skippedVideos: importedVideos - videoLocations.length,
    channelSource: {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    },
  };
}

export async function importYoutubeChannel({
  userId,
  channelUrl,
  importRunId = randomUUID(),
}: ImportYoutubeChannelInput): Promise<ImportYoutubeChannelResult> {
  const startedAt = new Date().toISOString();

  try {
    const source = await resolveYouTubeChannel(channelUrl);
    const channelRows = await sql<
      Array<{
        id: string;
        user_id: string;
        channel_name: string;
        channel_handle: string | null;
        thumbnail_url: string | null;
        subscriber_count: number | null;
        description: string | null;
      }>
    >`
      insert into public.channels (
        user_id,
        youtube_channel_id,
        channel_name,
        channel_handle,
        thumbnail_url,
        subscriber_count,
        description,
        is_public,
        published_at,
        updated_at
      )
      values (
        ${userId},
        ${source.youtube_channel_id},
        ${source.channel_name},
        ${source.channel_handle},
        ${source.thumbnail_url},
        ${source.subscriber_count},
        ${source.description},
        true,
        ${source.published_at},
        ${new Date().toISOString()}
      )
      on conflict (user_id)
      do update set
        youtube_channel_id = excluded.youtube_channel_id,
        channel_name = excluded.channel_name,
        channel_handle = excluded.channel_handle,
        thumbnail_url = excluded.thumbnail_url,
        subscriber_count = excluded.subscriber_count,
        description = excluded.description,
        is_public = excluded.is_public,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at
      returning id, user_id, channel_name, channel_handle, thumbnail_url, subscriber_count, description
    `;
    const uploadChannel = channelRows[0];
    if (!uploadChannel) throw new Error("Could not save channel");

    const initialOutput = {
      totalVideos: 0,
      processedVideos: 0,
      mappedVideos: 0,
      skippedVideos: 0,
      countriesMapped: 0,
      totalViews: 0,
      stage: "starting",
      progress: 0,
    };

    await upsertChannelImportRun({
      importRunId,
      channelId: uploadChannel.id,
      status: "running",
      source: "youtube",
      inputPayload: { channelUrl },
      outputPayload: initialOutput,
      startedAt,
    });

    const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
    const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
    const videoDetails = videoIds.length ? await loadVideoDetails(videoIds) : new Map();
    const eligiblePlaylistVideos = filterOutShortPlaylistItems(playlistVideos, videoDetails);
    const eligibleVideoCount = eligiblePlaylistVideos.length;
    let processedVideos = 0;
    let mappedVideos = 0;
    let skippedVideos = 0;
    let mappedViews = 0;
    const mappedCountryCodes = new Set<string>();

    async function updateProgress(stage: string) {
      await upsertChannelImportRun({
        importRunId,
        channelId: uploadChannel.id,
        status: "running",
        source: "youtube",
        inputPayload: { channelUrl },
        outputPayload: {
          totalVideos: eligibleVideoCount,
          processedVideos,
          mappedVideos,
          skippedVideos,
          countriesMapped: mappedCountryCodes.size,
          totalViews: mappedViews,
          stage,
          progress: eligibleVideoCount > 0 ? Number((processedVideos / eligibleVideoCount).toFixed(4)) : 1,
        },
        startedAt,
      });
    }

    await updateProgress("loading");

    await processVideosInBatches(eligiblePlaylistVideos, 3, async (playlistItem) => {
      const videoId = playlistItem.contentDetails?.videoId;
      if (!videoId) return null;

      const details = videoDetails.get(videoId);
      const title = details?.title || playlistItem.snippet?.title || "Untitled video";
      const description = details?.description || playlistItem.snippet?.description || null;
      const thumbnailUrl = details?.thumbnail_url || playlistItem.snippet?.thumbnails?.high?.url || playlistItem.snippet?.thumbnails?.medium?.url || playlistItem.snippet?.thumbnails?.default?.url || null;
      const publishedAt = details?.published_at || playlistItem.snippet?.publishedAt || playlistItem.contentDetails?.videoPublishedAt || null;
      const viewCount = details?.view_count ?? null;

      const videoRows = await sql<Array<{ id: string }>>`
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
          travel_type,
          location_status,
          needs_manual_reason,
          source_payload,
          updated_at
        )
        values (
          ${uploadChannel.id},
          ${videoId},
          ${title},
          ${description},
          ${thumbnailUrl},
          ${publishedAt},
          ${viewCount ?? 0},
          ${details?.like_count ?? null},
          ${details?.comment_count ?? null},
          null,
          'processing',
          null,
          ${JSON.stringify({
            playlist_item: playlistItem,
            video_details: details?.raw || null,
          })}::jsonb,
          ${new Date().toISOString()}
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
          travel_type = excluded.travel_type,
          location_status = excluded.location_status,
          needs_manual_reason = excluded.needs_manual_reason,
          source_payload = excluded.source_payload,
          updated_at = excluded.updated_at
        returning id
      `;
      const videoRecordId = videoRows[0]?.id;
      if (!videoRecordId) {
        throw new Error(`Could not persist video ${videoId}`);
      }
      const now = new Date().toISOString();

      const extractionAttempt = await extractLocationForVideo(
        { channel_name: uploadChannel.channel_name, description: uploadChannel.description },
        {
          title,
          description,
          published_at: publishedAt,
          youtube_video_id: videoId,
        }
      );
      const extraction = extractionAttempt.extraction;
      const fallbackToManualReason = extractionAttempt.origin === "heuristic"
        ? "Fallback heuristico detectado: requiere revision manual."
        : "No se detecto una ubicacion confiable automaticamente.";

      if (extractionAttempt.origin === "heuristic") {
        await sql`
          delete from public.video_locations
          where video_id = ${videoRecordId}
        `;
        await sql`
          update public.videos
          set
            travel_type = ${extraction.primary_location?.travel_type || null},
            location_status = 'needs_manual',
            needs_manual_reason = ${fallbackToManualReason},
            updated_at = ${now}
          where id = ${videoRecordId}
        `;
        processedVideos += 1;
        skippedVideos += 1;
        await updateProgress("mapping");

        await upsertExtractionRun({
          channelId: uploadChannel.id,
          videoId: videoRecordId,
          status: "completed",
          promptVersion: "gemini-v1",
          model: getGeminiModel(),
          inputPayload: {
            channel: source,
            video: { title, description, publishedAt, videoId },
          },
          outputPayload: {
            ...extraction,
            fallback_origin: extractionAttempt.origin,
          },
          startedAt: now,
          finishedAt: now,
        });

        return null;
      }

      if (!extraction.has_location || !extraction.primary_location) {
        await sql`
          delete from public.video_locations
          where video_id = ${videoRecordId}
        `;
        await sql`
          update public.videos
          set
            travel_type = null,
            location_status = 'needs_manual',
            needs_manual_reason = ${fallbackToManualReason},
            updated_at = ${now}
          where id = ${videoRecordId}
        `;
        processedVideos += 1;
        skippedVideos += 1;
        await updateProgress("mapping");

        await upsertExtractionRun({
          channelId: uploadChannel.id,
          videoId: videoRecordId,
          status: "completed",
          promptVersion: "gemini-v1",
          model: getGeminiModel(),
          inputPayload: {
            channel: source,
            video: { title, description, publishedAt, videoId },
          },
          outputPayload: extraction,
          startedAt: now,
          finishedAt: now,
        });

        return null;
      }

      const geo = await geocodeLocation(createGeoQuery(extraction.primary_location));
      if (!geo) {
        await sql`
          delete from public.video_locations
          where video_id = ${videoRecordId}
        `;
        await sql`
          update public.videos
          set
            travel_type = ${extraction.primary_location.travel_type || null},
            location_status = 'needs_manual',
            needs_manual_reason = 'No se pudo geocodificar automaticamente la ubicacion detectada.',
            updated_at = ${now}
          where id = ${videoRecordId}
        `;
        processedVideos += 1;
        skippedVideos += 1;
        await updateProgress("geocoding");

        await upsertExtractionRun({
          channelId: uploadChannel.id,
          videoId: videoRecordId,
          status: "failed",
          promptVersion: "gemini-v1",
          model: getGeminiModel(),
          inputPayload: {
            channel: source,
            video: { title, description, publishedAt, videoId },
          },
          outputPayload: extraction,
          errorMessage: "Geocoding failed",
          startedAt: now,
          finishedAt: now,
        });

        return null;
      }

      const primaryLocation = toTravelVideoLocation({
        youtubeVideoId: videoId,
        title,
        thumbnailUrl,
        publishedAt,
        viewCount,
        location: extraction.primary_location,
        geo,
      });

      if (!primaryLocation) return null;

      await sql`
        delete from public.video_locations
        where video_id = ${videoRecordId}
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
          travel_type,
          source,
          raw_payload
        )
        values (
          ${randomUUID()},
          ${uploadChannel.id},
          ${videoRecordId},
          true,
          ${primaryLocation.country_code},
          ${primaryLocation.country_name || null},
          ${primaryLocation.location_label || null},
          ${extraction.primary_location.city || geo.city || null},
          ${extraction.primary_location.region || geo.region || null},
          ${primaryLocation.lat},
          ${primaryLocation.lng},
          ${primaryLocation.confidence_score || null},
          ${primaryLocation.travel_type || null},
          'gemini',
          ${JSON.stringify({
            gemini: extraction,
            geocode: geo.raw,
          })}::jsonb
        )
      `;

      for (const extra of extraction.additional_locations) {
        const extraGeo = await geocodeLocation(createGeoQuery(extra));
        if (!extraGeo) continue;

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
            travel_type,
            source,
            raw_payload
          )
          values (
            ${randomUUID()},
            ${uploadChannel.id},
            ${videoRecordId},
            false,
            ${extraGeo.countryCode || extra.country_code || "XX"},
            ${extraGeo.countryName || extra.country_name || "Unknown"},
            ${extra.location_label || extraGeo.label || null},
            ${extra.city || extraGeo.city || null},
            ${extra.region || extraGeo.region || null},
            ${extraGeo.lat},
            ${extraGeo.lng},
            ${extra.confidence ?? null},
            ${extra.travel_type || null},
            'gemini',
            ${JSON.stringify({
              gemini: extraction,
              geocode: extraGeo.raw,
            })}::jsonb
          )
        `;
      }

      await sql`
        update public.videos
        set
          travel_type = ${primaryLocation.travel_type || null},
          location_status = 'mapped',
          needs_manual_reason = null,
          updated_at = ${now}
        where id = ${videoRecordId}
      `;
      processedVideos += 1;
      mappedVideos += 1;
      mappedViews += Number(viewCount || 0);
      mappedCountryCodes.add(String(primaryLocation.country_code || "").trim().toUpperCase());
      await updateProgress("done");

      await upsertExtractionRun({
        channelId: uploadChannel.id,
        videoId: videoRecordId,
        status: "completed",
        promptVersion: "gemini-v1",
        model: getGeminiModel(),
        inputPayload: {
          channel: source,
          video: { title, description, publishedAt, videoId },
        },
        outputPayload: {
          gemini: extraction,
          geocode: geo.raw,
        },
        startedAt: now,
        finishedAt: now,
      });

      return primaryLocation;
    });

    const allLocations = await sql<
      Array<{
        country_code: string;
        country_name: string | null;
        location_label: string | null;
        lat: number | string;
        lng: number | string;
        confidence_score: number | string | null;
        travel_type: string | null;
        youtube_video_id: string;
        title: string;
        description: string | null;
        thumbnail_url: string | null;
        published_at: string | null;
        view_count: number | string | null;
      }>
    >`
      select
        vl.country_code,
        vl.country_name,
        vl.location_label,
        vl.lat,
        vl.lng,
        vl.confidence_score,
        vl.travel_type,
        v.youtube_video_id,
        v.title,
        v.description,
        v.thumbnail_url,
        v.published_at,
        v.view_count
      from public.video_locations vl
      inner join public.videos v on v.id = vl.video_id
      where vl.channel_id = ${uploadChannel.id}
        and vl.is_primary = true
      order by vl.created_at desc
    `;

    const normalizedLocations = allLocations.map((row) => ({
      youtube_video_id: row.youtube_video_id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      published_at: row.published_at,
      view_count: Number(row.view_count || 0),
      travel_type: row.travel_type,
      country_code: row.country_code,
      country_name: row.country_name || row.country_code,
      location_label: row.location_label,
      lat: Number(row.lat),
      lng: Number(row.lng),
      confidence_score: Number(row.confidence_score || 0),
    } satisfies TravelVideoLocation));

    const channel: TravelChannel = {
      id: uploadChannel.id,
      user_id: uploadChannel.user_id,
      channel_name: uploadChannel.channel_name,
      channel_handle: uploadChannel.channel_handle,
      thumbnail_url: uploadChannel.thumbnail_url,
      subscriber_count: uploadChannel.subscriber_count,
    };

    await sql`
      update public.channel_import_runs
      set
        status = 'completed',
        output = ${JSON.stringify({
          totalVideos: eligibleVideoCount,
          processedVideos: eligibleVideoCount,
          mappedVideos: normalizedLocations.length,
          skippedVideos,
          countriesMapped: new Set(normalizedLocations.map((row) => String(row.country_code || "").trim().toUpperCase()).filter(Boolean)).size,
          totalViews: normalizedLocations.reduce((sum, row) => sum + Number(row.view_count || 0), 0),
          channel: source,
          stage: "completed",
          progress: 1,
        })}::jsonb,
        finished_at = ${new Date().toISOString()},
        updated_at = ${new Date().toISOString()}
      where id = ${importRunId}
    `;

    await sql`
      insert into public.onboarding_state (
        user_id,
        current_step,
        completed_steps,
        youtube_channel_id,
        channel_id,
        is_complete,
        last_seen_at,
        updated_at
      )
      values (
        ${userId},
        'plan',
        array['welcome', 'youtube']::text[],
        ${source.youtube_channel_id},
        ${uploadChannel.id},
        false,
        ${new Date().toISOString()},
        ${new Date().toISOString()}
      )
      on conflict (user_id)
      do update set
        current_step = excluded.current_step,
        completed_steps = excluded.completed_steps,
        youtube_channel_id = excluded.youtube_channel_id,
        channel_id = excluded.channel_id,
        is_complete = excluded.is_complete,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `;

    return {
      import_run_id: importRunId,
      channel,
      videoLocations: normalizedLocations,
      importedVideos: eligibleVideoCount,
      mappedVideos: normalizedLocations.length,
      skippedVideos,
      channelSource: {
        youtube_channel_id: source.youtube_channel_id,
        channel_name: source.channel_name,
        channel_handle: source.channel_handle,
        uploads_playlist_id: source.uploads_playlist_id,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown import error";
    await sql`
      update public.channel_import_runs
      set
        status = 'failed',
        error_message = ${errorMessage},
        finished_at = ${new Date().toISOString()},
        updated_at = ${new Date().toISOString()}
      where id = ${importRunId}
    `;
    throw error;
  }
}
