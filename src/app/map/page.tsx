import type { Metadata } from "next";
import Link from "next/link";
import { MapExperience } from "@/components/map/map-experience";
import { FloatingTopBar, MetricPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { loadMapDataByChannelId } from "@/lib/map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa global de videos | TravelMap",
  description: "Mapa fullscreen con un punto por video extraido del canal seleccionado.",
  openGraph: {
    title: "Mapa global de videos | TravelMap",
    description: "Visualiza todos los videos extraidos como puntos sobre el globo.",
    type: "website",
    url: `${siteUrl}/map`,
    siteName: "TravelMap - BY PUPILA",
  },
};

export const dynamic = "force-dynamic";

interface MapPageProps {
  searchParams: {
    channelId?: string;
  };
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const channelId = searchParams.channelId || "luisito-global-map";
  const payload = await loadMapDataByChannelId(channelId);
  if (!payload) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#02040a] text-white">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm">No se pudo cargar el mapa.</div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#02040a] text-slate-50">
      <div className="absolute inset-0">
        <MapExperience
          channel={payload.channel}
          videoLocations={payload.videoLocations}
          manualQueue={payload.manualQueue}
          summary={payload.summary}
          channelId={channelId}
          allowRefresh={isUuid(channelId)}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,107,53,0.12),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(0,212,255,0.10),transparent_26%),linear-gradient(to_bottom,rgba(2,4,10,0.48),rgba(2,4,10,0.15)_32%,rgba(2,4,10,0.46))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6">
        <FloatingTopBar
          eyebrow="Mapa Fullscreen"
          title={`${payload.channel.channel_name} · 1 punto = 1 video`}
          className="max-w-[760px] px-2.5 py-1.5 sm:px-3"
          actions={
            <>
              <MetricPill text={`${payload.summary.total_videos} videos`} className="px-2 py-0.5 text-[10px]" />
              <MetricPill text={`${payload.summary.total_countries} paises`} className="px-2 py-0.5 text-[10px]" />
              <Button asChild size="xs">
                <Link href="/">Volver</Link>
              </Button>
            </>
          }
        />
      </header>
    </main>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
