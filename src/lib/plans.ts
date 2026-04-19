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
    description: "Sponsor hub y analytics más vendible.",
    features: ["Videos ilimitados", "Competitor analytics", "Sponsor hub", "Sync prioritaria"],
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

export type CanonicalPlanSlug = PlanDefinition["slug"];

const PLAN_ALIAS_GROUPS: ReadonlyArray<readonly [CanonicalPlanSlug, ...string[]]> = [
  ["free"],
  ["creator", "starter"],
  ["creator_pro", "pro"],
  ["agency", "creator_plus"],
];

const canonicalByAlias = new Map<string, CanonicalPlanSlug>();
const aliasesByCanonical = new Map<CanonicalPlanSlug, string[]>();

for (const group of PLAN_ALIAS_GROUPS) {
  const [canonical, ...aliases] = group;
  const normalizedAliases = Array.from(new Set([canonical, ...aliases].map((slug) => String(slug).trim().toLowerCase()).filter(Boolean)));
  aliasesByCanonical.set(canonical, normalizedAliases);
  for (const alias of normalizedAliases) canonicalByAlias.set(alias, canonical);
}

export function resolveCanonicalPlanSlug(slug: string): CanonicalPlanSlug | null {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  return canonicalByAlias.get(normalized) || null;
}

export function getPlanSlugCandidates(slug: string) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return [];

  const canonical = canonicalByAlias.get(normalized);
  if (!canonical) return [normalized];

  const aliases = aliasesByCanonical.get(canonical) || [canonical];
  return [normalized, ...aliases.filter((alias) => alias !== normalized)];
}

export function resolveCheckoutPlanSlug(slug: string) {
  const canonicalSlug = resolveCanonicalPlanSlug(slug);
  if (!canonicalSlug) return null;
  return PLAN_DEFINITIONS.find((plan) => plan.slug === canonicalSlug)?.checkoutSlug || null;
}
