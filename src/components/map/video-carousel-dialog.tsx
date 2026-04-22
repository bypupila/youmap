"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight, X, ArrowSquareOut } from "@phosphor-icons/react";
import posthog from "posthog-js";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TravelVideoLocation } from "@/lib/types";
import { toCompactYouTubeThumbnail } from "@/lib/youtube-thumbnails";
import { cn } from "@/lib/utils";

const SEEN_STORAGE_KEY = "travelmap_seen_videos_v1";

interface VideoCarouselDialogProps {
  open: boolean;
  videos: TravelVideoLocation[];
  currentVideo: TravelVideoLocation | null;
  onClose: () => void;
  onChangeVideo: (video: TravelVideoLocation) => void;
}

type CountryBucket = {
  country_code: string;
  country_name: string;
  videos: TravelVideoLocation[];
};

export function VideoCarouselDialog({ open, videos, currentVideo, onClose, onChangeVideo }: VideoCarouselDialogProps) {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const flagsRowRef = useRef<HTMLDivElement | null>(null);

  const buckets = useMemo(() => {
    const map = new Map<string, CountryBucket>();
    for (const video of videos) {
      const code = String(video.country_code || "").toUpperCase();
      if (!code) continue;
      const existing = map.get(code) || {
        country_code: code,
        country_name: video.country_name || code,
        videos: [],
      };
      existing.videos.push(video);
      map.set(code, existing);
    }

    return Array.from(map.values())
      .map((bucket) => ({
        ...bucket,
        videos: bucket.videos.slice().sort((a, b) => {
          const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
          const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
          return bTime - aTime;
        }),
      }))
      .sort((a, b) => b.videos.length - a.videos.length || a.country_name.localeCompare(b.country_name));
  }, [videos]);

  const currentCountryCode = String(currentVideo?.country_code || "").toUpperCase();
  const currentBucket = buckets.find((bucket) => bucket.country_code === currentCountryCode) || buckets[0] || null;
  const currentCountryVideos = currentBucket?.videos || [];
  const currentIndex = Math.max(
    0,
    currentCountryVideos.findIndex((video) => video.youtube_video_id === currentVideo?.youtube_video_id)
  );
  const currentSeen = Boolean(currentVideo && seenIds.has(currentVideo.youtube_video_id));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      setSeenIds(new Set(parsed.filter(Boolean)));
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!currentVideo) return;
    setSeenIds((current) => {
      if (current.has(currentVideo.youtube_video_id)) return current;
      const next = new Set(current);
      next.add(currentVideo.youtube_video_id);
      try {
        window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // no-op
      }
      return next;
    });
  }, [currentVideo]);

  function setVideoFromCountry(countryCode: string) {
    const bucket = buckets.find((entry) => entry.country_code === countryCode);
    if (!bucket?.videos[0]) return;
    onChangeVideo(bucket.videos[0]);
  }

  function go(direction: -1 | 1) {
    if (currentCountryVideos.length === 0) return;
    const nextIndex = (currentIndex + direction + currentCountryVideos.length) % currentCountryVideos.length;
    const nextVideo = currentCountryVideos[nextIndex];
    if (nextVideo) onChangeVideo(nextVideo);
  }

  function scrollFlags(direction: -1 | 1) {
    const node = flagsRowRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(1100px,calc(100%-1rem))] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,11,14,0.96),rgba(5,7,10,0.94))] p-0 text-white shadow-[0_34px_110px_-44px_rgba(0,0,0,0.96)]"
      >
        <div className="relative">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8e8e]">Video carousel</p>
              <p className="mt-1 truncate text-[15px] font-medium text-[#f1f1f1]">
                {currentVideo?.title || "Video"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-sm" onClick={onClose} className="border-white/10 bg-white/[0.03]">
                <X size={16} />
              </Button>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => scrollFlags(-1)} className="border-white/10 bg-white/[0.03]">
                <CaretLeft size={16} />
              </Button>
              <div
                ref={flagsRowRef}
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {buckets.map((bucket) => {
                  const active = bucket.country_code === currentCountryCode;
                  return (
                    <button
                      key={bucket.country_code}
                      type="button"
                      onClick={() => setVideoFromCountry(bucket.country_code)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]"
                          : "border-white/10 bg-white/[0.03] text-[#aaaaaa] hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="text-base">{countryCodeToFlag(bucket.country_code)}</span>
                      <span className="text-[12px] font-medium">{bucket.country_name}</span>
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{bucket.videos.length}</span>
                    </button>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => scrollFlags(1)} className="border-white/10 bg-white/[0.03]">
                <CaretRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid min-h-[min(74dvh,720px)] gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="absolute left-4 top-4 z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[12px] text-white backdrop-blur-md">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">{countryCodeToFlag(currentCountryCode)}</span>
                  <span className="font-medium">{currentVideo?.country_name || currentCountryCode || "Country"}</span>
                  <span className="text-white/45">•</span>
                  <span>{currentCountryVideos.length} videos</span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
                <div className="relative w-full max-w-[700px]">
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)]">
                    <div className="aspect-video">
                      {currentVideo?.thumbnail_url ? (
                        <Image
                          src={toCompactYouTubeThumbnail(currentVideo.thumbnail_url) || currentVideo.thumbnail_url}
                          alt={currentVideo.title}
                          width={1280}
                          height={720}
                          className="h-full w-full object-cover"
                          priority
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-[#717171]">No thumbnail</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-white backdrop-blur-md transition hover:bg-black/70"
                      aria-label="Previous video"
                    >
                      <CaretLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-white backdrop-blur-md transition hover:bg-black/70"
                      aria-label="Next video"
                    >
                      <CaretRight size={18} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[12px] text-[#aaaaaa]">
                      <span>{currentIndex + 1} / {Math.max(1, currentCountryVideos.length)}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">{currentSeen ? "Visto" : "Nuevo"}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {currentCountryVideos.slice(0, 8).map((video) => (
                        <span
                          key={video.youtube_video_id}
                          className={cn(
                            "h-2.5 w-2.5 rounded-full border",
                            video.youtube_video_id === currentVideo?.youtube_video_id
                              ? "border-[rgba(255,0,0,0.4)] bg-[rgba(255,0,0,0.88)]"
                              : seenIds.has(video.youtube_video_id)
                                ? "border-white/20 bg-white/50"
                                : "border-white/15 bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[#8e8e8e]">Details</p>
                <h3 className="mt-2 text-center text-[24px] leading-8 font-semibold tracking-tight text-[#f1f1f1] sm:text-[28px]">
                  {currentVideo?.title || "Untitled video"}
                </h3>
                <p className="mt-3 text-center text-[15px] leading-6 text-[#d0d0d0]">
                  {currentVideo ? `${formatNumber(Number(currentVideo.view_count || 0))} views • ${formatNumber(Number(currentVideo.like_count || 0))} likes • ${formatNumber(Number(currentVideo.comment_count || 0))} comments` : ""}
                </p>
                <p className="mt-2 text-center text-[14px] leading-5 text-[#aaaaaa]">
                  {currentVideo ? `${countryCodeToFlag(currentVideo.country_code)} ${currentVideo.country_name || currentVideo.country_code} · ${formatDate(currentVideo.published_at)}` : ""}
                </p>
              </div>

              <div className="min-h-0 flex-1 px-5 py-4 sm:px-6">
                <ScrollArea className="h-full pr-2" data-map-scroll="true">
                  <div className="space-y-3">
                    {currentCountryVideos.map((video) => {
                      const active = video.youtube_video_id === currentVideo?.youtube_video_id;
                      const seen = seenIds.has(video.youtube_video_id);
                      return (
                        <button
                          key={video.youtube_video_id}
                          type="button"
                          onClick={() => onChangeVideo(video)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                            active
                              ? "border-[rgba(255,0,0,0.28)] bg-[rgba(255,0,0,0.12)] text-[#f1f1f1]"
                              : "border-white/10 bg-white/[0.03] text-[#aaaaaa] hover:bg-white/[0.06]"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium">{video.title}</span>
                            <span className="mt-1 block text-[12px]">{formatDate(video.published_at)}</span>
                          </span>
                          <span className={cn("rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em]", seen ? "bg-white/10 text-[#f1f1f1]" : "bg-[rgba(255,0,0,0.14)] text-[#ffb4b4]")}>
                            {seen ? "Visto" : "Nuevo"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-white/10 bg-white/[0.03] px-4 text-[12px]"
                    onClick={() => {
                      posthog.capture("video_youtube_opened", {
                        video_id: currentVideo?.youtube_video_id,
                        video_title: currentVideo?.title,
                        country_code: currentVideo?.country_code,
                        country_name: currentVideo?.country_name,
                      });
                      window.open(currentVideo?.video_url || `https://youtube.com/watch?v=${currentVideo?.youtube_video_id}`, "_blank", "noreferrer");
                    }}
                  >
                    <ArrowSquareOut size={14} />
                    Ver video
                  </Button>

                  <Button type="button" variant="outline" className="h-11 rounded-full border-white/10 bg-white/[0.03] px-4 text-[12px]" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "TM";
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "TM";
  return String.fromCodePoint(0x1f1e6 + first, 0x1f1e6 + second);
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
