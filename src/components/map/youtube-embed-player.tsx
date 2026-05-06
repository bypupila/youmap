"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";
import {
  getOfficialYouTubeEmbedPlayerVars,
  normalizeYouTubeVideoId,
  YOUTUBE_IFRAME_API_SRC,
  YOUTUBE_OFFICIAL_EMBED_HOST,
} from "@/components/map/video-viewer-utils";
import { cn } from "@/lib/utils";

interface YouTubeEmbedPlayerProps {
  videoId: string | null;
  title: string;
  youtubeHref: string;
  thumbnailUrl?: string | null;
  className?: string;
  frameClassName?: string;
  allowFullscreen?: boolean;
  isMadeForKids?: boolean;
  onOpenInYouTube?: () => void;
}

type EmbedStatus = "loading" | "ready" | "error";
type EmbedErrorReason = "invalid_id" | "api_failed" | "player_error" | null;

type YTPlayerInstance = {
  destroy: () => void;
};

type YTPlayerOptions = {
  videoId: string;
  host?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number | boolean>;
  events?: {
    onReady?: () => void;
    onError?: (event: { data: number }) => void;
  };
};

type YTPlayerConstructor = new (element: HTMLElement, options: YTPlayerOptions) => YTPlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YTPlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeIframeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available."));
  }

  if (window.YT?.Player) return Promise.resolve();
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_SRC}"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      youtubeIframeApiPromise = null;
      reject(new Error("No se pudo cargar la API oficial de YouTube."));
    };
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

function getErrorMessage(errorReason: EmbedErrorReason) {
  switch (errorReason) {
    case "invalid_id":
      return "Este video no tiene un ID valido para el embed oficial.";
    case "api_failed":
      return "No se pudo cargar la API oficial de YouTube.";
    case "player_error":
      return "YouTube devolvio un error al intentar reproducir este video en el embed oficial.";
    default:
      return "Preparando el reproductor oficial de YouTube.";
  }
}

export function YouTubeEmbedPlayer({
  videoId,
  title,
  youtubeHref,
  thumbnailUrl,
  className,
  frameClassName,
  allowFullscreen = true,
  isMadeForKids = false,
  onOpenInYouTube,
}: YouTubeEmbedPlayerProps) {
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const normalizedVideoId = normalizeYouTubeVideoId(videoId);
  const [status, setStatus] = useState<EmbedStatus>(normalizedVideoId ? "loading" : "error");
  const [errorReason, setErrorReason] = useState<EmbedErrorReason>(normalizedVideoId ? null : "invalid_id");

  useEffect(() => {
    let cancelled = false;

    playerRef.current?.destroy();
    playerRef.current = null;

    if (!normalizedVideoId) {
      setStatus("error");
      setErrorReason("invalid_id");
      return () => {
        cancelled = true;
      };
    }

    setStatus("loading");
    setErrorReason(null);

    loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !playerContainerRef.current || !window.YT?.Player) return;

        playerRef.current?.destroy();
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          host: YOUTUBE_OFFICIAL_EMBED_HOST,
          width: "100%",
          height: "100%",
          videoId: normalizedVideoId,
          playerVars: getOfficialYouTubeEmbedPlayerVars(window.location.origin, allowFullscreen),
          events: {
            onReady: () => {
              if (!cancelled) setStatus("ready");
            },
            onError: (event) => {
              if (cancelled) return;
              playerRef.current?.destroy();
              playerRef.current = null;
              setErrorReason(event.data === 2 ? "invalid_id" : "player_error");
              setStatus("error");
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setErrorReason("api_failed");
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [allowFullscreen, normalizedVideoId]);

  function openInYoutube() {
    if (onOpenInYouTube) {
      onOpenInYouTube();
      return;
    }
    if (!youtubeHref) return;
    window.open(youtubeHref, "_blank", "noopener");
  }

  const showFallback = status === "error";

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("relative aspect-video min-h-[202px] overflow-hidden rounded-xl border border-white/10 bg-black", frameClassName)}>
        <div
          ref={playerContainerRef}
          className="absolute inset-0"
        />

        {showFallback ? (
          <div className="absolute inset-0 overflow-hidden">
            {thumbnailUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35"
                style={{ backgroundImage: `url(${thumbnailUrl})` }}
                aria-hidden="true"
              />
            ) : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,90,61,0.18),transparent_48%),linear-gradient(180deg,rgba(2,4,6,0.34),rgba(2,4,6,0.86))]" />

            <div className="relative flex h-full w-full flex-col justify-between gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="max-w-[calc(100%-3rem)]">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff9a89]">
                    Vista previa no disponible
                  </span>
                  <p className="mt-2 text-[14px] font-medium leading-5 text-white">{title}</p>
                  <p className="mt-1 max-w-[34ch] text-[12px] leading-5 text-[#c7ced8]">{getErrorMessage(errorReason)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-[0_12px_30px_-16px_rgba(0,0,0,0.8)]">
                  <WarningCircle size={16} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#8f98a3]">
                  {isMadeForKids
                    ? "Contenido Made for Kids: tracking local desactivado."
                    : "Reproductor oficial de YouTube."}
                </span>
                <span className="text-[11px] text-[#8f98a3]">Usa el botón inferior para abrirlo en YouTube.</span>
              </div>
            </div>
          </div>
        ) : null}
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
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-[#e8edf4] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Abrir en YouTube"
        >
          Abrir en YouTube
          <ArrowSquareOut size={12} />
        </button>
      </div>
    </div>
  );
}
