import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { columnExists } from "@/lib/db-schema";
import { loadMapDataByChannelId } from "@/lib/map-data";
import {
  buildPollOptionsFromVideos,
  closeMapPoll,
  normalizePollMode,
  normalizePollOptions,
  upsertMapPoll,
} from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const optionSchema = z.object({
  country_code: z.string().trim().length(2),
  country_name: z.string().trim().optional().nullable(),
  sort_order: z.number().int().optional(),
  cities: z.array(z.object({ city: z.string().trim().min(1), sort_order: z.number().int().optional() })).default([]),
});

const pollPayloadSchema = z.object({
  action: z.enum(["save", "close", "publish", "convert"]).default("save"),
  channelId: z.string().uuid(),
  pollId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(120).optional(),
  prompt: z.string().trim().min(3).max(280).optional(),
  pollMode: z.enum(["country", "country_city"]).default("country_city"),
  status: z.enum(["draft", "live", "closed"]).default("draft"),
  showPopup: z.boolean().default(false),
  closesAt: z.string().datetime().optional().nullable(),
  visibility: z.enum(["public", "link_only"]).default("public"),
  countryOptions: z.array(optionSchema).default([]),
  sponsorId: z.string().uuid().optional().nullable(),
  sponsorUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
});

function cleanSponsorUrl(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

async function getPollSchemaFeatures() {
  const [hasVisibility, hasWinnerCountry, hasWinnerCity, hasConvertedToDestination, hasSponsorId, hasSponsorUrl] = await Promise.all([
    columnExists("public", "map_polls", "visibility"),
    columnExists("public", "map_polls", "winner_country_code"),
    columnExists("public", "map_polls", "winner_city"),
    columnExists("public", "map_polls", "converted_to_destination"),
    columnExists("public", "map_polls", "sponsor_id"),
    columnExists("public", "map_polls", "sponsor_url"),
  ]);

  return {
    hasVisibility,
    hasWinnerFields: hasWinnerCountry && hasWinnerCity,
    hasConvertedToDestination,
    hasSponsorId,
    hasSponsorUrl,
  };
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = pollPayloadSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    const schema = await getPollSchemaFeatures();

    if (payload.action === "close") {
      if (!payload.pollId) return NextResponse.json({ error: "pollId is required" }, { status: 400 });
      const poll = await closeMapPoll(payload.channelId, payload.pollId);
      await updatePollWinner(payload.pollId, schema);
      await recordCreatorActivity({
        channelId: payload.channelId,
        actorUserId: sessionUser.id,
        eventType: "vote_closed",
        entityType: "votacion",
        entityId: payload.pollId,
        description: `${sessionUser.username} cerro la votacion "${poll?.title || payload.pollId}"`,
      });
      return NextResponse.json({ ok: true, poll });
    }

    if (payload.action === "publish" || payload.action === "convert") {
      if (!payload.pollId) return NextResponse.json({ error: "pollId is required" }, { status: 400 });
      const winner = await updatePollWinner(payload.pollId, schema);
      const setClauses = ["published_at = coalesce(published_at, now())"];
      const values: unknown[] = [];
      if (schema.hasConvertedToDestination && payload.action === "convert") {
        setClauses.push("converted_to_destination = true");
      }
      if (schema.hasSponsorId && payload.sponsorId) {
        values.push(payload.sponsorId);
        setClauses.push(`sponsor_id = $${values.length}`);
      }
      if (schema.hasSponsorUrl && cleanSponsorUrl(payload.sponsorUrl)) {
        values.push(cleanSponsorUrl(payload.sponsorUrl));
        setClauses.push(`sponsor_url = $${values.length}`);
      }
      values.push(payload.pollId, payload.channelId);
      const rows = await sql.query<Array<{ id: string; title: string }>>(
        `update public.map_polls
         set ${setClauses.join(", ")}, updated_at = now()
         where id = $${values.length - 1}
           and channel_id = $${values.length}
         returning id, title`,
        values
      );
      const poll = rows[0] || null;
      if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
      await recordCreatorActivity({
        channelId: payload.channelId,
        actorUserId: sessionUser.id,
        eventType: payload.action === "convert" ? "vote_converted" : "vote_published",
        entityType: "votacion",
        entityId: payload.pollId,
        description:
          payload.action === "convert"
            ? `${sessionUser.username} convirtio el ganador en proximo destino`
            : `${sessionUser.username} publico el resultado de "${poll.title}"`,
        metadata: winner || {},
      });
      return NextResponse.json({ ok: true, id: poll.id, winner });
    }

    if (!payload.title || !payload.prompt) {
      return NextResponse.json({ error: "title and prompt are required" }, { status: 400 });
    }

    const mapPayload = await loadMapDataByChannelId(payload.channelId);
    if (!mapPayload) return NextResponse.json({ error: "Map data unavailable" }, { status: 404 });
    const available = buildPollOptionsFromVideos(mapPayload.videoLocations);
    const pollMode = normalizePollMode(payload.pollMode);
    const normalizedOptions = normalizePollOptions(payload.countryOptions, available, pollMode);
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

    if (poll?.id) {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      if (schema.hasVisibility) {
        values.push(payload.visibility);
        setClauses.push(`visibility = $${values.length}`);
      }
      if (schema.hasSponsorId) {
        values.push(payload.sponsorId || null);
        setClauses.push(`sponsor_id = $${values.length}`);
      }
      if (schema.hasSponsorUrl) {
        values.push(cleanSponsorUrl(payload.sponsorUrl));
        setClauses.push(`sponsor_url = $${values.length}`);
      }
      if (setClauses.length > 0) {
        values.push(poll.id, payload.channelId);
        await sql.query(
          `update public.map_polls
           set ${setClauses.join(", ")}, updated_at = now()
           where id = $${values.length - 1}
             and channel_id = $${values.length}`,
          values
        );
      }
      await recordCreatorActivity({
        channelId: payload.channelId,
        actorUserId: sessionUser.id,
        eventType: payload.pollId ? "vote_edited" : "vote_created",
        entityType: "votacion",
        entityId: poll.id,
        description: `${sessionUser.username} guardo la votacion "${payload.title}"`,
        metadata: { status: payload.status, visibility: payload.visibility },
      });
    }

    return NextResponse.json({ ok: true, poll });
  } catch (error) {
    console.error("[api/map-admin/polls POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid poll payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save poll" }, { status: 400 });
  }
}

async function updatePollWinner(
  pollId: string,
  schema: { hasWinnerFields: boolean }
) {
  const rows = await sql<Array<{ country_code: string; city: string; votes: number | string }>>`
    select country_code, city, count(*)::int as votes
    from public.map_poll_votes
    where poll_id = ${pollId}
    group by country_code, city
    order by count(*) desc, country_code asc, city asc
    limit 1
  `;
  const winner = rows[0] || null;
  if (schema.hasWinnerFields) {
    await sql`
      update public.map_polls
      set
        winner_country_code = ${winner?.country_code || null},
        winner_city = ${winner?.city && winner.city !== "__country__" ? winner.city : null},
        updated_at = now()
      where id = ${pollId}
    `;
  }
  return winner
    ? {
        country_code: winner.country_code,
        city: winner.city === "__country__" ? null : winner.city,
        votes: Number(winner.votes || 0),
      }
    : null;
}
