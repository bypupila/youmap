"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MetricPill } from "@/components/design-system/chrome";
import { MarketingShell } from "@/components/site/marketing-shell";
import { Button } from "@/components/ui/button";
import { DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

type RegionId = "all" | "latam" | "europe" | "asia" | "north-america" | "africa" | "oceania";
type SortId = "relevance" | "recent";

const REGION_LABELS: Record<RegionId, string> = {
  all: "Todos",
  latam: "América Latina",
  europe: "Europa",
  asia: "Asia",
  "north-america": "Norteamérica",
  africa: "África",
  oceania: "Oceanía",
};

const COUNTRY_REGION_MAP: Record<string, Exclude<RegionId, "all">> = {
  // Latin America
  AR: "latam",
  BO: "latam",
  BR: "latam",
  CL: "latam",
  CO: "latam",
  CR: "latam",
  CU: "latam",
  DO: "latam",
  EC: "latam",
  GT: "latam",
  HN: "latam",
  MX: "latam",
  NI: "latam",
  PA: "latam",
  PE: "latam",
  PR: "latam",
  PY: "latam",
  SV: "latam",
  UY: "latam",
  VE: "latam",
  // Europe
  AT: "europe",
  BE: "europe",
  CH: "europe",
  CZ: "europe",
  DE: "europe",
  DK: "europe",
  ES: "europe",
  FI: "europe",
  FR: "europe",
  GB: "europe",
  GR: "europe",
  HR: "europe",
  HU: "europe",
  IE: "europe",
  IS: "europe",
  IT: "europe",
  NL: "europe",
  NO: "europe",
  PL: "europe",
  PT: "europe",
  RO: "europe",
  SE: "europe",
  TR: "europe",
  // Asia
  AE: "asia",
  CN: "asia",
  HK: "asia",
  ID: "asia",
  IL: "asia",
  IN: "asia",
  JP: "asia",
  KH: "asia",
  KR: "asia",
  LA: "asia",
  LK: "asia",
  MY: "asia",
  NP: "asia",
  PH: "asia",
  SG: "asia",
  TH: "asia",
  TW: "asia",
  VN: "asia",
  // North America
  CA: "north-america",
  US: "north-america",
  // Africa
  EG: "africa",
  ET: "africa",
  GH: "africa",
  KE: "africa",
  MA: "africa",
  NG: "africa",
  RW: "africa",
  SN: "africa",
  TN: "africa",
  TZ: "africa",
  UG: "africa",
  ZA: "africa",
  // Oceania
  AU: "oceania",
  FJ: "oceania",
  NZ: "oceania",
};

function resolveRegion(countryCode?: string | null): Exclude<RegionId, "all"> | null {
  const code = String(countryCode || "").toUpperCase();
  return COUNTRY_REGION_MAP[code] ?? null;
}

export function ExplorePageClient() {
  const allVideos = DEMO_VIDEO_LOCATIONS;
  const [region, setRegion] = useState<RegionId>("all");
  const [sort, setSort] = useState<SortId>("relevance");

  const availableRegions = useMemo<RegionId[]>(() => {
    const present = new Set<RegionId>(["all"]);
    for (const video of allVideos) {
      const r = resolveRegion(video.country_code);
      if (r) present.add(r);
    }
    return (Object.keys(REGION_LABELS) as RegionId[]).filter((id) => present.has(id));
  }, [allVideos]);

  const filteredVideos = useMemo(() => {
    let pool: TravelVideoLocation[] = allVideos;

    if (region !== "all") {
      pool = pool.filter((video) => resolveRegion(video.country_code) === region);
    }

    if (sort === "recent") {
      pool = [...pool].sort((a, b) => {
        const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    return pool;
  }, [allVideos, region, sort]);

  const visibleVideos = filteredVideos.slice(0, 12);
  const totalCount = filteredVideos.length;

  return (
    <MarketingShell
      topbar={{
        eyebrow: "Explora",
        title: "Creadores por destino",
        sticky: true,
        actions: (
          <>
            <MetricPill text={`${totalCount} ${totalCount === 1 ? "video" : "videos"}`} />
            <Button asChild variant="ghost" size="sm">
              <Link href="/onboarding">Empieza gratis</Link>
            </Button>
          </>
        ),
      }}
    >
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="yt-overline mb-4">Discovery editorial</p>
            <h1 className="yt-display max-w-[14ch] text-balance">Creadores, países y rutas en una sola capa.</h1>
            <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted-foreground text-pretty">
              Mezclamos mapa, miniaturas y metadata real para que una marca o un fan detecte patrones de viaje sin perderse en un grid genérico.
            </p>
          </div>
          <div className="tm-surface rounded-[2rem] p-5">
            <p className="yt-overline">Curaduría</p>
            <p className="mt-3 text-lg font-medium text-pretty">
              Cada tarjeta conserva contexto geográfico, fecha y señales de rendimiento para que el catálogo no se vea como un feed indiferenciado.
            </p>
          </div>
        </motion.div>

        <div
          className="mt-8 mb-6 flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Filtros de exploración"
        >
          <div role="group" aria-label="Filtrar por región" className="flex flex-wrap gap-2">
            {availableRegions.map((id) => {
              const active = region === id;
              return (
                <button
                  key={id}
                  type="button"
                  className="yt-nav-pill"
                  data-active={active}
                  aria-pressed={active}
                  onClick={() => setRegion(id)}
                >
                  {REGION_LABELS[id]}
                </button>
              );
            })}
          </div>
          <span className="mx-1 hidden h-6 w-px bg-white/10 sm:inline-block" aria-hidden="true" />
          <button
            type="button"
            className="yt-nav-pill"
            data-active={sort === "recent"}
            aria-pressed={sort === "recent"}
            onClick={() => setSort((current) => (current === "recent" ? "relevance" : "recent"))}
          >
            Recientes
          </button>
        </div>

        {visibleVideos.length === 0 ? (
          <section className="tm-surface-strong rounded-[2rem] p-8 text-center">
            <p className="yt-overline">Sin resultados</p>
            <h2 className="mt-3 text-2xl font-medium">No hay videos en {REGION_LABELS[region]} todavía.</h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-6 text-muted-foreground">
              Probá con otra región o restablecé el filtro para ver todos los videos disponibles.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setRegion("all")} variant="secondary">
                Ver todos
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleVideos.map((video, index) => (
              <motion.article
                key={`${video.youtube_video_id}-${index}`}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.25) }}
                className={cn("yt-video-card", region === "all" && index === 0 && "md:col-span-2")}
              >
                <Link href={`/map?country=${video.country_code}`} className="group block">
                  <div className="yt-video-thumb aspect-[16/10]">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                        alt={video.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#212121] text-muted-foreground">
                        Sin miniatura
                      </div>
                    )}
                  </div>
                </Link>

                <div className={cn("grid gap-3", region === "all" && index === 0 ? "lg:grid-cols-[auto_1fr]" : "grid-cols-[auto_1fr]")}>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-medium"
                    aria-hidden="true"
                  >
                    {countryCodeToFlag(video.country_code)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="platform-country-code">{countryCodeToFlag(video.country_code)}</span>
                      <span className="text-[12px] text-muted-foreground">{video.country_name || video.country_code}</span>
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-[18px] leading-[1.25] font-medium text-foreground">{video.title}</h2>
                    <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                      {formatViews(video.view_count || 0)} vistas · {formatDate(video.published_at)}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </section>
        )}
      </div>
    </MarketingShell>
  );
}

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "GL";
}

function formatViews(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" });
}
