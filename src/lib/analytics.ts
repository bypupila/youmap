import type { TravelVideoLocation } from "@/lib/types";

export interface ChannelAnalytics {
  top_countries: Array<{ country_name: string; video_count: number }>;
  videos_by_month: Array<{ month: string; count: number }>;
  unlocated_videos: Array<{ id: string; title: string; view_count: number }>;
  total_countries: number;
  total_mapped_videos: number;
  total_views: number;
  monthly_visitors: number;
}

export function buildAnalyticsFromVideoLocations(
  videoLocations: TravelVideoLocation[],
  options?: { importedVideos?: number; monthlyVisitors?: number }
): ChannelAnalytics {
  const primaryVideos = uniqueByVideo(videoLocations);
  const topCountriesMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();

  for (const video of primaryVideos) {
    const countryName = video.country_name || video.country_code || "Unknown";
    topCountriesMap.set(countryName, (topCountriesMap.get(countryName) || 0) + 1);

    if (video.published_at) {
      const month = String(video.published_at).slice(0, 7);
      if (month) {
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      }
    }
  }

  const top_countries = Array.from(topCountriesMap.entries())
    .map(([country_name, video_count]) => ({ country_name, video_count }))
    .sort((a, b) => b.video_count - a.video_count || a.country_name.localeCompare(b.country_name))
    .slice(0, 8);

  const videos_by_month = Array.from(monthlyMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const total_views = primaryVideos.reduce((sum, video) => sum + Number(video.view_count || 0), 0);
  const total_mapped_videos = primaryVideos.length;
  const total_countries = new Set(primaryVideos.map((video) => video.country_code).filter(Boolean)).size;
  const monthly_visitors = options?.monthlyVisitors || Math.max(1200, Math.round(total_views * 0.08));

  return {
    top_countries,
    videos_by_month,
    unlocated_videos: [],
    total_countries,
    total_mapped_videos,
    total_views,
    monthly_visitors,
  };
}

function uniqueByVideo(videoLocations: TravelVideoLocation[]) {
  const byVideo = new Map<string, TravelVideoLocation>();

  for (const location of videoLocations) {
    if (!location.youtube_video_id) continue;
    if (!byVideo.has(location.youtube_video_id)) {
      byVideo.set(location.youtube_video_id, location);
    }
  }

  return Array.from(byVideo.values());
}
