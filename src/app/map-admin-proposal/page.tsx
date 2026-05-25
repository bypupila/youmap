import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapAdminProposalV2 } from "@/components/map/map-admin-proposal-v2";
import { getChannelAccessForUser, getSessionUserById, getValidSessionUserIdFromServerCookies, userIsSuperAdmin } from "@/lib/current-user";
import { loadCreatorAdminPayload, normalizeCreatorAdminTab } from "@/lib/creator-admin-data";
import { sql } from "@/lib/neon";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Panel de Administracion | TravelYourMap",
  description: "Panel operacional del creador para administrar mapa, videos, votaciones y sponsors.",
  robots: {
    index: false,
    follow: false,
  },
};

interface MapAdminProposalPageProps {
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

export default async function MapAdminProposalPage({ searchParams }: MapAdminProposalPageProps) {
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
        activeTab={normalizeCreatorAdminTab(params.tab)}
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
