import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import {
  VIEWER_VIDEO_WATCH_STATUSES,
  loadViewerVideoActivity,
  upsertViewerVideoActivity,
} from "@/lib/viewer-video-activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const changeSchema = z.object({
  youtubeVideoId: z.string().trim().min(1).max(64),
  saved: z.boolean().optional().nullable(),
  favorite: z.boolean().optional().nullable(),
  watchStatus: z.enum(VIEWER_VIDEO_WATCH_STATUSES).optional().nullable(),
  markSeen: z.boolean().optional().nullable(),
  markOpened: z.boolean().optional().nullable(),
  markStarted: z.boolean().optional().nullable(),
  lastPositionSeconds: z.number().finite().min(0).max(604800).optional().nullable(),
  watchedSeconds: z.number().finite().min(0).max(604800).optional().nullable(),
  durationSeconds: z.number().finite().min(0).max(604800).optional().nullable(),
});

const postSchema = z.object({
  channelId: z.string().uuid(),
  changes: z.array(changeSchema).min(1).max(250),
});

export async function GET(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const channelId = String(url.searchParams.get("channelId") || "").trim();
    const parsed = z.string().uuid().parse(channelId);
    const items = await loadViewerVideoActivity({ userId, channelId: parsed });

    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/viewer/video-activity GET]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid channelId", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not load viewer video activity" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = postSchema.parse(await request.json());
    const result = await upsertViewerVideoActivity({
      userId,
      channelId: payload.channelId,
      changes: payload.changes,
    });
    if (result.updated < 1) {
      return NextResponse.json({ error: "No valid viewer video activity changes were saved" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/viewer/video-activity POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid viewer video activity payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not save viewer video activity" }, { status: 500 });
  }
}
