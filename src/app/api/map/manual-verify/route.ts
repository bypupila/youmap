import { NextResponse } from "next/server";
import { z } from "zod";
import { getChannelAccessForUser, getSessionUserFromRequest } from "@/lib/current-user";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { confirmManualLocation } from "@/lib/map-sync";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  videoId: z.string().uuid(),
  country_code: z.string().length(2),
  city: z.string().trim().optional().default(""),
});

export async function GET(request: Request) {
  try {
    const channelId = String(new URL(request.url).searchParams.get("channelId") || "").trim();
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }
    const payload = await loadMapDataByChannelId(channelId);
    if (!payload) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    return NextResponse.json({ manualQueue: payload.manualQueue, summary: payload.summary });
  } catch (error) {
    console.error("[api/map/manual-verify:get]", error);
    return NextResponse.json({ error: "Cannot load manual queue" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getChannelAccessForUser(payload.channelId, sessionUser.id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    const location = await confirmManualLocation({
      channelId: payload.channelId,
      videoId: payload.videoId,
      countryCode: payload.country_code.toUpperCase(),
      city: payload.city.trim() || null,
    });

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.error("[api/map/manual-verify:post]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Manual verification failed" },
      { status: 400 }
    );
  }
}
