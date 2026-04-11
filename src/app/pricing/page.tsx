"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_DEFINITIONS, resolveCheckoutPlanSlug } from "@/lib/plans";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-[#0f0f0f] text-[#f1f1f1]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
        <FloatingTopBar
          eyebrow="Membership"
          title="Choose the plan that matches your channel"
          actions={
            <>
              <SignalPill text="YouTube-native UI" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Back</Link>
              </Button>
            </>
          }
        />
      </header>

      <div className="mx-auto max-w-[1360px] px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="yt-display">Pricing rebuilt around how YouTube creators actually buy.</h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#aaaaaa]">
            Free hooks creators into the map. Creator Pro is the featured upsell. Agency supports portfolios and brand workflows.
          </p>
        </motion.div>

        <section className="grid gap-5 lg:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan, index) => {
            const checkoutSlug = resolveCheckoutPlanSlug(plan.slug);
            return (
              <motion.article
                key={plan.slug}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-3xl border p-6",
                  plan.tone === "free" && "border-white/10 bg-[#181818]",
                  plan.tone === "creator" && "border-[#ff0000]/20 bg-[#231616]",
                  plan.tone === "pro" && "border-[#ff0000]/45 bg-[#2a1212] shadow-[0_20px_60px_rgba(255,0,0,0.12)]",
                  plan.tone === "agency" && "border-white/10 bg-[#111111]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="yt-overline text-[#aaaaaa]">{plan.name}</p>
                    <h2 className="mt-2 text-[28px] leading-[30px] font-bold">{plan.price}</h2>
                  </div>
                  {plan.badge ? <Badge variant="secondary">{plan.badge}</Badge> : null}
                </div>

                <p className="mt-4 min-h-[48px] text-[14px] leading-5 text-[#aaaaaa]">{plan.description}</p>

                <div className="yt-divider my-5" />

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[14px] leading-5 text-[#f1f1f1]">
                      <span className="h-2 w-2 rounded-full bg-[#ff0000]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {plan.slug === "free" ? (
                    <Link href="/onboarding" className="yt-btn-secondary w-full">
                      Start free
                    </Link>
                  ) : checkoutSlug ? (
                    <Link href={`/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutSlug)}`} className={cn("w-full", plan.featured ? "yt-btn-primary" : "yt-btn-secondary")}>
                      Choose {plan.name}
                    </Link>
                  ) : (
                    <Link href="/onboarding" className="yt-btn-secondary w-full">
                      Contact sales
                    </Link>
                  )}
                </div>
              </motion.article>
            );
          })}
        </section>

        <div className="mt-8 rounded-2xl border border-[#3ea6ff]/20 bg-[#141a20] p-5">
          <p className="yt-overline text-[#3ea6ff]">Temporary test flow</p>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#c9dfff]">
            While validating extraction and auth end-to-end, the onboarding keeps a temporary button to process without payment. The production path remains Polar.
          </p>
        </div>
      </div>
    </main>
  );
}
