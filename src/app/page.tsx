import type { Metadata } from "next";
import { CinematicLanding } from "@/components/landing/cinematic-landing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TravelMap - BY PUPILA",
  description:
    "Mapa interactivo para creadores de viajes: globo 3D, videos geolocalizados, onboarding visual, analytics por país y página pública SEO.",
  openGraph: {
    title: "TravelMap - BY PUPILA",
    description:
      "Arranca con un mapa vivo, conecta tu canal de YouTube y publica una experiencia geográfica con videos, sponsors y analytics.",
    type: "website",
    url: siteUrl,
    siteName: "TravelMap - BY PUPILA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TravelMap - BY PUPILA",
    description:
      "Convierte tu canal de viajes en una experiencia visual con un globo interactivo, fans votando destinos y exploración SEO.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <CinematicLanding />;
}
