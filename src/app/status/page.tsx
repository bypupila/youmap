import { Badge } from "@/components/ui/badge";
import { ContactStrip } from "@/components/site/contact-strip";
import { loadPublicStatus, type PublicServiceStatus } from "@/lib/public-status";

export const dynamic = "force-dynamic";

const statusLabel: Record<PublicServiceStatus, string> = {
  operational: "Operativo",
  degraded: "Degradado",
  incident: "Incidente",
  unknown: "Sin datos",
};

const statusClasses: Record<PublicServiceStatus, string> = {
  operational: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  incident: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  unknown: "border-slate-400/30 bg-slate-500/10 text-slate-200",
};

export default async function StatusPage() {
  const status = await loadPublicStatus();
  const generatedAt = new Date(status.generated_at);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(225,84,58,0.18),transparent_34%),linear-gradient(180deg,rgba(11,13,15,0.98),rgba(17,20,22,0.96))]" />
      <div className="relative mx-auto max-w-[1120px] px-4 py-8 lg:px-6 lg:py-10">
        <header className="tm-surface-strong rounded-[2rem] border border-white/10 px-6 py-5">
          <p className="tym-overline text-[#8ff0ff]">Travel Your Map</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#f5f7fb]">Estado del servicio</h1>
          <p className="mt-2 text-sm text-[#aab2bc]">Ultima actualizacion: {generatedAt.toLocaleString("es-AR")}</p>
          <div className="mt-3">
            <Badge className={statusClasses[status.overall_status]}>{statusLabel[status.overall_status]}</Badge>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {status.services.map((service) => (
            <article key={service.key} className="tm-surface-strong rounded-[1.5rem] border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#f5f7fb]">{service.label}</h2>
                <Badge className={statusClasses[service.status]}>{statusLabel[service.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-[#b4bcc7]">{service.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 tm-surface-strong rounded-[2rem] border border-white/10 p-5">
          <p className="tym-overline text-[#8ff0ff]">Indicadores 24 horas</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <IndicatorCard label="Imports completados" value={status.indicators.imports_completed_24h} />
            <IndicatorCard label="Imports fallidos" value={status.indicators.imports_failed_24h} />
            <IndicatorCard label="Imports en ejecucion" value={status.indicators.imports_running_now} />
            <IndicatorCard label="Videos en revision manual" value={status.indicators.manual_review_videos} />
            <IndicatorCard label="Votaciones activas" value={status.indicators.live_polls} />
            <IndicatorCard label="Eventos internos" value={status.indicators.map_events_24h} />
          </div>
        </section>
        <ContactStrip
          title="Contacto"
          description="Si el estado muestra degradación y necesitas ayuda, contacta soporte técnico."
          items={[
            { label: "Soporte", email: "support" },
            { label: "Admin", email: "admin" },
          ]}
          tone="dark"
          className="mt-6"
        />
      </div>
    </main>
  );
}

function IndicatorCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9aa3af]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#f5f7fb]">{new Intl.NumberFormat("es-AR").format(value || 0)}</p>
    </div>
  );
}
