"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const VIDEO_ACTIVITY_STORAGE_KEYS = {
  seen: "travelyourmap_seen_videos_v1",
  opened: "travelyourmap_opened_videos_v1",
  saved: "travelyourmap_saved_videos_v1",
  featured: "travelyourmap_featured_videos_v1",
  watchStatus: "travelyourmap_watch_status_v1",
  playbackProgress: "travelyourmap_playback_progress_v1",
} as const;

const LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS = {
  seen: "travelmap_seen_videos_v1",
  opened: "travelmap_opened_videos_v1",
  saved: "travelmap_saved_videos_v1",
  featured: "travelmap_featured_videos_v1",
} as const;

export type VideoActivityTab = "all" | "watched" | "opened" | "saved" | "featured" | "watch_later" | "incomplete";
export type VideoWatchStatus = "not_started" | "not_finished" | "watched" | "watch_later";
export type VideoPlaybackProgress = {
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  updatedAt: string | null;
};

export type VideoActivityController = {
  seenIds: Set<string>;
  openedIds: Set<string>;
  savedIds: Set<string>;
  featuredIds: Set<string>;
  watchStatusById: Record<string, VideoWatchStatus>;
  playbackProgressById: Record<string, VideoPlaybackProgress>;
  markVideoStarted: (videoId: string | null | undefined) => void;
  markVideoOpened: (videoId: string | null | undefined) => void;
  toggleVideoSaved: (videoId: string | null | undefined) => void;
  toggleVideoFeatured: (videoId: string | null | undefined) => void;
  setVideoWatchStatus: (videoId: string | null | undefined, status: VideoWatchStatus) => void;
  updateVideoPlaybackProgress: (
    videoId: string | null | undefined,
    progress: Partial<Omit<VideoPlaybackProgress, "updatedAt"> & { watchedDeltaSeconds: number }>
  ) => void;
};

type StorageKey = (typeof VIDEO_ACTIVITY_STORAGE_KEYS)[keyof typeof VIDEO_ACTIVITY_STORAGE_KEYS];
type UseVideoActivityOptions = {
  channelId?: string | null;
  persistToProfile?: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function normalizePersistedChannelId(value?: string | null) {
  const normalized = String(value || "").trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function parseStoredIds(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return new Set<string>();
  return new Set(parsed.map((value) => String(value || "").trim()).filter(Boolean));
}

function readStoredIds(key: StorageKey, legacyKey: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return parseStoredIds(raw);

    const legacyRaw = window.localStorage.getItem(legacyKey);
    if (!legacyRaw) return new Set<string>();

    const ids = parseStoredIds(legacyRaw);
    if (ids.size > 0) {
      const payload = JSON.stringify(Array.from(ids));
      window.localStorage.setItem(key, payload);
      window.localStorage.setItem(legacyKey, payload);
    }
    return ids;
  } catch {
    return new Set<string>();
  }
}

function writeStoredIds(key: StorageKey, legacyKey: string, ids: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const payload = JSON.stringify(Array.from(ids));
    window.localStorage.setItem(key, payload);
    window.localStorage.setItem(legacyKey, payload);
  } catch {
    // Local video activity is a progressive enhancement only.
  }
}

function addId(current: Set<string>, videoId: string | null | undefined) {
  const normalized = String(videoId || "").trim();
  if (!normalized || current.has(normalized)) return current;
  const next = new Set(current);
  next.add(normalized);
  return next;
}

function toggleId(current: Set<string>, videoId: string | null | undefined) {
  const normalized = String(videoId || "").trim();
  if (!normalized) return current;
  const next = new Set(current);
  if (next.has(normalized)) {
    next.delete(normalized);
  } else {
    next.add(normalized);
  }
  return next;
}

