"use client";

export type AdminAppUserRole = "viewer" | "creator" | "superadmin";

export interface AdminRoleUpdateResult {
  ok: true;
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: AdminAppUserRole;
  };
  previous_role: AdminAppUserRole;
}

export interface AdminRoleUpdateError {
  error: string;
}

export async function updateUserRole(identifier: string, role: AdminAppUserRole) {
  const response = await fetch("/api/admin/users/role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, role }),
  });

  const payload = (await response.json().catch(() => null)) as AdminRoleUpdateResult | AdminRoleUpdateError | null;
  return { response, payload };
}
