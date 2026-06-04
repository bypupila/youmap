import { NextResponse } from "next/server";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasTable = await tableExists("public", "platform_ads");
    if (!hasTable) return NextResponse.json({ ad: null });

    const rows = await sql<Array<{ id: string; title: string; description: string | null; cta_label: string | null; href: string | null }>>`
      select id, title, description, cta_label, href
      from public.platform_ads
      where active = true
        and placement = 'video_footer'
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      order by starts_at desc nulls last, created_at desc
      limit 1
    `;

    const ad = rows[0]
      ? {
          id: rows[0].id,
          title: rows[0].title,
          description: rows[0].description,
          cta_label: rows[0].cta_label || "Ver promoción",
          href: rows[0].href || null,
        }
      : null;

    return NextResponse.json({ ad });
  } catch (error) {
    console.error("[api/platform-ads/active GET]", error);
    return NextResponse.json({ ad: null }, { status: 500 });
  }
}
