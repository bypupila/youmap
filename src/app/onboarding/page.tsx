import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

interface OnboardingPageProps {
  searchParams: {
    demo?: string;
    lang?: string;
  };
}

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const locale = searchParams.lang === "en" ? "en" : "es";
  return <OnboardingFlow isDemoMode={searchParams.demo === "1"} locale={locale} />;
}
