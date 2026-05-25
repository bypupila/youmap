import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { columnExists, tableExists } from "@/lib/db-schema";
import { normalizeCountryCode } from "@/lib/map-polls";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const sponsorPayloadSchema = z.object({
  channelId: z.string().uuid(),
  sponsorId: z.string().uuid().optional().nullable(),
  brand_name: z.string().trim().min(2).max(120),
  logo_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  website_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  affiliate_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  discount_code: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(80).optional().nullable(),
  scope: z.enum(["global", "country", "video"]),
  country_codes: z.array(z.string().trim().length(2)).default([]),
  video_ids: z.array(z.string().uuid()).default([]),
  active: z.boolean().default(true),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  internal_notes: z.string().trim().max(1000).optional().nullable(),
});

function cleanUrl(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function normalizeSponsorPayload(payload: z.infer<typeof sponsorPayloadSchema>) {
  const countryCodes = Array.from(new Set(payload.country_codes.map(normalizeCountryCode).filter(Boolean)));
  const videoIds = Array.from(new Set(payload.video_ids));
  if (payload.scope === "country" && countryCodes.length === 0) {
    throw new Error("Selecciona al menos un pais para el sponsor.");
  }
  if (payload.scope === "video" && videoIds.length === 0) {
    throw new Error("Selecciona al menos un video para el sponsor.");
  }
  return {
    ...payload,
    logo_url: cleanUrl(payload.logo_url),
    website_url: cleanUrl(payload.website_url),
    affiliate_url: cleanUrl(payload.affiliate_url),
    country_codes: payload.scope === "country" ? countryCodes : [],
    video_ids: payload.scope === "video" ? videoIds : [],
  };
}

async function getSponsorSchemaFeatures() {
  const [hasSponsorVideoRules, hasStartDate, hasEndDate, hasInternalNotes] = await Promise.all([
    tableExists("public", "sponsor_video_rules"),
    columnExists("public", "sponsors", "start_date"),
    columnExists("public", "sponsors", "end_date"),
    columnExists("public", "sponsors", "internal_notes"),
  ]);

  return {
    hasSponsorVideoRules,
    hasDates: hasStartDate && hasEndDate,
    hasInternalNotes,
  };
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = normalizeSponsorPayload(sponsorPayloadSchema.parse(await request.json()));
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    const schema = await getSponsorSchemaFeatures();

    const duplicateRows = await sql<Array<{ id: string }>>`
      select id
      from public.sponsors
      where user_id = ${access.ownerUserId}
        and lower(brand_name) = lower(${payload.brand_name})
        and active = true
      limit 1
    `;
    if (duplicateRows[0]) {
      return NextResponse.json({ error: "Ya existe un sponsor activo con ese nombre." }, { status: 409 });
    }

    const insertColumns = [
      "user_id",
      "brand_name",
      "logo_url",
      "website_url",
      "affiliate_url",
      "discount_code",
      "description",
      "active",
    ];
    const insertValues: unknown[] = [
      access.ownerUserId,
      payload.brand_name,
      payload.logo_url,
      payload.website_url,
      payload.affiliate_url,
      payload.discount_code || null,
      payload.description || null,
      payload.active,
    ];
    if (schema.hasDates) {
      insertColumns.push("start_date", "end_date");
      insertValues.push(payload.start_date || null, payload.end_date || null);
    }
    if (schema.hasInternalNotes) {
      insertColumns.push("internal_notes");
      insertValues.push(payload.internal_notes || null);
    }
    const valuePlaceholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");
    const rows = await sql.query<Array<{ id: string }>>(
      `insert into public.sponsors (${insertColumns.join(", ")})
       values (${valuePlaceholders})
       returning id`,
      insertValues
    );
    const sponsorId = rows[0]?.id;
    if (!sponsorId) return NextResponse.json({ error: "Failed to create sponsor" }, { status: 400 });

    await replaceSponsorScope(sponsorId, payload.scope, payload.country_codes, payload.video_ids, schema.hasSponsorVideoRules);
    if (payload.scope === "video" && payload.video_ids.length > 0) {
      await markVideosSponsorConfirmed(payload.channelId, payload.video_ids, payload.brand_name);
    }
    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_created",
      entityType: "sponsor",
      entityId: sponsorId,
      description: `${sessionUser.username} creo el sponsor "${payload.brand_name}"`,
      metadata: { scope: payload.scope },
    });

    return NextResponse.json({ ok: true, id: sponsorId });
  } catch (error) {
    console.error("[api/map-admin/sponsors POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save sponsor" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = normalizeSponsorPayload(sponsorPayloadSchema.extend({ sponsorId: z.string().uuid() }).parse(await request.json()));
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });
    const schema = await getSponsorSchemaFeatures();

    const setClauses = [
      "brand_name = $1",
      "logo_url = $2",
      "website_url = $3",
      "affiliate_url = $4",
      "discount_code = $5",
      "description = $6",
      "active = $7",
    ];
    const updateValues: unknown[] = [
      payload.brand_name,
      payload.logo_url,
      payload.website_url,
      payload.affiliate_url,
      payload.discount_code || null,
      payload.description || null,
      payload.active,
    ];
    if (schema.hasDates) {
      setClauses.push(`start_date = $${updateValues.length + 1}`);
      updateValues.push(payload.start_date || null);
      setClauses.push(`end_date = $${updateValues.length + 1}`);
      updateValues.push(payload.end_date || null);
    }
    if (schema.hasInternalNotes) {
      setClauses.push(`internal_notes = $${updateValues.length + 1}`);
      updateValues.push(payload.internal_notes || null);
    }
    updateValues.push(payload.sponsorId, access.ownerUserId);
    const rows = await sql.query<Array<{ id: string }>>(
      `update public.sponsors
       set ${setClauses.join(", ")}, updated_at = now()
       where id = $${updateValues.length - 1}
         and user_id = $${updateValues.length}
       returning id`,
      updateValues
    );
    const sponsorId = rows[0]?.id;
    if (!sponsorId) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

    await replaceSponsorScope(sponsorId, payload.scope, payload.country_codes, payload.video_ids, schema.hasSponsorVideoRules);
    if (payload.scope === "video" && payload.video_ids.length > 0) {
      await markVideosSponsorConfirmed(payload.channelId, payload.video_ids, payload.brand_name);
    }
    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: payload.active ? "sponsor_edited" : "sponsor_paused",
      entityType: "sponsor",
      entityId: sponsorId,
      description: `${sessionUser.username} actualizo el sponsor "${payload.brand_name}"`,
      metadata: { scope: payload.scope },
    });

    return NextResponse.json({ ok: true, id: sponsorId });
  } catch (error) {
    console.error("[api/map-admin/sponsors PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update sponsor" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const channelId = String(url.searchParams.get("channelId") || "");
    const sponsorId = String(url.searchParams.get("sponsorId") || "");
    const parsed = z.object({ channelId: z.string().uuid(), sponsorId: z.string().uuid() }).parse({ channelId, sponsorId });
    if (isDemoChannelId(parsed.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(parsed.channelId, sessionUser.id);
    if (!access?.ownerUserId) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const rows = await sql<Array<{ id: string; brand_name: string }>>`
      update public.sponsors
      set active = false, updated_at = now()
      where id = ${parsed.sponsorId}
        and user_id = ${access.ownerUserId}
      returning id, brand_name
    `;
    const sponsor = rows[0] || null;
    if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

    await recordCreatorActivity({
      channelId: parsed.channelId,
      actorUserId: sessionUser.id,
      eventType: "sponsor_paused",
      entityType: "sponsor",
      entityId: sponsor.id,
      description: `${sessionUser.username} pauso el sponsor "${sponsor.brand_name}"`,
    });

    return NextResponse.json({ ok: true, id: sponsor.id });
  } catch (error) {
    console.error("[api/map-admin/sponsors DELETE]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor delete payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not delete sponsor" }, { status: 500 });
  }
}

async function replaceSponsorScope(
  sponsorId: string,
  scope: "global" | "country" | "video",
  countryCodes: string[],
  videoIds: string[],
  hasSponsorVideoRules: boolean
) {
  await sql`delete from public.sponsor_geo_rules where sponsor_id = ${sponsorId}`;
  if (hasSponsorVideoRules) {
    await sql`delete from public.sponsor_video_rules where sponsor_id = ${sponsorId}`;
  }

  if (scope === "global") {
    await sql`
      insert into public.sponsor_geo_rules (sponsor_id, country_code, priority)
      values (${sponsorId}, null, 0)
    `;
    return;
  }

  if (scope === "country") {
    for (const countryCode of countryCodes) {
      await sql`
        insert into public.sponsor_geo_rules (sponsor_id, country_code, priority)
        values (${sponsorId}, ${countryCode}, 10)
      `;
    }
    return;
  }

  if (!hasSponsorVideoRules) {
    throw new Error("Falta la tabla sponsor_video_rules. Aplica la migracion 0010 para usar scope por video.");
  }

  for (const videoId of videoIds) {
    await sql`
      insert into public.sponsor_video_rules (sponsor_id, video_id, priority)
      values (${sponsorId}, ${videoId}, 10)
    `;
  }
}

async function markVideosSponsorConfirmed(channelId: string, videoIds: string[], brandName: string) {
  if (!videoIds.length) return;
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
    [channelId, brandName, Array.from(new Set(videoIds))]
  );
}
