"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ArrowsClockwise, CaretDown, CaretUp, Check, Copy, GlobeHemisphereWest, MapPin, PencilSimple, Sparkle, Trash, Video } from "@phosphor-icons/react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { SponsorCreatorWizard, type SponsorWizardPayload } from "@/components/creator/sponsor-creator-wizard";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MapFanVoteSummary } from "@/lib/map-fan-votes";
import type { MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor } from "@/lib/map-types";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getSponsorCardStyleLabel } from "@/lib/sponsor-card-style";
import type { TravelVideoLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CreatorPanelTab = "summary" | "polls" | "sponsors" | "ops" | "activity";

type PollOptionInput = {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
};

interface CreatorAdminPanelProps {
  activeTab: CreatorPanelTab;
  channelId: string;
  channelName: string;
  mapUrl: string;
  isDemoMode: boolean;
  summary: MapSummary;
  initialPoll: MapPollRecord | null;
  initialFanVotes: MapFanVoteSummary | null;
  availablePollOptions: PollOptionInput[];
  videos: TravelVideoLocation[];
  initialSponsors: MapRailSponsor[];
}

const ownerViewer = {
  isOwner: true,
  isAuthenticated: true,
  role: "creator" as const,
  isSuperAdmin: false,
  shareUrl: "",
  adminUrl: null,
};

const SPONSOR_CATEGORY_PRESETS = [
  "Dónde dormir",
  "Qué hacer",
  "Viajar cubierto",
  "Transporte",
  "Conectividad",
  "Equipamiento",
  "Producto digital",
];

export function CreatorAdminPanel({
  activeTab,
  channelId,
  channelName,
  mapUrl,
  isDemoMode,
  summary,
  initialPoll,
  initialFanVotes,
  availablePollOptions,
  videos,
  initialSponsors,
}: CreatorAdminPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pollState, setPollState] = useState<MapPollRecord | null>(initialPoll);
  const [sponsors, setSponsors] = useState<MapRailSponsor[]>(initialSponsors);
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creatingSponsor, setCreatingSponsor] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [deletingSponsorId, setDeletingSponsorId] = useState<string | null>(null);
  const [confirmingSponsorRemovalId, setConfirmingSponsorRemovalId] = useState<string | null>(null);
  const [bulkCountryFilter, setBulkCountryFilter] = useState<string>("all");
  const [bulkTitleFilter, setBulkTitleFilter] = useState("");
  const [bulkStatusFilter, setBulkStatusFilter] = useState<"all" | "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible">("all");
  const [bulkSelectedSponsorId, setBulkSelectedSponsorId] = useState<string>("");
  const [bulkSelectedVideoIds, setBulkSelectedVideoIds] = useState<string[]>([]);
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkBusy, setBulkBusy] = useState<"idle" | "preview" | "assign">("idle");
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkJobStatus, setBulkJobStatus] = useState<string | null>(null);
  const [bulkUndoAvailable, setBulkUndoAvailable] = useState(false);
  const [bulkLastAssignment, setBulkLastAssignment] = useState<{ sponsorId: string; videoIds: string[] } | null>(null);
  const bulkPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalVotes = initialFanVotes?.total_votes || 0;
  const activeLive = Boolean(pollState?.status === "live");
  const sponsorCountryOptions = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const video of videos) {
      const code = String(video.country_code || "").trim().toUpperCase();
      if (!code) continue;
      if (!byCode.has(code)) byCode.set(code, String(video.country_name || code));
    }
    return Array.from(byCode.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videos]);
  const sponsorVideoOptions = useMemo(() => {
    return videos
      .map((video) => ({
        video,
        videoId: String(video.id || video.youtube_video_id || "").trim(),
      }))
      .filter((entry) => Boolean(entry.videoId))
      .slice(0, 180)
      .map((entry) => ({
        ...entry.video,
        id: entry.videoId,
      }));
  }, [videos]);
  const sponsorVideoTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const video of videos) {
      const id = String(video.id || "").trim();
      if (!id) continue;
      map.set(id, video.title);
    }
    return map;
  }, [videos]);
  const directSponsorByVideoId = useMemo(() => {
    const map = new Map<string, string>();
    for (const sponsor of sponsors) {
      for (const videoId of sponsor.video_ids || []) {
        if (!map.has(videoId)) map.set(videoId, sponsor.brand_name);
      }
    }
    return map;
  }, [sponsors]);
  const sortedSponsors = useMemo(() => {
    return [...sponsors].sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.display_order)) ? Number(a.display_order) : 100;
      const bOrder = Number.isFinite(Number(b.display_order)) ? Number(b.display_order) : 100;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.brand_name.localeCompare(b.brand_name);
    });
  }, [sponsors]);
  const sponsorCategoryOptions = useMemo(() => {
    const dynamicOptions = sponsors
      .map((sponsor) => String(sponsor.category_name || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...SPONSOR_CATEGORY_PRESETS, ...dynamicOptions]));
  }, [sponsors]);
  const editingSponsor = useMemo(
    () => sponsors.find((sponsor) => sponsor.id === editingSponsorId) || null,
    [editingSponsorId, sponsors]
  );

  function openCreateSponsor() {
    setEditingSponsorId(null);
    setSponsorError(null);
    setWizardOpen((current) => !current || Boolean(editingSponsorId));
  }

  function openEditSponsor(sponsorId: string) {
    setEditingSponsorId(sponsorId);
    setSponsorError(null);
    setWizardOpen(true);
  }

  function closeSponsorWizard() {
    setWizardOpen(false);
    setEditingSponsorId(null);
    setSponsorError(null);
  }

  function getSponsorWizardInitialValues(sponsor: MapRailSponsor): SponsorWizardPayload {
    const fallbackStyle = sponsor.sponsor_card_style || "cta_red";
    return {
      brand_name: sponsor.brand_name,
      logo_url: sponsor.logo_url,
      affiliate_url: sponsor.affiliate_url,
      discount_code: sponsor.discount_code,
      description: sponsor.description,
      category_name: sponsor.category_name || null,
      cta_label: sponsor.cta_label || null,
      action_type: sponsor.action_type || (sponsor.discount_code ? "coupon" : "link"),
      scope: sponsor.scope || ((sponsor.video_ids || []).length > 0 ? "video" : (sponsor.country_codes || []).length > 0 ? "country" : "global"),
      country_codes: sponsor.country_codes || [],
      video_ids: sponsor.video_ids || [],
      sponsor_card_style: fallbackStyle,
      sponsor_banner_background_color:
        sponsor.sponsor_banner_background_color || "#dc2626",
      sponsor_banner_text_color:
        sponsor.sponsor_banner_text_color || "#ffffff",
    };
  }

  async function createSponsorFromWizard(payload: SponsorWizardPayload) {
    setCreatingSponsor(true);
    setSponsorError(null);
    try {
      const nextDisplayOrder =
        Math.max(0, ...sponsors.map((s) => (Number.isFinite(Number(s.display_order)) ? Number(s.display_order) : 100))) + 10;

      if (isDemoMode) {
        setSponsors((current) => [
          {
            id: `demo-sponsor-${Date.now()}`,
            brand_name: payload.brand_name,
            logo_url: payload.logo_url,
            website_url: null,
            description: payload.description,
            discount_code: payload.discount_code,
            affiliate_url: payload.affiliate_url,
            category_name: payload.category_name,
            action_type: payload.action_type,
            action_value: payload.action_type === "coupon" ? payload.discount_code : null,
            cta_label: payload.cta_label,
            display_order: nextDisplayOrder,
            country_codes: payload.country_codes,
            video_ids: payload.video_ids,
            scope: payload.scope,
            sponsor_card_style: payload.sponsor_card_style,
            sponsor_banner_background_color: payload.sponsor_banner_background_color,
            sponsor_banner_text_color: payload.sponsor_banner_text_color,
            isExample: true,
            click_count: 0,
            start_date: null,
            end_date: null,
            internal_notes: null,
          },
          ...current,
        ]);
        setWizardOpen(false);
        return;
      }

      const response = await fetch("/api/map-admin/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          sponsorId: null,
          brand_name: payload.brand_name,
          logo_url: payload.logo_url,
          website_url: null,
          affiliate_url: payload.affiliate_url,
          discount_code: payload.discount_code,
          description: payload.description,
          category_name: payload.category_name,
          action_type: payload.action_type,
          action_value: payload.action_type === "coupon" ? payload.discount_code : null,
          cta_label: payload.cta_label,
          sponsor_card_style: payload.sponsor_card_style,
          sponsor_banner_background_color: payload.sponsor_banner_background_color,
          sponsor_banner_text_color: payload.sponsor_banner_text_color,
          display_order: nextDisplayOrder,
          scope: payload.scope,
          country_codes: payload.country_codes,
          video_ids: payload.video_ids,
          active: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) throw new Error(body?.error || "No se pudo crear el sponsor.");

      setSponsors((current) => [
        {
          id: body.id!,
          brand_name: payload.brand_name,
          logo_url: payload.logo_url,
          website_url: null,
          description: payload.description,
          discount_code: payload.discount_code,
          affiliate_url: payload.affiliate_url,
          category_name: payload.category_name,
          action_type: payload.action_type,
          action_value: payload.action_type === "coupon" ? payload.discount_code : null,
          cta_label: payload.cta_label,
          display_order: nextDisplayOrder,
          country_codes: payload.country_codes,
          video_ids: payload.video_ids,
          scope: payload.scope,
          sponsor_card_style: payload.sponsor_card_style,
          sponsor_banner_background_color: payload.sponsor_banner_background_color,
          sponsor_banner_text_color: payload.sponsor_banner_text_color,
          click_count: 0,
          start_date: null,
          end_date: null,
          internal_notes: null,
        },
        ...current,
      ]);
      setWizardOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear el sponsor.";
      setSponsorError(message);
      throw new Error(message);
    } finally {
      setCreatingSponsor(false);
    }
  }

  async function updateSponsorFromWizard(payload: SponsorWizardPayload) {
    if (!editingSponsor) return;
    setCreatingSponsor(true);
    setSponsorError(null);
    try {
      if (isDemoMode) {
        setSponsors((current) =>
          current.map((entry) =>
            entry.id === editingSponsor.id
              ? {
                  ...entry,
                  brand_name: payload.brand_name,
                  logo_url: payload.logo_url,
                  description: payload.description,
                  discount_code: payload.discount_code,
                  affiliate_url: payload.affiliate_url,
                  category_name: payload.category_name,
                  action_type: payload.action_type,
                  action_value: payload.action_type === "coupon" ? payload.discount_code : null,
                  cta_label: payload.cta_label,
                  country_codes: payload.country_codes,
                  video_ids: payload.video_ids,
                  scope: payload.scope,
                  sponsor_card_style: payload.sponsor_card_style,
                  sponsor_banner_background_color: payload.sponsor_banner_background_color,
                  sponsor_banner_text_color: payload.sponsor_banner_text_color,
                }
              : entry
          )
        );
        closeSponsorWizard();
        return;
      }

      const response = await fetch("/api/map-admin/sponsors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          sponsorId: editingSponsor.id,
          brand_name: payload.brand_name,
          logo_url: payload.logo_url,
          website_url: null,
          affiliate_url: payload.affiliate_url,
          discount_code: payload.discount_code,
          description: payload.description,
          category_name: payload.category_name,
          action_type: payload.action_type,
          action_value: payload.action_type === "coupon" ? payload.discount_code : null,
          cta_label: payload.cta_label,
          sponsor_card_style: payload.sponsor_card_style,
          sponsor_banner_background_color: payload.sponsor_banner_background_color,
          sponsor_banner_text_color: payload.sponsor_banner_text_color,
          display_order: editingSponsor.display_order ?? 100,
          scope: payload.scope,
          country_codes: payload.country_codes,
          video_ids: payload.video_ids,
          active: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) throw new Error(body?.error || "No se pudo editar el sponsor.");

      setSponsors((current) =>
        current.map((entry) =>
          entry.id === editingSponsor.id
            ? {
                ...entry,
                brand_name: payload.brand_name,
                logo_url: payload.logo_url,
                description: payload.description,
                discount_code: payload.discount_code,
                affiliate_url: payload.affiliate_url,
                category_name: payload.category_name,
                action_type: payload.action_type,
                action_value: payload.action_type === "coupon" ? payload.discount_code : null,
                cta_label: payload.cta_label,
                country_codes: payload.country_codes,
                video_ids: payload.video_ids,
                scope: payload.scope,
                sponsor_card_style: payload.sponsor_card_style,
                sponsor_banner_background_color: payload.sponsor_banner_background_color,
                sponsor_banner_text_color: payload.sponsor_banner_text_color,
              }
            : entry
        )
      );
      closeSponsorWizard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo editar el sponsor.";
      setSponsorError(message);
      throw new Error(message);
    } finally {
      setCreatingSponsor(false);
    }
  }

  const bulkRows = useMemo(() => {
    const byCountry = bulkCountryFilter === "all" ? null : bulkCountryFilter;
    const byStatus = bulkStatusFilter === "all" ? null : bulkStatusFilter;
    const byTitle = bulkTitleFilter.trim().toLowerCase();
    return videos
      .filter((video) => {
        const videoId = String(video.id || "").trim();
        if (!videoId) return false;
        if (byCountry && String(video.country_code || "").toUpperCase() !== byCountry) return false;
        const status = (video.sponsor_detection_status || "no_disponible") as "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible";
        if (byStatus && status !== byStatus) return false;
        if (byTitle && !String(video.title || "").toLowerCase().includes(byTitle)) return false;
        return true;
      })
      .map((video) => {
        const status = (video.sponsor_detection_status || "no_disponible") as "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible";
        const videoId = String(video.id || "");
        return {
          id: videoId,
          title: video.title,
          country: String(video.country_name || video.country_code || "-"),
          countryCode: String(video.country_code || "").toUpperCase(),
          status,
          sponsorDetectedText: String(video.sponsor_detectado_texto || "").trim(),
          sponsorName: directSponsorByVideoId.get(videoId) || "",
          publishedAt: video.published_at || null,
          views: Number(video.view_count || 0),
          updatedAt: video.updated_at || null,
        };
      });
  }, [videos, bulkCountryFilter, bulkStatusFilter, bulkTitleFilter, directSponsorByVideoId]);
  const bulkPageSize = 25;
  const bulkTotalPages = Math.max(1, Math.ceil(bulkRows.length / bulkPageSize));
  const safeBulkPage = Math.min(bulkPage, bulkTotalPages);
  const bulkPageRows = useMemo(() => {
    const start = (safeBulkPage - 1) * bulkPageSize;
    return bulkRows.slice(start, start + bulkPageSize);
  }, [bulkRows, safeBulkPage]);
  const bulkSelectedSet = useMemo(() => new Set(bulkSelectedVideoIds), [bulkSelectedVideoIds]);
  const bulkPageAllSelected = bulkPageRows.length > 0 && bulkPageRows.every((row) => bulkSelectedSet.has(row.id));
  const bulkAllSelected = bulkRows.length > 0 && bulkRows.every((row) => bulkSelectedSet.has(row.id));
  const bulkCountryOptions = useMemo(() => sponsorCountryOptions, [sponsorCountryOptions]);

  async function copyMapUrl() {
    try {
      const copied = await copyTextToClipboard(mapUrl);
      setCopyState(copied ? "copied" : "error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  function applySponsorOrder(orderedIds: string[]) {
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id, index) => orderMap.set(id, (index + 1) * 10));
    setSponsors((current) =>
      current.map((entry) => ({
        ...entry,
        display_order: orderMap.get(entry.id) ?? (Number.isFinite(Number(entry.display_order)) ? Number(entry.display_order) : 100),
      }))
    );
  }

  async function persistSponsorOrder(orderedIds: string[]) {
    if (isDemoMode) return;
    const response = await fetch("/api/map-admin/sponsors/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, orderedSponsorIds: orderedIds }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(body?.error || "No se pudo guardar el orden de sponsors.");
    }
  }

  async function moveSponsor(sponsorId: string, direction: -1 | 1) {
    const ids = sortedSponsors.map((entry) => entry.id);
    const index = ids.indexOf(sponsorId);
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) return;

    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    applySponsorOrder(next);
    try {
      await persistSponsorOrder(next);
    } catch (error) {
      setSponsorError(error instanceof Error ? error.message : "No se pudo guardar el orden.");
    }
  }

  async function removeSponsor(sponsorId: string) {
    if (!sponsorId) return;
    if (isDemoMode) {
      setSponsors((current) => current.filter((entry) => entry.id !== sponsorId));
      setConfirmingSponsorRemovalId(null);
      return;
    }

    setDeletingSponsorId(sponsorId);
    setSponsorError(null);
    try {
      const response = await fetch(`/api/map-admin/sponsors?channelId=${encodeURIComponent(channelId)}&sponsorId=${encodeURIComponent(sponsorId)}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo pausar el sponsor.");
      setSponsors((current) => current.filter((entry) => entry.id !== sponsorId));
      setConfirmingSponsorRemovalId(null);
    } catch (error) {
      setSponsorError(error instanceof Error ? error.message : "No se pudo pausar el sponsor.");
    } finally {
      setDeletingSponsorId(null);
    }
  }

  function toggleBulkVideo(videoId: string, checked: boolean) {
    setBulkSelectedVideoIds((current) => {
      const set = new Set(current);
      if (checked) set.add(videoId);
      else set.delete(videoId);
      return Array.from(set);
    });
  }

  function toggleBulkPage(checked: boolean) {
    const ids = bulkPageRows.map((row) => row.id);
    setBulkSelectedVideoIds((current) => {
      const set = new Set(current);
      for (const id of ids) {
        if (checked) set.add(id);
        else set.delete(id);
      }
      return Array.from(set);
    });
  }

  function toggleBulkAll(checked: boolean) {
    const ids = bulkRows.map((row) => row.id);
    setBulkSelectedVideoIds((current) => {
      const set = new Set(current);
      for (const id of ids) {
        if (checked) set.add(id);
        else set.delete(id);
      }
      return Array.from(set);
    });
  }

  async function runBulkAssign(preview: boolean) {
    if (!bulkSelectedSponsorId) {
      setBulkMessage("Selecciona un sponsor para la asignación masiva.");
      return;
    }
    if (bulkSelectedVideoIds.length === 0) {
      setBulkMessage("Selecciona al menos un video para continuar.");
      return;
    }

    setBulkBusy(preview ? "preview" : "assign");
    setBulkMessage(null);
    try {
      if (isDemoMode) {
        setBulkMessage(
          preview
            ? `Preview demo: ${bulkSelectedVideoIds.length} videos seleccionados para sponsor.`
            : `Demo: se simula asignación masiva en ${bulkSelectedVideoIds.length} videos (sin persistencia).`
        );
        if (!preview) {
          const sponsor = sponsors.find((entry) => entry.id === bulkSelectedSponsorId);
          if (sponsor) {
            setSponsors((current) =>
              current.map((entry) =>
                entry.id === sponsor.id
                  ? { ...entry, video_ids: Array.from(new Set([...(entry.video_ids || []), ...bulkSelectedVideoIds])), scope: "video" }
                  : entry
              )
            );
          }
        }
        return;
      }

      const response = await fetch("/api/map-admin/sponsors/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          sponsorId: bulkSelectedSponsorId,
          videoIds: bulkSelectedVideoIds,
          preview,
          reason: null,
          setPrimary: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            requested?: number;
            applied?: number;
            applicable?: number;
            skipped?: number;
            preview?: boolean;
            queued?: boolean;
            job?: { id?: string; status?: string; appliedCount?: number; skippedCount?: number; reversibleUntil?: string | null };
          }
        | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo ejecutar la asignación masiva.");

      if (preview) {
        setBulkMessage(`Preview listo: ${body?.requested || 0} seleccionados, ${body?.applicable ?? body?.applied ?? 0} aplicables, ${body?.skipped || 0} omitidos.`);
      } else {
        if (body?.job?.id) {
          setBulkJobId(body.job.id);
          setBulkJobStatus(body.job.status || null);
          if (body.queued) {
            setBulkMessage(
              `Job encolado: ${body.requested || 0} seleccionados, ${body.applied || 0} aplicables. Procesando en segundo plano...`
            );
            void triggerBulkWorker(body.job.id);
            void pollBulkJob(body.job.id, true);
          } else {
            setBulkMessage(`Asignación completada: ${body?.applied || 0} videos actualizados, ${body?.skipped || 0} omitidos.`);
            setBulkUndoAvailable(Boolean(body?.job?.reversibleUntil));
            setBulkLastAssignment({ sponsorId: bulkSelectedSponsorId, videoIds: bulkSelectedVideoIds });
            const sponsor = sponsors.find((entry) => entry.id === bulkSelectedSponsorId);
            if (sponsor) {
              setSponsors((current) =>
                current.map((entry) =>
                  entry.id === sponsor.id
                    ? { ...entry, video_ids: Array.from(new Set([...(entry.video_ids || []), ...bulkSelectedVideoIds])), scope: "video" }
                    : entry
                )
              );
            }
          }
        } else {
          setBulkMessage(`Asignación completada: ${body?.applied || 0} videos actualizados, ${body?.skipped || 0} omitidos.`);
        }
      }
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "No se pudo ejecutar la asignación masiva.");
    } finally {
      setBulkBusy("idle");
    }
  }

  async function triggerBulkWorker(jobId: string) {
    await fetch("/api/map-admin/sponsors/bulk-assign/worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, jobId }),
    });
  }

  async function pollBulkJob(jobId: string, fromQueue: boolean) {
    if (bulkPollTimerRef.current) {
      clearTimeout(bulkPollTimerRef.current);
      bulkPollTimerRef.current = null;
    }
    const response = await fetch(`/api/map-admin/sponsors/bulk-assign/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | { job?: { status?: string; appliedCount?: number; skippedCount?: number; reversibleUntil?: string | null; errorMessage?: string | null } }
      | null;
    if (!response.ok || !body?.job) {
      setBulkMessage("No se pudo consultar el estado del job.");
      return;
    }

    const status = String(body.job.status || "");
    setBulkJobStatus(status || null);
    if (status === "queued" || status === "running") {
      setBulkMessage(fromQueue ? "Procesando asignación masiva..." : "Job en progreso...");
      if (status === "queued") {
        void triggerBulkWorker(jobId);
      }
      bulkPollTimerRef.current = setTimeout(() => {
        void pollBulkJob(jobId, false);
      }, 1800);
      return;
    }

    if (status === "completed") {
      setBulkUndoAvailable(Boolean(body.job.reversibleUntil));
      setBulkMessage(`Asignación completada: ${body.job.appliedCount || 0} videos actualizados, ${body.job.skippedCount || 0} omitidos.`);
      setBulkLastAssignment({ sponsorId: bulkSelectedSponsorId, videoIds: bulkSelectedVideoIds });
      if (bulkSelectedSponsorId && bulkSelectedVideoIds.length > 0) {
        setSponsors((current) =>
          current.map((entry) =>
            entry.id === bulkSelectedSponsorId
              ? { ...entry, video_ids: Array.from(new Set([...(entry.video_ids || []), ...bulkSelectedVideoIds])), scope: "video" }
              : entry
          )
        );
      }
      return;
    }
    if (status === "failed") {
      setBulkUndoAvailable(false);
      setBulkMessage(body.job.errorMessage || "El job falló.");
      return;
    }
    if (status === "reverted") {
      setBulkUndoAvailable(false);
      setBulkMessage("Se deshizo la última asignación masiva.");
      return;
    }
  }

  async function undoBulkAssign() {
    if (!bulkJobId) return;
    setBulkBusy("assign");
    try {
      const response = await fetch(`/api/map-admin/sponsors/bulk-assign/jobs/${encodeURIComponent(bulkJobId)}/undo`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as { error?: string; job?: { status?: string } } | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo deshacer el job.");
      setBulkJobStatus(body?.job?.status || "reverted");
      setBulkUndoAvailable(false);
      if (bulkLastAssignment) {
        const revertedIds = new Set(bulkLastAssignment.videoIds);
        setSponsors((current) =>
          current.map((entry) =>
            entry.id === bulkLastAssignment.sponsorId
              ? { ...entry, video_ids: (entry.video_ids || []).filter((videoId) => !revertedIds.has(videoId)) }
              : entry
          )
        );
      }
      setBulkMessage("Deshacer aplicado. La tabla ya refleja la asignación revertida.");
      setBulkLastAssignment(null);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "No se pudo deshacer el job.");
    } finally {
      setBulkBusy("idle");
    }
  }

  const summaryCards = useMemo(
    () => [
      { label: "Videos", value: formatNumber(summary.total_videos), icon: Video },
      { label: "Paises", value: formatNumber(summary.total_countries), icon: GlobeHemisphereWest },
      { label: "Pendientes", value: formatNumber(summary.needs_manual), icon: MapPin },
      { label: "Votos audiencia", value: formatNumber(totalVotes), icon: Check },
    ],
    [summary, totalVotes]
  );

  return (
    <div className="space-y-4">
      <Card className="tm-surface-strong rounded-xl border-white/10">
        <CardHeader className="border-b border-white/10 px-4 pb-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-[16px] font-semibold text-[#f5f7fb]">{channelName}</CardTitle>
              <p className="mt-1 text-[12px] text-[#9da5ae]">{isDemoMode ? "Panel demo sin persistencia" : "Panel real de creador"}</p>
            </div>
            <Button type="button" size="sm" onClick={copyMapUrl}>
              {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
              {copyState === "copied" ? "Copiado" : "Compartir"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4 pt-4 md:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-[#9da5ae]">{item.label}</span>
                  <Icon size={14} className="text-[#ff3b30]" />
                </div>
                <p className="mt-2 text-[18px] font-semibold text-[#f5f7fb]">{item.value}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className={cn(activeTab === "summary" ? "block" : "hidden")}>
        <Card className="tm-surface-strong rounded-xl border-white/10">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Resumen técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-1 text-[13px] text-[#c4cbd4]">
            <p>Auto-verificados: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.verified_auto)}</span></p>
            <p>Manuales: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.verified_manual)}</span></p>
            <p>Pendientes manual: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.needs_manual)}</span></p>
          </CardContent>
        </Card>
      </section>

      <section className={cn(activeTab === "polls" ? "block" : "hidden")}>
        <FanVoteCard
          channelId={channelId}
          viewer={ownerViewer}
          poll={pollState}
          fanVotes={initialFanVotes}
          availableOptions={availablePollOptions}
          isDemoMode={isDemoMode}
          onPollChange={setPollState}
        />
      </section>

      <section className={cn(activeTab === "sponsors" ? "block" : "hidden")}>
        <Card className="tm-surface-strong !overflow-visible rounded-xl border-white/10">
          <CardHeader className="border-b border-white/[0.06] px-4 pb-3 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Sponsors</CardTitle>
                <p className="mt-0.5 text-[12px] text-[#7a8490]">
                  {sponsors.length === 0 ? "Sin sponsors activos" : `${sponsors.length} sponsor${sponsors.length !== 1 ? "s" : ""} activo${sponsors.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateSponsor}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-all duration-200",
                  wizardOpen && !editingSponsorId
                    ? "border-white/15 bg-white/[0.06] text-[#c4cbd4] hover:bg-white/[0.09]"
                    : "border-[#ff5a3d]/30 bg-[#ff5a3d]/10 text-[#ff8d74] hover:bg-[#ff5a3d]/20 shadow-[0_4px_20px_-8px_rgba(255,90,61,0.35)]"
                )}
              >
                {wizardOpen && !editingSponsorId ? (
                  <>
                    <span className="text-lg leading-none">×</span> Cerrar wizard
                  </>
                ) : (
                  <>
                    <Sparkle size={15} weight="fill" />
                    Nuevo sponsor
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-4 pt-4">
            {/* ── Wizard ─────────────────────────────────────────────────── */}
            {wizardOpen && (
              <div className="relative">
                {/* Animated entry */}
                <div className="animate-in fade-in duration-300">
                  <SponsorCreatorWizard
                    key={editingSponsor ? `edit-${editingSponsor.id}` : "create"}
                    channelId={channelId}
                    isDemoMode={isDemoMode}
                    mode={editingSponsor ? "edit" : "create"}
                    initialValues={editingSponsor ? getSponsorWizardInitialValues(editingSponsor) : null}
                    videos={videos}
                    countryOptions={sponsorCountryOptions}
                    videoOptions={sponsorVideoOptions}
                    categoryOptions={sponsorCategoryOptions}
                    onSubmit={editingSponsor ? updateSponsorFromWizard : createSponsorFromWizard}
                    onCancel={closeSponsorWizard}
                    isSubmitting={creatingSponsor}
                    error={sponsorError}
                  />
                </div>
              </div>
            )}
            {sponsorError && !wizardOpen ? <p className="text-[12px] text-[#ffb4b4]">{sponsorError}</p> : null}
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#c4cbd4]">Sponsors activos</p>
                  <p className="mt-1 text-[11px] text-[#7a8490]">
                    Edita, ordena o pausa sponsors sin perder métricas ni historial.
                  </p>
                </div>
                <p className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-[#9da5ae]">
                  Multi sponsor se muestra con 2 o más sponsors por card.
                </p>
              </div>
              {sortedSponsors.map((sponsor, index) => (
                <div key={sponsor.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      {sponsor.logo_url ? (
                        <Image src={sponsor.logo_url} alt={sponsor.brand_name} fill sizes="44px" className="object-contain p-1.5" unoptimized />
                      ) : (
                        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#f5f7fb]">
                          {sponsor.brand_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-[#f5f7fb]">{sponsor.brand_name}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#d8dfe6]">
                          {getSponsorCardStyleLabel(sponsor.sponsor_card_style, (sponsor.video_ids?.length || 0) || sponsor.country_codes.length)}
                        </span>
                        {sponsor.action_type === "coupon" && sponsor.discount_code ? (
                          <span className="rounded-full border border-[#ffd66f]/25 bg-[#ffd66f]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#ffd66f]">
                            {sponsor.discount_code}
                          </span>
                        ) : null}
                      </div>
                      {sponsor.category_name ? <p className="truncate text-[11px] text-[#d8dfe8]">{sponsor.category_name}</p> : null}
                      <p className="truncate text-[11px] text-[#9da5ae]">{formatSponsorCoverage(sponsor, sponsorVideoTitleById)}</p>
                      {sponsor.cta_label ? <p className="truncate text-[11px] text-[#7a8490]">CTA: {sponsor.cta_label}</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditSponsor(sponsor.id)}
                      aria-label={`Editar sponsor ${sponsor.brand_name}`}
                    >
                      <PencilSimple size={14} />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => void moveSponsor(sponsor.id, -1)}
                      disabled={index === 0}
                      aria-label={`Subir sponsor ${sponsor.brand_name}`}
                    >
                      <CaretUp size={14} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => void moveSponsor(sponsor.id, 1)}
                      disabled={index === sortedSponsors.length - 1}
                      aria-label={`Bajar sponsor ${sponsor.brand_name}`}
                    >
                      <CaretDown size={14} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirmingSponsorRemovalId === sponsor.id) {
                          void removeSponsor(sponsor.id);
                          return;
                        }
                        setConfirmingSponsorRemovalId(sponsor.id);
                      }}
                      disabled={deletingSponsorId === sponsor.id}
                      aria-label={
                        confirmingSponsorRemovalId === sponsor.id
                          ? `Confirmar pausa de ${sponsor.brand_name}`
                          : `Pausar sponsor ${sponsor.brand_name}`
                      }
                      className={cn(
                        "px-3",
                        confirmingSponsorRemovalId === sponsor.id
                          ? "border-[#ff5a3d]/35 bg-[#ff5a3d]/10 text-[#ff9a84]"
                          : ""
                      )}
                    >
                      {deletingSponsorId === sponsor.id ? <ArrowsClockwise size={14} className="animate-spin" /> : <Trash size={14} />}
                      {deletingSponsorId === sponsor.id
                        ? "Pausando..."
                        : confirmingSponsorRemovalId === sponsor.id
                          ? "Confirmar pausa"
                          : "Pausar"}
                    </Button>
                    {confirmingSponsorRemovalId === sponsor.id && deletingSponsorId !== sponsor.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmingSponsorRemovalId(null)}
                        aria-label={`Cancelar pausa de ${sponsor.brand_name}`}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {sponsors.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-[12px] text-[#9da5ae]">No hay sponsors cargados. Crea el primero para activar el preview y asignaciones.</p> : null}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#c4cbd4]">Asignación masiva por video</p>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <select
                  value={bulkCountryFilter}
                  onChange={(event) => {
                    setBulkCountryFilter(event.target.value);
                    setBulkPage(1);
                  }}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-[#f5f7fb] outline-none"
                >
                  <option value="all">Todos los países</option>
                  {bulkCountryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
                <input
                  value={bulkTitleFilter}
                  onChange={(event) => {
                    setBulkTitleFilter(event.target.value);
                    setBulkPage(1);
                  }}
                  placeholder="Buscar por título"
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-[#f5f7fb] outline-none"
                />
                <select
                  value={bulkStatusFilter}
                  onChange={(event) => {
                    setBulkStatusFilter(event.target.value as "all" | "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible");
                    setBulkPage(1);
                  }}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-[#f5f7fb] outline-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="detectado_automaticamente">Detectado automáticamente</option>
                  <option value="pendiente_revision">Pendiente revisión</option>
                  <option value="no_disponible">No disponible</option>
                </select>
                <select
                  value={bulkSelectedSponsorId}
                  onChange={(event) => setBulkSelectedSponsorId(event.target.value)}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-[#f5f7fb] outline-none"
                >
                  <option value="">Selecciona sponsor</option>
                  {sponsors.map((sponsor) => (
                    <option key={sponsor.id} value={sponsor.id}>
                      {sponsor.brand_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[#9da5ae]">
                  Selecciona videos filtrados por estado, país o búsqueda para asignar o revisar en lote.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleBulkAll(true)}
                    disabled={bulkRows.length === 0 || bulkAllSelected}
                  >
                    Seleccionar todo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelectedVideoIds([])}
                    disabled={bulkSelectedVideoIds.length === 0}
                  >
                    Quitar selección
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void runBulkAssign(true)} disabled={bulkBusy !== "idle"}>
                  {bulkBusy === "preview" ? "Preview..." : "Preview"}
                </Button>
                <Button type="button" size="sm" onClick={() => void runBulkAssign(false)} disabled={bulkBusy !== "idle"}>
                  {bulkBusy === "assign" ? "Asignando..." : "Asignar sponsor"}
                </Button>
              </div>
              {bulkJobId ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#9da5ae]">
                  <span>Job: {bulkJobId}</span>
                  <span>Estado: {bulkJobStatus || "-"}</span>
                  {bulkUndoAvailable ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void undoBulkAssign()} disabled={bulkBusy !== "idle"}>
                      Deshacer asignación
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {bulkMessage ? <p className="mt-2 text-[12px] text-[#b7d9ff]">{bulkMessage}</p> : null}

              <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full text-left text-[12px]">
                  <thead className="bg-white/[0.03] text-[#9da5ae]">
                    <tr>
                      <th className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={bulkPageAllSelected}
                          onChange={(event) => toggleBulkPage(event.currentTarget.checked)}
                          aria-label="Seleccionar todos en página"
                        />
                      </th>
                      <th className="px-2 py-2">Título</th>
                      <th className="px-2 py-2">País</th>
                      <th className="px-2 py-2">Estado sponsor</th>
                      <th className="px-2 py-2">Sponsor asignado</th>
                      <th className="px-2 py-2">Publicado</th>
                      <th className="px-2 py-2">Vistas</th>
                      <th className="px-2 py-2">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPageRows.map((row) => (
                      <tr key={row.id} className="border-t border-white/10 text-[#dce2ea]">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={bulkSelectedSet.has(row.id)}
                            onChange={(event) => toggleBulkVideo(row.id, event.currentTarget.checked)}
                            aria-label={`Seleccionar ${row.title}`}
                          />
                        </td>
                        <td className="max-w-[340px] px-2 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 truncate">{row.title}</span>
                            {row.status !== "no_disponible" ? (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                                  row.status === "confirmado"
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                    : row.status === "detectado_automaticamente"
                                      ? "border-[#ffb84d]/25 bg-[#ffb84d]/10 text-[#ffd38a]"
                                      : "border-[#ff5a3d]/25 bg-[#ff5a3d]/10 text-[#ff9a84]"
                                )}
                                title={row.sponsorDetectedText || "Sponsor detectado por la API de YouTube"}
                              >
                                {row.status === "confirmado"
                                  ? "Sponsor"
                                  : row.status === "detectado_automaticamente"
                                    ? "Detectado"
                                    : "Revisar"}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={cn(
                              "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                              getBulkPillToneClasses(row.status)
                            )}
                            title={`${row.country} (${row.countryCode})`}
                          >
                            {row.countryCode ? (
                              <span className={`fi fi-${row.countryCode.toLowerCase()} shrink-0 text-[12px] leading-none`} />
                            ) : (
                              <span className="shrink-0 text-[11px] leading-none">🌍</span>
                            )}
                            <span className="min-w-0 truncate">{row.country}</span>
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">
                              {row.countryCode || "--"}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-2">{formatSponsorStatus(row.status)}</td>
                        <td className="px-2 py-2">
                          {row.sponsorName ? (
                            <span
                              className={cn(
                                "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                getBulkSponsorPillClasses(row.status)
                              )}
                              title={row.sponsorName}
                            >
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black uppercase tracking-[0.08em]",
                                  row.status === "confirmado"
                                    ? "bg-emerald-400/15 text-emerald-300"
                                    : row.status === "detectado_automaticamente"
                                      ? "bg-amber-400/15 text-amber-300"
                                      : "bg-[#ff5a3d]/15 text-[#ff9a84]"
                                )}
                              >
                                SP
                              </span>
                              <span className="min-w-0 truncate">{row.sponsorName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-[#8f98a4]">
                              Vacío
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">{formatDateShort(row.publishedAt)}</td>
                        <td className="px-2 py-2">{formatNumber(row.views)}</td>
                        <td className="px-2 py-2">{formatDateShort(row.updatedAt)}</td>
                      </tr>
                    ))}
                    {bulkPageRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-4 text-center text-[#9da5ae]">
                          No hay videos con esos filtros.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#9da5ae]">
                <span>
                  Seleccionados: {bulkSelectedVideoIds.length} / Resultados: {bulkRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkPage((current) => Math.max(1, current - 1))}
                    disabled={safeBulkPage <= 1}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {safeBulkPage} / {bulkTotalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkPage((current) => Math.min(bulkTotalPages, current + 1))}
                    disabled={safeBulkPage >= bulkTotalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={cn(activeTab === "ops" ? "block" : "hidden")}>
        <Card className="tm-surface-strong rounded-xl border-white/10">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Operaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-1 text-[13px] text-[#c4cbd4]">
            <p>Estado de votación live: <span className="font-semibold text-[#f5f7fb]">{activeLive ? "Activa" : "Cerrada"}</span></p>
            <p>Videos pendientes de verificación manual: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.needs_manual)}</span></p>
            <a href={mapUrl} className="inline-flex text-[12px] font-medium text-[#ff6a4e] hover:text-[#ff7f66]">Abrir mapa para revisión visual</a>
          </CardContent>
        </Card>
      </section>

      <section className={cn(activeTab === "activity" ? "block" : "hidden")}>
        <Card className="tm-surface-strong rounded-xl border-white/10">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Actividad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-1 text-[13px] text-[#c4cbd4]">
            <p>Votos acumulados: <span className="font-semibold text-[#f5f7fb]">{formatNumber(totalVotes)}</span></p>
            <p>Paises alcanzados por videos: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.total_countries)}</span></p>
            <p>Videos publicados mapeados: <span className="font-semibold text-[#f5f7fb]">{formatNumber(summary.total_videos)}</span></p>
          </CardContent>
        </Card>
        <div className="mt-4">
          <AnalyticsDashboard channelId={channelId} />
        </div>
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}

function formatDateShort(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatSponsorStatus(status: "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible") {
  switch (status) {
    case "confirmado":
      return "Confirmado";
    case "detectado_automaticamente":
      return "Detectado automáticamente";
    case "pendiente_revision":
      return "Pendiente revisión";
    default:
      return "No disponible";
  }
}

function formatSponsorCoverage(sponsor: MapRailSponsor, videoTitleById: Map<string, string>) {
  const scope = sponsor.scope || ((sponsor.video_ids || []).length > 0 ? "video" : (sponsor.country_codes || []).length > 0 ? "country" : "global");
  if (scope === "video") {
    const videoIds = sponsor.video_ids || [];
    const firstTitle = videoIds[0] ? videoTitleById.get(videoIds[0]) : null;
    if (!videoIds.length) return "VIDEO · sin videos";
    if (firstTitle && videoIds.length === 1) return `VIDEO · ${firstTitle}`;
    if (firstTitle) return `VIDEO · ${firstTitle} +${videoIds.length - 1}`;
    return `VIDEO · ${videoIds.length} videos`;
  }
  if (scope === "country") {
    const countryCodes = sponsor.country_codes || [];
    return `PAIS · ${countryCodes.join(", ") || "sin países"}`;
  }
  return "GLOBAL";
}

function getBulkPillToneClasses(status: "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible") {
  switch (status) {
    case "confirmado":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "detectado_automaticamente":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "pendiente_revision":
      return "border-[#ff5a3d]/20 bg-[#ff5a3d]/10 text-[#ffd0c6]";
    default:
      return "border-white/10 bg-white/[0.03] text-[#d8dfe6]";
  }
}

function getBulkSponsorPillClasses(status: "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible") {
  switch (status) {
    case "confirmado":
      return "border-emerald-500/20 bg-emerald-500/8 text-emerald-100";
    case "detectado_automaticamente":
      return "border-amber-500/20 bg-amber-500/8 text-amber-50";
    case "pendiente_revision":
      return "border-[#ff5a3d]/20 bg-[#ff5a3d]/8 text-[#ffd0c6]";
    default:
      return "border-white/10 bg-white/[0.03] text-[#d8dfe6]";
  }
}
