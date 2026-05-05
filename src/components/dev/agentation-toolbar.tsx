"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(() => import("agentation").then((module) => module.Agentation), {
  ssr: false,
});

export function AgentationToolbar() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Agentation is opt-in in local dev because its feedback surface can sit above the app
  // and block clicks if it is mounted during normal QA.
  if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== "overlay") {
    return null;
  }

  return <Agentation className="tm-agentation-overlay" />;
}
