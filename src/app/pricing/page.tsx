import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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

  if (plan) {
    redirect(`/api/billing/polar/checkout?plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(lang)}`);
  }

  redirect(`/onboarding?lang=${encodeURIComponent(lang)}`);
}
