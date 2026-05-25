"use client";

import { useEffect, useState } from "react";

type AlertPayload = {
  generated_at: string;
  alerts: Array<{
    id: string;
    severity: "critical" | "high";
    title: string;
    detail: string;
  }>;
};

const alertClass: Record<"critical" | "high", string> = {
  critical: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  high: "border-amber-400/30 bg-amber-500/10 text-amber-200",
};

const alertLabel: Record<"critical" | "high", string> = {
  critical: "Crítico",
  high: "Alta",
};

export function OpsAlertsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AlertPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/ops/alerts", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as AlertPayload | { error?: string } | null;
        if (!response.ok) throw new Error((payload as { error?: string } | null)?.error || `HTTP ${response.status}`);
        if (!active) return;
        setData(payload as AlertPayload);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar alertas.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
      <p className="tym-overline text-[#8ff0ff]">Alertas operativas</p>
      <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Críticas y altas</h2>

      {loading ? <p className="mt-4 text-sm text-[#aab2bc]">Cargando alertas...</p> : null}
      {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}

      {!loading && !error ? (
        <div className="mt-4 space-y-2">
          {data?.alerts.length ? (
            data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#f5f7fb]">{alert.title}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${alertClass[alert.severity]}`}>
                    {alertLabel[alert.severity]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#b8c0cb]">{alert.detail}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#9aa3af]">Sin alertas críticas o altas.</p>
          )}
          {data?.generated_at ? (
            <p className="text-[11px] text-[#8f98a6]">Actualizado: {new Date(data.generated_at).toLocaleString("es-AR")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
