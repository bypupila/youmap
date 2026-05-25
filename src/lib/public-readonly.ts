import { normalizeUsername } from "@/lib/auth-identifiers";

const PUBLIC_READ_ONLY_HANDLES = new Set(["bypupila", "by.pupila"]);

export function isPublicReadOnlyHandle(value: string | null | undefined) {
  const normalized = normalizeUsername(String(value || ""));
  if (!normalized) return false;
  return PUBLIC_READ_ONLY_HANDLES.has(normalized);
}
