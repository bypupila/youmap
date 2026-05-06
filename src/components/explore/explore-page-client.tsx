"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { FloatingTopBar, MetricPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { cn } from "@/lib/utils";

const filterChips = ["Todos", "Latinoamérica", "Asia", "City Walks", "Food", "Recientes"];

export function ExplorePageClient() {
  const videos = DEMO_VIDEO_LOCATIONS.slice(0, 9);
  const [activeFilter, setActiveFilter] = useState<string>("Todos");

  const filteredVideos = useMemo(() => {
    if (activeFilter === "Todos") return videos;

    if (activeFilter === "Latinoamérica") {
      const codes = new Set(["AR", "CL", "UY", "PE", "CO", "MX", "EC", "BR"]);
      return videos.filter((video) => codes.has(String(video.country_code || "").toUpperCase()));
    }

    if (activeFilter === "Asia") {
      const codes = new Set(["JP", "TH", "VN", "ID", "PH", "IN", "KR", "CN"]);
      return videos.filter((video) => codes.has(String(video.country_code || "").toUpperCase()));
    }

    if (activeFilter === "City Walks") {
      return videos.filter((video) =>
        normalizeSearchText([video.title, video.description].join(" ")).match(/\b(city|walk|calle|centro|downtown|barrio|mercado)\b/)
      );
    }

    if (activeFilter === "Food") {
      return videos.filter((video) =>
        normalizeSearchText([video.title, video.description].join(" ")).match(/\b(food|comida|street food|gastronomia|restaurante|cocina)\b/)
      );
    }

    if (activeFilter === "Recientes") {
      return videos
        .slice()
        .sort((left, right) => new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime())
        .slice(0, 6);
    }

    return videos;
  }, [activeFilter, videos]);

  return (
    <main className="relative min-h-[100dvh] text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />

      <header className="sticky top-0 z-40 px-4 py-3 backdrop-blur">
        <FloatingTopBar
          eyebrow="Atlas de viajes"
          title="Explorar por destino"
          actions={
            <>
              <MetricPill text={`${filteredVideos.length} videos`} />
              <Button asChild variant="ghost" size="sm">
                <Link href="/onboarding">Empieza gratis</Link>
              </Button>
            </>
          }
        />
      </header>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="tym-overline mb-4">Discovery editorial</p>
            <h1 className="tym-display max-w-[12ch]">Creadores, países y rutas en una sola capa de exploración.</h1>
            <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted-foreground">
              La navegación mezcla mapa, miniaturas y metadata real para que una marca o un fan pueda detectar patrones de viaje sin caer en un grid genérico.
            </p>
          </div>
          <div className="tm-surface rounded-[2rem] p-5">
            <p className="tym-overline">Selección curada</p>
            <p className="mt-3 text-lg font-medium">Cada tarjeta conserva contexto geográfico, fecha y señales de rendimiento para que el catálogo no se vea como un feed indiferenciado.</p>
          </div>
        </motion.div>

        <div className="mb-6 mt-8 flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="tym-nav-pill"
              data-active={activeFilter === chip ? "true" : "false"}
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {filteredVideos.length === 0 ? (
          <section className="tm-surface-strong rounded-[2rem] p-8 text-center">
            <p className="tym-overline">Empty state</p>
            <h2 className="mt-3 text-2xl font-medium">Todavía no hay videos explorables.</h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-6 text-muted-foreground">
              Conecta un canal o termina la importación para poblar esta vista con países, miniaturas y navegación por destino.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video, index) => (
              <motion.article
                key={`${video.youtube_video_id}-${index}`}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn("tym-video-card", index === 0 && "md:col-span-2")}
              >
                <Link href="/map" className="group">
                  <div className="tym-video-thumb aspect-[16/10]">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toCompactYouTubeThumbnail(video.thumbnail_url) || video.thumbnail_url}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#212121] text-muted-foreground">Miniatura no disponible</div>
                    )}
                  </div>
                </Link>

                <div className={cn("grid gap-3", index === 0 ? "lg:grid-cols-[auto_1fr]" : "grid-cols-[auto_1fr]")}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-medium">
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
    </main>
  );
}

function normalizeSearchText(input: string) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return date.toLocaleDateString("es-AR", { month: "short", day: "numeric", year: "numeric" });
}
