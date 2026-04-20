import { sql } from "@/lib/neon";
import { loadDrewMapData } from "@/lib/drew-map-data";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

export interface PlatformVideoStats {
  total_videos: number;
  demo_videos: number;
  user_videos: number;
}

let demoVideosCountPromise: Promise<number> | null = null;

async function resolveDemoVideosCount() {
  if (!demoVideosCountPromise) {
    demoVideosCountPromise = Promise.all([loadLuisitoMapData(), loadDrewMapData()])
      .then(([luisito, drew]) => luisito.videoLocations.length + drew.videoLocations.length)
      .catch((error) => {
        demoVideosCountPromise = null;
        throw error;
      });
  }

  return demoVideosCountPromise;
}

async function resolveUserMappedVideosCount() {
  const rows = await sql<Array<{ total_videos: number }>>`
    select count(*)::int as total_videos
    from public.videos
    where location_status in ('mapped', 'verified_auto', 'verified_manual')
  `;

  return rows[0]?.total_videos || 0;
}

export async function resolvePlatformVideoStats(): Promise<PlatformVideoStats> {
  const [demoVideos, userVideos] = await Promise.all([resolveDemoVideosCount(), resolveUserMappedVideosCount()]);
  return {
    total_videos: demoVideos + userVideos,
    demo_videos: demoVideos,
    user_videos: userVideos,
  };
}
