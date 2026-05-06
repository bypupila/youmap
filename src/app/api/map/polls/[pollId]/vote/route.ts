import { NextResponse } from "next/server";
import { z } from "zod";
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
