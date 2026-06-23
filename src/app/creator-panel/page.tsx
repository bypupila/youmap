import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapAdminProposalV2 } from "@/components/map/map-admin-proposal-v2";
import {
  getChannelAccessForUser,
  getSessionUserById,
  getValidSessionUserIdFromServerCookies,
  userIsSuperAdmin,
} from "@/lib/current-user";
import { loadCreatorAdminPayload, normalizeCreatorAdminTab, type CreatorAdminTab } from "@/lib/creator-admin-data";
import { sql } from "@/lib/neon";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Panel del creador | TravelYourMap",
  description: "Panel privado para gestionar mapa, videos, audiencia, votaciones y sponsors.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

interface CreatorPanelPageProps {
  searchParams: Promise<{
    channelId?: string;
    tab?: string;
    status?: string;
    country?: string;
    modal?: string;
    id?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function CreatorPanelPage({ searchParams }: CreatorPanelPageProps) {
  const params = await searchParams;
  const sessionUserId = await getValidSessionUserIdFromServerCookies();
  if (!sessionUserId) redirect("/auth");

  const sessionUser = await getSessionUserById(sessionUserId);
  if (!sessionUser || sessionUser.role === "viewer") redirect("/map");

  let channelId = String(params.channelId || "").trim();
  if (!channelId) {
    const ownedRows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where user_id = ${sessionUserId}
      order by updated_at desc
      limit 1
    `;
    channelId = ownedRows[0]?.id || "";
  }

  if (!channelId && userIsSuperAdmin(sessionUser.role)) {
    const latestRows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      order by updated_at desc
      limit 1
    `;
    channelId = latestRows[0]?.id || "";
  }

  if (!channelId) redirect("/onboarding");

  const access = await getChannelAccessForUser(channelId, sessionUserId);
  if (!access.canManage) redirect("/map");

  const payload = await loadCreatorAdminPayload({ channelId, baseUrl: siteUrl });
  if (!payload) redirect("/map");

  return (
    <main className="min-h-[100dvh] bg-[#07090d] text-[#f5f7fb]">
      <MapAdminProposalV2
        payload={payload}
        activeTab={normalizeCreatorPanelTab(params.tab)}
        basePath="/creator-panel"
        initialFilters={{
          status: params.status || "all",
          country: params.country || "all",
          modal: params.modal || null,
          id: params.id || null,
        }}
      />
    </main>
  );
}

function normalizeCreatorPanelTab(value: string | undefined): CreatorAdminTab {
  const legacyTabs: Record<string, CreatorAdminTab> = {
    summary: "resumen",
    polls: "votaciones",
    sponsors: "sponsors",
    ops: "actividad",
    activity: "audiencia",
  };
  const raw = String(value || "");
  return legacyTabs[raw] || normalizeCreatorAdminTab(raw);
}
