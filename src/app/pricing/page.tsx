import { redirect } from "next/navigation";

interface PricingPageProps {
  searchParams: {
    plan?: string;
    lang?: string;
  };
}

export default function PricingPage({ searchParams }: PricingPageProps) {
  const lang = searchParams.lang === "en" ? "en" : "es";
  const plan = String(searchParams.plan || "").trim();

  if (plan) {
    redirect(`/api/billing/polar/checkout?plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(lang)}`);
  }

  redirect(`/onboarding?lang=${encodeURIComponent(lang)}`);
}
