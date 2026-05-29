"use client";

import { useEffect, useMemo, useState } from "react";
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
  ArrowSquareOut,
} from "@phosphor-icons/react";
import posthog from "posthog-js";
import type { VideoActivityController } from "@/components/map/video-activity";
import {
  buildCountryVideoSections,
  countryCodeToFlag,
  formatCompactNumber,
  formatVideoDate,
  formatVideoPlace,
  getCountryNameInSpanish,
  getYouTubeHref,
  getVideoWatchStateLabel,
  getVideoWatchStateTone,
} from "@/components/map/video-viewer-utils";
import { DemoVideoEmbedPreview } from "@/components/map/demo-video-embed-preview";
import { YouTubeEmbedPlayer } from "@/components/map/youtube-embed-player";
import type { TravelVideoLocation } from "@/lib/types";
import type { MapRailSponsor } from "@/lib/map-public";
import { cn } from "@/lib/utils";

interface DesktopVideoMapCardProps {
  videos: TravelVideoLocation[];
  currentVideo: TravelVideoLocation | null;
  sponsors?: MapRailSponsor[];
  hidePlatformAds?: boolean;
  platformAd?: {
    title: string;
    description?: string | null;
    cta_label?: string | null;
    href?: string | null;
  } | null;
  activity: VideoActivityController;
  onClose: () => void;
  onChangeVideo: (video: TravelVideoLocation) => void;
  onOpenInYouTube?: (video: TravelVideoLocation) => void;
  openButtonLabel?: string;
  playbackCommand?: { id: number; action: "pause" | "play" } | null;
  onPlaybackStateChange?: (state: "playing" | "paused" | "ended") => void;
  variant?: "default" | "youtube-theater";
  isDemoMode?: boolean;
}

function hashSponsorSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSponsorCategoryLabel(sponsor: MapRailSponsor) {
  const explicitCategory = String(sponsor.category_name || "").trim();
  if (explicitCategory) return explicitCategory;

  const searchableText = `${sponsor.brand_name} ${sponsor.description || ""}`.toLowerCase();
  if (searchableText.includes("booking") || searchableText.includes("airbnb") || searchableText.includes("alojamiento")) {
    return "Alojamiento";
  }
  if (searchableText.includes("getyourguide") || searchableText.includes("tour") || searchableText.includes("experiencia")) {
    return "Experiencias";
  }
  if (searchableText.includes("iati") || searchableText.includes("seguro")) {
    return "Seguro de viaje";
  }

  return "Servicio";
}

