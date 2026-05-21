import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExperienceV2 } from "@/components/map/map-experience-v2";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Prototipo de mapa ROAM 2 | TravelYourMap",
  description: "Propuesta visual premium rediseñada del mapa con datos demo de Luisito Comunica.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MapProposalPage2() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { channel, videoLocations } = await loadLuisitoMapData();

  return (
    <main className="h-screen overflow-hidden bg-[#03080d] text-white">
      <MapExperienceV2 channel={channel} videoLocations={videoLocations} viewMode="creator" isDemoMode />
    </main>
  );
}
