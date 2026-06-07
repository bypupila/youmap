"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  Clock,
  Copy,
  DotsThree,
  Eye,
  EnvelopeSimple,
  GearSix,
  GlobeHemisphereWest,
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
import type { CSSProperties, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import posthog from "posthog-js";
import { DesktopVideoMapCard } from "@/components/map/desktop-video-map-card";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { MapVideoActivityPanel } from "@/components/map/map-video-activity-panel";
import { MissingVideosDialog } from "@/components/map/missing-videos-dialog";
import { useLocalVideoActivity } from "@/components/map/video-activity";
import type { VideoActivityController, VideoActivityTab, VideoWatchStatus } from "@/components/map/video-activity";
import { VideoSelectionSheet } from "@/components/map/video-selection-sheet";
import { getVideoCityLabel } from "@/components/map/video-viewer-utils";
import { CountryFlag } from "@/components/ui/country-flag";
import { getDemoSponsorByCountry } from "@/lib/demo-data";
import { TravelGlobe } from "@/components/travel-globe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapEventType } from "@/lib/map-event-types";
import type { MapFanVoteSummary } from "@/lib/map-fan-votes";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-types";
import { buildPublicMapUrl } from "@/lib/map-urls";
import { copyTextToClipboard } from "@/lib/clipboard";
import { SPONSOR_INQUIRY_STATUSES, type SponsorInquiryStatus } from "@/lib/sponsor-inquiries";
import { normalizeExternalSponsorUrl } from "@/lib/sponsor-url";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

type FilterWindow = "30" | "90" | "365" | "all";
type SyncState = "idle" | "running" | "success" | "error";
type MobileMapTab = "overview" | "map" | "videos" | "community" | "more";
type MapViewMode = "viewer" | "creator" | "demo";
type DesktopMapTab = VideoActivityTab;
type GlobeCommandAction = "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation" | "collapse_cluster";
type VideoPlaybackState = "playing" | "paused" | "ended";
type FanVoteViewerInteraction = "live" | "simulated" | "disabled";
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
const MAP_BACK_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border !border-[#ff2a1f] !bg-[#ff2a1f] px-4 text-[12px] font-semibold !text-white shadow-none transition hover:!bg-[#ff3b30]";
const VIDEO_EXIT_PROMPT_THRESHOLD_MS = 2 * 60 * 1000;
const INTERNAL_WATCH_TIME_MIN_MS = 15 * 1000;
const MAP_CARD_CENTER_TOP_CLEARANCE = "4rem";
const MAP_CARD_CENTER_BOTTOM_CLEARANCE = "11.25rem";
const DEMO_SPONSOR_FALLBACK: MapRailSponsor[] = [
  { ...getDemoSponsorByCountry(null), country_codes: ["GLOBAL"], logo_url: "/brands/booking.svg", isExample: true },
  { ...getDemoSponsorByCountry("JP"), country_codes: ["JP"], logo_url: "/brands/getyourguide.svg", isExample: true },
  { ...getDemoSponsorByCountry("AR"), country_codes: ["AR"], logo_url: "/brands/iati.svg", isExample: true },
  { ...getDemoSponsorByCountry("MA"), country_codes: ["MA"], logo_url: "/brands/airbnb.svg", isExample: true },
];
const DEMO_FAN_VOTE_SAMPLE: MapFanVoteSummary = {
  total_votes: 64,
  country_rankings: [
    { country_code: "JP", country_name: "Japan", votes: 25 },
    { country_code: "MX", country_name: "Mexico", votes: 22 },
    { country_code: "IT", country_name: "Italy", votes: 17 },
  ],
  city_rankings: [
    { country_code: "JP", country_name: "Japan", city: "Tokyo", votes: 14 },
    { country_code: "MX", country_name: "Mexico", city: "CDMX", votes: 12 },
    { country_code: "IT", country_name: "Italy", city: "Rome", votes: 9 },
  ],
  viewer_can_vote: true,
  viewer_last_voted_at: null,
  viewer_next_vote_at: null,
  viewer_vote_country_code: null,
  viewer_vote_city: null,
  viewer_cooldown_remaining_ms: 0,
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
  fanVotes?: MapFanVoteSummary | null;
  availablePollOptions?: PollOptionInput[];
  fanVoteOptions?: PollOptionInput[];
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

type VideoExitPromptState = {
  videoId: string;
  title: string;
  action: () => void;
};

type CountryVotePromptState =
  | {
      status: "confirm";
      countryCode: string;
      countryName: string;
    }
  | {
      status: "cooldown";
      countryCode: string;
      countryName: string;
      remainingMs: number;
    }
  | {
      status: "live_locked";
      countryCode: string;
      countryName: string;
    };

type PlaybackTrackerState = {
  videoId: string | null;
  startedAtMs: number | null;
  elapsedMsById: Record<string, number>;
};

type PreviousVideoActivityState = {
  savedIds: Set<string>;
  featuredIds: Set<string>;
  watchStatusById: Record<string, VideoWatchStatus>;
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
  fanVoteState: MapFanVoteSummary | null;
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
  creatorPanelHref: string | null;
  showCreateMapCta: boolean;
  fanVoteViewerInteraction: FanVoteViewerInteraction;
  desktopMapTab: DesktopMapTab;
  quickActivityCounts: {
    watched: number;
    incomplete: number;
    saved: number;
    featured: number;
  };
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
  onUnifiedBack: () => void;
  showUnifiedBack: boolean;
  hoveredCountryPin: { countryCode: string; countryName: string } | null;
  mapVotePrompt: CountryVotePromptState | null;
  setMapVotePrompt: Dispatch<SetStateAction<CountryVotePromptState | null>>;
  mapVoteOpen: boolean;
  setMapVoteOpen: Dispatch<SetStateAction<boolean>>;
  mapVoteScope: "country" | "city";
  setMapVoteScope: Dispatch<SetStateAction<"country" | "city">>;
  mapVoteCity: string;
  setMapVoteCity: Dispatch<SetStateAction<string>>;
  mapVoteBusy: boolean;
  mapVoteError: string | null;
  submitOpenFanVote: () => Promise<void>;
  selectedVoteCountryOption: PollOptionInput | null;
  openVideo: (video: TravelVideoLocation) => void;
  changePinnedVideo: (video: TravelVideoLocation) => void;
  closePinnedVideo: () => void;
  videoPlaybackCommand: { id: number; action: "pause" | "play" } | null;
  onVideoPlaybackStateChange: (video: TravelVideoLocation, state: VideoPlaybackState) => void;
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
  fanVotes = null,
  availablePollOptions = EMPTY_POLL_OPTIONS,
  fanVoteOptions,
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
  const [globeRotationEnabled, setGlobeRotationEnabled] = useState(false);
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const [globeCommand, setGlobeCommand] = useState<{ id: number; action: GlobeCommandAction } | null>(null);
  const [pollState, setPollState] = useState<MapPollRecord | null>(activePoll);
  const [fanVoteState, setFanVoteState] = useState<MapFanVoteSummary | null>(fanVotes);
  const [hoveredCountryPin, setHoveredCountryPin] = useState<{ countryCode: string; countryName: string } | null>(null);
  const [mapVotePrompt, setMapVotePrompt] = useState<CountryVotePromptState | null>(null);
  const [mapVoteOpen, setMapVoteOpen] = useState(false);
  const [mapVoteScope, setMapVoteScope] = useState<"country" | "city">("country");
  const [mapVoteCity, setMapVoteCity] = useState("");
  const [mapVoteBusy, setMapVoteBusy] = useState(false);
  const [mapVoteError, setMapVoteError] = useState<string | null>(null);
  const resolvedFanVoteOptions = fanVoteOptions?.length ? fanVoteOptions : availablePollOptions;
  const [sponsorItems, setSponsorItems] = useState<MapRailSponsor[]>(sponsors);
  const [videoExitPrompt, setVideoExitPrompt] = useState<VideoExitPromptState | null>(null);
  const [videoPlaybackCommand, setVideoPlaybackCommand] = useState<{ id: number; action: "pause" | "play" } | null>(null);
  const demoSponsorsBaselineRef = useRef<MapRailSponsor[]>(sponsors);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const videoActivity = useLocalVideoActivity({
    channelId: channelId || channel.id,
    persistToProfile: Boolean(viewer.isAuthenticated && !viewer.isOwner),
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videosRailRef = useRef<HTMLDivElement | null>(null);
  const votesRailRef = useRef<HTMLDivElement | null>(null);
  const sponsorsRailRef = useRef<HTMLDivElement | null>(null);
  const trackedMapViewRef = useRef<string | null>(null);
  const trackedSponsorImpressionIdsRef = useRef<Set<string>>(new Set());
  const playbackTrackerRef = useRef<PlaybackTrackerState>({
    videoId: null,
    startedAtMs: null,
    elapsedMsById: {},
  });
  const suppressEndedForVideoIdRef = useRef<string | null>(null);
  const previousVideoActivityRef = useRef<PreviousVideoActivityState | null>(null);

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
    setFanVoteState(fanVotes);
  }, [fanVotes]);

  useEffect(() => {
    setSponsorItems(sponsors);
    demoSponsorsBaselineRef.current = sponsors;
  }, [sponsors]);

  const resolveVideoSponsorNames = useCallback(
    (video: TravelVideoLocation | null | undefined) => {
      const youtubeVideoId = String(video?.youtube_video_id || "").trim();
      if (!youtubeVideoId) return [] as string[];
      const videoRecordId = String(video?.id || "").trim();
      const names = new Set<string>();

      for (const sponsor of sponsorItems) {
        if (!sponsor.brand_name || sponsor.scope !== "video") continue;
        const assignedVideoIds = (sponsor.video_ids || []).map((id) => String(id || "").trim()).filter(Boolean);
        if (assignedVideoIds.includes(videoRecordId) || assignedVideoIds.includes(youtubeVideoId)) {
          names.add(sponsor.brand_name);
        }
      }

      return Array.from(names);
    },
    [sponsorItems]
  );

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

  const videoLookupById = useMemo(() => {
    const lookup = new Map<string, TravelVideoLocation>();
    for (const video of items) {
      const videoId = String(video.youtube_video_id || "").trim();
      if (!videoId) continue;
      lookup.set(videoId, video);
    }
    return lookup;
  }, [items]);

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
  const watchLaterVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.watchStatusById[video.youtube_video_id] === "watch_later"),
    [searchFilteredVideos, videoActivity.watchStatusById]
  );
  const incompleteVideos = useMemo(
    () => searchFilteredVideos.filter((video) => videoActivity.watchStatusById[video.youtube_video_id] === "not_finished"),
    [searchFilteredVideos, videoActivity.watchStatusById]
  );
  const activityScopeVideos = useMemo(() => {
    if (desktopMapTab === "watched") return watchedVideos;
    if (desktopMapTab === "opened") return openedVideos;
    if (desktopMapTab === "saved") return savedVideos;
    if (desktopMapTab === "featured") return featuredVideos;
    if (desktopMapTab === "watch_later") return watchLaterVideos;
    if (desktopMapTab === "incomplete") return incompleteVideos;
    return searchFilteredVideos;
  }, [desktopMapTab, watchedVideos, openedVideos, savedVideos, featuredVideos, watchLaterVideos, incompleteVideos, searchFilteredVideos]);

  const countryBuckets = useMemo(() => buildCountryBuckets(activityScopeVideos), [activityScopeVideos]);

  const selectedCountryVideos = useMemo(() => {
    if (!selectedCountryCode) return [];
    return activityScopeVideos
      .filter((video) => String(video.country_code || "").toUpperCase() === selectedCountryCode)
      .sort(sortRecentVideos);
  }, [activityScopeVideos, selectedCountryCode]);

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
    return activityScopeVideos;
  }, [activityScopeVideos, selectedCityName, selectedCountryCode, selectedCityVideos, selectedCountryVideos]);

  const filteredVideos = activeLocationVideos;

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

  const cityCount = useMemo(() => buildCityBuckets(items).length, [items]);

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
  const isDemoMode = baseViewMode === "demo";
  const canToggleViewerPreview = baseViewMode === "creator" || baseViewMode === "demo" || viewer.isOwner;
  const resolvedViewMode: MapViewMode = isPreviewingViewer && canToggleViewerPreview ? "viewer" : baseViewMode;
  const isCreatorViewerPreview = resolvedViewMode === "viewer" && viewer.isOwner && !isDemoMode;
  const canUseOpenFanVote = Boolean(channelId && resolvedViewMode === "viewer" && (isDemoMode || !viewer.isOwner));
  const canUseAdminPanels = resolvedViewMode === "creator" || resolvedViewMode === "demo";
  const fanVoteViewerInteraction: FanVoteViewerInteraction = isCreatorViewerPreview
    ? "disabled"
    : resolvedViewMode === "viewer" && isDemoMode
      ? "simulated"
      : "live";
  const hideLivePollMetrics = Boolean(
    pollState && pollState.status === "live" && !viewer.isOwner && !viewer.isAuthenticated
  );
  const creatorPanelHref = canUseAdminPanels && channelId
    ? `/creator-panel?channelId=${encodeURIComponent(channelId)}${isDemoMode ? "&demo=1" : ""}`
    : null;
  const showCreateMapCta = resolvedViewMode === "viewer" && (!viewer.isAuthenticated || isDemoMode);

  useEffect(() => {
    if (!isDemoMode) return;
    setFanVoteState((current) => {
      if ((current?.total_votes || 0) > 0) return current;
      return DEMO_FAN_VOTE_SAMPLE;
    });
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) return;
    if (sponsors.length > 0) return;
    if (sponsorItems.length > 0) return;
    setSponsorItems(DEMO_SPONSOR_FALLBACK);
    demoSponsorsBaselineRef.current = DEMO_SPONSOR_FALLBACK;
  }, [isDemoMode, sponsorItems.length, sponsors.length]);
  const shellViewer: MapViewerContext = canUseAdminPanels
    ? {
        ...viewer,
        isOwner: true,
        adminUrl: viewer.adminUrl || creatorPanelHref,
      }
    : {
        ...viewer,
        isOwner: false,
        adminUrl: null,
      };
  const nextDestination = destinationCandidates[0] || null;
  const youtubeUrl = buildChannelUrl(channel);
  const mapUrl = channelId ? buildPublicMapUrl(channelId) : "/map";
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

  const trackVideoActivityEvent = useCallback(
    (
      eventType:
        | "video_saved_added"
        | "video_saved_removed"
        | "video_favorite_added"
        | "video_favorite_removed"
        | "video_watch_later_added"
        | "video_watch_later_removed",
      videoId: string,
      metadata: Record<string, unknown> = {}
    ) => {
      const normalizedVideoId = String(videoId || "").trim();
      if (!normalizedVideoId) return;
      const video = videoLookupById.get(normalizedVideoId);

      trackMapEvent(eventType, {
        youtubeVideoId: normalizedVideoId,
        countryCode: video?.country_code || selectedCountryCode || null,
        metadata: {
          video_title: video?.title || null,
          ...metadata,
        },
      });
    },
    [selectedCountryCode, trackMapEvent, videoLookupById]
  );

  const trackWatchTimeEvent = useCallback(
    (videoId: string | null | undefined, elapsedMs: number, reason: "paused" | "ended" | "switch" | "exit" | "pagehide" | "unmount" | "visibility_hidden") => {
      const normalizedVideoId = String(videoId || "").trim();
      if (!normalizedVideoId || elapsedMs < INTERNAL_WATCH_TIME_MIN_MS) return;

      const video = videoLookupById.get(normalizedVideoId);
      const watchSeconds = Math.round(elapsedMs / 1000);

      trackMapEvent("video_watch_time_logged", {
        youtubeVideoId: normalizedVideoId,
        countryCode: video?.country_code || selectedCountryCode || null,
        metadata: {
          video_title: video?.title || null,
          watch_seconds: watchSeconds,
          event_reason: reason,
        },
      });
    },
    [selectedCountryCode, trackMapEvent, videoLookupById]
  );

  useEffect(() => {
    if (!publicMapAnalyticsEnabled) return;

    const previous = previousVideoActivityRef.current;
    if (!previous) {
      previousVideoActivityRef.current = {
        savedIds: new Set(videoActivity.savedIds),
        featuredIds: new Set(videoActivity.featuredIds),
        watchStatusById: { ...videoActivity.watchStatusById },
      };
      return;
    }

    for (const videoId of videoActivity.savedIds) {
      if (!previous.savedIds.has(videoId)) {
        trackVideoActivityEvent("video_saved_added", videoId);
      }
    }
    for (const videoId of previous.savedIds) {
      if (!videoActivity.savedIds.has(videoId)) {
        trackVideoActivityEvent("video_saved_removed", videoId);
      }
    }

    for (const videoId of videoActivity.featuredIds) {
      if (!previous.featuredIds.has(videoId)) {
        trackVideoActivityEvent("video_favorite_added", videoId);
      }
    }
    for (const videoId of previous.featuredIds) {
      if (!videoActivity.featuredIds.has(videoId)) {
        trackVideoActivityEvent("video_favorite_removed", videoId);
      }
    }

    const watchStatusKeys = new Set<string>([
      ...Object.keys(previous.watchStatusById),
      ...Object.keys(videoActivity.watchStatusById),
    ]);
    for (const videoId of watchStatusKeys) {
      const previousStatus = previous.watchStatusById[videoId];
      const currentStatus = videoActivity.watchStatusById[videoId];
      if (previousStatus === currentStatus) continue;

      if (currentStatus === "watch_later" && previousStatus !== "watch_later") {
        trackVideoActivityEvent("video_watch_later_added", videoId, {
          previous_status: previousStatus || null,
        });
      } else if (previousStatus === "watch_later" && currentStatus !== "watch_later") {
        trackVideoActivityEvent("video_watch_later_removed", videoId, {
          current_status: currentStatus || null,
        });
      }
    }

    previousVideoActivityRef.current = {
      savedIds: new Set(videoActivity.savedIds),
      featuredIds: new Set(videoActivity.featuredIds),
      watchStatusById: { ...videoActivity.watchStatusById },
    };
  }, [
    publicMapAnalyticsEnabled,
    trackVideoActivityEvent,
    videoActivity.featuredIds,
    videoActivity.savedIds,
    videoActivity.watchStatusById,
  ]);

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
    const first = activityScopeVideos[0];
    if (!first?.country_code) return;
    selectCountry(String(first.country_code).toUpperCase());
  }

  function resolveCountryName(countryCode: string) {
    const normalized = String(countryCode || "").toUpperCase();
    if (!normalized) return "";
    return (
      resolvedFanVoteOptions.find((country) => country.country_code === normalized)?.country_name ||
      availablePollOptions.find((country) => country.country_code === normalized)?.country_name ||
      countryBuckets.find((country) => country.country_code === normalized)?.country_name ||
      items.find((video) => String(video.country_code || "").toUpperCase() === normalized)?.country_name ||
      normalized
    );
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

  function handleMapCountrySelect(countryCode: string | null, source: "polygon" | "cluster" | "country" = "country") {
    const normalized = countryCode ? String(countryCode).toUpperCase() : null;
    selectCountry(normalized);
    if (source === "cluster") {
      setMapVotePrompt(null);
      return;
    }
    if (!normalized || !canUseOpenFanVote) {
      setMapVotePrompt(null);
      return;
    }

    const countryName = resolveCountryName(normalized);
    if (pollState?.status === "live") {
      setMapVotePrompt({ status: "live_locked", countryCode: normalized, countryName });
      return;
    }

    if (fanVoteState && !fanVoteState.viewer_can_vote) {
      setMapVotePrompt({
        status: "cooldown",
        countryCode: normalized,
        countryName,
        remainingMs: fanVoteState.viewer_cooldown_remaining_ms || 0,
      });
      return;
    }

    setMapVoteScope("country");
    const option = resolvedFanVoteOptions.find((entry) => entry.country_code === normalized) || null;
    setMapVoteCity(option?.cities[0]?.city || "");
    setMapVoteOpen(false);
    setMapVoteError(null);
    setMapVotePrompt({
      status: "confirm",
      countryCode: normalized,
      countryName,
    });
  }

  const selectedVoteCountryOption = useMemo(() => {
    const promptCountryCode = mapVotePrompt?.countryCode;
    if (!promptCountryCode) return null;
    return resolvedFanVoteOptions.find((country) => country.country_code === promptCountryCode) || null;
  }, [resolvedFanVoteOptions, mapVotePrompt?.countryCode]);

  async function submitOpenFanVote() {
    if (!channelId || !mapVotePrompt || mapVotePrompt.status !== "confirm") return;
    const selectedCountryCode = mapVotePrompt.countryCode;
    const selectedOption = selectedVoteCountryOption;
    const hasCityOptions = Boolean(selectedOption && selectedOption.cities.length > 0);
    const voteScope = hasCityOptions ? mapVoteScope : "country";

    if (isDemoMode) {
      const nowIso = new Date().toISOString();
      const nextVoteAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const selectedCityValue = voteScope === "city" ? mapVoteCity : null;
      setFanVoteState((current) => {
        const base = current || DEMO_FAN_VOTE_SAMPLE;
        const baseCountries = base.country_rankings.length ? base.country_rankings : DEMO_FAN_VOTE_SAMPLE.country_rankings;
        const baseCities = base.city_rankings.length ? base.city_rankings : DEMO_FAN_VOTE_SAMPLE.city_rankings;
        const countryName = resolveCountryName(selectedCountryCode);

        const nextCountries = [...baseCountries];
        const countryIndex = nextCountries.findIndex((entry) => entry.country_code === selectedCountryCode);
        if (countryIndex >= 0) {
          nextCountries[countryIndex] = { ...nextCountries[countryIndex], votes: nextCountries[countryIndex].votes + 1 };
        } else {
          nextCountries.push({ country_code: selectedCountryCode, country_name: countryName, votes: 1 });
        }

        const nextCities = [...baseCities];
        if (selectedCityValue) {
          const cityIndex = nextCities.findIndex((entry) => entry.country_code === selectedCountryCode && entry.city === selectedCityValue);
          if (cityIndex >= 0) {
            nextCities[cityIndex] = { ...nextCities[cityIndex], votes: nextCities[cityIndex].votes + 1 };
          } else {
            nextCities.push({
              country_code: selectedCountryCode,
              country_name: countryName,
              city: selectedCityValue,
              votes: 1,
            });
          }
        }

        return {
          ...base,
          total_votes: base.total_votes + 1,
          country_rankings: nextCountries.sort((a, b) => b.votes - a.votes).slice(0, 24),
          city_rankings: nextCities.sort((a, b) => b.votes - a.votes).slice(0, 24),
          viewer_can_vote: false,
          viewer_last_voted_at: nowIso,
          viewer_next_vote_at: nextVoteAtIso,
          viewer_vote_country_code: selectedCountryCode,
          viewer_vote_city: selectedCityValue,
          viewer_cooldown_remaining_ms: 7 * 24 * 60 * 60 * 1000,
        };
      });
      setMapVoteOpen(false);
      setMapVoteError(null);
      setMapVotePrompt({
        status: "cooldown",
        countryCode: selectedCountryCode,
        countryName: mapVotePrompt.countryName,
        remainingMs: 7 * 24 * 60 * 60 * 1000,
      });
      return;
    }

    setMapVoteBusy(true);
    setMapVoteError(null);

    try {
      const response = await fetch("/api/map/fan-votes/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          countryCode: selectedCountryCode,
          voteScope,
          city: voteScope === "city" ? mapVoteCity : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { fanVotes?: MapFanVoteSummary; error?: string; nextVoteAt?: string | null }
        | null;

      if (!response.ok || !payload?.fanVotes) {
        if (response.status === 409) {
          setMapVoteOpen(false);
          setMapVotePrompt({
            status: "live_locked",
            countryCode: selectedCountryCode,
            countryName: mapVotePrompt.countryName,
          });
          return;
        }

        if (response.status === 429) {
          const remainingMs = getRemainingMsFromNextVoteAt(payload?.nextVoteAt || null);
          setFanVoteState((current) =>
            current
              ? {
                  ...current,
                  viewer_can_vote: false,
                  viewer_next_vote_at: payload?.nextVoteAt || current.viewer_next_vote_at,
                  viewer_cooldown_remaining_ms: remainingMs,
                  viewer_vote_country_code: current.viewer_vote_country_code || selectedCountryCode,
                }
              : current
          );
          setMapVoteOpen(false);
          setMapVotePrompt({
            status: "cooldown",
            countryCode: selectedCountryCode,
            countryName: mapVotePrompt.countryName,
            remainingMs,
          });
          return;
        }

        throw new Error(payload?.error || "No se pudo registrar tu voto.");
      }

      setFanVoteState(payload.fanVotes);
      setMapVoteOpen(false);
      setMapVoteError(null);
      setMapVotePrompt({
        status: "cooldown",
        countryCode: selectedCountryCode,
        countryName: mapVotePrompt.countryName,
        remainingMs: payload.fanVotes.viewer_cooldown_remaining_ms || 0,
      });
    } catch (error) {
      setMapVoteError(error instanceof Error ? error.message : "No se pudo registrar tu voto.");
    } finally {
      setMapVoteBusy(false);
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

  const openVideo = useCallback(
    (video: TravelVideoLocation) => {
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
    },
    [channelId, trackMapEvent]
  );

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
      if (!copyWithTextarea() && !(await copyTextToClipboard(shareUrl))) {
        throw new Error("Clipboard unavailable");
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

  const commitPlaybackElapsed = useCallback((videoId: string | null | undefined) => {
    const normalized = String(videoId || "").trim();
    const tracker = playbackTrackerRef.current;
    if (!normalized || tracker.videoId !== normalized || tracker.startedAtMs === null) return 0;

    const elapsed = Math.max(0, Date.now() - tracker.startedAtMs);
    tracker.elapsedMsById[normalized] = (tracker.elapsedMsById[normalized] || 0) + elapsed;
    tracker.startedAtMs = null;
    return elapsed;
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
          const switchedElapsedMs = commitPlaybackElapsed(tracker.videoId);
          trackWatchTimeEvent(tracker.videoId, switchedElapsedMs, "switch");
        }
        tracker.videoId = videoId;
        if (tracker.startedAtMs === null) tracker.startedAtMs = Date.now();
        videoActivity.markVideoStarted(videoId);
        return;
      }

      if (state === "paused") {
        const pausedElapsedMs = commitPlaybackElapsed(videoId);
        trackWatchTimeEvent(videoId, pausedElapsedMs, "paused");
        return;
      }

      const endedElapsedMs = commitPlaybackElapsed(videoId);
      if (suppressEndedForVideoIdRef.current === videoId) {
        suppressEndedForVideoIdRef.current = null;
        return;
      }
      trackWatchTimeEvent(videoId, endedElapsedMs, "ended");
      videoActivity.setVideoWatchStatus(videoId, "watched");
    },
    [commitPlaybackElapsed, trackWatchTimeEvent, videoActivity]
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const flushPlayback = (reason: "pagehide" | "visibility_hidden" | "unmount") => {
      const tracker = playbackTrackerRef.current;
      if (!tracker.videoId) return;
      const elapsedMs = commitPlaybackElapsed(tracker.videoId);
      trackWatchTimeEvent(tracker.videoId, elapsedMs, reason);
    };

    const handlePageHide = () => flushPlayback("pagehide");
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPlayback("visibility_hidden");
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushPlayback("unmount");
    };
  }, [commitPlaybackElapsed, trackWatchTimeEvent]);

  const requestVideoExit = useCallback(
    (action: () => void) => {
      const currentVideo = pinnedVideo;
      const videoId = String(currentVideo?.youtube_video_id || "").trim();
      if (!currentVideo || !videoId) {
        action();
        return;
      }

      const watchStatus = videoActivity.watchStatusById[videoId];
      const hasStarted = watchStatus === "not_finished" || videoActivity.seenIds.has(videoId) || videoActivity.openedIds.has(videoId);
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
    [getPlaybackElapsedMs, pinnedVideo, videoActivity.openedIds, videoActivity.seenIds, videoActivity.watchStatusById]
  );

  const requestPinnedVideoChange = useCallback(
    (video: TravelVideoLocation) => {
      if (pinnedVideo?.youtube_video_id === video.youtube_video_id) {
        setSelectedVideo(video);
        return;
      }
      requestVideoExit(() => setSelectedVideo(video));
    },
    [pinnedVideo?.youtube_video_id, requestVideoExit]
  );

  const requestOpenVideo = useCallback(
    (video: TravelVideoLocation) => {
      if (pinnedVideo?.youtube_video_id === video.youtube_video_id) {
        openVideo(video);
        return;
      }
      requestVideoExit(() => openVideo(video));
    },
    [openVideo, pinnedVideo?.youtube_video_id, requestVideoExit]
  );

  function confirmVideoExitComplete() {
    if (!videoExitPrompt) return;
    const exitElapsedMs = commitPlaybackElapsed(videoExitPrompt.videoId);
    trackWatchTimeEvent(videoExitPrompt.videoId, exitElapsedMs, "exit");
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
    const exitElapsedMs = commitPlaybackElapsed(videoExitPrompt.videoId);
    trackWatchTimeEvent(videoExitPrompt.videoId, exitElapsedMs, "exit");
    suppressEndedForVideoIdRef.current = null;
    videoActivity.setVideoWatchStatus(videoExitPrompt.videoId, "not_finished");
    if (!videoActivity.savedIds.has(videoExitPrompt.videoId)) {
      videoActivity.toggleVideoSaved(videoExitPrompt.videoId);
    }
    const nextAction = videoExitPrompt.action;
    setVideoExitPrompt(null);
    nextAction();
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
    fanVoteState,
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
    creatorPanelHref,
    showCreateMapCta,
    fanVoteViewerInteraction,
    desktopMapTab,
    quickActivityCounts: {
      watched: watchedVideos.length,
      incomplete: incompleteVideos.length,
      saved: savedVideos.length,
      featured: featuredVideos.length,
    },
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
    onUnifiedBack: () => {
      if (clusterExpanded) {
        issueGlobeCommand("collapse_cluster");
        return;
      }
      requestVideoExit(() => {
        setDesktopMapTab("all");
        goBackLocationFilter();
      });
    },
    showUnifiedBack: Boolean(clusterExpanded || selectedCountryCode || selectedCityName || desktopMapTab !== "all"),
    hoveredCountryPin,
    mapVotePrompt,
    setMapVotePrompt,
    mapVoteOpen,
    setMapVoteOpen,
    mapVoteScope,
    setMapVoteScope,
    mapVoteCity,
    setMapVoteCity,
    mapVoteBusy,
    mapVoteError,
    submitOpenFanVote,
    selectedVoteCountryOption,
    openVideo: requestOpenVideo,
    changePinnedVideo: requestPinnedVideoChange,
    closePinnedVideo: () => requestVideoExit(() => setSelectedVideo(null)),
    videoPlaybackCommand,
    onVideoPlaybackStateChange: handleVideoPlaybackStateChange,
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
          onPinnedVideoChange={(video) => (video ? requestOpenVideo(video) : requestVideoExit(() => setSelectedVideo(null)))}
          onCountrySelect={handleMapCountrySelect}
          onClusterExpandedChange={setClusterExpanded}
          onCountryHoverChange={setHoveredCountryPin}
          focusCountryCode={focusCountryCode}
          focusVideoId={focusVideoId}
          selectedCountryCode={selectedCountryCode}
          votedCountryCode={fanVoteState?.viewer_vote_country_code || null}
          watchedVideoIds={videoActivity.seenIds}
          videoWatchStatusById={videoActivity.watchStatusById}
          resolveSponsorNames={resolveVideoSponsorNames}
          isDemoMode={isDemoMode}
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
        onPinnedVideoChange={(video) => (video ? requestOpenVideo(video) : requestVideoExit(() => setSelectedVideo(null)))}
        onCountrySelect={handleMapCountrySelect}
        onClusterExpandedChange={setClusterExpanded}
        onCountryHoverChange={setHoveredCountryPin}
        focusCountryCode={focusCountryCode}
        focusVideoId={focusVideoId}
        selectedCountryCode={selectedCountryCode}
        votedCountryCode={fanVoteState?.viewer_vote_country_code || null}
        watchedVideoIds={videoActivity.seenIds}
        videoWatchStatusById={videoActivity.watchStatusById}
        resolveSponsorNames={resolveVideoSponsorNames}
        isDemoMode={isDemoMode}
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
        onClose={() => requestVideoExit(() => setSelectedVideo(null))}
        onChangeVideo={(video) => requestVideoExit(() => setSelectedVideo(video))}
      />

      {videoExitPrompt ? (
        <VideoExitPrompt
          title={videoExitPrompt.title}
          onComplete={confirmVideoExitComplete}
          onContinue={continueWatchingVideo}
          onWatchLater={watchLaterPendingVideoExit}
        />
      ) : null}
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

      <div className="pointer-events-none absolute inset-0 z-[620] hidden min-h-0 lg:grid lg:grid-cols-1">
        <main className="pointer-events-none relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <MapTopBar {...props} />

          <div
            data-map-scroll="true"
            className="pointer-events-auto grid min-h-0 grid-cols-1 gap-3 overflow-y-auto px-4 pb-4 lg:pointer-events-none lg:grid-cols-[minmax(180px,220px)_minmax(360px,1fr)_minmax(180px,220px)] lg:overflow-hidden xl:grid-cols-[minmax(210px,240px)_minmax(460px,1fr)_minmax(210px,240px)] xl:gap-3 xl:px-5 xl:pb-5 2xl:grid-cols-[minmax(230px,260px)_minmax(560px,1fr)_minmax(230px,260px)]"
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
    <div className="pointer-events-none absolute inset-0 z-[630] flex min-h-0 flex-col overflow-hidden bg-[#04080f]/35 lg:hidden">
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
  creatorPanelHref,
  canUseAdminPanels,
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
              {creatorPanelHref && canUseAdminPanels ? <MobileMenuButton icon={ChartBar} label="Panel" href={creatorPanelHref} prefetch={false} /> : null}
            </nav>

            <div className="mt-auto space-y-2">
              {youtubeUrl ? (
                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#e1543a] text-[12px] font-semibold text-white">
                  <ArrowSquareOut size={15} />
                  Abrir en YouTube
                </a>
              ) : null}
              <Link prefetch={false} href={mapUrl} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12px] font-medium text-[#dbe1e7]">
                <MapPin size={15} />
                Abrir mapa publico
              </Link>
              <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12px] font-medium text-[#dbe1e7]" onClick={copyShareUrl}>
                {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}
                {copyState === "copied" ? "Enlace copiado" : "Compartir"}
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
  prefetch = true,
}: {
  icon: Icon;
  label: string;
  href?: string;
  onClick?: () => void;
  count?: number;
  prefetch?: boolean;
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
      <Link prefetch={prefetch} href={href} className={className}>
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
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-4 text-[13px] font-medium text-[#f5f7fb]"
          onClick={() => setMobileTab("videos")}
        >
          Ver todos los videos
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
        {props.channelId ? (
          <FanVoteCard
            channelId={props.channelId}
            viewer={props.viewer}
            poll={props.pollState}
            fanVotes={props.fanVoteState}
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
    <div className={cn("grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]", cityCount > 0 ? "grid-cols-3" : "grid-cols-2", className)}>
      <OverviewMetric icon={GlobeHemisphereWest} label="Paises" value={resolvedSummary.total_countries} tone="red" />
      {cityCount > 0 ? <OverviewMetric icon={MapPin} label="Ciudades" value={cityCount} tone="red" /> : null}
      <OverviewMetric icon={Video} label="Videos" value={resolvedSummary.total_videos} tone="red" />
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
  isDemoMode,
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
        !isDemoMode ? (
          <button type="button" className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.055] text-[12px] font-medium text-[#f5f7fb]" onClick={copyShareUrl}>
            <LinkSimple size={14} />
            Compartir
          </button>
        ) : (
          <span />
        )
      )}
      {!isDemoMode ? (
        <button type="button" className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#e1543a] text-[12px] font-semibold text-white" onClick={copyShareUrl}>
          {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
          {copyState === "copied" ? "Copiado" : "Copiar link"}
        </button>
      ) : (
        <span />
      )}
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
  youtubeDataHealth,
  creatorPanelHref,
  showCreateMapCta,
  copyShareUrl,
  copyState,
  toggleViewerPreview,
  channel,
  canUseAdminPanels,
  canToggleViewerPreview,
  isPreviewingViewer,
  headerEyebrow,
}: MapShellProps) {
  const lastExtractionAt = channel.last_synced_at || youtubeDataHealth.latestRefreshedAt || null;

  return (
    <header className="pointer-events-auto z-[690] px-4 py-3 xl:px-5">
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
          <div className="hidden shrink-0 px-1 py-1 text-left sm:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8f98a3]">Última extracción</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[#d8dee6]">
              {lastExtractionAt ? formatIsoDateTime(lastExtractionAt) : "Sin dato"}
            </p>
            {youtubeDataHealth.staleVideos > 0 ? (
              <p className="text-[10px] leading-4 text-[#ffb7b3]">{youtubeDataHealth.staleVideos} sin refresh</p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {canUseAdminPanels && creatorPanelHref ? (
            <Button asChild type="button" size="sm" className="shrink-0 bg-[#c91f18] text-white hover:bg-[#e03128]">
              <Link prefetch={false} href={`${creatorPanelHref}&tab=ops&focus=missing-videos`}>
                <WarningCircle size={14} />
                Videos faltantes
              </Link>
            </Button>
          ) : null}
          {canUseAdminPanels && creatorPanelHref ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link prefetch={false} href={creatorPanelHref}>
                <GearSix size={14} />
                Panel
              </Link>
            </Button>
          ) : null}
          {canToggleViewerPreview ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={toggleViewerPreview}>
              {isPreviewingViewer ? "Creador" : "Viewer"}
            </Button>
          ) : null}
          <Button type="button" size="sm" className="shrink-0 bg-[#e1543a] hover:bg-[#ee6b49]" onClick={copyShareUrl}>
            {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
            {copyState === "copied" ? "Copiado" : "Compartir"}
          </Button>
          {showCreateMapCta ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href="/onboarding">
                <Plus size={14} />
                Crear mapa
              </Link>
            </Button>
          ) : null}
          <span className="hidden max-w-[150px] truncate text-[11px] text-[#9da5ae] 2xl:block">{channel.canonicalHandle ? `@${channel.canonicalHandle}` : headerEyebrow || "Mapa público"}</span>
        </div>
      </div>
    </header>
  );
}

function MapOverviewRail({
  channel,
  resolvedSummary,
  desktopMapTab,
  setDesktopMapTab,
  quickActivityCounts,
  cityCount,
  countryBuckets,
  selectedCountryCode,
  selectedCountryName,
  selectedCityName,
  selectedCityDisplayName,
  selectedCountryCityBuckets,
  selectedCountryVideos,
  selectedCityVideos,
  mapVideos,
  videoActivity,
  selectCountry,
  selectCity,
  onUnifiedBack,
  showUnifiedBack,
  videosRailRef,
}: MapShellProps) {
  const hasCountrySelection = Boolean(selectedCountryCode);
  const activeLocationCount = selectedCityName ? selectedCityVideos.length : selectedCountryVideos.length;
  const hasCityDrilldown = selectedCityName && selectedCityVideos.length > 0;
  const seenVideosByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const video of mapVideos) {
      const videoId = String(video.youtube_video_id || "").trim();
      const code = String(video.country_code || "").toUpperCase();
      if (!videoId || !code || !videoActivity.seenIds.has(videoId)) continue;
      map.set(code, (map.get(code) || 0) + 1);
    }
    return map;
  }, [mapVideos, videoActivity.seenIds]);
  const quickActivityRows = [
    [
      { id: "featured" as const, label: "Favoritos", value: quickActivityCounts.featured, icon: Star },
      { id: "saved" as const, label: "Por ver", value: quickActivityCounts.saved, icon: BookmarkSimple },
    ],
    [
      { id: "watched" as const, label: "Vistos", value: quickActivityCounts.watched, icon: Eye },
      { id: "incomplete" as const, label: "Incompletos", value: quickActivityCounts.incomplete, icon: Clock },
    ],
  ] satisfies Array<Array<{ id: DesktopMapTab; label: string; value: number; icon: Icon }>>;

  return (
    <aside ref={videosRailRef} className="pointer-events-auto order-2 min-h-0 lg:order-none lg:overflow-hidden">
      <Card className="tm-surface-strong flex min-h-[420px] flex-col gap-2 rounded-xl border-white/10 pt-2 lg:h-full">
        <CardHeader className="px-3 pb-2 pt-1">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ChannelAvatar channel={channel} size="sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f98a3]">Travel Your Map</p>
                <CardTitle className="truncate text-[15px] font-semibold text-[#f5f7fb]">{getCreatorDisplayName(channel.channel_name)}</CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
          <div className={cn("grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]", cityCount > 0 ? "grid-cols-3" : "grid-cols-2")}>
            <OverviewMetric icon={GlobeHemisphereWest} label="Paises" value={resolvedSummary.total_countries} tone="red" />
            {cityCount > 0 ? <OverviewMetric icon={MapPin} label="Ciudades" value={cityCount} tone="red" /> : null}
            <OverviewMetric icon={Video} label="Videos" value={resolvedSummary.total_videos} tone="red" />
          </div>

          <div className="mt-3 space-y-2">
            {quickActivityRows.map((row) => (
              <div key={row.map((filter) => filter.id).join("-")} className="grid grid-cols-2 gap-2">
                {row.map((filter) => {
                  const isActive = desktopMapTab === filter.id;
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setDesktopMapTab((current) => (current === filter.id ? "all" : filter.id))}
                      className={cn(
                        "tym-nav-pill h-[68px] min-h-[68px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center",
                        isActive
                          ? "border-[#ff3b30] bg-[rgba(255,59,48,0.12)] text-[#ff3b30]"
                          : "border-white/10 bg-[#07101a]/78 text-[#d8dee6]"
                      )}
                    >
                      <span className="flex w-full justify-center">
                        <Icon size={16} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                      </span>
                      <span className="flex min-w-0 items-center justify-center text-[10px] uppercase leading-none tracking-[0.08em]">
                        <span className="truncate">{filter.label}</span>
                      </span>
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#ff3b30] px-1.5 font-mono text-[10px] font-semibold leading-none text-white">
                        {formatNumber(filter.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-[13px] font-semibold text-[#f5f7fb]">{hasCountrySelection ? "Filtro activo" : "Paises"}</h2>
              {showUnifiedBack ? (
                <button type="button" className={cn("tym-nav-pill min-h-8", MAP_BACK_BUTTON_CLASS)} onClick={onUnifiedBack}>
                  Volver
                </button>
              ) : null}
            </div>
            <Badge variant="outline" className="bg-white/[0.04] text-[11px] text-[#c6cdd5]">
              {hasCountrySelection ? activeLocationCount : countryBuckets.length}
            </Badge>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1" data-map-scroll="true">
            <div className="space-y-3 pr-2">
              {hasCountrySelection ? (
                <>
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <CountryCodeMark code={selectedCountryCode} compact />
                        <p className="truncate text-[12px] font-semibold text-[#f4f7fb]">
                          {hasCityDrilldown ? `${selectedCountryName || selectedCountryCode} · ${selectedCityDisplayName}` : selectedCountryName || selectedCountryCode}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-5 shrink-0 rounded-full border-white/15 bg-black/20 px-2 text-[10px] text-[#d5dbe2]">
                        {activeLocationCount}
                      </Badge>
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
                  const seenCount = seenVideosByCountry.get(String(bucket.country_code || "").toUpperCase()) || 0;
                  const completionRatio = bucket.count > 0 ? Math.max(0, Math.min(1, seenCount / bucket.count)) : 0;
                  const completionPercent = Math.round(completionRatio * 100);
                  return (
                    <button
                      key={bucket.country_code}
                      type="button"
                      onClick={() => selectCountry(bucket.country_code)}
                      className={cn(
                        "relative w-full overflow-hidden rounded-lg border p-2 text-left transition",
                        isActive ? "border-[#ff3f38]/60 bg-[rgba(225, 84, 58,0.12)]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 bg-[rgba(225,84,58,0.34)]"
                        style={{ width: `${completionPercent}%` }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative z-10 flex min-w-0 items-center gap-2">
                          <CountryCodeMark code={bucket.country_code} compact />
                          <p className="truncate text-[12px] font-semibold text-[#f4f7fb]">{bucket.country_name}</p>
                        </div>
                        <Badge variant="outline" className="relative z-10 h-5 rounded-full border-white/15 bg-white/[0.04] px-2 text-[10px] leading-none text-[#d5dbe2]">
                          {bucket.count}
                        </Badge>
                      </div>
                      <div className="relative z-10 mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] text-[#9da5ae]">{bucket.cities.length > 0 ? `${bucket.cities.length} ciudad(es) detectadas` : "Sin ciudades detectadas"}</p>
                        <p className="shrink-0 text-[10px] text-[#ffd0cc]">{completionPercent}% visto</p>
                      </div>
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
  desktopMapTab,
  setDesktopMapTab,
  selectedCountryCode,
  selectedCountryName,
  windowFilter,
  setWindowFilter,
  fanVoteState,
  hoveredCountryPin,
  mapVotePrompt,
  setMapVotePrompt,
  mapVoteOpen,
  setMapVoteOpen,
  mapVoteScope,
  setMapVoteScope,
  mapVoteCity,
  setMapVoteCity,
  mapVoteBusy,
  mapVoteError,
  submitOpenFanVote,
  selectedVoteCountryOption,
  activeLocationVideos,
  activeVideo,
  pinnedVideo,
  videoActivity,
  closePinnedVideo,
  changePinnedVideo,
  videoPlaybackCommand,
  onVideoPlaybackStateChange,
  onYouTubeExternalOpen,
  goBackLocationFilter,
  onUnifiedBack,
  showUnifiedBack,
  issueGlobeCommand,
  rotationEnabled,
}: MapShellProps) {
  const cardCenterStyle = {
    "--map-card-center-top-clearance": MAP_CARD_CENTER_TOP_CLEARANCE,
    "--map-card-center-bottom-clearance": MAP_CARD_CENTER_BOTTOM_CLEARANCE,
  } as CSSProperties;
  const relatedCountryCode = String(pinnedVideo?.country_code || selectedCountryCode || "").toUpperCase();
  const suggestedVideos = activeLocationVideos.slice().sort(sortRecentVideos);
  const hoverPreviewVideo =
    activeVideo && (!pinnedVideo || activeVideo.youtube_video_id !== pinnedVideo.youtube_video_id) ? activeVideo : null;
  const canVoteByCountryCity = Boolean(selectedVoteCountryOption && selectedVoteCountryOption.cities.length > 0);
  const votePromptCountryName = mapVotePrompt?.countryName || hoveredCountryPin?.countryName || null;
  const votePromptCountryCode = mapVotePrompt?.countryCode || hoveredCountryPin?.countryCode || null;
  const mapVotePromptRemainingMs =
    mapVotePrompt?.status === "cooldown"
      ? Math.max(
          mapVotePrompt.remainingMs,
          getRemainingMsFromNextVoteAt(fanVoteState?.viewer_next_vote_at || null)
        )
      : 0;

  return (
    <section className="pointer-events-none relative order-1 min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:order-none lg:min-h-0">
      <div className="pointer-events-none absolute left-1/2 top-3 z-[660] w-[min(340px,calc(100vw-2rem))] -translate-x-1/2">
        <div className="pointer-events-auto grid w-full grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#07101a]/88 p-1.5 backdrop-blur-2xl">
          {([
            { id: "all" as const, label: "Todos" },
            { id: "365" as const, label: "365d" },
            { id: "90" as const, label: "90d" },
            { id: "30" as const, label: "30d" },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              className="tym-nav-pill min-h-7 min-w-0 px-1 text-[11px]"
              data-active={option.id === windowFilter ? "true" : "false"}
              onClick={() => setWindowFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
          {([
            { id: "featured" as const, label: "Favoritos", icon: Star },
            { id: "saved" as const, label: "Por ver", icon: BookmarkSimple },
            { id: "watched" as const, label: "Vistos", icon: Eye },
            { id: "incomplete" as const, label: "Incompletos", icon: Clock },
          ]).map((option) => {
            const Icon = option.icon;
            const active = desktopMapTab === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-label={option.label}
                title={option.label}
                className="tym-nav-pill min-h-7 min-w-0 px-1"
                data-active={active ? "true" : "false"}
                onClick={() => setDesktopMapTab((current) => (current === option.id ? "all" : option.id))}
              >
                <Icon size={13} weight={active ? "fill" : "regular"} />
              </button>
            );
          })}
        </div>
        {showUnifiedBack ? (
          <button
            type="button"
            onClick={onUnifiedBack}
            className={cn("tym-nav-pill pointer-events-auto absolute left-full top-1/2 ml-2 min-h-8 -translate-y-1/2 shrink-0", MAP_BACK_BUTTON_CLASS)}
          >
            Volver
          </button>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute right-3 top-[52%] z-[650] hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/86 backdrop-blur-2xl md:flex">
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

      {hoverPreviewVideo ? (
        <button
          type="button"
          onClick={() => changePinnedVideo(hoverPreviewVideo)}
          className="pointer-events-auto absolute left-1/2 top-16 z-[670] hidden w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/92 text-left shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition hover:border-[rgba(255,90,61,0.4)] lg:block"
          aria-label={`Abrir video: ${hoverPreviewVideo.country_name || hoverPreviewVideo.country_code || "destino"}`}
        >
          <div className="relative h-[140px] w-full overflow-hidden">
            {hoverPreviewVideo.thumbnail_url ? (
              <Image
                src={toCompactYouTubeThumbnail(hoverPreviewVideo.thumbnail_url) || hoverPreviewVideo.thumbnail_url}
                alt={hoverPreviewVideo.title}
                fill
                sizes="340px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-white/[0.06]" />
            )}
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.74))]" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="line-clamp-2 text-[12px] font-semibold leading-5 text-[#f5f7fb]">{hoverPreviewVideo.title}</p>
              <p className="mt-1 text-[10px] text-[#c7d0d9]">
                <CountryFlag code={hoverPreviewVideo.country_code} size={12} className="mr-1 align-[-1px]" />
                {formatPlace(hoverPreviewVideo)}
              </p>
            </div>
          </div>
        </button>
      ) : null}

      {hoveredCountryPin ? (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 z-[666] hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#07101a]/90 px-3 py-1.5 text-[11px] text-[#e8edf3] backdrop-blur-2xl lg:flex lg:items-center lg:gap-2",
            hoverPreviewVideo ? "top-[13.5rem]" : "top-16"
          )}
        >
          <CountryFlag code={hoveredCountryPin.countryCode} size={14} className="align-[-1px]" />
          <span className="max-w-[220px] truncate">{hoveredCountryPin.countryName}</span>
        </div>
      ) : null}

      <div
        style={cardCenterStyle}
        className="pointer-events-none absolute inset-x-0 top-[var(--map-card-center-top-clearance)] bottom-[var(--map-card-center-bottom-clearance)] z-[740] hidden px-4 lg:block xl:px-5"
      >
        <div className="flex h-full items-center justify-center">
          <div className="pointer-events-none w-full max-w-[480px]">
            <DesktopVideoMapCard
              videos={activeLocationVideos}
              currentVideo={pinnedVideo}
              activity={videoActivity}
              onOpenInYouTube={onYouTubeExternalOpen}
              onClose={closePinnedVideo}
              onChangeVideo={changePinnedVideo}
              openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Abierto en YouTube" : "Abrir en YouTube"}
              playbackCommand={videoPlaybackCommand}
              onPlaybackStateChange={(state) => {
                if (!pinnedVideo) return;
                onVideoPlaybackStateChange(pinnedVideo, state);
              }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[680] px-2 pb-2 md:px-3 md:pb-3 lg:px-4 lg:pb-4">
        {mapVotePrompt ? (
          <div className="pointer-events-none mx-auto mb-2 w-full max-w-[760px]">
            <div className="pointer-events-auto mx-auto w-[min(420px,calc(100vw-3rem))] rounded-xl border border-white/10 bg-[#07101a]/92 p-3 text-[#e8edf3] shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              {mapVotePrompt.status === "confirm" ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-[12px] leading-5">
                    ¿Quieres votar por{" "}
                    <span className="font-semibold text-[#f5f7fb]">
                      <CountryFlag code={mapVotePrompt.countryCode} size={14} className="mr-1 align-[-1px]" />
                      {mapVotePrompt.countryName}
                    </span>
                    ?
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(90,216,140,0.45)] bg-[rgba(90,216,140,0.16)] text-[#d6ffe2] transition hover:bg-[rgba(90,216,140,0.25)]"
                      onClick={() => setMapVoteOpen(true)}
                      aria-label="Confirmar voto"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,90,80,0.45)] bg-[rgba(255,90,80,0.12)] text-[#ffd3cf] transition hover:bg-[rgba(255,90,80,0.2)]"
                      onClick={() => setMapVotePrompt(null)}
                      aria-label="Cancelar voto"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              ) : mapVotePrompt.status === "cooldown" ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-[12px] leading-5 text-[#ffd7d2]">
                    Ya votaste esta semana para <CountryFlag code={mapVotePrompt.countryCode} size={14} className="mr-1 align-[-1px]" /> {mapVotePrompt.countryName}.
                    <span className="block">
                      Podrás votar de nuevo en{" "}
                      <span className="font-semibold text-[#ffd7d2]">{formatRemainingCountdown(mapVotePromptRemainingMs)}</span>.
                    </span>
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-[#dbe1e7] transition hover:bg-white/[0.12]"
                    onClick={() => setMapVotePrompt(null)}
                    aria-label="Cerrar aviso"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-[12px] leading-5 text-[#ffd7d2]">
                    Hay una votación live activa para <CountryFlag code={mapVotePrompt.countryCode} size={14} className="mr-1 align-[-1px]" /> {mapVotePrompt.countryName}. Vota desde el panel de Fan Vote.
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-[#dbe1e7] transition hover:bg-white/[0.12]"
                    onClick={() => setMapVotePrompt(null)}
                    aria-label="Cerrar aviso"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
        <SuggestedDestinations
          videos={suggestedVideos}
          activeTab={desktopMapTab}
          onClearFilter={onUnifiedBack}
          showBackButton={showUnifiedBack}
          relatedCountryCode={relatedCountryCode || null}
          relatedCountryName={pinnedVideo?.country_name || selectedCountryName}
          seenIds={videoActivity.seenIds}
          onOpenVideo={changePinnedVideo}
        />
      </div>

      <Dialog open={mapVoteOpen} onOpenChange={setMapVoteOpen}>
        <DialogContent className="tm-surface-strong max-w-[min(620px,calc(100%-1.5rem))] justify-items-center border-white/10 bg-[#050a12]/96 text-center text-[#f1f1f1]">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-[#f5f7fb]">
              Votar destino: {votePromptCountryCode ? <CountryFlag code={votePromptCountryCode} size={14} className="mr-1 align-[-1px]" /> : null}
              {votePromptCountryName || "País"}
            </DialogTitle>
            <DialogDescription className="text-[#aab2bc]">
              Decide si quieres votar el país completo o una ciudad específica.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full max-w-md space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMapVoteScope("country")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] transition-colors",
                  mapVoteScope === "country"
                    ? "border-[rgba(255,90,61,0.34)] bg-[rgba(255,90,61,0.14)] text-[#f1f1f1]"
                    : "border-white/10 bg-white/[0.03] text-[#aab2bc]"
                )}
              >
                País completo
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canVoteByCountryCity) return;
                  setMapVoteScope("city");
                  setMapVoteCity((current) => current || selectedVoteCountryOption?.cities[0]?.city || "");
                }}
                disabled={!canVoteByCountryCity}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                  mapVoteScope === "city"
                    ? "border-[rgba(255,90,61,0.34)] bg-[rgba(255,90,61,0.14)] text-[#f1f1f1]"
                    : "border-white/10 bg-white/[0.03] text-[#aab2bc]"
                )}
              >
                Ciudad específica
              </button>
            </div>

            {mapVoteScope === "city" ? (
              canVoteByCountryCity ? (
                <div className="space-y-2">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#8f98a3]">Ciudades disponibles</p>
                  <select
                    aria-label="Elegir ciudad recomendada"
                    value={mapVoteCity}
                    onChange={(event) => setMapVoteCity(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#07101a] px-3 text-center text-[13px] text-[#f1f1f1] outline-none transition focus:border-[rgba(255,90,61,0.55)] focus:ring-2 focus:ring-[rgba(255,90,61,0.18)]"
                  >
                    {selectedVoteCountryOption?.cities.map((entry) => (
                      <option key={entry.city} value={entry.city} className="bg-[#07101a] text-[#f1f1f1]">
                        {entry.city}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[12px] text-[#aab2bc]">
                  Este país no tiene ciudades cargadas todavía. Se votará el país completo.
                </p>
              )
            ) : null}

            {mapVoteError ? <p className="text-[12px] text-[#ff9d9d]">{mapVoteError}</p> : null}

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => void submitOpenFanVote()}
                disabled={mapVoteBusy || !votePromptCountryCode || (mapVoteScope === "city" && canVoteByCountryCity && !mapVoteCity)}
                className="bg-[#e1543a] hover:bg-[#ee6b49]"
              >
                {mapVoteBusy ? "Registrando..." : "Confirmar voto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MapRightRail({
  channelId,
  viewer,
  pollState,
  fanVoteState,
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
  fanVoteViewerInteraction,
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
  const hasFanVoteContent = Boolean(
    hasLivePoll ||
      (pollState?.total_votes || 0) > 0 ||
      (fanVoteState?.total_votes || 0) > 0
  );

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

      {hasFanVoteContent || viewer.isOwner ? (
        <div ref={votesRailRef} className="relative">
          {channelId ? (
            <FanVoteCard
              channelId={channelId}
              viewer={viewer}
              poll={pollState}
              fanVotes={fanVoteState}
              availableOptions={availablePollOptions}
              isDemoMode={isDemoMode}
              viewerInteraction={fanVoteViewerInteraction}
              onPollChange={setPollState}
            />
          ) : (
            <FanVoteSummary candidates={destinationCandidates} onSelect={selectCountry} />
          )}
        </div>
      ) : (
        <Card className="tm-surface-strong rounded-xl border-white/10">
          <CardHeader className="px-3 pb-2 pt-3">
            <CardTitle className="text-[14px] font-semibold text-[#f5f7fb]">Fan Vote</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <p className="text-[12px] text-[#9da5ae]">Fan Vote cerrado.</p>
          </CardContent>
        </Card>
      )}

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
      <CardHeader className="flex-row items-center justify-center px-4 pb-2 pt-4">
        <CardTitle className="text-center text-[16px] font-semibold text-[#f5f7fb]">Fan vote activo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {candidates.slice(0, 3).map((candidate, index) => (
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
  activeTab,
  onClearFilter,
  showBackButton,
  relatedCountryCode,
  relatedCountryName,
  seenIds,
  onOpenVideo,
}: {
  videos: TravelVideoLocation[];
  activeTab: DesktopMapTab;
  onClearFilter: () => void;
  showBackButton: boolean;
  relatedCountryCode: string | null;
  relatedCountryName: string | null;
  seenIds: Set<string>;
  onOpenVideo: (video: TravelVideoLocation) => void;
}) {
  const visibleVideos = videos;
  const railRef = useRef<HTMLDivElement | null>(null);
  const suggestedCopyByTab: Record<
    DesktopMapTab,
    { title: string; titleWithCountry: (country: string) => string; emptyTitle: string; emptyBody: string }
  > = {
    all: {
      title: "Ultimos videos del canal",
      titleWithCountry: (country) => `Videos relacionados en ${country}`,
      emptyTitle: "Sin videos para mostrar",
      emptyBody: "Ajusta los filtros de tiempo o selecciona otro pais para ver recomendaciones.",
    },
    watched: {
      title: "Videos vistos",
      titleWithCountry: (country) => `Videos vistos en ${country}`,
      emptyTitle: "Todavia no hay videos vistos",
      emptyBody: "Reproduce o abre videos en YouTube para que aparezcan aqui.",
    },
    opened: {
      title: "Videos abiertos",
      titleWithCountry: (country) => `Videos abiertos en ${country}`,
      emptyTitle: "Todavia no hay videos abiertos",
      emptyBody: "Abre videos en YouTube para ir armando esta lista.",
    },
    saved: {
      title: "Videos por ver",
      titleWithCountry: (country) => `Videos por ver en ${country}`,
      emptyTitle: "Todavia no guardaste videos",
      emptyBody: "Usa el icono de marcador en cada video para guardarlo y verlo luego.",
    },
    featured: {
      title: "Videos favoritos",
      titleWithCountry: (country) => `Favoritos en ${country}`,
      emptyTitle: "Todavia no tienes favoritos",
      emptyBody: "Marca videos con la estrella para destacarlos como favoritos aqui.",
    },
    watch_later: {
      title: "Videos para ver mas tarde",
      titleWithCountry: (country) => `Para ver mas tarde en ${country}`,
      emptyTitle: "Sin videos para ver mas tarde",
      emptyBody: "Marca videos como SIN INICIAR para enviarlos a esta seccion.",
    },
    incomplete: {
      title: "Videos incompletos",
      titleWithCountry: (country) => `Incompletos en ${country}`,
      emptyTitle: "Sin videos incompletos",
      emptyBody: "Marca videos como POR TERMINAR para retomarlos despues.",
    },
  };
  const selectedCopy = suggestedCopyByTab[activeTab];
  const headerTitle =
    relatedCountryCode && relatedCountryName
      ? selectedCopy.titleWithCountry(relatedCountryName)
      : relatedCountryCode
        ? selectedCopy.titleWithCountry(relatedCountryCode)
        : selectedCopy.title;

  function scrollRail(direction: -1 | 1) {
    const node = railRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(240, node.clientWidth * 0.72), behavior: "smooth" });
  }

  return (
    <div className="pointer-events-auto mx-auto hidden w-full max-w-[760px] rounded-xl border border-white/10 bg-[#07101a]/86 p-2 backdrop-blur-2xl md:block xl:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 xl:mb-3">
        <div className="min-w-0">
          <h2 className="truncate text-[12px] font-semibold text-[#f5f7fb] xl:text-[14px]">{headerTitle}</h2>
          <p className="mt-0.5 text-[10px] text-[#8f98a3]">Desplaza horizontalmente para ver mas opciones.</p>
        </div>
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button type="button" onClick={onClearFilter} className={cn("tym-nav-pill", MAP_BACK_BUTTON_CLASS, "h-7 px-3 text-[11px]")}>
              Volver
            </button>
          ) : null}
          <Badge variant="outline" className="h-7 shrink-0 rounded-full border-white/15 bg-white/[0.05] px-3 text-[11px] font-medium text-[#d8dee6]">
            {videos.length}
          </Badge>
          <div className={cn("hidden items-center gap-1 md:flex", visibleVideos.length === 0 && "opacity-40")}>
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.08]"
              aria-label="Videos relacionados anteriores"
              disabled={visibleVideos.length === 0}
            >
              <CaretLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#d8dee6] transition hover:bg-white/[0.08]"
              aria-label="Videos relacionados siguientes"
              disabled={visibleVideos.length === 0}
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {visibleVideos.length > 0 ? (
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
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] px-3 py-3">
          <p className="text-[12px] font-semibold text-[#f5f7fb]">{selectedCopy.emptyTitle}</p>
          <p className="mt-1 text-[11px] leading-4 text-[#9da5ae]">{selectedCopy.emptyBody}</p>
        </div>
      )}
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
    const websiteUrl = normalizeExternalSponsorUrl(String(formData.get("website_url") || "").trim());
    if (String(formData.get("website_url") || "").trim() && !websiteUrl) {
      setError("La web o landing no es valida.");
      return;
    }

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
          websiteUrl,
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
                <Input name="website_url" maxLength={240} placeholder="www.ejemplo.com o https://..." className="border-white/10 bg-white/[0.04] text-[#f5f7fb] placeholder:text-[#7e8792]" />
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
  const effectiveSponsors = isDemoMode && sponsors.length === 0 ? DEMO_SPONSOR_FALLBACK : sponsors;
  const [startIndex, setStartIndex] = useState(0);
  const [managerOpen, setManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inquiries, setInquiries] = useState<SponsorInquiryRecord[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);
  const maxStartIndex = Math.max(0, effectiveSponsors.length - 3);
  const clampedStart = Math.min(startIndex, maxStartIndex);
  const visibleSponsors = useMemo(() => effectiveSponsors.slice(clampedStart, clampedStart + 3), [clampedStart, effectiveSponsors]);
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
            {effectiveSponsors.length > 0 ? (
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

function OverviewMetric({ icon: Icon, label, value, tone }: { icon: Icon; label: string; value: number; tone: "white" | "red" }) {
  const colors = {
    white: "text-[#f5f7fb]",
    red: "text-[#ff5a52]",
  };

  return (
    <div className="border-r border-white/10 px-3 py-2.5 last:border-r-0">
      <Icon size={20} weight="fill" className="mx-auto mb-1 text-[#ff5a52]" />
      <p className={cn("text-center font-mono text-[20px] font-semibold leading-6", colors[tone])}>{formatExactNumber(value)}</p>
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
    <span className={cn("flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white text-[#07101a] font-bold", compact ? "h-7 w-7" : "h-11 w-11")}>
      <CountryFlag code={code} size={compact ? 18 : 28} className="rounded-[3px]" />
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

function VideoExitPrompt({
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
          Detectamos más de 2 minutos de reproducción. Confirma si ya lo completaste o sigue viéndolo sin salir.
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
          VER MAS ADELANTE
        </button>
      </div>
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
    const city = getVideoCityLabel(video);
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
  return [getVideoCityLabel(video), video.country_name || video.country_code].filter(Boolean).join(", ") || "Ubicacion mapeada";
}

function formatCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "TM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return code || "TM";
}

function getVideoCityKey(video: TravelVideoLocation) {
  return getVideoCityLabel(video) || "";
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

function getRemainingMsFromNextVoteAt(nextVoteAt: string | null) {
  if (!nextVoteAt) return 0;
  const nextMs = new Date(nextVoteAt).getTime();
  if (!Number.isFinite(nextMs)) return 0;
  return Math.max(0, nextMs - Date.now());
}

function formatRemainingCountdown(remainingMs: number) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "menos de 1 min";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.max(1, Math.floor((totalSeconds % 3600) / 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatExactNumber(value: number) {
  if (!value) return "0";
  return Number(value).toLocaleString("en-US");
}

function getCreatorDisplayName(channelName: string) {
  return (
    String(channelName || "")
      .split("·")
      .map((part) => part.trim())
      .find(Boolean) || channelName
  );
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
