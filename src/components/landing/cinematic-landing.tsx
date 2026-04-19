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
          }
        : {
            topTitle: "Tu Mapa de Contenido",
            searchPlaceholder: "Search across videos, countries, or creators",
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
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(17,20,22,0.94),rgba(17,20,22,0.46)_22%,rgba(17,20,22,0.18)_48%,rgba(17,20,22,0.92))]" />

      <header className="absolute inset-x-0 top-0 z-[320] px-4 py-3 pointer-events-auto">
        <FloatingTopBar
          eyebrow="YOUMAP - BY PUPILA"
          title={copy.topTitle}
          searchPlaceholder={copy.searchPlaceholder}
          className="pointer-events-auto relative z-[321]"
          actions={
            <>
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  className="yt-nav-pill relative z-[322] pointer-events-auto"
                  data-active={locale === "en"}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
                <button type="button" className="yt-nav-pill relative z-[322] pointer-events-auto" data-active={locale === "es"} onClick={() => setLocale("es")}>
                  ES
                </button>
              </div>
              <Link href="/auth" className="yt-btn-primary relative z-[322] pointer-events-auto">
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

            <p className="yt-overline mb-4">Cartografia editorial para creadores de viaje</p>
            <h1 className="yt-display max-w-[10ch]">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-7 text-muted-foreground">{copy.body}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={onboardingPath} className="yt-btn-primary relative z-[322] pointer-events-auto">
                {copy.ctaPrimary}
              </Link>
              <Link href={mapPath} className="yt-btn-secondary relative z-[322] pointer-events-auto">
                {copy.ctaDemo}
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="tm-surface-strong rounded-[2rem] p-5">
                <p className="yt-overline">Ruta viva</p>
                <p className="mt-3 text-xl font-medium text-foreground">Cada video deja una coordenada, una lectura de país y una capa pública lista para compartir.</p>
              </div>
              <div className="tm-surface rounded-[2rem] p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-[2rem] leading-none font-semibold tracking-tight">{totalVideos.toLocaleString(localeTag)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.videosLabel} procesables</p>
                  </div>
                  <div className="yt-divider" />
                  <div>
                    <p className="text-[2rem] leading-none font-semibold tracking-tight">{totalCountries.toLocaleString(localeTag)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.countriesLabel} visibles en el mapa</p>
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
              <div className="yt-video-thumb aspect-video bg-[radial-gradient(circle_at_30%_30%,#2c2c2c,#111)]">
                <MiniMapModel videoLocations={mapVideos} />
              </div>

              <div className="mt-4 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeCreator.avatarUrl} alt={activeCreator.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] leading-5 font-medium text-foreground">{copy.cardTitle}</p>
                    <span className="platform-country-code">{locale === "es" ? "ES" : "EN"}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                    {totalVideos.toLocaleString(localeTag)} {copy.videosLabel} · {totalCountries.toLocaleString(localeTag)} {copy.countriesLabel}
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-muted-foreground">{activeCreator.handle}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="tm-surface rounded-[1.5rem] px-4 py-3">
                  <p className="yt-overline">Mapa listo</p>
                  <p className="mt-2 text-sm text-muted-foreground">Descubre destinos fuertes, videos ancla y oportunidad comercial sin salir del globo.</p>
                </div>
                <span className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-[0_20px_45px_-24px_rgba(255,0,0,0.78)] transition-transform duration-200 hover:-translate-y-[1px]">
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
