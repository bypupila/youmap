import type { Metadata } from "next";
import { MapExperience } from "@/components/map/map-experience";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
import { loadPublicMapPayloadByChannelId } from "@/lib/map-public";

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
  searchParams: Promise<{
    channelId?: string;
  }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const resolvedSearchParams = await searchParams;
  const channelId = resolvedSearchParams.channelId || DEMO_CHANNEL_SLUG;
  const payload = await loadPublicMapPayloadByChannelId({ channelId });
  if (!payload) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center text-foreground">
        <div className="tm-surface-strong rounded-[2rem] p-6 text-sm">No se pudo cargar el mapa.</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="absolute inset-0">
        <MapExperience
          channel={payload.channel}
          videoLocations={payload.videoLocations}
          manualQueue={payload.manualQueue}
          summary={payload.summary}
          channelId={payload.channel.id}
          allowRefresh={isUuid(channelId)}
          viewer={payload.viewer}
          sponsors={payload.sponsors}
          activePoll={payload.activePoll}
          availablePollOptions={payload.availablePollOptions}
          headerEyebrow="Public map"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]" />
    </main>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
