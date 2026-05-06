"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Copy, GearSix, MapPin, RocketLaunch, XCircle } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MapPollMode, MapPollRecord } from "@/lib/map-polls";
import type { MapViewerContext } from "@/lib/map-public";

interface PollOptionInput {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

interface FanVoteCardProps {
  channelId: string;
  viewer: MapViewerContext;
  poll: MapPollRecord | null;
  availableOptions: PollOptionInput[];
  isDemoMode?: boolean;
  onPollChange?: (poll: MapPollRecord | null) => void;
}

type PollFormState = {
  pollId: string | null;
  title: string;
  prompt: string;
  pollMode: MapPollMode;
  showPopup: boolean;
  closesAtLocal: string;
  countryOptions: PollOptionInput[];
};

type RankedCity = {
  country_code: string;
  country_name: string;
  country_sort_order: number;
  city: string;
  city_sort_order: number;
  votes: number;
};

const POPUP_SESSION_KEY_PREFIX = "travelyourmap_poll_popup_v1";

export function FanVoteCard({
  channelId,
  viewer,
  poll,
  availableOptions,
  isDemoMode = false,
  onPollChange,
}: FanVoteCardProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"draft" | "live" | "close" | null>(null);
  const [busyVote, setBusyVote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>(poll?.country_options[0]?.country_code || "");
  const [selectedCity, setSelectedCity] = useState<string>(poll?.country_options[0]?.cities[0]?.city || "");
  const [form, setForm] = useState<PollFormState>(() => buildFormState(poll, availableOptions));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dragCountryIndex, setDragCountryIndex] = useState<number | null>(null);
  const [dragCitySource, setDragCitySource] = useState<{ countryCode: string; index: number } | null>(null);
  const expiredHandledRef = useRef(false);

  const countryNameMap = useMemo(
    () => new Map(availableOptions.map((country) => [country.country_code, country.country_name])),
    [availableOptions]
  );

  const currentPollCountries = useMemo(() => poll?.country_options || [], [poll?.country_options]);
  const pollMode = poll?.poll_mode || form.pollMode;

  const isAnonymousViewer = !viewer.isOwner && !viewer.isAuthenticated;
  const canSeeDetailedStats = viewer.isOwner || viewer.isAuthenticated;

  const rankedCountries = useMemo(() => {
    return currentPollCountries
      .map((country) => ({
        country_code: country.country_code,
        country_name: countryNameMap.get(country.country_code) || country.country_name || country.country_code,
        sort_order: country.sort_order,
        votes: country.votes,
      }))
      .sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order || a.country_code.localeCompare(b.country_code));
  }, [countryNameMap, currentPollCountries]);

