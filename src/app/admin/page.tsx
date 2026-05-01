import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoleManagementCard } from "@/components/admin/role-management-card";
import { AdminUsersPanel, type AdminUserEntry } from "@/components/admin/admin-users-panel";
import { RoleAuditPanel } from "@/components/admin/role-audit-panel";
import { getRecentRoleChanges, ensureUserRoleAuditTable } from "@/lib/admin-role-audit";
import { getSessionUserById, getSessionUserIdFromServerCookies, userIsSuperAdmin, type AppUserRole } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string | null;
  updated_at: string | null;
}

export default async function AdminPage() {
  const sessionUserId = (await getSessionUserIdFromServerCookies()) || "";
  if (!sessionUserId) redirect("/auth");

  const sessionUser = await getSessionUserById(sessionUserId);
  if (!userIsSuperAdmin(sessionUser?.role)) redirect("/dashboard");

  await ensureUserRoleAuditTable();

  const rows = await sql<AdminUserRow[]>`
    select id, email, username, display_name, role::text as role, updated_at
    from public.users
    order by updated_at desc nulls last, username asc
    limit 200
  `;
  const recentRoleChanges = await getRecentRoleChanges(12);

  const users: AdminUserEntry[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    display_name: row.display_name,
    role: normalizeRole(row.role),
    updated_at: row.updated_at,
  }));

  const counts = users.reduce(
    (acc, user) => {
      acc.total += 1;
      acc[user.role] += 1;
      return acc;
    },
    { total: 0, viewer: 0, creator: 0, superadmin: 0 }
  );

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,31,24,0.2),transparent_34%),linear-gradient(180deg,rgba(11,13,15,0.98),rgba(17,20,22,0.96))]" />
      <div className="relative mx-auto max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8">
        <header className="tm-surface-strong flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 px-5 py-4 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.92)]">
          <div>
            <p className="yt-overline text-[#8ff0ff]">Panel operativo</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#f5f7fb]">Administración global</h1>
            <p className="mt-1 text-sm text-[#aab2bc]">
              Acceso restringido a superadmin para gestionar roles y revisar el estado de usuarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#8ff0ff]/20 bg-[#8ff0ff]/10 text-[#b9f7ff]">
              <ShieldCheck className="h-3 w-3" />
              <span>Superadmin</span>
            </Badge>
            <Link href="/dashboard" className="yt-btn-secondary inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Volver al dashboard
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          <SummaryCard label="Usuarios" value={counts.total} />
          <SummaryCard label="Creators" value={counts.creator} />
          <SummaryCard label="Viewers" value={counts.viewer} />
          <SummaryCard label="Superadmins" value={counts.superadmin} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <AdminUsersPanel users={users} />

          <div className="space-y-6">
            <RoleManagementCard />
            <RoleAuditPanel items={recentRoleChanges} />
            <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
              <p className="yt-overline text-[#8ff0ff]">Guía operativa</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[#b8c0cb]">
                <p>
                  Usa el listado para ubicar usuarios por email o username y cambiales el rol directamente.
                </p>
                <p>
                  El card mínimo sigue disponible para cambios rápidos por UUID cuando ya conoces el identificador.
                </p>
                <p>
                  Los cambios impactan sobre <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[#f5f7fb]">public.users.role</code>.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="tm-surface-strong rounded-[1.5rem] border border-white/10 p-5 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#9aa3af]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#f5f7fb]">{value}</p>
    </div>
  );
}

function normalizeRole(role: string | null): AppUserRole {
  if (role === "viewer") return "viewer";
  if (role === "superadmin") return "superadmin";
  return "creator";
}
