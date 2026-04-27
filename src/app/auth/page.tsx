"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MapPin, Plug, Sparkle, Warning } from "@phosphor-icons/react";
import { MarketingShell } from "@/components/site/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "signup";

/**
 * Maps the limited set of `?error=` codes we redirect users to /auth with
 * (e.g. from /api/auth/callback/google when Google sign-in is disabled) into
 * human copy. Keeping this server-side-friendly and explicit avoids leaking
 * raw codes in the UI when an unrelated route hits the page.
 */
const AUTH_ERROR_COPY: Record<string, string> = {
  google_auth_disabled:
    "El acceso con Google no está disponible por ahora. Iniciá sesión con tu email y contraseña.",
  session_expired: "Tu sesión expiró. Volvé a iniciar sesión para continuar.",
  unauthorized: "Necesitás iniciar sesión para acceder a esa sección.",
};

const signupHighlights = [
  {
    icon: Plug,
    title: "Conecta tu canal",
    description: "Pegá la URL de tu canal de YouTube y validamos los datos en segundos.",
  },
  {
    icon: MapPin,
    title: "Mapeamos tus videos",
    description: "Detectamos países y armamos tu mapa interactivo automáticamente.",
  },
  {
    icon: Sparkle,
    title: "Activa tu plan",
    description: "Elegí el plan que se adapte a tu canal y arrancá con 7 días de prueba.",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AuthTab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const initialErrorCode = useMemo(() => searchParams?.get("error") ?? null, [searchParams]);

  useEffect(() => {
    if (!initialErrorCode) return;
    setRedirectNotice(AUTH_ERROR_COPY[initialErrorCode] ?? null);
  }, [initialErrorCode]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });
      const loginPayload = (await loginResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!loginResponse.ok) {
        throw new Error(loginPayload?.error || "No se pudo iniciar sesión.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(next: AuthTab) {
    setTab(next);
    setError(null);
  }

  return (
    <MarketingShell
      topbar={{
        eyebrow: "Cuenta",
        title: "Acceso a YouMap",
        actions: (
          <Link href="/" className="yt-btn-secondary">
            Inicio
          </Link>
        ),
      }}
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-start gap-8 px-4 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10 lg:px-6 lg:py-12">
        <section className="order-2 lg:order-1">
          <div className="max-w-[38rem]">
            <Badge variant="outline">Acceso de creadores</Badge>
            <h1 className="mt-5 max-w-[12ch] text-balance text-4xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl md:leading-none">
              Entra, activa tu mapa y publica una presencia propia.
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-7 text-muted-foreground text-pretty">
              YouMap convierte el catálogo de tu canal en una experiencia editorial: rutas, países, sponsors y una URL pública lista para ventas o discovery.
            </p>
          </div>
        </section>

        <section
          className="order-1 tm-surface-strong rounded-[2rem] p-6 sm:p-8 lg:order-2 lg:ml-auto lg:w-full lg:max-w-[38rem]"
          aria-labelledby="auth-section-heading"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="yt-overline">Cuenta YouMap</p>
              <h2
                id="auth-section-heading"
                className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground"
              >
                {tab === "login" ? "Inicia sesión" : "Crea tu cuenta"}
              </h2>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Tipo de acceso"
            className="mb-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
          >
            {(
              [
                { id: "login" as const, label: "Iniciar sesión" },
                { id: "signup" as const, label: "Crear cuenta" },
              ]
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`auth-tab-${entry.id}`}
                aria-selected={tab === entry.id}
                aria-controls={`auth-panel-${entry.id}`}
                tabIndex={tab === entry.id ? 0 : -1}
                onClick={() => handleTabChange(entry.id)}
                className={cn("yt-nav-pill px-4")}
                data-active={tab === entry.id}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {redirectNotice ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-[rgba(255,176,167,0.32)] bg-[rgba(255,176,167,0.08)] px-4 py-3 text-sm leading-6 text-[#ffd6cf]"
            >
              <Warning size={18} weight="duotone" aria-hidden="true" className="mt-0.5 shrink-0" />
              <p>{redirectNotice}</p>
            </div>
          ) : null}

          <div
            id="auth-panel-login"
            role="tabpanel"
            aria-labelledby="auth-tab-login"
            hidden={tab !== "login"}
          >
            <form className="grid gap-4" onSubmit={handleLogin}>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Email o usuario
                </span>
                <Input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="tu@email.com o tu_usuario"
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">
                  Usa el email con el que te registraste o tu identificador público.
                </p>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Contraseña
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
              </label>
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={loading || !identifier.trim() || !password.trim()}
              >
                {loading ? "Ingresando..." : "Entrar"}
              </Button>
            </form>

            {error ? (
              <p className="mt-4 text-sm text-[#ffb0a7]" role="alert">
                {error}
              </p>
            ) : null}

            <p className="mt-5 text-sm text-muted-foreground">
              ¿Aún no tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => handleTabChange("signup")}
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
              >
                Crear cuenta
              </button>
              .
            </p>
          </div>

          <div
            id="auth-panel-signup"
            role="tabpanel"
            aria-labelledby="auth-tab-signup"
            hidden={tab !== "signup"}
          >
            <p className="text-sm leading-6 text-muted-foreground">
              Para crear tu cuenta necesitamos conectar tu canal y elegir un plan. El proceso completo toma unos 2 minutos.
            </p>

            <ol className="mt-5 grid gap-3">
              {signupHighlights.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                      aria-hidden="true"
                    >
                      <Icon size={18} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">
                        <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/onboarding"
                className="yt-btn-primary inline-flex items-center justify-center gap-2"
              >
                Empezar onboarding
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Ver planes y precios
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Trial de 7 días incluido en todos los planes pagos. Cancelas cuando quieras.
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
