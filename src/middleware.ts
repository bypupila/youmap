import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LOCAL_ONLY_ROUTES = new Set([
  "/map-proposal",
  "/map-proposal-v1",
  "/map-proposal-2",
  "/map-admin-proposal",
  "/demo-diseno",
  "/country-card-proposals",
]);

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (LOCAL_ONLY_ROUTES.has(request.nextUrl.pathname)) {
    const notFoundUrl = new URL("/404", request.url);
    return NextResponse.rewrite(notFoundUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/map-proposal",
    "/map-proposal-v1",
    "/map-proposal-2",
    "/map-admin-proposal",
    "/demo-diseno",
    "/country-card-proposals",
  ],
};
