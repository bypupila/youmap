"use client";

import Link from "next/link";
import {
  ArrowSquareOut,
  ChartBar,
  Check,
  Copy,
  GearSix,
  House,
  LinkSimple,
  List,
  MagnifyingGlass,
  MapPin,
  Play,
  Star,
  Target,
  Trophy,
  UsersThree,
  Video,
  WarningCircle,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import {
  DestinationCard,
  FanVoteSummary,
  OperationsCard,
  SponsorEmptyState,
  SponsorsRail,
  SuggestedDestinations,
} from "@/components/map/shell/rail-cards";
import {
  ChannelAvatar,
  EmptyPanel,
  OverviewMetric,
} from "@/components/map/shell/map-pieces";
import { VideoThumb } from "@/components/map/shell/map-pieces";
import {
  buildMapHref,
  formatDate,
  formatDuration,
  formatNumber,
  formatPlace,
} from "@/components/map/lib/format";
import type { FilterWindow, MapShellProps } from "@/components/map/shell/shell-types";

type SidebarNavItem = {
  label: string;
  icon: Icon;
  href?: string;
  onClick?: () => void;
  count?: number;
};

const SIDEBAR_WIDTH = 200;
const SIDEBAR_WIDTH_PX = `${SIDEBAR_WIDTH}px`;

/**
 * Desktop shell layout (`lg` and up).
 *
 * Layout primitives:
 * - **Sidebar** — fixed width, full height. Collapsible to give the map
 *   more breathing room on small laptops.
 * - **Topbar** — sticky at the top of the main column. Holds search,
 *   filter pills, and per-viewer actions. Single chrome row, so we no
 *   longer have the floating filter pills bar fighting the topbar for
 *   the same vertical pixels.
 * - **Content grid** — three columns at xl, single scrollable column
 *   between lg and xl, with a single source of truth for the top padding
 *   so cards never slide under the topbar.
 */
export function DesktopMapShell(props: MapShellProps) {
  const { desktopMenuHidden } = props;

  return (
    <div className="pointer-events-none absolute inset-0 z-[320] hidden min-h-0 lg:flex">
      <DesktopSidebar {...props} />

      <main
        className="pointer-events-none flex min-w-0 flex-1 flex-col"
        style={{ marginLeft: desktopMenuHidden ? 0 : undefined }}
      >
        <DesktopTopBar {...props} />

        <div
          data-map-scroll="true"
          /*
           * The grid has its own scroll container so the topbar above stays
           * fixed while the rails scroll. `pt-3` is intentional: the topbar
           * is sticky/relative inside this column with a known height, and
           * we use a single source of vertical rhythm (`gap-3`) instead of
           * the previous magic numbers (`pt-36`/`pt-28`/`pt-[88px]`) that
           * never agreed across breakpoints.
           */
          className="pointer-events-auto flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3 xl:grid xl:grid-cols-[minmax(280px,300px)_minmax(0,1fr)_minmax(320px,340px)] xl:gap-4 xl:overflow-hidden xl:pb-5"
        >
          <DesktopOverviewRail {...props} />
          <DesktopCenterStage {...props} />
          <DesktopRightRail {...props} />
        </div>
      </main>
    </div>
  );
}

function DesktopSidebar({
  channel,
  viewer,
  youtubeUrl,
  mapUrl,
  resolvedSummary,
  pendingManual,
  pollState,
  sponsors,
  desktopMenuHidden,
  setDesktopMenuHidden,
  copyShareUrl,
  copyState,
  selectCountry,
  setMissingVideosOpen,
  scrollToRail,
  videosRailRef,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  const rawNavItems: Array<SidebarNavItem | null> = [
    { label: "Inicio", icon: House, href: "/" },
    {
      label: "Mapa",
      icon: MapPin,
      onClick: () => selectCountry(null),
      count: resolvedSummary.total_countries,
    },
    {
      label: "Videos",
      icon: Video,
      onClick: () => scrollToRail(videosRailRef),
      count: resolvedSummary.total_videos,
    },
    pollState || viewer.isOwner
      ? {
          label: "Votaciones",
          icon: Trophy,
          onClick: () => scrollToRail(votesRailRef),
          count: pollState?.total_votes || undefined,
        }
      : null,
    sponsors.length > 0
      ? {
          label: "Sponsors",
          icon: UsersThree,
          onClick: () => scrollToRail(sponsorsRailRef),
          count: sponsors.length,
        }
      : null,
    viewer.isOwner && viewer.adminUrl
      ? { label: "Analytics", icon: ChartBar, href: viewer.adminUrl }
      : null,
    viewer.isOwner && pendingManual.length > 0
      ? {
          label: "Ajustes",
          icon: GearSix,
          onClick: () => setMissingVideosOpen(true),
          count: pendingManual.length,
        }
      : null,
  ];
  const navItems = rawNavItems.filter((item): item is SidebarNavItem => Boolean(item));

  return (
    <>
      {!desktopMenuHidden ? (
        <aside
          className="pointer-events-auto hidden shrink-0 border-r border-white/10 bg-[#060a11]/95 backdrop-blur-2xl lg:flex lg:flex-col"
          style={{ width: SIDEBAR_WIDTH_PX }}
        >
          <div
            className="flex h-full flex-col px-3 pt-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <button
              type="button"
              className="mb-3 inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] font-medium text-[#cfd6df] transition hover:bg-white/[0.08]"
              onClick={() => setDesktopMenuHidden(true)}
              aria-label="Ocultar menu lateral"
            >
              <X size={13} />
              Ocultar menu
            </button>

            <Link
              href={mapUrl}
              className="mb-5 flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(255,0,0,0.55)] bg-[rgba(255,0,0,0.12)] text-[#ff3b3b]">
                <YoutubeLogo size={22} weight="fill" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.16em] text-[#c8d0d8]">
                  World by
                </span>
                <span className="block truncate text-[15px] font-semibold leading-5 text-[#f6f7f8]">
                  {channel.channel_name}
                </span>
              </span>
            </Link>

            <nav className="space-y-1" aria-label="Secciones del mapa">
              {navItems.map((item) => (
                <SidebarItem key={item.label} item={item} />
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-3">
                  <ChannelAvatar channel={channel} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#f4f4f4]">Tu Canal</p>
                    <p className="text-[11px] text-[#9da5ae]">
                      {formatNumber(Number(channel.subscriber_count || 0))} suscriptores
                    </p>
                  </div>
                </div>
                {youtubeUrl ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#c91f18] text-[12px] font-semibold text-white transition hover:bg-[#e03128]"
                  >
                    <YoutubeLogo size={14} weight="fill" />
                    Ver canal
                  </a>
                ) : null}
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.08]"
                onClick={copyShareUrl}
              >
                {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
                {copyState === "copied" ? "Enlace copiado" : "Copiar enlace"}
              </button>
            </div>
          </div>
        </aside>
      ) : (
        <div className="pointer-events-auto hidden lg:flex">
          {/*
           * Floating "show menu" button only renders when the sidebar is
           * collapsed, removing the previous duplicate that lived on top of
           * the mobile brand header. We deliberately avoid `position: fixed`
           * here so it lives inside the desktop shell flex row and can't
           * collide with mobile chrome.
           */}
          <button
            type="button"
            className="m-3 inline-flex h-10 items-center gap-2 self-start rounded-xl border border-white/10 bg-[#07101a]/90 px-3 text-[12px] font-medium text-[#f4f7fb] backdrop-blur transition hover:bg-[#0b1421]"
            aria-label="Mostrar menu lateral"
            onClick={() => setDesktopMenuHidden(false)}
          >
            <List size={16} />
            Menu
          </button>
        </div>
      )}
    </>
  );
}

function DesktopTopBar({
  searchQuery,
  setSearchQuery,
  locateFirstSearchResult,
  viewer,
  copyShareUrl,
  copyState,
  setMissingVideosOpen,
  pendingManual,
  youtubeUrl,
  channel,
  windowFilter,
  setWindowFilter,
  selectedCountryCode,
  selectedCountryName,
  selectCountry,
  countryBuckets,
  destinationCandidates,
}: MapShellProps) {
  return (
    <header
      className="pointer-events-auto sticky top-0 z-[370] border-b border-white/5 bg-[#05080d]/85 px-4 py-3 backdrop-blur-2xl"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="yt-search h-10 min-h-10 flex-1 min-w-[220px] rounded-xl border-white/10 bg-white/[0.04]">
          <div className="flex h-full items-center pl-4 text-[13px] text-muted-foreground">
            <MagnifyingGlass size={16} />
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") locateFirstSearchResult();
            }}
            placeholder="Buscar destinos o videos"
            aria-label="Buscar destinos o videos"
            className="h-full border-0 bg-transparent px-3 text-[13px] text-foreground shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {youtubeUrl ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <a href={youtubeUrl} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={14} />
                Canal
              </a>
            </Button>
          ) : null}
          {viewer.isOwner && pendingManual.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setMissingVideosOpen(true)}
              aria-label={`${pendingManual.length} videos pendientes de verificar`}
            >
              <WarningCircle size={14} />
              Faltantes ({pendingManual.length})
            </Button>
          ) : null}
          {viewer.isOwner && viewer.adminUrl ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={viewer.adminUrl}>
                <GearSix size={14} />
                Panel
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-[#c91f18] hover:bg-[#e03128]"
            onClick={copyShareUrl}
          >
            {copyState === "copied" ? <Check size={14} /> : <LinkSimple size={14} />}
            {copyState === "copied" ? "Copiado" : "Copiar"}
          </Button>
          <span className="hidden max-w-[160px] truncate text-[11px] text-[#9da5ae] xl:block">
            {channel.canonicalHandle ? `@${channel.canonicalHandle}` : "Mapa publico"}
          </span>
        </div>
      </div>

      {/*
       * Filter pills are now part of the topbar at every breakpoint. The
       * old layout floated them as `absolute top-0` of the center column,
       * which collided with the topbar above 1280px and forced us to use
       * 144px of top-padding to compensate. By keeping them in the same
       * sticky chrome row we get predictable spacing and only one source
       * of vertical rhythm.
       */}
      <div className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto px-1">
        {(["all", "365", "90", "30"] as FilterWindow[]).map((option) => (
          <button
            key={option}
            type="button"
            className="yt-nav-pill min-h-8 shrink-0 rounded-full border-white/10 bg-white/[0.04] px-3 text-[12px]"
            data-active={option === windowFilter ? "true" : "false"}
            onClick={() => setWindowFilter(option)}
          >
            {option === "all" ? "Todos" : `${option}d`}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />
        <button
          type="button"
          className="yt-nav-pill min-h-8 shrink-0 rounded-full border-white/10 bg-white/[0.04] px-3 text-[12px]"
          data-active={selectedCountryCode ? "false" : "true"}
          onClick={() => selectCountry(null)}
        >
          <MapPin size={13} weight="fill" />
          Visitados
        </button>
        <button
          type="button"
          className="yt-nav-pill min-h-8 shrink-0 rounded-full border-white/10 bg-white/[0.04] px-3 text-[12px]"
          onClick={() =>
            selectCountry(destinationCandidates[0]?.country_code || countryBuckets[0]?.country_code || null)
          }
        >
          <Target size={13} weight="fill" />
          Pendientes
        </button>
        <button
          type="button"
          className="yt-nav-pill min-h-8 shrink-0 rounded-full border-white/10 bg-white/[0.04] px-3 text-[12px]"
          onClick={() => selectCountry(countryBuckets[0]?.country_code || null)}
        >
          <Star size={13} weight="fill" className="text-[#f5b82e]" />
          Destacados
        </button>
        {selectedCountryCode ? (
          <span className="ml-auto flex items-center gap-2 text-[12px] text-[#aab2bc]">
            Foco actual:
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[12px] font-medium text-white transition hover:bg-white/[0.08]"
              onClick={() => selectCountry(null)}
            >
              {selectedCountryName || selectedCountryCode}
              <X size={12} />
            </button>
          </span>
        ) : null}
      </div>
    </header>
  );
}

function DesktopOverviewRail({
  channel,
  resolvedSummary,
  cityCount,
  visibleRecentVideos,
  selectedCountryCode,
  selectedCountryName,
  openVideo,
  videosRailRef,
}: MapShellProps) {
  return (
    <aside
      ref={videosRailRef}
      className="pointer-events-auto order-2 min-h-0 xl:order-none xl:overflow-hidden"
    >
      <Card className="tm-surface-strong flex min-h-[420px] flex-col rounded-2xl xl:h-full">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="text-[18px] font-semibold text-[#f5f7fb]">
            Tus viajes en el mapa
          </CardTitle>
          <p className="text-[12px] leading-5 text-[#aab2bc]">
            {selectedCountryCode
              ? `Explorando ${selectedCountryName || selectedCountryCode}.`
              : "Explora los lugares que has visitado a traves de tus videos."}
          </p>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            <OverviewMetric label="Paises" value={resolvedSummary.total_countries} tone="white" />
            <OverviewMetric label="Ciudades" value={cityCount} tone="white" />
            <OverviewMetric label="Videos" value={resolvedSummary.total_videos} tone="red" />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#f5f7fb]">Videos recientes</h2>
            <Badge variant="outline" className="bg-white/[0.04] text-[11px] text-[#c6cdd5]">
              {visibleRecentVideos.length}
            </Badge>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1" data-map-scroll="true">
            <div className="space-y-2 pr-2">
              {visibleRecentVideos.length > 0 ? (
                visibleRecentVideos.map((video) => (
                  <button
                    key={`${video.youtube_video_id}-${video.published_at || "no-date"}`}
                    type="button"
                    onClick={() => openVideo(video)}
                    className="group flex w-full gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-2 text-left transition hover:bg-white/[0.07]"
                  >
                    <VideoThumb video={video} className="h-[64px] w-[92px] rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-medium leading-4 text-[#f4f7fb]">
                        {video.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-[#9da5ae]">{formatPlace(video)}</p>
                      <p className="mt-1 text-[10px] text-[#7f8994]">
                        {formatDuration(video.duration_seconds)} · {formatDate(video.published_at)}
                      </p>
                    </div>
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c91f18] text-white opacity-0 transition group-hover:opacity-100">
                      <Play size={12} weight="fill" />
                    </span>
                  </button>
                ))
              ) : (
                <EmptyPanel
                  title="Sin videos visibles"
                  body="Ajusta la busqueda o vuelve a todos los destinos."
                />
              )}
            </div>
          </ScrollArea>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={buildMapHref(channel)}>Ver todos los videos</Link>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function DesktopCenterStage({
  destinationCandidates,
  selectCountry,
}: MapShellProps) {
  return (
    /*
     * The center column is purely a visual stage for the globe behind the
     * shell. The only chrome we keep here is the suggested-destinations
     * row, anchored to the bottom on tablet and left as inline content on
     * xl. Filter pills moved up into the topbar.
     */
    <section className="pointer-events-none relative order-1 min-h-[420px] xl:order-none xl:min-h-0">
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[330] flex justify-center px-3">
        <SuggestedDestinations candidates={destinationCandidates} onSelect={selectCountry} />
      </div>
    </section>
  );
}

function DesktopRightRail({
  channelId,
  viewer,
  pollState,
  availablePollOptions,
  setPollState,
  nextDestination,
  destinationCandidates,
  sponsors,
  syncState,
  syncError,
  lastSyncSummary,
  pendingManual,
  allowRefresh,
  handleRefresh,
  setMissingVideosOpen,
  selectCountry,
  votesRailRef,
  sponsorsRailRef,
}: MapShellProps) {
  return (
    <aside
      className="pointer-events-auto order-3 flex min-h-0 flex-col gap-3 xl:order-none xl:overflow-y-auto xl:pr-1"
      data-map-scroll="true"
    >
      <DestinationCard
        destination={nextDestination}
        fallbackCandidates={destinationCandidates}
        onRefresh={handleRefresh}
        allowRefresh={allowRefresh}
        syncState={syncState}
        onSelect={selectCountry}
      />

      {viewer.isOwner || pendingManual.length > 0 || lastSyncSummary || syncError ? (
        <OperationsCard
          syncState={syncState}
          syncError={syncError}
          lastSyncSummary={lastSyncSummary}
          pendingManual={pendingManual}
          allowRefresh={allowRefresh}
          onRefresh={handleRefresh}
          onMissing={() => setMissingVideosOpen(true)}
        />
      ) : null}

      <div ref={votesRailRef}>
        {channelId && (pollState || viewer.isOwner) ? (
          <FanVoteCard
            channelId={channelId}
            viewer={viewer}
            poll={pollState}
            availableOptions={availablePollOptions}
            onPollChange={setPollState}
          />
        ) : (
          <FanVoteSummary candidates={destinationCandidates} onSelect={selectCountry} />
        )}
      </div>

      <div ref={sponsorsRailRef}>
        {sponsors.length > 0 ? <SponsorsRail sponsors={sponsors} /> : <SponsorEmptyState />}
      </div>
    </aside>
  );
}

function SidebarItem({ item }: { item: SidebarNavItem }) {
  const Icon = item.icon;
  const className =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#dbe1e7] transition hover:bg-white/[0.07]";
  const content = (
    <>
      <Icon size={17} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count ? (
        <span
          className="rounded-md bg-[#c91f18] px-1.5 py-0.5 text-[10px] font-semibold text-white"
          aria-label={`${item.count} elementos`}
        >
          {item.count}
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onClick} className={className}>
      {content}
    </button>
  );
}

/*
 * Build the same nav item list the desktop sidebar uses, so the mobile
 * side panel can feed off the same data without re-implementing the
 * logic. Exported so `<MapExperience>` can pass it to `<MobileSidePanel>`.
 */
export function buildMobileNavItems(
  props: Pick<
    MapShellProps,
    | "viewer"
    | "resolvedSummary"
    | "pollState"
    | "sponsors"
    | "pendingManual"
    | "selectCountry"
    | "scrollToRail"
    | "setMissingVideosOpen"
    | "videosRailRef"
    | "votesRailRef"
    | "sponsorsRailRef"
  >
): SidebarNavItem[] {
  const items: Array<SidebarNavItem | null> = [
    { label: "Inicio", icon: House, href: "/" },
    {
      label: "Mapa",
      icon: MapPin,
      onClick: () => props.selectCountry(null),
      count: props.resolvedSummary.total_countries,
    },
    {
      label: "Videos",
      icon: Video,
      onClick: () => props.scrollToRail(props.videosRailRef),
      count: props.resolvedSummary.total_videos,
    },
    props.pollState || props.viewer.isOwner
      ? {
          label: "Votaciones",
          icon: Trophy,
          onClick: () => props.scrollToRail(props.votesRailRef),
          count: props.pollState?.total_votes || undefined,
        }
      : null,
    props.sponsors.length > 0
      ? {
          label: "Sponsors",
          icon: UsersThree,
          onClick: () => props.scrollToRail(props.sponsorsRailRef),
          count: props.sponsors.length,
        }
      : null,
    props.viewer.isOwner && props.viewer.adminUrl
      ? { label: "Analytics", icon: ChartBar, href: props.viewer.adminUrl }
      : null,
    props.viewer.isOwner && props.pendingManual.length > 0
      ? {
          label: "Ajustes",
          icon: GearSix,
          onClick: () => props.setMissingVideosOpen(true),
          count: props.pendingManual.length,
        }
      : null,
  ];
  return items.filter((item): item is SidebarNavItem => Boolean(item));
}

