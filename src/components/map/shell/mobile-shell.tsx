"use client";

import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  Bell,
  CaretRight,
  Check,
  DotsThree,
  House,
  LinkSimple,
  List,
  MagnifyingGlass,
  MapPin,
  UsersThree,
  Video,
  WarningCircle,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import {
  DestinationCard,
  FanVoteSummary,
  OperationsCard,
  SponsorEmptyState,
  SponsorsRail,
  SuggestedDestinationsCompact,
} from "@/components/map/shell/rail-cards";
import { ChannelAvatar, OverviewMetric, VideoThumb } from "@/components/map/shell/map-pieces";
import { formatNumber, formatPlace } from "@/components/map/lib/format";
import type { MapShellProps, SidebarNavItem } from "@/components/map/shell/shell-types";
import type { TravelChannel } from "@/lib/types";
import type { MapSummary } from "@/lib/map-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MobileMapTab = "overview" | "map" | "videos" | "community" | "more";

export function MobileMapShell({
  mobileTab,
  setMobileTab,
  ...props
}: MapShellProps & {
  mobileTab: MobileMapTab;
  setMobileTab: Dispatch<SetStateAction<MobileMapTab>>;
}) {
  const isMapTab = mobileTab === "map";

  return (
    /*
     * Outer wrapper:
     * - `lg:hidden` so this shell only paints on phones and small tablets,
     *   matching the desktop shell's `hidden lg:flex` companion.
     * - `pointer-events-none` lets clicks pass through to the globe behind
     *   us by default; only the explicit chrome panels and the bottom nav
     *   below opt back into pointer events. This is what fixes the previous
     *   "I can't tap a pin from the map tab" bug — the old code disabled
     *   pointer events on the entire map view, blocking the globe.
     * - We don't tint the background anymore on mobile because the globe is
     *   the canvas; the desktop variant still applies its own gradient.
     */
    <div className="pointer-events-none absolute inset-0 z-[330] flex min-h-0 flex-col overflow-hidden lg:hidden">
      <div
        className={cn(
          "min-h-0 flex-1",
          /*
           * On the map tab we don't want the scroll container to capture the
           * globe's drag gestures, so we make the wrapper transparent to
           * input. Each individual chrome panel below opts back in with
           * `pointer-events-auto`. Other tabs need normal scrolling.
           */
          isMapTab ? "pointer-events-none overflow-hidden" : "pointer-events-auto overflow-y-auto"
        )}
        data-map-scroll="true"
        style={{
          /*
           * Reserve room for the fixed bottom nav (70px) plus the iOS home
           * indicator. Without this, the last card was always clipped.
           */
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(70px + env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div className="mx-auto w-full max-w-[640px] px-4">
          {mobileTab === "overview" ? <MobileOverviewView {...props} setMobileTab={setMobileTab} /> : null}
          {mobileTab === "map" ? <MobileMapView {...props} setMobileTab={setMobileTab} /> : null}
          {mobileTab === "videos" ? <MobileVideosView {...props} /> : null}
          {mobileTab === "community" ? <MobileCommunityView {...props} /> : null}
          {mobileTab === "more" ? <MobileMoreView {...props} /> : null}
        </div>
      </div>

      <MobileBottomNav
        activeTab={mobileTab}
        setActiveTab={setMobileTab}
        voteCount={props.pollState?.total_votes || props.destinationCandidates.length}
        pendingCount={props.pendingManual.length}
      />
    </div>
  );
}

function MobileBrandHeader({
  channel,
  eyebrow,
  onMenu,
}: {
  channel: TravelChannel;
  eyebrow?: string;
  onMenu: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 pb-4">
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#07101a]/80 text-[#f5f7fb] backdrop-blur transition hover:bg-[#0d1827]"
        aria-label="Abrir menu"
        onClick={onMenu}
      >
        <List size={22} />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <ChannelAvatar channel={channel} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c8d0d8]">
            {eyebrow ?? "World by"}
          </p>
          <p className="max-w-[180px] truncate text-[15px] font-semibold leading-5 text-[#f7f8fa]">
            {channel.channel_name}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#07101a]/80 text-[#f5f7fb] backdrop-blur transition hover:bg-[#0d1827]"
        aria-label="Notificaciones"
      >
        <Bell size={22} />
      </button>
    </header>
  );
}

function MobileSectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="flex h-11 items-center justify-between pb-2">
      <h1 className="truncate text-[18px] font-semibold text-[#f5f7fb]">{title}</h1>
      {action}
    </header>
  );
}

