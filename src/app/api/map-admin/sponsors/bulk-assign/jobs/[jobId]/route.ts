import { NextResponse } from "next/server";
import { requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { getSponsorBulkAssignJob } from "@/lib/sponsor-bulk-assign-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;
    const job = await getSponsorBulkAssignJob(jobId);
    if (!job) return NextResponse.json({ error: "Job no encontrado." }, { status: 404 });

    const access = await requireCreatorChannelAccess(job.channelId, sessionUser.id);
    if (!access?.ownerUserId) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    console.error("[api/map-admin/sponsors/bulk-assign/jobs/[jobId] GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el job." }, { status: 400 });
  }
}
