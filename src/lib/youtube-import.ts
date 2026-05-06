import { randomUUID } from "crypto";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { sql } from "@/lib/neon";
import { analyzeVideoLocation, persistVideoAnalysis } from "@/lib/video-location-engine";
import { loadChannelPlaylistSignals, loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";

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

type ProviderName = "youtube" | "nominatim" | "gemini" | "database" | "unknown";
type ProviderErrorCounter = Record<ProviderName, number>;

const DEFAULT_PROVIDER_ERRORS: ProviderErrorCounter = {
  youtube: 0,
  nominatim: 0,
  gemini: 0,
  database: 0,
  unknown: 0,
};

const DEFAULT_IMPORT_CONCURRENCY = 3;
const DEFAULT_MAX_VIDEOS_PER_RUN = 2500;
const STALE_RUNNING_RUN_MS = 2 * 60 * 1000;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getImportConcurrency() {
  return parsePositiveInt(process.env.YOUTUBE_IMPORT_CONCURRENCY, DEFAULT_IMPORT_CONCURRENCY);
}

function getMaxVideosPerRun() {
  return parsePositiveInt(process.env.YOUTUBE_IMPORT_MAX_VIDEOS_PER_RUN, DEFAULT_MAX_VIDEOS_PER_RUN);
}

function classifyProviderError(error: unknown): ProviderName {
  const text = String(error instanceof Error ? error.message : error || "").toLowerCase();
  if (text.includes("youtube")) return "youtube";
  if (text.includes("nominatim") || text.includes("geocode")) return "nominatim";
  if (text.includes("gemini") || text.includes("google genai") || text.includes("llm")) return "gemini";
  if (text.includes("sql") || text.includes("database") || text.includes("postgres")) return "database";
  return "unknown";
}

function mergeProviderErrors(base: ProviderErrorCounter, provider: ProviderName) {
  return {
    ...base,
    [provider]: (base[provider] || 0) + 1,
  } satisfies ProviderErrorCounter;
}

function getBackoffMs(attempt: number) {
  const jitter = Math.floor(Math.random() * 120);
  return Math.min(1200, attempt * 220 + jitter);
}

function isRetriableError(error: unknown) {
  const text = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return (
    text.includes("timeout") ||
    text.includes("temporarily") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("503") ||
    text.includes("502") ||
    text.includes("network")
  );
}

async function withRetry<T>(task: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetriableError(error)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, getBackoffMs(attempt)));
    }
  }
  throw lastError;
}

function processVideosInBatches<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let index = 0;
  return Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (index < items.length) {
        const current = index++;
        await worker(items[current], current);
      }
    })
  );
}

function filterOutShortVideoIds(videoIds: string[], detailsByVideoId: Map<string, { is_short?: boolean }>) {
  return videoIds.filter((videoId) => !detailsByVideoId.get(videoId)?.is_short);
}

