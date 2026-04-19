"use client";

import type { ReactNode } from "react";
import { GlobeHemisphereWest, MagnifyingGlass } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FloatingTopBarProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
  searchPlaceholder?: string;
}

export function FloatingTopBar({
  eyebrow,
  title,
  actions,
  className,
  searchPlaceholder = "Search across videos, countries, or creators",
}: FloatingTopBarProps) {
  return (
    <div className={cn("mx-auto yt-navbar tm-refraction pointer-events-auto", className)}>
      <div className="yt-logo-lockup">
        <div className="yt-logo-badge" aria-hidden="true">
          <GlobeHemisphereWest size={20} weight="duotone" />
        </div>
        <div className="min-w-0">
          <p className="yt-overline">{eyebrow}</p>
          <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
        </div>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
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
      </div>

      <div className="ml-auto flex items-center gap-2">
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
