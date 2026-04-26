import type { Metadata } from "next";
import { MapExperience } from "@/components/map/map-experience";
import { FullscreenMap } from "@/components/map/fullscreen-map";
import { MapUnavailable } from "@/components/map/map-unavailable";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
import { loadPublicMapPayloadByChannelId } from "@/lib/map-public";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa global de videos",
  description: "Mapa fullscreen con un punto por video extraído del canal seleccionado.",
  openGraph: {
    title: "Mapa global de videos · YouMap",
    description: "Visualiza todos los videos extraídos como puntos sobre el globo.",
    type: "website",
    url: `${siteUrl}/map`,
    siteName: "YouMap",
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
  if (!payload) {
    return (
      <MapUnavailable
        title="No se pudo mostrar el mapa."
        description="No encontramos datos para ese canal. Probá abrir el mapa demo o volver al inicio para navegar otro perfil."
      />
    );
  }

  return (
    <FullscreenMap>
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
        headerEyebrow={requestedChannelId === payload.channel.id ? "Mapa público" : "Demo"}
      />
    </FullscreenMap>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
