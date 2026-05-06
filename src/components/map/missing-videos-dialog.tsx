"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Check, MapPin, SquaresFour, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocationSelect, type LocationSelectOption } from "@/components/map/location-select";
import type { ManualVerificationItem } from "@/lib/map-data";
import { cn } from "@/lib/utils";
import {
  getAllWorldCountries,
  getCitiesForCountry,
  getCountryByIsoCode,
  type WorldCountry,
} from "@/lib/world-locations";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";

interface GeoOption {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

interface MissingVideosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingManual: ManualVerificationItem[];
  manualDrafts: Record<string, { country_code: string; city: string }>;
  setManualDrafts: Dispatch<SetStateAction<Record<string, { country_code: string; city: string }>>>;
  /**
   * Locations already used by other videos in the channel. Surfaced at the top
   * of the country list as recently-used shortcuts. Optional — the dialog now
   * provides the full world catalog by default.
   */
  availableOptions?: GeoOption[];
  lastSyncSummary: {
    videos_scanned: number;
    videos_extracted: number;
    videos_verified_auto: number;
    videos_needs_manual: number;
    videos_verified_manual: number;
    excluded_shorts: number;
    excluded_non_travel: number;
  } | null;
  onConfirm: (video: ManualVerificationItem, draft: { country_code: string; city: string }) => Promise<void>;
  onReload: () => Promise<void>;
}

function buildCountryOptions(
  countries: WorldCountry[],
  recentCodes: Set<string>
): LocationSelectOption[] {
  const recent: LocationSelectOption[] = [];
  const rest: LocationSelectOption[] = [];

  for (const country of countries) {
    const option: LocationSelectOption = {
      value: country.isoCode,
      label: country.name,
      description: country.isoCode,
      prefix: country.flag || null,
    };
    if (recentCodes.has(country.isoCode)) {
      recent.push({ ...option, description: `${country.isoCode} - Used recently` });
    } else {
      rest.push(option);
    }
  }

  return [...recent, ...rest];
}

function buildCityOptions(isoCode: string, knownCities: string[]): LocationSelectOption[] {
  if (!isoCode) return [];

  const cities = getCitiesForCountry(isoCode);
  const knownSet = new Set(knownCities.map((city) => city.trim().toLowerCase()).filter(Boolean));
  const seenInCatalog = new Set<string>();

  const recent: LocationSelectOption[] = [];
  const rest: LocationSelectOption[] = [];

  for (const city of cities) {
    const lower = city.name.toLowerCase();
    seenInCatalog.add(lower);
    const option: LocationSelectOption = {
      value: city.name,
      label: city.name,
      description: city.stateCode ? `Region ${city.stateCode}` : null,
    };
    if (knownSet.has(lower)) {
      recent.push({ ...option, description: "Used recently" });
    } else {
      rest.push(option);
    }
  }

  // Surface known cities that aren't in the world catalog (custom/legacy entries).
  for (const knownCity of knownCities) {
    const lower = knownCity.trim().toLowerCase();
    if (!lower || seenInCatalog.has(lower)) continue;
    seenInCatalog.add(lower);
    recent.push({
      value: knownCity,
      label: knownCity,
      description: "Used recently",
    });
  }

  return [...recent, ...rest];
}

