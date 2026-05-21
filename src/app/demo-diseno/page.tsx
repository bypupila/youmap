import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";
import { DemoDisenoClient } from "./demo-client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Propuestas de Diseño DesktopVideoMapCard | TravelYourMap",
  description: "Demostración de 3 propuestas de diseño premium e interactivas del componente de reproducción de video en mapa.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DemoDisenoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { videoLocations } = await loadLuisitoMapData();

  return (
    <main className="min-h-screen bg-[#020509] text-white">
      <DemoDisenoClient videoLocations={videoLocations} />
    </main>
  );
}
