import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserById, getValidSessionUserIdFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { getMapVoterFingerprintFromCookieStore, loadMapPollById, type MapPollRecord } from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

type Audience = "owner" | "authenticated_viewer" | "anonymous_viewer";

function sanitizePollForAudience(poll: MapPollRecord, audience: Audience) {
  if (audience !== "anonymous_viewer") {
    return poll;
  }

  const rankedCountries = poll.country_options
    .slice()
    .sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order || a.country_code.localeCompare(b.country_code));

  const hideVotes = poll.status === "live" || poll.status === "closed";

  if (!hideVotes) {
    return poll;
  }

  return {
    ...poll,
    total_votes: 0,
    country_options: rankedCountries.map((country) => ({
      ...country,
      votes: 0,
      cities: country.cities.map((city) => ({ ...city, votes: 0 })),
    })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ pollId: string }> }) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    const { pollId } = await params;

    const cookieStore = await cookies();
    const voterFingerprint = getMapVoterFingerprintFromCookieStore(cookieStore);

    const poll = await loadMapPollById(pollId, voterFingerprint);

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const sessionUser = userId ? await getSessionUserById(userId) : null;
    const isSuperAdmin = userIsSuperAdmin(sessionUser?.role);
    let isOwner = false;
    if (userId) {
      const rows = await sql<Array<{ user_id: string }>>`
        select c.user_id
        from public.map_polls p
        inner join public.channels c on c.id = p.channel_id
        where p.id = ${pollId}
        limit 1
      `;
      isOwner = rows[0]?.user_id === userId || isSuperAdmin;
    }

    if (poll.status === "draft" && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const audience: Audience = isOwner ? "owner" : userId ? "authenticated_viewer" : "anonymous_viewer";
    const sanitizedPoll = sanitizePollForAudience(poll, audience);

    return NextResponse.json({
      poll: sanitizedPoll,
      audience,
      can_view_detailed_stats: audience !== "anonymous_viewer",
    });
  } catch (error) {
    console.error("[api/map/polls/[pollId]/results]", error);
    return NextResponse.json({ error: "Could not load poll results" }, { status: 500 });
  }
}
