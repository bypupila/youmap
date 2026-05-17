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
  UserCircle,
  UsersThree,
  Video,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { countryCodeToFlag } from "@/components/map/video-viewer-utils";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

type PrototypeRole = "demo-creator" | "demo-viewer" | "creator" | "viewer";
type ContentFilter = "all" | "live" | "videos" | "creators";
type TravelList = "trips" | "wishlist" | "explored";

interface MapProposalPrototypeProps {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

const ROLE_LABELS: Record<PrototypeRole, string> = {
  "demo-creator": "Demo creador",
  "demo-viewer": "Demo viewer",
  creator: "Creador",
  viewer: "Viewer",
};

const SPONSORS = [
  { name: "GoPro", description: "Camaras y accesorios", site: "gopro.com", logo: "/brands/getyourguide.svg" },
  { name: "IATI Seguros", description: "Seguros de viaje", site: "iatiseguros.com", logo: "/brands/iati.svg" },
  { name: "Wise", description: "Envia dinero al mundo", site: "wise.com", logo: "/brands/airbnb.svg" },
  { name: "Booking.com", description: "Alojamientos", site: "booking.com", logo: "/brands/booking.svg" },
];

const PLAYLISTS = [
  { title: "Asia extrema", count: 18, code: "JP" },
  { title: "Europa en tren", count: 14, code: "IT" },
  { title: "Mundo arabe", count: 9, code: "MA" },
  { title: "Roadtrips", count: 11, code: "US" },
];

export function MapProposalPrototype({ channel, videoLocations }: MapProposalPrototypeProps) {
  const [role, setRole] = useState<PrototypeRole>("demo-creator");
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [travelList, setTravelList] = useState<TravelList>("trips");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState(videoLocations[0]?.youtube_video_id || "");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState("Prototipo aislado: no guarda cambios reales.");
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const isCreatorMode = role === "creator" || role === "demo-creator";
  const isDemoMode = role === "demo-creator" || role === "demo-viewer";

  const countryBuckets = useMemo(() => buildCountryBuckets(videoLocations), [videoLocations]);
  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return videoLocations
      .filter((video) => {
        if (selectedCountry && String(video.country_code || "").toUpperCase() !== selectedCountry) return false;
        if (!query) return true;
        return [video.title, video.country_name, video.city, video.location_label]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 18);
  }, [searchQuery, selectedCountry, videoLocations]);

  const visibleVideos = useMemo(() => {
    if (filter === "all") return filteredVideos;
    if (filter === "live") return filteredVideos.slice(0, 4);
    if (filter === "creators") return filteredVideos.filter((_, index) => index % 3 === 0);
    return filteredVideos;
  }, [filter, filteredVideos]);

  const selectedVideo =
    videoLocations.find((video) => video.youtube_video_id === selectedVideoId) || visibleVideos[0] || videoLocations[0] || null;
  const totalViews = videoLocations.reduce((sum, video) => sum + Number(video.view_count || 0), 0);
  const totalLikes = videoLocations.reduce((sum, video) => sum + Number(video.like_count || 0), 0);

  function flash(message: string) {
    setNotice(message);
  }

