import { cookies } from "next/headers";
import { getSessionUserIdFromCookieHeader, getSessionUserIdFromToken, SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { sql } from "@/lib/neon";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
}

export function getSessionUserIdFromRequest(request: Request) {
  return getSessionUserIdFromCookieHeader(request.headers.get("cookie"));
}

export async function getSessionUserIdFromServerCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  return getSessionUserIdFromToken(token);
}

export async function getSessionUserById(userId: string): Promise<SessionUser | null> {
  const rows = await sql<SessionUser[]>`
    select id, email, username, display_name
    from public.users
    where id = ${userId}
    limit 1
  `;
  return rows[0] || null;
}

export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return null;
  return getSessionUserById(userId);
}
