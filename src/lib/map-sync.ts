import { randomUUID } from "crypto";
import type { ManualVerificationItem } from "@/lib/map-data";
import type { TravelVideoLocation } from "@/lib/types";
import { sql } from "@/lib/neon";
import { analyzeVideoLocation, confirmManualLocationWithPrecision, persistVideoAnalysis } from "@/lib/video-location-engine";
import { loadChannelPlaylistSignals, loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";

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

async function getManualQueue(channelId: string): Promise<ManualVerificationItem[]> {
  const data = await sql<Array<{
    id: string;
    youtube_video_id: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
    location_status: string | null;
    needs_manual_reason: string | null;
  }>>`
    select id, youtube_video_id, title, thumbnail_url, published_at, location_status, needs_manual_reason
    from public.videos
    where channel_id = ${channelId}
      and (
        location_status = 'needs_manual'
        or (
          coalesce(is_travel, true) = true
          and coalesce(is_short, false) = false
          and location_status in ('no_location', 'failed')
        )
      )
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
    needs_manual_reason:
      row.needs_manual_reason ||
      (row.location_status === "failed"
        ? "No se pudo geocodificar automaticamente la ubicacion detectada."
        : "No se pudo verificar automaticamente."),
  }));
}

async function upsertVideoSkeleton(input: {
  channelId: string;
  youtubeVideoId: string;
  details: Awaited<ReturnType<typeof loadVideoDetails>> extends Map<string, infer T> ? T : never;
  sourcePayload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const inserted = await sql<Array<{ id: string }>>`
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
      recording_lat,
      recording_lng,
      recording_location_description,
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
      ${input.details?.recording_lat ?? null},
      ${input.details?.recording_lng ?? null},
      ${input.details?.recording_location_description ?? null},
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
      recording_lat = excluded.recording_lat,
      recording_lng = excluded.recording_lng,
      recording_location_description = excluded.recording_location_description,
      source_payload = excluded.source_payload,
      updated_at = excluded.updated_at
    returning id
  `;
  const row = inserted[0];
  if (!row?.id) throw new Error(`No se pudo guardar el video ${input.youtubeVideoId}.`);
  return row.id;
}

async function loadChannelSyncContext(channelId: string) {
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
    where id = ${channelId}
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
  const detailsMap = youtubeIds.length ? await loadVideoDetails(youtubeIds) : new Map();
  const playlistSignalMap = source.youtube_channel_id ? await loadChannelPlaylistSignals(source.youtube_channel_id) : new Map();

  return {
    channelRow,
    source,
    playlistVideos,
    youtubeIds,
    detailsMap,
    playlistSignalMap,
  };
}

export async function syncChannelIncremental(input: { channelId: string }): Promise<MapSyncSummary> {
  const now = new Date().toISOString();
  const runId = randomUUID();

  await sql`
    insert into public.map_sync_runs (id, channel_id, status, source, started_at, input, output)
    values (${runId}, ${input.channelId}, 'running', 'manual_refresh', ${now}, '{}'::jsonb, '{}'::jsonb)
  `;

  try {
    const context = await loadChannelSyncContext(input.channelId);
    const nonShortVideoIds = context.youtubeIds.filter((youtubeVideoId) => !context.detailsMap.get(youtubeVideoId)?.is_short);
    const excludedShorts = context.youtubeIds.length - nonShortVideoIds.length;

    const existingVideos = nonShortVideoIds.length
      ? await sql<Array<{ youtube_video_id: string }>>`
          select youtube_video_id
          from public.videos
          where channel_id = ${input.channelId}
            and youtube_video_id = any(${nonShortVideoIds})
        `
      : [];

    const existingIdSet = new Set(existingVideos.map((row) => row.youtube_video_id));
    const newVideoIds = nonShortVideoIds.filter((youtubeVideoId) => !existingIdSet.has(youtubeVideoId));

    let verifiedAuto = 0;
    let needsManual = 0;
    let excludedNonTravel = 0;

    await processVideosInBatches(newVideoIds, 3, async (youtubeVideoId) => {
      const details = context.detailsMap.get(youtubeVideoId);
      if (!details) return;

      const videoRecordId = await upsertVideoSkeleton({
        channelId: input.channelId,
        youtubeVideoId,
        details,
        sourcePayload: {
          video_details: details.raw || null,
        },
      });

      const analysis = await analyzeVideoLocation({
        channelName: context.channelRow.channel_name || context.source.channel_name,
        channelDescription: context.channelRow.description || context.source.description || null,
        youtubeVideoId,
        title: details.title,
        description: details.description,
        publishedAt: details.published_at,
        playlistSignals: context.playlistSignalMap.get(youtubeVideoId) || [],
        recordingLat: details.recording_lat,
        recordingLng: details.recording_lng,
        recordingLocationDescription: details.recording_location_description,
        mode: "incremental",
      });

      await persistVideoAnalysis({
        channelId: input.channelId,
        videoRecordId,
        youtubeVideoId,
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
      });

      if (!analysis.isTravel) {
        excludedNonTravel += 1;
        return;
      }

      if (analysis.locationStatus === "verified_auto") {
        verifiedAuto += 1;
        return;
      }

      if (analysis.locationStatus === "needs_manual") {
        needsManual += 1;
      }
    });

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
          videos_verified_manual: 0,
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

export async function secondCheckManualQueue(input: { channelId: string }): Promise<MapSyncSummary> {
  const now = new Date().toISOString();
  const runId = randomUUID();

  await sql`
    insert into public.map_sync_runs (id, channel_id, status, source, started_at, input, output)
    values (${runId}, ${input.channelId}, 'running', 'manual_second_check', ${now}, '{}'::jsonb, '{}'::jsonb)
  `;

  try {
    const context = await loadChannelSyncContext(input.channelId);
    const manualRows = await sql<
      Array<{
        id: string;
        youtube_video_id: string;
      }>
    >`
      select id, youtube_video_id
      from public.videos
      where channel_id = ${input.channelId}
        and coalesce(is_travel, true) = true
        and coalesce(is_short, false) = false
        and location_status in ('needs_manual', 'no_location', 'failed')
      order by published_at desc
      limit 250
    `;

    let verifiedAuto = 0;
    let needsManual = 0;
    let excludedNonTravel = 0;

    await processVideosInBatches(manualRows, 3, async (row) => {
      const details = context.detailsMap.get(row.youtube_video_id);
      if (!details) return;

      const analysis = await analyzeVideoLocation({
        channelName: context.channelRow.channel_name || context.source.channel_name,
        channelDescription: context.channelRow.description || context.source.description || null,
        youtubeVideoId: row.youtube_video_id,
        title: details.title,
        description: details.description,
        publishedAt: details.published_at,
        playlistSignals: context.playlistSignalMap.get(row.youtube_video_id) || [],
        recordingLat: details.recording_lat,
        recordingLng: details.recording_lng,
        recordingLocationDescription: details.recording_location_description,
        mode: "second_check",
      });

      await persistVideoAnalysis({
        channelId: input.channelId,
        videoRecordId: row.id,
        youtubeVideoId: row.youtube_video_id,
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
      });

      if (!analysis.isTravel) {
        excludedNonTravel += 1;
      } else if (analysis.locationStatus === "verified_auto") {
        verifiedAuto += 1;
      } else if (analysis.locationStatus === "needs_manual") {
        needsManual += 1;
      }
    });

    const manualQueue = await getManualQueue(input.channelId);
    const finishedAt = new Date().toISOString();

    await sql`
      update public.map_sync_runs
      set
        status = 'completed',
        videos_scanned = ${manualRows.length},
        videos_extracted = ${manualRows.length},
        videos_verified_auto = ${verifiedAuto},
        videos_needs_manual = ${needsManual},
        videos_verified_manual = 0,
        output = ${JSON.stringify({
          videos_scanned: manualRows.length,
          videos_extracted: manualRows.length,
          videos_verified_auto: verifiedAuto,
          videos_needs_manual: needsManual,
          videos_verified_manual: 0,
          excluded_shorts: 0,
          excluded_non_travel: excludedNonTravel,
          manual_queue: manualQueue.length,
        })}::jsonb,
        finished_at = ${finishedAt},
        updated_at = ${finishedAt}
      where id = ${runId}
    `;

    return {
      runId,
      videos_scanned: manualRows.length,
      videos_extracted: manualRows.length,
      videos_verified_auto: verifiedAuto,
      videos_needs_manual: needsManual,
      videos_verified_manual: 0,
      excluded_shorts: 0,
      excluded_non_travel: excludedNonTravel,
      manualQueue,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await sql`
      update public.map_sync_runs
      set
        status = 'failed',
        error_message = ${error instanceof Error ? error.message : "Second check failed"},
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
  city?: string | null;
}): Promise<TravelVideoLocation> {
  return confirmManualLocationWithPrecision(input);
}