  const rankedCities = useMemo(() => {
    const rows: RankedCity[] = [];
    for (const country of currentPollCountries) {
      const countryName = countryNameMap.get(country.country_code) || country.country_name || country.country_code;
      for (const city of country.cities) {
        rows.push({
          country_code: country.country_code,
          country_name: countryName,
          country_sort_order: country.sort_order,
          city: city.city,
          city_sort_order: city.sort_order,
          votes: city.votes,
        });
      }
    }

    return rows.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if (a.country_sort_order !== b.country_sort_order) return a.country_sort_order - b.country_sort_order;
      if (a.city_sort_order !== b.city_sort_order) return a.city_sort_order - b.city_sort_order;
      return a.city.localeCompare(b.city);
    });
  }, [countryNameMap, currentPollCountries]);

  const top3Countries = rankedCountries.slice(0, 3);
  const top3Cities = rankedCities.slice(0, 3);
  const winnerCountry = rankedCountries[0] || null;
  const winnerCity = rankedCities[0] || null;

  const closesAtMs = poll?.closes_at ? new Date(poll.closes_at).getTime() : Number.NaN;
  const hasCountdown = Boolean(poll && poll.status === "live" && Number.isFinite(closesAtMs));
  const remainingMs = hasCountdown ? closesAtMs - nowMs : Number.NaN;
  const isExpiredLive = Boolean(hasCountdown && remainingMs <= 0);

  const mustVote = Boolean(poll && poll.status === "live" && poll.show_popup && !poll.has_voted && !viewer.isOwner);
  const voteCities = currentPollCountries.find((country) => country.country_code === selectedCountry)?.cities || [];

  useEffect(() => {
    setForm(buildFormState(poll, availableOptions));
    setSelectedCountry(poll?.country_options[0]?.country_code || availableOptions[0]?.country_code || "");
    setSelectedCity(poll?.country_options[0]?.cities[0]?.city || availableOptions[0]?.cities[0]?.city || "");
    setError(null);
    setVoteError(null);
    expiredHandledRef.current = false;
  }, [availableOptions, poll]);

  useEffect(() => {
    if (!poll || poll.status !== "live" || !poll.show_popup || poll.has_voted || viewer.isOwner) return;
    if (typeof window === "undefined") return;

    const key = `${POPUP_SESSION_KEY_PREFIX}:${poll.id}`;
    const alreadyShown = window.sessionStorage.getItem(key) === "1";
    if (alreadyShown) return;

    window.sessionStorage.setItem(key, "1");
    setVoteOpen(true);
  }, [poll, viewer.isOwner]);

  useEffect(() => {
    if (!hasCountdown) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasCountdown]);

  useEffect(() => {
    if (!poll || poll.status !== "live" || !isExpiredLive || expiredHandledRef.current) return;
    expiredHandledRef.current = true;

    if (voteOpen) {
      setVoteError("La votacion termino. Ahora puedes ver resultados.");
      setVoteOpen(false);
      setResultOpen(true);
    }

    if (!isDemoMode) {
      void (async () => {
        try {
          const response = await fetch(`/api/map/polls/${encodeURIComponent(poll.id)}/results`, { cache: "no-store" });
          if (!response.ok) return;
          const payload = (await response.json().catch(() => null)) as { poll?: MapPollRecord } | null;
          if (payload?.poll) {
            onPollChange?.(payload.poll);
          }
        } catch {
          // silent refresh fallback
        }
      })();
    }
  }, [isDemoMode, isExpiredLive, onPollChange, poll, voteOpen]);

  function goToViewerLogin() {
    if (typeof window === "undefined") return;
    const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/auth?intent=viewer&next=${encodeURIComponent(nextPath)}`;
  }

  function computeClosesAtIso() {
    if (!form.closesAtLocal.trim()) return null;
    const parsed = new Date(form.closesAtLocal);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function buildPollRecordFromForm(nextStatus: "draft" | "live" | "closed", previous: MapPollRecord | null) {
    const nowIso = new Date().toISOString();
    const previousCountryVotes = new Map(previous?.country_options.map((country) => [country.country_code, country.votes]) || []);
    const previousCityVotes = new Map<string, number>();

    for (const country of previous?.country_options || []) {
      for (const city of country.cities) {
        previousCityVotes.set(`${country.country_code}::${city.city.toLowerCase()}`, city.votes);
      }
    }

    const countryOptions = form.countryOptions
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.country_code.localeCompare(b.country_code))
      .map((country, countryIndex) => {
        const cities = form.pollMode === "country_city"
          ? country.cities
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order || a.city.localeCompare(b.city))
              .map((city, cityIndex) => {
                const cityKey = `${country.country_code}::${city.city.toLowerCase()}`;
                return {
                  country_code: country.country_code,
                  city: city.city,
                  sort_order: cityIndex,
                  votes: previousCityVotes.get(cityKey) || 0,
                };
              })
          : [];

        const countryVotes =
          form.pollMode === "country"
            ? previousCountryVotes.get(country.country_code) || 0
            : cities.reduce((sum, city) => sum + city.votes, 0);

        return {
          country_code: country.country_code,
          country_name: country.country_name,
          sort_order: countryIndex,
          votes: countryVotes,
          cities,
        };
      });

    const totalVotes = countryOptions.reduce((sum, country) => sum + country.votes, 0);

    return {
      id: previous?.id || form.pollId || `demo-poll-${channelId}`,
      channel_id: channelId,
      title: form.title,
      prompt: form.prompt,
      status: nextStatus,
      poll_mode: form.pollMode,
      show_popup: nextStatus === "closed" ? false : form.showPopup,
      published_at: nextStatus === "live" ? nowIso : previous?.published_at || null,
      closes_at: computeClosesAtIso(),
      created_by_user_id: previous?.created_by_user_id || "demo-owner",
      has_voted: Boolean(previous?.has_voted),
      total_votes: totalVotes,
      country_options: countryOptions,
    } satisfies MapPollRecord;
  }

  async function savePoll(status: "draft" | "live") {
    setBusyAction(status);
    setError(null);

    if (isDemoMode) {
      const simulated = buildPollRecordFromForm(status, poll);
      onPollChange?.(simulated);
      setEditorOpen(false);
      setBusyAction(null);
      return;
    }

    try {
      const response = await fetch("/api/map/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: form.pollId,
          channelId,
          title: form.title,
          prompt: form.prompt,
          pollMode: form.pollMode,
          showPopup: form.showPopup,
          status,
          closesAt: computeClosesAtIso(),
          countryOptions: form.countryOptions,
        }),
      });
      const payload = (await response.json()) as { poll?: MapPollRecord; error?: string };
      if (!response.ok || !payload.poll) {
        throw new Error(payload.error || "No se pudo guardar la votacion.");
      }
      onPollChange?.(payload.poll);
      if (status === "live") {
        posthog.capture("poll_published", {
          poll_id: payload.poll.id,
          poll_title: form.title,
          channel_id: channelId,
          country_count: form.countryOptions.length,
          show_popup: form.showPopup,
          poll_mode: form.pollMode,
        });
      }
      setEditorOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la votacion.");
    } finally {
      setBusyAction(null);
    }
  }

  async function closePoll() {
    if (!form.pollId && !isDemoMode) return;
    setBusyAction("close");
    setError(null);

    if (isDemoMode) {
      const simulated = buildPollRecordFromForm("closed", poll);
      onPollChange?.(simulated);
      setEditorOpen(false);
      setBusyAction(null);
      return;
    }

    try {
      const response = await fetch("/api/map/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: form.pollId,
          channelId,
          title: form.title,
          prompt: form.prompt,
          pollMode: form.pollMode,
          showPopup: false,
          status: "closed",
          countryOptions: form.countryOptions,
        }),
      });
      const payload = (await response.json()) as { poll?: MapPollRecord; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo cerrar la votacion.");
      }
      onPollChange?.(payload.poll || null);
      setEditorOpen(false);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "No se pudo cerrar la votacion.");
    } finally {
      setBusyAction(null);
    }
  }

  async function submitVote() {
    if (!poll || !selectedCountry) return;
    if (poll.poll_mode === "country_city" && !selectedCity) return;

    setBusyVote(true);
    setVoteError(null);

    if (isDemoMode) {
      const updatedCountries = poll.country_options.map((country) => {
        if (country.country_code !== selectedCountry) return country;

        if (poll.poll_mode === "country") {
          return {
            ...country,
            votes: country.votes + 1,
          };
        }

        const updatedCities = country.cities.map((city) =>
          city.city === selectedCity
            ? {
                ...city,
                votes: city.votes + 1,
              }
            : city
        );

        return {
          ...country,
          votes: updatedCities.reduce((sum, city) => sum + city.votes, 0),
          cities: updatedCities,
        };
      });

      const updatedPoll: MapPollRecord = {
        ...poll,
        has_voted: true,
        total_votes: poll.total_votes + 1,
        country_options: updatedCountries,
      };

      onPollChange?.(updatedPoll);
      setVoteOpen(false);
      setBusyVote(false);
      return;
    }

    try {
      const response = await fetch(`/api/map/polls/${encodeURIComponent(poll.id)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: selectedCountry,
          city: poll.poll_mode === "country_city" ? selectedCity : null,
        }),
      });
      const payload = (await response.json()) as { poll?: MapPollRecord; error?: string };
      if (!response.ok || !payload.poll) {
        throw new Error(payload.error || "No se pudo registrar tu voto.");
      }
      onPollChange?.(payload.poll);
      posthog.capture("poll_vote_submitted", {
        poll_id: poll.id,
        poll_title: poll.title,
        channel_id: channelId,
        country_code: selectedCountry,
        city: poll.poll_mode === "country_city" ? selectedCity : null,
        poll_mode: poll.poll_mode,
      });
      setVoteOpen(false);
    } catch (submitError) {
      setVoteError(submitError instanceof Error ? submitError.message : "No se pudo registrar tu voto.");
    } finally {
      setBusyVote(false);
    }
  }

  function toggleCountry(country: PollOptionInput) {
    setForm((current) => {
      const exists = current.countryOptions.some((item) => item.country_code === country.country_code);
      if (exists) {
        return {
          ...current,
          countryOptions: current.countryOptions.filter((item) => item.country_code !== country.country_code).map((item, idx) => ({
            ...item,
            sort_order: idx,
          })),
        };
      }

      const nextCountry: PollOptionInput = {
        ...country,
        sort_order: current.countryOptions.length,
        cities: country.cities.slice(0, Math.min(3, country.cities.length)).map((city, idx) => ({ ...city, sort_order: idx })),
      };

      return {
        ...current,
        countryOptions: [...current.countryOptions, nextCountry],
      };
    });
  }

  function toggleCity(countryCode: string, city: { city: string; sort_order: number }) {
    setForm((current) => ({
      ...current,
      countryOptions: current.countryOptions.map((country) => {
        if (country.country_code !== countryCode) return country;

        const exists = country.cities.some((entry) => entry.city === city.city);
        const nextCities = exists
          ? country.cities.filter((entry) => entry.city !== city.city)
          : [...country.cities, city];

        return {
          ...country,
          cities: nextCities.map((entry, idx) => ({ ...entry, sort_order: idx })),
        };
      }),
    }));
  }

  function reorderCountries(from: number, to: number) {
    setForm((current) => {
      if (from === to || from < 0 || to < 0) return current;
      const next = current.countryOptions.slice();
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return {
        ...current,
        countryOptions: next.map((country, idx) => ({ ...country, sort_order: idx })),
      };
    });
  }

  function reorderCities(countryCode: string, from: number, to: number) {
    setForm((current) => ({
      ...current,
      countryOptions: current.countryOptions.map((country) => {
        if (country.country_code !== countryCode) return country;
        const cities = country.cities.slice();
        const [moved] = cities.splice(from, 1);
        if (!moved) return country;
        cities.splice(to, 0, moved);
        return {
          ...country,
          cities: cities.map((city, idx) => ({ ...city, sort_order: idx })),
        };
      }),
    }));
  }

  function resetDemoPoll() {
    if (!isDemoMode) return;
    onPollChange?.(null);
    setForm(buildFormState(null, availableOptions));
    setEditorOpen(false);
  }

  const countdownLabel = hasCountdown ? formatCountdown(remainingMs) : null;

  return (
    <>
      <Card className="tm-surface-strong">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tym-overline text-[#ff8b8b]">Fan vote</p>
              <CardTitle className="mt-1 text-[16px] font-medium text-[#f1f1f1]">
                {poll?.title || "La audiencia puede votar el siguiente destino"}
              </CardTitle>
            </div>
            {viewer.isOwner ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setEditorOpen(true)}>
                <GearSix size={14} />
                {poll ? "Editar" : "Crear"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <p className="text-[13px] leading-5 text-[#d7b0b0]">
            {poll?.prompt || "Activa una shortlist de paises y ciudades para que tu audiencia priorice el siguiente viaje."}
          </p>

          {poll && !(isAnonymousViewer && poll.status === "live") ? (
            <div className="grid gap-2">
              {top3Countries.map((country) => {
                const width = poll.total_votes > 0 ? Math.max(14, Math.round((country.votes / poll.total_votes) * 100)) : 14;
                return (
                  <div key={country.country_code} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-[#f1f1f1]">{country.country_name}</span>
                      <span className="text-[12px] text-[#aaaaaa]">
                        {canSeeDetailedStats ? `${country.votes} votos${poll.total_votes > 0 ? ` · ${formatPercent(country.votes, poll.total_votes)}` : ""}` : "Top destino"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-[rgba(255, 90, 61,0.78)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : poll ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12px] text-[#b3b8be]">
              Votacion activa. Vota para participar y ver resultados cuando cierre.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[rgba(255, 90, 61,0.22)] bg-[rgba(255, 90, 61,0.08)] px-4 py-3 text-[12px] text-[#ffb4b4]">
              {viewer.isOwner ? "Todavia no hay una votacion activa o en borrador." : "El creador todavia no publico una votacion para este mundo."}
            </div>
          )}

          {poll?.status === "live" && !viewer.isOwner ? (
            <Button type="button" className="w-full" onClick={() => !poll.has_voted && setVoteOpen(true)} disabled={poll.has_voted || isExpiredLive}>
              <MapPin size={14} />
              {poll.has_voted ? "Ya votaste" : "Votar destino"}
            </Button>
          ) : null}

          {poll?.status === "closed" && !viewer.isOwner ? (
            <Button type="button" className="w-full" variant="outline" onClick={() => setResultOpen(true)}>
              <MapPin size={14} />
              Ver resultados
            </Button>
          ) : null}

          {poll && isAnonymousViewer ? (
            <button
              type="button"
              onClick={goToViewerLogin}
              className="w-full rounded-2xl border border-[rgba(255, 90, 61,0.28)] bg-[rgba(255, 90, 61,0.1)] px-4 py-3 text-left text-[12px] text-[#ffb4b4] transition hover:bg-[rgba(255, 90, 61,0.14)]"
            >
              Inicia sesion como viewer para desbloquear estadisticas completas de la votacion.
            </button>
          ) : null}

          {poll ? (
            <div className="flex items-center justify-between gap-3 text-[12px] text-[#aaaaaa]">
              <span>{poll.status === "live" ? "Live" : poll.status === "draft" ? "Draft" : "Closed"}</span>
              <span>
                {hasCountdown && countdownLabel ? `Cierra en ${countdownLabel}` : canSeeDetailedStats ? `${poll.total_votes} votos totales` : "Votacion activa"}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="tm-surface-strong max-w-[min(920px,calc(100%-2rem))]">
          <DialogHeader>
            <DialogTitle className="text-[#f1f1f1]">Configurar votacion</DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              Publica una sola votacion activa usando solo paises y ciudades que ya existen en el mapa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Titulo</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-[#f1f1f1] outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Prompt</span>
                <textarea
                  value={form.prompt}
                  onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                  className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f1f1f1] outline-none"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Modo de votacion</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, pollMode: "country" }))}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[12px]",
                      form.pollMode === "country"
                        ? "border-[rgba(255, 90, 61,0.34)] bg-[rgba(255, 90, 61,0.14)] text-[#f1f1f1]"
                        : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                    )}
                  >
                    Solo pais
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, pollMode: "country_city" }))}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[12px]",
                      form.pollMode === "country_city"
                        ? "border-[rgba(255, 90, 61,0.34)] bg-[rgba(255, 90, 61,0.14)] text-[#f1f1f1]"
                        : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                    )}
                  >
                    Pais + ciudad
                  </button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Cierre automatico (opcional)</span>
                <input
                  type="datetime-local"
                  value={form.closesAtLocal}
                  onChange={(event) => setForm((current) => ({ ...current, closesAtLocal: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-[#f1f1f1] outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, showPopup: !current.showPopup }))}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                  form.showPopup ? "border-[rgba(255, 90, 61,0.28)] bg-[rgba(255, 90, 61,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                )}
              >
                <span>Mostrar popup al entrar</span>
                {form.showPopup ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </button>

              {error ? <p className="text-[12px] text-[#ff9d9d]">{error}</p> : null}
            </div>

            <ScrollArea className="h-[58dvh] rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-map-scroll="true">
              <div className="space-y-4 pr-3">
                {availableOptions.map((country) => {
                  const selected = form.countryOptions.find((entry) => entry.country_code === country.country_code) || null;
                  return (
                    <div key={country.country_code} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium text-[#f1f1f1]">{country.country_name}</p>
                          <p className="text-[12px] text-[#aaaaaa]">{country.cities.length} ciudades disponibles</p>
                        </div>
                        <Button type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleCountry(country)}>
                          {selected ? "Incluido" : "Agregar"}
                        </Button>
                      </div>

                      {selected && form.pollMode === "country_city" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {country.cities.map((city) => {
                            const active = selected.cities.some((entry) => entry.city === city.city);
                            return (
                              <button
                                key={city.city}
                                type="button"
                                onClick={() => toggleCity(country.country_code, city)}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                                  active
                                    ? "border-[rgba(255, 90, 61,0.34)] bg-[rgba(255, 90, 61,0.14)] text-[#f1f1f1]"
                                    : "border-white/10 bg-white/[0.02] text-[#aaaaaa]"
                                )}
                              >
                                {city.city}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {form.countryOptions.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Prioridad (drag and drop)</p>
                    <div className="mt-3 space-y-2">
                      {form.countryOptions
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((country, index) => {
                          const countryLabel = countryNameMap.get(country.country_code) || country.country_name || country.country_code;
                          return (
                            <div
                              key={country.country_code}
                              draggable
                              onDragStart={() => setDragCountryIndex(index)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (dragCountryIndex === null) return;
                                reorderCountries(dragCountryIndex, index);
                                setDragCountryIndex(null);
                              }}
                              className="rounded-xl border border-white/10 bg-black/20 p-2"
                            >
                              <p className="text-[12px] text-[#f1f1f1]">{index + 1}. {countryLabel}</p>

                              {form.pollMode === "country_city" && country.cities.length ? (
                                <div className="mt-2 space-y-1">
                                  {country.cities
                                    .slice()
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((city, cityIndex) => (
                                      <div
                                        key={`${country.country_code}:${city.city}`}
                                        draggable
                                        onDragStart={() => setDragCitySource({ countryCode: country.country_code, index: cityIndex })}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => {
                                          if (!dragCitySource || dragCitySource.countryCode !== country.country_code) return;
                                          reorderCities(country.country_code, dragCitySource.index, cityIndex);
                                          setDragCitySource(null);
                                        }}
                                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[#d5d5d5]"
                                      >
                                        {cityIndex + 1}. {city.city}
                                      </div>
                                    ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
            {isDemoMode ? (
              <Button type="button" variant="ghost" onClick={resetDemoPoll}>
                Reset demo
              </Button>
            ) : null}
            {form.pollId ? (
              <Button type="button" variant="ghost" onClick={closePoll} disabled={busyAction === "close"}>
                {busyAction === "close" ? "Cerrando..." : "Cerrar votacion"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => savePoll("draft")} disabled={Boolean(busyAction)}>
              <Copy size={14} />
              {busyAction === "draft" ? "Guardando..." : "Guardar draft"}
            </Button>
            <Button type="button" onClick={() => savePoll("live")} disabled={Boolean(busyAction)}>
              <RocketLaunch size={14} />
              {busyAction === "live" ? "Publicando..." : "Publicar votacion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={voteOpen} onOpenChange={setVoteOpen}>
        <DialogContent
          className="tm-surface-strong max-w-[min(980px,calc(100%-1.5rem))] overflow-hidden p-0"
          showCloseButton={!mustVote}
          onInteractOutside={(event) => {
            if (mustVote) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (mustVote) event.preventDefault();
          }}
        >
          <div className="border-b border-white/10 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-[#f1f1f1]">{poll?.title || "Vota el siguiente destino"}</DialogTitle>
              <DialogDescription className="text-[#aaaaaa]">
                {poll?.prompt || "Elige un pais y una ciudad para priorizar el siguiente viaje."}
                {hasCountdown && countdownLabel ? ` · Cierra en ${countdownLabel}` : ""}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className={cn("grid gap-0", poll?.poll_mode === "country_city" ? "md:grid-cols-[0.9fr_1.1fr]" : "md:grid-cols-1")}>
            {poll ? (
              <>
                <div className={cn("p-5", poll.poll_mode === "country_city" ? "border-b border-white/10 md:border-b-0 md:border-r" : "") }>
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Pais</p>
                  <div className="mt-3 space-y-2">
                    {poll.country_options.map((country) => {
                      const label = countryNameMap.get(country.country_code) || country.country_name || country.country_code;
                      const active = selectedCountry === country.country_code;
                      return (
                        <button
                          key={country.country_code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country.country_code);
                            setSelectedCity(country.cities[0]?.city || "");
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                            active ? "border-[rgba(255, 90, 61,0.28)] bg-[rgba(255, 90, 61,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                          )}
                        >
                          <span>{label}</span>
                          <span className="text-[12px]">{canSeeDetailedStats ? `${country.votes} votos` : "Elegible"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {poll.poll_mode === "country_city" ? (
                  <div className="p-5">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Ciudad</p>
                    <div className="mt-3 space-y-2">
                      {voteCities.map((city) => {
                        const active = selectedCity === city.city;
                        return (
                          <button
                            key={city.city}
                            type="button"
                            onClick={() => setSelectedCity(city.city)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                              active ? "border-[rgba(255, 90, 61,0.28)] bg-[rgba(255, 90, 61,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                            )}
                          >
                            <span>{city.city}</span>
                            <span className="text-[12px]">{canSeeDetailedStats ? `${city.votes} votos` : "Ciudad"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            {voteError ? <p className="mb-2 text-[12px] text-[#ff9d9d]">{voteError}</p> : null}
            {mustVote ? (
              <p className="mb-3 rounded-2xl border border-[rgba(255, 90, 61,0.2)] bg-[rgba(255, 90, 61,0.08)] px-4 py-3 text-[12px] leading-5 text-[#ffb4b4]">
                Esta ventana se queda abierta hasta que votes.
              </p>
            ) : null}
            {poll && !poll.has_voted ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={submitVote}
                  disabled={busyVote || !selectedCountry || (poll.poll_mode === "country_city" && !selectedCity) || isExpiredLive}
                >
                  {busyVote ? "Enviando..." : "Confirmar voto"}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="tm-surface-strong max-w-[min(720px,calc(100%-1.5rem))]">
          <DialogHeader>
            <DialogTitle className="text-[#f1f1f1]">Resultados de la votacion</DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              {poll?.title || "Resultado final"} · {canSeeDetailedStats ? "detalle completo" : "resumen publico"}
            </DialogDescription>
          </DialogHeader>

          {pollMode === "country" ? (
            <>
              {winnerCountry ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Ganador</p>
                  <p className="mt-2 text-[18px] font-semibold text-[#f1f1f1]">{winnerCountry.country_name}</p>
                  {canSeeDetailedStats ? (
                    <p className="mt-1 text-[12px] text-[#aaaaaa]">
                      {winnerCountry.votes} votos{poll && poll.total_votes > 0 ? ` · ${formatPercent(winnerCountry.votes, poll.total_votes)}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Top 3</p>
                {top3Countries.map((country, index) => (
                  <div key={country.country_code} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <span className="text-[13px] text-[#f1f1f1]">{index + 1}. {country.country_name}</span>
                    {canSeeDetailedStats ? (
                      <span className="text-[12px] text-[#aaaaaa]">
                        {country.votes} votos{poll && poll.total_votes > 0 ? ` · ${formatPercent(country.votes, poll.total_votes)}` : ""}
                      </span>
                    ) : null}
                  </div>
                ))}
                {!top3Countries.length ? <p className="text-[12px] text-[#aaaaaa]">Sin resultados disponibles.</p> : null}
              </div>
            </>
          ) : (
            <>
              {winnerCity ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Ganador</p>
                  <p className="mt-2 text-[18px] font-semibold text-[#f1f1f1]">{winnerCity.country_name} · {winnerCity.city}</p>
                  {canSeeDetailedStats ? (
                    <p className="mt-1 text-[12px] text-[#aaaaaa]">
                      {winnerCity.votes} votos{poll && poll.total_votes > 0 ? ` · ${formatPercent(winnerCity.votes, poll.total_votes)}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Top 3</p>
                {top3Cities.map((entry, index) => (
                  <div key={`${entry.country_code}:${entry.city}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <span className="text-[13px] text-[#f1f1f1]">{index + 1}. {entry.country_name} · {entry.city}</span>
                    {canSeeDetailedStats ? (
                      <span className="text-[12px] text-[#aaaaaa]">
                        {entry.votes} votos{poll && poll.total_votes > 0 ? ` · ${formatPercent(entry.votes, poll.total_votes)}` : ""}
                      </span>
                    ) : null}
                  </div>
                ))}
                {!top3Cities.length ? <p className="text-[12px] text-[#aaaaaa]">Sin resultados disponibles.</p> : null}
              </div>
            </>
          )}

          {isAnonymousViewer ? (
            <Button type="button" className="w-full" onClick={goToViewerLogin}>
              Desbloquear estadisticas completas
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatCountdown(remainingMs: number) {
  if (!Number.isFinite(remainingMs)) return null;
  if (remainingMs <= 0) return "Finalizando...";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function toLocalDatetimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function buildFormState(poll: MapPollRecord | null, availableOptions: PollOptionInput[]): PollFormState {
  if (poll) {
    return {
      pollId: poll.id,
      title: poll.title,
      prompt: poll.prompt,
      pollMode: poll.poll_mode || "country_city",
      showPopup: poll.show_popup,
      closesAtLocal: toLocalDatetimeInput(poll.closes_at),
      countryOptions: poll.country_options.map((country, index) => ({
        country_code: country.country_code,
        country_name: country.country_name,
        sort_order: Number.isFinite(Number(country.sort_order)) ? Number(country.sort_order) : index,
        cities: country.cities.map((city, cityIndex) => ({
          city: city.city,
          sort_order: Number.isFinite(Number(city.sort_order)) ? Number(city.sort_order) : cityIndex,
        })),
      })),
    };
  }

  return {
    pollId: null,
    title: "¿A dónde debería viajar después?",
    prompt: "Vota un país y una ciudad para priorizar el próximo destino del mapa.",
    pollMode: "country_city",
    showPopup: true,
    closesAtLocal: "",
    countryOptions: availableOptions.slice(0, 3).map((country, index) => ({
      country_code: country.country_code,
      country_name: country.country_name,
      sort_order: index,
      cities: country.cities.slice(0, Math.min(2, country.cities.length)).map((city, cityIndex) => ({
        city: city.city,
        sort_order: cityIndex,
      })),
    })),
  };
}
