import { sql } from "@/lib/neon";

export async function invalidateExpiredYouTubeStatistics() {
  const nowIso = new Date().toISOString();
  const rows = await sql<Array<{ id: string }>>`
    update public.videos
    set
      view_count = 0,
      like_count = null,
      comment_count = null,
      youtube_data_refreshed_at = null,
      updated_at = ${nowIso}
    where youtube_data_expires_at is not null
      and youtube_data_expires_at <= now()
      and (
        coalesce(view_count, 0) > 0
        or like_count is not null
        or comment_count is not null
        or youtube_data_refreshed_at is not null
      )
    returning id
  `;

  return {
    invalidatedVideos: rows.length,
    executedAt: nowIso,
  };
}
