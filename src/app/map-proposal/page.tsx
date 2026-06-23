import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapProposalPrototype } from "@/components/map/map-proposal-prototype";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Prototipo de mapa ROAM | TravelYourMap",
  description: "Propuesta visual aislada para evaluar una nueva version del mapa con datos demo de Luisito Comunica.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function MapProposalPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { channel, videoLocations } = await loadLuisitoMapData();

  return (
    <main className="min-h-[100dvh] bg-[#03080d] text-white">
      <MapProposalPrototype channel={channel} videoLocations={videoLocations} />
    </main>
  );
}
