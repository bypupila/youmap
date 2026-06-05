"use client";

import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import {
  BatteryCharging,
  BookmarkSimple,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock,
  Eye,
  MapPin,
  Star,
  Sliders,
  ShieldCheck,
  Compass,
  YoutubeLogo,
  Handshake,
  ArrowSquareOut,
  Tag,
  Gift,
  CreditCard,
  ForkKnife,
  CloudSun,
  Car,
  Train,
  Calculator,
  Suitcase,
} from "@phosphor-icons/react";
import { YouTubeEmbedPlayer } from "@/components/map/youtube-embed-player";
import {
  countryCodeToFlag,
  formatCompactNumber,
  formatVideoDate,
  formatVideoPlace,
  getYouTubeHref,
  getVideoCityLabel,
} from "@/components/map/video-viewer-utils";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DemoDisenoClientProps {
  videoLocations: TravelVideoLocation[];
}

export function DemoDisenoClient({ videoLocations }: DemoDisenoClientProps) {
  // Pre-filter a subset of videos to use as high-quality simulator samples
  const sampleVideos = videoLocations.slice(0, 8);
  const [currentVideo, setCurrentVideo] = useState<TravelVideoLocation>(sampleVideos[0] || videoLocations[0]);

  // Activity simulation states
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set([sampleVideos[0]?.youtube_video_id || ""]));
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set([sampleVideos[1]?.youtube_video_id || ""]));
  const [watchStatusById, setWatchStatusById] = useState<Record<string, "not_finished" | "watched" | "watch_later">>({
    [sampleVideos[0]?.youtube_video_id || ""]: "not_finished",
  });
  const [seenIds] = useState<Set<string>>(new Set());
  const [openedIds] = useState<Set<string>>(new Set());

  // Interactive drop-down menus
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);

  // States for the 3 new camouflaged sponsor variations
  const [sponsorCamouflageMode, setSponsorCamouflageMode] = useState<"base" | "budget" | "food" | "transit">("base");
  const [travelDays, setTravelDays] = useState<number>(5);
  const [activeDishIndex, setActiveDishIndex] = useState<number>(0);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({
    sunglasses: true,
    shoes: true,
    plug: false,
    insurance: false,
  });

  // Sync state between controls
  const isSaved = savedIds.has(currentVideo.youtube_video_id);
  const isFeatured = featuredIds.has(currentVideo.youtube_video_id);
  const watchStatus = watchStatusById[currentVideo.youtube_video_id] || "not_finished";

  // Simulate activity controller functions
  const activity = {
    seenIds,
    openedIds,
    savedIds,
    featuredIds,
    watchStatusById,
    toggleVideoSaved: (videoId: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        return next;
      });
    },
    toggleVideoFeatured: (videoId: string) => {
      setFeaturedIds((prev) => {
        const next = new Set(prev);
        if (next.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        return next;
      });
    },
    setVideoWatchStatus: (videoId: string, status: "not_finished" | "watched" | "watch_later") => {
      setWatchStatusById((prev) => ({
        ...prev,
        [videoId]: status,
      }));
    },
    markVideoOpened: (videoId: string) => {
      console.log("Mock Opened in YouTube:", videoId);
    },
  };

  const currentIndex = sampleVideos.findIndex(
    (v) => v.youtube_video_id === currentVideo.youtube_video_id
  );

  function go(direction: -1 | 1) {
    if (sampleVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + sampleVideos.length) % sampleVideos.length;
    setCurrentVideo(sampleVideos[nextIndex]);
  }

  function handleDemoCta(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
  }

  async function handleCopyServiceCoupon(serviceId: string, code: string) {
    setCopiedServiceId(serviceId);

    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Demo-only feedback should still work if clipboard permissions are blocked.
    }

    window.setTimeout(() => {
      setCopiedServiceId(null);
    }, 2000);
  }

  // Auto close menus on video change
  useEffect(() => {
    setMenuOpenId(null);
    setCopiedServiceId(null);
  }, [currentVideo.youtube_video_id]);

  const youtubeHref = getYouTubeHref(currentVideo);
  const destinationCity = getVideoCityLabel(currentVideo);
  const destinationName = destinationCity || currentVideo.country_name || currentVideo.country_code || "este destino";
  const destinationRoute = formatVideoPlace(currentVideo);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden p-6 md:p-12 font-sans selection:bg-red-500/30 selection:text-white">
      {/* Background simulated high-end map */}
      <div className="absolute inset-0 z-0 bg-[#03070c]">
        {/* Glowing grid grid lines */}
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* Glow of Earth / sphere */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(20,55,100,0.15),transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-20 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03),transparent_60%)] blur-3xl pointer-events-none" />

        {/* Mock map features (countries, markers) */}
        <div className="absolute top-[20%] left-[15%] w-3 h-3 rounded-full bg-blue-500/40 animate-ping" />
        <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-blue-400" />
        <div className="absolute top-[45%] left-[65%] w-2 h-2 rounded-full bg-red-500/40 animate-pulse" />
        <div className="absolute top-[45%] left-[65%] w-1.5 h-1.5 rounded-full bg-red-500" />
        <div className="absolute top-[70%] left-[30%] w-2 h-2 rounded-full bg-yellow-500/30" />
        <div className="absolute top-[70%] left-[30%] w-1.5 h-1.5 rounded-full bg-yellow-500/80" />

        {/* Abstract connector lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 250 200 Q 500 250 850 400" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 5" />
          <path d="M 850 400 Q 600 600 400 650" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Elegant top header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 border border-red-500/20">
                Diseño & UI Lab
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 text-xs">Propuesta de Visualización</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Estudio de Tarjetas de Video
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-xl leading-relaxed">
              3 propuestas de diseño conceptuales y premium para el componente <code className="text-red-400 text-xs bg-red-950/20 px-1 py-0.5 rounded">DesktopVideoMapCard</code>.
              Todas respetan de forma estricta las directrices de YouTube (sin elementos interactivos superpuestos ni branding tapado).
            </p>
          </div>

          {/* Simulator state toggles widget */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-[#070e17]/80 p-3.5 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mr-2">
              <Sliders size={15} className="text-red-500" />
              <span>SIMULADOR:</span>
            </div>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Video Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Destino Seleccionado</label>
              <select
                value={currentVideo.youtube_video_id}
                onChange={(e) => {
                  const video = sampleVideos.find((v) => v.youtube_video_id === e.target.value);
                  if (video) setCurrentVideo(video);
                }}
                className="h-8 rounded bg-zinc-900 border border-white/10 px-2 text-xs font-semibold text-white focus:outline-none focus:border-red-500 transition-colors"
              >
                {sampleVideos.map((video, idx) => (
                  <option key={video.youtube_video_id} value={video.youtube_video_id}>
                    {idx + 1}. {video.country_name || video.country_code} - {video.title.substring(0, 22)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Save Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Estado</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                  className={cn(
                    "h-8 px-2.5 rounded text-xs font-semibold flex items-center gap-1 transition-all border",
                    isSaved
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "bg-zinc-900 text-zinc-400 border-white/10 hover:bg-zinc-800"
                  )}
                >
                  <BookmarkSimple size={12} weight={isSaved ? "fill" : "regular"} />
                  {isSaved ? "Guardado" : "Guardar"}
                </button>

                <button
                  onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                  className={cn(
                    "h-8 px-2.5 rounded text-xs font-semibold flex items-center gap-1 transition-all border",
                    isFeatured
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                      : "bg-zinc-900 text-zinc-400 border-white/10 hover:bg-zinc-800"
                  )}
                >
                  <Star size={12} weight={isFeatured ? "fill" : "regular"} />
                  {isFeatured ? "Destacado" : "Destacar"}
                </button>
              </div>
            </div>

            {/* Watch status dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Avance</label>
              <select
                value={watchStatus}
                onChange={(e) =>
                  activity.setVideoWatchStatus(
                    currentVideo.youtube_video_id,
                    e.target.value as "not_finished" | "watched" | "watch_later"
                  )
                }
                className="h-8 rounded bg-zinc-900 border border-white/10 px-2 text-xs font-semibold text-white focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="not_finished">INICIADO</option>
                <option value="watched">COMPLETADO</option>
                <option value="watch_later">VER MÁS TARDE</option>
              </select>
            </div>
          </div>
        </header>

        {/* Comparison Showcase Deck - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ========================================================================= */}
          {/* PROPUESTA 1: YOUTUBE THEATER */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                  YOUTUBE THEATER
                </span>
              </div>
              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                Cinema Dark Matte
              </span>
            </div>

            {/* Proposal Card 1 UI Component */}
            <article className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-red-500/20 hover:shadow-[0_20px_50px_rgba(239,68,68,0.04)]">
              {/* Diffuse subtle red background glow */}
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.04),transparent_60%)] pointer-events-none" />

              {/* Theater-mode premium header */}
              <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <h2 className="truncate text-sm font-extrabold text-white leading-none font-sans group-hover:text-red-400 transition-colors">
                      {currentVideo.title}
                    </h2>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <span className="text-white bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>•</span>
                    <span>Video {currentIndex + 1} de {sampleVideos.length}</span>
                  </p>
                </div>

                {/* Secondary controls compact */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isSaved
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                    title={isSaved ? "Quitar de guardados" : "Guardar video"}
                  >
                    <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isFeatured
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                    title={isFeatured ? "Quitar destacado" : "Destacar video"}
                  >
                    <Star size={14} weight={isFeatured ? "fill" : "regular"} />
                  </button>
                </div>
              </header>

              {/* Seamless Cinema screen slot (No borders, immersive embed) */}
              <div className="px-4 pb-2">
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir en YouTube"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>
              </div>

              {/* Theater Control Deck (Anterior / Siguiente, Watch Status) */}
              <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0c0c0c]/85">
                <div className="grid grid-cols-3 items-center gap-2">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-red-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-95"
                  >
                    <CaretLeft size={13} weight="bold" />
                    ANTERIOR
                  </button>

                  {/* Status toggle styled as active cinema badge */}
                  <div className="relative justify-self-center">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p1" ? null : "p1")}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded px-2.5 text-[9px] font-black tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : "border-red-500/20 bg-red-500/5 text-red-400"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={10} />
                    </button>

                    {menuOpenId === "p1" && (
                      <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-red-500 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-red-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-95"
                  >
                    SIGUIENTE
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>

                {/* Minimal meta stats row */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.03] pt-2.5">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[120px]">
                    <MapPin size={11} className="text-red-500" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} vistas
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatVideoDate(currentVideo.published_at)}
                  </span>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA 2: GLASSMORPHIC BENTO HUD */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-black text-white">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                  GLASSMORPHIC BENTO HUD
                </span>
              </div>
              <span className="text-[10px] font-medium text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
                Aero Glass Grid
              </span>
            </div>

            {/* Proposal Card 2 UI Component */}
            <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#081220]/45 backdrop-blur-2xl text-sm text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] transition-all duration-500 hover:border-cyan-500/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.06)]">
              {/* Dynamic reactive radial glow */}
              <div className={cn(
                "absolute -left-20 -bottom-20 w-52 h-52 rounded-full blur-[60px] opacity-15 pointer-events-none transition-all duration-700",
                watchStatus === "watched"
                  ? "bg-emerald-500"
                  : isSaved
                    ? "bg-rose-500"
                    : "bg-cyan-500"
              )} />

              <div className="p-4 space-y-3.5">
                {/* Floating pill-styled header widget */}
                <div className="flex items-center justify-between gap-2 bg-white/[0.03] border border-white/[0.05] p-2 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none shrink-0">
                      {countryCodeToFlag(currentVideo.country_code)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase tracking-wider text-cyan-400">
                        {currentVideo.country_name || currentVideo.country_code}
                      </p>
                      <p className="text-[9px] text-zinc-400 font-semibold tracking-wide">
                        Destino #{currentIndex + 1} de {sampleVideos.length}
                      </p>
                    </div>
                  </div>

                  {/* Translucent glassy control group */}
                  <div className="flex items-center gap-1 bg-black/35 rounded-lg p-0.5 border border-white/5">
                    <button
                      onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-6.5 w-6.5 items-center justify-center rounded transition-all",
                        isSaved ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      <BookmarkSimple size={12} weight={isSaved ? "fill" : "regular"} />
                    </button>
                    <button
                      onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-6.5 w-6.5 items-center justify-center rounded transition-all",
                        isFeatured ? "bg-yellow-500/20 text-yellow-400" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      <Star size={12} weight={isFeatured ? "fill" : "regular"} />
                    </button>
                  </div>
                </div>

                {/* Main title box with modern glass tag */}
                <div className="space-y-1">
                  <h2 className="text-[13px] font-bold leading-tight text-white/95 group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {currentVideo.title}
                  </h2>
                </div>

                {/* Floating screen slot */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 shadow-inner">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir Video"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* Bento Widgets - Grid of glass capsules below */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Capsule 1: Place */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2 flex flex-col justify-center min-w-0 transition-all hover:bg-white/[0.05]">
                    <span className="text-[9px] font-bold text-cyan-400/80 uppercase flex items-center gap-0.5 truncate">
                      <MapPin size={9} />
                      Ubicación
                    </span>
                    <span className="text-[10px] font-medium text-white truncate mt-0.5">
                      {getVideoCityLabel(currentVideo) || currentVideo.country_name || "Mapeado"}
                    </span>
                  </div>

                  {/* Capsule 2: Views */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2 flex flex-col justify-center min-w-0 transition-all hover:bg-white/[0.05]">
                    <span className="text-[9px] font-bold text-cyan-400/80 uppercase flex items-center gap-0.5">
                      <Eye size={9} />
                      Vistas
                    </span>
                    <span className="text-[10px] font-medium text-white mt-0.5">
                      {formatCompactNumber(Number(currentVideo.view_count || 0))}
                    </span>
                  </div>

                  {/* Capsule 3: Date */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2 flex flex-col justify-center min-w-0 transition-all hover:bg-white/[0.05]">
                    <span className="text-[9px] font-bold text-cyan-400/80 uppercase flex items-center gap-0.5">
                      <Clock size={9} />
                      Fecha
                    </span>
                    <span className="text-[10px] font-medium text-white mt-0.5 truncate">
                      {formatVideoDate(currentVideo.published_at)}
                    </span>
                  </div>
                </div>

                {/* Glass capsule control center */}
                <div className="bg-white/[0.03] border border-white/[0.05] p-1.5 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 hover:bg-cyan-500/10 text-white/80 hover:text-cyan-400 border border-white/5 transition-all active:scale-95"
                    title="Anterior"
                  >
                    <CaretLeft size={13} weight="bold" />
                  </button>

                  {/* Watch Status Capsule Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p2" ? null : "p2")}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-lg px-3 text-[9px] font-black uppercase tracking-wider transition-all",
                        watchStatus === "watched"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      )}
                    >
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        watchStatus === "watched" ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"
                      )} />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={9} />
                    </button>

                    {menuOpenId === "p2" && (
                      <div className="absolute left-1/2 bottom-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1221] p-1 shadow-2xl backdrop-blur-3xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-cyan-400 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 hover:bg-cyan-500/10 text-white/80 hover:text-cyan-400 border border-white/5 transition-all active:scale-95"
                    title="Siguiente"
                  >
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA 3: CREATOR COMMAND STUDIO */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white">
                  3
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                  CREATOR COMMAND STUDIO
                </span>
              </div>
              <span className="text-[10px] font-medium text-amber-500 bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded">
                Production Console
              </span>
            </div>

            {/* Proposal Card 3 UI Component */}
            <article className="group relative overflow-hidden rounded-lg border border-[#1b253b] bg-[#0a0d14] text-sm text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-amber-500/20 hover:shadow-[0_20px_40px_rgba(245,158,11,0.03)]">
              {/* Top technical stats bar */}
              <div className="flex items-center justify-between px-3 py-1 bg-[#10141f] border-b border-[#1b253b] text-[9px] font-mono tracking-widest text-zinc-500 font-semibold select-none">
                <span className="flex items-center gap-1 text-cyan-400">
                  <ShieldCheck size={10} />
                  [VERIFIED RECORD]
                </span>
                <span>GEO-PRECISION: COUNTRY</span>
                <span className="text-amber-500">CONF_SCORE: 96%</span>
              </div>

              <div className="p-4.5 space-y-3.5">
                {/* Clean video title block */}
                <div>
                  <h2 className="text-xs font-bold font-mono tracking-wide text-zinc-200 line-clamp-1 uppercase group-hover:text-amber-400 transition-colors">
                    {currentVideo.title}
                  </h2>
                  <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase">
                    ID: {currentVideo.youtube_video_id} · CH_HANDLE: @luisitocomunica
                  </p>
                </div>

                {/* Edit monitor embed player (Classic dark bevel panel wrapper) */}
                <div className="relative p-1 rounded bg-[#07090e] border border-[#1a2133] shadow-inner">
                  {/* Mock recording tally light indicator */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/85 px-1.5 py-0.5 rounded-sm border border-white/5 text-[7px] font-mono font-bold text-red-500 tracking-wider">
                    <span className="h-1 w-1 bg-red-600 rounded-full animate-ping" />
                    <span>REC PLAYBACK</span>
                  </div>

                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Scrube on YT"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* Tech Dashboard parameters metadata layout */}
                <div className="border border-[#182136] bg-[#0c101a] rounded p-2.5 space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">GEOLOCATION:</span>
                    <span className="text-zinc-300 font-bold tracking-tight">{formatVideoPlace(currentVideo)}</span>
                  </div>
                  <div className="h-px bg-[#182136] w-full" />
                  <div className="flex justify-between">
                    <span className="text-zinc-500">TOTAL_VIEWS:</span>
                    <span className="text-amber-400 font-bold">
                      {Number(currentVideo.view_count || 0).toLocaleString("es-ES")} HITS
                    </span>
                  </div>
                  <div className="h-px bg-[#182136] w-full" />
                  <div className="flex justify-between">
                    <span className="text-zinc-500">INGEST_DATE:</span>
                    <span className="text-zinc-300 font-bold">{formatVideoDate(currentVideo.published_at)}</span>
                  </div>
                </div>

                {/* Action status machine row */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "h-8 rounded border flex items-center justify-center gap-1.5 transition-all uppercase font-bold",
                      isSaved
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-[#07090e] border-[#182136] text-zinc-500 hover:text-white"
                    )}
                  >
                    <BookmarkSimple size={12} weight={isSaved ? "fill" : "regular"} />
                    <span>SAVE_STAT: {isSaved ? "SYNC" : "NULL"}</span>
                  </button>

                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "h-8 rounded border flex items-center justify-center gap-1.5 transition-all uppercase font-bold",
                      isFeatured
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        : "bg-[#07090e] border-[#182136] text-zinc-500 hover:text-white"
                    )}
                  >
                    <Star size={12} weight={isFeatured ? "fill" : "regular"} />
                    <span>FAV_MODE: {isFeatured ? "TRUE" : "FALSE"}</span>
                  </button>
                </div>

                {/* Control Center Panel */}
                <div className="flex items-center justify-between gap-1.5 border-t border-[#1b253b] pt-3 font-mono">
                  <div className="flex gap-1">
                    <button
                      onClick={() => go(-1)}
                      className="h-7 w-7 rounded bg-[#10141f] border border-[#1b253b] flex items-center justify-center text-zinc-400 hover:text-amber-500 transition-colors active:scale-95"
                      title="Back Video"
                    >
                      <CaretLeft size={13} weight="bold" />
                    </button>
                    <button
                      onClick={() => go(1)}
                      className="h-7 w-7 rounded bg-[#10141f] border border-[#1b253b] flex items-center justify-center text-zinc-400 hover:text-amber-500 transition-colors active:scale-95"
                      title="Next Video"
                    >
                      <CaretRight size={13} weight="bold" />
                    </button>
                  </div>

                  {/* Render Status Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p3" ? null : "p3")}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 px-2.5 rounded text-[9px] uppercase font-bold tracking-widest transition-all",
                        watchStatus === "watched"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}
                    >
                      <span>STATUS: {watchStatus === "watched" ? "COMPLETED" : "INGESTED"}</span>
                      <CaretDown size={9} />
                    </button>

                    {menuOpenId === "p3" && (
                      <div className="absolute right-0 bottom-[calc(100%+6px)] z-20 min-w-[130px] overflow-hidden rounded border border-[#1b253b] bg-[#07090e] p-1 shadow-2xl text-[9px] font-mono">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-amber-500 hover:bg-[#10141f]"
                        >
                          INGESTED (INICIADO)
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-emerald-500 hover:bg-[#10141f]"
                        >
                          COMPLETED (COMPLETADO)
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-white hover:bg-[#10141f]"
                        >
                          QUEUE (VER MÁS TARDE)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TITULO Y DIVISION DE LAS NUEVAS VARIACIONES */}
        {/* ========================================================================= */}
        <div className="mt-20 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-500 border border-red-500/20">
              Estudio Avanzado
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Variaciones de YouTube Theater (Opción 1)</span>
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Variaciones del Concepto YouTube Theater
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Tres refinamientos visuales adicionales basados en la estética ganadora de <strong>YouTube Theater</strong>.
            Exploran matices alternativos de ambientación, ergonomía de controles y flujos interactivos de alto impacto visual.
          </p>
        </div>

        {/* Second Grid - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-16">

          {/* ========================================================================= */}
          {/* VARIACIÓN 1A: YOUTUBE THEATER "NOIR CYBER" */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] font-black text-white font-mono">
                  1A
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff3333] font-mono">
                  YT NOIR CYBER
                </span>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/5 font-mono">
                [2160p HDR]
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-lg border border-red-950/40 bg-[#030303] text-sm text-zinc-300 shadow-[0_25px_80px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-red-600/35 hover:shadow-[0_15px_40px_rgba(255,0,0,0.03)]">
              {/* Top status bar with cybernetic stats */}
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0a0a0a] border-b border-white/[0.04] text-[8px] font-mono tracking-widest text-zinc-500 select-none">
                <span className="flex items-center gap-1.5 text-red-500 font-extrabold">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  LIVE MONITOR
                </span>
                <span>CODEC: VP09</span>
                <span className="text-zinc-400">AUDIO: OPUS (251)</span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* Header with Title and Cyber Tags */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xs font-black font-mono tracking-wide text-white uppercase group-hover:text-red-500 transition-colors leading-relaxed line-clamp-2">
                      {currentVideo.title}
                    </h3>

                    <span className="shrink-0 flex items-center justify-center gap-1 text-[9px] font-bold text-red-500 bg-red-950/20 border border-red-500/30 px-2 py-0.5 rounded">
                      <YoutubeLogo size={11} weight="fill" />
                      YT
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-mono text-zinc-500">
                    <span className="text-zinc-400 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>·</span>
                    <span>TALLY_ID: {currentVideo.youtube_video_id.substring(0, 6)}</span>
                  </div>
                </div>

                {/* Cyber Embossed Screen Slot */}
                <div className="relative p-1 rounded-sm bg-[#0a0a0a] border border-red-950/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="TELEMETRY LAUNCH"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* Tech Dashboard row */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "h-8 rounded-sm border flex items-center justify-center gap-2 transition-all font-bold",
                      isSaved
                        ? "bg-red-500/10 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                        : "bg-[#0a0a0a] border-white/[0.04] text-zinc-500 hover:text-white"
                    )}
                  >
                    <BookmarkSimple size={12} weight={isSaved ? "fill" : "regular"} />
                    <span>SYS_SAVE: {isSaved ? "TRUE" : "NULL"}</span>
                  </button>

                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "h-8 rounded-sm border flex items-center justify-center gap-2 transition-all font-bold",
                      isFeatured
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                        : "bg-[#0a0a0a] border-white/[0.04] text-zinc-500 hover:text-white"
                    )}
                  >
                    <Star size={12} weight={isFeatured ? "fill" : "regular"} />
                    <span>SYS_FAV: {isFeatured ? "TRUE" : "FALSE"}</span>
                  </button>
                </div>

                {/* Cyber Controller Row */}
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] pt-3 font-mono">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => go(-1)}
                      className="h-7 px-2.5 rounded-sm bg-[#0c0c0c] border border-white/[0.05] flex items-center gap-1 text-[9px] font-bold text-zinc-400 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                      title="Back Video"
                    >
                      <CaretLeft size={11} weight="bold" />
                      PREV
                    </button>
                    <button
                      onClick={() => go(1)}
                      className="h-7 px-2.5 rounded-sm bg-[#0c0c0c] border border-white/[0.05] flex items-center gap-1 text-[9px] font-bold text-zinc-400 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                      title="Next Video"
                    >
                      NEXT
                      <CaretRight size={11} weight="bold" />
                    </button>
                  </div>

                  {/* Status telemetry dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "v1" ? null : "v1")}
                      className={cn(
                        "inline-flex h-7 items-center gap-1.5 px-2.5 rounded-sm text-[9px] font-extrabold tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      <span>{watchStatus === "watched" ? "COMPLETED" : "INGESTED"}</span>
                      <CaretDown size={9} />
                    </button>

                    {menuOpenId === "v1" && (
                      <div className="absolute right-0 bottom-[calc(100%+6px)] z-20 min-w-[130px] overflow-hidden rounded-sm border border-red-950/60 bg-[#030303] p-1 shadow-2xl text-[9px] font-mono">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-sm px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-red-500 hover:bg-white/[0.02]"
                        >
                          INGESTED (INICIADO)
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-sm px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                        >
                          COMPLETED (COMPLETADO)
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-sm px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          QUEUE (VER MÁS TARDE)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Minimal Telemetry Metadata Footer */}
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t border-white/[0.03] pt-2.5">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[100px]">
                    <MapPin size={10} className="text-red-500" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span>|</span>
                  <span>VIEWS: {formatCompactNumber(Number(currentVideo.view_count || 0))}</span>
                  <span>|</span>
                  <span>PUBLISHED: {formatVideoDate(currentVideo.published_at)}</span>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* VARIACIÓN 1B: YOUTUBE THEATER "AMBIENT GLOW" */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                  1B
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                  YT AMBIENT GLOW
                </span>
              </div>
              <span className="text-[10px] font-medium text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 px-2 py-0.5 rounded">
                Dynamic Backlight
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c080d] text-sm text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] transition-all duration-500 hover:border-red-500/25">
              {/* Immense dynamic radial glow matching the cinematic aesthetic */}
              <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),rgba(99,102,241,0.06),transparent_60%)] blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),rgba(239,68,68,0.04),transparent_60%)] blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />

              <div className="p-4 space-y-4 relative z-10">
                {/* Immersive banner header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none shrink-0" title="Flag">
                      {countryCodeToFlag(currentVideo.country_code)}
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-extrabold uppercase tracking-widest text-[#ff4d4d]">
                        {currentVideo.country_name || currentVideo.country_code}
                      </h4>
                      <p className="text-[9px] text-zinc-400 font-semibold">
                        Cinema Ambient Slot
                      </p>
                    </div>
                  </div>

                  {/* Glassy action pills */}
                  <div className="flex items-center gap-1 bg-white/[0.03] rounded-full p-0.5 border border-white/[0.05]">
                    <button
                      onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                        isSaved ? "bg-red-500/20 text-red-400" : "text-zinc-500 hover:text-white"
                      )}
                      title="Guardar"
                    >
                      <BookmarkSimple size={11} weight={isSaved ? "fill" : "regular"} />
                    </button>
                    <button
                      onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                        isFeatured ? "bg-yellow-500/20 text-yellow-400" : "text-zinc-500 hover:text-white"
                      )}
                      title="Destacar"
                    >
                      <Star size={11} weight={isFeatured ? "fill" : "regular"} />
                    </button>
                  </div>
                </div>

                {/* Cinematic Title */}
                <h3 className="text-xs font-extrabold leading-snug text-white/95 group-hover:text-red-400 transition-colors line-clamp-1">
                  {currentVideo.title}
                </h3>

                {/* Floating soft-beveled embed video screen */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/80 shadow-2xl">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="AMBILIGHT PLAYER"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* Ambient information stats box */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[100px]">
                    <MapPin size={11} className="text-indigo-400" />
                    <span className="truncate text-zinc-300">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[9px] bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded-full font-mono text-[#aa9df3]">
                    <Eye size={10} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} VISTAS
                  </span>
                </div>

                {/* Modern Pill Navigation and Dropdowns */}
                <div className="bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-xl flex items-center justify-between gap-2">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 hover:bg-red-500/10 text-white/80 hover:text-red-400 border border-white/5 transition-all active:scale-95"
                  >
                    <CaretLeft size={13} weight="bold" />
                  </button>

                  {/* Glow Status Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "v2" ? null : "v2")}
                      className={cn(
                        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[9px] font-black uppercase tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        watchStatus === "watched" ? "bg-emerald-400 animate-pulse" : "bg-red-500"
                      )} />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={9} />
                    </button>

                    {menuOpenId === "v2" && (
                      <div className="absolute left-1/2 bottom-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c080d] p-1 shadow-2xl backdrop-blur-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-red-400 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 hover:bg-red-500/10 text-white/80 hover:text-red-400 border border-white/5 transition-all active:scale-95"
                  >
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* VARIACIÓN 1C: YOUTUBE THEATER "MINIMALIST SLATE FLUSH" */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200 text-[10px] font-black text-black">
                  1C
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  YT MINIMALIST SLATE
                </span>
              </div>
              <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/40 px-2 py-0.5 rounded">
                Flush Screen
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#09090b] text-sm text-zinc-300 shadow-[0_30px_90px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
              {/* Immersive borderless player flush to the edges */}
              <div className="relative overflow-hidden bg-black aspect-video w-full">
                <YouTubeEmbedPlayer
                  videoId={currentVideo.youtube_video_id}
                  title={currentVideo.title}
                  youtubeHref={youtubeHref}
                  thumbnailUrl={currentVideo.thumbnail_url}
                  openButtonLabel="WATCH ON YT"
                  isMadeForKids={Boolean(currentVideo.made_for_kids)}
                />
              </div>

              <div className="p-4 space-y-3.5">
                {/* Title & country line */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
                      <span className="h-1 w-1 bg-red-600 rounded-full" />
                      THEATER MINIMAL
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 leading-snug">
                    {currentVideo.title}
                  </h3>
                </div>

                {/* Minimal divider */}
                <div className="h-px bg-white/[0.04] w-full" />

                {/* Refined compact parameters */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[110px]">
                    <MapPin size={11} className="text-zinc-400" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} Vistas
                  </span>
                </div>

                {/* Compact, transparent actions deck */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.03]">
                  <div className="flex gap-1">
                    <button
                      onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-7.5 w-7.5 items-center justify-center rounded border transition-all active:scale-95",
                        isSaved
                          ? "border-red-500/20 bg-red-500/5 text-red-500"
                          : "border-white/5 bg-white/[0.01] text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                      )}
                      title="Guardar"
                    >
                      <BookmarkSimple size={13} weight={isSaved ? "fill" : "regular"} />
                    </button>
                    <button
                      onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-7.5 w-7.5 items-center justify-center rounded border transition-all active:scale-95",
                        isFeatured
                          ? "border-red-500/20 bg-red-500/5 text-red-500"
                          : "border-white/5 bg-white/[0.01] text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                      )}
                      title="Destacar"
                    >
                      <Star size={13} weight={isFeatured ? "fill" : "regular"} />
                    </button>
                  </div>

                  {/* Clean controller and status */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => go(-1)}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded bg-[#121214] hover:bg-red-500/10 hover:text-red-400 border border-white/5 transition-all text-zinc-400 active:scale-95"
                      title="Anterior"
                    >
                      <CaretLeft size={12} weight="bold" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === "v3" ? null : "v3")}
                        className={cn(
                          "inline-flex h-7.5 items-center gap-1 rounded px-2.5 text-[9px] font-extrabold tracking-wider transition-all border",
                          watchStatus === "watched"
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                            : "border-red-500/20 bg-red-500/5 text-red-400"
                        )}
                      >
                        {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                        <CaretDown size={9} />
                      </button>

                      {menuOpenId === "v3" && (
                        <div className="absolute right-0 bottom-[calc(100%+6px)] z-20 min-w-[130px] overflow-hidden rounded border border-white/[0.08] bg-[#09090b] p-1 shadow-2xl text-[9px]">
                          <button
                            onClick={() => {
                              activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                              setMenuOpenId(null);
                            }}
                            className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-red-500 hover:bg-white/[0.02]"
                          >
                            INICIADO
                          </button>
                          <button
                            onClick={() => {
                              activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                              setMenuOpenId(null);
                            }}
                            className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                          >
                            COMPLETADO
                          </button>
                          <button
                            onClick={() => {
                              activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                              setMenuOpenId(null);
                            }}
                            className="block w-full rounded px-2 py-1.5 text-left font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                          >
                            VER MÁS TARDE
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => go(1)}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded bg-[#121214] hover:bg-red-500/10 hover:text-red-400 border border-white/5 transition-all text-zinc-400 active:scale-95"
                      title="Siguiente"
                    >
                      <CaretRight size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TITULO Y DIVISION DE LA SERIE MAESTRA (ULTRA-PREMIUM) */}
        {/* ========================================================================= */}
        <div className="mt-24 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              Masterpiece Series
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Conceptos Visionarios Ultra-Premium</span>
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-white to-zinc-400 bg-clip-text text-transparent">
            El Futuro de la Interfaz
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Tres exploraciones radicales de diseño que rompen los moldes tradicionales. Desde la emulación de hardware físico de ultra-lujo (Neumorfismo de Titanio), pasando por cristal holográfico reactivo, hasta un diseño brutalista y editorial de precisión suiza.
          </p>
        </div>

        {/* Third Grid - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-16">

          {/* ========================================================================= */}
          {/* MASTERPIECE 1: NEUMORPHIC TITANIUM (HARDWARE EMULATION) */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-zinc-400 to-zinc-600 text-[10px] font-black text-black shadow-inner">
                  M1
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  NEUMORPHIC TITANIUM
                </span>
              </div>
              <span className="text-[9px] font-bold text-amber-500 tracking-wider">
                HARDWARE UI
              </span>
            </div>

            {/* Hardware body: metallic gradient, physical drop shadow, inset highlight */}
            <article className="group relative rounded-xl border-t border-l border-white/10 border-b-black/60 border-r-black/60 bg-gradient-to-br from-[#24262b] to-[#151619] p-1.5 shadow-[15px_15px_30px_rgba(0,0,0,0.8),-5px_-5px_15px_rgba(255,255,255,0.02)] transition-all">
              <div className="rounded-lg bg-[#1a1c20] p-4 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]">

                {/* Physical Top Panel */}
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-black/40 pb-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                  <div>
                    <h3 className="text-[13px] font-black tracking-wide text-zinc-200 line-clamp-2 drop-shadow-md">
                      {currentVideo.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                      <span className="flex items-center gap-1 bg-[#111215] px-2 py-0.5 rounded shadow-inner border border-black/50">
                        <MapPin size={10} className="text-amber-500" />
                        {currentVideo.country_name || currentVideo.country_code}
                      </span>
                      <span>{formatVideoDate(currentVideo.published_at)}</span>
                    </div>
                  </div>

                  {/* Tally Light LED */}
                  <div className="flex flex-col items-center gap-1 shrink-0 bg-[#111215] p-1.5 rounded-md shadow-inner border border-black/50">
                    <div className={cn(
                      "h-2.5 w-2.5 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] transition-colors duration-500",
                      watchStatus === "watched" ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" :
                      watchStatus === "not_finished" ? "bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-pulse" :
                      "bg-red-500 shadow-[0_0_10px_#ef4444]"
                    )} />
                    <span className="text-[7px] font-black text-zinc-600">PWR</span>
                  </div>
                </div>

                {/* Recessed Screen Slot */}
                <div className="relative overflow-hidden rounded-md bg-black shadow-[inset_0_4px_15px_rgba(0,0,0,1)] border-t border-l border-black border-b-white/10 border-r-white/5 p-1">
                  <div className="rounded overflow-hidden">
                    <YouTubeEmbedPlayer
                      videoId={currentVideo.youtube_video_id}
                      title={currentVideo.title}
                      youtubeHref={youtubeHref}
                      thumbnailUrl={currentVideo.thumbnail_url}
                      openButtonLabel="DISPLAY"
                      isMadeForKids={Boolean(currentVideo.made_for_kids)}
                    />
                  </div>
                </div>

                {/* Physical Knobs/Buttons Section */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {/* Views readout screen */}
                  <div className="col-span-2 flex flex-col justify-center rounded-md bg-[#0f1013] border border-black/60 shadow-inner px-3 py-1.5 font-mono">
                    <span className="text-[8px] text-zinc-600 font-bold uppercase">View Count</span>
                    <span className="text-xs font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                      {formatCompactNumber(Number(currentVideo.view_count || 0))}
                    </span>
                  </div>

                  {/* Physical toggle buttons */}
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "col-span-1 flex items-center justify-center rounded-md border-t border-l border-white/10 border-b-black/60 border-r-black/60 bg-gradient-to-br from-[#2a2d35] to-[#1a1c20] transition-all active:shadow-inner active:border-white/5",
                      isSaved ? "text-amber-400" : "text-zinc-500"
                    )}
                  >
                    <BookmarkSimple size={16} weight={isSaved ? "fill" : "bold"} className={isSaved ? "drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" : ""} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "col-span-1 flex items-center justify-center rounded-md border-t border-l border-white/10 border-b-black/60 border-r-black/60 bg-gradient-to-br from-[#2a2d35] to-[#1a1c20] transition-all active:shadow-inner active:border-white/5",
                      isFeatured ? "text-amber-400" : "text-zinc-500"
                    )}
                  >
                    <Star size={16} weight={isFeatured ? "fill" : "bold"} className={isFeatured ? "drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" : ""} />
                  </button>
                </div>

                {/* Physical Transport Controls */}
                <div className="mt-3 flex items-center gap-2 rounded-md bg-[#16181b] p-1.5 border-t border-black/40 shadow-inner">
                  <button
                    onClick={() => go(-1)}
                    className="flex-1 flex justify-center py-1.5 rounded bg-gradient-to-b from-[#25282e] to-[#1b1d22] border-t border-white/10 border-b border-black text-zinc-400 hover:text-amber-400 active:bg-[#15171a] active:shadow-inner transition-all"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>

                  <div className="relative flex-1">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "v4" ? null : "v4")}
                      className="w-full flex justify-center py-1.5 rounded bg-gradient-to-b from-[#25282e] to-[#1b1d22] border-t border-white/10 border-b border-black text-zinc-400 hover:text-white active:bg-[#15171a] active:shadow-inner transition-all"
                    >
                      <Sliders size={14} weight="bold" />
                    </button>
                    {menuOpenId === "v4" && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 rounded-lg bg-[#1a1c20] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)] border border-black/80 font-bold text-[10px]">
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished"); setMenuOpenId(null); }} className="w-full rounded p-2 text-left text-zinc-400 hover:text-amber-500 hover:bg-[#25282e]">INICIADO</button>
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched"); setMenuOpenId(null); }} className="w-full rounded p-2 text-left text-zinc-400 hover:text-emerald-500 hover:bg-[#25282e]">COMPLETADO</button>
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later"); setMenuOpenId(null); }} className="w-full rounded p-2 text-left text-zinc-400 hover:text-white hover:bg-[#25282e]">GUARDADO</button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex-1 flex justify-center py-1.5 rounded bg-gradient-to-b from-[#25282e] to-[#1b1d22] border-t border-white/10 border-b border-black text-zinc-400 hover:text-amber-400 active:bg-[#15171a] active:shadow-inner transition-all"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>

              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* MASTERPIECE 2: HOLOGRAPHIC AURORA (LIQUID GLASS) */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-[10px] font-black text-white shadow-[0_0_10px_rgba(192,38,211,0.5)]">
                  M2
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                  HOLOGRAPHIC AURORA
                </span>
              </div>
              <span className="text-[9px] font-bold text-fuchsia-300 tracking-wider">
                LIQUID GLASS
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-[2rem] p-[1px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_20px_60px_rgba(192,38,211,0.2)]">
              {/* Complex animated mesh gradient border simulation via background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 via-fuchsia-500/40 to-blue-600/40 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-fuchsia-600/30 blur-3xl rounded-full mix-blend-screen" />
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-600/30 blur-3xl rounded-full mix-blend-screen" />

              <div className="relative h-full w-full rounded-[calc(2rem-1px)] bg-[#050510]/60 backdrop-blur-3xl p-5 flex flex-col">

                {/* Floating Meta Pills */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex flex-col gap-2">
                    <span className="self-start px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <h3 className="text-[13px] font-extrabold text-white leading-snug drop-shadow-md">
                      {currentVideo.title}
                    </h3>
                  </div>

                  {/* Circular Glass Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-110",
                        isSaved ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <BookmarkSimple size={13} weight={isSaved ? "fill" : "bold"} />
                    </button>
                    <button
                      onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-110",
                        isFeatured ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Star size={13} weight={isFeatured ? "fill" : "bold"} />
                    </button>
                  </div>
                </div>

                {/* Floating Screen */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5 mb-4 shrink-0">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="HOLOGRAM"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* Glassy Console */}
                <div className="mt-auto flex items-center justify-between gap-3">
                  <button onClick={() => go(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all hover:-translate-x-1">
                    <CaretLeft size={16} weight="bold" />
                  </button>

                  <div className="relative flex-1">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "v5" ? null : "v5")}
                      className={cn(
                        "flex w-full h-9 items-center justify-center gap-2 rounded-full border shadow-lg backdrop-blur-md transition-all text-[10px] font-extrabold tracking-widest uppercase",
                        watchStatus === "watched" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                        "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      )}
                    >
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIAR"}
                      <CaretDown size={10} />
                    </button>
                    {menuOpenId === "v5" && (
                      <div className="absolute bottom-full left-0 mb-3 w-full rounded-2xl bg-[#100b16]/90 p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-fuchsia-500/30 backdrop-blur-xl text-[10px] font-bold z-20">
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished"); setMenuOpenId(null); }} className="block w-full rounded-xl px-3 py-2 text-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">INICIADO</button>
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched"); setMenuOpenId(null); }} className="block w-full rounded-xl px-3 py-2 text-center text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 transition-colors">COMPLETADO</button>
                        <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later"); setMenuOpenId(null); }} className="block w-full rounded-xl px-3 py-2 text-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">VER MÁS TARDE</button>
                      </div>
                    )}
                  </div>

                  <button onClick={() => go(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all hover:translate-x-1">
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>

              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* MASTERPIECE 3: EDITORIAL SWISS GRID (BRUTALIST ELEGANCE) */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center bg-white text-[10px] font-black text-black">
                  M3
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  EDITORIAL SWISS GRID
                </span>
              </div>
              <span className="text-[9px] font-black text-white tracking-widest uppercase border border-white px-1.5 py-0.5">
                PRINT AESTHETIC
              </span>
            </div>

            <article className="group relative bg-black text-white border border-white/20 transition-all duration-300 hover:border-white/50">

              {/* Massive Typographic Header */}
              <div className="border-b border-white/20 p-4 pb-3">
                <h3 className="text-xl font-bold leading-none tracking-tight text-white mb-2 line-clamp-2" style={{ fontFamily: 'Times New Roman, serif' }}>
                  {currentVideo.title}
                </h3>
                <div className="flex items-end justify-between">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-white/50">
                    LOC: {currentVideo.country_name || currentVideo.country_code} <br/>
                    DAT: {formatVideoDate(currentVideo.published_at)}
                  </div>
                  <div className="text-2xl font-light tracking-tighter text-[#ccff00]">
                    {formatCompactNumber(Number(currentVideo.view_count || 0))}
                  </div>
                </div>
              </div>

              {/* Flush Brutalist Screen */}
              <div className="relative w-full aspect-video border-b border-white/20 bg-zinc-900">
                <YouTubeEmbedPlayer
                  videoId={currentVideo.youtube_video_id}
                  title={currentVideo.title}
                  youtubeHref={youtubeHref}
                  thumbnailUrl={currentVideo.thumbnail_url}
                  openButtonLabel="PLAY"
                  isMadeForKids={Boolean(currentVideo.made_for_kids)}
                />
              </div>

              {/* Strict Grid Controls */}
              <div className="grid grid-cols-4 divide-x divide-white/20 text-[10px] font-mono uppercase tracking-wider font-bold">

                {/* Actions */}
                <button
                  onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                  className={cn(
                    "col-span-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors hover:bg-white hover:text-black",
                    isSaved ? "bg-[#ccff00] text-black" : "text-white"
                  )}
                >
                  <BookmarkSimple size={16} weight={isSaved ? "fill" : "regular"} />
                  SAV
                </button>
                <button
                  onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                  className={cn(
                    "col-span-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors hover:bg-white hover:text-black",
                    isFeatured ? "bg-[#ccff00] text-black" : "text-white"
                  )}
                >
                  <Star size={16} weight={isFeatured ? "fill" : "regular"} />
                  FAV
                </button>

                {/* Status Switcher (Takes 2 cols) */}
                <div className="col-span-2 relative flex items-stretch">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === "v6" ? null : "v6")}
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-1.5 py-3 transition-colors",
                      watchStatus === "watched" ? "bg-white text-black" : "hover:bg-white/10 text-white"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {watchStatus === "watched" ? "COMPLETED" : "STATUS"} <CaretDown size={10} />
                    </span>
                    <span className="text-[8px] opacity-60">SELECT</span>
                  </button>

                  {menuOpenId === "v6" && (
                    <div className="absolute bottom-full right-0 w-full bg-white border border-black shadow-2xl text-black flex flex-col divide-y divide-black/10 z-20">
                      <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished"); setMenuOpenId(null); }} className="py-2.5 hover:bg-[#ccff00] transition-colors">STARTED</button>
                      <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched"); setMenuOpenId(null); }} className="py-2.5 hover:bg-[#ccff00] transition-colors">COMPLETED</button>
                      <button onClick={() => { activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later"); setMenuOpenId(null); }} className="py-2.5 hover:bg-[#ccff00] transition-colors">QUEUE</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Minimal Bottom Nav */}
              <div className="grid grid-cols-2 divide-x divide-white/20 border-t border-white/20 text-xs font-mono">
                <button onClick={() => go(-1)} className="py-2 flex justify-center hover:bg-white hover:text-black transition-colors">
                  <CaretLeft size={16} />
                </button>
                <button onClick={() => go(1)} className="py-2 flex justify-center hover:bg-white hover:text-black transition-colors">
                  <CaretRight size={16} />
                </button>
              </div>

            </article>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* DESTINATION SPONSOR KIT: SIDE PANEL SERVICES-FIRST DEMO */}
        {/* ========================================================================= */}
        <div className="mt-24 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#ff5a3d]/20 bg-[#ff5a3d]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#ff8a73]">
              Destination Sponsor Kit
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Laboratorio de Camuflaje y Utilidad Comercial</span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Exposición del Sponsor: Utilidad vs Marca
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Compara la propuesta comercial estándar arriba/abajo con 3 variaciones interactivas que camuflan al sponsor. Primero resuelven la necesidad real del viajero (moneda, comida, clima) y relegan la marca a una atribución secundaria.
          </p>

          {/* Premium Tab Selector */}
          <div className="mt-8 flex flex-wrap gap-2.5 p-1.5 rounded-xl border border-white/[0.06] bg-[#070b12]/90 backdrop-blur-md max-w-4xl">
            <button
              onClick={() => setSponsorCamouflageMode("base")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                sponsorCamouflageMode === "base"
                  ? "bg-[#ff5a3d]/10 border-[#ff5a3d]/30 text-[#ff8a73] shadow-[0_0_15px_rgba(255,90,61,0.15)]"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <Compass size={14} weight={sponsorCamouflageMode === "base" ? "fill" : "regular"} />
              Base (Estándar)
            </button>

            <button
              onClick={() => setSponsorCamouflageMode("budget")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                sponsorCamouflageMode === "budget"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <Calculator size={14} weight={sponsorCamouflageMode === "budget" ? "fill" : "regular"} />
              V1: Calculadora Presupuesto
            </button>

            <button
              onClick={() => setSponsorCamouflageMode("food")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                sponsorCamouflageMode === "food"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <ForkKnife size={14} weight={sponsorCamouflageMode === "food" ? "fill" : "regular"} />
              V2: Ruta Gastronómica
            </button>

            <button
              onClick={() => setSponsorCamouflageMode("transit")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                sponsorCamouflageMode === "transit"
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <CloudSun size={14} weight={sponsorCamouflageMode === "transit" ? "fill" : "regular"} />
              V3: Clima & Tránsito
            </button>
          </div>
        </div>

        <section className="mb-20 rounded-[1.35rem] border border-white/[0.07] bg-[#06090f]/80 p-3 shadow-[0_35px_120px_-55px_rgba(0,0,0,0.95)] backdrop-blur-2xl md:p-4">
          <div className="mx-auto max-w-[920px] space-y-4">
            
            {/* TOP SERVICES WIDGET (Conditional Based on Mode) */}
            {sponsorCamouflageMode === "base" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#091018]/88 p-3 text-white shadow-[0_22px_70px_-42px_rgba(0,0,0,0.95)]">
                <div className="mb-3 flex flex-col gap-2 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ff8a73]">
                      Travel Kit
                    </p>
                    <h3 className="mt-1 text-base font-extrabold tracking-tight text-white">
                      Servicios para {destinationName}
                    </h3>
                  </div>
                  <p className="max-w-sm text-[11px] leading-4 text-zinc-500">
                    Primero se muestra la utilidad. El sponsor aparece como atribución secundaria.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-all hover:border-[#ff5a3d]/20 hover:bg-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-[#ff8a73]">
                        <MapPin size={16} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-zinc-500">Dónde dormir</p>
                        <h4 className="mt-1 text-sm font-extrabold leading-tight text-white">
                          Alojamientos cerca de {destinationName}
                        </h4>
                        <a
                          href="#"
                          onClick={handleDemoCta}
                          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[10px] font-extrabold uppercase tracking-wider text-white transition-all hover:bg-white/[0.08] active:scale-95"
                        >
                          Ver opciones
                          <ArrowSquareOut size={11} />
                        </a>
                        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                          por Stay Partner
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-all hover:border-[#ff5a3d]/20 hover:bg-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-[#ff8a73]">
                        <Compass size={16} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-zinc-500">Qué hacer</p>
                        <h4 className="mt-1 text-sm font-extrabold leading-tight text-white">
                          Tours y entradas recomendadas
                        </h4>
                        <a
                          href="#"
                          onClick={handleDemoCta}
                          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[10px] font-extrabold uppercase tracking-wider text-white transition-all hover:bg-white/[0.08] active:scale-95"
                        >
                          Explorar
                          <ArrowSquareOut size={11} />
                        </a>
                        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                          por Experience Partner
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#ff5a3d]/16 bg-[#ff5a3d]/[0.035] p-3 transition-all hover:border-[#ff5a3d]/28">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#ff5a3d]/20 bg-black/30 text-[#ff8a73]">
                        <ShieldCheck size={16} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-zinc-500">Viajar cubierto</p>
                        <h4 className="mt-1 text-sm font-extrabold leading-tight text-white">
                          Seguro médico para esta ruta
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleCopyServiceCoupon("travel-care-top", "TRAVELKIT5")}
                          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#ff5a3d]/25 bg-black/35 px-3 font-mono text-[10px] font-bold text-zinc-200 transition-all hover:border-[#ff5a3d]/45 active:scale-95"
                        >
                          <Tag size={11} />
                          {copiedServiceId === "travel-care-top" ? "Copiado" : "TRAVELKIT5"}
                        </button>
                        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                          por Travel Care
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "budget" && (
              <div className="rounded-xl border border-emerald-500/15 bg-[#091512]/85 p-3 text-white shadow-[0_22px_70px_-42px_rgba(0,0,0,0.95)]">
                <div className="mb-3 flex flex-col gap-2 border-b border-emerald-500/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
                        Smart Travel Tool
                      </p>
                    </div>
                    <h3 className="mt-1 text-base font-extrabold tracking-tight text-white">
                      Calculadora de Presupuesto Diario para {destinationName}
                    </h3>
                  </div>
                  <p className="max-w-sm text-[11px] leading-4 text-zinc-400">
                    Estima tus gastos promedio reales. Atribución bancaria sutil y útil.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-center">
                  {/* Days Selector */}
                  <div className="md:col-span-4 p-3 rounded-lg border border-white/[0.05] bg-black/30">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Duración del Viaje</p>
                    <div className="flex items-center justify-between gap-1 bg-black/40 p-1 rounded-md border border-white/5">
                      {[3, 5, 7, 10].map((d) => (
                        <button
                          key={d}
                          onClick={() => setTravelDays(d)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-black rounded transition-all",
                            travelDays === d
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                              : "text-zinc-500 hover:text-white"
                          )}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Estimación Total</span>
                      <span className="text-sm font-black text-emerald-400">
                        {travelDays * 85} EUR
                      </span>
                    </div>
                  </div>

                  {/* Expense Breakdown Categories */}
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Suitcase size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Alojamiento</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {travelDays * 45} EUR
                      </p>
                      <p className="text-[8px] text-zinc-500 mt-1 truncate">
                        Ahorro por Stay Partner
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <ForkKnife size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Comidas</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {travelDays * 25} EUR
                      </p>
                      <p className="text-[8px] text-zinc-500 mt-1 truncate">
                        Restaurantes recomendados
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Train size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Tránsito</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {travelDays * 15} EUR
                      </p>
                      <p className="text-[8px] text-zinc-500 mt-1 truncate">
                        Metro y trayectos cortos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "food" && (
              <div className="rounded-xl border border-amber-500/15 bg-[#151109]/85 p-3 text-white shadow-[0_22px_70px_-42px_rgba(0,0,0,0.95)]">
                <div className="mb-3 flex flex-col gap-2 border-b border-amber-500/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ForkKnife size={12} className="text-amber-500 animate-bounce" />
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
                        Gourmet Destination Finder
                      </p>
                    </div>
                    <h3 className="mt-1 text-base font-extrabold tracking-tight text-white">
                      Guía Gastronómica Esencial en {destinationName}
                    </h3>
                  </div>
                  <p className="max-w-sm text-[11px] leading-4 text-zinc-400">
                    Platos tradicionales probados en el video. Pulsa para ver recomendaciones locales.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {[
                    {
                      name: "Tapas Crujientes locales",
                      desc: "Bocados tradicionales elaborados con ingredientes de proximidad. Un maridaje perfecto.",
                      price: "4.50€ / ración",
                      origin: "Mercado Histórico",
                    },
                    {
                      name: "Plato de cuchara tradicional",
                      desc: "Guisado a fuego lento cocinado durante más de 6 horas para capturar la esencia del destino.",
                      price: "12.00€ / plato",
                      origin: "Taberna Antigua",
                    },
                    {
                      name: "Postre artesanal con chocolate",
                      desc: "Elaborado a base de masa frita crujiente recién hecha y bañado en chocolate caliente.",
                      price: "3.80€ / porción",
                      origin: "Churrería del Barrio",
                    },
                  ].map((dish, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDishIndex(i)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-all relative overflow-hidden",
                        activeDishIndex === i
                          ? "border-amber-500/30 bg-amber-500/[0.04] text-white"
                          : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] text-zinc-400"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider truncate">
                          {dish.name}
                        </span>
                        <span className="text-[9px] font-mono font-black text-amber-400 shrink-0">
                          {dish.price}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed line-clamp-2 text-zinc-500">
                        {dish.desc}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[8.5px] border-t border-white/[0.05] pt-1.5 font-bold uppercase tracking-wider text-zinc-500">
                        <span>Lugar: {dish.origin}</span>
                        {activeDishIndex === i && <span className="text-amber-500">Seleccionado</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "transit" && (
              <div className="rounded-xl border border-cyan-500/15 bg-[#091316]/85 p-3 text-white shadow-[0_22px_70px_-42px_rgba(0,0,0,0.95)]">
                <div className="mb-3 flex flex-col gap-2 border-b border-cyan-500/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CloudSun size={12} className="text-cyan-400" />
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400">
                        Destination Assistant
                      </p>
                    </div>
                    <h3 className="mt-1 text-base font-extrabold tracking-tight text-white">
                      Clima y Equipaje recomendado para {destinationName}
                    </h3>
                  </div>
                  <p className="max-w-sm text-[11px] leading-4 text-zinc-400">
                    Evita imprevistos. Checklist de clima e indumentaria inteligente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Climate Forecast */}
                  <div className="md:col-span-4 p-3 rounded-lg border border-white/[0.05] bg-black/30 flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400">
                      <CloudSun size={24} weight="fill" className="animate-pulse" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Hoy Despejado</p>
                      <h4 className="text-lg font-black text-white">22°C / 14°C</h4>
                      <p className="text-[8.5px] text-cyan-400 font-bold uppercase mt-0.5">Viento: 12km/h · Hum: 42%</p>
                    </div>
                  </div>

                  {/* Smart Checklist */}
                  <div className="md:col-span-8 p-3 rounded-lg border border-white/[0.05] bg-black/30">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                      Checklist Indispensable en {destinationName}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: "sunglasses", label: "Gafas de sol (UV400)" },
                        { key: "shoes", label: "Calzado de caminata ligero" },
                        { key: "plug", label: "Adaptador de enchufe Tipo C/F" },
                        { key: "insurance", label: "Seguro médico (Recomendado)" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 cursor-pointer select-none text-zinc-300 hover:text-white transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checklistItems[item.key] || false}
                            onChange={(e) =>
                              setChecklistItems((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-white/10 bg-black/50 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className={cn(checklistItems[item.key] && "line-through text-zinc-500")}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CENTRAL YOUTUBE CARD WITH CONTROLS */}
            <article className={cn(
              "group relative overflow-hidden rounded-xl border bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300",
              sponsorCamouflageMode === "base" && "border-white/[0.06] hover:border-[#ff5a3d]/25",
              sponsorCamouflageMode === "budget" && "border-emerald-500/10 hover:border-emerald-500/25 shadow-[0_30px_90px_-30px_rgba(16,185,129,0.05)]",
              sponsorCamouflageMode === "food" && "border-amber-500/10 hover:border-amber-500/25 shadow-[0_30px_90px_-30px_rgba(245,158,11,0.05)]",
              sponsorCamouflageMode === "transit" && "border-cyan-500/10 hover:border-cyan-500/25 shadow-[0_30px_90px_-30px_rgba(6,182,212,0.05)]"
            )}>
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,90,61,0.045),transparent_62%)]" />

              <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                    </span>
                    <h3 className={cn(
                      "truncate text-sm font-extrabold leading-none text-white transition-colors",
                      sponsorCamouflageMode === "base" && "group-hover:text-[#ff8a73]",
                      sponsorCamouflageMode === "budget" && "group-hover:text-emerald-400",
                      sponsorCamouflageMode === "food" && "group-hover:text-amber-400",
                      sponsorCamouflageMode === "transit" && "group-hover:text-cyan-400"
                    )}>
                      {currentVideo.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>•</span>
                    <span>Video {currentIndex + 1} de {sampleVideos.length}</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isSaved
                        ? sponsorCamouflageMode === "base" ? "border-[#ff5a3d]/35 bg-[#ff5a3d]/10 text-[#ff8a73]" :
                          sponsorCamouflageMode === "budget" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400" :
                          sponsorCamouflageMode === "food" ? "border-amber-500/35 bg-amber-500/10 text-amber-400" :
                          "border-cyan-500/35 bg-cyan-500/10 text-cyan-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                    aria-label={isSaved ? "Quitar de guardados" : "Guardar video"}
                  >
                    <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isFeatured
                        ? sponsorCamouflageMode === "base" ? "border-[#ff5a3d]/35 bg-[#ff5a3d]/10 text-[#ff8a73]" :
                          sponsorCamouflageMode === "budget" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400" :
                          sponsorCamouflageMode === "food" ? "border-amber-500/35 bg-amber-500/10 text-amber-400" :
                          "border-cyan-500/35 bg-cyan-500/10 text-cyan-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                    aria-label={isFeatured ? "Quitar destacado" : "Destacar video"}
                  >
                    <Star size={14} weight={isFeatured ? "fill" : "regular"} />
                  </button>
                </div>
              </header>

              <div className="px-4 pb-2">
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir en YouTube"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>
                <p className="mt-2 text-[10px] leading-4 text-zinc-500">
                  Reproductor oficial de YouTube. El kit comercial vive separado del iframe y no cubre controles.
                </p>
              </div>

              <div className="border-t border-white/[0.04] bg-[#0c0c0c]/85 px-4 py-3">
                <div className="grid grid-cols-3 items-center gap-2">
                  <button
                    onClick={() => go(-1)}
                    className={cn(
                      "flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[11px] font-bold text-zinc-300 transition-all active:scale-95",
                      sponsorCamouflageMode === "base" && "hover:border-[#ff5a3d]/25 hover:bg-[#ff5a3d]/10 hover:text-[#ff8a73]",
                      sponsorCamouflageMode === "budget" && "hover:border-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-400",
                      sponsorCamouflageMode === "food" && "hover:border-amber-500/25 hover:bg-amber-500/10 hover:text-amber-400",
                      sponsorCamouflageMode === "transit" && "hover:border-cyan-500/25 hover:bg-cyan-500/10 hover:text-cyan-400"
                    )}
                  >
                    <CaretLeft size={13} weight="bold" />
                    ANTERIOR
                  </button>

                  <div className="relative justify-self-center">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "destination-kit" ? null : "destination-kit")}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded border px-2.5 text-[9px] font-black tracking-wider transition-all",
                        watchStatus === "watched"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : sponsorCamouflageMode === "base" ? "border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ff8a73]" :
                            sponsorCamouflageMode === "budget" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" :
                            sponsorCamouflageMode === "food" ? "border-amber-500/25 bg-amber-500/10 text-amber-400" :
                            "border-cyan-500/25 bg-cyan-500/10 text-cyan-400"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={10} />
                    </button>

                    {menuOpenId === "destination-kit" && (
                      <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className={cn(
                            "block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02]",
                            sponsorCamouflageMode === "base" && "hover:text-[#ff8a73]",
                            sponsorCamouflageMode === "budget" && "hover:text-emerald-400",
                            sponsorCamouflageMode === "food" && "hover:text-amber-400",
                            sponsorCamouflageMode === "transit" && "hover:text-cyan-400"
                          )}
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-emerald-500"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className={cn(
                      "flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[11px] font-bold text-zinc-300 transition-all active:scale-95",
                      sponsorCamouflageMode === "base" && "hover:border-[#ff5a3d]/25 hover:bg-[#ff5a3d]/10 hover:text-[#ff8a73]",
                      sponsorCamouflageMode === "budget" && "hover:border-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-400",
                      sponsorCamouflageMode === "food" && "hover:border-amber-500/25 hover:bg-amber-500/10 hover:text-amber-400",
                      sponsorCamouflageMode === "transit" && "hover:border-cyan-500/25 hover:bg-cyan-500/10 hover:text-cyan-400"
                    )}
                  >
                    SIGUIENTE
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.03] pt-2.5 text-[11px] text-zinc-500">
                  <span className="flex min-w-0 items-center gap-1 font-semibold">
                    <MapPin size={11} className={cn(
                      "shrink-0",
                      sponsorCamouflageMode === "base" && "text-[#ff8a73]",
                      sponsorCamouflageMode === "budget" && "text-emerald-400",
                      sponsorCamouflageMode === "food" && "text-amber-400",
                      sponsorCamouflageMode === "transit" && "text-cyan-400"
                    )} />
                    <span className="truncate">{destinationRoute}</span>
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} vistas
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <Clock size={11} />
                    {formatVideoDate(currentVideo.published_at)}
                  </span>
                </div>
              </div>
            </article>

            {/* BOTTOM BANNER WIDGET (Conditional Based on Mode) */}
            {sponsorCamouflageMode === "base" && (
              <div className="overflow-hidden rounded-xl border border-[#ff5a3d]/18 bg-[linear-gradient(135deg,rgba(255,90,61,0.16),rgba(255,255,255,0.035)_42%,rgba(0,0,0,0.22))] p-3 text-white shadow-[0_24px_85px_-45px_rgba(255,90,61,0.5)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ff5a3d]/25 bg-black/30 text-[#ff8a73]">
                      <Gift size={20} weight="bold" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ffb49f]">
                        Publicidad demo
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold leading-tight text-white">
                        5% de descuento para preparar tu próxima ruta
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-300">
                        Banner inferior separado del player: visible para conversión, pero sin tapar ni rodear los controles de YouTube.
                      </p>
                    </div>
                  </div>

                  <a
                    href="#"
                    onClick={handleDemoCta}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ff5a3d] px-4 text-[11px] font-extrabold uppercase tracking-wider text-white transition-all hover:bg-[#ff735c] active:scale-95"
                  >
                    Reclamar beneficio
                    <ArrowSquareOut size={13} />
                  </a>
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "budget" && (
              <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.22))] p-3.5 text-white shadow-[0_24px_85px_-45px_rgba(16,185,129,0.3)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-black/30 text-emerald-400">
                      <CreditCard size={20} weight="bold" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
                          TIPO DE CAMBIO EN DIRECTO
                        </span>
                        <span className="text-[8px] font-mono text-zinc-400 bg-emerald-950/30 px-1 py-0.2 rounded border border-emerald-500/20">
                          1 EUR = 1.0824 USD
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-base font-extrabold leading-tight text-white">
                        ¿Cómo pagar en {destinationName} sin comisiones por tipo de cambio?
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                        La tarjeta de débito multidivisa te ahorra hasta un 3.5% en comisiones por tipo de cambio en comparación con los bancos tradicionales.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://wise.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 text-[11px] font-extrabold uppercase tracking-wider text-white transition-all active:scale-95 shadow-md shadow-emerald-900/20"
                  >
                    Obtener Tarjeta Gratuita
                    <ArrowSquareOut size={13} />
                  </a>
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "food" && (
              <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.22))] p-3.5 text-white shadow-[0_24px_85px_-45px_rgba(245,158,11,0.3)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-black/30 text-amber-400">
                      <ForkKnife size={20} weight="bold" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
                        RESERVA GASTRONÓMICA LOCAL
                      </p>
                      <h3 className="mt-1 text-base font-extrabold leading-tight text-white">
                        Consigue hasta un 30% de descuento en comida tradicional en {destinationName}
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                        Reserva online gratis en tabernas históricas y locales recomendados por guías oficiales de viaje. Sin comisiones por cancelación.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://thefork.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 text-[11px] font-extrabold uppercase tracking-wider text-white transition-all active:scale-95 shadow-md shadow-amber-900/20"
                  >
                    Reservar Mesa (-30%)
                    <ArrowSquareOut size={13} />
                  </a>
                </div>
              </div>
            )}

            {sponsorCamouflageMode === "transit" && (
              <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(6,182,212,0.12),rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.22))] p-3.5 text-white shadow-[0_24px_85px_-45px_rgba(6,182,212,0.3)]">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-black/30 text-cyan-400">
                      <Car size={20} weight="bold" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400">
                        PLANIFICADOR DE TRÁNSITO
                      </p>
                      <h3 className="mt-1 text-base font-extrabold leading-tight text-white">
                        ¿Cómo llegar desde el aeropuerto de {destinationName} al centro?
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                        Compara las opciones de tránsito rápido optimizadas para el viajero. Reserva trenes locales o solicita un traslado privado directamente.
                      </p>
                    </div>
                  </div>

                  {/* Comparative transit grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04] hover:border-cyan-500/20 transition-all">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white flex items-center gap-1.5">
                          <Train size={12} className="text-cyan-400 shrink-0" />
                          <span className="truncate">Metro / Tren Exprés</span>
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">⏱ 22 min · Frecuencia 8 min</p>
                      </div>
                      <a
                        href="https://www.trainline.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide text-zinc-200 transition-colors shrink-0"
                      >
                        Tren desde 4.5€
                      </a>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04] hover:border-cyan-500/20 transition-all">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white flex items-center gap-1.5">
                          <Car size={12} className="text-cyan-400 shrink-0" />
                          <span className="truncate">Trayecto Privado (Cabify)</span>
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">⏱ 15 min · Puerta a puerta</p>
                      </div>
                      <a
                        href="https://cabify.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide text-white transition-colors shrink-0"
                      >
                        Pedir (10% dto)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ========================================================================= */}
        {/* TITULO Y DIVISION DE LAS PROPUESTAS DE SPONSORS */}
        {/* ========================================================================= */}
        <div className="mt-24 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              Sponsor Exposure Lab
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Propuesta S3: 3 Variaciones de Call To Action (CTA)</span>
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-300 via-white to-zinc-400 bg-clip-text text-transparent">
            Variaciones de Conversión de la Propuesta Bento (S3)
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Tres enfoques alternativos para el widget Bento inferior, optimizados para convertir la exposición del sponsor en reservas reales, integrando botones héroe, tickets de descuento interactivos y comparadores en tiempo real.
          </p>
        </div>

        {/* Fourth Grid - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-16">

          {/* ========================================================================= */}
          {/* PROPUESTA S3-A: DIRECT BOOKING HERO BANNER */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white font-mono">
                  S3-A
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  BOOKING HERO BUTTONS
                </span>
              </div>
              <span className="text-[10px] font-medium text-blue-400/80 bg-blue-950/20 border border-blue-500/20 px-2 py-0.5 rounded">
                Botón de Acción Sólido
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_20px_50px_rgba(59,130,246,0.04)]">
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_60%)] pointer-events-none" />

              <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <h2 className="truncate text-sm font-extrabold text-white leading-none font-sans group-hover:text-blue-400 transition-colors">
                      {currentVideo.title}
                    </h2>
                  </div>

                  <p className="mt-1 truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-400/80">
                    ✦ Descuentos de Patrocinio Integrados
                  </p>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <span className="text-white bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>•</span>
                    <span>Video {currentIndex + 1} de {sampleVideos.length}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isSaved
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isFeatured
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Star size={14} weight={isFeatured ? "fill" : "regular"} />
                  </button>
                </div>
              </header>

              <div className="px-4 pb-2">
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir en YouTube"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* S3-A Sponsor CTA: Direct Booking Hero Buttons */}
                <div className="mt-3.5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Handshake size={13} className="text-orange-400" />
                    <span className="text-[9px] font-black tracking-widest text-zinc-300 uppercase">
                      Reserva Exclusiva TravelYourMap
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Booking Hero CTA Button */}
                    <a
                      href="https://booking.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full p-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all text-center relative overflow-hidden group/booking shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-extrabold tracking-wider uppercase text-white">
                          Reservar Hotel en Booking.com
                        </span>
                        <ArrowSquareOut size={11} className="text-white group-hover/booking:translate-x-0.5 group-hover/booking:-translate-y-0.5 transition-transform" />
                      </div>
                      <p className="text-[7.5px] text-white/70 mt-0.5 tracking-wide">
                        Consigue hasta 15% de descuento directo en {currentVideo.country_name || "este destino"}
                      </p>
                    </a>

                    {/* Airbnb Hero CTA Button */}
                    <a
                      href="https://airbnb.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full p-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 transition-all text-center relative overflow-hidden group/airbnb shadow-[0_4px_12px_rgba(225,29,72,0.2)]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-extrabold tracking-wider uppercase text-white">
                          Ver Alojamientos en Airbnb
                        </span>
                        <ArrowSquareOut size={11} className="text-white group-hover/airbnb:translate-x-0.5 group-hover/airbnb:-translate-y-0.5 transition-transform" />
                      </div>
                      <p className="text-[7.5px] text-white/70 mt-0.5 tracking-wide">
                        Explora estancias singulares recomendadas en {currentVideo.country_name || "la zona"}
                      </p>
                    </a>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0c0c0c]/85">
                <div className="grid grid-cols-3 items-center gap-2">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-blue-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-blue-400 hover:border-blue-500/20 transition-all active:scale-95"
                  >
                    <CaretLeft size={13} weight="bold" />
                    ANTERIOR
                  </button>

                  <div className="relative justify-self-center">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p1_s3a" ? null : "p1_s3a")}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded px-2.5 text-[9px] font-black tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : "border-blue-500/20 bg-blue-500/5 text-blue-400"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={10} />
                    </button>

                    {menuOpenId === "p1_s3a" && (
                      <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-blue-400 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-blue-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-blue-400 hover:border-blue-500/20 transition-all active:scale-95"
                  >
                    SIGUIENTE
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.03] pt-2.5">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[120px]">
                    <MapPin size={11} className="text-blue-400" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} vistas
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatVideoDate(currentVideo.published_at)}
                  </span>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA S3-B: DASH-BORDER COUPON TICKETS */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white font-mono">
                  S3-B
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                  COUPON TICKET DESIGN
                </span>
              </div>
              <span className="text-[10px] font-medium text-orange-400/80 bg-orange-950/20 border border-orange-500/20 px-2 py-0.5 rounded">
                Códigos Interactivos de Cupón
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_20px_50px_rgba(245,158,11,0.04)]">
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03),transparent_60%)] pointer-events-none" />

              <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <h2 className="truncate text-sm font-extrabold text-white leading-none font-sans group-hover:text-orange-400 transition-colors">
                      {currentVideo.title}
                    </h2>
                  </div>

                  <p className="mt-1 truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-400/80">
                    ✦ Cupones Especiales para Viajeros
                  </p>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <span className="text-white bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>•</span>
                    <span>Video {currentIndex + 1} de {sampleVideos.length}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isSaved
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isFeatured
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Star size={14} weight={isFeatured ? "fill" : "regular"} />
                  </button>
                </div>
              </header>

              <div className="px-4 pb-2">
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir en YouTube"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* S3-B Sponsor CTA: Dash-Border Coupon Tickets */}
                <div className="mt-3.5 p-3 rounded-xl border border-white/[0.06] bg-[#0c0d10] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2.5 border-b border-white/[0.04] pb-1.5">
                    <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase">
                      Descuentos Canjeables
                    </span>
                    <span className="text-[8px] font-bold text-[#ccff00] bg-[#1a2d10] px-1.5 py-0.5 rounded border border-[#2b5c15]/30">
                      CÓDIGOS ACTIVOS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 font-mono">
                    {/* Booking Dash Ticket */}
                    <div className="p-2 rounded border-2 border-dashed border-blue-500/30 bg-blue-950/10 flex flex-col justify-between items-stretch gap-2">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-wide">
                          Booking.com
                        </p>
                        <p className="text-base font-extrabold text-[#ccff00] mt-0.5 tracking-tight">
                          15% DTO
                        </p>
                      </div>

                      {/* Interactive Copy Code Box */}
                      <button
                        onClick={() => navigator.clipboard.writeText("YOUBOOK15")}
                        className="bg-black/60 border border-white/5 py-1 px-1 rounded text-center cursor-pointer hover:border-blue-500/40 select-all text-[8px] text-zinc-300 active:bg-blue-900/20 active:text-white transition-colors"
                        title="Haga clic para copiar el código"
                      >
                        CÓDIGO: <strong className="text-[#ccff00]">YOUBOOK15</strong>
                      </button>

                      <a
                        href="https://booking.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-blue-600 hover:bg-blue-500 text-white rounded text-[8px] py-1 font-bold tracking-wider uppercase transition-colors"
                      >
                        CANJEAR
                      </a>
                    </div>

                    {/* Airbnb Dash Ticket */}
                    <div className="p-2 rounded border-2 border-dashed border-rose-500/30 bg-rose-950/10 flex flex-col justify-between items-stretch gap-2">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-wide">
                          Airbnb
                        </p>
                        <p className="text-base font-extrabold text-[#ccff00] mt-0.5 tracking-tight">
                          $25 REGALO
                        </p>
                      </div>

                      {/* Interactive Copy Code Box */}
                      <button
                        onClick={() => navigator.clipboard.writeText("YOUAIR25")}
                        className="bg-black/60 border border-white/5 py-1 px-1 rounded text-center cursor-pointer hover:border-rose-500/40 select-all text-[8px] text-zinc-300 active:bg-rose-900/20 active:text-white transition-colors"
                        title="Haga clic para copiar el código"
                      >
                        CÓDIGO: <strong className="text-[#ccff00]">YOUAIR25</strong>
                      </button>

                      <a
                        href="https://airbnb.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-rose-600 hover:bg-rose-500 text-white rounded text-[8px] py-1 font-bold tracking-wider uppercase transition-colors"
                      >
                        RECLAMAR
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0c0c0c]/85">
                <div className="grid grid-cols-3 items-center gap-2">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-orange-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-orange-400 hover:border-orange-500/20 transition-all active:scale-95"
                  >
                    <CaretLeft size={13} weight="bold" />
                    ANTERIOR
                  </button>

                  <div className="relative justify-self-center">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p1_s3b" ? null : "p1_s3b")}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded px-2.5 text-[9px] font-black tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : "border-orange-500/20 bg-orange-500/5 text-orange-400"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={10} />
                    </button>

                    {menuOpenId === "p1_s3b" && (
                      <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-orange-400 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-orange-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-orange-400 hover:border-orange-500/20 transition-all active:scale-95"
                  >
                    SIGUIENTE
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.03] pt-2.5">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[120px]">
                    <MapPin size={11} className="text-orange-400" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} vistas
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatVideoDate(currentVideo.published_at)}
                  </span>
                </div>
              </div>
            </article>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA S3-C: REAL-TIME LIVE PRICING FINDER */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white font-mono">
                  S3-C
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  REAL-TIME PRICING
                </span>
              </div>
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                Buscador Integrado En Vivo
              </span>
            </div>

            <article className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-rose-500/20 hover:shadow-[0_20px_50px_rgba(244,63,94,0.04)]">
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.03),transparent_60%)] pointer-events-none" />

              <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <h2 className="truncate text-sm font-extrabold text-white leading-none font-sans group-hover:text-rose-400 transition-colors">
                      {currentVideo.title}
                    </h2>
                  </div>

                  <p className="mt-1 truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-400/80">
                    ✦ Buscador de Hoteles y Experiencias
                  </p>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <span className="text-white bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">
                      {countryCodeToFlag(currentVideo.country_code)} {currentVideo.country_name || currentVideo.country_code}
                    </span>
                    <span>•</span>
                    <span>Video {currentIndex + 1} de {sampleVideos.length}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => activity.toggleVideoSaved(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isSaved
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
                  </button>
                  <button
                    onClick={() => activity.toggleVideoFeatured(currentVideo.youtube_video_id)}
                    className={cn(
                      "flex h-7.5 w-7.5 items-center justify-center rounded-md border transition-all active:scale-95",
                      isFeatured
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Star size={14} weight={isFeatured ? "fill" : "regular"} />
                  </button>
                </div>
              </header>

              <div className="px-4 pb-2">
                <div className="relative overflow-hidden rounded-lg bg-black">
                  <YouTubeEmbedPlayer
                    videoId={currentVideo.youtube_video_id}
                    title={currentVideo.title}
                    youtubeHref={youtubeHref}
                    thumbnailUrl={currentVideo.thumbnail_url}
                    openButtonLabel="Abrir en YouTube"
                    isMadeForKids={Boolean(currentVideo.made_for_kids)}
                  />
                </div>

                {/* S3-C Sponsor CTA: Real-Time Live Pricing Finder */}
                <div className="mt-3.5 p-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/10 to-zinc-950/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2.5 border-b border-white/[0.04] pb-1.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[9px] font-black tracking-widest text-[#7de1a2] uppercase">
                        Tarifas Disponibles
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono text-zinc-500">
                      ACTUALIZADO: HACE 1M
                    </span>
                  </div>

                  <div className="space-y-2.5 font-sans">
                    {/* Booking Live Deal */}
                    <div className="flex items-center justify-between gap-3 p-1.5 rounded bg-black/40 border border-blue-500/15">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-blue-400 truncate">
                          Hoteles en {getVideoCityLabel(currentVideo) || "Mauritania"}
                        </p>
                        <p className="text-[8px] text-zinc-400 mt-0.5">
                          ✓ Cancelación gratuita · Valoración ★ 8.8
                        </p>
                      </div>
                      <a
                        href="https://booking.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded px-2.5 py-1.5 text-[9px] font-extrabold tracking-wide uppercase transition-colors"
                      >
                        DESDE 42€
                      </a>
                    </div>

                    {/* Airbnb Live Deal */}
                    <div className="flex items-center justify-between gap-3 p-1.5 rounded bg-black/40 border border-rose-500/15">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-rose-400 truncate">
                          Jaimas en Desierto de {currentVideo.country_name || "Sahara"}
                        </p>
                        <p className="text-[8px] text-zinc-400 mt-0.5">
                          ✓ Estancias Singulares · Valoración ★ 4.9
                        </p>
                      </div>
                      <a
                        href="https://airbnb.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white rounded px-2.5 py-1.5 text-[9px] font-extrabold tracking-wide uppercase transition-colors"
                      >
                        DESDE 30€
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0c0c0c]/85">
                <div className="grid grid-cols-3 items-center gap-2">
                  <button
                    onClick={() => go(-1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-rose-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-rose-400 hover:border-rose-500/20 transition-all active:scale-95"
                  >
                    <CaretLeft size={13} weight="bold" />
                    ANTERIOR
                  </button>

                  <div className="relative justify-self-center">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === "p1_s3c" ? null : "p1_s3c")}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded px-2.5 text-[9px] font-black tracking-wider transition-all border",
                        watchStatus === "watched"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : "border-rose-500/20 bg-rose-500/5 text-rose-400"
                      )}
                    >
                      <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                      {watchStatus === "watched" ? "COMPLETADO" : "INICIADO"}
                      <CaretDown size={10} />
                    </button>

                    {menuOpenId === "p1_s3c" && (
                      <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "not_finished");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-rose-400 hover:bg-white/[0.02]"
                        >
                          INICIADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watched");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-emerald-500 hover:bg-white/[0.02]"
                        >
                          COMPLETADO
                        </button>
                        <button
                          onClick={() => {
                            activity.setVideoWatchStatus(currentVideo.youtube_video_id, "watch_later");
                            setMenuOpenId(null);
                          }}
                          className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                        >
                          VER MÁS TARDE
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => go(1)}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-[#141414] hover:bg-rose-600/10 border border-white/[0.04] text-[11px] font-bold text-zinc-300 hover:text-rose-400 hover:border-rose-500/20 transition-all active:scale-95"
                  >
                    SIGUIENTE
                    <CaretRight size={13} weight="bold" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.03] pt-2.5">
                  <span className="flex items-center gap-1 font-semibold truncate max-w-[120px]">
                    <MapPin size={11} className="text-rose-400" />
                    <span className="truncate">{formatVideoPlace(currentVideo)}</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {formatCompactNumber(Number(currentVideo.view_count || 0))} vistas
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatVideoDate(currentVideo.published_at)}
                  </span>
                </div>
              </div>
            </article>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TITULO Y DIVISION DE LAS PROPUESTAS DE VIDEO INSPIRATION RAIL */}
        {/* ========================================================================= */}
        <div className="mt-24 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              Inspiration Rail Lab
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Estudio de la Barra Inferior de Videos</span>
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-white to-zinc-400 bg-clip-text text-transparent">
            Propuestas Conceptuales de Video Inspiration Rail
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Tres alternativas conceptuales para rediseñar el carril inferior de inspiración de videos. Se enfocan en maximizar la inmersión visual, mejorar la ergonomía de navegación y refinar la visualización de metadatos críticos sin saturar la pantalla.
          </p>
        </div>

        <div className="space-y-12 mb-16">
          {/* ========================================================================= */}
          {/* PROPUESTA R1: CINEMATIC SHOWCASE */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                    R1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                    CINEMATIC SHOWCASE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Relación de aspecto ancha de cine, brillo ambiental dinámico y leds de estado discretos.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/5 self-start sm:self-center font-mono">
                MATTE ULTRA-WIDE
              </span>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const durationMinutes = Math.max(1, Math.round(Number(video.duration_seconds || 0) / 60));
                const watchState = watchStatusById[video.youtube_video_id] || "not_finished";
                const isWatched = watchState === "watched";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                return (
                  <div
                    key={`r1-${video.youtube_video_id}`}
                    onClick={() => setCurrentVideo(video)}
                    className={cn(
                      "group relative w-[230px] h-[115px] shrink-0 overflow-hidden rounded-xl border bg-[#050505] transition-all duration-300 cursor-pointer shadow-lg",
                      isSelected 
                        ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]" 
                        : "border-white/[0.07] hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    )}
                  >
                    {/* Background thumbnail image */}
                    <img
                      src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"}
                      alt={video.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Ambient backlight simulation */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_20%,rgba(0,0,0,0.85)_100%)] z-10" />

                    {/* Top Technical Metadata */}
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
                      <span className="rounded bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold text-zinc-300 font-mono">
                        {durationMinutes} MIN
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isWatched && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" title="Completado" />
                        )}
                        {isSavedVideo && (
                          <BookmarkSimple size={10} weight="fill" className="text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                        )}
                        <span className="rounded bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold text-zinc-300 font-mono">
                          HD
                        </span>
                      </div>
                    </div>

                    {/* Bottom Title Info */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 z-20">
                      <p className="line-clamp-1 text-[11px] font-black text-white group-hover:text-red-400 transition-colors leading-tight">
                        {video.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[8.5px] font-bold text-zinc-400">
                        <span>{countryCodeToFlag(video.country_code)}</span>
                        <span className="opacity-40">•</span>
                        <span className="truncate uppercase tracking-wider">{video.country_name || video.country_code}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R2: GLASS BENTO HUD */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-black text-white">
                    R2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    GLASS BENTO HUD
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Estructura de cristal translúcido Bento con marcos anidados, bordes interactivos de neón y cápsulas de datos HUD.
                </p>
              </div>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/20 self-start sm:self-center font-mono">
                AERO GLASS BENTO
              </span>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const durationMinutes = Math.max(1, Math.round(Number(video.duration_seconds || 0) / 60));
                const watchState = watchStatusById[video.youtube_video_id] || "not_finished";
                const isWatched = watchState === "watched";
                const hasSponsor = idx % 3 === 0; // Simulate sponsor detection

                return (
                  <div
                    key={`r2-${video.youtube_video_id}`}
                    onClick={() => setCurrentVideo(video)}
                    className={cn(
                      "group relative w-[215px] h-[140px] shrink-0 p-1.5 flex flex-col justify-between rounded-2xl border transition-all duration-300 cursor-pointer",
                      isSelected 
                        ? "bg-[#091522]/60 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                        : "bg-white/[0.015] backdrop-blur-md border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#060e18]/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.06)]"
                    )}
                  >
                    {/* Embedded Thumbnail Frame */}
                    <div className="relative h-[72px] w-full rounded-xl overflow-hidden bg-black/40 border border-white/5">
                      <img
                        src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"}
                        alt={video.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:scale-[1.03] transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* Top Overlay Badges inside frame */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        {hasSponsor ? (
                          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[7px] font-black uppercase px-1 py-0.5 rounded tracking-wide">
                            SPONSOR
                          </span>
                        ) : (
                          <span />
                        )}
                        {isWatched && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[7px] font-black uppercase px-1 py-0.5 rounded tracking-wide">
                            VISTO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="px-1 mt-1.5">
                      <p className="line-clamp-1 text-[10.5px] font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors leading-tight">
                        {video.title}
                      </p>
                    </div>

                    {/* Bottom Bento Capsules Row */}
                    <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[7px]">
                      {/* Capsule 1: Dur */}
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center text-center">
                        <Clock size={10} className="text-cyan-400" />
                        <span className="text-[7.5px] text-zinc-300 font-bold mt-0.5">{durationMinutes}m</span>
                      </div>
                      {/* Capsule 2: Views */}
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center text-center">
                        <Eye size={10} className="text-cyan-400" />
                        <span className="text-[7.5px] text-zinc-300 font-bold mt-0.5">
                          {formatCompactNumber(Number(video.view_count || 0))}
                        </span>
                      </div>
                      {/* Capsule 3: Country */}
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] leading-none">{countryCodeToFlag(video.country_code)}</span>
                        <span className="text-[7.5px] text-zinc-400 font-bold truncate mt-0.5">
                          {video.country_code}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R3: EDITORIAL SWISS GRID */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200 text-[10px] font-black text-black">
                    R3
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                    EDITORIAL SWISS GRID
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Estilo editorial stark de alto contraste, miniaturas en blanco y negro, bordes rígidos e índices tipográficos gigantes.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded self-start sm:self-center font-mono">
                SWISS MONOCHROME
              </span>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const durationMinutes = Math.max(1, Math.round(Number(video.duration_seconds || 0) / 60));
                const hasSponsor = idx % 4 === 1;

                return (
                  <div
                    key={`r3-${video.youtube_video_id}`}
                    onClick={() => setCurrentVideo(video)}
                    className={cn(
                      "group relative w-[185px] h-[155px] p-2 flex flex-col justify-between transition-all duration-300 cursor-pointer rounded-none bg-[#08080a] border",
                      isSelected 
                        ? "border-white shadow-[4px_4px_0_rgba(255,255,255,1)]" 
                        : "border-zinc-800 hover:border-zinc-400 hover:shadow-[4px_4px_0_rgba(255,255,255,0.15)]"
                    )}
                  >
                    {/* Big Outlined Index Number behind */}
                    <span className="absolute bottom-2 right-2 text-[28px] font-mono font-black text-white/[0.02] pointer-events-none group-hover:text-white/[0.06] transition-all duration-300">
                      0{idx + 1}
                    </span>

                    {/* Grayscale Thumbnail with Sharp Frame */}
                    <div className="relative h-[78px] w-full overflow-hidden border border-zinc-800 rounded-none bg-zinc-950">
                      <img
                        src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"}
                        alt={video.title}
                        className="absolute inset-0 h-full w-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
                        loading="lazy"
                      />

                      {/* Tag floating like a designer label */}
                      {hasSponsor && (
                        <div className="absolute top-0 left-0 bg-white text-black text-[7px] font-mono px-1.5 py-0.5 uppercase tracking-widest font-black">
                          SPONSOR
                        </div>
                      )}
                    </div>

                    {/* Text Area */}
                    <div className="relative z-10 flex-1 flex flex-col justify-between pt-2">
                      <p className="line-clamp-2 font-mono text-[9px] uppercase tracking-wider text-[#dcdce0] group-hover:text-white leading-snug">
                        {video.title}
                      </p>
                      
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 border-t border-zinc-900 pt-1">
                        <span>{video.country_name || video.country_code}</span>
                        <span>{durationMinutes} MIN</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TITULO Y DIVISION DE VARIANTES CON SPONSORS (PETICIÓN USUARIO) */}
        {/* ========================================================================= */}
        <div className="mt-24 mb-10 border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              Sponsor & Status Showcase
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Variantes de R1</span>
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-white to-zinc-400 bg-clip-text text-transparent">
            Evolución R1: Sponsors y Estados Prominentes
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            3 nuevas versiones basadas en la proporción original, pero donde los sponsors se destacan enormemente (con diferenciación visual si hay varios), los estados (Visto, Completado, Favorito) son explícitos, y el título se lee completo. Se mantienen los colores lógicos de los bordes según la interacción.
          </p>
        </div>

        <div className="space-y-12 mb-16">
          {/* ========================================================================= */}
          {/* PROPUESTA R4: PROMINENT OVERLAY BADGES (6 ESTILOS) */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                    R4
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
                    OVERLAYS EXTREMOS (6 ESTILOS DISTINTOS)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Cada tarjeta demuestra una técnica distinta de <strong>superposición (overlay)</strong> para el patrocinador.
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const watchState = watchStatusById[video.youtube_video_id] || "none";
                const isWatched = watchState === "watched";
                const isStarted = watchState === "not_finished";
                const isWatchLater = watchState === "watch_later";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                const borderClass = isWatched 
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : isStarted 
                  ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : isSelected 
                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" 
                  : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

                const badges = [];
                if (isWatched) badges.push({ text: "COMPLETADO", color: "bg-emerald-500 text-emerald-950" });
                else if (isStarted) badges.push({ text: "VISTO", color: "bg-amber-500 text-amber-950" });
                else if (isWatchLater) badges.push({ text: "VER MÁS TARDE", color: "bg-blue-500 text-blue-950" });
                if (isSavedVideo) badges.push({ text: "FAVORITO", color: "bg-rose-500 text-white" });

                return (
                  <div key={`r4-${video.youtube_video_id}`} onClick={() => setCurrentVideo(video)} className={cn("group relative w-[260px] h-[146px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#050505] transition-all duration-300 cursor-pointer", borderClass)}>
                    <img src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 z-10" />

                    {/* STATUS BADGES SIEMPRE TOP LEFT */}
                    <div className="absolute top-2 left-2 z-30 flex flex-col gap-1.5 items-start">
                      {badges.map((badge, bidx) => (
                        <span key={bidx} className={cn("px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded shadow-sm", badge.color)}>
                          {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* SPONSOR RENDER LOGIC BASED ON IDX */}
                    {idx === 0 && (
                      /* 1. Diagonal Ribbon */
                      <div className="absolute -top-1 -right-8 z-20 w-32 origin-top-right rotate-45 bg-gradient-to-r from-orange-500 to-red-500 text-center shadow-lg">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white py-1">Airalo</p>
                      </div>
                    )}
                    {idx === 1 && (
                      /* 2. Floating Neon Sign */
                      <div className="absolute top-2 right-2 z-20 px-2 py-1 rounded-full border border-cyan-400 bg-cyan-950/80 shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                        <p className="text-[9px] font-black text-cyan-300 uppercase tracking-widest">NordVPN</p>
                      </div>
                    )}
                    {idx === 2 && (
                      /* 3. Top-Center Attached Pill */
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-4 py-0.5 rounded-b-xl bg-white text-black shadow-md border-b-2 border-x-2 border-zinc-200">
                        <p className="text-[8px] font-black uppercase">Booking.com</p>
                      </div>
                    )}
                    {idx === 3 && (
                      /* 4. Vertical Side Strip */
                      <div className="absolute top-0 right-0 bottom-0 w-6 bg-fuchsia-600/90 backdrop-blur-md z-20 flex items-center justify-center border-l border-white/20">
                        <p className="text-[9px] font-black text-white uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>IATI Seguros</p>
                      </div>
                    )}
                    {idx === 4 && (
                      /* 5. Floating Avatar/Badge cluster */
                      <div className="absolute top-2 right-2 z-20 flex -space-x-2">
                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-[7px] font-bold text-white border-2 border-black z-30 shadow-md">REV</div>
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] font-bold text-white border-2 border-black z-20 shadow-md">MON</div>
                        <div className="h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center text-[7px] font-bold text-white border-2 border-black z-10 shadow-md">IAT</div>
                      </div>
                    )}
                    {idx >= 5 && (
                      /* 6. Glowing Corner Triangle */
                      <div className="absolute top-0 right-0 z-20 w-0 h-0 border-t-[40px] border-l-[40px] border-t-amber-500 border-l-transparent">
                        <span className="absolute -top-[35px] -left-[18px] text-[8px] font-black text-amber-950 rotate-45">GURU</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-8 z-30">
                      <p className="text-[11px] font-bold text-white leading-tight shadow-black drop-shadow-md">
                        {video.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R5: FOOTER STRIP MADNESS (6 ESTILOS) */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white">
                    R5
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    BARRAS INFERIORES (6 ESTILOS DISTINTOS)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Barras dedicadas debajo del video. Desde marquesinas en movimiento hasta cupones interactivos y botones de Call to Action.
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const watchState = watchStatusById[video.youtube_video_id] || "none";
                const isWatched = watchState === "watched";
                const isStarted = watchState === "not_finished";
                const isWatchLater = watchState === "watch_later";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                const borderClass = isWatched 
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : isStarted 
                  ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : isSelected 
                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" 
                  : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

                const badges = [];
                if (isWatched) badges.push({ text: "COMPLETADO", color: "bg-emerald-500 text-emerald-950" });
                else if (isStarted) badges.push({ text: "VISTO", color: "bg-amber-500 text-amber-950" });
                else if (isWatchLater) badges.push({ text: "VER MÁS TARDE", color: "bg-blue-500 text-blue-950" });
                if (isSavedVideo) badges.push({ text: "FAVORITO", color: "bg-rose-500 text-white" });

                return (
                  <div key={`r5-${video.youtube_video_id}`} onClick={() => setCurrentVideo(video)} className={cn("group relative w-[260px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#050505] transition-all duration-300 cursor-pointer flex flex-col", borderClass)} style={{ height: "165px" }}>
                    <div className="relative flex-1 w-full overflow-hidden">
                      <img src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-10" />
                      
                      <div className="absolute top-2 right-2 z-20 flex gap-1.5 justify-end">
                        {badges.map((badge, bidx) => (
                          <span key={bidx} className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm border border-black/20", badge.color)}>
                            {badge.text}
                          </span>
                        ))}
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 z-20">
                        <p className="text-[11px] font-semibold text-white leading-tight shadow-black drop-shadow-md">
                          {video.title}
                        </p>
                      </div>
                    </div>

                    {/* VARIANTS FOR FOOTER BAR */}
                    {idx === 0 && (
                      /* 1. Huge CTA Button Full Width */
                      <div className="shrink-0 bg-blue-600 hover:bg-blue-500 transition-colors p-2 flex items-center justify-center z-20 text-white gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest">[ NORDVPN ] 50% OFF ➔</span>
                      </div>
                    )}
                    {idx === 1 && (
                      /* 2. Ticker / Marquee */
                      <div className="shrink-0 bg-emerald-500 text-emerald-950 p-1 flex items-center overflow-hidden z-20 relative">
                        <div className="animate-[spin_10s_linear_infinite] whitespace-nowrap flex space-x-2" style={{ animation: 'marquee 5s linear infinite' }}>
                          <span className="text-[9px] font-black uppercase tracking-widest flex-shrink-0">AIRALO ✦ AIRALO ✦ AIRALO ✦ AIRALO ✦</span>
                        </div>
                        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
                      </div>
                    )}
                    {idx === 2 && (
                      /* 3. Clean Split Bar */
                      <div className="shrink-0 bg-white/[0.05] border-t border-white/[0.05] p-2 flex items-center justify-between z-20">
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest">Sponsored by</span>
                        <div className="flex gap-1">
                          <span className="bg-white text-black px-1.5 py-0.5 rounded text-[8px] font-black">BOOKING</span>
                          <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">SKY</span>
                        </div>
                      </div>
                    )}
                    {idx === 3 && (
                      /* 4. Dashboard Tray with metrics */
                      <div className="shrink-0 bg-black border-t border-zinc-800 p-1.5 flex items-center justify-between z-20">
                        <div className="flex gap-2 text-[8px] font-mono text-zinc-400">
                          <span>👁 45K</span>
                          <span>♡ 1.2K</span>
                        </div>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-fuchsia-600 to-rose-600 text-[8px] font-black text-white rounded-sm uppercase">IATI</span>
                      </div>
                    )}
                    {idx === 4 && (
                      /* 5. Dashed Coupon Tear-away */
                      <div className="shrink-0 bg-zinc-900 border-t-2 border-dashed border-zinc-600 p-1.5 flex items-center justify-between z-20 text-yellow-400">
                        <span className="text-[10px]">✂</span>
                        <span className="text-[8px] font-mono font-bold tracking-widest uppercase border border-yellow-500/50 px-1">CODE: GURU20</span>
                        <span className="text-[8px] font-black uppercase">CIVITATIS</span>
                      </div>
                    )}
                    {idx >= 5 && (
                      /* 6. Glowing Brand Footer */
                      <div className="shrink-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 border-t border-rose-500/30 p-2 flex items-center justify-center z-20 shadow-[inset_0_0_10px_rgba(244,63,94,0.3)]">
                        <span className="text-[9px] font-black text-rose-300 uppercase tracking-[0.2em] drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]">HEARTBRAND</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R6: CINEMATIC SPONSOR HIGHLIGHT (6 ESTILOS) */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    R6
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-500">
                    INTEGRACIONES CINEMATOGRÁFICAS (6 ESTILOS)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Patrocinadores integrados profundamente en la composición de la imagen (marcas de agua masivas, cristal esmerilado, tercios inferiores, HUDs, etc).
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const watchState = watchStatusById[video.youtube_video_id] || "none";
                const isWatched = watchState === "watched";
                const isStarted = watchState === "not_finished";
                const isWatchLater = watchState === "watch_later";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                const borderClass = isWatched 
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : isStarted 
                  ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : isSelected 
                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" 
                  : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

                const badges = [];
                if (isWatched) badges.push({ text: "COMPLETADO", color: "bg-emerald-500 text-emerald-950" });
                else if (isStarted) badges.push({ text: "VISTO", color: "bg-amber-500 text-amber-950" });
                else if (isWatchLater) badges.push({ text: "VER MÁS TARDE", color: "bg-blue-500 text-blue-950" });
                if (isSavedVideo) badges.push({ text: "FAVORITO", color: "bg-rose-500 text-white" });

                return (
                  <div key={`r6-${video.youtube_video_id}`} onClick={() => setCurrentVideo(video)} className={cn("group relative w-[260px] h-[146px] shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-950 transition-all duration-300 cursor-pointer", borderClass)}>
                    <img src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.9)_100%)] z-10" />

                    <div className="absolute top-2 left-2 z-30 flex gap-1 flex-wrap w-[60%]">
                      {badges.map((badge, bidx) => (
                        <span key={bidx} className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase rounded shadow-sm border border-white/20", badge.color)}>
                          {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* VARIANTS FOR CINEMATIC INTEGRATION */}
                    {idx === 0 && (
                      /* 1. Massive Background Watermark */
                      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none mix-blend-overlay">
                        <span className="text-[70px] font-black text-white opacity-20 uppercase tracking-tighter -rotate-12 scale-150">AIRALO</span>
                      </div>
                    )}
                    {idx === 1 && (
                      /* 2. Frosted Glass Sidebar */
                      <div className="absolute top-0 right-0 bottom-0 w-16 bg-white/[0.05] backdrop-blur-xl border-l border-white/10 z-20 flex flex-col items-center justify-center gap-2">
                        <span className="text-[6px] font-bold text-zinc-400 uppercase">SPONSORS</span>
                        <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-black text-white">NORD</div>
                        <div className="h-6 w-6 rounded-full bg-rose-600 flex items-center justify-center text-[8px] font-black text-white">IATI</div>
                      </div>
                    )}
                    {idx === 2 && (
                      /* 3. Floating Lower Third News Style */
                      <div className="absolute bottom-8 left-0 z-20 bg-gradient-to-r from-red-600 to-transparent w-[80%] p-1.5 border-l-4 border-white">
                        <p className="text-[7.5px] font-black text-white uppercase tracking-widest drop-shadow-md">PRESENTED BY BOOKING.COM</p>
                      </div>
                    )}
                    {idx === 3 && (
                      /* 4. Glowing Circular Aura Center */
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-20 h-20 bg-fuchsia-500/20 blur-xl rounded-full flex items-center justify-center animate-pulse">
                        <span className="absolute z-20 text-[10px] font-black text-fuchsia-200 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]">REVOLUT</span>
                      </div>
                    )}
                    {idx === 4 && (
                      /* 5. Elegant Serif Typography Lockup */
                      <div className="absolute top-2 right-2 z-20 text-right opacity-80">
                        <p className="text-[7px] font-serif italic text-amber-200">En asociación con</p>
                        <p className="text-[12px] font-serif font-bold text-amber-400 uppercase tracking-widest border-b border-amber-400/30 pb-0.5">CIVITATIS</p>
                      </div>
                    )}
                    {idx >= 5 && (
                      /* 6. Futuristic HUD Bracket */
                      <div className="absolute top-3 right-3 z-20 text-cyan-400 font-mono text-[8px] font-bold flex items-center gap-1">
                        <span className="opacity-50">[</span>
                        <span className="animate-pulse">SYS.SPONSOR // GURU</span>
                        <span className="opacity-50">]</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 z-30">
                      <p className={cn("text-[11px] font-bold text-white leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,1)]", idx === 1 ? "pr-16" : "")}>
                        {video.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R7: HYBRID FUNCTIONAL LAYOUT */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                    R7
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                    HYBRID FUNCTIONAL LAYOUT
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Sponsors en la zona superior y una barra de metadatos (duración, país, y estados) dedicada en la inferior.
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const watchState = watchStatusById[video.youtube_video_id] || "none";
                const isWatched = watchState === "watched";
                const isStarted = watchState === "not_finished";
                const isWatchLater = watchState === "watch_later";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                const sponsors = idx === 0 ? ["Booking", "Sky"] : idx === 1 ? ["NordVPN"] : idx === 3 ? ["Heymondo"] : idx === 2 ? ["Booking.com"] : ["Civitatis"];

                const borderClass = isWatched 
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : isStarted 
                  ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : isSelected 
                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" 
                  : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

                const badges = [];
                if (isWatched) badges.push({ text: "COMPLETADO", color: "bg-emerald-500 text-emerald-950" });
                else if (isStarted) badges.push({ text: "VISTO", color: "bg-amber-500 text-amber-950" });
                else if (isWatchLater) badges.push({ text: "VER MÁS TARDE", color: "bg-blue-500 text-blue-950" });
                if (isSavedVideo) badges.push({ text: "FAVORITO", color: "bg-rose-500 text-white" });

                return (
                  <div key={`r7-${video.youtube_video_id}`} onClick={() => setCurrentVideo(video)} className={cn("group relative w-[260px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#050505] transition-all duration-300 cursor-pointer flex flex-col", borderClass)} style={{ height: "165px" }}>
                    
                    {/* VARIANTS FOR TOP SPONSOR SECTION */}
                    {sponsors.length >= 2 && (
                      <div className="shrink-0 bg-white/[0.05] border-b border-white/[0.05] p-2 flex items-center justify-between z-20">
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest">Sponsored by</span>
                        <div className="flex gap-1">
                          {sponsors.map((s, i) => (
                            <span key={i} className="bg-white text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {sponsors.length === 1 && idx % 3 === 0 && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-4 py-0.5 rounded-b-xl bg-white text-black shadow-md border-b-2 border-x-2 border-zinc-200">
                        <p className="text-[8px] font-black uppercase">{sponsors[0]}</p>
                      </div>
                    )}

                    {sponsors.length === 1 && idx % 3 === 1 && (
                      <div className="shrink-0 bg-blue-600 hover:bg-blue-500 transition-colors p-2 flex items-center justify-center z-20 text-white gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest">[ {sponsors[0]} ] 50% OFF ➔</span>
                      </div>
                    )}

                    {sponsors.length === 1 && idx % 3 === 2 && (
                      <div className="shrink-0 bg-zinc-900 border-b-2 border-dashed border-zinc-600 p-1.5 flex items-center justify-between z-20 text-yellow-400">
                        <span className="text-[8px] font-black uppercase">{sponsors[0]}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">✂</span>
                          <span className="text-[8px] font-mono font-bold tracking-widest uppercase border border-yellow-500/50 px-1">CODE: GURU20</span>
                        </div>
                      </div>
                    )}

                    <div className="relative flex-1 w-full overflow-hidden">
                      <img src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" loading="lazy" />

                      <div className="absolute top-2 left-2 z-20 flex gap-1.5 justify-start">
                        {badges.map((badge, bidx) => (
                          <span key={bidx} className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm border border-black/20", badge.color)}>
                            {badge.text}
                          </span>
                        ))}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm p-2">
                        <p className="text-[11px] font-semibold text-white leading-tight drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
                          {video.title}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 bg-black border-t border-zinc-800 p-1.5 flex items-center justify-between z-20 relative">
                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 w-1/3 justify-start">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>45K</span>
                      </div>
                      
                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 justify-center w-1/3 absolute left-1/2 -translate-x-1/2">
                        <span className="text-[10px]">🇯🇵</span>
                        <span>Japón</span>
                      </div>

                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 w-1/3 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>14:20</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROPUESTA R8: HYBRID PRODUCTION READY (FINAL) */}
          {/* ========================================================================= */}
          <div className="space-y-4 rounded-2xl border border-white/[0.04] bg-[#05080c]/40 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-white/[0.05] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-black text-white">
                    R8
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-green-500">
                    HYBRID FINAL (PRODUCCIÓN)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Versión final con lógica realista: Tarjetas normales (sin sponsor), opciones intercambiables para 1 sponsor (CTA rojo, Pill blanco, Cupón amarillo) y barra unificada para múltiples sponsors.
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-thin select-none pr-4">
              {sampleVideos.map((video, idx) => {
                const isSelected = video.youtube_video_id === currentVideo.youtube_video_id;
                const watchState = watchStatusById[video.youtube_video_id] || "none";
                const isWatched = watchState === "watched";
                const isStarted = watchState === "not_finished";
                const isWatchLater = watchState === "watch_later";
                const isSavedVideo = savedIds.has(video.youtube_video_id);

                // Lógica final realista:
                // idx 0, 4, 5: Normal (Sin sponsor)
                // idx 1: 1 Sponsor (Estilo CTA, Color Rojo)
                // idx 2: 1 Sponsor (Estilo Cupón, Color Amarillo)
                // idx 3: 2 Sponsors (Split Bar)
                const sponsors = idx === 1 ? ["NordVPN"] : idx === 2 ? ["GuruWalk"] : idx === 3 ? ["Booking", "Sky"] : [];

                const borderClass = isWatched 
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : isStarted 
                  ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : isSelected 
                  ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" 
                  : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

                const badges = [];
                if (isWatched) badges.push({ text: "COMPLETADO", color: "bg-emerald-500 text-emerald-950" });
                else if (isStarted) badges.push({ text: "VISTO", color: "bg-amber-500 text-amber-950" });
                else if (isWatchLater) badges.push({ text: "VER MÁS TARDE", color: "bg-blue-500 text-blue-950" });
                if (isSavedVideo) badges.push({ text: "FAVORITO", color: "bg-rose-500 text-white" });

                return (
                  <div key={`r8-${video.youtube_video_id}`} onClick={() => setCurrentVideo(video)} className={cn("group relative w-[260px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#050505] transition-all duration-300 cursor-pointer flex flex-col", borderClass)} style={{ height: "165px" }}>
                    
                    {/* SPONSOR LOGIC (PRODUCCIÓN) */}
                    {sponsors.length >= 2 && (
                      <div className="shrink-0 bg-white/[0.05] border-b border-white/[0.05] p-2 flex items-center justify-between z-20">
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest">Sponsored by</span>
                        <div className="flex gap-1">
                          {sponsors.map((s, i) => (
                            <span key={i} className="bg-white text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {sponsors.length === 1 && idx === 1 && (
                      <div className="shrink-0 bg-red-600 hover:bg-red-500 transition-colors p-2 flex items-center justify-center z-20 text-white gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest">[ {sponsors[0]} ] 50% OFF ➔</span>
                      </div>
                    )}

                    {sponsors.length === 1 && idx === 2 && (
                      <div className="shrink-0 bg-zinc-900 border-b-2 border-dashed border-zinc-600 p-1.5 flex items-center justify-between z-20 text-yellow-400">
                        <span className="text-[8px] font-black uppercase">{sponsors[0]}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">✂</span>
                          <span className="text-[8px] font-mono font-bold tracking-widest uppercase border border-yellow-500/50 px-1">CODE: GURU20</span>
                        </div>
                      </div>
                    )}

                    <div className="relative flex-1 w-full overflow-hidden">
                      <img src={video.thumbnail_url || "/creators/final-cta-map-mockup.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" loading="lazy" />

                      <div className="absolute top-2 left-2 z-20 flex gap-1.5 justify-start">
                        {badges.map((badge, bidx) => (
                          <span key={bidx} className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm border border-black/20", badge.color)}>
                            {badge.text}
                          </span>
                        ))}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm p-2">
                        <p className="text-[11px] font-semibold text-white leading-tight drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
                          {video.title}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 bg-black border-t border-zinc-800 p-1.5 flex items-center justify-between z-20 relative">
                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 w-1/3 justify-start">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>45K</span>
                      </div>
                      
                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 justify-center w-1/3 absolute left-1/2 -translate-x-1/2">
                        <span className="text-[10px]">🇯🇵</span>
                        <span>Japón</span>
                      </div>

                      <div className="flex gap-1.5 items-center text-[8px] font-mono text-zinc-400 w-1/3 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>14:20</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Informative compliance bottom details */}
        <footer className="mt-16 rounded-xl border border-white/[0.06] bg-[#060b13]/80 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-red-500">
            <Compass size={18} weight="bold" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Garantía de Cumplimiento de API de YouTube
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Cada propuesta ha sido diseñada cumpliendo estrictamente el{" "}
            <code className="text-red-400 text-[10px] bg-red-950/20 px-1 py-0.5 rounded">
              Contrato de Implementación: YouTube Embed Oficial
            </code>
            . El reproductor oficial <code className="text-zinc-200">YouTubeEmbedPlayer</code> permanece sin
            modificaciones, lo que garantiza el correcto conteo de reproducciones, retención de anuncios, protección
            de derechos de autor (copyright) y soporte para contenido con restricciones de edad. Ningún overlay se dibuja sobre el player.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500">
            <span>✓ VP SIZE &gt;= 200X200 (16:9 PREFERRED)</span>
            <span>✓ CONEXIÓN ORIGIN COMPLETA</span>
            <span>✓ SIN AUTOPLAY INTRUSIVO</span>
            <span>✓ BOTÓN VER EN YT SIEMPRE DISPONIBLE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
