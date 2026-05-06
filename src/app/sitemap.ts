import type { MetadataRoute } from "next";
import { sql } from "@/lib/neon";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type PublicProfileRow = {
  username: string;
  updated_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/map`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/explore`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/pricing`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/auth`, changeFrequency: "weekly", priority: 0.5 },
  ];

  if (!process.env.DATABASE_URL) {
    return staticRoutes;
  }

  let profiles: PublicProfileRow[] = [];
  try {
    profiles = await sql<PublicProfileRow[]>`
      select
        u.username,
        c.updated_at
      from public.channels c
      inner join public.users u on u.id = c.user_id
      where c.is_public = true
      order by c.updated_at desc nulls last
      limit 5000
    `;
  } catch (error) {
    console.warn("sitemap: failed to load public profiles, returning static routes only", error);
    return staticRoutes;
  }

  const profileRoutes: MetadataRoute.Sitemap = profiles.map((row) => ({
    url: `${siteUrl}/u/${encodeURIComponent(row.username)}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...profileRoutes];
}
