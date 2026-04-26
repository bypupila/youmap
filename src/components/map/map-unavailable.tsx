import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/site/marketing-shell";
import { DEMO_CHANNEL_SLUG } from "@/lib/demo-data";

interface MapUnavailableProps {
  /** Eyebrow above the title — short label like "Mapa no disponible". */
  eyebrow?: string;
  /** Main message shown to the user. */
  title?: string;
  /** Optional supporting copy. */
  description?: string;
  /** When `true` (default) we show the "Open demo map" CTA. */
  showDemoCta?: boolean;
  /** Override the default "Volver al inicio" link target. */
  homeHref?: string;
}

/**
 * Shared empty state for routes that cannot load a map payload (no channel,
 * not subscribed, not found, etc.). Consolidates the two slightly different
 * fallbacks that used to live inside `/dashboard` and `/map` so users see
 * the same shape everywhere — eyebrow + title + description + actions —
 * inside the marketing shell so navigation/footer stay reachable.
 */
export function MapUnavailable({
  eyebrow = "Mapa no disponible",
  title = "No se pudo mostrar el mapa.",
  description = "No encontramos datos para este canal. Probá abrir el mapa demo o volver al inicio.",
  showDemoCta = true,
  homeHref = "/",
}: MapUnavailableProps) {
  return (
    <MarketingShell
      topbar={{
        eyebrow: "YouMap",
        title: eyebrow,
        actions: (
          <Link href={homeHref} className="yt-btn-secondary">
            Inicio
          </Link>
        ),
      }}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-start gap-4 px-4 py-12 md:py-20">
        <p className="text-[12px] uppercase tracking-[0.16em] text-[#aaaaaa]">{eyebrow}</p>
        <h1 className="text-balance text-[28px] font-medium tracking-tight text-[#f1f1f1] md:text-[32px]">
          {title}
        </h1>
        <p className="text-pretty text-[15px] leading-7 text-[#c9c2b8]">{description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {showDemoCta ? (
            <Button asChild>
              <Link href={`/map?channelId=${encodeURIComponent(DEMO_CHANNEL_SLUG)}`}>Abrir demo</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={homeHref}>Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </MarketingShell>
  );
}
