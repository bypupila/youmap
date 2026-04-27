import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/site/app-shell";
import { CopyLinkButton } from "@/components/site/copy-link-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUserById, getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { toPublicMapPath } from "@/lib/auth-identifiers";
import { buildPublicShareUrl } from "@/lib/map-public";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuenta",
  description: "Gestiona tu perfil de YouMap, tu URL pública y la sesión.",
  robots: { index: false, follow: false },
};

interface ChannelRow {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
}

export default async function SettingsPage() {
  const userId = await getSessionUserIdFromServerCookies();
  if (!userId) redirect("/auth?error=unauthorized");

  const user = await getSessionUserById(userId);
  if (!user) redirect("/auth?error=session_expired");

  const channelRows = await sql<ChannelRow[]>`
    select id, channel_name, channel_handle
    from public.channels
    where user_id = ${userId}
    order by created_at desc
    limit 1
  `;
  const channel = channelRows[0] ?? null;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const publicPath = toPublicMapPath(user.username);
  const publicUrl = `${siteUrl}${publicPath}`;
  const shareUrl = channel?.channel_handle ? buildPublicShareUrl(channel.channel_handle) : publicUrl;

  return (
    <AppShell
      topbar={{
        eyebrow: "Cuenta",
        title: user.display_name || user.username,
        actions: (
          <Button asChild variant="secondary">
            <Link href="/dashboard">Ir al mapa</Link>
          </Button>
        ),
      }}
    >
      <div className="grid gap-6">
        <SettingsCard
          title="Tu perfil"
          description="Esta información aparece en tu URL pública y en los mapas que compartes."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={user.display_name || "—"} />
            <Field label="Usuario" value={`@${user.username}`} mono />
            <Field label="Email" value={user.email} mono />
            <Field
              label="Canal conectado"
              value={channel?.channel_name || "Sin canal aún"}
            />
          </dl>
        </SettingsCard>

        <SettingsCard
          title="Tu URL pública"
          description="Compártela con tu audiencia, agencias o sponsors. Se actualiza al instante con cada nuevo video."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="font-mono text-[12px]">
              {publicUrl || publicPath}
            </Badge>
            {publicUrl ? <CopyLinkButton value={publicUrl} /> : null}
            <Button asChild variant="outline">
              <Link
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                Abrir
                <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          {shareUrl && shareUrl !== publicUrl ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Tu mapa también responde en{" "}
              <span className="font-mono text-foreground">{shareUrl}</span>
            </p>
          ) : null}
        </SettingsCard>

        <SettingsCard
          title="Sesión"
          description="Cerrá sesión en este dispositivo. Tus datos siguen disponibles cuando vuelvas."
        >
          <div className="flex flex-wrap items-center gap-3">
            <LogoutButton />
            <Button asChild variant="ghost">
              <Link href="/billing">Ver mi plan y facturación</Link>
            </Button>
          </div>
        </SettingsCard>
      </div>
    </AppShell>
  );
}

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <section className="tm-surface rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Field({ label, value, mono }: FieldProps) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
