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
  window_days?: number;
  top_countries: Array<{ country_name: string; video_count: number }>;
  videos_by_month: Array<{ month: string; count: number }>;
  unlocated_videos: Array<{ id: string; title: string; view_count: number }>;
  total_countries: number;
  total_mapped_videos: number;
  total_views: number;
  monthly_visitors: number;
  internal_metrics?: {
    map_views: number;
    video_panel_opens: number;
    sponsor_clicks: number;
    poll_votes: number;
    saved_added: number;
    favorites_added: number;
    watch_later_added: number;
    watch_time_hours: number;
  };
  internal_top_countries?: Array<{ country_code: string; interactions: number }>;
  metric_sources?: {
    total_views?: "youtube" | "travelyourmap";
    top_countries?: "youtube" | "travelyourmap";
    monthly_visitors?: "youtube" | "travelyourmap";
    internal_metrics?: "youtube" | "travelyourmap";
  };
}

export function AnalyticsDashboard({ channelId, initialStats }: { channelId?: string; initialStats?: AnalyticsResponse | null }) {
  const [days, setDays] = useState<7 | 30 | 90 | 180>(30);
  const [loading, setLoading] = useState(!initialStats);
  const [stats, setStats] = useState<AnalyticsResponse | null>(initialStats || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/analytics/${channelId}?days=${days}`, { cache: "no-store" })
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
  }, [channelId, days]);

  const topCountries = useMemo(() => stats?.top_countries || [], [stats]);
  const internalMetrics = stats?.internal_metrics || {
    map_views: 0,
    video_panel_opens: 0,
    sponsor_clicks: 0,
    poll_votes: 0,
    saved_added: 0,
    favorites_added: 0,
    watch_later_added: 0,
    watch_time_hours: 0,
  };
  const internalTopCountries = stats?.internal_top_countries || [];

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
      <div className="inline-flex items-center gap-2 text-xs">
        <span className="text-slate-400">Periodo</span>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90 | 180)}
          className="h-8 rounded-lg border border-slate-800 bg-slate-950/70 px-2 text-slate-200 outline-none"
        >
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
          <option value={180}>180 días</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Países (YouTube)" value={stats.total_countries} source={stats.metric_sources?.top_countries || "youtube"} />
        <KpiCard label="Videos mapeados" value={stats.total_mapped_videos} source="travelyourmap" />
        <KpiCard label="Total views" value={formatNumber(stats.total_views)} source={stats.metric_sources?.total_views || "youtube"} />
        <KpiCard label="Visitantes/mes (TYM)" value={formatNumber(stats.monthly_visitors)} source={stats.metric_sources?.monthly_visitors || "travelyourmap"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
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

        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">
            Interacciones internas (Travel Your Map · {stats.window_days || days}d)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <MiniMetric label="Map views" value={internalMetrics.map_views} />
            <MiniMetric label="Video opens" value={internalMetrics.video_panel_opens} />
            <MiniMetric label="Sponsor clicks" value={internalMetrics.sponsor_clicks} />
            <MiniMetric label="Poll votes" value={internalMetrics.poll_votes} />
            <MiniMetric label="Guardados" value={internalMetrics.saved_added} />
            <MiniMetric label="Favoritos" value={internalMetrics.favorites_added} />
            <MiniMetric label="Ver más tarde" value={internalMetrics.watch_later_added} />
            <MiniMetric label="Horas reproducidas (TYM)" value={internalMetrics.watch_time_hours} />
          </div>
          <div className="mt-4 space-y-2">
            {internalTopCountries.slice(0, 5).map((country) => (
              <div key={country.country_code} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <span className="text-xs text-slate-200">{country.country_code}</span>
                <span className="text-xs text-slate-400">{formatNumber(country.interactions)}</span>
              </div>
            ))}
            {internalTopCountries.length === 0 ? <p className="text-xs text-slate-500">Sin interacciones internas aún.</p> : null}
          </div>
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

function KpiCard({ label, value, source }: { label: string; value: string | number; source: "youtube" | "travelyourmap" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">{source === "youtube" ? "Fuente: YouTube" : "Fuente: Travel Your Map"}</p>
      <p className="text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{formatNumber(value)}</p>
    </div>
  );
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
