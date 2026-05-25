"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ViewerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSource, setRegistrationSource] = useState<"platform" | "creator_map">("platform");
  const [registrationChannelId, setRegistrationChannelId] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState<string | null>(null);
  const [utmMedium, setUtmMedium] = useState<string | null>(null);
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [city, setCity] = useState("");
  const [hasYouTubeTravelChannel, setHasYouTubeTravelChannel] = useState(false);
  const [youtubeChannelUrl, setYouTubeChannelUrl] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [consentPlatformPromotions, setConsentPlatformPromotions] = useState(false);
  const [consentCreatorPromotions, setConsentCreatorPromotions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const channelId = String(params.get("channelId") || "").trim();
    setRegistrationChannelId(channelId || null);
    setRegistrationSource(channelId ? "creator_map" : "platform");
    setUtmSource(String(params.get("utm_source") || "").trim() || null);
    setUtmMedium(String(params.get("utm_medium") || "").trim() || null);
    setUtmCampaign(String(params.get("utm_campaign") || "").trim() || null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register-viewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          countryCode: countryCode.trim().toUpperCase(),
          city: city.trim(),
          hasYouTubeTravelChannel,
          youtubeChannelUrl: youtubeChannelUrl.trim() || null,
          acceptTerms,
          consentPlatformPromotions,
          consentCreatorPromotions,
          consentVersion: "v1",
          registrationSource,
          registrationChannelId,
          utmSource,
          utmMedium,
          utmCampaign,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo crear la cuenta viewer.");
      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la cuenta viewer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-[760px] px-4 py-8">
        <section className="tm-surface-strong rounded-[2rem] border border-white/10 p-6 sm:p-8">
          <p className="tym-overline">Cuenta Viewer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">Registro gratuito</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Regístrate para votar, guardar favoritos y participar en mapas. Solicitamos permisos de lectura y no publicamos ni editamos tu canal de YouTube.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nombre</span>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tu nombre" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Email</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contraseña</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">País (ISO-2)</span>
                <Input value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="AR" maxLength={2} />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ciudad</span>
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Buenos Aires" />
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={hasYouTubeTravelChannel}
                onChange={(event) => setHasYouTubeTravelChannel(event.target.checked)}
              />
              <span>Tengo canal de YouTube de viajes.</span>
            </label>

            {hasYouTubeTravelChannel ? (
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">URL del canal</span>
                <Input value={youtubeChannelUrl} onChange={(event) => setYouTubeChannelUrl(event.target.value)} placeholder="https://youtube.com/@tu-canal" />
              </label>
            ) : null}

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} />
              <span>Acepto términos y política de privacidad para operar mi cuenta (obligatorio).</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentPlatformPromotions}
                onChange={(event) => setConsentPlatformPromotions(event.target.checked)}
              />
              <span>Acepto promociones y novedades de Travel Your Map.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentCreatorPromotions}
                onChange={(event) => setConsentCreatorPromotions(event.target.checked)}
              />
              <span>Acepto promociones de creadores dentro de la plataforma.</span>
            </label>

            <Button
              type="submit"
              disabled={
                loading ||
                !displayName.trim() ||
                !email.trim() ||
                !password.trim() ||
                !countryCode.trim() ||
                !city.trim() ||
                !acceptTerms
              }
            >
              {loading ? "Creando cuenta..." : "Crear cuenta viewer"}
            </Button>
          </form>

          {error ? <p className="mt-3 text-sm text-[#ffb0a7]">{error}</p> : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Ya tienes cuenta?{" "}
            <Link href="/auth?intent=viewer" className="underline underline-offset-2">
              Inicia sesión
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
