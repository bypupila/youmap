"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GlobeHemisphereWest,
  Gear,
  CreditCard,
  Compass,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { FloatingTopBar } from "@/components/design-system/chrome";
import { cn } from "@/lib/utils";

/**
 * AppShell is the persistent chrome for authenticated, non-fullscreen pages
 * (Settings, Billing, future Sponsors hub, etc.). The Dashboard intentionally
 * does NOT use this shell because it ships its own fullscreen `MapExperience`
 * with bespoke overlay UI.
 *
 * Layout:
 *   - Desktop:  top bar + left rail navigation + content
 *   - Mobile:   top bar + horizontally scrollable nav strip + content
 */

interface NavItem {
  href: string;
  label: string;
  icon: PhosphorIcon;
  /** Optional override for the active-state matcher. Defaults to startsWith. */
  match?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Mapa", icon: GlobeHemisphereWest },
  { href: "/explore", label: "Explorar", icon: Compass },
  { href: "/settings", label: "Cuenta", icon: Gear },
  { href: "/billing", label: "Facturación", icon: CreditCard },
];

interface AppShellProps {
  /** Eyebrow + title for the FloatingTopBar. */
  topbar: {
    eyebrow: string;
    title: string;
    actions?: ReactNode;
  };
  children: ReactNode;
}

export function AppShell({ topbar, children }: AppShellProps) {
  const pathname = usePathname() ?? "/";

  return (
    <main className="ym-bg relative min-h-[100dvh] text-foreground">
      <header className="px-4 py-3">
        <FloatingTopBar
          eyebrow={topbar.eyebrow}
          title={topbar.title}
          actions={topbar.actions}
        />
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 pb-12 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 md:px-6">
        <nav
          aria-label="Navegación de la cuenta"
          className="md:sticky md:top-24 md:self-start"
        >
          {/* Mobile: horizontal scrollable strip */}
          <ul className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} variant="strip" />
            ))}
          </ul>

          {/* Desktop: vertical rail */}
          <ul className="hidden flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} variant="rail" />
            ))}
          </ul>
        </nav>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  variant: "rail" | "strip";
}

function NavLink({ item, pathname, variant }: NavLinkProps) {
  const matcher = item.match ?? ((p: string) => p === item.href || p.startsWith(`${item.href}/`));
  const isActive = matcher(pathname);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          variant === "rail" ? "px-4 py-2.5" : "shrink-0 px-3 py-2",
          isActive
            ? "bg-[rgba(255,0,0,0.14)] text-[#ffd5d5] shadow-[inset_0_0_0_1px_rgba(255,0,0,0.28)]"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        )}
      >
        <Icon
          size={16}
          weight={isActive ? "fill" : "regular"}
          aria-hidden="true"
        />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
