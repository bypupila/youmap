export type CatalogPlaceType = "country" | "city";

export interface CatalogPlaceMatch {
  kind: CatalogPlaceType;
  countryCode: string;
  countryName: string;
  city?: string | null;
  region?: string | null;
  matchedText: string;
  normalizedPlace: string;
  ambiguous: boolean;
}

interface CountryCatalogEntry {
  countryCode: string;
  countryName: string;
  aliases: string[];
  ambiguous?: boolean;
}

interface CityCatalogEntry {
  city: string;
  countryCode: string;
  countryName: string;
  aliases: string[];
  region?: string | null;
  ambiguous?: boolean;
}

const COUNTRY_CATALOG: CountryCatalogEntry[] = [
  { countryCode: "MX", countryName: "Mexico", aliases: ["mexico", "estados unidos mexicanos"] },
  { countryCode: "US", countryName: "United States", aliases: ["usa", "united states", "estados unidos", "eeuu", "u.s.a", "u.s."] },
  { countryCode: "JP", countryName: "Japan", aliases: ["japan", "japon"] },
  { countryCode: "ES", countryName: "Spain", aliases: ["spain", "espana", "españa"] },
  { countryCode: "FR", countryName: "France", aliases: ["france", "francia"] },
  { countryCode: "IT", countryName: "Italy", aliases: ["italy", "italia"] },
  { countryCode: "BR", countryName: "Brazil", aliases: ["brazil", "brasil"] },
  { countryCode: "AR", countryName: "Argentina", aliases: ["argentina"] },
  { countryCode: "CL", countryName: "Chile", aliases: ["chile"] },
  { countryCode: "CO", countryName: "Colombia", aliases: ["colombia"] },
  { countryCode: "PE", countryName: "Peru", aliases: ["peru", "perú"] },
  { countryCode: "GB", countryName: "United Kingdom", aliases: ["uk", "u.k.", "united kingdom", "reino unido", "england", "inglaterra"] },
  { countryCode: "DE", countryName: "Germany", aliases: ["germany", "alemania"] },
  { countryCode: "IN", countryName: "India", aliases: ["india"] },
  { countryCode: "TH", countryName: "Thailand", aliases: ["thailand", "tailandia"] },
  { countryCode: "KR", countryName: "South Korea", aliases: ["south korea", "korea", "corea", "corea del sur"] },
  { countryCode: "CN", countryName: "China", aliases: ["china"] },
  { countryCode: "EG", countryName: "Egypt", aliases: ["egypt", "egipto"] },
  { countryCode: "MA", countryName: "Morocco", aliases: ["morocco", "marruecos"] },
  { countryCode: "ZA", countryName: "South Africa", aliases: ["south africa", "sudafrica", "sudáfrica"] },
  { countryCode: "AU", countryName: "Australia", aliases: ["australia"] },
  { countryCode: "NZ", countryName: "New Zealand", aliases: ["new zealand", "nueva zelanda"] },
  { countryCode: "TR", countryName: "Turkey", aliases: ["turkey", "turquia", "turquía"] },
  { countryCode: "PT", countryName: "Portugal", aliases: ["portugal"] },
  { countryCode: "SA", countryName: "Saudi Arabia", aliases: ["saudi arabia", "arabia saudita", "saudi"] },
  { countryCode: "SG", countryName: "Singapore", aliases: ["singapore", "singapur"] },
  { countryCode: "VN", countryName: "Vietnam", aliases: ["vietnam"] },
  { countryCode: "ID", countryName: "Indonesia", aliases: ["indonesia"] },
  { countryCode: "CA", countryName: "Canada", aliases: ["canada", "canadá"] },
  { countryCode: "IS", countryName: "Iceland", aliases: ["iceland", "islandia"] },
  { countryCode: "JO", countryName: "Jordan", aliases: ["jordan"], ambiguous: true },
  { countryCode: "GE", countryName: "Georgia", aliases: ["georgia"], ambiguous: true },
];

