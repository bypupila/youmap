import { NextResponse } from "next/server";
import { ensureUserRoleAuditTable, type UserRoleAuditRow } from "@/lib/admin-role-audit";
import { getSessionUserById, getValidSessionUserIdFromServerCookies, userIsSuperAdmin } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionUserId = (await getValidSessionUserIdFromServerCookies()) || "";
  if (!sessionUserId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const sessionUser = await getSessionUserById(sessionUserId);
  if (!userIsSuperAdmin(sessionUser?.role)) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  await ensureUserRoleAuditTable();

  const rows = await sql<Array<UserRoleAuditRow>>`
    select
      id,
      target_user_id,
      target_user_email,
      target_user_username,
      target_display_name,
      previous_role,
      new_role,
      changed_by_user_id,
      changed_by_username,
      changed_by_display_name,
      created_at
    from public.user_role_audit
    order by created_at desc, id desc
  `;

  const csv = buildCsv(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `user-role-audit-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function buildCsv(rows: Array<UserRoleAuditRow>) {
  const header = [
    "id",
    "target_user_id",
    "target_user_email",
    "target_user_username",
    "target_display_name",
    "previous_role",
    "new_role",
    "changed_by_user_id",
    "changed_by_username",
    "changed_by_display_name",
    "created_at",
  ];

  const lines = [header.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.target_user_id,
        row.target_user_email,
        row.target_user_username,
        row.target_display_name,
        row.previous_role,
        row.new_role,
        row.changed_by_user_id,
        row.changed_by_username,
        row.changed_by_display_name,
        row.created_at,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
