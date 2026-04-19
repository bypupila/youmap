"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

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

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          username,
          password: registerPassword,
          selectedPlan: "starter",
          activateWithoutPayment: false,
        }),
      });

      const registerPayload = (await registerResponse.json().catch(() => null)) as { error?: string } | null;
      if (!registerResponse.ok) {
        throw new Error(registerPayload?.error || "No se pudo crear la cuenta.");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "No se pudo crear la cuenta.");
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

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="tm-surface-strong rounded-[2rem] p-5">
              <p className="yt-overline">Acceso ordenado</p>
              <p className="mt-3 text-lg font-medium">Login y registro mantienen el mismo lenguaje visual del producto para reducir fricción desde el primer paso.</p>
            </div>
            <div className="tm-surface rounded-[2rem] p-5">
              <p className="text-3xl font-semibold tracking-tight">7 días</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">El flujo completo te lleva a onboarding, importación y dashboard sin saltos de interfaz.</p>
            </div>
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
            <Badge variant="secondary">{mode === "login" ? "Login" : "Registro"}</Badge>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("login")} className="yt-nav-pill" data-active={mode === "login"}>
              Iniciar sesión
            </button>
            <button type="button" onClick={() => setMode("register")} className="yt-nav-pill" data-active={mode === "register"}>
              Crear cuenta
            </button>
          </div>

          {mode === "login" ? (
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
          ) : (
            <form className="grid gap-4" onSubmit={handleRegister}>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Nombre público</span>
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nombre visible en tu mapa" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</span>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Usuario</span>
                <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="tu_usuario" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Contraseña</span>
                <Input type="password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="Mínimo 8 caracteres" />
                <p className="text-xs text-muted-foreground">La cuenta nueva te llevará directo al flujo de activación y mapa.</p>
              </label>
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={loading || !displayName.trim() || !email.trim() || !username.trim() || !registerPassword.trim()}
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </Button>
            </form>
          )}

          {error ? <p className="mt-4 text-sm text-[#ffb0a7]">{error}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">
            Si vas a arrancar la activación completa de canal e importación, entra por{" "}
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
