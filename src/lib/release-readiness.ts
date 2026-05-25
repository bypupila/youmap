import { access } from "fs/promises";
import path from "path";
import { columnExists, tableExists } from "@/lib/db-schema";
import { loadPublicStatus } from "@/lib/public-status";

export type ReleaseCheckStatus = "pass" | "fail" | "warn" | "manual";

export interface ReleaseCheckItem {
  id: string;
  group: string;
  label: string;
  status: ReleaseCheckStatus;
  detail: string;
}

export interface ReleaseReadinessPayload {
  generated_at: string;
  overall_status: "go" | "go_with_warnings" | "no_go";
  ready: boolean;
  blockers: number;
  warnings: number;
  manual: number;
  checks: ReleaseCheckItem[];
}

async function fileExists(relativePath: string) {
  try {
    await access(path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function loadReleaseReadiness(): Promise<ReleaseReadinessPayload> {
  const [
    hasUsers,
    hasChannels,
    hasVideos,
    hasVideoLocations,
    hasMapPolls,
    hasMapEvents,
    hasImportRuns,
    hasViewerProfiles,
    hasUserConsents,
    hasSponsors,
    hasSponsorVideoRules,
    hasCreatorActivityLog,
    hasSponsorStatusColumn,
    hasSponsorTextColumn,
    hasSponsorConfidenceColumn,
    hasSponsorSourceColumn,
    hasGoNoGoDoc,
    hasImportRunbookDoc,
  ] = await Promise.all([
    tableExists("public", "users"),
    tableExists("public", "channels"),
    tableExists("public", "videos"),
    tableExists("public", "video_locations"),
    tableExists("public", "map_polls"),
    tableExists("public", "map_events"),
    tableExists("public", "channel_import_runs"),
    tableExists("public", "viewer_profiles"),
    tableExists("public", "user_consents"),
    tableExists("public", "sponsors"),
    tableExists("public", "sponsor_video_rules"),
    tableExists("public", "creator_activity_log"),
    columnExists("public", "videos", "sponsor_detection_status"),
    columnExists("public", "videos", "sponsor_detectado_texto"),
    columnExists("public", "videos", "sponsor_detectado_confianza"),
    columnExists("public", "videos", "sponsor_detectado_fuente"),
    fileExists("docs/GO_NO_GO_CHECKLIST.md"),
    fileExists("docs/IMPORT_RUNBOOK.md"),
  ]);

  const checks: ReleaseCheckItem[] = [];

  const coreTables = [hasUsers, hasChannels, hasVideos, hasVideoLocations, hasMapPolls, hasMapEvents];
  checks.push({
    id: "db_core_tables",
    group: "Base de datos",
    label: "Tablas núcleo del producto",
    status: coreTables.every(Boolean) ? "pass" : "fail",
    detail: coreTables.every(Boolean)
      ? "Estructura base disponible (users, channels, videos, video_locations, map_polls, map_events)."
      : "Faltan tablas núcleo para operar el MVP completo.",
  });

  checks.push({
    id: "db_viewer_compliance",
    group: "Base de datos",
    label: "Registro viewer y consentimiento",
    status: hasViewerProfiles && hasUserConsents ? "pass" : "fail",
    detail:
      hasViewerProfiles && hasUserConsents
        ? "viewer_profiles y user_consents disponibles."
        : "Faltan tablas de registro viewer o consentimiento.",
  });

  checks.push({
    id: "db_sponsor_contract",
    group: "Base de datos",
    label: "Contrato de sponsor por video",
    status: hasSponsors && hasSponsorVideoRules ? "pass" : "fail",
    detail:
      hasSponsors && hasSponsorVideoRules
        ? "sponsors y sponsor_video_rules disponibles."
        : "Faltan tablas para operar sponsors por video.",
  });

  const sponsorColumnsReady =
    hasSponsorStatusColumn && hasSponsorTextColumn && hasSponsorConfidenceColumn && hasSponsorSourceColumn;
  checks.push({
    id: "db_sponsor_detection_columns",
    group: "Base de datos",
    label: "Campos sponsor detectado en videos",
    status: sponsorColumnsReady ? "pass" : "fail",
    detail: sponsorColumnsReady
      ? "Campos de detección disponibles en videos."
      : "Faltan campos sponsor_detectado_* o sponsor_detection_status en videos.",
  });

  checks.push({
    id: "ops_import_pipeline",
    group: "Operación",
    label: "Pipeline de importación",
    status: hasImportRuns ? "pass" : "warn",
    detail: hasImportRuns
      ? "Tabla channel_import_runs disponible para operación y trazabilidad."
      : "No se detecta channel_import_runs en este entorno.",
  });

  checks.push({
    id: "ops_activity_audit",
    group: "Operación",
    label: "Auditoría de acciones admin",
    status: hasCreatorActivityLog ? "pass" : "warn",
    detail: hasCreatorActivityLog
      ? "creator_activity_log disponible para trazabilidad."
      : "No se detecta creator_activity_log en este entorno.",
  });

  const publicStatus = await loadPublicStatus();
  checks.push({
    id: "ops_public_status",
    group: "Operación",
    label: "Estado público del sistema",
    status:
      publicStatus.overall_status === "incident"
        ? "fail"
        : publicStatus.overall_status === "degraded"
          ? "warn"
          : "pass",
    detail: `Estado actual: ${publicStatus.overall_status}.`,
  });

  checks.push({
    id: "release_docs",
    group: "Release",
    label: "Documentación operativa mínima",
    status: hasGoNoGoDoc && hasImportRunbookDoc ? "pass" : "warn",
    detail:
      hasGoNoGoDoc && hasImportRunbookDoc
        ? "Checklist go/no-go y runbook de importación presentes."
        : "Falta documentación operativa mínima para release.",
  });

  checks.push({
    id: "manual_legal_review",
    group: "Release",
    label: "Revisión legal/comercial pre-lanzamiento",
    status: "manual",
    detail: "Validar consentimiento legal, términos y política de demos antes de publicar.",
  });

  const blockers = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warn").length;
  const manual = checks.filter((item) => item.status === "manual").length;

  const overall_status: ReleaseReadinessPayload["overall_status"] =
    blockers > 0 ? "no_go" : warnings > 0 ? "go_with_warnings" : "go";

  return {
    generated_at: new Date().toISOString(),
    overall_status,
    ready: blockers === 0,
    blockers,
    warnings,
    manual,
    checks,
  };
}
