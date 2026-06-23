import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ContactStrip } from "@/components/site/contact-strip";
import { loadSponsorReportByToken, type SponsorReportVideoMetric } from "@/lib/sponsor-reports";
import { SponsorReportActions } from "./sponsor-report-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte privado de sponsor | TravelYourMap",
  description: "Reporte privado de rendimiento para una marca en TravelYourMap.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

interface SponsorReportPageProps {
  params: Promise<{ token: string }>;
}

export default async function SponsorReportPage({ params }: SponsorReportPageProps) {
  const { token } = await params;
  const report = await loadSponsorReportByToken(String(token || "").trim());
  if (!report) notFound();

  const maxDaily = Math.max(1, ...report.travel_map.daily.map((entry) => entry.impressions + entry.clicks));

  return (
    <main className="min-h-[100dvh] bg-[#f5f1e8] text-[#16120d]">
      <PrintStyles />
      <section className="report-shell mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <div className="no-print flex items-center justify-between gap-3 rounded-lg border border-[#d7cbbb] bg-white/55 p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b6b4a]">Export de reporte</p>
          <SponsorReportActions />
        </div>

        <header className="report-section grid gap-4 border-b border-[#d7cbbb] pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <LogoBadge src={report.platform.logo_url} label={report.platform.name} />
              <LogoBadge src={report.creator.logo_url} label={report.creator.name} />
              <LogoBadge src={report.sponsor.logo_url} label={report.sponsor.brand_name} />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#8b6b4a]">Reporte privado de sponsor</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[1.02] tracking-normal text-[#16120d] sm:text-5xl">
              {report.sponsor.brand_name} en el mapa de {report.creator.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f574f] sm:text-base">
              Resultados de los ultimos {report.period.days} dias. TravelYourMap mide interacciones propias del mapa; YouTube importado se muestra como contexto del contenido.
            </p>
          </div>
          <div className="rounded-lg border border-[#d7cbbb] bg-white/55 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b6b4a]">Alcance</p>
            <p className="mt-2 font-black text-[#16120d]">{report.sponsor.scope_label}</p>
            <p className="mt-1 text-xs text-[#6d6257]">{formatDate(report.period.since)} - {formatDate(report.period.until)}</p>
          </div>
        </header>

        <section className="report-section grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Impresiones" value={formatNumber(report.travel_map.impressions)} detail="Sponsor visible en TravelYourMap" />
          <MetricCard label="Clicks" value={formatNumber(report.travel_map.clicks)} detail={`${formatNumber(report.travel_map.unique_clickers)} usuarios unicos anonimos`} />
          <MetricCard label="CTR" value={formatPercent(report.travel_map.ctr)} detail="Clicks / impresiones" />
          <MetricCard label="Videos abiertos" value={formatNumber(report.travel_map.video_opens)} detail="Aperturas de videos dentro del mapa" />
        </section>

        <section className="report-section grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <Panel title="TravelYourMap analytics" eyebrow="Fuente first-party">
            <div className="grid gap-3 sm:grid-cols-3">
              <SmallStat label="Guardados" value={formatNumber(report.travel_map.saved)} />
              <SmallStat label="Favoritos" value={formatNumber(report.travel_map.favorites)} />
              <SmallStat label="Watch later" value={formatNumber(report.travel_map.watch_later)} />
            </div>
            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-black">Actividad diaria</p>
                  <p className="text-xs text-[#6d6257]">Impresiones y clicks registrados por dia.</p>
                </div>
                <p className="text-xs font-bold text-[#8b6b4a]">{formatDuration(report.travel_map.watch_time_seconds)} de watch time</p>
              </div>
              <div className="mt-4 grid h-44 grid-cols-[repeat(30,minmax(6px,1fr))] items-end gap-1 overflow-hidden">
                {report.travel_map.daily.slice(-30).map((entry) => {
                  const total = entry.impressions + entry.clicks;
                  return (
                    <div key={entry.day} className="flex h-full items-end" title={`${entry.day}: ${entry.impressions} impresiones, ${entry.clicks} clicks`}>
                      <div className="w-full rounded-t bg-[#ff5a3d]" style={{ height: `${Math.max(4, (total / maxDaily) * 100)}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Resumen para la marca" eyebrow="Lectura ejecutiva">
            <div className="space-y-4">
              <Insight label="Pais con mas senales" value={report.travel_map.top_country ? `${report.travel_map.top_country.country_name} (${formatNumber(report.travel_map.top_country.impressions + report.travel_map.top_country.clicks)})` : "Sin datos suficientes"} />
              <Insight label="Video mas abierto en mapa" value={report.travel_map.top_video?.title || "Sin aperturas registradas"} />
              <Insight label="Video mas fuerte en YouTube" value={report.youtube.top_video?.title || "Sin videos en alcance"} />
              {report.sponsor.discount_code ? <Insight label="Codigo de descuento" value={report.sponsor.discount_code} /> : null}
            </div>
          </Panel>
        </section>

        <section className="report-section grid gap-4 lg:grid-cols-2">
          <Panel title="Top videos en TravelYourMap" eyebrow="Aperturas dentro del mapa">
            <VideoList videos={report.travel_map.top_videos} empty="Todavia no hay aperturas de videos para este sponsor." mode="map" />
          </Panel>
          <Panel title="Top videos importados de YouTube" eyebrow="Contexto externo">
            <VideoList videos={report.youtube.top_video ? [report.youtube.top_video, ...report.travel_map.top_videos.filter((video) => video.youtube_video_id !== report.youtube.top_video?.youtube_video_id)].slice(0, 5) : []} empty="No hay videos en el alcance actual del sponsor." mode="youtube" />
          </Panel>
        </section>

        <section className="report-section grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title="Top paises" eyebrow="Senales geograficas">
            <div className="divide-y divide-[#e2d8ca]">
              {report.travel_map.top_countries.map((country) => (
                <div key={country.country_code || country.country_name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-3 text-sm">
                  <p className="truncate font-bold">{country.country_name}</p>
                  <p className="text-[#6d6257]">{formatNumber(country.impressions)} imp.</p>
                  <p className="font-black">{formatNumber(country.clicks)} clicks</p>
                </div>
              ))}
              {report.travel_map.top_countries.length === 0 ? <p className="py-6 text-sm text-[#6d6257]">Todavia no hay paises con datos para este periodo.</p> : null}
            </div>
          </Panel>
          <Panel title="Fuente de datos" eyebrow="Transparencia">
            <div className="grid gap-3 sm:grid-cols-3">
              <SmallStat label="Views YouTube en alcance" value={formatNumber(report.youtube.total_views_in_scope)} />
              <SmallStat label="Likes YouTube" value={formatNumber(report.youtube.total_likes_in_scope)} />
              <SmallStat label="Comentarios YouTube" value={formatNumber(report.youtube.total_comments_in_scope)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5f574f]">
              Las metricas de TravelYourMap provienen de eventos first-party del mapa publico. Las metricas de YouTube son datos importados del canal y se usan como contexto editorial y de alcance potencial.
            </p>
          </Panel>
        </section>
        <footer className="report-footer border-t border-[#d7cbbb] pt-4 text-xs leading-5 text-[#6d6257]">
          <p className="font-black text-[#16120d]">TravelYourMap sponsor report</p>
          <p>Documento privado generado desde metricas first-party del mapa y datos importados del canal. No distribuir fuera del equipo de la marca sin permiso del creador.</p>
        </footer>
        <ContactStrip
          title="Contacto"
          description="Para soporte del reporte privado, acceso o interpretación de métricas, usa los canales oficiales."
          items={[
            { label: "Soporte", email: "support" },
            { label: "Marketing", email: "marketing" },
          ]}
          tone="light"
        />
      </section>
    </main>
  );
}

function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: A4;
            margin: 14mm;
          }

          @media print {
            html,
            body {
              background: #ffffff !important;
              color: #16120d !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .no-print {
              display: none !important;
            }

            .report-shell {
              max-width: none !important;
              padding: 0 !important;
              gap: 14px !important;
            }

            .report-section,
            .report-panel,
            .report-card,
            .report-video-row,
            .report-footer {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .report-section {
              margin-bottom: 12px !important;
            }

            .report-panel,
            .report-card {
              background: #ffffff !important;
              border-color: #d7cbbb !important;
              box-shadow: none !important;
            }

            h1 {
              font-size: 30px !important;
              line-height: 1.05 !important;
            }

            h2 {
              font-size: 16px !important;
            }

            p,
            span,
            div {
              letter-spacing: 0 !important;
            }

            a {
              color: inherit !important;
              text-decoration: none !important;
            }
          }
        `,
      }}
    />
  );
}

function LogoBadge({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="report-card flex items-center gap-2 rounded-lg border border-[#d7cbbb] bg-white/70 px-2.5 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#16120d] text-xs font-black text-white">
        {src ? <Image src={src} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized /> : label.slice(0, 2).toUpperCase()}
      </div>
      <span className="max-w-[170px] truncate text-xs font-black text-[#16120d]">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="report-card rounded-lg border border-[#d7cbbb] bg-white/70 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b6b4a]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#16120d]">{value}</p>
      <p className="mt-1 text-xs text-[#6d6257]">{detail}</p>
    </article>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="report-panel rounded-lg border border-[#d7cbbb] bg-white/70 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b6b4a]">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-black text-[#16120d]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-card rounded-lg border border-[#e2d8ca] bg-[#fbf8f1] p-3">
      <p className="text-xs text-[#6d6257]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#16120d]">{value}</p>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8b6b4a]">{label}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-[#16120d]">{value}</p>
    </div>
  );
}

function VideoList({ videos, empty, mode }: { videos: SponsorReportVideoMetric[]; empty: string; mode: "map" | "youtube" }) {
  if (videos.length === 0) return <p className="py-6 text-sm text-[#6d6257]">{empty}</p>;
  return (
    <div className="divide-y divide-[#e2d8ca]">
      {videos.slice(0, 5).map((video) => (
        <article key={`${mode}-${video.youtube_video_id}`} className="report-video-row grid grid-cols-[72px_minmax(0,1fr)_auto] gap-3 py-3">
          <div className="h-12 overflow-hidden rounded-md bg-[#16120d]">
            {video.thumbnail_url ? <Image src={video.thumbnail_url} alt="" width={72} height={48} className="h-full w-full object-cover" unoptimized /> : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#16120d]">{video.title}</p>
            <p className="mt-1 text-xs text-[#6d6257]">{video.country_name || "Sin pais"}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-black text-[#16120d]">{mode === "map" ? formatNumber(video.travel_map_opens) : formatNumber(video.youtube_views)}</p>
            <p className="text-[#6d6257]">{mode === "map" ? "aperturas" : "views"}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const hours = Math.floor((seconds || 0) / 3600);
  const minutes = Math.round(((seconds || 0) % 3600) / 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}
