import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "travelmap_session";

export async function middleware(request: NextRequest) {
  const isDemoMode = request.nextUrl.searchParams.get("demo") === "1";
  if (isDemoMode) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
