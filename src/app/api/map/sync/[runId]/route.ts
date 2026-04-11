import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { fetchMapSyncRun } from "@/lib/map-sync";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = String(params.runId || "").trim();
    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceRoleClient();
    const run = await fetchMapSyncRun(service, runId);
    if (!run) {
      return NextResponse.json({ error: "Sync run not found" }, { status: 404 });
    }

    const { data: channel, error: channelError } = await service
      .from("channels")
      .select("id,user_id")
      .eq("id", run.channel_id)
      .maybeSingle();

    if (channelError) {
      return NextResponse.json({ error: channelError.message }, { status: 400 });
    }
    if (!channel || channel.user_id !== user.id) {
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
