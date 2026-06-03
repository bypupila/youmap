"use client";

import { cn } from "@/lib/utils";
import { getCountryFlagClassName, normalizeCountryCode } from "@/lib/country-flags";

interface CountryFlagProps {
  code?: string | null;
  className?: string;
  size?: number;
  title?: string;
}

export function CountryFlag({ code, className, size = 16, title }: CountryFlagProps) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return <span aria-hidden="true">{title ? "🌐" : "🌐"}</span>;
  }

  return (
    <span
      aria-hidden={title ? undefined : "true"}
      title={title}
      className={cn(getCountryFlagClassName(normalized), "inline-block shrink-0 rounded-[2px]", className)}
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );
}
