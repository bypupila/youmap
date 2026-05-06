"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { SponsorBanner } from "@/components/sponsors/sponsor-banner";
import { getYouTubeHref } from "@/components/map/video-viewer-utils";

type PointKind = "country" | "video";

type GlobePoint = {
  point_id: string;
  kind: PointKind;
  country_code: string;
  country_name: string;
  lat: number;
  lng: number;
  videos: TravelVideoLocation[];
  total_views: number;
  video_count: number;
  size: number;
};

interface TravelGlobeProps {
  channelData: TravelChannel;
  videoLocations: TravelVideoLocation[];
  compact?: boolean;
  initialCountryCode?: string | null;
  focusCountryCode?: string | null;
  focusVideoId?: string | null;
  selectedCountryCode?: string | null;
  interactive?: boolean;
  showControls?: boolean;
  minimalOverlay?: boolean;
  showSponsorBanner?: boolean;
  maxVisibleVideos?: number;
  pointMode?: "country" | "video";
  showSummaryCard?: boolean;
  showPointPanel?: boolean;
  onActiveVideoChange?: (video: TravelVideoLocation | null) => void;
  onPinnedVideoChange?: (video: TravelVideoLocation | null) => void;
  onCountrySelect?: (countryCode: string | null) => void;
  command?: { id: number; action: "reset_view" | "zoom_in" | "zoom_out" | "toggle_rotation" } | null;
}

