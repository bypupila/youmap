"use client";

import { type FormEvent, useState } from "react";

export function BrandPortalAccessForm({ token, brandName, emailHint }: { token: string; brandName: string; emailHint: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/brand-portal/${encodeURIComponent(token)}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          code: String(form.get("code") || ""),
        }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || "No se pudo validar el acceso.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo validar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 grid w-full max-w-md gap-3 rounded-lg border border-[#d8d5ca] bg-white/85 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#ff5a3d]">Acceso de marca</p>
        <h1 className="mt-2 text-2xl font-black text-[#151515]">{brandName}</h1>
        <p className="mt-2 text-sm leading-6 text-[#65635e]">
          Ingresa el email autorizado{emailHint ? ` (${emailHint})` : ""} y el codigo recibido por la marca.
        </p>
      </div>
      <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#8a8172]">
        Email
        <input name="email" type="email" required className="h-11 rounded-lg border border-[#d8d5ca] bg-[#f6f7f2] px-3 text-sm normal-case tracking-normal text-[#151515] outline-none" />
      </label>
      <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#8a8172]">
        Codigo
        <input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="h-11 rounded-lg border border-[#d8d5ca] bg-[#f6f7f2] px-3 text-sm normal-case tracking-[0.2em] text-[#151515] outline-none" />
      </label>
      {error ? <p className="rounded-lg border border-[#ff5a3d]/25 bg-[#ff5a3d]/10 px-3 py-2 text-sm text-[#8a2f20]">{error}</p> : null}
      <button type="submit" disabled={busy} className="h-11 rounded-lg bg-[#151515] px-4 text-sm font-black text-white disabled:opacity-60">
        {busy ? "Validando..." : "Entrar al portal"}
      </button>
    </form>
  );
}
