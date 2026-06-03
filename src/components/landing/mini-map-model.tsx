"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createCountryFlagElement } from "@/lib/country-flags";

type GlobeComponent = typeof import("react-globe.gl").default;
type MiniMapPoint = { countryCode: string; lat: number; lng: number; count: number; label: string };

const GLOBE_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";

interface MiniMapModelProps {
  videoLocations?: TravelVideoLocation[];
  className?: string;
  markerMode?: "countries" | "videos";
  pointOfView?: { lat: number; lng: number; altitude: number };
  autoRotateSpeed?: number;
}

export function MiniMapModel({
  videoLocations = [],
  className,
  markerMode = "countries",
  pointOfView = { lat: 18, lng: -22, altitude: 2.05 },
  autoRotateSpeed = -0.45,
}: MiniMapModelProps) {
  const [Globe, setGlobe] = useState<GlobeComponent | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 180 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const pointsData = useMemo<MiniMapPoint[]>(() => {
    if (markerMode === "videos") {
      return videoLocations
        .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
        .map((row) => ({
          countryCode: String(row.country_code || "").toUpperCase(),
          lat: Number(row.lat),
          lng: Number(row.lng),
          count: 1,
          label: String(row.country_code || "TYM").toUpperCase(),
        }));
    }

    const byCountry = new Map<string, { latSum: number; lngSum: number; count: number }>();
    for (const row of videoLocations) {
      const countryCode = String(row.country_code || "").toUpperCase();
      if (!countryCode || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
      const current = byCountry.get(countryCode) || { latSum: 0, lngSum: 0, count: 0 };
      current.latSum += Number(row.lat);
      current.lngSum += Number(row.lng);
      current.count += 1;
      byCountry.set(countryCode, current);
    }
    return Array.from(byCountry.entries()).map(([countryCode, stats]) => ({
      countryCode,
      lat: stats.latSum / stats.count,
      lng: stats.lngSum / stats.count,
      count: stats.count,
      label: countryCode,
    }));
  }, [markerMode, videoLocations]);

  useEffect(() => {
    let active = true;

    import("react-globe.gl").then((module) => {
      if (!active) return;
      setGlobe(() => module.default);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setDimensions((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView(pointOfView, 0);
    const controls = globeRef.current.controls();
    if (!controls) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enablePan = false;
    controls.enableZoom = false;
  }, [Globe, autoRotateSpeed, pointOfView]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none relative h-full w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_26%_22%,rgba(106,210,255,0.2),rgba(10,10,10,0)_45%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.06),rgba(10,10,10,0)_35%),#090909] [&_*]:pointer-events-none [&_.scene-nav-info]:hidden",
        className
      )}
      aria-hidden="true"
    >
      {Globe ? (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={GLOBE_TEXTURE_URL}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#53b7ff"
          atmosphereAltitude={0.18}
          pointsData={pointsData}
          pointLat={(d) => (d as MiniMapPoint).lat}
          pointLng={(d) => (d as MiniMapPoint).lng}
          pointAltitude={() => 0.02}
          pointRadius={(d) => Math.min(0.06, 0.022 + Math.log2((d as MiniMapPoint).count + 1) * 0.01)}
          pointColor={() => "rgba(255,59,48,0.12)"}
          htmlElementsData={pointsData}
          htmlLat={(d) => (d as MiniMapPoint).lat}
          htmlLng={(d) => (d as MiniMapPoint).lng}
          htmlElement={(d) => createMiniFlagPin(d as MiniMapPoint)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#070a0d]">
          {/* A sleek, dark circular skeleton representing the globe while it loads */}
          <div className="relative flex h-[280px] w-[280px] animate-pulse items-center justify-center rounded-full border border-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_70%)] sm:h-[450px] sm:w-[450px]">
            <div className="absolute inset-[15%] rounded-full border border-dashed border-white/[0.03]" />
            <div className="absolute inset-[35%] rounded-full border border-white/[0.02]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">Cargando mapa...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function createMiniFlagPin(point: MiniMapPoint) {
  const marker = document.createElement("div");
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.pointerEvents = "none";
  marker.style.position = "relative";
  marker.style.display = "inline-block";
  marker.style.width = "20px";
  marker.style.height = "20px";
  marker.style.borderRadius = "999px";
  marker.style.background = "rgba(4,7,14,0.75)";
  marker.style.border = "1px solid rgba(255,255,255,0.22)";
  marker.style.boxShadow = "0 6px 12px rgba(2,6,23,0.45)";

  const flag = createCountryFlagElement(point.countryCode || point.label, 14);
  flag.style.position = "absolute";
  flag.style.left = "50%";
  flag.style.top = "50%";
  flag.style.transform = "translate(-50%, -50%)";
  marker.appendChild(flag);

  return marker;
}
