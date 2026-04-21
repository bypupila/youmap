"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GlobeHemisphereWest, MagnifyingGlass } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FloatingTopBarProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
  searchPlaceholder?: string;
  searchInput?: ReactNode;
  centerContent?: ReactNode;
  logoBadgeContent?: ReactNode;
  hideSearch?: boolean;
}

export function FloatingTopBar({
  eyebrow,
  title,
  actions,
  className,
  searchPlaceholder = "Search across videos, countries, or creators",
  searchInput,
  centerContent,
  logoBadgeContent,
  hideSearch = false,
}: FloatingTopBarProps) {
  return (
    <div className={cn("mx-auto yt-navbar tm-refraction pointer-events-auto", className)}>
      <div className="yt-logo-lockup min-w-0 shrink-0">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="yt-logo-badge cursor-pointer transition-transform duration-200 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {logoBadgeContent || <GlobeHemisphereWest size={20} weight="duotone" />}
        </Link>
        <div className="min-w-0">
          <p className="yt-overline">{eyebrow}</p>
          <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
        </div>
      </div>

      {centerContent || searchInput || !hideSearch ? (
        <div className="order-3 w-full md:order-none md:flex-1 md:justify-center">
          {searchInput || centerContent || (
            <div className="yt-search platform-shimmer" aria-hidden="true">
              <div className="flex h-full items-center pl-4 text-[13px] text-muted-foreground">
                <MagnifyingGlass size={16} />
              </div>
              <div className="flex h-full min-w-0 flex-1 items-center px-3 text-[13px] text-muted-foreground">
                {searchPlaceholder}
              </div>
              <div className="flex h-full min-w-16 items-center justify-center border-l border-white/10 bg-white/[0.02] text-muted-foreground">
                <span className="platform-country-code">live</span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions}
      </div>
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