const CITY_CATALOG: CityCatalogEntry[] = [
  { city: "Ciudad de Mexico", countryCode: "MX", countryName: "Mexico", aliases: ["cdmx", "ciudad de mexico", "mexico df", "mexico city"] },
  { city: "New York City", countryCode: "US", countryName: "United States", aliases: ["new york", "nyc", "nueva york"] },
  { city: "Los Angeles", countryCode: "US", countryName: "United States", aliases: ["los angeles", "la"] },
  { city: "Las Vegas", countryCode: "US", countryName: "United States", aliases: ["las vegas"] },
  { city: "Miami", countryCode: "US", countryName: "United States", aliases: ["miami"] },
  { city: "Tokyo", countryCode: "JP", countryName: "Japan", aliases: ["tokyo", "tokio"] },
  { city: "Kyoto", countryCode: "JP", countryName: "Japan", aliases: ["kyoto"] },
  { city: "Osaka", countryCode: "JP", countryName: "Japan", aliases: ["osaka"] },
  { city: "Madrid", countryCode: "ES", countryName: "Spain", aliases: ["madrid"] },
  { city: "Barcelona", countryCode: "ES", countryName: "Spain", aliases: ["barcelona"] },
  { city: "Sevilla", countryCode: "ES", countryName: "Spain", aliases: ["sevilla", "seville"] },
  { city: "Valencia", countryCode: "ES", countryName: "Spain", aliases: ["valencia"] },
  { city: "Paris", countryCode: "FR", countryName: "France", aliases: ["paris"], ambiguous: true },
  { city: "Rome", countryCode: "IT", countryName: "Italy", aliases: ["rome", "roma"] },
  { city: "Milan", countryCode: "IT", countryName: "Italy", aliases: ["milan", "milan italy"] },
  { city: "Venice", countryCode: "IT", countryName: "Italy", aliases: ["venice", "venecia"] },
  { city: "Rio de Janeiro", countryCode: "BR", countryName: "Brazil", aliases: ["rio de janeiro", "rio"] },
  { city: "Sao Paulo", countryCode: "BR", countryName: "Brazil", aliases: ["sao paulo", "são paulo"] },
  { city: "Buenos Aires", countryCode: "AR", countryName: "Argentina", aliases: ["buenos aires"] },
  { city: "Mendoza", countryCode: "AR", countryName: "Argentina", aliases: ["mendoza"] },
  { city: "Santiago", countryCode: "CL", countryName: "Chile", aliases: ["santiago"], ambiguous: true },
  { city: "Valparaiso", countryCode: "CL", countryName: "Chile", aliases: ["valparaiso", "valparaíso"] },
  { city: "Bogota", countryCode: "CO", countryName: "Colombia", aliases: ["bogota", "bogotá"] },
  { city: "Medellin", countryCode: "CO", countryName: "Colombia", aliases: ["medellin", "medellín"] },
  { city: "Cartagena", countryCode: "CO", countryName: "Colombia", aliases: ["cartagena"] },
  { city: "Lima", countryCode: "PE", countryName: "Peru", aliases: ["lima"] },
  { city: "Cusco", countryCode: "PE", countryName: "Peru", aliases: ["cusco", "cuzco"] },
  { city: "London", countryCode: "GB", countryName: "United Kingdom", aliases: ["london", "londres"] },
  { city: "Berlin", countryCode: "DE", countryName: "Germany", aliases: ["berlin", "berlín"] },
  { city: "Munich", countryCode: "DE", countryName: "Germany", aliases: ["munich", "munchen", "múnich"] },
  { city: "New Delhi", countryCode: "IN", countryName: "India", aliases: ["new delhi", "nueva delhi"] },
  { city: "Mumbai", countryCode: "IN", countryName: "India", aliases: ["mumbai", "bombay"] },
  { city: "Bangkok", countryCode: "TH", countryName: "Thailand", aliases: ["bangkok"] },
  { city: "Phuket", countryCode: "TH", countryName: "Thailand", aliases: ["phuket"] },
  { city: "Seoul", countryCode: "KR", countryName: "South Korea", aliases: ["seoul", "seúl"] },
  { city: "Beijing", countryCode: "CN", countryName: "China", aliases: ["beijing", "pekin", "pekin"] },
  { city: "Shanghai", countryCode: "CN", countryName: "China", aliases: ["shanghai"] },
  { city: "Cairo", countryCode: "EG", countryName: "Egypt", aliases: ["cairo", "el cairo"] },
  { city: "Marrakesh", countryCode: "MA", countryName: "Morocco", aliases: ["marrakesh", "marrakech"] },
  { city: "Casablanca", countryCode: "MA", countryName: "Morocco", aliases: ["casablanca"] },
  { city: "Cape Town", countryCode: "ZA", countryName: "South Africa", aliases: ["cape town", "ciudad del cabo"] },
  { city: "Sydney", countryCode: "AU", countryName: "Australia", aliases: ["sydney", "sidney"] },
  { city: "Melbourne", countryCode: "AU", countryName: "Australia", aliases: ["melbourne"] },
  { city: "Auckland", countryCode: "NZ", countryName: "New Zealand", aliases: ["auckland"] },
  { city: "Queenstown", countryCode: "NZ", countryName: "New Zealand", aliases: ["queenstown"] },
  { city: "Istanbul", countryCode: "TR", countryName: "Turkey", aliases: ["istanbul", "estambul"] },
  { city: "Lisbon", countryCode: "PT", countryName: "Portugal", aliases: ["lisbon", "lisboa"] },
  { city: "Porto", countryCode: "PT", countryName: "Portugal", aliases: ["porto", "oporto"] },
  { city: "Riyadh", countryCode: "SA", countryName: "Saudi Arabia", aliases: ["riyadh", "riad"] },
  { city: "Jeddah", countryCode: "SA", countryName: "Saudi Arabia", aliases: ["jeddah", "yeda"] },
  { city: "Singapore", countryCode: "SG", countryName: "Singapore", aliases: ["singapore", "singapur"] },
  { city: "Hanoi", countryCode: "VN", countryName: "Vietnam", aliases: ["hanoi", "hanoi"] },
  { city: "Ho Chi Minh City", countryCode: "VN", countryName: "Vietnam", aliases: ["ho chi minh", "ho chi minh city", "saigon"] },
  { city: "Bali", countryCode: "ID", countryName: "Indonesia", aliases: ["bali"], region: "Bali" },
  { city: "Jakarta", countryCode: "ID", countryName: "Indonesia", aliases: ["jakarta"] },
  { city: "Toronto", countryCode: "CA", countryName: "Canada", aliases: ["toronto"] },
  { city: "Montreal", countryCode: "CA", countryName: "Canada", aliases: ["montreal", "montréal"] },
  { city: "Vancouver", countryCode: "CA", countryName: "Canada", aliases: ["vancouver"] },
  { city: "Reykjavik", countryCode: "IS", countryName: "Iceland", aliases: ["reykjavik", "reikiavik"] },
  { city: "Amman", countryCode: "JO", countryName: "Jordan", aliases: ["amman"] },
  { city: "Tbilisi", countryCode: "GE", countryName: "Georgia", aliases: ["tbilisi", "tiflis"] },
];

