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
}

const copyByLocale: Record<
  Locale,
  {
    usernameLabel: string;
    usernamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    channelUrlLabel: string;
    channelUrlPlaceholder: string;
  }
> = {
  es: {
    usernameLabel: "Usuario",
    usernamePlaceholder: "tu_usuario_publico",
    emailLabel: "Email",
    emailPlaceholder: "tu@email.com",
    channelUrlLabel: "Canal de YouTube",
    channelUrlPlaceholder: "https://www.youtube.com/@tu_canal",
  },
  en: {
    usernameLabel: "Username",
    usernamePlaceholder: "your_public_username",
    emailLabel: "Email",
    emailPlaceholder: "you@email.com",
    channelUrlLabel: "YouTube channel",
    channelUrlPlaceholder: "https://www.youtube.com/@your_channel",
  },
};

export function YoutubeImportStep({ demo = false, locale, value, onChange }: YoutubeImportStepProps) {
  const copy = copyByLocale[locale];
  const draft: ChannelDraft = {
    displayName: value.displayName || (demo ? DEMO_USER.displayName : ""),
    email: value.email || (demo ? DEMO_USER.email : ""),
    username: value.username || (demo ? DEMO_USER.username : ""),
    channelUrl: value.channelUrl || (demo ? "https://www.youtube.com/@pupilanomad" : ""),
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f8f8f]">{copy.usernameLabel}</span>
          <input
            value={draft.username}
            onChange={(event) => onChange({ ...draft, username: event.target.value })}
            placeholder={copy.usernamePlaceholder}
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
        <input
          value={draft.channelUrl}
          onChange={(event) => onChange({ ...draft, channelUrl: event.target.value })}
          placeholder={copy.channelUrlPlaceholder}
          className="h-11 w-full rounded-2xl border border-white/10 bg-[#121212] px-4 text-[14px] text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#ff0000]"
        />
      </label>
    </div>
  );
}
