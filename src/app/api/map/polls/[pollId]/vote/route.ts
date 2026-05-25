import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { DEMO_CHANNEL_ID } from "@/lib/demo-data";
import { isPublicMapPath, recordMapEventFromRequest, resolvePathFromRequest } from "@/lib/map-events";
import {
  getOrCreateVoterFingerprint,
  getRequestHashes,
  MapPollVoteError,
  recordMapPollVote,
  setMapVoterCookies,
} from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  countryCode: z.string().trim().length(2),
  city: z.string().trim().min(1).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ pollId: string }> }) {
  try {
    const sessionUserId = await getValidSessionUserIdFromRequest(request);
    if (!sessionUserId) {
      return NextResponse.json(
        { error: "Debes registrarte e iniciar sesión como viewer para votar.", requires_viewer_registration: true },
        { status: 401 }
      );
    }

    const { pollId } = await params;
    const payload = payloadSchema.parse(await request.json());
    const demoPollRows = await sql<Array<{ channel_id: string }>>`
      select channel_id
      from public.map_polls
      where id = ${pollId}
      limit 1
    `;
    if (demoPollRows[0]?.channel_id === DEMO_CHANNEL_ID) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const fingerprint = await getOrCreateVoterFingerprint();
    const requestHashes = await getRequestHashes();

    const poll = await recordMapPollVote({
      pollId,
      countryCode: payload.countryCode,
      city: payload.city || null,
      voterFingerprint: fingerprint.hashed,
      ipHash: requestHashes.ipHash,
      userAgentHash: requestHashes.userAgentHash,
    });

    const path = resolvePathFromRequest(request);
    if (poll && sessionUserId !== poll.created_by_user_id && isPublicMapPath(path)) {
      try {
        await recordMapEventFromRequest(request, {
          channelId: poll.channel_id,
          eventType: "poll_vote",
          viewerMode: "viewer",
          path,
          pollId: poll.id,
          countryCode: payload.countryCode,
          metadata: {
            city: payload.city || null,
          },
        });
      } catch (eventError) {
        console.warn("[api/map/polls/[pollId]/vote] map event skipped", eventError);
      }
    }

    const response = NextResponse.json({ poll });
    if (fingerprint.shouldSetCookie) {
      setMapVoterCookies(response, fingerprint.raw);
    }

    return response;
  } catch (error) {
    console.error("[api/map/polls/[pollId]/vote]", error);

    if (error instanceof MapPollVoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Vote failed" }, { status: 400 });
  }
}
