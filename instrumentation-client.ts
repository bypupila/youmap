import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

declare global {
  type ClarityStub = {
    (...args: unknown[]): void;
    q?: unknown[][];
  };

  interface Window {
    clarity?: ClarityStub;
  }
}

function installExtensionHydrationGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const selectors = ["#heurio-app", ".heurio-overlay", "[class*='heurio-']", "[id*='heurio-']"];
  // Some cursor/feedback extensions annotate existing nodes before hydration.
  const attributes = ["data-cursor-element-id"];

  const removeInjectedArtifacts = () => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.parentNode?.removeChild(node);
      });
    });
    attributes.forEach((attribute) => {
      document.querySelectorAll(`[${attribute}]`).forEach((node) => {
        node.removeAttribute(attribute);
      });
    });
  };

  removeInjectedArtifacts();

  const observer = new MutationObserver(removeInjectedArtifacts);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: attributes,
  });

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      removeInjectedArtifacts();
      observer.disconnect();
    }, 2500);
  });
}

function installMicrosoftClarity() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.getElementById("microsoft-clarity-script")) return;
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const clarityEnabled =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_CLARITY_IN_DEV === "1";
  if (!clarityEnabled || !clarityProjectId) return;

  if (typeof window.clarity !== "function") {
    const stub: ClarityStub = (...args: unknown[]) => {
      stub.q ||= [];
      stub.q.push(args);
    };
    window.clarity = stub;
  }

  const script = document.createElement("script");
  script.id = "microsoft-clarity-script";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${clarityProjectId}`;
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
