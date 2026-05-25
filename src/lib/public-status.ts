import { sql } from "@/lib/neon";
import { tableExists } from "@/lib/db-schema";

export type PublicServiceStatus = "operational" | "degraded" | "incident" | "unknown";

export interface PublicStatusPayload {
  generated_at: string;
  overall_status: PublicServiceStatus;
  services: Array<{
    key: string;
    label: string;
    status: PublicServiceStatus;
    detail: string;
  }>;
  indicators: {
    imports_completed_24h: number;
    imports_failed_24h: number;
    imports_running_now: number;
    manual_review_videos: number;
    live_polls: number;
    map_events_24h: number;
  };
}

function resolveOverallStatus(statuses: PublicServiceStatus[]): PublicServiceStatus {
  if (statuses.includes("incident")) return "incident";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.includes("operational")) return "operational";
  return "unknown";
}

export async function loadPublicStatus(): Promise<PublicStatusPayload> {
  const nowIso = new Date().toISOString();

  let databaseStatus: PublicServiceStatus = "operational";
  try {
    await sql`select 1`;
  } catch (error) {
    console.error("[public-status] database check failed", error);
    databaseStatus = "incident";
  }

  const [hasImportRuns, hasVideos, hasPolls, hasMapEvents] = await Promise.all([
    tableExists("public", "channel_import_runs"),
    tableExists("public", "videos"),
    tableExists("public", "map_polls"),
    tableExists("public", "map_events"),
  ]);

  const importRowsPromise = hasImportRuns
    ? sql<Array<{ completed_24h: number; failed_24h: number; running_now: number }>>`
        select
          count(*) filter (where status = 'completed' and created_at >= now() - interval '24 hour')::int as completed_24h,
          count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hour')::int as failed_24h,
          count(*) filter (where status = 'running')::int as running_now
        from public.channel_import_runs
      `
    : Promise.resolve([{ completed_24h: 0, failed_24h: 0, running_now: 0 }]);

  const manualRowsPromise = hasVideos
    ? sql<Array<{ manual_review_videos: number }>>`
        select count(*)::int as manual_review_videos
        from public.videos
        where location_status = 'needs_manual'
      `
    : Promise.resolve([{ manual_review_videos: 0 }]);

  const livePollRowsPromise = hasPolls
    ? sql<Array<{ live_polls: number }>>`
        select count(*)::int as live_polls
        from public.map_polls
        where status = 'live'
      `
    : Promise.resolve([{ live_polls: 0 }]);

  const mapEventsRowsPromise = hasMapEvents
    ? sql<Array<{ map_events_24h: number }>>`
        select count(*)::int as map_events_24h
        from public.map_events
        where created_at >= now() - interval '24 hour'
      `
    : Promise.resolve([{ map_events_24h: 0 }]);

  const [importRows, manualRows, livePollRows, mapEventsRows] = await Promise.all([
    importRowsPromise,
    manualRowsPromise,
    livePollRowsPromise,
    mapEventsRowsPromise,
  ]);

  const imports = importRows[0] || { completed_24h: 0, failed_24h: 0, running_now: 0 };
  const manual = manualRows[0] || { manual_review_videos: 0 };
  const livePolls = livePollRows[0] || { live_polls: 0 };
  const events = mapEventsRows[0] || { map_events_24h: 0 };

  const importStatus: PublicServiceStatus = !hasImportRuns
    ? "unknown"
    : imports.failed_24h > imports.completed_24h
      ? "degraded"
      : "operational";
  const mapStatus: PublicServiceStatus = !hasVideos ? "unknown" : manual.manual_review_videos > 500 ? "degraded" : "operational";
  const pollsStatus: PublicServiceStatus = hasPolls ? "operational" : "unknown";
  const analyticsStatus: PublicServiceStatus = hasMapEvents ? "operational" : "unknown";

  const services = [
    {
      key: "database",
      label: "Base de datos",
      status: databaseStatus,
      detail: databaseStatus === "incident" ? "Sin conexion a base de datos." : "Conexion activa.",
    },
    {
      key: "youtube_import",
      label: "Importacion YouTube",
      status: importStatus,
      detail:
        importStatus === "unknown"
          ? "Sin tabla de importacion en este entorno."
          : `${imports.completed_24h} completados, ${imports.failed_24h} fallidos en 24 horas.`,
    },
    {
      key: "map_content",
      label: "Contenido de mapas",
      status: mapStatus,
      detail:
        mapStatus === "unknown"
          ? "Sin tabla de videos en este entorno."
          : `${manual.manual_review_videos} videos pendientes de revision manual.`,
    },
    {
      key: "polls",
      label: "Votaciones",
      status: pollsStatus,
      detail: pollsStatus === "unknown" ? "Modulo no disponible en este entorno." : `${livePolls.live_polls} votaciones activas.`,
    },
    {
      key: "analytics",
      label: "Analitica interna",
      status: analyticsStatus,
      detail:
        analyticsStatus === "unknown"
          ? "Sin tabla de eventos en este entorno."
          : `${events.map_events_24h} eventos capturados en las ultimas 24 horas.`,
    },
  ];

  return {
    generated_at: nowIso,
    overall_status: resolveOverallStatus(services.map((service) => service.status)),
    services,
    indicators: {
      imports_completed_24h: imports.completed_24h || 0,
      imports_failed_24h: imports.failed_24h || 0,
      imports_running_now: imports.running_now || 0,
      manual_review_videos: manual.manual_review_videos || 0,
      live_polls: livePolls.live_polls || 0,
      map_events_24h: events.map_events_24h || 0,
    },
  };
}
