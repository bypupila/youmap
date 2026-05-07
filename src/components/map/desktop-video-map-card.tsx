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
  onPlaybackStateChange?: (state: "playing" | "paused" | "ended") => void;
}

export function DesktopVideoMapCard({
  videos,
  currentVideo,
  activity,
  onClose,
  onChangeVideo,
  onOpenInYouTube,
  openButtonLabel,
  onPlaybackStateChange,
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
  const watchStatus = activity.watchStatusById[selectedVideo.youtube_video_id] || (isSeen ? "watched" : undefined);
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

  return (
    <article className="pointer-events-auto w-full overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/90 text-sm text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,0.94)] backdrop-blur-2xl">
      <header className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="mt-0.5 truncate text-[12px] text-[#d8dee6]">
            {countryCodeToFlag(selectedVideo.country_code)} {selectedVideo.country_name || selectedVideo.country_code} · {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => activity.toggleVideoSaved(selectedVideo.youtube_video_id)}
            aria-label={isSaved ? "Quitar de guardados" : "Guardar video"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-95",
              isSaved ? "border-[rgba(255, 90, 61,0.36)] bg-[rgba(255, 90, 61,0.18)] text-[#ffb7b3]" : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
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
              isFeatured ? "border-[rgba(255, 90, 61,0.36)] bg-[rgba(255, 90, 61,0.18)] text-[#ffb7b3]" : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
            )}
          >
            <Star size={14} weight={isFeatured ? "fill" : "regular"} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar video seleccionado"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#dce4ed] transition hover:bg-white/[0.08] active:scale-95"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="p-2">
        <div className="rounded-xl border border-white/10 bg-black/35 p-2">
          <YouTubeEmbedPlayer
            videoId={selectedVideo.youtube_video_id}
            title={selectedVideo.title}
            youtubeHref={youtubeHref}
            thumbnailUrl={selectedVideo.thumbnail_url}
            openButtonLabel={openButtonLabel || (isOpenedInYoutube ? "Visto en YouTube" : "Abrir en YouTube")}
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

        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="justify-self-start flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md border border-white/10 bg-black/45 px-2 text-[11px] text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95"
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
                "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition hover:brightness-110",
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
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watch_later");
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-white/[0.08]",
                    (watchStatus === "watch_later" || !watchStatus) && "text-[#d8dee6]"
                  )}
                >
                  SIN INICIAR
                </button>
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
                  POR TERMINAR
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            className="justify-self-end flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md border border-white/10 bg-black/45 px-2 text-[11px] text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95"
            aria-label="Siguiente video"
          >
            Siguiente
            <CaretRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
