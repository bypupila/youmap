export function sanitizeEnvValue(rawValue: unknown): string {
  let value = String(rawValue ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  while (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    const hasWrappingQuotes = (first === '"' || first === "'") && first === last;
    if (!hasWrappingQuotes) break;
    value = value.slice(1, -1).trim();
  }

  return value;
}

export function parseBooleanEnvValue(rawValue: unknown, fallback = false) {
  const normalized = sanitizeEnvValue(rawValue).toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export function readRequiredHttpUrl(rawValue: unknown, name: string) {
  const value = sanitizeEnvValue(rawValue);
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid HTTP/HTTPS URL.`);
  }
}

export function readRequiredEnv(rawValue: unknown, name: string) {
  const value = sanitizeEnvValue(rawValue);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
