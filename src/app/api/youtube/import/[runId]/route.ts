import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId: rawRunId } = await params;
    const runId = String(rawRunId || "").trim();
    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    const runs = await sql<Array<Record<string, unknown>>>`
      select *
      from public.channel_import_runs
      where id = ${runId}
      limit 1
    `;
    const run = runs[0] || null;
    if (!run) {
      return NextResponse.json({ error: "Import run not found" }, { status: 404 });
    }

    const channelId = String((run as { channel_id?: string }).channel_id || "");
    const channels = await sql<Array<{ id: string; user_id: string }>>`
      select id, user_id
      from public.channels
      where id = ${channelId}
      limit 1
    `;
    const channel = channels[0] || null;
    if (!channel || channel.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("[api/youtube/import/:runId]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load import status",
      },
      { status: 400 }
    );
  }
}
