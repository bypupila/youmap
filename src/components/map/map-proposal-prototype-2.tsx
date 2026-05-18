"use client";

import Image from "next/image";
import {
  ArrowsOutSimple,
  BookmarkSimple,
  CaretDown,
  CheckCircle,
  Clock,
  Compass,
  CopySimple,
  Eye,
  Flag,
  GlobeHemisphereWest,
  Heart,
  House,
  List,
  MagnifyingGlass,
  MapPin,
  Play,
  SquaresFour,
  Star,
  Users,
  UsersThree,
  Video,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TravelGlobe } from "@/components/travel-globe";
import { DesktopVideoMapCard } from "@/components/map/desktop-video-map-card";
import { useLocalVideoActivity } from "@/components/map/video-activity";
import { VideoSelectionSheet } from "@/components/map/video-selection-sheet";

type ContentFilterWindow = "all" | "365" | "90" | "30";
type ActivityFilter = "all" | "favorites" | "saved" | "watched" | "incomplete";
type LocalVotePrompt = {
  countryCode: string;
  countryName: string;
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

const ACTIVITY_FILTER_OPTIONS: Array<{ id: ActivityFilter; label: string; Icon: typeof Star }> = [
  { id: "all", label: "Todos", Icon: SquaresFour },
  { id: "favorites", label: "Favoritos", Icon: Star },
  { id: "saved", label: "Guardados", Icon: BookmarkSimple },
  { id: "watched", label: "Vistos", Icon: CheckCircle },
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

const PLAYLISTS = [
  { 
    title: "Patagonia", 
    count: 18, 
    code: "CL", 
    image: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=150&h=150&q=80" 
  },
  { 
    title: "Europa en Van", 
    count: 14, 
    code: "IT", 
    image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=150&h=150&q=80" 
  },
  { 
    title: "Asia Secreta", 
    count: 9, 
    code: "JP", 
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=150&h=150&q=80" 
  },
  { 
    title: "Roadtrips", 
    count: 11, 
    code: "US", 
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=150&h=150&q=80" 
  },
];

const SUGGESTED_VIDEOS = [
  {
    id: "dolomitas",
    title: "Amanecer en los Dolomitas",
    location: "Italia",
    creator: "Pau de Viaje",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    live: true,
    views: "342",
    duration: "24:18"
  },
  {
    id: "islandia",
    title: "Roadtrip por Islandia",
    location: "Islandia",
    creator: "Luisito Comunica",
    creatorAvatar: "/creators/luisito-comunica.png",
    thumbnail: "https://images.unsplash.com/photo-1504893524553-ac55fce698be?auto=format&fit=crop&w=400&q=80",
    live: false,
    duration: "24:18"
  },
  {
    id: "japon",
    title: "Explorando Japón",
    location: "Japón",
    creator: "Alan x el Mundo",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80",
    thumbnail: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80",
    live: false,
    duration: "19:36"
  },
  {
    id: "bali",
    title: "Aventura en Bali",
    location: "Indonesia",
    creator: "Viajando con Vero",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80",
    thumbnail: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80",
    live: false,
    duration: "16:42"
  },
  {
    id: "tanzania",
    title: "Safari en Tanzania",
    location: "Tanzania",
    creator: "Pau de Viaje",
    creatorAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=80&h=80&q=80",
    thumbnail: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80",
    live: false,
    duration: "22:10"
  }
];

const STATIC_MARKERS = [
  {
    id: "marker-na",
    x: 23,
    y: 35,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    badge: 12,
    badgeColor: "bg-[#ff5a3d]",
    borderColor: "border-[#6be596]",
    lat: 38,
    lng: -98
  },
  {
    id: "marker-sa",
    x: 31,
    y: 71,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    badge: 7,
    badgeColor: "bg-[#ff5a3d]",
    borderColor: "border-[#ff5a3d]",
    lat: -38,
    lng: -72
  },
  {
    id: "marker-iceland",
    x: 44,
    y: 20,
    isGlowDot: true,
    lat: 64,
    lng: -20
  },
  {
    id: "marker-eu",
    x: 52,
    y: 28,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    badge: 8,
    badgeColor: "bg-[#ff5a3d]",
    borderColor: "border-white/70",
    lat: 47,
    lng: 12
  },
  {
    id: "marker-as",
    x: 64,
    y: 24,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    badge: 6,
    badgeColor: "bg-[#8b6cff]",
    borderColor: "border-white/70",
    lat: 53,
    lng: 70
  },
  {
    id: "marker-af",
    x: 55.5,
    y: 56.6,
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80",
    isGreenDotBadge: true,
    borderColor: "border-[#6be596]",
    lat: -12,
    lng: 20
  },
  {
    id: "marker-au",
    x: 84.1,
    y: 65.5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
    isGreenDotBadge: true,
    borderColor: "border-[#6be596]",
    lat: -28,
    lng: 130
  }
];

export function MapProposalPrototype2({ channel, videoLocations }: MapProposalPrototype2Props) {
  const [filter, setFilter] = useState<ContentFilterWindow>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState("Explorar");
  const [zoom, setZoom] = useState(1);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

  // TravelGlobe interactive state controls
  const [globeRotationEnabled, setGlobeRotationEnabled] = useState(true);
  const [globeCommand, setGlobeCommand] = useState<{ id: number; action: "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation" | "collapse_cluster" } | null>(null);
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const [hoveredCountryPin, setHoveredCountryPin] = useState<{ countryCode: string; countryName: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);
  const [pinnedVideo, setPinnedVideo] = useState<TravelVideoLocation | null>(null);
  const [isDesktopVideoCard, setIsDesktopVideoCard] = useState(false);
  const videoActivity = useLocalVideoActivity();

  // States for interactive simulations
  const [notice, setNotice] = useState("Prototipo Premium /map-proposal-2. Presiona elementos para simular interacción.");
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localFanVotes, setLocalFanVotes] = useState<Record<string, number>>({});
  const [votePrompt, setVotePrompt] = useState<LocalVotePrompt | null>(null);
  const [votedCountryCode, setVotedCountryCode] = useState<string | null>(null);
  const sidebarCountries = useMemo<SidebarCountryItem[]>(() => {
    const bucket = new Map<string, SidebarCountryItem>();
    for (const video of videoLocations) {
      const code = String(video.country_code || "").toUpperCase().trim();
      const name = String(video.country_name || "").trim();
      if (!code || !name) continue;
      const current = bucket.get(code);
      if (current) {
        current.count += 1;
      } else {
        bucket.set(code, { code, name, count: 1, watchedCount: 0, progress: 0 });
      }
    }
    for (const video of videoLocations) {
      const code = String(video.country_code || "").toUpperCase().trim();
      const id = String(video.youtube_video_id || "").trim();
      if (!code || !id || !videoActivity.seenIds.has(id)) continue;
      const current = bucket.get(code);
      if (!current) continue;
      current.watchedCount += 1;
    }
    for (const item of bucket.values()) {
      item.progress = item.count > 0 ? Math.min(1, item.watchedCount / item.count) : 0;
    }
    return Array.from(bucket.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      ;
  }, [videoActivity.seenIds, videoLocations]);
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

    if (activityFilter === "all") return dateFiltered;
    return dateFiltered.filter((video) => {
      const id = String(video.youtube_video_id || "");
      if (activityFilter === "favorites") return videoActivity.featuredIds.has(id);
      if (activityFilter === "saved") return videoActivity.savedIds.has(id);
      if (activityFilter === "watched") return videoActivity.watchStatusById[id] === "watched" || videoActivity.seenIds.has(id);
      return videoActivity.watchStatusById[id] === "not_finished";
    });
  }, [activityFilter, filter, videoActivity.featuredIds, videoActivity.savedIds, videoActivity.seenIds, videoActivity.watchStatusById, videoLocations]);

  const dateFilterLabel = useMemo(() => {
    if (filter === "365") return "365 Días";
    if (filter === "90") return "90 Días";
    if (filter === "30") return "30 Días";
    return "Todos";
  }, [filter]);
  const activityFilterOption = useMemo(
    () => ACTIVITY_FILTER_OPTIONS.find((option) => option.id === activityFilter) || ACTIVITY_FILTER_OPTIONS[0],
    [activityFilter]
  );
  const ActiveActivityIcon = activityFilterOption.Icon;
  const voteCandidates = useMemo(() => {
    return sidebarCountries
      .map((country) => ({
        code: country.code,
        name: country.name,
        count: country.count,
        votes: localFanVotes[country.code] || 0,
      }))
      .sort((a, b) => b.votes - a.votes || b.count - a.count || a.name.localeCompare(b.name))
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
      const wasWatched = videoActivity.watchStatusById[id] === "watched" || videoActivity.seenIds.has(id) || videoActivity.openedIds.has(id);
      if (wasWatched) watchedSeconds += Number(video.duration_seconds || 0);
    }

    const watchedCountryCodes = new Set(
      videoLocations
        .filter((video) => {
          const id = String(video.youtube_video_id || "");
          return videoActivity.watchStatusById[id] === "watched" || videoActivity.seenIds.has(id) || videoActivity.openedIds.has(id);
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
  }, [videoActivity.openedIds, videoActivity.seenIds, videoActivity.watchStatusById, videoLocations]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopVideoCard(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  function flash(message: string) {
    setNotice(message);
  }

  function openVotePrompt(countryCode: string | null) {
    const normalized = String(countryCode || "").toUpperCase();
    if (!normalized) return;
    const country = sidebarCountries.find((item) => item.code === normalized);
    setVotePrompt({
      countryCode: normalized,
      countryName: country?.name || normalized,
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
    flash(`Voto registrado para ${countryCodeToFlag(normalized)} ${sidebarCountries.find((item) => item.code === normalized)?.name || normalized}.`);
  }

  function openMapVideo(video: TravelVideoLocation) {
    setPinnedVideo(video);
    setSelectedCountryCode(String(video.country_code || "").toUpperCase() || null);
    videoActivity.markVideoOpened(video.youtube_video_id);
    flash(`Video abierto: "${video.title}"`);
  }

  function changeMapVideo(video: TravelVideoLocation) {
    setPinnedVideo(video);
    setSelectedCountryCode(String(video.country_code || "").toUpperCase() || null);
    videoActivity.markVideoStarted(video.youtube_video_id);
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#03060a] text-[#f5f7fb] font-sans antialiased">
      {/* Background glowing effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,90,61,0.08),transparent_35%),linear-gradient(180deg,#04090f,#030508_60%,#010204)] pointer-events-none" />
      
      <div className={cn(
        "relative grid h-screen overflow-hidden grid-cols-1",
        !isMapFullscreen && "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_340px] 3xl:grid-cols-[260px_minmax(0,1fr)_360px]"
      )}>
        
        {/* Left Sidebar */}
        {!isMapFullscreen ? (
          <ProposalSidebar2
            countries={sidebarCountries}
            activeItem={activeSidebarItem}
            setActiveItem={(item) => {
              setActiveSidebarItem(item);
              flash(`Sección activa: ${item}`);
            }}
            onOpenMenu={() => setMenuOpen(true)}
            onSelectCountry={(countryCode, countryName) => {
              setSelectedCountryCode(countryCode);
              flash(`País seleccionado: ${countryName}`);
            }}
          />
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
            onToggleViewer={() => flash("Vista Viewer activada.")}
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
                interactive={true}
                showControls={false}
                showSponsorBanner={false}
                minimalOverlay
                maxVisibleVideos={4}
                pointMode="video"
                showSummaryCard={false}
                showPointPanel={!isMapFullscreen}
                pointPanelClassName="left-1/2 top-4 w-[340px] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl"
                selectedCountryCode={selectedCountryCode}
                votedCountryCode={votedCountryCode}
                watchedVideoIds={videoActivity.seenIds}
                videoWatchStatusById={videoActivity.watchStatusById}
                onActiveVideoChange={setActiveVideo}
                onPinnedVideoChange={(video) => {
                  if (video) {
                    openMapVideo(video);
                  } else {
                    setPinnedVideo(null);
                  }
                }}
                onCountrySelect={(countryCode) => {
                  const normalizedCountryCode = String(countryCode || "").toUpperCase() || null;
                  setSelectedCountryCode(normalizedCountryCode);
                  openVotePrompt(normalizedCountryCode);
                  flash(`País seleccionado en el globo: ${countryCode}`);
                }}
                onClusterExpandedChange={setClusterExpanded}
                onCountryHoverChange={setHoveredCountryPin}
                command={globeCommand}
                rotationEnabled={globeRotationEnabled}
                onRotationChange={setGlobeRotationEnabled}
              />

              {!isMapFullscreen ? (
                <div className="pointer-events-none absolute inset-x-0 top-[92px] bottom-[92px] z-[80] hidden px-4 lg:block">
                <div className="flex h-full items-center justify-center">
                  <div className="pointer-events-auto w-full max-w-[480px]">
                    <DesktopVideoMapCard
                      videos={activeLocationVideos}
                      currentVideo={pinnedVideo}
                      activity={videoActivity}
                      onClose={() => setPinnedVideo(null)}
                      onChangeVideo={changeMapVideo}
                      variant="youtube-theater"
                      openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Abierto en YouTube" : "Abrir en YouTube"}
                      onPlaybackStateChange={(state) => {
                        if (!pinnedVideo) return;
                        if (state === "playing") videoActivity.markVideoStarted(pinnedVideo.youtube_video_id);
                        if (state === "ended") videoActivity.setVideoWatchStatus(pinnedVideo.youtube_video_id, "watched");
                      }}
                    />
                  </div>
                </div>
                </div>
              ) : null}

              <div className="absolute left-4 right-4 top-4 z-[90] flex items-start justify-between gap-2 pointer-events-none">
                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[#ff5a3d]/60 bg-[#060c12]/60 px-3 text-[11px] font-bold text-[#ff5a3d] backdrop-blur-md"
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
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[#ff5a3d]/60 bg-[#060c12]/60 px-3 text-[11px] font-bold text-[#ff5a3d] backdrop-blur-md"
                    onClick={() => setActivityMenuOpen((prev) => !prev)}
                  >
                    <ActiveActivityIcon size={13} />
                    {activityFilterOption.label}
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

              {!isMapFullscreen ? (
                <MapVotePanel2
                  candidates={voteCandidates}
                  prompt={votePrompt}
                  votedCountryCode={votedCountryCode}
                  onSelectCountry={(countryCode) => {
                    setSelectedCountryCode(countryCode);
                    openVotePrompt(countryCode);
                  }}
                  onConfirmVote={confirmVote}
                  onCancelVote={() => setVotePrompt(null)}
                />
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff5a3d]/55 bg-[#050b10]/82 text-[#ff5a3d] backdrop-blur-xl hover:bg-[#050b10]"
                    onClick={() => setIsMapFullscreen(false)}
                    aria-label="Salir de pantalla completa"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Inspiration Videos */}
            {!isMapFullscreen ? (
              <VideoInspirationRail2
                videos={railSourceVideos}
                selectedCountryCode={selectedCountryCode}
                onSelect={(video) => {
                  openMapVideo(video);
                }}
              />
            ) : null}
          </div>
        </section>

        {/* Right Rail (Bento Grid Sidebar) */}
        {!isMapFullscreen ? (
          <aside className="hidden xl:flex flex-col gap-3 h-full overflow-hidden px-4 py-3 border-l border-white/[0.06] bg-[#04080d]/40 backdrop-blur-3xl">
            <ProposalRightRail2
              onBecomePatron={() => setShowCheckoutModal(true)}
              onAction={flash}
              analytics={proposalAnalytics}
            />
          </aside>
        ) : null}
      </div>

      {/* Drawers / Modals Simulation */}
      <MobileDrawer2 open={menuOpen} onClose={() => setMenuOpen(false)} onAction={flash} />

      <VideoSelectionSheet
        open={Boolean(pinnedVideo) && !isDesktopVideoCard}
        videos={activeLocationVideos}
        currentVideo={pinnedVideo}
        activity={videoActivity}
        onClose={() => setPinnedVideo(null)}
        onChangeVideo={changeMapVideo}
        openButtonLabel={videoActivity.openedIds.has(String(pinnedVideo?.youtube_video_id || "")) ? "Abierto en YouTube" : "Abrir en YouTube"}
        onPlaybackStateChange={(state) => {
          if (!pinnedVideo) return;
          if (state === "playing") videoActivity.markVideoStarted(pinnedVideo.youtube_video_id);
          if (state === "ended") videoActivity.setVideoWatchStatus(pinnedVideo.youtube_video_id, "watched");
        }}
      />

      {/* Playlist modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

      {/* Sponsor modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
  setActiveItem,
  onOpenMenu,
  onSelectCountry
}: {
  countries: SidebarCountryItem[];
  activeItem: string;
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
    <aside className="relative z-20 flex flex-col border-b border-white/[0.07] bg-[#03060a] px-4 py-4 lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
      
      {/* Brand Logo Header */}
      <div className="mb-4 flex items-center justify-between lg:block">
        <button type="button" className="flex items-center gap-3 text-left group" onClick={() => setActiveItem("Explorar")}>
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
        </button>
        <button 
          type="button" 
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] lg:hidden hover:bg-white/[0.08]" 
          onClick={onOpenMenu}
        >
          <List size={20} />
        </button>
      </div>

      {/* Countries segment (from map data) */}
      <div className="mt-2 hidden rounded-xl p-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#818a93]">Países</p>
        </div>
        
        {/* Country list */}
        <div className="space-y-2.5 overflow-y-auto bg-[#03060a] pr-1 [scrollbar-gutter:stable] lg:flex-1">
          {countries.map((country) => (
            <button 
              key={country.code} 
              type="button" 
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border border-white/[0.05] p-1 text-left transition hover:border-[#ff5a3d]/25 hover:bg-white/[0.04]" 
              onClick={() => onSelectCountry(country.code, country.name)}
            >
              <span className={cn(
                "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md text-[18px] transition",
                country.progress > 0 ? "border border-[#ff5a3d]/35 bg-[#ff5a3d]/10" : "border border-white/[0.04] bg-white/[0.04]"
              )}>
                {country.progress > 0 ? (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#ff5a3d]/30"
                    style={{ width: `${Math.max(10, country.progress * 100)}%` }}
                  />
                ) : null}
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_65%)]" />
                <span className="relative z-10">{countryCodeToFlag(country.code)}</span>
              </span>
              <span className="relative min-w-0">
                <span className="block truncate text-[12px] font-bold text-white transition group-hover:text-[#ff7d63]">{country.name}</span>
                <span className="text-[10px] text-[#818a93]">
                  {country.watchedCount} de {country.count} videos
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main navigation menu items */}
      <nav className="mt-2 hidden lg:block space-y-1 rounded-xl p-2">
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
  const lastExtractionLabel = lastExtractionAt
    ? new Date(lastExtractionAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : "Sin dato";

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
              await navigator.clipboard.writeText(window.location.href);
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
  onSelectCountry,
  onConfirmVote,
  onCancelVote,
}: {
  candidates: Array<{ code: string; name: string; count: number; votes: number }>;
  prompt: LocalVotePrompt | null;
  votedCountryCode: string | null;
  onSelectCountry: (countryCode: string) => void;
  onConfirmVote: (countryCode: string) => void;
  onCancelVote: () => void;
}) {
  const totalVotes = candidates.reduce((sum, country) => sum + country.votes, 0);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[70] w-[min(190px,calc(100%-2rem))]">
      {prompt && !isMinimized ? (
        <div className="pointer-events-auto mb-2 rounded-xl border border-[#ff5a3d]/28 bg-[#050b10]/92 p-3 text-white shadow-2xl backdrop-blur-xl">
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

      <section className="pointer-events-auto rounded-xl border border-white/[0.08] bg-[#050b10]/82 p-3 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#ff5a3d]">Fan vote</p>
            <h3 className="text-[12px] font-black leading-tight text-white">Próximo destino</h3>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 text-[15px] font-black leading-none text-[#ff5a3d] transition hover:bg-[#ff5a3d]/18"
            onClick={() => setIsMinimized((current) => !current)}
            aria-label={isMinimized ? "Expandir fan vote" : "Minimizar fan vote"}
          >
            <span className="flex h-full translate-y-[-1px] items-center justify-center leading-none">
              {isMinimized ? "+" : "-"}
            </span>
          </button>
        </div>
        {!isMinimized ? (
          <>
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
          </>
        ) : null}
      </section>
    </div>
  );
}



// Bottom Inspiration videos row
function VideoInspirationRail2({
  videos,
  selectedCountryCode,
  onSelect
}: {
  videos: TravelVideoLocation[];
  selectedCountryCode: string | null;
  onSelect: (video: TravelVideoLocation) => void;
}) {
  const selectedCountryName =
    selectedCountryCode
      ? videos.find((video) => String(video.country_code || "").toUpperCase() === selectedCountryCode)?.country_name
      : null;
  const railVideos = videos.slice(0, 14);

  return (
    <section className="bg-[#03060a]/50 p-4 border border-white/[0.06] rounded-xl shrink-0 h-[190px]">
      <div className="mb-3 flex items-center justify-between">
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
        <span className="text-[14px] font-black uppercase tracking-wider text-[#ff5a3d]">{videos.length} videos</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1.5 scrollbar-thin select-none pr-8">
        {railVideos.map((video) => {
          const countryCode = String(video.country_code || "").toUpperCase();
          const videoViews = Number(video.view_count || 0);
          const durationMinutes = Math.max(1, Math.round(Number(video.duration_seconds || 0) / 60));

          return (
            <div 
              key={video.youtube_video_id} 
              className="group relative h-[126px] w-[215px] shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition hover:border-[#ff5a3d]/20"
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
                    <span className="truncate">{video.country_name || countryCode || "Destino"}</span>
                  </span>
                </div>
              </button>
            </div>
          );
        })}
        
        {/* Next Scroll Navigation Arrow Button */}
        <div className="flex items-center justify-center pl-2 shrink-0">
          <button 
            type="button" 
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#050b10]/60 hover:bg-[#050b10]/95 hover:border-white/20 text-white transition shadow-lg"
            onClick={() => {
              const first = railVideos[0];
              if (first) onSelect(first);
            }}
          >
            <CaretDown size={15} className="rotate-[-90deg] text-[#ff5a3d]" />
          </button>
        </div>
      </div>
    </section>
  );
}

// Right Sidebar (Metrics, Sponsors and Patrons CTA)
function ProposalRightRail2({
  onBecomePatron,
  onAction,
  analytics
}: {
  onBecomePatron: () => void;
  onAction: (m: string) => void;
  analytics: ProposalAnalytics;
}) {
  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <section className="rounded-xl border border-white/[0.06] bg-[#050b10]/60 p-4 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-center">
          <span className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
            <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <p className="truncate text-[14px] font-black leading-tight text-white">BY PUPILA</p>
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
            onClick={() => onAction("Gestor de sponsors abierto (Simulación).")}
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
                  onClick={() => onAction(`Redirigiendo a sponsor: ${sponsor.name}`)}
                >
                  Ir al sitio
                </button>
              </div>
            );
          })}
        </div>

      </section>

      {/* 3. Support Patronage banner */}
      <section className="rounded-xl border border-[#ff5a3d]/15 bg-[radial-gradient(ellipse_at_top_right,rgba(255,90,61,0.06),transparent_60%)] bg-[#050b10]/60 p-4 shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff937d]">
          Apoya mi contenido
        </h2>
        <p className="mt-2 truncate whitespace-nowrap text-[11px] leading-relaxed text-[#c4cdd6] font-medium">
          Tu apoyo me permite seguir explorando nuevos rincones de este maravilloso planeta.
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
          <Heart size={15} weight="fill" className="animate-pulse" />
          Hazte patrocinador
        </button>
      </section>
    </div>
  );
}

// Bottom banner notification
function PrototypeNotice2({ notice }: { notice: string }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(94vw,560px)] -translate-x-1/2 rounded-full border border-white/[0.08] bg-[#050b10]/90 px-5 py-2.5 text-center text-[10px] font-bold text-[#e1e7ee] shadow-[0_20px_60px_-16px_rgba(0,0,0,0.92)] backdrop-blur-2xl transition duration-500 animate-bounce">
      <span className="text-[#ff5a3d] mr-1.5">⚡ Info:</span> {notice}
    </div>
  );
}

// Sidebar Drawer layout on mobile views
function MobileDrawer2({
  open,
  onClose,
  onAction
}: {
  open: boolean;
  onClose: () => void;
  onAction: (msg: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <aside className="h-full w-[265px] border-r border-white/10 bg-[#04080d] p-5 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 block h-9 w-9">
              <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="34px" className="object-cover" />
            </span>
            <div>
              <p className="text-[12px] font-black text-white">BY PUPILA</p>
              <p className="text-[9px] text-slate-400 font-semibold leading-none">@bypupila</p>
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
              onClick={() => { onAction(`${label} cargado.`); onClose(); }}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
