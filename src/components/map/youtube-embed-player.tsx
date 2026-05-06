"use client";

import { useMemo } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface YouTubeEmbedPlayerProps {
  videoId: string | null;
  title: string;
  youtubeHref: string;
  className?: string;
  frameClassName?: string;
  allowFullscreen?: boolean;
  isMadeForKids?: boolean;
  onOpenInYouTube?: () => void;
}

export function YouTubeEmbedPlayer({
  videoId,
  title,
  youtubeHref,
  className,
  frameClassName,
  allowFullscreen = true,
  isMadeForKids = false,
  onOpenInYouTube,
}: YouTubeEmbedPlayerProps) {
  const embedSrc = useMemo(() => {
    if (!videoId) return "";
    const params = new URLSearchParams({
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
    });

    if (typeof window !== "undefined" && window.location?.origin) {
      params.set("origin", window.location.origin);
    }

    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }, [videoId]);

  function openInYoutube() {
    if (onOpenInYouTube) {
      onOpenInYouTube();
      return;
    }
    if (!youtubeHref) return;
    window.open(youtubeHref, "_blank", "noopener");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black", frameClassName)}>
        {videoId ? (
          <iframe
            src={embedSrc}
            title={title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen={allowFullscreen}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[#9da5ae]">
            Video no disponible
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#8f98a3]">
          {isMadeForKids
            ? "Contenido Made for Kids: tracking local desactivado."
            : "Reproductor oficial de YouTube."}
        </span>
        <button
          type="button"
          onClick={openInYoutube}
          disabled={!youtubeHref}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-[#e8edf4] transition hover:bg-white/[0.08]"
          aria-label="Abrir en YouTube"
        >
          Abrir en YouTube
          <ArrowSquareOut size={12} />
        </button>
      </div>
    </div>
  );
}
