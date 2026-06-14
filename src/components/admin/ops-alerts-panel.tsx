"use client";

import { useEffect, useState } from "react";
import { TriangleAlert, AlertCircle, CheckCircle2 } from "lucide-react";

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
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
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
    <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-6 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <div className="flex items-center justify-between">
        <div>
          <p className="tym-overline text-[#8ff0ff] flex items-center gap-1.5">
            <TriangleAlert size={14} className="text-[#8ff0ff]" />
            Alertas operativas
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Críticas y altas</h2>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[#aab2bc] animate-pulse">Cargando alertas...</p>
      ) : null}
      {error ? (
        <p className="mt-6 text-sm text-[#ffb0a7] flex items-center gap-1.5">
          <AlertCircle size={16} />
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="mt-5 space-y-3">
          {data?.alerts.length ? (
            data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-2 w-2 shrink-0 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        alert.severity === "critical" ? "bg-rose-500" : "bg-amber-500"
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        alert.severity === "critical" ? "bg-rose-500" : "bg-amber-500"
                      }`}></span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#f5f7fb] group-hover:text-white transition-colors">{alert.title}</p>
                      <p className="mt-1 text-xs text-[#b8c0cb] leading-relaxed">{alert.detail}</p>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${alertClass[alert.severity]}`}>
                    {alertLabel[alert.severity]}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 size={32} className="text-emerald-500/80 mb-2" />
              <p className="text-sm text-[#9aa3af]">Sin alertas críticas o altas.</p>
            </div>
          )}
          {data?.generated_at ? (
            <p className="text-[10px] text-[#8f98a6] text-right font-mono mt-2">
              Actualizado: {formatStableTimestamp(data.generated_at)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatStableTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
