import type { Metadata } from "next";
import { ExplorePageClient } from "@/components/explore/explore-page-client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Explora creadores por destino",
  description: "Descubre países, creadores y videos en una experiencia visual organizada por destino.",
  openGraph: {
    title: "Explora creadores por destino · YouMap",
    description: "Directorio visual de creadores y videos por país para discovery y SEO.",
    type: "website",
    url: `${siteUrl}/explore`,
    siteName: "YouMap",
  },
};

export default function ExplorePage() {
  return <ExplorePageClient />;
}
