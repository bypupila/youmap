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
          channel_handle: channel.channel_handle,
          total_videos_sampled: readiness.totalVideosSampled,
          extractable_videos_sampled: readiness.extractableVideosSampled,
        },
        { status: 400 }
      );
    }

    if (!readiness.hasExtractableVideos) {
      return NextResponse.json(
        {
          ok: false,
          error: "El canal existe, pero en la muestra solo detectamos Shorts. Necesitamos videos largos para extraer ubicaciones.",
          youtube_channel_id: channel.youtube_channel_id,
          channel_name: channel.channel_name,
          channel_handle: channel.channel_handle,
          total_videos_sampled: readiness.totalVideosSampled,
          extractable_videos_sampled: readiness.extractableVideosSampled,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      youtube_channel_id: channel.youtube_channel_id,
      channel_name: channel.channel_name,
      channel_handle: channel.channel_handle,
      total_videos_sampled: readiness.totalVideosSampled,
      extractable_videos_sampled: readiness.extractableVideosSampled,
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
