"use client";

import { Agentation } from "agentation";

export function AgentationToolbar() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== "1") {
    return null;
  }

  return <Agentation />;
}
