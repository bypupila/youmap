"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

type Locale = "es" | "en";

type ProcessingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  statusPill: string;
  loadingTitle: string;
  loadingDescription: string;
  loadingWorldProgress: string;
  profileTitle: string;
  profileDescription: string;
  displayName: string;
  username: string;
  email: string;
  password: string;
  passwordHint: string;
  continueLabel: string;
  errorFallback: string;
  loadingFallback: string;
  profileFallback: string;
  loadingSteps: string[];
};

const copyByLocale: Record<Locale, ProcessingCopy> = {
  es: {
    eyebrow: "Importación en curso",
    title: "Tu canal se está convirtiendo en un mundo.",
    description: "Mientras se extraen y mapean los videos, dejamos listo el acceso final para que entres sin fricción.",
    statusPill: "Procesando",
    loadingTitle: "Iniciando importación...",
    loadingDescription: "Esta visual se llena con cada video mapeado en tiempo real.",
    loadingWorldProgress: "Planeta mapeado",
    profileTitle: "Completa tu perfil",
    profileDescription: "Confirma tus datos finales y define tu contraseña antes de entrar a tu dashboard.",
    displayName: "Nombre público",
    username: "Usuario",
    email: "Email",
    password: "Contraseña",
    passwordHint: "Esta será tu clave final para entrar al dashboard.",
    continueLabel: "Entrar a tu mundo",
    errorFallback: "No pudimos cargar el estado de importación.",
    loadingFallback: "Iniciando importación...",
    profileFallback: "Perfil listo para completar.",
    loadingSteps: [
      "Conectando tu canal...",
      "Filtrando shorts y ruido...",
      "Mapeando países y destinos...",
      "Preparando tu analítica...",
      "Afinando sponsors y crecimiento...",
    ],
  },
  en: {
    eyebrow: "Import in progress",
    title: "Your channel is becoming a world.",
    description: "While videos are extracted and mapped, we prepare the final access step so everything is ready when processing ends.",
    statusPill: "Processing",
    loadingTitle: "Starting import...",
    loadingDescription: "This visual fills in real time as each video is mapped.",
    loadingWorldProgress: "Mapped world",
    profileTitle: "Complete your profile",
    profileDescription: "Confirm your final details and set your password before entering your dashboard.",
    displayName: "Display name",
    username: "Username",
    email: "Email",
    password: "Password",
    passwordHint: "This will be your final dashboard password.",
    continueLabel: "Enter your world",
    errorFallback: "We couldn't load the import status.",
    loadingFallback: "Starting import...",
    profileFallback: "Profile ready to complete.",
    loadingSteps: [
      "Connecting your channel...",
      "Filtering shorts and noise...",
      "Mapping countries and destinations...",
      "Preparing your analytics...",
      "Sharpening sponsors and growth...",
    ],
  },
};

type ImportRunResponse = {
  id?: string;
  status?: string;
  updated_at?: string | null;
  channel_id?: string | null;
  output?: {
    totalVideos?: number;
    processedVideos?: number;
    mappedVideos?: number;
    skippedVideos?: number;
    countriesMapped?: number;
    totalViews?: number;
    progress?: number;
    stage?: string;
  } | null;
  error_message?: string | null;
  finished_at?: string | null;
};

const STALE_RUN_MS = 5 * 60 * 1000;

function formatStageLabel(stage: string, locale: Locale) {
  const normalized = String(stage || "").trim().toLowerCase();
  const labelsEs: Record<string, string> = {
    queued: "En cola",
    starting: "Iniciando",
    resolving_channel: "Resolviendo canal",
    loading_playlist: "Leyendo playlist",
    hydrating_details: "Cargando detalles de videos",
    loading_playlist_signals: "Analizando señales de playlist",
    mapping: "Mapeando ubicaciones",
    finalizing: "Finalizando",
    completed: "Completado",
    failed: "Falló",
    running: "Procesando",
  };
  const labelsEn: Record<string, string> = {
    queued: "Queued",
    starting: "Starting",
    resolving_channel: "Resolving channel",
    loading_playlist: "Loading playlist",
    hydrating_details: "Loading video details",
    loading_playlist_signals: "Loading playlist signals",
    mapping: "Mapping locations",
    finalizing: "Finalizing",
    completed: "Completed",
    failed: "Failed",
    running: "Running",
  };
  const dictionary = locale === "es" ? labelsEs : labelsEn;
  return dictionary[normalized] || normalized || (locale === "es" ? "Procesando" : "Processing");
}

