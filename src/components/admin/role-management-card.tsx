"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ShieldCheck, Sparkle, UserCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserRole } from "@/lib/admin-roles";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "creator", label: "Creator" },
  { value: "superadmin", label: "Superadmin" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export function RoleManagementCard() {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<RoleValue>("creator");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Escribe un email, username o UUID.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { response, payload } = await updateUserRole(trimmed, role);
      if (!response.ok || !payload || !("user" in payload)) {
        throw new Error((payload as { error?: string } | null)?.error || "No se pudo actualizar el rol.");
      }

      setMessage(`Rol actualizado para ${payload.user.username || payload.user.email || trimmed} -> ${payload.user.role}`);
      setIdentifier("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el rol.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="tm-surface-strong w-[min(360px,calc(100vw-2rem))] rounded-2xl border-white/10 shadow-[0_22px_80px_-38px_rgba(0,0,0,0.9)]">
      <CardHeader className="border-b border-white/10 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tym-overline text-[#8ff0ff]">Superadmin</p>
            <CardTitle className="mt-1 text-[15px] font-semibold text-[#f5f7fb]">Administrar roles</CardTitle>
          </div>
          <Badge variant="outline" className="border-[#8ff0ff]/25 bg-[#8ff0ff]/10 text-[11px] text-[#b9f7ff]">
            Roles
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-[#8ff0ff]/15 bg-[#8ff0ff]/8 px-3 py-2 text-[12px] text-[#b9f7ff]">
          <ShieldCheck size={16} />
          <span>Solo visible para superadmin.</span>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#aaaaaa]">Usuario</span>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="email, username o UUID"
              autoComplete="off"
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={[
                    "flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-[12px] font-medium transition",
                    active
                      ? "border-[#8ff0ff]/35 bg-[#8ff0ff]/12 text-[#f5f7fb]"
                      : "border-white/10 bg-white/[0.03] text-[#aab2bc] hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {option.value === "viewer" ? <UserCircle size={14} /> : option.value === "creator" ? <Sparkle size={14} /> : <ShieldCheck size={14} />}
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button type="submit" className="w-full bg-[#e1543a] hover:bg-[#ee6b49]" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Actualizar rol"}
          </Button>
        </form>

        {message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-[12px] text-[#ffb0a7]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
