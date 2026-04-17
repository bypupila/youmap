import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { sanitizeEnvValue } from "@/lib/env";

export const SESSION_COOKIE_NAME = "travelmap_session";
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
      exp?: number;
    };
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function getSessionUserIdFromCookieHeader(cookieHeader: string | null) {
  const token = parseCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  return getSessionUserIdFromToken(token);
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
