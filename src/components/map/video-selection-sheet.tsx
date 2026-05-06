"use client";

import Image from "next/image";
import { useMemo } from "react";
import { CaretLeft, CaretRight, ChatCircle, CheckCircle, Clock, Eye, Heart, MapPin, Play, X } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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
import { YouTubeEmbedPlayer } from "@/components/map/youtube-embed-player";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

interface VideoSelectionSheetProps {
  open: boolean;
  videos: TravelVideoLocation[];
  currentVideo: TravelVideoLocation | null;
  activity: VideoActivityController;
  onClose: () => void;
  onChangeVideo: (video: TravelVideoLocation) => void;
}

export function VideoSelectionSheet({ open, videos, currentVideo, activity, onClose, onChangeVideo }: VideoSelectionSheetProps) {
  const currentCountryCode = String(currentVideo?.country_code || "").toUpperCase();
  const sections = useMemo(() => buildCountryVideoSections(videos, currentVideo), [currentVideo, videos]);

  const orderedVideos = useMemo(() => sections.flatMap((section) => section.videos), [sections]);
  const currentIndex = Math.max(
    0,
    orderedVideos.findIndex((video) => video.youtube_video_id === currentVideo?.youtube_video_id)
  );
  const currentSection = sections.find((section) => section.country_code === currentCountryCode) || sections[0] || null;
  const currentSeen = Boolean(currentVideo?.youtube_video_id && activity.seenIds.has(currentVideo.youtube_video_id));
  const youtubeHref = getYouTubeHref(currentVideo);

  function go(direction: -1 | 1) {
    if (orderedVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + orderedVideos.length) % orderedVideos.length;
    const nextVideo = orderedVideos[nextIndex];
    if (nextVideo) onChangeVideo(nextVideo);
  }

  function openYouTubeVideo() {
    if (!currentVideo || !youtubeHref) return;

    if (!currentVideo.made_for_kids) {
      posthog.capture("video_youtube_opened", {
        video_id: currentVideo.youtube_video_id,
        video_title: currentVideo.title,
        country_code: currentVideo.country_code,
        country_name: currentVideo.country_name,
      });
      activity.markVideoOpened(currentVideo.youtube_video_id);
    }
    window.open(youtubeHref, "_blank", "noopener");
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)} modal={false}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="pointer-events-none bg-transparent backdrop-blur-0"
        className="travel-video-sheet-content z-[460] gap-0 overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(8,11,14,0.98),rgba(5,7,10,0.96))] p-0 text-white shadow-[0_34px_110px_-44px_rgba(0,0,0,0.96)] sm:max-w-none data-[side=bottom]:h-[92dvh] data-[side=bottom]:max-h-[92dvh] lg:rounded-2xl lg:border"
      >
        <SheetTitle className="sr-only">Visor de video del mapa</SheetTitle>
        <SheetDescription className="sr-only">
          Revisa el video seleccionado en el mapa y navega una lista scrolleable de videos relacionados.
        </SheetDescription>

        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff6b64]">Video seleccionado</p>
              <h2 className="mt-1 truncate text-[15px] font-semibold text-[#f4f7fb]">
                {currentVideo?.title || "Selecciona un video"}
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Cerrar visor de video"
              onClick={onClose}
              className="shrink-0 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <X size={16} />
            </Button>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
            <section className="min-h-0 border-b border-white/10 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
              <div className="flex h-full min-h-0 flex-col">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-2 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.92)]">
                  <div className="absolute left-4 top-4 z-[2] inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[12px] text-white backdrop-blur-md">
                    <span>{countryCodeToFlag(currentVideo?.country_code)}</span>
                    <span className="truncate font-medium">{currentVideo?.country_name || currentVideo?.country_code || "Destino"}</span>
                    <span className="text-white/45">/</span>
                    <span>{currentIndex + 1} de {Math.max(1, orderedVideos.length)}</span>
                  </div>
                  <YouTubeEmbedPlayer
                    videoId={currentVideo?.youtube_video_id || null}
                    title={currentVideo?.title || "Video seleccionado"}
                    youtubeHref={youtubeHref}
                    onOpenInYouTube={openYouTubeVideo}
                    isMadeForKids={Boolean(currentVideo?.made_for_kids)}
                    frameClassName="max-h-[32dvh] lg:max-h-none"
                  />
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="flex h-9 min-w-[116px] items-center justify-center gap-1 rounded-md border border-white/10 bg-black/45 px-3 text-[12px] text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95"
                    aria-label="Video anterior"
                  >
                    <CaretLeft size={16} />
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="flex h-9 min-w-[116px] items-center justify-center gap-1 rounded-md border border-white/10 bg-black/45 px-3 text-[12px] text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95"
                    aria-label="Siguiente video"
                  >
                    Siguiente
                    <CaretRight size={16} />
                  </button>
                </div>

                <div className="mt-4 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#aab2bc]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      <MapPin size={13} />
                      {formatVideoPlace(currentVideo)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      <Clock size={13} />
                      {formatVideoDate(currentVideo?.published_at)}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_12px_30px_-16px_rgba(255, 90, 61,0.9)]", currentSeen ? "bg-[#ff5a3d] text-white" : "bg-white text-[#e1543a]")}>
                      {currentSeen ? <CheckCircle size={13} weight="fill" /> : null}
                      {currentSeen ? "Visto" : "Nuevo"}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-3 text-[22px] font-semibold leading-7 text-[#f4f7fb] lg:text-[26px] lg:leading-8">
                    {currentVideo?.title || "Untitled video"}
                  </h3>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MetricPill icon={Eye} label="Vistas" value={formatCompactNumber(Number(currentVideo?.view_count || 0))} />
                    <MetricPill icon={Heart} label="Likes" value={formatCompactNumber(Number(currentVideo?.like_count || 0))} />
                    <MetricPill icon={ChatCircle} label="Comentarios" value={formatCompactNumber(Number(currentVideo?.comment_count || 0))} />
                  </div>
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/10 px-4 py-3 lg:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f98a3]">Videos relacionados</p>
                <p className="mt-1 text-[13px] text-[#d8dee6]">
                  {currentSection ? `${countryCodeToFlag(currentSection.country_code)} ${currentSection.country_name} primero` : "Lista del mapa"}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]" data-map-scroll="true">
                {sections.length > 0 ? (
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <section key={section.country_code} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 px-1">
                          <h4 className="truncate text-[12px] font-semibold text-[#f4f7fb]">
                            {countryCodeToFlag(section.country_code)} {section.country_name}
                          </h4>
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#aab2bc]">
                            {section.videos.length}
                          </span>
                        </div>

                        {section.videos.map((video) => (
                          <VideoRow
                            key={`${section.country_code}-${video.youtube_video_id}`}
                            video={video}
                            active={video.youtube_video_id === currentVideo?.youtube_video_id}
                            seen={activity.seenIds.has(video.youtube_video_id)}
                            onSelect={() => onChangeVideo(video)}
                          />
                        ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-[13px] text-[#aab2bc]">
                    No hay videos disponibles para este mapa.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VideoRow({
  video,
  active,
  seen,
  onSelect,
}: {
  video: TravelVideoLocation;
  active: boolean;
  seen: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full gap-2 rounded-xl border p-2 text-left transition hover:bg-white/[0.07] active:scale-[0.99]",
        active
          ? "border-[rgba(255, 90, 61,0.32)] bg-[rgba(255, 90, 61,0.12)]"
          : "border-white/10 bg-white/[0.035]"
      )}
    >
      <span className="relative h-[62px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
        {video.thumbnail_url ? (
          <Image
            src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
            alt={video.title}
            width={184}
            height={124}
            sizes="92px"
            className="h-full w-full object-cover"
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          <Play size={18} weight="fill" />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[12px] font-semibold leading-4 text-[#f4f7fb]">{video.title}</span>
        <span className="mt-1 block truncate text-[11px] text-[#9da5ae]">{formatVideoPlace(video)}</span>
        <span className="mt-1 flex items-center gap-2 text-[10px] text-[#7f8994]">
          <span>{formatVideoDuration(video.duration_seconds)}</span>
          <span>{formatVideoDate(video.published_at)}</span>
        </span>
      </span>

      <span className={cn("mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", seen ? "bg-white/10 text-[#f4f7fb]" : "bg-[rgba(255, 90, 61,0.16)] text-[#ffb7b3]")}>
        {seen ? "Visto" : "Nuevo"}
      </span>
    </button>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#8f98a3]">
        <Icon size={12} />
        {label}
      </p>
      <p className="mt-1 truncate text-[15px] font-semibold text-[#f4f7fb]">{value}</p>
    </div>
  );
}
