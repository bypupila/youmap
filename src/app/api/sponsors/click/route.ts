import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoChannelId } from "@/lib/demo-data";
import { sql } from "@/lib/neon";

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

    await sql`
      insert into public.sponsor_clicks (sponsor_id, country_code, ip_hash, clicked_at)
      values (
        ${payload.sponsorId},
        ${payload.countryCode || null},
        ${ipHash},
        ${new Date().toISOString()}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/click]", error);
    return NextResponse.json({ error: "Invalid click payload" }, { status: 400 });
  }
}