  function toggleSet(setter: (value: Set<string>) => void, current: Set<string>, id: string, addedMessage: string, removedMessage: string) {
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
      setter(next);
      flash(removedMessage);
      return;
    }
    next.add(id);
    setter(next);
    flash(addedMessage);
  }

  function handleUpload() {
    setIsUploading(true);
    flash(isDemoMode ? "Subida simulada para la demo de Luisito." : "Flujo de subida abierto en modo prototipo.");
    window.setTimeout(() => setIsUploading(false), 900);
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#03080d] text-[#f5f7fb]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,94,59,0.18),transparent_24%),linear-gradient(180deg,#06111a,#03070d_52%,#020408)]" />
      <div className="relative grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] 2xl:grid-cols-[285px_minmax(0,1fr)_360px]">
        <ProposalSidebar
          channel={channel}
          role={role}
          isCreatorMode={isCreatorMode}
          selectedCountry={selectedCountry}
          countryBuckets={countryBuckets}
          onSelectCountry={(code) => {
            setSelectedCountry(code);
            flash(code ? `Filtro aplicado: ${code}` : "Vista global restaurada.");
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onAction={flash}
        />

        <section className="min-w-0 px-3 py-3 lg:px-4 2xl:pr-0">
          <ProposalTopbar
            role={role}
            setRole={(value) => {
              setRole(value);
              flash(`Modo activo: ${ROLE_LABELS[value]}.`);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onUpload={handleUpload}
            isUploading={isUploading}
            onNotice={flash}
          />

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-1">
            <div className="min-w-0">
              <div className="relative min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-[#07121b] shadow-[0_32px_110px_-54px_rgba(0,0,0,0.92)] lg:min-h-[calc(100dvh-118px)]">
                <WorldMapCanvas
                  videos={visibleVideos}
                  selectedVideo={selectedVideo}
                  selectedCountry={selectedCountry}
                  countryBuckets={countryBuckets}
                  filter={filter}
                  setFilter={setFilter}
                  zoom={zoom}
                  onZoomIn={() => {
                    setZoom((current) => Math.min(1.45, Number((current + 0.15).toFixed(2))));
                    flash("Zoom in aplicado.");
                  }}
                  onZoomOut={() => {
                    setZoom((current) => Math.max(0.75, Number((current - 0.15).toFixed(2))));
                    flash("Zoom out aplicado.");
                  }}
                  onReset={() => {
                    setZoom(1);
                    setSelectedCountry(null);
                    flash("Mapa reiniciado.");
                  }}
                  onSelectVideo={(video) => {
                    setSelectedVideoId(video.youtube_video_id);
                    setSelectedCountry(String(video.country_code || "").toUpperCase() || null);
                    flash(`Video seleccionado: ${video.country_name || video.country_code}.`);
                  }}
                  onSelectCountry={(code) => {
                    setSelectedCountry(code);
                    flash(`Destino seleccionado: ${code}.`);
                  }}
                  savedIds={savedIds}
                  likedIds={likedIds}
                />

                <FeaturedVideoCard
                  video={selectedVideo}
                  saved={Boolean(selectedVideo && savedIds.has(selectedVideo.youtube_video_id))}
                  liked={Boolean(selectedVideo && likedIds.has(selectedVideo.youtube_video_id))}
                  onPlay={() => flash("Player simulado abierto dentro del prototipo.")}
                  onSave={() => {
                    if (!selectedVideo) return;
                    toggleSet(
                      setSavedIds,
                      savedIds,
                      selectedVideo.youtube_video_id,
                      "Video destacado guardado.",
                      "Video destacado removido."
                    );
                  }}
                  onLike={() => {
                    if (!selectedVideo) return;
                    toggleSet(setLikedIds, likedIds, selectedVideo.youtube_video_id, "Like agregado al video destacado.", "Like removido.");
                  }}
                />

                <TravelListSwitch active={travelList} setActive={setTravelList} onAction={flash} />
                <VideoInspirationRail videos={visibleVideos} onSelect={(video) => setSelectedVideoId(video.youtube_video_id)} />
              </div>
            </div>

            <div className="2xl:hidden">
              <ProposalRightRail
                isCreatorMode={isCreatorMode}
                isDemoMode={isDemoMode}
                countryCount={countryBuckets.length}
                videoCount={videoLocations.length}
                totalViews={totalViews}
                totalLikes={totalLikes}
                sponsors={SPONSORS}
                onAction={flash}
              />
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 px-4 py-3 2xl:block">
          <ProposalRightRail
            isCreatorMode={isCreatorMode}
            isDemoMode={isDemoMode}
            countryCount={countryBuckets.length}
            videoCount={videoLocations.length}
            totalViews={totalViews}
            totalLikes={totalLikes}
            sponsors={SPONSORS}
            onAction={flash}
          />
        </aside>
      </div>

      <PrototypeNotice notice={notice} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} channel={channel} onAction={flash} />
    </div>
  );
}

function ProposalSidebar({
  channel,
  role,
  isCreatorMode,
  selectedCountry,
  countryBuckets,
  onSelectCountry,
  onOpenMenu,
  onAction,
}: {
  channel: TravelChannel;
  role: PrototypeRole;
  isCreatorMode: boolean;
  selectedCountry: string | null;
  countryBuckets: CountryBucket[];
  onSelectCountry: (code: string | null) => void;
  onOpenMenu: () => void;
  onAction: (message: string) => void;
}) {
  return (
    <aside className="relative z-20 border-b border-white/10 bg-[#040b12]/88 px-3 py-3 backdrop-blur-2xl lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between lg:block">
        <button type="button" className="flex items-center gap-3 text-left" onClick={() => onSelectCountry(null)}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#ff7048]/35 bg-[#ff7048]/10 text-[#ff7b4f]">
            <Compass size={25} weight="fill" />
          </span>
          <span>
            <span className="block text-[24px] font-black uppercase leading-none tracking-[0.22em]">Roam</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8c96a1]">
              Explore. Watch. Inspire.
            </span>
          </span>
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] lg:hidden" onClick={onOpenMenu} aria-label="Abrir menu">
          <List size={20} />
        </button>
      </div>

      <div className="mt-5 hidden lg:block">
        <div className="flex items-center gap-3">
          <span className="relative h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
            <Image src="/creators/luisito-comunica.png" alt={channel.channel_name} fill sizes="56px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">Luisito Comunica</p>
            <p className="mt-0.5 text-[11px] text-[#a5afba]">{ROLE_LABELS[role]}</p>
          </div>
          <CheckCircle size={17} weight="fill" className="ml-auto text-[#ff7048]" />
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-lg border border-white/10 bg-white/[0.035] py-3">
          <MiniStat value={countryBuckets.length} label="Paises" />
          <MiniStat value={sumCities(countryBuckets)} label="Ciudades" />
          <MiniStat value={countryBuckets.reduce((sum, bucket) => sum + bucket.count, 0)} label="Videos" />
        </div>
      </div>

      <nav className="mt-5 hidden space-y-1 lg:block">
        <SidebarButton active={!selectedCountry} icon={Compass} label="Explorar" onClick={() => onSelectCountry(null)} />
        <SidebarButton icon={Video} label="En vivo" count={12} onClick={() => onAction("Filtro En vivo activado.")} />
        <SidebarButton icon={MapPin} label="Destinos" onClick={() => onSelectCountry(countryBuckets[0]?.country_code || null)} />
        <SidebarButton icon={UsersThree} label="Creadores" onClick={() => onAction("Vista de creadores simulada.")} />
        <SidebarButton icon={BookmarkSimple} label="Guardados" onClick={() => onAction("Lista de guardados abierta.")} />
        <SidebarButton icon={Clock} label="Historial" onClick={() => onAction("Historial de reproduccion abierto.")} />
      </nav>

      <div className="mt-6 hidden border-t border-white/10 pt-4 lg:block">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#89939f]">Mis playlists</p>
          <button type="button" className="text-[#cfd7df]" onClick={() => onAction("Nueva playlist simulada.")} aria-label="Nueva playlist">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {PLAYLISTS.map((playlist) => (
            <button key={playlist.title} type="button" className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-white/[0.06]" onClick={() => onSelectCountry(playlist.code)}>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.08] text-[18px]">{countryCodeToFlag(playlist.code)}</span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#f2f5f8]">{playlist.title}</span>
                <span className="text-[11px] text-[#929ca7]">{playlist.count} videos</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {isCreatorMode ? (
        <button type="button" className="mt-5 hidden h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-[#f3f6f9] transition hover:bg-white/[0.08] lg:flex" onClick={() => onAction("Editor de playlist abierto en modo prototipo.")}>
          <Plus size={15} />
          Nueva playlist
        </button>
      ) : null}
    </aside>
  );
}

function ProposalTopbar({
  role,
  setRole,
  searchQuery,
  setSearchQuery,
  onUpload,
  isUploading,
  onNotice,
}: {
  role: PrototypeRole;
  setRole: (role: PrototypeRole) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onUpload: () => void;
  isUploading: boolean;
  onNotice: (message: string) => void;
}) {
  return (
    <header className="relative z-30 grid gap-2 xl:grid-cols-[minmax(320px,540px)_minmax(0,1fr)_auto]">
      <label className="flex h-12 min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 text-[#cbd3dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <MagnifyingGlass size={19} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#7d8792]"
          placeholder="Buscar destinos, creadores o videos..."
        />
        {searchQuery ? (
          <button type="button" onClick={() => setSearchQuery("")} aria-label="Limpiar busqueda">
            <X size={16} />
          </button>
        ) : null}
      </label>

      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1">
        {(Object.keys(ROLE_LABELS) as PrototypeRole[]).map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-[11px] font-semibold transition",
              role === option ? "bg-[#ff5a3d] text-white" : "text-[#b9c2cc] hover:bg-white/[0.07]"
            )}
            onClick={() => setRole(option)}
          >
            {ROLE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-[12px] font-semibold text-white transition hover:bg-white/[0.09]" onClick={onUpload}>
          <UploadSimple size={17} />
          {isUploading ? "Subiendo..." : "Subir video"}
        </button>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white" onClick={() => onNotice("Centro de notificaciones abierto.")} aria-label="Notificaciones">
          <Bell size={18} />
        </button>
        <button type="button" className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-2 pr-3" onClick={() => onNotice("Menu de perfil abierto.")}>
          <span className="relative h-8 w-8 overflow-hidden rounded-full bg-white/[0.08]">
            <Image src="/creators/luisito-comunica.png" alt="Luisito Comunica" fill sizes="32px" className="object-cover" />
          </span>
          <CaretDown size={14} />
        </button>
      </div>
    </header>
  );
}

function WorldMapCanvas({
  videos,
  selectedVideo,
  selectedCountry,
  countryBuckets,
  filter,
  setFilter,
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onSelectVideo,
  onSelectCountry,
  savedIds,
  likedIds,
}: {
  videos: TravelVideoLocation[];
  selectedVideo: TravelVideoLocation | null;
  selectedCountry: string | null;
  countryBuckets: CountryBucket[];
  filter: ContentFilter;
  setFilter: (filter: ContentFilter) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onSelectVideo: (video: TravelVideoLocation) => void;
  onSelectCountry: (code: string) => void;
  savedIds: Set<string>;
  likedIds: Set<string>;
}) {
  const featuredPins = useMemo(() => {
    const byCountry = new Map<string, TravelVideoLocation>();
    for (const video of videos) {
      const code = String(video.country_code || "").toUpperCase();
      if (!code || byCountry.has(code)) continue;
      byCountry.set(code, video);
      if (byCountry.size >= 12) break;
    }
    return Array.from(byCountry.values());
  }, [videos]);

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 origin-center transition-transform duration-500"
        style={{
          transform: `scale(${zoom})`,
          backgroundImage:
            "linear-gradient(180deg,rgba(4,10,16,0.12),rgba(4,10,16,0.28)),url('/map-proposal-earth.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,8,13,0.2),transparent_22%,transparent_72%,rgba(3,8,13,0.28)),linear-gradient(180deg,rgba(3,8,13,0.04),rgba(3,8,13,0.52))]" />

      <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
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
              "h-10 rounded-full border px-4 text-[12px] font-semibold transition",
              filter === id ? "border-white/15 bg-[#07101a]/92 text-white" : "border-white/10 bg-[#07101a]/58 text-[#c0cad3] hover:bg-[#07101a]/82"
            )}
            onClick={() => setFilter(id as ContentFilter)}
          >
            {label}
          </button>
        ))}
      </div>

      <button type="button" className="absolute right-4 top-4 z-20 flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#07101a]/86 px-4 text-[12px] font-semibold text-white backdrop-blur-xl" onClick={() => onSelectCountry(countryBuckets[0]?.country_code || "MX")}>
        <FunnelSimple size={16} />
        Filtros
        <CaretDown size={13} />
      </button>

      <div className="absolute bottom-[200px] left-4 z-20 overflow-hidden rounded-lg border border-white/10 bg-[#07101a]/78 backdrop-blur-xl">
        <MapControl icon={Plus} label="Acercar mapa" onClick={onZoomIn} />
        <MapControl icon={Minus} label="Alejar mapa" onClick={onZoomOut} />
        <MapControl icon={House} label="Resetear mapa" onClick={onReset} />
      </div>

      {featuredPins.map((video, index) => {
        const position = projectPoint(video.lat, video.lng);
        const isActive = selectedVideo?.youtube_video_id === video.youtube_video_id;
        const count = countryBuckets.find((bucket) => bucket.country_code === String(video.country_code || "").toUpperCase())?.count || 1;
        return (
          <button
            key={video.youtube_video_id}
            type="button"
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-1/2 transition hover:z-30 hover:scale-105",
              isActive && "z-30 scale-110"
            )}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onSelectVideo(video)}
            aria-label={`Abrir ${video.title}`}
          >
            <span className={cn("relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#07101a] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.95)]", isActive ? "border-[#ff5a3d]" : "border-white/70")}>
              <span className="relative h-11 w-11 overflow-hidden rounded-full">
                {video.thumbnail_url ? (
                  <Image src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-white/[0.08] text-[14px]">{countryCodeToFlag(video.country_code)}</span>
                )}
              </span>
              <span className={cn("absolute -right-2 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-black text-white", index % 2 ? "bg-[#8b6cff]" : "bg-[#ff5a3d]")}>
                {Math.min(99, count)}
              </span>
              {savedIds.has(video.youtube_video_id) || likedIds.has(video.youtube_video_id) ? (
                <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-[#07101a] bg-[#6be596]" />
              ) : null}
            </span>
          </button>
        );
      })}

      {selectedCountry ? (
        <button type="button" className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-[#07101a]/88 px-4 py-2 text-[12px] font-semibold text-white backdrop-blur-xl" onClick={onReset}>
          {countryCodeToFlag(selectedCountry)} Viendo {selectedCountry}
        </button>
      ) : null}
    </div>
  );
}

