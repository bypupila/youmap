import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoChannelId } from "@/lib/demo-data";
import { MAP_EVENT_TYPES } from "@/lib/map-event-types";
import {
  isMadeForKidsVideo,
  isPublicMapPath,
  recordMapEventFromRequest,
  requestUserOwnsChannel,
  resolvePathFromRequest,
} from "@/lib/map-events";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  eventType: z.enum(MAP_EVENT_TYPES),
  viewerMode: z.enum(["viewer", "creator", "demo"]).optional().nullable(),
  path: z.string().trim().max(240).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
  countryCode: z.string().trim().length(2).optional().nullable(),
  youtubeVideoId: z.string().trim().max(64).optional().nullable(),
  sponsorId: z.string().uuid().optional().nullable(),
  pollId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const path = resolvePathFromRequest(request, payload.path);

    if (isDemoChannelId(payload.channelId) || payload.viewerMode === "demo") {
      return NextResponse.json({ ok: true, skipped: "demo" });
    }

    if (!isPublicMapPath(path)) {
      return NextResponse.json({ ok: true, skipped: "not_public_map" });
    }

    if (await requestUserOwnsChannel(request, payload.channelId)) {
      return NextResponse.json({ ok: true, skipped: "owner_self_view" });
    }

    const isVideoEvent = payload.eventType === "video_panel_open" || payload.eventType === "youtube_external_open";
    if (isVideoEvent && (await isMadeForKidsVideo(payload.channelId, payload.youtubeVideoId))) {
      return NextResponse.json({ ok: true, skipped: "made_for_kids" });
    }

    const id = await recordMapEventFromRequest(request, {
      channelId: payload.channelId,
      eventType: payload.eventType,
      viewerMode: payload.viewerMode || "viewer",
      path,
      referrer: payload.referrer,
      countryCode: payload.countryCode,
      youtubeVideoId: payload.youtubeVideoId,
      sponsorId: payload.sponsorId,
      pollId: payload.pollId,
      metadata: payload.metadata,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[api/map/events]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid event payload", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not record map event" }, { status: 500 });
  }
}
