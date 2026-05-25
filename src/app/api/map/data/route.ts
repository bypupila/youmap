import { NextResponse } from "next/server";
import { getValidSessionUserFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const channelId = String(url.searchParams.get("channelId") || "").trim();
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const payload = await loadMapDataByChannelId(channelId);
    if (!payload) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const sessionUser = await getValidSessionUserFromRequest(request);
    let canViewInternalQueue = false;

    if (sessionUser && UUID_PATTERN.test(channelId)) {
      const ownerRows = await sql<Array<{ user_id: string }>>`
        select user_id
        from public.channels
        where id = ${channelId}
        limit 1
      `;
      const ownerUserId = ownerRows[0]?.user_id || null;
      canViewInternalQueue = Boolean(ownerUserId && (ownerUserId === sessionUser.id || userIsSuperAdmin(sessionUser.role)));
    }

    if (canViewInternalQueue) {
      return NextResponse.json(payload);
    }

    return NextResponse.json({
      ...payload,
      manualQueue: [],
      summary: {
        ...payload.summary,
        total_videos: payload.videoLocations.length,
        needs_manual: 0,
      },
    });
  } catch (error) {
    console.error("[api/map/data]", error);
    return NextResponse.json({ error: "Map data unavailable" }, { status: 500 });
  }
}
