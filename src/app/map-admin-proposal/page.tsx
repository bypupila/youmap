import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapAdminProposalPrototype } from "@/components/map/map-admin-proposal-prototype";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Panel de Administrador ROAM | TravelYourMap",
  description: "Propuesta visual premium del panel de administración del creador.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MapAdminProposalPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { channel, videoLocations } = await loadLuisitoMapData();

  return (
    <main className="h-screen overflow-hidden bg-[#030609] text-white">
      <MapAdminProposalPrototype channel={channel} videoLocations={videoLocations} />
    </main>
  );
}
