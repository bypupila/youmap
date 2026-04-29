"use client";

import Image from "next/image";
import { ArrowSquareOut, BookmarkSimple, Eye, Play, Star, TrendUp } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { VideoActivityController, VideoActivityTab } from "@/components/map/video-activity";
import {
  countryCodeToFlag,
  formatCompactNumber,
  formatVideoDate,
  formatVideoPlace,
  sortRecentVideos,
} from "@/components/map/video-viewer-utils";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

interface MapVideoActivityPanelProps {
  videos: TravelVideoLocation[];
  activity: VideoActivityController;
  activeTab: VideoActivityTab;
  canUseAdminPanels: boolean;
  onTabChange: (tab: VideoActivityTab) => void;
  onOpenVideo: (video: TravelVideoLocation) => void;
}

export function MapVideoActivityPanel({
  videos,
  activity,
  activeTab,
  canUseAdminPanels,
  onTabChange,
  onOpenVideo,
}: MapVideoActivityPanelProps) {
  const topVideo = videos.slice().sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))[0] || null;
  const watchedVideos = filterByIds(videos, activity.seenIds);
  const openedVideos = filterByIds(videos, activity.openedIds);
  const savedVideos = filterByIds(videos, activity.savedIds);
  const featuredVideos = filterByIds(videos, activity.featuredIds);
  const previewVideos = resolvePreviewVideos({
    activeTab,
    videos,
    watchedVideos,
    openedVideos,
    savedVideos,
    featuredVideos,
  });

  return (
    <aside className="pointer-events-auto flex max-h-[min(50dvh,410px)] min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/88 text-sm text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,0.94)] backdrop-blur-2xl">
      <header className="shrink-0 border-b border-white/10 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff6b64]">
          {canUseAdminPanels ? "Estadisticas del mapa" : "Tu actividad"}
        </p>
        <h2 className="mt-0.5 truncate text-[13px] font-semibold text-[#f4f7fb]">
          {canUseAdminPanels ? "Rendimiento y curaduria" : "Videos vistos y guardados"}
        </h2>
        <p className="mt-1 text-[10px] leading-4 text-[#8f98a3]">Datos locales en este navegador.</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]" data-map-scroll="true">
        {topVideo ? <TopVideoCard video={topVideo} onOpenVideo={onOpenVideo} /> : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActivityStatButton
            icon={Eye}
            label={canUseAdminPanels ? "Abiertos" : "Vistos"}
            value={canUseAdminPanels ? openedVideos.length : watchedVideos.length}
            active={activeTab === (canUseAdminPanels ? "opened" : "watched")}
            onClick={() => onTabChange(canUseAdminPanels ? "opened" : "watched")}
          />
          <ActivityStatButton
            icon={BookmarkSimple}
            label="Guardados"
            value={savedVideos.length}
            active={activeTab === "saved"}
            onClick={() => onTabChange("saved")}
          />
          <ActivityStatButton
            icon={Star}
            label="Destacados"
            value={featuredVideos.length}
            active={activeTab === "featured"}
            onClick={() => onTabChange("featured")}
          />
          <ActivityStatButton icon={TrendUp} label="Todos" value={videos.length} active={activeTab === "all"} onClick={() => onTabChange("all")} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f98a3]">
              {getListLabel(activeTab, canUseAdminPanels)}
            </p>
            <span className="text-[10px] text-[#7f8994]">{previewVideos.length}</span>
          </div>

          {previewVideos.length > 0 ? (
            previewVideos.slice(0, 4).map((video) => (
              <button
                key={`${activeTab}-${video.youtube_video_id}`}
                type="button"
                onClick={() => onOpenVideo(video)}
                className="group flex w-full gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2 text-left transition hover:bg-white/[0.07]"
              >
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-white/[0.05]">
                  {video.thumbnail_url ? (
                    <Image
                      src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                      alt={video.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                    <Play size={15} weight="fill" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#f4f7fb]">{video.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-[#9da5ae]">{countryCodeToFlag(video.country_code)} {formatVideoPlace(video)}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] px-3 py-3">
              <p className="text-[12px] font-medium text-[#f4f7fb]">{getEmptyTitle(activeTab)}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#9da5ae]">{getEmptyBody(activeTab)}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function TopVideoCard({ video, onOpenVideo }: { video: TravelVideoLocation; onOpenVideo: (video: TravelVideoLocation) => void }) {
  return (
    <button type="button" onClick={() => onOpenVideo(video)} className="w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-left transition hover:bg-white/[0.08]">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,0,0,0.16)] text-[#ffb7b3]">
          <TrendUp size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#8f98a3]">Mas visto</span>
          <span className="block truncate text-[12px] font-semibold text-[#f4f7fb]">{video.title}</span>
        </span>
        <ArrowSquareOut size={14} className="shrink-0 text-[#dce4ed]" />
      </div>
      <div className="border-t border-white/10 px-2.5 py-2 text-[11px] text-[#aab2bc]">
        {formatCompactNumber(Number(video.view_count || 0))} vistas / {formatVideoDate(video.published_at)}
      </div>
    </button>
  );
}

function ActivityStatButton({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: Icon;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className={cn(
        "rounded-lg border px-2.5 py-2 text-left transition hover:bg-white/[0.07] active:scale-[0.99]",
        active ? "border-[rgba(255,0,0,0.34)] bg-[rgba(255,0,0,0.12)]" : "border-white/10 bg-white/[0.035]"
      )}
    >
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#8f98a3]">
        <Icon size={12} />
        {label}
      </span>
      <span className="mt-1 block text-[16px] font-semibold text-[#f4f7fb]">{formatCompactNumber(value)}</span>
    </button>
  );
}

function filterByIds(videos: TravelVideoLocation[], ids: Set<string>) {
  return videos.filter((video) => ids.has(video.youtube_video_id)).sort(sortRecentVideos);
}

function resolvePreviewVideos({
  activeTab,
  videos,
  watchedVideos,
  openedVideos,
  savedVideos,
  featuredVideos,
}: {
  activeTab: VideoActivityTab;
  videos: TravelVideoLocation[];
  watchedVideos: TravelVideoLocation[];
  openedVideos: TravelVideoLocation[];
  savedVideos: TravelVideoLocation[];
  featuredVideos: TravelVideoLocation[];
}) {
  if (activeTab === "watched") return watchedVideos;
  if (activeTab === "opened") return openedVideos;
  if (activeTab === "saved") return savedVideos;
  if (activeTab === "featured") return featuredVideos;
  return videos.slice().sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)).slice(0, 4);
}

function getListLabel(activeTab: VideoActivityTab, canUseAdminPanels: boolean) {
  if (activeTab === "watched") return "Videos vistos";
  if (activeTab === "opened") return "Abiertos en YouTube";
  if (activeTab === "saved") return "Guardados";
  if (activeTab === "featured") return canUseAdminPanels ? "Destacados por ti" : "Destacados";
  return "Ranking actual";
}

function getEmptyTitle(activeTab: VideoActivityTab) {
  if (activeTab === "saved") return "Sin guardados";
  if (activeTab === "featured") return "Sin destacados";
  if (activeTab === "opened" || activeTab === "watched") return "Sin videos vistos";
  return "Sin videos";
}

function getEmptyBody(activeTab: VideoActivityTab) {
  if (activeTab === "saved") return "Guarda videos desde la tarjeta izquierda para encontrarlos aqui.";
  if (activeTab === "featured") return "Destaca videos desde la tarjeta izquierda para construir tu seleccion.";
  if (activeTab === "opened" || activeTab === "watched") return "Cuando abras un video en YouTube, quedara registrado aqui.";
  return "Ajusta los filtros o vuelve a todos los videos.";
}
