"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildViewerRegisterHref,
  readViewerAuthAttribution,
  readViewerAuthAttributionFromLocation,
} from "@/lib/viewer-auth-attribution";

function AuthPageFallback() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-4 text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <section className="tm-surface-strong relative z-10 w-full max-w-[32rem] rounded-[2rem] p-6 text-center">
        <p className="tym-overline">Cuenta TravelYourMap</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Cargando acceso...</h1>
      </section>
    </main>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const attribution = useMemo(() => {
    return readViewerAuthAttribution(searchParams);
  }, [searchParams]);

  const viewerRegisterHref = useMemo(() => {
    return buildViewerRegisterHref(attribution);
  }, [attribution]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitAttribution = readViewerAuthAttributionFromLocation(searchParams);
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          registrationChannelId: submitAttribution.registrationChannelId,
          utmSource: submitAttribution.utmSource,
          utmMedium: submitAttribution.utmMedium,
          utmCampaign: submitAttribution.utmCampaign,
        }),
      });
      const loginPayload = (await loginResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!loginResponse.ok) {
        throw new Error(loginPayload?.error || "No se pudo iniciar sesión.");
      }

      const defaultPath = submitAttribution.authIntent === "viewer" ? "/" : "/dashboard";
      router.push(submitAttribution.safeNext || defaultPath);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255, 90, 61,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(255, 90, 61,0.12),transparent_26%),linear-gradient(180deg,rgba(17,20,22,0.92),rgba(17,20,22,0.76))]" />
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[1400px] items-center gap-8 px-4 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-6">
        <section className="order-2 lg:order-1">
          <div className="max-w-[38rem]">
            <Badge variant="outline">{attribution.authIntent === "viewer" ? "Viewer access" : "Creator access"}</Badge>
            <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl md:leading-none">
              {attribution.authIntent === "viewer" ? "Inicia sesión para votar, guardar y seguir mapas." : "Entra, activa tu mapa y publica una presencia propia."}
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-7 text-muted-foreground">
              {attribution.authIntent === "viewer"
                ? "Accede como viewer para participar en votaciones y desbloquear estadísticas avanzadas en los mapas públicos."
                : "TravelYourMap convierte el catálogo del canal en una experiencia editorial: rutas, países, sponsors y una URL pública lista para ventas o discovery."}
            </p>
          </div>

          <div className="mt-6">
            <Link href="/" className="tym-btn-secondary">
              Volver al inicio
            </Link>
          </div>
        </section>

        <section className="order-1 tm-surface-strong rounded-[2rem] p-6 sm:p-8 lg:order-2 lg:ml-auto lg:w-full lg:max-w-[38rem]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="tym-overline">{attribution.authIntent === "viewer" ? "Cuenta Viewer" : "Cuenta TravelYourMap"}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">Acceso de cuenta</h2>
            </div>
            <Badge variant="secondary">Login</Badge>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <span className="tym-nav-pill" data-active="true" aria-current="true">
              Iniciar sesión
            </span>
          </div>

          <form className="grid gap-4" onSubmit={handleLogin}>
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email o usuario</span>
              <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="tu@email.com o tu_usuario" />
              <p className="text-xs text-muted-foreground">
                {attribution.authIntent === "viewer"
                  ? "Usa tu email o usuario para entrar como viewer."
                  : "Puedes entrar usando el email de facturación o tu identificador público."}
              </p>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Contraseña</span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex h-full items-center justify-center px-3 text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {attribution.authIntent === "viewer"
                  ? "Tu cuenta de viewer te permite participar y guardar contenido en mapas."
                  : "Mantén una clave única para tu operación editorial y comercial."}
              </p>
            </label>
            <Button type="submit" className="mt-2 w-full" disabled={loading || !identifier.trim() || !password.trim()}>
              {loading ? "Ingresando..." : "Entrar"}
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}
          {attribution.authIntent === "creator" ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Si todavía no tienes cuenta y vas a activar canal + importación, entra por{" "}
              <Link href="/onboarding" className="text-foreground underline underline-offset-4">
                onboarding
              </Link>
              .
            </p>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Este acceso es para viewers del mapa público.{" "}
              <Link href={viewerRegisterHref} className="text-foreground underline underline-offset-4">
                Crear cuenta viewer gratuita
              </Link>
              . El alta de creator se gestiona por onboarding y checkout. Puedes gestionar consentimientos en{" "}
              <Link href="/auth/consents" className="text-foreground underline underline-offset-4">
                privacidad
              </Link>
              .
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Al usar este producto aceptas nuestros <Link href="/terms" className="underline underline-offset-2">Términos</Link> y{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacidad</Link>, además de los{" "}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener" className="underline underline-offset-2">
              Términos de YouTube
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            TravelYourMap no está afiliado, patrocinado ni respaldado por YouTube ni por Google.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
