"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, MapPinned, PlaneTakeoff } from "lucide-react";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { YoutubeImportStep, type ChannelDraft } from "@/components/onboarding/youtube-import-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_ANALYTICS, DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_USER, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { PLAN_DEFINITIONS, resolveCheckoutPlanSlug, type PlanDefinition } from "@/lib/plans";
import { cn } from "@/lib/utils";

import type { ChannelAnalytics } from "@/lib/analytics";

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type OnboardingLocale = "es" | "en";
type ActivationState = "idle" | "registering" | "checkout";
type StepState = "upcoming" | "active" | "done";

type LocalizedPlanDetails = {
  name: string;
  price: string;
  description: string;
  features: string[];
  badge?: string;
  trialCopy: string;
};

type OnboardingCopy = {
  topbarEyebrow: string;
  topbarTitle: string;
  searchPlaceholder: string;
  workflowPill: string;
  demoMapLabel: string;
  stepLabels: Array<{ step: OnboardingStep; label: string }>;
  stepMeta: Record<OnboardingStep, { eyebrow: string; title: string; description: string }>;
  footerBack: string;
  footerStep: string;
  footerOf: string;
  footerContinue: string;
  footerReviewAccount: string;
  footerOpenDashboard: string;
  overviewFeatures: Array<{ title: string; copy: string }>;
  importStatusEyebrow: string;
  importStatusTitle: string;
  importStatusBody: string;
  importMetricCountries: string;
  importMetricMapped: string;
  importMetricViews: string;
  analyticsCountryPerformance: string;
  metricCountries: string;
  metricMappedVideos: string;
  metricViews: string;
  sponsorsEyebrow: string;
  sponsorsDescription: string;
  sponsorsConnect: string;
  fanVoteEyebrow: string;
  fanVoteTitle: string;
  fanVoteDescription: string;
  accountSetup: string;
  accountDisplayNamePlaceholder: string;
  accountEmailPlaceholder: string;
  accountUsernamePlaceholder: string;
  accountPasswordPlaceholder: string;
  channelStepRequiredError: string;
  channelNotFoundError: string;
  choosePlanError: string;
  registerFallbackError: string;
  accountActivated: string;
  publicUrlReservedPrefix: string;
  missingCheckoutError: string;
  creatingAccount: string;
  preparingCheckout: string;
  startTrial: string;
  payWithPolar: string;
  trialBadge: string;
  trialNote: string;
  processingPhrases: string[];
  profileComplete: string;
  profileTitle: string;
  profileBody: string;
  profileContinue: string;
};

const localizedPlanDetails: Record<OnboardingLocale, Record<PlanDefinition["slug"], LocalizedPlanDetails>> = {
  es: {
    free: {
      name: "Free",
      price: "$0",
      description: "Gancho de conversión para validar el canal y abrir el mapa.",
      features: ["1 canal", "Hasta 50 videos", "Mapa público", "Importación básica"],
      trialCopy: "Incluye 7 días de prueba",
    },
    creator: {
      name: "Creator",
      price: "$29/mes",
      description: "Plan core para creadores individuales.",
      features: ["Videos ilimitados", "1 sponsor", "Analytics básicos", "Mapa limpio"],
      badge: "Recomendado",
      trialCopy: "7 dias gratis",
    },
    creator_pro: {
      name: "Creator Pro",
      price: "$79/mes",
      description: "Sponsor hub y analytics más vendible.",
      features: ["Videos ilimitados", "Competitor analytics", "Sponsor hub", "Sync prioritaria"],
      badge: "Más vendido",
      trialCopy: "7 dias gratis",
    },
    agency: {
      name: "Agency",
      price: "$199/mes",
      description: "Para agencias y marcas con portafolios.",
      features: ["Portafolio de canales", "API", "Portal de marcas", "Soporte dedicado"],
      trialCopy: "7 dias gratis",
    },
  },
  en: {
    free: {
      name: "Free",
      price: "$0",
      description: "Conversion hook to validate the channel and open the map.",
      features: ["1 channel", "Up to 50 videos", "Public map", "Basic import"],
      trialCopy: "Includes a 7-day trial",
    },
    creator: {
      name: "Creator",
      price: "$29/mo",
      description: "Core plan for individual creators.",
      features: ["Unlimited videos", "1 sponsor", "Basic analytics", "Clean map"],
      badge: "Recommended",
      trialCopy: "7 days included",
    },
    creator_pro: {
      name: "Creator Pro",
      price: "$79/mo",
      description: "Sponsor hub and stronger analytics.",
      features: ["Unlimited videos", "Competitor analytics", "Sponsor hub", "Priority sync"],
      badge: "Best seller",
      trialCopy: "7 days included",
    },
    agency: {
      name: "Agency",
      price: "$199/mo",
      description: "For agencies and brands with portfolios.",
      features: ["Channel portfolio", "API", "Brand portal", "Dedicated support"],
      trialCopy: "7 days included",
    },
  },
};

