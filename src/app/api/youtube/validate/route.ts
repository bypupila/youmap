import { NextResponse } from "next/server";
import { z } from "zod";
import { validateYouTubeChannelWithoutApiKey } from "@/lib/youtube-public";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelUrl: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const channel = await validateYouTubeChannelWithoutApiKey(payload.channelUrl);

    if (!channel.hasVideos) {
      return NextResponse.json(
        {
          ok: false,
          error: "El canal existe, pero no encontramos videos publicados para extraer.",
          youtube_channel_id: channel.channelId,
          channel_name: channel.channelName,
          canonical_url: channel.canonicalUrl,
          total_videos_sampled: channel.videosSampled,
          total_videos: channel.totalVideos,
          total_views: channel.totalViews,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      youtube_channel_id: channel.channelId,
      channel_name: channel.channelName,
      canonical_url: channel.canonicalUrl,
      total_videos_sampled: channel.videosSampled,
      total_videos: channel.totalVideos,
      total_views: channel.totalViews,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No pudimos validar ese canal.",
      },
      { status: 400 }
    );
  }
}
