import type { SponsorCardStyle } from "@/lib/sponsor-card-style";

export type SponsorBannerColors = {
  backgroundColor: string;
  textColor: string;
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MIN_SMALL_TEXT_CONTRAST = 4.5;

const DEFAULT_SPONSOR_BANNER_COLORS: Record<SponsorCardStyle, SponsorBannerColors> = {
  cta_red: {
    backgroundColor: "#dc2626",
    textColor: "#ffffff",
  },
  coupon_yellow: {
    backgroundColor: "#15120a",
    textColor: "#facc15",
  },
  premium_strip: {
    backgroundColor: "#ffffff",
    textColor: "#050505",
  },
};

export function getDefaultSponsorBannerColors(style: SponsorCardStyle): SponsorBannerColors {
  return DEFAULT_SPONSOR_BANNER_COLORS[style];
}

export function normalizeHexColor(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return null;
  return normalized.toLowerCase();
}

export function normalizeOptionalHexColor(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalizeHexColor(normalized);
}

export function getContrastRatio(colorA: string, colorB: string) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return 0;
  const luminanceA = getRelativeLuminance(rgbA);
  const luminanceB = getRelativeLuminance(rgbB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hasReadableSponsorBannerContrast(backgroundColor: string, textColor: string) {
  return getContrastRatio(backgroundColor, textColor) >= MIN_SMALL_TEXT_CONTRAST;
}

export function validateSponsorBannerColors(backgroundColor: string | null | undefined, textColor: string | null | undefined) {
  const normalizedBackground = normalizeOptionalHexColor(backgroundColor);
  const normalizedText = normalizeOptionalHexColor(textColor);

  if (String(backgroundColor || "").trim() && !normalizedBackground) {
    return { ok: false as const, error: "Color de fondo inválido. Usa formato hexadecimal, por ejemplo #dc2626." };
  }
  if (String(textColor || "").trim() && !normalizedText) {
    return { ok: false as const, error: "Color de texto inválido. Usa formato hexadecimal, por ejemplo #ffffff." };
  }
  if (normalizedBackground && normalizedText && !hasReadableSponsorBannerContrast(normalizedBackground, normalizedText)) {
    return { ok: false as const, error: "El texto del sponsor banner necesita más contraste con el fondo." };
  }

  return {
    ok: true as const,
    colors: {
      backgroundColor: normalizedBackground,
      textColor: normalizedText,
    },
  };
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
