"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  CloudArrowUp,
  Globe,
  Image as ImageIcon,
  Link,
  MapPin,
  Plus,
  Scissors,
  Tag,
  Ticket,
  Upload,
  Video,
  Warning,
  X,
} from "@phosphor-icons/react";
import { MapVideoCard, type MapVideoCardActivity } from "@/components/map/map-video-card";
import {
  getDefaultSponsorBannerColors,
  getContrastRatio,
  hasReadableSponsorBannerContrast,
  normalizeHexColor,
  type SponsorBannerColors,
} from "@/lib/sponsor-banner-colors";
import { normalizeExternalSponsorUrl, normalizeSponsorLogoUrl } from "@/lib/sponsor-url";
import {
  SPONSOR_CARD_STYLE_OPTIONS,
  type SponsorCardStyle,
} from "@/lib/sponsor-card-style";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SponsorWizardPayload {
  brand_name: string;
  logo_url: string | null;
  affiliate_url: string | null;
  discount_code: string | null;
  description: string | null;
  category_name: string | null;
  cta_label: string | null;
  action_type: "link" | "coupon";
  scope: "global" | "country" | "video";
  country_codes: string[];
  video_ids: string[];
  sponsor_card_style: SponsorCardStyle;
  sponsor_banner_background_color: string;
  sponsor_banner_text_color: string;
}

export type SponsorWizardInitialValues = Partial<SponsorWizardPayload> & {
  logo_url?: string | null;
};

interface SponsorCreatorWizardProps {
  channelId: string;
  isDemoMode: boolean;
  mode?: "create" | "edit";
  initialValues?: SponsorWizardInitialValues | null;
  videos: TravelVideoLocation[];
  countryOptions: Array<{ code: string; name: string }>;
  videoOptions: Array<TravelVideoLocation & { id: string; sponsor_names: string[] }>;
  categoryOptions: string[];
  onSubmit: (payload: SponsorWizardPayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

type Step = 1 | 2;

// ─── Style theme data ──────────────────────────────────────────────────────

const STYLE_ICONS: Record<SponsorCardStyle, typeof Ticket> = {
  cta_red: Ticket,
  coupon_yellow: Scissors,
  premium_strip: Tag,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_PRESETS = [
  "Dónde dormir",
  "Qué hacer",
  "Viajar cubierto",
  "Transporte",
  "Conectividad",
  "Equipamiento",
  "Producto digital",
];
const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;
const DESCRIPTION_MAX_LENGTH = 80;
const CATEGORY_MAX_LENGTH = 60;
const CTA_MAX_LENGTH = 60;
const COUPON_MAX_LENGTH = 40;

function hashStr(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepIndicator({ step, current }: { step: Step; current: Step }) {
  const done = current > step;
  const active = current === step;
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition-all duration-300",
        done
          ? "border-[#ff5a3d] bg-[#ff5a3d] text-white"
          : active
            ? "border-[#ff5a3d]/70 bg-[#ff5a3d]/15 text-[#ff8d74]"
            : "border-white/10 bg-white/[0.03] text-[#6b7480]"
      )}
    >
      {done ? <Check size={12} weight="bold" /> : step}
    </div>
  );
}

function StepLabel({ label, current, step }: { label: string; current: Step; step: Step }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200",
        current === step ? "text-[#f5f7fb]" : current > step ? "text-[#ff8d74]" : "text-[#6b7480]"
      )}
    >
      {label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f98a4]">
      {children}
    </span>
  );
}

function FieldInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[13px] text-[#f5f7fb] outline-none transition-all placeholder:text-[#5a6472] focus:border-[#ff5a3d]/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#ff5a3d]/20",
        className
      )}
    />
  );
}

function ColorSwatch({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <div
      className="flex h-10 min-w-[80px] items-center justify-center rounded-lg border border-white/10 px-3 text-[11px] font-black uppercase tracking-[0.1em] transition-all"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </div>
  );
}

function getSponsorDetectionLabel(status: TravelVideoLocation["sponsor_detection_status"], detectedText: string) {
  if (status === "confirmado") return detectedText || "Sponsor confirmado";
  if (status === "detectado_automaticamente") return detectedText || "Sponsor detectado";
  if (status === "pendiente_revision") return detectedText || "Patrocinio pendiente de revisión";
  return "";
}

function getSponsorDetectionTone(status: TravelVideoLocation["sponsor_detection_status"]) {
  if (status === "confirmado") return "success";
  if (status === "detectado_automaticamente") return "warning";
  if (status === "pendiente_revision") return "danger";
  return "neutral";
}

function VideoSponsorBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
        tone === "success"
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : tone === "warning"
            ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
            : tone === "danger"
              ? "border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ffd0c6]"
              : "border-white/10 bg-white/[0.03] text-[#c7cfda]"
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SponsorCreatorWizard({
  isDemoMode,
  mode = "create",
  initialValues = null,
  videos,
  countryOptions,
  videoOptions,
  categoryOptions,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: SponsorCreatorWizardProps) {
  const initialStyle = initialValues?.sponsor_card_style || "cta_red";
  const initialDefaultColors = getDefaultSponsorBannerColors(initialStyle);
  const [step, setStep] = useState<Step>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Step 1 fields
  const [brandName, setBrandName] = useState(initialValues?.brand_name || "");
  const [logoUrl, setLogoUrl] = useState(initialValues?.logo_url || "");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [description, setDescription] = useState(initialValues?.description || "");
  const [categoryName, setCategoryName] = useState(initialValues?.category_name || "");

  // Step 2 fields
  const [cardStyle, setCardStyle] = useState<SponsorCardStyle>(initialStyle);
  const [bgColor, setBgColor] = useState(initialValues?.sponsor_banner_background_color || initialDefaultColors.backgroundColor);
  const [textColor, setTextColor] = useState(initialValues?.sponsor_banner_text_color || initialDefaultColors.textColor);

  // Step 3 fields
  const [scope, setScope] = useState<"global" | "country" | "video">(initialValues?.scope || "country");
  const [actionType, setActionType] = useState<"link" | "coupon">(initialValues?.action_type || "link");
  const [affiliateUrl, setAffiliateUrl] = useState(initialValues?.affiliate_url || "");
  const [discountCode, setDiscountCode] = useState(initialValues?.discount_code || "");
  const [ctaLabel, setCtaLabel] = useState(initialValues?.cta_label || "");
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(initialValues?.country_codes || []);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(initialValues?.video_ids || []);
  const [countrySearch, setCountrySearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  // Preview
  const [previewVideoId, setPreviewVideoId] = useState<string>("");
  const [hoveredPreviewVideoId, setHoveredPreviewVideoId] = useState<string>("");
  const isEditMode = mode === "edit";

  // ── Logo drag & drop ─────────────────────────────────────────────────────
  const loadFilePreview = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setLocalError("El logo debe ser una imagen PNG, SVG, WebP o JPG.");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setLocalError("El logo no puede superar 2 MB.");
      return;
    }

    setLocalError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setLogoUrl(""); // clear URL when file chosen
    };
    reader.readAsDataURL(file);
  }, []);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() {
    setIsDragging(false);
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFilePreview(file);
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFilePreview(file);
  }

  // ── Style selection ──────────────────────────────────────────────────────
  function selectStyle(style: SponsorCardStyle) {
    if (actionType === "coupon" && style !== "coupon_yellow") return;
    setCardStyle(style);
    const defaults = getDefaultSponsorBannerColors(style);
    setBgColor(defaults.backgroundColor);
    setTextColor(defaults.textColor);
  }

  useEffect(() => {
    if (actionType !== "coupon" || cardStyle === "coupon_yellow") return;
    const defaults = getDefaultSponsorBannerColors("coupon_yellow");
    setCardStyle("coupon_yellow");
    setBgColor(defaults.backgroundColor);
    setTextColor(defaults.textColor);
  }, [actionType, cardStyle]);

  // ── Preview video selection ──────────────────────────────────────────────
  const previewCandidateIds = useMemo(() => {
    if (scope === "video") {
      return selectedVideoIds;
    }
    if (scope === "country") {
      const selected = new Set(selectedCountryCodes);
      if (selected.size === 0) return videoOptions.slice(0, 12).map((v) => v.id);
      return videoOptions
        .filter((v) => selected.has(String(v.country_code || "").toUpperCase()))
        .map((v) => v.id);
    }
    return videoOptions.slice(0, 12).map((v) => v.id);
  }, [scope, selectedCountryCodes, selectedVideoIds, videoOptions]);

  useEffect(() => {
    if (previewCandidateIds.length === 0) {
      setPreviewVideoId("");
      return;
    }
    setPreviewVideoId((curr) => {
      if (curr && previewCandidateIds.includes(curr)) return curr;
      const sorted = [...previewCandidateIds].sort((a, b) => a.localeCompare(b));
      return sorted[0] || "";
    });
  }, [previewCandidateIds]);

  useEffect(() => {
    setHoveredPreviewVideoId("");
  }, [previewCandidateIds]);

  const videosById = useMemo(() => {
    const map = new Map<string, TravelVideoLocation>();
    for (const v of videos) {
      const id = String(v.id || "");
      const ytId = String(v.youtube_video_id || "");
      if (id) map.set(id, v);
      if (ytId) map.set(ytId, v);
    }
    return map;
  }, [videos]);

  const activePreviewVideoId = hoveredPreviewVideoId || previewVideoId;
  const previewVideo = activePreviewVideoId ? videosById.get(activePreviewVideoId) || null : null;

  const previewVideoOptions = useMemo(
    () =>
      previewCandidateIds
        .map((id) => {
          const v = videosById.get(id);
          if (!v) return null;
          return { value: id, label: v.title };
        })
        .filter((x): x is { value: string; label: string } => Boolean(x)),
    [previewCandidateIds, videosById]
  );

  const previewActivity = useMemo<MapVideoCardActivity>(() => {
    if (!activePreviewVideoId) return {};
    const h = hashStr(activePreviewVideoId);
    const statuses: Array<"watched" | "not_finished" | "watch_later"> = [
      "watched",
      "not_finished",
      "watch_later",
    ];
    return {
      seenIds: new Set([activePreviewVideoId]),
      featuredIds: h % 5 === 0 ? new Set([activePreviewVideoId]) : new Set(),
      watchStatusById: { [activePreviewVideoId]: statuses[h % statuses.length] },
    };
  }, [activePreviewVideoId]);

  const sponsorBannerColors = useMemo<SponsorBannerColors | null>(() => {
    const bg = normalizeHexColor(bgColor);
    const tx = normalizeHexColor(textColor);
    if (!bg || !tx) return null;
    return { backgroundColor: bg, textColor: tx };
  }, [bgColor, textColor]);

  const contrastOk = Boolean(
    sponsorBannerColors &&
      hasReadableSponsorBannerContrast(
        sponsorBannerColors.backgroundColor,
        sponsorBannerColors.textColor
      )
  );

  const contrastRatio = useMemo(() => {
    const bg = normalizeHexColor(bgColor);
    const tx = normalizeHexColor(textColor);
    if (!bg || !tx) return 0;
    return getContrastRatio(bg, tx);
  }, [bgColor, textColor]);

  const sponsorNamesForPreview = useMemo(() => {
    return [brandName.trim() || "Tu Marca"];
  }, [brandName]);

  const normalizedLogoUrl = useMemo(() => {
    if (!logoUrl.trim()) return null;
    return normalizeSponsorLogoUrl(logoUrl);
  }, [logoUrl]);

  const logoUrlError = Boolean(logoUrl.trim() && !normalizedLogoUrl);

  const normalizedAffiliateUrl = useMemo(() => {
    if (!affiliateUrl.trim()) return null;
    return normalizeExternalSponsorUrl(affiliateUrl);
  }, [affiliateUrl]);

  const affiliateUrlError = Boolean(affiliateUrl.trim() && !normalizedAffiliateUrl);
  const ctaFieldLabel =
    actionType === "link" && cardStyle === "cta_red" ? "Mensaje del CTA rojo" : "Texto de acción";
  const ctaPlaceholder =
    actionType === "coupon" ? "ej: Obtener cupón" : "ej: Ver oferta, Reservar ahora...";

  // Filtered lists for scope selectors
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase();
    if (!q) return countryOptions;
    return countryOptions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countryOptions, countrySearch]);

  const filteredVideos = useMemo(() => {
    const q = videoSearch.toLowerCase();
    if (!q) return videoOptions;
    return videoOptions.filter((v) => v.title.toLowerCase().includes(q));
  }, [videoOptions, videoSearch]);

  // ── Validation per step ──────────────────────────────────────────────────
  const step1Valid =
    brandName.trim().length > 0 &&
    categoryName.trim().length > 0 &&
    description.trim().length > 0 &&
    !logoUrlError;
  const step2Valid = (() => {
    if (!normalizeHexColor(bgColor) || !normalizeHexColor(textColor) || !contrastOk) return false;
    if (scope === "country" && selectedCountryCodes.length === 0) return false;
    if (scope === "video" && selectedVideoIds.length === 0) return false;
    if (!normalizedAffiliateUrl) return false;
    if (actionType === "coupon" && !discountCode.trim()) return false;
    if (!ctaLabel.trim()) return false;
    return true;
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (logoUrlError) {
      setLocalError("Logo URL inválida. Usa una URL http/https válida o una ruta interna que empiece con /.");
      setStep(1);
      return;
    }
    if (!step1Valid) {
      setLocalError("Completa nombre, categoría y descripción corta antes de guardar.");
      setStep(1);
      return;
    }
    if (!normalizedAffiliateUrl) {
      setLocalError(affiliateUrl.trim() ? "URL del sponsor inválida." : "Escribe la URL de destino del sponsor.");
      setStep(2);
      return;
    }
    if (!step2Valid) {
      setLocalError("Completa estilo, alcance, acción, CTA y colores antes de guardar.");
      setStep(2);
      return;
    }

    const finalLogoUrl = normalizedLogoUrl || null;

    const finalAffiliateUrl = normalizedAffiliateUrl;
    const finalDiscountCode = actionType === "coupon" ? discountCode.trim() || null : null;
    const normalizedBg = normalizeHexColor(bgColor)!;
    const normalizedText = normalizeHexColor(textColor)!;

    await onSubmit({
      brand_name: brandName.trim(),
      logo_url: finalLogoUrl,
      affiliate_url: finalAffiliateUrl,
      discount_code: finalDiscountCode,
      description: description.trim() || null,
      category_name: categoryName.trim() || null,
      cta_label: ctaLabel.trim() || null,
      action_type: actionType,
      scope,
      country_codes: scope === "country" ? selectedCountryCodes : [],
      video_ids: scope === "video" ? selectedVideoIds : [],
      sponsor_card_style: cardStyle,
      sponsor_banner_background_color: normalizedBg,
      sponsor_banner_text_color: normalizedText,
    });

    if (isEditMode) return;

    // Reset on success
    setBrandName("");
    setLogoUrl("");
    setLogoPreview("");
    setDescription("");
    setCategoryName("");
    setCardStyle("cta_red");
    setBgColor(getDefaultSponsorBannerColors("cta_red").backgroundColor);
    setTextColor(getDefaultSponsorBannerColors("cta_red").textColor);
    setScope("country");
    setActionType("link");
    setAffiliateUrl("");
    setDiscountCode("");
    setCtaLabel("");
    setSelectedCountryCodes([]);
    setSelectedVideoIds([]);
    setLocalError(null);
    setStep(1);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const displayLogo = logoPreview || normalizedLogoUrl || "";
  const visibleError = localError || error;

  return (
    <div className="grid gap-0 lg:max-h-[calc(100dvh-88px)] lg:grid-cols-[minmax(0,1.1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ═══ LEFT: WIZARD ═══════════════════════════════════════════════════ */}
      <div className="relative min-w-0 rounded-2xl border border-white/10 bg-[#080c12] p-5 lg:max-h-[calc(100dvh-88px)] lg:overflow-y-auto">
        {/* Step progress bar */}
        <div className="mb-6 flex items-center gap-0">
          {([1, 2] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-0">
              <button
                type="button"
                disabled={s > step && !(s === 2 ? step1Valid : true)}
                onClick={() => {
                  if (s < step) setStep(s);
                  if (s === 2 && step1Valid) setStep(2);
                }}
                className="flex items-center gap-2 group"
              >
                <StepIndicator step={s} current={step} />
                <StepLabel
                  step={s}
                  current={step}
                  label={s === 1 ? "Identidad" : "Acción, estilo y alcance"}
                />
              </button>
              {s < 2 && (
                <div
                  className={cn(
                    "mx-3 h-px flex-1 min-w-[24px] transition-colors duration-300",
                    step > s ? "bg-[#ff5a3d]/50" : "bg-white/10"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ══════════════════════ STEP 1 — IDENTIDAD ══════════════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Logo upload zone */}
              <div>
                <FieldLabel>Logo de la marca</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                  {/* Drop zone */}
                  <div
                    ref={dropRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200",
                      isDragging
                        ? "border-[#ff5a3d] bg-[#ff5a3d]/10"
                        : displayLogo
                          ? "border-white/20 bg-white/[0.03]"
                          : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    title="Arrastra tu logo aquí o haz clic para elegir"
                  >
                    {displayLogo ? (
                      <>
                        <Image
                          src={displayLogo}
                          alt="Logo preview"
                          fill
                          className="object-contain p-3"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoPreview("");
                            setLogoUrl("");
                            setLocalError(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                        >
                          <X size={10} weight="bold" />
                        </button>
                      </>
                    ) : (
                      <>
                        <CloudArrowUp size={24} className="text-[#6b7480]" weight="duotone" />
                        <span className="text-center text-[9px] font-semibold leading-tight text-[#6b7480]">
                          Arrastra o<br />haz clic
                        </span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={handleFileInput}
                      tabIndex={-1}
                    />
                  </div>

                  {/* URL + specs */}
                  <div className="flex flex-col justify-between gap-3">
                    <div>
                      <FieldInput
                        placeholder="O pega la URL del logo"
                        value={logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          setLogoPreview("");
                          setLocalError(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        aria-invalid={logoUrlError}
                      />
                      {logoUrlError ? (
                        <p className="mt-1.5 text-[10px] leading-4 text-[#ff9a84]">
                          URL inválida. Usa http/https o una ruta interna que empiece con /.
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={13} className="text-[#6b7480]" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7480]">
                          Medidas recomendadas
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[11px] text-[#9da5ae]">
                          <span className="font-semibold text-[#c4cbd4]">400 × 400 px</span> — PNG, SVG, WebP
                        </p>
                        <p className="text-[11px] text-[#9da5ae]">
                          Fondo transparente · Máx{" "}
                          <span className="font-semibold text-[#c4cbd4]">2 MB</span>
                        </p>
                        <p className="text-[11px] text-[#9da5ae]">
                          El logo se mostrará en un{" "}
                          <span className="font-semibold text-[#c4cbd4]">cuadrado 44 × 44 px</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {localError ? (
                  <p className="mt-2 rounded-xl border border-[#ff5a3d]/20 bg-[#ff5a3d]/8 px-3 py-2 text-[11px] leading-5 text-[#ff9a84]">
                    {localError}
                  </p>
                ) : null}
              </div>

              {/* Brand name */}
              <div>
                <FieldLabel>
                  Nombre de la marca <span className="text-[#ff5a3d]">*</span>
                </FieldLabel>
                <FieldInput
                  required
                  placeholder="ej: Heymondo, Airalo, Booking..."
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="text-[15px] font-semibold"
                />
              </div>

              {/* Category */}
              <div>
                <FieldLabel>
                  Categoría del servicio <span className="text-[#ff5a3d]">*</span>
                </FieldLabel>
                <div className="relative">
                  <FieldInput
                    list="wiz-category-list"
                    required
                    maxLength={CATEGORY_MAX_LENGTH}
                    placeholder="ej: Dónde dormir, Transporte..."
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                  <datalist id="wiz-category-list">
                    {[...CATEGORY_PRESETS, ...categoryOptions.filter(
                      (o) => !CATEGORY_PRESETS.includes(o)
                    )].map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                {/* Quick presets */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORY_PRESETS.slice(0, 5).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCategoryName(preset)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all",
                        categoryName === preset
                          ? "border-[#ff5a3d]/40 bg-[#ff5a3d]/15 text-[#ff8d74]"
                          : "border-white/10 bg-white/[0.03] text-[#8f98a4] hover:border-white/20 hover:text-[#c4cbd4]"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <FieldLabel>
                    Descripción corta <span className="text-[#ff5a3d]">*</span>
                  </FieldLabel>
                  <span className="text-[10px] font-semibold text-[#6b7480]">
                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  rows={2}
                  required
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  placeholder="ej: Seguro de viaje global desde $3/día"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-[#f5f7fb] outline-none transition-all placeholder:text-[#5a6472] focus:border-[#ff5a3d]/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#ff5a3d]/20"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition-all duration-200",
                    step1Valid
                      ? "bg-[#ff5a3d] text-white hover:bg-[#d8462f] active:scale-[0.98]"
                      : "cursor-not-allowed bg-white/[0.06] text-[#6b7480]"
                  )}
                >
                  Siguiente: configurar sponsor
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════ STEP 2 — ESTILO VISUAL ══════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">
                  Acción y lectura visual
                </p>
                <p className="text-[12px] leading-5 text-[#7a8490]">
                  Primero define qué debe hacer el sponsor; el preview actualiza mensaje, cupón y estilo en la tarjeta.
                </p>
              </div>

              {/* Action type toggle */}
              <div>
                <FieldLabel>Tipo de acción</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
                  {(["link", "coupon"] as const).map((t) => {
                    const Icon = t === "link" ? Link : Scissors;
                    const label = t === "link" ? "Mensaje con URL" : "Cupón de descuento";
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActionType(t)}
                        className={cn(
                          "flex h-10 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all",
                          actionType === t
                            ? "bg-[#ff5a3d] text-white shadow-[0_4px_16px_-6px_rgba(255,90,61,0.6)]"
                            : "text-[#8f98a4] hover:text-[#c4cbd4]"
                        )}
                      >
                        <Icon size={14} weight={actionType === t ? "fill" : "regular"} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#7a8490]">
                  {actionType === "coupon"
                    ? "Al usar cupón, el estilo disponible es Cupón y el código se ve dentro del preview."
                    : "CTA rojo sirve para escribir un mensaje directo que se muestra en la banda del preview."}
                </p>
              </div>

              {/* Compact style selector */}
              <div className="grid gap-2 sm:grid-cols-3">
                {SPONSOR_CARD_STYLE_OPTIONS.map((option) => {
                  const active = option.value === cardStyle;
                  const Icon = STYLE_ICONS[option.value];
                  const disabledByCoupon = actionType === "coupon" && option.value !== "coupon_yellow";

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabledByCoupon}
                      onClick={() => selectStyle(option.value)}
                      className={cn(
                        "relative flex min-h-[76px] items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                        disabledByCoupon
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.015] opacity-45"
                          : active
                          ? "border-[#ff5a3d]/45 bg-[#ff5a3d]/12 text-[#f5f7fb] ring-1 ring-[#ff5a3d]/25"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      )}
                      aria-pressed={active}
                      aria-disabled={disabledByCoupon}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          active
                            ? "border-[#ff5a3d]/30 bg-[#ff5a3d] text-white"
                            : "border-white/10 bg-white/[0.04] text-[#8f98a4]"
                        )}
                      >
                        <Icon size={15} weight={active ? "fill" : "regular"} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-black text-[#f5f7fb]">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-[#7a8490]">
                          {disabledByCoupon ? "No disponible cuando la acción es cupón." : option.description}
                        </span>
                      </span>
                      {active ? <Check size={13} className="absolute right-2.5 top-2.5 text-[#ff8d74]" weight="bold" /> : null}
                    </button>
                  );
                })}
              </div>
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-5 text-[#8f98a4]">
                Multi sponsor se activa cuando un video tiene 2 o más sponsors; en ese caso la card los muestra como una lista compacta y no como un estilo individual.
              </p>

              {/* Color customization */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">
                      Colores del banner
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#7a8490]">
                      Personaliza la franja con los colores de tu marca.
                    </p>
                  </div>
                  {/* Contrast indicator */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]",
                      contrastOk
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                        : "border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ff8d74]"
                    )}
                  >
                    {contrastOk ? (
                      <Check size={11} weight="bold" />
                    ) : (
                      <Warning size={11} weight="bold" />
                    )}
                    Contraste {contrastOk ? "OK" : "bajo"} ({contrastRatio.toFixed(1)}:1)
                  </div>
                </div>

                {/* Live swatch preview */}
                <div className="mb-4 flex items-center gap-3">
                  <ColorSwatch bg={bgColor} text={textColor} label="Banner" />
                  <ColorSwatch bg={textColor} text={bgColor} label="Texto" />
                  <div
                    className="flex h-10 flex-1 items-center justify-between rounded-lg border border-white/10 px-4 text-[10px] font-black uppercase tracking-[0.12em]"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  >
                    <span className="flex items-center gap-1.5">
                      {cardStyle === "coupon_yellow" ? (
                        <Scissors size={10} weight="bold" />
                      ) : (
                        <Ticket size={10} weight="fill" />
                      )}
                      {brandName || "Tu Marca"}
                    </span>
                    <span>{ctaLabel.trim() || "CTA pendiente"} -&gt;</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Background color */}
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f98a4]">
                      Fondo del banner
                    </span>
                    <span className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                      <input
                        type="color"
                        value={normalizeHexColor(bgColor) || "#000000"}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-11 w-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-1"
                      />
                      <input
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        placeholder="#dc2626"
                        maxLength={7}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-[13px] text-[#f5f7fb] outline-none focus:border-[#ff5a3d]/40 focus:ring-1 focus:ring-[#ff5a3d]/20"
                      />
                    </span>
                  </label>

                  {/* Text color */}
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f98a4]">
                      Texto del banner
                    </span>
                    <span className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                      <input
                        type="color"
                        value={normalizeHexColor(textColor) || "#ffffff"}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-11 w-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-1"
                      />
                      <input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="#ffffff"
                        maxLength={7}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-[13px] text-[#f5f7fb] outline-none focus:border-[#ff5a3d]/40 focus:ring-1 focus:ring-[#ff5a3d]/20"
                      />
                    </span>
                  </label>
                </div>

                {!contrastOk && (
                  <p className="mt-3 rounded-xl border border-[#ff5a3d]/20 bg-[#ff5a3d]/8 px-3 py-2 text-[11px] leading-5 text-[#ff9a84]">
                    El texto necesita más contraste con el fondo (mínimo 4.5:1) para poder guardar el sponsor.
                  </p>
                )}
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#9da5ae]">
                  Alcance
                </p>
                <p className="text-[12px] leading-5 text-[#7a8490]">
                  Define dónde aparece el sponsor dentro del mapa.
                </p>
              </div>
              {/* Scope toggle */}
              <div>
                <FieldLabel>Alcance del sponsor</FieldLabel>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
                  {(["global", "country", "video"] as const).map((s) => {
                    const icons = { global: Globe, country: MapPin, video: Video };
                    const labels = { global: "Global", country: "Por país", video: "Por video" };
                    const Icon = icons[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setScope(s);
                          if (s !== "country") setSelectedCountryCodes([]);
                          if (s !== "video") setSelectedVideoIds([]);
                        }}
                        className={cn(
                          "flex h-10 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all",
                          scope === s
                            ? "bg-[#ff5a3d] text-white shadow-[0_4px_16px_-6px_rgba(255,90,61,0.6)]"
                            : "text-[#8f98a4] hover:text-[#c4cbd4]"
                        )}
                      >
                        <Icon size={14} weight={scope === s ? "fill" : "regular"} />
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#7a8490]">
                  {scope === "global" && "El sponsor aparecerá en todos los videos del canal."}
                  {scope === "country" && "El sponsor aparecerá solo en videos de los países seleccionados."}
                  {scope === "video" && "El sponsor aparecerá exclusivamente en los videos marcados."}
                </p>
              </div>

              {/* Country selector */}
              {scope === "country" && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <FieldLabel>
                      Países <span className="text-[#ff5a3d]">*</span>
                    </FieldLabel>
                    {selectedCountryCodes.length > 0 && (
                      <span className="text-[10px] font-semibold text-[#ff8d74]">
                        {selectedCountryCodes.length} seleccionados
                      </span>
                    )}
                  </div>
                  <FieldInput
                    placeholder="Buscar país..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-[200px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
                    {filteredCountries.map((c) => {
                      const selected = selectedCountryCodes.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountryCodes((prev) =>
                              selected
                                ? prev.filter((x) => x !== c.code)
                                : [...prev, c.code]
                            );
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-2 text-left text-[12px] transition-colors last:border-0",
                            selected
                              ? "bg-[#ff5a3d]/10 text-[#f5f7fb]"
                              : "text-[#b0b8c4] hover:bg-white/[0.03] hover:text-[#f5f7fb]"
                          )}
                        >
                          <span className={`fi fi-${c.code.toLowerCase()} text-base`} />
                          <span className="flex-1 font-medium">{c.name}</span>
                          <span className="font-mono text-[10px] text-[#6b7480]">{c.code}</span>
                          {selected && <Check size={12} className="text-[#ff8d74]" weight="bold" />}
                        </button>
                      );
                    })}
                    {filteredCountries.length === 0 && (
                      <p className="py-4 text-center text-[12px] text-[#6b7480]">Sin resultados</p>
                    )}
                  </div>
                </div>
              )}

              {/* Video selector */}
              {scope === "video" && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <FieldLabel>
                      Videos <span className="text-[#ff5a3d]">*</span>
                    </FieldLabel>
                    {selectedVideoIds.length > 0 && (
                      <span className="text-[10px] font-semibold text-[#ff8d74]">
                        {selectedVideoIds.length} seleccionados
                      </span>
                    )}
                  </div>
                  <FieldInput
                    placeholder="Buscar video..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-[200px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
                    {filteredVideos.slice(0, 100).map((v) => {
                      const vid = v.id;
                      const selected = selectedVideoIds.includes(vid);
                      const sponsorNames = Array.from(new Set(v.sponsor_names || [])).filter(Boolean);
                      const detectedText = String(v.sponsor_detectado_texto || "").trim();
                      const sponsorDetectionLabel = getSponsorDetectionLabel(v.sponsor_detection_status, detectedText);
                      return (
                        <button
                          key={vid}
                          type="button"
                          onMouseEnter={() => setHoveredPreviewVideoId(vid)}
                          onMouseLeave={() => setHoveredPreviewVideoId("")}
                          onClick={() => {
                            setSelectedVideoIds((prev) =>
                              selected
                                ? prev.filter((x) => x !== vid)
                                : [...prev, vid]
                            );
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-2.5 text-left text-[12px] transition-colors last:border-0",
                            selected ? "bg-[#ff5a3d]/10 text-[#f5f7fb]" : "text-[#b0b8c4] hover:bg-white/[0.03] hover:text-[#f5f7fb]"
                          )}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 truncate font-medium">{v.title}</span>
                              {sponsorNames.length > 0 ? (
                                <VideoSponsorBadge
                                  tone="success"
                                  label={`Patrocinado: ${sponsorNames.join(", ")}`}
                                />
                              ) : sponsorDetectionLabel ? (
                                <VideoSponsorBadge
                                  tone={getSponsorDetectionTone(v.sponsor_detection_status)}
                                  label={`Detectado: ${sponsorDetectionLabel}`}
                                />
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#6b7480]">
                              <span>{v.country_name || v.country_code}</span>
                              {sponsorNames.length > 1 ? (
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#9da5ae]">
                                  {sponsorNames.length} sponsors
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {selected && <Check size={12} className="text-[#ff8d74]" weight="bold" />}
                        </button>
                      );
                    })}
                    {filteredVideos.length === 0 && (
                      <p className="py-4 text-center text-[12px] text-[#6b7480]">Sin resultados</p>
                    )}
                  </div>
                </div>
              )}

              {/* CTA Label */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <FieldLabel>
                    {ctaFieldLabel} <span className="text-[#ff5a3d]">*</span>
                  </FieldLabel>
                  <span className="text-[10px] font-semibold text-[#6b7480]">
                    {ctaLabel.length}/{CTA_MAX_LENGTH}
                  </span>
                </div>
                <FieldInput
                  required
                  maxLength={CTA_MAX_LENGTH}
                  placeholder={ctaPlaceholder}
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
                <p className="mt-1.5 text-[10px] leading-4 text-[#6b7480]">
                  {actionType === "link" && cardStyle === "cta_red"
                    ? "Este mensaje aparece dentro de la banda roja del preview."
                    : "Este texto acompaña la acción visible del sponsor en la card."}
                </p>
              </div>

              {/* URL */}
              <div>
                <FieldLabel>
                  URL del sponsor <span className="text-[#ff5a3d]">*</span>
                </FieldLabel>
                <FieldInput
                  required
                  placeholder="www.sponsor.com/oferta o https://..."
                  value={affiliateUrl}
                  onChange={(e) => {
                    setAffiliateUrl(e.target.value);
                    setLocalError(null);
                  }}
                  aria-invalid={affiliateUrlError}
                />
                {affiliateUrlError ? (
                  <p className="mt-1.5 text-[10px] leading-4 text-[#ff9a84]">URL inválida.</p>
                ) : (
                  <p className="mt-1.5 text-[10px] text-[#6b7480]">
                    En cupones, se usa después de copiar el código para ir a la web del sponsor.
                  </p>
                )}
              </div>

              {/* Coupon code */}
              {actionType === "coupon" ? (
                <div>
                  <FieldLabel>
                    Código del cupón <span className="text-[#ff5a3d]">*</span>
                  </FieldLabel>
                  <FieldInput
                    required
                    maxLength={COUPON_MAX_LENGTH}
                    placeholder="ej: VIAJA20, HEYMONDO15..."
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest uppercase"
                  />
                </div>
              ) : null}

              {/* Error */}
              {visibleError && (
                <p className="rounded-xl border border-[#ff5a3d]/25 bg-[#ff5a3d]/10 px-4 py-3 text-[12px] text-[#ffb4a6]">
                  {visibleError}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[13px] font-semibold text-[#9da5ae] transition-all hover:bg-white/[0.06] hover:text-[#f5f7fb]"
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex h-11 items-center rounded-xl px-4 text-[13px] font-semibold text-[#6b7480] transition-all hover:text-[#9da5ae]"
                  >
                    Cancelar
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!step2Valid || isSubmitting}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-6 text-[13px] font-semibold transition-all duration-200",
                    step2Valid && !isSubmitting
                      ? "bg-[#ff5a3d] text-white hover:bg-[#d8462f] active:scale-[0.98] shadow-[0_8px_32px_-12px_rgba(255,90,61,0.7)]"
                      : "cursor-not-allowed bg-white/[0.06] text-[#6b7480]"
                  )}
                >
                  <Plus size={15} weight="bold" />
                {isSubmitting
                  ? "Guardando..."
                  : isEditMode
                    ? "Guardar cambios"
                  : isDemoMode
                    ? "Simular sponsor"
                    : "Crear sponsor"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ═══ RIGHT: LIVE PREVIEW ════════════════════════════════════════════ */}
      <div className="self-start space-y-3 rounded-2xl border border-white/10 bg-[#060a10] p-4 lg:sticky lg:top-4 lg:ml-3 lg:max-h-[calc(100dvh-88px)] lg:overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5a3d]">
              Preview en vivo
            </p>
            <p className="mt-0.5 text-[11px] text-[#6b7480]">
              Se actualiza en tiempo real
            </p>
          </div>
          {/* Active style badge */}
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#c4cbd4]">
            {SPONSOR_CARD_STYLE_OPTIONS.find((o) => o.value === cardStyle)?.label}
          </span>
        </div>

        {/* Brand summary */}
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            {displayLogo ? (
              <Image src={displayLogo} alt="Logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Upload size={13} className="text-[#6b7480]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#f5f7fb]">
              {brandName || <span className="text-[#6b7480]">Nombre de marca</span>}
            </p>
            {categoryName && (
              <p className="truncate text-[10px] text-[#8f98a4]">{categoryName}</p>
            )}
            {description && (
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#a7b0bb]">{description}</p>
            )}
          </div>
        </div>

        {/* Video selector */}
        {previewVideoOptions.length > 0 && (
          <div>
            <FieldLabel>Video de referencia</FieldLabel>
            <select
              value={previewVideoId}
              onChange={(e) => setPreviewVideoId(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[12px] text-[#f5f7fb] outline-none focus:border-[#ff5a3d]/40"
            >
              {previewVideoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label.slice(0, 48)}
                  {opt.label.length > 48 ? "..." : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MapVideoCard preview */}
        {previewVideo ? (
          <div className="overflow-x-auto pb-1">
            <div className="flex justify-start">
              <MapVideoCard
                video={{ ...previewVideo, sponsor_card_style: cardStyle }}
                activity={previewActivity}
                sponsorNames={sponsorNamesForPreview}
                sponsorDisplay={{
                  actionType,
                  ctaLabel,
                  couponCode: discountCode,
                }}
                sponsorBannerColors={sponsorBannerColors}
                className="shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 text-[12px] text-[#5a6472]">
            Selecciona un scope con videos para ver el preview
          </div>
        )}

        {/* Scope summary */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7480]">
            Configuración actual
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8f98a4]">Estilo</span>
              <span className="font-semibold text-[#c4cbd4]">
                {SPONSOR_CARD_STYLE_OPTIONS.find((o) => o.value === cardStyle)?.label || "CTA rojo"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#8f98a4]">{actionType === "coupon" ? "Mensaje" : "CTA"}</span>
              <span className="min-w-0 truncate text-right font-semibold text-[#c4cbd4]">
                {ctaLabel.trim() || "Pendiente"}
              </span>
            </div>
            {actionType === "coupon" ? (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-[#8f98a4]">Cupón</span>
                <span className="min-w-0 truncate text-right font-mono font-semibold text-[#c4cbd4]">
                  {discountCode.trim() || "Pendiente"}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8f98a4]">Alcance</span>
              <span className="font-semibold text-[#c4cbd4] capitalize">
                {scope === "global" ? "Global" : scope === "country" ? `${selectedCountryCodes.length} países` : `${selectedVideoIds.length} videos`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8f98a4]">Acción</span>
              <span className="font-semibold text-[#c4cbd4]">
                {actionType === "link" ? "Link externo" : "Cupón"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8f98a4]">Contraste</span>
              <span
                className={cn(
                  "font-semibold",
                  contrastOk ? "text-emerald-400" : "text-[#ff8d74]"
                )}
              >
                {contrastOk ? "OK" : "Bajo"}
              </span>
            </div>
          </div>
          <p className="mt-2 border-t border-white/[0.06] pt-2 text-[10px] leading-4 text-[#6b7480]">
            Multi sponsor: si este video tiene 2 o más sponsors, se mostrará como lista compacta.
          </p>
        </div>
      </div>
    </div>
  );
}
