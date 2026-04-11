export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,27}[a-z0-9])?$/;

export function normalizeUsername(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function normalizeEmail(input: string) {
  return String(input || "").trim().toLowerCase();
}

export function isEmailIdentifier(identifier: string) {
  return normalizeEmail(identifier).includes("@");
}

export function toPublicMapPath(username: string) {
  return `/u/${normalizeUsername(username)}`;
}
