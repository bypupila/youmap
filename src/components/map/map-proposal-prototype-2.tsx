"use client";

import Image from "next/image";
import {
  Bell,
  BookmarkSimple,
  CaretDown,
  CheckCircle,
  Clock,
  Compass,
  Eye,
  Flag,
  FunnelSimple,
  GlobeHemisphereWest,
  Heart,
  House,
  List,
  MagnifyingGlass,
  MapPin,
  Minus,
  Play,
  Plus,
  SquaresFour,
  UploadSimple,
  Users,
  UsersThree,
  Video,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TravelGlobe } from "@/components/travel-globe";

type ContentFilter = "all" | "live" | "videos" | "creators";
type TravelList = "trips" | "wishlist" | "explored";

interface MapProposalPrototype2Props {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

type SidebarCountryItem = {
  code: string;
  name: string;
  count: number;
};

function countryCodeToFlag(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌍";
  return String.fromCodePoint(
    normalized.charCodeAt(0) + 127397,
    normalized.charCodeAt(1) + 127397
  );
}

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
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [travelList, setTravelList] = useState<TravelList>("trips");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState("Explorar");
  const [zoom, setZoom] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState<typeof SUGGESTED_VIDEOS[0] | null>(null);

  // TravelGlobe interactive state controls
  const [globeRotationEnabled, setGlobeRotationEnabled] = useState(true);
  const [globeCommand, setGlobeCommand] = useState<{ id: number; action: "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation" | "collapse_cluster" } | null>(null);
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const [hoveredCountryPin, setHoveredCountryPin] = useState<{ countryCode: string; countryName: string } | null>(null);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);

  // States for interactive simulations
  const [notice, setNotice] = useState("Prototipo Premium /map-proposal-2. Presiona elementos para simular interacción.");
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(["dolomitas", "islandia"]));
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(["dolomitas"]));
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
        bucket.set(code, { code, name, count: 1 });
      }
    }
    return Array.from(bucket.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [videoLocations]);

  function flash(message: string) {
    setNotice(message);
  }

  function handleSaveVideo(id: string) {
    const next = new Set(savedIds);
    if (next.has(id)) {
      next.delete(id);
      flash("Video removido de guardados.");
    } else {
      next.add(id);
      flash("Video guardado en tu colección.");
    }
    setSavedIds(next);
  }

  function handleLikeVideo(id: string) {
    const next = new Set(likedIds);
    if (next.has(id)) {
      next.delete(id);
      flash("Me gusta eliminado.");
    } else {
      next.add(id);
      flash("Me gusta guardado. ¡Gracias por tu apoyo!");
    }
    setLikedIds(next);
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#03060a] text-[#f5f7fb] font-sans antialiased">
      {/* Background glowing effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,90,61,0.08),transparent_35%),linear-gradient(180deg,#04090f,#030508_60%,#010204)] pointer-events-none" />
      
      <div className="relative grid h-screen overflow-hidden grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_340px] 3xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        
        {/* Left Sidebar */}
        <ProposalSidebar2
          countries={sidebarCountries}
          activeItem={activeSidebarItem}
          setActiveItem={(item) => {
            setActiveSidebarItem(item);
            flash(`Sección activa: ${item}`);
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onAddPlaylist={() => setShowPlaylistModal(true)}
          onSelectPlaylist={(name) => {
            flash(`Playlist "${name}" seleccionada en el mapa.`);
          }}
        />

        {/* Center Main Column */}
        <section className="min-w-0 px-3 py-3 lg:px-4 flex flex-col gap-3 h-full overflow-hidden">
          
          {/* Topbar */}
          <ProposalTopbar2
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onUpload={() => flash("Flujo de subida de video premium simulado.")}
            onNotification={() => flash("Centro de notificaciones: No hay nuevas notificaciones.")}
            onProfileClick={() => flash("Menú de perfil 'BY PUPILA' abierto.")}
          />

          {/* Map and Inspiration Section Container */}
          <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
            
            {/* The Earth Map Box */}
            <div className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#050b10] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)]">
              
              {/* WebGL 3D Travel Globe */}
              <TravelGlobe
                channelData={channel}
                videoLocations={videoLocations}
                interactive={true}
                showControls={false}
                showSponsorBanner={false}
                pointMode="video"
                showSummaryCard={false}
                showPointPanel={false}
                onActiveVideoChange={setActiveVideo}
                onPinnedVideoChange={(video) => {
                  if (video) {
                    flash(`Mostrando video: "${video.title}" en el globo.`);
                  } else {
                    flash("Mapa despinado.");
                  }
                }}
                onCountrySelect={(countryCode) => {
                  flash(`País seleccionado en el globo: ${countryCode}`);
                }}
                onClusterExpandedChange={setClusterExpanded}
                onCountryHoverChange={setHoveredCountryPin}
                command={globeCommand}
                rotationEnabled={globeRotationEnabled}
                onRotationChange={setGlobeRotationEnabled}
              />

              {/* Float filter options pills (Top Left overlay) */}
              <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-1.5 pointer-events-auto">
                {[
                  ["all", "Todos"],
                  ["live", "En vivo"],
                  ["videos", "Videos"],
                  ["creators", "Creadores"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "h-8.5 rounded-full px-4 text-[11px] font-bold transition-all flex items-center h-8",
                      filter === id 
                        ? "bg-[#ff5a3d] text-white border border-transparent shadow-[0_4px_12px_rgba(255,90,61,0.25)]" 
                        : "bg-[#060c12]/70 text-[#cbd3dc] border border-white/[0.04] backdrop-blur-md hover:bg-[#060c12]/90 hover:text-white"
                    )}
                    onClick={() => {
                      setFilter(id as ContentFilter);
                      flash(`Filtro del globo: ${label}`);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Floating Filter funnel (Top Right overlay) */}
              <button 
                type="button" 
                className="absolute right-4 top-4 z-20 flex h-8 items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#060c12]/70 px-3.5 text-[11px] font-bold text-white backdrop-blur-md hover:bg-[#060c12]/90 transition pointer-events-auto" 
                onClick={() => {
                  setGlobeCommand({ id: Date.now(), action: "reset_view" });
                  flash("Centrando globo de viaje...");
                }}
              >
                <FunnelSimple size={14} />
                Filtros
                <CaretDown size={11} className="text-slate-400" />
              </button>

              {/* Map zooming floating buttons (Bottom Left overlay) */}
              <div className="absolute bottom-4 left-4 z-20 overflow-hidden rounded-lg border border-white/[0.08] bg-[#05090e]/75 backdrop-blur-xl shadow-lg flex flex-col pointer-events-auto">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center border-b border-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.06] transition"
                  onClick={() => {
                    setGlobeCommand({ id: Date.now(), action: "zoom_in" });
                    flash("Acercando globo...");
                  }}
                  aria-label="Acercar"
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center border-b border-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.06] transition"
                  onClick={() => {
                    setGlobeCommand({ id: Date.now(), action: "zoom_out" });
                    flash("Alejando globo...");
                  }}
                  aria-label="Alejar"
                >
                  <Minus size={15} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center border-b border-white/[0.06] text-white/80 hover:text-white hover:bg-[#ff5a3d]/10 transition"
                  onClick={() => {
                    setGlobeRotationEnabled((current) => !current);
                    flash(globeRotationEnabled ? "Rotación del globo pausada." : "Rotación del globo reanudada.");
                  }}
                  aria-label="Rotación"
                >
                  <GlobeHemisphereWest size={15} className={globeRotationEnabled ? "text-[#ff5a3d] animate-[spin_10s_linear_infinite]" : "text-white/80"} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.06] transition"
                  onClick={() => {
                    setGlobeCommand({ id: Date.now(), action: "reset_view" });
                    flash("Centrando globo de viaje...");
                  }}
                  aria-label="Reset"
                >
                  <Compass size={15} />
                </button>
              </div>

              {/* Bottom-right Travel List Switch */}
              <TravelListSwitch2 active={travelList} setActive={setTravelList} onAction={flash} />
            </div>

            {/* Bottom Inspiration Videos */}
            <VideoInspirationRail2
              videos={SUGGESTED_VIDEOS}
              savedIds={savedIds}
              likedIds={likedIds}
              onSave={handleSaveVideo}
              onLike={handleLikeVideo}
              onSelect={(video) => {
                setSelectedVideo(video);
                flash(`Video seleccionado: ${video.title}`);
              }}
            />
          </div>
        </section>

        {/* Right Rail (Bento Grid Sidebar) */}
        <aside className="hidden xl:flex flex-col gap-3 h-full overflow-hidden px-4 py-3 border-l border-white/[0.06] bg-[#04080d]/40 backdrop-blur-3xl">
          <ProposalRightRail2
            onBecomePatron={() => setShowCheckoutModal(true)}
            onAction={flash}
          />
        </aside>
      </div>

      {/* Floating Notice / Alert Banner */}
      <PrototypeNotice2 notice={notice} />

      {/* Drawers / Modals Simulation */}
      <MobileDrawer2 open={menuOpen} onClose={() => setMenuOpen(false)} onAction={flash} />

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
  onAddPlaylist,
  onSelectPlaylist
}: {
  countries: SidebarCountryItem[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  onOpenMenu: () => void;
  onAddPlaylist: () => void;
  onSelectPlaylist: (name: string) => void;
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
    <aside className="relative z-20 flex flex-col border-b border-white/[0.07] bg-[#03060a]/92 px-4 py-4 backdrop-blur-xl lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
      
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between lg:block mb-6">
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

      {/* Creator Profile Summary Widget */}
      <div className="mt-2 mb-6 hidden lg:block">
        <div className="flex items-center gap-3">
          <span className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
            <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-black text-white leading-tight">BY PUPILA</p>
              <CheckCircle size={15} weight="fill" className="text-[#ff5a3d] shrink-0" />
            </div>
            <p className="mt-0.5 text-[10px] text-[#818a93] font-medium leading-none">Creador de Contenido</p>
          </div>
        </div>

        {/* Flat minimalistic travel numbers stats without container box */}
        <div className="mt-5 grid grid-cols-3 py-3 border-t border-b border-white/[0.06]">
          <div className="text-center border-r border-white/[0.06]">
            <p className="font-mono text-[16px] font-black leading-none text-white">2</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Países</p>
          </div>
          <div className="text-center border-r border-white/[0.06]">
            <p className="font-mono text-[16px] font-black leading-none text-white">24</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Ciudades</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-[16px] font-black leading-none text-white">36</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#818a93]">Videos</p>
          </div>
        </div>
      </div>

      {/* Countries segment (from map data) */}
      <div className="mt-6 hidden border-t border-white/[0.06] pt-5 lg:block">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#818a93]">Países</p>
          <button 
            type="button" 
            className="text-slate-400 hover:text-white transition p-1 hover:bg-white/[0.04] rounded" 
            onClick={() => onSelectPlaylist(countries[0]?.name || "País")}
            aria-label="Seleccionar país"
          >
            <GlobeHemisphereWest size={14} />
          </button>
        </div>
        
        {/* Country list */}
        <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
          {countries.map((country) => (
            <button 
              key={country.code} 
              type="button" 
              className="flex w-full items-center gap-3 rounded-lg p-1 transition hover:bg-white/[0.04] group text-left" 
              onClick={() => onSelectPlaylist(country.name)}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.04] text-[18px]">
                {countryCodeToFlag(country.code)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold text-white group-hover:text-[#ff7d63] transition">{country.name}</span>
                <span className="text-[10px] text-[#818a93]">{country.count} videos</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main navigation menu items */}
      <nav className="mt-6 hidden lg:block space-y-1">
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

      {/* Nueva playlist trigger bottom */}
      <button 
        type="button" 
        className="mt-4 hidden h-10 w-full items-center justify-between rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-3.5 text-[11px] font-bold text-white/70 transition hover:bg-white/[0.03] hover:text-white lg:flex" 
        onClick={onAddPlaylist}
      >
        <span className="flex items-center gap-1.5"><Plus size={13} /> Nueva playlist</span>
        <Plus size={12} className="opacity-40" />
      </button>
    </aside>
  );
}

// Topbar Header Panel
function ProposalTopbar2({
  searchQuery,
  setSearchQuery,
  onUpload,
  onNotification,
  onProfileClick
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onUpload: () => void;
  onNotification: () => void;
  onProfileClick: () => void;
}) {
  return (
    <header className="relative z-30 grid gap-3 lg:grid-cols-[1fr_auto] items-center">
      {/* Broadened Sleek Search Bar */}
      <label className="flex h-11 min-w-0 items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.035] px-4 text-[#cbd3dc] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] focus-within:border-[#ff5a3d]/40 transition-all">
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

      {/* Control buttons & Avatar */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        <button 
          type="button" 
          className="flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-[12px] font-bold text-white transition hover:bg-white/[0.07]" 
          onClick={onUpload}
        >
          <UploadSimple size={15} />
          Subir video
        </button>
        
        <button 
          type="button" 
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.07]" 
          onClick={onNotification} 
          aria-label="Notificaciones"
        >
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff5a3d]" />
        </button>

        <button 
          type="button" 
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 pr-1.5 transition hover:bg-white/[0.07]" 
          onClick={onProfileClick}
        >
          <span className="relative h-7.5 w-7.5 overflow-hidden rounded-full bg-white/[0.08] flex h-7 w-7">
            <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="30px" className="object-cover" />
          </span>
          <CaretDown size={12} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}



// Travel List Switch Selector
function TravelListSwitch2({
  active,
  setActive,
  onAction
}: {
  active: TravelList;
  setActive: (value: TravelList) => void;
  onAction: (message: string) => void;
}) {
  const items: Array<{ id: TravelList; label: string; icon: any }> = [
    { id: "trips", label: "Mis viajes", icon: SquaresFour },
    { id: "wishlist", label: "Quiero ir", icon: Heart },
    { id: "explored", label: "Explorados", icon: Flag },
  ];
  return (
    <div className="absolute bottom-[130px] right-4 z-30 hidden flex-col gap-1 rounded-xl border border-white/[0.08] bg-[#050b10]/80 p-1.5 backdrop-blur-xl shadow-2xl md:flex w-[120px]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[10px] font-bold transition-all",
              isActive 
                ? "bg-white/[0.08] text-white border border-white/5" 
                : "text-[#c4cdd6] hover:bg-white/[0.04]"
            )}
            onClick={() => {
              setActive(item.id);
              onAction(`Filtro: ${item.label}`);
            }}
          >
            <Icon size={13} weight={isActive ? "fill" : "regular"} className={isActive ? "text-[#ff5a3d]" : ""} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// Bottom Inspiration videos row
function VideoInspirationRail2({
  videos,
  savedIds,
  likedIds,
  onSave,
  onLike,
  onSelect
}: {
  videos: typeof SUGGESTED_VIDEOS;
  savedIds: Set<string>;
  likedIds: Set<string>;
  onSave: (id: string) => void;
  onLike: (id: string) => void;
  onSelect: (video: typeof SUGGESTED_VIDEOS[0]) => void;
}) {
  return (
    <section className="bg-[#03060a]/50 p-4 border border-white/[0.06] rounded-xl shrink-0 h-[190px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-black uppercase tracking-wider text-white">Videos para inspirarte</h2>
        <button type="button" className="text-[10px] font-bold text-[#b9c1cb] hover:text-white transition">
          Ver todos
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1.5 scrollbar-thin select-none pr-8">
        {videos.map((video) => {
          const isSaved = savedIds.has(video.id);
          const isLiked = likedIds.has(video.id);
          
          return (
            <div 
              key={video.id} 
              className="group relative h-[126px] w-[215px] shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition hover:border-[#ff5a3d]/20"
            >
              {/* Image background cover */}
              <Image 
                src={video.thumbnail} 
                alt={video.title} 
                fill 
                sizes="215px" 
                className="object-cover opacity-85 transition duration-300 group-hover:scale-105" 
              />
              {/* Card gradient overlay */}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.85))]" />

              {/* Top metadata tags */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                {video.live ? (
                  <span className="rounded bg-[#ff4d3f] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white">
                    En vivo
                  </span>
                ) : (
                  <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-300 flex items-center gap-1">
                    <Clock size={10} /> {video.duration}
                  </span>
                )}

                {/* Simulated view tags in top right */}
                {video.live && (
                  <span className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1">
                    <Eye size={10} /> {video.views}
                  </span>
                )}
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
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="relative h-4.5 w-4.5 overflow-hidden rounded-full border border-white/20 bg-white/[0.06] block h-4.5 w-4.5 shrink-0">
                      <Image src={video.creatorAvatar} alt={video.creator} fill sizes="18px" className="object-cover" />
                    </span>
                    <span className="text-[9px] text-[#cbd3dc] font-bold truncate">
                      {video.creator} <span className="opacity-40">•</span> {video.location}
                    </span>
                  </div>
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
            onClick={() => onSelect(SUGGESTED_VIDEOS[0])}
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
  onAction
}: {
  onBecomePatron: () => void;
  onAction: (m: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pr-1">
      
      {/* 1. Trip metrics box */}
      <section className="rounded-xl border border-white/[0.06] bg-[#050b10]/60 p-4 shadow-sm flex flex-col">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93] mb-4">
          Tu viaje en números
        </h2>
        
        {/* Metric widgets grouped horizontally */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <MapPin size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">87</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Lugares explorados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <Clock size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">129</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Horas vistas del canal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <GlobeHemisphereWest size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">15</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1">Países visitados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-[#ff5a3d]">
              <Heart size={17} weight="fill" />
            </span>
            <div>
              <p className="font-mono text-[16px] font-black text-white leading-none">8.4K</p>
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
        <p className="mt-2 text-[11px] leading-relaxed text-[#c4cdd6] font-medium">
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
          className="mt-4.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6d4e_0%,#e03d1a_100%)] text-[12px] font-black text-white shadow-[0_12px_24px_-8px_rgba(224,61,26,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all" 
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
