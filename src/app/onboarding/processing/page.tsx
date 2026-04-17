import { redirect } from "next/navigation";
import { OnboardingProcessing } from "@/components/onboarding/onboarding-processing";
import { getSessionUserById, getSessionUserIdFromServerCookies } from "@/lib/current-user";
import { sql } from "@/lib/neon";

interface OnboardingProcessingPageProps {
  searchParams: {
    lang?: string;
    checkout?: string;
    plan?: string;
  };
}

export default async function OnboardingProcessingPage({ searchParams }: OnboardingProcessingPageProps) {
  const userId = await getSessionUserIdFromServerCookies();
  if (!userId) {
    redirect("/auth");
  }

  const user = await getSessionUserById(userId);
  if (!user) {
    redirect("/auth");
  }

  const stateRows = await sql<Array<{ is_complete: boolean | null }>>`
    select is_complete
    from public.onboarding_state
    where user_id = ${userId}
    limit 1
  `;
  const onboardingState = stateRows[0] || null;
  if (onboardingState?.is_complete) {
    redirect("/dashboard");
  }

  const locale = searchParams.lang === "en" ? "en" : "es";
  return <OnboardingProcessing locale={locale} user={user} />;
}