export function MissingVideosDialog({
  open,
  onOpenChange,
  pendingManual,
  manualDrafts,
  setManualDrafts,
  availableOptions = [],
  lastSyncSummary,
  onConfirm,
  onReload,
}: MissingVideosDialogProps) {
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [bulkCountry, setBulkCountry] = useState("");
  const [bulkCity, setBulkCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const worldCountries = useMemo(() => getAllWorldCountries(), []);

  const recentCountryCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const option of availableOptions) {
      const code = String(option.country_code || "").toUpperCase();
      if (code) codes.add(code);
    }
    return codes;
  }, [availableOptions]);

  const knownCitiesByCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const option of availableOptions) {
      const code = String(option.country_code || "").toUpperCase();
      if (!code) continue;
      map.set(code, option.cities.map((city) => city.city));
    }
    return map;
  }, [availableOptions]);

  const countryOptions = useMemo(
    () => buildCountryOptions(worldCountries, recentCountryCodes),
    [worldCountries, recentCountryCodes]
  );

  const bulkCityOptions = useMemo(
    () => buildCityOptions(bulkCountry, knownCitiesByCountry.get(bulkCountry) || []),
    [bulkCountry, knownCitiesByCountry]
  );

  useEffect(() => {
    setSelectedVideoIds((current) => {
      if (current.size === 0) return current;
      const next = new Set<string>();
      const validIds = new Set(pendingManual.map((video) => video.video_id));
      for (const id of current) {
        if (validIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [pendingManual]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
      setConfirmingId(null);
      setSelectedVideoIds(new Set());
    }
  }, [open]);

  function getDraft(video: ManualVerificationItem) {
    return manualDrafts[video.video_id] || {
      country_code: video.country_code || "",
      city: video.city || "",
    };
  }

  async function confirmSingle(video: ManualVerificationItem) {
    const draft = getDraft(video);
    if (!draft.country_code.trim()) {
      throw new Error("Select a country before confirming.");
    }
    await onConfirm(video, {
      country_code: draft.country_code.trim().toUpperCase(),
      city: draft.city.trim(),
    });
  }

  async function handleBulkApply() {
    if (!bulkCountry.trim()) {
      setError("Select a country for the bulk action.");
      return;
    }

    const targets = pendingManual.filter((video) => selectedVideoIds.has(video.video_id));
    if (targets.length === 0) {
      setError("Select at least one video.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      for (const video of targets) {
        await onConfirm(video, {
          country_code: bulkCountry.trim().toUpperCase(),
          city: bulkCity.trim(),
        });
      }
      await onReload();
      setSelectedVideoIds(new Set());
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Could not confirm the selected videos.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSingleConfirm(video: ManualVerificationItem) {
    setBusy(true);
    setConfirmingId(video.video_id);
    setError(null);
    try {
      await confirmSingle(video);
      await onReload();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Could not confirm the video.");
    } finally {
      setBusy(false);
      setConfirmingId(null);
    }
  }

  function toggleSelectAll() {
    setSelectedVideoIds((current) => {
      if (current.size === pendingManual.length) {
        return new Set();
      }
      return new Set(pendingManual.map((video) => video.video_id));
    });
  }

  const allSelected = pendingManual.length > 0 && selectedVideoIds.size === pendingManual.length;
  const queuedCount = pendingManual.length;
  const autoCount = lastSyncSummary?.videos_verified_auto || 0;
  const manualVerifiedCount = lastSyncSummary?.videos_verified_manual || 0;
  const totalScanned = lastSyncSummary?.videos_scanned || (queuedCount + autoCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(92dvh,860px)] w-[min(100vw-1rem,1080px)] max-w-[1080px] flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1114] p-0 text-[#f1f1f1] shadow-[0_34px_100px_-42px_rgba(0,0,0,0.94)] sm:w-[min(100vw-2rem,1080px)]"
        showCloseButton={false}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <DialogTitle className="text-[17px] font-semibold leading-6 text-[#f1f1f1] sm:text-[19px]">
              Missing videos
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-[640px] text-[12px] leading-5 text-[#9aa0a6] sm:text-[13px]">
              Assign a country and city to videos we could not auto-locate. You can pick any country and city in the world.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#aaaaaa] transition-colors hover:bg-white/[0.06] hover:text-[#f1f1f1]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-5 py-3 sm:flex sm:items-center sm:gap-3 sm:px-7 sm:py-4">
          <MiniStat label="Pending" value={queuedCount} accent />
          <MiniStat label="Auto-located" value={autoCount} />
          <MiniStat label="Manually verified" value={manualVerifiedCount} />
          <MiniStat label="Last scan" value={totalScanned} />
        </div>

        <div className="flex flex-col gap-2 border-b border-white/10 bg-[#0b0e10] px-5 py-3 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={pendingManual.length === 0}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition-colors",
                allSelected
                  ? "border-[rgba(255, 90, 61,0.45)] bg-[rgba(255, 90, 61,0.12)] text-[#ffd5d5]"
                  : "border-white/10 bg-white/[0.04] text-[#d8d8d8] hover:bg-white/[0.08]",
                pendingManual.length === 0 && "opacity-50"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  allSelected ? "border-transparent bg-[#ff6a4e]" : "border-white/30"
                )}
              >
                {allSelected ? <Check size={11} weight="bold" className="text-white" /> : null}
              </span>
              {allSelected ? "Clear" : "Select all"}
            </button>
            <span className="text-[12px] text-[#9aa0a6]">
              {selectedVideoIds.size} of {queuedCount} selected
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <LocationSelect
              value={bulkCountry}
              options={countryOptions}
              placeholder="Country"
              searchPlaceholder="Search any country"
              onValueChange={(value) => {
                setBulkCountry(value);
                setBulkCity("");
              }}
            />
            <LocationSelect
              value={bulkCity}
              options={bulkCityOptions}
              placeholder={bulkCountry ? "City (optional)" : "Pick a country first"}
              searchPlaceholder="Search cities"
              disabled={!bulkCountry}
              onValueChange={(value) => setBulkCity(value)}
              emptyHint="No matching cities. Try a different spelling."
            />
            <Button
              type="button"
              onClick={handleBulkApply}
              disabled={busy || selectedVideoIds.size === 0 || !bulkCountry}
              className="h-11 rounded-xl bg-[#ff6a4e] px-5 text-[13px] font-semibold text-white hover:bg-[#ff7a63] disabled:bg-white/10 disabled:text-[#7a7f86] sm:px-6"
            >
              <SquaresFour size={15} weight="bold" />
              Apply to selected
            </Button>
          </div>

          {error ? (
            <p className="text-[12px] leading-5 text-[#ff9d9d]">{error}</p>
          ) : (
            <p className="text-[11px] leading-5 text-[#8e8e8e]">
              Tip: select multiple rows, choose a destination, then apply. You can still tweak each row individually below.
            </p>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 bg-[#0e1114]" data-map-scroll="true">
          <div className="flex flex-col gap-2.5 px-5 py-4 sm:px-7 sm:py-5">
            {pendingManual.length === 0 ? (
              <EmptyState />
            ) : (
              pendingManual.map((video) => {
                const draft = getDraft(video);
                const selected = selectedVideoIds.has(video.video_id);
                const draftCountryCode = String(draft.country_code || "").toUpperCase();
                const knownCities = knownCitiesByCountry.get(draftCountryCode) || [];
                const cityOptions = buildCityOptions(draftCountryCode, knownCities);
                const draftCountry = draftCountryCode ? getCountryByIsoCode(draftCountryCode) : null;
                const isConfirming = confirmingId === video.video_id;

                return (
                  <article
                    key={video.video_id}
                    className={cn(
                      "rounded-xl border bg-[#13171b] transition-colors",
                      selected ? "border-[rgba(255,58,58,0.45)] bg-[rgba(255,58,58,0.06)]" : "border-white/[0.08]"
                    )}
                  >
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
                      <div className="flex items-start gap-3 sm:contents">
                        <label
                          className="mt-1 flex shrink-0 cursor-pointer select-none items-center justify-center sm:mt-2"
                          aria-label={selected ? "Deselect video" : "Select video"}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              setSelectedVideoIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(video.video_id);
                                else next.delete(video.video_id);
                                return next;
                              });
                            }}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                              selected ? "border-transparent bg-[#ff6a4e]" : "border-white/25 bg-white/[0.02] peer-hover:border-white/40"
                            )}
                          >
                            {selected ? <Check size={13} weight="bold" className="text-white" /> : null}
                          </span>
                        </label>

                        <VideoThumbnail video={video} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-medium leading-5 text-[#f1f1f1] sm:text-[14px]">
                              {video.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#9aa0a6]">
                              {video.needs_manual_reason || "Needs manual review."}
                            </p>
                            {draftCountry ? (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#9aa0a6]">
                                <MapPin size={12} weight="fill" className="text-[#ff8b8b]" />
                                {draftCountry.flag} {draftCountry.name}
                                {draft.city ? <span className="text-[#7a7f86]">/ {draft.city}</span> : null}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <LocationSelect
                            value={draftCountryCode}
                            options={countryOptions}
                            placeholder="Country"
                            searchPlaceholder="Search any country"
                            onValueChange={(value) => {
                              setManualDrafts((current) => ({
                                ...current,
                                [video.video_id]: {
                                  country_code: value,
                                  city: "",
                                },
                              }));
                            }}
                          />
                          <LocationSelect
                            value={draft.city}
                            options={cityOptions}
                            placeholder={draftCountryCode ? "City (optional)" : "Pick a country first"}
                            searchPlaceholder="Search cities"
                            disabled={!draftCountryCode}
                            onValueChange={(value) =>
                              setManualDrafts((current) => ({
                                ...current,
                                [video.video_id]: {
                                  country_code: draftCountryCode,
                                  city: value,
                                },
                              }))
                            }
                            emptyHint="No matching cities. Try a different spelling."
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy || !draftCountryCode}
                            onClick={() => handleSingleConfirm(video)}
                            className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[13px] font-medium text-[#f1f1f1] hover:bg-white/[0.08] disabled:opacity-50"
                          >
                            {isConfirming ? "Saving..." : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:flex-1",
        accent ? "border-[rgba(255,58,58,0.3)] bg-[rgba(255,58,58,0.08)]" : "border-white/[0.08] bg-white/[0.02]"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">{label}</span>
      <span className={cn("text-[16px] font-semibold leading-none", accent ? "text-[#ffd5d5]" : "text-[#f1f1f1]")}>
        {value}
      </span>
    </div>
  );
}

function VideoThumbnail({ video }: { video: ManualVerificationItem }) {
  const thumbnail = video.thumbnail_url ? toCompactYouTubeThumbnail(video.thumbnail_url) : null;

  if (!thumbnail) {
    return (
      <div
        aria-hidden="true"
        className="flex h-[68px] w-[120px] shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#5e6268]"
      >
        <MapPin size={18} weight="fill" />
      </div>
    );
  }

  return (
    <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black">
      <Image
        src={thumbnail}
        alt=""
        fill
        sizes="120px"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(80,200,120,0.12)] text-[#7be087]">
        <Check size={18} weight="bold" />
      </span>
      <p className="text-[14px] font-medium text-[#f1f1f1]">All caught up</p>
      <p className="max-w-[320px] text-[12px] leading-5 text-[#9aa0a6]">
        No videos are waiting for manual review right now. Sync the channel again to look for new uploads.
      </p>
    </div>
  );
}
