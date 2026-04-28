import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (posthogToken) {
  posthog.init(posthogToken, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_web_experiments: true,
    disable_surveys_automatic_display: true,
    debug: process.env.NODE_ENV === "development",
  });
}

Sentry.init({
  dsn: "https://d7a23056229449a335a0fc32676c223a@o4511184972677120.ingest.us.sentry.io/4511263844794368",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// IMPORTANT: Keep a single client instrumentation hook. Next.js loads this file
// before hydration, so both analytics and error monitoring must live here.
