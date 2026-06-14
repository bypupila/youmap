"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowsOutSimple,
  BookmarkSimple,
  CaretDown,
  CheckCircle,
  Clock,
  Compass,
  CopySimple,
  Eye,
  FunnelSimple,
  GlobeHemisphereWest,
  Heart,
  List,
  MagnifyingGlass,
  MapPin,
  SquaresFour,
  Star,
  Users,
  UsersThree,
  Video,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { TravelGlobe } from "@/components/travel-globe";
import { DesktopVideoMapCard } from "@/components/map/desktop-video-map-card";
import { useLocalVideoActivity, type VideoActivityController } from "@/components/map/video-activity";
import { VideoSelectionSheet } from "@/components/map/video-selection-sheet";
import { getCountryNameInSpanish } from "@/components/map/video-viewer-utils";

type ContentFilterWindow = "all" | "365" | "90" | "30";
type ActivityFilter = "all" | "favorites" | "saved" | "watched" | "watch_later" | "incomplete";
type LocalVotePrompt = {
  countryCode: string;
  countryName: string;
};

type VideoPlaybackState = "playing" | "paused" | "ended";

type VideoExitPromptState = {
  videoId: string;
  title: string;
  action: () => void;
};

type PlaybackTrackerState = {
  videoId: string | null;
  startedAtMs: number | null;
  elapsedMsById: Record<string, number>;
};
type ExternalYoutubeOpenState = {
  videoId: string;
  title: string;
  openedAtMs: number;
};

interface MapProposalPrototype2Props {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

type SidebarCountryItem = {
  code: string;
  name: string;
  count: number;
  watchedCount: number;
  activeCount: number;
  progress: number;
};

type ProposalAnalytics = {
  countries: number;
  cities: number;
  videos: number;
  exploredPlaces: number;
  watchedHours: number;
  visitedCountries: number;
  reactions: number;
};

type ProposalVideoWatchState = "watched" | "incomplete" | "watch_later" | "none";
type CountrySortMode = "seen" | "alphabetical";

function countryCodeToFlag(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌍";
  return String.fromCodePoint(
    normalized.charCodeAt(0) + 127397,
    normalized.charCodeAt(1) + 127397
  );
}

function formatCompactMetric(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(Math.round(value));
}

function normalizeSortLabel(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function stableTextCompare(a: string, b: string) {
  const aa = normalizeSortLabel(a);
  const bb = normalizeSortLabel(b);
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

function formatStableDateTime(value: string | null) {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin dato";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function getProposalVideoWatchState(
  videoId: string | null | undefined,
  activity: Pick<VideoActivityController, "seenIds" | "watchStatusById">
): ProposalVideoWatchState {
  const normalized = String(videoId || "").trim();
  if (!normalized) return "none";

  const explicitStatus = activity.watchStatusById[normalized];
  if (explicitStatus === "watched") return "watched";
  if (explicitStatus === "not_started") return "none";
  if (explicitStatus === "watch_later") return "watch_later";
  if (explicitStatus === "not_finished") return "incomplete";

  return activity.seenIds.has(normalized) ? "watched" : "none";
}

const VIDEO_EXIT_PROMPT_THRESHOLD_MS = 60 * 1000;

const ACTIVITY_FILTER_OPTIONS: Array<{ id: ActivityFilter; label: string; Icon: typeof Star }> = [
  { id: "all", label: "Todos", Icon: SquaresFour },
  { id: "favorites", label: "Favoritos", Icon: Star },
  { id: "saved", label: "Guardados", Icon: BookmarkSimple },
  { id: "watched", label: "Vistos", Icon: CheckCircle },
  { id: "watch_later", label: "Ver más tarde", Icon: BookmarkSimple },
  { id: "incomplete", label: "Incompletos", Icon: Clock },
];

// Custom Premium Inline SVG Sponsor Logos for offline reliability & visual excellence
function GoProLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#001c27] text-white rounded-full">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className="opacity-30" />
      <rect x="25" y="32" width="50" height="36" rx="4" fill="#00AEEF" />
      <circle cx="42" cy="50" r="10" fill="white" />
      <circle cx="42" cy="50" r="5" fill="#001c27" />
      <circle cx="62" cy="42" r="3" fill="#FF5A3D" />
      <circle cx="62" cy="52" r="2" fill="white" />
    </svg>
  );
}

function IatiLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#ff5a3d]/10 text-[#ff5a3d] rounded-full">
      <circle cx="50" cy="50" r="42" fill="currentColor" className="opacity-20" />
      <path d="M50 20 L75 35 L75 65 L50 80 L25 65 L25 35 Z" fill="currentColor" />
      <text x="50" y="56" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">IATI</text>
    </svg>
  );
}

function WiseLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#25c974]/10 text-[#25c974] rounded-full">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40" />
      <path d="M35 62 L55 35 L68 35 L48 62 Z" fill="currentColor" />
      <path d="M48 35 L60 62 L48 62 L38 48 Z" fill="currentColor" className="opacity-80" />
    </svg>
  );
}

function NorthFaceLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#e03d1a]/10 text-[#e03d1a] rounded-full">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
      <path d="M25 72 L32 72 A28 28 0 0 1 60 44 L60 37 A35 35 0 0 0 25 72 Z" fill="currentColor" />
      <path d="M38 72 L45 72 A18 18 0 0 1 63 54 L63 47 A25 25 0 0 0 38 72 Z" fill="currentColor" />
      <path d="M50 72 L57 72 A8 8 0 0 1 65 64 L65 57 A15 15 0 0 0 50 72 Z" fill="currentColor" />
    </svg>
  );
}

function BookingLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#003580] text-white rounded-full">
      <path d="M25 25 H55 C65 25 70 30 70 37 C70 43 65 47 58 48 C66 49 72 54 72 61 C72 69 66 75 54 75 H25 Z M42 43 H52 C56 43 58 41 58 37 C58 33 56 31 52 31 H42 Z M42 67 H54 C58 67 60 65 60 61 C60 57 58 55 54 55 H42 Z" fill="currentColor" />
    </svg>
  );
}

