import { NextResponse } from "next/server";
import { getValidSessionUserFromRequest, userIsSuperAdmin } from "@/lib/current-user";
import { loadAdminOverviewMetrics } from "@/lib/admin-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!userIsSuperAdmin(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await loadAdminOverviewMetrics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/admin/analytics/overview GET]", error);
    return NextResponse.json({ error: "No se pudo cargar analytics administrativos." }, { status: 500 });
  }
}
