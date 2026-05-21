import type { Metadata } from "next";
import { MapProposalPrototype2 as MapProposalPrototype2V1 } from "@/components/map/map-proposal-prototype-2-v1";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa ROAM v1 archivado | TravelYourMap",
  description: "Snapshot del mapa compartido antes de separar las reglas de viewer y creator.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MapProposalV1Page() {
  const { channel, videoLocations } = await loadLuisitoMapData();

  return (
    <main className="h-screen overflow-hidden bg-[#03080d] text-white">
      <MapProposalPrototype2V1 channel={channel} videoLocations={videoLocations} />
    </main>
  );
}
