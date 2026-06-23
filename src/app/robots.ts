import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/map", "/explore", "/pricing", "/terms", "/privacy", "/u/"],
      disallow: [
        "/api/",
        "/admin",
        "/auth",
        "/brand-portal",
        "/country-card-proposals",
        "/creator-panel",
        "/dashboard",
        "/demo-diseno",
        "/map-admin-proposal",
        "/map-proposal",
        "/map-proposal-2",
        "/map-proposal-v1",
        "/onboarding",
        "/sponsor-report",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
