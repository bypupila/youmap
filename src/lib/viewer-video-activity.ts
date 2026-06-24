import { sql } from "@/lib/neon";
import { normalizeAttributionChannelId } from "@/lib/creator-viewer-subscriptions";
import { columnExists } from "@/lib/db-schema";

export const VIEWER_VIDEO_WATCH_STATUSES = ["not_started", "not_finished", "watched", "watch_later"] as const;

export type ViewerVideoWatchStatus = (typeof VIEWER_VIDEO_WATCH_STATUSES)[number];

export interface ViewerVideoActivityChange {
  youtubeVideoId: string;
  saved?: boolean | null;
  favorite?: boolean | null;
  watchStatus?: ViewerVideoWatchStatus | null;
  markSeen?: boolean | null;
  markOpened?: boolean | null;
  markStarted?: boolean | null;
  lastPositionSeconds?: number | null;
  watchedSeconds?: number | null;
  durationSeconds?: number | null;
}

export interface ViewerVideoActivityItem {
  youtubeVideoId: string;
  saved: boolean;
  favorite: boolean;
  watchStatus: ViewerVideoWatchStatus;
  seenAt: string | null;
  openedAt: string | null;
  lastStartedAt: string | null;
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  progressUpdatedAt: string | null;
}

export function normalizeViewerVideoWatchStatus(value?: string | null): ViewerVideoWatchStatus | null {
  return VIEWER_VIDEO_WATCH_STATUSES.includes(value as ViewerVideoWatchStatus)
    ? (value as ViewerVideoWatchStatus)
    : null;
}

function normalizeYoutubeVideoId(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 64) : null;
}

function normalizePlaybackSeconds(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(604800, Math.round(value)));
}

async function viewerVideoProgressColumnsExist() {
  const checks = await Promise.all([
    columnExists("public", "viewer_video_activity", "last_position_seconds"),
    columnExists("public", "viewer_video_activity", "watched_seconds"),
    columnExists("public", "viewer_video_activity", "duration_seconds"),
    columnExists("public", "viewer_video_activity", "progress_updated_at"),
  ]);
  return checks.every(Boolean);
}

