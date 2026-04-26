import type { ReactNode } from "react";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { SiteFooter } from "@/components/site/site-footer";
import { cn } from "@/lib/utils";

interface MarketingTopBarConfig {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  centerContent?: ReactNode;
  searchInput?: ReactNode;
  /** Make the header sticky to the viewport top. Defaults to false. */
  sticky?: boolean;
  className?: string;
}

interface MarketingShellProps {
  children: ReactNode;
  /**
   * When provided, renders the canonical YouMap topbar inside a header.
   * Pass `false` (or omit) to skip — useful for pages that own their hero.
   */
  topbar?: MarketingTopBarConfig | false;
  /**
   * When `false`, suppresses the default <SiteFooter />. Defaults to true.
   */
  footer?: boolean;
  /**
   * Extra class names to apply to the outer <main>. The shell already
   * sets `min-h-[100dvh]`, the brand background, and stacking context.
   */
  className?: string;
  /**
   * Extra class names to apply to the inner content wrapper that contains
   * the page children (between header and footer).
   */
  contentClassName?: string;
}

/**
 * Shared chrome for anonymous pages (auth, pricing, explore, 404, etc).
 *
 * Replaces the duplicated background gradient + topbar header + footer that
 * each of those pages used to inline. Authenticated/dashboard pages keep
 * their own bespoke chrome (the map fullscreen experience), which is why
 * this component is intentionally scoped to the marketing surface.
 */
export function MarketingShell({
  children,
  topbar,
  footer = true,
  className,
  contentClassName,
}: MarketingShellProps) {
  return (
    <main className={cn("ym-bg relative isolate flex min-h-[100dvh] flex-col text-foreground", className)}>
      {topbar ? (
        <header
          className={cn(
            "relative z-30 px-4 py-3",
            topbar.sticky && "sticky top-0 backdrop-blur",
            topbar.className,
          )}
        >
          <FloatingTopBar
            eyebrow={topbar.eyebrow}
            title={topbar.title}
            actions={topbar.actions}
            centerContent={topbar.centerContent}
            searchInput={topbar.searchInput}
          />
        </header>
      ) : null}

      <div className={cn("relative z-10 flex-1", contentClassName)}>{children}</div>

      {footer ? <SiteFooter /> : null}
    </main>
  );
}