const onboardingCopy: Record<OnboardingLocale, OnboardingCopy> = {
  es: {
    topbarEyebrow: "Configuración TravelMap",
    topbarTitle: "Onboarding TravelMap",
    searchPlaceholder: "Busca videos, países o creadores",
    workflowPill: "Flujo del creador",
    demoMapLabel: "Mapa demo",
    stepLabels: [
      { step: 0, label: "Resumen" },
      { step: 1, label: "Canal" },
      { step: 2, label: "Importar" },
      { step: 3, label: "Analítica" },
      { step: 4, label: "Sponsors" },
      { step: 5, label: "Voto fan" },
      { step: 6, label: "Planes" },
    ],
    stepMeta: {
      0: {
        eyebrow: "Flujo del canal",
        title: "Convierte tu canal en una experiencia viva.",
        description: "Setup, importación, analítica, sponsors y pago en un recorrido corto y claro.",
      },
      1: {
        eyebrow: "Tu canal",
        title: "Conecta el canal que vas a publicar.",
        description: "en 5 minutos, tienes tu mapa interactivo.",
      },
      2: {
        eyebrow: "Importación",
        title: "Filtramos y ordenamos tu catálogo.",
        description: "La vista muestra datos de ejemplo mientras el loader ejecuta la importación real.",
      },
      3: {
        eyebrow: "Analítica por país",
        title: "Lee dónde rinde mejor tu contenido.",
        description: "Detecta países fuertes, huecos y destinos con mayor tracción.",
      },
      4: {
        eyebrow: "Brand deals",
        title: "Muestras tus sponsors en tu mapa",
        description: "Genera mas dinero promocionando empresas.",
      },
      5: {
        eyebrow: "Señal de audiencia",
        title: "Tu audiencia vota el siguiente destino.",
        description: "Una capa simple para convertir demanda en planificación.",
      },
      6: {
        eyebrow: "Planes",
        title: "Elige tu plan y empieza la prueba de 7 días.",
        description: "Todos los planes incluyen el trial y luego cobran el plan elegido.",
      },
    },
    footerBack: "Atrás",
    footerStep: "Paso",
    footerOf: "de",
    footerContinue: "Continuar",
    footerReviewAccount: "Revisar cuenta",
    footerOpenDashboard: "Abrir dashboard",
    overviewFeatures: [
      { title: "Importa videos", copy: "Lee el catálogo del canal y conserva solo contenido long-form." },
      { title: "Mapea países", copy: "Asocia cada video válido a un país real y explorable." },
      { title: "Monetiza destinos", copy: "Activa sponsors y votación sin romper el flujo." },
    ],
    importStatusEyebrow: "Analítica en progreso",
    importStatusTitle: "Tu rendimiento ya se está preparando.",
    importStatusBody: "Filtramos, ubicamos y ordenamos tus videos para resaltar qué destinos empujan mejor tu canal.",
    importMetricCountries: "Países",
    importMetricMapped: "Videos mapeados",
    importMetricViews: "Views",
    analyticsCountryPerformance: "Rendimiento por país",
    metricCountries: "Países",
    metricMappedVideos: "Videos mapeados",
    metricViews: "Views",
    sponsorsEyebrow: "Sponsors",
    sponsorsDescription: "Placements por destino y cards patrocinadas por país.",
    sponsorsConnect: "Conectar",
    fanVoteEyebrow: "Voto fan",
    fanVoteTitle: "Tu audiencia decide el próximo país.",
    fanVoteDescription: "Convierte interés en señal y la señal en calendario de viaje.",
    accountSetup: "Perfil final",
    accountDisplayNamePlaceholder: "Nombre público",
    accountEmailPlaceholder: "Email",
    accountUsernamePlaceholder: "Usuario",
    accountPasswordPlaceholder: "Contraseña",
    channelStepRequiredError: "Completa usuario, email y un canal real para continuar.",
    channelNotFoundError: "No pudimos verificar ese canal.",
    choosePlanError: "Primero elige un plan.",
    registerFallbackError: "No se pudo crear la cuenta.",
    accountActivated: "Cuenta lista.",
    publicUrlReservedPrefix: "URL pública reservada:",
    missingCheckoutError: "Este plan todavía no tiene checkout configurado.",
    creatingAccount: "Creando cuenta...",
    preparingCheckout: "Abriendo Polar...",
    startTrial: "Empezar prueba de 7 días",
    payWithPolar: "Continuar con Polar",
    trialBadge: "7 dias gratis",
    trialNote: "Todos los planes arrancan con una prueba de 7 días.",
    processingPhrases: [
      "Conectando tu canal...",
      "Filtrando shorts y ruido...",
      "Mapeando países y destinos...",
      "Preparando tu analítica...",
      "Afinando sponsors y crecimiento...",
    ],
    profileComplete: "Perfil listo",
    profileTitle: "Completa tu perfil para entrar.",
    profileBody: "Confirmamos tus datos y dejamos el acceso ordenado antes de abrir tu mundo.",
    profileContinue: "Entrar a tu mundo",
  },
  en: {
    topbarEyebrow: "TravelMap setup",
    topbarTitle: "TravelMap onboarding",
    searchPlaceholder: "Search across videos, countries, or creators",
    workflowPill: "Creator flow",
    demoMapLabel: "Demo map",
    stepLabels: [
      { step: 0, label: "Overview" },
      { step: 1, label: "Channel" },
      { step: 2, label: "Import" },
      { step: 3, label: "Analytics" },
      { step: 4, label: "Sponsors" },
      { step: 5, label: "Fan vote" },
      { step: 6, label: "Plans" },
    ],
    stepMeta: {
      0: {
        eyebrow: "Channel workflow",
        title: "Turn your channel into a living experience.",
        description: "Setup, import, analytics, sponsors, and payment in one short flow.",
      },
      1: {
        eyebrow: "Your channel",
        title: "Connect the channel you want to publish.",
        description: "Name, username, email, and a real URL are enough to continue.",
      },
      2: {
        eyebrow: "Import",
        title: "We filter and sort your catalog.",
        description: "This view uses example data while the loader runs the real import.",
      },
      3: {
        eyebrow: "Country analytics",
        title: "See where your content performs best.",
        description: "Find strong countries, gaps, and destinations with momentum.",
      },
      4: {
        eyebrow: "Brand deals",
        title: "Turn destinations into inventory.",
        description: "Brands attach to countries and routes, not generic placement.",
      },
      5: {
        eyebrow: "Audience signal",
        title: "Let your audience vote next.",
        description: "A simple layer that turns demand into planning.",
      },
      6: {
        eyebrow: "Plans",
        title: "Choose a plan and start the 7-day trial.",
        description: "Every plan begins with the trial and then bills the selected tier.",
      },
    },
    footerBack: "Back",
    footerStep: "Step",
    footerOf: "of",
    footerContinue: "Continue",
    footerReviewAccount: "Review account",
    footerOpenDashboard: "Open dashboard",
    overviewFeatures: [
      { title: "Import videos", copy: "Read the channel catalog and keep only long-form travel content." },
      { title: "Map countries", copy: "Attach each valid video to a real, explorable country." },
      { title: "Monetize destinations", copy: "Unlock sponsors and audience voting without breaking flow." },
    ],
    importStatusEyebrow: "Analytics in progress",
    importStatusTitle: "Your performance is being prepared.",
    importStatusBody: "We filter, map, and sort your videos so the best-performing destinations are easier to see.",
    importMetricCountries: "Countries",
    importMetricMapped: "Mapped videos",
    importMetricViews: "Views",
    analyticsCountryPerformance: "Country performance",
    metricCountries: "Countries",
    metricMappedVideos: "Mapped videos",
    metricViews: "Views",
    sponsorsEyebrow: "Sponsors",
    sponsorsDescription: "Destination placements and sponsored country cards.",
    sponsorsConnect: "Connect",
    fanVoteEyebrow: "Fan vote",
    fanVoteTitle: "Your audience picks the next country.",
    fanVoteDescription: "Turn interest into signal and signal into your travel calendar.",
    accountSetup: "Final profile",
    accountDisplayNamePlaceholder: "Display name",
    accountEmailPlaceholder: "Email",
    accountUsernamePlaceholder: "Username",
    accountPasswordPlaceholder: "Password",
    channelStepRequiredError: "Complete username, email, and a real channel to continue.",
    channelNotFoundError: "We couldn't verify that channel.",
    choosePlanError: "Choose a plan first.",
    registerFallbackError: "Could not create the account.",
    accountActivated: "Account ready.",
    publicUrlReservedPrefix: "Public URL reserved:",
    missingCheckoutError: "That plan does not have checkout configured yet.",
    creatingAccount: "Creating account...",
    preparingCheckout: "Opening Polar...",
    startTrial: "Start 7-day trial",
    payWithPolar: "Continue with Polar",
    trialBadge: "7 days included",
    trialNote: "Every plan starts with a 7-day trial.",
    processingPhrases: [
      "Connecting your channel...",
      "Filtering shorts and noise...",
      "Mapping countries and destinations...",
      "Preparing your analytics...",
      "Sharpening sponsors and growth...",
    ],
    profileComplete: "Profile ready",
    profileTitle: "Complete your profile to enter.",
    profileBody: "We confirm your details and keep access tidy before opening your world.",
    profileContinue: "Enter your world",
  },
};

