import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { runDueSponsorReportSchedules } from "@/lib/sponsor-reports";
import { invalidateExpiredYouTubeStatistics } from "@/lib/youtube-data-governance";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configuredToken = String(process.env.YOUTUBE_DATA_GOVERNANCE_TOKEN || "").trim();
  const workerToken = String(process.env.YOUTUBE_IMPORT_WORKER_TOKEN || "").trim();
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const requestToken = String(request.headers.get("x-import-worker-token") || "").trim();
  const cronHeaderToken = String(request.headers.get("x-cron-token") || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const queryToken = String(new URL(request.url).searchParams.get("token") || "").trim();

  const hasConfiguredTokenMatch =
    requestToken === configuredToken ||
    cronHeaderToken === configuredToken ||
    bearerToken === configuredToken ||
    queryToken === configuredToken;

  if (configuredToken) {
    return hasConfiguredTokenMatch || (cronSecret.length > 0 && bearerToken === cronSecret);
  }

  if (workerToken && requestToken === workerToken) return true;
  if (cronSecret && bearerToken === cronSecret) return true;

  return process.env.NODE_ENV !== "production";
}

async function handle(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId && !isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await invalidateExpiredYouTubeStatistics();
    let sponsorReportSchedules: Awaited<ReturnType<typeof runDueSponsorReportSchedules>> | { processed: number; results: unknown[]; error: string } = {
      processed: 0,
      results: [],
    };
    try {
      const url = new URL(request.url);
      sponsorReportSchedules = await runDueSponsorReportSchedules({
        origin: `${url.protocol}//${url.host}`,
        limit: 20,
      });
    } catch (error) {
      sponsorReportSchedules = {
        processed: 0,
        results: [],
        error: error instanceof Error ? error.message : "Could not run sponsor report schedules",
      };
    }
    return NextResponse.json({
      ok: true,
      ...result,
      sponsor_report_schedules: sponsorReportSchedules,
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

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" && !String(process.env.CRON_SECRET || "").trim()) {
    return NextResponse.json({ error: "CRON_SECRET is required in production for cron GET." }, { status: 500 });
  }

  return handle(request);
}