export function DesktopVideoMapCard({
  videos,
  currentVideo,
  sponsors = [],
  hidePlatformAds = false,
  platformAd = null,
  activity,
  onClose,
  onChangeVideo,
  onOpenInYouTube,
  openButtonLabel,
  playbackCommand,
  onPlaybackStateChange,
  variant = "default",
  isDemoMode = false,
}: DesktopVideoMapCardProps) {
  const [watchMenuOpen, setWatchMenuOpen] = useState(false);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [sponsorStartIndex, setSponsorStartIndex] = useState(0);

  useEffect(() => {
    setWatchMenuOpen(false);
    setCopiedCouponId(null);
    setSponsorStartIndex(0);
  }, [currentVideo?.youtube_video_id]);

  const sponsorStripData = useMemo(() => {
    if (!currentVideo || sponsors.length === 0) return { cards: [] as MapRailSponsor[], isManualByVideo: false };

    const currentVideoRecordId = String(currentVideo.id || "").trim();
    const directVideoSponsors = sponsors.filter((sponsor) => {
      const ids = sponsor.video_ids || [];
      if (!ids.length) return false;
      if (currentVideoRecordId && ids.includes(currentVideoRecordId)) return true;
      return ids.includes(String(currentVideo.youtube_video_id || "").trim());
    });

    const isManualByVideo = directVideoSponsors.length > 0;
    const seed = String(currentVideoRecordId || currentVideo.youtube_video_id || "video");
    const toSort = isManualByVideo ? directVideoSponsors : sponsors;
    const sorted = [...toSort].sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.display_order)) ? Number(a.display_order) : 100;
      const bOrder = Number.isFinite(Number(b.display_order)) ? Number(b.display_order) : 100;
      if (isManualByVideo && aOrder !== bOrder) return aOrder - bOrder;
      const hashA = hashSponsorSeed(`${seed}:${a.id}`);
      const hashB = hashSponsorSeed(`${seed}:${b.id}`);
      if (hashA !== hashB) return hashA - hashB;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.brand_name.localeCompare(b.brand_name);
    });

    return { cards: sorted, isManualByVideo };
  }, [currentVideo, sponsors]);

  useEffect(() => {
    if (hidePlatformAds || sponsorStripData.cards.length <= 2) return;
    const intervalId = window.setInterval(() => {
      setSponsorStartIndex((current) => (current + 1) % sponsorStripData.cards.length);
    }, 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [hidePlatformAds, sponsorStripData.cards.length]);

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
  const selectedCountryName = getCountryNameInSpanish(selectedVideo.country_code, selectedVideo.country_name);

  const handleCopyCoupon = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponId(id);
    setTimeout(() => {
      setCopiedCouponId(null);
    }, 2000);
  };

  const renderSponsorStrip = () => {
    if (hidePlatformAds || sponsorStripData.cards.length === 0) return null;
    const cards = sponsorStripData.cards;
    const visibleCount = Math.min(2, cards.length);
    const normalizedStart = ((sponsorStartIndex % cards.length) + cards.length) % cards.length;
    const visibleCards = Array.from({ length: visibleCount }, (_, offset) => cards[(normalizedStart + offset) % cards.length]);
    const canRotate = cards.length > 2;
    const goSponsors = (direction: -1 | 1) => {
      if (!canRotate) return;
      setSponsorStartIndex((current) => (current + direction + cards.length) % cards.length);
    };

    return (
      <div className="border-t border-red-500/35 bg-[#0c0c0c]/85 px-4 py-2 text-white">
        <div className="flex items-center gap-1 w-full">
          <button
            type="button"
            onClick={() => goSponsors(-1)}
            disabled={!canRotate}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 shadow-sm",
              canRotate
                ? "border-white/15 bg-white/[0.06] text-white hover:bg-white/15 hover:border-white/25"
                : "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
            )}
            aria-label="Ver sponsors anteriores"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <div className="grid gap-1.5 grid-cols-2 flex-1 min-w-0">
            {visibleCards.map((sponsor) => {
              const categoryText = getSponsorCategoryLabel(sponsor);
              const coupon = sponsor.action_type === "coupon" ? sponsor.action_value || sponsor.discount_code : sponsor.discount_code;
              const ctaLabel = sponsor.cta_label || (coupon ? "Copiar" : "Ver beneficio");
              const cardClassName =
                "group relative flex min-h-[64px] w-full items-center rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left shadow-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]";
              const cardContent = (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                      <p className="truncate text-[15px] font-bold leading-none text-white">
                        {categoryText}
                      </p>
                      <span className="inline-flex items-center rounded bg-[#ff8a72]/20 px-1 py-0 text-[10px] font-black leading-none text-[#ff8a72] border border-[#ff8a72]/30 shrink-0">
                        {coupon ? "PROMO" : "LINK"}
                      </span>
                  </div>
                  <p
                    className="line-clamp-2 text-[11px] text-[#cbd5e1] group-hover:text-white transition-colors leading-snug mt-0 overflow-hidden text-ellipsis"
                    title={sponsor.description || ""}
                  >
                    {sponsor.description || "Oferta recomendada"}
                  </p>
                </div>
              );

              return (
                <div key={sponsor.id} className="min-w-0">
                  {coupon ? (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(coupon, sponsor.id)}
                      className={cardClassName}
                      title={copiedCouponId === sponsor.id ? "Copiado!" : ctaLabel}
                      aria-label={`${ctaLabel} de ${sponsor.brand_name}`}
                    >
                      {cardContent}
                    </button>
                  ) : (
                    <a
                      href={sponsor.affiliate_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cardClassName}
                      title={ctaLabel}
                      aria-label={`${ctaLabel} de ${sponsor.brand_name}`}
                    >
                      {cardContent}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => goSponsors(1)}
            disabled={!canRotate}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 shadow-sm",
              canRotate
                ? "border-white/15 bg-white/[0.06] text-white hover:bg-white/15 hover:border-white/25"
                : "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
            )}
            aria-label="Ver más sponsors"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    );
  };

  const renderPlatformBanner = () => {
    if (hidePlatformAds) return null;
    const ad = platformAd || {
      title: "Descuento del 15%",
      description: "En tu primer mapa como creador, disfrutando de todas las herramientas que Travel Your Map te ofrece.",
      cta_label: "Ver promoción",
      href: "#",
    };
    const promoTitle = "Descuento del 15%";
    const promoDescription = "En tu primer mapa como creador, disfrutando de todas las herramientas que Travel Your Map te ofrece.";
    return (
      <section className="group relative w-full overflow-hidden rounded-xl border border-red-500/35 bg-[radial-gradient(ellipse_at_top_left,rgba(255,90,61,0.12),transparent_58%)] bg-[#050b10]/70 px-4 py-2.5 text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] transition-all duration-300 hover:border-red-500/45">
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,143,120,0.06),transparent_60%)] transition-all duration-300 group-hover:scale-125" />
        
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="line-clamp-2 max-w-[330px] text-[17px] font-extrabold text-white group-hover:text-white transition-colors leading-[1.05]">
                {promoTitle}
              </p>
              <p className="line-clamp-2 text-[11px] text-[#cbd5e1] leading-snug mt-0.5 max-w-[280px] overflow-hidden text-ellipsis">
                {promoDescription}
              </p>
            </div>
          </div>

          <a
            href={ad.href || "#"}
            onClick={(event) => {
              if (ad.href === "#" || !ad.href) {
                event.preventDefault();
              }
            }}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#ff5a3d] to-[#ff7259] hover:from-[#ff7259] hover:to-[#ff8a72] px-3 text-[10px] font-black text-white shadow-md shadow-[#ff5a3d]/25 transition-all duration-300 active:scale-95 shrink-0"
          >
            <span>{ad.cta_label || "Ver"}</span>
            <ArrowSquareOut size={10} weight="bold" />
          </a>
        </div>
      </section>
    );
  };

  function go(direction: -1 | 1) {
    if (orderedVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + orderedVideos.length) % orderedVideos.length;
    const nextVideo = orderedVideos[nextIndex];
    if (nextVideo) onChangeVideo(nextVideo);
  }

  function openYouTubeVideo() {
    if (!youtubeHref) return;

    if (!isDemoMode && !selectedVideo.made_for_kids) {
      posthog.capture("video_youtube_opened", {
        video_id: selectedVideo.youtube_video_id,
        video_title: selectedVideo.title,
        country_code: selectedVideo.country_code,
        country_name: selectedVideo.country_name,
      });
    }
    activity.markVideoStarted(selectedVideo.youtube_video_id);
    onOpenInYouTube?.(selectedVideo);
    window.open(youtubeHref, "_blank", "noopener");
  }

  const isTheater = variant === "youtube-theater";

  if (isTheater) {
    return (
      <div className="pointer-events-auto w-full max-w-[480px] space-y-3">
        {renderPlatformBanner()}
        <article className="group relative w-full lg:w-[480px] shrink-0 overflow-hidden rounded-xl border border-red-500/35 bg-[#080808] text-sm text-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.04),transparent_60%)]" />

          <header className="relative px-4 pb-3 pt-4">
            <div className="min-w-0 text-left">
              <h2 className="line-clamp-2 pr-8 text-left text-[21px] font-extrabold leading-[1.1] text-white">{selectedVideo.title}</h2>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                    {countryCodeToFlag(selectedVideo.country_code)} {selectedCountryName}
                  </span>
                  <span>•</span>
                  <span className="text-[#ff5a3d]">Video {currentIndex + 1} de {Math.max(1, orderedVideos.length)}</span>
                </p>
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
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center text-red-500 transition-all hover:text-red-400 active:scale-95"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-3 items-center gap-2 border-t border-white/[0.04] bg-[#0c0c0c]/85 px-4 py-3">
            <button type="button" onClick={() => go(-1)} className="flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[9px] font-black tracking-wider text-zinc-300 transition-all hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-500 active:scale-95">
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
                    : watchBadgeTone === "active"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : "border-white/[0.08] bg-white/[0.03] text-zinc-400"
                )}
              >
                <BatteryCharging size={11} weight="fill" className="animate-pulse" />
                {watchBadgeLabel}
                <CaretDown size={10} />
              </button>
              {watchMenuOpen ? (
                <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 min-w-[130px] -translate-x-1/2 overflow-hidden rounded border border-white/[0.08] bg-[#080808] p-1 shadow-2xl">
                  <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_started"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-center text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-white">SIN INICIAR</button>
                  <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_finished"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-center text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-amber-300">INICIADO</button>
                  <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watched"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-center text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-emerald-500">COMPLETADO</button>
                  <button type="button" onClick={() => { activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watch_later"); setWatchMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-center text-[10px] font-bold text-zinc-400 hover:bg-white/[0.02] hover:text-white">VER MÁS TARDE</button>
                </div>
              ) : null}
            </div>

            <button type="button" onClick={() => go(1)} className="flex h-8 items-center justify-center gap-1 rounded border border-white/[0.04] bg-[#141414] text-[9px] font-black tracking-wider text-zinc-300 transition-all hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-500 active:scale-95">
              SIGUIENTE
              <CaretRight size={13} weight="bold" />
            </button>
          </div>

          <div className="px-4 pb-2">
            <div className="relative overflow-hidden bg-black">
              {isDemoMode ? (
                <DemoVideoEmbedPreview
                  video={selectedVideo}
                  openButtonLabel="Ver en YouTube"
                  frameClassName="rounded-none border-0"
                  hideFooter
                  hidePreviewNotice
                />
              ) : (
                <YouTubeEmbedPlayer
                  videoId={selectedVideo.youtube_video_id}
                  title={selectedVideo.title}
                  youtubeHref={youtubeHref}
                  thumbnailUrl={selectedVideo.thumbnail_url}
                  openButtonLabel="YouTube"
                  frameClassName="rounded-none border-0"
                  hideFooter
                  playbackCommand={playbackCommand}
                  onOpenInYouTube={openYouTubeVideo}
                  onPlaybackStateChange={onPlaybackStateChange}
                  isMadeForKids={Boolean(selectedVideo.made_for_kids)}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] bg-[#0c0c0c]/85 py-2">
              <span className="text-[11px] text-[#8f98a3]">
                {isDemoMode
                  ? "Vista previa del video."
                  : selectedVideo.made_for_kids
                  ? "Contenido Made for Kids: tracking local desactivado."
                  : "Reproductor oficial de YouTube."}
              </span>
              <button
                type="button"
                disabled
                className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-md border border-white/[0.06] bg-[#141414] px-2.5 text-[11px] font-medium text-zinc-600 opacity-70"
                aria-label="Abrir en YouTube"
              >
                Ver en Youtube
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-700/60 bg-[#0c0c0c]/85 px-4 py-3">
            <div className="grid grid-cols-3 items-center divide-x divide-white/[0.08] text-[11px] text-zinc-500">
              <span className="flex min-w-0 items-center justify-center gap-1 truncate px-2 font-semibold">
                <MapPin size={11} className="text-red-500" />
                <span className="truncate">{formatVideoPlace(selectedVideo)}</span>
              </span>
              <span className="flex items-center justify-center gap-1 px-2"><Eye size={11} className="text-red-500" />{formatCompactNumber(Number(selectedVideo.view_count || 0))} vistas</span>
              <span className="flex items-center justify-center gap-1 px-2"><Clock size={11} className="text-red-500" />{formatVideoDate(selectedVideo.published_at)}</span>
            </div>
          </div>
          {renderSponsorStrip()}
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
                {countryCodeToFlag(selectedVideo.country_code)} {selectedCountryName} · Video {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-0.5 truncate text-[12px] text-[#d8dee6]">
              {countryCodeToFlag(selectedVideo.country_code)} {selectedCountryName} · {currentIndex + 1} de {Math.max(1, orderedVideos.length)}
              </p>
            </>
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
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "not_started");
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-center text-[11px] hover:bg-white/[0.08]",
                    watchStatus === "not_started" && "text-[#d8dee6]"
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
                    "block w-full rounded-md px-2 py-1.5 text-center text-[11px] hover:bg-white/[0.08]",
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
                    "block w-full rounded-md px-2 py-1.5 text-center text-[11px] hover:bg-white/[0.08]",
                    watchStatus === "watched" && "text-[#7de1a2]"
                  )}
                >
                  COMPLETADO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    activity.setVideoWatchStatus(selectedVideo.youtube_video_id, "watch_later");
                    if (!isSaved) activity.toggleVideoSaved(selectedVideo.youtube_video_id);
                    setWatchMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-center text-[11px] hover:bg-white/[0.08]",
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
          {isDemoMode ? (
            <DemoVideoEmbedPreview
              video={selectedVideo}
              openButtonLabel={openButtonLabel || (isOpenedInYoutube ? "Visto en YouTube" : "Abrir en YouTube")}
            />
          ) : (
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
          )}
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
