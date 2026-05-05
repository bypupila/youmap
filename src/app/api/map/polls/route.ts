import { NextResponse } from "next/server";
import { z } from "zod";
import { getChannelAccessForUser, getValidSessionUserFromRequest } from "@/lib/current-user";
import { loadMapDataByChannelId } from "@/lib/map-data";
import {
  buildPollOptionsFromVideos,
  closeMapPoll,
  MAP_POLL_DEFAULT_MODE,
  normalizePollMode,
  normalizePollOptions,
  type MapPollMode,
  upsertMapPoll,
} from "@/lib/map-polls";
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
  ).default([]),
});

const payloadSchema = z.object({
  pollId: z.string().uuid().optional().nullable(),
  channelId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  prompt: z.string().trim().min(3).max(280),
  pollMode: z.enum(["country", "country_city"]).optional().nullable(),
  showPopup: z.boolean().default(false),
  status: z.enum(["draft", "live", "closed"]),
  closesAt: z.string().datetime().optional().nullable(),
  countryOptions: z.array(optionSchema).default([]),
});

async function resolveEffectivePollMode(channelId: string, pollId: string | null, requestedMode: string | null | undefined): Promise<MapPollMode> {
  if (requestedMode) return normalizePollMode(requestedMode);

  if (pollId) {
    const currentRows = await sql<Array<{ poll_mode: string | null }>>`
      select poll_mode
      from public.map_polls
      where id = ${pollId}
        and channel_id = ${channelId}
      limit 1
    `;
    if (currentRows[0]?.poll_mode) return normalizePollMode(currentRows[0].poll_mode);
  }

  const latestRows = await sql<Array<{ poll_mode: string | null }>>`
    select poll_mode
    from public.map_polls
    where channel_id = ${channelId}
    order by updated_at desc
    limit 1
  `;

  return normalizePollMode(latestRows[0]?.poll_mode || MAP_POLL_DEFAULT_MODE);
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    const access = await getChannelAccessForUser(payload.channelId, sessionUser.id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    if (payload.status === "closed") {
      if (!payload.pollId) {
        return NextResponse.json({ error: "pollId is required to close a poll" }, { status: 400 });
      }
      const poll = await closeMapPoll(payload.channelId, payload.pollId);
      return NextResponse.json({ poll });
    }

    const pollMode = await resolveEffectivePollMode(payload.channelId, payload.pollId || null, payload.pollMode || null);

    const mapPayload = await loadMapDataByChannelId(payload.channelId);
    if (!mapPayload) {
      return NextResponse.json({ error: "Map data unavailable" }, { status: 404 });
    }

    const available = buildPollOptionsFromVideos(mapPayload.videoLocations);

    let normalizedOptions;
    try {
      normalizedOptions = normalizePollOptions(payload.countryOptions, available, pollMode);
    } catch (normalizeError) {
      return NextResponse.json(
        { error: normalizeError instanceof Error ? normalizeError.message : "Opciones de votacion invalidas." },
        { status: 400 }
      );
    }

    const poll = await upsertMapPoll({
      pollId: payload.pollId || null,
      channelId: payload.channelId,
      userId: sessionUser.id,
      title: payload.title,
      prompt: payload.prompt,
      pollMode,
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