export function TravelGlobe({
  channelData,
  videoLocations,
  compact = false,
  initialCountryCode = null,
  focusCountryCode = null,
  focusVideoId = null,
  selectedCountryCode = null,
  interactive = true,
  showControls = true,
  minimalOverlay = false,
  showSponsorBanner = true,
  maxVisibleVideos = 4,
  pointMode = "country",
  showSummaryCard = true,
  showPointPanel = true,
  onActiveVideoChange,
  onPinnedVideoChange,
  onCountrySelect,
  command = null,
}: TravelGlobeProps) {
  const [GlobeComponent, setGlobeComponent] = useState<null | typeof import("react-globe.gl").default>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [selectedPoint, setSelectedPoint] = useState<GlobePoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [polygonsData, setPolygonsData] = useState<object[]>([]);
  const [hoveredPolygonName, setHoveredPolygonName] = useState<string | null>(null);
  const [hoveredPolygonCode, setHoveredPolygonCode] = useState<string | null>(null);
  const didApplyInitialSelection = useRef(false);
  const didApplyFocusSelection = useRef<string | null>(null);
  const didApplyFocusVideo = useRef<string | null>(null);

  const totalViews = useMemo(
    () => videoLocations.reduce((sum, video) => sum + Number(video.view_count || 0), 0),
    [videoLocations]
  );
  const totalCountries = useMemo(
    () => new Set(videoLocations.map((video) => String(video.country_code || "").toUpperCase()).filter(Boolean)).size,
    [videoLocations]
  );

  const pointsData = useMemo(() => {
    if (pointMode === "country") {
      const grouped = groupVideosByCountry(videoLocations);
      return grouped.map((group) => ({
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
    }

    const baseVideoPoints = videoLocations
      .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
      .map((row, index) => {
        const views = Number(row.view_count || 0);
        return {
          point_id: `video-${row.youtube_video_id}-${index}`,
          kind: "video" as const,
          country_code: row.country_code || "XX",
          country_name: row.country_name || row.country_code || "Unknown",
          lat: Number(row.lat),
          lng: Number(row.lng),
          videos: [row],
          total_views: views,
          video_count: 1,
          size: Math.max(0.06, Math.min(0.16, Math.log10(views + 10) * 0.045)),
        };
      });

    return spreadVideoPoints(baseVideoPoints);
  }, [videoLocations, pointMode]);

  const arcData = useMemo(
    () => (pointMode === "country" ? getTopArcs(pointsData) : []),
    [pointMode, pointsData]
  );

  const countryNameIndex = useMemo(() => buildCountryNameIndex(videoLocations), [videoLocations]);

  const activePoint = hoveredPoint || selectedPoint;
  const panelMode = hoveredPoint ? "Hover preview" : selectedPoint ? "Pinned selection" : null;
  const visibleVideos = activePoint ? activePoint.videos.slice(0, maxVisibleVideos) : [];

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
    globeRef.current.pointOfView({ lat: 20, lng: -10, altitude: 2.3 }, 0);
  }, [GlobeComponent]);

  useEffect(() => {
    if (!command || !globeRef.current) return;
    const current = globeRef.current.pointOfView?.() as { lat?: number; lng?: number; altitude?: number } | undefined;

    if (command.action === "reset_view") {
      setRotationEnabled(false);
      globeRef.current.pointOfView({ lat: 20, lng: -10, altitude: 2.3 }, 700);
      return;
    }

    if (command.action === "zoom_out") {
      setRotationEnabled(false);
      globeRef.current.pointOfView(
        {
          lat: Number(current?.lat ?? 20),
          lng: Number(current?.lng ?? -10),
          altitude: Math.min(4.2, Math.max(0.6, Number(current?.altitude ?? 2.3) * 1.22)),
        },
        450
      );
      return;
    }

    if (command.action === "zoom_in") {
      setRotationEnabled(false);
      globeRef.current.pointOfView(
        {
          lat: Number(current?.lat ?? 20),
          lng: Number(current?.lng ?? -10),
          altitude: Math.max(0.45, Math.min(4.2, Number(current?.altitude ?? 2.3) * 0.82)),
        },
        450
      );
      return;
    }

    if (command.action === "toggle_rotation") {
      setRotationEnabled((previous) => !previous);
    }
  }, [command]);

  const focusCountryOnGlobe = useCallback((countrySelection: GlobePoint) => {
    const { lat, lng, altitude } = getCountryPointOfView(countrySelection.videos, pointMode);
    setSelectedPoint(countrySelection);
    globeRef.current?.pointOfView({ lat, lng, altitude }, 900);
  }, [pointMode]);

  useEffect(() => {
    if (!initialCountryCode || didApplyInitialSelection.current || pointsData.length === 0) return;
    const initialSelection = pointsData.find((point) => point.country_code.toUpperCase() === initialCountryCode.toUpperCase());
    if (!initialSelection) return;
    didApplyInitialSelection.current = true;
    setRotationEnabled(false);
    setSelectedPoint(initialSelection);
    globeRef.current?.pointOfView(
      { lat: initialSelection.lat, lng: initialSelection.lng, altitude: pointMode === "video" ? 0.82 : 1.35 },
      900
    );
  }, [initialCountryCode, pointMode, pointsData]);

  useEffect(() => {
    if (!focusCountryCode || pointsData.length === 0) return;
    if (didApplyFocusSelection.current === focusCountryCode.toUpperCase()) return;
    const candidate = buildCountrySelectionPoint(videoLocations, focusCountryCode);
    if (!candidate) return;
    didApplyFocusSelection.current = focusCountryCode.toUpperCase();
    focusCountryOnGlobe(candidate);
  }, [focusCountryCode, videoLocations, pointMode, pointsData, focusCountryOnGlobe]);

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
    setRotationEnabled(false);
    setSelectedPoint(candidate);
    globeRef.current.pointOfView(
      { lat: candidate.lat, lng: candidate.lng, altitude: pointMode === "video" ? 0.72 : 1.2 },
      850
    );
  }, [focusVideoId, pointMode, pointsData]);

  useEffect(() => {
    if (!globeRef.current || !rotationEnabled) return;
    let lng = 0;
    const id = window.setInterval(() => {
      if (!globeRef.current) return;
      lng += 0.18;
      globeRef.current.pointOfView({ lat: 20, lng, altitude: 2.3 }, 80);
    }, 90);
    return () => window.clearInterval(id);
  }, [rotationEnabled]);

  useEffect(() => {
    if (!onActiveVideoChange) return;
    const video = activePoint?.videos?.[0] || null;
    onActiveVideoChange(video);
  }, [activePoint, onActiveVideoChange]);

  useEffect(() => {
    return () => {
      disposeGlobeResources(globeRef.current);
      globeRef.current = undefined;
    };
  }, []);

  function handlePointSelection(selected: GlobePoint) {
    setRotationEnabled(false);
    setSelectedPoint(selected);

    if (selected.kind === "video") {
      onPinnedVideoChange?.(selected.videos?.[0] || null);
      return;
    }

    focusCountryOnGlobe(selected);
    onPinnedVideoChange?.(null);
  }

  function handleCountryPolygonSelection(polygon: object | null) {
    if (!polygon) return;
    const countryCode = resolveCountryCodeFromPolygon(polygon, countryNameIndex);
    if (!countryCode) return;

    onCountrySelect?.(countryCode);
    setRotationEnabled(false);
    setHoveredPoint(null);
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#04070E] ${compact ? "h-[620px] rounded-[28px]" : "h-[100dvh]"} ${
        interactive ? "" : "pointer-events-none [&_*]:pointer-events-none [&_.scene-nav-info]:hidden"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(255,107,53,0.22),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(0,212,255,0.18),transparent_30%)]" />

      {GlobeComponent ? (
        <GlobeComponent
          ref={globeRef}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={polygonsData}
          polygonAltitude={() => 0.005}
          polygonCapColor={(polygon) => {
            const polygonCode = resolveCountryCodeFromPolygon(polygon as object, countryNameIndex);
            if (
              selectedCountryCode &&
              polygonCode &&
              polygonCode.toUpperCase() === selectedCountryCode.toUpperCase()
            ) {
              return "rgba(34,211,238,0.18)";
            }
            if (
              hoveredPolygonCode &&
              polygonCode &&
              polygonCode.toUpperCase() === hoveredPolygonCode.toUpperCase()
            ) {
              return "rgba(125,211,252,0.12)";
            }
            return "rgba(148,163,184,0.03)";
          }}
          polygonSideColor={() => "rgba(15,23,42,0.25)"}
          polygonStrokeColor={() => "rgba(125,211,252,0.35)"}
          onPolygonHover={
            interactive
              ? (polygon) => {
                  const name = String((polygon as { properties?: { name?: string } } | null)?.properties?.name || "");
                  setHoveredPolygonName(name || null);
                  const code = polygon ? resolveCountryCodeFromPolygon(polygon as object, countryNameIndex) : null;
                  setHoveredPolygonCode(code);
                }
              : undefined
          }
          onPolygonClick={
            interactive
              ? (polygon) => {
                  handleCountryPolygonSelection((polygon as object | null) || null);
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
              onClick: (point) => handlePointSelection(point),
              onHoverStart: (point) => setHoveredPoint(point),
              onHoverEnd: (point) => {
                setHoveredPoint((previous) => (previous?.point_id === point.point_id ? null : previous));
              },
            }, interactive)
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
            interactive
              ? (point) => {
                  handlePointSelection(point as GlobePoint);
                }
              : undefined
          }
          onPointHover={
            interactive
              ? (point) => {
                  const hovered = (point as GlobePoint | undefined) || null;
                  setHoveredPoint(hovered);
                }
              : undefined
          }
          onGlobeClick={
            interactive
              ? () => {
                  setRotationEnabled(false);
                  setHoveredPoint(null);
                  setHoveredPolygonName(null);
                  setHoveredPolygonCode(null);
                  setSelectedPoint(null);
                  onPinnedVideoChange?.(null);
                }
              : undefined
          }
        />
      ) : null}

      {showSummaryCard && !minimalOverlay ? (
        <div className={`absolute left-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/55 p-4 text-white shadow-2xl backdrop-blur-md ${compact ? "w-[280px] sm:w-[300px]" : "w-[320px] sm:left-6 sm:top-6"}`}>
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

      {hoveredPolygonName ? (
        <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md">
          {hoveredPolygonCode ? `${countryCodeToFlag(hoveredPolygonCode)} ` : ""}
          {hoveredPolygonName}
        </div>
      ) : null}

      {showPointPanel && activePoint ? (
        <aside
          className={`absolute z-30 text-white backdrop-blur-xl ${
            minimalOverlay
              ? "right-4 top-4 w-[340px] rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl"
              : "right-0 top-0 h-full w-full max-w-[380px] border-l border-white/10 bg-black/85 p-4 sm:p-5"
          }`}
        >
          <div className={`flex items-center justify-between ${minimalOverlay ? "mb-2" : "mb-4"}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm">
                  {countryCodeToFlag(activePoint.country_code)}
                </span>
                <div>
                  <h2 className={`${minimalOverlay ? "text-base" : "text-lg"} font-semibold`}>{activePoint.country_name}</h2>
                  {panelMode ? <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200">{panelMode}</p> : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {activePoint.video_count} videos · {formatNumber(activePoint.total_views)} views
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
              onClick={() => {
                setHoveredPoint(null);
                setSelectedPoint(null);
              }}
            >
              Cerrar
            </button>
          </div>

          <div className={`${minimalOverlay ? "space-y-1.5" : "space-y-2 overflow-y-auto pr-1"}`} style={minimalOverlay ? undefined : { maxHeight: "calc(100dvh - 220px)" }}>
            {visibleVideos.map((video) => (
              <a
                key={`${activePoint.point_id}-${video.youtube_video_id}`}
                href={getYouTubeHref(video) || "#"}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
              >
                <div className="flex gap-3">
                  {video.thumbnail_url ? (
                    <Image
                      src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                      alt={video.title}
                      width={120}
                      height={72}
                      className="h-16 w-28 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-16 w-28 rounded-md bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-semibold">{video.title}</p>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {formatNumber(Number(video.view_count || 0))} views · {formatNumber(Number(video.like_count || 0))} likes
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatNumber(Number(video.comment_count || 0))} comments · {formatDate(video.published_at)}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {showSponsorBanner && !minimalOverlay ? (
            <SponsorBanner
              channelId={channelData.id}
              countryCode={activePoint.country_code}
              countryName={activePoint.country_name}
            />
          ) : null}
        </aside>
      ) : null}

      {showControls ? (
        <button
          type="button"
          className={`absolute left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white backdrop-blur hover:bg-black/70 ${compact ? "bottom-4" : "bottom-5"}`}
          onClick={() => setRotationEnabled((previous) => !previous)}
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
  if (point.kind === "video") {
    const video = point.videos[0];
    const thumb = toCompactYouTubeThumbnail(video?.thumbnail_url) || "https://via.placeholder.com/360x202/111827/9CA3AF?text=Video";
    const views = formatNumber(Number(video?.view_count || 0));
    const likes = formatNumber(Number(video?.like_count || 0));
    const comments = formatNumber(Number(video?.comment_count || 0));
    const title = escapeHtml(video?.title || "Video");
    const date = escapeHtml(formatDate(video?.published_at || null));
    const href = escapeHtml(getYouTubeHref(video) || "#");
    return `<div style="background:rgba(5,8,16,.92);padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);width:300px;color:white;font-family:system-ui">
      <img src="${thumb}" alt="${title}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.12)" />
      <div style="margin-top:8px;font-size:16px;font-weight:700;line-height:1.25">${title}</div>
      <div style="margin-top:6px;font-size:13px;color:#d1d5db">${views} views · ${likes} likes · ${comments} comments</div>
      <div style="margin-top:4px;font-size:12px;color:#94a3b8">${date} · ${escapeHtml(point.country_name)}</div>
      <a href="${href}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:8px;font-size:12px;color:#67e8f9;text-decoration:none">Open video ↗</a>
    </div>`;
  }

  return `<div style="background:rgba(0,0,0,.84);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);min-width:150px;color:white;font-family:system-ui">
    <div style="font-size:14px;font-weight:700">${escapeHtml(point.country_name)}</div>
    <div style="font-size:12px;color:#d1d5db">${point.video_count} videos</div>
    <div style="font-size:12px;color:#9ca3af">${formatNumber(point.total_views)} views</div>
  </div>`;
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
        country_name: row.country_name || row.country_code,
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
      size: 0.092,
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
  interactive = true
) {
  const marker = document.createElement(interactive ? "button" : "div");
  if (interactive) marker.setAttribute("type", "button");
  marker.setAttribute("data-globe-marker", "true");
  marker.setAttribute("aria-label", `${point.kind === "video" ? "Abrir video" : "Abrir destino"}: ${point.country_name}`);
  marker.tabIndex = -1;
  marker.style.cursor = interactive ? "pointer" : "default";
  marker.style.border = "0";
  marker.style.padding = "0";
  marker.style.background = "transparent";
  marker.style.lineHeight = "1";
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.pointerEvents = interactive ? "auto" : "none";

  marker.style.width = "20px";
  marker.style.height = "20px";
  marker.style.display = "inline-flex";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.borderRadius = "999px";
  marker.style.background = "rgba(4,7,14,0.78)";
  marker.style.border = "1px solid rgba(255,255,255,0.24)";
  marker.style.boxShadow = "0 6px 16px rgba(2,6,23,0.45)";
  marker.style.fontSize = "13px";
  marker.textContent = countryCodeToFlag(point.country_code);

  if (interactive) {
    marker.addEventListener("mouseenter", () => handlers.onHoverStart(point));
    marker.addEventListener("mouseleave", () => handlers.onHoverEnd(point));
    marker.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handlers.onClick(point);
    });
  }

  return marker;
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
    country_name: videos[0].country_name || countryCode.toUpperCase(),
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

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "TM";
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "TM";
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}
