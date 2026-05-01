import { NextResponse } from "next/server";
import { closeExpiredMapPolls } from "@/lib/map-polls";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const configuredToken = String(process.env.MAP_POLLS_CRON_TOKEN || "").trim();
  const queryToken = String(url.searchParams.get("token") || "").trim();
  const providedToken = String(request.headers.get("x-cron-token") || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const userAgent = String(request.headers.get("user-agent") || "").toLowerCase();
  const fromVercelCron = userAgent.includes("vercel-cron");

  if (configuredToken) {
    return fromVercelCron || queryToken === configuredToken || providedToken === configuredToken || bearerToken === configuredToken;
  }

  return fromVercelCron || process.env.NODE_ENV !== "production";
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const closedPolls = await closeExpiredMapPolls();
  console.info("[api/map/polls/close-expired]", {
    closedCount: closedPolls.length,
    pollIds: closedPolls.map((poll) => poll.id),
  });
  return NextResponse.json({ ok: true, closed_count: closedPolls.length, poll_ids: closedPolls.map((poll) => poll.id) });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
