import { redirect } from "next/navigation";
import { MapExperience } from "@/components/map/map-experience";
import { buildPublicShareUrl, loadPublicMapPayload, loadPublicMapPayloadByChannelId } from "@/lib/map-public";
import { DEMO_CHANNEL_SLUG, DEMO_USER, DEMO_USERNAME } from "@/lib/demo-data";
import type { MapDataPayload } from "@/lib/map-data";
import { readPreviewSession } from "@/lib/preview-session";
import { getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { sql } from "@/lib/neon";
import { resolveCheckoutPlanSlug } from "@/lib/plans";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{
    channelId?: string;
    demo?: string;
    preview?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const isDemoMode = resolvedSearchParams.demo === "1";
  const previewId = resolvedSearchParams.preview || "";
  const previewSession = previewId ? await readPreviewSession(previewId) : null;
  let fallbackChannelId = "";
  let sessionUserId = "";

  if (isDemoMode) {
    fallbackChannelId = DEMO_CHANNEL_SLUG;
  } else if (!previewSession) {
    sessionUserId = (await getSessionUserIdFromServerCookies()) || "";
    if (!sessionUserId) redirect("/auth");
    const hasSubscription = await userHasActiveSubscription(sessionUserId);
    if (!hasSubscription) redirect(await resolveCheckoutRedirectPath(sessionUserId));
    fallbackChannelId = await resolveUserChannelId(sessionUserId);
  }

  const channelId = resolvedSearchParams.channelId || fallbackChannelId;
  const previewPayload: MapDataPayload | null = previewSession
    ? buildPreviewPayload(previewSession.channel, previewSession.videoLocations)
    : null;
  const experiencePayload = previewSession
    ? null
    : isDemoMode
      ? await loadPublicMapPayload({ identifier: DEMO_USERNAME, viewerUserId: DEMO_USER.id })
      : channelId
        ? await loadPublicMapPayloadByChannelId({ channelId, viewerUserId: sessionUserId })
        : null;
  const payload = experiencePayload || previewPayload;

  if (!payload || (!channelId && !previewSession && !isDemoMode)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center text-foreground">
        <div className="tm-surface-strong rounded-[2rem] p-6 text-sm">
          No se pudo cargar el dashboard del mapa.
        </div>
      </main>
    );
  }

  const canRefresh = Boolean(!isDemoMode && !previewSession && channelId && isUuid(channelId));

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="absolute inset-0">
        <MapExperience
          channel={payload.channel}
          videoLocations={payload.videoLocations}
          manualQueue={payload.manualQueue}
          summary={payload.summary}
          channelId={previewSession ? null : payload.channel.id}
          allowRefresh={canRefresh}
          viewer={
            experiencePayload?.viewer || {
              isOwner: true,
              shareUrl: buildPublicShareUrl(payload.channel.channel_handle || payload.channel.canonicalHandle),
              adminUrl: "/dashboard",
            }
          }
          sponsors={experiencePayload?.sponsors || []}
          activePoll={experiencePayload?.activePoll || null}
          availablePollOptions={experiencePayload?.availablePollOptions || []}
          headerEyebrow={previewSession ? "Preview local" : isDemoMode ? "Demo map" : "Owner view"}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]" />
    </main>
  );
}

function buildPreviewPayload(channel: TravelChannel, videoLocations: TravelVideoLocation[]): MapDataPayload {
  const totalCountries = new Set(videoLocations.map((video) => video.country_code).filter(Boolean)).size;
  const verifiedManual = videoLocations.filter((video) => video.location_status === "verified_manual").length;
  const verifiedAuto = videoLocations.filter((video) => {
    const status = video.location_status;
    return status === "verified_auto" || status === "mapped";
  }).length;

  return {
    channel,
    videoLocations,
    manualQueue: [],
    summary: {
      total_videos: videoLocations.length,
      total_countries: totalCountries,
      verified_auto: verifiedAuto,
      verified_manual: verifiedManual,
      needs_manual: 0,
    },
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function userHasActiveSubscription(userId: string) {
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.subscriptions
    where user_id = ${userId}
      and status in ('active', 'trialing')
    order by updated_at desc
    limit 1
  `;
  return Boolean(rows[0]?.id);
}

async function resolveUserChannelId(userId: string) {
  const channels = await sql<Array<{ id: string }>>`
    select id
    from public.channels
    where user_id = ${userId}
    limit 1
  `;
  return channels[0]?.id || "";
}

async function resolveCheckoutRedirectPath(userId: string) {
  const onboardingRows = await sql<Array<{ selected_plan: string | null }>>`
    select selected_plan
    from public.onboarding_state
    where user_id = ${userId}
    limit 1
  `;

  const selectedPlan = String(onboardingRows[0]?.selected_plan || "").trim();
  if (!selectedPlan) {
    return "/onboarding";
  }

  const checkoutPlan = resolveCheckoutPlanSlug(selectedPlan) || selectedPlan;
  return `/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutPlan)}&lang=es`;
}
