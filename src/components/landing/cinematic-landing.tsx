"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { MiniMapModel } from "@/components/landing/mini-map-model";
import { DEMO_CHANNEL, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type Locale = "es" | "en";

type LandingCopy = {
  topTitle: string;
  searchPlaceholder: string;
  signalPills: string[];
  headline: string;
  body: string;
  ctaPrimary: string;
  cardTitle: string;
  ctaDemo: string;
  videosLabel: string;
  countriesLabel: string;
  platformVideosLabel: string;
  platformCountriesLabel: string;
};

const creatorByLocale = {
  es: {
    channelId: "luisito-global-map",
    name: "Luisito Comunica",
    handle: "@luisitocomunica",
  },
  en: {
    channelId: "drew-global-map",
    name: "Drew Binsky",
    handle: "@drewbinsky",
  },
} as const;

interface MapPayload {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

interface PlatformStatsPayload {
  total_videos: number;
  total_countries: number;
  demo_videos?: number;
  user_videos?: number;
  demo_countries?: number;
  user_countries?: number;
}

const DEFAULT_PLATFORM_DEMO_VIDEOS = 2371;
const DEFAULT_PLATFORM_DEMO_COUNTRIES = 165;

export function CinematicLanding() {
  const [locale, setLocale] = useState<Locale>("es");
  const [mapChannel, setMapChannel] = useState<TravelChannel>(DEMO_CHANNEL);
  const [mapVideos, setMapVideos] = useState<TravelVideoLocation[]>(DEMO_VIDEO_LOCATIONS);
  const [platformTotalVideos, setPlatformTotalVideos] = useState(DEFAULT_PLATFORM_DEMO_VIDEOS);
  const [platformTotalCountries, setPlatformTotalCountries] = useState(DEFAULT_PLATFORM_DEMO_COUNTRIES);

  const activeCreator = creatorByLocale[locale];

  useEffect(() => {
    let isCurrent = true;
    async function loadLocaleMap() {
      try {
        const response = await fetch(`/api/map/data?channelId=${encodeURIComponent(activeCreator.channelId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as MapPayload;
        if (!isCurrent) return;
        setMapChannel(payload.channel || DEMO_CHANNEL);
        setMapVideos(Array.isArray(payload.videoLocations) ? payload.videoLocations : DEMO_VIDEO_LOCATIONS);
      } catch {
        if (!isCurrent) return;
        setMapChannel(DEMO_CHANNEL);
        setMapVideos(DEMO_VIDEO_LOCATIONS);
      }
    }
    loadLocaleMap();
    return () => {
      isCurrent = false;
    };
  }, [activeCreator.channelId]);

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function loadPlatformStats() {
      try {
        const response = await fetch("/api/platform/stats", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as PlatformStatsPayload;
        if (!isCurrent) return;
        if (typeof payload.total_videos === "number" && Number.isFinite(payload.total_videos)) {
          setPlatformTotalVideos(payload.total_videos);
        }
        if (typeof payload.total_countries === "number" && Number.isFinite(payload.total_countries)) {
          setPlatformTotalCountries(payload.total_countries);
        }
      } catch {
        if (!isCurrent) return;
      }
    }

    void loadPlatformStats();
    const interval = window.setInterval(() => {
      void loadPlatformStats();
    }, 30000);

    return () => {
      isCurrent = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const copy = useMemo<LandingCopy>(
    () =>
      locale === "es"
        ? {
            topTitle: "Tu Mapa de Contenido",
            searchPlaceholder: "Busca videos, países o creadores",
            signalPills: ["Mapa interactivo", "Analítica por país", "Sponsor hub"],
            headline: "Tu canal convertido en una pagina web interactiva.",
            body: "Importa tu canal, detecta países y lee el rendimiento por destino con una capa visual limpia.",
            ctaPrimary: "Empezar",
            cardTitle: activeCreator.name,
            ctaDemo: "Ver Demo",
            videosLabel: "videos",
            countriesLabel: "países",
            platformVideosLabel: "videos procesados en toda la plataforma",
            platformCountriesLabel: "países con videos en toda la plataforma",
          }
        : {
            topTitle: "Your Content Map",
            searchPlaceholder: "Search across videos, countries, or creators",
            signalPills: ["Interactive map", "Country analytics", "Sponsor hub"],
            headline: "Your channel turned into an interactive web page.",
            body: "Import your channel, detect countries, and read destination performance in one visual layer.",
            ctaPrimary: "Get started",
            cardTitle: activeCreator.name,
            ctaDemo: "View Demo",
            videosLabel: "videos",
            countriesLabel: "countries",
            platformVideosLabel: "processed videos across the platform",
            platformCountriesLabel: "countries with videos across the platform",
          },
    [activeCreator.name, locale]
  );

  const mapPath = `/map?channelId=${encodeURIComponent(activeCreator.channelId)}`;
  const onboardingPath = `/onboarding?lang=${locale}`;
  const localeTag = locale === "es" ? "es-ES" : "en-US";
  const totalVideos = mapVideos.length;
  const creatorMapCountries = new Set(mapVideos.map((video) => video.country_code).filter(Boolean)).size;

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-[1] [&_*]:pointer-events-none">
        <MapExperience
          channel={mapChannel}
          videoLocations={mapVideos}
          interactive={false}
          allowRefresh={false}
          showLegend={false}
          showOperationsPanel={false}
          showActiveVideoCard={false}
          showHeader={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(17,20,22,0.94),rgba(17,20,22,0.46)_22%,rgba(17,20,22,0.18)_48%,rgba(17,20,22,0.92))]" />

      <header className="absolute inset-x-0 top-0 z-[320] px-4 py-3 pointer-events-auto">
        <FloatingTopBar
          eyebrow="TravelYourMap - BY PUPILA"
          title={copy.topTitle}
          searchPlaceholder={copy.searchPlaceholder}
          className="pointer-events-auto relative z-[321]"
          actions={
            <>
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  className="tym-nav-pill relative z-[322] pointer-events-auto"
                  data-active={locale === "en"}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
                <button type="button" className="tym-nav-pill relative z-[322] pointer-events-auto" data-active={locale === "es"} onClick={() => setLocale("es")}>
                  ES
                </button>
              </div>
              <Link href="/auth" className="tym-btn-primary relative z-[322] pointer-events-auto">
                Acceder
              </Link>
            </>
          }
        />
      </header>

      <section className="relative z-[310] flex min-h-[100dvh] items-center px-4 pb-10 pt-28 pointer-events-auto">
        <div className="relative z-[311] mx-auto grid w-full max-w-[1400px] items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-w-0"
          >
            <div className="mb-5 flex flex-wrap gap-2">
              {copy.signalPills.map((pill) => (
                <SignalPill key={pill} text={pill} />
              ))}
            </div>

            <p className="tym-overline mb-4">Cartografia editorial para creadores de viaje</p>
            <h1 className="tym-display max-w-[10ch]">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted-foreground">{copy.body}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={onboardingPath} className="tym-btn-primary relative z-[322] pointer-events-auto">
                {copy.ctaPrimary}
              </Link>
            </div>

            <div className="mt-10">
              <div className="tm-surface rounded-[2rem] p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
                    <p className="text-[2rem] leading-none font-semibold tracking-tight">{platformTotalVideos.toLocaleString(localeTag)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.platformVideosLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
                    <p className="text-[2rem] leading-none font-semibold tracking-tight">{platformTotalCountries.toLocaleString(localeTag)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.platformCountriesLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full min-w-0 lg:pl-[6vw]"
          >
            <Link href={mapPath} className="pointer-events-auto relative z-[322] block w-full rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,31,0.96),rgba(18,21,23,0.92))] p-4 shadow-[0_36px_100px_-52px_rgba(0,0,0,0.88)] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
              <div className="tym-video-thumb aspect-video bg-[radial-gradient(circle_at_30%_30%,#2c2c2c,#111)]">
                <MiniMapModel videoLocations={mapVideos} />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] leading-5 font-medium text-foreground">{copy.cardTitle}</p>
                    <span className="platform-country-code">{locale === "es" ? "ES" : "EN"}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                    {totalVideos.toLocaleString(localeTag)} {copy.videosLabel} · {creatorMapCountries.toLocaleString(localeTag)} {copy.countriesLabel}
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-muted-foreground">{activeCreator.handle}</p>
                </div>
                <span className="ml-auto inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-[0_20px_45px_-24px_rgba(255, 90, 61,0.78)] transition-transform duration-200 hover:-translate-y-[1px]">
                  {copy.ctaDemo}
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
