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
}

interface LocationSelectProps {
  value: string;
  options: LocationSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function LocationSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = "Search",
  onValueChange,
  className,
  triggerClassName,
  disabled = false,
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

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      return [option.label, option.description || "", option.value]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-2xl border-white/10 bg-white/[0.03] px-4 text-left text-sm text-[#f1f1f1] hover:bg-white/[0.06]",
            className,
            triggerClassName
          )}
        >
          <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
          <CaretDown size={14} className="shrink-0 text-[#aaaaaa]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className="w-[min(100vw-2rem,360px)] border border-white/10 bg-[#121518] p-3 text-[#f1f1f1] shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92)]">
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
                filteredOptions.map((option) => {
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
                        "flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]"
                          : "border-white/10 bg-white/[0.03] text-[#aaaaaa] hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-inherit">{option.label}</span>
                        {option.description ? <span className="mt-0.5 block text-[11px] text-[#aaaaaa]">{option.description}</span> : null}
                      </span>
                      {active ? <span className="text-[11px] uppercase tracking-[0.14em] text-[#ff8b8b]">Selected</span> : null}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
