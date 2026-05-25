import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { processNextQueuedSponsorBulkAssignJob, processSponsorBulkAssignJob } from "@/lib/sponsor-bulk-assign-jobs";

export const dynamic = "force-dynamic";

const payloadSchema = z
  .object({
    channelId: z.string().uuid(),
    jobId: z.string().uuid().optional().nullable(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = payloadSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: no hay jobs persistentes." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    const job = payload.jobId ? await processSponsorBulkAssignJob(payload.jobId) : await processNextQueuedSponsorBulkAssignJob();
    if (!job) {
      return NextResponse.json({ ok: true, processed: false, message: "No hay jobs pendientes." });
    }

    if (job.channelId !== payload.channelId) {
      return NextResponse.json({ error: "El job no pertenece al canal indicado." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, processed: true, job });
  } catch (error) {
    console.error("[api/map-admin/sponsors/bulk-assign/worker POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar el worker." }, { status: 400 });
  }
}
