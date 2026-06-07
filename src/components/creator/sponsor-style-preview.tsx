"use client";

import Image from "next/image";
import { SPONSOR_CARD_STYLE_OPTIONS, type SponsorCardStyle } from "@/lib/sponsor-card-style";
import { cn } from "@/lib/utils";

interface SponsorStylePreviewProps {
  brandName: string;
  logoUrl: string | null;
  description: string | null;
  ctaLabel: string | null;
  actionType: "link" | "coupon";
  actionValue: string | null;
  selectedStyle: SponsorCardStyle;
  onSelectStyle: (style: SponsorCardStyle) => void;
}

type StyleTheme = {
  shell: string;
  chip: string;
  badge: string;
  accent: string;
  cta: string;
  surface: string;
};

const STYLE_THEMES: Record<SponsorCardStyle, StyleTheme> = {
  cta_red: {
    shell: "border-[#ff5a3d]/35 bg-[#090909] shadow-[0_28px_90px_-40px_rgba(255,90,61,0.55)]",
    chip: "border-[#ff5a3d]/30 bg-[#ff5a3d]/12 text-[#ff9a84]",
    badge: "bg-[#ff5a3d] text-white",
    accent: "text-[#ff8d74]",
    cta: "bg-[#ff5a3d] text-white",
    surface: "from-[#ff5a3d]/18 via-transparent to-transparent",
  },
  coupon_yellow: {
    shell: "border-[#ffd66f]/40 bg-[#14110a] shadow-[0_28px_90px_-40px_rgba(255,215,111,0.35)]",
    chip: "border-[#ffd66f]/35 bg-[#ffd66f]/15 text-[#ffe398]",
    badge: "bg-[#ffd66f] text-[#201600]",
    accent: "text-[#ffd66f]",
    cta: "bg-[#ffd66f] text-[#201600]",
    surface: "from-[#ffd66f]/16 via-transparent to-transparent",
  },
  premium_strip: {
    shell: "border-white/15 bg-[#080808] shadow-[0_28px_90px_-40px_rgba(0,0,0,0.85)]",
    chip: "border-white/15 bg-white/8 text-white",
    badge: "bg-white text-[#050505]",
    accent: "text-white",
    cta: "bg-white text-[#050505]",
    surface: "from-white/12 via-transparent to-transparent",
  },
};

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "SP";
}

export function SponsorStylePreview({
  brandName,
  logoUrl,
  description,
  ctaLabel,
  actionType,
  actionValue,
  selectedStyle,
  onSelectStyle,
}: SponsorStylePreviewProps) {
  const actionText = ctaLabel?.trim() || (actionType === "coupon" ? "Copiar cupón" : "Ver oferta");
  const helperText = description?.trim() || "Vista previa editorial del sponsor en el mapa.";
  const couponText = actionType === "coupon" ? actionValue?.trim() || "PROMO" : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">Propuestas visuales</p>
          <p className="mt-1 text-[12px] text-[#c6ccd4]">Elige el estilo del sponsor y mira las tres variantes disponibles.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#d8dee6]">
          {SPONSOR_CARD_STYLE_OPTIONS.find((option) => option.value === selectedStyle)?.label || "CTA rojo"}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {SPONSOR_CARD_STYLE_OPTIONS.map((option) => {
          const theme = STYLE_THEMES[option.value];
          const active = option.value === selectedStyle;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectStyle(option.value)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200",
                active ? `${theme.shell} ring-2 ring-[#ff5a3d]/35` : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
              aria-pressed={active}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", theme.surface)} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-white">{option.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#a7b0bb]">{option.description}</p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", active ? theme.badge : "border-white/10 bg-white/[0.04] text-[#c6ccd4]")}>
                  {active ? "Activo" : "Elegir"}
                </span>
              </div>

              <div className="relative mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {logoUrl ? (
                      <Image src={logoUrl} alt={brandName} fill sizes="48px" className="object-contain p-2" unoptimized />
                    ) : (
                      <span className="text-[13px] font-black text-white">{getInitials(brandName)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-white">{brandName || "Marca"}</p>
                    <p className={cn("mt-1 text-[11px] leading-4", active ? "text-[#e2e7ee]" : "text-[#b6bec9]")}>
                      {helperText}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", theme.chip)}>
                    {couponText ? "Cupón" : "CTA"}
                  </span>
                  {couponText ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                      {couponText}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", theme.accent)}>
                    {option.label}
                  </span>
                  <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]", theme.cta)}>
                    {actionText}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-4 text-[#8f98a4]">
        El estilo elegido se guardará en el sponsor y se usará como referencia visual en las vistas que lo soporten.
      </p>
    </div>
  );
}
