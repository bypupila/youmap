"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { MiniMapModel } from "@/components/landing/mini-map-model";
import { YoutubeImportStep, type ChannelDraft } from "@/components/onboarding/youtube-import-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_ANALYTICS, DEMO_CHANNEL, DEMO_CHANNEL_SLUG, DEMO_USER, DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import { PLAN_DEFINITIONS, resolveCanonicalPlanSlug, resolveCheckoutPlanSlug, type PlanDefinition } from "@/lib/plans";
import { cn } from "@/lib/utils";

import type { ChannelAnalytics } from "@/lib/analytics";

// Step 0 ("Overview / Resumen") was removed because it duplicated the
// landing page's value props and added a click before the user could do
// anything useful. Onboarding now starts at the channel-connect step.
type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;
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
  testWithoutPayment: string;
  testWithoutPaymentHint: string;
  testWithoutPaymentAction: string;
  testWithoutPaymentProcessing: string;
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
    topbarEyebrow: "YouMap",
    topbarTitle: "Onboarding",
    searchPlaceholder: "Busca videos, países o creadores",
    workflowPill: "Flujo del creador",
    demoMapLabel: "Mapa demo",
    stepLabels: [
      { step: 1, label: "Canal" },
      { step: 2, label: "Importar" },
      { step: 3, label: "Analítica" },
      { step: 4, label: "Sponsors" },
      { step: 5, label: "Voto fan" },
      { step: 6, label: "Planes" },
    ],
    stepMeta: {
      1: {
        eyebrow: "Tu canal",
        title: "Conecta el canal que vas a publicar.",
        description: "Pega la URL de tu canal de YouTube. La verificamos al instante y en 5 minutos tendrás tu mapa.",
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
    testWithoutPayment: "TEST · Sin pago",
    testWithoutPaymentHint: "Usa este modo para QA interno. Crea cuenta trialing sin checkout y sigue al procesamiento.",
    testWithoutPaymentAction: "Procesar sin pago (TEST)",
    testWithoutPaymentProcessing: "Preparando modo test...",
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
    topbarEyebrow: "YouMap",
    topbarTitle: "Onboarding",
    searchPlaceholder: "Search across videos, countries, or creators",
    workflowPill: "Creator flow",
    demoMapLabel: "Demo map",
    stepLabels: [
      { step: 1, label: "Channel" },
      { step: 2, label: "Import" },
      { step: 3, label: "Analytics" },
      { step: 4, label: "Sponsors" },
      { step: 5, label: "Fan vote" },
      { step: 6, label: "Plans" },
    ],
    stepMeta: {
      1: {
        eyebrow: "Your channel",
        title: "Connect the channel you want to publish.",
        description: "Paste your YouTube channel URL. We verify it instantly and your map is ready in five minutes.",
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
    testWithoutPayment: "TEST · No payment",
    testWithoutPaymentHint: "Use this for internal QA. It creates a trialing account without checkout and continues to processing.",
    testWithoutPaymentAction: "Process without payment (TEST)",
    testWithoutPaymentProcessing: "Preparing test mode...",
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

// Agency is sold via "talk to sales" on /pricing for now — keep it out of
// the self-service onboarding grid until checkout is wired up.
const HIDDEN_PLAN_SLUGS = new Set<PlanDefinition["slug"]>(["free", "agency"]);
const visiblePlans = PLAN_DEFINITIONS.filter((plan) => !HIDDEN_PLAN_SLUGS.has(plan.slug));
const unavailablePlanSlugs = new Set<PlanDefinition["slug"]>(["agency"]);
// The "TEST · Sin pago" path is for internal QA only. Default to hidden in
// production; opt in with NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT=1.
const showTestNoPaymentPlan = process.env.NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT === "1";

export function OnboardingFlow({ isDemoMode, locale }: { isDemoMode: boolean; locale: OnboardingLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OnboardingStep>(1);
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
          setActivationState("checkout");
          window.location.assign(`/api/billing/polar/checkout?plan=${encodeURIComponent(checkoutSlug)}&lang=${encodeURIComponent(locale)}`);
          return;
        }

        lastErrorMessage = payload?.error || copy.registerFallbackError;
        const usernameTaken = response.status === 409 || /usuario|username/i.test(lastErrorMessage);
        if (usernameTaken) continue;

        throw new Error(lastErrorMessage);
      }
      throw new Error(lastErrorMessage);
    } catch (error) {
      setActivationState("idle");
      setStepError(error instanceof Error ? error.message : copy.registerFallbackError);
    }
  }

  async function activateWithoutPaymentForTest() {
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

    setActivationState("registering");
    setStepError(null);

    try {
      const usernameCandidates = generateUsernameCandidates();
      const generatedPassword = `tm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
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
            activateWithoutPayment: true,
            deferImportToProcessing: true,
          }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.ok) {
          window.location.assign(`/onboarding/processing?lang=${encodeURIComponent(locale)}`);
          return;
        }

        lastErrorMessage = payload?.error || copy.registerFallbackError;
        const usernameTaken = response.status === 409 || /usuario|username/i.test(lastErrorMessage);
        if (usernameTaken) continue;

        throw new Error(lastErrorMessage);
      }

      throw new Error(lastErrorMessage);
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
    setStep((current) => (current > 1 ? ((current - 1) as OnboardingStep) : 1));
  }

  function stepStateFor(stepIndex: OnboardingStep): StepState {
    if (stepIndex === step) return "active";
    if (stepIndex < step) return "done";
    return "upcoming";
  }

  const stepper = (
    <div
      className="mx-auto flex w-fit max-w-[620px] gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-[#181818]/95 p-1.5 backdrop-blur"
      role="list"
      aria-label={locale === "es" ? "Pasos del onboarding" : "Onboarding steps"}
    >
      {copy.stepLabels.map((item, index) => {
        const state = stepStateFor(item.step);
        const reachable = item.step <= step;
        return (
          <button
            key={item.step}
            type="button"
            role="listitem"
            aria-current={state === "active" ? "step" : undefined}
            aria-label={`${copy.footerStep} ${index + 1} ${copy.footerOf} ${copy.stepLabels.length}: ${item.label}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              state === "active" && "bg-[rgba(255,0,0,0.16)] text-[#ffd5d5] shadow-[inset_0_0_0_1px_rgba(255,0,0,0.32)]",
              state === "done" && "bg-transparent text-[#cfcfcf] hover:text-[#f1f1f1]",
              state === "upcoming" && "bg-transparent text-[#7a7a7a]",
              reachable ? "cursor-pointer" : "cursor-default",
            )}
            onClick={() => {
              if (reachable) setStep(item.step);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-[#f1f1f1]">
      <div
        className="pointer-events-none absolute inset-0 [&_*]:pointer-events-none"
        aria-hidden="true"
      >
        {/*
          Onboarding doesn't need the full MapExperience as a backdrop —
          it shipped 1.8K lines of overlay UI that the gradient mask
          immediately covered. MiniMapModel keeps the rotating globe at a
          fraction of the cost and reuses the demo data we already have.
        */}
        <div className="absolute inset-0 scale-[1.4] opacity-80">
          <MiniMapModel videoLocations={previewLocations} />
        </div>
      </div>

      <div className="platform-grid-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.96),rgba(17,20,22,0.74)_22%,rgba(17,20,22,0.4)_42%,rgba(17,20,22,0.92))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 py-3">
        <FloatingTopBar
          eyebrow={copy.topbarEyebrow}
          title={copy.topbarTitle}
          centerContent={stepper}
          hideSearch
          actions={
            <>
              <Link href={demoMapPath} className="yt-btn-primary">
                {copy.demoMapLabel}
              </Link>
            </>
          }
        />
      </header>

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
                <p className="onboarding-description mx-auto mt-3 max-w-2xl text-[14px] leading-6">{currentMeta.description}</p>
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
                  onActivateWithoutPaymentForTest: activateWithoutPaymentForTest,
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-40 px-4"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))" }}
      >
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
            disabled={step === 1 || activationState !== "idle"}
          >
            {copy.footerBack}
          </Button>
          <p className="hidden text-[12px] text-[#aaaaaa] sm:block">
            {copy.footerStep} {step} {copy.footerOf} {copy.stepLabels.length}
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
    onActivateWithoutPaymentForTest: () => Promise<void>;
  }
) {
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
    return (
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-[#212121] p-5">
          <div className="mx-auto max-w-3xl text-center">
            <p className="yt-overline text-[#aaaaaa]">{ctx.copy.importStatusEyebrow}</p>
            <p className="mt-2 text-[22px] leading-8 font-semibold text-[#f1f1f1]">{ctx.copy.importStatusTitle}</p>
            <p className="onboarding-description mt-3 text-[14px] leading-6">{ctx.copy.importStatusBody}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StudioMetric label={ctx.copy.importMetricCountries} value={countries} />
            <StudioMetric label={ctx.copy.importMetricMapped} value={mapped} />
            <StudioMetric label={ctx.copy.importMetricViews} value={views} />
          </div>
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
      <div className="grid gap-4 md:grid-cols-4">
        {sponsorCards.map((sponsor) => (
          <div key={sponsor.brand} className="flex h-full flex-col items-center rounded-[28px] border border-white/10 bg-[#212121] p-5 text-center">
            <div className="mb-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sponsor.image} alt={sponsor.brand} className="h-full w-full object-contain p-4" />
            </div>
            <p className="text-[16px] font-medium text-[#f1f1f1]">{sponsor.brand}</p>
            <p className="onboarding-description mt-2 text-[13px] leading-5">{ctx.copy.sponsorsDescription}</p>
            {/*
              These cards are decorative previews of the sponsor hub feature.
              The real connect flow happens after the channel is published, so
              we show a static preview badge instead of a button that does
              nothing — users now understand what they're looking at.
            */}
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#aaaaaa]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#aaaaaa]" aria-hidden="true" />
              {ctx.locale === "es" ? "Vista previa" : "Preview"}
            </span>
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
          <p className="onboarding-description mt-3 max-w-xl text-[14px] leading-6">{ctx.copy.fanVoteDescription}</p>
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
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
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
                if (!unavailable) {
                  ctx.setSelectedPlan(plan.slug);
                  posthog.capture("onboarding_plan_selected", {
                    plan: plan.slug,
                  });
                }
              }}
              disabled={unavailable}
              className={cn(
                "h-full rounded-[28px] border p-5 text-left transition-colors",
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
              <p className="onboarding-description mt-3 text-[13px] leading-5">{localizedPlan.description}</p>
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
      <div className="flex items-center gap-2 rounded-2xl border border-[rgba(255,0,0,0.18)] bg-[rgba(255,0,0,0.08)] px-4 py-3 text-[13px] text-[#f1f1f1]">
        <Badge variant="secondary" className="bg-white/[0.06] text-[#ffd5d5]">
          {ctx.copy.trialBadge}
        </Badge>
        <span className="text-[#e7e1d8]">{ctx.copy.trialNote}</span>
      </div>
      {showTestNoPaymentPlan ? (
        <div className="rounded-xl border border-[#ffd27a]/25 bg-[rgba(255,210,122,0.08)] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="yt-overline text-[#ffd27a]">{ctx.copy.testWithoutPayment}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#e7d7b1]">{ctx.copy.testWithoutPaymentHint}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="border border-black/10 bg-white text-black hover:bg-white/90"
              onClick={() => {
                void ctx.onActivateWithoutPaymentForTest();
              }}
              disabled={ctx.activationState !== "idle"}
            >
              {ctx.activationState === "registering" ? ctx.copy.testWithoutPaymentProcessing : ctx.copy.testWithoutPaymentAction}
            </Button>
          </div>
        </div>
      ) : null}
      {ctx.stepError ? <p className="text-[12px] text-[#ff8b8b]">{ctx.stepError}</p> : null}
    </div>
  );
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#181818] p-4 text-center">
      <p className="text-[32px] leading-none font-semibold tracking-tight text-[#f1f1f1]">{formatNumber(value)}</p>
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
