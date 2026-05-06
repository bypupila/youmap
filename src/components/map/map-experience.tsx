"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  Clock,
  Copy,
  DotsThree,
  EnvelopeSimple,
  GearSix,
  House,
  LinkSimple,
  List,
  MagnifyingGlass,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  Star,
  Trophy,
  Trash,
  UsersThree,
  Video,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import posthog from "posthog-js";
import { DesktopVideoMapCard } from "@/components/map/desktop-video-map-card";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { MapVideoActivityPanel } from "@/components/map/map-video-activity-panel";
import { MissingVideosDialog } from "@/components/map/missing-videos-dialog";
import { useLocalVideoActivity } from "@/components/map/video-activity";
import type { VideoActivityController, VideoActivityTab } from "@/components/map/video-activity";
import { VideoSelectionSheet } from "@/components/map/video-selection-sheet";
import { TravelGlobe } from "@/components/travel-globe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapEventType } from "@/lib/map-event-types";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import { SPONSOR_INQUIRY_STATUSES, type SponsorInquiryStatus } from "@/lib/sponsor-inquiries";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

type FilterWindow = "30" | "90" | "365" | "all";
type SyncState = "idle" | "running" | "success" | "error";
type MobileMapTab = "overview" | "map" | "videos" | "community" | "more";
type MapViewMode = "viewer" | "creator" | "demo";
type DesktopMapTab = VideoActivityTab;
type GlobeCommandAction = "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation";
type MapClientEventPayload = {
  countryCode?: string | null;
  youtubeVideoId?: string | null;
  sponsorId?: string | null;
  pollId?: string | null;
  metadata?: Record<string, unknown>;
};

const EMPTY_MANUAL_QUEUE: ManualVerificationItem[] = [];
const EMPTY_SPONSORS: MapRailSponsor[] = [];
const EMPTY_POLL_OPTIONS: PollOptionInput[] = [];
const DEFAULT_VIEWER: MapViewerContext = {
  isOwner: false,
  isAuthenticated: false,
  role: "viewer",
  isSuperAdmin: false,
  shareUrl: "",
  adminUrl: null,
};
const SPONSOR_INQUIRY_STATUS_LABEL: Record<SponsorInquiryStatus, string> = {
  new: "Nuevo",
  reviewed: "Revisado",
  contacted: "Contactado",
  won: "Ganado",
  lost: "Perdido",
};

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
  cities: Array<{ name: string; count: number }>;
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

type SponsorInput = {
  brand_name: string;
  logo_url: string | null;
  affiliate_url: string | null;
  description: string | null;
  country_code: string | null;
};

type YouTubeDataHealth = {
  latestRefreshedAt: string | null;
  staleVideos: number;
  trackedVideos: number;
};

