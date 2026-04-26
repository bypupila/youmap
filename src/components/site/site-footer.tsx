import Link from "next/link";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
  /**
   * When true, renders with a transparent background to sit on top of an
   * existing decorated section (e.g. landing hero). Defaults to false.
   */
  transparent?: boolean;
}

const productLinks = [
  { href: "/explore", label: "Explorar creadores" },
  { href: "/map", label: "Ver demo del mapa" },
  { href: "/pricing", label: "Planes y precios" },
];

const accountLinks = [
  { href: "/auth", label: "Iniciar sesión" },
  { href: "/onboarding", label: "Crear cuenta" },
];

export function SiteFooter({ className, transparent = false }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "relative z-20 mt-12 border-t border-white/10",
        transparent ? "bg-transparent" : "bg-black/30 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 md:px-6 md:py-12">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="min-w-0">
            <Link
              href="/"
              aria-label="Ir al inicio de YouMap"
              className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="yt-logo-badge">
                <GlobeHemisphereWest size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="text-[18px] font-semibold tracking-tight text-foreground">YouMap</span>
            </Link>
            <p className="mt-4 max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
              Convierte tu canal de YouTube en un mapa interactivo con globo 3D, analítica por país y página pública lista para discovery.
            </p>
          </div>

          <nav aria-label="Producto" className="min-w-0">
            <p className="yt-overline">Producto</p>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Cuenta" className="min-w-0">
            <p className="yt-overline">Cuenta</p>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {year} YouMap. Todos los derechos reservados.</p>
          <p className="text-[11px] uppercase tracking-[0.18em]">YouMap by Pupila</p>
        </div>
      </div>
    </footer>
  );
}
