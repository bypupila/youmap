"use client";

import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { MapPollMode, MapPollRecord } from "@/lib/map-polls";
import { cn } from "@/lib/utils";
import { getCountryNameInSpanish } from "@/components/map/video-viewer-utils";

export type PollEditorCountryOption = {
  country_code: string;
  country_name: string;
  cities: Array<{ city: string; sort_order: number }>;
};

export type PollEditorCityOption = {
  city: string;
  sort_order: number;
};

export type PollEditorCountrySelection = {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: PollEditorCityOption[];
};

export type PollEditorFormState = {
  pollId: string | null;
  title: string;
  prompt: string;
  pollMode: MapPollMode;
  showPopup: boolean;
  closesAtLocal: string;
  countryOptions: PollEditorCountrySelection[];
};

type PollEditorSourceVideo = {
  country_code?: string | null;
  country_name?: string | null;
  city?: string | null;
};

export function buildPollEditorCountriesFromVideos(videoLocations: PollEditorSourceVideo[]) {
  const bucket = new Map<string, { country_name: string; cities: Map<string, { label: string; count: number }> }>();

  for (const video of videoLocations) {
    const countryCode = String(video.country_code || "").trim().toUpperCase();
    if (!countryCode) continue;

    const countryName = getCountryNameInSpanish(video.country_code, video.country_name) || countryCode;
    const current = bucket.get(countryCode) || {
      country_name: countryName,
      cities: new Map<string, { label: string; count: number }>(),
    };

    const city = String(video.city || "").trim();
    if (city) {
      const key = city.toLowerCase();
      const existing = current.cities.get(key);
      current.cities.set(key, {
        label: existing?.label || city,
        count: (existing?.count || 0) + 1,
      });
    }

    bucket.set(countryCode, current);
  }

  return Array.from(bucket.entries())
    .map(([country_code, value]) => ({
      country_code,
      country_name: value.country_name,
      cities: Array.from(value.cities.values())
        .sort((a, b) => a.label.localeCompare(b.label, "es"))
        .map((entry, index) => ({ city: entry.label, sort_order: index })),
    }))
    .sort((a, b) => a.country_name.localeCompare(b.country_name, "es"));
}

export function buildPollEditorFormState(poll: MapPollRecord | null, availableOptions: PollEditorCountryOption[]): PollEditorFormState {
  const currentCountries = poll?.country_options?.length
    ? poll.country_options.map((country) => ({
        country_code: country.country_code,
        country_name: country.country_name,
        sort_order: country.sort_order,
        cities: (country.cities || []).map((city) => ({
          city: city.city,
          sort_order: city.sort_order,
        })),
      }))
    : availableOptions.slice(0, 2).map((country, index) => ({
        country_code: country.country_code,
        country_name: country.country_name,
        sort_order: index,
        cities: [],
      }));

  return {
    pollId: poll?.id || null,
    title: poll?.title || "A donde va el siguiente viaje",
    prompt: poll?.prompt || "Vota el proximo destino del mapa.",
    pollMode: poll?.poll_mode || "country_city",
    showPopup: poll?.show_popup ?? false,
    closesAtLocal: poll?.closes_at ? toLocalDateTime(poll.closes_at) : "",
    countryOptions: currentCountries,
  };
}

