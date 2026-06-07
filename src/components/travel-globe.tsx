"use client";

import Image from "next/image";
import { geoCentroid } from "d3-geo";
import { Country } from "country-state-city";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { SponsorBanner } from "@/components/sponsors/sponsor-banner";
import { createCountryFlagElement, getCountryFlagClassName } from "@/lib/country-flags";
import { getCountryNameInSpanish } from "@/components/map/video-viewer-utils";
import { MapVideoCard } from "@/components/map/map-video-card";

type PointKind = "country" | "video";

type GlobePoint = {
  point_id: string;
  kind: PointKind;
  is_cluster?: boolean;
  is_expanded_video?: boolean;
  bounds?: GeoBounds;
  country_code: string;
  country_name: string;
  lat: number;
  lng: number;
  videos: TravelVideoLocation[];
  total_views: number;
  video_count: number;
  size: number;
};

type HoverCountryPreview = {
  countryCode: string;
  countryName: string;
  totalVideos: number;
  activeVideos: number;
  watchedVideos: number;
  startedVideos?: number;
  ratio: number;
};

const DENSE_PLACE_VIDEO_CLUSTER_THRESHOLD = 200;
const DENSE_CLUSTER_MAX_VIDEOS = 100;

type GeoBounds = {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
};

interface TravelGlobeProps {
  channelData: TravelChannel;
  videoLocations: TravelVideoLocation[];
  allVideoLocationsForProgress?: TravelVideoLocation[];
  compact?: boolean;
  initialCountryCode?: string | null;
  focusCountryCode?: string | null;
  focusVideoId?: string | null;
  selectedCountryCode?: string | null;
  votedCountryCode?: string | null;
  watchedVideoIds?: Set<string>;
  videoWatchStatusById?: Record<string, "not_started" | "not_finished" | "watched" | "watch_later">;
  resolveSponsorNames?: (video: TravelVideoLocation | null | undefined) => string[];
  isDemoMode?: boolean;
  interactive?: boolean;
  showControls?: boolean;
  minimalOverlay?: boolean;
  showSponsorBanner?: boolean;
  maxVisibleVideos?: number;
  pointMode?: "country" | "video";
  showSummaryCard?: boolean;
  showPointPanel?: boolean;
  pointPanelClassName?: string;
  openVideoOnCountrySelect?: boolean;
  onActiveVideoChange?: (video: TravelVideoLocation | null) => void;
  onPinnedVideoChange?: (video: TravelVideoLocation | null) => void;
  onCountrySelect?: (countryCode: string | null, source?: "polygon" | "cluster" | "country") => void;
  onClusterExpandedChange?: (expanded: boolean) => void;
  onCountryHoverChange?: (input: { countryCode: string; countryName: string } | null) => void;
  rotationEnabled?: boolean;
  onRotationChange?: (enabled: boolean) => void;
  command?: { id: number; action: "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation" | "collapse_cluster" } | null;
}