function FeaturedVideoCard({
  video,
  saved,
  liked,
  onPlay,
  onSave,
  onLike,
}: {
  video: TravelVideoLocation | null;
  saved: boolean;
  liked: boolean;
  onPlay: () => void;
  onSave: () => void;
  onLike: () => void;
}) {
  if (!video) return null;
  return (
    <article className="absolute bottom-[102px] left-1/2 z-30 w-[min(92%,470px)] -translate-x-1/2 overflow-hidden rounded-lg border border-white/15 bg-[#07101a]/78 shadow-[0_28px_90px_-42px_rgba(0,0,0,0.95)] backdrop-blur-2xl md:bottom-[112px]">
      <div className="relative h-[210px]">
        {video.thumbnail_url ? (
          <Image
            src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
            alt={video.title}
            fill
            priority
            sizes="470px"
            className="object-cover"
          />
        ) : (
          <div className="h-full bg-white/[0.06]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.78))]" />
        <button type="button" className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/58 text-white backdrop-blur" onClick={onPlay} aria-label="Reproducir video destacado">
          <Play size={25} weight="fill" />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/82">Video destacado</p>
            <button type="button" onClick={onSave} className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/25", saved && "text-[#ff765d]")} aria-label="Guardar video">
              <BookmarkSimple size={17} weight={saved ? "fill" : "regular"} />
            </button>
          </div>
          <h2 className="mt-8 line-clamp-1 text-[20px] font-bold tracking-tight text-white">{video.title}</h2>
          <p className="mt-1 text-[12px] text-[#cfd7df]">{[video.city || video.location_label, video.country_name].filter(Boolean).join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[#dce3ea]">
            <span className="flex items-center gap-1"><Eye size={14} />{formatCompact(video.view_count || 0)}</span>
            <button type="button" className="flex items-center gap-1" onClick={onLike}>
              <Heart size={14} weight={liked ? "fill" : "regular"} className={liked ? "text-[#ff6f58]" : ""} />
              {formatCompact(Number(video.like_count || 0) + (liked ? 1 : 0))}
            </button>
            <span className="flex items-center gap-1"><Clock size={14} />{formatDuration(video.duration_seconds)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function TravelListSwitch({ active, setActive, onAction }: { active: TravelList; setActive: (value: TravelList) => void; onAction: (message: string) => void }) {
  const items: Array<{ id: TravelList; label: string; icon: typeof SquaresFour }> = [
    { id: "trips", label: "Mis viajes", icon: SquaresFour },
    { id: "wishlist", label: "Quiero ir", icon: Heart },
    { id: "explored", label: "Explorados", icon: Flag },
  ];
  return (
    <div className="absolute bottom-[168px] right-4 z-30 hidden overflow-hidden rounded-lg border border-white/10 bg-[#07101a]/78 p-1 backdrop-blur-2xl md:block">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={cn("flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[12px]", active === item.id ? "bg-white/[0.11] text-white" : "text-[#c4cdd6] hover:bg-white/[0.06]")}
            onClick={() => {
              setActive(item.id);
              onAction(`${item.label} seleccionado.`);
            }}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function VideoInspirationRail({ videos, onSelect }: { videos: TravelVideoLocation[]; onSelect: (video: TravelVideoLocation) => void }) {
  return (
    <section className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#03080d]/74 p-4 backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-bold tracking-tight text-white">Videos para inspirarte</h2>
        <button type="button" className="text-[12px] font-semibold text-[#cbd3dc]">Ver todos</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {videos.slice(0, 8).map((video, index) => (
          <button key={`${video.youtube_video_id}-rail`} type="button" className="group relative h-[132px] w-[220px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-left" onClick={() => onSelect(video)}>
            {video.thumbnail_url ? (
              <Image src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url} alt={video.title} fill sizes="220px" className="object-cover transition group-hover:scale-105" />
            ) : null}
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.82))]" />
            {index === 0 ? <span className="absolute left-2 top-2 rounded bg-[#ff4d3f] px-2 py-1 text-[9px] font-black uppercase text-white">En vivo</span> : null}
            <span className="absolute bottom-0 left-0 right-0 p-3">
              <span className="line-clamp-1 text-[13px] font-bold text-white">{video.title}</span>
              <span className="mt-1 block truncate text-[11px] text-[#d2dae2]">{video.country_name || video.country_code}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProposalRightRail({
  isCreatorMode,
  isDemoMode,
  countryCount,
  videoCount,
  totalViews,
  totalLikes,
  sponsors,
  onAction,
}: {
  isCreatorMode: boolean;
  isDemoMode: boolean;
  countryCount: number;
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  sponsors: typeof SPONSORS;
  onAction: (message: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <section className="rounded-lg border border-white/10 bg-[#07121b]/82 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.92)] backdrop-blur-2xl">
        <h2 className="text-[12px] font-black uppercase tracking-[0.1em] text-white">Tu viaje en numeros</h2>
        <div className="mt-5 grid grid-cols-4 gap-2">
          <Metric icon={MapPin} value={countryCount} label="Lugares" />
          <Metric icon={Clock} value={Math.max(1, Math.round(videoCount * 0.72))} label="Horas vistas" />
          <Metric icon={GlobeHemisphereWest} value={countryCount} label="Paises" />
          <Metric icon={Heart} value={formatCompact(totalLikes || totalViews / 25)} label="Likes" />
        </div>
        <p className="mt-4 text-[11px] text-[#9da5ae]">{isDemoMode ? "Datos simulados sobre la demo de Luisito." : "Vista local del prototipo sin persistencia."}</p>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#07121b]/82 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.92)] backdrop-blur-2xl xl:col-span-2 2xl:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-black uppercase tracking-[0.1em] text-white">Mis sponsors</h2>
          {isCreatorMode ? (
            <button type="button" className="text-[12px] text-[#aeb7c2]" onClick={() => onAction("Gestor de sponsors abierto.")}>Gestionar</button>
          ) : null}
        </div>
        <div className="mt-4 divide-y divide-white/10">
          {sponsors.map((sponsor) => (
            <div key={sponsor.name} className="flex items-center gap-3 py-3">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white">
                <Image src={sponsor.logo} alt={sponsor.name} fill sizes="44px" className="object-contain p-1.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{sponsor.name}</p>
                <p className="truncate text-[11px] text-[#9fa9b3]">{sponsor.description}</p>
                <p className="truncate text-[11px] text-[#7f8a95]">{sponsor.site}</p>
              </div>
              <button type="button" className="h-9 shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 text-[11px] font-semibold text-[#dce4ec]" onClick={() => onAction(`Abriendo sponsor: ${sponsor.name}.`)}>
                Ir al sitio
              </button>
            </div>
          ))}
        </div>
        {isCreatorMode ? (
          <button type="button" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/18 bg-white/[0.025] text-[12px] font-semibold text-[#dce4ec]" onClick={() => onAction("Formulario de sponsor simulado.")}>
            <Plus size={16} />
            Anadir sponsor
          </button>
        ) : null}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#07121b]/82 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.92)] backdrop-blur-2xl">
        <h2 className="text-[12px] font-black uppercase tracking-[0.1em] text-[#ff9a4d]">{isCreatorMode ? "Monetiza tu mapa" : "Apoya mi contenido"}</h2>
        <p className="mt-3 text-[12px] leading-5 text-[#aeb7c2]">{isCreatorMode ? "Preview del bloque comercial para validar sponsors y CTA." : "Tu apoyo me permite seguir explorando."}</p>
        <div className="mt-5 flex items-center">
          {["MX", "JP", "MA", "IT", "US", "AR"].map((code) => (
            <span key={code} className="-ml-2 flex h-10 w-10 first:ml-0 items-center justify-center rounded-full border-2 border-[#07121b] bg-white text-[18px]">
              {countryCodeToFlag(code)}
            </span>
          ))}
          <span className="ml-3 rounded-full border border-white/10 px-3 py-2 text-[12px] font-bold text-[#dfe6ee]">+245</span>
        </div>
        <button type="button" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#ff5a3d] text-[13px] font-black text-white transition hover:bg-[#ff6b52]" onClick={() => onAction(isCreatorMode ? "Preview de CTA validado." : "Flujo de patrocinio abierto.")}>
          <Heart size={17} />
          {isCreatorMode ? "Previsualizar CTA" : "Hazte patrocinador"}
        </button>
      </section>
    </div>
  );
}

function PrototypeNotice({ notice }: { notice: string }) {
  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-[80] w-[min(92vw,620px)] -translate-x-1/2 rounded-full border border-white/10 bg-[#07121b]/88 px-4 py-2 text-center text-[12px] text-[#dce4ec] shadow-[0_18px_60px_-34px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      {notice}
    </div>
  );
}

function MobileDrawer({ open, onClose, channel, onAction }: { open: boolean; onClose: () => void; channel: TravelChannel; onAction: (message: string) => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 lg:hidden" onClick={onClose}>
      <aside className="h-full w-[min(310px,88vw)] border-r border-white/10 bg-[#06101a] p-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircle size={34} />
            <div>
              <p className="text-[14px] font-bold">{channel.channel_name}</p>
              <p className="text-[11px] text-[#9da5ae]">@luisitocomunica</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar menu">
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {["Explorar", "Videos", "Sponsors", "Guardados"].map((label) => (
            <button key={label} type="button" className="flex h-11 w-full items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left text-[13px]" onClick={() => { onAction(`${label} abierto.`); onClose(); }}>
              {label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

type CountryBucket = {
  country_code: string;
  country_name: string;
  count: number;
  cities: Set<string>;
};

function buildCountryBuckets(videos: TravelVideoLocation[]): CountryBucket[] {
  const buckets = new Map<string, CountryBucket>();
  for (const video of videos) {
    const code = String(video.country_code || "").toUpperCase();
    if (!code) continue;
    const bucket = buckets.get(code) || {
      country_code: code,
      country_name: video.country_name || code,
      count: 0,
      cities: new Set<string>(),
    };
    bucket.count += 1;
    if (video.city || video.location_label) bucket.cities.add(String(video.city || video.location_label));
    buckets.set(code, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

function projectPoint(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  };
}

function sumCities(countryBuckets: CountryBucket[]) {
  return countryBuckets.reduce((sum, bucket) => sum + bucket.cities.size, 0);
}

function formatCompact(value: number | string) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
}

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Number(seconds || 0));
  if (!total) return "00:00";
  const minutes = Math.floor(total / 60);
  const rest = Math.floor(total % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="font-mono text-[18px] font-bold leading-none text-white">{formatCompact(value)}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9aa4af]">{label}</p>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, count, active, onClick }: { icon: typeof Compass; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn("flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition", active ? "border border-[#ff5a3d]/50 bg-[#ff5a3d]/16 text-[#ff876f]" : "text-[#dce4ec] hover:bg-white/[0.06]")}
      onClick={onClick}
    >
      <Icon size={18} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? <span className="rounded-full bg-[#ff4f42] px-2 py-0.5 text-[10px] text-white">{count}</span> : null}
    </button>
  );
}

function MapControl({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button type="button" className="flex h-10 w-10 items-center justify-center border-b border-white/10 text-white last:border-b-0 hover:bg-white/[0.08]" onClick={onClick} aria-label={label}>
      <Icon size={17} />
    </button>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof MapPin; value: number | string; label: string }) {
  return (
    <div className="text-center">
      <Icon size={24} className="mx-auto text-white" />
      <p className="mt-2 font-mono text-[18px] font-bold leading-none text-white">{typeof value === "number" ? formatCompact(value) : value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9aa4af]">{label}</p>
    </div>
  );
}
