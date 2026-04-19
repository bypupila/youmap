"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

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

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,0,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(255,0,0,0.12),transparent_26%),linear-gradient(180deg,rgba(17,20,22,0.92),rgba(17,20,22,0.76))]" />
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[1400px] items-center gap-8 px-4 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-6">
        <section className="order-2 lg:order-1">
          <div className="max-w-[38rem]">
            <Badge variant="outline">Creator access</Badge>
            <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-foreground md:text-6xl md:leading-none">
              Entra, activa tu mapa y publica una presencia propia.
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-7 text-muted-foreground">
              TravelMap convierte el catálogo del canal en una experiencia editorial: rutas, países, sponsors y una URL pública lista para ventas o discovery.
            </p>
          </div>

          <div className="mt-6">
            <Link href="/" className="yt-btn-secondary">
              Volver al inicio
            </Link>
          </div>
        </section>

        <section className="order-1 tm-surface-strong rounded-[2rem] p-6 sm:p-8 lg:order-2 lg:ml-auto lg:w-full lg:max-w-[38rem]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="yt-overline">Cuenta TravelMap</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">Acceso de cuenta</h2>
            </div>
            <Badge variant="secondary">Login</Badge>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <button type="button" className="yt-nav-pill" data-active="true" aria-current="true">
              Iniciar sesión
            </button>
          </div>

          <form className="grid gap-4" onSubmit={handleLogin}>
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email o usuario</span>
              <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="tu@email.com o tu_usuario" />
              <p className="text-xs text-muted-foreground">Puedes entrar usando el email de facturación o tu identificador público.</p>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Contraseña</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" />
              <p className="text-xs text-muted-foreground">Mantén una clave única para tu operación editorial y comercial.</p>
            </label>
            <Button type="submit" className="mt-2 w-full" disabled={loading || !identifier.trim() || !password.trim()}>
              {loading ? "Ingresando..." : "Entrar"}
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">
            Si todavía no tienes cuenta y vas a activar canal + importación, entra por{" "}
            <Link href="/onboarding" className="text-foreground underline underline-offset-4">
              onboarding
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
