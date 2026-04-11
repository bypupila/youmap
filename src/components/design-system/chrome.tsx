import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FloatingTopBarProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}

export function FloatingTopBar({ eyebrow, title, actions, className }: FloatingTopBarProps) {
  return (
    <div className={cn("mx-auto yt-navbar", className)}>
      <div className="yt-logo-lockup">
        <div className="yt-logo-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M8 6.5v11l9-5.5-9-5.5Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="yt-overline text-[#aaaaaa]">{eyebrow}</p>
          <p className="truncate text-[15px] font-medium text-[#f1f1f1]">{title}</p>
        </div>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <div className="yt-search">
          <input value="" readOnly aria-label="Search" placeholder="Search across videos, countries, or creators" />
          <button type="button" aria-label="Search placeholder">
            <svg viewBox="0 0 24 24" className="mx-auto h-4 w-4 fill-current">
              <path d="M15.5 14h-.8l-.3-.3a6 6 0 1 0-.7.7l.3.3v.8L19 20.5 20.5 19 15.5 14Zm-5.5 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#272727] text-[11px] font-medium text-[#f1f1f1]">
          TM
        </div>
      </div>
    </div>
  );
}

export function MetricPill({ text, className }: { text: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-lg bg-[rgba(255,255,255,0.1)] px-3 py-1 text-[12px] text-[#f1f1f1]", className)}>
      {text}
    </Badge>
  );
}

export function SignalPill({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("yt-chip text-[#0f0f0f] bg-[#f1f1f1]", className)}>
      <span className="h-2 w-2 rounded-full bg-[#ff0000]" />
      <span>{text}</span>
    </div>
  );
}
