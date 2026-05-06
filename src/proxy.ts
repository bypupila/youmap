import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAMES } from "@/lib/auth-session";

const VANITY_HOSTS = new Set([
  "travelyourmap.bypupila.com",
  "www.travelyourmap.bypupila.com",
  "youmap.bypupila.com",
  "www.youmap.bypupila.com",
]);
const RESERVED_PATHS = new Set(["", "admin", "auth", "dashboard", "onboarding", "pricing", "explore", "map", "api", "u", "_next", "monitoring"]);

export async function proxy(request: NextRequest) {
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

  const hasSession = SESSION_COOKIE_NAMES.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value));
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
