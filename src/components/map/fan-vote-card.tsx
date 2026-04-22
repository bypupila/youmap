"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Copy, GearSix, MapPin, RocketLaunch, XCircle } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MapPollRecord } from "@/lib/map-polls";
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
  onPollChange?: (poll: MapPollRecord | null) => void;
}

type PollFormState = {
  pollId: string | null;
  title: string;
  prompt: string;
  showPopup: boolean;
  countryOptions: PollOptionInput[];
};

export function FanVoteCard({ channelId, viewer, poll, availableOptions, onPollChange }: FanVoteCardProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"draft" | "live" | "close" | null>(null);
  const [busyVote, setBusyVote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>(poll?.country_options[0]?.country_code || "");
  const [selectedCity, setSelectedCity] = useState<string>(poll?.country_options[0]?.cities[0]?.city || "");
  const [autoPopupShown, setAutoPopupShown] = useState(false);
  const [form, setForm] = useState<PollFormState>(() => buildFormState(poll, availableOptions));

  const countryNameMap = useMemo(
    () => new Map(availableOptions.map((country) => [country.country_code, country.country_name])),
    [availableOptions]
  );

  useEffect(() => {
    setForm(buildFormState(poll, availableOptions));
    setSelectedCountry(poll?.country_options[0]?.country_code || availableOptions[0]?.country_code || "");
    setSelectedCity(poll?.country_options[0]?.cities[0]?.city || availableOptions[0]?.cities[0]?.city || "");
    setError(null);
    setVoteError(null);
  }, [availableOptions, poll]);

  useEffect(() => {
    if (viewer.isOwner) return;
    if (!poll || poll.status !== "live" || !poll.show_popup || poll.has_voted || autoPopupShown) return;
    setVoteOpen(true);
    setAutoPopupShown(true);
  }, [autoPopupShown, poll, viewer.isOwner]);

  const currentPollCountries = poll?.country_options || [];
  const mustVote = Boolean(poll && poll.status === "live" && poll.show_popup && !poll.has_voted && !viewer.isOwner);

  async function savePoll(status: "draft" | "live") {
    setBusyAction(status);
    setError(null);

    try {
      const response = await fetch("/api/map/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: form.pollId,
          channelId,
          title: form.title,
          prompt: form.prompt,
          showPopup: form.showPopup,
          status,
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
    if (!form.pollId) return;
    setBusyAction("close");
    setError(null);

    try {
      const response = await fetch("/api/map/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: form.pollId,
          channelId,
          title: form.title,
          prompt: form.prompt,
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
    if (!poll || !selectedCountry || !selectedCity) return;
    setBusyVote(true);
    setVoteError(null);

    try {
      const response = await fetch(`/api/map/polls/${encodeURIComponent(poll.id)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: selectedCountry, city: selectedCity }),
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
        city: selectedCity,
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
          countryOptions: current.countryOptions.filter((item) => item.country_code !== country.country_code),
        };
      }
      return {
        ...current,
        countryOptions: [...current.countryOptions, { ...country, cities: country.cities.slice(0, Math.min(3, country.cities.length)) }],
      };
    });
  }

  function toggleCity(countryCode: string, city: { city: string; sort_order: number }) {
    setForm((current) => ({
      ...current,
      countryOptions: current.countryOptions.map((country) => {
        if (country.country_code !== countryCode) return country;
        const exists = country.cities.some((entry) => entry.city === city.city);
        const cities = exists ? country.cities.filter((entry) => entry.city !== city.city) : [...country.cities, city];
        return {
          ...country,
          cities: cities.length ? cities : [city],
        };
      }),
    }));
  }

  const voteCities = currentPollCountries.find((country) => country.country_code === selectedCountry)?.cities || [];

  return (
    <>
      <Card className="tm-surface-strong">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="yt-overline text-[#ff8b8b]">Fan vote</p>
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

          {poll ? (
            <div className="grid gap-2">
              {currentPollCountries.slice(0, 3).map((country) => {
                const label = countryNameMap.get(country.country_code) || country.country_name || country.country_code;
                const width = poll.total_votes > 0 ? Math.max(14, Math.round((country.votes / poll.total_votes) * 100)) : 14;
                return (
                  <div key={country.country_code} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-[#f1f1f1]">{label}</span>
                      <span className="text-[12px] text-[#aaaaaa]">{country.votes} votos</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-[rgba(255,0,0,0.78)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[rgba(255,0,0,0.22)] bg-[rgba(255,0,0,0.08)] px-4 py-3 text-[12px] text-[#ffb4b4]">
              {viewer.isOwner ? "Todavia no hay una votacion activa o en borrador." : "El creador todavia no publico una votacion para este mundo."}
            </div>
          )}

          {poll?.status === "live" && !viewer.isOwner ? (
            <Button type="button" className="w-full" onClick={() => setVoteOpen(true)}>
              <MapPin size={14} />
              {poll.has_voted ? "Ver resultado y cambiar foco" : "Votar destino"}
            </Button>
          ) : null}

          {poll ? (
            <div className="flex items-center justify-between gap-3 text-[12px] text-[#aaaaaa]">
              <span>{poll.status === "live" ? "Live" : poll.status === "draft" ? "Draft" : "Closed"}</span>
              <span>{poll.total_votes} votos totales</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="tm-surface-strong max-w-[min(780px,calc(100%-2rem))]">
          <DialogHeader>
            <DialogTitle className="text-[#f1f1f1]">Configurar votacion</DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              Publica una sola votacion activa usando solo paises y ciudades que ya existen en el mapa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
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
                  className="min-h-[132px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f1f1f1] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, showPopup: !current.showPopup }))}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                  form.showPopup ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                )}
              >
                <span>Mostrar popup al entrar</span>
                {form.showPopup ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </button>
              {error ? <p className="text-[12px] text-[#ff9d9d]">{error}</p> : null}
            </div>

            <ScrollArea className="h-[52dvh] rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-map-scroll="true">
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
                      {selected ? (
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
                                    ? "border-[rgba(255,0,0,0.34)] bg-[rgba(255,0,0,0.14)] text-[#f1f1f1]"
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
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
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
              <DialogDescription className="text-[#aaaaaa]">{poll?.prompt || "Elige un pais y una ciudad para priorizar el siguiente viaje."}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
            {poll ? (
              <>
                <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
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
                            active ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                          )}
                        >
                          <span>{label}</span>
                          <span className="text-[12px]">{country.votes} votos</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                            active ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]" : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
                          )}
                        >
                          <span>{city.city}</span>
                          <span className="text-[12px]">{city.votes} votos</span>
                        </button>
                      );
                    })}
                    {voteError ? <p className="text-[12px] text-[#ff9d9d]">{voteError}</p> : null}
                    {mustVote ? (
                      <p className="rounded-2xl border border-[rgba(255,0,0,0.2)] bg-[rgba(255,0,0,0.08)] px-4 py-3 text-[12px] leading-5 text-[#ffb4b4]">
                        Esta ventana se queda abierta hasta que votes.
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {poll && !poll.has_voted ? (
            <div className="flex justify-end border-t border-white/10 px-5 py-4">
              <Button type="button" onClick={submitVote} disabled={busyVote || !selectedCountry || !selectedCity}>
                {busyVote ? "Enviando..." : "Confirmar voto"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildFormState(poll: MapPollRecord | null, availableOptions: PollOptionInput[]): PollFormState {
  if (poll) {
    return {
      pollId: poll.id,
      title: poll.title,
      prompt: poll.prompt,
      showPopup: poll.show_popup,
      countryOptions: poll.country_options.map((country, index) => ({
        country_code: country.country_code,
        country_name: country.country_name,
        sort_order: country.sort_order || index,
        cities: country.cities.map((city, cityIndex) => ({
          city: city.city,
          sort_order: city.sort_order || cityIndex,
        })),
      })),
    };
  }

  return {
    pollId: null,
    title: "¿A dónde debería viajar después?",
    prompt: "Vota un país y una ciudad para priorizar el próximo destino del mapa.",
    showPopup: true,
    countryOptions: availableOptions.slice(0, 3).map((country, index) => ({
      country_code: country.country_code,
      country_name: country.country_name,
      sort_order: index,
      cities: country.cities.slice(0, Math.min(2, country.cities.length)),
    })),
  };
}
