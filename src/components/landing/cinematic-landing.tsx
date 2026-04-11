"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FloatingTopBar, MetricPill, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { DEMO_CHANNEL, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type Locale = "es" | "en";

const creatorByLocale = {
  es: {
    channelId: "luisito-global-map",
    name: "Luisito Comunica",
    handle: "@luisitocomunica",
    avatarUrl: "https://yt3.googleusercontent.com/ytc/AIdro_n8bIG30NfchfW9JpLs-LIgLr4AF6b_QJ4Pj9ceU0M=s176-c-k-c0x00ffffff-no-rj",
    ctaMap: "Ver mundo",
  },
  en: {
    channelId: "drew-global-map",
    name: "Drew Binsky",
    handle: "@drewbinsky",
    avatarUrl: "https://yt3.googleusercontent.com/ytc/AIdro_m8sS2E7bFGw87h9D5xUjN4j0kVxL3S9tJmF8xGGQ=s176-c-k-c0x00ffffff-no-rj",
    ctaMap: "View world",
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
            headline: "TravelMap para YouTube. Tu aventura digital por el mundo.",
            body: "Importa el canal, detecta países, entiende rendimiento por destino y abre una capa visual que se siente nativa para cualquier creador.",
            ctaPrimary: "Probar gratis",
            ctaSecondary: "Ver mapa",
            cardTitle: `Ve el mundo de ${activeCreator.name}`,
          }
        : {
            headline: "TravelMap for YouTube. Your digital adventure across the world.",
            body: "Import your channel, detect countries, understand destination performance, and open a creator layer that feels native to YouTube.",
            ctaPrimary: "Try free",
            ctaSecondary: "View map",
            cardTitle: `See ${activeCreator.name}'s world`,
          },
    [activeCreator.name, locale]
  );

  const mapPath = `/map?channelId=${encodeURIComponent(activeCreator.channelId)}`;
  const totalVideos = mapVideos.length;
  const totalCountries = new Set(mapVideos.map((video) => video.country_code).filter(Boolean)).size;

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#0f0f0f] text-[#f1f1f1]">
      <div className="absolute inset-0 z-0">
        <MapExperience
          channel={mapChannel}
          videoLocations={mapVideos}
          allowRefresh={false}
          showLegend={false}
          showOperationsPanel={false}
          showActiveVideoCard={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(15,15,15,0.92),rgba(15,15,15,0.35)_28%,rgba(15,15,15,0.18)_52%,rgba(15,15,15,0.86))]" />

      <header className="absolute inset-x-0 top-0 z-[80] px-4 py-3 pointer-events-auto">
        <FloatingTopBar
          eyebrow="TravelMap - BY PUPILA"
          title="tu mapa de Youtube."
          actions={
            <>
              <div className="hidden items-center gap-2 md:flex">
                <button type="button" className="yt-nav-pill" data-active={locale === "es"} onClick={() => setLocale("es")}>
                  ES
                </button>
                <button type="button" className="yt-nav-pill" data-active={locale === "en"} onClick={() => setLocale("en")}>
                  EN
                </button>
              </div>
              <MetricPill text="Travel creators" />
              <Link href="/auth" className="yt-btn-primary">
                Sign in
              </Link>
            </>
          }
        />
      </header>

      <section className="relative z-[70] flex h-full items-center justify-center px-4 pointer-events-none">
        <div className="w-full max-w-[1120px] pointer-events-auto grid grid-cols-2 gap-6 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-w-0"
          >
            <div className="mb-5 flex flex-wrap gap-2">
              <SignalPill text="1 punto = 1 video real" />
              <SignalPill text="Country analytics" />
              <SignalPill text="Sponsor hub" />
            </div>

            <h1 className="yt-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.95]">
              {copy.headline}
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-6 text-[#aaaaaa]">{copy.body}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/onboarding" className="yt-btn-primary">
                {copy.ctaPrimary}
              </Link>
              <Link href={mapPath} className="yt-btn-secondary">
                {copy.ctaSecondary}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full min-w-0"
          >
            <Link href={mapPath} className="pointer-events-auto block w-full rounded-2xl border border-white/10 bg-[#181818]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur hover:bg-[#1f1f1f]/95">
              <div className="yt-video-thumb aspect-video bg-[radial-gradient(circle_at_30%_30%,#2c2c2c,#111)]">
                <div className="flex h-full w-full items-center justify-center">
                  <div className="yt-mini-globe">
                    <div className="yt-mini-globe-core" />
                    <div className="yt-mini-globe-ring" />
                    <div className="yt-mini-globe-ring delay" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeCreator.avatarUrl} alt={activeCreator.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15" />
                <div className="min-w-0">
                  <p className="text-[15px] leading-5 font-medium text-[#f1f1f1]">{copy.cardTitle}</p>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">
                    {totalVideos.toLocaleString("en-US")} videos • {totalCountries.toLocaleString("en-US")} countries
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">{activeCreator.handle}</p>
                </div>
              </div>

              <div className="mt-4">
                <span className="yt-btn-primary w-full">{activeCreator.ctaMap}</span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
