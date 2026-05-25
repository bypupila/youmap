"use client";

import { useEffect, useState } from "react";

type OverviewPayload = {
  product: {
    registered_viewers: number;
    registered_creators: number;
    monthly_active_viewers: number;
    monthly_active_creators: number;
    map_views_30d: number;
    video_opens_30d: number;
    votes_30d: number;
    sponsor_clicks_30d: number;
  };
  creators: Array<{
    channel_id: string;
    channel_name: string;
    owner_username: string;
    videos_count: number;
    map_views_30d: number;
    votes_30d: number;
  }>;
  sponsors: Array<{
    sponsor_id: string;
    brand_name: string;
    videos_count: number;
    clicks_30d: number;
  }>;
  geography: {
    top_viewer_countries: Array<{ country_code: string; users: number }>;
    top_event_countries: Array<{ country_code: string; events: number }>;
  };
};

export function AdminAnalyticsOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics/overview", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<OverviewPayload>;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar métricas.");
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
      <p className="tym-overline text-[#8ff0ff]">Analytics globales</p>
      <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Producto, creadores, sponsors y geografía</h2>
      <p className="mt-1 text-xs text-[#9aa3af]">Fuente: Travel Your Map (eventos internos de plataforma)</p>

      {loading ? <p className="mt-4 text-sm text-[#aab2bc]">Cargando métricas...</p> : null}
      {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Viewers registrados" value={data.product.registered_viewers} />
            <MetricCard label="Creators registrados" value={data.product.registered_creators} />
            <MetricCard label="Map views (30d)" value={data.product.map_views_30d} />
            <MetricCard label="Clicks sponsor (30d)" value={data.product.sponsor_clicks_30d} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SimpleTable
              title="Top creadores (30d)"
              headers={["Canal", "Owner", "Videos", "Views mapa", "Votos"]}
              rows={data.creators.map((item) => [item.channel_name, item.owner_username, n(item.videos_count), n(item.map_views_30d), n(item.votes_30d)])}
            />
            <SimpleTable
              title="Top sponsors (30d)"
              headers={["Sponsor", "Videos", "Clicks"]}
              rows={data.sponsors.map((item) => [item.brand_name, n(item.videos_count), n(item.clicks_30d)])}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SimpleTable
              title="Países de viewers"
              headers={["País", "Usuarios"]}
              rows={data.geography.top_viewer_countries.map((item) => [item.country_code, n(item.users)])}
            />
            <SimpleTable
              title="Países por eventos (30d)"
              headers={["País", "Eventos"]}
              rows={data.geography.top_event_countries.map((item) => [item.country_code, n(item.events)])}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9aa3af]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#f5f7fb]">{n(value)}</p>
    </div>
  );
}

function SimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-[#f5f7fb]">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-[12px]">
          <thead className="text-[#8f98a6]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-2 py-1.5 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-t border-white/10 text-[#d8dee6]">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-2 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-2 py-3 text-[#8f98a6]">
                  Sin datos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function n(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}
