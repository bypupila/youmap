import { Polar } from "@polar-sh/sdk";
import { readRequiredEnv } from "@/lib/env";

let polarClient: Polar | null = null;

export function getPolarClient() {
  if (!polarClient) {
    polarClient = new Polar({
      accessToken: readRequiredEnv(process.env.POLAR_ACCESS_TOKEN, "POLAR_ACCESS_TOKEN"),
    });
  }

  return polarClient;
}
