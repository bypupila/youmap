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
  profileTitle: string;
  profileDescription: string;
  displayName: string;
  username: string;
  email: string;
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
    profileTitle: "Completa tu perfil",
    profileDescription: "Confirma tus datos finales antes de entrar a tu dashboard.",
    displayName: "Nombre público",
    username: "Usuario",
    email: "Email",
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
    profileTitle: "Complete your profile",
    profileDescription: "Confirm your final details before entering your dashboard.",
    displayName: "Display name",
    username: "Username",
    email: "Email",
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
  channel_id?: string | null;
  output?: {
    totalVideos?: number;
    processedVideos?: number;
    mappedVideos?: number;
    skippedVideos?: number;
    progress?: number;
    stage?: string;
  } | null;
  error_message?: string | null;
  finished_at?: string | null;
};

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
  const [loadingMessage, setLoadingMessage] = useState(copy.loadingFallback);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [username, setUsername] = useState(user.username || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const invalidRunIdsRef = useRef<Set<string>>(new Set());

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
            if (!active) return;
            setError(null);
            setRunId(cachedRunId);
            setRunStatus(String(validatePayload?.status || "running"));
            return;
          }
          invalidRunIdsRef.current.add(cachedRunId);
          sessionStorage.removeItem(storageKey);
        }

        const startResponse = await fetch("/api/youtube/import/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const startPayload = (await startResponse.json().catch(() => null)) as { import_run_id?: string; status?: string; error?: string } | null;
        if (!startResponse.ok || !startPayload?.import_run_id) {
          throw new Error(startPayload?.error || copy.errorFallback);
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
          }
          return;
        }

        const payload = (await response.json()) as ImportRunResponse;
        if (!active) return;

        const output = payload.output || {};
        const total = Number(output.totalVideos || 0);
        const processed = Number(output.processedVideos || 0);
        const derivedProgress = Number.isFinite(Number(output.progress))
          ? Number(output.progress || 0)
          : total > 0
            ? processed / total
            : 0;

        setRunStatus(String(payload.status || "running"));
        setProgress(Math.max(0, Math.min(1, derivedProgress)));
        setStage(String(output.stage || payload.status || "running"));

        if (payload.status === "completed") {
          setProgress(1);
          setShowProfile(true);
          setRunStatus("completed");
        }

        if (payload.status === "failed") {
          setError(payload.error_message || copy.errorFallback);
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
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#aaaaaa]">{copy.description}</p>

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
                  style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }}
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
                <MiniMetric label={locale === "es" ? "Países" : "Countries"} value={Math.max(1, Math.round(progress * 14))} />
                <MiniMetric label={locale === "es" ? "Videos mapeados" : "Mapped videos"} value={Math.round(progress * 100)} />
                <MiniMetric label={locale === "es" ? "Views" : "Views"} value={Math.round(1000 + progress * 65000)} />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#181818]/96 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur">
            {showProfile ? (
              <>
                <p className="yt-overline text-[#aaaaaa]">{copy.profileTitle}</p>
                <h2 className="mt-2 text-[28px] leading-[32px] font-bold text-[#f1f1f1]">{copy.profileTitle}</h2>
                <p className="mt-3 text-[14px] leading-6 text-[#aaaaaa]">{copy.profileDescription}</p>

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

                  <Button type="submit" className="w-full" disabled={profileBusy}>
                    {profileBusy ? copy.profileFallback : copy.continueLabel}
                  </Button>
                </form>

                {profileSuccess ? <p className="mt-3 text-[12px] text-[#9cd5ff]">{profileSuccess}</p> : null}
                {profileError ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{profileError}</p> : null}
              </>
            ) : (
              <>
                <p className="yt-overline text-[#aaaaaa]">{copy.loadingFallback}</p>
                <h2 className="mt-2 text-[28px] leading-[32px] font-bold text-[#f1f1f1]">{copy.loadingFallback}</h2>
                <p className="mt-3 text-[14px] leading-6 text-[#aaaaaa]">{copy.description}</p>
                <div className="mt-5 rounded-[24px] border border-white/10 bg-[#212121] p-4">
                  <p className="text-[14px] leading-6 text-[#f1f1f1]">{loadingMessage}</p>
                </div>
              </>
            )}

            {error ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{error}</p> : null}
            <p className="mt-4 text-[12px] text-[#9a9a9a]">{stage}</p>
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

function formatCompactNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
