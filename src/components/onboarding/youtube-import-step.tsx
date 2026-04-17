"use client";

import { DEMO_USER } from "@/lib/demo-data";

type Locale = "es" | "en";

export interface ChannelDraft {
  displayName: string;
  email: string;
  username: string;
  channelUrl: string;
}

interface YoutubeImportStepProps {
  demo?: boolean;
  locale: Locale;
  value: ChannelDraft;
  onChange: (next: ChannelDraft) => void;
  channelValidationState?: "idle" | "checking" | "valid" | "invalid";
  channelValidationMessage?: string | null;
  onValidateChannel?: () => void;
}

const copyByLocale: Record<
  Locale,
  {
    displayNameLabel: string;
    displayNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    channelUrlLabel: string;
    channelUrlPlaceholder: string;
    validateChannel: string;
    validatingChannel: string;
    channelValid: string;
    channelInvalid: string;
  }
> = {
  es: {
    displayNameLabel: "Nombre",
    displayNamePlaceholder: "Nombre de la persona",
    emailLabel: "Email",
    emailPlaceholder: "tu@email.com",
    channelUrlLabel: "Canal de YouTube",
    channelUrlPlaceholder: "https://www.youtube.com/@tu_canal",
    validateChannel: "Validar canal",
    validatingChannel: "Validando...",
    channelValid: "Canal válido",
    channelInvalid: "Canal inválido",
  },
  en: {
    displayNameLabel: "Name",
    displayNamePlaceholder: "Person name",
    emailLabel: "Email",
    emailPlaceholder: "you@email.com",
    channelUrlLabel: "YouTube channel",
    channelUrlPlaceholder: "https://www.youtube.com/@your_channel",
    validateChannel: "Validate channel",
    validatingChannel: "Validating...",
    channelValid: "Valid channel",
    channelInvalid: "Invalid channel",
  },
};

export function YoutubeImportStep({
  demo = false,
  locale,
  value,
  onChange,
  channelValidationState = "idle",
  channelValidationMessage = null,
  onValidateChannel,
}: YoutubeImportStepProps) {
  const copy = copyByLocale[locale];
  const draft: ChannelDraft = {
    displayName: value.displayName || (demo ? DEMO_USER.displayName : ""),
    email: value.email || (demo ? DEMO_USER.email : ""),
    username: value.username || (demo ? DEMO_USER.username : ""),
    channelUrl: value.channelUrl || (demo ? "https://www.youtube.com/@pupilanomad" : ""),
  };
  const showValidationBadge = channelValidationState === "valid" || channelValidationState === "invalid";
  const validationBadgeClass =
    channelValidationState === "valid"
      ? "border-[#1f8f4a] bg-[#102317] text-[#72e5a0]"
      : "border-[#b23636] bg-[#271212] text-[#ff8b8b]";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.displayNameLabel}</span>
          <input
            value={draft.displayName}
            onChange={(event) => onChange({ ...draft, displayName: event.target.value })}
            placeholder={copy.displayNamePlaceholder}
            className="h-11 w-full rounded-2xl border border-white/10 bg-[#121212] px-4 text-[14px] text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#ff0000]"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.emailLabel}</span>
          <input
            type="email"
            value={draft.email}
            onChange={(event) => onChange({ ...draft, email: event.target.value })}
            placeholder={copy.emailPlaceholder}
            className="h-11 w-full rounded-2xl border border-white/10 bg-[#121212] px-4 text-[14px] text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#ff0000]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.channelUrlLabel}</span>
        <div className="flex items-center gap-2">
          <input
            value={draft.channelUrl}
            onChange={(event) => onChange({ ...draft, channelUrl: event.target.value })}
            placeholder={copy.channelUrlPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#121212] px-4 text-[14px] text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#ff0000]"
          />
          <button
            type="button"
            onClick={onValidateChannel}
            disabled={channelValidationState === "checking" || !draft.channelUrl.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-[#1c1c1c] px-4 text-[12px] font-medium text-[#f1f1f1] transition-colors hover:bg-[#252525] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {channelValidationState === "checking" ? copy.validatingChannel : copy.validateChannel}
          </button>
          {showValidationBadge ? (
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[20px] ${validationBadgeClass}`}
              title={channelValidationState === "valid" ? copy.channelValid : copy.channelInvalid}
              aria-label={channelValidationState === "valid" ? copy.channelValid : copy.channelInvalid}
            >
              {channelValidationState === "valid" ? "✓" : "✕"}
            </span>
          ) : null}
        </div>
      </label>

      {channelValidationMessage ? (
        <p className={`text-[12px] ${channelValidationState === "valid" ? "text-[#8dd7a6]" : channelValidationState === "checking" ? "text-[#9fc4ff]" : "text-[#ff8b8b]"}`}>
          {channelValidationMessage}
        </p>
      ) : null}
    </div>
  );
}
