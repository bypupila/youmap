import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { buildMapFanVoteIdentity, loadMapFanVoteSummary, MapFanVoteError, recordMapFanVote } from "@/lib/map-fan-votes";
import { loadMapDataByChannelId } from "@/lib/map-data";
import { buildPollOptionsFromVideos, getOrCreateVoterFingerprint, getRequestHashes, loadMapPoll, setMapVoterCookies } from "@/lib/map-polls";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
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

    const activePoll = await loadMapPoll(payload.channelId, {
      includeDraft: false,
      voterFingerprint: fingerprint.hashed,
    });
    if (activePoll?.status === "live") {
      return NextResponse.json(
        { error: "Hay una votacion live activa. Vota desde esa encuesta." },
        { status: 409 }
      );
    }

    const mapData = await loadMapDataByChannelId(payload.channelId);
    if (!mapData) {
      return NextResponse.json({ error: "Canal no disponible." }, { status: 404 });
    }

    const availableOptions = buildPollOptionsFromVideos(mapData.videoLocations).map((country) => ({
      country_code: country.country_code,
      country_name: country.country_name,
      cities: country.cities.map((city) => ({ city: city.city })),
    }));

    await recordMapFanVote({
      channelId: payload.channelId,
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
      channelId: payload.channelId,
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