export function PollEditorFields({
  form,
  setForm,
  availableOptions,
  className,
  showModeToggle = true,
  showPopupToggle = true,
  titlePlaceholder = "Titulo: Proximo viaje del canal",
  promptPlaceholder = "Describe la votacion y el criterio de elección.",
}: {
  form: PollEditorFormState;
  setForm: Dispatch<SetStateAction<PollEditorFormState>>;
  availableOptions: PollEditorCountryOption[];
  className?: string;
  showModeToggle?: boolean;
  showPopupToggle?: boolean;
  titlePlaceholder?: string;
  promptPlaceholder?: string;
}) {
  const [countryToAdd, setCountryToAdd] = useState("");
  const [cityDraftByCountry, setCityDraftByCountry] = useState<Record<string, string>>({});

  const availableCountryMap = useMemo(() => new Map(availableOptions.map((country) => [country.country_code, country])), [availableOptions]);

  const selectedCountryCodes = useMemo(() => new Set(form.countryOptions.map((country) => country.country_code)), [form.countryOptions]);
  const remainingCountries = useMemo(
    () => availableOptions.filter((country) => !selectedCountryCodes.has(country.country_code)),
    [availableOptions, selectedCountryCodes]
  );

  useEffect(() => {
    if (remainingCountries.length === 0) {
      setCountryToAdd("");
      return;
    }
    if (!remainingCountries.some((country) => country.country_code === countryToAdd)) {
      setCountryToAdd(remainingCountries[0]?.country_code || "");
    }
  }, [countryToAdd, remainingCountries]);

  useEffect(() => {
    setCityDraftByCountry((current) => {
      let changed = false;
      const next = { ...current };

      for (const selection of form.countryOptions) {
        const country = availableCountryMap.get(selection.country_code);
        const firstCity = country?.cities[0]?.city || "";
        const currentCity = next[selection.country_code];
        const cityExists = currentCity && (country?.cities || []).some((city) => city.city === currentCity);
        if (!cityExists) {
          next[selection.country_code] = firstCity;
          changed = true;
        }
      }

      for (const key of Object.keys(next)) {
        if (!selectedCountryCodes.has(key)) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [availableCountryMap, form.countryOptions, selectedCountryCodes]);

  useEffect(() => {
    if (form.pollMode !== "country_city") return;
    setForm((current) => {
      let changed = false;
      const nextCountries = current.countryOptions.map((country) => {
        if (country.cities.length > 0) return country;
        const catalog = availableCountryMap.get(country.country_code);
        const fallbackCity = catalog?.cities[0]?.city || "";
        if (!fallbackCity) return country;
        changed = true;
        return {
          ...country,
          cities: [{ city: fallbackCity, sort_order: 0 }],
        };
      });

      return changed ? { ...current, countryOptions: nextCountries } : current;
    });
  }, [availableCountryMap, form.pollMode, setForm]);

  function updateCountries(updater: (current: PollEditorCountrySelection[]) => PollEditorCountrySelection[]) {
    setForm((current) => ({
      ...current,
      countryOptions: normalizeCountryOptions(updater(current.countryOptions)),
    }));
  }

  function addCountry() {
    const country = availableCountryMap.get(countryToAdd);
    if (!country) return;

    updateCountries((current) => {
      if (current.some((item) => item.country_code === country.country_code)) return current;
      const city = form.pollMode === "country_city" ? country.cities[0]?.city || "" : "";
      return [
        ...current,
        {
          country_code: country.country_code,
          country_name: country.country_name,
          sort_order: current.length,
          cities: city ? [{ city, sort_order: 0 }] : [],
        },
      ];
    });
  }

  function removeCountry(countryCode: string) {
    updateCountries((current) => current.filter((country) => country.country_code !== countryCode));
  }

  function addCity(countryCode: string) {
    const country = availableCountryMap.get(countryCode);
    const city = String(cityDraftByCountry[countryCode] || "").trim();
    if (!country || !city) return;

    updateCountries((current) =>
      current.map((selection) => {
        if (selection.country_code !== countryCode) return selection;
        if (selection.cities.some((entry) => entry.city === city)) return selection;
        return {
          ...selection,
          cities: [...selection.cities, { city, sort_order: selection.cities.length }],
        };
      })
    );
  }

  function removeCity(countryCode: string, city: string) {
    updateCountries((current) =>
      current.map((selection) => {
        if (selection.country_code !== countryCode) return selection;
        return {
          ...selection,
          cities: selection.cities
            .filter((entry) => entry.city !== city)
            .map((entry, index) => ({ ...entry, sort_order: index })),
        };
      })
    );
  }

  function setCountryMode(nextMode: MapPollMode) {
    setForm((current) => ({ ...current, pollMode: nextMode }));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3">
        <label className="space-y-2">
          <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Titulo</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={titlePlaceholder}
            required
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-[#f1f1f1] outline-none placeholder:text-[#5f6771]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Prompt</span>
          <textarea
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            placeholder={promptPlaceholder}
            required
            className="min-h-[108px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f1f1f1] outline-none placeholder:text-[#5f6771]"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {showModeToggle ? (
          <label className="space-y-2">
            <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Modo de votacion</span>
            <select
              value={form.pollMode}
              onChange={(event) => setCountryMode(event.target.value === "country" ? "country" : "country_city")}
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-[#f1f1f1] outline-none"
            >
              <option value="country">Solo pais</option>
              <option value="country_city">Pais + ciudad</option>
            </select>
          </label>
        ) : (
          <div />
        )}

        <label className="space-y-2">
          <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Cierre automatico (opcional)</span>
          <input
            type="datetime-local"
            value={form.closesAtLocal}
            onChange={(event) => setForm((current) => ({ ...current, closesAtLocal: event.target.value }))}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-[#f1f1f1] outline-none"
          />
        </label>
      </div>

      {showPopupToggle ? (
        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, showPopup: !current.showPopup }))}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
            form.showPopup
              ? "border-[rgba(255, 90, 61,0.28)] bg-[rgba(255, 90, 61,0.12)] text-[#f1f1f1]"
              : "border-white/10 bg-white/[0.03] text-[#aaaaaa]"
          )}
        >
          <span>Mostrar popup al entrar</span>
          {form.showPopup ? <CheckCircle size={16} /> : <XCircle size={16} />}
        </button>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="min-w-0 flex-1 space-y-2">
            <span className="text-[12px] uppercase tracking-[0.14em] text-[#aaaaaa]">Pais</span>
            <select
              value={countryToAdd}
              onChange={(event) => setCountryToAdd(event.target.value)}
              disabled={remainingCountries.length === 0}
              className="h-11 w-full rounded-2xl border border-white/10 bg-[#090d13] px-4 text-sm text-[#f1f1f1] outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {remainingCountries.length === 0 ? (
                <option value="">No hay mas paises disponibles</option>
              ) : (
                remainingCountries.map((country) => (
                  <option key={country.country_code} value={country.country_code}>
                    {country.country_name}
                  </option>
                ))
              )}
            </select>
          </label>

          <button
            type="button"
            onClick={addCountry}
            disabled={!countryToAdd}
            className="h-11 rounded-2xl bg-[#ff5a3d] px-4 text-[12px] font-black text-white transition hover:bg-[#ff6f54] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Añadir pais
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {form.countryOptions.length ? (
            form.countryOptions
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order || a.country_name.localeCompare(b.country_name, "es"))
              .map((country) => {
                const catalog = availableCountryMap.get(country.country_code) || null;
                const draftCity = cityDraftByCountry[country.country_code] || catalog?.cities[0]?.city || "";
                const availableCities = catalog?.cities || [];

                return (
                  <div key={country.country_code} className="rounded-2xl border border-white/10 bg-[#090d13] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#f1f1f1]">{country.country_name}</p>
                        <p className="text-[11px] text-[#8e98a6]">
                          {country.cities.length} ciudad{country.cities.length === 1 ? "" : "es"} seleccionada{country.cities.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCountry(country.country_code)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/[0.06]"
                      >
                        Quitar
                      </button>
                    </div>

                    {form.pollMode === "country_city" ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end">
                          <label className="min-w-0 flex-1 space-y-2">
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[#8e98a6]">Ciudad</span>
                            <select
                              value={draftCity}
                              onChange={(event) => setCityDraftByCountry((current) => ({ ...current, [country.country_code]: event.target.value }))}
                              disabled={availableCities.length === 0}
                              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f1f1f1] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {availableCities.length === 0 ? (
                                <option value="">No hay ciudades disponibles</option>
                              ) : (
                                availableCities.map((city) => (
                                  <option key={`${country.country_code}:${city.city}`} value={city.city}>
                                    {city.city}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>

                          <button
                            type="button"
                            onClick={() => addCity(country.country_code)}
                            disabled={!draftCity || availableCities.length === 0}
                            className="h-10 rounded-xl border border-white/10 px-3 text-[12px] font-bold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Añadir ciudad
                          </button>
                        </div>

                        <div className="space-y-2">
                          {country.cities.length ? (
                            country.cities
                              .slice()
                              .sort((a, b) => a.sort_order - b.sort_order || a.city.localeCompare(b.city, "es"))
                              .map((city) => (
                                <div key={`${country.country_code}:${city.city}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                                  <span className="text-[12px] text-[#dfe5ec]">{city.city}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeCity(country.country_code, city.city)}
                                    className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#ffb4b4] transition hover:bg-[rgba(255,90,61,0.08)]"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))
                          ) : (
                            <p className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-[12px] text-[#8e98a6]">
                              Añade al menos una ciudad para este pais.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-[12px] text-[#8e98a6]">
              Agrega al menos un pais para construir la votacion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeCountryOptions(options: PollEditorCountrySelection[]) {
  return options.map((country, index) => ({
    ...country,
    sort_order: index,
    cities: country.cities.map((city, cityIndex) => ({ ...city, sort_order: cityIndex })),
  }));
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
