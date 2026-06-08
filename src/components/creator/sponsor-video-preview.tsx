"use client";

import { MapVideoCard, type MapVideoCardActivity } from "@/components/map/map-video-card";
import type { SponsorBannerColors } from "@/lib/sponsor-banner-colors";
import type { SponsorCardStyle } from "@/lib/sponsor-card-style";
import type { TravelVideoLocation } from "@/lib/types";

interface SponsorVideoPreviewProps {
  previewVideoOptions: Array<{ value: string; label: string }>;
  selectedPreviewVideoId: string;
  onSelectPreviewVideoId: (videoId: string) => void;
  previewVideo: TravelVideoLocation | null;
  previewVideoSponsorNames: string[];
  previewActivity: MapVideoCardActivity;
  selectedStyle: SponsorCardStyle;
  sponsorBannerColors: SponsorBannerColors | null;
}

export function SponsorVideoPreview({
  previewVideoOptions,
  selectedPreviewVideoId,
  onSelectPreviewVideoId,
  previewVideo,
  previewVideoSponsorNames,
  previewActivity,
  selectedStyle,
  sponsorBannerColors,
}: SponsorVideoPreviewProps) {
  if (previewVideoOptions.length === 0 || !previewVideo) return null;

  const previewCardVideo = {
    ...previewVideo,
    sponsor_card_style: selectedStyle,
  } satisfies TravelVideoLocation;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">Preview del video</p>
          <p className="mt-1 text-[12px] leading-4 text-[#c6ccd4]">
            Selecciona uno de los videos elegidos para ver cómo queda el sponsor sobre ese card.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#d8dee6]">
          {previewVideoOptions.length} videos
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f98a4]">
            Video de preview
          </span>
          <select
            value={selectedPreviewVideoId}
            onChange={(event) => onSelectPreviewVideoId(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f5f7fb] outline-none"
          >
            {previewVideoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <p className="text-[11px] leading-4 text-[#8f98a4] md:max-w-[220px] md:pt-6">
          El preview se fija sobre uno de los videos seleccionados hasta que cambie la selección.
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex justify-start">
          <MapVideoCard
            video={previewCardVideo}
            activity={previewActivity}
            sponsorNames={previewVideoSponsorNames}
            sponsorBannerColors={sponsorBannerColors}
            className="shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)]"
          />
        </div>
      </div>
    </section>
  );
}
