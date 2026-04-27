"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import {
  ChartBar,
  GearSix,
  House,
  MapPin,
  Trophy,
  UsersThree,
  Video,
} from "@phosphor-icons/react";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { MissingVideosDialog } from "@/components/map/missing-videos-dialog";
import { VideoCarouselDialog } from "@/components/map/video-carousel-dialog";
import { TravelGlobe } from "@/components/travel-globe";
import {
  buildCountryBuckets,
  buildDestinationCandidates,
} from "@/components/map/lib/aggregations";
import {
  buildChannelUrl,
  sortRecentVideos,
} from "@/components/map/lib/format";
import { DesktopMapShell } from "@/components/map/shell/desktop-shell";
import { MobileMapShell, MobileSidePanel } from "@/components/map/shell/mobile-shell";
import type { MobileMapTab } from "@/components/map/shell/mobile-shell";
import type {
  FilterWindow,
  MapShellProps,
  PollOptionInput,
  SidebarNavItem,
  SyncState,
  SyncSummary,
} from "@/components/map/shell/shell-types";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

// Stable empty references avoid re-rendering child shells just because the
// parent passed in a freshly-allocated array on each render.
const EMPTY_MANUAL_QUEUE: ManualVerificationItem[] = [];
const DEFAULT_VIEWER: MapViewerContext = { isOwner: false, shareUrl: "", adminUrl: null };

interface MapExperienceProps {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  manualQueue?: ManualVerificationItem[];
  summary?: MapSummary | null;
  channelId?: string | null;
  allowRefresh?: boolean;
  showLegend?: boolean;
  showOperationsPanel?: boolean;
  showActiveVideoCard?: boolean;
  interactive?: boolean;
  showHeader?: boolean;
  viewer?: MapViewerContext;
  sponsors?: MapRailSponsor[];
  activePoll?: MapPollRecord | null;
  availablePollOptions?: PollOptionInput[];
  /** Optional eyebrow string consumed by host pages for telemetry; the shell ignores it. */
  headerEyebrow?: string;
  /** Future hook: alternate layouts; currently only `"full"` is meaningful. */
  layoutVariant?: "full";
}

/**
 * `MapExperience` is the orchestrator: it owns all stateful concerns
 * (filtering, sync, polling, country focus, dialogs) and threads derived
 * data into one of the two presentation shells (`DesktopMapShell` or
 * `MobileMapShell`). The shells are intentionally dumb so we can iterate
 * on layout per breakpoint without touching state logic.
 *
 * The previous implementation lived in this file at >1,800 lines, mixing
 * orchestration with deeply nested layout JSX. The split keeps each piece
 * focused and makes responsive bugs much easier to track down.
 */
