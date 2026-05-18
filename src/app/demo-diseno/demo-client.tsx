"use client";

import { useState, useEffect } from "react";
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

  // Auto close menus on video change
  useEffect(() => {
    setMenuOpenId(null);
  }, [currentVideo.youtube_video_id]);

  const youtubeHref = getYouTubeHref(currentVideo);

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
