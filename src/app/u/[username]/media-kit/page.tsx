import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaKitInquiryForm } from "@/app/u/[username]/media-kit/media-kit-inquiry-form";
import { APP_EMAILS } from "@/lib/app-emails";
import { loadPublicMediaKit, type MediaKitPayload } from "@/lib/media-kit";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface MediaKitPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: MediaKitPageProps): Promise<Metadata> {
  const { username } = await params;
  const mediaKit = await loadPublicMediaKit(username);
  if (!mediaKit) {
    return {
      title: "Media kit | TravelYourMap",
      description: "Media kit interactivo para creadores de viajes.",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const canonicalUrl = `${siteUrl}/u/${encodeURIComponent(mediaKit.channel.canonicalHandle)}/media-kit`;
  const title = `${mediaKit.channel.channel_name} | Media Kit para marcas`;
  const description = `${mediaKit.summary.videos} videos en ${mediaKit.summary.countries} paises, sponsors activos y senales first-party de TravelYourMap.`;
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      nocache: true,
    },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonicalUrl,
      siteName: "TravelYourMap - BY PUPILA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MediaKitPage({ params }: MediaKitPageProps) {
  const { username } = await params;
  const mediaKit = await loadPublicMediaKit(username);
  if (!mediaKit) notFound();

  const absoluteMapUrl = `${siteUrl}${mediaKit.urls.mapUrl}`;
  const absoluteMediaKitUrl = `${siteUrl}${mediaKit.urls.mediaKitUrl}`;
  const partnershipEmail = mediaKit.settings.partnership_email || APP_EMAILS.marketing;

  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] text-[#111827]">
      <section className="mx-auto grid min-h-[92dvh] w-full max-w-7xl gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <header className="flex items-center justify-between gap-3">
            <Link href={mediaKit.urls.mapUrl} className="flex min-w-0 items-center gap-3">
              <CreatorAvatar mediaKit={mediaKit} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{mediaKit.channel.channel_name}</span>
                <span className="block truncate text-xs font-bold text-[#64748b]">@{mediaKit.channel.canonicalHandle}</span>
              </span>
            </Link>
            <Link href="/" className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[#ff5a3d]">
              TravelYourMap
            </Link>
          </header>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5a3d]">Media kit interactivo</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-normal text-[#111827] sm:text-6xl">
              {mediaKit.settings.headline}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#475569] sm:text-lg">
              {mediaKit.settings.bio}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#sponsor-inquiry" className="inline-flex h-11 items-center rounded-lg bg-[#111827] px-4 text-sm font-black text-white">
                {mediaKit.settings.preferred_cta_label || "Solicitar partnership"}
              </a>
              <Link href={mediaKit.urls.mapUrl} className="inline-flex h-11 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-black text-[#111827]">
                Ver mapa publico
              </Link>
              {mediaKit.settings.rate_card_url ? (
                <a href={mediaKit.settings.rate_card_url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-black text-[#111827]">
                  Ver rate card
                </a>
              ) : null}
              <a href={`mailto:${partnershipEmail}`} className="inline-flex h-11 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-black text-[#111827]">
                Email comercial
              </a>
            </div>
            {!mediaKit.settings.partnership_email ? (
              <p className="mt-2 text-xs text-[#64748b]">
                Si no hay email comercial configurado en el perfil, el contacto apunta a {APP_EMAILS.marketing}.
              </p>
            ) : null}
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Videos" value={formatNumber(mediaKit.summary.videos)} />
            <Metric label="Paises" value={formatNumber(mediaKit.summary.countries)} />
            <Metric label="Views YouTube" value={formatCompact(mediaKit.summary.youtube_views)} />
            <Metric label="Senales 30d" value={formatCompact(mediaKit.summary.map_events_30d)} />
          </section>
        </div>

        <aside className="space-y-4 self-end">
          <section className="rounded-lg border border-[#d7dce4] bg-white p-4 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.7)]">
            <div className="flex items-center gap-3">
              <CreatorAvatar mediaKit={mediaKit} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{mediaKit.channel.channel_name}</p>
                <p className="text-sm font-bold text-[#64748b]">{formatCompact(mediaKit.channel.subscriber_count || 0)} suscriptores</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#475569]">{mediaKit.settings.audience_note}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Sponsors" value={mediaKit.summary.active_sponsors} />
              <MiniStat label="Clicks 30d" value={mediaKit.summary.sponsor_clicks_30d} />
              <MiniStat label="Leads 30d" value={mediaKit.summary.inquiries_30d} />
            </div>
          </section>
          <section className="rounded-lg border border-[#d7dce4] bg-[#111827] p-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffb19f]">Fuente de datos</p>
            <p className="mt-2 text-sm leading-6 text-[#dbe4ef]">
              TravelYourMap combina datos importados de YouTube con interacciones propias del mapa publico. Las metricas first-party son eventos capturados dentro de la experiencia TravelYourMap.
            </p>
          </section>
        </aside>
      </section>

      <section className="border-y border-[#d7dce4] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
          <Panel title="Destinos con mas valor" eyebrow="Inventario geografico">
            <div className="grid gap-3">
              {mediaKit.topCountries.map((country) => (
                <article key={country.country_code} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{country.country_name}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{country.videos_count} videos · {formatCompact(country.map_events)} senales del mapa</p>
                  </div>
                  <p className="self-center text-sm font-black text-[#ff5a3d]">{formatCompact(country.youtube_views)}</p>
                </article>
              ))}
              {mediaKit.topCountries.length === 0 ? <p className="text-sm text-[#64748b]">Este creador todavia no tiene destinos suficientes para mostrar.</p> : null}
            </div>
          </Panel>

          <Panel title="Marcas y categorias activas" eyebrow="Prueba comercial">
            <div className="grid gap-3 sm:grid-cols-2">
              {mediaKit.activeSponsors.map((sponsor) => (
                <article key={sponsor.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#111827] text-xs font-black text-white">
                    {sponsor.logo_url ? <Image src={sponsor.logo_url} alt="" width={40} height={40} className="h-full w-full object-contain bg-white p-1" unoptimized /> : sponsor.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{sponsor.brand_name}</p>
                    <p className="truncate text-xs text-[#64748b]">{sponsor.category_name || "Sponsor activo"}</p>
                  </div>
                </article>
              ))}
              {mediaKit.activeSponsors.length === 0 ? <p className="text-sm text-[#64748b]">Disponible para primeras marcas por destino, video o sponsor global.</p> : null}
            </div>
          </Panel>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
        <div className="space-y-4">
          <Panel title="Formatos recomendados" eyebrow="Partnerships">
            <div className="grid gap-3">
              <FormatRow title="Sponsor por destino" text="Presencia contextual en paises donde la audiencia ya explora videos y rutas." />
              <FormatRow title="Integracion por video" text="Marca asociada a videos especificos con clicks, impresiones y reporte privado." />
              <FormatRow title="Sponsor global" text="Cobertura en todo el mapa para productos transversales de viaje." />
            </div>
          </Panel>
          <div className="rounded-lg border border-[#d7dce4] bg-white p-4 text-sm leading-6 text-[#475569]">
            Link del media kit: <span className="font-bold text-[#111827]">{absoluteMediaKitUrl}</span>
          </div>
        </div>
        <MediaKitInquiryForm channelId={mediaKit.channel.id} creatorName={mediaKit.channel.channel_name} mapUrl={absoluteMapUrl} />
      </section>
    </main>
  );
}

function CreatorAvatar({ mediaKit, size }: { mediaKit: MediaKitPayload; size: "sm" | "lg" }) {
  const className = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  return (
    <span className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#111827] text-sm font-black text-white`}>
      {mediaKit.channel.thumbnail_url ? (
        <Image src={mediaKit.channel.thumbnail_url} alt="" width={size === "lg" ? 64 : 40} height={size === "lg" ? 64 : 40} className="h-full w-full object-cover" unoptimized />
      ) : (
        mediaKit.channel.channel_name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#d7dce4] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#111827]">{value}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f1f5f9] p-2 text-center">
      <p className="text-lg font-black text-[#111827]">{formatNumber(value)}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">{label}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5a3d]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-[#111827]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FormatRow({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-[#e2e8f0] bg-white p-3">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#475569]">{text}</p>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}