export const TRAVEL_KEYWORDS = [
  "travel",
  "trip",
  "journey",
  "viaje",
  "viajes",
  "turismo",
  "adventure",
  "aventura",
  "vacaciones",
  "vacation",
  "world tour",
  "road trip",
  "roadtrip",
  "backpacking",
  "nomad",
  "hotel",
  "hostel",
  "airport",
  "flight",
  "vuelo",
  "country",
  "pais",
  "país",
  "city",
  "ciudad",
  "capital",
  "beach",
  "playa",
  "island",
  "isla",
  "mountain",
  "montana",
  "montaña",
];

export const NON_TRAVEL_PLAYLIST_KEYWORDS = [
  "shorts",
  "clips",
  "clip",
  "podcast",
  "music",
  "album",
  "interview",
  "reaction",
  "stream",
  "live",
  "gaming",
];

export function normalizeForLookup(input: string) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsWholePhrase(normalizedText: string, phrase: string) {
  const normalizedPhrase = normalizeForLookup(phrase).trim();
  if (!normalizedPhrase) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}([^a-z0-9]|$)`);
  return pattern.test(normalizedText);
}

export function stripBoilerplate(rawText: string | null | undefined) {
  const input = String(rawText || "");
  const withoutUrls = input.replace(/https?:\/\/\S+/gi, " ");
  const withoutPromo = withoutUrls.replace(/(affiliate|sponsor|sponsored|discount code|codigo|código)[^\n]*/gi, " ");
  return withoutPromo.replace(/\s+/g, " ").trim();
}

export function flagToCountryCode(text: string): string | null {
  const codepoints = Array.from(String(text || "")).map((char) => char.codePointAt(0) || 0);
  const base = 0x1f1e6;
  for (let index = 0; index < codepoints.length - 1; index += 1) {
    const first = codepoints[index];
    const second = codepoints[index + 1];
    if (first < base || first > base + 25) continue;
    if (second < base || second > base + 25) continue;
    return `${String.fromCharCode(first - base + 65)}${String.fromCharCode(second - base + 65)}`;
  }
  return null;
}

export function getCountryCatalogEntry(countryCode: string | null | undefined) {
  const normalized = String(countryCode || "").trim().toUpperCase();
  return COUNTRY_CATALOG.find((entry) => entry.countryCode === normalized) || null;
}

export function detectCatalogPlaces(rawText: string | null | undefined): CatalogPlaceMatch[] {
  const normalizedText = normalizeForLookup(stripBoilerplate(rawText));
  if (!normalizedText) return [];

  const results: CatalogPlaceMatch[] = [];
  const seen = new Set<string>();

  for (const country of COUNTRY_CATALOG) {
    for (const alias of country.aliases) {
      if (!containsWholePhrase(normalizedText, alias)) continue;
      const key = `country:${country.countryCode}`;
      if (seen.has(key)) break;
      seen.add(key);
      results.push({
        kind: "country",
        countryCode: country.countryCode,
        countryName: country.countryName,
        matchedText: alias,
        normalizedPlace: normalizeForLookup(country.countryName),
        ambiguous: Boolean(country.ambiguous),
      });
      break;
    }
  }

  for (const city of CITY_CATALOG) {
    for (const alias of city.aliases) {
      if (!containsWholePhrase(normalizedText, alias)) continue;
      const key = `city:${city.city}:${city.countryCode}`;
      if (seen.has(key)) break;
      seen.add(key);
      results.push({
        kind: "city",
        countryCode: city.countryCode,
        countryName: city.countryName,
        city: city.city,
        region: city.region || null,
        matchedText: alias,
        normalizedPlace: normalizeForLookup(`${city.city}, ${city.countryName}`),
        ambiguous: Boolean(city.ambiguous),
      });
      break;
    }
  }

  return results;
}
