import Image from "next/image";
import { Play } from "@phosphor-icons/react";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { cn } from "@/lib/utils";
import {
  formatCountryCode,
  formatDuration,
  formatExactNumber,
  getInitials,
} from "@/components/map/lib/format";

/**
 * Small visual primitives used by both desktop and mobile shells. Keeping
 * them in one file means restyling (e.g. the country mark or the metric
 * cell) only happens in one place and stays consistent across breakpoints.
 */

export function OverviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "white" | "red";
}) {
  const colors = {
    white: "text-[#f5f7fb]",
    red: "text-[#ff5a52]",
  };

  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0">
      <p className={cn("text-center text-[20px] font-semibold leading-6", colors[tone])}>
        {formatExactNumber(value)}
      </p>
      <p className="mt-1 text-center text-[11px] text-[#9da5ae]">{label}</p>
    </div>
  );
}

export function ChannelAvatar({
  channel,
  size,
}: {
  channel: TravelChannel;
  size: "sm" | "md";
}) {
  const className = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.08] text-[12px] font-semibold text-white",
        className
      )}
    >
      {channel.thumbnail_url ? (
        <Image
          src={channel.thumbnail_url}
          alt={channel.channel_name}
          fill
          sizes={size === "sm" ? "36px" : "48px"}
          className="object-cover"
        />
      ) : (
        getInitials(channel.channel_name)
      )}
    </span>
  );
}

export function VideoThumb({
  video,
  className,
}: {
  video: TravelVideoLocation;
  className?: string;
}) {
  return (
    <span className={cn("yt-video-thumb relative shrink-0", className)}>
      {video.thumbnail_url ? (
        <Image
          src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
          alt={video.title}
          fill
          sizes="120px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(255,0,0,0.2),rgba(12,20,31,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover text-[10px] text-[#cfd6df]">
          <Play size={15} weight="fill" className="mb-1 text-white" />
          <span className="rounded bg-black/35 px-1.5 py-0.5 font-semibold">
            {formatCountryCode(video.country_code)}
          </span>
        </span>
      )}
      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
        {formatDuration(video.duration_seconds)}
      </span>
    </span>
  );
}

export function CountryCodeMark({
  code,
  compact = false,
}: {
  code?: string | null;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white text-[#07101a] font-bold",
        compact ? "h-7 w-7 text-[10px]" : "h-11 w-11 text-[12px]"
      )}
    >
      {formatCountryCode(code)}
    </span>
  );
}

export function ProgressRing({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(100, percent || 0));
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-[#ff4b42]"
      style={{
        background: `conic-gradient(#ff342d ${normalized * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
      }}
      role="img"
      aria-label={`${normalized}% progreso`}
    >
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#07101a]">
        {normalized}%
      </span>
    </div>
  );
}

export function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-4">
      <p className="text-[13px] font-medium text-[#f4f7fb]">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-[#9da5ae]">{body}</p>
    </div>
  );
}

export function MiniSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8e8e8e]">{label}</p>
      <p className="mt-1 text-[14px] font-medium text-[#f1f1f1]">{formatExactNumber(value)}</p>
    </div>
  );
}
