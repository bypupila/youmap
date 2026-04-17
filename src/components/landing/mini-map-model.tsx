"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type { TravelVideoLocation } from "@/lib/types";

type GlobeComponent = typeof import("react-globe.gl").default;
type MiniMapPoint = { countryCode: string; lat: number; lng: number; count: number };

const GLOBE_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";

export function MiniMapModel({ videoLocations = [] }: { videoLocations?: TravelVideoLocation[] }) {
  const [Globe, setGlobe] = useState<GlobeComponent | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 180 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const pointsData = useMemo<MiniMapPoint[]>(() => {
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
    }));
  }, [videoLocations]);

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
    globeRef.current.pointOfView({ lat: 18, lng: -22, altitude: 2.05 }, 0);
    const controls = globeRef.current.controls();
    if (!controls) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = -0.45;
    controls.enablePan = false;
    controls.enableZoom = false;
  }, [Globe]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative h-full w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_26%_22%,rgba(106,210,255,0.2),rgba(10,10,10,0)_45%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.06),rgba(10,10,10,0)_35%),#090909] [&_*]:pointer-events-none [&_.scene-nav-info]:hidden"
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
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(83,183,255,0.25),rgba(9,9,9,0)_58%)]" />
      )}
    </div>
  );
}

function createMiniFlagPin(point: MiniMapPoint) {
  const marker = document.createElement("div");
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.pointerEvents = "none";
  marker.style.display = "grid";
  marker.style.placeItems = "center";
  marker.style.width = "18px";
  marker.style.height = "18px";
  marker.style.borderRadius = "999px";
  marker.style.background = "rgba(4,7,14,0.75)";
  marker.style.border = "1px solid rgba(255,255,255,0.22)";
  marker.style.boxShadow = "0 6px 12px rgba(2,6,23,0.45)";
  marker.style.fontSize = "10px";
  marker.style.lineHeight = "1";
  marker.style.textAlign = "center";
  marker.style.fontFamily = "\"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif";
  marker.textContent = countryCodeToFlag(point.countryCode);
  return marker;
}

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌍";
  const base = 0x1f1e6;
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "🌍";
  return String.fromCodePoint(base + first, base + second);
}
