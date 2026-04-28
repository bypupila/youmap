"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(() => import("agentation").then((module) => module.Agentation), {
  ssr: false,
});

export function AgentationToolbar() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== "1") {
    return null;
  }

  return <Agentation />;
}
