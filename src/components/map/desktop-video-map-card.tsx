"use client";

import Image from "next/image";
import {
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  Play,
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
  formatVideoDuration,
  formatVideoPlace,
  getYouTubeHref,
} from "@/components/map/video-viewer-utils";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

interface DesktopVideoMapCardProps {
  videos: TravelVideoLocation[];
  currentVideo: TravelVideoLocation | null;
  activity: VideoActivityController;
  onClose: () => void;
  onChangeVideo: (video: TravelVideoLocation) => void;
}

export function DesktopVideoMapCard({
  videos,
  currentVideo,
  activity,
  onClose,
  onChangeVideo,
}: DesktopVideoMapCardProps) {
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
  const isSaved = activity.savedIds.has(selectedVideo.youtube_video_id);
  const isFeatured = activity.featuredIds.has(selectedVideo.youtube_video_id);

  function go(direction: -1 | 1) {
    if (orderedVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + orderedVideos.length) % orderedVideos.length;
    const nextVideo = orderedVideos[nextIndex];
    if (nextVideo) onChangeVideo(nextVideo);
  }

  function openYouTubeVideo() {
    if (!youtubeHref) return;

    posthog.capture("video_youtube_opened", {
      video_id: selectedVideo.youtube_video_id,
      video_title: selectedVideo.title,
      country_code: selectedVideo.country_code,
      country_name: selectedVideo.country_name,
    });
    activity.markVideoOpened(selectedVideo.youtube_video_id);
    window.open(youtubeHref, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="pointer-events-auto w-full overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/90 text-sm text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,0.94)] backdrop-blur-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#ff6b64]">Video seleccionado</p>
          <p className="mt-0.5 truncate text-[12px] text-[#d8dee6]">
            {countryCodeToFlag(selectedVideo.country_code)} {selectedVideo.country_name || selectedVideo.country_code} / {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar video seleccionado"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#dce4ed] transition hover:bg-white/[0.08] active:scale-95"
        >
          <X size={15} />
        </button>
      </header>

      <div className="p-2">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/35">
          <div className="aspect-[16/8.7]">
            {selectedVideo.thumbnail_url ? (
              <Image
                src={toCompactYouTubeThumbnail(selectedVideo.thumbnail_url) || selectedVideo.thumbnail_url}
                alt={selectedVideo.title}
                width={640}
                height={360}
                sizes="(min-width: 1536px) 480px, (min-width: 1280px) 380px, 340px"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-[12px] text-[#9da5ae]">
                Miniatura no disponible
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.62))]" />
          <button
            type="button"
            onClick={openYouTubeVideo}
            className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#ff0000] text-white shadow-[0_18px_44px_-18px_rgba(255,0,0,0.95)] transition hover:scale-105 hover:bg-[#e03128] active:scale-95 xl:h-14 xl:w-14"
            aria-label="Abrir video en YouTube"
          >
            <Play size={24} weight="fill" className="translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95"
            aria-label="Video anterior"
          >
            <CaretLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95"
            aria-label="Siguiente video"
          >
            <CaretRight size={17} />
          </button>
          <span className={cn("absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_12px_30px_-16px_rgba(255,0,0,0.9)]", isSeen ? "bg-[#ff0000] text-white" : "bg-white text-[#c91f18]")}>
            {isSeen ? <CheckCircle size={12} weight="fill" /> : null}
            {isSeen ? "Visto" : "Nuevo"}
          </span>
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-1 text-[10px] font-medium text-white">
            {formatVideoDuration(selectedVideo.duration_seconds)}
          </span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-[17px] text-[#f4f7fb] xl:text-[13px] xl:leading-[18px]">{selectedVideo.title}</h3>
        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 text-[10.5px] text-[#aab2bc]">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{formatVideoPlace(selectedVideo)}</span>
          </p>
          <p className="flex shrink-0 items-center gap-1.5">
            <Clock size={13} />
            {formatVideoDate(selectedVideo.published_at)}
          </p>
          <p className="flex items-center gap-1.5">
            <Eye size={13} />
            {formatCompactNumber(Number(selectedVideo.view_count || 0))} vistas
          </p>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => activity.toggleVideoSaved(selectedVideo.youtube_video_id)}
              aria-label={isSaved ? "Quitar de guardados" : "Guardar video"}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-95",
                isSaved ? "border-[rgba(255,0,0,0.36)] bg-[rgba(255,0,0,0.18)] text-[#ffb7b3]" : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
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
                isFeatured ? "border-[rgba(255,0,0,0.36)] bg-[rgba(255,0,0,0.18)] text-[#ffb7b3]" : "border-white/10 bg-white/[0.04] text-[#dce4ed] hover:bg-white/[0.08]"
              )}
            >
              <Star size={14} weight={isFeatured ? "fill" : "regular"} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
