"use client";

import { useState } from "react";
import { MapExperience } from "@/components/map/map-experience";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type MapViewMode = "demo" | "viewer" | "creator";

const MODES: Array<{ id: MapViewMode; label: string }> = [
  { id: "demo", label: "Demo" },
  { id: "viewer", label: "Viewer" },
  { id: "creator", label: "Creator" },
];

interface MapProposalV1ClientProps {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

export function MapProposalV1Client({ channel, videoLocations }: MapProposalV1ClientProps) {
  const [viewMode, setViewMode] = useState<MapViewMode>("demo");

  return (
    <main className="h-screen overflow-hidden bg-[#03080d] text-white">
      <div className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/65 p-1 backdrop-blur">
        {MODES.map((mode) => {
          const active = mode.id === viewMode;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-white text-black" : "text-white/75 hover:text-white",
              ].join(" ")}
              aria-pressed={active}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      <MapExperience channel={channel} videoLocations={videoLocations} viewMode={viewMode} />
    </main>
  );
}
