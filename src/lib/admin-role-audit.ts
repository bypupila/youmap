import { sql } from "@/lib/neon";
import { tableExists } from "@/lib/db-schema";
import type { AdminAppUserRole } from "@/lib/admin-roles";

export interface UserRoleAuditRow {
  id: number;
  target_user_id: string;
  target_user_email: string;
  target_user_username: string;
  target_display_name: string;
  previous_role: AdminAppUserRole;
  new_role: AdminAppUserRole;
  changed_by_user_id: string;
  changed_by_username: string;
  changed_by_display_name: string;
  created_at: string;
}

type AuditInsertInput = Omit<UserRoleAuditRow, "id" | "created_at">;

export async function logUserRoleChange(entry: AuditInsertInput) {
  if (!(await tableExists("public", "user_role_audit"))) {
    return null;
  }

  const rows = await sql<Array<UserRoleAuditRow>>`
    insert into public.user_role_audit (
      target_user_id,
      target_user_email,
      target_user_username,
      target_display_name,
      previous_role,
      new_role,
      changed_by_user_id,
      changed_by_username,
      changed_by_display_name
    )
    values (
      ${entry.target_user_id},
      ${entry.target_user_email},
      ${entry.target_user_username},
      ${entry.target_display_name},
      ${entry.previous_role},
      ${entry.new_role},
      ${entry.changed_by_user_id},
      ${entry.changed_by_username},
      ${entry.changed_by_display_name}
    )
    returning id, target_user_id, target_user_email, target_user_username, target_display_name, previous_role, new_role, changed_by_user_id, changed_by_username, changed_by_display_name, created_at
  `;

  return rows[0] || null;
}

export async function getRecentRoleChanges(limit = 20) {
  if (!(await tableExists("public", "user_role_audit"))) {
    return [];
  }

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
    limit ${limit}
  `;

  return rows.map((row) => ({
    ...row,
    previous_role: normalizeRole(row.previous_role),
    new_role: normalizeRole(row.new_role),
  }));
}

function normalizeRole(value: string | null | undefined): AdminAppUserRole {
  if (value === "viewer") return "viewer";
  if (value === "superadmin") return "superadmin";
  return "creator";
}
