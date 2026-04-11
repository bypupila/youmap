export interface PlanDefinition {
  slug: "free" | "creator" | "creator_pro" | "agency";
  checkoutSlug: string | null;
  name: string;
  price: string;
  badge?: string;
  featured?: boolean;
  tone: "free" | "creator" | "pro" | "agency";
  description: string;
  features: string[];
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    slug: "free",
    checkoutSlug: null,
    name: "Free",
    price: "$0",
    tone: "free",
    description: "Gancho de conversión para ver el mapa y validar el canal.",
    features: ["1 canal", "Hasta 50 videos", "Mapa público", "Importación básica"],
  },
  {
    slug: "creator",
    checkoutSlug: "starter",
    name: "Creator",
    price: "$29/mes",
    tone: "creator",
    description: "Plan core para creadores individuales.",
    features: ["Videos ilimitados", "1 sponsor", "Analytics básicos", "Mapa con branding limpio"],
  },
  {
    slug: "creator_pro",
    checkoutSlug: "pro",
    name: "Creator Pro",
    price: "$79/mes",
    badge: "Más Vendido",
    featured: true,
    tone: "pro",
    description: "Multi-canal, sponsor hub y analytics más vendible.",
    features: ["Multi-canal", "Competitor analytics", "Sponsor hub", "Sync prioritaria"],
  },
  {
    slug: "agency",
    checkoutSlug: "creator_plus",
    name: "Agency",
    price: "$199/mes",
    tone: "agency",
    description: "Para agencias y marcas que operan portafolios.",
    features: ["Portafolio de canales", "API", "Portal de marcas", "Soporte dedicado"],
  },
];

export function resolveCheckoutPlanSlug(slug: string) {
  return PLAN_DEFINITIONS.find((plan) => plan.slug === slug)?.checkoutSlug || null;
}