export function TravelGlobe({
  channelData,
  videoLocations,
  allVideoLocationsForProgress,
  compact = false,
  initialCountryCode = null,
  focusCountryCode = null,
  focusVideoId = null,
  selectedCountryCode = null,
  votedCountryCode = null,
  watchedVideoIds,
  videoWatchStatusById,
  resolveSponsorNames,
  isDemoMode = false,
  interactive = true,
  showControls = true,
  minimalOverlay = false,
  showSponsorBanner = true,
  maxVisibleVideos = 4,
  pointMode = "country",
  showSummaryCard = true,
  showPointPanel = true,
  pointPanelClassName,
  openVideoOnCountrySelect = true,
  onActiveVideoChange,
  onPinnedVideoChange,
  onCountrySelect,
  onClusterExpandedChange,
  onCountryHoverChange,
  rotationEnabled: controlledRotationEnabled,
  onRotationChange,
  command = null,
}: TravelGlobeProps) {
  const [GlobeComponent, setGlobeComponent] = useState<null | typeof import("react-globe.gl").default>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedPoint, setSelectedPoint] = useState<GlobePoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);
  const [hoveredCountryPreview, setHoveredCountryPreview] = useState<HoverCountryPreview | null>(null);
  const [openedClusterIds, setOpenedClusterIds] = useState<Set<string>>(() => new Set());
  const [internalRotationEnabled, setInternalRotationEnabled] = useState(true);
  const [polygonsData, setPolygonsData] = useState<object[]>([]);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  const didApplyInitialSelection = useRef(false);
  const didApplyFocusSelection = useRef<string | null>(null);
  const didApplyFocusVideo = useRef<string | null>(null);
  const syncedSelectedCountryRef = useRef<string | null>(null);
  const hoveredPointRef = useRef<GlobePoint | null>(null);
  const hoverClearTimeoutRef = useRef<number | null>(null);
  const suppressPolygonClickUntilRef = useRef(0);
  const suppressGlobeClickUntilRef = useRef(0);
  const rotationPointOfViewRef = useRef({ lat: 20, lng: -10, altitude: 2.3 });
  const rotationEnabled = controlledRotationEnabled ?? internalRotationEnabled;
  const isMobileViewport = containerSize.width > 0 && containerSize.width < 768;
  void votedCountryCode;

  const updateRotationEnabled = useCallback(
    (enabled: boolean) => {
      if (onRotationChange) {
        onRotationChange(enabled);
        return;
      }
      setInternalRotationEnabled(enabled);
    },
    [onRotationChange]
  );

  const setGlobePointOfView = useCallback((view: { lat: number; lng: number; altitude: number }, duration = 0) => {
    rotationPointOfViewRef.current = view;
    globeRef.current?.pointOfView(view, duration);
  }, []);

  const totalViews = useMemo(
    () => videoLocations.reduce((sum, video) => sum + Number(video.view_count || 0), 0),
    [videoLocations]
  );
  const totalCountries = useMemo(
    () => new Set(videoLocations.map((video) => String(video.country_code || "").toUpperCase()).filter(Boolean)).size,
    [videoLocations]
  );
  const videoCountryCodes = useMemo(
    () => new Set(videoLocations.map((video) => String(video.country_code || "").toUpperCase()).filter(Boolean)),
    [videoLocations]
  );

  const polygonCountryIndex = useMemo(() => buildPolygonCountryIndex(videoLocations), [videoLocations]);

  const countryFallbackPoints = useMemo(() => {
    if (pointMode !== "country" || polygonsData.length === 0) return [];

    const points: GlobePoint[] = [];
    for (const polygon of polygonsData) {
      const countryCode = resolveCountryCodeFromPolygon(polygon as object, polygonCountryIndex);
      if (!countryCode || videoCountryCodes.has(countryCode.toUpperCase())) continue;

      const centroid = geoCentroid(polygon as object);
      if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) continue;

      const properties = (polygon as { properties?: { name?: string } }).properties || {};
      const countryName = getCountryNameInSpanish(
        countryCode,
        Country.getCountryByCode(countryCode)?.name || String(properties.name || countryCode || "Unknown")
      );

      points.push({
        point_id: `country-empty-${countryCode.toUpperCase()}`,
        kind: "country",
        country_code: countryCode.toUpperCase(),
        country_name: countryName,
        lat: centroid[1],
        lng: centroid[0],
        videos: [],
        total_views: 0,
        video_count: 0,
        size: 0.24,
      });
    }

    return points;
  }, [pointMode, polygonsData, polygonCountryIndex, videoCountryCodes]);

  const pointsData = useMemo(() => {
    if (pointMode === "country") {
      const grouped = groupVideosByCountry(videoLocations);
      const groupedPoints = grouped.map((group) => ({
        point_id: `country-${group.country_code}`,
        kind: "country" as const,
        country_code: group.country_code,
        country_name: group.country_name,
        lat: group.lat,
        lng: group.lng,
        videos: group.videos,
        total_views: group.total_views,
        video_count: group.videos.length,
        size: Math.log2(group.videos.length + 1) * 0.48 + 0.24,
      }));

      return spreadVideoPoints([...groupedPoints, ...countryFallbackPoints]);
    }

    return spreadVideoPoints(buildVideoModePoints(videoLocations, expandedClusterId));
  }, [countryFallbackPoints, expandedClusterId, videoLocations, pointMode]);

  const arcData = useMemo(
    () => (pointMode === "country" ? getTopArcs(pointsData.filter((point) => point.video_count > 0)) : []),
    [pointMode, pointsData]
  );
  const progressSourceVideos = minimalOverlay ? videoLocations : (allVideoLocationsForProgress || videoLocations);
  const watchedCountryProgress = useMemo(() => {
    const progress = new Map<string, { total: number; watched: number; started: number; active: number; ratio: number }>();

    for (const video of progressSourceVideos) {
      const countryCode = String(video.country_code || "").toUpperCase().trim();
      if (!countryCode) continue;
      const current = progress.get(countryCode) || { total: 0, watched: 0, started: 0, active: 0, ratio: 0 };
      current.total += 1;
      if (isVideoComplete(video.youtube_video_id, watchedVideoIds, videoWatchStatusById)) {
        current.watched += 1;
      }
      if (isVideoStartedButIncomplete(video.youtube_video_id, watchedVideoIds, videoWatchStatusById)) {
        current.started += 1;
      }
      current.active = current.watched + current.started;
      current.ratio = current.total > 0 ? current.active / current.total : 0;
      progress.set(countryCode, current);
    }

    return progress;
  }, [progressSourceVideos, videoWatchStatusById, watchedVideoIds]);

  const activePoint = hoveredPoint || selectedPoint;
  const visibleVideos = activePoint ? activePoint.videos.slice(0, maxVisibleVideos) : [];
  const selectedCountrySummary = useMemo(() => {
    const normalizedCode = String(selectedCountryCode || "").toUpperCase().trim();
    if (!normalizedCode) return null;
    const stats = watchedCountryProgress.get(normalizedCode) || { total: 0, watched: 0, started: 0, active: 0, ratio: 0 };
    const matchedVideo = videoLocations.find((video) => String(video.country_code || "").toUpperCase().trim() === normalizedCode);
    const matchedPoint = pointsData.find((point) => point.country_code.toUpperCase() === normalizedCode);
    const countryName = getCountryNameInSpanish(
      normalizedCode,
      matchedPoint?.country_name || matchedVideo?.country_name || Country.getCountryByCode(normalizedCode)?.name || normalizedCode
    );
    return {
      countryCode: normalizedCode,
      countryName,
      totalVideos: stats.total,
      activeVideos: stats.active,
      watchedVideos: stats.watched,
      startedVideos: stats.started,
      ratio: stats.ratio,
    };
  }, [pointsData, selectedCountryCode, videoLocations, watchedCountryProgress]);
  const worldSummary = useMemo(() => {
    const totals = Array.from(watchedCountryProgress.values()).reduce(
      (acc, stats) => {
        acc.total += stats.total;
        acc.watched += stats.watched;
        acc.started += stats.started;
        acc.active += stats.active;
        return acc;
      },
      { total: 0, watched: 0, started: 0, active: 0 }
    );

    return {
      countryCode: "__WORLD__",
      countryName: "Mundo",
      totalVideos: totals.total,
      activeVideos: totals.active,
      watchedVideos: totals.watched,
      startedVideos: totals.started,
      ratio: totals.total > 0 ? totals.active / totals.total : 0,
    };
  }, [watchedCountryProgress]);
  const activePointCountryProgress = activePoint
    ? watchedCountryProgress.get(activePoint.country_code.toUpperCase()) || { total: activePoint.video_count, watched: 0, started: 0, active: 0, ratio: 0 }
    : null;
  const summaryCountry = hoveredCountryPreview || (activePoint
    ? {
        countryCode: activePoint.country_code,
        countryName: activePoint.country_name,
        totalVideos: activePointCountryProgress?.total || activePoint.video_count,
        activeVideos: activePointCountryProgress?.active || 0,
        watchedVideos: activePointCountryProgress?.watched || 0,
        startedVideos: activePointCountryProgress?.started || 0,
        ratio: activePointCountryProgress?.ratio || 0,
      }
    : selectedCountrySummary || (minimalOverlay ? worldSummary : null));
  const panelCountryCode = summaryCountry?.countryCode || activePoint?.country_code || "";
  const panelCountryName = summaryCountry?.countryName || activePoint?.country_name || "";
  const panelActiveVideos = summaryCountry?.activeVideos ?? activePointCountryProgress?.active ?? 0;
  const panelTotalVideos = summaryCountry?.totalVideos ?? activePointCountryProgress?.total ?? activePoint?.video_count ?? 0;
  const panelRatio = summaryCountry?.ratio ?? activePointCountryProgress?.ratio ?? 0;
  const panelPointId = activePoint?.point_id || panelCountryCode || "country";
  const panelPercent = Math.max(0, Math.min(100, Math.round(panelRatio * 100)));
  const panelProgressComplete = panelActiveVideos >= panelTotalVideos && panelTotalVideos > 0;
  const panelProgressZero = panelActiveVideos <= 0;
  const panelProgressTone = panelProgressZero ? "gray" : panelProgressComplete ? "green" : "yellow";
  const panelFlag =
    panelCountryCode === "__WORLD__" ? (
      "🌍"
    ) : (
      <span className={`${getCountryFlagClassName(panelCountryCode)} inline-block h-[12px] w-[16px] rounded-[2px]`} />
    );

  const showHoverPoint = useCallback((point: GlobePoint) => {
    if (hoverClearTimeoutRef.current) {
      window.clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
    setHoveredPoint(point);
    const progress = watchedCountryProgress.get(point.country_code.toUpperCase()) || { total: point.video_count, watched: 0, started: 0, active: 0, ratio: 0 };
    setHoveredCountryPreview({
      countryCode: point.country_code,
      countryName: point.country_name,
      totalVideos: progress.total || point.video_count,
      activeVideos: progress.active,
      watchedVideos: progress.watched,
      startedVideos: progress.started,
      ratio: progress.ratio,
    });
  }, [watchedCountryProgress]);

  const scheduleHoverPointClear = useCallback((pointId?: string, delayMs = 1000) => {
    if (hoverClearTimeoutRef.current) window.clearTimeout(hoverClearTimeoutRef.current);
    hoverClearTimeoutRef.current = window.setTimeout(() => {
      setHoveredPoint((previous) => (!pointId || previous?.point_id === pointId ? null : previous));
      setHoveredCountryPreview((previous) => (!pointId || previous ? null : previous));
      hoverClearTimeoutRef.current = null;
    }, delayMs);
  }, []);

  useEffect(() => {
    onClusterExpandedChange?.(Boolean(expandedClusterId));
  }, [expandedClusterId, onClusterExpandedChange]);

  useEffect(() => {
    let active = true;
    import("react-globe.gl").then((module) => {
      if (!active) return;
      setGlobeComponent(() => module.default);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize((current) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPolygons() {
      try {
        const response = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json", { cache: "force-cache" });
        if (!response.ok) return;
        const worldData = await response.json();
        const countries = feature(worldData, worldData.objects.countries) as { features?: object[] };
        if (!active) return;
        setPolygonsData(countries.features || []);
      } catch {
        // no-op
      }
    }
    loadPolygons();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    setGlobePointOfView({ lat: 20, lng: -10, altitude: 2.3 }, 0);
  }, [GlobeComponent, setGlobePointOfView]);

  useEffect(() => {
    if (!command || !globeRef.current) return;

    if (command.action === "reset_view") {
      updateRotationEnabled(false);
      setExpandedClusterId(null);
      setGlobePointOfView({ lat: 20, lng: -10, altitude: 2.3 }, 700);
      return;
    }

    if (command.action === "zoom_out") {
      updateRotationEnabled(false);
      const current = rotationPointOfViewRef.current;
      setGlobePointOfView(
        {
          lat: Number(current.lat ?? 20),
          lng: Number(current.lng ?? -10),
          altitude: Math.min(4.2, Math.max(0.25, Number(current.altitude ?? 2.3) * 1.22)),
        },
        450
      );
      return;
    }

    if (command.action === "zoom_in") {
      updateRotationEnabled(false);
      const current = rotationPointOfViewRef.current;
      setGlobePointOfView(
        {
          lat: Number(current.lat ?? 20),
          lng: Number(current.lng ?? -10),
          altitude: Math.max(0.2, Math.min(4.2, Number(current.altitude ?? 2.3) * 0.78)),
        },
        450
      );
      return;
    }

    if (command.action === "toggle_rotation") return;

    if (command.action === "collapse_cluster") {
      setExpandedClusterId(null);
      setHoveredPoint(null);
      return;
    }
  }, [command, setGlobePointOfView, updateRotationEnabled]);

  const focusCountryOnGlobe = useCallback((countrySelection: GlobePoint) => {
    const { lat, lng, altitude } =
      countrySelection.videos.length > 0
        ? getCountryPointOfView(countrySelection.videos, pointMode)
        : { lat: countrySelection.lat, lng: countrySelection.lng, altitude: pointMode === "video" ? 0.72 : 1.2 };
    updateRotationEnabled(false);
    setSelectedPoint(countrySelection);
    rotationPointOfViewRef.current = { lat, lng, altitude };
    globeRef.current?.pointOfView({ lat, lng, altitude }, 900);
  }, [pointMode, updateRotationEnabled]);

  useEffect(() => {
    if (!initialCountryCode || didApplyInitialSelection.current || pointsData.length === 0) return;
    const initialSelection = pointsData.find((point) => point.country_code.toUpperCase() === initialCountryCode.toUpperCase());
    if (!initialSelection) return;
    didApplyInitialSelection.current = true;
    updateRotationEnabled(false);
    setSelectedPoint(initialSelection);
    const nextView = { lat: initialSelection.lat, lng: initialSelection.lng, altitude: pointMode === "video" ? 0.82 : 1.35 };
    rotationPointOfViewRef.current = nextView;
    globeRef.current?.pointOfView(nextView, 900);
  }, [initialCountryCode, pointMode, pointsData, updateRotationEnabled]);

  useEffect(() => {
    if (!focusCountryCode || pointsData.length === 0) return;
    if (didApplyFocusSelection.current === focusCountryCode.toUpperCase()) return;
    const candidate =
      pointsData.find(
        (point) => point.kind === "country" && point.country_code.toUpperCase() === focusCountryCode.toUpperCase()
      ) || buildCountrySelectionPoint(videoLocations, focusCountryCode);
    if (!candidate) return;
    didApplyFocusSelection.current = focusCountryCode.toUpperCase();
    setExpandedClusterId(null);
    focusCountryOnGlobe(candidate);
  }, [focusCountryCode, videoLocations, pointMode, pointsData, focusCountryOnGlobe]);

  useEffect(() => {
    const normalizedSelected = String(selectedCountryCode || "").toUpperCase().trim();
    if (!normalizedSelected) {
      syncedSelectedCountryRef.current = null;
      return;
    }
    if (syncedSelectedCountryRef.current === normalizedSelected) return;

    const fallbackSelectionSource = allVideoLocationsForProgress || videoLocations;
    const candidate =
      pointsData.find(
        (point) => point.kind === "country" && point.country_code.toUpperCase() === normalizedSelected
      ) || buildCountrySelectionPoint(fallbackSelectionSource, normalizedSelected);
    if (!candidate) return;

    syncedSelectedCountryRef.current = normalizedSelected;
    didApplyFocusSelection.current = normalizedSelected;
    setExpandedClusterId(null);
    focusCountryOnGlobe(candidate);
  }, [allVideoLocationsForProgress, focusCountryOnGlobe, pointsData, selectedCountryCode, videoLocations]);

  useEffect(() => {
    const normalizedVideoId = String(focusVideoId || "").trim();
    if (!normalizedVideoId || pointsData.length === 0 || !globeRef.current) return;
    if (didApplyFocusVideo.current === normalizedVideoId) return;
    const candidate = pointsData.find((point) =>
      point.videos.some((video) => video.youtube_video_id === normalizedVideoId)
    );
    if (!candidate) return;

    didApplyFocusVideo.current = normalizedVideoId;
    didApplyFocusSelection.current = candidate.country_code.toUpperCase();
    updateRotationEnabled(false);
    setSelectedPoint(candidate);
    const nextView = { lat: candidate.lat, lng: candidate.lng, altitude: pointMode === "video" ? 0.72 : 1.2 };
    rotationPointOfViewRef.current = nextView;
    globeRef.current.pointOfView(nextView, 850);
  }, [focusVideoId, pointMode, pointsData, updateRotationEnabled]);

  useEffect(() => {
    if (!globeRef.current || !rotationEnabled) return;
    const id = window.setInterval(() => {
      if (!globeRef.current) return;
      const current = rotationPointOfViewRef.current;
      const nextView = { lat: current.lat, lng: current.lng + 0.18, altitude: current.altitude };
      rotationPointOfViewRef.current = nextView;
      globeRef.current.pointOfView(nextView, 80);
    }, 90);
    return () => window.clearInterval(id);
  }, [rotationEnabled]);

  useEffect(() => {
    if (!onActiveVideoChange) return;
    const video = activePoint?.videos?.[0] || null;
    onActiveVideoChange(video);
  }, [activePoint, onActiveVideoChange]);

  useEffect(() => {
    hoveredPointRef.current = hoveredPoint;
  }, [hoveredPoint]);

  const selectCountryFromPolygon = useCallback(
    (countryCode: string) => {
      const candidate =
        pointsData.find(
          (point) => point.kind === "country" && point.country_code.toUpperCase() === countryCode.toUpperCase()
        ) || buildCountrySelectionPoint(videoLocations, countryCode);
      onCountrySelect?.(countryCode.toUpperCase(), "polygon");
      if (!candidate) {
        setSelectedPoint(null);
        setExpandedClusterId(null);
        onPinnedVideoChange?.(null);
        return;
      }
      updateRotationEnabled(false);
      setExpandedClusterId(null);
      setSelectedPoint(candidate);
      const nextView = { lat: candidate.lat, lng: candidate.lng, altitude: pointMode === "video" ? 0.72 : 1.2 };
      rotationPointOfViewRef.current = nextView;
      globeRef.current?.pointOfView(nextView, 850);
      onPinnedVideoChange?.(openVideoOnCountrySelect ? candidate.videos[0] || null : null);
    },
    [onCountrySelect, onPinnedVideoChange, openVideoOnCountrySelect, pointMode, pointsData, updateRotationEnabled, videoLocations]
  );

  useEffect(() => {
    return () => {
      if (hoverClearTimeoutRef.current) window.clearTimeout(hoverClearTimeoutRef.current);
      disposeGlobeResources(globeRef.current);
      globeRef.current = undefined;
    };
  }, []);

  function handlePointSelection(selected: GlobePoint) {
    updateRotationEnabled(false);
    setSelectedPoint(selected);

    // Any pin that represents a single video should open it directly.
    if (selected.kind === "video" || selected.video_count === 1) {
      onPinnedVideoChange?.(selected.videos?.[0] || null);
      return;
    }

    if (isDenseVideoCluster(selected)) {
      setOpenedClusterIds((previous) => {
        const next = new Set(previous);
        next.add(selected.point_id);
        return next;
      });
      onCountrySelect?.(selected.country_code.toUpperCase(), "cluster");
      setExpandedClusterId(selected.point_id);
      const nextView = getExpandedClusterPointOfView(selected);
      rotationPointOfViewRef.current = nextView;
      globeRef.current?.pointOfView(nextView, 900);
      onPinnedVideoChange?.(null);
      return;
    }

    onCountrySelect?.(selected.country_code.toUpperCase(), "country");
    focusCountryOnGlobe(selected);
    onPinnedVideoChange?.(openVideoOnCountrySelect ? selected.videos[0] || null : null);
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-[#04070E] ${compact ? "h-[620px] rounded-[28px]" : "h-[100dvh]"} ${
        interactive ? "" : "pointer-events-none [&_*]:pointer-events-none [&_.scene-nav-info]:hidden"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(255,107,53,0.22),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(0,212,255,0.18),transparent_30%)]" />

      {GlobeComponent ? (
        <GlobeComponent
          ref={globeRef}
          width={containerSize.width || undefined}
          height={containerSize.height || undefined}
          rendererConfig={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={polygonsData}
          polygonAltitude={() => 0.005}
          polygonCapColor={(polygon) => {
            const polygonCode = resolveCountryCodeFromPolygon(polygon as object, polygonCountryIndex);
            const countryStats = polygonCode
              ? watchedCountryProgress.get(polygonCode.toUpperCase()) || { total: 0, watched: 0, started: 0, ratio: 0 }
              : { total: 0, watched: 0, started: 0, ratio: 0 };
            if (countryStats.total === 0) {
              return "rgba(255, 68, 68, 0.24)";
            }
            if (countryStats.watched >= countryStats.total) {
              return "rgba(34, 197, 94, 0.26)";
            }
            if (countryStats.watched > 0 || countryStats.started > 0) {
              return "rgba(250, 204, 21, 0.24)";
            }
            return "rgba(148, 163, 184, 0.2)";
          }}
          polygonSideColor={() => "rgba(15,23,42,0.25)"}
          polygonStrokeColor={(polygon) => {
            const polygonCode = resolveCountryCodeFromPolygon(polygon as object, polygonCountryIndex);
            const countryStats = polygonCode
              ? watchedCountryProgress.get(polygonCode.toUpperCase()) || { total: 0, watched: 0, started: 0, ratio: 0 }
              : { total: 0, watched: 0, started: 0, ratio: 0 };
            if (countryStats.total === 0) {
              return "rgba(255, 68, 68, 0.9)";
            }
            if (countryStats.watched >= countryStats.total) {
              return "rgba(34, 197, 94, 0.95)";
            }
            if (countryStats.watched > 0 || countryStats.started > 0) {
              return "rgba(250, 204, 21, 0.9)";
            }
            return "rgba(148, 163, 184, 0.82)";
          }}
          onPolygonHover={
            interactive
              ? (polygon) => {
                  const code = polygon ? resolveCountryCodeFromPolygon(polygon as object, polygonCountryIndex) : null;
                  const polygonName = String((polygon as { properties?: { name?: string } } | null)?.properties?.name || "");
      const fullCountryName = code
        ? getCountryNameInSpanish(code, Country.getCountryByCode(code.toUpperCase())?.name || polygonName)
        : polygonName;
                  if (!code || !fullCountryName || hoveredPointRef.current) {
                    if (!code) {
                      scheduleHoverPointClear();
                      setHoveredCountryPreview(null);
                    }
                    onCountryHoverChange?.(null);
                    return;
                  }
                  const stats = watchedCountryProgress.get(code.toUpperCase()) || { total: 0, watched: 0, started: 0, active: 0, ratio: 0 };
                  setHoveredCountryPreview({
                    countryCode: code,
                    countryName: fullCountryName,
                    totalVideos: stats.total,
                    activeVideos: stats.active,
                    watchedVideos: stats.watched,
                    startedVideos: stats.started,
                    ratio: stats.ratio,
                  });
                  scheduleHoverPointClear();
                  onCountryHoverChange?.({ countryCode: code, countryName: fullCountryName });
                }
              : undefined
          }
          onPolygonClick={
            interactive
              ? (polygon) => {
                  if (Date.now() < suppressPolygonClickUntilRef.current) return;
                  const code = polygon ? resolveCountryCodeFromPolygon(polygon as object, polygonCountryIndex) : null;
                  if (!code) return;
                  suppressGlobeClickUntilRef.current = Date.now() + 350;
                  selectCountryFromPolygon(code);
                }
              : undefined
          }
          pointsData={pointsData}
          pointLat={(d) => (d as GlobePoint).lat}
          pointLng={(d) => (d as GlobePoint).lng}
          pointAltitude={(d) => {
            const row = d as GlobePoint;
            if (pointMode === "video") return 0.018;
            return row.video_count > 10 ? 0.09 : 0.05;
          }}
          pointRadius={() => 0.0015}
          pointColor={() => "rgba(255,255,255,0.02)"}
          pointLabel={(d) => buildPointLabel(d as GlobePoint)}
          htmlElementsData={pointsData}
          htmlLat={(d) => (d as GlobePoint).lat}
          htmlLng={(d) => (d as GlobePoint).lng}
          htmlElement={(d) =>
            createFlagPinElement(d as GlobePoint, {
              onClick: (point) => {
                suppressPolygonClickUntilRef.current = Date.now() + 500;
                suppressGlobeClickUntilRef.current = Date.now() + 350;
                handlePointSelection(point);
              },
              onHoverStart: (point) => {
                onCountryHoverChange?.(null);
                showHoverPoint(point);
              },
              onHoverEnd: (point) => {
                scheduleHoverPointClear(point.point_id);
              },
            }, interactive, {
              opened: openedClusterIds.has((d as GlobePoint).point_id),
              expanded: expandedClusterId === (d as GlobePoint).point_id,
              hasExpandedCluster: Boolean(expandedClusterId),
              watchedProgress: getPointCompletedRatio(d as GlobePoint, watchedVideoIds, videoWatchStatusById),
              watched: isPointWatched(d as GlobePoint, watchedVideoIds, videoWatchStatusById),
              partiallyWatched: isPointPartiallyWatched(d as GlobePoint, watchedVideoIds, videoWatchStatusById),
            })
          }
          arcsData={arcData}
          arcStartLat={(d) => (d as { startLat: number }).startLat}
          arcStartLng={(d) => (d as { startLng: number }).startLng}
          arcEndLat={(d) => (d as { endLat: number }).endLat}
          arcEndLng={(d) => (d as { endLng: number }).endLng}
          arcColor={() => ["rgba(0,212,255,.30)", "rgba(255,107,53,.28)"]}
          arcDashLength={0.42}
          arcDashGap={0.16}
          arcDashAnimateTime={2800}
          arcStroke={0.45}
          onPointClick={
            interactive && pointMode !== "video"
              ? (point) => {
                  handlePointSelection(point as GlobePoint);
                }
              : undefined
          }
          onPointHover={
            interactive
              ? (point) => {
                const hovered = (point as GlobePoint | undefined) || null;
                if (hovered) {
                  onCountryHoverChange?.(null);
                  showHoverPoint(hovered);
                } else {
                  scheduleHoverPointClear();
                }
              }
              : undefined
          }
          onGlobeClick={
            interactive
              ? () => {
                  if (Date.now() < suppressGlobeClickUntilRef.current) return;
                  updateRotationEnabled(false);
                  setHoveredPoint(null);
                  setHoveredCountryPreview(null);
                  onCountryHoverChange?.(null);
                  setSelectedPoint(null);
                  setExpandedClusterId(null);
                  onPinnedVideoChange?.(null);
                }
              : undefined
          }
        />
      ) : null}

      {showSummaryCard && !minimalOverlay ? (
        <div className={`absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/55 p-4 text-white shadow-2xl backdrop-blur-md ${compact ? "w-[245px] sm:w-[245px]" : "w-[320px] sm:left-6 sm:top-6 sm:translate-x-0"}`}>
          <div className="mb-3 flex items-center gap-3">
            {channelData.thumbnail_url ? (
              <Image src={channelData.thumbnail_url} alt={channelData.channel_name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">TM</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{channelData.channel_name}</p>
              <p className="truncate text-xs text-slate-300">{channelData.channel_handle || "@travel-creator"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatCard label="Paises" value={totalCountries} />
            <StatCard label="Videos" value={videoLocations.length} />
            <StatCard label="Pins" value={pointsData.length} />
            <StatCard label="Views" value={formatNumber(totalViews)} />
          </div>
        </div>
      ) : showSummaryCard && minimalOverlay ? (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-md">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">TM</span>
          <span className="max-w-[180px] truncate">{channelData.channel_name}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-300">{pointMode === "video" ? `${videoLocations.length} videos` : `${totalCountries} paises`}</span>
        </div>
      ) : null}

      {showPointPanel && (summaryCountry || activePoint) ? (
        <aside
          className={`absolute z-30 text-white backdrop-blur-xl ${
            minimalOverlay
              ? pointPanelClassName || "left-1/2 top-4 w-[245px] -translate-x-1/2"
              : "right-0 top-0 h-full w-full max-w-[380px] border-l border-white/10 bg-black/85 p-4 sm:p-5"
          }`}
        >
          {minimalOverlay ? (
            <div
              className={
                isMobileViewport
                  ? "overflow-hidden rounded-full border border-white/[0.08] bg-[#05090f]/75 px-3 py-2"
                  : "flex items-center justify-between gap-4 overflow-hidden rounded-full border border-white/[0.08] bg-[#05090f]/75 py-2 pl-3 pr-3.5"
              }
            >
              {isMobileViewport ? (
                <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
                  <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="shrink-0 leading-none">{panelFlag}</span>
                    <h2 className="min-w-0 break-words text-[12px] font-semibold leading-tight tracking-[0.02em] text-[#d5dde6]">
                      {panelCountryName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={panelProgressTone === "green" ? "text-[9px] font-mono text-emerald-300" : panelProgressTone === "yellow" ? "text-[9px] font-mono text-yellow-300" : "text-[9px] font-mono text-slate-400"}>
                      {panelActiveVideos}/{panelTotalVideos}
                    </span>
                    <span className={panelProgressTone === "green" ? "h-0.5 w-8 overflow-hidden rounded-full bg-emerald-500/25" : panelProgressTone === "yellow" ? "h-0.5 w-8 overflow-hidden rounded-full bg-yellow-500/25" : "h-0.5 w-8 overflow-hidden rounded-full bg-slate-500/25"}>
                      <span
                        className={panelProgressTone === "green" ? "block h-full rounded-full bg-emerald-400/90" : panelProgressTone === "yellow" ? "block h-full rounded-full bg-yellow-300/90" : "block h-full rounded-full bg-slate-400/90"}
                        style={{ width: `${panelPercent}%` }}
                      />
                    </span>
                    <span className={panelProgressTone === "green" ? "w-7 text-right font-mono text-[10px] font-bold text-emerald-300" : panelProgressTone === "yellow" ? "w-7 text-right font-mono text-[10px] font-bold text-yellow-300" : "w-7 text-right font-mono text-[10px] font-bold text-slate-400"}>
                      {panelPercent}%
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 leading-none">{panelFlag}</span>
                    <h2 className="truncate text-xs font-semibold tracking-[0.02em] text-[#d5dde6]">{panelCountryName}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={panelProgressTone === "green" ? "text-[10px] font-mono text-emerald-300" : panelProgressTone === "yellow" ? "text-[10px] font-mono text-yellow-300" : "text-[10px] font-mono text-slate-400"}>
                      {panelActiveVideos}/{panelTotalVideos}
                    </span>
                    <span className={panelProgressTone === "green" ? "h-0.5 w-10 overflow-hidden rounded-full bg-emerald-500/25" : panelProgressTone === "yellow" ? "h-0.5 w-10 overflow-hidden rounded-full bg-yellow-500/25" : "h-0.5 w-10 overflow-hidden rounded-full bg-slate-500/25"}>
                      <span
                        className={panelProgressTone === "green" ? "block h-full rounded-full bg-emerald-400/90" : panelProgressTone === "yellow" ? "block h-full rounded-full bg-yellow-300/90" : "block h-full rounded-full bg-slate-400/90"}
                        style={{ width: `${panelPercent}%` }}
                      />
                    </span>
                    <span className={panelProgressTone === "green" ? "w-8 text-right font-mono text-[11px] font-bold text-emerald-300" : panelProgressTone === "yellow" ? "w-8 text-right font-mono text-[11px] font-bold text-yellow-300" : "w-8 text-right font-mono text-[11px] font-bold text-slate-400"}>
                      {panelPercent}%
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm">
                      {panelFlag}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{panelCountryName}</h2>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {activePoint?.video_count || 0} videos · {formatNumber(activePoint?.total_views || 0)} views
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
                  onClick={() => {
                    setHoveredPoint(null);
                    setSelectedPoint(null);
                    setExpandedClusterId(null);
                  }}
                >
                  Cerrar
                </button>
              </div>

              <div className="grid justify-center gap-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100dvh - 220px)" }}>
                {visibleVideos.map((video) => (
                  <MapVideoCard
                    key={`${panelPointId}-${video.youtube_video_id}`}
                    video={video}
                    activity={{ seenIds: watchedVideoIds, watchStatusById: videoWatchStatusById }}
                    sponsorNames={resolveSponsorNames?.(video) || []}
                    isDemoMode={isDemoMode}
                    onSelect={() => onPinnedVideoChange?.(video)}
                  />
                ))}
              </div>
            </>
          )}

          {showSponsorBanner && !minimalOverlay ? (
            <SponsorBanner
              channelId={channelData.id}
              countryCode={panelCountryCode}
              countryName={panelCountryName}
            />
          ) : null}
        </aside>
      ) : null}

      {minimalOverlay && !isMobileViewport && hoveredPoint?.kind === "video" && hoveredPoint.videos?.[0] ? (
        <div
          className="pointer-events-auto absolute left-1/2 top-[68px] z-[24] w-[260px] -translate-x-1/2"
          onMouseEnter={() => {
            if (hoverClearTimeoutRef.current) {
              window.clearTimeout(hoverClearTimeoutRef.current);
              hoverClearTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => scheduleHoverPointClear(hoveredPoint.point_id, 1000)}
        >
          <MapVideoCard
            video={hoveredPoint.videos[0]}
            activity={{ seenIds: watchedVideoIds, watchStatusById: videoWatchStatusById }}
            sponsorNames={resolveSponsorNames?.(hoveredPoint.videos[0]) || []}
            isDemoMode={isDemoMode}
            imagePriority
            onSelect={(video) => onPinnedVideoChange?.(video)}
          />
        </div>
      ) : null}

      {showControls ? (
        <button
          type="button"
          className={`absolute left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white backdrop-blur hover:bg-black/70 ${compact ? "bottom-4" : "bottom-5"}`}
          onClick={() => updateRotationEnabled(!rotationEnabled)}
        >
          {rotationEnabled ? "Pausar rotacion" : "Reanudar rotacion"}
        </button>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
      <p className="text-base font-semibold leading-tight">{value}</p>
      <p className="text-[11px] text-slate-300">{label}</p>
    </div>
  );
}

function buildPointLabel(point: GlobePoint) {
  if (isDenseVideoCluster(point)) {
    const featured = point.videos[0];
    const title = escapeHtml(point.country_name);
    const totalViews = formatNumber(point.total_views);
    const sampleTitle = escapeHtml(featured?.title || "Video destacado");
    const sampleThumb = featured?.thumbnail_url
      ? toCompactYouTubeThumbnail(featured.thumbnail_url) || featured.thumbnail_url
      : null;

    return `<div style="background:rgba(5,8,16,.94);padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);width:300px;color:white;font-family:system-ui">
      ${sampleThumb ? `<img src="${sampleThumb}" alt="${sampleTitle}" style="width:100%;height:136px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.12)" />` : ""}
      <div style="margin-top:8px;font-size:16px;font-weight:800;line-height:1.2">${title}</div>
      <div style="margin-top:6px;font-size:13px;color:#d1d5db">${point.video_count} videos en este grupo · ${totalViews} views</div>
      <div style="margin-top:6px;font-size:12px;color:#94a3b8">Preview: ${sampleTitle}</div>
      <div style="margin-top:8px;font-size:12px;color:#67e8f9">Selecciona el grupo para hacer zoom y ver los videos individuales</div>
    </div>`;
  }

  if (point.kind === "video") {
    const video = point.videos[0];
    const thumb = toCompactYouTubeThumbnail(video?.thumbnail_url) || "https://via.placeholder.com/360x202/111827/9CA3AF?text=Video";
    const views = formatNumber(Number(video?.view_count || 0));
    const likes = formatNumber(Number(video?.like_count || 0));
    const comments = formatNumber(Number(video?.comment_count || 0));
    const title = escapeHtml(video?.title || "Video");
    const date = escapeHtml(formatDate(video?.published_at || null));
    return `<div style="background:rgba(5,8,16,.92);padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);width:300px;color:white;font-family:system-ui">
      <img src="${thumb}" alt="${title}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.12)" />
      <div style="margin-top:8px;font-size:16px;font-weight:700;line-height:1.25">${title}</div>
      <div style="margin-top:6px;font-size:13px;color:#d1d5db">${views} views · ${likes} likes · ${comments} comments</div>
      <div style="margin-top:4px;font-size:12px;color:#94a3b8">${date} · ${escapeHtml(point.country_name)}</div>
      <div style="margin-top:8px;font-size:12px;color:#67e8f9">Selecciona el pin para abrir el embed oficial</div>
    </div>`;
  }

  return `<div style="background:rgba(0,0,0,.84);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);min-width:150px;color:white;font-family:system-ui">
    <div style="font-size:14px;font-weight:700">${escapeHtml(point.country_name)}</div>
    <div style="font-size:12px;color:#d1d5db">${point.video_count} videos</div>
    <div style="font-size:12px;color:#9ca3af">${formatNumber(point.total_views)} views</div>
  </div>`;
}

function buildVideoModePoints(videoLocations: TravelVideoLocation[], expandedClusterId: string | null) {
  const validVideos = videoLocations.filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
  const denseGroups = groupVideosByDensePlace(validVideos);
  const clusteredVideos = new Set<TravelVideoLocation>();
  const points: GlobePoint[] = [];

  for (const group of denseGroups) {
    if (group.videos.length < DENSE_PLACE_VIDEO_CLUSTER_THRESHOLD) continue;

    for (const cluster of splitDenseGroupIntoClusters(group)) {
      for (const video of cluster.videos) clusteredVideos.add(video);
      const isExpandedCluster = cluster.point_id === expandedClusterId;
      if (!expandedClusterId) {
        points.push(cluster);
      }
      if (isExpandedCluster) {
        points.push(...positionExpandedClusterVideos(cluster));
      }
    }
  }

  validVideos.forEach((row, index) => {
    if (clusteredVideos.has(row)) return;
    points.push(buildSingleVideoPoint(row, index));
  });

  return points;
}

function buildSingleVideoPoint(row: TravelVideoLocation, index: number, parentClusterId?: string): GlobePoint {
  const views = Number(row.view_count || 0);
  return {
    point_id: parentClusterId
      ? `video-expanded-${parentClusterId}-${row.youtube_video_id}-${index}`
      : `video-${row.youtube_video_id}-${index}`,
    kind: "video",
    is_expanded_video: Boolean(parentClusterId),
    country_code: row.country_code || "XX",
    country_name: getCountryNameInSpanish(row.country_code, row.country_name || row.country_code || "Unknown"),
    lat: Number(row.lat),
    lng: Number(row.lng),
    videos: [row],
    total_views: views,
    video_count: 1,
    size: Math.max(0.06, Math.min(0.16, Math.log10(views + 10) * 0.045)),
  };
}

type DenseVideoGroup = {
  key: string;
  country_code: string;
  country_name: string;
  location_name: string;
  videos: TravelVideoLocation[];
  total_views: number;
  lat_sum: number;
  lng_sum: number;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
};

function groupVideosByDensePlace(videoLocations: TravelVideoLocation[]) {
  const groups = new Map<string, DenseVideoGroup>();

  for (const row of videoLocations) {
    const key = getDensePlaceClusterKey(row);
    const countryCode = String(row.country_code || "XX").toUpperCase();
    const locationName = getDensePlaceDisplayName(row);
    const existing = groups.get(key);

    if (existing) {
      existing.videos.push(row);
      existing.total_views += Number(row.view_count || 0);
      existing.lat_sum += Number(row.lat);
      existing.lng_sum += Number(row.lng);
      existing.min_lat = Math.min(existing.min_lat, Number(row.lat));
      existing.max_lat = Math.max(existing.max_lat, Number(row.lat));
      existing.min_lng = Math.min(existing.min_lng, Number(row.lng));
      existing.max_lng = Math.max(existing.max_lng, Number(row.lng));
      continue;
    }

    groups.set(key, {
      key,
      country_code: countryCode,
      country_name: getCountryNameInSpanish(countryCode, row.country_name || countryCode),
      location_name: locationName,
      videos: [row],
      total_views: Number(row.view_count || 0),
      lat_sum: Number(row.lat),
      lng_sum: Number(row.lng),
      min_lat: Number(row.lat),
      max_lat: Number(row.lat),
      min_lng: Number(row.lng),
      max_lng: Number(row.lng),
    });
  }

  return Array.from(groups.values());
}

function splitDenseGroupIntoClusters(group: DenseVideoGroup) {
  const clusterCount = Math.ceil(group.videos.length / DENSE_CLUSTER_MAX_VIDEOS);
  const clusteredVideos = clusterVideosByGeography(group.videos, clusterCount);
  const clusters: GlobePoint[] = [];

  for (let index = 0; index < clusterCount; index += 1) {
    const videos = clusteredVideos[index] || [];
    if (videos.length === 0) continue;
    clusters.push(buildDenseVideoClusterPoint(group, videos, index + 1, clusterCount));
  }

  return spreadDenseClusterCentersWithinGroup(clusters, group);
}

function buildDenseVideoClusterPoint(
  group: DenseVideoGroup,
  videos: TravelVideoLocation[],
  clusterNumber: number,
  clusterCount: number
): GlobePoint {
  const count = Math.max(1, videos.length);
  const aggregates = videos.reduce(
    (acc, video) => ({
      lat: acc.lat + Number(video.lat),
      lng: acc.lng + Number(video.lng),
      views: acc.views + Number(video.view_count || 0),
      min_lat: Math.min(acc.min_lat, Number(video.lat)),
      max_lat: Math.max(acc.max_lat, Number(video.lat)),
      min_lng: Math.min(acc.min_lng, Number(video.lng)),
      max_lng: Math.max(acc.max_lng, Number(video.lng)),
    }),
    { lat: 0, lng: 0, views: 0, min_lat: 90, max_lat: -90, min_lng: 180, max_lng: -180 }
  );
  const clusterLabel = clusterCount > 1
    ? `${group.location_name || group.country_name} ${clusterNumber}/${clusterCount}`
    : group.location_name || group.country_name;

  return {
    point_id: `video-cluster-${group.key}-${clusterNumber}`,
    kind: "video",
    is_cluster: true,
    bounds: {
      min_lat: group.min_lat,
      max_lat: group.max_lat,
      min_lng: group.min_lng,
      max_lng: group.max_lng,
    },
    country_code: group.country_code,
    country_name: clusterLabel,
    lat: aggregates.lat / count,
    lng: aggregates.lng / count,
    videos,
    total_views: aggregates.views,
    video_count: count,
    size: Math.min(0.36, Math.max(0.18, Math.log2(count + 1) * 0.035)),
  };
}

function positionExpandedClusterVideos(cluster: GlobePoint) {
  const videos = cluster.videos;
  const count = videos.length;
  if (count === 0) return [];

  const columns = Math.ceil(Math.sqrt(count * 1.35));
  const rows = Math.ceil(count / columns);
  const bounds = cluster.bounds || getVideoBounds(videos);
  const latSpan = Math.max(1.8, bounds.max_lat - bounds.min_lat);
  const lngSpan = Math.max(1.8, bounds.max_lng - bounds.min_lng);
  const latStep = Math.min(0.34, latSpan / Math.max(1, rows - 1));
  const lngStep = Math.min(0.34, lngSpan / Math.max(1, columns - 1));
  const gridHeight = latStep * Math.max(0, rows - 1);
  const gridWidth = lngStep * Math.max(0, columns - 1);
  const centerLat = cluster.lat;
  const centerLng = cluster.lng;
  const startLat = centerLat + gridHeight / 2;
  const startLng = centerLng - gridWidth / 2;

  return videos.map((video, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const stagger = row % 2 === 0 ? 0 : lngStep * 0.5;
    return {
      ...buildSingleVideoPoint(video, index, cluster.point_id),
      lat: clampNumber(startLat - row * latStep, bounds.min_lat, bounds.max_lat),
      lng: clampNumber(startLng + col * lngStep + stagger, bounds.min_lng, bounds.max_lng),
    };
  });
}

function getVideoBounds(videos: TravelVideoLocation[]): GeoBounds {
  return videos.reduce(
    (acc, video) => ({
      min_lat: Math.min(acc.min_lat, Number(video.lat)),
      max_lat: Math.max(acc.max_lat, Number(video.lat)),
      min_lng: Math.min(acc.min_lng, Number(video.lng)),
      max_lng: Math.max(acc.max_lng, Number(video.lng)),
    }),
    { min_lat: 90, max_lat: -90, min_lng: 180, max_lng: -180 }
  );
}

function spreadDenseClusterCentersWithinGroup(clusters: GlobePoint[], group: DenseVideoGroup) {
  if (clusters.length <= 1) return clusters;

  const latSpan = Math.max(0.24, group.max_lat - group.min_lat);
  const lngSpan = Math.max(0.24, group.max_lng - group.min_lng);
  const padLat = Math.min(0.18, latSpan * 0.08);
  const padLng = Math.min(0.18, lngSpan * 0.08);
  const boundedMinLat = group.min_lat + padLat;
  const boundedMaxLat = group.max_lat - padLat;
  const boundedMinLng = group.min_lng + padLng;
  const boundedMaxLng = group.max_lng - padLng;
  const minLat = boundedMinLat < boundedMaxLat ? boundedMinLat : group.min_lat;
  const maxLat = boundedMinLat < boundedMaxLat ? boundedMaxLat : group.max_lat;
  const minLng = boundedMinLng < boundedMaxLng ? boundedMinLng : group.min_lng;
  const maxLng = boundedMinLng < boundedMaxLng ? boundedMaxLng : group.max_lng;
  const minimumDistance = Math.max(
    0.24,
    Math.min(0.74, Math.max(latSpan, lngSpan) / (Math.sqrt(clusters.length) + 0.35))
  );

  const ordered = [...clusters].sort((a, b) => b.video_count - a.video_count);
  const rng = createSeededRandom(hashStringToSeed(group.key));
  const placed: Array<{ point_id: string; lat: number; lng: number }> = [];

  for (const cluster of ordered) {
    let bestCandidate: { lat: number; lng: number; score: number } | null = null;

    for (let attempt = 0; attempt < 180; attempt += 1) {
      const candidateLat = minLat + (maxLat - minLat) * rng();
      const candidateLng = minLng + (maxLng - minLng) * rng();
      const score = nearestDistanceToPlaced(candidateLat, candidateLng, placed);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { lat: candidateLat, lng: candidateLng, score };
      }
      if (score >= minimumDistance) break;
    }

    const fallbackLat = cluster.lat || (group.lat_sum / Math.max(1, group.videos.length));
    const fallbackLng = cluster.lng || (group.lng_sum / Math.max(1, group.videos.length));
    const resolved = bestCandidate
      ? { lat: bestCandidate.lat, lng: bestCandidate.lng }
      : {
          lat: clampNumber(fallbackLat, minLat, maxLat),
          lng: clampNumber(fallbackLng, minLng, maxLng),
        };

    placed.push({
      point_id: cluster.point_id,
      lat: resolved.lat,
      lng: resolved.lng,
    });
  }

  return clusters.map((cluster) => {
    const point = placed.find((placedPoint) => placedPoint.point_id === cluster.point_id);
    if (!point) return cluster;
    return { ...cluster, lat: point.lat, lng: point.lng };
  });
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nearestDistanceToPlaced(
  lat: number,
  lng: number,
  placed: Array<{ lat: number; lng: number }>
) {
  if (placed.length === 0) return Number.POSITIVE_INFINITY;
  let nearest = Number.POSITIVE_INFINITY;
  for (const point of placed) {
    const distance = Math.sqrt(angularDistanceSquared(lat, lng, point.lat, point.lng));
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function hashStringToSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clusterVideosByGeography(videos: TravelVideoLocation[], clusterCount: number) {
  if (clusterCount <= 1) return [[...videos]];

  const ordered = [...videos].sort((a, b) => {
    const lngDelta = Number(a.lng) - Number(b.lng);
    if (Math.abs(lngDelta) > 0.000001) return lngDelta;
    const latDelta = Number(a.lat) - Number(b.lat);
    if (Math.abs(latDelta) > 0.000001) return latDelta;
    return String(a.youtube_video_id).localeCompare(String(b.youtube_video_id));
  });

  let centroids = Array.from({ length: clusterCount }, (_, index) => {
    const sampleIndex = Math.min(
      ordered.length - 1,
      Math.max(0, Math.round(((index + 0.5) / clusterCount) * ordered.length) - 1)
    );
    return {
      lat: Number(ordered[sampleIndex].lat),
      lng: Number(ordered[sampleIndex].lng),
    };
  });

  let clusters = assignVideosToNearestCentroids(ordered, centroids);

  for (let iteration = 0; iteration < 8; iteration += 1) {
    centroids = clusters.map((cluster, index) => {
      if (cluster.length === 0) return centroids[index];
      const sums = cluster.reduce(
        (acc, video) => ({
          lat: acc.lat + Number(video.lat),
          lng: acc.lng + Number(video.lng),
        }),
        { lat: 0, lng: 0 }
      );
      return {
        lat: sums.lat / cluster.length,
        lng: sums.lng / cluster.length,
      };
    });
    clusters = assignVideosToNearestCentroids(ordered, centroids);
  }

  return rebalanceClusters(clusters, Math.ceil(videos.length / clusterCount));
}

function assignVideosToNearestCentroids(
  videos: TravelVideoLocation[],
  centroids: Array<{ lat: number; lng: number }>
) {
  const clusters: TravelVideoLocation[][] = centroids.map(() => []);

  for (const video of videos) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    centroids.forEach((centroid, index) => {
      const distance = angularDistanceSquared(Number(video.lat), Number(video.lng), centroid.lat, centroid.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    clusters[bestIndex].push(video);
  }

  return clusters;
}

function rebalanceClusters(clusters: TravelVideoLocation[][], maxSize: number) {
  const result = clusters.map((cluster) => [...cluster]);

  for (let index = 0; index < result.length; index += 1) {
    result[index].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
  }

  let oversizedIndex = result.findIndex((cluster) => cluster.length > maxSize);
  while (oversizedIndex >= 0) {
    let targetIndex = -1;
    for (let index = 0; index < result.length; index += 1) {
      if (index === oversizedIndex || result[index].length >= maxSize) continue;
      if (targetIndex < 0 || result[index].length < result[targetIndex].length) targetIndex = index;
    }
    if (targetIndex < 0) break;

    const moved = result[oversizedIndex].pop();
    if (!moved) break;
    result[targetIndex].push(moved);
    oversizedIndex = result.findIndex((cluster) => cluster.length > maxSize);
  }

  return result;
}

function getDensePlaceClusterKey(row: TravelVideoLocation) {
  const countryCode = String(row.country_code || "XX").toUpperCase();
  const placeLabel = normalizeDensePlaceLabel(
    row.location_precision === "country"
      ? row.country_name || countryCode
      : row.city || row.location_label || row.region || row.country_name || countryCode
  );

  if (placeLabel) return `${countryCode}:${placeLabel}`;

  const lat = Math.round(Number(row.lat) * 10) / 10;
  const lng = Math.round(Number(row.lng) * 10) / 10;
  return `${countryCode}:geo:${lat}:${lng}`;
}

function getDensePlaceDisplayName(row: TravelVideoLocation) {
  return String(row.city || row.location_label || row.region || getCountryNameInSpanish(row.country_code, row.country_name) || "Unknown");
}

function normalizeDensePlaceLabel(raw: string | null | undefined) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isDenseVideoCluster(point: GlobePoint) {
  return point.kind === "video" && point.is_cluster === true;
}

function formatClusterCount(count: number) {
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`;
  return String(count);
}

function groupVideosByCountry(videoLocations: TravelVideoLocation[]) {
  const groups = new Map<string, {
    country_code: string;
    country_name: string;
    lat: number;
    lng: number;
    videos: TravelVideoLocation[];
    total_views: number;
  }>();

  for (const row of videoLocations) {
    if (!row.country_code) continue;
    const key = row.country_code;
    if (!groups.has(key)) {
      groups.set(key, {
        country_code: row.country_code,
        country_name: getCountryNameInSpanish(row.country_code, row.country_name || row.country_code),
        lat: row.lat,
        lng: row.lng,
        videos: [],
        total_views: 0,
      });
    }
    const group = groups.get(key);
    if (!group) continue;
    group.videos.push(row);
    group.total_views += Number(row.view_count || 0);
  }

  return Array.from(groups.values());
}

function spreadVideoPoints(basePoints: GlobePoint[]) {
  const minDistance = 0.28;
  const cellSize = minDistance;
  const placed: GlobePoint[] = [];
  const grid = new Map<string, GlobePoint[]>();

  const addToGrid = (point: GlobePoint) => {
    const gx = Math.floor((point.lng + 180) / cellSize);
    const gy = Math.floor((point.lat + 90) / cellSize);
    const key = `${gx}:${gy}`;
    const bucket = grid.get(key);
    if (bucket) {
      bucket.push(point);
    } else {
      grid.set(key, [point]);
    }
  };

  const hasCollision = (lat: number, lng: number) => {
    const gx = Math.floor((lng + 180) / cellSize);
    const gy = Math.floor((lat + 90) / cellSize);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = grid.get(`${gx + dx}:${gy + dy}`);
        if (!bucket) continue;
        for (const point of bucket) {
          if (angularDistanceSquared(point.lat, point.lng, lat, lng) < minDistance * minDistance) {
            return true;
          }
        }
      }
    }
    return false;
  };

  for (const point of basePoints) {
    let placedLat = point.lat;
    let placedLng = point.lng;
    let found = !hasCollision(placedLat, placedLng);

    if (!found) {
      for (let ring = 1; ring <= 14 && !found; ring += 1) {
        const samples = Math.max(12, ring * 16);
        const radius = minDistance * ring * 0.55;
        for (let i = 0; i < samples; i += 1) {
          const angle = (i / samples) * Math.PI * 2;
          const candidateLat = clampLat(point.lat + Math.sin(angle) * radius);
          const candidateLng = wrapLng(point.lng + Math.cos(angle) * radius);
          if (!hasCollision(candidateLat, candidateLng)) {
            placedLat = candidateLat;
            placedLng = candidateLng;
            found = true;
            break;
          }
        }
      }
    }

    const next: GlobePoint = {
      ...point,
      lat: placedLat,
      lng: placedLng,
      size: isDenseVideoCluster(point) ? point.size : 0.092,
    };
    placed.push(next);
    addToGrid(next);
  }

  return placed;
}

function angularDistanceSquared(latA: number, lngA: number, latB: number, lngB: number) {
  const dLat = latA - latB;
  const dLng = normalizeLngDelta(lngA - lngB);
  return dLat * dLat + dLng * dLng;
}

function normalizeLngDelta(delta: number) {
  let value = delta;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function wrapLng(lng: number) {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function clampLat(lat: number) {
  return Math.max(-85, Math.min(85, lat));
}

function getTopArcs(pointsData: GlobePoint[], maxArcs = 15) {
  const sorted = [...pointsData].sort((a, b) => b.video_count - a.video_count).slice(0, 6);
  const arcs: Array<{ startLat: number; startLng: number; endLat: number; endLng: number }> = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    arcs.push({
      startLat: sorted[i].lat,
      startLng: sorted[i].lng,
      endLat: sorted[i + 1].lat,
      endLng: sorted[i + 1].lng,
    });
  }
  return arcs.slice(0, maxArcs);
}

function createFlagPinElement(
  point: GlobePoint,
  handlers: {
    onClick: (point: GlobePoint) => void;
    onHoverStart: (point: GlobePoint) => void;
    onHoverEnd: (point: GlobePoint) => void;
  },
  interactive = true,
  markerState?: { opened?: boolean; expanded?: boolean; hasExpandedCluster?: boolean; watched?: boolean; partiallyWatched?: boolean; watchedProgress?: number }
) {
  const marker = document.createElement(interactive ? "button" : "div");
  const denseCluster = isDenseVideoCluster(point);
  const expandedVideo = point.is_expanded_video === true;
  const openedCluster = denseCluster && markerState?.opened;
  const expandedCluster = denseCluster && markerState?.expanded;
  const hasExpandedCluster = denseCluster && markerState?.hasExpandedCluster;
  const watched = markerState?.watched === true;
  const partiallyWatched = markerState?.partiallyWatched === true;
  const watchedProgress = Math.max(0, Math.min(1, Number(markerState?.watchedProgress || 0)));
  const isComplete = watched || watchedProgress >= 1;
  const isPartialWatch = partiallyWatched || (watchedProgress > 0 && !isComplete);
  const inactiveCluster = denseCluster && hasExpandedCluster && !expandedCluster;
  if (interactive) marker.setAttribute("type", "button");
  marker.setAttribute("data-globe-marker", "true");
  marker.setAttribute(
    "aria-label",
    denseCluster
      ? `Hacer zoom al grupo de ${point.video_count} videos: ${point.country_name}`
      : `${point.kind === "video" ? "Abrir video" : point.video_count === 0 ? "Votar por" : "Abrir destino"}: ${point.country_name}`
  );
  marker.tabIndex = -1;
  marker.style.cursor = interactive ? "pointer" : "default";
  marker.style.border = "0";
  marker.style.padding = "0";
  marker.style.background = "transparent";
  marker.style.lineHeight = "1";
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.pointerEvents = interactive ? "auto" : "none";
  marker.style.touchAction = "manipulation";

  marker.style.width = denseCluster ? "24px" : expandedVideo ? "15px" : "20px";
  marker.style.height = denseCluster ? "24px" : expandedVideo ? "15px" : "20px";
  marker.style.display = "inline-flex";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.borderRadius = "999px";
  const markerBackground = "#04070e";
  const markerTone = denseCluster
    ? isComplete
      ? "rgba(34,197,94,0.34)"
      : isPartialWatch
        ? "rgba(250,204,21,0.32)"
        : "rgba(148,163,184,0.24)"
    : isComplete
      ? "rgba(34,197,94,0.3)"
      : isPartialWatch
        ? "rgba(250,204,21,0.28)"
        : "rgba(148,163,184,0.2)";
  const markerBorder = denseCluster
    ? isComplete
      ? "1px solid rgba(34,197,94,0.98)"
      : isPartialWatch
        ? "1px solid rgba(250,204,21,0.95)"
        : expandedCluster
            ? "1px solid rgba(250,204,21,0.95)"
            : openedCluster
              ? "1px solid rgba(250,204,21,0.9)"
              : "1px solid rgba(255,255,255,0.34)"
    : isComplete
      ? "1px solid rgba(34,197,94,0.98)"
      : isPartialWatch
        ? "1px solid rgba(250,204,21,0.95)"
          : expandedVideo
            ? "1px solid rgba(255,255,255,0.18)"
            : "1px solid rgba(255,255,255,0.24)";
  const markerShadow = denseCluster
    ? isComplete
      ? "0 8px 22px rgba(2,6,23,0.62), 0 0 0 2px rgba(34,197,94,0.32)"
      : isPartialWatch
        ? "0 8px 22px rgba(2,6,23,0.56), 0 0 0 2px rgba(250,204,21,0.28)"
          : expandedCluster
            ? "0 10px 24px rgba(2,6,23,0.62), 0 0 0 2px rgba(250,204,21,0.28)"
            : openedCluster
              ? "0 8px 20px rgba(2,6,23,0.58), 0 0 0 2px rgba(250,204,21,0.3)"
              : "0 8px 20px rgba(2,6,23,0.58), 0 0 0 2px rgba(255,90,61,0.12)"
    : isComplete
      ? "0 6px 16px rgba(2,6,23,0.5), 0 0 0 2px rgba(34,197,94,0.3)"
      : isPartialWatch
        ? "0 6px 16px rgba(2,6,23,0.46), 0 0 0 2px rgba(250,204,21,0.26)"
          : "0 6px 16px rgba(2,6,23,0.45)";
  marker.style.background = markerBackground;
  marker.style.border = markerBorder;
  marker.style.boxShadow = markerShadow;
  // Keep pins above the globe/canvas but below higher-level UI overlays (cards, sidebars, menus).
  marker.style.zIndex = denseCluster ? (expandedCluster ? "9" : "8") : "7";
  marker.style.opacity = inactiveCluster ? "0.62" : "1";
  marker.style.fontSize = denseCluster ? "13px" : expandedVideo ? "10px" : "13px";
  marker.style.overflow = "hidden";
  marker.style.position = "relative";

  const tone = document.createElement("span");
  tone.setAttribute("aria-hidden", "true");
  tone.style.position = "absolute";
  tone.style.inset = "0";
  tone.style.background = markerTone;
  tone.style.pointerEvents = "none";
  tone.style.zIndex = "0";
  marker.append(tone);

  if (watchedProgress > 0) {
    const fill = document.createElement("span");
    fill.setAttribute("aria-hidden", "true");
    fill.style.position = "absolute";
    fill.style.inset = "0";
    fill.style.width = `${Math.round(watchedProgress * 100)}%`;
    fill.style.background = isComplete ? "rgba(34,197,94,0.88)" : "rgba(250,204,21,0.46)";
    fill.style.pointerEvents = "none";
    fill.style.zIndex = "1";
    marker.append(fill);
  }

  if (denseCluster) {
    const flag = createCountryFlagElement(point.country_code, 16);
    flag.style.position = "relative";
    flag.style.zIndex = "2";

    const count = document.createElement("span");
    count.textContent = formatClusterCount(point.video_count);
    count.style.position = "absolute";
    count.style.right = "-4px";
    count.style.bottom = "-4px";
    count.style.transform = "none";
    count.style.borderRadius = "999px";
    count.style.border = "1px solid rgba(255,255,255,0.28)";
    count.style.background = isComplete
      ? "rgba(34,197,94,0.96)"
      : expandedCluster || openedCluster
        ? "rgba(250,204,21,0.95)"
        : isPartialWatch
          ? "rgba(250,204,21,0.92)"
          : "rgba(4,7,14,0.9)";
    count.style.padding = "0 3px";
    count.style.fontSize = "8px";
    count.style.fontWeight = "800";
    count.style.lineHeight = "1.2";
    count.style.color = isComplete || expandedCluster || openedCluster || isPartialWatch ? "#111827" : "#fff";
    count.style.whiteSpace = "nowrap";
    count.style.pointerEvents = "none";
    count.style.zIndex = "3";

    marker.append(flag, count);
  } else {
    const flag = createCountryFlagElement(point.country_code, 16);
    flag.style.position = "relative";
    flag.style.zIndex = "2";
    marker.append(flag);
  }

  if (interactive) {
    marker.addEventListener("mouseenter", () => handlers.onHoverStart(point));
    marker.addEventListener("mouseleave", () => handlers.onHoverEnd(point));
    let lastActivationAt = 0;
    const activateMarker = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - lastActivationAt < 250) return;
      lastActivationAt = now;
      handlers.onClick(point);
    };
    marker.addEventListener("pointerdown", activateMarker);
    marker.addEventListener("click", activateMarker);
  }

  return marker;
}

type VideoWatchStatusMap = Record<string, "not_started" | "not_finished" | "watched" | "watch_later">;

function isVideoComplete(
  videoId: string | null | undefined,
  watchedVideoIds?: Set<string>,
  videoWatchStatusById?: VideoWatchStatusMap
) {
  const normalized = String(videoId || "").trim();
  if (!normalized) return false;
  if (videoWatchStatusById?.[normalized] === "watched") return true;
  return watchedVideoIds?.has(normalized) === true;
}

function isVideoStartedButIncomplete(
  videoId: string | null | undefined,
  watchedVideoIds?: Set<string>,
  videoWatchStatusById?: VideoWatchStatusMap
) {
  const normalized = String(videoId || "").trim();
  if (!normalized) return false;
  const status = videoWatchStatusById?.[normalized];
  if (status === "not_started") return false;
  if (status === "not_finished") return true;
  if (status === "watch_later") return true;
  if (status === "watched") return false;
  return false;
}

function isPointWatched(
  point: GlobePoint,
  watchedVideoIds?: Set<string>,
  videoWatchStatusById?: VideoWatchStatusMap
) {
  if (point.videos.length === 0) return false;
  return point.videos.every((video) => isVideoComplete(video.youtube_video_id, watchedVideoIds, videoWatchStatusById));
}

function isPointPartiallyWatched(
  point: GlobePoint,
  watchedVideoIds?: Set<string>,
  videoWatchStatusById?: VideoWatchStatusMap
) {
  if (point.videos.length === 0) return false;
  if (isPointWatched(point, watchedVideoIds, videoWatchStatusById)) return false;
  return point.videos.some((video) =>
    isVideoStartedButIncomplete(video.youtube_video_id, watchedVideoIds, videoWatchStatusById)
  );
}

function getPointCompletedRatio(
  point: GlobePoint,
  watchedVideoIds?: Set<string>,
  videoWatchStatusById?: VideoWatchStatusMap
) {
  if (point.videos.length === 0) return 0;
  const watchedCount = point.videos.filter((video) =>
    isVideoComplete(video.youtube_video_id, watchedVideoIds, videoWatchStatusById)
  ).length;
  return Math.max(0, Math.min(1, watchedCount / point.videos.length));
}

function buildCountrySelectionPoint(videoLocations: TravelVideoLocation[], countryCode: string): GlobePoint | null {
  const videos = videoLocations.filter((video) => String(video.country_code || "").toUpperCase() === countryCode.toUpperCase());
  if (videos.length === 0) return null;

  const aggregates = videos.reduce(
    (acc, video) => ({
      lat: acc.lat + Number(video.lat || 0),
      lng: acc.lng + Number(video.lng || 0),
      views: acc.views + Number(video.view_count || 0),
    }),
    { lat: 0, lng: 0, views: 0 }
  );

  return {
    point_id: `country-selected-${countryCode.toUpperCase()}`,
    kind: "country",
    country_code: countryCode.toUpperCase(),
    country_name: getCountryNameInSpanish(countryCode, videos[0].country_name || countryCode.toUpperCase()),
    lat: aggregates.lat / videos.length,
    lng: aggregates.lng / videos.length,
    videos,
    total_views: aggregates.views,
    video_count: videos.length,
    size: Math.log2(videos.length + 1) * 0.5 + 0.2,
  };
}

function getCountryPointOfView(videos: TravelVideoLocation[], pointMode: "country" | "video") {
  const count = videos.length;
  const aggregates = videos.reduce(
    (acc, video) => ({
      lat: acc.lat + Number(video.lat || 0),
      lng: acc.lng + Number(video.lng || 0),
      minLat: Math.min(acc.minLat, Number(video.lat || 0)),
      maxLat: Math.max(acc.maxLat, Number(video.lat || 0)),
      minLng: Math.min(acc.minLng, Number(video.lng || 0)),
      maxLng: Math.max(acc.maxLng, Number(video.lng || 0)),
    }),
    { lat: 0, lng: 0, minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
  );

  const centerLat = aggregates.lat / Math.max(1, count);
  const centerLng = aggregates.lng / Math.max(1, count);
  const latSpan = Math.abs(aggregates.maxLat - aggregates.minLat);
  const lngSpan = Math.abs(aggregates.maxLng - aggregates.minLng);
  const spread = Math.max(latSpan, lngSpan);

  const altitude = pointMode === "video"
    ? count > 1
      ? spread < 1
        ? 0.52
        : spread < 5
          ? 0.68
          : spread < 12
            ? 0.88
            : 1.05
      : 0.78
    : count > 1
      ? spread < 1
        ? 0.88
        : spread < 5
          ? 1.0
          : spread < 12
            ? 1.12
            : 1.24
      : 1.15;

  return { lat: centerLat, lng: centerLng, altitude };
}

function getExpandedClusterPointOfView(cluster: GlobePoint) {
  const baseView = getCountryPointOfView(cluster.videos, "video");
  return {
    lat: (cluster.lat || baseView.lat) + 0.75,
    lng: cluster.lng || baseView.lng,
    altitude: Math.min(0.34, Math.max(0.28, baseView.altitude * 0.48)),
  };
}

function normalizeCountryName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCountryNameIndex(videoLocations: TravelVideoLocation[]) {
  const index = new Map<string, string>();
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

  for (const video of videoLocations) {
    const code = String(video.country_code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;

    const candidates = new Set<string>();
    candidates.add(code);
    if (video.country_name) candidates.add(video.country_name);
    const intlName = displayNames.of(code);
    if (intlName) candidates.add(intlName);

    const aliases = COUNTRY_NAME_ALIASES_BY_CODE[code];
    if (aliases) {
      for (const alias of aliases) candidates.add(alias);
    }

    for (const candidate of candidates) {
      const normalized = normalizeCountryName(candidate);
      if (!normalized) continue;
      if (!index.has(normalized)) {
        index.set(normalized, code);
      }
    }
  }

  return index;
}

function buildPolygonCountryIndex(videoLocations: TravelVideoLocation[]) {
  const index = buildCountryNameIndex(videoLocations);

  for (const country of Country.getAllCountries()) {
    const code = String(country.isoCode || "").toUpperCase();
    const candidates = new Set<string>();
    if (code) candidates.add(code);
    if (country.name) candidates.add(country.name);

    for (const candidate of candidates) {
      const normalized = normalizeCountryName(candidate);
      if (!normalized) continue;
      if (!index.has(normalized)) {
        index.set(normalized, code);
      }
    }
  }

  const manualAliases: Array<[string, string]> = [
    ["fiji", "FJ"],
    ["dominican rep", "DO"],
    ["bahamas", "BS"],
    ["fr s antarctic lands", "TF"],
    ["cote d ivoire", "CI"],
    ["central african rep", "CF"],
    ["eq guinea", "GQ"],
    ["palestine", "PS"],
    ["gambia", "GM"],
    ["solomon is", "SB"],
    ["czechia", "CZ"],
    ["n cyprus", "CY"],
    ["somaliland", "SO"],
    ["eswatini", "SZ"],
    ["republic of the congo", "CG"],
    ["congo", "CG"],
    ["dem rep congo", "CD"],
    ["democratic republic of the congo", "CD"],
    ["dr congo", "CD"],
    ["bosnia and herz", "BA"],
    ["falkland is", "FK"],
    ["falkland islands", "FK"],
    ["w sahara", "EH"],
    ["western sahara", "EH"],
    ["s sudan", "SS"],
    ["south sudan", "SS"],
  ];

  for (const [alias, code] of manualAliases) {
    const normalized = normalizeCountryName(alias);
    if (!normalized || index.has(normalized)) continue;
    index.set(normalized, code);
  }

  return index;
}

function resolveCountryCodeFromPolygon(polygon: object, countryNameIndex: Map<string, string>) {
  const properties = (polygon as { properties?: Record<string, unknown> }).properties || {};
  const isoCandidate = String(
    properties.iso_a2 || properties.ISO_A2 || properties.iso2 || properties.ISO2 || ""
  ).toUpperCase();
  if (/^[A-Z]{2}$/.test(isoCandidate)) return isoCandidate;

  const name = String(properties.name || properties.NAME || "");
  if (!name) return null;

  const normalized = normalizeCountryName(name);
  if (!normalized) return null;
  if (countryNameIndex.has(normalized)) return countryNameIndex.get(normalized) || null;

  if (COUNTRY_NAME_ALIASES_TO_CANONICAL.has(normalized)) {
    const alias = COUNTRY_NAME_ALIASES_TO_CANONICAL.get(normalized) || "";
    return countryNameIndex.get(alias) || null;
  }

  return null;
}

const COUNTRY_NAME_ALIASES_BY_CODE: Record<string, string[]> = {
  US: ["United States", "United States of America", "USA", "Estados Unidos", "EEUU"],
  GB: ["United Kingdom", "UK", "Great Britain", "Britain"],
  RU: ["Russia", "Russian Federation"],
  KR: ["South Korea", "Republic of Korea", "Korea, Republic of"],
  VN: ["Vietnam", "Viet Nam"],
  BO: ["Bolivia", "Bolivia (Plurinational State of)"],
  VE: ["Venezuela", "Venezuela (Bolivarian Republic of)"],
  TZ: ["Tanzania", "United Republic of Tanzania"],
  IR: ["Iran", "Iran (Islamic Republic of)"],
  SY: ["Syria", "Syrian Arab Republic"],
  TW: ["Taiwan", "Taiwan, Province of China"],
  MD: ["Moldova", "Republic of Moldova"],
  LA: ["Laos", "Lao People's Democratic Republic"],
  MK: ["North Macedonia", "Macedonia"],
  CZ: ["Czechia", "Czech Republic"],
};

const COUNTRY_NAME_ALIASES_TO_CANONICAL = new Map<string, string>(
  Object.values(COUNTRY_NAME_ALIASES_BY_CODE).flatMap((aliases) => {
    const canonical = normalizeCountryName(aliases[0]);
    return aliases.map((alias) => [normalizeCountryName(alias), canonical] as [string, string]);
  })
);

type Disposable = {
  dispose?: () => void;
};

type ThreeMaterialLike = Disposable & {
  map?: Disposable | null;
  alphaMap?: Disposable | null;
  aoMap?: Disposable | null;
  bumpMap?: Disposable | null;
  displacementMap?: Disposable | null;
  emissiveMap?: Disposable | null;
  envMap?: Disposable | null;
  lightMap?: Disposable | null;
  metalnessMap?: Disposable | null;
  normalMap?: Disposable | null;
  roughnessMap?: Disposable | null;
  specularMap?: Disposable | null;
};

type ThreeObjectLike = {
  geometry?: Disposable | null;
  material?: ThreeMaterialLike | ThreeMaterialLike[] | null;
};

type GlobeInternals = GlobeMethods & {
  pauseAnimation?: () => void;
  controls?: () => Disposable | null | undefined;
  renderer?: () => (Disposable & { forceContextLoss?: () => void }) | undefined;
  scene?: () => { traverse?: (visitor: (object: ThreeObjectLike) => void) => void } | undefined;
};

function disposeMaterial(material: ThreeMaterialLike | null | undefined) {
  if (!material) return;
  material.map?.dispose?.();
  material.alphaMap?.dispose?.();
  material.aoMap?.dispose?.();
  material.bumpMap?.dispose?.();
  material.displacementMap?.dispose?.();
  material.emissiveMap?.dispose?.();
  material.envMap?.dispose?.();
  material.lightMap?.dispose?.();
  material.metalnessMap?.dispose?.();
  material.normalMap?.dispose?.();
  material.roughnessMap?.dispose?.();
  material.specularMap?.dispose?.();
  material.dispose?.();
}

function disposeGlobeResources(globe: GlobeMethods | undefined) {
  const internals = globe as GlobeInternals | undefined;
  if (!internals) return;

  try {
    internals.pauseAnimation?.();
  } catch {
    // no-op
  }

  try {
    internals.controls?.()?.dispose?.();
  } catch {
    // no-op
  }

  try {
    const scene = internals.scene?.();
    scene?.traverse?.((node) => {
      const object = node as unknown as ThreeObjectLike;
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        for (const material of object.material) disposeMaterial(material);
      } else {
        disposeMaterial(object.material);
      }
    });
  } catch {
    // no-op
  }

  try {
    const renderer = internals.renderer?.();
    renderer?.dispose?.();
    renderer?.forceContextLoss?.();
  } catch {
    // no-op
  }
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(raw: string) {
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
