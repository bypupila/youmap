import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { syncChannelIncremental } from "@/lib/map-sync";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceRoleClient();
    const { data: channelOwner, error: channelError } = await service
      .from("channels")
      .select("id")
      .eq("id", payload.channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (channelError) {
      return NextResponse.json({ error: channelError.message }, { status: 400 });
    }
    if (!channelOwner) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    const result = await syncChannelIncremental({
      channelId: payload.channelId,
      service,
    });

    return NextResponse.json({
      runId: result.runId,
      summary: {
        videos_scanned: result.videos_scanned,
        videos_extracted: result.videos_extracted,
        videos_verified_auto: result.videos_verified_auto,
        videos_needs_manual: result.videos_needs_manual,
        videos_verified_manual: result.videos_verified_manual,
        excluded_shorts: result.excluded_shorts,
        excluded_non_travel: result.excluded_non_travel,
      },
      manualQueue: result.manualQueue,
    });
  } catch (error) {
    console.error("[api/map/sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Map sync failed" },
      { status: 400 }
    );
  }
}
