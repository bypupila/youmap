import { NextResponse } from "next/server";
import { getSessionUserFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { fetchMapSyncRun } from "@/lib/map-sync";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId: rawRunId } = await params;
    const runId = String(rawRunId || "").trim();
    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    const sessionUser = await getSessionUserFromRequest(_request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const run = await fetchMapSyncRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Sync run not found" }, { status: 404 });
    }

    const channelId = String((run as { channel_id?: string }).channel_id || "");
    const channels = await sql<Array<{ id: string; user_id: string }>>`
      select id, user_id
      from public.channels
      where id = ${channelId}
      limit 1
    `;
    const channel = channels[0] || null;
    const canManage = Boolean(channel && (channel.user_id === sessionUser.id || userIsSuperAdmin(sessionUser.role)));
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("[api/map/sync/:runId]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cannot load sync status" },
      { status: 500 }
    );
  }
}
