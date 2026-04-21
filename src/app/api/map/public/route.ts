import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { getOrCreateVoterFingerprint } from "@/lib/map-polls";
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

    const userId = getSessionUserIdFromRequest(request);
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
      response.cookies.set("travelmap_voter", fingerprint.raw, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    console.error("[api/map/public]", error);
    return NextResponse.json({ error: "Public map unavailable" }, { status: 500 });
  }
}
