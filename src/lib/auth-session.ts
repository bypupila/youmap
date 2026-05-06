import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { sanitizeEnvValue } from "@/lib/env";

export const SESSION_COOKIE_NAME = "travelyourmap_session";
export const LEGACY_SESSION_COOKIE_NAME = "travelmap_session";
export const SESSION_COOKIE_NAMES = [SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME] as const;
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function encodeBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const value = padding ? `${normalized}${"=".repeat(4 - padding)}` : normalized;
  return Buffer.from(value, "base64");
}

function getSessionSecret() {
  const explicit = sanitizeEnvValue(process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || "");
  if (explicit) return explicit;

  const fallback = sanitizeEnvValue(process.env.DATABASE_URL || "");
  if (!fallback) {
    throw new Error("AUTH_SESSION_SECRET or SESSION_SECRET is required.");
  }
  return fallback;
}

function signPayload(payloadB64: string) {
  return encodeBase64Url(createHmac("sha256", getSessionSecret()).update(payloadB64).digest());
}

function parseCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(separator + 1).trim());
  }
  return null;
}

function parseCookieValueFromNames(cookieHeader: string | null, names: readonly string[]) {
  for (const name of names) {
    const value = parseCookieValue(cookieHeader, name);
    if (value) {
      return value;
    }
  }
  return null;
}

function getCookieValueFromStore(cookieStore: { get(name: string): { value?: string } | undefined }, names: readonly string[]) {
  for (const name of names) {
    const value = String(cookieStore.get(name)?.value || "").trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function createSessionToken(userId: string, ttlSeconds = DEFAULT_SESSION_TTL_SECONDS) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };
  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function getSessionUserIdFromToken(token: string | null | undefined) {
  return getSessionPayloadFromToken(token)?.sub || null;
}

export function getSessionTokenFromCookieHeader(cookieHeader: string | null) {
  return parseCookieValueFromNames(cookieHeader, SESSION_COOKIE_NAMES);
}

export function getSessionPayloadFromCookieHeader(cookieHeader: string | null) {
  return getSessionPayloadFromToken(getSessionTokenFromCookieHeader(cookieHeader));
}

export function getSessionTokenFromCookieStore(cookieStore: { get(name: string): { value?: string } | undefined }) {
  return getCookieValueFromStore(cookieStore, SESSION_COOKIE_NAMES);
}

export function getSessionPayloadFromToken(token: string | null | undefined) {
  const raw = String(token || "");
  if (!raw) return null;

  const [payloadB64, signatureB64] = raw.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const expected = signPayload(payloadB64);
  const actualBuffer = Buffer.from(signatureB64);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8")) as {
      sub?: string;
      iat?: number;
      exp?: number;
    };
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return {
      sub: payload.sub,
      iat: Number(payload.iat || 0),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function getSessionUserIdFromCookieHeader(cookieHeader: string | null) {
  return getSessionUserIdFromToken(getSessionTokenFromCookieHeader(cookieHeader));
}

export function setSessionCookie(response: NextResponse, userId: string) {
  const token = createSessionToken(userId);
  for (const cookieName of SESSION_COOKIE_NAMES) {
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEFAULT_SESSION_TTL_SECONDS,
    });
  }
}

export function clearSessionCookie(response: NextResponse) {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
