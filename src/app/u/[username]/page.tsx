import { notFound } from "next/navigation";
import { MapExperience } from "@/components/map/map-experience";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { DEMO_CHANNEL_SLUG, isDemoUsername } from "@/lib/demo-data";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { normalizeUsername } from "@/lib/auth-identifiers";
import { sql } from "@/lib/neon";

interface PublicMapPageProps {
  params: {
    username: string;
  };
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const normalizedUsername = normalizeUsername(params.username);
  const payload = await loadPublicMapPayload(normalizedUsername);

  if (!payload) {
    notFound();
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#02040a] text-slate-50">
      <div className="absolute inset-0">
        <MapExperience
          channel={payload.channel}
          videoLocations={payload.videoLocations}
          manualQueue={[]}
          summary={payload.summary}
          channelId={null}
          allowRefresh={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,107,53,0.12),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(0,212,255,0.11),transparent_26%),linear-gradient(to_bottom,rgba(2,4,10,0.48),rgba(2,4,10,0.15)_32%,rgba(2,4,10,0.46))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6">
        <FloatingTopBar eyebrow="Mapa Publico" title={`@${normalizedUsername}`} />
      </header>
    </main>
  );
}

async function loadPublicMapPayload(username: string) {
  if (isDemoUsername(username)) {
    return loadMapDataByChannelId(DEMO_CHANNEL_SLUG);
  }

  const users = await sql<Array<{ id: string }>>`
    select id
    from public.users
    where username = ${username}
    limit 1
  `;
  const user = users[0] || null;
  if (!user) return null;

  const channels = await sql<Array<{ id: string }>>`
    select id
    from public.channels
    where user_id = ${user.id}
    limit 1
  `;
  const channel = channels[0] || null;
  if (!channel) return null;

  return loadMapDataByChannelId(channel.id);
}
