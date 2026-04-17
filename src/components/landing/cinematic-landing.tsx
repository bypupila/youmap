"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FloatingTopBar, MetricPill, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { MiniMapModel } from "@/components/landing/mini-map-model";
import { DEMO_CHANNEL, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type Locale = "es" | "en";

const creatorByLocale = {
  es: {
    channelId: "luisito-global-map",
    name: "Luisito Comunica",
    handle: "@luisitocomunica",
    avatarUrl: "/creators/luisito-comunica.png",
  },
  en: {
    channelId: "drew-global-map",
    name: "Drew Binsky",
    handle: "@drewbinsky",
    avatarUrl: "https://yt3.googleusercontent.com/ytc/AIdro_m8sS2E7bFGw87h9D5xUjN4j0kVxL3S9tJmF8xGGQ=s176-c-k-c0x00ffffff-no-rj",
  },
} as const;

interface MapPayload {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}

export function CinematicLanding() {
  const [locale, setLocale] = useState<Locale>("es");
  const [mapChannel, setMapChannel] = useState<TravelChannel>(DEMO_CHANNEL);
  const [mapVideos, setMapVideos] = useState<TravelVideoLocation[]>(DEMO_VIDEO_LOCATIONS);

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

  const copy = useMemo(
    () =>
      locale === "es"
        ? {
            topTitle: "tu mapa de YouTube.",
            searchPlaceholder: "Busca videos, países o creadores",
            metricCreators: "Creadores",
            signalPills: ["Mapa interactivo", "Analítica por país", "Sponsor hub"],
            headline: "Tu canal convertido en una pagina web interactiva.",
            body: "Importa tu canal, detecta países y lee el rendimiento por destino con una capa visual limpia.",
            ctaPrimary: "Empezar",
            cardTitle: activeCreator.name,
            ctaDemo: "Ver Demo",
            videosLabel: "videos",
            countriesLabel: "países",
          }
        : {
            topTitle: "your YouTube map.",
            searchPlaceholder: "Search across videos, countries, or creators",
            metricCreators: "Travel creators",
            signalPills: ["Interactive map", "Country analytics", "Sponsor hub"],
            headline: "Your channel turned into an interactive web page.",
            body: "Import your channel, detect countries, and read destination performance in one visual layer.",
            ctaPrimary: "Get started",
            cardTitle: activeCreator.name,
            ctaDemo: "View Demo",
            videosLabel: "videos",
            countriesLabel: "countries",
          },
    [activeCreator.name, locale]
  );

  const mapPath = `/map?channelId=${encodeURIComponent(activeCreator.channelId)}`;
  const onboardingPath = `/onboarding?lang=${locale}`;
  const localeTag = locale === "es" ? "es-ES" : "en-US";
  const totalVideos = mapVideos.length;
  const totalCountries = new Set(mapVideos.map((video) => video.country_code).filter(Boolean)).size;

  return (
    <main className="relative isolate h-[100dvh] overflow-hidden bg-[#0f0f0f] text-[#f1f1f1]">
      <div className="pointer-events-none absolute inset-0 z-0 [&_*]:pointer-events-none">
        <MapExperience
          channel={mapChannel}
          videoLocations={mapVideos}
          interactive={false}
          allowRefresh={false}
          showLegend={false}
          showOperationsPanel={false}
          showActiveVideoCard={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(15,15,15,0.92),rgba(15,15,15,0.35)_28%,rgba(15,15,15,0.18)_52%,rgba(15,15,15,0.86))]" />

      <header className="absolute inset-x-0 top-0 z-[320] px-4 py-3 pointer-events-auto">
        <FloatingTopBar
          eyebrow="YOUMAP - BY PUPILA"
          title={copy.topTitle}
          searchPlaceholder={copy.searchPlaceholder}
          className="pointer-events-auto relative z-[321]"
          actions={
            <>
              <div className="hidden items-center gap-2 md:flex">
                <button type="button" className="yt-nav-pill relative z-[322] pointer-events-auto" data-active={locale === "es"} onClick={() => setLocale("es")}>
                  ES
                </button>
                <button type="button" className="yt-nav-pill relative z-[322] pointer-events-auto" data-active={locale === "en"} onClick={() => setLocale("en")}>
                  EN
                </button>
              </div>
              <MetricPill text={copy.metricCreators} />
              <Link href="/auth" className="yt-btn-primary relative z-[322] pointer-events-auto">
                Login
              </Link>
            </>
          }
        />
      </header>

      <section className="relative z-[310] flex h-full items-center justify-center px-4 pointer-events-auto">
        <div className="relative z-[311] w-full max-w-[1120px] pointer-events-auto grid grid-cols-2 gap-6 items-center">
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

            <h1 className="yt-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.95]">
              {copy.headline}
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-6 text-[#aaaaaa]">{copy.body}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={onboardingPath} className="yt-btn-primary relative z-[322] pointer-events-auto">
                {copy.ctaPrimary}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full min-w-0"
          >
            <Link href={mapPath} className="pointer-events-auto relative z-[322] block w-full rounded-2xl border border-white/10 bg-[#181818]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur hover:bg-[#1f1f1f]/95">
              <div className="yt-video-thumb aspect-video bg-[radial-gradient(circle_at_30%_30%,#2c2c2c,#111)]">
                <MiniMapModel videoLocations={mapVideos} />
              </div>

              <div className="mt-4 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeCreator.avatarUrl} alt={activeCreator.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15" />
                <div className="min-w-0">
                  <p className="text-[15px] leading-5 font-medium text-[#f1f1f1]">{copy.cardTitle}</p>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">
                    {totalVideos.toLocaleString(localeTag)} {copy.videosLabel} • {totalCountries.toLocaleString(localeTag)} {copy.countriesLabel}
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">{activeCreator.handle}</p>
                </div>
              </div>

              <div className="mt-4">
                <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#f1f1f1] bg-[#f1f1f1] px-4 text-[14px] font-medium text-[#0f0f0f] transition-colors duration-200 hover:bg-[#e7e7e7]">
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
