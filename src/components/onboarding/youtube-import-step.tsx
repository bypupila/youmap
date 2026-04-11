"use client";

import { type FormEvent, useState } from "react";
import { DEMO_CHANNEL, DEMO_USER, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export interface YoutubeImportResult {
  import_run_id: string;
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  importedVideos: number;
  mappedVideos: number;
  skippedVideos: number;
  channelSource?: {
    youtube_channel_id?: string;
    channel_handle?: string | null;
    uploads_playlist_id?: string;
  };
  submitted?: {
    displayName: string;
    email: string;
    username: string;
    channelUrl: string;
  };
  preview_session_id?: string;
  preview_mode?: boolean;
}

interface YoutubeImportStepProps {
  demo?: boolean;
  onImported: (result: YoutubeImportResult) => void;
}

export function YoutubeImportStep({ demo = false, onImported }: YoutubeImportStepProps) {
  const [channelUrl, setChannelUrl] = useState(demo ? "https://www.youtube.com/@pupilanomad" : "");
  const [displayName, setDisplayName] = useState(demo ? DEMO_USER.displayName : "");
  const [email, setEmail] = useState(demo ? DEMO_USER.email : "");
  const [username, setUsername] = useState(demo ? DEMO_USER.username : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(demo ? "/api/youtube/import?demo=1" : "/api/youtube/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelUrl, displayName, email }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || "No se pudo importar el canal");
      return;
    }

    const payload = (await response.json()) as YoutubeImportResult;
    onImported(
      demo
        ? {
            ...payload,
            channel: DEMO_CHANNEL,
            videoLocations: DEMO_VIDEO_LOCATIONS,
            submitted: {
              displayName,
              email,
              username,
              channelUrl,
            },
          }
        : {
            ...payload,
            submitted: {
              displayName,
              email,
              username,
              channelUrl,
            },
          }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[12px] font-medium text-[#aaaaaa]">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Tu nombre o marca"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 text-sm text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#3ea6ff]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-medium text-[#aaaaaa]">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="tu_usuario_publico"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 text-sm text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#3ea6ff]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-medium text-[#aaaaaa]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 text-sm text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#3ea6ff]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-[12px] font-medium text-[#aaaaaa]">YouTube channel URL</span>
        <input
          value={channelUrl}
          onChange={(event) => setChannelUrl(event.target.value)}
          placeholder="https://www.youtube.com/@tu_canal"
          className="h-10 w-full rounded-xl border border-white/10 bg-[#121212] px-3.5 text-sm text-[#f1f1f1] outline-none placeholder:text-[#717171] focus:border-[#3ea6ff]"
        />
        <p className="mt-2 text-[12px] text-[#aaaaaa]">
          Accepts `@handle` or `/channel/ID`.
        </p>
      </label>

      <button
        type="submit"
        disabled={loading || !channelUrl.trim() || !email.trim() || !username.trim() || !displayName.trim()}
        className="yt-btn-primary"
      >
        {loading ? "Importing channel..." : "Import channel"}
      </button>

      {error ? <p className="text-sm text-[#ff8b8b]">{error}</p> : null}
    </form>
  );
}
