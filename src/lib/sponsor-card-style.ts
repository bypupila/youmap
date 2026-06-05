export type SponsorCardStyle = "cta_red" | "coupon_yellow" | "premium_strip";
export type SponsorCardVariant = SponsorCardStyle | "multi_bar";

export const SPONSOR_CARD_STYLE_OPTIONS: Array<{
  value: SponsorCardStyle;
  label: string;
  description: string;
}> = [
  {
    value: "cta_red",
    label: "CTA rojo",
    description: "Banda de conversión fuerte, ideal para un sponsor principal con oferta clara.",
  },
  {
    value: "coupon_yellow",
    label: "Cupón",
    description: "Look de cupón o ticket, mejor para códigos, descuentos y beneficios concretos.",
  },
  {
    value: "premium_strip",
    label: "Pill blanco",
    description: "Etiqueta flotante blanca como HEYMONDO, pensada para un sponsor de marca sin cupón visible.",
  },
];

export function normalizeSponsorCardStyle(value: string | null | undefined): SponsorCardStyle | null {
  const normalized = String(value || "").trim();
  if (normalized === "cta_red" || normalized === "coupon_yellow" || normalized === "premium_strip") {
    return normalized;
  }
  return null;
}

export function resolveSponsorCardVariant(
  sponsorCardStyle: string | null | undefined,
  sponsorCount: number
): SponsorCardVariant {
  if (sponsorCount > 1) return "multi_bar";
  return normalizeSponsorCardStyle(sponsorCardStyle) || "cta_red";
}

export function getSponsorCardStyleLabel(
  sponsorCardStyle: string | null | undefined,
  sponsorCount: number
) {
  const variant = resolveSponsorCardVariant(sponsorCardStyle, sponsorCount);
  if (variant === "multi_bar") return "Multi sponsor";
  if (variant === "coupon_yellow") return "Cupón";
  if (variant === "premium_strip") return "Pill blanco";
  return "CTA rojo";
}
