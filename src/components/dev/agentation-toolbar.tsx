"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(() => import("agentation").then((module) => module.Agentation), {
  ssr: false,
});

export function AgentationToolbar() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Show by default in local dev; allow opting out explicitly.
  if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "off") {
    return null;
  }

  return <Agentation className="tm-agentation-overlay" />;
}
