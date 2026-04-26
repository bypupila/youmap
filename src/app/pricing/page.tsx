import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Precios y planes",
  description:
    "Planes simples para creadores: Free para validar, Creator y Creator Pro con sponsor hub y analítica avanzada. Trial de 7 días incluido.",
  openGraph: {
    title: "Precios y planes · YouMap",
    description:
      "Empieza gratis o activa Creator Pro con sponsor hub, analítica y sincronización prioritaria. Cancela cuando quieras.",
    type: "website",
    url: `${siteUrl}/pricing`,
    siteName: "YouMap",
  },
};

interface PricingPageProps {
  searchParams: Promise<{
    plan?: string;
    lang?: string;
  }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const resolvedSearchParams = await searchParams;
  const lang = resolvedSearchParams.lang === "en" ? "en" : "es";
  const plan = String(resolvedSearchParams.plan || "").trim();

  // Preserve the legacy behavior: when an explicit plan is requested through
  // the URL (e.g. external CTAs), forward to the Polar checkout endpoint.
  if (plan) {
    redirect(`/api/billing/polar/checkout?plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(lang)}`);
  }

  return <PricingPageClient lang={lang} />;
}
