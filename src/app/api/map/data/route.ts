import { NextResponse } from "next/server";
import { loadMapDataByChannelId } from "@/lib/map-data";

export const dynamic = "force-dynamic";

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

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/map/data]", error);
    return NextResponse.json({ error: "Map data unavailable" }, { status: 500 });
  }
}
