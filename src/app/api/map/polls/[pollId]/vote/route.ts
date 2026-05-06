import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { isPublicMapPath, recordMapEventFromRequest, resolvePathFromRequest } from "@/lib/map-events";
import {
  getOrCreateVoterFingerprint,
  getRequestHashes,
  MapPollVoteError,
  recordMapPollVote,
  setMapVoterCookies,
} from "@/lib/map-polls";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  countryCode: z.string().trim().length(2),
  city: z.string().trim().min(1).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ pollId: string }> }) {
  try {
    const { pollId } = await params;
    const payload = payloadSchema.parse(await request.json());
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

    const sessionUserId = await getValidSessionUserIdFromRequest(request);
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
