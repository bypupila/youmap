"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FloatingTopBar, MetricPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";

const filterChips = ["All", "Latin America", "Asia", "City Walks", "Food", "Recent"];

export function ExplorePageClient() {
  const videos = DEMO_VIDEO_LOCATIONS.slice(0, 9);

  return (
    <main className="min-h-[100dvh] bg-[#0f0f0f] text-[#f1f1f1]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
        <FloatingTopBar
          eyebrow="Content Explorer"
          title="TravelMap Discover"
          actions={
            <>
              <MetricPill text={`${videos.length} videos`} />
              <Button asChild variant="ghost" size="sm">
                <Link href="/onboarding">Try free</Link>
              </Button>
            </>
          }
        />
      </header>

      <div className="mx-auto max-w-[1360px] px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="yt-display max-w-3xl">Explore creators by destination, exactly like browsing YouTube.</h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-5 text-[#aaaaaa]">
            Filters, thumbnails and metadata follow YouTube patterns so creators understand the product instantly.
          </p>
        </motion.div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filterChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className="yt-nav-pill"
              data-active={index === 0 ? "true" : "false"}
            >
              {chip}
            </button>
          ))}
        </div>

        <section className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video, index) => (
            <motion.article
              key={`${video.youtube_video_id}-${index}`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="yt-video-card"
            >
              <Link href={`/map?country=${video.country_code}`} className="group">
                <div className="yt-video-thumb aspect-video">
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#212121] text-[#717171]">No thumbnail</div>
                  )}
                </div>
              </Link>
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#272727] text-[12px] font-medium">
                  {countryCodeToFlag(video.country_code)}
                </div>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-[16px] leading-[22px] font-medium text-[#f1f1f1]">{video.title}</h2>
                  <p className="mt-1 text-[12px] leading-4 text-[#aaaaaa]">{video.country_name || video.country_code}</p>
                  <p className="text-[12px] leading-4 text-[#aaaaaa]">
                    {formatViews(video.view_count || 0)} views • {formatDate(video.published_at)}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );
}

function countryCodeToFlag(countryCode?: string | null) {
  const code = String(countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌍";
  const base = 0x1f1e6;
  return String.fromCodePoint(base + code.charCodeAt(0) - 65, base + code.charCodeAt(1) - 65);
}

function formatViews(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
