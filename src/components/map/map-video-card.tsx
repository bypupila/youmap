import Image from "next/image";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getDemoMapPreviewImage } from "@/lib/demo-video-previews";
import type { SponsorBannerColors } from "@/lib/sponsor-banner-colors";
import { resolveSponsorCardVariant } from "@/lib/sponsor-card-style";
import { formatVideoDuration, getCountryNameInSpanish } from "@/components/map/video-viewer-utils";

type WatchStatus = "not_started" | "not_finished" | "watched" | "watch_later";

export type MapVideoCardActivity = {
  seenIds?: Set<string>;
  featuredIds?: Set<string>;
  watchStatusById?: Record<string, WatchStatus>;
};

type MapVideoCardProps = {
  video: TravelVideoLocation;
  activity?: MapVideoCardActivity;
  sponsorNames?: string[];
  sponsorDisplay?: {
    actionType?: "link" | "coupon" | null;
    ctaLabel?: string | null;
    couponCode?: string | null;
  };
  sponsorBannerColors?: SponsorBannerColors | null;
  highlightedVideoId?: string | null;
  isDemoMode?: boolean;
  className?: string;
  imagePriority?: boolean;
  onSelect?: (video: TravelVideoLocation) => void;
};

export function MapVideoCard({
  video,
  activity,
  sponsorNames = [],
  sponsorDisplay,
  sponsorBannerColors = null,
  highlightedVideoId = null,
  isDemoMode = false,
  className,
  imagePriority = false,
  onSelect,
}: MapVideoCardProps) {
  const videoId = String(video.youtube_video_id || "").trim();
  const countryCode = String(video.country_code || "").toUpperCase();
  const countryName = getCountryNameInSpanish(video.country_code, video.country_name);
  const videoViews = Number(video.view_count || 0);
  const durationLabel = formatVideoDuration(video.duration_seconds);
  const explicitWatchStatus = videoId ? activity?.watchStatusById?.[videoId] : undefined;
  const isWatched = explicitWatchStatus === "watched";
  const isStarted =
    explicitWatchStatus === "not_finished" ||
    (!explicitWatchStatus && Boolean(videoId && activity?.seenIds?.has(videoId)));
  const isWatchLater = explicitWatchStatus === "watch_later";
  const isFeatured = Boolean(videoId && activity?.featuredIds?.has(videoId));
  const isHighlighted = Boolean(videoId) && videoId === String(highlightedVideoId || "").trim();
  const sponsorVariant = resolveSponsorCardVariant(video.sponsor_card_style, sponsorNames.length);
  const thumbnailSrc = isDemoMode
    ? getDemoMapPreviewImage(video.youtube_video_id)
    : video.thumbnail_url || "/creators/final-cta-map-mockup.png";
  const hasSponsorBanner = sponsorNames.length > 0;
  const ctaLabel = String(sponsorDisplay?.ctaLabel || "").trim();
  const couponCode = String(sponsorDisplay?.couponCode || "").trim();
  const actionType = sponsorDisplay?.actionType || null;
  const resolvedCtaLabel =
    ctaLabel || (actionType === "coupon" || couponCode ? "Copiar" : "Ver oferta");
  const sponsorBannerStyle =
    sponsorBannerColors && sponsorNames.length === 1
      ? {
          backgroundColor: sponsorBannerColors.backgroundColor,
          color: sponsorBannerColors.textColor,
          borderColor: sponsorBannerColors.backgroundColor,
        }
      : undefined;

  const cardShellClassName = cn(
    "group relative w-[260px] shrink-0 overflow-hidden rounded-xl border-2 bg-transparent transition-all duration-300 cursor-pointer flex flex-col",
    isWatched
      ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
      : isWatchLater
        ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
      : isFeatured
        ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
      : isStarted
        ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        : isHighlighted
          ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
          : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
    className
  );

  const badges: Array<{ text: string; color: string }> = [];
  if (isWatched) {
    badges.push({
      text: "COMPLETADO",
      color: "bg-emerald-500 text-emerald-950 border-emerald-500/30",
    });
  }
  if (isStarted) {
    badges.push({
      text: "INCOMPLETO",
      color: "bg-red-500 text-red-50 border-red-500/35",
    });
  }
  if (isFeatured) {
    badges.push({
      text: "FAVORITO",
      color: "bg-yellow-400 text-black border-yellow-400/40 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]",
    });
  }
  if (isWatchLater) {
    badges.push({
      text: "VER MÁS TARDE",
      color: "bg-blue-500 text-blue-950 border-blue-400/85 ring-1 ring-blue-400/25",
    });
  }

  const sponsorBanner = (() => {
    if (!hasSponsorBanner) return null;
    if (sponsorVariant === "multi_bar") {
      return (
        <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.05] p-2 text-white">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[7.5px] font-bold uppercase tracking-widest text-zinc-500">Sponsored by</span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {sponsorNames.map((name) => (
                <span key={name} className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (sponsorVariant === "coupon_yellow") {
      return (
        <div className="shrink-0 border-b border-[#5f531f] bg-[#15120a] p-1.5 text-yellow-400" style={sponsorBannerStyle}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[8px] font-black uppercase">{sponsorNames[0]}</span>
            <div className="flex items-center gap-1">
              <span className="border border-yellow-500/50 px-1 text-[8px] font-mono font-bold uppercase tracking-widest">
                {couponCode ? `CODE: ${couponCode}` : resolvedCtaLabel}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (sponsorVariant === "premium_strip") {
      return (
        <div
          className="shrink-0 border-b border-white/10 bg-white px-4 py-1 text-black shadow-[0_6px_20px_-14px_rgba(255,255,255,0.45)]"
          style={sponsorBannerStyle}
        >
          <p className="truncate text-center text-[8px] font-black uppercase">{sponsorNames[0]}</p>
        </div>
      );
    }

    return (
      <div className="shrink-0 border-b border-red-500/35 bg-red-600 p-2 text-white transition-colors hover:bg-red-500" style={sponsorBannerStyle}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-widest">
            [ {sponsorNames[0]} ]
          </span>
          <span className="inline-flex max-w-[58%] shrink-0 items-center justify-end gap-1 whitespace-nowrap text-right text-[9px] font-black uppercase tracking-widest">
            <span className="min-w-0 truncate">{resolvedCtaLabel}</span>
            <span aria-hidden="true">-&gt;</span>
          </span>
        </div>
      </div>
    );
  })();

  return (
    <div
      className={cardShellClassName}
      style={{ height: "165px" }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(video)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect?.(video);
      }}
    >
      <Image
        src={thumbnailSrc}
        alt={video.title}
        fill
        priority={imagePriority}
        sizes="260px"
        style={{ objectPosition: "center 78%" }}
        className="absolute inset-0 h-full w-full scale-[1.07] object-cover object-center transition-transform duration-500 group-hover:scale-[1.11]"
      />

      <div className="absolute inset-0 z-20 flex min-h-0 flex-col">
        {sponsorBanner}
        {hasSponsorBanner && badges.length > 0 ? (
          <div className="shrink-0 px-2 py-1">
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span key={badge.text} className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm border", badge.color)}>
                  {badge.text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 w-full overflow-hidden">
          {!hasSponsorBanner && badges.length > 0 ? (
            <div className="absolute top-2 left-2 z-20 flex gap-1.5 justify-start">
              {badges.map((badge) => (
                <span key={badge.text} className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm border", badge.color)}>
                  {badge.text}
              </span>
            ))}
          </div>
        ) : null}

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.78)_70%,rgba(0,0,0,0.94)_100%)] p-2 pt-8">
          <p className="text-[11px] font-semibold text-white leading-tight drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
            {video.title}
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 flex h-[30px] items-center justify-between border-t border-white/10 bg-black px-2 py-1.5">
        <div className="flex gap-1.5 items-center text-[8px] font-mono text-white/78 w-1/3 justify-start drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{formatCompactMetric(videoViews)}</span>
        </div>

        <div className="flex gap-1.5 items-center text-[8px] font-mono text-white/78 justify-center w-1/3 absolute left-1/2 -translate-x-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span className="text-[10px]">{countryCodeToFlag(countryCode)}</span>
          <span className="truncate">{countryName}</span>
        </div>

        <div className="flex gap-1.5 items-center text-[8px] font-mono text-white/78 w-1/3 justify-end drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{durationLabel}</span>
        </div>
      </div>
      </div>
    </div>
  );
}

function countryCodeToFlag(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌍";
  return String.fromCodePoint(
    normalized.charCodeAt(0) + 127397,
    normalized.charCodeAt(1) + 127397
  );
}

function formatCompactMetric(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(Math.round(value));
}
