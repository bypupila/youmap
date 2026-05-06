import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { invalidateExpiredYouTubeStatistics } from "@/lib/youtube-data-governance";
import { processNextQueuedYoutubeImportRun, processYoutubeImportRunById } from "@/lib/youtube-import";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  runId: z.string().uuid().optional(),
});

function hasInternalWorkerAccess(request: Request) {
  const configuredToken = String(process.env.YOUTUBE_IMPORT_WORKER_TOKEN || "").trim();
  if (!configuredToken) return false;
  const requestToken = String(request.headers.get("x-import-worker-token") || "").trim();
  return requestToken.length > 0 && requestToken === configuredToken;
}

export async function POST(request: Request) {
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
