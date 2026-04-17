import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveYouTubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelUrl: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const channel = await resolveYouTubeChannel(payload.channelUrl);

    return NextResponse.json({
      ok: true,
      youtube_channel_id: channel.youtube_channel_id,
      channel_name: channel.channel_name,
      channel_handle: channel.channel_handle,
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