function readWatchStatusById() {
  if (typeof window === "undefined") return {} as Record<string, VideoWatchStatus>;
  try {
    const raw = window.localStorage.getItem(VIDEO_ACTIVITY_STORAGE_KEYS.watchStatus);
    if (!raw) return {} as Record<string, VideoWatchStatus>;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {} as Record<string, VideoWatchStatus>;
    const next: Record<string, VideoWatchStatus> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key) continue;
      if (value === "watched" || value === "not_started" || value === "not_finished" || value === "watch_later") next[key] = value;
    }
    return next;
  } catch {
    return {} as Record<string, VideoWatchStatus>;
  }
}

function writeWatchStatusById(value: Record<string, VideoWatchStatus>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIDEO_ACTIVITY_STORAGE_KEYS.watchStatus, JSON.stringify(value));
  } catch {
    // Progressive enhancement only.
  }
}

function normalizeSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(604800, Math.round(seconds)));
}

function readPlaybackProgressById() {
  if (typeof window === "undefined") return {} as Record<string, VideoPlaybackProgress>;
  try {
    const raw = window.localStorage.getItem(VIDEO_ACTIVITY_STORAGE_KEYS.playbackProgress);
    if (!raw) return {} as Record<string, VideoPlaybackProgress>;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {} as Record<string, VideoPlaybackProgress>;
    const next: Record<string, VideoPlaybackProgress> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key || !value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      next[key] = {
        lastPositionSeconds: normalizeSeconds(row.lastPositionSeconds),
        watchedSeconds: normalizeSeconds(row.watchedSeconds),
        durationSeconds: normalizeSeconds(row.durationSeconds),
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null,
      };
    }
    return next;
  } catch {
    return {} as Record<string, VideoPlaybackProgress>;
  }
}

function writePlaybackProgressById(value: Record<string, VideoPlaybackProgress>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIDEO_ACTIVITY_STORAGE_KEYS.playbackProgress, JSON.stringify(value));
  } catch {
    // Progressive enhancement only.
  }
}

function syncViewerVideoActivity(
  channelId: string | null,
  changes: Array<{
    youtubeVideoId: string;
    saved?: boolean;
    favorite?: boolean;
    watchStatus?: VideoWatchStatus;
    markSeen?: boolean;
    markOpened?: boolean;
    markStarted?: boolean;
    lastPositionSeconds?: number;
    watchedSeconds?: number;
    durationSeconds?: number;
  }>
) {
  if (!channelId || changes.length === 0) return;
  void fetch("/api/viewer/video-activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId, changes }),
    keepalive: true,
  }).catch(() => undefined);
}

function buildLocalProfileSyncChanges() {
  const savedIds = readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved);
  const favoriteIds = readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.featured, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured);
  const watchStatusById = readWatchStatusById();
  const playbackProgressById = readPlaybackProgressById();
  const videoIds = new Set<string>([
    ...Array.from(savedIds),
    ...Array.from(favoriteIds),
    ...Object.keys(watchStatusById),
    ...Object.keys(playbackProgressById),
  ]);

  return Array.from(videoIds).map((youtubeVideoId) => ({
    youtubeVideoId,
    saved: savedIds.has(youtubeVideoId),
    favorite: favoriteIds.has(youtubeVideoId),
    watchStatus: watchStatusById[youtubeVideoId] || "not_started",
    lastPositionSeconds: playbackProgressById[youtubeVideoId]?.lastPositionSeconds,
    watchedSeconds: playbackProgressById[youtubeVideoId]?.watchedSeconds,
    durationSeconds: playbackProgressById[youtubeVideoId]?.durationSeconds,
  }));
}

