import type { ReactNode } from "react";

/**
 * FullscreenMap is the canonical wrapper for the three pages that render
 * the entire map experience as the page (`/dashboard`, `/u/[username]`,
 * `/map`). Each page used to hand-roll the same JSX:
 *
 *   <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
 *     <div className="absolute inset-0">{map}</div>
 *     <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(...)]" />
 *   </main>
 *
 * Centralizing it keeps the gradient overlay consistent and prevents future
 * tweaks from drifting between pages.
 */
export function FullscreenMap({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="absolute inset-0">{children}</div>
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,22,0.34),rgba(17,20,22,0.08)_32%,rgba(17,20,22,0.38))]"
        aria-hidden="true"
      />
    </main>
  );
}
