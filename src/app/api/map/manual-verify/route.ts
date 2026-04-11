import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { confirmManualLocation } from "@/lib/map-sync";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  videoId: z.string().uuid(),
  country_code: z.string().length(2),
  city: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const channelId = String(new URL(request.url).searchParams.get("channelId") || "").trim();
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }
    const payload = await loadMapDataByChannelId(channelId);
    if (!payload) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    return NextResponse.json({ manualQueue: payload.manualQueue, summary: payload.summary });
  } catch (error) {
    console.error("[api/map/manual-verify:get]", error);
    return NextResponse.json({ error: "Cannot load manual queue" }, { status: 500 });
  }
}

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

    const location = await confirmManualLocation({
      service,
      channelId: payload.channelId,
      videoId: payload.videoId,
      countryCode: payload.country_code.toUpperCase(),
      city: payload.city.trim(),
    });

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.error("[api/map/manual-verify:post]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Manual verification failed" },
      { status: 400 }
    );
  }
}
