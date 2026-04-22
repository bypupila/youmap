import { NextResponse } from "next/server";
import { z } from "zod";
import { createPolarCheckoutSession } from "@/lib/polar";
import { getSessionUserById, getSessionUserIdFromRequest } from "@/lib/current-user";
import { sql } from "@/lib/neon";
import { getPlanSlugCandidates } from "@/lib/plans";
import { getPostHogClient } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  plan: z.string().min(2),
  lang: z.enum(["es", "en"]).default("es"),
});

function buildOnboardingRedirect(origin: string, args: { lang: "es" | "en"; plan?: string | null; error?: string }) {
  const target = new URL("/onboarding", origin);
  target.searchParams.set("lang", args.lang);
  if (args.plan) target.searchParams.set("plan", args.plan);
  if (args.error) target.searchParams.set("error", args.error);
  return target;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "es";
  const requestedPlan = String(url.searchParams.get("plan") || "").trim();

  try {
    const { plan } = querySchema.parse({
      plan: requestedPlan,
      lang,
    });

    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.redirect(buildOnboardingRedirect(url.origin, { lang, plan }));
    }

    const users = await getSessionUserById(userId);
    if (!users) {
      return NextResponse.redirect(new URL("/auth", url.origin));
    }

    const planCandidates = getPlanSlugCandidates(plan);
    const allActivePlans = await sql<
      Array<{
        id: string;
        slug: string;
        name: string;
        polar_product_id: string | null;
        polar_price_id: string | null;
      }>
    >`
      select id, slug, name, polar_product_id, polar_price_id
      from public.subscription_plans
      where is_active = true
    `;
    const rowsBySlug = new Map(allActivePlans.map((row) => [String(row.slug || "").trim().toLowerCase(), row]));
    const candidateRows = planCandidates
      .map((candidate) => rowsBySlug.get(candidate))
      .filter((row): row is (typeof allActivePlans)[number] => Boolean(row));
    const planRow = candidateRows.find((row) => Boolean(row.polar_price_id)) || candidateRows[0] || null;

    if (!planRow?.polar_price_id) {
      return NextResponse.redirect(
        buildOnboardingRedirect(url.origin, {
          lang,
          plan: planRow?.slug || plan,
          error: "plan_unavailable",
        })
      );
    }

    const checkout = await createPolarCheckoutSession({
      productPriceId: planRow.polar_price_id,
      successUrl: `${url.origin}/onboarding/processing?checkout=success&plan=${encodeURIComponent(planRow.slug)}&lang=${encodeURIComponent(lang)}`,
      customerEmail: users.email || undefined,
      externalCustomerId: userId,
      discountId: process.env.POLAR_TRIAL_DISCOUNT_ID || null,
    });

    if (!checkout.url) {
      return NextResponse.redirect(
        buildOnboardingRedirect(url.origin, {
          lang,
          plan: planRow.slug,
          error: "checkout_failed",
        })
      );
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "checkout_initiated",
      properties: {
        plan: planRow.slug,
        plan_name: planRow.name,
        lang,
      },
    });

    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[api/billing/polar/checkout]", error);
    return NextResponse.redirect(
      buildOnboardingRedirect(url.origin, {
        lang,
        plan: requestedPlan || null,
        error: "checkout_failed",
      })
    );
  }
}
