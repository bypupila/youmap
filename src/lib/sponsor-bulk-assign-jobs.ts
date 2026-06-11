import { recordCreatorActivity } from "@/lib/creator-admin-actions";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export type SponsorBulkAssignJobStatus = "queued" | "running" | "completed" | "failed" | "reverted";

type SnapshotVideo = {
  videoId: string;
  hadRule: boolean;
  previousIsPrimary: boolean | null;
  previousStatus: string | null;
  previousText: string | null;
  previousConfidence: number | null;
  previousSource: string | null;
  otherPrimarySponsorIds: string[];
};

type JobRow = {
  id: string;
  channel_id: string;
  sponsor_id: string;
  actor_user_id: string | null;
  status: SponsorBulkAssignJobStatus;
  reason: string | null;
  set_primary: boolean;
  requested_video_ids: unknown;
  valid_video_ids: unknown;
  skipped_video_ids: unknown;
  snapshot: unknown;
  requested_count: number;
  applied_count: number;
  skipped_count: number;
  error_message: string | null;
  reversible_until: string | null;
  started_at: string | null;
  finished_at: string | null;
  reverted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsorBulkAssignJob = {
  id: string;
  channelId: string;
  sponsorId: string;
  actorUserId: string | null;
  status: SponsorBulkAssignJobStatus;
  reason: string | null;
  setPrimary: boolean;
  requestedCount: number;
  appliedCount: number;
  skippedCount: number;
  errorMessage: string | null;
  reversibleUntil: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  revertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const REVERT_WINDOW_MINUTES = 30;

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeJob(row: JobRow): SponsorBulkAssignJob {
  return {
    id: row.id,
    channelId: row.channel_id,
    sponsorId: row.sponsor_id,
    actorUserId: row.actor_user_id,
    status: row.status,
    reason: row.reason,
    setPrimary: row.set_primary,
    requestedCount: Number(row.requested_count || 0),
    appliedCount: Number(row.applied_count || 0),
    skippedCount: Number(row.skipped_count || 0),
    errorMessage: row.error_message,
    reversibleUntil: row.reversible_until,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    revertedAt: row.reverted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureJobsTable() {
  const exists = await tableExists("public", "sponsor_bulk_assign_jobs");
  if (!exists) {
    throw new Error("La tabla sponsor_bulk_assign_jobs no existe en este entorno.");
  }
}

export async function createSponsorBulkAssignJob(input: {
  channelId: string;
  sponsorId: string;
  actorUserId: string;
  requestedVideoIds: string[];
  validVideoIds: string[];
  skippedVideoIds: string[];
  reason: string | null;
  setPrimary: boolean;
}) {
  await ensureJobsTable();
  const now = new Date().toISOString();

  const validSet = new Set(input.validVideoIds);
  const videosRows = input.validVideoIds.length
    ? await sql.query<
        Array<{
          id: string;
          sponsor_detection_status: string | null;
          sponsor_detectado_texto: string | null;
          sponsor_detectado_confianza: number | null;
          sponsor_detectado_fuente: string | null;
        }>
      >(
        `
          select
            id,
            sponsor_detection_status::text as sponsor_detection_status,
            sponsor_detectado_texto,
            sponsor_detectado_confianza,
            sponsor_detectado_fuente
          from public.videos
          where channel_id = $1
            and id = any($2::uuid[])
        `,
        [input.channelId, input.validVideoIds]
      )
    : [];
  const videoById = new Map(videosRows.map((row) => [row.id, row]));

  const existingRuleRows = input.validVideoIds.length
    ? await sql.query<Array<{ video_id: string; is_primary: boolean }>>(
        `
          select video_id::text as video_id, is_primary
          from public.sponsor_video_rules
          where sponsor_id = $1
            and video_id = any($2::uuid[])
        `,
        [input.sponsorId, input.validVideoIds]
      )
    : [];
  const existingByVideo = new Map(existingRuleRows.map((row) => [row.video_id, row]));

  const otherPrimaryRows = input.validVideoIds.length
    ? await sql.query<Array<{ video_id: string; sponsor_id: string }>>(
        `
          select video_id::text as video_id, sponsor_id::text as sponsor_id
          from public.sponsor_video_rules
          where video_id = any($1::uuid[])
            and sponsor_id <> $2
            and is_primary = true
        `,
        [input.validVideoIds, input.sponsorId]
      )
    : [];
  const otherPrimaryMap = new Map<string, string[]>();
  for (const row of otherPrimaryRows) {
    const current = otherPrimaryMap.get(row.video_id) || [];
    current.push(row.sponsor_id);
    otherPrimaryMap.set(row.video_id, current);
  }

  const snapshot: SnapshotVideo[] = input.validVideoIds
    .filter((videoId) => validSet.has(videoId))
    .map((videoId) => {
      const video = videoById.get(videoId);
      const rule = existingByVideo.get(videoId);
      return {
        videoId,
        hadRule: Boolean(rule),
        previousIsPrimary: rule ? Boolean(rule.is_primary) : null,
        previousStatus: video?.sponsor_detection_status || null,
        previousText: video?.sponsor_detectado_texto || null,
        previousConfidence: video?.sponsor_detectado_confianza ?? null,
        previousSource: video?.sponsor_detectado_fuente || null,
        otherPrimarySponsorIds: otherPrimaryMap.get(videoId) || [],
      };
    });

  const rows = await sql<Array<{ id: string }>>`
    insert into public.sponsor_bulk_assign_jobs (
      channel_id,
      sponsor_id,
      actor_user_id,
      status,
      reason,
      set_primary,
      requested_video_ids,
      valid_video_ids,
      skipped_video_ids,
      snapshot,
      requested_count,
      skipped_count,
      created_at,
      updated_at
    )
    values (
      ${input.channelId},
      ${input.sponsorId},
      ${input.actorUserId},
      'queued',
      ${input.reason},
      ${input.setPrimary},
      ${JSON.stringify(input.requestedVideoIds)}::jsonb,
      ${JSON.stringify(input.validVideoIds)}::jsonb,
      ${JSON.stringify(input.skippedVideoIds)}::jsonb,
      ${JSON.stringify(snapshot)}::jsonb,
      ${input.requestedVideoIds.length},
      ${input.skippedVideoIds.length},
      ${now},
      ${now}
    )
    returning id
  `;

  const jobId = rows[0]?.id;
  if (!jobId) throw new Error("No se pudo crear el job de asignación masiva.");

  await recordCreatorActivity({
    channelId: input.channelId,
    actorUserId: input.actorUserId,
    eventType: "sponsor_bulk_job_queued",
    entityType: "bulk",
    entityId: jobId,
    description: "Asignación masiva de sponsor encolada.",
    metadata: {
      jobId,
      sponsorId: input.sponsorId,
      requested: input.requestedVideoIds.length,
      valid: input.validVideoIds.length,
      skipped: input.skippedVideoIds.length,
    },
  });

  return getSponsorBulkAssignJob(jobId);
}

export async function getSponsorBulkAssignJob(jobId: string) {
  await ensureJobsTable();
  const rows = await sql<JobRow[]>`
    select
      id,
      channel_id,
      sponsor_id,
      actor_user_id,
      status::text as status,
      reason,
      set_primary,
      requested_video_ids,
      valid_video_ids,
      skipped_video_ids,
      snapshot,
      requested_count,
      applied_count,
      skipped_count,
      error_message,
      reversible_until,
      started_at,
      finished_at,
      reverted_at,
      created_at,
      updated_at
    from public.sponsor_bulk_assign_jobs
    where id = ${jobId}
    limit 1
  `;
  const row = rows[0];
  return row ? normalizeJob(row) : null;
}

export async function processNextQueuedSponsorBulkAssignJob() {
  await ensureJobsTable();
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.sponsor_bulk_assign_jobs
    where status = 'queued'
    order by created_at asc
    limit 1
  `;
  const jobId = rows[0]?.id || null;
  if (!jobId) return null;
  return processSponsorBulkAssignJob(jobId);
}

export async function processSponsorBulkAssignJob(jobId: string) {
  await ensureJobsTable();

  const lockRows = await sql<Array<{ id: string }>>`
    update public.sponsor_bulk_assign_jobs
    set status = 'running', started_at = coalesce(started_at, now()), updated_at = now(), error_message = null
    where id = ${jobId}
      and status in ('queued', 'running')
    returning id
  `;
  if (!lockRows[0]?.id) {
    return getSponsorBulkAssignJob(jobId);
  }

  const rows = await sql<JobRow[]>`
    select
      id,
      channel_id,
      sponsor_id,
      actor_user_id,
      status::text as status,
      reason,
      set_primary,
      requested_video_ids,
      valid_video_ids,
      skipped_video_ids,
      snapshot,
      requested_count,
      applied_count,
      skipped_count,
      error_message,
      reversible_until,
      started_at,
      finished_at,
      reverted_at,
      created_at,
      updated_at
    from public.sponsor_bulk_assign_jobs
    where id = ${jobId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  const validVideoIds = parseJsonArray(row.valid_video_ids)
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  try {
    if (validVideoIds.length > 0) {
      if (row.set_primary) {
        await sql.query(
          `
            update public.sponsor_video_rules
            set is_primary = false, updated_at = now()
            where video_id = any($1::uuid[])
              and sponsor_id <> $2
              and is_primary = true
          `,
          [validVideoIds, row.sponsor_id]
        );
      }

      await sql.query(
        `
          insert into public.sponsor_video_rules (sponsor_id, video_id, priority, is_primary, created_at, updated_at)
          select $1::uuid as sponsor_id, v.video_id, 100, $2::boolean as is_primary, now(), now()
          from unnest($3::uuid[]) as v(video_id)
          on conflict (sponsor_id, video_id)
          do update set
            is_primary = excluded.is_primary,
            updated_at = now()
        `,
        [row.sponsor_id, row.set_primary, validVideoIds]
      );

      const sponsorRows = await sql<Array<{ brand_name: string }>>`
        select brand_name
        from public.sponsors
        where id = ${row.sponsor_id}
        limit 1
      `;
      const sponsorName = sponsorRows[0]?.brand_name || "Sponsor";

      await sql.query(
        `
          update public.videos
          set
            sponsor_detection_status = 'confirmado',
            sponsor_detectado_texto = coalesce(sponsor_detectado_texto, $2),
            sponsor_detectado_confianza = 1,
            sponsor_detectado_fuente = 'manual_admin',
            updated_at = now()
          where channel_id = $1
            and id = any($3::uuid[])
        `,
        [row.channel_id, sponsorName, validVideoIds]
      );
    }

    const updatedRows = await sql<JobRow[]>`
      update public.sponsor_bulk_assign_jobs
      set
        status = 'completed',
        applied_count = ${validVideoIds.length},
        skipped_count = ${parseJsonArray(row.skipped_video_ids).length},
        finished_at = now(),
        reversible_until = now() + ${`${REVERT_WINDOW_MINUTES} minutes`}::interval,
        updated_at = now()
      where id = ${jobId}
      returning
        id,
        channel_id,
        sponsor_id,
        actor_user_id,
        status::text as status,
        reason,
        set_primary,
        requested_video_ids,
        valid_video_ids,
        skipped_video_ids,
        snapshot,
        requested_count,
        applied_count,
        skipped_count,
        error_message,
        reversible_until,
        started_at,
        finished_at,
        reverted_at,
        created_at,
        updated_at
    `;
    const updated = updatedRows[0] ? normalizeJob(updatedRows[0]) : null;

    await recordCreatorActivity({
      channelId: row.channel_id,
      actorUserId: row.actor_user_id,
      eventType: "sponsor_bulk_job_completed",
      entityType: "bulk",
      entityId: row.id,
      description: "Asignación masiva de sponsor completada.",
      metadata: {
        jobId: row.id,
        applied: validVideoIds.length,
        skipped: parseJsonArray(row.skipped_video_ids).length,
        reversibleUntil: updated?.reversibleUntil || null,
      },
    });

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar el job.";
    await sql`
      update public.sponsor_bulk_assign_jobs
      set status = 'failed', error_message = ${message}, finished_at = now(), updated_at = now()
      where id = ${jobId}
    `;
    await recordCreatorActivity({
      channelId: row.channel_id,
      actorUserId: row.actor_user_id,
      eventType: "sponsor_bulk_job_failed",
      entityType: "bulk",
      entityId: row.id,
      description: "Falló una asignación masiva de sponsor.",
      severity: "error",
      metadata: {
        jobId: row.id,
        error: message,
      },
    });
    return getSponsorBulkAssignJob(jobId);
  }
}

export async function undoSponsorBulkAssignJob(input: {
  jobId: string;
  channelId: string;
  actorUserId: string;
}) {
  await ensureJobsTable();
  const rows = await sql<JobRow[]>`
    select
      id,
      channel_id,
      sponsor_id,
      actor_user_id,
      status::text as status,
      reason,
      set_primary,
      requested_video_ids,
      valid_video_ids,
      skipped_video_ids,
      snapshot,
      requested_count,
      applied_count,
      skipped_count,
      error_message,
      reversible_until,
      started_at,
      finished_at,
      reverted_at,
      created_at,
      updated_at
    from public.sponsor_bulk_assign_jobs
    where id = ${input.jobId}
      and channel_id = ${input.channelId}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("No se encontró el job solicitado.");
  if (row.status !== "completed") throw new Error("Solo se pueden deshacer jobs completados.");
  if (!row.reversible_until || new Date(row.reversible_until).getTime() < Date.now()) {
    throw new Error("La ventana de deshacer ya expiró.");
  }

  const snapshot = parseJsonArray(row.snapshot) as SnapshotVideo[];
  const hadRuleFalseIds = snapshot.filter((entry) => !entry.hadRule).map((entry) => entry.videoId);
  const hadRuleTrueEntries = snapshot.filter((entry) => entry.hadRule);
  const allVideoIds = snapshot.map((entry) => entry.videoId);

  if (hadRuleFalseIds.length > 0) {
    await sql.query(
      `
        delete from public.sponsor_video_rules
        where sponsor_id = $1
          and video_id = any($2::uuid[])
      `,
      [row.sponsor_id, hadRuleFalseIds]
    );
  }

  for (const entry of hadRuleTrueEntries) {
    await sql`
      update public.sponsor_video_rules
      set is_primary = ${entry.previousIsPrimary === true}, updated_at = now()
      where sponsor_id = ${row.sponsor_id}
        and video_id = ${entry.videoId}
    `;
  }

  for (const entry of snapshot) {
    const primarySponsorIds = entry.otherPrimarySponsorIds || [];
    for (const sponsorId of primarySponsorIds) {
      await sql`
        update public.sponsor_video_rules
        set is_primary = true, updated_at = now()
        where sponsor_id = ${sponsorId}
          and video_id = ${entry.videoId}
      `;
    }
  }

  if (allVideoIds.length > 0) {
    for (const entry of snapshot) {
      await sql`
        update public.videos
        set
          sponsor_detection_status = ${entry.previousStatus || "no_disponible"},
          sponsor_detectado_texto = ${entry.previousText},
          sponsor_detectado_confianza = ${entry.previousConfidence},
          sponsor_detectado_fuente = ${entry.previousSource},
          updated_at = now()
        where channel_id = ${row.channel_id}
          and id = ${entry.videoId}
      `;
    }
  }

  const updatedRows = await sql<JobRow[]>`
    update public.sponsor_bulk_assign_jobs
    set status = 'reverted', reverted_at = now(), finished_at = now(), updated_at = now()
    where id = ${row.id}
    returning
      id,
      channel_id,
      sponsor_id,
      actor_user_id,
      status::text as status,
      reason,
      set_primary,
      requested_video_ids,
      valid_video_ids,
      skipped_video_ids,
      snapshot,
      requested_count,
      applied_count,
      skipped_count,
      error_message,
      reversible_until,
      started_at,
      finished_at,
      reverted_at,
      created_at,
      updated_at
  `;

  await recordCreatorActivity({
    channelId: row.channel_id,
    actorUserId: input.actorUserId,
    eventType: "sponsor_bulk_job_reverted",
    entityType: "bulk",
    entityId: row.id,
    description: "Se deshizo una asignación masiva de sponsor.",
    metadata: {
      jobId: row.id,
      restoredVideos: allVideoIds.length,
    },
  });

  return updatedRows[0] ? normalizeJob(updatedRows[0]) : null;
}
