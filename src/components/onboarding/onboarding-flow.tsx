"use client";

import Link from "next/link";
import { AirplaneTilt, Handshake, MapPin } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FloatingTopBar, SignalPill } from "@/components/design-system/chrome";
import { MapExperience } from "@/components/map/map-experience";
import { YoutubeImportStep, type ChannelDraft } from "@/components/onboarding/youtube-import-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_ANALYTICS, DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_USER, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { PLAN_DEFINITIONS, resolveCanonicalPlanSlug, resolveCheckoutPlanSlug, type PlanDefinition } from "@/lib/plans";
import { cn } from "@/lib/utils";

import type { ChannelAnalytics } from "@/lib/analytics";

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type OnboardingLocale = "es" | "en";
type ActivationState = "idle" | "registering" | "checkout";
type StepState = "upcoming" | "active" | "done";
type ChannelValidationState = "idle" | "checking" | "valid" | "invalid";

type ChannelValidationMetrics = {
  youtubeChannelId: string | null;
  channelName: string | null;
  canonicalUrl: string | null;
  totalVideos: number | null;
  totalViews: number | null;
  videosSampled: number;
};

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
  planUnavailableError: string;
  choosePlanError: string;
  registerFallbackError: string;
  accountActivated: string;
  publicUrlReservedPrefix: string;
  missingCheckoutError: string;
  checkoutFailedError: string;
  creatingAccount: string;
  preparingCheckout: string;
  startTrial: string;
  payWithPolar: string;
  trialBadge: string;
  trialNote: string;
  processingPhrases: string[];
  unavailablePlanBadge: string;
  unavailablePlanCopy: string;
  importRealStatsNote: string;
  importDemoStatsNote: string;
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
      badge: "Próximamente",
      trialCopy: "",
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
      badge: "Coming soon",
      trialCopy: "",
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
    channelStepRequiredError: "Completa nombre, email y un canal real para continuar.",
    channelNotFoundError: "No pudimos verificar ese canal.",
    planUnavailableError: "Agency está en preparación y todavía no se puede contratar.",
    choosePlanError: "Primero elige un plan.",
    registerFallbackError: "No se pudo crear la cuenta.",
    accountActivated: "Cuenta lista.",
    publicUrlReservedPrefix: "URL pública reservada:",
    missingCheckoutError: "Este plan todavía no tiene checkout configurado.",
    checkoutFailedError: "No pudimos abrir Polar. Inténtalo nuevamente en unos segundos.",
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
    unavailablePlanBadge: "Próximamente",
    unavailablePlanCopy: "No disponible por el momento.",
    importRealStatsNote: "Videos y views vienen del canal real (sin API key). Países se mantienen demo hasta completar importación.",
    importDemoStatsNote: "La vista usa ejemplo visual. El loader ejecuta la importación real después de Polar.",
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
        description: "Name, email, and a real channel URL are enough to continue.",
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
    channelStepRequiredError: "Complete name, email, and a real channel to continue.",
    channelNotFoundError: "We couldn't verify that channel.",
    planUnavailableError: "Agency is still in preparation and cannot be purchased yet.",
    choosePlanError: "Choose a plan first.",
    registerFallbackError: "Could not create the account.",
    accountActivated: "Account ready.",
    publicUrlReservedPrefix: "Public URL reserved:",
    missingCheckoutError: "That plan does not have checkout configured yet.",
    checkoutFailedError: "We could not open Polar checkout. Please try again in a few seconds.",
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
    unavailablePlanBadge: "Coming soon",
    unavailablePlanCopy: "Not available for now.",
    importRealStatsNote: "Videos and views come from the real channel (no API key). Countries stay demo until import finishes.",
    importDemoStatsNote: "This view uses visual sample data while real import runs after Polar.",
  },
};

