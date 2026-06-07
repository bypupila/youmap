function hasExplicitProtocol(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

function isBareHostname(value: string) {
  return /^(?:localhost|127(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/?#].*)?$/i.test(value);
}

function normalizeCandidateUrl(value: string) {
  const candidate = hasExplicitProtocol(value) ? value : `https://${value}`;
  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.toString();
}

export function normalizeExternalSponsorUrl(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  if (hasExplicitProtocol(trimmed)) {
    try {
      return normalizeCandidateUrl(trimmed);
    } catch {
      return null;
    }
  }

  if (!isBareHostname(trimmed)) return null;
  try {
    return normalizeCandidateUrl(trimmed);
  } catch {
    return null;
  }
}

export function normalizeSponsorLogoUrl(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  return normalizeExternalSponsorUrl(trimmed);
}
