import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { revokeSponsorReportLink } from "@/lib/sponsor-reports";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  channelId: z.string().uuid(),
  action: z.enum(["revoke"]).default("revoke"),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { reportId } = await params;
    const payload = patchSchema.parse(await request.json());
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const revoked = await revokeSponsorReportLink({
      channelId: payload.channelId,
      reportId,
    });
    if (!revoked) return NextResponse.json({ error: "Report not found or already revoked" }, { status: 404 });

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_report_revoked",
      entityType: "sponsor",
      entityId: null,
      description: `${sessionUser.username} revoco un reporte privado de sponsor`,
      metadata: { report_id: reportId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/reports/:reportId PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor report payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not revoke sponsor report" }, { status: 400 });
  }
}
