"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface LocationSelectOption {
  value: string;
  label: string;
  description?: string | null;
  prefix?: string | null;
}

interface LocationSelectProps {
  value: string;
  options: LocationSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  maxVisibleResults?: number;
  emptyHint?: string;
}

export function LocationSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = "Search",
  onValueChange,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  maxVisibleResults = 250,
  emptyHint,
}: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  const allMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      return [option.label, option.description || "", option.value]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [options, query]);

  const visibleOptions = useMemo(
    () => allMatches.slice(0, Math.max(20, maxVisibleResults)),
    [allMatches, maxVisibleResults]
  );
  const hiddenCount = Math.max(0, allMatches.length - visibleOptions.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-left text-sm font-normal text-[#f1f1f1] hover:bg-white/[0.08] disabled:opacity-50",
            className,
            triggerClassName
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.prefix ? (
              <span aria-hidden="true" className="text-base leading-none">{selected.prefix}</span>
            ) : null}
            <span className={cn("min-w-0 truncate", !selected && "text-[#9aa0a6]")}>
              {selected?.label || placeholder}
            </span>
          </span>
          <CaretDown size={14} className="ml-2 shrink-0 text-[#aaaaaa]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(100vw-2rem,360px)] rounded-2xl border border-white/10 bg-[#101316] p-2 text-[#f1f1f1] shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92)]"
      >
        <div className="flex flex-col gap-2">
          <div className="px-1 pt-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-xl border-white/10 bg-white/[0.04] text-sm text-[#f1f1f1] placeholder:text-[#7a7f86]"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[280px]" data-map-scroll="true">
            <div className="space-y-0.5 px-1 pb-1">
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-4 text-[12px] text-[#aaaaaa]">{emptyHint || "No results."}</p>
        className={cn(
          "w-[min(100vw-2rem,360px)] border border-white/10 bg-[#121518] p-3 text-[#f1f1f1] shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92)]",
          contentClassName
        )}
      >
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-sm text-[#f1f1f1]"
          />
          <ScrollArea className="max-h-[260px] pr-1" data-map-scroll="true">
            <div className="space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-[12px] text-[#aaaaaa]">No results.</p>
              ) : (
                <>
                  {visibleOptions.map((option) => {
                    const active = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onValueChange(option.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active
                            ? "bg-[rgba(255,0,0,0.14)] text-[#f1f1f1]"
                            : "text-[#d8d8d8] hover:bg-white/[0.06]"
                        )}
                      >
                        {option.prefix ? (
                          <span aria-hidden="true" className="text-base leading-none">{option.prefix}</span>
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-inherit">{option.label}</span>
                          {option.description ? (
                            <span className="mt-0.5 block truncate text-[11px] text-[#8e8e8e]">{option.description}</span>
                          ) : null}
                        </span>
                        {active ? (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8b8b]">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {hiddenCount > 0 ? (
                    <p className="px-2.5 py-2 text-[11px] text-[#8e8e8e]">
                      +{hiddenCount.toLocaleString()} more. Refine your search to narrow results.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
