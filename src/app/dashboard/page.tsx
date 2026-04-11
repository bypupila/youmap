import Link from "next/link";
import { MapExperience } from "@/components/map/map-experience";
import { FloatingTopBar, MetricPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";
import { loadMapDataByChannelId, type MapDataPayload } from "@/lib/map-data";
import { readPreviewSession } from "@/lib/preview-session";
import { createClient } from "@/lib/supabase-server";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

interface DashboardPageProps {
  searchParams: {
    channelId?: string;
    demo?: string;
    preview?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const isDemoMode = searchParams.demo === "1";
  const previewId = searchParams.preview || "";
  const previewSession = previewId ? await readPreviewSession(previewId) : null;
  const fallbackChannelId = isDemoMode ? DEMO_CHANNEL_SLUG : await resolveUserChannelId();
  const channelId = searchParams.channelId || fallbackChannelId;

  const payload: MapDataPayload | null = previewSession
    ? buildPreviewPayload(previewSession.channel, previewSession.videoLocations)
    : channelId
      ? await loadMapDataByChannelId(channelId)
      : null;

  if (!payload) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#02040a] text-white">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm">
          No se pudo cargar el dashboard del mapa.
        </div>
      </main>
    );
  }

  const canRefresh = Boolean(!isDemoMode && !previewSession && channelId && isUuid(channelId));

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#02040a] text-slate-50">
      <div className="absolute inset-0">
        <MapExperience
          channel={payload.channel}
          videoLocations={payload.videoLocations}
          manualQueue={payload.manualQueue}
          summary={payload.summary}
          channelId={canRefresh ? channelId : null}
          allowRefresh={canRefresh}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,107,53,0.12),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(0,212,255,0.11),transparent_26%),linear-gradient(to_bottom,rgba(2,4,10,0.48),rgba(2,4,10,0.15)_32%,rgba(2,4,10,0.46))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6">
        <FloatingTopBar
          eyebrow="Creator Dashboard"
          title={
            previewSession
              ? "Preview local con Gemini"
              : isDemoMode
                ? "Modo demo"
                : "Canal real"
          }
          actions={
            <>
              <MetricPill text={`${payload.summary.total_videos} videos`} />
              <MetricPill text={`${payload.summary.total_countries} paises`} />
              <Button asChild size="sm">
                <Link href="/">Volver</Link>
              </Button>
            </>
          }
        />
      </header>
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

async function resolveUserChannelId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return "";

  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return channel?.id || "";
}