async function readResponseMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: string; message?: string } | null;
      return payload?.error || payload?.message || fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const text = (await response.text()).trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function OnboardingProcessing({
  locale,
  user,
}: {
  locale: Locale;
  user: SessionUser;
}) {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const storageKey = useMemo(() => `travelmap-import-run-id:${user.id}`, [user.id]);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("starting");
  const [countriesMapped, setCountriesMapped] = useState(0);
  const [mappedVideos, setMappedVideos] = useState(0);
  const [mappedViews, setMappedViews] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(copy.loadingFallback);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [username, setUsername] = useState(user.username || "");
  const [password, setPassword] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const invalidRunIdsRef = useRef<Set<string>>(new Set());
  const workerTriggerAtRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % copy.loadingSteps.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [copy.loadingSteps.length]);

  useEffect(() => {
    setLoadingMessage(copy.loadingSteps[phraseIndex] || copy.loadingFallback);
  }, [copy.loadingFallback, copy.loadingSteps, phraseIndex]);

  useEffect(() => {
    if (runId) return;
    let active = true;

    async function ensureImportRun() {
      try {
        if (active) setError(null);
        const cachedRunId = String(sessionStorage.getItem(storageKey) || "").trim();
        if (cachedRunId) {
          const validateResponse = await fetch(`/api/youtube/import/${encodeURIComponent(cachedRunId)}`, { cache: "no-store" });
          if (validateResponse.ok) {
            const validatePayload = (await validateResponse.json().catch(() => null)) as ImportRunResponse | null;
            const status = String(validatePayload?.status || "running");
            const updatedAtMs = validatePayload?.updated_at ? new Date(validatePayload.updated_at).getTime() : 0;
            const isStaleRunningRun =
              (status === "running" || status === "queued") &&
              Number.isFinite(updatedAtMs) &&
              updatedAtMs > 0 &&
              Date.now() - updatedAtMs > STALE_RUN_MS;

            if (status === "failed" || isStaleRunningRun) {
              sessionStorage.removeItem(storageKey);
            } else {
              if (!active) return;
              setError(null);
              setRunId(cachedRunId);
              setRunStatus(status);
              return;
            }
          } else {
            invalidRunIdsRef.current.add(cachedRunId);
            sessionStorage.removeItem(storageKey);
          }
        }

        const startResponse = await fetch("/api/youtube/import/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const startResponseForMessage = startResponse.clone();
        const startPayload = (await startResponse.json().catch(() => null)) as { import_run_id?: string; status?: string; error?: string } | null;
        if (!startResponse.ok || !startPayload?.import_run_id) {
          throw new Error(startPayload?.error || (await readResponseMessage(startResponseForMessage, copy.errorFallback)));
        }
        if (invalidRunIdsRef.current.has(startPayload.import_run_id)) {
          throw new Error(copy.errorFallback);
        }

        sessionStorage.setItem(storageKey, startPayload.import_run_id);
        if (!active) return;
        setError(null);
        setRunId(startPayload.import_run_id);
        setRunStatus(startPayload.status || "queued");
      } catch (importError) {
        if (!active) return;
        setError(importError instanceof Error ? importError.message : copy.errorFallback);
      }
    }

    void ensureImportRun();

    return () => {
      active = false;
    };
  }, [copy.errorFallback, runId, storageKey]);

  useEffect(() => {
    const currentRunId: string = runId || "";
    if (!currentRunId) return;
    let active = true;

    async function triggerWorker(runIdentifier: string) {
      const now = Date.now();
      if (now - workerTriggerAtRef.current < 3500) return;
      workerTriggerAtRef.current = now;
      try {
        await fetch("/api/youtube/import/worker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: runIdentifier }),
        });
      } catch {
        // Do not block polling on worker trigger failures.
      }
    }

    async function pollRun() {
      try {
        const response = await fetch(`/api/youtube/import/${encodeURIComponent(currentRunId)}`, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 404) {
            invalidRunIdsRef.current.add(currentRunId);
            sessionStorage.removeItem(storageKey);
            if (!active) return;
            setError(null);
            setRunId(null);
            setRunStatus("idle");
            setProgress(0);
            setStage("restarting");
            setCountriesMapped(0);
            setMappedVideos(0);
            setMappedViews(0);
          }
          return;
        }

        const payload = (await response.json()) as ImportRunResponse;
        if (!active) return;

        const status = String(payload.status || "running");
        const output = payload.output || {};
        const total = Number(output.totalVideos || 0);
        const processed = Number(output.processedVideos || 0);
        const derivedProgress = Number.isFinite(Number(output.progress))
          ? Number(output.progress || 0)
          : total > 0
            ? processed / total
            : 0;

        setRunStatus(status);
        setProgress(Math.max(0, Math.min(1, derivedProgress)));
        setStage(String(output.stage || status || "running"));
        setCountriesMapped(Math.max(0, Number(output.countriesMapped || 0)));
        setMappedVideos(Math.max(0, Number(output.mappedVideos || 0)));
        setMappedViews(Math.max(0, Number(output.totalViews || 0)));

        if (status === "queued" || status === "running") {
          void triggerWorker(currentRunId);
        }

        if (status === "completed") {
          setProgress(1);
          setShowProfile(true);
          setRunStatus("completed");
        }

        if (status === "failed") {
          sessionStorage.removeItem(storageKey);
          setError(payload.error_message || copy.errorFallback);
          setRunId(null);
        }
      } catch (pollError) {
        if (!active) return;
        setError(pollError instanceof Error ? pollError.message : copy.errorFallback);
      }
    }

    void pollRun();
    const interval = window.setInterval(pollRun, 1600);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [copy.errorFallback, runId, storageKey]);

  const progressLabel = useMemo(() => {
    if (runStatus === "completed") return copy.profileFallback;
    if (error) return error;
    return loadingMessage;
  }, [copy.profileFallback, error, loadingMessage, runStatus]);

  const progressPercent = useMemo(() => Math.max(0, Math.min(100, Math.round(progress * 100))), [progress]);

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          password: password.trim() || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; channel_id?: string | null; public_map_path?: string | null }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || copy.errorFallback);
      }

      setProfileSuccess(payload?.public_map_path || copy.profileFallback);
      sessionStorage.removeItem(storageKey);
      router.push(payload?.channel_id ? `/dashboard?channelId=${encodeURIComponent(payload.channel_id)}` : "/dashboard");
      router.refresh();
    } catch (profileSubmitError) {
      setProfileError(profileSubmitError instanceof Error ? profileSubmitError.message : copy.errorFallback);
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-[#f1f1f1]">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,0,0,0.16),transparent_26%),linear-gradient(180deg,rgba(17,20,22,0.95),rgba(17,20,22,0.82))]" />

      <header className="absolute inset-x-0 top-0 z-40 px-4 py-3">
        <FloatingTopBar
          eyebrow={copy.eyebrow}
          title={copy.title}
          searchPlaceholder={copy.description}
          actions={<SignalPill text={copy.statusPill} />}
          className="relative z-[41]"
        />
      </header>

      <section className="relative z-20 flex min-h-[100dvh] items-center justify-center px-4 pt-28 pb-8">
        <div className="grid w-full max-w-[1040px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#181818]/96 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur">
            <p className="yt-overline text-[#aaaaaa]">{copy.eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-[32px] leading-[36px] font-bold tracking-tight text-[#f1f1f1] sm:text-[42px] sm:leading-[46px]">
              {copy.title}
            </h1>
            <p className="onboarding-description mt-4 max-w-xl text-[14px] leading-6">{copy.description}</p>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-[#212121] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.statusPill}</p>
                  <p className="mt-2 text-[18px] font-medium text-[#f1f1f1]">{progressLabel}</p>
                </div>
                <span className="text-[12px] text-[#9a9a9a]">{Math.round(progress * 100)}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2a2a2a]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(255,0,0,0.88)_0%,rgba(204,0,0,1)_100%)] transition-all duration-500"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {copy.loadingSteps.map((phrase, index) => (
                  <span
                    key={phrase}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-colors",
                      index === phraseIndex ? "border-[rgba(255,0,0,0.4)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]" : "border-white/10 bg-[#181818] text-[#8f8f8f]"
                    )}
                  >
                    {phrase}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label={locale === "es" ? "Países" : "Countries"} value={countriesMapped} />
                <MiniMetric label={locale === "es" ? "Videos mapeados" : "Mapped videos"} value={mappedVideos} />
                <MiniMetric label={locale === "es" ? "Views" : "Views"} value={mappedViews} />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#181818]/96 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur">
            {showProfile ? (
              <>
                <p className="yt-overline text-[#aaaaaa]">{copy.profileTitle}</p>
                <h2 className="mt-2 text-[28px] leading-[32px] font-bold text-[#f1f1f1]">{copy.profileTitle}</h2>
                <p className="onboarding-description mt-3 text-[14px] leading-6">{copy.profileDescription}</p>

                <form className="mt-5 space-y-3" onSubmit={submitProfile}>
                  <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.displayName}</span>
                    <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.username}</span>
                    <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.email}</span>
                    <Input value={user.email} disabled readOnly />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.password}</span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.password}
                      required
                    />
                    <span className="mt-1 block text-[12px] text-[#9a9a9a]">{copy.passwordHint}</span>
                  </label>

                  <Button type="submit" className="w-full" disabled={profileBusy || password.trim().length < 8}>
                    {profileBusy ? copy.profileFallback : copy.continueLabel}
                  </Button>
                </form>

                {profileSuccess ? <p className="mt-3 text-[12px] text-[#9cd5ff]">{profileSuccess}</p> : null}
                {profileError ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{profileError}</p> : null}
              </>
            ) : (
              <>
                <p className="yt-overline text-[#aaaaaa]">{copy.loadingTitle}</p>
                <h2 className="mt-2 text-[28px] leading-[32px] font-bold text-[#f1f1f1]">{copy.loadingTitle}</h2>
                <p className="onboarding-description mt-3 text-[14px] leading-6">{copy.loadingDescription}</p>
                <div className="mt-5 rounded-[24px] border border-white/10 bg-[#212121] p-4">
                  <ImportPlanet progress={progress} mappedVideos={mappedVideos} locale={locale} />
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#181818] px-4 py-3">
                    <p className="text-[14px] leading-6 text-[#f1f1f1]">{loadingMessage}</p>
                    <p className="mt-2 text-[12px] text-[#9a9a9a]">
                      {copy.loadingWorldProgress}: {progressPercent}% · {formatCompactNumber(mappedVideos)}{" "}
                      {locale === "es" ? "videos mapeados" : "mapped videos"}
                    </p>
                  </div>
                </div>
              </>
            )}

            {error ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{error}</p> : null}
            <p className="mt-4 text-[12px] text-[#9a9a9a]">{formatStageLabel(stage, locale)}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#181818] p-4">
      <p className="text-[20px] font-medium text-[#f1f1f1]">{formatCompactNumber(value)}</p>
      <p className="mt-1 text-[12px] text-[#aaaaaa]">{label}</p>
    </div>
  );
}

