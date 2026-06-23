import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { invalidateExpiredYouTubeStatistics } from "@/lib/youtube-data-governance";
import { processNextQueuedYoutubeImportRun, processYoutubeImportRunById } from "@/lib/youtube-import";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  runId: z.string().uuid().optional(),
});

function readRequestToken(request: Request) {
  const headerToken = String(request.headers.get("x-import-worker-token") || "").trim();
  if (headerToken) return headerToken;
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (bearerToken) return bearerToken;
  const queryToken = String(new URL(request.url).searchParams.get("token") || "").trim();
  return queryToken;
}

function hasInternalWorkerAccess(request: Request) {
  const configuredToken = String(process.env.YOUTUBE_IMPORT_WORKER_TOKEN || "").trim();
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const requestToken = readRequestToken(request);
  if (configuredToken && requestToken === configuredToken) return true;
  if (cronSecret && requestToken === cronSecret) return true;
  return process.env.NODE_ENV !== "production" && !configuredToken && !cronSecret;
}

async function handle(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    const internalAccess = hasInternalWorkerAccess(request);
    if (!userId && !internalAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const payload = payloadSchema.parse(body);

    const result = payload.runId
      ? await processYoutubeImportRunById({
          runId: payload.runId,
          requestedByUserId: userId || null,
        })
      : await processNextQueuedYoutubeImportRun({
          requestedByUserId: userId || null,
        });

    const governanceSweep = await invalidateExpiredYouTubeStatistics();

    return NextResponse.json({
      ...result,
      governanceSweep,
    });
  } catch (error) {
    console.error("[api/youtube/import/worker]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not process queued import run",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
