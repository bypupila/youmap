import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { loadMapPollById } from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ pollId: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request);
    const { pollId } = await params;
    const poll = await loadMapPollById(pollId);

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (poll.status === "draft") {
      const rows = await sql<Array<{ user_id: string }>>`
        select c.user_id
        from public.map_polls p
        inner join public.channels c on c.id = p.channel_id
        where p.id = ${pollId}
        limit 1
      `;
      if (!userId || rows[0]?.user_id !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("[api/map/polls/[pollId]/results]", error);
    return NextResponse.json({ error: "Could not load poll results" }, { status: 500 });
  }
}
