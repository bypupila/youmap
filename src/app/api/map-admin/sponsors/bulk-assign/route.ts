import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const payloadSchema = z
  .object({
    channelId: z.string().uuid(),
    sponsorId: z.string().uuid(),
    videoIds: z.array(z.string().uuid()).min(1).max(1000),
    preview: z.boolean().optional().default(false),
    reason: z.string().trim().max(400).optional().nullable(),
    setPrimary: z.boolean().optional().default(true),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = payloadSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) {
      return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    }

    if (!payload.preview && !String(payload.reason || "").trim()) {
      return NextResponse.json({ error: "El motivo es obligatorio para asignacion masiva." }, { status: 400 });
    }

    const hasSponsorVideoRules = await tableExists("public", "sponsor_video_rules");
    if (!hasSponsorVideoRules) {
      return NextResponse.json({ error: "La tabla sponsor_video_rules no existe en este entorno." }, { status: 400 });
    }

    const sponsorRows = await sql<Array<{ id: string; brand_name: string }>>`
      select id, brand_name
      from public.sponsors
      where id = ${payload.sponsorId}
        and user_id = ${access.ownerUserId}
        and active = true
      limit 1
    `;
    const sponsor = sponsorRows[0] || null;
    if (!sponsor) return NextResponse.json({ error: "Sponsor no encontrado." }, { status: 404 });

    const uniqueVideoIds = Array.from(new Set(payload.videoIds));
    const videoRows = await sql.query<Array<{ id: string; title: string }>>(
      `
        select id, title
        from public.videos
        where channel_id = $1
          and id = any($2::uuid[])
      `,
      [payload.channelId, uniqueVideoIds]
    );
    const validVideoIds = videoRows.map((row) => row.id);
    const validVideoSet = new Set(validVideoIds);
    const skippedVideoIds = uniqueVideoIds.filter((videoId) => !validVideoSet.has(videoId));

    if (payload.preview) {
      return NextResponse.json({
        ok: true,
        preview: true,
        sponsorId: sponsor.id,
        sponsorName: sponsor.brand_name,
        requested: uniqueVideoIds.length,
        applicable: validVideoIds.length,
        skipped: skippedVideoIds.length,
        skippedVideoIds,
      });
    }

    if (!validVideoIds.length) {
      return NextResponse.json({ error: "No hay videos validos para asignar." }, { status: 400 });
    }

    if (payload.setPrimary) {
      await sql.query(
        `
          update public.sponsor_video_rules
          set is_primary = false, updated_at = now()
          where video_id = any($1::uuid[])
            and sponsor_id <> $2
            and is_primary = true
        `,
        [validVideoIds, sponsor.id]
      );
    }

    for (const videoId of validVideoIds) {
      await sql`
        insert into public.sponsor_video_rules (sponsor_id, video_id, priority, is_primary, created_at, updated_at)
        values (${sponsor.id}, ${videoId}, 100, ${payload.setPrimary}, now(), now())
        on conflict (sponsor_id, video_id)
        do update set
          is_primary = excluded.is_primary,
          updated_at = now()
      `;
    }

    await sql.query(
      `
        update public.videos
        set
          sponsor_detection_status = 'confirmado',
          sponsor_detectado_texto = coalesce(sponsor_detectado_texto, $2),
          sponsor_detectado_confianza = 1,
          sponsor_detectado_fuente = 'manual_admin',
          updated_at = now()
        where channel_id = $1
          and id = any($3::uuid[])
      `,
      [payload.channelId, sponsor.brand_name, validVideoIds]
    );

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_bulk_assigned",
      entityType: "bulk",
      entityId: sponsor.id,
      description: `${sessionUser.username} asigno masivamente sponsor "${sponsor.brand_name}"`,
      metadata: {
        sponsorId: sponsor.id,
        sponsorName: sponsor.brand_name,
        requested: uniqueVideoIds.length,
        applied: validVideoIds.length,
        skipped: skippedVideoIds.length,
        skippedVideoIds,
        reason: payload.reason || null,
        setPrimary: payload.setPrimary,
      },
    });

    return NextResponse.json({
      ok: true,
      sponsorId: sponsor.id,
      sponsorName: sponsor.brand_name,
      requested: uniqueVideoIds.length,
      applied: validVideoIds.length,
      skipped: skippedVideoIds.length,
      skippedVideoIds,
    });
  } catch (error) {
    console.error("[api/map-admin/sponsors/bulk-assign POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid bulk assign payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not bulk assign sponsor" }, { status: 400 });
  }
}
