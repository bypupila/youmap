import type { Metadata } from "next";
import { CinematicLanding } from "@/components/landing/cinematic-landing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "YouMap — Tu canal de YouTube en un mapa interactivo",
  description:
    "Mapa interactivo para creadores: globo 3D, videos geolocalizados, onboarding visual, analítica por país y página pública optimizada para SEO.",
  openGraph: {
    title: "YouMap — Tu canal de YouTube en un mapa interactivo",
    description:
      "Conecta tu canal de YouTube y publica una experiencia geográfica con videos, sponsors y analítica por destino.",
    type: "website",
    url: siteUrl,
    siteName: "YouMap",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouMap — Tu canal de YouTube en un mapa interactivo",
    description:
      "Convierte tu canal en una experiencia visual con un globo interactivo, fans votando destinos y exploración SEO.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <CinematicLanding />;
}
