import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie } from "@/lib/auth-session";
import { getValidSessionUserFromRequest, normalizeAppUserRole } from "@/lib/current-user";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";
import { revokeUserSessions } from "@/lib/session-revocations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELETE_CONFIRMATION_TEXT = "ELIMINAR MI CUENTA";

const payloadSchema = z
  .object({
    confirmationText: z.string().trim().min(1),
    reason: z.string().trim().max(280).optional().nullable(),
  })
  .strict();

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = payloadSchema.parse(await request.json());
    if (payload.confirmationText !== DELETE_CONFIRMATION_TEXT) {
      return NextResponse.json({ error: `Escribe exactamente "${DELETE_CONFIRMATION_TEXT}" para continuar.` }, { status: 400 });
    }

    const userRows = await sql<
      Array<{ id: string; email: string; username: string; role: string | null }>
    >`
      select id, email, username, role::text as role
      from public.users
      where id = ${sessionUser.id}
      limit 1
    `;
    const user = userRows[0] || null;
    if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    if (normalizeAppUserRole(user.role) !== "viewer") {
      return NextResponse.json(
        { error: "Esta ruta solo elimina cuentas viewer. Para cuentas creador usa soporte de plataforma." },
        { status: 400 }
      );
    }

    const channelRows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where user_id = ${user.id}
      limit 1
    `;
    if (channelRows[0]?.id) {
      return NextResponse.json(
        { error: "La cuenta tiene un canal asociado. Usa el flujo de soporte para eliminación de cuenta creador." },
        { status: 400 }
      );
    }

    const hasDeletionAuditTable = await tableExists("public", "viewer_account_deletions");
    if (!hasDeletionAuditTable) {
      return NextResponse.json(
        { error: "Falta la tabla viewer_account_deletions. Ejecuta migraciones antes de eliminar cuentas." },
        { status: 400 }
      );
    }

    const profileRows = await sql<Array<{ country_code: string | null; city: string | null }>>`
      select country_code, city
      from public.viewer_profiles
      where user_id = ${user.id}
      limit 1
    `;
    const profile = profileRows[0] || null;

    await sql`
      insert into public.viewer_account_deletions (
        user_id,
        email,
        username,
        country_code,
        city,
        reason,
        deleted_at,
        created_at
      )
      values (
        ${user.id},
        ${user.email},
        ${user.username},
        ${profile?.country_code || null},
        ${profile?.city || null},
        ${payload.reason || null},
        now(),
        now()
      )
    `;

    await sql`
      delete from public.users
      where id = ${user.id}
    `;
    await revokeUserSessions(user.id, "viewer_account_deleted");

    const response = NextResponse.json({ ok: true, deleted: true });
    clearSessionCookie(response, request.headers.get("host"));
    return response;
  } catch (error) {
    console.error("[api/auth/viewer-account DELETE]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido para eliminación.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la cuenta." }, { status: 400 });
  }
}
