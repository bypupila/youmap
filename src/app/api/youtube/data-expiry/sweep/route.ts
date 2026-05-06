import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { invalidateExpiredYouTubeStatistics } from "@/lib/youtube-data-governance";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configuredToken = String(process.env.YOUTUBE_DATA_GOVERNANCE_TOKEN || "").trim();
  const requestToken = String(request.headers.get("x-import-worker-token") || "").trim();
  const cronHeaderToken = String(request.headers.get("x-cron-token") || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const queryToken = String(new URL(request.url).searchParams.get("token") || "").trim();
  const userAgent = String(request.headers.get("user-agent") || "").toLowerCase();
  const fromVercelCron = userAgent.includes("vercel-cron");

  if (configuredToken) {
    return (
      requestToken === configuredToken ||
      cronHeaderToken === configuredToken ||
      bearerToken === configuredToken ||
      queryToken === configuredToken ||
      fromVercelCron
    );
  }

  const workerToken = String(process.env.YOUTUBE_IMPORT_WORKER_TOKEN || "").trim();
  if (workerToken && requestToken === workerToken) return true;

  return fromVercelCron || process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId && !isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await invalidateExpiredYouTubeStatistics();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[api/youtube/data-expiry/sweep]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not sweep expired YouTube data",
      },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
