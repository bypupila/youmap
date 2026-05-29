"use client";

import Image from "next/image";
import { ArrowSquareOut, Play } from "@phosphor-icons/react";
import type { TravelVideoLocation } from "@/lib/types";
import { getDemoMapPreviewImage } from "@/lib/demo-video-previews";
import { cn } from "@/lib/utils";

interface DemoVideoEmbedPreviewProps {
  video: TravelVideoLocation | null;
  className?: string;
  frameClassName?: string;
  openButtonLabel?: string;
  hideFooter?: boolean;
  hidePreviewNotice?: boolean;
}

export function DemoVideoEmbedPreview({
  video,
  className,
  frameClassName,
  openButtonLabel = "Abrir en YouTube",
  hideFooter = false,
  hidePreviewNotice = false,
}: DemoVideoEmbedPreviewProps) {
  const previewSrc = getDemoMapPreviewImage(video?.youtube_video_id);

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("relative aspect-video min-h-[202px] overflow-hidden rounded-xl border border-white/10 bg-black", frameClassName)}>
        <Image src={previewSrc} alt={video?.title || "Vista previa demo"} fill sizes="100vw" className="object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.9)]">
            <Play size={22} weight="fill" />
          </span>
        </div>
        {hidePreviewNotice ? null : (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-white/12 bg-black/55 px-3 py-2 text-[11px] text-[#d2d8e0] backdrop-blur-sm">
            Preview demo sin reproducción ni acciones externas.
          </div>
        )}
      </div>

      {hideFooter ? null : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#8f98a3]">Modo demo: embed de referencia solamente.</span>
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 bg-[#1b1f26] px-2.5 text-[11px] font-medium text-[#b7bfcb] opacity-60"
            aria-label="Abrir en YouTube deshabilitado en demo"
          >
            {openButtonLabel}
            <ArrowSquareOut size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
