import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import {
  buildSponsorReportPublicUrl,
  createSponsorReportLink,
  listSponsorReportLinks,
  sponsorBelongsToChannel,
} from "@/lib/sponsor-reports";

export const dynamic = "force-dynamic";

const createReportSchema = z.object({
  channelId: z.string().uuid(),
  sponsorId: z.string().uuid(),
  periodDays: z.number().int().min(7).max(365).default(30),
});

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId") || "";
    if (!z.string().uuid().safeParse(channelId).success) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const access = await requireCreatorChannelAccess(channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const reports = await listSponsorReportLinks(channelId, requestOrigin(request));
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[api/sponsors/reports GET]", error);
    return NextResponse.json({ error: "Could not load sponsor reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = createReportSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }

    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    if (!(await sponsorBelongsToChannel(payload.channelId, payload.sponsorId))) {
      return NextResponse.json({ error: "Sponsor not found for this channel" }, { status: 404 });
    }

    const created = await createSponsorReportLink({
      channelId: payload.channelId,
      sponsorId: payload.sponsorId,
      createdByUserId: sessionUser.id,
      periodDays: payload.periodDays,
    });
    const origin = requestOrigin(request);
    const reports = await listSponsorReportLinks(payload.channelId, origin);
    const report = reports.find((entry) => entry.id === created.id) || null;

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_report_created",
      entityType: "sponsor",
      entityId: payload.sponsorId,
      description: `${sessionUser.username} creo un reporte privado de sponsor`,
      metadata: { report_id: created.id, period_days: created.period_days },
    });

    return NextResponse.json({
      ok: true,
      report,
      public_url: buildSponsorReportPublicUrl(origin, created.token),
    });
  } catch (error) {
    console.error("[api/sponsors/reports POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor report payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create sponsor report" },
      { status: 400 }
    );
  }
}
