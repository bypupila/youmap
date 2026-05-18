"use client";

import { useEffect, useState } from "react";
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
  X,
} from "@phosphor-icons/react";
import posthog from "posthog-js";
import type { VideoActivityController } from "@/components/map/video-activity";
import {
  buildCountryVideoSections,
  countryCodeToFlag,
  formatCompactNumber,
  formatVideoDate,
  formatVideoPlace,
  getYouTubeHref,
  getVideoWatchStateLabel,
  getVideoWatchStateTone,
} from "@/components/map/video-viewer-utils";
import { YouTubeEmbedPlayer } from "@/components/map/youtube-embed-player";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DesktopVideoMapCardProps {
  videos: TravelVideoLocation[];
  currentVideo: TravelVideoLocation | null;
  activity: VideoActivityController;
  onClose: () => void;
  onChangeVideo: (video: TravelVideoLocation) => void;
  onOpenInYouTube?: (video: TravelVideoLocation) => void;
  openButtonLabel?: string;
  playbackCommand?: { id: number; action: "pause" | "play" } | null;
  onPlaybackStateChange?: (state: "playing" | "paused" | "ended") => void;
  variant?: "default" | "youtube-theater";
}

export function DesktopVideoMapCard({
  videos,
  currentVideo,
  activity,
  onClose,
  onChangeVideo,
  onOpenInYouTube,
  openButtonLabel,
  playbackCommand,
  onPlaybackStateChange,
  variant = "default",
}: DesktopVideoMapCardProps) {
  const [watchMenuOpen, setWatchMenuOpen] = useState(false);
  useEffect(() => {
    setWatchMenuOpen(false);
  }, [currentVideo?.youtube_video_id]);
  if (!currentVideo) return null;

  const selectedVideo = currentVideo;
  const sections = buildCountryVideoSections(videos, selectedVideo);
  const orderedVideos = sections.flatMap((section) => section.videos);
  const currentIndex = Math.max(
    0,
    orderedVideos.findIndex((video) => video.youtube_video_id === selectedVideo.youtube_video_id)
  );
  const youtubeHref = getYouTubeHref(selectedVideo);
  const isSeen = activity.seenIds.has(selectedVideo.youtube_video_id);
  const isOpenedInYoutube = activity.openedIds.has(selectedVideo.youtube_video_id);
  const isSaved = activity.savedIds.has(selectedVideo.youtube_video_id);
  const isFeatured = activity.featuredIds.has(selectedVideo.youtube_video_id);
  const watchStatus = activity.watchStatusById[selectedVideo.youtube_video_id] || (isSeen ? "not_finished" : undefined);
  const watchBadgeLabel = getVideoWatchStateLabel({
    openedInYoutube: isOpenedInYoutube,
    watchStatus,
  });
  const watchBadgeTone = getVideoWatchStateTone({
    openedInYoutube: isOpenedInYoutube,
    watchStatus,
  });

  function go(direction: -1 | 1) {
    if (orderedVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + orderedVideos.length) % orderedVideos.length;
    const nextVideo = orderedVideos[nextIndex];
    if (nextVideo) onChangeVideo(nextVideo);
  }

  function openYouTubeVideo() {
    if (!youtubeHref) return;

    if (!selectedVideo.made_for_kids) {
      posthog.capture("video_youtube_opened", {
        video_id: selectedVideo.youtube_video_id,
        video_title: selectedVideo.title,
        country_code: selectedVideo.country_code,
        country_name: selectedVideo.country_name,
      });
    }
    activity.markVideoOpened(selectedVideo.youtube_video_id);
    onOpenInYouTube?.(selectedVideo);
    window.open(youtubeHref, "_blank", "noopener");
  }

  const isTheater = variant === "youtube-theater";

  if (isTheater) {
    return (
      <div className="pointer-events-auto space-y-4">
        <article className="group relative overflow-hidden rounded-xl border border-red-500/35 bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.04),transparent_60%)]" />

          <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 justify-center">
                <h2 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{selectedVideo.title}</h2>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                  {countryCodeToFlag(selectedVideo.country_code)} {selectedVideo.country_name || selectedVideo.country_code}
                </span>
                <span>•</span>
                <span className="text-[#ff5a3d]">Video {currentIndex + 1} de {Math.max(1, orderedVideos.length)}</span>
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => activity.toggleVideoFeatured(selectedVideo.youtube_video_id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded border px-2.5 text-[10px] font-bold transition-all active:scale-95",
                  isFeatured ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Star size={11} weight={isFeatured ? "fill" : "regular"} />
                Favorito
              </button>
              <button
                type="button"
                onClick={() => {
                  activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watch_later");
                  if (!isSaved) activity.toggleVideoSaved(selectedVideo.youtube_video_id);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded border px-2.5 text-[10px] font-bold transition-all active:scale-95",
                  watchStatus === "watch_later" || isSaved
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <BookmarkSimple size={11} weight={isSaved ? "fill" : "regular"} />
                Ver Más Tarde
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7.5 w-7.5 items-center justify-center rounded-md border border-white/5 bg-white/[0.02] text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white active:scale-95"
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="px-4 pb-2">
            <div className="relative overflow-hidden bg-black">
              <YouTubeEmbedPlayer
                videoId={selectedVideo.youtube_video_id}
                title={selectedVideo.title}
                youtubeHref={youtubeHref}
                thumbnailUrl={selectedVideo.thumbnail_url}
                openButtonLabel="YouTube"
                frameClassName="rounded-none border-0"
                playbackCommand={playbackCommand}
                onOpenInYouTube={openYouTubeVideo}
                onPlaybackStateChange={onPlaybackStateChange}
                isMadeForKids={Boolean(selectedVideo.made_for_kids)}
              />
            </div>
          </div>

          <div className="border-t border-white/[0.04] bg-[#0c0c0c]/85 px-4 py-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <button type="button" onClick={() => go(-1)} className="flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[11px] font-bold text-zinc-300 transition-all hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-500 active:scale-95">
                <CaretLeft size={13} weight="bold" />
                ANTERIOR
              </button>

              <div className="relative justify-self-center">
                <button
                  type="button"
                  onClick={() => setWatchMenuOpen((current) => !current)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded border px-2.5 text-[9px] font-black tracking-wider transition-all",
                    watchBadgeTone === "success"
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  )}
                >
                  <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                  {watchBadgeLabel === "COMPLETADO" ? "COMPLETADO" : "INICIADO"}
                  <CaretDown size={10} />
                </button>
                {watchMenuOpen ? (
                  <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                    <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_finished"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-red-500">INICIADO</button>
                    <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watched"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-emerald-500">COMPLETADO</button>
                    <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watch_later"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-white">VER MÁS TARDE</button>
                  </div>
                ) : null}
              </div>

              <button type="button" onClick={() => go(1)} className="flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[11px] font-bold text-zinc-300 transition-all hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-500 active:scale-95">
                SIGUIENTE
                <CaretRight size={13} weight="bold" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.03] pt-2.5 text-[11px] text-zinc-500">
              <span className="flex min-w-0 max-w-[120px] items-center gap-1 truncate font-semibold">
                <MapPin size={11} className="text-red-500" />
                <span className="truncate">{formatVideoPlace(selectedVideo)}</span>
              </span>
              <span>|</span>
              <span className="flex items-center gap-1"><Eye size={11} />{formatCompactNumber(Number(selectedVideo.view_count || 0))} vistas</span>
              <span>|</span>
              <span className="flex items-center gap-1"><Clock size={11} />{formatVideoDate(selectedVideo.published_at)}</span>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "pointer-events-auto w-full overflow-hidden text-sm text-white",
        isTheater
          ? "rounded-xl border border-white/[0.06] bg-[#080808]/95 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]"
          : "rounded-xl border border-white/10 bg-[#07101a]/90 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.94)] backdrop-blur-2xl"
      )}
    >
      <header className={cn("flex justify-between gap-2", isTheater ? "items-start px-3 py-2.5" : "items-center px-2.5 py-1.5")}>
        <div className="min-w-0">
          {isTheater ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                <h2 className="truncate text-[12px] font-extrabold text-white">{selectedVideo.title}</h2>
              </div>
              <p className="mt-1 truncate text-[11px] text-zinc-400">
                {countryCodeToFlag(selectedVideo.country_code)} {selectedVideo.country_name || selectedVideo.country_code} · Video {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
              </p>
            </>
          ) : (
            <p className="mt-0.5 truncate text-[12px] text-[#d8dee6]">
            {countryCodeToFlag(selectedVideo.country_code)} {selectedVideo.country_name || selectedVideo.country_code} · {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => activity.toggleVideoSaved(selectedVideo.youtube_video_id)}
            aria-label={isSaved ? "Quitar de guardados" : "Guardar video"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-95",
              isSaved
                ? "border-[rgba(255, 90, 61,0.36)] bg-[rgba(255, 90, 61,0.18)] text-[#ffb7b3]"
                : isTheater
                  ? "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                  : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
            )}
          >
            <BookmarkSimple size={14} weight={isSaved ? "fill" : "regular"} />
          </button>
          <button
            type="button"
            onClick={() => activity.toggleVideoFeatured(selectedVideo.youtube_video_id)}
            aria-label={isFeatured ? "Quitar destacado" : "Destacar video"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-95",
              isFeatured
                ? "border-[rgba(255, 90, 61,0.36)] bg-[rgba(255, 90, 61,0.18)] text-[#ffb7b3]"
                : isTheater
                  ? "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                  : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
            )}
          >
            <Star size={14} weight={isFeatured ? "fill" : "regular"} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar video seleccionado"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition active:scale-95",
              isTheater
                ? "border-white/[0.06] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
            )}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className={cn("px-2.5 pb-1", isTheater && "border-t border-white/[0.04] bg-[#0c0c0c]/85 px-3 py-2.5")}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className={cn(
              "justify-self-start flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md border px-2 text-[11px] text-white transition active:scale-95",
              isTheater
                ? "border-white/[0.05] bg-[#141414] text-zinc-300 hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-400"
                : "border-white/10 bg-black/45 backdrop-blur-md hover:bg-black/75"
            )}
            aria-label="Video anterior"
          >
            <CaretLeft size={15} />
            Anterior
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setWatchMenuOpen((current) => !current)}
            className={cn(
                "inline-flex h-8 items-center gap-1 border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition hover:brightness-110",
                isTheater ? "rounded" : "rounded-full",
                watchBadgeTone === "success"
                  ? "border-[rgba(85,200,123,0.45)] bg-[rgba(85,200,123,0.12)] text-[#c8f3d6]"
                  : watchBadgeTone === "active"
                    ? "border-[rgba(255,186,73,0.4)] bg-[rgba(255,186,73,0.12)] text-[#ffe0ab]"
                    : "border-white/10 bg-white/[0.04] text-[#d8dee6]"
              )}
              aria-label="Cambiar estado de avance del video"
            >
              <BatteryCharging size={12} weight="fill" />
              {watchBadgeLabel}
              <CaretDown size={12} />
            </button>
            {watchMenuOpen ? (
              <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[160px] -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#060a11] p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_finished");
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-white/[0.08]",
                    watchStatus === "not_finished" && "text-[#ffd37c]"
                  )}
                >
                  INICIADO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watched");
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-white/[0.08]",
                    watchStatus === "watched" && "text-[#7de1a2]"
                  )}
                >
                  COMPLETADO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_finished");
                    if (!isSaved) activity.toggleVideoSaved(selectedVideo.youtube_video_id);
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-white/[0.08]",
                    (watchStatus === "watch_later" || !watchStatus) && "text-[#d8dee6]"
                  )}
                >
                  VER MAS TARDE
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            className={cn(
              "justify-self-end flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md border px-2 text-[11px] text-white transition active:scale-95",
              isTheater
                ? "border-white/[0.05] bg-[#141414] text-zinc-300 hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-400"
                : "border-white/10 bg-black/45 backdrop-blur-md hover:bg-black/75"
            )}
            aria-label="Siguiente video"
          >
            Siguiente
            <CaretRight size={15} />
          </button>
        </div>
      </div>

      <div className={cn("p-2", isTheater && "p-3 pt-2")}>
        <div className={cn("rounded-xl p-2", isTheater ? "bg-black" : "border border-white/10 bg-black/35")}>
          <YouTubeEmbedPlayer
            videoId={selectedVideo.youtube_video_id}
            title={selectedVideo.title}
            youtubeHref={youtubeHref}
            thumbnailUrl={selectedVideo.thumbnail_url}
            openButtonLabel={openButtonLabel || (isOpenedInYoutube ? "Visto en YouTube" : "Abrir en YouTube")}
            playbackCommand={playbackCommand}
            onOpenInYouTube={openYouTubeVideo}
            onPlaybackStateChange={onPlaybackStateChange}
            isMadeForKids={Boolean(selectedVideo.made_for_kids)}
          />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11.5px] text-[#aab2bc]">
          <p className="flex min-w-0 items-center justify-center gap-1.5">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{formatVideoPlace(selectedVideo)}</span>
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <Eye size={13} />
            {formatCompactNumber(Number(selectedVideo.view_count || 0))} vistas
          </p>
          <p className="flex shrink-0 items-center justify-center gap-1.5">
            <Clock size={13} />
            {formatVideoDate(selectedVideo.published_at)}
          </p>
        </div>
      </div>
    </article>
  );
}
