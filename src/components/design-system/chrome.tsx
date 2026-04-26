"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GlobeHemisphereWest } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FloatingTopBarProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
  /**
   * Optional real, interactive content to render in the center slot
   * (e.g. a working search input or a stepper). When omitted, the center
   * slot collapses — we no longer render a decorative non-functional input.
   */
  searchInput?: ReactNode;
  centerContent?: ReactNode;
  logoBadgeContent?: ReactNode;
  /**
   * @deprecated The fake search has been removed. This prop is kept for
   * backwards compatibility with existing call sites and is now a no-op.
   */
  searchPlaceholder?: string;
  /**
   * @deprecated The center slot only renders when real content is provided.
   * This prop is kept for backwards compatibility and is now a no-op.
   */
  hideSearch?: boolean;
}

export function FloatingTopBar({
  eyebrow,
  title,
  actions,
  className,
  searchInput,
  centerContent,
  logoBadgeContent,
}: FloatingTopBarProps) {
  const center = searchInput ?? centerContent ?? null;

  return (
    <div
      className={cn(
        "mx-auto grid w-full grid-cols-1 gap-3 yt-navbar tm-refraction pointer-events-auto md:items-center",
        center ? "md:grid-cols-[auto_minmax(0,1fr)_auto]" : "md:grid-cols-[auto_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="yt-logo-lockup min-w-0 shrink-0">
        <Link
          href="/"
          aria-label="Ir al inicio de YouMap"
          className="yt-logo-badge cursor-pointer transition-transform duration-200 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {logoBadgeContent || <GlobeHemisphereWest size={20} weight="duotone" aria-hidden="true" />}
        </Link>
        <div className="min-w-0">
          <p className="yt-overline">{eyebrow}</p>
          <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
        </div>
      </div>

      {center ? (
        <div className="w-full md:justify-self-center md:px-4">{center}</div>
      ) : null}

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:ml-auto md:justify-self-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function MetricPill({ text, className }: { text: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("bg-white/[0.04] text-foreground", className)}>
      {text}
    </Badge>
  );
}

export function SignalPill({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("yt-chip bg-white/[0.06] text-foreground", className)}>
      <span className="platform-signal-dot h-2 w-2 rounded-full bg-primary" />
      <span>{text}</span>
    </div>
  );
}
