import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updatePayloadSchema = z
  .object({
    consentVersion: z.string().trim().min(1).default("v1"),
    platformPromotions: z.boolean().optional(),
    creatorPromotions: z.boolean().optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await sql<
      Array<{
        consent_type: string;
        accepted: boolean;
        consent_version: string;
        accepted_at: string;
      }>
    >`
      select consent_type, accepted, consent_version, accepted_at
      from public.user_consents
      where user_id = ${userId}
      order by accepted_at desc
    `;

    const latestByType = new Map<string, { accepted: boolean; consent_version: string; accepted_at: string }>();
    for (const row of rows) {
      if (!latestByType.has(row.consent_type)) {
        latestByType.set(row.consent_type, {
          accepted: row.accepted,
          consent_version: row.consent_version,
          accepted_at: row.accepted_at,
        });
      }
    }

    return NextResponse.json({
      account_operation: latestByType.get("account_operation") || null,
      platform_promotions: latestByType.get("platform_promotions") || null,
      creator_promotions: latestByType.get("creator_promotions") || null,
    });
  } catch (error) {
    console.error("[api/auth/consents GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar consentimientos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getValidSessionUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = updatePayloadSchema.parse(await request.json());
    const now = new Date().toISOString();

    if (typeof payload.platformPromotions === "boolean") {
      await sql`
        insert into public.user_consents (user_id, consent_type, accepted, consent_version, accepted_at, metadata, created_at, updated_at)
        values (
          ${userId},
          'platform_promotions',
          ${payload.platformPromotions},
          ${payload.consentVersion},
          ${now},
          '{}'::jsonb,
          ${now},
          ${now}
        )
      `;
    }

    if (typeof payload.creatorPromotions === "boolean") {
      await sql`
        insert into public.user_consents (user_id, consent_type, accepted, consent_version, accepted_at, metadata, created_at, updated_at)
        values (
          ${userId},
          'creator_promotions',
          ${payload.creatorPromotions},
          ${payload.consentVersion},
          ${now},
          '{}'::jsonb,
          ${now},
          ${now}
        )
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/consents PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload de consentimiento inválido.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudieron actualizar consentimientos." }, { status: 400 });
  }
}
