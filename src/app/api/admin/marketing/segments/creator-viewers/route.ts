import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  channelId: z.string().uuid().optional().nullable(),
  days: z.coerce.number().int().min(1).max(365).optional().default(90),
  consent: z.enum(["platform", "creator"]).optional().default("platform"),
});

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!userIsSuperAdmin(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const hasSubscriptions = await tableExists("public", "creator_viewer_subscriptions");
    if (!hasSubscriptions) {
      return NextResponse.json({ error: "creator_viewer_subscriptions is not available" }, { status: 400 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.parse({
      channelId: url.searchParams.get("channelId") || null,
      days: url.searchParams.get("days") || undefined,
      consent: url.searchParams.get("consent") || undefined,
    });
    const consentType = parsed.consent === "creator" ? "creator_promotions" : "platform_promotions";

    const rows = await sql<
      Array<{
        viewer_user_id: string;
        email: string;
        username: string;
        display_name: string;
        country_code: string | null;
        city: string | null;
        channel_id: string;
        channel_name: string;
        creator_username: string;
        subscribed_at: string;
        consent_type: string;
        consent_accepted: boolean;
        consent_version: string | null;
        consent_accepted_at: string | null;
      }>
    >`
      select
        u.id as viewer_user_id,
        u.email,
        u.username,
        u.display_name,
        vp.country_code,
        vp.city,
        c.id as channel_id,
        c.channel_name,
        creator.username as creator_username,
        cvs.subscribed_at,
        ${consentType} as consent_type,
        consent.accepted as consent_accepted,
        consent.consent_version,
        consent.accepted_at as consent_accepted_at
      from public.creator_viewer_subscriptions cvs
      inner join public.users u on u.id = cvs.viewer_user_id
      inner join public.channels c on c.id = cvs.channel_id
      inner join public.users creator on creator.id = c.user_id
      left join public.viewer_profiles vp on vp.user_id = u.id
      inner join lateral (
        select accepted, consent_version, accepted_at
        from public.user_consents uc
        where uc.user_id = u.id
          and uc.consent_type = ${consentType}
        order by uc.accepted_at desc
        limit 1
      ) consent on consent.accepted = true
      where cvs.unsubscribed_at is null
        and cvs.subscribed_at >= now() - make_interval(days => ${parsed.days})
        and (${parsed.channelId || null}::uuid is null or cvs.channel_id = ${parsed.channelId || null}::uuid)
      order by cvs.subscribed_at desc
      limit 5000
    `;

    return NextResponse.json({
      consent: parsed.consent,
      consent_type: consentType,
      window_days: parsed.days,
      channel_id: parsed.channelId || null,
      viewers: rows,
    });
  } catch (error) {
    console.error("[api/admin/marketing/segments/creator-viewers GET]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid segment query", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not load marketing segment" }, { status: 500 });
  }
}
