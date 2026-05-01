"use client";

import { useMemo, useState } from "react";
import { CheckCircle, MagnifyingGlass, ShieldCheck, Sparkle, UserCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserRole, type AdminAppUserRole } from "@/lib/admin-roles";

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
}

const ROLE_META: Record<AdminAppUserRole, { label: string; icon: typeof UserCircle; className: string }> = {
  viewer: {
    label: "Viewer",
    icon: UserCircle,
    className: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  },
  creator: {
    label: "Creator",
    icon: Sparkle,
    className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  },
  superadmin: {
    label: "Superadmin",
    icon: ShieldCheck,
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  },
};

const ROLE_ACTIONS: AdminAppUserRole[] = ["viewer", "creator", "superadmin"];

export function AdminUsersPanel({ users }: AdminUsersPanelProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(users);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((user) =>
      [user.display_name, user.username, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [items, query]);

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
    <Card className="tm-surface-strong border-white/10 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
      <CardHeader className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="yt-overline text-[#8ff0ff]">Directorio</p>
            <CardTitle className="mt-1 text-[16px] font-semibold text-[#f5f7fb]">Usuarios y roles</CardTitle>
            <p className="mt-1 text-sm text-[#aab2bc]">
              Busca por nombre, email o rol y cambia permisos sin salir del panel.
            </p>
          </div>
          <div className="flex gap-2">
            {ROLE_ACTIONS.map((role) => (
              <Badge key={role} variant="outline" className={ROLE_META[role].className}>
                {ROLE_META[role].label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-5">
        <label className="relative block">
          <span className="sr-only">Buscar usuarios</span>
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8994]"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por email, username, nombre o rol"
            className="h-11 pl-9"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#aab2bc]">
          <span>{filteredUsers.length} usuarios visibles</span>
          <span>{items.length} usuarios cargados</span>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-100">
            <CheckCircle size={14} />
            <span>{message}</span>
          </div>
        ) : null}
        {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-[12px] text-[#ffb0a7]">{error}</p> : null}

        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const meta = ROLE_META[user.role];
            const Icon = meta.icon;
            const isPending = pendingUserId === user.id;

            return (
              <div
                key={user.id}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[0_12px_50px_-34px_rgba(0,0,0,0.8)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[14px] font-semibold text-[#f5f7fb]">{user.display_name}</h3>
                      <Badge variant="outline" className={meta.className}>
                        <Icon size={12} />
                        <span className="ml-1">{meta.label}</span>
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-[#8f98a3]">
                      @{user.username} · {user.email}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#6f7781]">
                      {user.updated_at ? `Actualizado ${new Date(user.updated_at).toLocaleString("es-AR")}` : "Sin marca de actualización"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ROLE_ACTIONS.map((role) => {
                      const active = role === user.role;
                      return (
                        <Button
                          key={role}
                          type="button"
                          variant={active ? "default" : "outline"}
                          className={
                            active ? "bg-[#c91f18] hover:bg-[#e03128]" : "border-white/10 bg-white/[0.04] text-[#e8edf3]"
                          }
                          disabled={isPending || active}
                          onClick={() => void applyRole(user, role)}
                        >
                          {isPending && !active ? "Guardando..." : ROLE_META[role].label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center text-sm text-[#aab2bc]">
              No hay usuarios que coincidan con ese filtro.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