export function useLocalVideoActivity(options: UseVideoActivityOptions = {}): VideoActivityController {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [watchStatusById, setWatchStatusById] = useState<Record<string, VideoWatchStatus>>({});
  const [playbackProgressById, setPlaybackProgressById] = useState<Record<string, VideoPlaybackProgress>>({});
  const playbackProgressByIdRef = useRef<Record<string, VideoPlaybackProgress>>({});
  const persistedChannelId = normalizePersistedChannelId(options.channelId);
  const shouldPersistToProfile = Boolean(options.persistToProfile && persistedChannelId);

  useEffect(() => {
    setSeenIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.seen, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.seen));
    setOpenedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.opened, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.opened));
    setSavedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved));
    setFeaturedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.featured, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured));
    setWatchStatusById(readWatchStatusById());
    const storedPlaybackProgress = readPlaybackProgressById();
    playbackProgressByIdRef.current = storedPlaybackProgress;
    setPlaybackProgressById(storedPlaybackProgress);
  }, []);

  useEffect(() => {
    if (!shouldPersistToProfile || !persistedChannelId) return;
    let active = true;

    fetch(`/api/viewer/video-activity?channelId=${encodeURIComponent(persistedChannelId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload || !Array.isArray(payload.items)) return;
        const serverSaved = new Set<string>();
        const serverFeatured = new Set<string>();
        const serverWatchStatus: Record<string, VideoWatchStatus> = {};
        const serverPlaybackProgress: Record<string, VideoPlaybackProgress> = {};

        for (const item of payload.items as Array<{
          youtubeVideoId?: string;
          saved?: boolean;
          favorite?: boolean;
          watchStatus?: VideoWatchStatus;
          lastPositionSeconds?: number;
          watchedSeconds?: number;
          durationSeconds?: number;
          progressUpdatedAt?: string | null;
        }>) {
          const videoId = String(item.youtubeVideoId || "").trim();
          if (!videoId) continue;
          if (item.saved) serverSaved.add(videoId);
          if (item.favorite) serverFeatured.add(videoId);
          if (item.watchStatus) serverWatchStatus[videoId] = item.watchStatus;
          if (item.lastPositionSeconds || item.watchedSeconds || item.durationSeconds) {
            serverPlaybackProgress[videoId] = {
              lastPositionSeconds: normalizeSeconds(item.lastPositionSeconds),
              watchedSeconds: normalizeSeconds(item.watchedSeconds),
              durationSeconds: normalizeSeconds(item.durationSeconds),
              updatedAt: item.progressUpdatedAt || null,
            };
          }
        }

        setSavedIds((current) => {
          const next = new Set([...Array.from(serverSaved), ...Array.from(current)]);
          writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved, next);
          return next;
        });
        setFeaturedIds((current) => {
          const next = new Set([...Array.from(serverFeatured), ...Array.from(current)]);
          writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.featured, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured, next);
          return next;
        });
        setWatchStatusById((current) => {
          const next = { ...serverWatchStatus, ...current };
          writeWatchStatusById(next);
          return next;
        });
        setPlaybackProgressById((current) => {
          const next = { ...serverPlaybackProgress, ...current };
          playbackProgressByIdRef.current = next;
          writePlaybackProgressById(next);
          return next;
        });

        syncViewerVideoActivity(persistedChannelId, buildLocalProfileSyncChanges());
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [persistedChannelId, shouldPersistToProfile]);

  const markVideoStarted = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    setSeenIds((current) => {
      const next = addId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.seen, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.seen, next);
      return next;
    });
    setOpenedIds((current) => {
      const next = addId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.opened, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.opened, next);
      return next;
    });
    if (!normalized) return;
    setWatchStatusById((current) => {
      if (current[normalized] === "watched") return current;
      if (current[normalized] === "not_finished") return current;
      const next = { ...current, [normalized]: "not_finished" as VideoWatchStatus };
      writeWatchStatusById(next);
      return next;
    });
    if (shouldPersistToProfile) {
      syncViewerVideoActivity(persistedChannelId, [{
        youtubeVideoId: normalized,
        watchStatus: "not_finished",
        markSeen: true,
        markOpened: true,
        markStarted: true,
      }]);
    }
  }, [persistedChannelId, shouldPersistToProfile]);

  const markVideoOpened = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    setSeenIds((current) => {
      const next = addId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.seen, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.seen, next);
      return next;
    });
    setOpenedIds((current) => {
      const next = addId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.opened, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.opened, next);
      return next;
    });
    if (normalized && shouldPersistToProfile) {
      syncViewerVideoActivity(persistedChannelId, [{
        youtubeVideoId: normalized,
        markSeen: true,
        markOpened: true,
      }]);
    }
  }, [persistedChannelId, shouldPersistToProfile]);

  const toggleVideoSaved = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    setSavedIds((current) => {
      const next = toggleId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved, next);
      if (normalized && next !== current && shouldPersistToProfile) {
        syncViewerVideoActivity(persistedChannelId, [{ youtubeVideoId: normalized, saved: next.has(normalized) }]);
      }
      return next;
    });
  }, [persistedChannelId, shouldPersistToProfile]);

  const toggleVideoFeatured = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    setFeaturedIds((current) => {
      const next = toggleId(current, videoId);
      if (next !== current) writeStoredIds(
        VIDEO_ACTIVITY_STORAGE_KEYS.featured,
        LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured,
        next
      );
      if (normalized && next !== current && shouldPersistToProfile) {
        syncViewerVideoActivity(persistedChannelId, [{ youtubeVideoId: normalized, favorite: next.has(normalized) }]);
      }
      return next;
    });
  }, [persistedChannelId, shouldPersistToProfile]);

  const setVideoWatchStatus = useCallback((videoId: string | null | undefined, status: VideoWatchStatus) => {
    const normalized = String(videoId || "").trim();
    if (!normalized) return;
    setWatchStatusById((current) => {
      if (current[normalized] === status) return current;
      const next = { ...current, [normalized]: status };
      writeWatchStatusById(next);
      return next;
    });
    if (shouldPersistToProfile) {
      syncViewerVideoActivity(persistedChannelId, [{
        youtubeVideoId: normalized,
        watchStatus: status,
        markSeen: status !== "not_started",
      }]);
    }
  }, [persistedChannelId, shouldPersistToProfile]);

  const updateVideoPlaybackProgress = useCallback((
    videoId: string | null | undefined,
    progress: Partial<Omit<VideoPlaybackProgress, "updatedAt"> & { watchedDeltaSeconds: number }>
  ) => {
    const normalized = String(videoId || "").trim();
    if (!normalized) return;

    const previousProgressById = playbackProgressByIdRef.current;
    const previous = previousProgressById[normalized];
    const watchedDeltaSeconds = normalizeSeconds(progress.watchedDeltaSeconds);
    const watchedSeconds = watchedDeltaSeconds > 0
      ? (previous?.watchedSeconds || 0) + watchedDeltaSeconds
      : normalizeSeconds(progress.watchedSeconds);
    const merged = {
      lastPositionSeconds: normalizeSeconds(progress.lastPositionSeconds),
      watchedSeconds: Math.max(previous?.watchedSeconds || 0, watchedSeconds),
      durationSeconds: Math.max(previous?.durationSeconds || 0, normalizeSeconds(progress.durationSeconds)),
      updatedAt: new Date().toISOString(),
    } satisfies VideoPlaybackProgress;

    const next = { ...previousProgressById, [normalized]: merged };
    playbackProgressByIdRef.current = next;
    writePlaybackProgressById(next);
    setPlaybackProgressById(next);

    if (shouldPersistToProfile) {
      syncViewerVideoActivity(persistedChannelId, [{
        youtubeVideoId: normalized,
        lastPositionSeconds: merged.lastPositionSeconds,
        watchedSeconds: merged.watchedSeconds,
        durationSeconds: merged.durationSeconds,
      }]);
    }
  }, [persistedChannelId, shouldPersistToProfile]);

  return {
    seenIds,
    openedIds,
    savedIds,
    featuredIds,
    watchStatusById,
    playbackProgressById,
    markVideoStarted,
    markVideoOpened,
    toggleVideoSaved,
    toggleVideoFeatured,
    setVideoWatchStatus,
    updateVideoPlaybackProgress,
  };
}
