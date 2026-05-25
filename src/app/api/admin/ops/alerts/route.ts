import { NextResponse } from "next/server";
import { getValidSessionUserFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { loadAdminOpsAlerts } from "@/lib/admin-ops-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!userIsSuperAdmin(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const payload = await loadAdminOpsAlerts();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[api/admin/ops/alerts GET]", error);
    return NextResponse.json({ error: "No se pudo cargar alertas operativas." }, { status: 500 });
  }
}
