"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, TriangleAlert, XCircle, HandHelping, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ReleaseCheckStatus = "pass" | "fail" | "warn" | "manual";

type ReleasePayload = {
  generated_at: string;
  overall_status: "go" | "go_with_warnings" | "no_go";
  ready: boolean;
  blockers: number;
  warnings: number;
  manual: number;
  checks: Array<{
    id: string;
    group: string;
    label: string;
    status: ReleaseCheckStatus;
    detail: string;
  }>;
};

const statusMeta: Record<ReleaseCheckStatus, { label: string; className: string; icon: LucideIcon }> = {
  pass: {
    label: "Pasa",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  fail: {
    label: "Bloqueante",
    className: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    icon: XCircle,
  },
  warn: {
    label: "Advertencia",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    icon: TriangleAlert,
  },
  manual: {
    label: "Manual",
    className: "border-slate-500/25 bg-slate-500/10 text-slate-300",
    icon: HandHelping,
  },
};

const overallMeta: Record<ReleasePayload["overall_status"], { label: string; className: string }> = {
  go: { label: "Listo (GO)", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  go_with_warnings: { label: "GO con Advertencias", className: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  no_go: { label: "NO GO (Bloqueado)", className: "text-rose-400 bg-rose-500/10 border-rose-500/25" },
};

export function ReleaseReadinessPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReleasePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/release/go-no-go", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ReleasePayload | { error?: string } | null;
      if (!response.ok) throw new Error((payload as { error?: string } | null)?.error || `HTTP ${response.status}`);
      setData(payload as ReleasePayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar checklist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-6 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="tym-overline text-[#8ff0ff] flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#8ff0ff]" />
            Release Gate
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Checklist de Producción Go/No-Go</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-[12px] font-semibold text-[#d8dee6] hover:bg-white/[0.07] hover:text-white transition-all active:scale-95 disabled:opacity-50"
          disabled={loading}
        >
          <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[#ffb0a7] flex items-center gap-1.5">
          <TriangleAlert size={16} />
          {error}
        </p>
      ) : null}

      {!error && data ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-4 transition-all duration-300 hover:bg-white/[0.02] ${overallMeta[data.overall_status].className}`}>
              <p className="text-[10px] uppercase tracking-wider opacity-70">Decisión General</p>
              <p className="mt-1.5 text-lg font-bold tracking-tight">{overallMeta[data.overall_status].label}</p>
            </div>
            <MetricCard label="Bloqueadores" value={String(data.blockers)} tone={data.blockers > 0 ? "error" : "success"} />
            <MetricCard label="Advertencias" value={String(data.warnings)} tone={data.warnings > 0 ? "warning" : "success"} />
            <MetricCard label="Manuales" value={String(data.manual)} tone="neutral" />
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-white/5 bg-white/[0.01]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className="border-b border-white/5 bg-white/[0.02] text-[#9aa3af]">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Grupo</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Verificación</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Estado</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Detalle técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.checks.map((check) => {
                    const meta = statusMeta[check.status];
                    const Icon = meta.icon;
                    return (
                      <tr key={check.id} className="text-[#d8dee6] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#8ff0ff]/70">{check.group}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#f5f7fb]">{check.label}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${meta.className}`}>
                            <Icon size={10} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[#b8c0cb] font-sans leading-relaxed">{check.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-[#8f98a6] text-right font-mono">
            Generado: {new Date(data.generated_at).toLocaleString("es-AR")}
          </p>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "success" | "error" | "warning" | "neutral" }) {
  const toneClasses = {
    success: "border-emerald-500/10 bg-emerald-500/[0.02] text-emerald-400",
    error: "border-rose-500/20 bg-rose-500/[0.03] text-rose-400",
    warning: "border-amber-500/20 bg-amber-500/[0.03] text-amber-400",
    neutral: "border-white/10 bg-white/[0.02] text-zinc-400",
  };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 hover:bg-white/[0.02] ${toneClasses[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#f5f7fb]">{value}</p>
    </div>
  );
}
