import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { buildPollOptionsFromVideos, closeMapPoll, normalizePollOptions, upsertMapPoll } from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const optionSchema = z.object({
  country_code: z.string().trim().min(2).max(2),
  country_name: z.string().trim().min(1).optional(),
  sort_order: z.number().int().optional(),
  cities: z.array(
    z.object({
      city: z.string().trim().min(1),
      sort_order: z.number().int().optional(),
    })
  ).min(1),
});

const payloadSchema = z.object({
  pollId: z.string().uuid().optional().nullable(),
  channelId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  prompt: z.string().trim().min(3).max(280),
  showPopup: z.boolean().default(false),
  status: z.enum(["draft", "live", "closed"]),
  closesAt: z.string().datetime().optional().nullable(),
  countryOptions: z.array(optionSchema).default([]),
});

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    const ownership = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where id = ${payload.channelId}
        and user_id = ${userId}
      limit 1
    `;

    if (!ownership[0]?.id) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    if (payload.status === "closed") {
      if (!payload.pollId) {
        return NextResponse.json({ error: "pollId is required to close a poll" }, { status: 400 });
      }
      const poll = await closeMapPoll(payload.channelId, payload.pollId);
      return NextResponse.json({ poll });
    }

    const mapPayload = await loadMapDataByChannelId(payload.channelId);
    if (!mapPayload) {
      return NextResponse.json({ error: "Map data unavailable" }, { status: 404 });
    }

    const available = buildPollOptionsFromVideos(mapPayload.videoLocations);
    const normalizedOptions = normalizePollOptions(payload.countryOptions, available);

    if (!normalizedOptions.length) {
      return NextResponse.json({ error: "Select at least one country and one city to publish this poll." }, { status: 400 });
    }

    const poll = await upsertMapPoll({
      pollId: payload.pollId || null,
      channelId: payload.channelId,
      userId,
      title: payload.title,
      prompt: payload.prompt,
      showPopup: payload.showPopup,
      status: payload.status,
      closesAt: payload.closesAt || null,
      countryOptions: normalizedOptions,
    });

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("[api/map/polls]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save poll" }, { status: 400 });
  }
}
