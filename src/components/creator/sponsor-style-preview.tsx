"use client";

import { ArrowRight, Scissors, Tag, Ticket } from "@phosphor-icons/react";
import { SPONSOR_CARD_STYLE_OPTIONS, type SponsorCardStyle } from "@/lib/sponsor-card-style";
import { cn } from "@/lib/utils";

interface SponsorStylePreviewProps {
  selectedStyle: SponsorCardStyle;
  onSelectStyle: (style: SponsorCardStyle) => void;
}

type StyleTheme = {
  shell: string;
  chip: string;
  glow: string;
  banner: string;
  bannerText: string;
  accent: string;
  cta: string;
  thumbnail: string;
};

const STYLE_THEMES: Record<SponsorCardStyle, StyleTheme> = {
  cta_red: {
    shell: "border-[#ff5a3d]/35 bg-[#090909] shadow-[0_28px_90px_-40px_rgba(255,90,61,0.45)]",
    chip: "border-[#ff5a3d]/30 bg-[#ff5a3d]/12 text-[#ff9a84]",
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(255,90,61,0.32),transparent_55%)]",
    banner: "bg-[#ff5a3d] text-white",
    bannerText: "50% OFF",
    accent: "text-[#ff8d74]",
    cta: "bg-[#ff5a3d] text-white",
    thumbnail: "from-[#21110e] via-[#0f0c0c] to-[#050505]",
  },
  coupon_yellow: {
    shell: "border-[#ffd66f]/40 bg-[#14110a] shadow-[0_28px_90px_-40px_rgba(255,215,111,0.3)]",
    chip: "border-[#ffd66f]/35 bg-[#ffd66f]/15 text-[#ffe398]",
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(255,214,111,0.28),transparent_55%)]",
    banner: "bg-[#15120a] text-[#ffd66f] border-[#5f531f]",
    bannerText: "Cupón",
    accent: "text-[#ffd66f]",
    cta: "bg-[#ffd66f] text-[#201600]",
    thumbnail: "from-[#1d1a09] via-[#121109] to-[#070705]",
  },
  premium_strip: {
    shell: "border-white/15 bg-[#080808] shadow-[0_28px_90px_-40px_rgba(0,0,0,0.85)]",
    chip: "border-white/15 bg-white/8 text-white",
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]",
    banner: "bg-white text-[#050505] border-white/10",
    bannerText: "HEYMONDO",
    accent: "text-white",
    cta: "bg-white text-[#050505]",
    thumbnail: "from-[#111111] via-[#0b0b0b] to-[#050505]",
  },
};

export function SponsorStylePreview({
  selectedStyle,
  onSelectStyle,
}: SponsorStylePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">Estilo visual</p>
          <p className="mt-1 text-[12px] text-[#c6ccd4]">Selecciona la lectura visual del sponsor antes de ver el preview real del video.</p>
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
                "group overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200",
                active ? `${theme.shell} ring-2 ring-[#ff5a3d]/35` : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
              aria-pressed={active}
            >
              <div className="relative overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/40">
                <div className={cn("absolute inset-0 opacity-100 transition-opacity", theme.glow)} />
                <div className="relative p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">Vista previa</p>
                      <p className="mt-1 text-[13px] font-black text-white">{option.label}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                        active ? "border-white/15 bg-white text-[#050505]" : "border-white/10 bg-white/[0.05] text-[#d8dee6]"
                      )}
                    >
                      {active ? "Activo" : "Elegir"}
                    </span>
                  </div>

                  <div className={cn("relative mt-3 h-[144px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br", theme.thumbnail)}>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_44%,rgba(0,0,0,0.32))]" />
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white/80" />
                      <span className="h-2 w-2 rounded-full bg-white/30" />
                      <span className="h-2 w-2 rounded-full bg-white/20" />
                    </div>

                    <div className="absolute inset-x-3 top-10 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                          <Tag size={18} className={cn("rotate-[-8deg]", theme.accent)} weight="fill" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-black text-white">Marca sponsor</p>
                          <p className="mt-1 text-[11px] leading-4 text-[#c6ccd4]">
                            {option.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", theme.chip)}>
                          CTA
                        </span>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", theme.chip)}>
                          Style
                        </span>
                      </div>
                    </div>

                    <div className={cn("absolute inset-x-0 bottom-0 border-t p-2.5", theme.banner)}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em]">
                          {option.value === "coupon_yellow" ? <Scissors size={11} weight="bold" /> : <Ticket size={11} weight="fill" />}
                          <span className="truncate">{theme.bannerText}</span>
                        </span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", theme.cta)}>
                          Vista
                          <ArrowRight size={10} weight="bold" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-white">{option.label}</p>
                      <p className="mt-1 text-[11px] leading-4 text-[#a7b0bb]">{option.description}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]", active ? "border-[#ff5a3d]/30 bg-[#ff5a3d] text-white" : "border-white/10 bg-white/[0.04] text-[#c6ccd4]")}>
                      {active ? "Elegido" : "Ver"}
                    </span>
                  </div>
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
