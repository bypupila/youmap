"use client";

import { useEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";

type GlobeComponent = typeof import("react-globe.gl").default;

const GLOBE_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";

export function MiniMapModel() {
  const [Globe, setGlobe] = useState<GlobeComponent | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 180 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

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
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = false;
    controls.enableZoom = false;
  }, [Globe]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative h-full w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_26%_22%,rgba(106,210,255,0.2),rgba(10,10,10,0)_45%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.06),rgba(10,10,10,0)_35%),#090909]"
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
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(83,183,255,0.25),rgba(9,9,9,0)_58%)]" />
      )}
    </div>
  );
}
