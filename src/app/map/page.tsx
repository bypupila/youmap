import type { Metadata } from "next";
import Link from "next/link";
import { MapExperience } from "@/components/map/map-experience";
import { Button } from "@/components/ui/button";
import { DEMO_CHANNEL_ID, DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
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
  const requestedChannelId = resolvedSearchParams.channelId || DEMO_CHANNEL_SLUG;
  const payload = (await loadPublicMapPayloadByChannelId({ channelId: requestedChannelId })) || (requestedChannelId === DEMO_CHANNEL_SLUG ? null : await loadPublicMapPayloadByChannelId({ channelId: DEMO_CHANNEL_SLUG }));
  const isDemoMap = requestedChannelId === DEMO_CHANNEL_SLUG || payload?.channel.id === DEMO_CHANNEL_ID;
  const headerEyebrow = requestedChannelId === payload?.channel.id ? "Mapa público" : isDemoMap ? "Mapa demo" : "Demo de respaldo";
  if (!payload) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4 text-foreground">
        <div className="tm-surface-strong w-full max-w-[560px] rounded-[2rem] p-6">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#aaaaaa]">Mapa no disponible</p>
          <h1 className="mt-2 text-[24px] font-medium tracking-tight text-[#f1f1f1]">No se pudo mostrar el mapa.</h1>
          <p className="mt-3 text-[14px] leading-6 text-[#c9c2b8]">
            No encontramos datos para ese canal. Probá abrir el mapa demo o volver al inicio para navegar otro perfil.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/map?channelId=${encodeURIComponent(DEMO_CHANNEL_SLUG)}`}>Abrir demo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
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
          allowRefresh={isUuid(requestedChannelId)}
          viewer={payload.viewer}
          sponsors={payload.sponsors}
          activePoll={payload.activePoll}
          availablePollOptions={payload.availablePollOptions}
          headerEyebrow={headerEyebrow}
          viewMode={isDemoMap ? "demo" : payload.viewer.isOwner ? "creator" : "viewer"}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]" />
    </main>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
