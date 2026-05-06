import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { DEMO_CHANNEL_ID } from "@/lib/demo-data";
import { sql } from "@/lib/neon";
import { normalizeSponsorInquiryStatus, SPONSOR_INQUIRY_STATUSES } from "@/lib/sponsor-inquiries";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const updatePayloadSchema = z.object({
  inquiryId: z.string().uuid(),
  status: z.enum(SPONSOR_INQUIRY_STATUSES),
});

const demoInquiries = [
  {
    id: "77777777-7777-4777-8777-777777777771",
    channel_id: DEMO_CHANNEL_ID,
    channel_name: "BY PUPILA",
    brand_name: "Nomad Gear",
    contact_name: "Marta Ruiz",
    contact_email: "marta@nomadgear.com",
    website_url: "https://nomadgear.example",
    whatsapp: "+34 600 000 001",
    proposed_budget_usd: 1800,
    brief: "Queremos una activacion de 30 dias para rutas de Japon y Seoul con CTA de compra.",
    status: "new",
    source: "map_viewer_cta",
    map_url: "https://travelyourmap.bypupila.com/u/demo",
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "77777777-7777-4777-8777-777777777772",
    channel_id: DEMO_CHANNEL_ID,
    channel_name: "BY PUPILA",
    brand_name: "Andes Outdoor",
    contact_name: "Sergio Pena",
    contact_email: "sergio@andesoutdoor.com",
    website_url: "https://andesoutdoor.example",
    whatsapp: null,
    proposed_budget_usd: 1200,
    brief: "Buscamos presencia en destinos de trekking con enfoque en Patagonia y Andes.",
    status: "contacted",
    source: "map_viewer_cta",
    map_url: "https://travelyourmap.bypupila.com/u/demo",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
] as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const isDemoMode = url.searchParams.get("demo") === "1";
    const requestedChannelId = String(url.searchParams.get("channelId") || "").trim();
    const channelId = UUID_PATTERN.test(requestedChannelId) ? requestedChannelId : null;

    if (isDemoMode) {
      return NextResponse.json({ inquiries: demoInquiries });
    }

    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql<Array<{
      id: string;
      channel_id: string;
      channel_name: string;
      brand_name: string;
      contact_name: string;
      contact_email: string;
      website_url: string | null;
      whatsapp: string | null;
      proposed_budget_usd: number | null;
      brief: string;
      status: string;
      source: string;
      map_url: string | null;
      created_at: string;
      updated_at: string;
    }>>`
      select
        si.id,
        si.channel_id,
        c.channel_name,
        si.brand_name,
        si.contact_name,
        si.contact_email,
        si.website_url,
        si.whatsapp,
        si.proposed_budget_usd,
        si.brief,
        si.status,
        si.source,
        si.map_url,
        si.created_at,
        si.updated_at
      from public.sponsor_inquiries si
      inner join public.channels c on c.id = si.channel_id
      where si.creator_user_id = ${userId}
        and (${channelId}::uuid is null or si.channel_id = ${channelId}::uuid)
      order by si.created_at desc
      limit 200
    `;

    const inquiries = rows.map((row) => ({
      ...row,
      status: normalizeSponsorInquiryStatus(row.status),
    }));

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("[api/sponsors/inquiries GET]", error);
    return NextResponse.json({ error: "Could not load inquiries" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = updatePayloadSchema.parse(await request.json());
    const rows = await sql<Array<{ id: string; status: string }>>`
      update public.sponsor_inquiries si
      set status = ${payload.status}, updated_at = now()
      where si.id = ${payload.inquiryId}
        and si.creator_user_id = ${userId}
      returning si.id, si.status
    `;

    const updated = rows[0] || null;
    if (!updated?.id) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      inquiry: {
        id: updated.id,
        status: normalizeSponsorInquiryStatus(updated.status),
      },
    });
  } catch (error) {
    console.error("[api/sponsors/inquiries PATCH]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid inquiry update payload", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not update inquiry" }, { status: 500 });
  }
}
