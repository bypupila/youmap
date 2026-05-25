import { NextResponse } from "next/server";
import { loadPublicStatus } from "@/lib/public-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await loadPublicStatus();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[api/status GET]", error);
    return NextResponse.json(
      {
        generated_at: new Date().toISOString(),
        overall_status: "incident",
        services: [
          {
            key: "status_page",
            label: "Estado publico",
            status: "incident",
            detail: "No se pudo calcular el estado del sistema.",
          },
        ],
        indicators: {
          imports_completed_24h: 0,
          imports_failed_24h: 0,
          imports_running_now: 0,
          manual_review_videos: 0,
          live_polls: 0,
          map_events_24h: 0,
        },
      },
      { status: 500 }
    );
  }
}