export function MapProposalPrototype2({ channel, videoLocations }: MapProposalPrototype2Props) {
  const [filter, setFilter] = useState<ContentFilterWindow>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState("Explorar");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

  // TravelGlobe interactive state controls
  const [globeRotationEnabled, setGlobeRotationEnabled] = useState(true);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);
  const [pinnedVideo, setPinnedVideo] = useState<TravelVideoLocation | null>(null);
  const [isDesktopVideoCard, setIsDesktopVideoCard] = useState(false);
  const [videoExitPrompt, setVideoExitPrompt] = useState<VideoExitPromptState | null>(null);
  const [videoPlaybackCommand, setVideoPlaybackCommand] = useState<{ id: number; action: "pause" | "play" } | null>(null);
  const playbackTrackerRef = useRef<PlaybackTrackerState>({
    videoId: null,
    startedAtMs: null,
    elapsedMsById: {},
  });
  const suppressEndedForVideoIdRef = useRef<string | null>(null);
  const externalYoutubeOpenRef = useRef<ExternalYoutubeOpenState | null>(null);
  const videoActivity = useLocalVideoActivity();

  // States for interactive simulations
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAllVideosModal, setShowAllVideosModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localFanVotes, setLocalFanVotes] = useState<Record<string, number>>({});
  const [votePrompt, setVotePrompt] = useState<LocalVotePrompt | null>(null);
  const [votedCountryCode, setVotedCountryCode] = useState<string | null>(null);
  const [countrySortMode, setCountrySortMode] = useState<CountrySortMode>("seen");
  const [hasMounted, setHasMounted] = useState(false);
  const sidebarCountries = useMemo<SidebarCountryItem[]>(() => {
    const bucket = new Map<string, SidebarCountryItem>();
    for (const video of videoLocations) {
      const code = String(video.country_code || "").toUpperCase().trim();
      const name = getCountryNameInSpanish(video.country_code, video.country_name);
      if (!code || !name) continue;
      const current = bucket.get(code);
      if (current) {
        current.count += 1;
      } else {
        bucket.set(code, { code, name, count: 1, watchedCount: 0, activeCount: 0, progress: 0 });
      }
    }
    for (const video of videoLocations) {
      const code = String(video.country_code || "").toUpperCase().trim();
      const id = String(video.youtube_video_id || "").trim();
      if (!code || !id) continue;
      const current = bucket.get(code);
      if (!current) continue;
      const watchState = getProposalVideoWatchState(id, {
        seenIds: videoActivity.seenIds,
        watchStatusById: videoActivity.watchStatusById,
      });
      if (watchState === "none") continue;
      current.activeCount += 1;
      if (watchState !== "watched") continue;
      current.watchedCount += 1;
    }
    for (const item of bucket.values()) {
      item.progress = item.count > 0 ? Math.min(1, item.activeCount / item.count) : 0;
    }
    return Array.from(bucket.values());
  }, [videoActivity.seenIds, videoActivity.watchStatusById, videoLocations]);
  const sortedSidebarCountries = useMemo<SidebarCountryItem[]>(() => {
    if (countrySortMode === "alphabetical") {
      return [...sidebarCountries].sort((a, b) => stableTextCompare(a.name, b.name));
    }

    const countryPriority = (country: SidebarCountryItem) => {
      const isComplete = country.count > 0 && country.activeCount >= country.count;
      const isPartial = country.activeCount > 0 && !isComplete;
      if (isPartial) return 0; // amarillo primero
      if (!isComplete) return 1; // gris segundo
      return 2; // verde al final
    };

    const recentByCountry = new Map<string, number>();
    for (const video of videoLocations) {
      const code = String(video.country_code || "").toUpperCase().trim();
      if (!code) continue;
      const state = getProposalVideoWatchState(video.youtube_video_id, videoActivity);
      if (state === "none") continue;
      const published = video.published_at ? new Date(video.published_at).getTime() : 0;
      const current = recentByCountry.get(code) || 0;
      recentByCountry.set(code, Math.max(current, Number.isFinite(published) ? published : 0));
    }

    return [...sidebarCountries].sort((a, b) => {
      const priorityDiff = countryPriority(a) - countryPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const aRecent = recentByCountry.get(a.code) || 0;
      const bRecent = recentByCountry.get(b.code) || 0;
      if (aRecent !== bRecent) return bRecent - aRecent;

      return stableTextCompare(a.name, b.name);
    });
  }, [countrySortMode, sidebarCountries, videoActivity, videoLocations]);
  const filteredVideoLocations = useMemo(() => {
    const dateFiltered = (() => {
      if (filter === "all") return videoLocations;
      const days = filter === "365" ? 365 : filter === "90" ? 90 : 30;
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      return videoLocations.filter((video) => {
        const publishedAt = video.published_at ? new Date(video.published_at).getTime() : 0;
        return Number.isFinite(publishedAt) && publishedAt >= threshold;
      });
    })();

    const query = normalizeSortLabel(searchQuery);
    const searchFiltered = !query
      ? dateFiltered
      : dateFiltered.filter((video) => {
          const haystack = [
            video.title,
            video.country_name,
            getCountryNameInSpanish(video.country_code, video.country_name),
            video.country_code,
            video.city,
            video.region,
            video.location_label,
          ]
            .map((value) => normalizeSortLabel(String(value || "")))
            .join(" ");
          return haystack.includes(query);
        });

    if (activityFilter === "all") return searchFiltered;
    return searchFiltered.filter((video) => {
      const id = String(video.youtube_video_id || "");
      if (activityFilter === "favorites") return videoActivity.featuredIds.has(id);
      if (activityFilter === "saved") return videoActivity.savedIds.has(id);
      if (activityFilter === "watched") {
        return getProposalVideoWatchState(id, {
          seenIds: videoActivity.seenIds,
          watchStatusById: videoActivity.watchStatusById,
        }) === "watched";
      }
      if (activityFilter === "watch_later") return videoActivity.watchStatusById[id] === "watch_later";
      return videoActivity.watchStatusById[id] === "not_finished";
    });
  }, [activityFilter, filter, searchQuery, videoActivity.featuredIds, videoActivity.savedIds, videoActivity.seenIds, videoActivity.watchStatusById, videoLocations]);

  const dateFilterLabel = useMemo(() => {
    if (filter === "365") return "365 Días";
    if (filter === "90") return "90 Días";
    if (filter === "30") return "30 Días";
    return "Todos";
  }, [filter]);
  const voteCandidates = useMemo(() => {
    return sidebarCountries
      .map((country) => ({
        code: country.code,
        name: country.name,
        count: country.count,
        votes: localFanVotes[country.code] || 0,
      }))
      .sort((a, b) => b.votes - a.votes || b.count - a.count || stableTextCompare(a.name, b.name))
      .slice(0, 3);
  }, [localFanVotes, sidebarCountries]);
  const activeLocationVideos = useMemo(() => {
    const fallbackCountryCode = String((pinnedVideo || activeVideo)?.country_code || "").toUpperCase();
    const countryCode = String(selectedCountryCode || fallbackCountryCode).toUpperCase();
    if (!countryCode) return filteredVideoLocations;
    const sameCountryVideos = filteredVideoLocations.filter((video) => String(video.country_code || "").toUpperCase() === countryCode);
    return sameCountryVideos.length ? sameCountryVideos : filteredVideoLocations;
  }, [activeVideo, filteredVideoLocations, pinnedVideo, selectedCountryCode]);
  const railSourceVideos = useMemo(() => {
    if (activeLocationVideos.length > 0) return activeLocationVideos;
    if (filteredVideoLocations.length > 0) return filteredVideoLocations;
    return videoLocations;
  }, [activeLocationVideos, filteredVideoLocations, videoLocations]);
  const railVideoTotal = useMemo(() => {
    const countryCode = String(selectedCountryCode || "").toUpperCase();
    if (!countryCode) return filteredVideoLocations.length || videoLocations.length;
    return sidebarCountries.find((country) => country.code === countryCode)?.count || railSourceVideos.length;
  }, [filteredVideoLocations.length, railSourceVideos.length, selectedCountryCode, sidebarCountries, videoLocations.length]);
  const proposalAnalytics = useMemo<ProposalAnalytics>(() => {
    const countryCodes = new Set<string>();
    const cityKeys = new Set<string>();
    const placeKeys = new Set<string>();
    let reactions = 0;
    let watchedSeconds = 0;

    for (const video of videoLocations) {
      const countryCode = String(video.country_code || "").toUpperCase().trim();
      if (countryCode) countryCodes.add(countryCode);

      const city = String(video.city || video.location_label || video.region || "").trim();
      if (city) cityKeys.add(`${countryCode}:${city.toLowerCase()}`);

      const lat = Number(video.lat);
      const lng = Number(video.lng);
      if (city) {
        placeKeys.add(`${countryCode}:${city.toLowerCase()}`);
      } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
        placeKeys.add(`${countryCode}:${lat.toFixed(2)}:${lng.toFixed(2)}`);
      } else if (countryCode) {
        placeKeys.add(countryCode);
      }

      reactions += Number(video.like_count || 0) + Number(video.comment_count || 0);

      const id = String(video.youtube_video_id || "");
      const wasWatched = getProposalVideoWatchState(id, {
        seenIds: videoActivity.seenIds,
        watchStatusById: videoActivity.watchStatusById,
      }) === "watched";
      if (wasWatched) watchedSeconds += Number(video.duration_seconds || 0);
    }

    const watchedCountryCodes = new Set(
      videoLocations
        .filter((video) => {
          const id = String(video.youtube_video_id || "");
          return getProposalVideoWatchState(id, {
            seenIds: videoActivity.seenIds,
            watchStatusById: videoActivity.watchStatusById,
          }) === "watched";
        })
        .map((video) => String(video.country_code || "").toUpperCase().trim())
        .filter(Boolean)
    );

    return {
      countries: countryCodes.size,
      cities: cityKeys.size,
      videos: videoLocations.length,
      exploredPlaces: placeKeys.size,
      watchedHours: Math.round(watchedSeconds / 3600),
      visitedCountries: watchedCountryCodes.size,
      reactions,
    };
  }, [videoActivity.seenIds, videoActivity.watchStatusById, videoLocations]);

  useEffect(() => {
    setHasMounted(true);
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopVideoCard(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  function flash(message: string) {
    void message;
    // Intentionally quiet: this prototype no longer renders transient toast copy over the map.
  }

  const commitPlaybackElapsed = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    const tracker = playbackTrackerRef.current;
    if (!normalized || tracker.videoId !== normalized || tracker.startedAtMs === null) return;

    const elapsed = Math.max(0, Date.now() - tracker.startedAtMs);
    tracker.elapsedMsById[normalized] = (tracker.elapsedMsById[normalized] || 0) + elapsed;
    tracker.startedAtMs = null;
  }, []);

  const getPlaybackElapsedMs = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    if (!normalized) return 0;

    const tracker = playbackTrackerRef.current;
    const storedElapsed = tracker.elapsedMsById[normalized] || 0;
    if (tracker.videoId !== normalized || tracker.startedAtMs === null) return storedElapsed;

    return storedElapsed + Math.max(0, Date.now() - tracker.startedAtMs);
  }, []);

  const handleVideoPlaybackStateChange = useCallback(
    (video: TravelVideoLocation, state: VideoPlaybackState) => {
      const videoId = String(video.youtube_video_id || "").trim();
      if (!videoId) return;

      if (state === "playing") {
        if (suppressEndedForVideoIdRef.current === videoId) {
          suppressEndedForVideoIdRef.current = null;
        }
        const tracker = playbackTrackerRef.current;
        if (tracker.videoId && tracker.videoId !== videoId) {
          commitPlaybackElapsed(tracker.videoId);
        }
        tracker.videoId = videoId;
        if (tracker.startedAtMs === null) tracker.startedAtMs = Date.now();
        videoActivity.markVideoStarted(videoId);
        return;
      }

      if (state === "paused") {
        commitPlaybackElapsed(videoId);
        return;
      }

      commitPlaybackElapsed(videoId);
      if (suppressEndedForVideoIdRef.current === videoId) {
        suppressEndedForVideoIdRef.current = null;
        return;
      }
      videoActivity.setVideoWatchStatus(videoId, "watched");
    },
    [commitPlaybackElapsed, videoActivity]
  );

  const requestVideoExit = useCallback(
    (action: () => void) => {
      const currentVideo = pinnedVideo;
      const videoId = String(currentVideo?.youtube_video_id || "").trim();
      if (!currentVideo || !videoId) {
        action();
        return;
      }

      const watchStatus = videoActivity.watchStatusById[videoId];
      const hasStarted = watchStatus === "not_finished" || watchStatus === "watch_later";
      const shouldPrompt =
        hasStarted &&
        watchStatus !== "watched" &&
        getPlaybackElapsedMs(videoId) >= VIDEO_EXIT_PROMPT_THRESHOLD_MS;

      if (!shouldPrompt) {
        suppressEndedForVideoIdRef.current = videoId;
        action();
        return;
      }

      suppressEndedForVideoIdRef.current = videoId;
      setVideoPlaybackCommand({ id: Date.now(), action: "pause" });
      setVideoExitPrompt({
        videoId,
        title: currentVideo.title,
        action,
      });
    },
    [getPlaybackElapsedMs, pinnedVideo, videoActivity.watchStatusById]
  );

  function confirmVideoExitComplete() {
    if (!videoExitPrompt) return;
    commitPlaybackElapsed(videoExitPrompt.videoId);
    suppressEndedForVideoIdRef.current = null;
    videoActivity.setVideoWatchStatus(videoExitPrompt.videoId, "watched");
    const nextAction = videoExitPrompt.action;
    setVideoExitPrompt(null);
    nextAction();
  }

  function continueWatchingVideo() {
    suppressEndedForVideoIdRef.current = null;
    setVideoExitPrompt(null);
    setVideoPlaybackCommand({ id: Date.now(), action: "play" });
  }

  function watchLaterPendingVideoExit() {
    if (!videoExitPrompt) return;
    commitPlaybackElapsed(videoExitPrompt.videoId);
    suppressEndedForVideoIdRef.current = null;
    videoActivity.setVideoWatchStatus(videoExitPrompt.videoId, "watch_later");
    if (!videoActivity.savedIds.has(videoExitPrompt.videoId)) {
      videoActivity.toggleVideoSaved(videoExitPrompt.videoId);
    }
    const nextAction = videoExitPrompt.action;
    setVideoExitPrompt(null);
    nextAction();
  }

  function openVotePrompt(countryCode: string | null) {
    const normalized = String(countryCode || "").toUpperCase();
    if (!normalized) return;
    const country = sidebarCountries.find((item) => item.code === normalized);
    setVotePrompt({
      countryCode: normalized,
      countryName: country?.name || getCountryNameInSpanish(normalized),
    });
  }

  function confirmVote(countryCode: string) {
    const normalized = String(countryCode || "").toUpperCase();
    if (!normalized) return;
    setLocalFanVotes((current) => ({
      ...current,
      [normalized]: (current[normalized] || 0) + 1,
    }));
    setVotedCountryCode(normalized);
    setVotePrompt(null);
    flash(`Voto registrado para ${countryCodeToFlag(normalized)} ${sidebarCountries.find((item) => item.code === normalized)?.name || getCountryNameInSpanish(normalized)}.`);
  }

  function openMapVideo(video: TravelVideoLocation) {
    setPinnedVideo(video);
    setSelectedCountryCode(String(video.country_code || "").toUpperCase() || null);
    flash(`Video abierto: "${video.title}"`);
  }

  function changeMapVideo(video: TravelVideoLocation) {
    setPinnedVideo(video);
    setSelectedCountryCode(String(video.country_code || "").toUpperCase() || null);
  }

  const handleOpenInYouTube = useCallback((video: TravelVideoLocation) => {
    const videoId = String(video.youtube_video_id || "").trim();
    if (!videoId) return;
    videoActivity.markVideoOpened(videoId);
    externalYoutubeOpenRef.current = {
      videoId,
      title: video.title,
      openedAtMs: Date.now(),
    };
  }, [videoActivity]);

  const maybePromptExternalReturn = useCallback(() => {
    const externalOpen = externalYoutubeOpenRef.current;
    if (!externalOpen) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof window !== "undefined" && !window.document.hasFocus()) return;

    externalYoutubeOpenRef.current = null;
    const elapsedMs = Math.max(0, Date.now() - externalOpen.openedAtMs);
    if (elapsedMs < VIDEO_EXIT_PROMPT_THRESHOLD_MS) return;
    const watchStatus = videoActivity.watchStatusById[externalOpen.videoId];
    if (watchStatus !== "not_finished" && watchStatus !== "watch_later") return;

    setVideoPlaybackCommand({ id: Date.now(), action: "pause" });
    setVideoExitPrompt({
      videoId: externalOpen.videoId,
      title: externalOpen.title,
      action: () => {},
    });
  }, [videoActivity.watchStatusById]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") maybePromptExternalReturn();
    };
    const onFocus = () => {
      maybePromptExternalReturn();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [maybePromptExternalReturn]);

  const isVideoFocusMode = Boolean(pinnedVideo) && isDesktopVideoCard && !isMapFullscreen;

  return (
    <div className="relative h-screen overflow-hidden bg-[#03060a] text-[#f5f7fb] font-sans antialiased">
      {/* Background glowing effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,90,61,0.08),transparent_35%),linear-gradient(180deg,#04090f,#030508_60%,#010204)] pointer-events-none" />
      
      <div className={cn(
        "relative grid h-screen min-h-0 overflow-hidden grid-cols-1",
        !isMapFullscreen && "lg:grid-cols-[220px_minmax(0,1fr)_270px] xl:grid-cols-[230px_minmax(0,1fr)_280px] 2xl:grid-cols-[240px_minmax(0,1fr)_300px] 3xl:grid-cols-[250px_minmax(0,1fr)_320px]"
      )}>
        
        {/* Left Sidebar */}
        {!isMapFullscreen ? (
          <aside className="hidden min-h-0 lg:block">
            <ProposalSidebar2
              countries={hasMounted ? sortedSidebarCountries : []}
              activeItem={activeSidebarItem}
              selectedCountryCode={selectedCountryCode}
              countrySortMode={countrySortMode}
              onChangeCountrySortMode={setCountrySortMode}
              setActiveItem={(item) => {
                setActiveSidebarItem(item);
                flash(`Sección activa: ${item}`);
              }}
              onOpenMenu={() => setMenuOpen(true)}
              onSelectCountry={(countryCode, countryName) => {
                setActiveSidebarItem("Destinos");
                setSelectedCountryCode(countryCode);
                flash(`País seleccionado: ${countryName}`);
              }}
            />
          </aside>
        ) : null}

        {/* Center Main Column */}
        <section className={cn(
          "min-w-0 flex h-full flex-col overflow-hidden",
          isMapFullscreen ? "px-0 py-0 gap-0" : "gap-3 px-3 py-3 lg:px-4"
        )}>
          
          {/* Topbar */}
          {!isMapFullscreen ? (
          <ProposalTopbar2
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCopyUrl={() => flash("URL copiada al portapapeles.")}
            onToggleViewer={() => setIsMapFullscreen(true)}
            lastExtractionAt={channel.last_synced_at || null}
          />
          ) : null}

          {/* Map and Inspiration Section Container */}
          <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
            
            {/* The Earth Map Box */}
            <div className={cn(
              "relative flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-[#050b10] [&_.scene-container>div]:!z-[5] [&>div:first-child]:!h-full [&>div:first-child]:!min-h-0 [&>div:first-child]:!w-full",
              isMapFullscreen ? "rounded-none border-0 shadow-none" : "rounded-xl border border-white/[0.07] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)]"
            )}>
              
              {/* WebGL 3D Travel Globe */}
              <TravelGlobe
                channelData={channel}
                videoLocations={filteredVideoLocations}
                allVideoLocationsForProgress={videoLocations}
                interactive={true}
                showControls={false}
                showSponsorBanner={false}
                minimalOverlay
                maxVisibleVideos={4}
                pointMode="video"
                showSummaryCard={false}
                showPointPanel
                pointPanelClassName="left-1/2 top-4 w-[245px] -translate-x-1/2 sm:w-[245px]"
                openVideoOnCountrySelect={false}
                selectedCountryCode={selectedCountryCode}
                watchedVideoIds={videoActivity.seenIds}
                videoWatchStatusById={videoActivity.watchStatusById}
                onActiveVideoChange={setActiveVideo}
                onPinnedVideoChange={(video) => {
                  if (video) {
                    requestVideoExit(() => openMapVideo(video));
                  } else {
                    requestVideoExit(() => setPinnedVideo(null));
                  }
                }}
                onCountrySelect={(countryCode) => {
                  const normalizedCountryCode = String(countryCode || "").toUpperCase() || null;
                  setActiveSidebarItem("Destinos");
                  setSelectedCountryCode(normalizedCountryCode);
                  openVotePrompt(normalizedCountryCode);
                  flash(`País seleccionado en el globo: ${countryCode}`);
                }}
                rotationEnabled={globeRotationEnabled}
                onRotationChange={setGlobeRotationEnabled}
              />

              {isVideoFocusMode ? (
                <div className="pointer-events-none absolute inset-0 z-[72] bg-black/62 backdrop-blur-[4px]" />
              ) : null}

              <div className="pointer-events-none absolute inset-x-0 top-[92px] bottom-[92px] z-[80] hidden px-4 lg:block">
                <div className="flex h-full items-center justify-center">
                  <div className="pointer-events-auto w-full max-w-[480px]">
                    <DesktopVideoMapCard
                      videos={activeLocationVideos}
                      currentVideo={pinnedVideo}
                      activity={videoActivity}
                      onClose={() => requestVideoExit(() => setPinnedVideo(null))}
                      onChangeVideo={(video) => requestVideoExit(() => changeMapVideo(video))}
                      onOpenInYouTube={handleOpenInYouTube}
                      variant="youtube-theater"
                      openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Abierto en YouTube" : "Abrir en YouTube"}
                      playbackCommand={videoPlaybackCommand}
                      onPlaybackStateChange={(state) => {
                        if (!pinnedVideo) return;
                        handleVideoPlaybackStateChange(pinnedVideo, state);
                      }}
                    />
                  </div>
                </div>
              </div>

              {!isVideoFocusMode ? (
              <div className="pointer-events-none absolute right-4 top-4 z-[90] flex items-start gap-2">
                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-[#060c12]/60 px-3 text-[11px] font-bold text-white backdrop-blur-md"
                    onClick={() => setDateMenuOpen((prev) => !prev)}
                  >
                    <SquaresFour size={13} />
                    {dateFilterLabel}
                    <CaretDown size={11} className={cn("transition", dateMenuOpen && "rotate-180")} />
                  </button>
                  {dateMenuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+6px)] min-w-[145px] overflow-hidden rounded-xl border border-white/10 bg-[#050b10]/95 p-1 shadow-2xl backdrop-blur-xl">
                      {[
                        { id: "all", label: "Todos", Icon: SquaresFour },
                        { id: "365", label: "365 Días", Icon: Clock },
                        { id: "90", label: "90 Días", Icon: Clock },
                        { id: "30", label: "30 Días", Icon: Clock },
                      ].map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            "flex h-8 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-[11px] font-bold transition",
                            filter === id ? "bg-[#ff5a3d]/12 text-[#ff7d63]" : "text-[#cbd3dc] hover:bg-white/[0.04] hover:text-white"
                          )}
                          onClick={() => {
                            setFilter((current) => (current === id ? "all" : (id as ContentFilterWindow)));
                            setDateMenuOpen(false);
                            flash(`Filtro del globo: ${label}`);
                          }}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-[#060c12]/60 px-3 text-[11px] font-bold text-white backdrop-blur-md"
                    onClick={() => setActivityMenuOpen((prev) => !prev)}
                  >
                    <FunnelSimple size={13} />
                    Filtros
                    <CaretDown size={11} className={cn("transition", activityMenuOpen && "rotate-180")} />
                  </button>
                  {activityMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+6px)] min-w-[165px] overflow-hidden rounded-xl border border-white/10 bg-[#050b10]/95 p-1 shadow-2xl backdrop-blur-xl">
                      {ACTIVITY_FILTER_OPTIONS.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            "flex h-8 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-[11px] font-bold transition",
                            activityFilter === id ? "bg-[#ff5a3d]/12 text-[#ff7d63]" : "text-[#cbd3dc] hover:bg-white/[0.04] hover:text-white"
                          )}
                          onClick={() => {
                            setActivityFilter((current) => (current === id ? "all" : id));
                            setActivityMenuOpen(false);
                            flash(`Filtro de actividad: ${label}`);
                          }}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              ) : null}

              <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 pointer-events-auto">
                {!isMapFullscreen ? (
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-full border border-white/[0.1] bg-[#050b10]/75 px-4 text-[11px] font-bold text-white backdrop-blur-xl hover:bg-[#050b10]/95"
                    onClick={() => setIsMapFullscreen(true)}
                  >
                    <ArrowsOutSimple size={14} />
                    Pantalla Completa
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-full border border-[#ff5a3d]/55 bg-[#050b10]/82 px-3 text-[11px] font-bold text-[#ff5a3d] backdrop-blur-xl hover:bg-[#050b10]"
                    onClick={() => setIsMapFullscreen(false)}
                    aria-label="Salir de pantalla completa"
                  >
                    <X size={16} />
                    Cerrar Pantalla Completa
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Inspiration Videos */}
            {!isMapFullscreen && !isVideoFocusMode ? (
              <VideoInspirationRail2
                videos={railSourceVideos}
                selectedCountryCode={selectedCountryCode}
                activity={videoActivity}
                totalVideos={railVideoTotal}
                highlightedVideoId={String(pinnedVideo?.youtube_video_id || "").trim() || null}
                onSelect={(video) => {
                  requestVideoExit(() => openMapVideo(video));
                }}
              />
            ) : null}

            {!isVideoFocusMode ? (
              <div className="lg:hidden">
                <MapVotePanel2
                  candidates={hasMounted ? voteCandidates : []}
                  prompt={votePrompt}
                  votedCountryCode={votedCountryCode}
                  variant="overlay"
                  onSelectCountry={(countryCode) => {
                    setSelectedCountryCode(countryCode);
                    openVotePrompt(countryCode);
                  }}
                  onConfirmVote={confirmVote}
                  onCancelVote={() => setVotePrompt(null)}
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* Right Rail (Bento Grid Sidebar) */}
        {!isMapFullscreen ? (
          <aside className="hidden lg:flex flex-col gap-3 h-full overflow-hidden px-4 py-3 border-l border-white/[0.06] bg-[#04080d]/40 backdrop-blur-3xl">
            <ProposalRightRail2
              channel={channel}
              onBecomePatron={() => window.location.assign("/onboarding")}
              onManageSponsors={() => setShowSponsorModal(true)}
              onAction={flash}
              onOpenAdmin={() => window.location.assign("/map-admin-proposal")}
              analytics={proposalAnalytics}
              votePanel={
                !isVideoFocusMode
                  ? {
                      candidates: hasMounted ? voteCandidates : [],
                      prompt: votePrompt,
                      votedCountryCode,
                      onSelectCountry: (countryCode) => {
                        setSelectedCountryCode(countryCode);
                        openVotePrompt(countryCode);
                      },
                      onConfirmVote: confirmVote,
                      onCancelVote: () => setVotePrompt(null),
                    }
                  : null
              }
            />
          </aside>
        ) : null}
      </div>

      {/* Drawers / Modals Simulation */}
      <MobileDrawer2
        channel={channel}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(label) => {
          if (label === "Sponsors") {
            setShowSponsorModal(true);
            return;
          }
          if (label === "Patrocinadores") {
            setShowCheckoutModal(true);
            return;
          }
          setActiveSidebarItem(label === "Videos en vivo" ? "En vivo" : label);
        }}
      />

      <VideoSelectionSheet
        open={Boolean(pinnedVideo) && !isDesktopVideoCard}
        videos={activeLocationVideos}
        currentVideo={pinnedVideo}
        activity={videoActivity}
        onClose={() => requestVideoExit(() => setPinnedVideo(null))}
        onChangeVideo={(video) => requestVideoExit(() => changeMapVideo(video))}
        onOpenInYouTube={handleOpenInYouTube}
        openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Abierto en YouTube" : "Abrir en YouTube"}
        playbackCommand={videoPlaybackCommand}
        onPlaybackStateChange={(state) => {
          if (!pinnedVideo) return;
          handleVideoPlaybackStateChange(pinnedVideo, state);
        }}
      />

      {videoExitPrompt ? (
        <VideoExitPrompt2
          title={videoExitPrompt.title}
          onComplete={confirmVideoExitComplete}
          onContinue={continueWatchingVideo}
          onWatchLater={watchLaterPendingVideoExit}
        />
      ) : null}

      {/* Playlist modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Nueva playlist de viaje</h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-[#8e9cae] mb-4">Organiza tus videos mapeados en colecciones temáticas.</p>
            <input 
              type="text" 
              placeholder="Nombre de la playlist (ej: Sudeste Asiático)" 
              className="w-full h-11 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d] mb-4"
            />
            <button 
              onClick={() => {
                setShowPlaylistModal(false);
                flash("Playlist creada con éxito.");
              }}
              className="w-full h-10 rounded-lg bg-[#ff5a3d] text-sm font-bold text-white transition hover:bg-[#ff6f54]"
            >
              Crear playlist
            </button>
          </div>
        </div>
      )}

      {showAllVideosModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#081017] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <h3 className="text-base font-black text-white">Todos los videos</h3>
              <button type="button" onClick={() => setShowAllVideosModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-2 xl:grid-cols-3">
              {railSourceVideos.map((video) => {
                const watchState = getProposalVideoWatchState(video.youtube_video_id, videoActivity);
                const isWatched = watchState === "watched";
                const isInProgress = watchState === "incomplete";
                const isWatchLater = watchState === "watch_later";
                return (
                  <button
                    key={`all-${video.youtube_video_id}`}
                    type="button"
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-black/30 text-left transition",
                      isWatched
                        ? "border-emerald-400/45"
                        : isWatchLater
                          ? "border-blue-400/45"
                          : isInProgress
                            ? "border-red-400/45"
                          : "border-white/[0.08]"
                    )}
                    onClick={() => {
                      setShowAllVideosModal(false);
                      requestVideoExit(() => openMapVideo(video));
                    }}
                  >
                    <div className="relative h-36 w-full">
                      <Image src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} fill sizes="420px" className="object-cover" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-[12px] font-bold text-white">{video.title}</p>
                      <p className="mt-1 text-[10px] text-[#a8b1bb]">{countryCodeToFlag(String(video.country_code || "").toUpperCase())} {getCountryNameInSpanish(video.country_code, video.country_name)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Sponsor modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Añadir patrocinador</h3>
              <button onClick={() => setShowSponsorModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre de la Marca</label>
                <input type="text" placeholder="Ej. Patagonia Wear" className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d]" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Descripción Corta</label>
                <input type="text" placeholder="Ej. Ropa y equipamiento de montaña" className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d]" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Enlace del Sitio Web</label>
                <input type="text" placeholder="Ej. patagonia.com" className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d]" />
              </div>
            </div>
            <button 
              onClick={() => {
                setShowSponsorModal(false);
                flash("Patrocinador agregado al canal (simulado).");
              }}
              className="w-full h-10 rounded-lg bg-[#ff5a3d] text-sm font-bold text-white transition hover:bg-[#ff6f54]"
            >
              Guardar patrocinador
            </button>
          </div>
        </div>
      )}

      {/* Support / Patronage Checkout modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#ff9e58] flex items-center gap-2">
                <Heart size={20} weight="fill" className="text-[#ff5a3d]" /> Apoya a BY PUPILA
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-[#8e9cae] leading-5 mb-4">
              Tu aporte voluntario ayuda a financiar la creación de mapas interactivos, producción de videos y la exploración de nuevos destinos.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { amount: "$5", label: "Café" },
                { amount: "$15", label: "Aventura" },
                { amount: "$50", label: "Explorador" }
              ].map((tier) => (
                <button 
                  key={tier.label}
                  onClick={() => {
                    setShowCheckoutModal(false);
                    flash(`¡Gracias por simular tu patrocinio de ${tier.amount}! Eres increíble.`);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:border-[#ff5a3d]/50 hover:bg-[#ff5a3d]/5 transition"
                >
                  <span className="text-lg font-black text-white">{tier.amount}</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{tier.label}</span>
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-[#ff5a3d]/10 border border-[#ff5a3d]/20 p-3 text-center mb-4">
              <p className="text-[11px] text-[#ff846b] font-medium leading-relaxed">
                Desbloquea contenido exclusivo, accesos anticipados y tu nombre aparecerá destacado en el mapa de patrocinadores.
              </p>
            </div>
            <button 
              onClick={() => {
                setShowCheckoutModal(false);
                flash("Haz iniciado el flujo de patrocinio.");
              }}
              className="w-full h-11 rounded-lg bg-[linear-gradient(135deg,#ff6d4e_0%,#e03d1a_100%)] text-sm font-bold text-white transition hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#e03d1a]/20"
            >
              Hazte Patrocinador Oficial
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Side Navigation Panel (Left Sidebar)
function ProposalSidebar2({
  countries,
  activeItem,
  selectedCountryCode,
  countrySortMode,
  onChangeCountrySortMode,
  setActiveItem,
  onOpenMenu,
  onSelectCountry
}: {
  countries: SidebarCountryItem[];
  activeItem: string;
  selectedCountryCode: string | null;
  countrySortMode: CountrySortMode;
  onChangeCountrySortMode: (mode: CountrySortMode) => void;
  setActiveItem: (item: string) => void;
  onOpenMenu: () => void;
  onSelectCountry: (countryCode: string, countryName: string) => void;
}) {
  const navItems = [
    { name: "Explorar", icon: Compass },
    { name: "En vivo", icon: Video, badge: 12 },
    { name: "Destinos", icon: MapPin },
    { name: "Creadores", icon: UsersThree },
    { name: "Guardados", icon: BookmarkSimple },
    { name: "Historial", icon: Clock },
    { name: "Comunidad", icon: Users }
  ];

  return (
    <aside className="relative z-20 flex min-h-0 flex-col border-b border-white/[0.07] bg-[#03060a] px-4 py-4 lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
      
      {/* Brand Logo Header */}
      <div className="mb-4 flex shrink-0 items-center justify-between lg:block">
        <Link href="/" className="group flex items-center gap-3 text-left">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ff7b4f] transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5">
              <path d="M4.5 16.5 L12 3 L19.5 16.5 Z M12 3 L12 16.5" />
              <path d="M2.5 21 L21.5 21" />
            </svg>
          </span>
          <div>
            <span className="block whitespace-nowrap text-[14px] font-black uppercase leading-none tracking-[0.12em] text-white">TRAVEL YOUR MAP</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.22em] text-[#818b95]">
              BY PUPILA
            </span>
          </div>
        </Link>
        <button 
          type="button" 
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] lg:hidden hover:bg-white/[0.08]" 
          onClick={onOpenMenu}
        >
          <List size={20} />
        </button>
      </div>

      {/* Countries segment (from map data) */}
      <div className="mt-2 hidden rounded-xl p-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
        <div className="mb-3 shrink-0">
          <div className="flex items-center justify-start gap-2">
            <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
              <button
                type="button"
                className={cn(
                  "h-6 rounded-full px-2 text-[9px] font-bold uppercase tracking-[0.08em] transition",
                  countrySortMode === "seen" ? "bg-white/[0.14] text-white" : "text-[#99a5b3] hover:text-white"
                )}
                onClick={() => onChangeCountrySortMode("seen")}
              >
                Vistos
              </button>
              <button
                type="button"
                className={cn(
                  "h-6 rounded-full px-2 text-[9px] font-bold uppercase tracking-[0.08em] transition",
                  countrySortMode === "alphabetical" ? "bg-white/[0.14] text-white" : "text-[#99a5b3] hover:text-white"
                )}
                onClick={() => onChangeCountrySortMode("alphabetical")}
              >
                Alfabético
              </button>
            </div>
          </div>
        </div>
        
        {/* Country list */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#03060a] pr-1 [scrollbar-gutter:stable]">
          {countries.map((country) => (
            (() => {
              const isComplete = country.count > 0 && country.activeCount >= country.count;
              const isPartial = country.activeCount > 0 && !isComplete;
              const toneClasses = isComplete
                ? {
                    box: "border border-emerald-400/40 bg-emerald-500/12",
                    fill: "bg-emerald-400/30",
                    text: "text-emerald-200",
                  }
                : isPartial
                  ? {
                      box: "border border-yellow-300/40 bg-yellow-400/12",
                      fill: "bg-yellow-300/35",
                      text: "text-yellow-100",
                    }
                  : {
                      box: "border border-white/[0.04] bg-white/[0.04]",
                      fill: "bg-transparent",
                      text: "text-white",
                    };
              return (
            <button
              key={country.code}
              type="button"
              className={cn(
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-1 text-left transition",
                String(selectedCountryCode || "").toUpperCase() === country.code
                  ? "border-[#ff5a3d]/35 bg-white/[0.06]"
                  : "border-white/[0.05] hover:border-[#ff5a3d]/25 hover:bg-white/[0.04]"
              )}
              onClick={() => onSelectCountry(country.code, country.name)}
            >
              <span className={cn(
                "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md text-[18px] transition",
                toneClasses.box
              )}>
                {country.progress > 0 ? (
                  <span
                    className={cn("absolute inset-y-0 left-0", toneClasses.fill)}
                    style={{ width: `${Math.max(10, country.progress * 100)}%` }}
                  />
                ) : null}
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_65%)]" />
                <span className={cn("relative z-10", toneClasses.text)}>{countryCodeToFlag(country.code)}</span>
              </span>
              <span className="relative min-w-0">
                <span className="block truncate text-[12px] font-bold text-white transition group-hover:text-[#ff7d63]">{country.name}</span>
                <span className="text-[10px] text-[#818a93]">
                  {country.activeCount} de {country.count} videos
                </span>
              </span>
            </button>
              );
            })()
          ))}
        </div>
      </div>

      {/* Main navigation menu items */}
      <nav className="mt-2 hidden shrink-0 space-y-1 rounded-xl p-2 lg:block">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.name;
          return (
            <button
              key={item.name}
              type="button"
              className={cn(
                "relative flex h-11 w-full items-center gap-3 rounded-lg px-3.5 text-left text-[12px] font-bold transition-all",
                isActive 
                  ? "border border-[#ff5a3d]/20 bg-[linear-gradient(90deg,rgba(255,90,61,0.08)_0%,rgba(0,0,0,0)_100%)] text-[#ff7d63] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" 
                  : "text-[#cfd3d8] hover:bg-white/[0.04] hover:text-white"
              )}
              onClick={() => setActiveItem(item.name)}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#ff5a3d]" />}
              <Icon size={17} weight={isActive ? "fill" : "regular"} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#ff4f42] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// Topbar Header Panel
function ProposalTopbar2({
  searchQuery,
  setSearchQuery,
  onCopyUrl,
  onToggleViewer,
  lastExtractionAt
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onCopyUrl: () => void;
  onToggleViewer: () => void;
  lastExtractionAt: string | null;
}) {
  const lastExtractionLabel = formatStableDateTime(lastExtractionAt);

  return (
    <header className="relative z-30 grid gap-3 lg:grid-cols-[minmax(0,0.5fr)_auto] items-center">
      {/* Broadened Sleek Search Bar */}
      <div className="flex min-w-0 items-center gap-3">
        <label className="flex h-11 min-w-0 w-full items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.035] px-4 text-[#cbd3dc] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] focus-within:border-[#ff5a3d]/40 transition-all">
          <MagnifyingGlass size={17} className="text-[#818b95]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#818b95]"
            placeholder="Buscar destinos, creadores o videos..."
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery("")} aria-label="Limpiar busqueda" className="text-slate-400 hover:text-white">
              <X size={15} />
            </button>
          ) : null}
        </label>
        <div className="hidden shrink-0 px-1 py-1 text-left sm:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8f98a3]">Última extracción</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#d8dee6]">{lastExtractionLabel}</p>
        </div>
      </div>

      {/* Control buttons & Avatar */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-full border border-[#ff5a3d]/55 bg-transparent px-4 text-[12px] font-bold text-[#ff5a3d] transition hover:bg-[#ff5a3d]/10"
          onClick={onToggleViewer}
        >
          <Eye size={15} />
          Viewer
        </button>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-full border border-[#ff5a3d]/55 bg-[#ff5a3d] px-4 text-[12px] font-bold text-white transition hover:bg-[#ff6a50]"
          onClick={async () => {
            try {
              await copyTextToClipboard(window.location.href);
              onCopyUrl();
            } catch {
              onCopyUrl();
            }
          }}
        >
          <CopySimple size={15} />
          Copiar URL
        </button>
      </div>
    </header>
  );
}


function MapVotePanel2({
  candidates,
  prompt,
  votedCountryCode,
  variant = "overlay",
  mode = "viewer",
  onSelectCountry,
  onConfirmVote,
  onCancelVote,
  onOpenAdmin,
  onFinalizeVote,
}: {
  candidates: Array<{ code: string; name: string; count: number; votes: number }>;
  prompt: LocalVotePrompt | null;
  votedCountryCode: string | null;
  variant?: "overlay" | "sidebar";
  mode?: "viewer" | "creator";
  onSelectCountry: (countryCode: string) => void;
  onConfirmVote: (countryCode: string) => void;
  onCancelVote: () => void;
  onOpenAdmin?: () => void;
  onFinalizeVote?: () => void;
}) {
  const totalVotes = candidates.reduce((sum, country) => sum + country.votes, 0);
  const isCreator = mode === "creator";

  return (
    <div
      className={
        variant === "sidebar"
          ? "w-full"
          : "pointer-events-none absolute left-4 top-4 z-[95] w-[min(190px,calc(100%-2rem))]"
      }
    >
      <section className="pointer-events-auto rounded-xl border border-white/[0.08] bg-[#050b10]/82 p-3 text-white shadow-2xl backdrop-blur-xl">
        <div className={cn("mb-2 flex items-center gap-3", isCreator ? "justify-between" : "justify-center")}>
          <div className={cn("min-w-0", !isCreator && "text-center")}>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#ff5a3d]">Fan vote</p>
            <h3 className="text-[12px] font-black leading-tight text-white">Próximo destino</h3>
          </div>
          {isCreator ? (
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 text-[#ff5a3d] transition hover:bg-[#ff5a3d]/18"
              onClick={() => onOpenAdmin?.()}
              aria-label="Abrir panel de votaciones"
              title="Abrir panel de votaciones"
            >
              <List size={14} weight="bold" />
            </button>
          ) : null}
        </div>
        <div className="space-y-1.5">
          {candidates.map((country, index) => {
            const active = votedCountryCode === country.code;
            const width = totalVotes > 0 ? Math.max(12, Math.round((country.votes / totalVotes) * 100)) : 12;

            return (
              <button
                key={country.code}
                type="button"
                className={cn(
                  "group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border px-2 text-left transition",
                  active
                    ? "border-[#ff5a3d]/55 bg-[#ff5a3d]/10"
                    : "border-white/[0.06] bg-white/[0.035] hover:border-[#ff5a3d]/35 hover:bg-white/[0.06]"
                )}
                onClick={() => onSelectCountry(country.code)}
              >
                {country.votes > 0 ? (
                  <span className="absolute inset-y-1 left-1 rounded-md bg-[#ff5a3d]/18" style={{ width: `${width}%` }} />
                ) : null}
                <span className="relative z-10 shrink-0 text-[10px] font-black text-[#ff5a3d]">#{index + 1}</span>
                <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black/25 text-[14px]">
                  {countryCodeToFlag(country.code)}
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-white">{country.name}</span>
                  <span className="text-[9px] font-semibold text-[#8d98a5]">{country.votes} votos</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-[#8d98a5]">
          Click en un país para votar.
        </p>
        {isCreator ? (
          <div className="mt-3">
            <button
              type="button"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#ff5a3d]/35 bg-[#ff5a3d]/12 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[#ffb4a4] transition hover:bg-[#ff5a3d]/20"
              onClick={() => {
                if (onFinalizeVote) {
                  onFinalizeVote();
                  return;
                }
                onOpenAdmin?.();
              }}
            >
              Finalizar votación
            </button>
          </div>
        ) : null}
      </section>

      {prompt ? (
        <div className="pointer-events-auto mt-2 rounded-xl border border-[#ff5a3d]/28 bg-[#050b10]/92 p-3 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-[11px] font-bold leading-5 text-[#dce4ed]">
            Votar por{" "}
            <span className="text-white">
              {countryCodeToFlag(prompt.countryCode)} {prompt.countryName}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ff5a3d]/40 bg-[#ff5a3d]/16 px-3 text-[11px] font-black text-[#ff7d63] transition hover:bg-[#ff5a3d]/24"
              onClick={() => onConfirmVote(prompt.countryCode)}
            >
              <CheckCircle size={14} weight="fill" />
              Confirmar
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#cbd3dc] transition hover:bg-white/[0.08]"
              onClick={onCancelVote}
              aria-label="Cancelar voto"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


function VideoExitPrompt2({
  title,
  onComplete,
  onContinue,
  onWatchLater,
}: {
  title: string;
  onComplete: () => void;
  onContinue: () => void;
  onWatchLater: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[1200] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#05070b] p-5 text-center text-white shadow-[0_30px_120px_-42px_rgba(0,0,0,0.96)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff5a4f]">Video en progreso</p>
        <h2 className="mt-3 text-xl font-semibold leading-tight text-[#f7f8fb]">¿Terminaste de ver el video completo?</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#aeb7c2]">{title}</p>
        <p className="mt-3 text-[12px] font-semibold leading-5 text-[#ff5a4f]">
          Detectamos más de 1 minuto de reproducción. Confirma si ya lo completaste o guárdalo para seguir después.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#55c87b]/45 bg-[#55c87b]/15 px-4 text-[12px] font-black uppercase tracking-[0.12em] text-[#d6ffe2] transition hover:bg-[#55c87b]/24"
          >
            COMPLETO
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[12px] font-black uppercase tracking-[0.12em] text-[#f4f7fb] transition hover:bg-white/[0.1]"
          >
            SEGUIR VIENDO
          </button>
        </div>
        <button
          type="button"
          onClick={onWatchLater}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#ff5a4f]/35 bg-[#ff5a4f]/10 px-4 text-[12px] font-black uppercase tracking-[0.12em] text-[#ffb2aa] transition hover:bg-[#ff5a4f]/16"
        >
          VER MÁS TARDE
        </button>
      </div>
    </div>
  );
}


// Bottom Inspiration videos row
function VideoInspirationRail2({
  videos,
  selectedCountryCode,
  activity,
  totalVideos,
  highlightedVideoId,
  onSelect
}: {
  videos: TravelVideoLocation[];
  selectedCountryCode: string | null;
  activity: Pick<VideoActivityController, "seenIds" | "featuredIds" | "watchStatusById">;
  totalVideos: number;
  highlightedVideoId: string | null;
  onSelect: (video: TravelVideoLocation) => void;
}) {
  const [railFilter, setRailFilter] = useState<"all" | "favorites" | "watched" | "incomplete">("all");
  const selectedCountryName =
    selectedCountryCode
      ? getCountryNameInSpanish(
          selectedCountryCode,
          videos.find((video) => String(video.country_code || "").toUpperCase() === selectedCountryCode)?.country_name
        )
      : null;
  const countryVideos = useMemo(() => {
    const normalizedCountry = String(selectedCountryCode || "").toUpperCase().trim();
    if (!normalizedCountry) return videos;
    const sameCountryVideos = videos.filter((video) => String(video.country_code || "").toUpperCase() === normalizedCountry);
    return sameCountryVideos.length > 0 ? sameCountryVideos : videos;
  }, [selectedCountryCode, videos]);
  const railVideos = useMemo(() => {
    if (railFilter === "all") return countryVideos;
    return countryVideos.filter((video) => {
      const videoId = String(video.youtube_video_id || "").trim();
      if (!videoId) return false;
      if (railFilter === "favorites") return activity.featuredIds?.has(videoId) === true;
      const watchState = getProposalVideoWatchState(videoId, activity);
      if (railFilter === "watched") return watchState === "watched";
      return watchState === "incomplete";
    });
  }, [activity, countryVideos, railFilter]);

  return (
    <section className="bg-[#03060a]/50 p-4 border border-white/[0.06] rounded-xl shrink-0 h-[230px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-[14px] font-black uppercase tracking-wider text-white">
            {selectedCountryCode ? (
              <>
                Videos en {countryCodeToFlag(selectedCountryCode)}{" "}
                <span className="text-[#ff5a3d]">{selectedCountryName || selectedCountryCode}</span>
              </>
            ) : (
              "Videos para inspirarte"
            )}
          </h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7f8894]">
            {railVideos.length} de {countryVideos.length || totalVideos} videos
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {[
            { id: "all" as const, label: "Todo" },
            { id: "favorites" as const, label: "Favoritos" },
            { id: "watched" as const, label: "Completados" },
            { id: "incomplete" as const, label: "Incompletos" },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              type="button"
              onClick={() => setRailFilter((current) => (current === filterOption.id ? "all" : filterOption.id))}
              className={cn(
                "h-7 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.1em] transition",
                railFilter === filterOption.id
                  ? "border-[#ff5a3d]/35 bg-[#ff5a3d]/12 text-[#ffb6a8]"
                  : "border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]"
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
        {railVideos.map((video) => {
          const countryCode = String(video.country_code || "").toUpperCase();
          const videoViews = Number(video.view_count || 0);
          const durationMinutes = Math.max(1, Math.round(Number(video.duration_seconds || 0) / 60));
          const watchState = getProposalVideoWatchState(video.youtube_video_id, activity);
          const isWatched = watchState === "watched";
          const isIncomplete = watchState === "incomplete";
          const isWatchLater = watchState === "watch_later";
          const videoId = String(video.youtube_video_id || "").trim();
          const isHighlighted = Boolean(videoId) && videoId === String(highlightedVideoId || "").trim();

          return (
            <div 
              key={video.youtube_video_id} 
              className={cn(
                "group relative h-[126px] w-[215px] shrink-0 overflow-hidden rounded-xl border bg-white/[0.02] transition",
                isHighlighted && "border-[#ff7d63] ring-1 ring-[#ff7d63]/70",
                isWatched && "border-emerald-400/60 bg-emerald-500/[0.08] hover:border-emerald-300/80",
                isWatchLater && "border-blue-400/60 bg-blue-400/[0.08] hover:border-blue-300/80",
                isIncomplete && "border-red-400/60 bg-red-400/[0.08] hover:border-red-300/80",
                !isWatched && !isIncomplete && !isWatchLater && !isHighlighted && "border-white/[0.07] hover:border-[#ff5a3d]/20"
              )}
            >
              {/* Image background cover */}
              <Image 
                src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} 
                alt={video.title} 
                fill 
                sizes="215px" 
                className="object-cover opacity-85 transition duration-300 group-hover:scale-105" 
              />
              {/* Card gradient overlay */}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.85))]" />
              {isWatched ? <span className="absolute inset-0 bg-emerald-500/18 mix-blend-screen" /> : null}
              {isIncomplete ? <span className="absolute inset-0 bg-red-400/16 mix-blend-screen" /> : null}
              {isWatchLater ? <span className="absolute inset-0 bg-blue-400/16 mix-blend-screen" /> : null}

              {/* Top metadata tags */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                <span className="rounded bg-black/40 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold text-slate-300 flex items-center gap-1">
                  <Clock size={10} /> {durationMinutes} min
                </span>
                <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1">
                  <Eye size={10} /> {formatCompactMetric(videoViews)}
                </span>
              </div>

              {/* Bottom text block with creator avatar */}
              <button 
                type="button" 
                className="absolute inset-0 pt-12 p-3 text-left w-full h-full"
                onClick={() => onSelect(video)}
              >
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="line-clamp-1 text-[11px] font-black text-white group-hover:text-[#ff7d63] transition leading-tight">
                    {video.title}
                  </span>
                  
                  {/* Creator and location inline tag */}
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-bold text-[#cbd3dc]">
                    <span>{countryCodeToFlag(countryCode)}</span>
                    <span className="opacity-40">•</span>
                    <span className="truncate">{getCountryNameInSpanish(video.country_code, video.country_name)}</span>
                  </span>
                </div>
              </button>
            </div>
          );
        })}
        {railVideos.length === 0 ? (
          <div className="flex min-h-[165px] items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center text-[12px] text-[#8f98a4]">
            No hay videos para este filtro.
          </div>
        ) : null}
      </div>
    </section>
  );
}

// Right Sidebar (Metrics, Sponsors and Patrons CTA)
function ProposalRightRail2({
  channel,
  onBecomePatron,
  onManageSponsors,
  onAction,
  onOpenAdmin,
  analytics,
  votePanel,
}: {
  channel: TravelChannel;
  onBecomePatron: () => void;
  onManageSponsors: () => void;
  onAction: (m: string) => void;
  onOpenAdmin: () => void;
  analytics: ProposalAnalytics;
  votePanel: {
    candidates: Array<{ code: string; name: string; count: number; votes: number }>;
    prompt: LocalVotePrompt | null;
    votedCountryCode: string | null;
    onSelectCountry: (countryCode: string) => void;
    onConfirmVote: (countryCode: string) => void;
    onCancelVote: () => void;
  } | null;
}) {
  const channelAvatarSrc = channel.thumbnail_url || "/creators/luisito-comunica.png";
  const channelName = channel.channel_name || "Canal";
  const isCreatorWorkspace = true;

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <section className="rounded-xl border border-white/[0.06] bg-[#050b10]/60 p-4 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-center">
          <span className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
            <Image src={channelAvatarSrc} alt={channelName} fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <p className="truncate text-[14px] font-black leading-tight text-white">{channelName}</p>
              <CheckCircle size={15} weight="fill" className="shrink-0 text-[#ff5a3d]" />
            </div>
            <p className="mt-0.5 text-[10px] font-medium leading-none text-[#818a93]">Creador de Contenido</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 py-3">
          <div className="border-r border-white/[0.06] text-center">
            <p className="font-mono text-[16px] font-black leading-none text-white">{formatCompactMetric(analytics.countries)}</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Paises</p>
          </div>
          <div className="border-r border-white/[0.06] text-center">
            <p className="font-mono text-[16px] font-black leading-none text-white">{formatCompactMetric(analytics.cities)}</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Ciudades</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-[16px] font-black leading-none text-white">{formatCompactMetric(analytics.videos)}</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Videos</p>
          </div>
        </div>
      </section>

      {votePanel ? (
        <MapVotePanel2
          candidates={votePanel.candidates}
          prompt={votePanel.prompt}
          votedCountryCode={votePanel.votedCountryCode}
          variant="sidebar"
          mode={isCreatorWorkspace ? "creator" : "viewer"}
          onSelectCountry={votePanel.onSelectCountry}
          onConfirmVote={votePanel.onConfirmVote}
          onCancelVote={votePanel.onCancelVote}
          onOpenAdmin={isCreatorWorkspace ? onOpenAdmin : undefined}
          onFinalizeVote={isCreatorWorkspace ? () => onAction("Votacion finalizada.") : undefined}
        />
      ) : null}
      
      {/* 1. Trip metrics box */}
      <section className="rounded-xl border border-white/[0.06] bg-[#050b10]/60 p-4 shadow-sm flex flex-col">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93] mb-4">
          Tu viaje en números
        </h2>
        
        {/* Metric widgets grouped horizontally */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <MapPin size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">{formatCompactMetric(analytics.exploredPlaces)}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Lugares explorados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <Clock size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">{formatCompactMetric(analytics.watchedHours)}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Horas vistas del canal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <GlobeHemisphereWest size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">{formatCompactMetric(analytics.visitedCountries)}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Países visitados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <Heart size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">{formatCompactMetric(analytics.reactions)}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Reacciones recibidas</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Sponsors Box */}
      <section className="rounded-xl border border-white/[0.06] bg-[#050b10]/60 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93]">
            Mis sponsors
          </h2>
          <button 
            type="button" 
            className="text-[10px] font-bold text-[#b9c1cb] hover:text-white transition"
            onClick={onManageSponsors}
          >
            Gestionar
          </button>
        </div>

        {/* Sponsor lists */}
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
          {[
            { name: "GoPro", desc: "Cámaras y accesorios", url: "gopro.com", logo: GoProLogo },
            { name: "IATI Seguros", desc: "Seguros de viaje", url: "iatiseguros.com", logo: IatiLogo },
            { name: "Wise", desc: "Envía dinero al mundo", url: "wise.com", logo: WiseLogo },
            { name: "The North Face", desc: "Ropa y equipamiento", url: "thenorthface.com", logo: NorthFaceLogo },
            { name: "Booking.com", desc: "Alojamientos de viaje", url: "booking.com", logo: BookingLogo }
          ].map((sponsor) => {
            const BrandLogo = sponsor.logo;
            return (
              <div 
                key={sponsor.name} 
                className="flex items-center gap-3 p-2 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:border-white/[0.07] transition group"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden block">
                  <BrandLogo />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-white group-hover:text-[#ff7d63] transition leading-tight">{sponsor.name}</p>
                  <p className="truncate text-[10px] text-[#818a93] font-semibold leading-normal mt-0.5">{sponsor.desc}</p>
                  <p className="truncate text-[9px] text-slate-500 font-semibold leading-none">{sponsor.url}</p>
                </div>
                <button 
                  type="button" 
                  className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.02] px-3.5 text-[9px] font-black text-white hover:bg-white/[0.07] hover:border-white/20 transition-all flex items-center" 
                  onClick={() => {
                    onAction(`Redirigiendo a sponsor: ${sponsor.name}`);
                    window.open(`https://${sponsor.url}`, "_blank", "noopener");
                  }}
                >
                  Ir al sitio
                </button>
              </div>
            );
          })}
        </div>

      </section>

      {/* 3. Support Patronage banner */}
      <section className="sticky bottom-0 z-10 mt-auto rounded-xl border border-[#ff5a3d]/15 bg-[radial-gradient(ellipse_at_top_right,rgba(255,90,61,0.06),transparent_60%)] bg-[#050b10]/88 p-4 shadow-[0_-18px_40px_-26px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff937d]">
          Crea tu mapa
        </h2>
        <p className="mt-2 truncate whitespace-nowrap text-[11px] leading-relaxed font-medium text-[#c4cdd6]">
          Muestra tu ruta, tus videos y tus países visitados en una experiencia premium.
        </p>

        {/* Overlapping subscriber profile avatars */}
        <div className="mt-4 flex items-center">
          <div className="flex -space-x-2.5">
            {[
              "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80",
              "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80",
              "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=80&h=80&q=80",
              "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=80&h=80&q=80",
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80",
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
            ].map((img, idx) => (
              <span 
                key={idx} 
                className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-[#050b10] block"
              >
                <Image src={img} alt="Patron avatar" fill sizes="28px" className="object-cover" />
              </span>
            ))}
          </div>
          <span className="ml-3 rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black text-[#c4cdd6] bg-white/[0.02]">
            +245
          </span>
        </div>

        {/* Action buttonHazte Patrocinador */}
        <button 
          type="button" 
          className="mt-[18px] flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6d4e_0%,#e03d1a_100%)] text-[12px] font-black text-white shadow-[0_12px_24px_-8px_rgba(224,61,26,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all"
          onClick={onBecomePatron}
        >
          <Compass size={15} weight="fill" className="animate-pulse" />
          Crear mi mapa
        </button>
      </section>
    </div>
  );
}

// Sidebar Drawer layout on mobile views
function MobileDrawer2({
  channel,
  open,
  onClose,
  onNavigate
}: {
  channel: TravelChannel;
  open: boolean;
  onClose: () => void;
  onNavigate: (label: string) => void;
}) {
  const channelAvatarSrc = channel.thumbnail_url || "/creators/luisito-comunica.png";
  const channelName = channel.channel_name || "Canal";
  const channelHandle = channel.channel_handle ? `@${channel.channel_handle.replace(/^@/, "")}` : "@canal";

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm 2xl:hidden" onClick={onClose}>
      <aside className="h-full w-[265px] border-r border-white/10 bg-[#04080d] p-5 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 block h-9 w-9">
              <Image src={channelAvatarSrc} alt={channelName} fill sizes="34px" className="object-cover" />
            </span>
            <div>
              <p className="text-[12px] font-black text-white">{channelName}</p>
              <p className="text-[9px] text-slate-400 font-semibold leading-none">{channelHandle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar menu" className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5 mt-4">
          {["Explorar", "Videos en vivo", "Destinos", "Sponsors", "Guardados", "Patrocinadores"].map((label) => (
            <button 
              key={label} 
              type="button" 
              className="flex h-10 w-full items-center rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.05] px-3.5 text-left text-[11px] font-bold text-white transition" 
              onClick={() => {
                onNavigate(label);
                onClose();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
