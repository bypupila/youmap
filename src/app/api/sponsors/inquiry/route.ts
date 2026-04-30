import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/neon";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  brandName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(180),
  websiteUrl: z.string().trim().max(240).optional().or(z.literal("")).transform((value) => value || null).refine((value) => !value || isValidUrl(value), {
    message: "websiteUrl must be a valid URL",
  }),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")).transform((value) => value || null),
  proposedBudgetUsd: z.number().int().positive().max(100000000).optional().nullable(),
  brief: z.string().trim().min(20).max(1200),
  mapUrl: z.string().trim().max(280).optional().or(z.literal("")).transform((value) => value || null).refine((value) => !value || isValidUrl(value), {
    message: "mapUrl must be a valid URL",
  }),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());

    const channelRows = await sql<Array<{ id: string; user_id: string }>>`
      select id, user_id
      from public.channels
      where id = ${payload.channelId}
      limit 1
    `;

    const channel = channelRows[0];
    if (!channel?.id) {
      return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
    }

    const ipHash = hashValue(readClientIp(request.headers));
    const userAgentHash = hashValue(normalizeOptionalString(request.headers.get("user-agent")));

    await sql`
      insert into public.sponsor_inquiries (
        channel_id,
        creator_user_id,
        brand_name,
        contact_name,
        contact_email,
        website_url,
        whatsapp,
        proposed_budget_usd,
        brief,
        map_url,
        ip_hash,
        user_agent_hash
      )
      values (
        ${payload.channelId},
        ${channel.user_id},
        ${payload.brandName},
        ${payload.contactName},
        ${payload.contactEmail},
        ${payload.websiteUrl},
        ${payload.whatsapp},
        ${payload.proposedBudgetUsd || null},
        ${payload.brief},
        ${payload.mapUrl},
        ${ipHash},
        ${userAgentHash}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/inquiry]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos invalidos", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "No se pudo registrar la solicitud" }, { status: 500 });
  }
}

function readClientIp(headers: Headers) {
  const forwardedFor = normalizeOptionalString(headers.get("x-forwarded-for"));
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = normalizeOptionalString(headers.get("x-real-ip"));
  if (realIp) return realIp;

  return null;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hashValue(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
