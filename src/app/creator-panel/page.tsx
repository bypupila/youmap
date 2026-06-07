import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatorAdminPanel, type CreatorPanelTab } from "@/components/creator/creator-admin-panel";
import { getValidSessionUserIdFromServerCookies } from "@/lib/current-user";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
import { loadPublicMapPayloadByChannelId } from "@/lib/map-public";
import { buildPublicMapUrl } from "@/lib/map-urls";
import { sql } from "@/lib/neon";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const validTabs: CreatorPanelTab[] = ["summary", "polls", "sponsors", "ops", "activity"];
const tabLabels: Record<CreatorPanelTab, string> = {
  summary: "Resumen",
  polls: "Votaciones",
  sponsors: "Sponsors",
  ops: "Ops",
  activity: "Actividad",
};

interface CreatorPanelPageProps {
  searchParams: Promise<{
    channelId?: string;
    demo?: string;
    tab?: string;
  }>;
}

export default async function CreatorPanelPage({ searchParams }: CreatorPanelPageProps) {
  const params = await searchParams;
  const isDemoMode = params.demo === "1";
  const sessionUserId = await getValidSessionUserIdFromServerCookies();
  const requestedChannelId = String(params.channelId || "").trim();
  const activeTab = validTabs.includes(params.tab as CreatorPanelTab) ? (params.tab as CreatorPanelTab) : "summary";

  let effectiveChannelId = requestedChannelId;
  if (!effectiveChannelId) {
    if (isDemoMode) {
      effectiveChannelId = DEMO_CHANNEL_SLUG;
    } else if (sessionUserId) {
      const ownedChannels = await sql<Array<{ id: string }>>`
        select id
        from public.channels
        where user_id = ${sessionUserId}
        limit 1
      `;
      effectiveChannelId = ownedChannels[0]?.id || "";
    }
  }

  if (!effectiveChannelId) {
    redirect("/map");
  }

  const payload = await loadPublicMapPayloadByChannelId({
    channelId: effectiveChannelId,
    viewerUserId: sessionUserId,
  });

  if (!payload) {
    redirect("/map");
  }

  if (!isDemoMode) {
    if (!sessionUserId || !payload.viewer.isOwner) {
      redirect(`/map?channelId=${encodeURIComponent(payload.channel.id)}`);
    }
  }

  const dashboardHref = `/dashboard?channelId=${encodeURIComponent(payload.channel.id)}${isDemoMode ? "&demo=1" : ""}`;
  const mapUrl = buildPublicMapUrl(payload.channel.id);

  return (
    <main className="min-h-[100dvh] bg-[#05080d] text-foreground">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-6 pt-4 md:px-6">
        <header className="rounded-xl border border-white/10 bg-[#07101a]/88 p-3 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#9da5ae]">{isDemoMode ? "Demo Creator" : "Creator Real"}</p>
              <h1 className="text-[20px] font-semibold tracking-tight text-[#f5f7fb]">Panel</h1>
            </div>
            <a href={dashboardHref} className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-[12px] text-[#d8dee6] hover:bg-white/[0.06]">
              Volver al dashboard
            </a>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1.5">
            {validTabs.map((tab) => {
              const href = `/creator-panel?channelId=${encodeURIComponent(payload.channel.id)}${isDemoMode ? "&demo=1" : ""}&tab=${tab}`;
              return (
                <Link
                  key={tab}
                  href={href}
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg border px-3 text-[12px] uppercase tracking-[0.08em] transition",
                    activeTab === tab
                      ? "border-[#ff3b30] bg-[rgba(255,59,48,0.14)] text-[#ff3b30]"
                      : "border-white/10 bg-white/[0.02] text-[#b9c1cb] hover:bg-white/[0.06]"
                  )}
                >
                  {tabLabels[tab]}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="mt-4">
          <CreatorAdminPanel
            activeTab={activeTab}
            channelId={payload.channel.id}
            channelName={payload.channel.channel_name}
            mapUrl={mapUrl}
            isDemoMode={isDemoMode}
            summary={payload.summary}
            initialPoll={payload.activePoll}
            initialFanVotes={payload.fanVotes}
            availablePollOptions={payload.availablePollOptions}
            videos={payload.videoLocations}
            initialSponsors={payload.sponsors}
          />
        </div>
      </div>
    </main>
  );
}
