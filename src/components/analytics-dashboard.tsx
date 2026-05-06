"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AnalyticsResponse {
  top_countries: Array<{ country_name: string; video_count: number }>;
  videos_by_month: Array<{ month: string; count: number }>;
  unlocated_videos: Array<{ id: string; title: string; view_count: number }>;
  total_countries: number;
  total_mapped_videos: number;
  total_views: number;
  monthly_visitors: number;
}

export function AnalyticsDashboard({ channelId, initialStats }: { channelId?: string; initialStats?: AnalyticsResponse | null }) {
  const [loading, setLoading] = useState(!initialStats);
  const [stats, setStats] = useState<AnalyticsResponse | null>(initialStats || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStats || !channelId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/analytics/${channelId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "No se pudo cargar analytics");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channelId, initialStats]);

  const topCountries = useMemo(() => stats?.top_countries || [], [stats]);

  if (loading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">Cargando analytics...</div>;
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 p-6 text-sm text-[#ffd3cb]">
        Error cargando analytics: {error || "sin datos"}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Países visitados" value={stats.total_countries} />
        <KpiCard label="Videos mapeados" value={stats.total_mapped_videos} />
        <KpiCard label="Total views" value={formatNumber(stats.total_views)} />
        <KpiCard label="Visitantes/mes" value={formatNumber(stats.monthly_visitors)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Top países por videos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topCountries} layout="vertical" margin={{ left: 28 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="country_name" tick={{ fontSize: 11, fill: "#CBD5E1" }} width={120} />
              <Tooltip cursor={{ fill: "rgba(148,163,184,.08)" }} />
              <Bar dataKey="video_count" radius={[0, 5, 5, 0]}>
                {topCountries.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#00D4FF"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Videos por mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.videos_by_month}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#CBD5E1" }} />
              <YAxis tick={{ fontSize: 11, fill: "#CBD5E1" }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </div>

      {stats.unlocated_videos.length > 0 ? (
        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">
            Videos sin ubicación ({stats.unlocated_videos.length})
          </h3>
          <div className="space-y-2">
            {stats.unlocated_videos.slice(0, 10).map((video) => (
              <div key={video.id} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <p className="text-sm text-slate-100">{video.title}</p>
                <p className="text-xs text-slate-400">{formatNumber(video.view_count)} views</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
