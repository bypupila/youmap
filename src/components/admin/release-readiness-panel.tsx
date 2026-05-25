"use client";

import { useCallback, useEffect, useState } from "react";

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

const statusLabel: Record<ReleaseCheckStatus, string> = {
  pass: "Pass",
  fail: "Blocker",
  warn: "Warning",
  manual: "Manual",
};

const statusClass: Record<ReleaseCheckStatus, string> = {
  pass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  fail: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  warn: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  manual: "border-slate-400/30 bg-slate-500/10 text-slate-200",
};

const overallLabel: Record<ReleasePayload["overall_status"], string> = {
  go: "GO",
  go_with_warnings: "GO con advertencias",
  no_go: "NO GO",
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
    <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tym-overline text-[#8ff0ff]">Release Gate</p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Checklist go/no-go ejecutable</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-white/[0.03] px-3 text-[12px] text-[#d8dee6] hover:bg-white/[0.07]"
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}

      {!error && data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <MetricCard label="Estado" value={overallLabel[data.overall_status]} />
            <MetricCard label="Blockers" value={String(data.blockers)} />
            <MetricCard label="Warnings" value={String(data.warnings)} />
            <MetricCard label="Manual" value={String(data.manual)} />
          </div>
          <p className="mt-3 text-[12px] text-[#9aa3af]">Generado: {new Date(data.generated_at).toLocaleString("es-AR")}</p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-white/[0.03] text-[#9aa3af]">
                <tr>
                  <th className="px-2 py-2">Grupo</th>
                  <th className="px-2 py-2">Check</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.checks.map((check) => (
                  <tr key={check.id} className="border-t border-white/10 text-[#d8dee6]">
                    <td className="px-2 py-2">{check.group}</td>
                    <td className="px-2 py-2">{check.label}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass[check.status]}`}>
                        {statusLabel[check.status]}
                      </span>
                    </td>
                    <td className="px-2 py-2">{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#9aa3af]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold text-[#f5f7fb]">{value}</p>
    </div>
  );
}
