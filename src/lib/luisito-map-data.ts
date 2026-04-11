import { loadLocalMapData } from "@/lib/local-map-loader";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export async function loadLuisitoMapData(): Promise<{
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}> {
  return loadLocalMapData({
    fileName: "luisitocomunica_video_locations.json",
    channel: {
      id: "luisito-global-map",
      user_id: "system",
      channel_name: "Luisito Comunica · Mapa Global",
      channel_handle: "@luisitocomunica",
      thumbnail_url: null,
      subscriber_count: null,
    },
  });
}
