import { cookies } from "next/headers";
import {
  getSessionPayloadFromCookieHeader,
  getSessionTokenFromCookieStore,
  getSessionUserIdFromCookieHeader,
  getSessionPayloadFromToken,
  getSessionUserIdFromToken,
} from "@/lib/auth-session";
import { sql } from "@/lib/neon";
import { isSessionRevoked } from "@/lib/session-revocations";

export type AppUserRole = "viewer" | "creator" | "superadmin";

export function normalizeAppUserRole(value: string | null | undefined): AppUserRole {
  if (value === "viewer") return "viewer";
  if (value === "superadmin") return "superadmin";
  return "creator";
}

export function userIsSuperAdmin(role: AppUserRole | null | undefined) {
  return role === "superadmin";
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: AppUserRole;
}

export function getSessionUserIdFromRequest(request: Request) {
  return getSessionUserIdFromCookieHeader(request.headers.get("cookie"));
}

export async function getValidSessionUserIdFromRequest(request: Request) {
  const payload = getSessionPayloadFromCookieHeader(request.headers.get("cookie"));
  if (!payload) return null;
  if (await isSessionRevoked(payload.sub, payload.iat)) return null;
  return payload.sub;
}

export async function getSessionUserIdFromServerCookies() {
  const cookieStore = await cookies();
  const token = getSessionTokenFromCookieStore(cookieStore);
  return getSessionUserIdFromToken(token);
}

export async function getValidSessionUserIdFromServerCookies() {
  const cookieStore = await cookies();
  const token = getSessionTokenFromCookieStore(cookieStore);
  const payload = getSessionPayloadFromToken(token);
  if (!payload) return null;
  if (await isSessionRevoked(payload.sub, payload.iat)) return null;
  return payload.sub;
}

export async function getSessionUserById(userId: string): Promise<SessionUser | null> {
  const rows = await sql<Array<{
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: string | null;
  }>>`
    select id, email, username, display_name, role::text as role
    from public.users
    where id = ${userId}
    limit 1
  `;
  const row = rows[0] || null;
  if (!row) return null;
  return {
    ...row,
    role: normalizeAppUserRole(row.role),
  };
}

export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return null;
  return getSessionUserById(userId);
}

export async function getValidSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const userId = await getValidSessionUserIdFromRequest(request);
  if (!userId) return null;
  return getSessionUserById(userId);
}

export interface ChannelAccess {
  exists: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
  canManage: boolean;
  ownerUserId: string | null;
}

export async function getChannelAccessForUser(channelId: string, userId: string): Promise<ChannelAccess> {
  const [channelRows, user] = await Promise.all([
    sql<Array<{ id: string; user_id: string }>>`
      select id, user_id
      from public.channels
      where id = ${channelId}
      limit 1
    `,
    getSessionUserById(userId),
  ]);

  const channel = channelRows[0] || null;
  const isSuperAdmin = userIsSuperAdmin(user?.role);
  const isOwner = Boolean(channel && channel.user_id === userId);
  const isCreatorLike = user?.role === "creator" || isSuperAdmin;

  return {
    exists: Boolean(channel),
    isOwner,
    isSuperAdmin,
    canManage: Boolean(channel && (isSuperAdmin || (isOwner && isCreatorLike))),
    ownerUserId: channel?.user_id || null,
  };
}
