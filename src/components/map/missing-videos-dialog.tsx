"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { SquaresFour } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManualVerificationItem } from "@/lib/map-data";
import { cn } from "@/lib/utils";
import { LocationSelect, type LocationSelectOption } from "@/components/map/location-select";

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
  availableOptions: GeoOption[];
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

function toCountryOptions(options: GeoOption[]): LocationSelectOption[] {
  return options.map((country) => ({
    value: country.country_code,
    label: `${country.country_name} (${country.country_code})`,
    description: `${country.cities.length} cities available`,
  }));
}

function toCityOptions(country: GeoOption | undefined): LocationSelectOption[] {
  if (!country) return [];
  return country.cities.map((city) => ({
    value: city.city,
    label: city.city,
    description: country.country_name,
  }));
}

export function MissingVideosDialog({
  open,
  onOpenChange,
  pendingManual,
  manualDrafts,
  setManualDrafts,
  availableOptions,
  lastSyncSummary,
  onConfirm,
  onReload,
}: MissingVideosDialogProps) {
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [bulkCountry, setBulkCountry] = useState("");
  const [bulkCity, setBulkCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryOptions = useMemo(() => toCountryOptions(availableOptions), [availableOptions]);
  const countryMap = useMemo(
    () => new Map(availableOptions.map((country) => [country.country_code, country])),
    [availableOptions]
  );
  const bulkCountryOption = countryMap.get(bulkCountry || "");
  const bulkCityOptions = useMemo(() => toCityOptions(bulkCountryOption), [bulkCountryOption]);

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
    setError(null);
    try {
      await confirmSingle(video);
      await onReload();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Could not confirm the video.");
    } finally {
      setBusy(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1180px,calc(100%-1.5rem))] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,21,23,0.98),rgba(12,15,17,0.96))] p-0 text-[#f1f1f1] shadow-[0_34px_100px_-42px_rgba(0,0,0,0.94)]">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-[18px] font-medium text-[#f1f1f1]">Missing videos</DialogTitle>
            <DialogDescription className="text-[13px] leading-6 text-[#aaaaaa]">
              Bulk review the queue, assign the same country or city to multiple videos, and confirm one by one only when needed.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-[min(78dvh,760px)] gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-h-0 flex-col border-r border-white/10">
            <div className="grid gap-3 border-b border-white/10 px-5 py-4 sm:grid-cols-3 sm:px-6">
              <MiniStat label="Queued" value={pendingManual.length} />
              <MiniStat label="Auto" value={lastSyncSummary?.videos_verified_auto || 0} />
              <MiniStat label="Manual" value={lastSyncSummary?.videos_needs_manual || pendingManual.length} />
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-[12px] text-[#aaaaaa] sm:px-6">
              <span>{selectedVideoIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll} className="h-8 px-3 text-[12px]">
                  {selectedVideoIds.size === pendingManual.length && pendingManual.length > 0 ? "Clear" : "Select all"}
                </Button>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1" data-map-scroll="true">
              <div className="space-y-3 p-5 sm:p-6">
                {pendingManual.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-[13px] text-[#aaaaaa]">
                    No missing videos right now.
                  </div>
                ) : (
                  pendingManual.map((video) => {
                    const draft = getDraft(video);
                    const selected = selectedVideoIds.has(video.video_id);
                    const rowCountryOptions = countryOptions;
                    const rowCountry = countryMap.get(draft.country_code);
                    const rowCityOptions = toCityOptions(rowCountry);

                    return (
                      <div
                        key={video.video_id}
                        className={cn(
                          "rounded-[1.5rem] border px-4 py-4 transition-colors",
                          selected ? "border-[rgba(255,0,0,0.26)] bg-[rgba(255,0,0,0.08)]" : "border-white/10 bg-white/[0.02]"
                        )}
                      >
                        <div className="flex gap-3">
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
                            className="mt-1 size-4 shrink-0 rounded border-white/20 bg-transparent text-[color:var(--travel-accent)] accent-[color:var(--travel-accent)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-[13px] leading-5 font-medium text-[#f1f1f1]">{video.title}</p>
                                <p className="mt-1 text-[12px] leading-5 text-[#aaaaaa]">
                                  {video.needs_manual_reason || "Needs manual review."}
                                </p>
                              </div>
                              <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-[12px]" disabled={busy} onClick={() => handleSingleConfirm(video)}>
                                Confirm
                              </Button>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                              <LocationSelect
                                value={draft.country_code}
                                options={rowCountryOptions}
                                placeholder="Country"
                                searchPlaceholder="Search countries"
                                onValueChange={(value) => {
                                  const nextCountry = countryMap.get(value);
                                  const firstCity = nextCountry?.cities[0]?.city || "";
                                  const cityStillValid = nextCountry?.cities.some((entry) => entry.city === draft.city);
                                  setManualDrafts((current) => ({
                                    ...current,
                                    [video.video_id]: {
                                      country_code: value,
                                      city: cityStillValid ? draft.city : firstCity,
                                    },
                                  }));
                                }}
                              />
                              <LocationSelect
                                value={draft.city}
                                options={rowCityOptions}
                                placeholder={rowCountry ? "City (optional)" : "Select a country first"}
                                searchPlaceholder="Search cities"
                                disabled={!rowCountry}
                                onValueChange={(value) =>
                                  setManualDrafts((current) => ({
                                    ...current,
                                    [video.video_id]: { ...draft, city: value },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex min-h-0 flex-col gap-4 bg-black/[0.12] p-5 sm:p-6">
            <Card className="border border-white/10 bg-white/[0.03]">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[15px] font-medium text-[#f1f1f1]">Bulk edit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 pt-4">
                <LocationSelect
                  value={bulkCountry}
                  options={countryOptions}
                  placeholder="Country"
                  searchPlaceholder="Search countries"
                  onValueChange={(value) => {
                    const nextCountry = countryMap.get(value);
                    const firstCity = nextCountry?.cities[0]?.city || "";
                    const cityStillValid = nextCountry?.cities.some((entry) => entry.city === bulkCity);
                    setBulkCountry(value);
                    setBulkCity(cityStillValid ? bulkCity : firstCity);
                  }}
                />
                <LocationSelect
                  value={bulkCity}
                  options={bulkCityOptions}
                  placeholder={bulkCountry ? "City (optional)" : "Select a country first"}
                  searchPlaceholder="Search cities"
                  disabled={!bulkCountry}
                  onValueChange={(value) => setBulkCity(value)}
                />

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] leading-5 text-[#aaaaaa]">
                  Choose a country and optional city, then apply the same location to all selected videos.
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleBulkApply}
                    disabled={busy || selectedVideoIds.size === 0 || !bulkCountry}
                    className="w-full"
                  >
                    <SquaresFour size={14} />
                    Apply to selected
                  </Button>
                </div>

                {error ? <p className="text-[12px] leading-5 text-[#ff9d9d]">{error}</p> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e8e]">{label}</p>
      <p className="mt-2 text-[22px] leading-none font-semibold text-[#f1f1f1]">{value}</p>
    </div>
  );
}
