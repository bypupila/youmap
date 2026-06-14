"use client";

import { type FormEvent, useState } from "react";

export function MediaKitInquiryForm({
  channelId,
  creatorName,
  mapUrl,
}: {
  channelId: string;
  creatorName: string;
  mapUrl: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const budget = Number(form.get("proposedBudgetUsd") || 0);
    setStatus("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/sponsors/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          brandName: String(form.get("brandName") || ""),
          contactName: String(form.get("contactName") || ""),
          contactEmail: String(form.get("contactEmail") || ""),
          websiteUrl: String(form.get("websiteUrl") || ""),
          whatsapp: String(form.get("whatsapp") || ""),
          proposedBudgetUsd: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : null,
          brief: String(form.get("brief") || ""),
          mapUrl,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo enviar la solicitud.");
      event.currentTarget.reset();
      setStatus("success");
      setMessage("Solicitud enviada. El creador ya puede revisarla desde su panel.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    }
  }

  return (
    <form id="sponsor-inquiry" onSubmit={onSubmit} className="rounded-lg border border-[#d7dce4] bg-white p-4 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.55)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5a3d]">Contacto comercial</p>
      <h2 className="mt-2 text-xl font-black text-[#111827]">Solicitar partnership con {creatorName}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Marca" name="brandName" required minLength={2} maxLength={120} />
        <Field label="Nombre contacto" name="contactName" required minLength={2} maxLength={120} />
        <Field label="Email" name="contactEmail" type="email" required maxLength={180} />
        <Field label="Website" name="websiteUrl" type="url" maxLength={240} />
        <Field label="WhatsApp" name="whatsapp" maxLength={40} />
        <Field label="Budget estimado USD" name="proposedBudgetUsd" type="number" min={1} max={100000000} />
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-[#5b6472]">Brief</span>
        <textarea
          name="brief"
          required
          minLength={20}
          maxLength={1200}
          rows={5}
          className="w-full rounded-lg border border-[#d7dce4] bg-[#f8fafc] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#ff5a3d] focus:ring-2 focus:ring-[#ff5a3d]/20"
          placeholder="Destino, objetivo, formato esperado, fechas y producto o servicio a promocionar."
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#111827] px-4 text-sm font-black text-white transition hover:bg-[#263244] disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "sending" ? "Enviando..." : "Enviar solicitud"}
      </button>
      {message ? (
        <p className={status === "success" ? "mt-3 text-sm font-bold text-emerald-700" : "mt-3 text-sm font-bold text-red-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-[#5b6472]">{label}</span>
      <input
        {...props}
        className="h-10 w-full rounded-lg border border-[#d7dce4] bg-[#f8fafc] px-3 text-sm text-[#111827] outline-none focus:border-[#ff5a3d] focus:ring-2 focus:ring-[#ff5a3d]/20"
      />
    </label>
  );
}
