"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEMO_MAP_HREF = "/map?channelId=demo-channel";
const DEMO_CHANNEL_BACKGROUND_IMAGE = "/creators/homepage-demo.png";

const demoChannelStats = [
  { label: "Modo", value: "Lectura pública" },
  { label: "Fuente", value: "Embed oficial" },
  { label: "SEO", value: "Listo para indexar" },
  { label: "Estado", value: "Canal demo" },
] as const;

const viewModes = {
  public: {
    label: "Lectura pública",
    eyebrow: "Modo demo",
    title: "La versión pública mantiene el recorrido limpio y listo para enseñar.",
    body:
      "El canal se presenta con una narrativa directa, sin ruido operativo y con una jerarquía pensada para vendedores, prensa y sponsors.",
    points: [
      "Sin login ni fricción para entender el producto.",
      "CTA principal siempre visible y fácil de seguir.",
      "Copy explícito para explicar el alcance del demo.",
    ],
    accent: "#ff5a4b",
  },
  embed: {
    label: "Embed oficial",
    eyebrow: "Cumplimiento",
    title: "La reproducción usa la fuente oficial y conserva la experiencia nativa.",
    body:
      "El jugador embebido no se sobrecarga con overlays ni atajos que puedan romper la experiencia o el cumplimiento de la plataforma.",
    points: [
      "Embed oficial de YouTube, sin autoplay.",
      "No se tapa el reproductor con banners propios.",
      "La demo respeta el contenido y la marca del video.",
    ],
    accent: "#5faef6",
  },
  seo: {
    label: "SEO listo",
    eyebrow: "Indexación",
    title: "La demo también funciona como landing indexable y compartible.",
    body:
      "Los títulos, la estructura semántica y el texto visible están preparados para buscadores, previews sociales y enlaces públicos.",
    points: [
      "Jerarquía clara para rastreo y lectura rápida.",
      "Resumen visible de modo, fuente y estado del canal.",
      "Contenido útil incluso sin reproducir ningún video.",
    ],
    accent: "#7ed08d",
  },
} as const;

type ViewModeKey = keyof typeof viewModes;

export function DemoChannelShowcase() {
  const [selectedMode, setSelectedMode] = useState<ViewModeKey>("public");
  const [copied, setCopied] = useState(false);

  const selectedModeData = viewModes[selectedMode];

  const helperChips = useMemo(
    () => [
      selectedModeData.label,
      "Canal demo",
      "Videos listos para mostrar",
    ],
    [selectedModeData.label],
  );

  async function handleCopyLink() {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}${DEMO_MAP_HREF}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="examples" className="py-12 lg:py-16">
      <div className="max-w-[760px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#ff473b]">Canal demo</p>
        <h2 className="mt-4 text-[34px] font-extrabold leading-[1] tracking-[-0.055em] text-white sm:text-[42px] lg:text-[52px]">
          La vista pública del canal demo, lista para marcas y sponsors.
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-7 text-white/62">
          Esta sección enseña la experiencia pública real: embed oficial, lectura clara, contenido de muestra y una superficie preparada para indexar.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div className="space-y-4">
          <article className="rounded-[28px] border border-white/10 bg-[#0c1014] p-4 shadow-[0_28px_80px_-56px_rgba(0,0,0,0.95)]">
            <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#05070a]">
              <div className="relative aspect-[4/3]">
                <Image
                  src={DEMO_CHANNEL_BACKGROUND_IMAGE}
                  alt="Portada del canal demo"
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,0.14)_0%,rgba(5,7,10,0.3)_42%,rgba(5,7,10,0.92)_100%)]" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-[#ff473b]" />
                  Canal demo
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-[28ch]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">@demo.travel</p>
                    <h3 className="mt-2 text-[24px] font-extrabold leading-none text-white">Travel Demo Channel</h3>
                    <p className="mt-2 text-[13px] leading-5 text-white/72">
                      Modo lectura pública · embeds oficiales · videos listos para mostrar.
                    </p>
                  </div>
                  <Button asChild size="sm" className="w-fit bg-[#ff473b] text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.85)] hover:bg-[#ff5b50]">
                    <Link href={DEMO_MAP_HREF}>
                      Abrir demo
                      <ArrowRight size={15} weight="bold" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {demoChannelStats.map(({ label, value }) => (
                <div key={label} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/42">{label}</p>
                  <p className="mt-2 text-[14px] font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

          </article>

        </div>

        <div className="space-y-4">
          <article className="rounded-[28px] border border-white/10 bg-[#0c1014] p-4 shadow-[0_28px_80px_-56px_rgba(0,0,0,0.95)]">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(viewModes) as ViewModeKey[]).map((mode) => {
                const modeData = viewModes[mode];
                const active = mode === selectedMode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      active
                        ? "border-transparent text-[#081018]"
                        : "border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]",
                    )}
                    style={active ? { backgroundColor: modeData.accent } : undefined}
                    aria-pressed={active}
                  >
                    {modeData.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/48">{selectedModeData.eyebrow}</p>
                <h3 className="mt-3 text-[28px] font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-[34px]">
                  {selectedModeData.title}
                </h3>
                <p className="mt-4 max-w-[58ch] text-[15px] leading-7 text-white/62">{selectedModeData.body}</p>

                <ul className="mt-5 grid gap-3">
                  {selectedModeData.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-[13px] leading-6 text-white/75">
                      <CheckCircle size={18} className="mt-0.5 shrink-0 text-[#7ed08d]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/52">
                  <ShieldCheck size={16} className="text-[#7ed08d]" />
                  Estado del canal
                </div>
                <p className="mt-3 text-[18px] font-bold text-white">{selectedModeData.label}</p>
                <div className="mt-4 space-y-3">
                  {helperChips.map((chip) => (
                    <div key={chip} className="rounded-[14px] border border-white/8 bg-black/18 px-3 py-3 text-[13px] text-white/72">
                      {chip}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm" className="bg-[#ff473b] text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.72)] hover:bg-[#ff5b50]">
                <Link href={DEMO_MAP_HREF}>
                  Ver demo completa
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/[0.03] text-white/82 hover:bg-white/[0.06]"
                onClick={handleCopyLink}
                aria-live="polite"
              >
                <Copy size={15} />
                {copied ? "Enlace copiado" : "Copiar enlace"}
              </Button>
            </div>
          </article>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Lectura pública", "Contenido visible, sin fricción y listo para compartir."],
              ["Embed oficial", "YouTube conserva su reproductor y su experiencia nativa."],
              ["SEO listo", "Texto y estructura preparados para indexación y previews."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/54">
                  <Sparkle size={14} className="text-[#ff473b]" />
                  {title}
                </div>
                <p className="mt-3 text-[13px] leading-6 text-white/66">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
