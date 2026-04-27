"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyLinkButtonProps {
  value: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}

/**
 * Small primitive used by /settings, the share rail, etc. — copies the given
 * string to the clipboard and shows a 2s "copied" affordance. Falls back
 * silently if the Clipboard API isn't available (e.g. iOS in HTTP context).
 */
export function CopyLinkButton({
  value,
  className,
  label = "Copiar enlace",
  copiedLabel = "Copiado",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No-op: graceful degradation when clipboard is unavailable.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleCopy}
      className={cn("gap-2", className)}
      aria-live="polite"
    >
      {copied ? (
        <Check size={16} weight="bold" aria-hidden="true" />
      ) : (
        <Copy size={16} weight="regular" aria-hidden="true" />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </Button>
  );
}
