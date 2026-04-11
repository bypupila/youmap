import { loadLocalMapData } from "@/lib/local-map-loader";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export async function loadDrewMapData(): Promise<{
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}> {
  return loadLocalMapData({
    fileName: "drewbinsky_video_locations.json",
    channel: {
      id: "drew-global-map",
      user_id: "system",
      channel_name: "Drew Binsky · World Map",
      channel_handle: "@drewbinsky",
      thumbnail_url: null,
      subscriber_count: null,
    },
  });
}