export async function loadViewerVideoActivity({
  userId,
  channelId,
}: {
  userId: string;
  channelId: string;
}): Promise<ViewerVideoActivityItem[]> {
  const normalizedChannelId = normalizeAttributionChannelId(channelId);
  if (!normalizedChannelId || !normalizeAttributionChannelId(userId)) return [];

  type ActivityRow = {
    youtube_video_id: string;
    saved: boolean | null;
    favorite: boolean | null;
    watch_status: string | null;
    seen_at: string | null;
    opened_at: string | null;
    last_started_at: string | null;
    last_position_seconds?: number | null;
    watched_seconds?: number | null;
    duration_seconds?: number | null;
    progress_updated_at?: string | null;
  };

  const hasProgressColumns = await viewerVideoProgressColumnsExist();
  const rows = hasProgressColumns
    ? await sql<ActivityRow[]>`
        select
          youtube_video_id,
          saved,
          favorite,
          watch_status,
          seen_at,
          opened_at,
          last_started_at,
          last_position_seconds,
          watched_seconds,
          duration_seconds,
          progress_updated_at
        from public.viewer_video_activity
        where user_id = ${userId}
          and channel_id = ${normalizedChannelId}
        order by updated_at desc
        limit 5000
      `
    : await sql<ActivityRow[]>`
        select
          youtube_video_id,
          saved,
          favorite,
          watch_status,
          seen_at,
          opened_at,
          last_started_at
        from public.viewer_video_activity
        where user_id = ${userId}
          and channel_id = ${normalizedChannelId}
        order by updated_at desc
        limit 5000
      `;

  return rows.map((row) => ({
    youtubeVideoId: row.youtube_video_id,
    saved: Boolean(row.saved),
    favorite: Boolean(row.favorite),
    watchStatus: normalizeViewerVideoWatchStatus(row.watch_status) || "not_started",
    seenAt: row.seen_at || null,
    openedAt: row.opened_at || null,
    lastStartedAt: row.last_started_at || null,
    lastPositionSeconds: Number(row.last_position_seconds || 0),
    watchedSeconds: Number(row.watched_seconds || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    progressUpdatedAt: row.progress_updated_at || null,
  }));
}

export async function upsertViewerVideoActivity({
  userId,
  channelId,
  changes,
}: {
  userId: string;
  channelId: string;
  changes: ViewerVideoActivityChange[];
}) {
  const normalizedChannelId = normalizeAttributionChannelId(channelId);
  if (!normalizedChannelId || !normalizeAttributionChannelId(userId)) return { updated: 0 };

  let updated = 0;
  for (const change of changes.slice(0, 250)) {
    const youtubeVideoId = normalizeYoutubeVideoId(change.youtubeVideoId);
    if (!youtubeVideoId) continue;

    const saved = typeof change.saved === "boolean" ? change.saved : null;
    const favorite = typeof change.favorite === "boolean" ? change.favorite : null;
    const watchStatus = normalizeViewerVideoWatchStatus(change.watchStatus || null);
    const markSeen = Boolean(change.markSeen || change.markOpened || change.markStarted);
    const markOpened = Boolean(change.markOpened);
    const markStarted = Boolean(change.markStarted);
    const lastPositionSeconds = normalizePlaybackSeconds(change.lastPositionSeconds ?? null);
    const watchedSeconds = normalizePlaybackSeconds(change.watchedSeconds ?? null);
    const durationSeconds = normalizePlaybackSeconds(change.durationSeconds ?? null);
    const hasPlaybackProgress = lastPositionSeconds !== null || watchedSeconds !== null || durationSeconds !== null;

    if (hasPlaybackProgress && await viewerVideoProgressColumnsExist()) {
      await sql`
        insert into public.viewer_video_activity (
          user_id,
          channel_id,
          youtube_video_id,
          saved,
          favorite,
          watch_status,
          seen_at,
          opened_at,
          last_started_at,
          last_position_seconds,
          watched_seconds,
          duration_seconds,
          progress_updated_at,
          updated_at
        )
        values (
          ${userId},
          ${normalizedChannelId},
          ${youtubeVideoId},
          ${saved ?? false},
          ${favorite ?? false},
          ${watchStatus || "not_started"},
          ${markSeen ? new Date().toISOString() : null},
          ${markOpened ? new Date().toISOString() : null},
          ${markStarted ? new Date().toISOString() : null},
          ${lastPositionSeconds ?? 0},
          ${watchedSeconds ?? 0},
          ${durationSeconds ?? 0},
          now(),
          now()
        )
        on conflict (user_id, channel_id, youtube_video_id)
        do update set
          saved = coalesce(${saved}, public.viewer_video_activity.saved),
          favorite = coalesce(${favorite}, public.viewer_video_activity.favorite),
          watch_status = coalesce(${watchStatus}, public.viewer_video_activity.watch_status),
          seen_at = case
            when ${markSeen} then coalesce(public.viewer_video_activity.seen_at, now())
            else public.viewer_video_activity.seen_at
          end,
          opened_at = case
            when ${markOpened} then coalesce(public.viewer_video_activity.opened_at, now())
            else public.viewer_video_activity.opened_at
          end,
          last_started_at = case
            when ${markStarted} then now()
            else public.viewer_video_activity.last_started_at
          end,
          last_position_seconds = coalesce(${lastPositionSeconds}, public.viewer_video_activity.last_position_seconds),
          watched_seconds = greatest(coalesce(${watchedSeconds}, public.viewer_video_activity.watched_seconds), public.viewer_video_activity.watched_seconds),
          duration_seconds = greatest(coalesce(${durationSeconds}, public.viewer_video_activity.duration_seconds), public.viewer_video_activity.duration_seconds),
          progress_updated_at = case
            when ${hasPlaybackProgress} then now()
            else public.viewer_video_activity.progress_updated_at
          end,
          updated_at = now()
      `;
      updated += 1;
      continue;
    }

    await sql`
      insert into public.viewer_video_activity (
        user_id,
        channel_id,
        youtube_video_id,
        saved,
        favorite,
        watch_status,
        seen_at,
        opened_at,
        last_started_at,
        updated_at
      )
      values (
        ${userId},
        ${normalizedChannelId},
        ${youtubeVideoId},
        ${saved ?? false},
        ${favorite ?? false},
        ${watchStatus || "not_started"},
        ${markSeen ? new Date().toISOString() : null},
        ${markOpened ? new Date().toISOString() : null},
        ${markStarted ? new Date().toISOString() : null},
        now()
      )
      on conflict (user_id, channel_id, youtube_video_id)
      do update set
        saved = coalesce(${saved}, public.viewer_video_activity.saved),
        favorite = coalesce(${favorite}, public.viewer_video_activity.favorite),
        watch_status = coalesce(${watchStatus}, public.viewer_video_activity.watch_status),
        seen_at = case
          when ${markSeen} then coalesce(public.viewer_video_activity.seen_at, now())
          else public.viewer_video_activity.seen_at
        end,
        opened_at = case
          when ${markOpened} then coalesce(public.viewer_video_activity.opened_at, now())
          else public.viewer_video_activity.opened_at
        end,
        last_started_at = case
          when ${markStarted} then now()
          else public.viewer_video_activity.last_started_at
        end,
        updated_at = now()
    `;
    updated += 1;
  }

  return { updated };
}