function buildVideoSourcePayload(details: Awaited<ReturnType<typeof loadVideoDetails>> extends Map<string, infer T> ? T : never) {
  return {
    ingestion: "youtube_data_api_v3",
    fetched_at: details.youtube_data_refreshed_at,
    expires_at: details.youtube_data_expires_at,
    made_for_kids: details.made_for_kids ?? null,
    has_recording_details: typeof details.recording_lat === "number" && typeof details.recording_lng === "number",
  } satisfies Record<string, unknown>;
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

async function upsertVideoSkeleton(input: {
  channelId: string;
  youtubeVideoId: string;
  details: Awaited<ReturnType<typeof loadVideoDetails>> extends Map<string, infer T> ? T : never;
  sourcePayload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const rows = await sql<Array<{ id: string }>>`
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
      made_for_kids,
      recording_lat,
      recording_lng,
      recording_location_description,
      youtube_data_refreshed_at,
      youtube_data_expires_at,
      location_status,
      playlist_signals,
      geo_hints,
      source_payload,
      updated_at
    )
    values (
      ${input.channelId},
      ${input.youtubeVideoId},
      ${input.details?.title || "Untitled video"},
      ${input.details?.description || null},
      ${input.details?.thumbnail_url || null},
      ${input.details?.published_at || null},
      ${input.details?.view_count ?? 0},
      ${input.details?.like_count ?? null},
      ${input.details?.comment_count ?? null},
      ${input.details?.duration_seconds ?? null},
      ${Boolean(input.details?.is_short)},
      ${input.details?.made_for_kids ?? null},
      ${input.details?.recording_lat ?? null},
      ${input.details?.recording_lng ?? null},
      ${input.details?.recording_location_description ?? null},
      ${input.details?.youtube_data_refreshed_at || now},
      ${input.details?.youtube_data_expires_at || now},
      'processing',
      '[]'::jsonb,
      '[]'::jsonb,
      ${JSON.stringify(input.sourcePayload)}::jsonb,
      ${now}
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
      made_for_kids = excluded.made_for_kids,
      recording_lat = excluded.recording_lat,
      recording_lng = excluded.recording_lng,
      recording_location_description = excluded.recording_location_description,
      youtube_data_refreshed_at = excluded.youtube_data_refreshed_at,
      youtube_data_expires_at = excluded.youtube_data_expires_at,
      source_payload = excluded.source_payload,
      updated_at = excluded.updated_at
    returning id
  `;
  const row = rows[0];
  if (!row?.id) throw new Error(`Could not persist video ${input.youtubeVideoId}`);
  return row.id;
}

async function loadPrimaryLocations(channelId: string) {
  const rows = await sql<
    Array<{
      country_code: string;
      country_name: string | null;
      location_label: string | null;
      city: string | null;
      region: string | null;
      lat: number | string;
      lng: number | string;
      confidence_score: number | string | null;
      location_score: number | string | null;
      verification_source: string | null;
      location_evidence: Record<string, unknown> | null;
      location_precision: string | null;
      source: string | null;
      youtube_video_id: string;
      title: string;
      description: string | null;
      thumbnail_url: string | null;
      published_at: string | null;
      view_count: number | string | null;
      like_count: number | string | null;
      comment_count: number | string | null;
      duration_seconds: number | string | null;
      is_short: boolean | null;
      made_for_kids: boolean | null;
      is_travel: boolean | null;
      travel_score: number | string | null;
      travel_signals: string[] | null;
      inclusion_reason: string | null;
      exclusion_reason: string | null;
      recording_lat: number | string | null;
      recording_lng: number | string | null;
      recording_location_description: string | null;
      youtube_data_refreshed_at: string | null;
      youtube_data_expires_at: string | null;
      location_status: string | null;
      playlist_signals: Array<Record<string, unknown>> | null;
      geo_hints: Array<Record<string, unknown>> | null;
      needs_manual_reason: string | null;
    }>
  >`
    select
      vl.country_code,
      vl.country_name,
      vl.location_label,
      vl.city,
      vl.region,
      vl.lat,
      vl.lng,
      vl.confidence_score,
      vl.location_score,
      vl.verification_source,
      vl.location_evidence,
      vl.location_precision,
      vl.source,
      v.youtube_video_id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.published_at,
      v.view_count,
      v.like_count,
      v.comment_count,
      v.duration_seconds,
      v.is_short,
      v.made_for_kids,
      v.is_travel,
      v.travel_score,
      v.travel_signals,
      v.inclusion_reason,
      v.exclusion_reason,
      v.recording_lat,
      v.recording_lng,
      v.recording_location_description,
      v.youtube_data_refreshed_at,
      v.youtube_data_expires_at,
      v.location_status,
      v.playlist_signals,
      v.geo_hints,
      v.needs_manual_reason
    from public.video_locations vl
    inner join public.videos v on v.id = vl.video_id
    where vl.channel_id = ${channelId}
      and vl.is_primary = true
      and v.location_status in ('mapped', 'verified_auto', 'verified_manual')
      and coalesce(v.is_travel, true) = true
      and coalesce(v.is_short, false) = false
    order by vl.created_at desc
  `;

  return rows.map((row) => ({
    youtube_video_id: row.youtube_video_id,
    video_url: `https://youtube.com/watch?v=${row.youtube_video_id}`,
    title: row.title,
    description: row.description,
    thumbnail_url: row.thumbnail_url,
    published_at: row.published_at,
    view_count: Number(row.view_count || 0),
    like_count: Number(row.like_count || 0) || null,
    comment_count: Number(row.comment_count || 0) || null,
    duration_seconds: Number(row.duration_seconds || 0) || null,
    is_short: Boolean(row.is_short),
    made_for_kids: typeof row.made_for_kids === "boolean" ? row.made_for_kids : null,
    is_travel: row.is_travel !== false,
    travel_score: Number(row.travel_score || 0) || null,
    travel_signals: Array.isArray(row.travel_signals) ? row.travel_signals : [],
    inclusion_reason: row.inclusion_reason || null,
    exclusion_reason: row.exclusion_reason || null,
    recording_lat: Number(row.recording_lat || 0) || null,
    recording_lng: Number(row.recording_lng || 0) || null,
    recording_location_description: row.recording_location_description || null,
    youtube_data_refreshed_at: row.youtube_data_refreshed_at || null,
    youtube_data_expires_at: row.youtube_data_expires_at || null,
    country_code: row.country_code,
    country_name: row.country_name || row.country_code,
    location_label: row.location_label,
    city: row.city,
    region: row.region,
    lat: Number(row.lat),
    lng: Number(row.lng),
    confidence_score: Number(row.confidence_score || 0) || null,
    location_status: row.location_status as TravelVideoLocation["location_status"],
    verification_source: row.verification_source as TravelVideoLocation["verification_source"],
    location_source: row.source || null,
    location_score: Number(row.location_score || 0) || null,
    location_evidence: row.location_evidence || null,
    playlist_signals: Array.isArray(row.playlist_signals) ? row.playlist_signals : [],
    geo_hints: Array.isArray(row.geo_hints) ? row.geo_hints : [],
    location_precision: (row.location_precision as TravelVideoLocation["location_precision"]) || "unresolved",
    needs_manual_reason: row.needs_manual_reason || null,
  } satisfies TravelVideoLocation));
}

export async function importYoutubeChannelPreview(channelUrl: string): Promise<ImportYoutubeChannelResult> {
  const source = await resolveYouTubeChannel(channelUrl);
  const channelId = randomUUID();
  const userId = randomUUID();
  const importRunId = randomUUID();

  const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
  const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
  const videoDetails = videoIds.length ? await loadVideoDetails(videoIds) : new Map();
  const playlistSignals = source.youtube_channel_id ? await loadChannelPlaylistSignals(source.youtube_channel_id) : new Map();
  const eligibleVideoIds = filterOutShortVideoIds(videoIds, videoDetails);
  const previewLocations: TravelVideoLocation[] = [];

  await processVideosInBatches(eligibleVideoIds.slice(0, 24), 3, async (videoId) => {
    const details = videoDetails.get(videoId);
    if (!details) return;

    const analysis = await analyzeVideoLocation({
      channelName: source.channel_name,
      channelDescription: source.description,
      youtubeVideoId: videoId,
      title: details.title,
      description: details.description,
      publishedAt: details.published_at,
      playlistSignals: playlistSignals.get(videoId) || [],
      recordingLat: details.recording_lat,
      recordingLng: details.recording_lng,
      recordingLocationDescription: details.recording_location_description,
      mode: "initial",
    });

    if (analysis.primaryLocation && analysis.locationStatus === "verified_auto") {
      previewLocations.push({
        ...analysis.primaryLocation,
        thumbnail_url: details.thumbnail_url,
        published_at: details.published_at,
        view_count: details.view_count,
        like_count: details.like_count,
        comment_count: details.comment_count,
      });
    }
  });

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
    videoLocations: previewLocations,
    importedVideos: eligibleVideoIds.length,
    mappedVideos: previewLocations.length,
    skippedVideos: eligibleVideoIds.length - previewLocations.length,
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
  const importConcurrency = getImportConcurrency();
  const maxVideosPerRun = getMaxVideosPerRun();
  let providerErrors: ProviderErrorCounter = { ...DEFAULT_PROVIDER_ERRORS };
  let activeChannelId: string | null = null;

  let totalVideos = 0;
  let processedVideos = 0;
  let mappedVideos = 0;
  let skippedVideos = 0;
  let mappedViews = 0;
  const mappedCountryCodes = new Set<string>();

  async function updateProgress(stage: string, channelId: string, sourcePayload: Record<string, unknown>) {
    await upsertChannelImportRun({
      importRunId,
      channelId,
      status: "running",
      source: "youtube",
      inputPayload: { channelUrl },
      outputPayload: {
        totalVideos,
        processedVideos,
        mappedVideos,
        skippedVideos,
        countriesMapped: mappedCountryCodes.size,
        totalViews: mappedViews,
        stage,
        progress: totalVideos > 0 ? Number((processedVideos / totalVideos).toFixed(4)) : 0,
        providerErrors,
        importConcurrency,
        maxVideosPerRun,
        source: sourcePayload,
      },
      startedAt,
    });
  }

  try {
    const source = await withRetry(() => resolveYouTubeChannel(channelUrl), 3);
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
    activeChannelId = uploadChannel.id;

    await upsertChannelImportRun({
      importRunId,
      channelId: uploadChannel.id,
      status: "running",
      source: "youtube",
      inputPayload: { channelUrl },
      outputPayload: {
        totalVideos: 0,
        processedVideos: 0,
        mappedVideos: 0,
        skippedVideos: 0,
        countriesMapped: 0,
        totalViews: 0,
        stage: "starting",
        progress: 0,
        providerErrors,
        importConcurrency,
        maxVideosPerRun,
      },
      startedAt,
    });

    await updateProgress("resolving_channel", uploadChannel.id, {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    });

    const playlistVideos = await withRetry(() => loadUploadsPlaylistVideos(source.uploads_playlist_id), 3);
    const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
    await updateProgress("loading_playlist", uploadChannel.id, {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    });

    const videoDetails = videoIds.length ? await withRetry(() => loadVideoDetails(videoIds), 3) : new Map();
    await updateProgress("hydrating_details", uploadChannel.id, {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    });

    const playlistSignals = source.youtube_channel_id ? await withRetry(() => loadChannelPlaylistSignals(source.youtube_channel_id), 3) : new Map();
    const eligibleVideoIds = filterOutShortVideoIds(videoIds, videoDetails).slice(0, maxVideosPerRun);
    totalVideos = eligibleVideoIds.length;

    await updateProgress("loading_playlist_signals", uploadChannel.id, {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    });

    await processVideosInBatches(eligibleVideoIds, importConcurrency, async (videoId) => {
      const details = videoDetails.get(videoId);
      if (!details) {
        processedVideos += 1;
        skippedVideos += 1;
        if (processedVideos % 5 === 0 || processedVideos === totalVideos) {
          await updateProgress("mapping", uploadChannel.id, {
            youtube_channel_id: source.youtube_channel_id,
            channel_name: source.channel_name,
            channel_handle: source.channel_handle,
            uploads_playlist_id: source.uploads_playlist_id,
          });
        }
        return;
      }

      let videoRecordId: string | null = null;
      try {
        videoRecordId = await withRetry(
          () =>
            upsertVideoSkeleton({
              channelId: uploadChannel.id,
              youtubeVideoId: videoId,
              details,
              sourcePayload: {
                ...buildVideoSourcePayload(details),
              },
            }),
          2
        );

        const analysis = await withRetry(
          () =>
            analyzeVideoLocation({
              channelName: uploadChannel.channel_name,
              channelDescription: uploadChannel.description,
              youtubeVideoId: videoId,
              title: details.title,
              description: details.description,
              publishedAt: details.published_at,
              playlistSignals: playlistSignals.get(videoId) || [],
              recordingLat: details.recording_lat,
              recordingLng: details.recording_lng,
              recordingLocationDescription: details.recording_location_description,
              mode: "initial",
            }),
          2
        );

        const persistedLocation = await withRetry(
          () =>
            persistVideoAnalysis({
              channelId: uploadChannel.id,
              videoRecordId: videoRecordId!,
              youtubeVideoId: videoId,
              title: details.title,
              description: details.description,
              thumbnailUrl: details.thumbnail_url,
              publishedAt: details.published_at,
              viewCount: details.view_count,
              likeCount: details.like_count,
              commentCount: details.comment_count,
              durationSeconds: details.duration_seconds,
              recordingLat: details.recording_lat,
              recordingLng: details.recording_lng,
              recordingLocationDescription: details.recording_location_description,
              analysis,
            }),
          2
        );

        processedVideos += 1;
        if (analysis.locationStatus === "verified_auto" && persistedLocation) {
          mappedVideos += 1;
          mappedViews += Number(details.view_count || 0);
          mappedCountryCodes.add(String(persistedLocation.country_code || "").trim().toUpperCase());
        } else {
          skippedVideos += 1;
        }
      } catch (error) {
        const provider = classifyProviderError(error);
        providerErrors = mergeProviderErrors(providerErrors, provider);
        processedVideos += 1;
        skippedVideos += 1;
        if (videoRecordId) {
          await sql`
            update public.videos
            set
              location_status = 'failed',
              needs_manual_reason = ${`Import error (${provider}): ${String(error instanceof Error ? error.message : error || "unknown").slice(0, 220)}`},
              updated_at = ${new Date().toISOString()}
            where id = ${videoRecordId}
          `;
        }
      }

      if (processedVideos % 5 === 0 || processedVideos === totalVideos) {
        await updateProgress("mapping", uploadChannel.id, {
          youtube_channel_id: source.youtube_channel_id,
          channel_name: source.channel_name,
          channel_handle: source.channel_handle,
          uploads_playlist_id: source.uploads_playlist_id,
        });
      }
    });

    await updateProgress("finalizing", uploadChannel.id, {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    });

    const normalizedLocations = await withRetry(() => loadPrimaryLocations(uploadChannel.id), 2);

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
          totalVideos: eligibleVideoIds.length,
          processedVideos,
          mappedVideos: normalizedLocations.length,
          skippedVideos,
          countriesMapped: new Set(normalizedLocations.map((row) => String(row.country_code || "").trim().toUpperCase()).filter(Boolean)).size,
          totalViews: normalizedLocations.reduce((sum, row) => sum + Number(row.view_count || 0), 0),
          channel: source,
          stage: "completed",
          progress: 1,
          providerErrors,
          importConcurrency,
          maxVideosPerRun,
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
      importedVideos: eligibleVideoIds.length,
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
    const provider = classifyProviderError(error);
    providerErrors = mergeProviderErrors(providerErrors, provider);
    const errorMessage = error instanceof Error ? error.message : "Unknown import error";
    if (activeChannelId) {
      await upsertChannelImportRun({
        importRunId,
        channelId: activeChannelId,
        status: "failed",
        source: "youtube",
        inputPayload: { channelUrl },
        outputPayload: {
          totalVideos,
          processedVideos,
          mappedVideos,
          skippedVideos,
          countriesMapped: mappedCountryCodes.size,
          totalViews: mappedViews,
          stage: "failed",
          progress: totalVideos > 0 ? Number((processedVideos / totalVideos).toFixed(4)) : 0,
          providerErrors,
          importConcurrency,
          maxVideosPerRun,
        },
        errorMessage,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
    } else {
      await sql`
        update public.channel_import_runs
        set
          status = 'failed',
          error_message = ${errorMessage},
          output = ${JSON.stringify({
            stage: "failed",
            providerErrors,
          })}::jsonb,
          finished_at = ${new Date().toISOString()},
          updated_at = ${new Date().toISOString()}
        where id = ${importRunId}
      `;
    }
    throw error;
  }
}

interface QueueRunRow {
  id: string;
  status: string;
  updated_at: string | null;
  user_id: string;
  channel_id: string;
  input: Record<string, unknown> | null;
}

async function loadImportRunForProcessing(runId: string): Promise<QueueRunRow | null> {
  const rows = await sql<QueueRunRow[]>`
    select
      cir.id,
      cir.status::text as status,
      cir.updated_at,
      c.user_id,
      c.id as channel_id,
      cir.input
    from public.channel_import_runs cir
    inner join public.channels c on c.id = cir.channel_id
    where cir.id = ${runId}
    limit 1
  `;
  return rows[0] || null;
}

export async function processYoutubeImportRunById(input: {
  runId: string;
  requestedByUserId?: string | null;
}) {
  const run = await loadImportRunForProcessing(input.runId);
  if (!run) {
    return { handled: false, reason: "run_not_found" as const };
  }

  if (input.requestedByUserId && run.user_id !== input.requestedByUserId) {
    return { handled: false, reason: "forbidden" as const };
  }

  if (run.status === "completed") {
    return { handled: false, reason: "already_completed" as const };
  }

  const staleSeconds = Math.floor(STALE_RUNNING_RUN_MS / 1000);
  const claims = await sql<Array<{ id: string }>>`
    update public.channel_import_runs
    set
      status = 'running',
      error_message = null,
      updated_at = ${new Date().toISOString()}
    where id = ${run.id}
      and (
        status in ('queued', 'failed')
        or (
          status = 'running'
          and updated_at < now() - (${String(staleSeconds)} || ' seconds')::interval
        )
      )
    returning id
  `;
  if (!claims[0]?.id) {
    return { handled: false, reason: "already_processing" as const };
  }

  const channelUrl = String(run.input?.channelUrl || "").trim();
  if (!channelUrl) {
    await sql`
      update public.channel_import_runs
      set
        status = 'failed',
        error_message = 'Missing channelUrl in import input payload.',
        finished_at = ${new Date().toISOString()},
        updated_at = ${new Date().toISOString()}
      where id = ${run.id}
    `;
    return { handled: false, reason: "missing_channel_url" as const };
  }

  await importYoutubeChannel({
    userId: run.user_id,
    channelUrl,
    importRunId: run.id,
  });

  return { handled: true, reason: "processed" as const };
}

export async function processNextQueuedYoutubeImportRun(input?: { requestedByUserId?: string | null }) {
  const staleSeconds = Math.floor(STALE_RUNNING_RUN_MS / 1000);
  const rows = input?.requestedByUserId
    ? await sql<QueueRunRow[]>`
        select
          cir.id,
          cir.status::text as status,
          cir.updated_at,
          c.user_id,
          c.id as channel_id,
          cir.input
        from public.channel_import_runs cir
        inner join public.channels c on c.id = cir.channel_id
        where c.user_id = ${input.requestedByUserId}
          and (
            cir.status = 'queued'
            or cir.status = 'failed'
            or (
              cir.status = 'running'
              and cir.updated_at < now() - (${String(staleSeconds)} || ' seconds')::interval
            )
          )
        order by cir.created_at asc
        limit 1
      `
    : await sql<QueueRunRow[]>`
        select
          cir.id,
          cir.status::text as status,
          cir.updated_at,
          c.user_id,
          c.id as channel_id,
          cir.input
        from public.channel_import_runs cir
        inner join public.channels c on c.id = cir.channel_id
        where (
          cir.status = 'queued'
          or cir.status = 'failed'
          or (
            cir.status = 'running'
            and cir.updated_at < now() - (${String(staleSeconds)} || ' seconds')::interval
          )
        )
        order by cir.created_at asc
        limit 1
      `;

  const selected = rows[0] || null;
  if (!selected) {
    return { handled: false, reason: "no_pending_runs" as const };
  }

  return processYoutubeImportRunById({
    runId: selected.id,
    requestedByUserId: input?.requestedByUserId || null,
  });
}
