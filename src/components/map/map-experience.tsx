"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  CaretRight,
  ChartBar,
  Check,
  Clock,
  Copy,
  DotsThree,
  GearSix,
  House,
  LinkSimple,
  List,
  MagnifyingGlass,
  MapPin,
  Play,
  Plus,
  Star,
  Target,
  Trophy,
  UsersThree,
  Video,
  WarningCircle,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import posthog from "posthog-js";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { MissingVideosDialog } from "@/components/map/missing-videos-dialog";
import { VideoCarouselDialog } from "@/components/map/video-carousel-dialog";
import { TravelGlobe } from "@/components/travel-globe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

type FilterWindow = "30" | "90" | "365" | "all";
type SyncState = "idle" | "running" | "success" | "error";
type MobileMapTab = "overview" | "map" | "videos" | "community" | "more";
type MapViewMode = "viewer" | "creator" | "demo";
type DesktopMapTab = "all" | "watched" | "saved" | "featured";
type GlobeCommandAction = "reset_view" | "zoom_out" | "toggle_rotation";

const EMPTY_MANUAL_QUEUE: ManualVerificationItem[] = [];
const DEFAULT_VIEWER: MapViewerContext = { isOwner: false, shareUrl: "", adminUrl: null };

interface PollOptionInput {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

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
  headerEyebrow?: string;
  viewMode?: MapViewMode;
  layoutVariant?: "full";
}

type SyncSummary = {
  videos_scanned: number;
  videos_extracted: number;
  videos_verified_auto: number;
  videos_needs_manual: number;
  videos_verified_manual: number;
  excluded_shorts: number;
  excluded_non_travel: number;
};

type CountryBucket = {
  country_code: string;
  country_name: string;
  count: number;
  views: number;
  cities: string[];
};

type DestinationCandidate = {
  country_code: string;
  country_name: string;
  cities: string[];
  votes: number;
  percent: number;
  source: "poll" | "videos";
};

type SidebarNavItem = {
  label: string;
  icon: Icon;
  href?: string;
  onClick?: () => void;
  count?: number;
};

