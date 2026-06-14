"use client";

import { useState } from "react";

export function SponsorReportActions() {
  const [message, setMessage] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Link copiado.");
    } catch {
      setMessage("No se pudo copiar automaticamente.");
    }
  }

  function printReport() {
    setMessage(null);
    window.print();
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={printReport}
        className="h-10 rounded-lg bg-[#16120d] px-4 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#2a2117]"
      >
        Guardar PDF
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="h-10 rounded-lg border border-[#d7cbbb] bg-white/70 px-4 text-xs font-black uppercase tracking-[0.08em] text-[#16120d] transition hover:bg-white"
      >
        Copiar link
      </button>
      {message ? <p className="text-xs font-bold text-[#6d6257]">{message}</p> : null}
    </div>
  );
}
