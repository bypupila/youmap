import type { Metadata } from "next";
import { ExplorePageClient } from "@/components/explore/explore-page-client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Explorar creadores por destino | TravelYourMap",
  description: "Explora países, creadores y videos con una vista editorial centrada en destinos y rutas.",
  openGraph: {
    title: "Explorar creadores por destino | TravelYourMap",
    description: "Directorio visual de creadores y videos por destino para discovery y SEO.",
    type: "website",
    url: `${siteUrl}/explore`,
    siteName: "TravelYourMap - BY PUPILA",
  },
};

export default function ExplorePage() {
  return <ExplorePageClient />;
}
