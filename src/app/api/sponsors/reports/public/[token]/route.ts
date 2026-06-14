import { NextResponse } from "next/server";
import { loadSponsorReportByToken } from "@/lib/sponsor-reports";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const report = await loadSponsorReportByToken(String(token || "").trim());
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[api/sponsors/reports/public/:token]", error);
    return NextResponse.json({ error: "Could not load sponsor report" }, { status: 500 });
  }
}
