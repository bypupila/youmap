"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { YoutubeImportStep, type YoutubeImportResult } from "@/components/onboarding/youtube-import-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_ANALYTICS, DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { buildAnalyticsFromVideoLocations } from "@/lib/analytics";
import { PLAN_DEFINITIONS, resolveCheckoutPlanSlug } from "@/lib/plans";
import { cn } from "@/lib/utils";

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const stepLabels: Array<{ step: OnboardingStep; label: string }> = [
  { step: 0, label: "Overview" },
  { step: 1, label: "Channel" },
  { step: 2, label: "Import" },
  { step: 3, label: "Analytics" },
  { step: 4, label: "Sponsors" },
  { step: 5, label: "Fan vote" },
  { step: 6, label: "Pricing" },
];

const stepMeta: Record<OnboardingStep, { eyebrow: string; title: string; description: string }> = {
  0: {
    eyebrow: "Channel workflow",
    title: "Launch a travel map that feels native to YouTube.",
    description: "Each step mirrors the hierarchy creators already know: setup, videos, analytics, sponsors and monetization.",
  },
  1: {
    eyebrow: "Manage your channel",
    title: "Connect the channel identity you want to publish.",
    description: "Name, email, public username and channel URL are enough to create the creator workspace and map URL.",
  },
  2: {
    eyebrow: "Content import",
    title: "Import the long-form catalog and map each travel video.",
    description: "Shorts are filtered out. The progress panel follows the feel of YouTube Studio content processing.",
  },
  3: {
    eyebrow: "YouTube Analytics",
    title: "Read country performance before planning the next trip.",
    description: "See where the channel performs best and which countries concentrate the mapped library.",
  },
  4: {
    eyebrow: "Brand deals",
    title: "Turn destinations into sponsor inventory.",
    description: "Brands can attach offers to countries and the creator sees commercial coverage directly on the map.",
  },
  5: {
    eyebrow: "Audience signals",
    title: "Let the audience vote the next country.",
    description: "This step gets the strongest visual weight because it is the most differentiated part of the product.",
  },
  6: {
    eyebrow: "Membership",
    title: "Choose the plan, create the account and start processing.",
    description: "Creator Pro is the main upsell. Free works as the conversion hook. Test mode remains available while validating the flow.",
  },
};

