"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ShieldCheck, Sparkle, UserCircle, CheckCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserRole } from "@/lib/admin-roles";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "creator", label: "Creator" },
  { value: "superadmin", label: "Admin" },
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
    <Card className="tm-surface-strong w-[min(360px,calc(100vw-2rem))] rounded-2xl border-white/10 shadow-[0_22px_80px_-38px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <CardHeader className="border-b border-white/10 px-5 pb-3.5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tym-overline text-[#8ff0ff] flex items-center gap-1">
              <ShieldCheck size={14} className="text-[#8ff0ff]" weight="duotone" />
              Superadmin
            </p>
            <CardTitle className="mt-1 text-[15px] font-semibold text-[#f5f7fb]">Asignar roles</CardTitle>
          </div>
          <Badge variant="outline" className="border-[#8ff0ff]/25 bg-[#8ff0ff]/10 text-[10px] font-black text-[#b9f7ff]">
            Asignador
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-[#8ff0ff]/15 bg-[#8ff0ff]/5 px-3 py-2.5 text-[11px] text-[#b9f7ff] leading-relaxed">
          <ShieldCheck size={15} weight="fill" className="shrink-0" />
          <span>Acción restringida. Asegúrate de verificar al destinatario antes de guardar.</span>
        </div>

        <form className="space-y-4.5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">Identificador de Usuario</span>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Email, username o UUID..."
              autoComplete="off"
              className="h-10 bg-white/[0.03] border-white/10 text-sm focus:border-[#e1543a]/50"
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">Seleccionar Rol</span>
            <div className="grid grid-cols-3 gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
              {ROLE_OPTIONS.map((option) => {
                const active = role === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={[
                      "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-all duration-300",
                      active
                        ? "bg-white/[0.08] text-white shadow-sm border border-white/10"
                        : "text-[#aab2bc] hover:text-white border border-transparent",
                    ].join(" ")}
                  >
                    {option.value === "viewer" ? <UserCircle size={15} /> : option.value === "creator" ? <Sparkle size={15} /> : <ShieldCheck size={15} />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full h-10 bg-[#e1543a] hover:bg-[#ee6b49] rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all duration-300 active:scale-95" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Actualizar rol"}
          </Button>
        </form>

        {message ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[11px] text-emerald-200">
            <CheckCircle size={14} className="shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[11px] text-red-200">
            <ShieldCheck size={14} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
