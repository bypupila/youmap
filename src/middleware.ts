import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "travelmap_session";
const VANITY_HOSTS = new Set(["youmap.bypupila.com", "www.youmap.bypupila.com"]);
const RESERVED_PATHS = new Set(["", "auth", "dashboard", "onboarding", "pricing", "explore", "map", "api", "_next"]);

export async function middleware(request: NextRequest) {
  const host = String(request.headers.get("host") || "").split(":")[0].toLowerCase();
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.replace(/^\//, "").split("/")[0] || "";

  if (VANITY_HOSTS.has(host) && !RESERVED_PATHS.has(firstSegment) && !pathname.startsWith("/favicon")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/u/${firstSegment}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const isDemoMode = request.nextUrl.searchParams.get("demo") === "1";
  if (isDemoMode) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/((?!.*\\..*).*)"],
};
