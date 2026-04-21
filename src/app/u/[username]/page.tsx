import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MapExperience } from "@/components/map/map-experience";
import { getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { MAP_VOTER_COOKIE, hashValue } from "@/lib/map-polls";
import { loadPublicMapPayload } from "@/lib/map-public";

interface PublicMapPageProps {
  params: {
    username: string;
  };
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const cookieStore = await cookies();
  const voterCookie = String(cookieStore.get(MAP_VOTER_COOKIE)?.value || "").trim();
  const payload = await loadPublicMapPayload({
    identifier: params.username,
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
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]" />
    </main>
  );
}
