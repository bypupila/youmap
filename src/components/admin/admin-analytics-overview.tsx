"use client";

import { useEffect, useState } from "react";

type OverviewPayload = {
  window_days: number;
  product: {
    registered_viewers: number;
    registered_creators: number;
    monthly_active_viewers: number;
    monthly_active_creators: number;
    map_views_30d: number;
    video_opens_30d: number;
    votes_30d: number;
    sponsor_clicks_30d: number;
    saved_30d: number;
    favorites_30d: number;
    watch_later_30d: number;
    watch_time_hours_30d: number;
  };
  creators: Array<{
    channel_id: string;
    channel_name: string;
    owner_username: string;
    videos_count: number;
    subscribed_viewers: number;
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

import { useEffect, useState } from "react";
import { Users, Sparkle, Eye, HandPointing, BookmarkSimple, Star, Clock, Play, ChartBar, WarningCircle, CaretDown } from "@phosphor-icons/react";

type OverviewPayload = {
  window_days: number;
  product: {
    registered_viewers: number;
    registered_creators: number;
    monthly_active_viewers: number;
    monthly_active_creators: number;
    map_views_30d: number;
    video_opens_30d: number;
    votes_30d: number;
    sponsor_clicks_30d: number;
    saved_30d: number;
    favorites_30d: number;
    watch_later_30d: number;
    watch_time_hours_30d: number;
  };
  creators: Array<{
    channel_id: string;
    channel_name: string;
    owner_username: string;
    videos_count: number;
    subscribed_viewers: number;
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

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌐";
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "🌐";
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}

export function AdminAnalyticsOverview() {
  const [days, setDays] = useState<7 | 30 | 90 | 180>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/analytics/overview?days=${days}`, { cache: "no-store" })
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
  }, [days]);

  return (
    <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-6 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="tym-overline text-[#8ff0ff] flex items-center gap-1.5">
            <ChartBar size={14} className="text-[#8ff0ff]" weight="duotone" />
            Analytics globales
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fb]">Producto, creadores, sponsors y geografía</h2>
          <p className="mt-1 text-xs text-[#9aa3af]">Fuente: Travel Your Map (eventos internos de plataforma)</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-[#d8dee6]">
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Periodo:</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90 | 180)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer focus:text-[#e1543a] transition-colors"
          >
            <option value={7} className="bg-[#12161f] text-white">7 días</option>
            <option value={30} className="bg-[#12161f] text-white">30 días</option>
            <option value={90} className="bg-[#12161f] text-white">90 días</option>
            <option value={180} className="bg-[#12161f] text-white">180 días</option>
          </select>
        </div>
      </div>

      {loading ? <p className="mt-6 text-sm text-[#aab2bc] animate-pulse">Cargando métricas...</p> : null}
      {error ? <p className="mt-6 text-sm text-[#ffb0a7] flex items-center gap-1.5"><WarningCircle size={16} /> {error}</p> : null}

      {!loading && !error && data ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Viewers registrados" value={data.product.registered_viewers} icon={Users} />
            <MetricCard label="Creators registrados" value={data.product.registered_creators} icon={Sparkle} />
            <MetricCard label={`Map views (${data.window_days}d)`} value={data.product.map_views_30d} icon={Eye} />
            <MetricCard label={`Clicks sponsor (${data.window_days}d)`} value={data.product.sponsor_clicks_30d} icon={HandPointing} />
            <MetricCard label={`Guardados (${data.window_days}d)`} value={data.product.saved_30d} icon={BookmarkSimple} />
            <MetricCard label={`Favoritos (${data.window_days}d)`} value={data.product.favorites_30d} icon={Star} />
            <MetricCard label={`Ver más tarde (${data.window_days}d)`} value={data.product.watch_later_30d} icon={Clock} />
            <MetricCard label={`Horas reproducidas (${data.window_days}d)`} value={data.product.watch_time_hours_30d} icon={Play} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SimpleTable
              title={`Top creadores (${data.window_days}d)`}
              headers={["Canal", "Owner", "Suscriptores", "Videos", "Views mapa", "Votos"]}
              rows={data.creators.map((item) => [
                item.channel_name,
                `@${item.owner_username}`,
                n(item.subscribed_viewers),
                n(item.videos_count),
                n(item.map_views_30d),
                n(item.votes_30d),
              ])}
            />
            <SimpleTable
              title={`Top sponsors (${data.window_days}d)`}
              headers={["Sponsor", "Videos", "Clicks"]}
              rows={data.sponsors.map((item) => [item.brand_name, n(item.videos_count), n(item.clicks_30d)])}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SimpleTable
              title="Países de viewers"
              headers={["País", "Usuarios"]}
              rows={data.geography.top_viewer_countries.map((item) => [
                <div key={item.country_code} className="flex items-center gap-2">
                  <span className="text-base select-none">{countryCodeToFlag(item.country_code)}</span>
                  <span className="font-mono">{item.country_code}</span>
                </div>,
                n(item.users)
              ])}
            />
            <SimpleTable
              title={`Países por eventos (${data.window_days}d)`}
              headers={["País", "Eventos"]}
              rows={data.geography.top_event_countries.map((item) => [
                <div key={item.country_code} className="flex items-center gap-2">
                  <span className="text-base select-none">{countryCodeToFlag(item.country_code)}</span>
                  <span className="font-mono">{item.country_code}</span>
                </div>,
                n(item.events)
              ])}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-[1.25rem] border border-white/5 bg-white/[0.01] p-4.5 transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa3af]">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[#f5f7fb]">{n(value)}</p>
      </div>
      <div className="rounded-xl bg-white/[0.04] p-3 text-zinc-400 group-hover:text-white transition-colors shrink-0">
        <Icon size={20} weight="duotone" className="text-[#8ff0ff]" />
      </div>
    </div>
  );
}

function SimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: any[][] }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5">
      <p className="text-sm font-semibold text-[#f5f7fb] mb-4">{title}</p>
      <div className="overflow-hidden rounded-xl border border-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[#8f98a6]">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2.5 font-bold uppercase tracking-wider text-[9px]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[#d8dee6]">
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className="px-3 py-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-3 py-4 text-center text-[#8f98a6]">
                    Sin datos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function n(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}alue : 0);
}
