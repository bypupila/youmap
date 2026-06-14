"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckCircle2, Search, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserRole, type AdminAppUserRole } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

export interface AdminUserEntry {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: AdminAppUserRole;
  updated_at: string | null;
}

interface AdminUsersPanelProps {
  users: AdminUserEntry[];
  query: string;
  page: number;
  totalPages: number;
  totalCount: number;
}

const ROLE_META: Record<AdminAppUserRole, { label: string; icon: typeof UserCircle2; className: string }> = {
  viewer: {
    label: "Viewer",
    icon: UserCircle2,
    className: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  },
  creator: {
    label: "Creator",
    icon: Sparkles,
    className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  },
  superadmin: {
    label: "Superadmin",
    icon: ShieldCheck,
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  },
};

const ROLE_ACTIONS: AdminAppUserRole[] = ["viewer", "creator", "superadmin"];

export function AdminUsersPanel({ users, query, page, totalPages, totalCount }: AdminUsersPanelProps) {
  const [items, setItems] = useState(users);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyRole(user: AdminUserEntry, role: AdminAppUserRole) {
    if (user.role === role) return;

    setPendingUserId(user.id);
    setMessage(null);
    setError(null);

    try {
      const { response, payload } = await updateUserRole(user.id, role);
      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload && "error" in payload ? payload.error : "No se pudo actualizar el rol.");
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === user.id
            ? {
                ...entry,
                role: payload.user.role,
              }
            : entry
        )
      );
      setMessage(`Rol actualizado para ${payload.user.username} -> ${payload.user.role}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el rol.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <Card className="tm-surface-strong border-white/10 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <CardHeader className="border-b border-white/10 px-6 pb-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="tym-overline text-[#8ff0ff]">Directorio</p>
            <CardTitle className="mt-1 text-[16px] font-semibold text-[#f5f7fb]">Usuarios y roles</CardTitle>
            <p className="mt-1 text-xs text-[#aab2bc]">
              Busca por nombre, email o rol y cambia permisos sin salir del panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_ACTIONS.map((role) => (
              <Badge key={role} variant="outline" className={`${ROLE_META[role].className} text-[9px] uppercase tracking-wider font-black`}>
                {ROLE_META[role].label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4.5 px-6 pb-6 pt-5">
        <form action="/admin" method="get" className="space-y-3">
          <input type="hidden" name="page" value="1" />
          <label className="relative block">
            <span className="sr-only">Buscar usuarios</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f8994]"
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por email, username, nombre o rol..."
              className="h-10 pl-10 bg-white/[0.02] border-white/10 text-sm focus:border-white/20 transition-all rounded-xl"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="bg-[#e1543a] hover:bg-[#ee6b49] rounded-xl text-xs font-bold px-4 h-9 tracking-wider transition-all duration-300">
              Buscar
            </Button>
            {query ? (
              <Link href="/admin" className="tym-btn-secondary inline-flex items-center justify-center text-xs font-semibold h-9 px-4 rounded-xl border border-white/10 hover:bg-white/[0.05] transition-all">
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#aab2bc] font-mono">
          <span>{totalCount} usuarios encontrados</span>
          <span>
            Página {page} de {Math.max(1, totalPages)} · {items.length} en pantalla
          </span>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-[11px] text-emerald-200">
            <CheckCircle2 size={14} />
            <span>{message}</span>
          </div>
        ) : null}
        {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-[11px] text-[#ffb0a7]">{error}</p> : null}

        <div className="space-y-3">
          {items.map((user) => {
            const meta = ROLE_META[user.role];
            const Icon = meta.icon;
            const isPending = pendingUserId === user.id;

            return (
              <div
                key={user.id}
                className="group rounded-xl border border-white/5 bg-white/[0.01] px-4 py-4 transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-[#f5f7fb] group-hover:text-white transition-colors">{user.display_name}</h3>
                      <Badge variant="outline" className={`${meta.className} text-[9px] font-black uppercase tracking-wider`}>
                        <Icon size={10} className="mr-1 inline" />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#8f98a3] font-mono">
                      @{user.username} · {user.email}
                    </p>
                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-[#6f7781] font-mono">
                      {user.updated_at ? `Actualizado: ${new Date(user.updated_at).toLocaleString("es-AR")}` : "Sin actualizaciones"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                    {ROLE_ACTIONS.map((role) => {
                      const active = role === user.role;
                      return (
                        <button
                          key={role}
                          type="button"
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-bold rounded transition-all",
                            active
                              ? "bg-[#e1543a]/20 text-[#ee6b49] border border-[#e1543a]/30"
                              : "text-zinc-500 hover:text-white border border-transparent"
                          )}
                          disabled={isPending || active}
                          onClick={() => void applyRole(user, role)}
                        >
                          {isPending && !active ? "..." : ROLE_META[role].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center text-sm text-[#aab2bc]">
              No hay usuarios que coincidan con ese filtro.
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-[11px] text-[#aab2bc] font-mono">
            Mostrando {items.length} de {totalCount} usuarios.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PageLink href={buildPageHref(query, Math.max(1, page - 1))} disabled={page <= 1}>
              Anterior
            </PageLink>
            <PageLink href={buildPageHref(query, page + 1)} disabled={page >= totalPages || totalPages === 0}>
              Siguiente
            </PageLink>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildPageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  params.set("page", String(page));
  return `/admin?${params.toString()}`;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-[12px] text-[#6f7781]">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="tym-btn-secondary inline-flex h-10 items-center justify-center px-4 text-[12px]">
      {children}
    </Link>
  );
}
