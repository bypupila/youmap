import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

const sponsorSchema = z.object({
  brand_name: z.string().min(2),
  logo_url: z.string().url().optional().or(z.literal("")).transform((value) => value || null),
  website_url: z.string().url().optional().or(z.literal("")).transform((value) => value || null),
  affiliate_url: z.string().url().optional().or(z.literal("")).transform((value) => value || null),
  discount_code: z.string().max(40).optional().or(z.literal("")).transform((value) => value || null),
  description: z.string().max(280).optional().or(z.literal("")).transform((value) => value || null),
  country_code: z.string().length(2).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const isDemoMode = new URL(request.url).searchParams.get("demo") === "1";
    const payload = sponsorSchema.parse(await request.json());

    if (isDemoMode) {
      return NextResponse.json({
        ok: true,
        id: randomUUID(),
        demo: true,
        sponsor: {
          brand_name: payload.brand_name,
          website_url: payload.website_url,
          affiliate_url: payload.affiliate_url,
          discount_code: payload.discount_code,
          description: payload.description,
          country_code: payload.country_code,
        },
      });
    }

    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sponsorRows = await sql<Array<{ id: string }>>`
      insert into public.sponsors (
        user_id,
        brand_name,
        logo_url,
        website_url,
        affiliate_url,
        discount_code,
        description,
        active
      )
      values (
        ${userId},
        ${payload.brand_name},
        ${payload.logo_url},
        ${payload.website_url},
        ${payload.affiliate_url},
        ${payload.discount_code},
        ${payload.description},
        true
      )
      returning id
    `;
    const sponsor = sponsorRows[0];
    if (!sponsor?.id) {
      return NextResponse.json({ error: "Failed to create sponsor" }, { status: 400 });
    }

    if (payload.country_code) {
      await sql`
        insert into public.sponsor_geo_rules (sponsor_id, country_code, priority)
        values (${sponsor.id}, ${payload.country_code.toUpperCase()}, 10)
      `;
    } else {
      await sql`
        insert into public.sponsor_geo_rules (sponsor_id, country_code, priority)
        values (${sponsor.id}, null, 0)
      `;
    }

    return NextResponse.json({ ok: true, id: sponsor.id });
  } catch (error) {
    console.error("[api/sponsors POST]", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
