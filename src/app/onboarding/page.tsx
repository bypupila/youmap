import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const dynamic = "force-dynamic";

interface OnboardingPageProps {
  searchParams: Promise<{
    demo?: string;
    lang?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = resolvedSearchParams.lang === "en" ? "en" : "es";
  return <OnboardingFlow isDemoMode={resolvedSearchParams.demo === "1"} locale={locale} />;
}