type SponsorInquiryRecord = {
  id: string;
  channel_id: string;
  channel_name: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  website_url: string | null;
  whatsapp: string | null;
  proposed_budget_usd: number | null;
  brief: string;
  status: SponsorInquiryStatus;
  source: string;
  map_url: string | null;
  created_at: string;
  updated_at: string;
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
  hideLivePollMetrics: boolean;
  sponsors: MapRailSponsor[];
  youtubeDataHealth: YouTubeDataHealth;
  headerEyebrow?: string;
  countryBuckets: CountryBucket[];
  selectedCountryCode: string | null;
  selectedCountryName: string | null;
  selectedCityName: string | null;
  selectedCityDisplayName: string | null;
  selectedCountryCityBuckets: Array<{ city: string; count: number }>;
  selectedCountryVideos: TravelVideoLocation[];
  selectedCityVideos: TravelVideoLocation[];
  activeLocationVideos: TravelVideoLocation[];
  visibleRecentVideos: TravelVideoLocation[];
  mapVideos: TravelVideoLocation[];
  nextDestination: DestinationCandidate | null;
  destinationCandidates: DestinationCandidate[];
  activeVideo: TravelVideoLocation | null;
  pinnedVideo: TravelVideoLocation | null;
  videoActivity: VideoActivityController;
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
  canToggleViewerPreview: boolean;
  isPreviewingViewer: boolean;
  isDemoMode: boolean;
  desktopMapTab: DesktopMapTab;
  mobileMenuOpen: boolean;
  availablePollOptions: PollOptionInput[];
  videosRailRef: RefObject<HTMLDivElement | null>;
  votesRailRef: RefObject<HTMLDivElement | null>;
  sponsorsRailRef: RefObject<HTMLDivElement | null>;
  setWindowFilter: Dispatch<SetStateAction<FilterWindow>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setPollState: Dispatch<SetStateAction<MapPollRecord | null>>;
  setDesktopMapTab: Dispatch<SetStateAction<DesktopMapTab>>;
  createSponsor: (input: SponsorInput) => Promise<void>;
  deleteSponsor: (sponsorId: string) => Promise<void>;
  resetDemoSponsors: () => void;
  onSponsorImpression: (sponsor: MapRailSponsor) => void;
  onSponsorClick: (sponsor: MapRailSponsor) => void;
  onYouTubeExternalOpen: (video: TravelVideoLocation) => void;
  issueGlobeCommand: (action: GlobeCommandAction) => void;
  rotationEnabled: boolean;
  locateFirstSearchResult: () => void;
  selectCountry: (countryCode: string | null) => void;
  selectCity: (cityName: string | null) => void;
  goBackLocationFilter: () => void;
  openVideo: (video: TravelVideoLocation) => void;
  changePinnedVideo: (video: TravelVideoLocation) => void;
  closePinnedVideo: () => void;
  copyShareUrl: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  setMissingVideosOpen: Dispatch<SetStateAction<boolean>>;
  toggleViewerPreview: () => void;
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
  sponsors = EMPTY_SPONSORS,
  activePoll = null,
  availablePollOptions = EMPTY_POLL_OPTIONS,
  headerEyebrow,
  viewMode,
}: MapExperienceProps) {
  const incomingManualQueue = manualQueue ?? EMPTY_MANUAL_QUEUE;
  const [items, setItems] = useState<TravelVideoLocation[]>(videoLocations);
  const [pendingManual, setPendingManual] = useState<ManualVerificationItem[]>(incomingManualQueue);
  const [windowFilter, setWindowFilter] = useState<FilterWindow>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [focusCountryCode, setFocusCountryCode] = useState<string | null>(null);
  const [focusVideoId, setFocusVideoId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);
  const [pinnedVideo, setPinnedVideo] = useState<TravelVideoLocation | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null);
  const [manualDrafts, setManualDrafts] = useState<Record<string, { country_code: string; city: string }>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [missingVideosOpen, setMissingVideosOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMapTab, setDesktopMapTab] = useState<DesktopMapTab>("all");
  const [isPreviewingViewer, setIsPreviewingViewer] = useState(false);
  const [globeRotationEnabled, setGlobeRotationEnabled] = useState(true);
  const [globeCommand, setGlobeCommand] = useState<{ id: number; action: GlobeCommandAction } | null>(null);
  const [pollState, setPollState] = useState<MapPollRecord | null>(activePoll);
  const [sponsorItems, setSponsorItems] = useState<MapRailSponsor[]>(sponsors);
  const demoSponsorsBaselineRef = useRef<MapRailSponsor[]>(sponsors);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );
  const videoActivity = useLocalVideoActivity();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videosRailRef = useRef<HTMLDivElement | null>(null);
  const votesRailRef = useRef<HTMLDivElement | null>(null);
  const sponsorsRailRef = useRef<HTMLDivElement | null>(null);
  const trackedMapViewRef = useRef<string | null>(null);
  const trackedSponsorImpressionIdsRef = useRef<Set<string>>(new Set());

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
    setSponsorItems(sponsors);
    demoSponsorsBaselineRef.current = sponsors;
  }, [sponsors]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktopViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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

  const selectedCountryCityBuckets = useMemo(() => buildCityBuckets(selectedCountryVideos), [selectedCountryVideos]);
  const selectedCityVideos = useMemo(() => {
    if (!selectedCountryCode || !selectedCityName) return [];
    return selectedCountryVideos
      .filter((video) => getVideoCityKey(video) === selectedCityName)
      .sort(sortRecentVideos);
  }, [selectedCityName, selectedCountryCode, selectedCountryVideos]);
  const activeLocationVideos = useMemo(() => {
    if (selectedCityName) return selectedCityVideos;
    if (selectedCountryCode) return selectedCountryVideos;
    return searchFilteredVideos;
  }, [searchFilteredVideos, selectedCityName, selectedCountryCode, selectedCityVideos, selectedCountryVideos]);

  const watchedVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.seenIds.has(video.youtube_video_id)),
    [searchFilteredVideos, videoActivity.seenIds]
  );
  const openedVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.openedIds.has(video.youtube_video_id)),
    [searchFilteredVideos, videoActivity.openedIds]
  );
  const savedVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.savedIds.has(video.youtube_video_id)),
    [searchFilteredVideos, videoActivity.savedIds]
  );
  const featuredVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.featuredIds.has(video.youtube_video_id)),
    [searchFilteredVideos, videoActivity.featuredIds]
  );

  const filteredVideos = useMemo(() => {
    if (desktopMapTab === "watched") return watchedVideos;
    if (desktopMapTab === "opened") return openedVideos;
    if (desktopMapTab === "saved") return savedVideos;
    if (desktopMapTab === "featured") return featuredVideos;
    if (!selectedCountryCode) return searchFilteredVideos;
    return activeLocationVideos;
  }, [desktopMapTab, watchedVideos, openedVideos, savedVideos, featuredVideos, selectedCountryCode, searchFilteredVideos, activeLocationVideos]);

  const recentVideos = useMemo(() => items.slice().sort(sortRecentVideos).slice(0, 6), [items]);
  const visibleRecentVideos = selectedCityName ? selectedCityVideos.slice(0, 6) : selectedCountryCode ? selectedCountryVideos.slice(0, 6) : recentVideos;
  const selectedCountryName =
    selectedCountryVideos[0]?.country_name ||
    countryBuckets.find((country) => country.country_code === selectedCountryCode)?.country_name ||
    selectedCountryCode;
  const selectedCityDisplayName = selectedCityVideos[0]?.city || selectedCityName;

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
  const youtubeDataHealth = useMemo<YouTubeDataHealth>(() => {
    const now = Date.now();
    let latestRefreshedMs = 0;
    let staleVideos = 0;
    let trackedVideos = 0;

    for (const video of items) {
      const refreshedAtMs = video.youtube_data_refreshed_at ? new Date(video.youtube_data_refreshed_at).getTime() : 0;
      const expiresAtMs = video.youtube_data_expires_at ? new Date(video.youtube_data_expires_at).getTime() : 0;
      if (!refreshedAtMs && !expiresAtMs) continue;
      trackedVideos += 1;
      if (refreshedAtMs > latestRefreshedMs) latestRefreshedMs = refreshedAtMs;
      if (expiresAtMs > 0 && expiresAtMs <= now) staleVideos += 1;
    }

    return {
      latestRefreshedAt: latestRefreshedMs > 0 ? new Date(latestRefreshedMs).toISOString() : null,
      staleVideos,
      trackedVideos,
    };
  }, [items]);
  const baseViewMode: MapViewMode = viewMode || (viewer.isOwner ? "creator" : "viewer");
  const canToggleViewerPreview = baseViewMode === "creator" || baseViewMode === "demo" || viewer.isOwner;
  const resolvedViewMode: MapViewMode = isPreviewingViewer && canToggleViewerPreview ? "viewer" : baseViewMode;
  const isDemoMode = resolvedViewMode === "demo";
  const canUseAdminPanels = resolvedViewMode === "creator" || resolvedViewMode === "demo";
  const hideLivePollMetrics = Boolean(
    pollState && pollState.status === "live" && !viewer.isOwner && !viewer.isAuthenticated
  );
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
  const shouldUseDesktopVideoCard = shouldShowChrome && isDesktopViewport;
  const publicMapAnalyticsEnabled = Boolean(channelId && interactive && resolvedViewMode === "viewer" && !viewer.isOwner && !isDemoMode);

  const trackMapEvent = useCallback(
    (eventType: MapEventType, payload: MapClientEventPayload = {}) => {
      if (!publicMapAnalyticsEnabled || !channelId || typeof window === "undefined") return;

      const metadata = {
        ...payload.metadata,
        viewer_authenticated: viewer.isAuthenticated,
      };

      void fetch("/api/map/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          eventType,
          viewerMode: resolvedViewMode,
          path: window.location.pathname,
          referrer: document.referrer || null,
          countryCode: payload.countryCode || null,
          youtubeVideoId: payload.youtubeVideoId || null,
          sponsorId: payload.sponsorId || null,
          pollId: payload.pollId || null,
          metadata,
        }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [channelId, publicMapAnalyticsEnabled, resolvedViewMode, viewer.isAuthenticated]
  );

  useEffect(() => {
    if (!publicMapAnalyticsEnabled || !channelId || typeof window === "undefined") return;

    const key = `${channelId}:${window.location.pathname}`;
    if (trackedMapViewRef.current === key) return;

    trackedMapViewRef.current = key;
    trackMapEvent("map_view", {
      metadata: {
        video_count: items.length,
        country_count: resolvedSummary.total_countries,
      },
    });
  }, [channelId, items.length, publicMapAnalyticsEnabled, resolvedSummary.total_countries, trackMapEvent]);

  const trackSponsorImpression = useCallback(
    (sponsor: MapRailSponsor) => {
      if (!sponsor.id || sponsor.isExample || trackedSponsorImpressionIdsRef.current.has(sponsor.id)) return;

      trackedSponsorImpressionIdsRef.current.add(sponsor.id);
      trackMapEvent("sponsor_impression", {
        sponsorId: sponsor.id,
        metadata: {
          sponsor_name: sponsor.brand_name,
          sponsor_countries: sponsor.country_codes,
        },
      });
    },
    [trackMapEvent]
  );

  const trackSponsorClick = useCallback(
    (sponsor: MapRailSponsor) => {
      if (!publicMapAnalyticsEnabled || !channelId || !sponsor.id || sponsor.isExample || typeof window === "undefined") return;

      void fetch("/api/sponsors/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId: sponsor.id,
          channelId,
          countryCode: selectedCountryCode || null,
          path: window.location.pathname,
          referrer: document.referrer || null,
        }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [channelId, publicMapAnalyticsEnabled, selectedCountryCode]
  );

  const trackYouTubeExternalOpen = useCallback(
    (video: TravelVideoLocation) => {
      if (video.made_for_kids) return;

      trackMapEvent("youtube_external_open", {
        youtubeVideoId: video.youtube_video_id,
        countryCode: video.country_code,
        metadata: {
          video_title: video.title,
        },
      });
    },
    [trackMapEvent]
  );

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
    setSelectedCityName(null);
    setFocusCountryCode(normalized);
    if (normalized) {
      trackMapEvent("country_select", { countryCode: normalized });
      posthog.capture("map_country_selected", {
        country_code: normalized,
        channel_id: channelId,
        channel_name: channel.channel_name,
      });
    }
  }

  function setSelectedVideo(video: TravelVideoLocation | null) {
    setPinnedVideo(video);
    if (video) {
      setSelectedCountryCode(String(video.country_code || "").toUpperCase() || null);
      setSelectedCityName((current) => {
        const cityKey = getVideoCityKey(video);
        return current && cityKey === current ? current : null;
      });
      setFocusCountryCode(video.country_code || null);
      setFocusVideoId(video.youtube_video_id || null);
      return;
    }

    setFocusCountryCode(null);
    setFocusVideoId(null);
  }

  function selectCity(cityName: string | null) {
    const normalized = cityName ? String(cityName).trim() : null;
    setSelectedCityName(normalized || null);
  }

  function goBackLocationFilter() {
    if (selectedCityName) {
      setSelectedCityName(null);
      return;
    }
    selectCountry(null);
  }

  function openVideo(video: TravelVideoLocation) {
    setSelectedVideo(video);
    if (!video.made_for_kids) {
      trackMapEvent("video_panel_open", {
        youtubeVideoId: video.youtube_video_id,
        countryCode: video.country_code,
        metadata: {
          video_title: video.title,
        },
      });
    }
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
      trackMapEvent("share_url_copied");
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
    if (action === "toggle_rotation") {
      setGlobeRotationEnabled((current) => !current);
    }
    if (action === "reset_view" || action === "zoom_in" || action === "zoom_out") {
      setGlobeRotationEnabled(false);
    }
  }

  async function createSponsor(input: SponsorInput) {
    if (resolvedViewMode === "viewer") return;

    if (isDemoMode) {
      const nextSponsor: MapRailSponsor = {
        id: `demo-local-${Date.now()}`,
        brand_name: input.brand_name,
        logo_url: input.logo_url,
        description: input.description,
        discount_code: null,
        affiliate_url: input.affiliate_url,
        country_codes: input.country_code ? [input.country_code.toUpperCase()] : ["GLOBAL"],
        isExample: true,
      };
      setSponsorItems((current) => [nextSponsor, ...current]);
      return;
    }

    const payload = {
      brand_name: input.brand_name,
      logo_url: input.logo_url || "",
      website_url: "",
      affiliate_url: input.affiliate_url || "",
      discount_code: "",
      description: input.description || "",
      country_code: input.country_code || null,
    };

    const response = await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(typeof json?.error === "string" ? json.error : "No se pudo crear el sponsor.");
    }

    const nextSponsor: MapRailSponsor = {
      id: String(json?.id || `local-${Date.now()}`),
      brand_name: input.brand_name,
      logo_url: input.logo_url,
      description: input.description,
      discount_code: null,
      affiliate_url: input.affiliate_url,
      country_codes: input.country_code ? [input.country_code.toUpperCase()] : ["GLOBAL"],
    };
    setSponsorItems((current) => [nextSponsor, ...current]);
  }

  async function deleteSponsor(sponsorId: string) {
    if (resolvedViewMode === "viewer") return;

    if (isDemoMode) {
      setSponsorItems((current) => current.filter((sponsor) => sponsor.id !== sponsorId));
      return;
    }

    const response = await fetch(`/api/sponsors?id=${encodeURIComponent(sponsorId)}`, { method: "DELETE" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(typeof json?.error === "string" ? json.error : "No se pudo eliminar el sponsor.");
    }

    setSponsorItems((current) => current.filter((sponsor) => sponsor.id !== sponsorId));
  }

  function resetDemoSponsors() {
    if (!isDemoMode) return;
    setSponsorItems(demoSponsorsBaselineRef.current);
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
    hideLivePollMetrics,
    sponsors: sponsorItems,
    youtubeDataHealth,
    headerEyebrow,
    countryBuckets,
    selectedCountryCode,
    selectedCountryName,
    selectedCityName,
    selectedCityDisplayName,
    selectedCountryCityBuckets,
    selectedCountryVideos,
    selectedCityVideos,
    activeLocationVideos,
    visibleRecentVideos,
    mapVideos: activeLocationVideos,
    nextDestination,
    destinationCandidates,
    activeVideo,
    pinnedVideo,
    videoActivity,
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
    canToggleViewerPreview,
    isPreviewingViewer,
    isDemoMode,
    desktopMapTab,
    setDesktopMapTab,
    mobileMenuOpen,
    availablePollOptions,
    videosRailRef,
    votesRailRef,
    sponsorsRailRef,
    setWindowFilter,
    setSearchQuery,
    setMobileMenuOpen,
    setPollState,
    createSponsor,
    deleteSponsor,
    resetDemoSponsors,
    onSponsorImpression: trackSponsorImpression,
    onSponsorClick: trackSponsorClick,
    onYouTubeExternalOpen: trackYouTubeExternalOpen,
    rotationEnabled: globeRotationEnabled,
    locateFirstSearchResult,
    issueGlobeCommand,
    selectCountry,
    selectCity,
    goBackLocationFilter,
    openVideo,
    changePinnedVideo: setSelectedVideo,
    closePinnedVideo: () => setSelectedVideo(null),
    copyShareUrl,
    handleRefresh,
    setMissingVideosOpen,
    toggleViewerPreview: () => setIsPreviewingViewer((current) => !current),
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
          onPinnedVideoChange={(video) => (video ? openVideo(video) : setSelectedVideo(null))}
          onCountrySelect={selectCountry}
          focusCountryCode={focusCountryCode}
          focusVideoId={focusVideoId}
          selectedCountryCode={selectedCountryCode}
          command={globeCommand}
          rotationEnabled={globeRotationEnabled}
          onRotationChange={setGlobeRotationEnabled}
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
        onPinnedVideoChange={(video) => (video ? openVideo(video) : setSelectedVideo(null))}
        onCountrySelect={selectCountry}
        focusCountryCode={focusCountryCode}
        focusVideoId={focusVideoId}
        selectedCountryCode={selectedCountryCode}
        command={globeCommand}
        rotationEnabled={globeRotationEnabled}
        onRotationChange={setGlobeRotationEnabled}
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

      <VideoSelectionSheet
        open={Boolean(pinnedVideo) && !shouldUseDesktopVideoCard}
        videos={activeLocationVideos}
        currentVideo={pinnedVideo}
        activity={videoActivity}
        onOpenInYouTube={trackYouTubeExternalOpen}
        onClose={() => setSelectedVideo(null)}
        onChangeVideo={(video) => setSelectedVideo(video)}
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

      <div className="pointer-events-none absolute inset-0 z-[320] hidden min-h-0 lg:grid lg:grid-cols-1">
        <main className="pointer-events-none relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <MapTopBar {...props} />

          <div
            data-map-scroll="true"
            className="pointer-events-auto grid min-h-0 grid-cols-1 gap-3 overflow-y-auto px-4 pb-4 lg:pointer-events-none lg:grid-cols-[minmax(210px,250px)_minmax(360px,1fr)_minmax(210px,250px)] lg:overflow-hidden xl:grid-cols-[minmax(282px,318px)_minmax(460px,1fr)_minmax(282px,318px)] xl:gap-3 xl:px-5 xl:pb-5 2xl:grid-cols-[minmax(360px,430px)_minmax(560px,1fr)_minmax(360px,430px)]"
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

      <MobileBottomNav
        activeTab={mobileTab}
        setActiveTab={setMobileTab}
        voteCount={props.hideLivePollMetrics ? undefined : props.pollState?.total_votes || props.destinationCandidates.length}
      />
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
  hideLivePollMetrics,
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex h-full w-[min(288px,calc(100vw-16px))] flex-col border-r border-white/10 bg-[#060a11] px-4 pb-4 pt-5"
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
              <MobileMenuButton
                icon={Trophy}
                label="Votaciones"
                count={hideLivePollMetrics ? undefined : pollState?.total_votes || undefined}
                onClick={() => goToTab("community")}
              />
              <MobileMenuButton icon={UsersThree} label="Sponsors" count={sponsors.length || undefined} onClick={() => goToTab("community")} />
              {viewer.isOwner ? <MobileMenuButton icon={GearSix} label="Ajustes" count={pendingManual.length || undefined} onClick={() => { setMissingVideosOpen(true); closeMenu(); }} /> : null}
              {viewer.isOwner && viewer.adminUrl ? <MobileMenuButton icon={ChartBar} label="Panel admin" href={viewer.adminUrl} /> : null}
            </nav>

            <div className="mt-auto space-y-2">
              {youtubeUrl ? (
                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#e1543a] text-[12px] font-semibold text-white">
                  <ArrowSquareOut size={15} />
                  Abrir en YouTube
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
      {count ? <span className="rounded-md bg-[#e1543a] px-1.5 py-0.5 text-[10px] font-semibold text-white">{Math.min(999, count)}</span> : null}
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
  hideLivePollMetrics,
}: MapShellProps) {
  const previewVideo = activeVideo || visibleRecentVideos[0] || null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-[430px] flex-col">
      <div className="pointer-events-auto flex h-9 items-center justify-between">
        <span className="max-w-[104px] truncate text-[12px] font-semibold text-[#c8d0d8]">TravelYourMap</span>
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
            className="tym-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : "Visitados"}
          </button>
        ))}
        <button type="button" className="tym-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]" onClick={() => selectCountry(destinationCandidates[0]?.country_code || null)}>
          <MapPin size={13} weight="fill" className="text-[#8b3dff]" />
          Pendientes
        </button>
        <button type="button" className="tym-nav-pill min-h-8 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]" onClick={() => selectCountry(countryBuckets[0]?.country_code || null)}>
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

      <MobileSuggestedDestinations candidates={destinationCandidates} onSelect={selectCountry} hideVotes={hideLivePollMetrics} />
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
      {!props.viewer.isOwner && props.channelId ? (
        <div className="mt-4">
          <BrandInquiryCta channelId={props.channelId} channelName={props.channel.channel_name} mapUrl={props.mapUrl} className="h-10 w-full rounded-xl text-[12px] font-semibold" />
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        {!props.hideLivePollMetrics ? (
          <DestinationCard
            destination={props.nextDestination}
            fallbackCandidates={props.destinationCandidates}
            onRefresh={props.handleRefresh}
            allowRefresh={props.allowRefresh}
            syncState={props.syncState}
            onSelect={props.selectCountry}
            hideVotes={props.hideLivePollMetrics}
          />
        ) : null}
        {props.channelId && (props.pollState || props.viewer.isOwner) ? (
          <FanVoteCard
            channelId={props.channelId}
            viewer={props.viewer}
            poll={props.pollState}
            availableOptions={props.availablePollOptions}
            isDemoMode={props.isDemoMode}
            onPollChange={props.setPollState}
          />
        ) : (
          <FanVoteSummary candidates={props.destinationCandidates} onSelect={props.selectCountry} />
        )}
        <SponsorsRail
          channelId={props.channelId}
          sponsors={props.sponsors}
          viewer={props.viewer}
          isDemoMode={props.isDemoMode}
          createSponsor={props.createSponsor}
          deleteSponsor={props.deleteSponsor}
          resetDemoSponsors={props.resetDemoSponsors}
          onSponsorImpression={props.onSponsorImpression}
          onSponsorClick={props.onSponsorClick}
        />
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
        <SponsorsRail
          channelId={props.channelId}
          sponsors={props.sponsors}
          viewer={props.viewer}
          isDemoMode={props.isDemoMode}
          createSponsor={props.createSponsor}
          deleteSponsor={props.deleteSponsor}
          resetDemoSponsors={props.resetDemoSponsors}
          onSponsorImpression={props.onSponsorImpression}
          onSponsorClick={props.onSponsorClick}
        />
      </div>
    </div>
  );
}

function MobileBrandHeader({ channel }: { channel: TravelChannel }) {
  return (
    <header className="flex items-center justify-between">
      <span className="h-10 w-10" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255, 90, 61,0.72)] bg-[rgba(255, 90, 61,0.1)] text-[#ff6a4e]">
          <Video size={23} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.18em] text-[#c8d0d8]">TravelYourMap</span>
          <span className="block max-w-[170px] truncate text-[16px] font-semibold uppercase leading-5 text-[#f7f8fa]">{channel.channel_name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#ff6a4e]">
            <Video size={12} weight="fill" />
            Conectado a YouTube
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
      <span className="text-[12px] font-semibold text-[#c8d0d8]">TravelYourMap</span>
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
      <button type="button" className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#e1543a] text-[12px] font-semibold text-white" onClick={copyShareUrl}>
        {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
        {copyState === "copied" ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}

function MobileSuggestedDestinations({
  candidates,
  onSelect,
  hideVotes = false,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
  hideVotes?: boolean;
}) {
  if (candidates.length === 0) return null;

  return (
    <section className="pointer-events-auto rounded-xl border border-white/10 bg-[#07101a]/88 p-3 backdrop-blur-2xl">
      <h2 className="text-[15px] font-semibold text-[#f5f7fb]">Proximos destinos sugeridos</h2>
      <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex gap-2">
          {candidates.slice(0, 6).map((candidate) => (
            <button
              key={candidate.country_code}
              type="button"
              className="min-w-[132px] max-w-[160px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] text-left"
              onClick={() => onSelect(candidate.country_code)}
            >
              <span className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(135deg,rgba(255, 90, 61,0.36),rgba(17,28,42,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover text-[11px] font-semibold text-white">
                {formatCountryCode(candidate.country_code)}
              </span>
              <span className="block p-2">
                <span className="block truncate text-[10px] font-semibold text-[#f5f7fb]">{candidate.country_name}</span>
                <span className="block truncate text-[9px] text-[#aab2bc]">{candidate.cities[0] || "Destino"}</span>
                <span className="mt-1 flex items-center gap-1 text-[9px] text-[#ff5a52]">
                  <MapPin size={9} weight="fill" />
                  {hideVotes ? "Top destino" : `${candidate.votes || candidate.percent} votos`}
                </span>
              </span>
            </button>
          ))}
        </div>
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
  voteCount?: number;
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
            className={cn("relative flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-medium", active ? "text-[#ff6a4e]" : "text-[#c6cdd5]")}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="relative">
              <Icon size={22} weight={active ? "fill" : "regular"} />
              {item.badge ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e1543a] px-1 text-[9px] font-bold text-white">
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MapSidebar({
  channel,
  viewer,
  youtubeUrl,
  mapUrl,
  resolvedSummary,
  pendingManual,
  pollState,
  hideLivePollMetrics,
  sponsors,
  mobileMenuOpen,
  setMobileMenuOpen,
  selectCountry,
  setMissingVideosOpen,
  scrollToRail,
  videosRailRef,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  const channelThumb = channel.thumbnail_url || null;

  const rawNavItems: Array<SidebarNavItem | null> = [
    { label: "Inicio", icon: House, href: "/" },
    { label: "Mapa", icon: MapPin, onClick: () => selectCountry(null), count: resolvedSummary.total_countries },
    { label: "Videos", icon: Video, onClick: () => scrollToRail(videosRailRef), count: resolvedSummary.total_videos },
    pollState || viewer.isOwner
      ? {
          label: "Votaciones",
          icon: Trophy,
          onClick: () => scrollToRail(votesRailRef),
          count: hideLivePollMetrics ? undefined : pollState?.total_votes || undefined,
        }
      : null,
    sponsors.length > 0 ? { label: "Sponsors", icon: UsersThree, onClick: () => scrollToRail(sponsorsRailRef), count: sponsors.length } : null,
    viewer.isOwner && viewer.adminUrl ? { label: "Analytics", icon: ChartBar, href: viewer.adminUrl } : null,
    viewer.isOwner ? { label: "Ajustes", icon: GearSix, onClick: () => setMissingVideosOpen(true), count: pendingManual.length || undefined } : null,
  ];
  const navItems = rawNavItems.filter((item): item is SidebarNavItem => Boolean(item));

  return (
    <>
      <aside className="pointer-events-auto hidden w-[72px] shrink-0 border-r border-white/10 bg-[#060a11]/95 px-2 py-3 backdrop-blur-2xl lg:flex lg:flex-col xl:w-[184px] xl:px-3 xl:py-4">
        <Link href={mapUrl} className="mb-4 flex items-center justify-center gap-3 rounded-2xl px-1 py-1.5 transition-colors hover:bg-white/[0.04] xl:mb-5 xl:justify-start xl:px-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(255, 90, 61,0.55)] bg-[rgba(255, 90, 61,0.12)] text-[#ff6a4e] xl:h-12 xl:w-12">
            <Video size={22} weight="fill" />
          </span>
          <span className="hidden min-w-0 xl:block">
            <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.16em] text-[#c8d0d8]">TravelYourMap</span>
            <span className="block truncate text-[15px] font-semibold leading-5 text-[#f6f7f8]">{channel.channel_name}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#ff6a4e]">
              <Video size={12} weight="fill" />
              Conectado a YouTube
            </span>
          </span>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="mt-auto hidden space-y-3 xl:block">
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
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#e1543a] text-[12px] font-semibold text-white transition hover:bg-[#ee6b49]">
                <ArrowSquareOut size={14} />
                Abrir en YouTube
              </a>
            ) : null}
          </div>
        </div>
      </aside>

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
  toggleViewerPreview,
  channel,
  canUseAdminPanels,
  canToggleViewerPreview,
  isPreviewingViewer,
  isDemoMode,
  headerEyebrow,
}: MapShellProps) {
  const panelHref = viewer.adminUrl ? `${viewer.adminUrl}${viewer.adminUrl.includes("?") ? "&" : "?"}panel=creator` : null;

  return (
    <header className="pointer-events-auto z-[370] px-4 py-3 xl:px-5">
      <div className="mx-auto grid min-h-[52px] w-full grid-cols-1 gap-3 rounded-xl border border-white/10 bg-[#07101a]/86 p-2 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,0,0,0.55)] bg-[rgba(255,0,0,0.12)] text-[#ff3b3b]">
            <Video size={18} weight="fill" />
          </span>
          <div className="tym-search h-10 min-h-10 w-full max-w-none rounded-xl border-white/10 bg-white/[0.04]">
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
          {canUseAdminPanels && panelHref ? (
            <Button asChild type="button" size="sm" className="shrink-0 bg-[#c91f18] text-white hover:bg-[#e03128]">
              <Link href={`${panelHref}&focus=missing-videos`}>
                <WarningCircle size={14} />
                Videos faltantes
              </Link>
            </Button>
          ) : null}
          {canUseAdminPanels && panelHref ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={panelHref}>
                <GearSix size={14} />
                Panel
              </Link>
            </Button>
          ) : null}
          {canToggleViewerPreview ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={toggleViewerPreview}>
              {isPreviewingViewer ? "Volver al Creator" : "Vista del Viewer"}
            </Button>
          ) : null}
          <Button type="button" size="sm" className="shrink-0 bg-[#e1543a] hover:bg-[#ee6b49]" onClick={copyShareUrl}>
            {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
            {copyState === "copied" ? "Copiado" : isDemoMode ? "Compartir Demo" : "Copiar canal"}
          </Button>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/onboarding">
              <Plus size={14} />
              Register
            </Link>
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
  countryBuckets,
  selectedCountryCode,
  selectedCountryName,
  selectedCityName,
  selectedCityDisplayName,
  selectedCountryCityBuckets,
  selectedCountryVideos,
  selectedCityVideos,
  youtubeDataHealth,
  isDemoMode,
  selectCountry,
  selectCity,
  goBackLocationFilter,
  videosRailRef,
}: MapShellProps) {
  const hasCountrySelection = Boolean(selectedCountryCode);
  const activeLocationCount = selectedCityName ? selectedCityVideos.length : selectedCountryVideos.length;
  const hasCityDrilldown = selectedCityName && selectedCityVideos.length > 0;

  return (
    <aside ref={videosRailRef} className="pointer-events-auto order-2 min-h-0 lg:order-none lg:overflow-hidden">
      <Card className="tm-surface-strong flex min-h-[420px] flex-col rounded-xl border-white/10 lg:h-full">
        <CardHeader className="border-b border-white/10 px-3 pb-3 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ChannelAvatar channel={channel} size="sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f98a3]">{isDemoMode ? "Mapa demo" : "Mapa del canal"}</p>
                <CardTitle className="truncate text-[15px] font-semibold text-[#f5f7fb]">{channel.channel_name}</CardTitle>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f98a3]">
                {isDemoMode ? "Última actualización demo" : "Última actualización"}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#d8dee6]">
                {youtubeDataHealth.latestRefreshedAt ? formatIsoDateTime(youtubeDataHealth.latestRefreshedAt) : "Sin dato"}
              </p>
              {youtubeDataHealth.staleVideos > 0 ? <p className="text-[10px] leading-4 text-[#ffb7b3]">{youtubeDataHealth.staleVideos} video(s) requieren refresh.</p> : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <OverviewMetric label="Paises" value={resolvedSummary.total_countries} tone="white" />
            <OverviewMetric label="Ciudades" value={cityCount} tone="white" />
            <OverviewMetric label="Videos" value={resolvedSummary.total_videos} tone="red" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold text-[#f5f7fb]">{hasCountrySelection ? "Filtro activo" : "Paises"}</h2>
            <Badge variant="outline" className="bg-white/[0.04] text-[11px] text-[#c6cdd5]">
              {hasCountrySelection ? activeLocationCount : countryBuckets.length}
            </Badge>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1" data-map-scroll="true">
            <div className="space-y-3 pr-2">
              {hasCountrySelection ? (
                <>
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f98a3]">
                          {hasCityDrilldown ? "Ciudad activa" : "Pais activo"}
                        </p>
                        <p className="truncate text-[13px] font-semibold text-[#f4f7fb]">
                          {hasCityDrilldown ? `${selectedCountryName || selectedCountryCode} · ${selectedCityDisplayName}` : selectedCountryName || selectedCountryCode}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 border-white/10 bg-white/[0.04] text-[11px]" onClick={goBackLocationFilter}>
                        Volver
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#aab2bc]">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{activeLocationCount} videos</span>
                      {hasCityDrilldown ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{selectedCityVideos.length} en la ciudad</span>
                      ) : null}
                    </div>
                  </div>

                  {selectedCountryCityBuckets.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[12px] font-semibold text-[#f5f7fb]">Ciudades</h3>
                        <Badge variant="outline" className="h-6 rounded-full border-white/15 bg-white/[0.04] px-2 text-[10px] text-[#d5dbe2]">
                          {selectedCountryCityBuckets.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {selectedCountryCityBuckets.map((city) => {
                          const isActive = selectedCityName === city.city;
                          return (
                            <button
                              key={`${selectedCountryCode || "selected"}-${city.city}`}
                              type="button"
                              onClick={() => selectCity(city.city)}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-2 text-left transition",
                                isActive ? "border-[#ff3f38]/60 bg-[rgba(225,84,58,0.14)]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
                              )}
                            >
                              <span className="truncate text-[12px] font-medium text-[#f4f7fb]">{city.city}</span>
                              <Badge variant="outline" className="h-5 shrink-0 rounded-full border-white/15 bg-black/20 px-2 text-[10px] text-[#d5dbe2]">
                                {city.count}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : countryBuckets.length > 0 ? (
                countryBuckets.map((bucket) => {
                  const isActive = selectedCountryCode === bucket.country_code;
                  return (
                    <button
                      key={bucket.country_code}
                      type="button"
                      onClick={() => selectCountry(bucket.country_code)}
                      className={cn(
                        "w-full rounded-lg border p-2 text-left transition",
                        isActive ? "border-[#ff3f38]/60 bg-[rgba(225, 84, 58,0.12)]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-[#f4f7fb]">{bucket.country_name}</p>
                        <Badge variant="outline" className="h-5 rounded-full border-white/15 bg-white/[0.04] px-2 text-[10px] leading-none text-[#d5dbe2]">
                          {bucket.count}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[#9da5ae]">{bucket.cities.length} ciudad(es) detectadas</p>
                    </button>
                  );
                })
              ) : (
                <EmptyPanel title="Sin paises detectados" body="Ajusta la busqueda o vuelve a todos los destinos." />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}

function MapCenterStage({
  selectedCountryCode,
  selectedCountryName,
  windowFilter,
  setWindowFilter,
  activeLocationVideos,
  pinnedVideo,
  videoActivity,
  closePinnedVideo,
  changePinnedVideo,
  onYouTubeExternalOpen,
  goBackLocationFilter,
  issueGlobeCommand,
  rotationEnabled,
}: MapShellProps) {
  const relatedCountryCode = String(pinnedVideo?.country_code || selectedCountryCode || "").toUpperCase();
  const suggestedVideos = activeLocationVideos.slice().sort(sortRecentVideos).slice(0, 6);

  return (
    <section className="pointer-events-none relative order-1 min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:order-none lg:min-h-0">
      <div className="pointer-events-auto absolute left-1/2 top-3 z-[340] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#07101a]/88 p-1.5 backdrop-blur-2xl">
        {(["all", "365", "90", "30"] as FilterWindow[]).map((option) => (
          <button
            key={option}
            type="button"
            className="tym-nav-pill min-h-8 shrink-0 px-4 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : `${option}d`}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto absolute right-3 top-1/2 z-[330] hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/86 backdrop-blur-2xl md:flex">
        <button type="button" className="flex h-10 w-10 items-center justify-center text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => { goBackLocationFilter(); issueGlobeCommand("reset_view"); }} aria-label="Volver al filtro anterior">
          <House size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => issueGlobeCommand("zoom_in")} aria-label="Acercar mapa">
          <Plus size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => issueGlobeCommand("zoom_out")} aria-label="Alejar mapa">
          <Minus size={16} />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center border-t border-white/10 text-[#dce4ed] transition hover:bg-white/[0.08]" onClick={() => issueGlobeCommand("toggle_rotation")} aria-label={rotationEnabled ? "Pausar rotacion" : "Reanudar rotacion"}>
          {rotationEnabled ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
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
            <button type="button" onClick={goBackLocationFilter} className="tym-btn-secondary min-h-9 rounded-xl bg-[#07101a]/90 px-3 text-[12px] backdrop-blur">
              Volver
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 top-16 bottom-[138px] z-[430] hidden px-4 lg:block xl:px-5">
        <div className="flex h-full items-center justify-center">
          <div className="pointer-events-none w-full max-w-[480px]">
            <DesktopVideoMapCard
              videos={activeLocationVideos}
              currentVideo={pinnedVideo}
              activity={videoActivity}
              onOpenInYouTube={onYouTubeExternalOpen}
              onClose={closePinnedVideo}
              onChangeVideo={changePinnedVideo}
              openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Visto en YouTube" : "Abrir en YouTube"}
              onPlaybackStateChange={(state) => {
                if (!pinnedVideo) return;
                if (state === "playing") videoActivity.markVideoStarted(pinnedVideo.youtube_video_id);
                if (state === "ended") videoActivity.setVideoWatchStatus(pinnedVideo.youtube_video_id, "watched");
              }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[330] px-2 pb-2 md:px-3 md:pb-3 lg:px-4 lg:pb-4">
        <SuggestedDestinations
          videos={suggestedVideos}
          relatedCountryCode={relatedCountryCode || null}
          relatedCountryName={pinnedVideo?.country_name || selectedCountryName}
          seenIds={videoActivity.seenIds}
          onOpenVideo={changePinnedVideo}
        />
      </div>
    </section>
  );
}

function MapRightRail({
  channelId,
  viewer,
  pollState,
  availablePollOptions,
  setPollState,
  setDesktopMapTab,
  desktopMapTab,
  mapVideos,
  videoActivity,
  nextDestination,
  destinationCandidates,
  hideLivePollMetrics,
  sponsors,
  isDemoMode,
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
  openVideo,
  createSponsor,
  deleteSponsor,
  resetDemoSponsors,
  onSponsorImpression,
  onSponsorClick,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  const hasLivePoll = Boolean(pollState && pollState.status === "live");
  const showDestinationWinner = Boolean(hasLivePoll && pollState && pollState.total_votes > 0 && !hideLivePollMetrics);

  return (
    <aside className="pointer-events-auto order-3 flex min-h-0 flex-col gap-3 lg:order-none lg:overflow-y-auto lg:pr-1" data-map-scroll="true">
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

      <MapVideoActivityPanel
        videos={mapVideos}
        activity={videoActivity}
        activeTab={desktopMapTab}
        canUseAdminPanels={canUseAdminPanels}
        onTabChange={setDesktopMapTab}
        onOpenVideo={openVideo}
      />

      {showDestinationWinner ? (
        <DestinationCard
          destination={nextDestination}
          fallbackCandidates={destinationCandidates}
          onRefresh={handleRefresh}
          allowRefresh={allowRefresh}
          syncState={syncState}
          onSelect={selectCountry}
          hideVotes={hideLivePollMetrics}
        />
      ) : null}

      <div ref={votesRailRef}>
        {channelId && (pollState || viewer.isOwner) ? (
          <FanVoteCard
            channelId={channelId}
            viewer={viewer}
            poll={pollState}
            availableOptions={availablePollOptions}
            isDemoMode={isDemoMode}
            onPollChange={setPollState}
          />
        ) : (
          <FanVoteSummary candidates={destinationCandidates} onSelect={selectCountry} />
        )}
      </div>

      <div ref={sponsorsRailRef}>
        <SponsorsRail
          channelId={channelId}
          sponsors={sponsors}
          viewer={viewer}
          isDemoMode={isDemoMode}
          createSponsor={createSponsor}
          deleteSponsor={deleteSponsor}
          resetDemoSponsors={resetDemoSponsors}
          onSponsorImpression={onSponsorImpression}
          onSponsorClick={onSponsorClick}
        />
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
  hideVotes = false,
}: {
  destination: DestinationCandidate | null;
  fallbackCandidates: DestinationCandidate[];
  onRefresh: () => void;
  allowRefresh: boolean;
  syncState: SyncState;
  onSelect?: (countryCode: string | null) => void;
  hideVotes?: boolean;
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
                    {hideVotes
                      ? "Ranking activo"
                      : destination.votes > 0
                        ? `${formatExactNumber(destination.votes)} votos`
                        : `${formatExactNumber(fallbackCandidates.length)} sugerencias`}
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
              <Button type="button" size="sm" className="bg-[#e1543a] hover:bg-[#ee6b49]" onClick={() => onSelect?.(destination.country_code)}>
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
          <button type="button" onClick={onMissing} className="w-full rounded-lg border border-[rgba(255, 90, 61,0.24)] bg-[rgba(255, 90, 61,0.09)] px-3 py-3 text-left">
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
  videos,
  relatedCountryCode,
  relatedCountryName,
  seenIds,
  onOpenVideo,
}: {
  videos: TravelVideoLocation[];
  relatedCountryCode: string | null;
  relatedCountryName: string | null;
  seenIds: Set<string>;
  onOpenVideo: (video: TravelVideoLocation) => void;
}) {
  const visibleVideos = videos.slice(0, 5);
  const railRef = useRef<HTMLDivElement | null>(null);
  function scrollRail(direction: -1 | 1) {
    const node = railRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(240, node.clientWidth * 0.72), behavior: "smooth" });
  }
  if (!visibleVideos.length) return null;

  return (
    <div className="pointer-events-auto mx-auto hidden w-full max-w-[760px] rounded-xl border border-white/10 bg-[#07101a]/86 p-2 backdrop-blur-2xl md:block xl:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 xl:mb-3">
        <div className="min-w-0">
          <h2 className="truncate text-[12px] font-semibold text-[#f5f7fb] xl:text-[14px]">
            {relatedCountryCode ? `Videos relacionados en ${relatedCountryName || relatedCountryCode}` : "Ultimos videos del canal"}
          </h2>
          <p className="mt-0.5 text-[10px] text-[#8f98a3]">Desplaza horizontalmente para ver mas opciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-7 shrink-0 rounded-full border-white/15 bg-white/[0.05] px-3 text-[11px] font-medium text-[#d8dee6]">
            {visibleVideos.length}
          </Badge>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.08]"
              aria-label="Videos relacionados anteriores"
            >
              <CaretLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.08]"
              aria-label="Videos relacionados siguientes"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>
      <div ref={railRef} className="flex gap-2 overflow-x-auto pb-1 xl:gap-3 [scrollbar-width:thin]">
        {visibleVideos.map((video) => (
          <button
            key={`${video.youtube_video_id}-${video.published_at || "suggested-video"}`}
            type="button"
            onClick={() => onOpenVideo(video)}
            className={cn(
              "group min-w-[150px] max-w-[190px] shrink-0 overflow-hidden rounded-lg border bg-white/[0.04] text-left transition hover:bg-white/[0.08]",
              seenIds.has(video.youtube_video_id) ? "border-[rgba(201,31,24,0.8)]" : "border-white/10"
            )}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              {video.thumbnail_url ? (
                <Image
                  src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                  alt={video.title}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-white/[0.06]" />
              )}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.72))]" />
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="line-clamp-2 text-[10px] font-semibold leading-4 text-[#f5f7fb]">{video.title}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandInquiryCta({
  channelId,
  channelName,
  mapUrl,
  className,
  size = "default",
  variant = "default",
  triggerLabel = "Quiero mi marca aqui",
  triggerVariant = "button",
}: {
  channelId: string;
  channelName: string;
  mapUrl: string;
  className?: string;
  size?: "default" | "sm";
  variant?: "default" | "outline";
  triggerLabel?: string;
  triggerVariant?: "button" | "tile";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const proposedBudgetRaw = String(formData.get("proposed_budget_usd") || "").trim();
    const proposedBudgetUsd = proposedBudgetRaw.length > 0 ? Number(proposedBudgetRaw) : null;
    const hasInvalidBudget = proposedBudgetRaw.length > 0 && (!Number.isFinite(proposedBudgetUsd ?? Number.NaN) || (proposedBudgetUsd ?? 0) <= 0);

    if (hasInvalidBudget) {
      setError("Ingresa un presupuesto valido en USD.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/sponsors/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          brandName: String(formData.get("brand_name") || "").trim(),
          contactName: String(formData.get("contact_name") || "").trim(),
          contactEmail: String(formData.get("contact_email") || "").trim(),
          websiteUrl: String(formData.get("website_url") || "").trim(),
          whatsapp: String(formData.get("whatsapp") || "").trim(),
          proposedBudgetUsd: proposedBudgetUsd ? Math.round(proposedBudgetUsd) : null,
          brief: String(formData.get("brief") || "").trim(),
          mapUrl,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "No se pudo enviar la solicitud.");
        return;
      }

      form.reset();
      setSuccess("Recibido. El creador del mapa revisara tu propuesta y te contactara por email.");
    } catch {
      setError("No se pudo enviar la solicitud. Reintenta en unos minutos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {triggerVariant === "tile" ? (
        <button type="button" className={cn("group min-w-0 text-center", className)} onClick={() => setOpen(true)}>
          <span className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.02] text-[#c6cdd5] transition group-hover:border-white/30 group-hover:bg-white/[0.05] group-hover:text-[#eef2f6]">
            <Plus size={25} />
          </span>
          <span className="mt-2 block truncate text-[11px] text-[#aeb6bf]">{triggerLabel}</span>
        </button>
      ) : (
        <Button type="button" size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
          <EnvelopeSimple size={13} />
          {triggerLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="tm-surface-strong max-w-[min(640px,calc(100%-1.5rem))] border-white/10 bg-[#07101a]/95 p-5 text-[#f5f7fb] sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-[#f5f7fb]">Quiero mi marca aqui</DialogTitle>
            <DialogDescription className="text-[12px] leading-5 text-[#aab2bc]">
              Completa este recibo comercial para contactar al creador de <span className="font-semibold text-[#f1f1f1]">{channelName}</span> y negociar una colaboracion.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-2 space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Marca</span>
                <Input name="brand_name" required minLength={2} maxLength={120} placeholder="Ej: Nomad Gear" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Nombre de contacto</span>
                <Input name="contact_name" required minLength={2} maxLength={120} placeholder="Nombre y apellido" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Email</span>
                <Input type="email" name="contact_email" required maxLength={180} placeholder="marca@empresa.com" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Web o landing</span>
                <Input type="url" name="website_url" maxLength={240} placeholder="https://..." className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">WhatsApp (opcional)</span>
                <Input name="whatsapp" maxLength={40} placeholder="+54 9 ..." className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Presupuesto mensual estimado (USD)</span>
                <Input type="number" name="proposed_budget_usd" min={1} step={1} placeholder="1500" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
              </label>
            </div>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6cdd5]">Objetivo de la colaboracion</span>
              <textarea
                name="brief"
                required
                minLength={20}
                maxLength={1200}
                placeholder="Producto a promocionar, destino, formato esperado, fechas y cualquier condicion comercial."
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-[#f5f7fb] outline-none ring-[#ff5a3d]/45 placeholder:text-[#7e8792] focus-visible:ring-2"
              />
            </label>

            {error ? <p className="rounded-lg border border-[rgba(255,82,82,0.35)] bg-[rgba(255,82,82,0.14)] px-3 py-2 text-[12px] text-[#ffc5c5]">{error}</p> : null}
            {success ? <p className="rounded-lg border border-[rgba(85,200,123,0.35)] bg-[rgba(85,200,123,0.14)] px-3 py-2 text-[12px] text-[#c8f3d6]">{success}</p> : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <p className="text-[11px] text-[#90a0b1]">Tu propuesta queda registrada y se envia al owner de este mapa.</p>
              <Button type="submit" size="sm" className="min-w-[176px]" disabled={busy}>
                {busy ? "Enviando..." : "Enviar recibo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SponsorsRail({
  channelId,
  sponsors,
  viewer,
  isDemoMode,
  createSponsor,
  deleteSponsor,
  resetDemoSponsors,
  onSponsorImpression,
  onSponsorClick,
}: {
  channelId: string | null;
  sponsors: MapRailSponsor[];
  viewer: MapViewerContext;
  isDemoMode: boolean;
  createSponsor: (input: SponsorInput) => Promise<void>;
  deleteSponsor: (sponsorId: string) => Promise<void>;
  resetDemoSponsors: () => void;
  onSponsorImpression: (sponsor: MapRailSponsor) => void;
  onSponsorClick: (sponsor: MapRailSponsor) => void;
}) {
  const [startIndex, setStartIndex] = useState(0);
  const [managerOpen, setManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inquiries, setInquiries] = useState<SponsorInquiryRecord[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);
  const maxStartIndex = Math.max(0, sponsors.length - 3);
  const clampedStart = Math.min(startIndex, maxStartIndex);
  const visibleSponsors = useMemo(() => sponsors.slice(clampedStart, clampedStart + 3), [clampedStart, sponsors]);
  const canMoveLeft = clampedStart > 0;
  const canMoveRight = clampedStart < maxStartIndex;
  const canOpenInbox = viewer.isOwner && (isDemoMode || Boolean(channelId));
  const newInquiryCount = inquiries.filter((inquiry) => inquiry.status === "new").length;

  useEffect(() => {
    visibleSponsors.forEach(onSponsorImpression);
  }, [onSponsorImpression, visibleSponsors]);

  const loadInquiries = useCallback(async () => {
    if (!canOpenInbox) return;

    setInquiriesLoading(true);
    setInquiriesError(null);
    try {
      const params = new URLSearchParams();
      if (isDemoMode) params.set("demo", "1");
      if (channelId) params.set("channelId", channelId);
      const response = await fetch(`/api/sponsors/inquiries?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { inquiries?: SponsorInquiryRecord[]; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo cargar el inbox comercial.");
      }
      setInquiries(Array.isArray(payload?.inquiries) ? payload.inquiries : []);
    } catch (error) {
      setInquiriesError(error instanceof Error ? error.message : "No se pudo cargar el inbox comercial.");
    } finally {
      setInquiriesLoading(false);
    }
  }, [canOpenInbox, channelId, isDemoMode]);

  useEffect(() => {
    if (!inboxOpen) return;
    void loadInquiries();
  }, [inboxOpen, loadInquiries]);

  const updateInquiryStatus = useCallback(
    async (inquiryId: string, nextStatus: SponsorInquiryStatus) => {
      setInquiriesError(null);
      if (isDemoMode) {
        setInquiries((current) =>
          current.map((inquiry) =>
            inquiry.id === inquiryId ? { ...inquiry, status: nextStatus, updated_at: new Date().toISOString() } : inquiry
          )
        );
        return;
      }

      setUpdatingInquiryId(inquiryId);
      try {
        const response = await fetch("/api/sponsors/inquiries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiryId, status: nextStatus }),
        });
        const payload = (await response.json().catch(() => null)) as { inquiry?: { id: string; status: SponsorInquiryStatus }; error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo actualizar el estado.");
        }
        setInquiries((current) =>
          current.map((inquiry) => (inquiry.id === inquiryId ? { ...inquiry, status: payload?.inquiry?.status || nextStatus, updated_at: new Date().toISOString() } : inquiry))
        );
      } catch (error) {
        setInquiriesError(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      } finally {
        setUpdatingInquiryId(null);
      }
    },
    [isDemoMode]
  );

  return (
    <Card className="tm-surface-strong rounded-xl border-white/10">
      <CardHeader className="flex-row items-center justify-between px-3 pb-2 pt-3">
        <CardTitle className="text-[14px] font-semibold text-[#f5f7fb]">Sponsors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStartIndex((current) => Math.max(0, current - 1))}
              disabled={!canMoveLeft}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Sponsors anteriores"
            >
              <CaretLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setStartIndex((current) => Math.min(maxStartIndex, current + 1))}
              disabled={!canMoveRight}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Sponsors siguientes"
            >
              <CaretRight size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {sponsors.length > 0 ? (
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 text-[11px] font-medium text-[#d8dee6] transition hover:bg-white/[0.1]"
              >
                Ver todos
              </button>
            ) : null}
            {canOpenInbox ? (
              <button
                type="button"
                onClick={() => setInboxOpen(true)}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 text-[11px] font-medium text-[#d8dee6] transition hover:bg-white/[0.1]"
              >
                Leads
                {newInquiryCount > 0 ? <span className="rounded-full bg-[#e1543a] px-1.5 text-[10px] font-semibold text-white">{newInquiryCount}</span> : null}
              </button>
            ) : null}
            {viewer.isOwner ? (
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="h-7 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[11px] font-medium text-[#d8dee6] transition hover:bg-white/[0.1]"
              >
                Agregar
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {visibleSponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.affiliate_url || sponsor.logo_url || "#"}
              target={sponsor.affiliate_url ? "_blank" : undefined}
              rel={sponsor.affiliate_url ? "noreferrer" : undefined}
              onClick={() => onSponsorClick(sponsor)}
              className="group min-w-0 text-center"
            >
              <span className="mx-auto flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white text-[10px] font-semibold text-[#07101a] transition group-hover:scale-[1.04]">
                {sponsor.logo_url ? (
                  <Image src={sponsor.logo_url} alt={sponsor.brand_name} width={44} height={44} className="h-full w-full object-contain p-1.5" />
                ) : (
                  getInitials(sponsor.brand_name)
                )}
              </span>
              <span className="mt-1 block truncate text-[10px] font-medium text-[#d9e0e7]">{sponsor.brand_name}</span>
              <span className={cn("block truncate text-[9px] font-medium", sponsor.isExample ? "text-[#e0a193]" : "text-[#59d67e]")}>{sponsor.isExample ? "Pendiente" : "Activo"}</span>
            </a>
          ))}
        </div>
        {!visibleSponsors.length ? <p className="mt-3 text-[12px] leading-5 text-[#9da5ae]">Este mapa todavia no tiene sponsors activos.</p> : null}
      </CardContent>

      <SponsorManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        sponsors={sponsors}
        isDemoMode={isDemoMode}
        onCreateSponsor={createSponsor}
        onDeleteSponsor={deleteSponsor}
        onResetDemo={resetDemoSponsors}
      />
      <SponsorInboxDialog
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        inquiries={inquiries}
        loading={inquiriesLoading}
        error={inquiriesError}
        updatingInquiryId={updatingInquiryId}
        onReload={loadInquiries}
        onUpdateStatus={updateInquiryStatus}
      />
    </Card>
  );
}

function SponsorManagerDialog({
  open,
  onOpenChange,
  sponsors,
  isDemoMode,
  onCreateSponsor,
  onDeleteSponsor,
  onResetDemo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sponsors: MapRailSponsor[];
  isDemoMode: boolean;
  onCreateSponsor: (input: SponsorInput) => Promise<void>;
  onDeleteSponsor: (sponsorId: string) => Promise<void>;
  onResetDemo: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: SponsorInput = {
      brand_name: String(formData.get("brand_name") || "").trim(),
      logo_url: String(formData.get("logo_url") || "").trim() || null,
      affiliate_url: String(formData.get("affiliate_url") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      country_code: String(formData.get("country_code") || "").trim().toUpperCase() || null,
    };

    if (!input.brand_name) {
      setError("La marca es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreateSponsor(input);
      event.currentTarget.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el sponsor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSponsor(sponsorId: string) {
    setSaving(true);
    setError(null);
    try {
      await onDeleteSponsor(sponsorId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el sponsor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tm-surface-strong max-w-[min(760px,calc(100%-1.5rem))] border-white/10 bg-[#07101a]/95 p-5 text-[#f5f7fb] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-[#f5f7fb]">Administrar sponsors</DialogTitle>
          <DialogDescription className="text-[12px] leading-5 text-[#aab2bc]">
            {isDemoMode ? "Modo demo: puedes editar y resetear sponsors sin tocar datos reales." : "Modo creator: los cambios se guardan para tu canal."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" onSubmit={handleSubmit}>
            <p className="text-[12px] font-semibold text-[#f5f7fb]">Agregar sponsor</p>
            <Input name="brand_name" required placeholder="Marca" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
            <Input name="logo_url" placeholder="Logo URL (opcional)" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
            <Input name="affiliate_url" placeholder="URL del sponsor" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
            <Input name="country_code" maxLength={2} placeholder="Pais ISO (ej: JP)" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
            <Input name="description" placeholder="Descripcion breve" className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Guardando..." : "Guardar sponsor"}
              </Button>
              {isDemoMode ? (
                <Button type="button" size="sm" variant="outline" onClick={onResetDemo} disabled={saving}>
                  Reset demo
                </Button>
              ) : null}
            </div>
            {error ? <p className="text-[12px] text-[#ff9893]">{error}</p> : null}
          </form>

          <div className="min-h-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-[12px] font-semibold text-[#f5f7fb]">Sponsors activos ({sponsors.length})</p>
            <ScrollArea className="h-[220px]" data-map-scroll="true">
              <div className="space-y-2 pr-2">
                {sponsors.map((sponsor) => (
                  <div key={sponsor.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#f5f7fb]">{sponsor.brand_name}</p>
                      <p className="truncate text-[10px] text-[#9da5ae]">{sponsor.country_codes?.join(", ") || "GLOBAL"}</p>
                    </div>
                    <Button type="button" size="icon-sm" variant="outline" className="h-7 w-7 shrink-0" onClick={() => handleDeleteSponsor(sponsor.id)} disabled={saving}>
                      <Trash size={12} />
                    </Button>
                  </div>
                ))}
                {!sponsors.length ? <p className="text-[12px] text-[#9da5ae]">No hay sponsors cargados.</p> : null}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SponsorInboxDialog({
  open,
  onOpenChange,
  inquiries,
  loading,
  error,
  updatingInquiryId,
  onReload,
  onUpdateStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiries: SponsorInquiryRecord[];
  loading: boolean;
  error: string | null;
  updatingInquiryId: string | null;
  onReload: () => Promise<void>;
  onUpdateStatus: (inquiryId: string, status: SponsorInquiryStatus) => Promise<void>;
}) {
  const newCount = inquiries.filter((inquiry) => inquiry.status === "new").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tm-surface-strong max-w-[min(920px,calc(100%-1.5rem))] border-white/10 bg-[#07101a]/95 p-5 text-[#f5f7fb] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-[#f5f7fb]">Inbox comercial</DialogTitle>
          <DialogDescription className="text-[12px] leading-5 text-[#aab2bc]">
            Leads recibidos desde el mapa publico. Nuevos: {newCount}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#9da5ae]">Total: {inquiries.length} propuestas</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void onReload()} disabled={loading}>
            <ArrowsClockwise size={13} />
            Recargar
          </Button>
        </div>

        {error ? <p className="rounded-lg border border-[rgba(255,82,82,0.35)] bg-[rgba(255,82,82,0.14)] px-3 py-2 text-[12px] text-[#ffc5c5]">{error}</p> : null}

        <ScrollArea className="h-[420px]" data-map-scroll="true">
          <div className="space-y-3 pr-2">
            {loading && !inquiries.length ? <p className="text-[12px] text-[#9da5ae]">Cargando inbox...</p> : null}
            {!loading && !inquiries.length ? <p className="text-[12px] text-[#9da5ae]">Todavia no hay propuestas de marcas.</p> : null}
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#f5f7fb]">{inquiry.brand_name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#aab2bc]">
                      {inquiry.contact_name} · {inquiry.contact_email}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8f9aa5]">{formatInquiryDate(inquiry.created_at)} · {inquiry.channel_name}</p>
                  </div>
                  <label className="flex min-w-[140px] items-center gap-2 text-[11px] text-[#c6cdd5]">
                    Estado
                    <select
                      value={inquiry.status}
                      onChange={(event) => void onUpdateStatus(inquiry.id, event.target.value as SponsorInquiryStatus)}
                      disabled={updatingInquiryId === inquiry.id}
                      className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] text-[#f5f7fb] outline-none"
                    >
                      {SPONSOR_INQUIRY_STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-[#07101a] text-[#f5f7fb]">
                          {SPONSOR_INQUIRY_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-2 text-[12px] leading-5 text-[#d9dfe6]">{inquiry.brief}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#9da5ae]">
                  {typeof inquiry.proposed_budget_usd === "number" ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">USD {formatExactNumber(inquiry.proposed_budget_usd)}</span>
                  ) : null}
                  {inquiry.website_url ? (
                    <a href={inquiry.website_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[#c6dfff] hover:text-white">
                      Web
                    </a>
                  ) : null}
                  {inquiry.whatsapp ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">{inquiry.whatsapp}</span> : null}
                  {inquiry.map_url ? (
                    <a href={inquiry.map_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[#c6dfff] hover:text-white">
                      Mapa origen
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
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
  const className = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.07]",
    !mobile && "lg:h-10 lg:justify-center lg:px-0 xl:h-auto xl:justify-start xl:px-3"
  );
  const content = (
    <>
      <Icon size={17} className="shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate", !mobile && "lg:hidden xl:block")}>{item.label}</span>
      {item.count ? (
        <span className={cn("rounded-md bg-[#e1543a] px-1.5 py-0.5 text-[10px] font-semibold text-white", !mobile && "lg:hidden xl:inline-flex")}>
          {item.count}
        </span>
      ) : null}
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
    <span className={cn("tym-video-thumb relative shrink-0", className)}>
      {video.thumbnail_url ? (
        <Image
          src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
          alt={video.title}
          fill
          sizes="120px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(255, 90, 61,0.2),rgba(12,20,31,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover text-[10px] text-[#cfd6df]">
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
      style={{ background: `conic-gradient(#ff6a4e ${normalized * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}
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
    if (city) {
      const existing = row.cities.find((entry) => entry.name === city);
      if (existing) {
        existing.count += 1;
      } else {
        row.cities.push({ name: city, count: 1 });
      }
    }
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
    cities: country.cities.map((city) => city.name),
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

function formatPlace(video: TravelVideoLocation) {
  return [video.city, video.country_name || video.country_code].filter(Boolean).join(", ") || "Ubicacion mapeada";
}

function formatCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "TM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return code || "TM";
}

function getVideoCityKey(video: TravelVideoLocation) {
  return String(video.city || video.location_label || "").trim();
}

function buildCityBuckets(videos: TravelVideoLocation[]) {
  const buckets = new Map<string, { city: string; count: number }>();
  for (const video of videos) {
    const city = getVideoCityKey(video);
    if (!city) continue;
    const current = buckets.get(city) || { city, count: 0 };
    current.count += 1;
    buckets.set(city, current);
  }

  return Array.from(buckets.values()).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
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

function formatIsoDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInquiryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "ahora";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
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
