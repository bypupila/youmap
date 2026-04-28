import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MapExperience } from "@/components/map/map-experience";
import { getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { MAP_VOTER_COOKIE, hashValue } from "@/lib/map-polls";
import { loadPublicMapPayload } from "@/lib/map-public";
import { DEMO_CHANNEL_ID, isDemoUsername } from "@/lib/demo-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PublicMapPageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: PublicMapPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const payload = await loadPublicMapPayload({
    identifier: resolvedParams.username,
    viewerUserId: null,
    voterFingerprint: null,
  });

  if (!payload) {
    return {
      title: "Mapa público | TravelMap",
      description: "Mapa interactivo con videos geolocalizados de creadores de viaje.",
      alternates: {
        canonical: `${siteUrl}/u/${encodeURIComponent(resolvedParams.username)}`,
      },
    };
  }

  const canonicalHandle = payload.channel.canonicalHandle || resolvedParams.username;
  const title = `${payload.channel.channel_name} | Mapa de viajes en TravelMap`;
  const description = `Explora ${payload.summary.total_videos} videos de ${payload.channel.channel_name} en ${payload.summary.total_countries} países con mapa interactivo.`;
  const canonicalUrl = `${siteUrl}/u/${encodeURIComponent(canonicalHandle)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "TravelMap - BY PUPILA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const voterCookie = String(cookieStore.get(MAP_VOTER_COOKIE)?.value || "").trim();
  const payload = await loadPublicMapPayload({
    identifier: resolvedParams.username,
    viewerUserId: await getSessionUserIdFromServerCookies(),
    voterFingerprint: voterCookie ? hashValue(voterCookie) : null,
  });

  if (!payload) {
    notFound();
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
          allowRefresh={payload.viewer.isOwner}
          viewer={payload.viewer}
          sponsors={payload.sponsors}
          activePoll={payload.activePoll}
          availablePollOptions={payload.availablePollOptions}
          viewMode={isDemoUsername(resolvedParams.username) || payload.channel.id === DEMO_CHANNEL_ID ? "demo" : payload.viewer.isOwner ? "creator" : "viewer"}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]" />
    </main>
  );
}