export function MapExperience({
  channel,
  videoLocations,
  manualQueue,
  summary = null,
  channelId = null,
  allowRefresh = false,
  showLegend = true,
  showOperationsPanel = true,
  showActiveVideoCard = true,
  interactive = true,
  showHeader = true,
  viewer = DEFAULT_VIEWER,
  sponsors = [],
  activePoll = null,
  availablePollOptions = [],
  headerEyebrow,
}: MapExperienceProps) {
  const incomingManualQueue = manualQueue ?? EMPTY_MANUAL_QUEUE;
  const [items, setItems] = useState<TravelVideoLocation[]>(videoLocations);
  const [pendingManual, setPendingManual] = useState<ManualVerificationItem[]>(incomingManualQueue);
  const [windowFilter, setWindowFilter] = useState<FilterWindow>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [focusCountryCode, setFocusCountryCode] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);
  const [pinnedVideo, setPinnedVideo] = useState<TravelVideoLocation | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null);
  const [manualDrafts, setManualDrafts] = useState<Record<string, { country_code: string; city: string }>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [missingVideosOpen, setMissingVideosOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuHidden, setDesktopMenuHidden] = useState(false);
  const [pollState, setPollState] = useState<MapPollRecord | null>(activePoll);
  const [mobileTab, setMobileTab] = useState<MobileMapTab>("overview");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videosRailRef = useRef<HTMLDivElement | null>(null);
  const votesRailRef = useRef<HTMLDivElement | null>(null);
  const sponsorsRailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(videoLocations);
  }, [videoLocations]);

  useEffect(() => {
    setPendingManual(incomingManualQueue);
  }, [incomingManualQueue]);

  useEffect(() => {
    setPollState(activePoll);
  }, [activePoll]);

  // Initialise mobile tab from the URL hash so users can deep-link into
  // /dashboard#videos or /map#community and land on the right tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (hash === "map" || hash === "videos" || hash === "community" || hash === "more") {
      setMobileTab(hash as MobileMapTab);
    }
  }, []);

  /*
   * The globe owns wheel-based zoom internally. Without this we'd let the
   * page scroll *and* the globe zoom, which felt broken on trackpads. We
   * still let designated scroll containers (`data-map-scroll="true"`)
   * receive wheel events so the rails scroll normally.
   */
  useEffect(() => {
    if (!interactive) return;
    const root = rootRef.current;
    if (!root) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-map-scroll='true']")) return;
      event.preventDefault();
    };

    root.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => root.removeEventListener("wheel", handleWheel, true);
  }, [interactive]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const timeFilteredVideos = useMemo(() => {
    if (windowFilter === "all") return items;
    const days = Number(windowFilter);
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return items.filter((video) => {
      const publishedAt = video.published_at ? new Date(video.published_at).getTime() : 0;
      return publishedAt > threshold;
    });
  }, [items, windowFilter]);

  const searchFilteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return timeFilteredVideos;

    return timeFilteredVideos.filter((video) =>
      [
        video.title,
        video.description || "",
        video.country_name || "",
        video.country_code || "",
        video.city || "",
        video.region || "",
        video.location_label || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, timeFilteredVideos]);

  const countryBuckets = useMemo(() => buildCountryBuckets(searchFilteredVideos), [searchFilteredVideos]);

  const selectedCountryVideos = useMemo(() => {
    if (!selectedCountryCode) return [];
    return searchFilteredVideos
      .filter((video) => String(video.country_code || "").toUpperCase() === selectedCountryCode)
      .sort(sortRecentVideos);
  }, [searchFilteredVideos, selectedCountryCode]);

  const filteredVideos = useMemo(() => {
    if (!selectedCountryCode) return searchFilteredVideos;
    return selectedCountryVideos;
  }, [searchFilteredVideos, selectedCountryCode, selectedCountryVideos]);

  const recentVideos = useMemo(() => items.slice().sort(sortRecentVideos).slice(0, 6), [items]);
  const visibleRecentVideos = selectedCountryCode ? selectedCountryVideos.slice(0, 6) : recentVideos;
  const selectedCountryName =
    selectedCountryVideos[0]?.country_name ||
    countryBuckets.find((country) => country.country_code === selectedCountryCode)?.country_name ||
    selectedCountryCode;

  const resolvedSummary = useMemo(() => {
    if (summary) return summary;

    const totalCountries = new Set(items.map((video) => video.country_code).filter(Boolean)).size;
    return {
      total_videos: items.length + pendingManual.length,
      total_countries: totalCountries,
      verified_auto: items.filter(
        (video) => video.location_status === "verified_auto" || video.location_status === "mapped"
      ).length,
      verified_manual: items.filter((video) => video.location_status === "verified_manual").length,
      needs_manual: pendingManual.length,
    };
  }, [items, pendingManual.length, summary]);

  const cityCount = useMemo(() => {
    const cities = new Set<string>();
    for (const video of items) {
      const key = String(video.city || video.location_label || "")
        .trim()
        .toLowerCase();
      if (key) cities.add(key);
    }
    return cities.size;
  }, [items]);

  const destinationCandidates = useMemo(
    () => buildDestinationCandidates(pollState, countryBuckets),
    [countryBuckets, pollState]
  );
  const nextDestination = destinationCandidates[0] || null;
  const youtubeUrl = buildChannelUrl(channel);
  const mapUrl = viewer.shareUrl || (channelId ? `/map?channelId=${encodeURIComponent(channelId)}` : "/map");
  const shouldShowChrome = showHeader || showLegend || showOperationsPanel || showActiveVideoCard;

  async function reloadMapData() {
    if (!channelId) return;
    const response = await fetch(`/api/map/data?channelId=${encodeURIComponent(channelId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo recargar el mapa.");
    const payload = (await response.json()) as {
      videoLocations: TravelVideoLocation[];
      manualQueue: ManualVerificationItem[];
    };
    setItems(payload.videoLocations || []);
    setPendingManual(payload.manualQueue || []);
  }

  async function handleRefresh() {
    if (!allowRefresh || !channelId) return;
    setSyncState("running");
    setSyncError(null);

    try {
      const response = await fetch("/api/map/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const payload = (await response.json()) as {
        summary?: SyncSummary;
        manualQueue?: ManualVerificationItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "No se pudo completar la sincronizacion.");

      setLastSyncSummary(payload.summary || null);
      setPendingManual(payload.manualQueue || []);
      await reloadMapData();
      setSyncState("success");
      posthog.capture("map_refreshed", {
        channel_id: channelId,
        channel_name: channel.channel_name,
        videos_scanned: payload.summary?.videos_scanned ?? null,
        videos_extracted: payload.summary?.videos_extracted ?? null,
      });
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "Error de sincronizacion");
    }
  }

  async function handleManualConfirm(
    video: ManualVerificationItem,
    draftInput?: { country_code: string; city: string }
  ) {
    if (!channelId) return;
    const draft =
      draftInput || manualDrafts[video.video_id] || {
        country_code: video.country_code || "",
        city: video.city || "",
      };

    if (!draft.country_code.trim()) return;

    const response = await fetch("/api/map/manual-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        videoId: video.video_id,
        country_code: draft.country_code.trim().toUpperCase(),
        city: draft.city.trim(),
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "No se pudo confirmar manualmente");
  }

  function locateFirstSearchResult() {
    const first = searchFilteredVideos[0];
    if (!first?.country_code) return;
    selectCountry(String(first.country_code).toUpperCase());
  }

  // Memoize so the `mobileNavItems` useMemo below has a stable dep entry.
  // Re-creating `selectCountry` on every render was invalidating the memo
  // every frame, defeating its purpose.
  const selectCountry = useCallback(
    (countryCode: string | null) => {
      const normalized = countryCode ? String(countryCode).toUpperCase() : null;
      setSelectedCountryCode(normalized);
      setFocusCountryCode(normalized);
      if (normalized) {
        posthog.capture("map_country_selected", {
          country_code: normalized,
          channel_id: channelId,
          channel_name: channel.channel_name,
        });
      }
    },
    [channelId, channel.channel_name],
  );

  function openVideo(video: TravelVideoLocation) {
    setPinnedVideo(video);
    setFocusCountryCode(video.country_code || null);
    posthog.capture("map_video_opened", {
      video_id: video.youtube_video_id,
      video_title: video.title,
      country_code: video.country_code,
      country_name: video.country_name,
      channel_id: channelId,
    });
  }

  async function copyShareUrl() {
    const shareUrl = viewer.shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      posthog.capture("map_share_url_copied", {
        channel_id: channelId,
        channel_name: channel.channel_name,
      });
    } catch {
      setCopyState("error");
    }
  }

  function scrollToRail(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  }

  /*
   * Build the mobile side-panel nav items inline. We previously delegated to
   * a `buildMobileNavItems` helper, but the `react-hooks/refs` rule kept
   * flagging the call site whenever the rail refs flowed through (even via
   * pre-bound `useCallback`s). Since the desktop sidebar already builds its
   * own list inline and the two lists never had a perfect overlap anyway,
   * inlining here is simpler and avoids tripping the lint rule.
   */
  const mobileNavItems = useMemo<SidebarNavItem[]>(() => {
    const items: Array<SidebarNavItem | null> = [
      { label: "Inicio", icon: House, href: "/" },
      {
        label: "Mapa",
        icon: MapPin,
        onClick: () => selectCountry(null),
        count: resolvedSummary.total_countries,
      },
      {
        label: "Videos",
        icon: Video,
        onClick: () => scrollToRail(videosRailRef),
        count: resolvedSummary.total_videos,
      },
      pollState || viewer.isOwner
        ? {
            label: "Votaciones",
            icon: Trophy,
            onClick: () => scrollToRail(votesRailRef),
            count: pollState?.total_votes || undefined,
          }
        : null,
      sponsors.length > 0
        ? {
            label: "Sponsors",
            icon: UsersThree,
            onClick: () => scrollToRail(sponsorsRailRef),
            count: sponsors.length,
          }
        : null,
      viewer.isOwner && viewer.adminUrl
        ? { label: "Analytics", icon: ChartBar, href: viewer.adminUrl }
        : null,
      viewer.isOwner && pendingManual.length > 0
        ? {
            label: "Ajustes",
            icon: GearSix,
            onClick: () => setMissingVideosOpen(true),
            count: pendingManual.length,
          }
        : null,
    ];
    /*
     * `react-hooks/refs` flags this `.filter` because the array we are
     * filtering contains closures that capture rail refs (e.g.
     * `() => scrollToRail(videosRailRef)`). Those closures defer the
     * `.current` read until click, never during render, so the warning is
     * a false positive here. The dep list is also intentionally narrow:
     * `scrollToRail` is recreated each render and reads only stable ref
     * objects, so excluding it does not cause stale closures.
     */
    // eslint-disable-next-line react-hooks/refs
    return items.filter((item): item is SidebarNavItem => Boolean(item));
  }, [
    viewer,
    resolvedSummary,
    pollState,
    sponsors,
    pendingManual,
    selectCountry,
    setMissingVideosOpen,
  ]);

  const shellProps: MapShellProps = {
    channel,
    channelId,
    headerEyebrow,
    viewer,
    youtubeUrl,
    mapUrl,
    resolvedSummary,
    cityCount,
    pendingManual,
    pollState,
    sponsors,
    countryBuckets,
    selectedCountryCode,
    selectedCountryName,
    visibleRecentVideos,
    nextDestination,
    destinationCandidates,
    activeVideo,
    showLegend,
    showOperationsPanel,
    showActiveVideoCard,
    windowFilter,
    searchQuery,
    syncState,
    syncError,
    lastSyncSummary,
    copyState,
    allowRefresh,
    interactive,
    mobileMenuOpen,
    desktopMenuHidden,
    availablePollOptions,
    videosRailRef,
    votesRailRef,
    sponsorsRailRef,
    setWindowFilter,
    setSearchQuery,
    setMobileMenuOpen,
    setDesktopMenuHidden,
    setPollState,
    locateFirstSearchResult,
    selectCountry,
    openVideo,
    copyShareUrl,
    handleRefresh,
    setMissingVideosOpen,
    scrollToRail,
  };

  // The headless variant (legacy callers that only want a globe with no
  // chrome) keeps its short-circuit. Everything else renders the full shell.
  if (!shouldShowChrome) {
    return (
      <div
        ref={rootRef}
        className={cn(
          "relative min-h-[100dvh] w-full overflow-hidden bg-[#05080d]",
          !interactive && "pointer-events-none"
        )}
      >
        <TravelGlobe
          channelData={channel}
          videoLocations={filteredVideos}
          interactive={interactive}
          showControls={false}
          showSponsorBanner={false}
          pointMode="video"
          showSummaryCard={false}
          showPointPanel={false}
          onActiveVideoChange={setActiveVideo}
          onPinnedVideoChange={setPinnedVideo}
          onCountrySelect={selectCountry}
          focusCountryCode={focusCountryCode}
          selectedCountryCode={selectedCountryCode}
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative min-h-[100dvh] w-full overflow-hidden bg-[#05080d]",
        !interactive && "pointer-events-none"
      )}
    >
      <TravelGlobe
        channelData={channel}
        videoLocations={filteredVideos}
        interactive={interactive}
        showControls={false}
        showSponsorBanner={false}
        pointMode="video"
        showSummaryCard={false}
        showPointPanel={false}
        onActiveVideoChange={setActiveVideo}
        onPinnedVideoChange={setPinnedVideo}
        onCountrySelect={selectCountry}
        focusCountryCode={focusCountryCode}
        selectedCountryCode={selectedCountryCode}
      />

      {/*
       * Two soft gradient curtains that bring readability to the chrome
       * panels without obscuring the globe. They are explicitly hidden
       * from screen readers since they are pure decoration.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,0.94),rgba(5,8,13,0.45)_24%,rgba(5,8,13,0.04)_48%,rgba(5,8,13,0.55)_78%,rgba(5,8,13,0.92))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,13,0.65),rgba(5,8,13,0.04)_34%,rgba(5,8,13,0.78))]"
      />

      <DesktopMapShell {...shellProps} />
      <MobileMapShell {...shellProps} mobileTab={mobileTab} setMobileTab={setMobileTab} />

      <MobileSidePanel
        channel={channel}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={mobileNavItems}
        copyShareUrl={copyShareUrl}
        copyState={copyState}
      />

      <MissingVideosDialog
        open={missingVideosOpen}
        onOpenChange={setMissingVideosOpen}
        pendingManual={pendingManual}
        manualDrafts={manualDrafts}
        setManualDrafts={setManualDrafts}
        availableOptions={availablePollOptions}
        lastSyncSummary={lastSyncSummary}
        onConfirm={handleManualConfirm}
        onReload={reloadMapData}
      />

      <VideoCarouselDialog
        open={Boolean(pinnedVideo)}
        videos={searchFilteredVideos}
        currentVideo={pinnedVideo}
        onClose={() => setPinnedVideo(null)}
        onChangeVideo={(video) => setPinnedVideo(video)}
      />
    </div>
  );
}

// FanVoteCard is re-exported for tree shaking parity with previous public API.
export { FanVoteCard };