function MobileStatsGrid({
  resolvedSummary,
  cityCount,
  className,
}: {
  resolvedSummary: MapSummary;
  cityCount: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]",
        className
      )}
    >
      <OverviewMetric label="Paises" value={resolvedSummary.total_countries} tone="white" />
      <OverviewMetric label="Ciudades" value={cityCount} tone="white" />
      <OverviewMetric label="Videos" value={resolvedSummary.total_videos} tone="red" />
    </div>
  );
}

function MobileOverviewView({
  channel,
  headerEyebrow,
  resolvedSummary,
  cityCount,
  visibleRecentVideos,
  openVideo,
  setMobileMenuOpen,
  setMobileTab,
}: MapShellProps & { setMobileTab: Dispatch<SetStateAction<MobileMapTab>> }) {
  return (
    <div className="flex min-h-full w-full flex-col">
      <MobileBrandHeader
        channel={channel}
        eyebrow={headerEyebrow}
        onMenu={() => setMobileMenuOpen(true)}
      />

      <section className="rounded-2xl border border-white/10 bg-[#07101a]/88 p-4 shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <h1 className="text-[20px] font-semibold leading-6 text-[#f5f7fb]">
          Tus viajes en el mapa
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-[#aab2bc]">
          Explora los lugares que has visitado a traves de tus videos.
        </p>

        <MobileStatsGrid resolvedSummary={resolvedSummary} cityCount={cityCount} className="mt-4" />

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-[#f5f7fb]">Videos recientes</h2>
          <span className="text-[11px] text-[#9da5ae]">{visibleRecentVideos.length} videos</span>
        </div>

        <ul className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
          {visibleRecentVideos.slice(0, 5).map((video) => (
            <li key={`${video.youtube_video_id}-${video.published_at || "mobile-overview"}`}>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-b border-white/10 px-3 py-2.5 text-left transition hover:bg-white/[0.05] last:border-b-0"
                onClick={() => openVideo(video)}
              >
                <VideoThumb video={video} className="h-[58px] w-[100px] rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-medium leading-5 text-[#f5f7fb]">
                    {video.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[#9da5ae]">
                    {formatPlace(video)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] font-medium text-[#f5f7fb] transition hover:bg-white/[0.08]"
          onClick={() => setMobileTab("videos")}
        >
          Ver todos los videos
          <CaretRight size={15} />
        </button>
      </section>
    </div>
  );
}

function MobileMapView({
  countryBuckets,
  destinationCandidates,
  selectedCountryCode,
  selectedCountryName,
  windowFilter,
  setWindowFilter,
  selectCountry,
  visibleRecentVideos,
  activeVideo,
  pendingManual,
  setMissingVideosOpen,
  setMobileTab,
  searchQuery,
  setSearchQuery,
  locateFirstSearchResult,
}: MapShellProps & { setMobileTab: Dispatch<SetStateAction<MobileMapTab>> }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previewVideo = activeVideo || visibleRecentVideos[0] || null;

  // Auto-focus the search field when it opens so the keyboard pops up
  // immediately. Mirrors the YouTube/Spotify behavior the design references.
  useEffect(() => {
    if (searchOpen) {
      const id = window.requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [searchOpen]);

  return (
    <div className="flex min-h-full flex-col gap-3">
      <header className="pointer-events-auto flex h-11 items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold text-[#f5f7fb]">Mapa</h1>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#07101a]/80 text-white backdrop-blur transition hover:bg-[#0d1827]"
          aria-label={searchOpen ? "Cerrar busqueda" : "Buscar"}
          aria-pressed={searchOpen}
          onClick={() => setSearchOpen((current) => !current)}
        >
          {searchOpen ? <X size={20} /> : <MagnifyingGlass size={21} />}
        </button>
      </header>

      {searchOpen ? (
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#07101a]/90 p-2 backdrop-blur-2xl">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3">
            <MagnifyingGlass size={16} className="text-[#9da5ae]" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  locateFirstSearchResult();
                  setSearchOpen(false);
                }
              }}
              placeholder="Buscar destinos o videos"
              className="h-10 border-0 bg-transparent px-0 text-[13px] text-foreground shadow-none focus-visible:ring-0"
              aria-label="Buscar destinos o videos"
            />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["all", "365", "90"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="yt-nav-pill min-h-9 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : option === "365" ? "Ultimo ano" : "90 dias"}
          </button>
        ))}
        <button
          type="button"
          className="yt-nav-pill min-h-9 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]"
          onClick={() => setMissingVideosOpen(true)}
          /*
           * Pendientes used to call selectCountry which made no sense for an
           * "owner action" pill. Wiring it to the missing-videos dialog
           * matches the corresponding tile on the desktop shell.
           */
          aria-label={`Videos pendientes${pendingManual.length ? ` (${pendingManual.length})` : ""}`}
        >
          <WarningCircle size={13} weight="fill" className="text-[#ff7a73]" />
          Pendientes {pendingManual.length ? `(${pendingManual.length})` : null}
        </button>
        <button
          type="button"
          className="yt-nav-pill min-h-9 shrink-0 rounded-lg border-white/10 bg-[#07101a]/78 px-4 text-[12px]"
          onClick={() => setMobileTab("videos")}
        >
          <Video size={13} weight="fill" className="text-[#f5b82e]" />
          Lista
        </button>
      </div>

      <div className="relative min-h-[420px] flex-1">
        {/*
         * Quick navigation column. We removed the obsolete "Plus" zoom hack
         * and the corner that overlapped the country chip.  Each button has
         * an aria-label and a real action — no more dead UI.
         */}
        <nav
          className="pointer-events-auto absolute right-2 top-2 z-[340] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101a]/88 backdrop-blur-2xl"
          aria-label="Acciones rapidas del mapa"
        >
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-white transition hover:bg-white/[0.08]"
            onClick={() => selectCountry(null)}
            aria-label="Mostrar mapa completo"
          >
            <House size={17} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center border-t border-white/10 text-white transition hover:bg-white/[0.08]"
            onClick={() => selectCountry(countryBuckets[0]?.country_code || null)}
            aria-label="Enfocar destino principal"
          >
            <MapPin size={17} weight="fill" />
          </button>
        </nav>

        {selectedCountryCode ? (
          <button
            type="button"
            className="pointer-events-auto absolute left-1/2 top-2 z-[340] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#07101a]/90 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-2xl"
            onClick={() => selectCountry(null)}
          >
            <X size={13} />
            Salir de {selectedCountryName || selectedCountryCode}
          </button>
        ) : null}

        {previewVideo ? (
          <button
            type="button"
            className="pointer-events-auto absolute inset-x-3 bottom-3 z-[340] flex gap-3 rounded-2xl border border-white/10 bg-[#07101a]/92 p-3 text-left shadow-[0_26px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            onClick={() => selectCountry(previewVideo.country_code || null)}
          >
            <VideoThumb video={previewVideo} className="h-[64px] w-[100px] rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[13px] font-semibold leading-5 text-[#f5f7fb]">
                {previewVideo.title}
              </span>
              <span className="mt-1 block truncate text-[11px] text-[#aab2bc]">
                {formatPlace(previewVideo)}
              </span>
            </span>
          </button>
        ) : null}
      </div>

      <SuggestedDestinationsCompact candidates={destinationCandidates} onSelect={selectCountry} />
    </div>
  );
}

function MobileVideosView({ visibleRecentVideos, openVideo }: MapShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <MobileSectionHeader title="Videos" />
      <ul className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101a]/88 backdrop-blur-2xl">
        {visibleRecentVideos.length === 0 ? (
          <li className="px-4 py-8 text-center text-[13px] text-[#9da5ae]">
            Aun no hay videos visibles. Cambia el filtro o vuelve al mapa.
          </li>
        ) : (
          visibleRecentVideos.map((video) => (
            <li key={`${video.youtube_video_id}-${video.published_at || "mobile-videos"}`}>
              <button
                type="button"
                className="flex w-full gap-3 border-b border-white/10 p-3 text-left transition hover:bg-white/[0.05] last:border-b-0"
                onClick={() => openVideo(video)}
              >
                <VideoThumb video={video} className="h-[72px] w-[120px] rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#f5f7fb]">
                    {video.title}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#aab2bc]">
                    {formatPlace(video)}
                  </span>
                  <span className="mt-1 block text-[11px] text-[#8f9aa5]">
                    {formatNumber(Number(video.view_count || 0))} views
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function MobileCommunityView(props: MapShellProps) {
  return (
    <div className="flex min-h-full flex-col gap-3">
      <MobileSectionHeader title="Comunidad" />
      <MobileActionBar {...props} />
      <DestinationCard
        destination={props.nextDestination}
        fallbackCandidates={props.destinationCandidates}
        onRefresh={props.handleRefresh}
        allowRefresh={props.allowRefresh}
        syncState={props.syncState}
        onSelect={props.selectCountry}
      />
      {props.channelId && (props.pollState || props.viewer.isOwner) ? (
        <FanVoteCard
          channelId={props.channelId}
          viewer={props.viewer}
          poll={props.pollState}
          availableOptions={props.availablePollOptions}
          onPollChange={props.setPollState}
        />
      ) : (
        <FanVoteSummary candidates={props.destinationCandidates} onSelect={props.selectCountry} />
      )}
      {props.sponsors.length > 0 ? <SponsorsRail sponsors={props.sponsors} /> : <SponsorEmptyState />}
    </div>
  );
}

function MobileMoreView(props: MapShellProps) {
  return (
    <div className="flex min-h-full flex-col gap-3">
      <MobileSectionHeader
        title="Mas"
        action={
          props.allowRefresh ? (
            <button
              type="button"
              className="flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[12px] font-medium text-[#f5f7fb] transition hover:bg-white/[0.08]"
              onClick={props.handleRefresh}
              disabled={props.syncState === "running"}
              aria-busy={props.syncState === "running"}
            >
              <ArrowsClockwise
                size={14}
                className={props.syncState === "running" ? "animate-spin" : undefined}
              />
              Actualizar
            </button>
          ) : null
        }
      />
      <MobileActionBar {...props} />
      {props.viewer.isOwner || props.pendingManual.length > 0 || props.lastSyncSummary || props.syncError ? (
        <OperationsCard
          syncState={props.syncState}
          syncError={props.syncError}
          lastSyncSummary={props.lastSyncSummary}
          pendingManual={props.pendingManual}
          allowRefresh={props.allowRefresh}
          onRefresh={props.handleRefresh}
          onMissing={() => props.setMissingVideosOpen(true)}
        />
      ) : null}
      {props.sponsors.length > 0 ? <SponsorsRail sponsors={props.sponsors} /> : <SponsorEmptyState />}
    </div>
  );
}

function MobileActionBar({
  youtubeUrl,
  viewer,
  pendingManual,
  copyState,
  copyShareUrl,
  setMissingVideosOpen,
}: MapShellProps) {
  const canSeeMissing = viewer.isOwner || pendingManual.length > 0;
  return (
    <div className="grid grid-cols-3 gap-2">
      {youtubeUrl ? (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] text-[12px] font-medium text-[#f5f7fb] transition hover:bg-white/[0.08]"
        >
          <ArrowSquareOut size={14} />
          Canal
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
      <button
        type="button"
        className="flex h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] text-[12px] font-medium text-[#f5f7fb] transition hover:bg-white/[0.08] disabled:opacity-50"
        onClick={() => setMissingVideosOpen(true)}
        disabled={!canSeeMissing}
        aria-disabled={!canSeeMissing}
      >
        <WarningCircle size={14} />
        Faltantes
      </button>
      <button
        type="button"
        className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#c91f18] text-[12px] font-semibold text-white transition hover:bg-[#e03128]"
        onClick={copyShareUrl}
      >
        {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
        {copyState === "copied" ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function MobileBottomNav({
  activeTab,
  setActiveTab,
  voteCount,
  pendingCount,
}: {
  activeTab: MobileMapTab;
  setActiveTab: Dispatch<SetStateAction<MobileMapTab>>;
  voteCount: number;
  pendingCount: number;
}) {
  const items: Array<{ id: MobileMapTab; label: string; icon: Icon; badge?: number }> = [
    { id: "overview", label: "Inicio", icon: House },
    { id: "map", label: "Mapa", icon: MapPin, badge: voteCount || undefined },
    { id: "videos", label: "Videos", icon: Video },
    { id: "community", label: "Votos", icon: UsersThree },
    { id: "more", label: "Mas", icon: DotsThree, badge: pendingCount || undefined },
  ];

  return (
    /*
     * Bottom navigation:
     * - `pointer-events-auto` because the parent shell is `pointer-events-none`.
     * - `inset-x-0` so the bar fills the whole screen edge to edge instead
     *   of the previous 430px-pinned variant which left dead pixels on
     *   tablets and large phones.
     * - The custom inline `paddingBottom` reserves space for the iOS home
     *   indicator, so icons aren't covered by the gesture handle.
     * - `aria-current="page"` tells assistive tech which tab is active.
     */
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[380] flex h-[calc(64px+env(safe-area-inset-bottom,0px))] items-stretch border-t border-white/10 bg-[#07101a]/95 backdrop-blur-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegacion del mapa"
    >
      <ul className="mx-auto flex w-full max-w-[640px] items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-[#ff342d]" : "text-[#c6cdd5] hover:text-[#f5f7fb]"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="relative">
                  <Icon size={22} weight={active ? "fill" : "regular"} />
                  {item.badge ? (
                    <span
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e32822] px-1 text-[9px] font-bold text-white"
                      aria-label={`${item.badge} pendientes`}
                    >
                      {Math.min(99, item.badge)}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileSidePanel({
  channel,
  open,
  onClose,
  navItems,
  copyShareUrl,
  copyState,
}: {
  channel: TravelChannel;
  open: boolean;
  onClose: () => void;
  navItems: SidebarNavItem[];
  copyShareUrl: () => void;
  copyState: "idle" | "copied" | "error";
}) {
  if (!open) return null;
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[400] bg-[#05080d]/80 backdrop-blur-sm lg:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Menu del mapa"
    >
      <aside
        className="h-full w-[280px] max-w-[85vw] border-r border-white/10 bg-[#060a11] px-4 pt-5"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ChannelAvatar channel={channel} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">{channel.channel_name}</p>
              <p className="text-[11px] text-[#9da5ae]">
                {formatNumber(Number(channel.subscriber_count || 0))} suscriptores
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#f5f7fb] transition hover:bg-white/[0.08]"
            onClick={onClose}
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </header>
        <nav className="space-y-1" aria-label="Secciones del mapa">
          {navItems.map((item) => {
            const Icon = item.icon;
            const className =
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.07]";
            const content = (
              <>
                <Icon size={17} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count ? (
                  <span className="rounded-md bg-[#c91f18] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {item.count}
                  </span>
                ) : null}
              </>
            );
            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={className} onClick={onClose}>
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                className={className}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
              >
                {content}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-[12px] font-medium text-[#f5f7fb] transition hover:bg-white/[0.08]"
          onClick={() => {
            copyShareUrl();
          }}
        >
          {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
          {copyState === "copied" ? "Enlace copiado" : "Copiar enlace publico"}
        </button>

        <a
          href="https://www.youtube.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c91f18] px-3 py-3 text-[12px] font-semibold text-white transition hover:bg-[#e03128]"
        >
          <YoutubeLogo size={14} weight="fill" />
          Ver canal
        </a>
      </aside>
    </div>
  );
}
