import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";
import { getSessionUserById, getValidSessionUserIdFromRequest, normalizeAppUserRole, userIsSuperAdmin } from "@/lib/current-user";
import { ensureUserRoleAuditTable, logUserRoleChange } from "@/lib/admin-role-audit";
import { sql } from "@/lib/neon";
import { revokeUserSessions } from "@/lib/session-revocations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payloadSchema = z.object({
  identifier: z.string().min(1),
  role: z.enum(["viewer", "creator", "superadmin"]),
});

async function findTargetUser(identifier: string) {
  const trimmed = identifier.trim();
  const rows = await sql<Array<{ id: string; email: string; username: string; display_name: string; role: string | null }>>`
    select id, email, username, display_name, role::text as role
    from public.users
    where id::text = ${trimmed}
       or lower(email) = ${normalizeEmail(trimmed)}
       or lower(username) = ${normalizeUsername(trimmed)}
    limit 1
  `;

  const row = rows[0] || null;
  if (!row) return null;

  return {
    ...row,
    role: normalizeAppUserRole(row.role),
  };
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getValidSessionUserIdFromRequest(request);
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await getSessionUserById(sessionUserId);
    if (!userIsSuperAdmin(sessionUser?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = payloadSchema.parse(await request.json());
    const targetUser = await findTargetUser(payload.identifier);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === sessionUserId && payload.role !== sessionUser.role) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol desde esta pantalla." }, { status: 400 });
    }

    if (targetUser.role === payload.role) {
      return NextResponse.json({
        ok: true,
        user: targetUser,
        previous_role: targetUser.role,
        changed: false,
      });
    }

    await ensureUserRoleAuditTable();

    const rows = await sql<Array<{ id: string; email: string; username: string; display_name: string; role: string | null }>>`
      update public.users
      set role = ${payload.role}, updated_at = now()
      where id = ${targetUser.id}
      returning id, email, username, display_name, role::text as role
    `;

    const updatedUser = rows[0];
    if (!updatedUser) {
      return NextResponse.json({ error: "Could not update role" }, { status: 500 });
    }

    await logUserRoleChange({
      target_user_id: updatedUser.id,
      target_user_email: updatedUser.email,
      target_user_username: updatedUser.username,
      target_display_name: updatedUser.display_name,
      previous_role: targetUser.role,
      new_role: normalizeAppUserRole(updatedUser.role),
      changed_by_user_id: sessionUser.id,
      changed_by_username: sessionUser.username,
      changed_by_display_name: sessionUser.display_name,
    });

    await revokeUserSessions(updatedUser.id, "role_changed");

    return NextResponse.json({
      ok: true,
      user: {
        ...updatedUser,
        role: normalizeAppUserRole(updatedUser.role),
      },
      previous_role: targetUser.role,
      changed: true,
    });
  } catch (error) {
    console.error("[api/admin/users/role]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not update role",
      },
      { status: 400 }
    );
  }
}
