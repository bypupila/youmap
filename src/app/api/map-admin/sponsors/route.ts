import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { columnExists, tableExists } from "@/lib/db-schema";
import { normalizeCountryCode } from "@/lib/map-polls";
import { sql } from "@/lib/neon";
import { normalizeSponsorCardStyle } from "@/lib/sponsor-card-style";
import { normalizeExternalSponsorUrl, normalizeSponsorLogoUrl } from "@/lib/sponsor-url";

export const dynamic = "force-dynamic";

const sponsorPayloadSchema = z.object({
  channelId: z.string().uuid(),
  sponsorId: z.string().uuid().optional().nullable(),
  brand_name: z.string().trim().min(2).max(120),
  logo_url: z.string().trim().optional().nullable(),
  website_url: z.string().trim().optional().nullable(),
  affiliate_url: z.string().trim().optional().nullable(),
  discount_code: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(80).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  category_name: z.string().trim().max(60).optional().nullable(),
  action_type: z.enum(["link", "coupon"]).default("link"),
  action_value: z.string().trim().max(160).optional().nullable(),
  cta_label: z.string().trim().max(60).optional().nullable(),
  sponsor_card_style: z.enum(["cta_red", "coupon_yellow", "premium_strip"]).optional().nullable(),
  display_order: z.number().int().min(0).max(1_000_000).optional().nullable(),
  scope: z.enum(["global", "country", "video"]),
  country_codes: z.array(z.string().trim().length(2)).default([]),
  video_ids: z.array(z.string().uuid()).default([]),
  active: z.boolean().default(true),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  internal_notes: z.string().trim().max(1000).optional().nullable(),
});

function cleanText(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function normalizeCategorySlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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
  const logoUrl = normalizeSponsorLogoUrl(payload.logo_url);
  if (String(payload.logo_url || "").trim() && !logoUrl) {
    throw new Error("Logo URL inválida.");
  }
  const websiteUrl = normalizeExternalSponsorUrl(payload.website_url);
  if (String(payload.website_url || "").trim() && !websiteUrl) {
    throw new Error("Website URL inválida.");
  }
  const affiliateUrl = normalizeExternalSponsorUrl(payload.affiliate_url);
  if (String(payload.affiliate_url || "").trim() && !affiliateUrl) {
    throw new Error("Affiliate URL inválida.");
  }
  return {
    ...payload,
    logo_url: logoUrl,
    website_url: websiteUrl,
    affiliate_url: affiliateUrl,
    category_name: cleanText(payload.category_name),
    action_value: cleanText(payload.action_value),
    cta_label: cleanText(payload.cta_label),
    sponsor_card_style: normalizeSponsorCardStyle(payload.sponsor_card_style),
    country_codes: payload.scope === "country" ? countryCodes : [],
    video_ids: payload.scope === "video" ? videoIds : [],
  };
}

async function getSponsorSchemaFeatures() {
  const [
    hasSponsorVideoRules,
    hasStartDate,
    hasEndDate,
    hasInternalNotes,
    hasCategoryId,
    hasSponsorCardStyle,
    hasActionType,
    hasActionValue,
    hasCtaLabel,
    hasDisplayOrder,
    hasSponsorCategories,
  ] = await Promise.all([
    tableExists("public", "sponsor_video_rules"),
    columnExists("public", "sponsors", "start_date"),
    columnExists("public", "sponsors", "end_date"),
    columnExists("public", "sponsors", "internal_notes"),
    columnExists("public", "sponsors", "category_id"),
    columnExists("public", "sponsors", "sponsor_card_style"),
    columnExists("public", "sponsors", "action_type"),
    columnExists("public", "sponsors", "action_value"),
    columnExists("public", "sponsors", "cta_label"),
    columnExists("public", "sponsors", "display_order"),
    tableExists("public", "sponsor_categories"),
  ]);

  return {
    hasSponsorVideoRules,
    hasDates: hasStartDate && hasEndDate,
    hasInternalNotes,
    hasCategoryId,
    hasSponsorCardStyle,
    hasActionType,
    hasActionValue,
    hasCtaLabel,
    hasDisplayOrder,
    hasSponsorCategories,
  };
}

async function resolveSponsorCategoryId(
  payload: ReturnType<typeof normalizeSponsorPayload>,
  ownerUserId: string,
  schema: Awaited<ReturnType<typeof getSponsorSchemaFeatures>>
) {
  if (!schema.hasCategoryId || !schema.hasSponsorCategories) return null;

  if (payload.category_name) {
    const normalizedSlug = normalizeCategorySlug(payload.category_name);
    if (!normalizedSlug) throw new Error("La categoría personalizada no es válida.");
    const rows = await sql<Array<{ id: string }>>`
      insert into public.sponsor_categories (user_id, name, slug)
      values (${ownerUserId}, ${payload.category_name}, ${normalizedSlug})
      on conflict (user_id, slug)
      do update set name = excluded.name, updated_at = now()
      returning id
    `;
    return rows[0]?.id || null;
  }

  if (!payload.category_id) return null;
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.sponsor_categories
    where id = ${payload.category_id}
      and user_id = ${ownerUserId}
    limit 1
  `;
  if (!rows[0]?.id) {
    throw new Error("La categoría seleccionada no pertenece a este perfil.");
  }
  return rows[0].id;
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
    const resolvedCategoryId = await resolveSponsorCategoryId(payload, access.ownerUserId, schema);

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
    if (schema.hasCategoryId) {
      insertColumns.push("category_id");
      insertValues.push(resolvedCategoryId);
    }
    if (schema.hasSponsorCardStyle) {
      insertColumns.push("sponsor_card_style");
      insertValues.push(payload.sponsor_card_style || null);
    }
    if (schema.hasActionType) {
      insertColumns.push("action_type");
      insertValues.push(payload.action_type);
    }
    if (schema.hasActionValue) {
      insertColumns.push("action_value");
      insertValues.push(payload.action_value || null);
    }
    if (schema.hasCtaLabel) {
      insertColumns.push("cta_label");
      insertValues.push(payload.cta_label || null);
    }
    if (schema.hasDisplayOrder) {
      insertColumns.push("display_order");
      insertValues.push(payload.display_order ?? 100);
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
      metadata: { scope: payload.scope, action_type: payload.action_type, category_id: resolvedCategoryId },
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
    const resolvedCategoryId = await resolveSponsorCategoryId(payload, access.ownerUserId, schema);

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
    if (schema.hasCategoryId) {
      setClauses.push(`category_id = $${updateValues.length + 1}`);
      updateValues.push(resolvedCategoryId);
    }
    if (schema.hasSponsorCardStyle) {
      setClauses.push(`sponsor_card_style = $${updateValues.length + 1}`);
      updateValues.push(payload.sponsor_card_style || null);
    }
    if (schema.hasActionType) {
      setClauses.push(`action_type = $${updateValues.length + 1}`);
      updateValues.push(payload.action_type);
    }
    if (schema.hasActionValue) {
      setClauses.push(`action_value = $${updateValues.length + 1}`);
      updateValues.push(payload.action_value || null);
    }
    if (schema.hasCtaLabel) {
      setClauses.push(`cta_label = $${updateValues.length + 1}`);
      updateValues.push(payload.cta_label || null);
    }
    if (schema.hasDisplayOrder && typeof payload.display_order === "number") {
      setClauses.push(`display_order = $${updateValues.length + 1}`);
      updateValues.push(payload.display_order);
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
      metadata: { scope: payload.scope, action_type: payload.action_type, category_id: resolvedCategoryId },
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
