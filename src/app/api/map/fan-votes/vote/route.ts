import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUsername } from "@/lib/auth-identifiers";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { buildRecommendedFanVoteOptions } from "@/lib/fan-vote-options";
import { buildMapFanVoteIdentity, loadMapFanVoteSummary, MapFanVoteError, recordMapFanVote } from "@/lib/map-fan-votes";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { isUuid } from "@/lib/map-events";
import { sql } from "@/lib/neon";
import { getOrCreateVoterFingerprint, getRequestHashes, loadMapPoll, setMapVoterCookies } from "@/lib/map-polls";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().trim().min(1),
  countryCode: z.string().trim().length(2),
  voteScope: z.enum(["country", "city"]).optional().default("country"),
  city: z.string().trim().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const fingerprint = await getOrCreateVoterFingerprint();
    const requestHashes = await getRequestHashes();
    const sessionUserId = await getValidSessionUserIdFromRequest(request);
    const voterIdentity = buildMapFanVoteIdentity({
      userId: sessionUserId,
      voterFingerprint: fingerprint.hashed,
    });

    if (!voterIdentity) {
      throw new MapFanVoteError("No se pudo identificar el dispositivo para votar.", 400);
    }

    const mapData = await loadMapDataByChannelId(payload.channelId);
    if (!mapData) {
      return NextResponse.json({ error: "Canal no disponible." }, { status: 404 });
    }
    const effectiveChannelId =
      (isUuid(mapData.channel.id) ? mapData.channel.id : null) ||
      (isUuid(payload.channelId) ? payload.channelId : null) ||
      (await resolveChannelUuidByIdentifier(mapData.channel.channel_handle || payload.channelId)) ||
      (await resolveLocalGlobalMapFallbackChannelId(mapData.channel.id));
    if (!effectiveChannelId) {
      throw new MapFanVoteError("Fan vote no disponible para este mapa.", 400);
    }

    const activePoll = await loadMapPoll(effectiveChannelId, {
      includeDraft: false,
      voterFingerprint: fingerprint.hashed,
    });
    if (activePoll?.status === "live") {
      return NextResponse.json(
        { error: "Hay una votacion live activa. Vota desde esa encuesta." },
        { status: 409 }
      );
    }

    const availableOptions = buildRecommendedFanVoteOptions(mapData.videoLocations).map((country) => ({
      country_code: country.country_code,
      country_name: country.country_name,
      cities: country.cities.map((city) => ({ city: city.city })),
    }));

    await recordMapFanVote({
      channelId: effectiveChannelId,
      countryCode: payload.countryCode,
      city: payload.city || null,
      voteScope: payload.voteScope,
      voterIdentity,
      voterFingerprint: fingerprint.hashed,
      voterUserId: sessionUserId || null,
      ipHash: requestHashes.ipHash,
      userAgentHash: requestHashes.userAgentHash,
      availableOptions,
    });

    const fanVotes = await loadMapFanVoteSummary({
      channelId: effectiveChannelId,
      videoLocations: mapData.videoLocations,
      voterIdentity,
    });

    const response = NextResponse.json({ fanVotes });
    if (fingerprint.shouldSetCookie) {
      setMapVoterCookies(response, fingerprint.raw);
    }

    return response;
  } catch (error) {
    console.error("[api/map/fan-votes/vote]", error);

    if (error instanceof MapFanVoteError) {
      return NextResponse.json(
        { error: error.message, nextVoteAt: error.nextVoteAt },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo votar." },
      { status: 400 }
    );
  }
}

async function resolveChannelUuidByIdentifier(identifier: string | null | undefined) {
  const normalized = normalizeUsername(String(identifier || ""));
  if (!normalized) return null;

  const rows = await sql<Array<{ id: string }>>`
    select c.id
    from public.channels c
    inner join public.users u on u.id = c.user_id
    where u.username = ${normalized}
       or ltrim(lower(coalesce(c.channel_handle, '')), '@') = ${normalized}
    limit 1
  `;

  const resolved = String(rows[0]?.id || "");
  return isUuid(resolved) ? resolved : null;
}

async function resolveLocalGlobalMapFallbackChannelId(channelId: string | null | undefined) {
  const normalized = String(channelId || "").trim().toLowerCase();
  if (normalized === "luisito-global-map" || normalized === "drew-global-map") {
    const rows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where is_public = true
      order by last_synced_at desc nulls last, created_at desc
      limit 1
    `;
    const resolved = String(rows[0]?.id || "");
    return isUuid(resolved) ? resolved : null;
  }
  return null;
}
