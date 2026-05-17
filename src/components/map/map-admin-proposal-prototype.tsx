"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Bell,
  BookmarkSimple,
  Calendar,
  CaretDown,
  Chat,
  CheckCircle,
  Clock,
  Compass,
  Eye,
  Flag,
  FunnelSimple,
  GlobeHemisphereWest,
  Heart,
  List,
  MagnifyingGlass,
  MapPin,
  Plus,
  SquaresFour,
  Trophy,
  UploadSimple,
  Users,
  UsersThree,
  Video,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

type AdminTab = "resumen" | "contenido" | "audiencia" | "ingresos" | "patrocinios" | "analiticas" | "actividad";

interface MapAdminProposalPrototypeProps {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

// Custom Premium Inline SVG Sponsor Logos for offline reliability
function GoProLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#001c27] text-white rounded-full">
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
      <path d="M50 20 L75 35 L75 65 L50 80 L25 65 L25 35 Z" fill="currentColor" />
      <text x="50" y="56" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">IATI</text>
    </svg>
  );
}

function WiseLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#25c974]/10 text-[#25c974] rounded-full">
      <path d="M35 62 L55 35 L68 35 L48 62 Z" fill="currentColor" />
      <path d="M48 35 L60 62 L48 62 L38 48 Z" fill="currentColor" className="opacity-80" />
    </svg>
  );
}

function NorthFaceLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-2 bg-[#e03d1a]/10 text-[#e03d1a] rounded-full">
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

const RECENT_VIDEOS = [
  {
    id: "v1",
    title: "Amanecer en los Dolomitas",
    location: "Italia",
    views: "12.4K",
    time: "hace 2 días",
    duration: "24:18",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=350&q=80"
  },
  {
    id: "v2",
    title: "Roadtrip por Islandia",
    location: "Islandia",
    views: "8.7K",
    time: "hace 5 días",
    duration: "21:16",
    thumbnail: "https://images.unsplash.com/photo-1504893524553-ac55fce698be?auto=format&fit=crop&w=350&q=80"
  },
  {
    id: "v3",
    title: "Explorando Japón",
    location: "Japón",
    views: "15.1K",
    time: "hace 1 semana",
    duration: "19:36",
    thumbnail: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=350&q=80"
  },
  {
    id: "v4",
    title: "Aventura en Bali",
    location: "Indonesia",
    views: "9.3K",
    time: "hace 1 semana",
    duration: "16:43",
    thumbnail: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=350&q=80"
  },
  {
    id: "v5",
    title: "Safari en Tanzania",
    location: "Tanzania",
    views: "7.2K",
    time: "hace 2 semanas",
    duration: "22:10",
    thumbnail: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=350&q=80"
  }
];

const ACTIVITY_LOGS = [
  {
    id: "act-1",
    type: "video",
    icon: Video,
    color: "bg-[#ff5a3d]/20 text-[#ff7c65] border-[#ff5a3d]/30",
    text: "Nuevo video publicado",
    detail: "Amanecer en los Dolomitas",
    time: "hace 2 días"
  },
  {
    id: "act-2",
    type: "subscriber",
    icon: Users,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    text: "+250 nuevos suscriptores",
    detail: "Total: 12.6K",
    time: "hace 3 días"
  },
  {
    id: "act-3",
    type: "sponsor",
    icon: CheckCircle,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    text: "Nuevo sponsor",
    detail: "GoPro se ha unido",
    time: "hace 5 días"
  },
  {
    id: "act-4",
    type: "comment",
    icon: Chat,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    text: "Comentario destacado",
    detail: "¡Increíble aventura!",
    time: "hace 1 semana"
  },
  {
    id: "act-5",
    type: "trophy",
    icon: Trophy,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    text: "Meta alcanzada",
    detail: "100K vistas en el mes",
    time: "hace 1 semana"
  }
];

export function MapAdminProposalPrototype({ channel, videoLocations }: MapAdminProposalPrototypeProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("resumen");
  const [activeSidebarItem, setActiveSidebarItem] = useState("Resumen");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulated stats state
  const [notice, setNotice] = useState("Panel de administración premium: Prototipo aislado sin persistencia.");
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showPatronModal, setShowPatronModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function flash(message: string) {
    setNotice(message);
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#030609] text-[#f5f7fb] font-sans antialiased">
      {/* Background glow layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,90,61,0.06),transparent_35%),linear-gradient(180deg,#04080e,#030508_60%,#010204)] pointer-events-none" />

      <div className="relative grid h-screen overflow-hidden grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[275px_minmax(0,1fr)]">
        
        {/* Left Sidebar */}
        <ProposalSidebar
          activeItem={activeSidebarItem}
          setActiveItem={(item) => {
            setActiveSidebarItem(item);
            if (item.toLowerCase() === "resumen") {
              setActiveTab("resumen");
            } else if (item.toLowerCase() === "ingresos") {
              setActiveTab("ingresos");
            } else if (item.toLowerCase() === "analíticas") {
              setActiveTab("analiticas");
            } else if (item.toLowerCase() === "patrocinadores") {
              setActiveTab("patrocinios");
            }
            flash(`Sección activa: ${item}`);
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onAddPlaylist={() => setShowPlaylistModal(true)}
          onSelectPlaylist={(name) => flash(`Mostrando detalles de la playlist: ${name}`)}
        />

        {/* Central Dashboard area */}
        <section className="min-w-0 px-4 py-4 md:px-5 lg:px-6 flex flex-col gap-3 h-full overflow-hidden">
          
          {/* Header Row */}
          <ProposalHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onViewChannel={() => flash("Redirigiendo a la vista pública de tu canal (simulado)...")}
            onNotification={() => flash("Buzón de notificaciones de creador vacío.")}
            onProfileClick={() => flash("Ajustes del perfil del creador.")}
          />

          {/* Sub Navigation Section Tabs */}
          <nav className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
            {[
              ["resumen", "Resumen"],
              ["contenido", "Contenido"],
              ["audiencia", "Audiencia"],
              ["ingresos", "Ingresos"],
              ["patrocinios", "Patrocinios"],
              ["analiticas", "Analíticas"],
              ["actividad", "Actividad"]
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "h-8.5 rounded-full px-4 text-[11px] font-black uppercase tracking-wider transition-all flex items-center h-8",
                  activeTab === id
                    ? "bg-[#ff5a3d] text-white shadow-[0_4px_12px_rgba(255,90,61,0.2)]"
                    : "bg-white/[0.02] text-[#cbd3dc] hover:bg-white/[0.06] border border-white/5"
                )}
                onClick={() => {
                  setActiveTab(id as AdminTab);
                  if (id === "resumen") setActiveSidebarItem("Resumen");
                  if (id === "ingresos") setActiveSidebarItem("Ingresos");
                  if (id === "analiticas") setActiveSidebarItem("Analíticas");
                  if (id === "patrocinios") setActiveSidebarItem("Patrocinadores");
                  flash(`Pestaña: ${label}`);
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Main Layout Grid (Bento columns) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_340px] pb-6 scrollbar-thin">
            
            {/* Bento Middle Column */}
            <div className="min-w-0 flex flex-col gap-4">
              
              {/* Creator Bio Hero Card Widget */}
              <CreatorBioHero />

              {/* Analytics performance line & activity map */}
              <div className="grid gap-4 md:grid-cols-2">
                <PerformanceGeneralChart onAction={flash} />
                <ActivityWorldHotspots onAction={flash} />
              </div>

              {/* Recientes */}
              <RecentVideosSection onSelectVideo={(v) => flash(`Cargando analíticas para: ${v}`)} />

              {/* Timeline Horizontal activity */}
              <RecentActivities logs={ACTIVITY_LOGS} onAction={flash} />
            </div>

            {/* Bento Right Column Widgets */}
            <div className="flex flex-col gap-4">
              <AudienceChart />
              <SponsorsWidget onAddSponsor={() => setShowSponsorModal(true)} onAction={flash} />
              <DonateWidget onPatron={() => setShowPatronModal(true)} />
              <UpcomingExpeditions onAction={flash} />
            </div>

          </div>
        </section>
      </div>

      {/* Warning Alert notice bottom */}
      <PrototypeNotice notice={notice} />

      {/* Drawer menus / Modals */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Nueva playlist de viaje</h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-[#8e9cae] mb-4">Crea una nueva serie temática para agrupar tus videos en el mapa.</p>
            <input type="text" placeholder="Nombre de la playlist (ej. Sudamérica Salvaje)" className="w-full h-11 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d] mb-4" />
            <button onClick={() => { setShowPlaylistModal(false); flash("Playlist administrativa simulada."); }} className="w-full h-10 rounded-lg bg-[#ff5a3d] text-sm font-bold text-white transition hover:bg-[#ff6f54]">Crear playlist</button>
          </div>
        </div>
      )}

      {showSponsorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Añadir Sponsor Comercial</h3>
              <button onClick={() => setShowSponsorModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Empresa</label>
                <input type="text" placeholder="GoPro" className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d]" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                <input type="text" placeholder="Cámaras de acción" className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-[#ff5a3d]" />
              </div>
            </div>
            <button onClick={() => { setShowSponsorModal(false); flash("Sponsor agregado al panel."); }} className="w-full h-10 rounded-lg bg-[#ff5a3d] text-sm font-bold text-white transition hover:bg-[#ff6f54]">Añadir sponsor</button>
          </div>
        </div>
      )}

      {showPatronModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#081017] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#ff9c54] flex items-center gap-2">
                <Heart size={20} weight="fill" className="text-[#ff5a3d]" /> Patrocina a BY PUPILA
              </h3>
              <button onClick={() => setShowPatronModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-[#8e9cae] leading-relaxed mb-4">Simula un aporte para la producción del canal de BY PUPILA.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["$5", "$15", "$50"].map((a) => (
                <button key={a} onClick={() => { setShowPatronModal(false); flash(`Gracias por patrocinar ${a}.`); }} className="p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:border-[#ff5a3d] text-center font-bold text-white transition">{a}</button>
              ))}
            </div>
            <button onClick={() => setShowPatronModal(false)} className="w-full h-10 rounded-lg bg-[#ff5a3d] text-sm font-bold text-white transition hover:bg-[#ff6f54]">Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar Navigation
function ProposalSidebar({
  activeItem,
  setActiveItem,
  onOpenMenu,
  onAddPlaylist,
  onSelectPlaylist
}: {
  activeItem: string;
  setActiveItem: (item: string) => void;
  onOpenMenu: () => void;
  onAddPlaylist: () => void;
  onSelectPlaylist: (name: string) => void;
}) {
  const adminMenuItems = [
    { name: "Resumen", icon: Compass },
    { name: "Videos", icon: Video },
    { name: "En vivo", icon: Video, badge: 12 },
    { name: "Destinos", icon: MapPin },
    { name: "Patrocinadores", icon: BookmarkSimple },
    { name: "Comunidad", icon: Users },
    { name: "Ingresos", icon: SquaresFour },
    { name: "Analíticas", icon: Clock },
    { name: "Configuración", icon: Trophy }
  ];

  return (
    <aside className="relative z-20 flex flex-col border-b border-white/[0.07] bg-[#03060a]/92 px-4 py-4 backdrop-blur-xl lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
      
      {/* Sidebar Header Brand Logo */}
      <div className="flex items-center justify-between lg:block mb-6">
        <button type="button" className="flex items-center gap-3 text-left group" onClick={() => setActiveItem("Resumen")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ff7b4f] transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5">
              <path d="M4.5 16.5 L12 3 L19.5 16.5 Z M12 3 L12 16.5" />
              <path d="M2.5 21 L21.5 21" />
            </svg>
          </span>
          <div>
            <span className="block text-[22px] font-black uppercase leading-none tracking-[0.2em] text-white">Roam</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.22em] text-[#818b95]">
              Explore. Watch. Inspire.
            </span>
          </div>
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] lg:hidden hover:bg-white/[0.08]" onClick={onOpenMenu}>
          <List size={20} />
        </button>
      </div>

      {/* Creator Profile Detail widget */}
      <div className="mt-2 mb-6 hidden lg:block">
        <div className="flex items-center gap-3">
          <span className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/[0.06]">
            <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-black text-white leading-tight">BY PUPILA</p>
              <CheckCircle size={15} weight="fill" className="text-[#ff5a3d]" />
            </div>
            <p className="mt-0.5 text-[10px] text-[#818a93] font-medium leading-none">Creador de Contenido</p>
          </div>
        </div>

        {/* Minimalistic travel numbers stats */}
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

      {/* Main Admin Menu list */}
      <nav className="hidden lg:block space-y-1">
        {adminMenuItems.map((item) => {
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

      {/* Playlists block */}
      <div className="mt-6 hidden border-t border-white/[0.06] pt-5 lg:block flex-1">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#818a93]">Mis playlists</p>
          <button type="button" className="text-slate-400 hover:text-white transition p-1 hover:bg-white/[0.04] rounded" onClick={onAddPlaylist}>
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {PLAYLISTS.map((playlist) => (
            <button key={playlist.title} type="button" className="flex w-full items-center gap-3 rounded-lg p-1 transition hover:bg-white/[0.04] group text-left" onClick={() => onSelectPlaylist(playlist.title)}>
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/[0.04]">
                <Image src={playlist.image} alt={playlist.title} fill sizes="44px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold text-white group-hover:text-[#ff7d63] transition">{playlist.title}</span>
                <span className="text-[10px] text-[#818a93]">{playlist.count} videos</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="mt-4 hidden h-10 w-full items-center justify-between rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-3.5 text-[11px] font-bold text-white/70 transition hover:bg-white/[0.03] hover:text-white lg:flex" onClick={onAddPlaylist}>
        <span className="flex items-center gap-1.5"><Plus size={13} /> Nueva playlist</span>
        <Plus size={12} className="opacity-40" />
      </button>
    </aside>
  );
}

// Topbar Header Row
function ProposalHeader({
  searchQuery,
  setSearchQuery,
  onViewChannel,
  onNotification,
  onProfileClick
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onViewChannel: () => void;
  onNotification: () => void;
  onProfileClick: () => void;
}) {
  return (
    <header className="relative z-30 grid gap-3 lg:grid-cols-[1fr_auto] items-center">
      {/* Page Title Label */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#818b95]">Creator Real</p>
        <h1 className="text-[20px] font-black tracking-tight text-[#f5f7fb]">Panel de administrador</h1>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        <button 
          type="button" 
          className="flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4.5 text-[12px] font-bold text-white transition hover:bg-white/[0.07]" 
          onClick={onViewChannel}
        >
          Ver mi canal
          <ArrowUpRight size={14} className="text-[#818b95]" />
        </button>
        
        <button 
          type="button" 
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.07]" 
          onClick={onNotification} 
        >
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff5a3d]" />
        </button>

        <button type="button" className="relative h-10 w-10 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.04]" onClick={onProfileClick}>
          <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="38px" className="object-cover" />
        </button>
      </div>
    </header>
  );
}

// Creator Bio Hero Widget Card
function CreatorBioHero() {
  return (
    <article className="relative min-h-[220px] overflow-hidden rounded-xl border border-white/[0.07] bg-[#050b10] shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col justify-end p-5 md:p-6">
      {/* Background mountains banner image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-70 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(180deg,rgba(4,9,14,0.15),rgba(4,9,14,0.95)),url('https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1200&q=80')" }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/[0.06] pb-4.5 mb-4">
        <div className="flex items-center gap-4">
          <span className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-[#04080d] shrink-0">
            <Image src="/creators/luisito-comunica.png" alt="BY PUPILA" fill sizes="64px" className="object-cover" />
            <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[#ff5a3d] border-2 border-[#04080d] flex items-center justify-center">
              <CheckCircle size={12} weight="fill" className="text-white" />
            </span>
          </span>
          <div>
            <h2 className="text-[19px] font-black text-white tracking-tight flex items-center gap-1.5">BY PUPILA</h2>
            <p className="text-[11px] text-[#cbd3dc] font-semibold mt-0.5">
              Creador de contenido <span className="opacity-40">|</span> Aventuras, Viajes y Naturaleza
            </p>
            <div className="mt-2.5 flex flex-wrap gap-4 text-[10px] text-[#818b95] font-bold">
              <span className="flex items-center gap-1"><MapPin size={12} /> Quito, Ecuador</span>
              <span className="flex items-center gap-1"><GlobeHemisphereWest size={12} /> youtube.com/@bypupila</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats summary row */}
      <div className="relative z-10 grid grid-cols-3 md:grid-cols-6 gap-4 text-center divide-x divide-white/[0.06]">
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">87</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Lugares</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">129</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Horas Vistas</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">15</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Países</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">8.4K</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Likes</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">12.6K</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Suscriptores</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-[16px] font-black leading-none text-white">2021</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Desde</p>
        </div>
      </div>
    </article>
  );
}

// General Performance Chart Widget (Line Chart SVG)
function PerformanceGeneralChart({ onAction }: { onAction: (msg: string) => void }) {
  const metrics = [
    { title: "Vistas", value: "125.4K", percentage: "+18.5%" },
    { title: "Horas vistas", value: "18.7K", percentage: "+24.7%" },
    { title: "Likes", value: "8.4K", percentage: "+14.3%" },
    { title: "Comentarios", value: "1.2K", percentage: "+12.1%" },
  ];

  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#050b10]/60 p-4 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[#818a93]">Rendimiento General</h3>
        <button 
          type="button" 
          className="flex h-7 items-center gap-1.5 rounded bg-white/[0.02] border border-white/5 px-2.5 text-[9px] font-bold text-slate-300"
          onClick={() => onAction("Filtro temporal cambiado.")}
        >
          Últimos 30 días
          <CaretDown size={10} />
        </button>
      </div>

      {/* Numbers row summary metrics */}
      <div className="grid grid-cols-4 gap-2 text-left">
        {metrics.map((m) => (
          <div key={m.title}>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{m.title}</p>
            <p className="text-[14px] font-black text-white mt-1 leading-none">{m.value}</p>
            <span className="text-[8px] font-extrabold text-[#6be596] block mt-1">{m.percentage}</span>
          </div>
        ))}
      </div>

      {/* SVG Custom High-Fidelity Glowing Line Chart */}
      <div className="relative h-[160px] w-full mt-2 select-none">
        <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5a3d" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ff5a3d" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

          {/* Area under the line */}
          <path
            d="M 10 160 C 50 150, 90 70, 130 110 C 170 140, 210 150, 250 90 C 290 30, 330 90, 370 110 C 410 130, 450 70, 490 50 L 490 170 L 10 170 Z"
            fill="url(#chartGradient)"
          />

          {/* The Stroke line */}
          <path
            d="M 10 160 C 50 150, 90 70, 130 110 C 170 140, 210 150, 250 90 C 290 30, 330 90, 370 110 C 410 130, 450 70, 490 50"
            fill="none"
            stroke="#ff5a3d"
            strokeWidth="2.5"
            filter="url(#glow-line)"
          />

          {/* Interactive peak circles */}
          <circle cx="130" cy="110" r="4" fill="white" stroke="#ff5a3d" strokeWidth="2" />
          <circle cx="290" cy="30" r="4" fill="white" stroke="#ff5a3d" strokeWidth="2" />
          <circle cx="450" cy="70" r="4" fill="white" stroke="#ff5a3d" strokeWidth="2" />
        </svg>

        {/* Eje X Labels */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-[8px] font-bold text-slate-500">
          <span>Abr 28</span>
          <span>May 5</span>
          <span>May 12</span>
          <span>May 19</span>
          <span>May 26</span>
        </div>
      </div>
    </article>
  );
}

// Activity World Map Hotspots Widget
function ActivityWorldHotspots({ onAction }: { onAction: (msg: string) => void }) {
  const mapHotspots = [
    { id: "h1", x: "22%", top: "38%" }, // North America
    { id: "h2", x: "30%", top: "72%" }, // South America
    { id: "h3", x: "50%", top: "35%" }, // Europe
    { id: "h4", x: "54%", top: "58%" }, // Africa
    { id: "h5", x: "64%", top: "25%" }, // Russia/Asia
    { id: "h6", x: "78%", top: "48%" }, // SE Asia/India
  ];

  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#050b10]/60 p-4 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[#818a93]">Mapa de Actividad</h3>
        <button 
          type="button" 
          className="flex h-7 items-center gap-1.5 rounded bg-white/[0.02] border border-white/5 px-2.5 text-[9px] font-bold text-slate-300"
          onClick={() => onAction("Filtro de mapa general cambiado.")}
        >
          Todos los tiempos
          <CaretDown size={10} />
        </button>
      </div>

      {/* Glowing World map box */}
      <div className="relative h-[160px] w-full rounded-lg bg-[#04080d]/80 overflow-hidden border border-white/[0.04]">
        {/* Abstract dark world map silhouette background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-[0.16] grayscale invert filter"
          style={{ backgroundImage: "url('/map-proposal-earth.jpg')" }}
        />
        
        {/* Dotted dark overlay for high-fidelity technical look */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:10px_10px]" />

        {/* Pulsing Hotspots dots */}
        {mapHotspots.map((spot) => (
          <div 
            key={spot.id} 
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: spot.x, top: spot.top }}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5a3d] opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5a3d] border border-white/20"></span>
            </span>
          </div>
        ))}
      </div>

      {/* Hotspots summary footer metrics */}
      <div className="grid grid-cols-3 gap-2 text-center mt-0.5">
        <div>
          <p className="font-mono text-[14px] font-black text-white leading-none">87</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Lugares Explorados</p>
        </div>
        <div className="border-l border-r border-white/[0.06]">
          <p className="font-mono text-[14px] font-black text-white leading-none">2</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Países Actuales</p>
        </div>
        <div>
          <p className="font-mono text-[14px] font-black text-white leading-none">6</p>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#818a93] mt-1.5">Próximos Destinos</p>
        </div>
      </div>
    </article>
  );
}

// Recente Videos Column Section
function RecentVideosSection({ onSelectVideo }: { onSelectVideo: (title: string) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-black uppercase tracking-wider text-white">Contenido Reciente</h3>
        <button type="button" className="text-[10px] font-bold text-[#cbd3dc] hover:text-white transition">Ver todos</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {RECENT_VIDEOS.map((video) => (
          <button 
            key={video.id} 
            type="button" 
            className="group relative h-[120px] w-[190px] shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] text-left hover:border-[#ff5a3d]/20 transition flex flex-col justify-end"
            onClick={() => onSelectVideo(video.title)}
          >
            {/* Image cover background */}
            <Image src={video.thumbnail} alt={video.title} fill sizes="190px" className="object-cover opacity-80 group-hover:scale-105 transition duration-300" />
            
            {/* Vignette cover gradient */}
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.85))]" />

            {/* Duration tag top right */}
            <span className="absolute top-2 right-2 rounded bg-black/40 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold text-slate-300">
              {video.duration}
            </span>

            {/* Footer data block */}
            <div className="absolute inset-x-0 bottom-0 p-3 z-10">
              <span className="line-clamp-1 text-[11px] font-black text-white group-hover:text-[#ff7d63] transition leading-tight">
                {video.title}
              </span>
              <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400 font-bold leading-none">
                <span>{video.location}</span>
                <span>{video.views} vistas • {video.time}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// Recent Activities horizontal timeline rail
function RecentActivities({ 
  logs, 
  onAction 
}: { 
  logs: typeof ACTIVITY_LOGS; 
  onAction: (msg: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[13px] font-black uppercase tracking-wider text-white">Actividad Reciente</h3>
      
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin select-none">
        {logs.map((log) => {
          const Icon = log.icon;
          return (
            <div 
              key={log.id} 
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#050b10]/60 shrink-0 w-[240px] hover:border-white/10 transition"
            >
              {/* Colored status indicator icon */}
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                log.color
              )}>
                <Icon size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black text-white leading-tight">{log.text}</p>
                <p className="truncate text-[10px] text-[#818a93] font-semibold mt-0.5 leading-normal">{log.detail}</p>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{log.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Right Rail Audiencia Donut Chart widget
function AudienceChart() {
  const regions = [
    { name: "Latinoamérica", percentage: "45%", color: "bg-blue-500", stroke: "#3b82f6", dasharray: "141 172" },
    { name: "Europa", percentage: "25%", color: "bg-purple-500", stroke: "#8b5cf6", dasharray: "78 235" },
    { name: "Norteamérica", percentage: "15%", color: "bg-cyan-500", stroke: "#06b6d4", dasharray: "47 266" },
    { name: "Asia", percentage: "10%", color: "bg-amber-500", stroke: "#f59e0b", dasharray: "31 282" },
    { name: "Otros", percentage: "5%", color: "bg-pink-500", stroke: "#ec4899", dasharray: "15 298" },
  ];

  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#050b10]/60 p-4 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93]">Audiencia</h3>
        <button type="button" className="flex h-7 items-center gap-1.5 rounded bg-white/[0.02] border border-white/5 px-2.5 text-[9px] font-bold text-slate-300">
          Últimos 30 días
          <CaretDown size={10} />
        </button>
      </div>

      <div className="flex items-center gap-4 justify-between">
        {/* SVG Donut Chart */}
        <div className="relative h-[110px] w-[110px] shrink-0 select-none flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle track */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="11" />
            
            {/* Ring segments */}
            {/* LatAm: 45% -> perimeter = 2 * PI * r = 2 * 3.14 * 50 = 314. Segment length = 0.45 * 314 = 141. Offset = 0 */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="11" strokeDasharray="141 314" strokeDashoffset="0" strokeLinecap="round" />
            {/* Europe: 25% -> length = 0.25 * 314 = 78. Offset = -141 */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="11" strokeDasharray="78 314" strokeDashoffset="-141" strokeLinecap="round" />
            {/* NA: 15% -> length = 0.15 * 314 = 47. Offset = -219 */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="#06b6d4" strokeWidth="11" strokeDasharray="47 314" strokeDashoffset="-219" strokeLinecap="round" />
            {/* Asia: 10% -> length = 31. Offset = -266 */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="11" strokeDasharray="31 314" strokeDashoffset="-266" strokeLinecap="round" />
            {/* Others: 5% -> length = 15. Offset = -297 */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ec4899" strokeWidth="11" strokeDasharray="15 314" strokeDashoffset="-297" strokeLinecap="round" />
          </svg>
          {/* Total centered counter */}
          <div className="absolute text-center flex flex-col items-center">
            <span className="text-[13px] font-black text-white leading-none">12.6K</span>
            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {regions.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 truncate text-slate-300">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 block", r.color)} />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="text-white shrink-0">{r.percentage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Relative metrics comparisons */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-bold">
        <span className="text-[#6be596] flex items-center gap-1">+18% <span className="text-slate-400 font-semibold uppercase tracking-wider">vs. período anterior</span></span>
        <span className="text-slate-200">78% Público masculino</span>
      </div>
    </article>
  );
}

// Right Rail Sponsors Box widget
function SponsorsWidget({ 
  onAddSponsor, 
  onAction 
}: { 
  onAddSponsor: () => void; 
  onAction: (msg: string) => void;
}) {
  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#050b10]/60 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93]">Mis Sponsors</h3>
        <button 
          type="button" 
          className="text-[10px] font-bold text-[#b9c1cb] hover:text-white transition"
          onClick={() => onAction("Gestor de sponsors abierto (Simulación).")}
        >
          Gestionar
        </button>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
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
              <span className="relative h-9.5 w-9.5 shrink-0 overflow-hidden block h-9 w-9">
                <BrandLogo />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black text-white group-hover:text-[#ff7d63] transition leading-tight">{sponsor.name}</p>
                <p className="truncate text-[9.5px] text-[#818a93] font-semibold leading-normal mt-0.5">{sponsor.desc}</p>
              </div>
              <button 
                type="button" 
                className="h-7.5 shrink-0 rounded-full border border-white/10 bg-white/[0.02] px-3 text-[9px] font-black text-white hover:bg-white/[0.07] hover:border-white/20 transition-all flex items-center h-7" 
                onClick={() => onAction(`Abriendo sponsor: ${sponsor.name}`)}
              >
                Ir al sitio
              </button>
            </div>
          );
        })}
      </div>

      <button 
        type="button" 
        className="mt-3 flex h-9.5 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-[10.5px] font-bold text-white/70 hover:bg-white/[0.03] hover:text-white transition h-9" 
        onClick={onAddSponsor}
      >
        <Plus size={13} />
        Añadir sponsor
      </button>
    </article>
  );
}

// Right Rail Donate CTA widget
function DonateWidget({ onPatron }: { onPatron: () => void }) {
  return (
    <article className="rounded-xl border border-[#ff5a3d]/15 bg-[radial-gradient(ellipse_at_top_right,rgba(255,90,61,0.06),transparent_60%)] bg-[#050b10]/60 p-4 shadow-sm">
      <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff937d]">Apoya mi contenido</h3>
      <p className="mt-2 text-[10.5px] leading-relaxed text-[#cbd3dc] font-semibold">Tu apoyo me permite seguir explorando.</p>
      
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
            <span key={idx} className="relative h-7.5 w-7.5 shrink-0 overflow-hidden rounded-full border-2 border-[#050b10] block h-7.5 w-7.5">
              <Image src={img} alt="Subscriber" fill sizes="28px" className="object-cover" />
            </span>
          ))}
        </div>
        <span className="ml-3 rounded-full border border-white/10 px-2 py-0.5 text-[8.5px] font-black text-[#cbd3dc] bg-white/[0.02]">
          +245
        </span>
      </div>

      <button 
        type="button" 
        className="mt-4 flex h-10.5 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6d4e_0%,#e03d1a_100%)] text-[11px] font-black text-white shadow-[0_12px_24px_-8px_rgba(224,61,26,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all h-10" 
        onClick={onPatron}
      >
        <Heart size={14} weight="fill" />
        Hazte patrocinador
      </button>
    </article>
  );
}

// Right Rail Upcoming Dates / Expeditions Calendar Widget
function UpcomingExpeditions({ onAction }: { onAction: (msg: string) => void }) {
  const dates = [
    {
      day: "15",
      month: "JUN",
      title: "Expedición a Patagonia",
      dateRange: "16 - 30 Junio, 2024",
      icon: Flag
    },
    {
      day: "05",
      month: "JUL",
      title: "Colaboración Wild Lens",
      dateRange: "Video especial",
      icon: Video
    }
  ];

  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#050b10]/60 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#818a93]">Próximas Fechas</h3>
        <button 
          type="button" 
          className="text-[10px] font-bold text-[#b9c1cb] hover:text-white transition"
          onClick={() => onAction("Calendario general abierto (Simulación).")}
        >
          Ver calendario
        </button>
      </div>

      <div className="space-y-3 mt-1 pr-0.5">
        {dates.map((d) => {
          const NodeIcon = d.icon;
          return (
            <div key={d.day} className="flex items-center gap-3.5 p-2 rounded-xl border border-white/[0.02] bg-white/[0.005] hover:bg-white/[0.03] transition group text-left">
              {/* Day Box */}
              <div className="flex flex-col items-center justify-center shrink-0 h-11 w-11 rounded-lg border border-white/[0.08] bg-[#04080c]/50 text-center font-mono">
                <span className="text-[14px] font-black text-white leading-none">{d.day}</span>
                <span className="text-[8px] font-extrabold text-[#ff7c65] uppercase tracking-wider mt-1 leading-none">{d.month}</span>
              </div>

              {/* Title & Description details */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-black text-white group-hover:text-[#ff7d63] transition leading-tight">{d.title}</p>
                <p className="truncate text-[10px] text-[#818a93] font-semibold mt-1 flex items-center gap-1 leading-none">
                  <NodeIcon size={12} className="text-[#ff5a3d]" />
                  {d.dateRange}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

// Notice banner notification bottom
function PrototypeNotice({ notice }: { notice: string }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(94vw,560px)] -translate-x-1/2 rounded-full border border-white/[0.08] bg-[#050b10]/92 px-5 py-2.5 text-center text-[10px] font-bold text-[#e1e7ee] shadow-[0_20px_60px_-16px_rgba(0,0,0,0.92)] backdrop-blur-2xl transition duration-500 animate-bounce">
      <span className="text-[#ff5a3d] mr-1.5">⚡ Admin:</span> {notice}
    </div>
  );
}
