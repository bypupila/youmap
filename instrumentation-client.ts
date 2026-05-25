import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

function installExtensionHydrationGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const selectors = ["#heurio-app", ".heurio-overlay", "[class*='heurio-']", "[id*='heurio-']"];

  const removeInjectedNodes = () => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.parentNode?.removeChild(node);
      });
    });
  };

  removeInjectedNodes();

  const observer = new MutationObserver(removeInjectedNodes);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      removeInjectedNodes();
      observer.disconnect();
    }, 2500);
  });
}

function installMicrosoftClarity() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.getElementById("microsoft-clarity-script")) return;

  const script = document.createElement("script");
  script.id = "microsoft-clarity-script";
  script.async = true;
  script.src = "https://www.clarity.ms/tag/wf6i1kgiq2";
  document.head.appendChild(script);
}

installExtensionHydrationGuard();
installMicrosoftClarity();

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const isProduction = process.env.NODE_ENV === "production";
const enablePostHogInDev = process.env.NEXT_PUBLIC_ENABLE_POSTHOG_IN_DEV === "1";
const enablePostHogDebugLogs = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "1";

if (posthogToken && (isProduction || enablePostHogInDev)) {
  posthog.init(posthogToken, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_web_experiments: true,
    disable_surveys_automatic_display: true,
    debug: enablePostHogDebugLogs,
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
