import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ContactStrip } from "@/components/site/contact-strip";
import { getBrandPortalAccessCookieName, loadBrandPortalByToken, type SponsorCrmCampaign } from "@/lib/sponsor-crm";
import { BrandPortalAccessForm } from "./brand-portal-access-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal privado de marca | TravelYourMap",
  description: "Estado privado de campaña para una marca en TravelYourMap.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function BrandPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cleanToken = String(token || "").trim();
  const cookieStore = await cookies();
  const portalResult = await loadBrandPortalByToken(cleanToken, cookieStore.get(getBrandPortalAccessCookieName(cleanToken))?.value || null);
  if (portalResult.status === "not_found") notFound();
  if (portalResult.status === "access_required") {
    return (
      <main className="min-h-[100dvh] bg-[#f6f7f2] px-4 py-10 text-[#151515]">
        <div className="mx-auto flex w-full max-w-6xl flex-col">
          <BrandPortalAccessForm token={cleanToken} brandName={portalResult.brand_name} emailHint={portalResult.access_email_hint} />
          <ContactStrip
            title="Contacto"
            description="Si necesitas ayuda con acceso o revisión de campaña, usa soporte. Para campañas y renovaciones, marketing es el canal correcto."
            items={[
              { label: "Soporte", email: "support" },
              { label: "Marketing", email: "marketing" },
            ]}
            tone="light"
          />
        </div>
      </main>
    );
  }

  const portal = portalResult.portal;
  const campaign = portal.campaign;
  const paid = campaign.payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount_usd, 0);
  const pending = campaign.payments.filter((payment) => payment.status !== "paid").reduce((sum, payment) => sum + payment.amount_usd, 0);

  return (
    <main className="min-h-[100dvh] bg-[#f6f7f2] text-[#151515]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b border-[#d8d5ca] pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <Logo src={portal.creator.thumbnail_url} label={portal.creator.channel_name} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5a3d]">Portal privado de marca</p>
                <p className="mt-1 text-sm font-bold text-[#65635e]">{portal.creator.channel_name}</p>
              </div>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl">
              {campaign.brand_name}: {campaign.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f5b53]">
              Estado compartido de campaña, entregables y pagos. Este link es privado y puede ser revocado por el creador.
            </p>
          </div>
          <div className="rounded-lg border border-[#d8d5ca] bg-white/80 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a8172]">Estado</p>
            <p className="mt-2 text-2xl font-black">{formatCampaignStatus(campaign.status)}</p>
            <p className="mt-1 text-xs text-[#65635e]">{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Budget" value={campaign.budget_usd ? `$${formatNumber(campaign.budget_usd)}` : "Pendiente"} />
          <Metric label="Entregables" value={`${doneDeliverables(campaign)}/${campaign.deliverables.length}`} />
          <Metric label="Pagado" value={`$${formatNumber(paid)}`} />
          <Metric label="Pendiente" value={`$${formatNumber(pending)}`} />
        </section>

        {campaign.objective ? (
          <section className="rounded-lg border border-[#d8d5ca] bg-white/80 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a8172]">Objetivo</p>
            <p className="mt-2 text-sm leading-6 text-[#3f3c36]">{campaign.objective}</p>
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Panel title="Entregables">
            <div className="divide-y divide-[#e5e1d8]">
              {campaign.deliverables.map((deliverable) => (
                <article key={deliverable.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{deliverable.title}</p>
                    <p className="mt-1 text-xs text-[#65635e]">{deliverable.deliverable_type} · vence {formatDate(deliverable.due_date)}</p>
                    {deliverable.public_url ? (
                      <a href={deliverable.public_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-black text-[#ff5a3d]">
                        Abrir entregable
                      </a>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-[#d8d5ca] bg-[#f6f7f2] px-3 py-1 text-xs font-black">
                    {formatDeliverableStatus(deliverable.status)}
                  </span>
                </article>
              ))}
              {campaign.deliverables.length === 0 ? <p className="py-8 text-sm text-[#65635e]">Todavia no hay entregables publicados en este portal.</p> : null}
            </div>
          </Panel>

          <Panel title="Pagos">
            <div className="divide-y divide-[#e5e1d8]">
              {campaign.payments.map((payment) => (
                <article key={payment.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{payment.label}</p>
                    <p className="font-mono text-sm font-black">${formatNumber(payment.amount_usd)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[#65635e]">
                    <span>Vence {formatDate(payment.due_date)}</span>
                    <span>{formatPaymentStatus(payment.status)}</span>
                  </div>
                </article>
              ))}
              {campaign.payments.length === 0 ? <p className="py-8 text-sm text-[#65635e]">Todavia no hay pagos registrados.</p> : null}
            </div>
          </Panel>
        </section>
        <ContactStrip
          title="Contacto"
          description="Para soporte de portal privado, acceso o seguimiento comercial, usa los canales oficiales."
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

function Logo({ src, label }: { src: string | null; label: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#151515] text-sm font-black text-white">
      {src ? <Image src={src} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized /> : label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#d8d5ca] bg-white/80 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a8172]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8d5ca] bg-white/80 p-4">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function doneDeliverables(campaign: SponsorCrmCampaign) {
  return campaign.deliverables.filter((deliverable) => ["approved", "published"].includes(deliverable.status)).length;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatCampaignStatus(value: string) {
  const labels: Record<string, string> = {
    lead: "Lead",
    proposal: "Propuesta",
    negotiation: "Negociacion",
    active: "Activa",
    delivered: "Entregada",
    paid: "Pagada",
    lost: "Perdida",
  };
  return labels[value] || value;
}

function formatDeliverableStatus(value: string) {
  const labels: Record<string, string> = {
    todo: "Pendiente",
    in_progress: "En progreso",
    submitted: "Enviado",
    approved: "Aprobado",
    published: "Publicado",
  };
  return labels[value] || value;
}

function formatPaymentStatus(value: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    invoiced: "Facturado",
    paid: "Pagado",
    overdue: "Vencido",
  };
  return labels[value] || value;
}
