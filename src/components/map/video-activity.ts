"use client";

import { useCallback, useEffect, useState } from "react";

export const VIDEO_ACTIVITY_STORAGE_KEYS = {
  seen: "travelyourmap_seen_videos_v1",
  opened: "travelyourmap_opened_videos_v1",
  saved: "travelyourmap_saved_videos_v1",
  featured: "travelyourmap_featured_videos_v1",
} as const;

const LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS = {
  seen: "travelmap_seen_videos_v1",
  opened: "travelmap_opened_videos_v1",
  saved: "travelmap_saved_videos_v1",
  featured: "travelmap_featured_videos_v1",
} as const;

export type VideoActivityTab = "all" | "watched" | "opened" | "saved" | "featured";

export type VideoActivityController = {
  seenIds: Set<string>;
  openedIds: Set<string>;
  savedIds: Set<string>;
  featuredIds: Set<string>;
  markVideoOpened: (videoId: string | null | undefined) => void;
  toggleVideoSaved: (videoId: string | null | undefined) => void;
  toggleVideoFeatured: (videoId: string | null | undefined) => void;
};

type StorageKey = (typeof VIDEO_ACTIVITY_STORAGE_KEYS)[keyof typeof VIDEO_ACTIVITY_STORAGE_KEYS];

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

export function useLocalVideoActivity(): VideoActivityController {
  const [seenIds, setSeenIds] = useState<Set<string>>(() =>
    readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.seen, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.seen)
  );
  const [openedIds, setOpenedIds] = useState<Set<string>>(() =>
    readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.opened, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.opened)
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(() =>
    readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved)
  );
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(() =>
    readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.featured, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured)
  );

  useEffect(() => {
    setSeenIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.seen, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.seen));
    setOpenedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.opened, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.opened));
    setSavedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved));
    setFeaturedIds(readStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.featured, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured));
  }, []);

  const markVideoOpened = useCallback((videoId: string | null | undefined) => {
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
  }, []);

  const toggleVideoSaved = useCallback((videoId: string | null | undefined) => {
    setSavedIds((current) => {
      const next = toggleId(current, videoId);
      if (next !== current) writeStoredIds(VIDEO_ACTIVITY_STORAGE_KEYS.saved, LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.saved, next);
      return next;
    });
  }, []);

  const toggleVideoFeatured = useCallback((videoId: string | null | undefined) => {
    setFeaturedIds((current) => {
      const next = toggleId(current, videoId);
      if (next !== current) writeStoredIds(
        VIDEO_ACTIVITY_STORAGE_KEYS.featured,
        LEGACY_VIDEO_ACTIVITY_STORAGE_KEYS.featured,
        next
      );
      return next;
    });
  }, []);

  return {
    seenIds,
    openedIds,
    savedIds,
    featuredIds,
    markVideoOpened,
    toggleVideoSaved,
    toggleVideoFeatured,
  };
}
