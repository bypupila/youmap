import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MapExperience } from "@/components/map/map-experience";
import { FullscreenMap } from "@/components/map/fullscreen-map";
import { getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { MAP_VOTER_COOKIE, hashValue } from "@/lib/map-polls";
import { loadPublicMapPayload } from "@/lib/map-public";

interface PublicMapPageProps {
  params: Promise<{
    username: string;
  }>;
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
    <FullscreenMap>
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
    </FullscreenMap>
  );
}
