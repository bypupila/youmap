import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { isDemoChannelId } from "@/lib/demo-data";

const payloadSchema = z.object({
  sponsorId: z.string().uuid(),
  channelId: z.string().optional(),
  countryCode: z.string().length(2).optional(),
});

function resolveIp(request: Request) {
  const xfwd = request.headers.get("x-forwarded-for") || "";
  return xfwd.split(",")[0].trim() || "0.0.0.0";
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());

    if (payload.channelId && isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const ip = resolveIp(request);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipHash = createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");

    const service = createServiceRoleClient();
    await service.from("sponsor_clicks").insert({
      sponsor_id: payload.sponsorId,
      country_code: payload.countryCode || null,
      ip_hash: ipHash,
      clicked_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/click]", error);
    return NextResponse.json({ error: "Invalid click payload" }, { status: 400 });
  }
}
