import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoChannelId } from "@/lib/demo-data";
import {
  getRequestHashesFromHeaders,
  isPublicMapPath,
  isUuid,
  recordMapEvent,
  requestUserOwnsChannel,
  resolvePathFromRequest,
  resolveReferrerFromRequest,
} from "@/lib/map-events";
import { sql } from "@/lib/neon";

const payloadSchema = z.object({
  sponsorId: z.string().uuid(),
  channelId: z.string().optional().nullable(),
  countryCode: z.string().trim().length(2).optional().nullable(),
  path: z.string().trim().max(240).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const channelId = isUuid(payload.channelId) ? payload.channelId : null;
    const path = resolvePathFromRequest(request, payload.path);

    if (payload.channelId && isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ ok: true, demo: true });
    }

    if (channelId && (await requestUserOwnsChannel(request, channelId))) {
      return NextResponse.json({ ok: true, skipped: "owner_self_view" });
    }

    if (channelId && !isPublicMapPath(path)) {
      return NextResponse.json({ ok: true, skipped: "not_public_map" });
    }

    const hashes = getRequestHashesFromHeaders(request.headers);

    await sql`
      insert into public.sponsor_clicks (sponsor_id, channel_id, country_code, ip_hash, clicked_at)
      values (
        ${payload.sponsorId},
        ${channelId},
        ${payload.countryCode ? payload.countryCode.toUpperCase() : null},
        ${hashes.ipHash},
        ${new Date().toISOString()}
      )
    `;

    if (channelId) {
      try {
        await recordMapEvent({
          channelId,
          eventType: "sponsor_click",
          viewerMode: "viewer",
          path,
          referrer: resolveReferrerFromRequest(request, payload.referrer),
          countryCode: payload.countryCode,
          sponsorId: payload.sponsorId,
          ipHash: hashes.ipHash,
          userAgentHash: hashes.userAgentHash,
        });
      } catch (eventError) {
        console.warn("[api/sponsors/click] map event skipped", eventError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/click]", error);
    return NextResponse.json({ error: "Invalid click payload" }, { status: 400 });
  }
}
