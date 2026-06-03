import { sql } from "@/lib/neon";
import { normalizeAttributionChannelId } from "@/lib/creator-viewer-subscriptions";

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
}

export interface ViewerVideoActivityItem {
  youtubeVideoId: string;
  saved: boolean;
  favorite: boolean;
  watchStatus: ViewerVideoWatchStatus;
  seenAt: string | null;
  openedAt: string | null;
  lastStartedAt: string | null;
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

export async function loadViewerVideoActivity({
  userId,
  channelId,
}: {
  userId: string;
  channelId: string;
}): Promise<ViewerVideoActivityItem[]> {
  const normalizedChannelId = normalizeAttributionChannelId(channelId);
  if (!normalizedChannelId || !normalizeAttributionChannelId(userId)) return [];

  const rows = await sql<
    Array<{
      youtube_video_id: string;
      saved: boolean | null;
      favorite: boolean | null;
      watch_status: string | null;
      seen_at: string | null;
      opened_at: string | null;
      last_started_at: string | null;
    }>
  >`
    select youtube_video_id, saved, favorite, watch_status, seen_at, opened_at, last_started_at
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
