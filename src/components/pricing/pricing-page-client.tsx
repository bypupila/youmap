"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge } from "@/components/ui/badge";
import { PLAN_DEFINITIONS, type PlanDefinition } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface PricingPageClientProps {
  lang: "es" | "en";
}

type LocalizedPlanCopy = {
  name: string;
  price: string;
  cadence: string | null;
  description: string;
  features: string[];
  badge?: string;
  cta: string;
};

const localizedPlanCopy: Record<"es" | "en", Record<PlanDefinition["slug"], LocalizedPlanCopy>> = {
  es: {
    free: {
      name: "Free",
      price: "$0",
      cadence: null,
      description: "Para validar el canal y publicar un primer mapa.",
      features: ["1 canal", "Hasta 50 videos", "Mapa público", "Importación básica"],
      cta: "Empezar gratis",
    },
    creator: {
      name: "Creator",
      price: "$29",
      cadence: "/mes",
      description: "El plan core para creadores individuales.",
      features: ["Videos ilimitados", "1 sponsor activo", "Analítica básica", "Marca limpia en el mapa"],
      cta: "Probar Creator",
    },
    creator_pro: {
      name: "Creator Pro",
      price: "$79",
      cadence: "/mes",
      description: "Sponsor hub y analítica más vendible.",
      features: ["Videos ilimitados", "Competitor analytics", "Sponsor hub", "Sincronización prioritaria"],
      badge: "Más vendido",
      cta: "Probar Pro",
    },
    agency: {
      name: "Agency",
      price: "Custom",
      cadence: null,
      description: "Para agencias y marcas que operan portafolios.",
      features: ["Portafolio de canales", "API", "Portal de marcas", "Soporte dedicado"],
      cta: "Hablar con ventas",
    },
  },
  en: {
    free: {
      name: "Free",
      price: "$0",
      cadence: null,
      description: "Validate your channel and publish a first map.",
      features: ["1 channel", "Up to 50 videos", "Public map", "Basic import"],
      cta: "Get started",
    },
    creator: {
      name: "Creator",
      price: "$29",
      cadence: "/mo",
      description: "Core plan for individual creators.",
      features: ["Unlimited videos", "1 active sponsor", "Basic analytics", "Clean branding on the map"],
      cta: "Try Creator",
    },
    creator_pro: {
      name: "Creator Pro",
      price: "$79",
      cadence: "/mo",
      description: "Sponsor hub and most sellable analytics.",
      features: ["Unlimited videos", "Competitor analytics", "Sponsor hub", "Priority sync"],
      badge: "Most popular",
      cta: "Try Pro",
    },
    agency: {
      name: "Agency",
      price: "Custom",
      cadence: null,
      description: "For agencies and brands managing portfolios.",
      features: ["Channel portfolio", "API", "Brand portal", "Dedicated support"],
      cta: "Talk to sales",
    },
  },
};

const uiCopy = {
  es: {
    eyebrow: "Precios",
    headline: "Precios simples, sin sorpresas.",
    body: "Todos los planes pagos arrancan con prueba gratuita de 7 días. Cancelas cuando quieras.",
    trialNote: "Trial de 7 días incluido en todos los planes pagos.",
    backToHome: "Inicio",
    explore: "Explorar",
    contactEmail: "ventas@youmap.app",
  },
  en: {
    eyebrow: "Pricing",
    headline: "Simple pricing, no surprises.",
    body: "All paid plans start with a 7-day free trial. Cancel anytime.",
    trialNote: "7-day trial included on every paid plan.",
    backToHome: "Home",
    explore: "Explore",
    contactEmail: "sales@youmap.app",
  },
} as const;

// Hide Agency from the public pricing grid for now — it's surfaced as a
// "talk to sales" card below the main grid instead.
const VISIBLE_PLAN_SLUGS: PlanDefinition["slug"][] = ["free", "creator", "creator_pro"];

export function PricingPageClient({ lang }: PricingPageClientProps) {
  const copy = uiCopy[lang];
  const plans = PLAN_DEFINITIONS.filter((plan) => VISIBLE_PLAN_SLUGS.includes(plan.slug));
  const agencyPlan = PLAN_DEFINITIONS.find((plan) => plan.slug === "agency");

  function buildHref(slug: PlanDefinition["slug"]) {
    if (slug === "free") return `/onboarding?lang=${lang}`;
    return `/onboarding?lang=${lang}&plan=${slug}`;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,0,0.16),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(255,0,0,0.10),transparent_28%),linear-gradient(180deg,rgba(17,20,22,0.92),rgba(17,20,22,0.78))]"
        aria-hidden="true"
      />

      <header className="relative z-30 px-4 py-3">
        <FloatingTopBar
          eyebrow={copy.eyebrow}
          title={copy.headline}
          actions={
            <>
              <Link href="/" className="yt-btn-secondary" aria-label={copy.backToHome}>
                {copy.backToHome}
              </Link>
              <Link href="/explore" className="yt-btn-secondary hidden sm:inline-flex">
                {copy.explore}
              </Link>
            </>
          }
        />
      </header>

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-12 pt-8 md:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="yt-overline">{copy.eyebrow}</p>
          <h1 className="yt-display mx-auto mt-3 max-w-[16ch] text-balance">{copy.headline}</h1>
          <p className="mx-auto mt-4 max-w-[58ch] text-base leading-7 text-muted-foreground text-pretty">
            {copy.body}
          </p>
        </motion.div>

        <div
          className="mx-auto mt-10 grid w-full max-w-[1180px] gap-5 md:mt-12 md:grid-cols-3"
          role="list"
        >
          {plans.map((plan, index) => {
            const localized = localizedPlanCopy[lang][plan.slug];
            const featured = Boolean(plan.featured);
            return (
              <motion.article
                key={plan.slug}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + index * 0.05 }}
                className={cn(
                  "tm-surface flex flex-col rounded-[2rem] p-6 sm:p-7",
                  featured && "tm-glow",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="yt-overline">{localized.name}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">
                        {localized.price}
                      </span>
                      {localized.cadence ? (
                        <span className="text-sm text-muted-foreground">{localized.cadence}</span>
                      ) : null}
                    </div>
                  </div>
                  {localized.badge ? (
                    <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
                      {localized.badge}
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground text-pretty">
                  {localized.description}
                </p>

                <ul className="mt-5 grid gap-2.5 text-sm">
                  {localized.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="leading-5 text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex">
                  <Link
                    href={buildHref(plan.slug)}
                    className={cn("w-full text-center", featured ? "yt-btn-primary" : "yt-btn-secondary")}
                  >
                    {localized.cta}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-[58ch] text-center text-xs leading-5 text-muted-foreground">
          {copy.trialNote}
        </p>

        {agencyPlan ? (
          <section
            className="tm-surface-strong mx-auto mt-12 grid w-full max-w-[1180px] gap-6 rounded-[2rem] p-6 sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center"
            aria-labelledby="agency-heading"
          >
            <div>
              <p className="yt-overline">{localizedPlanCopy[lang][agencyPlan.slug].name}</p>
              <h2
                id="agency-heading"
                className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                {localizedPlanCopy[lang][agencyPlan.slug].description}
              </h2>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {localizedPlanCopy[lang][agencyPlan.slug].features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={14} weight="bold" className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <a href={`mailto:${copy.contactEmail}`} className="yt-btn-primary">
                {localizedPlanCopy[lang][agencyPlan.slug].cta}
              </a>
              <a
                href={`mailto:${copy.contactEmail}`}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {copy.contactEmail}
              </a>
            </div>
          </section>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}
