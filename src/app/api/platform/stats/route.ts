import { NextResponse } from "next/server";
import { resolvePlatformVideoStats } from "@/lib/platform-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await resolvePlatformVideoStats();

    return NextResponse.json(
      stats,
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[api/platform/stats]", error);
    return NextResponse.json({ error: "Platform stats unavailable" }, { status: 500 });
  }
}
