import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { buildAbsoluteMediaKitUrl, loadCreatorMediaKit, saveMediaKitSettings } from "@/lib/media-kit";

export const dynamic = "force-dynamic";

const mediaKitSchema = z.object({
  channelId: z.string().uuid(),
  public_enabled: z.boolean(),
  headline: z.string().trim().max(140).optional().nullable(),
  bio: z.string().trim().max(900).optional().nullable(),
  audience_note: z.string().trim().max(500).optional().nullable(),
  partnership_email: z.string().trim().email().max(180).optional().or(z.literal("")).nullable(),
  rate_card_url: z.string().trim().max(280).optional().or(z.literal("")).nullable(),
  preferred_cta_label: z.string().trim().max(80).optional().nullable(),
  featured_country_codes: z.array(z.string().trim().length(2)).max(12).default([]),
});

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId") || "";
    if (!z.string().uuid().safeParse(channelId).success) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const access = await requireCreatorChannelAccess(channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const mediaKit = await loadCreatorMediaKit(channelId);
    if (!mediaKit) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    return NextResponse.json({
      mediaKit: {
        ...mediaKit,
        urls: {
          ...mediaKit.urls,
          absoluteMediaKitUrl: buildAbsoluteMediaKitUrl(requestOrigin(request), mediaKit.urls.mediaKitUrl),
        },
      },
    });
  } catch (error) {
    console.error("[api/creator/media-kit GET]", error);
    return NextResponse.json({ error: "Could not load media kit" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = mediaKitSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    if (payload.rate_card_url && !isValidUrl(payload.rate_card_url)) {
      return NextResponse.json({ error: "La URL del rate card no es valida." }, { status: 400 });
    }

    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    await saveMediaKitSettings(payload);
    const mediaKit = await loadCreatorMediaKit(payload.channelId);

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "media_kit_updated",
      entityType: "sponsor",
      entityId: null,
      description: `${sessionUser.username} actualizo el media kit`,
      metadata: { public_enabled: payload.public_enabled },
    });

    return NextResponse.json({
      ok: true,
      mediaKit: mediaKit
        ? {
            ...mediaKit,
            urls: {
              ...mediaKit.urls,
              absoluteMediaKitUrl: buildAbsoluteMediaKitUrl(requestOrigin(request), mediaKit.urls.mediaKitUrl),
            },
          }
        : null,
    });
  } catch (error) {
    console.error("[api/creator/media-kit PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid media kit payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save media kit" },
      { status: 400 }
    );
  }
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