function ImportPlanet({ progress, mappedVideos, locale }: { progress: number; mappedVideos: number; locale: Locale }) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const progressPercent = Math.max(0, Math.min(100, Math.round(clampedProgress * 100)));
  const markerCount = Math.min(150, Math.max(0, Math.floor(mappedVideos)));
  const markers = useMemo(() => buildPlanetMarkers(markerCount), [markerCount]);

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="relative mx-auto h-[250px] w-[250px] rounded-full border border-white/20 bg-[#070b16] p-2 shadow-[0_0_60px_rgba(0,0,0,0.55)] sm:h-[280px] sm:w-[280px]">
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_28%,rgba(109,160,255,0.2),rgba(7,11,22,0.92)_62%),linear-gradient(180deg,#0a1427_0%,#05070d_100%)]">
          <div className="pointer-events-none absolute inset-0 animate-[spin_42s_linear_infinite]">
            <span className="absolute left-[14%] top-[28%] h-11 w-16 rounded-[65%_35%_57%_43%/48%_55%_45%_52%] bg-[#0b1d37]/75 blur-[0.3px]" />
            <span className="absolute left-[56%] top-[20%] h-12 w-14 rounded-[37%_63%_63%_37%/39%_44%_56%_61%] bg-[#102746]/80 blur-[0.3px]" />
            <span className="absolute left-[23%] top-[56%] h-10 w-14 rounded-[46%_54%_41%_59%/55%_45%_55%_45%] bg-[#0a223f]/80 blur-[0.3px]" />
            <span className="absolute left-[58%] top-[60%] h-9 w-16 rounded-[58%_42%_64%_36%/57%_35%_65%_43%] bg-[#0e2340]/80 blur-[0.3px]" />

            {markers.map((marker) => (
              <span
                key={marker.id}
                className="absolute rounded-full bg-[#ff6a6a] shadow-[0_0_14px_rgba(255,72,72,0.7)] animate-pulse"
                style={{
                  left: `${marker.left}%`,
                  top: `${marker.top}%`,
                  width: `${marker.size}px`,
                  height: `${marker.size}px`,
                  transform: "translate(-50%, -50%)",
                  animationDelay: `${marker.delayMs}ms`,
                  animationDuration: "2.6s",
                }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,0,0,0.15)_0%,rgba(255,0,0,0.55)_58%,rgba(94,0,0,0.92)_100%)] transition-transform duration-700 ease-out"
            style={{ transform: `translateY(${100 - progressPercent}%)` }}
          />
          <div
            className="pointer-events-none absolute inset-x-5 h-[2px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.88),transparent)] transition-[top] duration-700 ease-out"
            style={{ top: `${Math.max(0, Math.min(100, 100 - progressPercent))}%` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.24),transparent_42%),radial-gradient(circle_at_68%_73%,rgba(255,0,0,0.2),transparent_40%)]" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[38px] leading-none font-semibold tracking-tight text-[#f1f1f1] sm:text-[44px]">{progressPercent}%</p>
          <p className="mt-2 text-[12px] uppercase tracking-[0.16em] text-[#c9c9c9]">{locale === "es" ? "Videos mapeados" : "Mapped videos"}</p>
          <p className="mt-1 text-[22px] leading-none font-medium text-[#f1f1f1]">{formatCompactNumber(mappedVideos)}</p>
        </div>
      </div>
    </div>
  );
}

function buildPlanetMarkers(count: number) {
  const safeCount = Math.max(0, count);
  if (safeCount === 0) return [];

  const markers: Array<{ id: string; left: number; top: number; size: number; delayMs: number }> = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < safeCount; index += 1) {
    const ratio = (index + 0.5) / safeCount;
    const radius = 8 + Math.sqrt(ratio) * 42;
    const angle = index * goldenAngle;
    const left = Math.max(8, Math.min(92, 50 + Math.cos(angle) * radius));
    const top = Math.max(8, Math.min(92, 50 + Math.sin(angle) * radius * 0.72));

    markers.push({
      id: `marker-${index}`,
      left,
      top,
      size: 2 + (index % 3),
      delayMs: (index % 10) * 90,
    });
  }

  return markers;
}

function formatCompactNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
