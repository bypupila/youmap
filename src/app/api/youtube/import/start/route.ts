import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { importYoutubeChannel } from "@/lib/youtube-import";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const onboardingRows = await sql<Array<{ youtube_channel_id: string | null }>>`
      select youtube_channel_id
      from public.onboarding_state
      where user_id = ${userId}
      limit 1
    `;
    const channelReference = String(onboardingRows[0]?.youtube_channel_id || "").trim();
    if (!channelReference) {
      return NextResponse.json({ error: "Missing YouTube channel reference" }, { status: 400 });
    }

    const existingRuns = await sql<Array<{ id: string; status: string }>>`
      select id, status
      from public.channel_import_runs
      where input ->> 'channelUrl' = ${channelReference}
        and status in ('running', 'completed')
      order by started_at desc
      limit 1
    `;
    const existingRun = existingRuns[0] || null;
    if (existingRun?.id) {
      return NextResponse.json({
        import_run_id: existingRun.id,
        status: existingRun.status,
        already_started: true,
      });
    }

    const importRunId = randomUUID();
    void importYoutubeChannel({
      userId,
      channelUrl: channelReference,
      importRunId,
    }).catch((error) => {
      console.error("[api/youtube/import/start]", error);
    });

    return NextResponse.json({
      import_run_id: importRunId,
      status: "running",
      already_started: false,
    });
  } catch (error) {
    console.error("[api/youtube/import/start]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not start YouTube import",
      },
      { status: 400 }
    );
  }
}
