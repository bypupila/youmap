import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { getOrCreateVoterFingerprint, setMapVoterCookies } from "@/lib/map-polls";
import { loadPublicMapPayload, normalizeChannelHandle } from "@/lib/map-public";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const username = String(url.searchParams.get("username") || "").trim();
    const handle = String(url.searchParams.get("handle") || "").trim();
    const identifier = normalizeChannelHandle(handle || username);

    if (!identifier) {
      return NextResponse.json({ error: "username or handle is required" }, { status: 400 });
    }

    const userId = await getValidSessionUserIdFromRequest(request);
    const fingerprint = await getOrCreateVoterFingerprint();
    const payload = await loadPublicMapPayload({
      identifier,
      viewerUserId: userId,
      voterFingerprint: fingerprint.hashed,
    });

    if (!payload) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const response = NextResponse.json(payload);
    if (fingerprint.shouldSetCookie) {
      setMapVoterCookies(response, fingerprint.raw);
    }
    return response;
  } catch (error) {
    console.error("[api/map/public]", error);
    return NextResponse.json({ error: "Public map unavailable" }, { status: 500 });
  }
}
