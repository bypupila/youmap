import { NextResponse } from "next/server";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runStats = await sql<
      Array<{
        total_runs: number | string;
        completed_runs: number | string;
        failed_runs: number | string;
        queued_runs: number | string;
        running_runs: number | string;
        avg_duration_seconds: number | string | null;
      }>
    >`
      select
        count(*)::int as total_runs,
        count(*) filter (where cir.status = 'completed')::int as completed_runs,
        count(*) filter (where cir.status = 'failed')::int as failed_runs,
        count(*) filter (where cir.status = 'queued')::int as queued_runs,
        count(*) filter (where cir.status = 'running')::int as running_runs,
        avg(extract(epoch from (cir.finished_at - cir.started_at))) filter (where cir.status = 'completed' and cir.finished_at is not null and cir.started_at is not null) as avg_duration_seconds
      from public.channel_import_runs cir
      inner join public.channels c on c.id = cir.channel_id
      where c.user_id = ${userId}
    `;

    const locationStats = await sql<
      Array<{
        total_videos: number | string;
        verified_auto: number | string;
        verified_manual: number | string;
        needs_manual: number | string;
        failed_location: number | string;
      }>
    >`
      select
        count(*)::int as total_videos,
        count(*) filter (where v.location_status in ('mapped', 'verified_auto'))::int as verified_auto,
        count(*) filter (where v.location_status = 'verified_manual')::int as verified_manual,
        count(*) filter (where v.location_status = 'needs_manual')::int as needs_manual,
        count(*) filter (where v.location_status in ('failed', 'no_location'))::int as failed_location
      from public.videos v
      inner join public.channels c on c.id = v.channel_id
      where c.user_id = ${userId}
    `;

    const run = runStats[0];
    const loc = locationStats[0];
    const totalRuns = Number(run?.total_runs || 0);
    const completedRuns = Number(run?.completed_runs || 0);
    const totalVideos = Number(loc?.total_videos || 0);
    const needsManual = Number(loc?.needs_manual || 0);

    return NextResponse.json({
      runs: {
        total: totalRuns,
        completed: completedRuns,
        failed: Number(run?.failed_runs || 0),
        queued: Number(run?.queued_runs || 0),
        running: Number(run?.running_runs || 0),
        successRate: totalRuns > 0 ? Number((completedRuns / totalRuns).toFixed(4)) : 0,
        avgDurationSeconds: Number(run?.avg_duration_seconds || 0) || 0,
      },
      locations: {
        totalVideos,
        verifiedAuto: Number(loc?.verified_auto || 0),
        verifiedManual: Number(loc?.verified_manual || 0),
        needsManual,
        failedOrNoLocation: Number(loc?.failed_location || 0),
        needsManualRatio: totalVideos > 0 ? Number((needsManual / totalVideos).toFixed(4)) : 0,
      },
    });
  } catch (error) {
    console.error("[api/youtube/import/metrics]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load import metrics",
      },
      { status: 400 }
    );
  }
}
