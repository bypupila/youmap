import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const normalized = String(password || "");
  if (normalized.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(normalized, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const derived = scryptSync(String(password || ""), salt, KEY_LENGTH).toString("hex");
  const source = Buffer.from(hash, "hex");
  const candidate = Buffer.from(derived, "hex");
  if (source.length !== candidate.length) return false;

  return timingSafeEqual(source, candidate);
}
