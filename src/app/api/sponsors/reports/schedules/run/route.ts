import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { runDueSponsorReportSchedules } from "@/lib/sponsor-reports";

export const dynamic = "force-dynamic";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function isAuthorized(request: Request) {
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const configuredToken = String(process.env.SPONSOR_REPORTS_CRON_TOKEN || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const headerToken = String(request.headers.get("x-cron-token") || "").trim();
  const queryToken = String(new URL(request.url).searchParams.get("token") || "").trim();

  if (configuredToken) {
    return [bearerToken, headerToken, queryToken].includes(configuredToken) || (cronSecret.length > 0 && bearerToken === cronSecret);
  }
  if (cronSecret && bearerToken === cronSecret) return true;
  return process.env.NODE_ENV !== "production";
}

async function handle(request: Request) {
  try {
    const sessionUserId = await getValidSessionUserIdFromRequest(request);
    if (!sessionUserId && !isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limit = Number(new URL(request.url).searchParams.get("limit") || 20);
    const result = await runDueSponsorReportSchedules({
      origin: requestOrigin(request),
      limit: Number.isFinite(limit) ? limit : 20,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/sponsors/reports/schedules/run]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not run sponsor report schedules" },
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