const sponsorCards = [
  { brand: "Booking.com", image: "/brands/booking.svg" },
  { brand: "GetYourGuide", image: "/brands/getyourguide.svg" },
  { brand: "Airbnb", image: "/brands/airbnb.svg" },
  { brand: "IATI Seguros", image: "/brands/iati.svg" },
] as const;

const visiblePlans = PLAN_DEFINITIONS.filter((plan) => plan.slug !== "free");

export function OnboardingFlow({ isDemoMode, locale }: { isDemoMode: boolean; locale: OnboardingLocale }) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedPlan, setSelectedPlan] = useState<string>("creator_pro");
  const [channelDraft, setChannelDraft] = useState<ChannelDraft>(() => ({
    displayName: isDemoMode ? DEMO_USER.displayName : "",
    email: isDemoMode ? DEMO_USER.email : "",
    username: isDemoMode ? DEMO_USER.username : "",
    channelUrl: isDemoMode ? "https://www.youtube.com/@pupilanomad" : "",
  }));
  const [stepError, setStepError] = useState<string | null>(null);
  const [channelValidationState, setChannelValidationState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [channelValidationMessage, setChannelValidationMessage] = useState<string | null>(null);
  const [activationState, setActivationState] = useState<ActivationState>("idle");

  const copy = onboardingCopy[locale];
  const previewChannel = DEMO_CHANNEL;
  const previewLocations = DEMO_VIDEO_LOCATIONS;
  const analytics = DEMO_ANALYTICS as ChannelAnalytics;
  const demoMapPath = locale === "en" ? "/map?channelId=drew-global-map" : "/map?channelId=luisito-global-map";

  const currentMeta = copy.stepMeta[step];

  async function validateChannelDraft() {
    if (isDemoMode) {
      setChannelValidationState("valid");
      setChannelValidationMessage(null);
      return true;
    }

    const channelUrl = channelDraft.channelUrl.trim();
    if (!channelUrl) {
      setChannelValidationState("invalid");
      setChannelValidationMessage(copy.channelStepRequiredError);
      return false;
    }

    setChannelValidationState("checking");
    setChannelValidationMessage(null);

    try {
      const response = await fetch("/api/youtube/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; channel_name?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || copy.channelNotFoundError);
      }

      setChannelValidationState("valid");
      setChannelValidationMessage(payload.channel_name ? payload.channel_name : null);
      return true;
    } catch {
      setChannelValidationState("invalid");
      setChannelValidationMessage(copy.channelNotFoundError);
      return false;
    }
  }

  async function handleNext() {
    if (step === 1) {
      const isValid = await validateChannelDraft();
      if (!isValid) return;
    }

    setStepError(null);
    if (step < 6) {
      setStep((current) => (current + 1) as OnboardingStep);
      return;
    }

    if (isDemoMode) {
      router.push(`/dashboard?channelId=${DEMO_CHANNEL_SLUG}&demo=1`);
    }
  }

  function handleBack() {
    setStepError(null);
    setStep((current) => (current > 0 ? ((current - 1) as OnboardingStep) : 0));
  }

  function stepStateFor(stepIndex: OnboardingStep): StepState {
    if (stepIndex === step) return "active";
    if (stepIndex < step) return "done";
    return "upcoming";
  }

  const stepper = (
    <div className="pointer-events-none absolute inset-x-0 top-[84px] z-30 px-4">
      <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto rounded-full border border-white/10 bg-[#181818]/95 p-1.5 backdrop-blur pointer-events-auto">
        {copy.stepLabels.map((item) => {
          const state = stepStateFor(item.step);
          return (
            <button
              key={item.step}
              type="button"
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-colors whitespace-nowrap",
                state === "active" && "bg-[#f1f1f1] text-[#0f0f0f]",
                state === "done" && "bg-transparent text-[#8b8b8b] hover:text-[#b5b5b5]",
                state === "upcoming" && "bg-transparent text-[#ff4040] hover:text-[#ff6a6a]"
              )}
              onClick={() => {
                if (item.step <= step) setStep(item.step);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#0f0f0f] text-[#f1f1f1]">
      <div className="pointer-events-none absolute inset-0 [&_*]:pointer-events-none">
        <MapExperience
          channel={previewChannel}
          videoLocations={previewLocations}
          interactive={false}
          allowRefresh={false}
          showLegend={false}
          showOperationsPanel={false}
          showActiveVideoCard={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,15,0.96),rgba(15,15,15,0.74)_22%,rgba(15,15,15,0.4)_42%,rgba(15,15,15,0.92))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 py-3">
        <FloatingTopBar
          eyebrow={copy.topbarEyebrow}
          title={copy.topbarTitle}
          searchPlaceholder={copy.searchPlaceholder}
          actions={
            <>
              <SignalPill text={copy.workflowPill} />
              <Link href={demoMapPath} className="inline-flex h-9 items-center justify-center rounded-full bg-[#f1f1f1] px-4 text-[13px] font-medium text-[#0f0f0f] transition-colors hover:bg-[#e3e3e3]">
                {copy.demoMapLabel}
              </Link>
            </>
          }
        />
      </header>

      {stepper}

      <section className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pb-24 pt-32">
        <div className="w-full max-w-[1040px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-auto rounded-[24px] border border-white/10 bg-[#181818]/96 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur"
            >
              <div className="border-b border-white/10 px-6 py-5 text-center sm:px-8">
                <p className="yt-overline text-[#aaaaaa]">{currentMeta.eyebrow}</p>
                <h1 className="mx-auto mt-2 max-w-3xl text-[30px] leading-[34px] font-bold tracking-tight text-[#f1f1f1] sm:text-[38px] sm:leading-[42px]">
                  {currentMeta.title}
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-6 text-[#aaaaaa]">{currentMeta.description}</p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                {renderStepBody(step, {
                  isDemoMode,
                  analytics,
                  selectedPlan,
                  setSelectedPlan,
                  locale,
                  copy,
                  channelDraft,
                  setChannelDraft: (next) => {
                    setChannelDraft(next);
                    setChannelValidationState("idle");
                    setChannelValidationMessage(null);
                  },
                  channelValidationState,
                  channelValidationMessage,
                  stepError,
                  activationState,
                  setActivationState,
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 px-4">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between rounded-full border border-white/10 bg-[#181818]/96 px-4 py-3 pointer-events-auto backdrop-blur">
          <Button
            type="button"
            variant="secondary"
            className="disabled:pointer-events-auto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleBack();
            }}
            disabled={step === 0 || activationState !== "idle"}
          >
            {copy.footerBack}
          </Button>
          <p className="hidden text-[12px] text-[#aaaaaa] sm:block">
            {copy.footerStep} {step + 1} {copy.footerOf} {copy.stepLabels.length}
          </p>
          <Button
            type={step === 6 ? "submit" : "button"}
            form={step === 6 ? "plan-activation-form" : undefined}
            onClick={step === 6 ? undefined : handleNext}
            className="disabled:pointer-events-auto"
            disabled={activationState !== "idle" || (step === 1 && channelValidationState === "checking")}
          >
            {activationState === "registering"
              ? copy.creatingAccount
              : activationState === "checkout"
                ? copy.preparingCheckout
                : step === 6
                  ? copy.footerReviewAccount
                  : copy.footerContinue}
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
    analytics: ChannelAnalytics;
    selectedPlan: string;
    setSelectedPlan: (value: string) => void;
    locale: OnboardingLocale;
    copy: OnboardingCopy;
    channelDraft: ChannelDraft;
    setChannelDraft: (next: ChannelDraft) => void;
    channelValidationState: "idle" | "checking" | "valid" | "invalid";
    channelValidationMessage: string | null;
    stepError: string | null;
    activationState: ActivationState;
    setActivationState: (state: ActivationState) => void;
  }
) {
  if (step === 0) {
    const featureCards = [
      { ...ctx.copy.overviewFeatures[0], icon: PlaneTakeoff },
      { ...ctx.copy.overviewFeatures[1], icon: MapPinned },
      { ...ctx.copy.overviewFeatures[2], icon: Handshake },
    ] as const;

    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="rounded-[28px] border border-white/10 bg-[#212121] p-6 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#ff0000] text-white shadow-[0_18px_45px_rgba(255,0,0,0.22)]">
                <Icon className="h-9 w-9" />
              </div>
              <p className="text-[16px] leading-[22px] font-medium text-[#f1f1f1]">{feature.title}</p>
              <p className="mt-2 text-[14px] leading-6 text-[#aaaaaa]">{feature.copy}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (step === 1) {
    const statusClass =
      ctx.channelValidationState === "valid"
        ? "text-[#8dd7a6]"
        : ctx.channelValidationState === "checking"
          ? "text-[#9fc4ff]"
          : "text-[#ff8b8b]";

    return (
      <div className="space-y-4">
        <YoutubeImportStep demo={ctx.isDemoMode} locale={ctx.locale} value={ctx.channelDraft} onChange={ctx.setChannelDraft} />
        {ctx.stepError ? <p className="text-[12px] text-[#ff8b8b]">{ctx.stepError}</p> : null}
        {ctx.channelValidationMessage ? <p className={cn("text-[12px]", statusClass)}>{ctx.channelValidationMessage}</p> : null}
      </div>
    );
  }

  if (step === 2) {
    const imported = ctx.isDemoMode ? DEMO_VIDEO_LOCATIONS.length : DEMO_VIDEO_LOCATIONS.length;
    const mapped = imported;
    const countries = new Set(DEMO_VIDEO_LOCATIONS.map((video) => video.country_code)).size;
    const views = DEMO_VIDEO_LOCATIONS.reduce((sum, video) => sum + Number(video.view_count || 0), 0);

    return (
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-[#212121] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="yt-overline text-[#aaaaaa]">{ctx.copy.importStatusEyebrow}</p>
              <p className="mt-2 text-[20px] leading-7 font-medium text-[#f1f1f1]">{ctx.copy.importStatusTitle}</p>
            </div>
            <Badge variant="secondary">{ctx.copy.trialBadge}</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#aaaaaa]">{ctx.copy.importStatusBody}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StudioMetric label={ctx.copy.importMetricCountries} value={countries} />
            <StudioMetric label={ctx.copy.importMetricMapped} value={mapped} />
            <StudioMetric label={ctx.copy.importMetricViews} value={views} />
          </div>
          <p className="mt-4 text-[12px] text-[#9a9a9a]">La vista usa ejemplo visual. El loader ejecuta la importación real después de Polar.</p>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#212121] p-5">
          <p className="yt-overline text-[#aaaaaa]">{ctx.copy.analyticsCountryPerformance}</p>
          <div className="mt-5 space-y-4">
            {ctx.analytics.top_countries.slice(0, 5).map((country, index) => (
              <div key={country.country_name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] text-[#f1f1f1]">{country.country_name}</span>
                  <span className="text-[12px] text-[#aaaaaa]">
                    {country.video_count} {ctx.copy.metricMappedVideos}
                  </span>
                </div>
                <div className="yt-progress">
                  <span style={{ width: `${Math.max(18, 100 - index * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <StudioMetric label={ctx.copy.metricCountries} value={ctx.analytics.total_countries} />
          <StudioMetric label={ctx.copy.metricMappedVideos} value={ctx.analytics.total_mapped_videos} />
          <StudioMetric label={ctx.copy.metricViews} value={ctx.analytics.total_views} />
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4 overflow-x-auto pb-1">
        {sponsorCards.map((sponsor) => (
          <div key={sponsor.brand} className="rounded-[28px] border border-white/10 bg-[#212121] p-5">
            <div className="mb-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sponsor.image} alt={sponsor.brand} className="h-full w-full object-contain p-4" />
            </div>
            <p className="text-[16px] font-medium text-[#f1f1f1]">{sponsor.brand}</p>
            <p className="mt-2 text-[13px] leading-5 text-[#aaaaaa]">{ctx.copy.sponsorsDescription}</p>
            <button type="button" className="yt-btn-secondary mt-5 w-full">
              {ctx.copy.sponsorsConnect}
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#ff0000]/25 bg-[#241616] p-6">
          <p className="yt-overline text-[#ff8b8b]">{ctx.copy.fanVoteEyebrow}</p>
          <h3 className="mt-2 text-[26px] leading-[30px] font-bold text-[#f1f1f1]">{ctx.copy.fanVoteTitle}</h3>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#d3bcbc]">{ctx.copy.fanVoteDescription}</p>
        </div>
        <div className="space-y-3">
          {[
            ["Japan", 42],
            ["Mexico", 31],
            ["Italy", 27],
          ].map(([country, score]) => (
            <div key={country} className="rounded-[28px] border border-white/10 bg-[#212121] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#f1f1f1]">{country}</span>
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
      <div className="grid gap-4 lg:grid-cols-3">
        {visiblePlans.map((plan) => {
          const active = ctx.selectedPlan === plan.slug;
          const localizedPlan = localizedPlanDetails[ctx.locale][plan.slug];

          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => ctx.setSelectedPlan(plan.slug)}
              className={cn(
                "rounded-[28px] border p-5 text-left transition-colors",
                active ? "border-[#ff0000] bg-[#2a1212]" : "border-white/10 bg-[#212121] hover:bg-[#272727]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="yt-overline text-[#aaaaaa]">{localizedPlan.name}</p>
                  <p className="mt-2 text-[24px] leading-[26px] font-bold text-[#f1f1f1]">{localizedPlan.price}</p>
                </div>
                {localizedPlan.badge ? <Badge variant="secondary">{localizedPlan.badge}</Badge> : null}
              </div>
              <p className="mt-3 text-[13px] leading-5 text-[#aaaaaa]">{localizedPlan.description}</p>
              <p className="mt-3 text-[12px] font-medium text-[#ff6a6a]">{localizedPlan.trialCopy}</p>
              <ul className="mt-4 space-y-1.5 text-[12px] leading-5 text-[#d5d5d5]">
                {localizedPlan.features.map((feature) => (
                  <li key={`${plan.slug}-${feature}`} className="flex items-start gap-2">
                    <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#f1f1f1]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <PlansActivationPanel
        selectedPlan={ctx.selectedPlan}
        channelDraft={ctx.channelDraft}
        locale={ctx.locale}
        copy={ctx.copy}
        isDemoMode={ctx.isDemoMode}
        onActivationStateChange={ctx.setActivationState}
      />
    </div>
  );
}

function PlansActivationPanel({
  selectedPlan,
  channelDraft,
  locale,
  copy,
  isDemoMode,
  onActivationStateChange,
}: {
  selectedPlan: string;
  channelDraft: ChannelDraft;
  locale: OnboardingLocale;
  copy: OnboardingCopy;
  isDemoMode: boolean;
  onActivationStateChange: (state: ActivationState) => void;
}) {
  const [displayName, setDisplayName] = useState(channelDraft.displayName);
  const [email, setEmail] = useState(channelDraft.email);
  const [username, setUsername] = useState(channelDraft.username);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState<ActivationState>("idle");
  const [activationError, setActivationError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(channelDraft.displayName);
    setEmail(channelDraft.email);
    setUsername(channelDraft.username);
  }, [channelDraft]);

  useEffect(() => {
    onActivationStateChange(processing);
  }, [onActivationStateChange, processing]);

  async function activate() {
    if (!selectedPlan) {
      setActivationError(copy.choosePlanError);
      return;
    }

    setProcessing("registering");
    setActivationError(null);
    setSuccessHint(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          username,
          password,
          selectedPlan,
          channelUrl: channelDraft.channelUrl || null,
          youtubeChannelId: null,
          activateWithoutPayment: false,
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

      if (!response.ok) throw new Error(payload?.error || copy.registerFallbackError);

      setSuccessHint(payload?.public_map_path ? `${copy.publicUrlReservedPrefix} ${payload.public_map_path}` : copy.accountActivated);
      setProcessing("checkout");

      const checkoutSlug = resolveCheckoutPlanSlug(selectedPlan);
      if (!checkoutSlug) {
        throw new Error(copy.missingCheckoutError);
      }

      window.location.assign(`/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutSlug)}&lang=${encodeURIComponent(locale)}`);
    } catch (error) {
      setProcessing("idle");
      setActivationError(error instanceof Error ? error.message : copy.registerFallbackError);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#212121] p-5">
      <p className="yt-overline text-[#aaaaaa]">{copy.accountSetup}</p>
      <p className="mt-2 text-[13px] leading-6 text-[#aaaaaa]">{copy.trialNote}</p>

      <form id="plan-activation-form" className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        void activate();
      }}>
        <Input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={copy.accountDisplayNamePlaceholder} />
        <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.accountEmailPlaceholder} />
        <Input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder={copy.accountUsernamePlaceholder} />
        <Input required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy.accountPasswordPlaceholder} type="password" />
        <button type="submit" className="sr-only">
          {copy.footerReviewAccount}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#ff0000]/15 bg-[#1a1414] px-4 py-3 text-[13px] text-[#f1f1f1]">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#ff0000]" />
        <span>
          {copy.trialBadge} · {visiblePlanLabel(selectedPlan, locale)}
        </span>
      </div>

      {successHint ? <p className="mt-3 text-[12px] text-[#9cd5ff]">{successHint}</p> : null}
      {activationError ? <p className="mt-3 text-[12px] text-[#ff8b8b]">{activationError}</p> : null}
      {processing !== "idle" ? <p className="mt-3 text-[12px] text-[#9a9a9a]">{processing === "registering" ? copy.creatingAccount : copy.preparingCheckout}</p> : null}
      {isDemoMode ? <p className="mt-2 text-[12px] text-[#9a9a9a]">Demo mode keeps the flow local.</p> : null}
    </div>
  );
}

function visiblePlanLabel(selectedPlan: string, locale: OnboardingLocale) {
  const plan = visiblePlans.find((item) => item.slug === selectedPlan) || visiblePlans[0];
  if (!plan) return "";
  return localizedPlanDetails[locale][plan.slug].name;
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#181818] p-4">
      <p className="text-[20px] leading-6 font-medium text-[#f1f1f1]">{formatNumber(value)}</p>
      <p className="mt-1 text-[12px] text-[#aaaaaa]">{label}</p>
    </div>
  );
}

function formatNumber(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
