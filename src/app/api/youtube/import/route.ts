import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { buildAnalyticsFromVideoLocations } from "@/lib/analytics";
import { createPreviewSession } from "@/lib/preview-session";
import { importYoutubeChannelPreview } from "@/lib/youtube-import";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { hasGeminiApiKey } from "@/lib/gemini";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelUrl: z.string().min(3),
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

function assertImportProvidersConfigured() {
  const missing: string[] = [];

  if (!process.env.YOUTUBE_API_KEY) missing.push("YOUTUBE_API_KEY");

  if (missing.length > 0) {
    throw new Error(`Configura ${missing.join(" y ")} en .env.local para probar el import real con YouTube.`);
  }
}

async function createPreviewImportResponse(channelUrl: string) {
  assertImportProvidersConfigured();
  if (!hasGeminiApiKey()) {
    console.warn("[api/youtube/import] Gemini API key missing. Using heuristic fallback for location extraction.");
  }

  const previewImport = await importYoutubeChannelPreview(channelUrl);
  const previewSession = await createPreviewSession({
    channel: previewImport.channel,
    videoLocations: previewImport.videoLocations,
    analytics: buildAnalyticsFromVideoLocations(previewImport.videoLocations, {
      importedVideos: previewImport.importedVideos,
    }),
    importedVideos: previewImport.importedVideos,
    mappedVideos: previewImport.mappedVideos,
    skippedVideos: previewImport.skippedVideos,
  });

  return {
    ...previewImport,
    preview_session_id: previewSession.id,
    preview_mode: true,
  };
}

export async function POST(request: Request) {
  try {
    const isDemoMode = new URL(request.url).searchParams.get("demo") === "1";
    const payload = payloadSchema.parse(await request.json());

    if (isDemoMode) {
      return NextResponse.json({
        import_run_id: "demo-import-run",
        channel: DEMO_CHANNEL,
        videoLocations: DEMO_VIDEO_LOCATIONS,
        importedVideos: DEMO_VIDEO_LOCATIONS.length,
        mappedVideos: DEMO_VIDEO_LOCATIONS.length,
        skippedVideos: 0,
        channelSource: {
          youtube_channel_id: "UCDEMO001",
          channel_name: DEMO_CHANNEL.channel_name,
          channel_handle: DEMO_CHANNEL.channel_handle,
          uploads_playlist_id: "UUDEMO001",
        },
        demo: true,
        channel_slug: DEMO_CHANNEL_SLUG,
      });
    }

    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(await createPreviewImportResponse(payload.channelUrl));
    }

    assertImportProvidersConfigured();
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
      throw new Error("Could not initialize channel import");
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
        ${JSON.stringify({ channelUrl: payload.channelUrl })}::jsonb,
        ${JSON.stringify({
          totalVideos: 0,
          processedVideos: 0,
          mappedVideos: 0,
          skippedVideos: 0,
          countriesMapped: 0,
          totalViews: 0,
          stage: "queued",
          progress: 0,
          providerErrors: {
            youtube: 0,
            nominatim: 0,
            gemini: 0,
            database: 0,
            unknown: 0,
          },
        })}::jsonb,
        null,
        ${nowIso},
        ${nowIso}
      )
    `;

    return NextResponse.json({
      import_run_id: importRunId,
      status: "queued",
      channel_id: channelId,
    });
  } catch (error) {
    console.error("[api/youtube/import]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not import YouTube channel",
      },
      { status: 400 }
    );
  }
}