type MapShellProps = {
  channel: TravelChannel;
  channelId: string | null;
  viewer: MapViewerContext;
  youtubeUrl: string | null;
  mapUrl: string;
  resolvedSummary: MapSummary;
  cityCount: number;
  pendingManual: ManualVerificationItem[];
  pollState: MapPollRecord | null;
  sponsors: MapRailSponsor[];
  headerEyebrow?: string;
  countryBuckets: CountryBucket[];
  selectedCountryCode: string | null;
  selectedCountryName: string | null;
  visibleRecentVideos: TravelVideoLocation[];
  nextDestination: DestinationCandidate | null;
  destinationCandidates: DestinationCandidate[];
  activeVideo: TravelVideoLocation | null;
  showLegend: boolean;
  showOperationsPanel: boolean;
  showActiveVideoCard: boolean;
  windowFilter: FilterWindow;
  searchQuery: string;
  syncState: SyncState;
  syncError: string | null;
  lastSyncSummary: SyncSummary | null;
  copyState: "idle" | "copied" | "error";
  allowRefresh: boolean;
  interactive: boolean;
  viewMode: MapViewMode;
  canUseAdminPanels: boolean;
  desktopMapTab: DesktopMapTab;
  mobileMenuOpen: boolean;
  desktopMenuHidden: boolean;
  availablePollOptions: PollOptionInput[];
  videosRailRef: RefObject<HTMLDivElement | null>;
  votesRailRef: RefObject<HTMLDivElement | null>;
  sponsorsRailRef: RefObject<HTMLDivElement | null>;
  setWindowFilter: Dispatch<SetStateAction<FilterWindow>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setDesktopMenuHidden: Dispatch<SetStateAction<boolean>>;
  setPollState: Dispatch<SetStateAction<MapPollRecord | null>>;
  setDesktopMapTab: Dispatch<SetStateAction<DesktopMapTab>>;
  issueGlobeCommand: (action: GlobeCommandAction) => void;
  locateFirstSearchResult: () => void;
  selectCountry: (countryCode: string | null) => void;
  openVideo: (video: TravelVideoLocation) => void;
  copyShareUrl: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  setMissingVideosOpen: Dispatch<SetStateAction<boolean>>;
  scrollToRail: (ref: RefObject<HTMLDivElement | null>) => void;
};

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
  viewMode,
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
  const [desktopMapTab, setDesktopMapTab] = useState<DesktopMapTab>("all");
  const [globeCommand, setGlobeCommand] = useState<{ id: number; action: GlobeCommandAction } | null>(null);
  const [pollState, setPollState] = useState<MapPollRecord | null>(activePoll);
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

  const watchedVideos = useMemo(() => {
    return searchFilteredVideos.filter((video) => {
      if (!video.youtube_video_id || typeof window === "undefined") return false;
      try {
        const raw = window.localStorage.getItem("travelmap_seen_videos_v1");
        if (!raw) return false;
        const parsed = JSON.parse(raw) as string[];
        return parsed.includes(video.youtube_video_id);
      } catch {
        return false;
      }
    });
  }, [searchFilteredVideos]);

  const featuredVideos = useMemo(() => searchFilteredVideos.slice(0, 5), [searchFilteredVideos]);

  const filteredVideos = useMemo(() => {
    if (desktopMapTab === "watched") return watchedVideos;
    if (desktopMapTab === "saved") return searchFilteredVideos;
    if (desktopMapTab === "featured") return featuredVideos;
    if (!selectedCountryCode) return searchFilteredVideos;
    return selectedCountryVideos;
  }, [desktopMapTab, watchedVideos, searchFilteredVideos, featuredVideos, selectedCountryCode, selectedCountryVideos]);

  const recentVideos = useMemo(() => items.slice().sort(sortRecentVideos).slice(0, 6), [items]);
  const visibleRecentVideos = selectedCountryCode ? selectedCountryVideos.slice(0, 6) : recentVideos;
  const selectedCountryName = selectedCountryVideos[0]?.country_name || countryBuckets.find((country) => country.country_code === selectedCountryCode)?.country_name || selectedCountryCode;

  const resolvedSummary = useMemo(() => {
    if (summary) return summary;

    const totalCountries = new Set(items.map((video) => video.country_code).filter(Boolean)).size;
    return {
      total_videos: items.length + pendingManual.length,
      total_countries: totalCountries,
      verified_auto: items.filter((video) => video.location_status === "verified_auto" || video.location_status === "mapped").length,
      verified_manual: items.filter((video) => video.location_status === "verified_manual").length,
      needs_manual: pendingManual.length,
    };
  }, [items, pendingManual.length, summary]);

  const cityCount = useMemo(() => {
    const cities = new Set<string>();
    for (const video of items) {
      const key = String(video.city || video.location_label || "").trim().toLowerCase();
      if (key) cities.add(key);
    }
    return cities.size;
  }, [items]);

  const destinationCandidates = useMemo(
    () => buildDestinationCandidates(pollState, countryBuckets),
    [countryBuckets, pollState]
  );
  const resolvedViewMode: MapViewMode = viewMode || (viewer.isOwner ? "creator" : "viewer");
  const canUseAdminPanels = resolvedViewMode === "creator" || resolvedViewMode === "demo" || viewer.isOwner;
  const shellViewer: MapViewerContext = canUseAdminPanels
    ? {
        ...viewer,
        isOwner: true,
        adminUrl: viewer.adminUrl || (channelId ? `/dashboard?channelId=${encodeURIComponent(channelId)}` : "/dashboard?demo=1"),
      }
    : {
        ...viewer,
        isOwner: false,
        adminUrl: null,
      };
  const nextDestination = destinationCandidates[0] || null;
  const youtubeUrl = buildChannelUrl(channel);
  const mapUrl = shellViewer.shareUrl || (channelId ? `/map?channelId=${encodeURIComponent(channelId)}` : "/map");
  const shouldShowChrome = showHeader || showLegend || showOperationsPanel || showActiveVideoCard;

  async function reloadMapData() {
    if (!channelId) return;
    const response = await fetch(`/api/map/data?channelId=${encodeURIComponent(channelId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo recargar el mapa.");
    const payload = (await response.json()) as { videoLocations: TravelVideoLocation[]; manualQueue: ManualVerificationItem[] };
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
      const payload = (await response.json()) as { summary?: SyncSummary; manualQueue?: ManualVerificationItem[]; error?: string };
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
    const draft = draftInput || manualDrafts[video.video_id] || {
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

  function selectCountry(countryCode: string | null) {
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
  }

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

    const copyWithTextarea = () => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
      } catch {
        return false;
      }
    };

    try {
      if (!copyWithTextarea() && typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      }
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

  function issueGlobeCommand(action: GlobeCommandAction) {
    setGlobeCommand({ id: Date.now(), action });
  }

  const shellProps: MapShellProps = {
    channel,
    channelId,
    viewer: shellViewer,
    youtubeUrl,
    mapUrl,
    resolvedSummary,
    cityCount,
    pendingManual,
    pollState,
    sponsors,
    headerEyebrow,
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
    viewMode: resolvedViewMode,
    canUseAdminPanels,
    desktopMapTab,
    setDesktopMapTab,
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
    issueGlobeCommand,
    selectCountry,
    openVideo,
    copyShareUrl,
    handleRefresh,
    setMissingVideosOpen,
    scrollToRail,
  };

  if (!shouldShowChrome) {
    return (
      <div ref={rootRef} className={cn("relative min-h-[100dvh] w-full overflow-hidden bg-[#05080d]", !interactive && "pointer-events-none")}>
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
          command={globeCommand}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative min-h-[100dvh] w-full overflow-hidden bg-[#05080d]", !interactive && "pointer-events-none")}>
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
        command={globeCommand}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,0.98),rgba(5,8,13,0.64)_24%,rgba(5,8,13,0.14)_48%,rgba(5,8,13,0.7)_78%,rgba(5,8,13,0.96))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,13,0.74),rgba(5,8,13,0.08)_34%,rgba(5,8,13,0.82))]" />

      <MapAppShell {...shellProps} />

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

function MapAppShell(props: MapShellProps) {
  const [mobileTab, setMobileTab] = useState<MobileMapTab>("overview");

  useEffect(() => {
    setMobileTab(getInitialMobileTab());
  }, []);

  return (
    <>
      <MobileMapShell {...props} mobileTab={mobileTab} setMobileTab={setMobileTab} />

      <div className="pointer-events-none absolute inset-0 z-[320] hidden min-h-0 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
        <MapSidebar {...props} />

        <main className="pointer-events-none relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <MapTopBar {...props} />

          <div
            data-map-scroll="true"
            className="pointer-events-auto grid min-h-0 grid-cols-1 gap-3 overflow-y-auto px-4 pb-4 xl:pointer-events-none xl:grid-cols-[minmax(238px,270px)_minmax(440px,1fr)_minmax(282px,318px)] xl:gap-3 xl:overflow-hidden xl:px-5 xl:pb-5"
          >
            <MapOverviewRail {...props} />
            <MapCenterStage {...props} />
            <MapRightRail {...props} />
          </div>
        </main>
      </div>
    </>
  );
}

function MobileMapShell({
  mobileTab,
  setMobileTab,
  ...props
}: MapShellProps & {
  mobileTab: MobileMapTab;
  setMobileTab: Dispatch<SetStateAction<MobileMapTab>>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[330] flex min-h-0 flex-col overflow-hidden bg-[#04080f]/35 lg:hidden">
      <div
        className={cn(
          "min-h-0 flex-1 px-4 pb-24 pt-5",
          mobileTab === "map" ? "pointer-events-none overflow-hidden" : "pointer-events-auto overflow-y-auto"
        )}
        data-map-scroll="true"
      >
        {mobileTab === "overview" ? <MobileOverviewView {...props} setMobileTab={setMobileTab} /> : null}
        {mobileTab === "map" ? <MobileMapView {...props} /> : null}
        {mobileTab === "videos" ? <MobileVideosView {...props} /> : null}
        {mobileTab === "community" ? <MobileCommunityView {...props} /> : null}
        {mobileTab === "more" ? <MobileMoreView {...props} /> : null}
      </div>

      <MobileBottomNav activeTab={mobileTab} setActiveTab={setMobileTab} voteCount={props.pollState?.total_votes || props.destinationCandidates.length} />
      <MobileMapMenu {...props} setMobileTab={setMobileTab} />
    </div>
  );
}

function MobileMapMenu({
  channel,
  viewer,
  mapUrl,
  youtubeUrl,
  resolvedSummary,
  pendingManual,
  pollState,
  sponsors,
  mobileMenuOpen,
  setMobileMenuOpen,
  setMissingVideosOpen,
  copyShareUrl,
  copyState,
  selectCountry,
  setMobileTab,
}: MapShellProps & { setMobileTab: Dispatch<SetStateAction<MobileMapTab>> }) {
  const closeMenu = () => setMobileMenuOpen(false);
  const goToTab = (tab: MobileMapTab) => {
    setMobileTab(tab);
    closeMenu();
  };

  return (
    <AnimatePresence>
      {mobileMenuOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-[390] bg-[#05080d]/80 backdrop-blur lg:hidden"
          onClick={closeMenu}
        >
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            className="flex h-full w-[288px] flex-col border-r border-white/10 bg-[#060a11] px-4 pb-4 pt-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ChannelAvatar channel={channel} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{channel.channel_name}</p>
                  <p className="text-[12px] text-[#9da5ae]">{formatNumber(Number(channel.subscriber_count || 0))} suscriptores</p>
                </div>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-white" aria-label="Cerrar menu" onClick={closeMenu}>
                <X size={19} />
              </button>
            </div>

            <nav className="space-y-1">
              <MobileMenuButton icon={House} label="Inicio" href="/" />
              <MobileMenuButton icon={MapPin} label="Mapa" count={resolvedSummary.total_countries} onClick={() => { selectCountry(null); goToTab("map"); }} />
              <MobileMenuButton icon={Video} label="Videos" count={resolvedSummary.total_videos} onClick={() => goToTab("videos")} />
              <MobileMenuButton icon={Trophy} label="Votaciones" count={pollState?.total_votes || undefined} onClick={() => goToTab("community")} />
              <MobileMenuButton icon={UsersThree} label="Sponsors" count={sponsors.length || undefined} onClick={() => goToTab("community")} />
              {viewer.isOwner ? <MobileMenuButton icon={GearSix} label="Ajustes" count={pendingManual.length || undefined} onClick={() => { setMissingVideosOpen(true); closeMenu(); }} /> : null}
              {viewer.isOwner && viewer.adminUrl ? <MobileMenuButton icon={ChartBar} label="Panel admin" href={viewer.adminUrl} /> : null}
            </nav>

            <div className="mt-auto space-y-2">
              {youtubeUrl ? (
                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#c91f18] text-[12px] font-semibold text-white">
                  <YoutubeLogo size={15} weight="fill" />
                  Ver canal
                </a>
              ) : null}
              <Link href={mapUrl} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12px] font-medium text-[#dbe1e7]">
                <MapPin size={15} />
                Abrir mapa publico
              </Link>
              <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12px] font-medium text-[#dbe1e7]" onClick={copyShareUrl}>
                {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}
                {copyState === "copied" ? "Enlace copiado" : "Copiar enlace"}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MobileMenuButton({
  icon: Icon,
  label,
  href,
  onClick,
  count,
}: {
  icon: Icon;
  label: string;
  href?: string;
  onClick?: () => void;
  count?: number;
}) {
  const content = (
    <>
      <Icon size={17} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? <span className="rounded-md bg-[#c91f18] px-1.5 py-0.5 text-[10px] font-semibold text-white">{Math.min(999, count)}</span> : null}
    </>
  );

  const className = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.07]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

function MobileOverviewView({
  channel,
  resolvedSummary,
  cityCount,
  visibleRecentVideos,
  openVideo,
  setMobileTab,
}: MapShellProps & { setMobileTab: Dispatch<SetStateAction<MobileMapTab>> }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col">
      <MobileBrandHeader channel={channel} />

      <section className="mt-5 rounded-xl border border-white/10 bg-[#07101a]/88 p-3 shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <h1 className="text-[18px] font-semibold leading-6 text-[#f5f7fb]">Tus viajes en el mapa</h1>
        <p className="mt-1 max-w-[280px] text-[12px] leading-5 text-[#aab2bc]">Explora los lugares que has visitado a traves de tus videos.</p>

        <MobileStatsGrid resolvedSummary={resolvedSummary} cityCount={cityCount} className="mt-4" />

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold text-[#f5f7fb]">Videos recientes</h2>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
          {visibleRecentVideos.slice(0, 5).map((video, index) => (
            <button
              key={`${video.youtube_video_id}-${video.published_at || "mobile-overview"}`}
              type="button"
              className="flex w-full items-center gap-3 border-b border-white/10 p-2 text-left last:border-b-0"
              onClick={() => openVideo(video)}
            >
              <VideoThumb video={video} className="h-[54px] w-[134px] rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] font-medium leading-5 text-[#f5f7fb]">{video.title}</span>
                <span className="mt-1 block truncate text-[11px] text-[#9da5ae]">{formatPlace(video)}</span>
              </span>
              {index === 0 ? <span className="sr-only">Video destacado</span> : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] text-[13px] font-medium text-[#f5f7fb]"
          onClick={() => setMobileTab("videos")}
        >
          Ver todos los videos
          <CaretRight size={15} />
        </button>
      </section>
    </div>
  );
}

function MobileMapView({
  channel,
  countryBuckets,
  destinationCandidates,
  selectedCountryCode,
  selectedCountryName,
  windowFilter,
  setWindowFilter,
  selectCountry,
  visibleRecentVideos,
  activeVideo,
  setMobileMenuOpen,
}: MapShellProps) {
  const previewVideo = activeVideo || visibleRecentVideos[0] || null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-[430px] flex-col">
      <div className="pointer-events-auto flex h-9 items-center justify-between">
        <span className="max-w-[104px] truncate text-[12px] font-semibold text-[#c8d0d8]">YOUMAP</span>
        <h1 className="text-[17px] font-semibold text-[#f5f7fb]">Mapa</h1>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white" aria-label={`Abrir acciones de ${channel.channel_name}`} onClick={() => setMobileMenuOpen(true)}>
          <List size={21} />
        </button>
      </div>

      <div className="pointer-events-auto mt-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "365"] as FilterWindow[]).map((option) => (
          <button
            key={option}
            type="button"
            className="yt-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : "Visitados"}
          </button>
        ))}
        <button type="button" className="yt-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]" onClick={() => selectCountry(destinationCandidates[0]?.country_code || null)}>
          <MapPin size={13} weight="fill" className="text-[#8b3dff]" />
          Pendientes
        </button>
        <button type="button" className="yt-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]" onClick={() => selectCountry(countryBuckets[0]?.country_code || null)}>
          <Star size={13} weight="fill" className="text-[#f5b82e]" />
          Destacados
        </button>
      </div>

      <div className="relative mt-2 min-h-[390px] flex-1">
        <div className="pointer-events-auto absolute left-0 top-[42%] z-[340] flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07101a]/84 backdrop-blur-2xl">
          <button type="button" className="flex h-10 w-10 items-center justify-center text-white" onClick={() => selectCountry(null)} aria-label="Mapa completo">
            <House size={17} />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-white" onClick={() => selectCountry(countryBuckets[0]?.country_code || null)} aria-label="Acercar">
            <Plus size={17} />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-white" onClick={() => selectCountry(selectedCountryCode ? null : countryBuckets[0]?.country_code || null)} aria-label="Cambiar foco">
            <MapPin size={17} />
          </button>
        </div>

        {previewVideo ? (
          <button
            type="button"
            className="pointer-events-auto absolute bottom-8 left-1/2 z-[340] flex w-[min(78vw,300px)] -translate-x-1/2 gap-3 rounded-xl border border-white/10 bg-[#07101a]/88 p-2 text-left shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            onClick={() => selectCountry(previewVideo.country_code || null)}
          >
            <VideoThumb video={previewVideo} className="h-[74px] w-[96px] rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[13px] font-semibold leading-5 text-[#f5f7fb]">{previewVideo.title}</span>
              <span className="mt-1 block truncate text-[11px] text-[#aab2bc]">{formatPlace(previewVideo)}</span>
              <span className="mt-1 block text-[11px] text-[#aab2bc]">{formatDuration(previewVideo.duration_seconds)}</span>
            </span>
          </button>
        ) : null}

        {selectedCountryCode ? (
          <button
            type="button"
            className="pointer-events-auto absolute left-1/2 top-12 z-[340] -translate-x-1/2 rounded-lg border border-white/10 bg-[#07101a]/88 px-3 py-2 text-[12px] text-white backdrop-blur"
            onClick={() => selectCountry(null)}
          >
            Salir de {selectedCountryName || selectedCountryCode}
          </button>
        ) : null}
      </div>

      <MobileSuggestedDestinations candidates={destinationCandidates} onSelect={selectCountry} />
    </div>
  );
}

function MobileVideosView({ visibleRecentVideos, openVideo }: MapShellProps) {
  return (
    <div className="mx-auto w-full max-w-[430px]">
      <MobileSectionHeader title="Videos" />
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/88 backdrop-blur-2xl">
        {visibleRecentVideos.map((video) => (
          <button
            key={`${video.youtube_video_id}-${video.published_at || "mobile-videos"}`}
            type="button"
            className="flex w-full gap-3 border-b border-white/10 p-3 text-left last:border-b-0"
            onClick={() => openVideo(video)}
          >
            <VideoThumb video={video} className="h-[70px] w-[120px] rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#f5f7fb]">{video.title}</span>
              <span className="mt-1 block truncate text-[12px] text-[#aab2bc]">{formatPlace(video)}</span>
              <span className="mt-1 block text-[11px] text-[#8f9aa5]">{formatNumber(Number(video.view_count || 0))} views</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileCommunityView(props: MapShellProps) {
  return (
    <div className="mx-auto w-full max-w-[430px]">
      <MobileActionBar {...props} />
      <div className="mt-4 space-y-3">
        <DestinationCard
          destination={props.nextDestination}
          fallbackCandidates={props.destinationCandidates}
          onRefresh={props.handleRefresh}
          allowRefresh={props.allowRefresh}
          syncState={props.syncState}
          onSelect={props.selectCountry}
        />
        {props.channelId && (props.pollState || props.viewer.isOwner) ? (
          <FanVoteCard
            channelId={props.channelId}
            viewer={props.viewer}
            poll={props.pollState}
            availableOptions={props.availablePollOptions}
            onPollChange={props.setPollState}
          />
        ) : (
          <FanVoteSummary candidates={props.destinationCandidates} onSelect={props.selectCountry} />
        )}
        {props.sponsors.length > 0 ? <SponsorsRail sponsors={props.sponsors} /> : <SponsorEmptyState />}
      </div>
    </div>
  );
}

function MobileMoreView(props: MapShellProps) {
  return (
    <div className="mx-auto w-full max-w-[430px]">
      <MobileActionBar {...props} />
      <div className="mt-4 space-y-3">
        {props.showOperationsPanel && (props.canUseAdminPanels || props.lastSyncSummary || props.syncError) ? (
          <OperationsCard
            syncState={props.syncState}
            syncError={props.syncError}
            lastSyncSummary={props.lastSyncSummary}
            pendingManual={props.pendingManual}
            allowRefresh={props.allowRefresh}
            onRefresh={props.handleRefresh}
            onMissing={() => props.setMissingVideosOpen(true)}
          />
        ) : null}
        {props.sponsors.length > 0 ? <SponsorsRail sponsors={props.sponsors} /> : <SponsorEmptyState />}
      </div>
    </div>
  );
}

function MobileBrandHeader({ channel }: { channel: TravelChannel }) {
  return (
    <header className="flex items-center justify-between">
      <span className="h-10 w-10" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,0,0,0.72)] bg-[rgba(255,0,0,0.1)] text-[#ff342d]">
          <YoutubeLogo size={23} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.18em] text-[#c8d0d8]">World by</span>
          <span className="block max-w-[170px] truncate text-[16px] font-semibold uppercase leading-5 text-[#f7f8fa]">{channel.channel_name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#ff342d]">
            <YoutubeLogo size={12} weight="fill" />
            YouTube
          </span>
        </span>
      </div>

      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg text-[#f5f7fb]" aria-label={`Abrir canal de ${channel.channel_name}`} onClick={() => window.open(buildChannelUrl(channel) || "/", "_blank", "noopener,noreferrer")}>
        <ArrowSquareOut size={21} />
      </button>
    </header>
  );
}

function MobileSectionHeader({ title }: { title: string }) {
  return (
    <header className="flex h-10 items-center justify-between">
      <span className="text-[12px] font-semibold text-[#c8d0d8]">YOUMAP</span>
      <h1 className="text-[18px] font-semibold text-[#f5f7fb]">{title}</h1>
      <span className="h-9 w-9" />
    </header>
  );
}

function MobileStatsGrid({
  resolvedSummary,
  cityCount,
  className,
}: {
  resolvedSummary: MapSummary;
  cityCount: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]", className)}>
      <OverviewMetric label="Paises" value={resolvedSummary.total_countries} tone="white" />
      <OverviewMetric label="Ciudades" value={cityCount} tone="white" />
      <OverviewMetric label="Videos" value={resolvedSummary.total_videos} tone="red" />
    </div>
  );
}

function MobileActionBar({
  youtubeUrl,
  viewer,
  canUseAdminPanels,
  pendingManual,
  copyState,
  copyShareUrl,
  setMissingVideosOpen,
}: MapShellProps) {
  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {youtubeUrl ? (
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.055] text-[12px] font-medium text-[#f5f7fb]">
          <ArrowSquareOut size={14} />
          Canal
        </a>
      ) : (
        <span />
      )}
      {canUseAdminPanels ? (
        <button
          type="button"
          className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.055] text-[12px] font-medium text-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-55"
          onClick={() => setMissingVideosOpen(true)}
          disabled={!viewer.isOwner && pendingManual.length === 0}
        >
          <MagnifyingGlass size={14} />
          Videos faltantes
        </button>
      ) : (
        <button type="button" className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.055] text-[12px] font-medium text-[#f5f7fb]" onClick={copyShareUrl}>
          <LinkSimple size={14} />
          Compartir
        </button>
      )}
      <button type="button" className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#c91f18] text-[12px] font-semibold text-white" onClick={copyShareUrl}>
        {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
        {copyState === "copied" ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}

function MobileSuggestedDestinations({
  candidates,
  onSelect,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
}) {
  if (candidates.length === 0) return null;

  return (
    <section className="pointer-events-auto rounded-xl border border-white/10 bg-[#07101a]/88 p-3 backdrop-blur-2xl">
      <h2 className="text-[15px] font-semibold text-[#f5f7fb]">Proximos destinos sugeridos</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {candidates.slice(0, 4).map((candidate) => (
          <button key={candidate.country_code} type="button" className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-1.5 text-left" onClick={() => onSelect(candidate.country_code)}>
            <span className="flex aspect-square items-center justify-center rounded-md bg-[linear-gradient(135deg,rgba(255,0,0,0.36),rgba(17,28,42,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover text-[11px] font-semibold text-white">
              {formatCountryCode(candidate.country_code)}
            </span>
            <span className="mt-1 block truncate text-[10px] font-semibold text-[#f5f7fb]">{candidate.country_name}</span>
            <span className="block truncate text-[9px] text-[#aab2bc]">{candidate.cities[0] || "Destino"}</span>
            <span className="mt-1 flex items-center gap-1 text-[9px] text-[#ff5a52]">
              <MapPin size={9} weight="fill" />
              {candidate.votes || candidate.percent} votos
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MobileBottomNav({
  activeTab,
  setActiveTab,
  voteCount,
}: {
  activeTab: MobileMapTab;
  setActiveTab: Dispatch<SetStateAction<MobileMapTab>>;
  voteCount: number;
}) {
  const items: Array<{ id: MobileMapTab; label: string; icon: Icon; badge?: number }> = [
    { id: "overview", label: "Overview", icon: House },
    { id: "map", label: "Mapa", icon: MapPin, badge: voteCount || undefined },
    { id: "videos", label: "Videos", icon: Video },
    { id: "community", label: "Comunidad", icon: UsersThree },
    { id: "more", label: "Mas", icon: DotsThree },
  ];

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-[380] mx-auto flex h-[70px] max-w-[430px] items-center justify-around border-t border-white/10 bg-[#07101a]/94 px-3 pb-2 backdrop-blur-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn("relative flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-medium", active ? "text-[#ff342d]" : "text-[#c6cdd5]")}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="relative">
              <Icon size={22} weight={active ? "fill" : "regular"} />
              {item.badge ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e32822] px-1 text-[9px] font-bold text-white">
                  {Math.min(99, item.badge)}
                </span>
              ) : null}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MapSidebar({
  channel,
  viewer,
  youtubeUrl,
  mapUrl,
  resolvedSummary,
  pendingManual,
  pollState,
  sponsors,
  mobileMenuOpen,
  desktopMenuHidden,
  setMobileMenuOpen,
  selectCountry,
  setMissingVideosOpen,
  scrollToRail,
  videosRailRef,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  const [fallbackChannelThumb, setFallbackChannelThumb] = useState<string | null>(null);
  const channelThumb = channel.thumbnail_url || fallbackChannelThumb;

  useEffect(() => {
    if (channel.thumbnail_url || !youtubeUrl) return;
    let active = true;
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return;
        const thumb = String(payload?.thumbnail_url || "").trim();
        setFallbackChannelThumb(thumb || null);
      })
      .catch(() => {
        if (!active) return;
        setFallbackChannelThumb(null);
      });
    return () => {
      active = false;
    };
  }, [channel.thumbnail_url, youtubeUrl]);

  const rawNavItems: Array<SidebarNavItem | null> = [
    { label: "Inicio", icon: House, href: "/" },
    { label: "Mapa", icon: MapPin, onClick: () => selectCountry(null), count: resolvedSummary.total_countries },
    { label: "Videos", icon: Video, onClick: () => scrollToRail(videosRailRef), count: resolvedSummary.total_videos },
    pollState || viewer.isOwner ? { label: "Votaciones", icon: Trophy, onClick: () => scrollToRail(votesRailRef), count: pollState?.total_votes || undefined } : null,
    sponsors.length > 0 ? { label: "Sponsors", icon: UsersThree, onClick: () => scrollToRail(sponsorsRailRef), count: sponsors.length } : null,
    viewer.isOwner && viewer.adminUrl ? { label: "Analytics", icon: ChartBar, href: viewer.adminUrl } : null,
    viewer.isOwner ? { label: "Ajustes", icon: GearSix, onClick: () => setMissingVideosOpen(true), count: pendingManual.length || undefined } : null,
  ];
  const navItems = rawNavItems.filter((item): item is SidebarNavItem => Boolean(item));

  return (
    <>
      {!desktopMenuHidden ? (
        <aside className="pointer-events-auto hidden w-[184px] shrink-0 border-r border-white/10 bg-[#060a11]/95 px-3 py-4 backdrop-blur-2xl lg:flex lg:flex-col">
          <Link href={mapUrl} className="mb-5 flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(255,0,0,0.55)] bg-[rgba(255,0,0,0.12)] text-[#ff3b3b]">
            <YoutubeLogo size={22} weight="fill" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.16em] text-[#c8d0d8]">World by</span>
            <span className="block truncate text-[15px] font-semibold leading-5 text-[#f6f7f8]">{channel.channel_name}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#ff3b3b]">
              <YoutubeLogo size={12} weight="fill" />
              YouTube
            </span>
          </span>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <ChannelAvatar channel={channel} size="sm" thumbnailUrlOverride={channelThumb} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#f4f4f4]">Tu Canal</p>
                <p className="text-[11px] text-[#9da5ae]">{formatNumber(Number(channel.subscriber_count || 0))} suscriptores</p>
              </div>
            </div>
            {channelThumb ? (
              <a href={channelThumb} target="_blank" rel="noreferrer" className="mt-2 block text-[11px] text-[#9da5ae] hover:text-[#dbe1e7]">
                Ver imagen del canal
              </a>
            ) : null}
            {youtubeUrl ? (
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#c91f18] text-[12px] font-semibold text-white transition hover:bg-[#e03128]">
                <YoutubeLogo size={14} weight="fill" />
                Ver canal
              </a>
            ) : null}
          </div>
        </div>
        </aside>
      ) : (
        <div className="pointer-events-none hidden w-0 shrink-0 lg:block" />
      )}

      <div className="pointer-events-auto fixed left-3 top-3 z-[360] lg:hidden">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#07101a]/90 text-[#f4f7fb] backdrop-blur"
          aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setMobileMenuOpen((current) => !current)}
        >
          {mobileMenuOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-[350] bg-[#05080d]/80 backdrop-blur lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 180, damping: 24 }}
              className="h-full w-[270px] border-r border-white/10 bg-[#060a11] px-4 pb-4 pt-16"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center gap-3">
                <ChannelAvatar channel={channel} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{channel.channel_name}</p>
                  <p className="text-[12px] text-[#9da5ae]">{formatNumber(Number(channel.subscriber_count || 0))} suscriptores</p>
                </div>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <SidebarItem key={item.label} item={item} mobile />
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function MapTopBar({
  searchQuery,
  setSearchQuery,
  locateFirstSearchResult,
  viewer,
  copyShareUrl,
  copyState,
  setMissingVideosOpen,
  channel,
  desktopMenuHidden,
  setDesktopMenuHidden,
  canUseAdminPanels,
  headerEyebrow,
}: MapShellProps) {
  return (
    <header className="pointer-events-auto z-[370] px-4 py-3 xl:px-5">
      <div className="mx-auto grid min-h-[52px] w-full grid-cols-1 gap-3 rounded-xl border border-white/10 bg-[#07101a]/86 p-2 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="hidden shrink-0 lg:inline-flex"
            aria-label={desktopMenuHidden ? "Mostrar menu lateral" : "Ocultar menu lateral"}
            onClick={() => setDesktopMenuHidden((current) => !current)}
          >
            <List size={15} />
          </Button>
          <div className="yt-search h-10 min-h-10 w-full max-w-none rounded-xl border-white/10 bg-white/[0.04]">
            <div className="flex h-full items-center pl-4 text-[13px] text-muted-foreground">
              <MagnifyingGlass size={16} />
            </div>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") locateFirstSearchResult();
              }}
              placeholder="Buscar destinos o videos"
              className="h-full border-0 bg-transparent px-3 text-[13px] text-foreground shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {canUseAdminPanels ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setMissingVideosOpen(true)}>
              <WarningCircle size={14} />
              Videos faltantes
            </Button>
          ) : null}
          {canUseAdminPanels && viewer.adminUrl ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={viewer.adminUrl}>
                <GearSix size={14} />
                Panel
              </Link>
            </Button>
          ) : null}
          <Button type="button" size="sm" className="shrink-0 bg-[#c91f18] hover:bg-[#e03128]" onClick={copyShareUrl}>
            {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
            {copyState === "copied" ? "Copiado" : "Copiar canal"}
          </Button>
          <span className="hidden max-w-[150px] truncate text-[11px] text-[#9da5ae] 2xl:block">{channel.canonicalHandle ? `@${channel.canonicalHandle}` : headerEyebrow || "Mapa público"}</span>
        </div>
      </div>
    </header>
  );
}

function MapOverviewRail({
  channel,
  resolvedSummary,
  cityCount,
  visibleRecentVideos,
  selectedCountryCode,
  selectedCountryName,
  openVideo,
  videosRailRef,
}: MapShellProps) {
  return (
    <aside ref={videosRailRef} className="pointer-events-auto order-2 min-h-0 xl:order-none xl:overflow-hidden">
      <Card className="tm-surface-strong flex min-h-[420px] flex-col rounded-xl border-white/10 xl:h-full">
        <CardHeader className="border-b border-white/10 px-3 pb-3 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Mapa del canal</CardTitle>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#aab2bc]">
                {selectedCountryCode ? `Foco activo: ${selectedCountryName || selectedCountryCode}.` : "Resumen operativo de videos, paises y ciudades detectadas."}
              </p>
            </div>
            <ChannelAvatar channel={channel} size="sm" />
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <OverviewMetric label="Paises" value={resolvedSummary.total_countries} tone="white" />
            <OverviewMetric label="Ciudades" value={cityCount} tone="white" />
            <OverviewMetric label="Videos" value={resolvedSummary.total_videos} tone="red" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold text-[#f5f7fb]">Videos recientes</h2>
            <Badge variant="outline" className="bg-white/[0.04] text-[11px] text-[#c6cdd5]">{visibleRecentVideos.length}</Badge>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1" data-map-scroll="true">
            <div className="space-y-2 pr-2">
              {visibleRecentVideos.length > 0 ? (
                visibleRecentVideos.map((video) => (
                  <button
                    key={`${video.youtube_video_id}-${video.published_at || "no-date"}`}
                    type="button"
                    onClick={() => openVideo(video)}
                    className="group flex w-full gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2 text-left transition hover:bg-white/[0.07]"
                  >
                    <VideoThumb video={video} className="h-[56px] w-[78px] rounded-md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-medium leading-4 text-[#f4f7fb]">{video.title}</p>
                      <p className="mt-1 truncate text-[11px] text-[#9da5ae]">{formatPlace(video)}</p>
                      <p className="mt-1 text-[10px] text-[#7f8994]">{formatDuration(video.duration_seconds)} · {formatDate(video.published_at)}</p>
                    </div>
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c91f18] text-white opacity-0 transition group-hover:opacity-100">
                      <Play size={12} weight="fill" />
                    </span>
                  </button>
                ))
              ) : (
                <EmptyPanel title="Sin videos visibles" body="Ajusta la busqueda o vuelve a todos los destinos." />
              )}
            </div>
          </ScrollArea>

          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={buildMapHref(channel)}>Ver todos los videos</Link>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function MapCenterStage({
  countryBuckets,
  selectedCountryCode,
  selectedCountryName,
  windowFilter,
  setWindowFilter,
  desktopMapTab,
  setDesktopMapTab,
  selectCountry,
  destinationCandidates,
  viewer,
  channelId,
  pollState,
  sponsors,
  issueGlobeCommand,
}: MapShellProps) {
  return (
    <section className="pointer-events-none relative order-1 min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] xl:order-none xl:min-h-0">
      <div className="pointer-events-auto absolute left-1/2 top-3 z-[340] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#07101a]/88 p-1.5 backdrop-blur-2xl">
        {(["all", "365", "90", "30"] as FilterWindow[]).map((option) => (
          <button
            key={option}
            type="button"
            className="yt-nav-pill min-h-8 shrink-0 px-4 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : `${option}d`}
          </button>
        ))}
        <span className="mx-1 my-2 w-px shrink-0 bg-white/10" />
        <button
          type="button"
          className="yt-nav-pill min-h-8 shrink-0 px-4 text-[12px]"
          data-active={desktopMapTab === "watched" ? "true" : "false"}
          onClick={() => setDesktopMapTab("watched")}
        >
          <MapPin size={13} weight="fill" />
          Vistos
        </button>
        <button type="button" className="yt-nav-pill min-h-8 shrink-0 px-4 text-[12px]" data-active={desktopMapTab === "saved" ? "true" : "false"} onClick={() => setDesktopMapTab("saved")}>
          <Target size={13} weight="fill" />
          Guardados
        </button>
        <button type="button" className="yt-nav-pill min-h-8 shrink-0 px-4 text-[12px]" data-active={desktopMapTab === "featured" ? "true" : "false"} onClick={() => setDesktopMapTab("featured")}>
          <Star size={13} weight="fill" className="text-[#f5b82e]" />
          Destacados
        </button>
      </div>

      <div className="pointer-events-auto absolute right-3 top-1/2 z-[330] hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/86 backdrop-blur-2xl md:flex">
        <button type="button" className="flex h-10 w-10 items-center justify-center text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => { selectCountry(null); issueGlobeCommand("reset_view"); }} aria-label="Mostrar mapa completo">
          <House size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => selectCountry(countryBuckets[0]?.country_code || null)} aria-label="Enfocar destino principal">
          <Plus size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => issueGlobeCommand("zoom_out")} aria-label="Alejar mapa">
          <MagnifyingGlass size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => issueGlobeCommand("toggle_rotation")} aria-label="Rotar mapa">
          <Play size={16} weight="fill" />
        </button>
      </div>

      <AnimatePresence>
        {selectedCountryCode ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto absolute left-1/2 top-16 z-[335] -translate-x-1/2"
          >
            <button type="button" onClick={() => selectCountry(null)} className="yt-btn-secondary min-h-9 rounded-xl bg-[#07101a]/90 px-3 text-[12px] backdrop-blur">
              Salir de {selectedCountryName || selectedCountryCode}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[330] px-0 pb-0 md:px-3 md:pb-3">
        <SuggestedDestinations candidates={destinationCandidates} onSelect={selectCountry} viewer={viewer} channelId={channelId} pollState={pollState} sponsors={sponsors} setDesktopMapTab={setDesktopMapTab} />
      </div>
    </section>
  );
}

function MapRightRail({
  channelId,
  viewer,
  pollState,
  setDesktopMapTab,
  nextDestination,
  destinationCandidates,
  sponsors,
  syncState,
  syncError,
  lastSyncSummary,
  showOperationsPanel,
  canUseAdminPanels,
  pendingManual,
  allowRefresh,
  handleRefresh,
  setMissingVideosOpen,
  selectCountry,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  const hasLivePoll = Boolean(pollState && pollState.status === "live");
  const showDestinationWinner = Boolean(hasLivePoll && pollState && pollState.total_votes > 0);
  const showSponsorOnRail = hasLivePoll;

  return (
    <aside className="pointer-events-auto order-3 flex min-h-0 flex-col gap-3 xl:order-none xl:overflow-y-auto xl:pr-1" data-map-scroll="true">
      {showDestinationWinner ? (
        <DestinationCard
          destination={nextDestination}
          fallbackCandidates={destinationCandidates}
          onRefresh={handleRefresh}
          allowRefresh={allowRefresh}
          syncState={syncState}
          onSelect={selectCountry}
        />
      ) : null}

      {showOperationsPanel && (canUseAdminPanels || lastSyncSummary || syncError) ? (
        <OperationsCard
          syncState={syncState}
          syncError={syncError}
          lastSyncSummary={lastSyncSummary}
          pendingManual={pendingManual}
          allowRefresh={allowRefresh}
          onRefresh={handleRefresh}
          onMissing={() => setMissingVideosOpen(true)}
        />
      ) : null}

      {viewer.isOwner && channelId ? (
        <div ref={votesRailRef}>
          <Button type="button" variant="outline" className="w-full justify-center rounded-lg" onClick={() => setDesktopMapTab("saved")}>
            <Trophy size={14} />
            Crear votacion
          </Button>
        </div>
      ) : null}

      <div ref={sponsorsRailRef}>
        {showSponsorOnRail ? (sponsors.length > 0 ? <SponsorsRail sponsors={sponsors} /> : <SponsorEmptyState />) : null}
      </div>
    </aside>
  );
}

function DestinationCard({
  destination,
  fallbackCandidates,
  onRefresh,
  allowRefresh,
  syncState,
  onSelect,
}: {
  destination: DestinationCandidate | null;
  fallbackCandidates: DestinationCandidate[];
  onRefresh: () => void;
  allowRefresh: boolean;
  syncState: SyncState;
  onSelect?: (countryCode: string | null) => void;
}) {
  const percent = destination?.percent || 0;
  return (
    <Card className="tm-surface-strong rounded-xl border-white/10">
      <CardHeader className="border-b border-white/10 px-3 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[14px] font-semibold text-[#f5f7fb]">Proximo destino</CardTitle>
          {allowRefresh ? (
            <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={syncState === "running"}>
              <ArrowsClockwise size={14} />
              {syncState === "running" ? "Sync" : "Actualizar"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-3">
        {destination ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <CountryCodeMark code={destination.country_code} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold uppercase tracking-wide text-[#f5f7fb]">{destination.country_name}</p>
                  <p className="mt-1 text-[12px] text-[#aab2bc]">{destination.cities.slice(0, 3).join(", ") || "Destino abierto"}</p>
                  <p className="mt-2 text-[12px] font-semibold text-[#ff4b42]">
                    {destination.votes > 0 ? `${formatExactNumber(destination.votes)} votos` : `${formatExactNumber(fallbackCandidates.length)} sugerencias`}
                  </p>
                </div>
              </div>
              <ProgressRing percent={percent} />
            </div>
            <div className="mt-4 h-px bg-white/10" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12px] text-[#aab2bc]">
                <Clock size={15} />
                {destination.source === "poll" ? "Votacion activa" : "Basado en videos"}
              </span>
              <Button type="button" size="sm" className="bg-[#c91f18] hover:bg-[#e03128]" onClick={() => onSelect?.(destination.country_code)}>
                <Plus size={14} />
                Ver foco
              </Button>
            </div>
          </div>
        ) : (
          <EmptyPanel title="Sin destino sugerido" body="Cuando haya videos o votos, este espacio prioriza el siguiente viaje." />
        )}
      </CardContent>
    </Card>
  );
}

function FanVoteSummary({ candidates, onSelect }: { candidates: DestinationCandidate[]; onSelect: (countryCode: string | null) => void }) {
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardHeader className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <CardTitle className="text-[16px] font-semibold text-[#f5f7fb]">Fan vote activo</CardTitle>
        <Badge variant="outline" className="bg-white/[0.04] text-[11px]">Top destinos</Badge>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {candidates.slice(0, 4).map((candidate, index) => (
          <button key={candidate.country_code} type="button" onClick={() => onSelect(candidate.country_code)} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-left transition hover:bg-white/[0.07]">
            <span className="w-4 text-right text-[14px] font-semibold text-[#f5b82e]">{index + 1}</span>
            <CountryCodeMark code={candidate.country_code} compact />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#f5f7fb]">{candidate.country_name}</span>
              <span className="block truncate text-[11px] text-[#9da5ae]">{candidate.cities[0] || "Destino sugerido"}</span>
            </span>
            <span className="text-right text-[12px] text-[#d8dee6]">{formatExactNumber(candidate.votes || candidate.percent)}<br /><span className="text-[10px] text-[#8c96a1]">votos</span></span>
          </button>
        ))}
        {candidates.length === 0 ? <EmptyPanel title="Sin votacion" body="El creador todavia no publico una votacion." /> : null}
      </CardContent>
    </Card>
  );
}

function OperationsCard({
  syncState,
  syncError,
  lastSyncSummary,
  pendingManual,
  allowRefresh,
  onRefresh,
  onMissing,
}: {
  syncState: SyncState;
  syncError: string | null;
  lastSyncSummary: SyncSummary | null;
  pendingManual: ManualVerificationItem[];
  allowRefresh: boolean;
  onRefresh: () => void;
  onMissing: () => void;
}) {
  return (
    <Card className="tm-surface-strong rounded-xl border-white/10">
      <CardHeader className="border-b border-white/10 px-3 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[14px] font-semibold text-[#f5f7fb]">Operacion del mapa</CardTitle>
          {allowRefresh ? (
            <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={syncState === "running"}>
              <ArrowsClockwise size={14} />
              Actualizar
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-3">
        {pendingManual.length > 0 ? (
          <button type="button" onClick={onMissing} className="w-full rounded-lg border border-[rgba(255,0,0,0.24)] bg-[rgba(255,0,0,0.09)] px-3 py-3 text-left">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ffaaa5]">
              <WarningCircle size={15} />
              Videos faltantes
            </p>
            <p className="mt-1 text-[13px] text-[#f0c7c4]">{pendingManual.length} videos necesitan confirmacion manual.</p>
          </button>
        ) : null}
        {syncState === "running" ? <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] text-[#aab2bc]">Sincronizando videos y ubicaciones.</p> : null}
        {lastSyncSummary ? (
          <div className="grid grid-cols-2 gap-2">
            <MiniSummary label="Escaneados" value={lastSyncSummary.videos_scanned} />
            <MiniSummary label="Auto" value={lastSyncSummary.videos_verified_auto} />
            <MiniSummary label="Manual" value={lastSyncSummary.videos_verified_manual} />
            <MiniSummary label="Shorts" value={lastSyncSummary.excluded_shorts} />
          </div>
        ) : null}
        {syncError ? <p className="text-[12px] leading-5 text-[#ff8b8b]">{syncError}</p> : null}
        {!pendingManual.length && !lastSyncSummary && !syncError && syncState !== "running" ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3">
            <p className="text-[13px] font-medium text-[#f5f7fb]">Mapa al dia</p>
            <p className="mt-1 text-[12px] leading-5 text-[#9da5ae]">No hay videos pendientes de revision manual en este momento.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SuggestedDestinations({
  candidates,
  onSelect,
  viewer,
  channelId,
  pollState,
  sponsors,
  setDesktopMapTab,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
  viewer: MapViewerContext;
  channelId: string | null;
  pollState: MapPollRecord | null;
  sponsors: MapRailSponsor[];
  setDesktopMapTab: Dispatch<SetStateAction<DesktopMapTab>>;
}) {
  const hasLivePoll = Boolean(pollState && pollState.status === "live");
  const shouldShowSponsors = !hasLivePoll;
  if (!shouldShowSponsors && candidates.length === 0) return null;

  return (
    <div className="pointer-events-auto mx-auto hidden max-w-[700px] rounded-xl border border-white/10 bg-[#07101a]/86 p-3 backdrop-blur-2xl md:block">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-[#f5f7fb]">{shouldShowSponsors ? "Sponsors destacados" : "Proximos destinos sugeridos por la comunidad"}</h2>
        {viewer.isOwner && channelId ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setDesktopMapTab("saved")}>
            <Trophy size={13} />
            Crear votacion
          </Button>
        ) : (
          <span className="text-[11px] text-[#aab2bc]">Ver todas las votaciones</span>
        )}
      </div>
      {shouldShowSponsors ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {sponsors.slice(0, 4).map((sponsor) => (
            <a key={sponsor.id} href={sponsor.affiliate_url || "#"} target={sponsor.affiliate_url ? "_blank" : undefined} rel={sponsor.affiliate_url ? "noreferrer" : undefined} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08]">
              <p className="truncate text-[12px] font-semibold text-[#f5f7fb]">{sponsor.brand_name}</p>
              <p className="mt-1 truncate text-[10px] text-[#9da5ae]">{sponsor.description || "Sponsor activo"}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {candidates.slice(0, 4).map((candidate) => (
            <button key={candidate.country_code} type="button" onClick={() => onSelect(candidate.country_code)} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-left transition hover:bg-white/[0.08]">
              <div className="h-12 bg-[linear-gradient(135deg,rgba(255,0,0,0.42),rgba(17,28,42,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover" />
              <div className="p-2">
                <p className="truncate text-[11px] font-semibold text-[#f5f7fb]">{candidate.country_name}</p>
                <p className="truncate text-[10px] text-[#9da5ae]">{candidate.cities[0] || candidate.country_code}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#ff6a61]">
                  <Target size={10} weight="fill" />
                  {candidate.votes > 0 ? `${formatExactNumber(candidate.votes)} votos` : `${candidate.percent}% score`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorsRail({ sponsors }: { sponsors: MapRailSponsor[] }) {
  return (
    <Card className="tm-surface-strong rounded-xl border-white/10">
      <CardHeader className="flex-row items-center justify-between border-b border-white/10 px-3 pb-3 pt-3">
        <CardTitle className="text-[14px] font-semibold text-[#f5f7fb]">Sponsors</CardTitle>
        <Badge variant="outline" className="bg-white/[0.04] text-[11px]">Ver todos</Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-4">
          {sponsors.slice(0, 5).map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.affiliate_url || sponsor.logo_url || "#"}
              target={sponsor.affiliate_url ? "_blank" : undefined}
              rel={sponsor.affiliate_url ? "noreferrer" : undefined}
              className="group min-w-0 text-center"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white text-[11px] font-semibold text-[#07101a] transition group-hover:scale-[1.04]">
                {sponsor.logo_url ? (
                  <Image src={sponsor.logo_url} alt={sponsor.brand_name} width={48} height={48} className="h-full w-full object-contain p-2" />
                ) : (
                  getInitials(sponsor.brand_name)
                )}
              </span>
              <span className="mt-2 block truncate text-[11px] text-[#d9e0e7]">{sponsor.brand_name}</span>
              <span className={cn("block truncate text-[10px]", sponsor.isExample ? "text-[#f0a09a]" : "text-[#49c47a]")}>{sponsor.isExample ? "Ejemplo" : "Activo"}</span>
            </a>
          ))}
          <span className="min-w-0 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-[#c6cdd5]">
              <Plus size={18} />
            </span>
            <span className="mt-2 block truncate text-[11px] text-[#9da5ae]">Agregar</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SponsorEmptyState() {
  return (
    <Card className="tm-surface-strong rounded-xl border-white/10">
      <CardContent className="px-3 py-3">
        <p className="text-[14px] font-semibold text-[#f5f7fb]">Sponsors</p>
        <p className="mt-1 text-[12px] leading-5 text-[#9da5ae]">Este mapa todavia no tiene sponsors activos.</p>
      </CardContent>
    </Card>
  );
}

function OverviewMetric({ label, value, tone }: { label: string; value: number; tone: "white" | "red" }) {
  const colors = {
    white: "text-[#f5f7fb]",
    red: "text-[#ff5a52]",
  };

  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0">
      <p className={cn("text-center text-[20px] font-semibold leading-6", colors[tone])}>{formatExactNumber(value)}</p>
      <p className="mt-1 text-center text-[11px] text-[#9da5ae]">{label}</p>
    </div>
  );
}

function SidebarItem({ item, mobile = false }: { item: SidebarNavItem; mobile?: boolean }) {
  const Icon = item.icon;
  const className = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.07]";
  const content = (
    <>
      <Icon size={17} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count ? <span className="rounded-md bg-[#c91f18] px-1.5 py-0.5 text-[10px] font-semibold text-white">{item.count}</span> : null}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cn(className, mobile && "py-3")}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onClick} className={cn(className, mobile && "py-3")}>
      {content}
    </button>
  );
}

function ChannelAvatar({ channel, size, thumbnailUrlOverride = null }: { channel: TravelChannel; size: "sm" | "md"; thumbnailUrlOverride?: string | null }) {
  const className = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const thumbUrl = thumbnailUrlOverride || channel.thumbnail_url || null;
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.08] text-[12px] font-semibold text-white", className)}>
      {thumbUrl ? (
        <Image src={thumbUrl} alt={channel.channel_name} fill sizes={size === "sm" ? "36px" : "48px"} className="object-cover" />
      ) : (
        getInitials(channel.channel_name)
      )}
    </span>
  );
}

function VideoThumb({ video, className }: { video: TravelVideoLocation; className?: string }) {
  return (
    <span className={cn("yt-video-thumb relative shrink-0", className)}>
      {video.thumbnail_url ? (
        <Image
          src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
          alt={video.title}
          fill
          sizes="120px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(255,0,0,0.2),rgba(12,20,31,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover text-[10px] text-[#cfd6df]">
          <Play size={15} weight="fill" className="mb-1 text-white" />
          <span className="rounded bg-black/35 px-1.5 py-0.5 font-semibold">{formatCountryCode(video.country_code)}</span>
        </span>
      )}
      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">{formatDuration(video.duration_seconds)}</span>
    </span>
  );
}

function CountryCodeMark({ code, compact = false }: { code?: string | null; compact?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white text-[#07101a] font-bold", compact ? "h-7 w-7 text-[10px]" : "h-11 w-11 text-[12px]")}>
      {formatCountryCode(code)}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(100, percent || 0));
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-[#ff4b42]"
      style={{ background: `conic-gradient(#ff342d ${normalized * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}
    >
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#07101a]">{normalized}%</span>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-4">
      <p className="text-[13px] font-medium text-[#f4f7fb]">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-[#9da5ae]">{body}</p>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8e8e8e]">{label}</p>
      <p className="mt-1 text-[14px] font-medium text-[#f1f1f1]">{formatExactNumber(value)}</p>
    </div>
  );
}

function buildCountryBuckets(videos: TravelVideoLocation[]) {
  const buckets = new Map<string, CountryBucket>();
  for (const video of videos) {
    const countryCode = String(video.country_code || "").toUpperCase();
    if (!countryCode) continue;
    const row = buckets.get(countryCode) || {
      country_code: countryCode,
      country_name: video.country_name || countryCode,
      count: 0,
      views: 0,
      cities: [],
    };
    row.count += 1;
    row.views += Number(video.view_count || 0);
    const city = String(video.city || video.location_label || "").trim();
    if (city && !row.cities.includes(city)) row.cities.push(city);
    buckets.set(countryCode, row);
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

function buildDestinationCandidates(poll: MapPollRecord | null, buckets: CountryBucket[]) {
  if (poll?.country_options?.length) {
    const totalVotes = Math.max(1, Number(poll.total_votes || 0));
    return poll.country_options
      .map((country) => ({
        country_code: country.country_code,
        country_name: country.country_name || country.country_code,
        cities: country.cities.map((city) => city.city),
        votes: Number(country.votes || 0),
        percent: Math.round((Number(country.votes || 0) / totalVotes) * 100),
        source: "poll" as const,
      }))
      .sort((a, b) => b.votes - a.votes);
  }

  const maxScore = Math.max(1, buckets[0]?.count || 1);
  return buckets.slice(0, 6).map((country) => ({
    country_code: country.country_code,
    country_name: country.country_name,
    cities: country.cities,
    votes: 0,
    percent: Math.max(12, Math.round((country.count / maxScore) * 100)),
    source: "videos" as const,
  }));
}

function sortRecentVideos(a: TravelVideoLocation, b: TravelVideoLocation) {
  const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
  const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
  return bTime - aTime;
}

function buildChannelUrl(channel: TravelChannel) {
  if (channel.youtube_channel_id) return `https://www.youtube.com/channel/${channel.youtube_channel_id}`;
  const handle = String(channel.channel_handle || channel.canonicalHandle || "").trim().replace(/^@+/, "");
  if (!handle) return null;
  return `https://www.youtube.com/@${handle}`;
}

function buildMapHref(channel: TravelChannel) {
  return `/map?channelId=${encodeURIComponent(channel.id)}`;
}

function formatPlace(video: TravelVideoLocation) {
  return [video.city, video.country_name || video.country_code].filter(Boolean).join(", ") || "Ubicacion mapeada";
}

function formatCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "TM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return code || "TM";
}

function getInitialMobileTab(): MobileMapTab {
  if (typeof window === "undefined") return "overview";
  const value = window.location.hash.replace(/^#/, "").toLowerCase();
  if (value === "map" || value === "videos" || value === "community" || value === "more") return value;
  return "overview";
}

function formatExactNumber(value: number) {
  if (!value) return "0";
  return Number(value).toLocaleString("en-US");
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
}

function formatDuration(value?: number | null) {
  const totalSeconds = Math.max(0, Number(value || 0));
  if (!totalSeconds) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "YT";
}
