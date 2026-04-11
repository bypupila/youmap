import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase-service";

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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceRoleClient();

    const { data: sponsor, error: sponsorError } = await service
      .from("sponsors")
      .insert({
        user_id: user.id,
        brand_name: payload.brand_name,
        logo_url: payload.logo_url,
        website_url: payload.website_url,
        affiliate_url: payload.affiliate_url,
        discount_code: payload.discount_code,
        description: payload.description,
        active: true,
      })
      .select("id")
      .single();

    if (sponsorError || !sponsor) {
      return NextResponse.json({ error: sponsorError?.message || "Failed to create sponsor" }, { status: 400 });
    }

    if (payload.country_code) {
      await service.from("sponsor_geo_rules").insert({
        sponsor_id: sponsor.id,
        country_code: payload.country_code.toUpperCase(),
        priority: 10,
      });
    } else {
      await service.from("sponsor_geo_rules").insert({
        sponsor_id: sponsor.id,
        country_code: null,
        priority: 0,
      });
    }

    return NextResponse.json({ ok: true, id: sponsor.id });
  } catch (error) {
    console.error("[api/sponsors POST]", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
