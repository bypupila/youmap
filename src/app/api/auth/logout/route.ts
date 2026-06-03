import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, request.headers.get("host"));
  return response;
}
