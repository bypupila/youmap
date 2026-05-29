import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import { columnExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  orderedSponsorIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = payloadSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }

    const hasDisplayOrder = await columnExists("public", "sponsors", "display_order");
    if (!hasDisplayOrder) {
      return NextResponse.json({ error: "La columna display_order no existe. Aplica la migración 0015." }, { status: 400 });
    }

    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const uniqueIds = Array.from(new Set(payload.orderedSponsorIds));
    if (!uniqueIds.length) return NextResponse.json({ error: "No sponsor ids provided" }, { status: 400 });

    const valuesSql = uniqueIds.map((id, index) => `('${id}'::uuid, ${(index + 1) * 10})`).join(", ");
    await sql.query(
      `
        update public.sponsors as s
        set
          display_order = v.display_order,
          updated_at = now()
        from (values ${valuesSql}) as v(id, display_order)
        where s.id = v.id
          and s.user_id = $1
      `,
      [access.ownerUserId]
    );

    return NextResponse.json({ ok: true, count: uniqueIds.length });
  } catch (error) {
    console.error("[api/map-admin/sponsors/order POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reorder sponsors" }, { status: 500 });
  }
}