const sponsorCards = [
  { brand: "Booking.com", image: "/brands/booking.svg" },
  { brand: "GetYourGuide", image: "/brands/getyourguide.svg" },
  { brand: "Airbnb", image: "/brands/airbnb.svg" },
  { brand: "IATI Seguros", image: "/brands/iati.svg" },
] as const;

const visiblePlans = PLAN_DEFINITIONS.filter((plan) => plan.slug !== "free");
const unavailablePlanSlugs = new Set<PlanDefinition["slug"]>(["agency"]);

export function OnboardingFlow({ isDemoMode, locale }: { isDemoMode: boolean; locale: OnboardingLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedPlan, setSelectedPlan] = useState<string>("creator_pro");
  const [channelDraft, setChannelDraft] = useState<ChannelDraft>(() => ({
    displayName: isDemoMode ? DEMO_USER.displayName : "",
    email: isDemoMode ? DEMO_USER.email : "",
    channelUrl: isDemoMode ? "https://www.youtube.com/@pupilanomad" : "",
  }));
  const [stepError, setStepError] = useState<string | null>(null);
  const [channelValidationState, setChannelValidationState] = useState<ChannelValidationState>("idle");
  const [channelValidationMessage, setChannelValidationMessage] = useState<string | null>(null);
  const [channelValidationMetrics, setChannelValidationMetrics] = useState<ChannelValidationMetrics | null>(null);
  const [activationState, setActivationState] = useState<ActivationState>("idle");
  const didHydrateQueryState = useRef(false);

  const copy = onboardingCopy[locale];
  const previewChannel = DEMO_CHANNEL;
  const previewLocations = DEMO_VIDEO_LOCATIONS;
  const analytics = DEMO_ANALYTICS as ChannelAnalytics;
  const demoMapPath = locale === "en" ? "/map?channelId=drew-global-map" : "/map?channelId=luisito-global-map";

  const currentMeta = copy.stepMeta[step];

  useEffect(() => {
    if (didHydrateQueryState.current) return;
    didHydrateQueryState.current = true;

    const planParam = String(searchParams.get("plan") || "").trim();
    const canonicalPlan = resolveCanonicalPlanSlug(planParam);
    if (canonicalPlan) {
      setSelectedPlan(canonicalPlan);
      setStep(6);
    }

    const errorCode = String(searchParams.get("error") || "").trim().toLowerCase();
    if (!errorCode) return;

    setStep(6);
    if (errorCode === "plan_unavailable") {
      setStepError(copy.missingCheckoutError);
      return;
    }
    if (errorCode === "checkout_failed") {
      setStepError(copy.checkoutFailedError);
      return;
    }
  }, [copy.checkoutFailedError, copy.missingCheckoutError, searchParams]);

  function normalizeUsernameSeed(input: string) {
    const normalized = String(input || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return normalized.replace(/^@+/, "").replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9]+$/, "");
  }

  function generateUsernameCandidates() {
    const emailHandle = channelDraft.email.split("@")[0] || "";
    const preferred = normalizeUsernameSeed(emailHandle) || normalizeUsernameSeed(channelDraft.displayName) || "creator";
    const baseCore = preferred.length >= 3 ? preferred : `${preferred}map`;
    const base = baseCore.slice(0, 24);
    const fallbackToken = () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 6)
        : Math.random().toString(36).slice(2, 8);

    const attempts = [base];
    for (let index = 0; index < 4; index += 1) {
      attempts.push(`${base.slice(0, 22)}${fallbackToken()}`.slice(0, 30));
    }

    return Array.from(
      new Set(
        attempts
          .map((value) => value.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9]+$/, ""))
          .filter((value) => value.length >= 3)
      )
    );
  }

  async function activateAndOpenCheckout() {
    if (!selectedPlan) {
      setStepError(copy.choosePlanError);
      return;
    }

    if (unavailablePlanSlugs.has(selectedPlan as PlanDefinition["slug"])) {
      setStepError(copy.planUnavailableError);
      return;
    }

    if (isDemoMode) {
      router.push(`/dashboard?channelId=${DEMO_CHANNEL_SLUG}&demo=1`);
      return;
    }

    const checkoutSlug = resolveCheckoutPlanSlug(selectedPlan);
    if (!checkoutSlug) {
      setStepError(copy.missingCheckoutError);
      return;
    }

    setActivationState("registering");
    setStepError(null);

    try {
      const usernameCandidates = generateUsernameCandidates();
      const generatedPassword = `tm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
      let registered = false;
      let lastErrorMessage = copy.registerFallbackError;

      for (const username of usernameCandidates) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: channelDraft.displayName.trim(),
            email: channelDraft.email.trim(),
            username,
            password: generatedPassword,
            selectedPlan,
            channelUrl: channelDraft.channelUrl.trim() || null,
            youtubeChannelId: channelValidationMetrics?.youtubeChannelId || null,
            activateWithoutPayment: false,
          }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.ok) {
          registered = true;
          break;
        }

        lastErrorMessage = payload?.error || copy.registerFallbackError;
        const usernameTaken = response.status === 409 || /usuario|username/i.test(lastErrorMessage);
        if (usernameTaken) continue;

        throw new Error(lastErrorMessage);
      }

      if (!registered) {
        throw new Error(lastErrorMessage);
      }

      setActivationState("checkout");
      window.location.assign(`/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutSlug)}&lang=${encodeURIComponent(locale)}`);
    } catch (error) {
      setActivationState("idle");
      setStepError(error instanceof Error ? error.message : copy.registerFallbackError);
    }
  }

  async function validateChannelDraft() {
    setStepError(null);

    if (isDemoMode) {
      setChannelValidationState("valid");
      setChannelValidationMessage(null);
      setChannelValidationMetrics({
        youtubeChannelId: DEMO_CHANNEL.id,
        channelName: DEMO_CHANNEL.channel_name,
        canonicalUrl: null,
        totalVideos: DEMO_VIDEO_LOCATIONS.length,
        totalViews: DEMO_VIDEO_LOCATIONS.reduce((sum, video) => sum + Number(video.view_count || 0), 0),
        videosSampled: DEMO_VIDEO_LOCATIONS.length,
      });
      return true;
    }

    const channelUrl = channelDraft.channelUrl.trim();
    if (!channelUrl) {
      setChannelValidationState("invalid");
      setChannelValidationMessage(copy.channelNotFoundError);
      setChannelValidationMetrics(null);
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

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            youtube_channel_id?: string;
            channel_name?: string;
            canonical_url?: string;
            total_videos?: number | null;
            total_views?: number | null;
            total_videos_sampled?: number;
          }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || copy.channelNotFoundError);
      }

      const metrics: ChannelValidationMetrics = {
        youtubeChannelId: payload.youtube_channel_id || null,
        channelName: payload.channel_name || null,
        canonicalUrl: payload.canonical_url || null,
        totalVideos: typeof payload.total_videos === "number" ? payload.total_videos : null,
        totalViews: typeof payload.total_views === "number" ? payload.total_views : null,
        videosSampled: typeof payload.total_videos_sampled === "number" ? payload.total_videos_sampled : 0,
      };

      const metricsSummary = [
        typeof metrics.totalVideos === "number" ? `${formatNumber(metrics.totalVideos)} videos` : null,
        typeof metrics.totalViews === "number" ? `${formatNumber(metrics.totalViews)} views` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setChannelValidationState("valid");
      setChannelValidationMetrics(metrics);
      setChannelValidationMessage(metrics.channelName ? `${metrics.channelName}${metricsSummary ? ` · ${metricsSummary}` : ""}` : metricsSummary || null);
      return true;
    } catch (error) {
      setChannelValidationState("invalid");
      setChannelValidationMetrics(null);
      setChannelValidationMessage(error instanceof Error ? error.message : copy.channelNotFoundError);
      return false;
    }
  }

  async function handleNext() {
    if (activationState !== "idle") return;

    if (step === 1) {
      const displayName = channelDraft.displayName.trim();
      const email = channelDraft.email.trim();
      const channelUrl = channelDraft.channelUrl.trim();
      if (!displayName || !email || !channelUrl) {
        setStepError(copy.channelStepRequiredError);
        return;
      }

      const isValid = await validateChannelDraft();
      if (!isValid) return;
    }

    setStepError(null);
    if (step < 6) {
      setStep((current) => (current + 1) as OnboardingStep);
      return;
    }
    await activateAndOpenCheckout();
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
                state === "active" && "bg-white/[0.08] text-[#f3eee7]",
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
    <main className="relative min-h-[100dvh] overflow-hidden text-[#f1f1f1]">
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

      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.96),rgba(17,20,22,0.74)_22%,rgba(17,20,22,0.4)_42%,rgba(17,20,22,0.92))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 py-3">
        <FloatingTopBar
          eyebrow={copy.topbarEyebrow}
          title={copy.topbarTitle}
          searchPlaceholder={copy.searchPlaceholder}
          actions={
            <>
              <SignalPill text={copy.workflowPill} />
              <Link href={demoMapPath} className="yt-btn-primary">
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
              className="pointer-events-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,28,31,0.96),rgba(18,21,23,0.92))] shadow-[0_36px_100px_-52px_rgba(0,0,0,0.92)] backdrop-blur"
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
                  validateChannelDraft,
                  locale,
                  copy,
                  channelDraft,
                  setChannelDraft: (next) => {
                    setChannelDraft(next);
                    setChannelValidationState("idle");
                    setChannelValidationMessage(null);
                    setChannelValidationMetrics(null);
                  },
                  channelValidationMetrics,
                  channelValidationState,
                  channelValidationMessage,
                  stepError,
                  activationState,
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
            type="button"
            onClick={handleNext}
            className="disabled:pointer-events-auto"
            disabled={activationState !== "idle" || (step === 1 && channelValidationState === "checking")}
          >
            {activationState === "registering"
              ? copy.creatingAccount
              : activationState === "checkout"
                ? copy.preparingCheckout
                : step === 6
                  ? copy.payWithPolar
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
    validateChannelDraft: () => Promise<boolean>;
    locale: OnboardingLocale;
    copy: OnboardingCopy;
    channelDraft: ChannelDraft;
    setChannelDraft: (next: ChannelDraft) => void;
    channelValidationMetrics: ChannelValidationMetrics | null;
    channelValidationState: ChannelValidationState;
    channelValidationMessage: string | null;
    stepError: string | null;
    activationState: ActivationState;
  }
) {
  if (step === 0) {
    const featureCards = [
      { ...ctx.copy.overviewFeatures[0], icon: AirplaneTilt },
      { ...ctx.copy.overviewFeatures[1], icon: MapPin },
      { ...ctx.copy.overviewFeatures[2], icon: Handshake },
    ] as const;

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]">
        {featureCards.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className={cn("rounded-[28px] border border-white/10 bg-[#212121] p-6", index === 0 && "md:col-span-2 xl:col-span-1")}>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,0,0,0.14)] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Icon size={30} weight="regular" />
              </div>
              <p className="text-[16px] leading-[22px] font-medium text-[#f1f1f1]">{feature.title}</p>
              <p className="mt-2 max-w-[34ch] text-[14px] leading-6 text-[#aaaaaa]">{feature.copy}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <YoutubeImportStep
          demo={ctx.isDemoMode}
          locale={ctx.locale}
          value={ctx.channelDraft}
          onChange={ctx.setChannelDraft}
          channelValidationState={ctx.channelValidationState}
          channelValidationMessage={ctx.channelValidationMessage}
          onValidateChannel={() => {
            void ctx.validateChannelDraft();
          }}
        />
        {ctx.stepError ? <p className="text-[12px] text-[#ff8b8b]">{ctx.stepError}</p> : null}
      </div>
    );
  }

  if (step === 2) {
    const mapped =
      typeof ctx.channelValidationMetrics?.videosSampled === "number" && ctx.channelValidationMetrics.videosSampled > 0
        ? ctx.channelValidationMetrics.videosSampled
        : ctx.channelValidationMetrics?.totalVideos ?? DEMO_VIDEO_LOCATIONS.length;
    const countries = new Set(DEMO_VIDEO_LOCATIONS.map((video) => video.country_code)).size;
    const views = ctx.channelValidationMetrics?.totalViews ?? DEMO_VIDEO_LOCATIONS.reduce((sum, video) => sum + Number(video.view_count || 0), 0);
    const hasRealStats = typeof ctx.channelValidationMetrics?.totalVideos === "number" || typeof ctx.channelValidationMetrics?.totalViews === "number";

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
          <p className="mt-4 text-[12px] text-[#9a9a9a]">{hasRealStats ? ctx.copy.importRealStatsNote : ctx.copy.importDemoStatsNote}</p>
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
        <div className="rounded-[28px] border border-[rgba(255,0,0,0.24)] bg-[rgba(255,0,0,0.12)] p-6">
          <p className="yt-overline text-[#ff8b8b]">{ctx.copy.fanVoteEyebrow}</p>
          <h3 className="mt-2 text-[26px] leading-[30px] font-bold text-[#f1f1f1]">{ctx.copy.fanVoteTitle}</h3>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#dec5b8]">{ctx.copy.fanVoteDescription}</p>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr]">
        {visiblePlans.map((plan) => {
          const active = ctx.selectedPlan === plan.slug;
          const localizedPlan = localizedPlanDetails[ctx.locale][plan.slug];
          const unavailable = unavailablePlanSlugs.has(plan.slug);
          const badgeLabel = unavailable ? ctx.copy.unavailablePlanBadge : localizedPlan.badge;

          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => {
                if (!unavailable) ctx.setSelectedPlan(plan.slug);
              }}
              disabled={unavailable}
              className={cn(
                "rounded-[28px] border p-5 text-left transition-colors",
                plan.slug === "creator_pro" && "md:col-span-2 xl:col-span-1",
                unavailable && "cursor-not-allowed border-white/10 bg-[#1b1b1b] opacity-70",
                !unavailable && active && "border-[rgba(255,0,0,0.36)] bg-[rgba(255,0,0,0.12)]",
                !unavailable && !active && "border-white/10 bg-[#212121] hover:bg-[#272727]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="yt-overline text-[#aaaaaa]">{localizedPlan.name}</p>
                  <p className="mt-2 text-[24px] leading-[26px] font-bold text-[#f1f1f1]">{localizedPlan.price}</p>
                </div>
                {badgeLabel ? <Badge variant={unavailable ? "outline" : "secondary"}>{badgeLabel}</Badge> : null}
              </div>
              <p className="mt-3 text-[13px] leading-5 text-[#aaaaaa]">{localizedPlan.description}</p>
              {localizedPlan.trialCopy ? <p className="mt-3 text-[12px] font-medium text-[#ff6a6a]">{localizedPlan.trialCopy}</p> : null}
              <ul className="mt-4 space-y-1.5 text-[12px] leading-5 text-[#d5d5d5]">
                {localizedPlan.features.map((feature) => (
                  <li key={`${plan.slug}-${feature}`} className="flex items-start gap-2">
                    <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#f1f1f1]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {unavailable ? <p className="mt-4 text-[12px] font-medium text-[#ff8b8b]">{ctx.copy.unavailablePlanCopy}</p> : null}
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-[rgba(255,0,0,0.16)] bg-[rgba(255,0,0,0.08)] px-4 py-3 text-[13px] text-[#f1f1f1]">
        {ctx.copy.trialBadge} · {ctx.copy.trialNote}
      </div>
      {ctx.stepError ? <p className="text-[12px] text-[#ff8b8b]">{ctx.stepError}</p> : null}
    </div>
  );
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
