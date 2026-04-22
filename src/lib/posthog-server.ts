import { PostHog } from "posthog-node";

type PostHogClient = Pick<PostHog, "capture" | "identify" | "flush">;

const noopPostHogClient: PostHogClient = {
  capture() {},
  identify() {},
  flush: async () => {},
};

let posthogClient: PostHogClient | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) {
      posthogClient = noopPostHogClient;
      return posthogClient;
    }

    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}
