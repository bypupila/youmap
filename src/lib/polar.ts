import { Polar } from "@polar-sh/sdk";
import { readRequiredEnv } from "@/lib/env";

let polarClient: Polar | null = null;

export interface CreatePolarCheckoutSessionInput {
  productPriceId: string;
  successUrl: string;
  customerEmail?: string | null;
  externalCustomerId?: string | null;
  discountId?: string | null;
}

export function getPolarClient() {
  if (!polarClient) {
    polarClient = new Polar({
      accessToken: readRequiredEnv(process.env.POLAR_ACCESS_TOKEN, "POLAR_ACCESS_TOKEN"),
    });
  }

  return polarClient;
}

export async function createPolarCheckoutSession(input: CreatePolarCheckoutSessionInput) {
  const accessToken = readRequiredEnv(process.env.POLAR_ACCESS_TOKEN, "POLAR_ACCESS_TOKEN");
  const response = await fetch("https://api.polar.sh/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_price_id: input.productPriceId,
      success_url: input.successUrl,
      customer_email: input.customerEmail || undefined,
      external_customer_id: input.externalCustomerId || undefined,
      discount_id: input.discountId || undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Polar checkout error: ${response.status} ${body}`);
  }

  return (await response.json()) as { url?: string | null };
}
