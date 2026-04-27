import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/site/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUserById, getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Facturación",
  description: "Tu plan actual de YouMap, fechas de renovación y portal de pagos.",
  robots: { index: false, follow: false },
};

interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  plan_name: string | null;
  plan_slug: string | null;
}

const STATUS_COPY: Record<string, { label: string; tone: "active" | "warn" | "muted" }> = {
  active: { label: "Activa", tone: "active" },
  trialing: { label: "Prueba en curso", tone: "active" },
  past_due: { label: "Pago pendiente", tone: "warn" },
  canceled: { label: "Cancelada", tone: "muted" },
  incomplete: { label: "Incompleta", tone: "warn" },
  incomplete_expired: { label: "Expirada", tone: "muted" },
  unpaid: { label: "Sin pago", tone: "warn" },
};

export default async function BillingPage() {
  const userId = await getSessionUserIdFromServerCookies();
  if (!userId) redirect("/auth?error=unauthorized");

  const user = await getSessionUserById(userId);
  if (!user) redirect("/auth?error=session_expired");

  const rows = await sql<SubscriptionRow[]>`
    select
      s.status,
      s.current_period_end,
      s.cancel_at_period_end,
      p.name as plan_name,
      p.slug as plan_slug
    from public.subscriptions s
    left join public.subscription_plans p on p.id = s.plan_id
    where s.user_id = ${userId}
    order by s.updated_at desc
    limit 1
  `;
  const subscription = rows[0] ?? null;

  return (
    <AppShell
      topbar={{
        eyebrow: "Facturación",
        title: subscription?.plan_name ? `Plan ${subscription.plan_name}` : "Sin plan activo",
        actions: (
          <Button asChild variant="secondary">
            <Link href="/settings">Cuenta</Link>
          </Button>
        ),
      }}
    >
      <div className="grid gap-6">
        {subscription ? (
          <ActiveSubscriptionCard subscription={subscription} />
        ) : (
          <NoSubscriptionCard />
        )}

        <section className="tm-surface rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <header className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Comparar planes</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground text-pretty">
              Mirá los detalles de cada plan o cambiate antes de la próxima renovación.
            </p>
          </header>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/pricing">Ver planes</Link>
            </Button>
            <Button asChild variant="ghost">
              <a
                href="mailto:hola@youmap.com?subject=Facturaci%C3%B3n%20YouMap"
                className="inline-flex items-center gap-2"
              >
                Soporte
                <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActiveSubscriptionCard({ subscription }: { subscription: SubscriptionRow }) {
  const status = subscription.status?.toLowerCase() ?? "";
  const statusConfig = STATUS_COPY[status] ?? { label: status || "Desconocida", tone: "muted" as const };

  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const periodEndLabel =
    periodEnd && !Number.isNaN(periodEnd.getTime())
      ? periodEnd.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
      : null;

  const renewalCopy = (() => {
    if (!periodEndLabel) return null;
    if (subscription.cancel_at_period_end) {
      return `Tu plan finaliza el ${periodEndLabel}.`;
    }
    if (status === "trialing") {
      return `Tu prueba termina y se cobra el plan el ${periodEndLabel}.`;
    }
    return `Tu próxima renovación es el ${periodEndLabel}.`;
  })();

  return (
    <section className="tm-surface-strong rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Plan actual</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {subscription.plan_name || "Plan"}
          </h2>
        </div>
        <StatusBadge tone={statusConfig.tone}>{statusConfig.label}</StatusBadge>
      </div>

      {renewalCopy ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{renewalCopy}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/pricing">Cambiar plan</Link>
        </Button>
        <Button asChild variant="ghost">
          <a
            href="mailto:hola@youmap.com?subject=Cancelar%20plan%20YouMap"
            className="inline-flex items-center gap-2"
          >
            Cancelar plan
          </a>
        </Button>
      </div>
    </section>
  );
}

function NoSubscriptionCard() {
  return (
    <section className="tm-surface-strong rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Plan actual</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Aún no tenés un plan activo.</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground text-pretty">
        Activá un plan para publicar tu mapa y desbloquear sponsors, votación y analítica por país.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/pricing">Ver planes</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/onboarding">Completar onboarding</Link>
        </Button>
      </div>
    </section>
  );
}

function StatusBadge({ tone, children }: { tone: "active" | "warn" | "muted"; children: React.ReactNode }) {
  const map = {
    active: "border-[rgba(80,200,140,0.32)] bg-[rgba(80,200,140,0.12)] text-[#9be3bd]",
    warn: "border-[rgba(255,176,167,0.32)] bg-[rgba(255,176,167,0.12)] text-[#ffd6cf]",
    muted: "border-white/10 bg-white/[0.04] text-muted-foreground",
  } as const;
  return (
    <Badge variant="outline" className={`px-3 py-1 text-[12px] ${map[tone]}`}>
      {children}
    </Badge>
  );
}
