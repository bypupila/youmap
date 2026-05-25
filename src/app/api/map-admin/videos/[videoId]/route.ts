import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { columnExists } from "@/lib/db-schema";
import { geocodeLocation } from "@/lib/geocode";
import { normalizeCountryCode } from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const locationSchema = z.object({
  country_code: z.string().trim().length(2),
  country_name: z.string().trim().min(1).optional().nullable(),
  lat: z.number().finite().optional().nullable(),
  lng: z.number().finite().optional().nullable(),
  label_public: z.string().trim().max(160).optional().nullable(),
  verification_source: z.enum(["heuristic", "nominatim", "gemini", "manual", "youtube_recording_details"]).optional().nullable(),
  internal_notes: z.string().trim().max(1000).optional().nullable(),
}).strict();

const patchSchema = z.object({
  channelId: z.string().uuid(),
  visible_on_map: z.boolean().optional(),
  featured: z.boolean().optional(),
  internal_notes: z.string().trim().max(1000).optional().nullable(),
  location: locationSchema.optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId } = await params;
    const payload = patchSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    const [hasVisibleOnMap, hasFeatured, hasVideoInternalNotes, hasLocationInternalNotes] = await Promise.all([
      columnExists("public", "videos", "visible_on_map"),
      columnExists("public", "videos", "featured"),
      columnExists("public", "videos", "internal_notes"),
      columnExists("public", "video_locations", "internal_notes"),
    ]);

    const videoRows = await sql<Array<{ id: string; title: string }>>`
      select id, title
      from public.videos
      where id = ${videoId}
        and channel_id = ${payload.channelId}
      limit 1
    `;
    const video = videoRows[0] || null;
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    if (
      typeof payload.visible_on_map === "boolean" ||
      typeof payload.featured === "boolean" ||
      typeof payload.internal_notes !== "undefined"
    ) {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      if (hasVisibleOnMap && typeof payload.visible_on_map === "boolean") {
        values.push(payload.visible_on_map);
        setClauses.push(`visible_on_map = $${values.length}`);
      }
      if (hasFeatured && typeof payload.featured === "boolean") {
        values.push(payload.featured);
        setClauses.push(`featured = $${values.length}`);
      }
      if (hasVideoInternalNotes && typeof payload.internal_notes !== "undefined") {
        values.push(payload.internal_notes ?? null);
        setClauses.push(`internal_notes = $${values.length}`);
      }
      if (setClauses.length > 0) {
        values.push(videoId, payload.channelId);
        await sql.query(
          `update public.videos
           set ${setClauses.join(", ")}, updated_at = now()
           where id = $${values.length - 1}
             and channel_id = $${values.length}`,
          values
        );
      }
    }

    if (payload.location) {
      const input = payload.location;
      const countryCode = normalizeCountryCode(input.country_code);
      let lat = input.lat ?? null;
      let lng = input.lng ?? null;
      let countryName = input.country_name || countryCode;
      let label = input.label_public || countryName;
      let evidence: Record<string, unknown> = { source: "manual_admin" };

      if (lat === null || lng === null) {
        const query = [countryName || countryCode].filter(Boolean).join(", ");
        const match = await geocodeLocation(query);
        if (!match?.lat || !match?.lng) {
          return NextResponse.json(
            { error: "No se pudo geocodificar la ubicacion. Ingresa latitud y longitud." },
            { status: 422 }
          );
        }
        lat = match.lat;
        lng = match.lng;
        countryName = match.countryName || countryName;
        label = input.label_public || countryName;
        evidence = { source: "nominatim", raw: match.raw };
      }

      await sql`
        update public.video_locations
        set is_primary = false, updated_at = now()
        where video_id = ${videoId}
          and channel_id = ${payload.channelId}
      `;

      const existingRows = await sql<Array<{ id: string }>>`
        select id
        from public.video_locations
        where video_id = ${videoId}
          and channel_id = ${payload.channelId}
        order by updated_at desc
        limit 1
      `;
      const existingId = existingRows[0]?.id || null;

      if (existingId) {
        const setClauses = [
          "is_primary = true",
          "country_code = $1",
          "country_name = $2",
          "location_label = $3",
          "city = $4",
          "region = $5",
          "lat = $6",
          "lng = $7",
          "verification_source = $8",
          "source = 'manual'",
          "location_evidence = $9::jsonb",
        ];
        const values: unknown[] = [
          countryCode,
          countryName,
          label || null,
          null,
          null,
          lat,
          lng,
          input.verification_source || "manual",
          JSON.stringify(evidence),
        ];
        if (hasLocationInternalNotes) {
          values.push(input.internal_notes || null);
          setClauses.push(`internal_notes = $${values.length}`);
        }
        values.push(existingId);
        await sql.query(
          `update public.video_locations
           set ${setClauses.join(", ")}, updated_at = now()
           where id = $${values.length}`,
          values
        );
      } else {
        const columns = [
          "channel_id",
          "video_id",
          "is_primary",
          "country_code",
          "country_name",
          "location_label",
          "city",
          "region",
          "lat",
          "lng",
          "verification_source",
          "source",
          "location_evidence",
        ];
        const values: unknown[] = [
          payload.channelId,
          videoId,
          true,
          countryCode,
          countryName,
          label || null,
          null,
          null,
          lat,
          lng,
          input.verification_source || "manual",
          "manual",
          JSON.stringify(evidence),
        ];
        if (hasLocationInternalNotes) {
          columns.push("internal_notes");
          values.push(input.internal_notes || null);
        }
        const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
        await sql.query(
          `insert into public.video_locations (${columns.join(", ")})
           values (${placeholders})`,
          values
        );
      }

      await sql`
        update public.videos
        set location_status = 'verified_manual', verification_source = 'manual', updated_at = now()
        where id = ${videoId}
          and channel_id = ${payload.channelId}
      `;
    }

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: payload.location ? "location_edited" : "video_edited",
      entityType: "video",
      entityId: videoId,
      description: payload.location
        ? `${sessionUser.username} edito la ubicacion de "${video.title}"`
        : `${sessionUser.username} actualizo "${video.title}"`,
      metadata: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/map-admin/videos PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid video update payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not update video" }, { status: 500 });
  }
}
