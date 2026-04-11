"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "register";

async function resolveEmailFromIdentifier(identifier: string) {
  const response = await fetch("/api/auth/resolve-identifier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });

  const payload = (await response.json().catch(() => null)) as { email?: string; error?: string } | null;
  if (!response.ok || !payload?.email) {
    throw new Error(payload?.error || "No pudimos resolver tu usuario.");
  }

  return payload.email;
}

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
      const supabase = createClient();
      const resolvedEmail = await resolveEmailFromIdentifier(identifier);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
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
      const supabase = createClient();
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: registerPassword,
      });
      if (signInError) {
        throw new Error(signInError.message);
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#02040a] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,107,53,0.2),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(0,212,255,0.14),transparent_26%)]" />
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-4">
        <section className="w-full max-w-lg rounded-[32px] border border-white/10 bg-black/50 p-6 backdrop-blur-2xl sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-primary">TravelMap</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Acceso de Cuenta</h1>
            </div>
            <Link href="/" className="text-xs text-white/60 transition hover:text-white">
              Volver
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                mode === "login" ? "bg-primary text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                mode === "register" ? "bg-primary text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {mode === "login" ? (
            <form className="space-y-3" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Email o usuario</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="tu@email.com o tu_usuario"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !identifier.trim() || !password.trim()}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleRegister}>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Nombre</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Usuario</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="tu_usuario"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-300">Contraseña</span>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-300/30 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !displayName.trim() || !email.trim() || !username.trim() || !registerPassword.trim()}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </button>
            </form>
          )}

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <p className="mt-5 text-xs text-white/50">
            Si estás arrancando el flujo completo de canal + extracción, usa{" "}
            <Link href="/onboarding" className="text-primary hover:underline">
              onboarding
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
