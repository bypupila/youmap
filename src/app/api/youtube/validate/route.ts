import { NextResponse } from "next/server";
import { z } from "zod";
import { getChannelImportReadiness, resolveYouTubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelUrl: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const channel = await resolveYouTubeChannel(payload.channelUrl);
    const readiness = await getChannelImportReadiness(channel);

    if (!readiness.hasAnyVideos) {
      return NextResponse.json(
        {
          ok: false,
          error: "El canal existe, pero no encontramos videos publicados para extraer.",
          youtube_channel_id: channel.youtube_channel_id,
          channel_name: channel.channel_name,
          canonical_url: channel.channel_handle ? `https://www.youtube.com/${channel.channel_handle}` : `https://www.youtube.com/channel/${channel.youtube_channel_id}`,
          total_videos_sampled: readiness.totalVideosSampled,
          total_videos: channel.total_video_count,
          total_views: channel.total_view_count,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      youtube_channel_id: channel.youtube_channel_id,
      channel_name: channel.channel_name,
      canonical_url: channel.channel_handle ? `https://www.youtube.com/${channel.channel_handle}` : `https://www.youtube.com/channel/${channel.youtube_channel_id}`,
      total_videos_sampled: readiness.totalVideosSampled,
      total_videos: channel.total_video_count,
      total_views: channel.total_view_count,
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
