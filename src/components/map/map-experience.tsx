"use client";

import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass, Copy, Check, ArrowSquareOut } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { TravelGlobe } from "@/components/travel-globe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { cn } from "@/lib/utils";

type FilterWindow = "30" | "90" | "365" | "all";
const EMPTY_MANUAL_QUEUE: ManualVerificationItem[] = [];
const DEFAULT_VIEWER: MapViewerContext = { isOwner: false, shareUrl: "", adminUrl: null };

interface PollOptionInput {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

interface MapExperienceProps {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  manualQueue?: ManualVerificationItem[];
  summary?: MapSummary | null;
  channelId?: string | null;
  allowRefresh?: boolean;
  showLegend?: boolean;
  showOperationsPanel?: boolean;
  showActiveVideoCard?: boolean;
  interactive?: boolean;
  showHeader?: boolean;
  viewer?: MapViewerContext;
  sponsors?: MapRailSponsor[];
  activePoll?: MapPollRecord | null;
  availablePollOptions?: PollOptionInput[];
  headerEyebrow?: string;
}

type SyncSummary = {
  videos_scanned: number;
  videos_extracted: number;
  videos_verified_auto: number;
  videos_needs_manual: number;
  videos_verified_manual: number;
  excluded_shorts: number;
  excluded_non_travel: number;
};

export function MapExperience({
  channel,
  videoLocations,
  manualQueue,
  summary = null,
  channelId = null,
  allowRefresh = false,
  showLegend = true,
  showOperationsPanel = true,
  showActiveVideoCard = true,
  interactive = true,
  showHeader = true,
  viewer = DEFAULT_VIEWER,
  sponsors = [],
  activePoll = null,
  availablePollOptions = [],
  headerEyebrow,
}: MapExperienceProps) {
  const incomingManualQueue = manualQueue ?? EMPTY_MANUAL_QUEUE;
  const [items, setItems] = useState<TravelVideoLocation[]>(videoLocations);
  const [pendingManual, setPendingManual] = useState<ManualVerificationItem[]>(incomingManualQueue);
  const [windowFilter, setWindowFilter] = useState<FilterWindow>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false);
  const [mobileManualOpen, setMobileManualOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [focusCountryCode, setFocusCountryCode] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<TravelVideoLocation | null>(null);
  const [pinnedVideo, setPinnedVideo] = useState<TravelVideoLocation | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null);
  const [manualDrafts, setManualDrafts] = useState<Record<string, { country_code: string; city: string }>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [secondCheckState, setSecondCheckState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [pollState, setPollState] = useState<MapPollRecord | null>(activePoll);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(videoLocations);
  }, [videoLocations]);

  useEffect(() => {
    setPendingManual(incomingManualQueue);
  }, [incomingManualQueue]);

  useEffect(() => {
    setPollState(activePoll);
  }, [activePoll]);

  useEffect(() => {
    if (!interactive) return;
    const root = rootRef.current;
    if (!root) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-map-scroll='true']")) return;
      event.preventDefault();
    };

    root.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => root.removeEventListener("wheel", handleWheel, true);
  }, [interactive]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const timeFilteredVideos = useMemo(() => {
    if (windowFilter === "all") return items;
    const days = Number(windowFilter);
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return items.filter((video) => {
      const publishedAt = video.published_at ? new Date(video.published_at).getTime() : 0;
      return publishedAt > threshold;
    });
  }, [items, windowFilter]);

  const searchFilteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return timeFilteredVideos;

    return timeFilteredVideos.filter((video) =>
      [
        video.title,
        video.description || "",
        video.country_name || "",
        video.country_code || "",
        video.city || "",
        video.region || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, timeFilteredVideos]);

  const legend = useMemo(() => {
    const buckets = new Map<string, { country_code: string; country_name: string; count: number }>();
    for (const video of searchFilteredVideos) {
      const countryCode = String(video.country_code || "").toUpperCase();
      if (!countryCode) continue;

      const row = buckets.get(countryCode) || {
        country_code: countryCode,
        country_name: video.country_name || countryCode,
        count: 0,
      };
      row.count += 1;
      buckets.set(countryCode, row);
    }
    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }, [searchFilteredVideos]);

  const selectedCountryVideos = useMemo(() => {
    if (!selectedCountryCode) return [];
    return searchFilteredVideos
      .filter((video) => String(video.country_code || "").toUpperCase() === selectedCountryCode)
      .sort((a, b) => {
        const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [searchFilteredVideos, selectedCountryCode]);

  const filteredVideos = useMemo(() => {
    if (!selectedCountryCode) return searchFilteredVideos;
    return selectedCountryVideos;
  }, [searchFilteredVideos, selectedCountryCode, selectedCountryVideos]);

  const selectedCountryName = selectedCountryVideos[0]?.country_name || selectedCountryCode;

  const resolvedSummary = useMemo(() => {
    if (summary) return summary;

    const totalCountries = new Set(items.map((video) => video.country_code).filter(Boolean)).size;
    return {
      total_videos: items.length + pendingManual.length,
      total_countries: totalCountries,
      verified_auto: items.filter((video) => video.location_status === "verified_auto" || video.location_status === "mapped").length,
      verified_manual: items.filter((video) => video.location_status === "verified_manual").length,
      needs_manual: pendingManual.length,
    };
  }, [items, pendingManual.length, summary]);

  const shouldRenderRightRail =
    showOperationsPanel ||
    selectedCountryVideos.length > 0 ||
    (showActiveVideoCard && Boolean(activeVideo) && !selectedCountryCode && !pinnedVideo) ||
    sponsors.length > 0 ||
    Boolean(pollState);

  const shouldShowManualQueue = viewer.isOwner && pendingManual.length > 0;
  const railTopOffset = showHeader ? "top-24" : "top-4";
  const railBottomOffset = showHeader ? "bottom-4" : "bottom-4";

  async function reloadMapData() {
    if (!channelId) return;
    const response = await fetch(`/api/map/data?channelId=${encodeURIComponent(channelId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo recargar el mapa.");
    const payload = (await response.json()) as { videoLocations: TravelVideoLocation[]; manualQueue: ManualVerificationItem[] };
    setItems(payload.videoLocations || []);
    setPendingManual(payload.manualQueue || []);
  }

  async function handleRefresh() {
    if (!allowRefresh || !channelId) return;
    setSyncState("running");
    setSyncError(null);

    try {
      const response = await fetch("/api/map/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const payload = (await response.json()) as { summary?: SyncSummary; manualQueue?: ManualVerificationItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo completar la sincronización.");

      setLastSyncSummary(payload.summary || null);
      setPendingManual(payload.manualQueue || []);
      await reloadMapData();
      setSyncState("success");
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "Error de sincronización");
    }
  }

  async function handleManualConfirm(video: ManualVerificationItem) {
    if (!channelId) return;
    const draft = manualDrafts[video.video_id] || {
      country_code: video.country_code || "",
      city: video.city || "",
    };

    if (!draft.country_code.trim()) return;

    const response = await fetch("/api/map/manual-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          videoId: video.video_id,
          country_code: draft.country_code.trim().toUpperCase(),
          city: draft.city.trim(),
        }),
      });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "No se pudo confirmar manualmente");
    await reloadMapData();
  }

  async function handleSecondCheck() {
    if (!channelId || !viewer.isOwner) return;
    setSecondCheckState("running");
    setSyncError(null);

    try {
      const response = await fetch("/api/map/second-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const payload = (await response.json()) as { summary?: SyncSummary; manualQueue?: ManualVerificationItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo completar la segunda pasada.");
      setLastSyncSummary(payload.summary || null);
      setPendingManual(payload.manualQueue || []);
      await reloadMapData();
      setSecondCheckState("success");
    } catch (error) {
      setSecondCheckState("error");
      setSyncError(error instanceof Error ? error.message : "Error de segunda pasada");
    }
  }

  function locateFirstSearchResult() {
    const first = searchFilteredVideos[0];
    if (!first?.country_code) return;
    setSelectedCountryCode(String(first.country_code).toUpperCase());
    setFocusCountryCode(String(first.country_code).toUpperCase());
  }

  function selectCountry(countryCode: string | null) {
    const normalized = countryCode ? String(countryCode).toUpperCase() : null;
    setSelectedCountryCode(normalized);
    setFocusCountryCode(normalized);
  }

  async function copyShareUrl() {
    const shareUrl = viewer.shareUrl || "";
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div ref={rootRef} className={cn("relative min-h-[100dvh] w-full overflow-hidden bg-[#111416]", !interactive && "pointer-events-none")}>
      <TravelGlobe
        channelData={channel}
        videoLocations={filteredVideos}
        interactive={interactive}
        showControls={false}
        showSponsorBanner={false}
        pointMode="video"
        showSummaryCard={false}
        showPointPanel={false}
        onActiveVideoChange={setActiveVideo}
        onPinnedVideoChange={setPinnedVideo}
        onCountrySelect={selectCountry}
        focusCountryCode={focusCountryCode}
        selectedCountryCode={selectedCountryCode}
      />

      {showHeader ? (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-[320] px-4 pt-3 sm:px-6">
          <FloatingTopBar
            eyebrow={headerEyebrow || (channel.canonicalHandle ? `@${channel.canonicalHandle}` : viewer.isOwner ? "Owner view" : "Public map")}
            title={channel.channel_name}
            className="relative z-[321]"
            searchInput={
              <div className="yt-search w-full max-w-[560px]">
                <div className="flex h-full items-center pl-4 text-[13px] text-muted-foreground">
                  <MagnifyingGlass size={16} />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") locateFirstSearchResult();
                  }}
                  placeholder="Search videos, countries, cities"
                  className="h-full border-0 bg-transparent px-3 text-[13px] text-foreground shadow-none focus-visible:ring-0"
                />
              </div>
            }
            actions={
              viewer.isOwner ? (
                <>
                  {viewer.adminUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={viewer.adminUrl}>
                        <ArrowSquareOut size={14} />
                        Panel admin
                      </Link>
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" onClick={copyShareUrl}>
                    {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
                    {copyState === "copied" ? "Copiado" : copyState === "error" ? "Reintentar" : "Copiar link"}
                  </Button>
                </>
              ) : null
            }
          />
        </header>
      ) : null}

      {showLegend ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setMobileLegendOpen(true)}
          className={cn("pointer-events-auto absolute left-4 z-[360] lg:hidden", showHeader ? "top-24" : "top-4")}
        >
          Countries ({legend.length})
        </Button>
      ) : null}

      {showLegend ? (
        <aside className={cn("pointer-events-auto absolute left-4 z-[360] hidden w-[320px] lg:block", railTopOffset, railBottomOffset)}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="h-full">
            <Card className="tm-surface-strong h-full">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[16px] font-medium text-[#f1f1f1]">Countries</CardTitle>
                <p className="text-[12px] text-[#aaaaaa]">Click a country to isolate its videos.</p>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {(["30", "90", "365", "all"] as FilterWindow[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="yt-nav-pill"
                      data-active={option === windowFilter ? "true" : "false"}
                      onClick={() => setWindowFilter(option)}
                    >
                      {option === "all" ? "All" : `${option}d`}
                    </button>
                  ))}
                </div>
                <ScrollArea className="min-h-0 flex-1" data-map-scroll="true">
                  <div className="space-y-2 pr-2">
                    {legend.map((country) => (
                      <button
                        key={country.country_code}
                        type="button"
                        onClick={() => selectCountry(country.country_code)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-left transition-colors",
                          selectedCountryCode === country.country_code ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#212121] text-[#f1f1f1] hover:bg-[#2a2a2a]"
                        )}
                      >
                        <span className="truncate text-[13px] font-medium">
                          <span className="mr-2 inline-block w-5 text-center">{countryCodeToFlag(country.country_code)}</span>
                          {country.country_name}
                        </span>
                        <span className={cn("rounded-lg px-2 py-0.5 text-[11px]", selectedCountryCode === country.country_code ? "bg-black/10" : "bg-white/10 text-[#aaaaaa]")}>{country.count}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </aside>
      ) : null}

      {showLegend ? (
        <Sheet open={mobileLegendOpen} onOpenChange={setMobileLegendOpen}>
          <SheetContent side="left" className="tm-surface-strong w-[92vw] p-0">
            <SheetHeader className="border-b border-white/10 px-5 py-4">
              <SheetTitle className="text-[#f1f1f1]">Countries</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100dvh-72px)] px-4 py-4" data-map-scroll="true">
              <div className="space-y-2">
                {legend.map((country) => (
                  <button
                    key={country.country_code}
                    type="button"
                    className="tm-surface flex w-full items-center justify-between rounded-xl px-3 py-2 text-left"
                    onClick={() => {
                      selectCountry(country.country_code);
                      setMobileLegendOpen(false);
                    }}
                  >
                    <span className="text-[13px]"><span className="mr-2 inline-block w-5 text-center">{countryCodeToFlag(country.country_code)}</span>{country.country_name}</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-[#aaaaaa]">{country.count}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : null}

      {shouldRenderRightRail ? (
        <aside className={cn("pointer-events-none absolute right-4 z-[360] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-4", railTopOffset, railBottomOffset)}>
          {showOperationsPanel ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
              <Card className="tm-surface-strong">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="yt-overline text-[#aaaaaa]">{viewer.isOwner ? "Owner map" : "Creator map"}</p>
                      <CardTitle className="mt-1 text-[16px] font-medium text-[#f1f1f1]">{channel.channel_name}</CardTitle>
                    </div>
                    {allowRefresh ? (
                      <Button type="button" size="sm" onClick={handleRefresh} disabled={syncState === "running" || secondCheckState === "running"}>
                        {syncState === "running" ? "Refreshing..." : "Refresh"}
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4">
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Videos" value={resolvedSummary.total_videos} />
                    <StatTile label="Countries" value={resolvedSummary.total_countries} />
                    <StatTile label="Manual" value={resolvedSummary.needs_manual} />
                  </div>

                  {shouldShowManualQueue ? (
                    <div className="flex items-center gap-2 lg:hidden">
                      <Button type="button" variant="outline" className="w-full" onClick={() => setMobileManualOpen(true)}>
                        Manual queue ({pendingManual.length})
                      </Button>
                    </div>
                  ) : null}

                  {viewer.shareUrl ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e8e]">Tu mundo</p>
                      <p className="mt-2 break-all text-[13px] leading-5 text-[#f1f1f1]">{viewer.shareUrl}</p>
                    </div>
                  ) : null}

                  {viewer.isOwner && pendingManual.length > 0 ? (
                    <Button type="button" variant="outline" onClick={handleSecondCheck} disabled={secondCheckState === "running" || syncState === "running"}>
                      {secondCheckState === "running" ? "Second check..." : "Second check manuales"}
                    </Button>
                  ) : null}

                  {syncError ? <p className="text-[12px] text-[#ff8b8b]">{syncError}</p> : null}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {shouldShowManualQueue ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto hidden lg:block">
              <ManualQueuePanel
                pendingManual={pendingManual}
                manualDrafts={manualDrafts}
                setManualDrafts={setManualDrafts}
                onConfirm={handleManualConfirm}
                setSyncError={setSyncError}
                lastSyncSummary={lastSyncSummary}
              />
            </motion.div>
          ) : null}

          {selectedCountryCode ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto min-h-0 flex-1">
              <Card className="tm-surface-strong flex h-full flex-col">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="yt-overline text-[#aaaaaa]">Country panel</p>
                      <CardTitle className="mt-1 text-[16px] font-medium text-[#f1f1f1]">
                        <span className="mr-2 inline-block w-5 text-center">{countryCodeToFlag(selectedCountryCode)}</span>
                        {selectedCountryName}
                      </CardTitle>
                    </div>
                    <Badge variant="outline">{selectedCountryVideos.length} videos</Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 px-4 pb-4">
                  <ScrollArea className="h-full" data-map-scroll="true">
                    <div className="space-y-3 pr-2">
                      {selectedCountryVideos.map((video) => (
                        <button
                          key={`${video.youtube_video_id}-${video.published_at || "no-date"}`}
                          type="button"
                          onClick={() => {
                            setPinnedVideo(video);
                            setFocusCountryCode(video.country_code || null);
                          }}
                          className="tm-surface flex w-full rounded-2xl p-3 text-left transition-colors hover:bg-white/10"
                        >
                          <VideoListItem video={video} />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {showActiveVideoCard && activeVideo && !selectedCountryCode && !pinnedVideo ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
              <Card className="tm-surface-strong">
                <CardContent className="px-4 py-4">
                  <p className="yt-overline text-[#aaaaaa]">Now hovering</p>
                  <div className="mt-3">
                    <VideoListItem video={activeVideo} compact />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <div className="pointer-events-auto mt-auto flex flex-col gap-4">
            {channelId && (pollState || viewer.isOwner) ? (
              <FanVoteCard
                channelId={channelId}
                viewer={viewer}
                poll={pollState}
                availableOptions={availablePollOptions}
                onPollChange={setPollState}
              />
            ) : null}

            {sponsors.length > 0 ? <SponsorsRail sponsors={sponsors} /> : null}
          </div>
        </aside>
      ) : null}

      {shouldShowManualQueue ? (
        <Sheet open={mobileManualOpen} onOpenChange={setMobileManualOpen}>
          <SheetContent side="right" className="tm-surface-strong w-[92vw] p-0">
            <SheetHeader className="border-b border-white/10 px-5 py-4">
              <SheetTitle className="text-[#f1f1f1]">Extraction report</SheetTitle>
            </SheetHeader>
            <div className="px-4 py-4">
              <ManualQueuePanel
                pendingManual={pendingManual}
                manualDrafts={manualDrafts}
                setManualDrafts={setManualDrafts}
                onConfirm={handleManualConfirm}
                setSyncError={setSyncError}
                lastSyncSummary={lastSyncSummary}
                mobile
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {selectedCountryCode ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("pointer-events-auto absolute left-1/2 z-40 -translate-x-1/2", showHeader ? "top-24" : "top-4")}>
          <button type="button" onClick={() => selectCountry(null)} className="yt-btn-secondary">
            Exit {selectedCountryName || selectedCountryCode}
          </button>
        </motion.div>
      ) : null}

      {pinnedVideo ? (
        <div className="absolute inset-0 z-[520] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPinnedVideo(null)}>
          <a
            href={pinnedVideo.video_url || `https://youtube.com/watch?v=${pinnedVideo.youtube_video_id}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full max-w-[640px]"
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="tm-surface-strong overflow-hidden">
              <CardContent className="px-4 py-4">
                <div className="yt-video-thumb aspect-video">
                  {pinnedVideo.thumbnail_url ? (
                    <Image
                      src={toCompactYouTubeThumbnail(pinnedVideo.thumbnail_url) || pinnedVideo.thumbnail_url}
                      alt={pinnedVideo.title}
                      width={1280}
                      height={720}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#212121] text-[#717171]">No thumbnail</div>
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="text-[20px] leading-7 font-medium text-[#f1f1f1]">{pinnedVideo.title}</h3>
                  <p className="mt-2 text-[12px] leading-4 text-[#aaaaaa]">
                    {formatNumber(Number(pinnedVideo.view_count || 0))} views • {formatNumber(Number(pinnedVideo.like_count || 0))} likes • {formatNumber(Number(pinnedVideo.comment_count || 0))} comments
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">
                    <span className="mr-2 inline-block w-5 text-center">{countryCodeToFlag(pinnedVideo.country_code)}</span>
                    {pinnedVideo.country_name || pinnedVideo.country_code} · {formatDate(pinnedVideo.published_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      ) : null}
    </div>
  );
}

function ManualQueuePanel({
  pendingManual,
  manualDrafts,
  setManualDrafts,
  onConfirm,
  setSyncError,
  lastSyncSummary,
  mobile = false,
}: {
  pendingManual: ManualVerificationItem[];
  manualDrafts: Record<string, { country_code: string; city: string }>;
  setManualDrafts: React.Dispatch<React.SetStateAction<Record<string, { country_code: string; city: string }>>>;
  onConfirm: (video: ManualVerificationItem) => Promise<void>;
  setSyncError: React.Dispatch<React.SetStateAction<string | null>>;
  lastSyncSummary: SyncSummary | null;
  mobile?: boolean;
}) {
  return (
    <Card className={cn("tm-surface-strong flex flex-col", mobile ? "min-h-[calc(100dvh-120px)]" : "max-h-[38dvh]") }>
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-[16px] font-medium text-[#f1f1f1]">Extraction report</CardTitle>
        <p className="text-[12px] text-[#aaaaaa]">Review the last sync summary and resolve ambiguous videos manually when needed.</p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Scanned" value={lastSyncSummary?.videos_scanned || 0} />
          <StatTile label="Auto" value={lastSyncSummary?.videos_verified_auto || 0} />
          <StatTile label="Manual" value={lastSyncSummary?.videos_needs_manual || pendingManual.length} />
        </div>

        <ScrollArea className="min-h-0 flex-1" data-map-scroll="true">
          <div className="space-y-3 pr-2">
            {pendingManual.length === 0 ? (
              <p className="text-[14px] text-[#aaaaaa]">No videos need manual verification right now.</p>
            ) : (
              pendingManual.map((video) => {
                const draft = manualDrafts[video.video_id] || { country_code: video.country_code || "", city: video.city || "" };
                return (
                  <div key={video.video_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex gap-3">
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#121212]">
                        {video.thumbnail_url ? (
                          <Image
                            src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                            alt={video.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] leading-5 font-medium text-[#f1f1f1]">{video.title}</p>
                        <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">
                          {video.needs_manual_reason || "Location could not be resolved automatically."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[88px_1fr_auto]">
                      <Input
                        value={draft.country_code}
                        onChange={(event) =>
                          setManualDrafts((current) => ({
                            ...current,
                            [video.video_id]: { ...draft, country_code: event.target.value.toUpperCase() },
                          }))
                        }
                        maxLength={2}
                        placeholder="Country"
                      />
                      <Input
                        value={draft.city}
                        onChange={(event) =>
                          setManualDrafts((current) => ({
                            ...current,
                            [video.video_id]: { ...draft, city: event.target.value },
                          }))
                        }
                        placeholder="City (optional)"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          onConfirm(video).catch((error) => setSyncError(error.message));
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SponsorsRail({ sponsors }: { sponsors: MapRailSponsor[] }) {
  return (
    <Card className="tm-surface-strong">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-[16px] font-medium text-[#f1f1f1]">Sponsors</CardTitle>
        <p className="text-[12px] text-[#aaaaaa]">Active placements pinned to this world.</p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            href={sponsor.affiliate_url || sponsor.logo_url || "#"}
            target={sponsor.affiliate_url ? "_blank" : undefined}
            rel={sponsor.affiliate_url ? "noreferrer" : undefined}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#f1f1f1]">{sponsor.brand_name}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#aaaaaa]">{sponsor.description || "Sponsored placement across this creator world."}</p>
              </div>
              {sponsor.discount_code ? (
                <span className="rounded-full border border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.1)] px-2 py-1 text-[11px] font-medium text-[#ffb5b5]">
                  {sponsor.discount_code}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(sponsor.country_codes.length ? sponsor.country_codes : ["GLOBAL"]).slice(0, 3).map((country) => (
                <span key={`${sponsor.id}-${country}`} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-[#aaaaaa]">
                  {country === "GLOBAL" ? "Global" : country}
                </span>
              ))}
              {sponsor.isExample ? <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-[#aaaaaa]">Example</span> : null}
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

function VideoListItem({ video, compact = false }: { video: TravelVideoLocation; compact?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className={cn("yt-video-thumb shrink-0", compact ? "h-16 w-28" : "h-20 w-36")}>
        {video.thumbnail_url ? (
          <Image
            src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
            alt={video.title}
            fill
            sizes={compact ? "112px" : "144px"}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#181818] text-[11px] text-[#717171]">No thumbnail</div>
        )}
      </div>
      <div className="min-w-0">
        <p className={cn("line-clamp-2 text-[#f1f1f1]", compact ? "text-[13px] leading-5" : "text-[14px] leading-5 font-medium")}>{video.title}</p>
        <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">
          {video.country_name || video.country_code} {video.city ? `• ${video.city}` : ""}
        </p>
        <p className="text-[12px] leading-4 text-[#aaaaaa]">
          {formatNumber(Number(video.view_count || 0))} views • {formatDate(video.published_at)}
        </p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="tm-surface rounded-xl px-3 py-3">
      <p className="text-[18px] leading-5 font-medium text-[#f1f1f1]">{formatExactNumber(value)}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#aaaaaa]">{label}</p>
    </div>
  );
}

function formatExactNumber(value: number) {
  if (!value) return "0";
  return Number(value).toLocaleString("en-US");
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌍";
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "🌍";
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}
