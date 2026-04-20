import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql<Array<{ total_videos: number }>>`
      select count(*)::int as total_videos
      from public.videos
    `;

    return NextResponse.json(
      {
        total_videos: rows[0]?.total_videos || 0,
      },
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
