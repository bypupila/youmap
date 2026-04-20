import { sql } from "@/lib/neon";
import { loadDrewMapData } from "@/lib/drew-map-data";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";

export interface PlatformVideoStats {
  total_videos: number;
  total_countries: number;
  demo_videos: number;
  user_videos: number;
  demo_countries: number;
  user_countries: number;
}

interface DemoDatasetStats {
  videoCount: number;
  countryCodes: Set<string>;
}

let demoDatasetStatsPromise: Promise<DemoDatasetStats> | null = null;

async function resolveDemoDatasetStats() {
  if (!demoDatasetStatsPromise) {
    demoDatasetStatsPromise = Promise.all([loadLuisitoMapData(), loadDrewMapData()])
      .then(([luisito, drew]) => {
        const countryCodes = new Set<string>();
        for (const video of [...luisito.videoLocations, ...drew.videoLocations]) {
          const code = String(video.country_code || "").trim().toUpperCase();
          if (code) countryCodes.add(code);
        }

        return {
          videoCount: luisito.videoLocations.length + drew.videoLocations.length,
          countryCodes,
        };
      })
      .catch((error) => {
        demoDatasetStatsPromise = null;
        throw error;
      });
  }

  return demoDatasetStatsPromise;
}

async function resolveUserMappedVideosCount() {
  const rows = await sql<Array<{ total_videos: number }>>`
    select count(*)::int as total_videos
    from public.videos
    where location_status in ('mapped', 'verified_auto', 'verified_manual')
  `;

  return rows[0]?.total_videos || 0;
}

async function resolveUserMappedCountryCodes() {
  const rows = await sql<Array<{ country_code: string }>>`
    select distinct upper(vl.country_code) as country_code
    from public.video_locations vl
    inner join public.videos v on v.id = vl.video_id
    where vl.is_primary = true
      and v.location_status in ('mapped', 'verified_auto', 'verified_manual')
      and coalesce(v.is_travel, true) = true
      and coalesce(v.is_short, false) = false
      and vl.country_code is not null
      and length(trim(vl.country_code)) > 0
  `;

  return new Set(rows.map((row) => String(row.country_code || "").trim().toUpperCase()).filter(Boolean));
}

export async function resolvePlatformVideoStats(): Promise<PlatformVideoStats> {
  const [demoStats, userVideos, userCountryCodes] = await Promise.all([
    resolveDemoDatasetStats(),
    resolveUserMappedVideosCount(),
    resolveUserMappedCountryCodes(),
  ]);

  const totalCountryCodes = new Set([...demoStats.countryCodes, ...userCountryCodes]);

  return {
    total_videos: demoStats.videoCount + userVideos,
    total_countries: totalCountryCodes.size,
    demo_videos: demoStats.videoCount,
    user_videos: userVideos,
    demo_countries: demoStats.countryCodes.size,
    user_countries: userCountryCodes.size,
  };
}