export function OnboardingFlow({ isDemoMode }: { isDemoMode: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(isDemoMode ? "creator_pro" : null);
  const [importResult, setImportResult] = useState<YoutubeImportResult | null>(
    isDemoMode
      ? {
          import_run_id: "demo-import-run",
          channel: DEMO_CHANNEL,
          videoLocations: DEMO_VIDEO_LOCATIONS,
          importedVideos: DEMO_VIDEO_LOCATIONS.length,
          mappedVideos: DEMO_VIDEO_LOCATIONS.length,
          skippedVideos: 0,
        }
      : null
  );

  const previewChannel = importResult?.channel || DEMO_CHANNEL;
  const previewLocations = importResult?.videoLocations || DEMO_VIDEO_LOCATIONS;
  const analytics = importResult
    ? buildAnalyticsFromVideoLocations(importResult.videoLocations, { importedVideos: importResult.importedVideos })
    : DEMO_ANALYTICS;

  function handleImported(result: YoutubeImportResult) {
    setImportResult(result);
    setStep(2);
  }

  function handleNext() {
    if (step < 6) {
      setStep((current) => (current + 1) as OnboardingStep);
      return;
    }

    if (isDemoMode) {
      router.push(`/dashboard?channelId=${DEMO_CHANNEL_SLUG}&demo=1`);
    }
  }

  function handleBack() {
    setStep((current) => (current > 0 ? ((current - 1) as OnboardingStep) : 0));
  }

  const currentMeta = stepMeta[step];

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#0f0f0f] text-[#f1f1f1]">
      <div className="absolute inset-0">
        <MapExperience
          channel={previewChannel}
          videoLocations={previewLocations}
          allowRefresh={false}
          showLegend={false}
          showOperationsPanel={false}
          showActiveVideoCard={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,15,0.96),rgba(15,15,15,0.74)_22%,rgba(15,15,15,0.4)_42%,rgba(15,15,15,0.92))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 py-3">
        <FloatingTopBar
          eyebrow="TravelMap setup"
          title="YouTube-native onboarding"
          actions={
            <>
              <SignalPill text="Creator workflow" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth">Sign in</Link>
              </Button>
            </>
          }
        />
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-[84px] z-30 px-4">
        <div className="mx-auto flex max-w-[1120px] gap-2 overflow-x-auto rounded-full border border-white/10 bg-[#181818]/95 p-1.5 backdrop-blur pointer-events-auto">
          {stepLabels.map((item) => (
            <button
              key={item.step}
              type="button"
              className="yt-nav-pill"
              data-active={step === item.step ? "true" : "false"}
              onClick={() => setStep(item.step)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pb-20 pt-32">
        <div className="w-full max-w-[1120px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-auto rounded-[24px] border border-white/10 bg-[#181818]/96 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur"
            >
              <div className="border-b border-white/10 px-6 py-5 sm:px-8">
                <p className="yt-overline text-[#aaaaaa]">{currentMeta.eyebrow}</p>
                <h1 className="mt-2 text-[32px] leading-[36px] font-bold tracking-tight text-[#f1f1f1] sm:text-[40px] sm:leading-[44px]">
                  {currentMeta.title}
                </h1>
                <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#aaaaaa]">{currentMeta.description}</p>
              </div>
              <div className="px-6 py-6 sm:px-8 sm:py-8">{renderStepBody(step, { isDemoMode, importResult, analytics, selectedPlan, setSelectedPlan, handleImported })}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 px-4">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between rounded-full border border-white/10 bg-[#181818]/96 px-4 py-3 pointer-events-auto backdrop-blur">
          <Button type="button" variant="secondary" onClick={handleBack} disabled={step === 0}>
            Back
          </Button>
          <p className="hidden text-[12px] text-[#aaaaaa] sm:block">
            Step {step + 1} of {stepLabels.length}
          </p>
          <Button type="button" onClick={handleNext}>
            {step === 6 ? (isDemoMode ? "Open dashboard" : "Review account") : "Continue"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function renderStepBody(
  step: OnboardingStep,
  ctx: {
    isDemoMode: boolean;
    importResult: YoutubeImportResult | null;
    analytics: typeof DEMO_ANALYTICS;
    selectedPlan: string | null;
    setSelectedPlan: (value: string) => void;
    handleImported: (result: YoutubeImportResult) => void;
  }
) {
  if (step === 0) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Import videos", "Read the channel catalog and keep only long-form travel content."],
          ["Map countries", "Attach every valid video to a real country and make the globe explorable."],
          ["Monetize destinations", "Unlock sponsor zones and audience voting as part of the creator workflow."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-[#212121] p-5">
            <p className="text-[16px] leading-[22px] font-medium">{title}</p>
            <p className="mt-2 text-[14px] leading-6 text-[#aaaaaa]">{copy}</p>
          </div>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <YoutubeImportStep demo={ctx.isDemoMode} onImported={ctx.handleImported} />
        <div className="flex flex-wrap gap-2">
          <span className="yt-chip">Public username</span>
          <span className="yt-chip">Email captured first</span>
          <span className="yt-chip">Channel URL or handle</span>
          <span className="yt-chip">Map URL reserved</span>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const imported = ctx.importResult?.importedVideos || DEMO_VIDEO_LOCATIONS.length;
    const mapped = ctx.importResult?.mappedVideos || DEMO_VIDEO_LOCATIONS.length;
    const skipped = ctx.importResult?.skippedVideos || 0;

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#212121] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="yt-overline text-[#aaaaaa]">Import status</p>
              <p className="mt-2 text-[20px] leading-7 font-medium">Your videos are being mapped.</p>
            </div>
            <Badge variant="secondary">{mapped} mapped</Badge>
          </div>
          <div className="yt-progress mt-5">
            <span style={{ width: `${Math.max(8, Math.min(100, (mapped / Math.max(imported, 1)) * 100))}%` }} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StudioMetric label="Imported" value={imported} />
            <StudioMetric label="Mapped" value={mapped} />
            <StudioMetric label="Manual review" value={skipped} />
          </div>
        </div>

        <div className="grid gap-3">
          {previewRows(ctx.importResult?.videoLocations || DEMO_VIDEO_LOCATIONS).map((video) => (
            <div key={video.youtube_video_id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#212121] p-3">
              <div className="h-16 w-28 rounded-xl bg-[#121212]" />
              <div className="min-w-0">
                <p className="line-clamp-1 text-[14px] font-medium">{video.title}</p>
                <p className="mt-1 text-[12px] text-[#aaaaaa]">{video.country_name || video.country_code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-[#212121] p-5">
          <p className="yt-overline text-[#aaaaaa]">Country performance</p>
          <div className="mt-5 space-y-4">
            {ctx.analytics.top_countries.slice(0, 5).map((country, index) => (
              <div key={country.country_name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px]">{country.country_name}</span>
                  <span className="text-[12px] text-[#aaaaaa]">{country.video_count} videos</span>
                </div>
                <div className="yt-progress">
                  <span style={{ width: `${Math.max(18, 100 - index * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <StudioMetric label="Countries" value={ctx.analytics.total_countries} />
          <StudioMetric label="Mapped videos" value={ctx.analytics.total_mapped_videos} />
          <StudioMetric label="Views" value={ctx.analytics.total_views} />
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Booking.com",
          "GetYourGuide",
          "Airbnb",
          "IATI Seguros",
        ].map((brand) => (
          <div key={brand} className="rounded-2xl border border-white/10 bg-[#212121] p-5">
            <div className="mb-4 aspect-video rounded-xl bg-[#2a2a2a]" />
            <p className="text-[16px] font-medium">{brand}</p>
            <p className="mt-2 text-[13px] text-[#aaaaaa]">Enable destination-based placements and sponsored country cards.</p>
            <button type="button" className="yt-btn-secondary mt-5">
              Connect
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#ff0000]/25 bg-[#241616] p-6">
          <p className="yt-overline text-[#ff8080]">Fan vote</p>
          <h3 className="mt-2 text-[28px] leading-[32px] font-bold">Your audience can decide the next country.</h3>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#d3bcbc]">
            This is the signature feature. The map becomes participatory and turns demand into content planning.
          </p>
        </div>
        <div className="space-y-3">
          {[
            ["Japan", 42],
            ["Mexico", 31],
            ["Italy", 27],
          ].map(([country, score]) => (
            <div key={country} className="rounded-2xl border border-white/10 bg-[#212121] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-medium">{country}</span>
                <span className="text-[12px] text-[#aaaaaa]">{score}%</span>
              </div>
              <div className="yt-progress">
                <span style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        {PLAN_DEFINITIONS.map((plan) => {
          const active = ctx.selectedPlan === plan.slug;
          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => ctx.setSelectedPlan(plan.slug)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-colors",
                active ? "border-[#ff0000] bg-[#2a1212]" : "border-white/10 bg-[#212121] hover:bg-[#272727]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="yt-overline text-[#aaaaaa]">{plan.name}</p>
                  <p className="mt-2 text-[24px] leading-[26px] font-bold">{plan.price}</p>
                </div>
                {plan.badge ? <Badge variant="secondary">{plan.badge}</Badge> : null}
              </div>
              <p className="mt-3 text-[13px] leading-5 text-[#aaaaaa]">{plan.description}</p>
            </button>
          );
        })}
      </div>
      {!ctx.isDemoMode ? <PlansActivationPanel selectedPlan={ctx.selectedPlan} importResult={ctx.importResult} /> : null}
    </div>
  );
}

function PlansActivationPanel({
  selectedPlan,
  importResult,
}: {
  selectedPlan: string | null;
  importResult: YoutubeImportResult | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(importResult?.submitted?.displayName || "");
  const [email, setEmail] = useState(importResult?.submitted?.email || "");
  const [username, setUsername] = useState(importResult?.submitted?.username || "");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState<"idle" | "paid" | "test">("idle");
  const [activationError, setActivationError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(importResult?.submitted?.displayName || "");
    setEmail(importResult?.submitted?.email || "");
    setUsername(importResult?.submitted?.username || "");
  }, [importResult]);

  async function activate(withoutPayment: boolean) {
    if (!selectedPlan) {
      setActivationError("Choose a plan first.");
      return;
    }

    setProcessing(withoutPayment ? "test" : "paid");
    setActivationError(null);
    setSuccessHint(null);

    try {
      const shouldSkipPayment = withoutPayment || selectedPlan === "free";
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          username,
          password,
          selectedPlan,
          channelUrl: importResult?.submitted?.channelUrl || null,
          youtubeChannelId: importResult?.channelSource?.youtube_channel_id || null,
          activateWithoutPayment: shouldSkipPayment,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            email?: string;
            channel_id?: string | null;
            public_map_path?: string | null;
            import_error?: string | null;
          }
        | null;

      if (!response.ok) throw new Error(payload?.error || "Could not create the account.");

      if (shouldSkipPayment) {
        setSuccessHint(payload?.public_map_path ? `Public URL reserved: ${payload.public_map_path}` : "Account activated.");
        if (payload?.channel_id) {
          router.push(`/dashboard?channelId=${payload.channel_id}`);
        } else {
          router.push("/dashboard");
        }
        router.refresh();
        return;
      }

      const checkoutSlug = resolveCheckoutPlanSlug(selectedPlan);
      if (!checkoutSlug) {
        throw new Error("This plan does not have a checkout mapping yet.");
      }
      window.location.assign(`/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutSlug)}`);
    } catch (error) {
      setActivationError(error instanceof Error ? error.message : "Could not activate account.");
    } finally {
      setProcessing("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#212121] p-5">
      <p className="yt-overline text-[#aaaaaa]">Account setup</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
        <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => activate(false)}
          disabled={processing !== "idle" || !selectedPlan || password.trim().length < 8 || !email.trim() || !username.trim()}
          className="yt-btn-primary"
        >
          {processing === "paid" ? "Preparing checkout..." : selectedPlan === "free" ? "Create free account" : "Pay with Polar"}
        </button>
        <button
          type="button"
          onClick={() => activate(true)}
          disabled={processing !== "idle" || password.trim().length < 8 || !email.trim() || !username.trim()}
          className="yt-btn-secondary"
        >
          {processing === "test" ? "Processing..." : "Process without payment (TEST)"}
        </button>
        <Link href="/auth" className="yt-btn-secondary">
          Sign in instead
        </Link>
      </div>
      {successHint ? <p className="mt-3 text-[12px] text-[#9cd5ff]">{successHint}</p> : null}
      {activationError ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{activationError}</p> : null}
    </div>
  );
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#181818] p-4">
      <p className="text-[20px] leading-6 font-medium text-[#f1f1f1]">{formatNumber(value)}</p>
      <p className="mt-1 text-[12px] text-[#aaaaaa]">{label}</p>
    </div>
  );
}

function previewRows(rows: typeof DEMO_VIDEO_LOCATIONS) {
  return rows.slice(0, 3);
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
