import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapProposalV1Client } from "@/app/map-proposal-v1/map-proposal-v1-client";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mapa ROAM v1 permisos | TravelYourMap",
  description: "Vista de map-experience en modo demo, viewer y creator para validar permisos.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MapProposalV1Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { channel, videoLocations } = await loadLuisitoMapData();

  return <MapProposalV1Client channel={channel} videoLocations={videoLocations} />;
}
