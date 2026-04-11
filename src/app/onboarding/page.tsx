import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

interface OnboardingPageProps {
  searchParams: {
    demo?: string;
  };
}

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  return <OnboardingFlow isDemoMode={searchParams.demo === "1"} />;
}
