import { loadPublicStatus } from "@/lib/public-status";
import { loadReleaseReadiness } from "@/lib/release-readiness";

export type AdminAlertSeverity = "critical" | "high";

export interface AdminOpsAlert {
  id: string;
  severity: AdminAlertSeverity;
  title: string;
  detail: string;
}

export interface AdminOpsAlertPayload {
  generated_at: string;
  alerts: AdminOpsAlert[];
}

export async function loadAdminOpsAlerts(): Promise<AdminOpsAlertPayload> {
  const [status, release] = await Promise.all([loadPublicStatus(), loadReleaseReadiness()]);
  const alerts: AdminOpsAlert[] = [];

  if (status.overall_status === "incident") {
    alerts.push({
      id: "status_incident",
      severity: "critical",
      title: "Incidente activo en estado público",
      detail: "La página de estado reporta incidente general.",
    });
  }

  if (release.blockers > 0) {
    alerts.push({
      id: "release_blockers",
      severity: "critical",
      title: "Release bloqueado",
      detail: `Hay ${release.blockers} blocker(s) activos en el gate go/no-go.`,
    });
  }

  if (status.indicators.imports_failed_24h > status.indicators.imports_completed_24h) {
    alerts.push({
      id: "imports_fail_rate",
      severity: "high",
      title: "Falla alta en importación",
      detail: `${status.indicators.imports_failed_24h} fallidos vs ${status.indicators.imports_completed_24h} completados en 24h.`,
    });
  }

  if (status.indicators.manual_review_videos > 250) {
    alerts.push({
      id: "manual_queue_growth",
      severity: "high",
      title: "Cola manual creciendo",
      detail: `${status.indicators.manual_review_videos} videos en revisión manual.`,
    });
  }

  if (release.warnings > 0) {
    alerts.push({
      id: "release_warnings",
      severity: "high",
      title: "Advertencias de salida",
      detail: `Hay ${release.warnings} warning(s) activos en release readiness.`,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    alerts,
  };
}
