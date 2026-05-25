import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";
import { createSponsorBulkAssignJob, processSponsorBulkAssignJob } from "@/lib/sponsor-bulk-assign-jobs";

export const dynamic = "force-dynamic";

const payloadSchema = z
  .object({
    channelId: z.string().uuid(),
    sponsorId: z.string().uuid(),
    videoIds: z.array(z.string().uuid()).min(1).max(1000),
    preview: z.boolean().optional().default(false),
    reason: z.string().trim().max(400).optional().nullable(),
    setPrimary: z.boolean().optional().default(true),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = payloadSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    if (!payload.preview && !String(payload.reason || "").trim()) {
      return NextResponse.json({ error: "El motivo es obligatorio para asignacion masiva." }, { status: 400 });
    }

    const hasSponsorVideoRules = await tableExists("public", "sponsor_video_rules");
    if (!hasSponsorVideoRules) {
      return NextResponse.json({ error: "La tabla sponsor_video_rules no existe en este entorno." }, { status: 400 });
    }
    const hasBulkJobs = await tableExists("public", "sponsor_bulk_assign_jobs");
    if (!hasBulkJobs) {
      return NextResponse.json(
        { error: "La tabla sponsor_bulk_assign_jobs no existe en este entorno. Ejecuta migraciones." },
        { status: 400 }
      );
    }

    const sponsorRows = await sql<Array<{ id: string; brand_name: string }>>`
      select id, brand_name
      from public.sponsors
      where id = ${payload.sponsorId}
        and user_id = ${access.ownerUserId}
        and active = true
      limit 1
    `;
    const sponsor = sponsorRows[0] || null;
    if (!sponsor) return NextResponse.json({ error: "Sponsor no encontrado." }, { status: 404 });

    const uniqueVideoIds = Array.from(new Set(payload.videoIds));
    const videoRows = await sql.query<Array<{ id: string; title: string }>>(
      `
        select id, title
        from public.videos
        where channel_id = $1
          and id = any($2::uuid[])
      `,
      [payload.channelId, uniqueVideoIds]
    );
    const validVideoIds = videoRows.map((row) => row.id);
    const validVideoSet = new Set(validVideoIds);
    const skippedVideoIds = uniqueVideoIds.filter((videoId) => !validVideoSet.has(videoId));

    if (payload.preview) {
      return NextResponse.json({
        ok: true,
        preview: true,
        sponsorId: sponsor.id,
        sponsorName: sponsor.brand_name,
        requested: uniqueVideoIds.length,
        applicable: validVideoIds.length,
        skipped: skippedVideoIds.length,
        skippedVideoIds,
      });
    }

    if (!validVideoIds.length) {
      return NextResponse.json({ error: "No hay videos validos para asignar." }, { status: 400 });
    }

    const job = await createSponsorBulkAssignJob({
      channelId: payload.channelId,
      sponsorId: sponsor.id,
      actorUserId: sessionUser.id,
      requestedVideoIds: uniqueVideoIds,
      validVideoIds,
      skippedVideoIds,
      reason: String(payload.reason || "").trim(),
      setPrimary: payload.setPrimary,
    });
    if (!job) {
      return NextResponse.json({ error: "No se pudo crear el job de asignación." }, { status: 400 });
    }

    const processInBackground = validVideoIds.length > 150;
    if (processInBackground) {
      await recordCreatorActivity({
        channelId: payload.channelId,
        actorUserId: sessionUser.id,
        eventType: "sponsor_bulk_assigned_async",
        entityType: "bulk",
        entityId: job.id,
        description: `${sessionUser.username} encoló asignación masiva async "${sponsor.brand_name}"`,
        metadata: {
          sponsorId: sponsor.id,
          sponsorName: sponsor.brand_name,
          requested: uniqueVideoIds.length,
          applicable: validVideoIds.length,
          skipped: skippedVideoIds.length,
          jobId: job.id,
        },
      });
      return NextResponse.json({
        ok: true,
        queued: true,
        job,
        sponsorId: sponsor.id,
        sponsorName: sponsor.brand_name,
        requested: uniqueVideoIds.length,
        applicable: validVideoIds.length,
        skipped: skippedVideoIds.length,
        skippedVideoIds,
      });
    }

    const processedJob = await processSponsorBulkAssignJob(job.id);
    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_bulk_assigned",
      entityType: "bulk",
      entityId: job.id,
      description: `${sessionUser.username} asignó masivamente sponsor "${sponsor.brand_name}"`,
      metadata: {
        sponsorId: sponsor.id,
        sponsorName: sponsor.brand_name,
        requested: uniqueVideoIds.length,
        applied: processedJob?.appliedCount ?? validVideoIds.length,
        skipped: skippedVideoIds.length,
        skippedVideoIds,
        reason: payload.reason || null,
        setPrimary: payload.setPrimary,
        jobId: job.id,
      },
    });

    return NextResponse.json({
      ok: true,
      queued: false,
      job: processedJob,
      sponsorId: sponsor.id,
      sponsorName: sponsor.brand_name,
      requested: uniqueVideoIds.length,
      applied: processedJob?.appliedCount ?? validVideoIds.length,
      skipped: skippedVideoIds.length,
      skippedVideoIds,
    });
  } catch (error) {
    console.error("[api/map-admin/sponsors/bulk-assign POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid bulk assign payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not bulk assign sponsor" }, { status: 400 });
  }
}
