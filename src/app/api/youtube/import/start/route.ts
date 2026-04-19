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
      select cir.id, cir.status
      from public.channel_import_runs cir
      inner join public.channels c on c.id = cir.channel_id
      where c.user_id = ${userId}
        and cir.input ->> 'channelUrl' = ${channelReference}
        and cir.status in ('running', 'completed')
      order by cir.started_at desc
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

    const nowIso = new Date().toISOString();
    const channelRows = await sql<Array<{ id: string }>>`
      insert into public.channels (
        user_id,
        channel_name,
        channel_handle,
        thumbnail_url,
        subscriber_count,
        description,
        is_public,
        published_at,
        updated_at
      )
      values (
        ${userId},
        'Import pending',
        null,
        null,
        null,
        null,
        true,
        null,
        ${nowIso}
      )
      on conflict (user_id)
      do update set
        updated_at = excluded.updated_at
      returning id
    `;
    const channelId = channelRows[0]?.id || null;
    if (!channelId) {
      return NextResponse.json({ error: "Could not initialize channel import" }, { status: 400 });
    }

    const importRunId = randomUUID();
    await sql`
      insert into public.channel_import_runs (
        id,
        channel_id,
        status,
        source,
        input,
        output,
        error_message,
        started_at,
        updated_at
      )
      values (
        ${importRunId},
        ${channelId},
        'queued',
        'youtube',
        ${JSON.stringify({ channelUrl: channelReference })}::jsonb,
        ${JSON.stringify({
          totalVideos: 0,
          processedVideos: 0,
          mappedVideos: 0,
          skippedVideos: 0,
          stage: "queued",
          progress: 0,
        })}::jsonb,
        null,
        ${nowIso},
        ${nowIso}
      )
    `;

    void importYoutubeChannel({
      userId,
      channelUrl: channelReference,
      importRunId,
    }).catch(async (error) => {
      console.error("[api/youtube/import/start]", error);
      const errorMessage = error instanceof Error ? error.message : "Could not import YouTube channel";
      try {
        await sql`
          update public.channel_import_runs
          set
            status = 'failed',
            error_message = ${errorMessage},
            output = ${JSON.stringify({
              totalVideos: 0,
              processedVideos: 0,
              mappedVideos: 0,
              skippedVideos: 0,
              stage: "failed",
              progress: 0,
            })}::jsonb,
            finished_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
          where id = ${importRunId}
        `;
      } catch (writeError) {
        console.error("[api/youtube/import/start] could not persist failed state", writeError);
      }
    });

    return NextResponse.json({
      import_run_id: importRunId,
      status: "queued",
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
