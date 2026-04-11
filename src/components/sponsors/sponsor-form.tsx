"use client";

import { type FormEvent, useState } from "react";

export function SponsorForm({ demo = false }: { demo?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      brand_name: String(formData.get("brand_name") || "").trim(),
      website_url: String(formData.get("website_url") || "").trim(),
      affiliate_url: String(formData.get("affiliate_url") || "").trim(),
      discount_code: String(formData.get("discount_code") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      country_code: String(formData.get("country_code") || "").trim().toUpperCase() || null,
    };

    setLoading(true);
    setMessage(null);

    const response = await fetch(demo ? "/api/sponsors?demo=1" : "/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("No se pudo crear el sponsor");
      return;
    }

    event.currentTarget.reset();
    setMessage(demo ? "Sponsor simulado correctamente (modo demo)" : "Sponsor creado correctamente");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Nuevo sponsor</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="Marca" name="brand_name" required />
        <Field label="País (ISO)" name="country_code" placeholder="JP" />
        <Field label="Website" name="website_url" type="url" />
        <Field label="Afiliado" name="affiliate_url" type="url" />
        <Field label="Código" name="discount_code" />
        <Field label="Descripción" name="description" className="md:col-span-2" />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar sponsor"}
      </button>
      {message ? <p className="mt-2 text-xs text-slate-300">{message}</p> : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-orange-400 focus:ring"
      />
    </label>
  );
}
