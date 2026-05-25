import { NextResponse } from "next/server";
import { closeExpiredMapPolls } from "@/lib/map-polls";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const configuredToken = String(process.env.MAP_POLLS_CRON_TOKEN || "").trim();
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const queryToken = String(url.searchParams.get("token") || "").trim();
  const providedToken = String(request.headers.get("x-cron-token") || "").trim();
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const hasMatchingToken =
    (queryToken.length > 0 && queryToken === configuredToken) ||
    (providedToken.length > 0 && providedToken === configuredToken) ||
    (bearerToken.length > 0 && bearerToken === configuredToken) ||
    (cronSecret.length > 0 && bearerToken === cronSecret);

  if (configuredToken) {
    return hasMatchingToken;
  }

  return process.env.NODE_ENV !== "production";
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
  if (process.env.NODE_ENV === "production" && !String(process.env.CRON_SECRET || "").trim()) {
    return NextResponse.json({ error: "CRON_SECRET is required in production for cron GET." }, { status: 500 });
  }

  // Vercel Cron invokes GET and sends Authorization: Bearer <CRON_SECRET>.
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
