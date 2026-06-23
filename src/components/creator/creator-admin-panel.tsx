"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ArrowsClockwise, CaretDown, CaretUp, Check, Copy, GlobeHemisphereWest, MapPin, PencilSimple, Sparkle, Trash, Video, MonitorPlay, Users, WarningCircle, Eye, HandPointing, DotsThreeVertical } from "@phosphor-icons/react";
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

type SponsorDetectionStatus = "confirmado" | "detectado_automaticamente" | "pendiente_revision" | "no_disponible";
type BulkSponsorFilter = "all" | SponsorDetectionStatus;

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
  const [bulkStatusFilter, setBulkStatusFilter] = useState<BulkSponsorFilter>("all");
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
  const sponsorNamesByVideoId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const sponsor of sponsors) {
      for (const videoId of sponsor.video_ids || []) {
        const current = map.get(videoId) || [];
        current.push(sponsor.brand_name);
        map.set(videoId, current);
      }
    }
    return map;
  }, [sponsors]);
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
        sponsor_names: Array.from(new Set(sponsorNamesByVideoId.get(entry.videoId) || [])),
      }));
  }, [videos, sponsorNamesByVideoId]);
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
      { label: "Videos", value: formatNumber(summary.total_videos), icon: Video, color: "text-blue-400", bg: "bg-blue-400/10" },
      { label: "Países", value: formatNumber(summary.total_countries), icon: GlobeHemisphereWest, color: "text-emerald-400", bg: "bg-emerald-400/10" },
      { label: "Pendientes", value: formatNumber(summary.needs_manual), icon: MapPin, color: "text-[#ff5a3d]", bg: "bg-[#ff5a3d]/10" },
      { label: "Votos", value: formatNumber(totalVotes), icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
    ],
    [summary, totalVotes]
  );

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] border border-white/5 shadow-inner">
              <span className="text-xl font-black text-white">{channelName.slice(0,1).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">{channelName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isDemoMode ? "bg-amber-400" : "bg-emerald-400")} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isDemoMode ? "bg-amber-500" : "bg-emerald-500")} />
                </span>
                <p className="text-[13px] font-medium text-[#8f98a4]">{isDemoMode ? "Modo Demo" : "Panel en vivo"}</p>
              </div>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            className="rounded-full border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all" 
            onClick={copyMapUrl}
          >
            {copyState === "copied" ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copyState === "copied" ? "Copiado" : "Copiar Enlace"}
          </Button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 gap-px bg-white/5 md:grid-cols-4 border-t border-white/5">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-[#0a0a0b] p-5 md:p-6 group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110", item.bg)}>
                    <Icon size={20} className={item.color} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7a8490]">{item.label}</p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight text-white">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab === "summary" ? "block" : "hidden")}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="tm-surface-strong rounded-2xl border-white/5 bg-white/[0.01]">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7a8490]">Verificados Auto</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold text-emerald-400">{formatNumber(summary.verified_auto)}</p>
            </CardContent>
          </Card>
          <Card className="tm-surface-strong rounded-2xl border-white/5 bg-white/[0.01]">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#7a8490]">Manuales</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold text-blue-400">{formatNumber(summary.verified_manual)}</p>
            </CardContent>
          </Card>
          <Card className="tm-surface-strong rounded-2xl border-white/5 bg-[#ff5a3d]/[0.02] border-[#ff5a3d]/10">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#ff8d74]">Pendientes Manual</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold text-[#ff5a3d]">{formatNumber(summary.needs_manual)}</p>
            </CardContent>
          </Card>
        </div>
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

      <section className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab === "sponsors" ? "block" : "hidden")}>
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5 md:p-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Sponsors Activos</h3>
              <p className="mt-1 text-sm text-[#8f98a4]">
                {sponsors.length === 0 ? "Sin sponsors activos" : `${sponsors.length} sponsor${sponsors.length !== 1 ? "s" : ""} activo${sponsors.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button
              type="button"
              onClick={openCreateSponsor}
              className={cn(
                "rounded-full px-5 font-semibold transition-all shadow-lg",
                wizardOpen && !editingSponsorId
                  ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-emerald-500/20"
              )}
            >
              {wizardOpen && !editingSponsorId ? (
                <>
                  <span className="text-lg mr-1">×</span> Cerrar
                </>
              ) : (
                <>
                  <Sparkle size={16} weight="fill" className="mr-2" />
                  Nuevo Sponsor
                </>
              )}
            </Button>
          </div>
          
          <div className="p-5 md:p-6 space-y-6">
            {/* ── Wizard ─────────────────────────────────────────────────── */}
            {wizardOpen && (
              <div className="relative">
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
            {sponsorError && !wizardOpen ? <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">{sponsorError}</p> : null}
            
            <div className="space-y-3">
              {sortedSponsors.map((sponsor, index) => {
                const scope = sponsor.scope || ((sponsor.video_ids || []).length > 0 ? "video" : (sponsor.country_codes || []).length > 0 ? "country" : "global");
                return (
                  <div key={sponsor.id} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-transparent bg-white/[0.02] p-4 transition-all hover:border-white/5 hover:bg-white/[0.04]">
                    <div className="flex min-w-0 items-start md:items-center gap-4">
                      {/* Logo or initial */}
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner">
                        {sponsor.logo_url ? (
                          <Image src={sponsor.logo_url} alt={sponsor.brand_name} fill sizes="56px" className="object-contain p-2" unoptimized />
                        ) : (
                          <span className="text-lg font-black uppercase tracking-wider text-white">
                            {sponsor.brand_name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-white">{sponsor.brand_name}</h4>
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                            {getSponsorCardStyleLabel(sponsor.sponsor_card_style, (sponsor.video_ids?.length || 0) || sponsor.country_codes.length)}
                          </span>
                          {sponsor.action_type === "coupon" && sponsor.discount_code ? (
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-400">
                              🎟 {sponsor.discount_code}
                            </span>
                          ) : null}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8f98a4]">
                          {sponsor.category_name ? <span className="font-medium text-blue-300/80">{sponsor.category_name}</span> : null}
                          
                          {/* Scope / Coverage with Flags */}
                          <div className="flex items-center gap-1">
                            {scope === "country" ? (
                              <>
                                <GlobeHemisphereWest size={14} className="text-emerald-400/70" />
                                <div className="flex gap-1 ml-0.5">
                                  {(sponsor.country_codes || []).map((code) => (
                                    <span key={code} className={`fi fi-${code.toLowerCase()} rounded-[2px] text-[12px] shadow-sm`} title={code} />
                                  ))}
                                </div>
                              </>
                            ) : scope === "video" ? (
                              <>
                                <MonitorPlay size={14} className="text-purple-400/70" />
                                <span>{(sponsor.video_ids || []).length} videos</span>
                              </>
                            ) : (
                              <>
                                <GlobeHemisphereWest size={14} className="text-white/40" />
                                <span>Global</span>
                              </>
                            )}
                          </div>
                          
                          {sponsor.cta_label ? <span className="flex items-center gap-1"><HandPointing size={14} className="text-white/30" /> {sponsor.cta_label}</span> : null}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white"
                        onClick={() => openEditSponsor(sponsor.id)}
                        title="Editar"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      <div className="flex flex-col gap-0.5 ml-1 mr-1">
                        <button
                          type="button"
                          className="flex h-4 w-6 items-center justify-center rounded-sm bg-white/5 hover:bg-white/15 disabled:opacity-30 transition-colors"
                          onClick={() => void moveSponsor(sponsor.id, -1)}
                          disabled={index === 0}
                          title="Subir"
                        >
                          <CaretUp size={12} weight="bold" />
                        </button>
                        <button
                          type="button"
                          className="flex h-4 w-6 items-center justify-center rounded-sm bg-white/5 hover:bg-white/15 disabled:opacity-30 transition-colors"
                          onClick={() => void moveSponsor(sponsor.id, 1)}
                          disabled={index === sortedSponsors.length - 1}
                          title="Bajar"
                        >
                          <CaretDown size={12} weight="bold" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirmingSponsorRemovalId === sponsor.id) {
                            void removeSponsor(sponsor.id);
                            return;
                          }
                          setConfirmingSponsorRemovalId(sponsor.id);
                        }}
                        disabled={deletingSponsorId === sponsor.id}
                        className={cn(
                          "h-9 w-9 rounded-full transition-colors",
                          confirmingSponsorRemovalId === sponsor.id
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400"
                        )}
                        title={confirmingSponsorRemovalId === sponsor.id ? "Confirmar pausa" : "Pausar"}
                      >
                        {deletingSponsorId === sponsor.id ? <ArrowsClockwise size={16} className="animate-spin" /> : <Trash size={16} />}
                      </Button>
                      {confirmingSponsorRemovalId === sponsor.id && deletingSponsorId !== sponsor.id ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-400 ml-1 hover:text-red-300"
                          onClick={() => setConfirmingSponsorRemovalId(null)}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {sponsors.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-3">
                    <Sparkle size={24} className="text-white/40" />
                  </div>
                  <h4 className="text-base font-semibold text-white">No hay sponsors</h4>
                  <p className="mt-1 text-sm text-[#8f98a4] max-w-sm">Crea tu primer sponsor para activar el preview interactivo y comenzar la asignación a tus videos.</p>
                </div>
              ) : null}
            </div>
            <div className="mt-10">
              <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white/80">Asignación Masiva</h4>
                  <p className="mt-1 text-xs text-[#8f98a4]">
                    Filtra videos y asígnales sponsors en lote.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" className="h-8 bg-white/5 hover:bg-white/10 text-xs" onClick={() => toggleBulkAll(true)} disabled={bulkRows.length === 0 || bulkAllSelected}>
                    Todo
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 bg-white/5 hover:bg-white/10 text-xs" onClick={() => setBulkSelectedVideoIds([])} disabled={bulkSelectedVideoIds.length === 0}>
                    Nada
                  </Button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row items-center gap-2 mb-4 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                <div className="flex items-center px-3 py-1.5 md:border-r border-white/10 w-full md:w-auto md:flex-1">
                  <select value={bulkCountryFilter} onChange={(e) => { setBulkCountryFilter(e.target.value); setBulkPage(1); }} className="w-full bg-transparent text-xs font-medium text-white outline-none cursor-pointer">
                    <option value="all" className="bg-[#0a0a0b]">🌍 Todos los países</option>
                    {bulkCountryOptions.map((c) => <option key={c.code} value={c.code} className="bg-[#0a0a0b]">{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center px-3 py-1.5 md:border-r border-white/10 w-full md:w-auto md:flex-1">
                  <select value={bulkStatusFilter} onChange={(e) => { setBulkStatusFilter(e.target.value as BulkSponsorFilter); setBulkPage(1); }} className="w-full bg-transparent text-xs font-medium text-white outline-none cursor-pointer">
                    <option value="all" className="bg-[#0a0a0b]">⚪️ Cualquier estado</option>
                    <option value="confirmado" className="bg-[#0a0a0b]">🟢 Confirmado</option>
                    <option value="detectado_automaticamente" className="bg-[#0a0a0b]">🟡 Detectado</option>
                    <option value="pendiente_revision" className="bg-[#0a0a0b]">🟠 Pendiente</option>
                    <option value="no_disponible" className="bg-[#0a0a0b]">⚫️ Vacío</option>
                  </select>
                </div>
                <div className="flex items-center px-3 py-1.5 w-full md:w-auto md:flex-[2]">
                  <input value={bulkTitleFilter} onChange={(e) => { setBulkTitleFilter(e.target.value); setBulkPage(1); }} placeholder="Buscar video por título..." className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-white/20" />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] mb-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select value={bulkSelectedSponsorId} onChange={(e) => setBulkSelectedSponsorId(e.target.value)} className="h-9 w-full md:w-56 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 text-xs font-bold text-indigo-300 outline-none cursor-pointer transition-colors hover:bg-indigo-500/20">
                    <option value="" className="bg-[#0a0a0b] text-white">Seleccionar Sponsor...</option>
                    {sponsors.map((s) => <option key={s.id} value={s.id} className="bg-[#0a0a0b] text-white">{s.brand_name}</option>)}
                  </select>
                  <span className="text-xs font-medium text-indigo-200/50 whitespace-nowrap">{bulkSelectedVideoIds.length} seleccionados</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button type="button" size="sm" variant="ghost" className="h-9 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200" onClick={() => void runBulkAssign(true)} disabled={bulkBusy !== "idle"}>
                    <Eye size={16} className="mr-1.5" />
                    Preview
                  </Button>
                  <Button type="button" size="sm" className="h-9 bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20" onClick={() => void runBulkAssign(false)} disabled={bulkBusy !== "idle" || !bulkSelectedSponsorId || bulkSelectedVideoIds.length === 0}>
                    {bulkBusy === "assign" ? <ArrowsClockwise size={16} className="animate-spin mr-1.5" /> : <Check size={16} weight="bold" className="mr-1.5" />}
                    Asignar
                  </Button>
                </div>
              </div>

              {bulkJobId ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-[#9da5ae]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><DotsThreeVertical size={14}/> Job: <span className="font-mono text-white/70">{bulkJobId}</span></span>
                    <span className="flex items-center gap-1.5"><WarningCircle size={14}/> Estado: <span className="font-semibold text-white">{bulkJobStatus || "-"}</span></span>
                  </div>
                  {bulkUndoAvailable ? (
                    <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => void undoBulkAssign()} disabled={bulkBusy !== "idle"}>
                      Deshacer asignación
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {bulkMessage ? <p className="mb-4 text-xs font-medium text-blue-300 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">{bulkMessage}</p> : null}

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#050505]/50">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-white/5 bg-white/[0.02] text-[#7a8490]">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={bulkPageAllSelected} onChange={(e) => toggleBulkPage(e.currentTarget.checked)} className="rounded border-white/20 bg-white/5 accent-indigo-500" />
                      </th>
                      <th className="px-3 py-3 font-medium uppercase tracking-wider">Video</th>
                      <th className="px-3 py-3 font-medium uppercase tracking-wider">Ubicación</th>
                      <th className="px-3 py-3 font-medium uppercase tracking-wider">Sponsor</th>
                      <th className="px-3 py-3 font-medium uppercase tracking-wider text-right">Métricas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bulkPageRows.map((row) => (
                      <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={bulkSelectedSet.has(row.id)} onChange={(e) => toggleBulkVideo(row.id, e.currentTarget.checked)} className="rounded border-white/20 bg-white/5 accent-indigo-500" />
                        </td>
                        <td className="max-w-[280px] px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="truncate font-medium text-white/90">{row.title}</span>
                            <div className="flex items-center gap-2">
                              {row.status !== "no_disponible" ? (
                                <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider", row.status === "confirmado" ? "text-emerald-400" : row.status === "detectado_automaticamente" ? "text-amber-400" : "text-[#ff5a3d]")}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", row.status === "confirmado" ? "bg-emerald-400" : row.status === "detectado_automaticamente" ? "bg-amber-400" : "bg-[#ff5a3d]")} />
                                  {row.status === "confirmado" ? "Confirmado" : row.status === "detectado_automaticamente" ? "Auto" : "Revisar"}
                                </span>
                              ) : <span className="text-[9px] text-white/20 uppercase tracking-wider">Sin Status</span>}
                              <span className="text-[10px] text-white/30">{formatDateShort(row.publishedAt)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {row.countryCode ? <span className={`fi fi-${row.countryCode.toLowerCase()} rounded-[2px] text-sm shadow-sm`} /> : <GlobeHemisphereWest size={14} className="text-white/20" />}
                            <span className="truncate text-white/70">{row.country}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {row.sponsorName ? (
                            <span className={cn("inline-flex max-w-[150px] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold", getBulkSponsorPillClasses(row.status))}>
                              <Sparkle size={10} weight="fill" />
                              <span className="truncate">{row.sponsorName}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-white/80">{formatNumber(row.views)}</span>
                            <span className="text-[9px] text-white/30 uppercase tracking-wider">Vistas</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bulkPageRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#9da5ae]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <WarningCircle size={24} className="text-white/20" />
                            <p>No se encontraron videos con esos filtros.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#9da5ae] px-1">
                <span>
                  {bulkSelectedVideoIds.length} seleccionados de {bulkRows.length} resultados
                </span>
                <div className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-1 border border-white/5">
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 hover:bg-white/5" onClick={() => setBulkPage((c) => Math.max(1, c - 1))} disabled={safeBulkPage <= 1}>
                    <CaretDown size={14} className="rotate-90" />
                  </Button>
                  <span className="px-2 font-medium">
                    {safeBulkPage} <span className="text-white/30 mx-1">/</span> {bulkTotalPages}
                  </span>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 hover:bg-white/5" onClick={() => setBulkPage((c) => Math.min(bulkTotalPages, c + 1))} disabled={safeBulkPage >= bulkTotalPages}>
                    <CaretDown size={14} className="-rotate-90" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab === "ops" ? "block" : "hidden")}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] shadow-xl backdrop-blur-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <GlobeHemisphereWest size={20} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white">Revisión y Mapa</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8f98a4]">Estado de votación</p>
                  <p className={cn("mt-1 text-sm font-bold", activeLive ? "text-emerald-400" : "text-white/40")}>
                    {activeLive ? "🟢 Activa y Recibiendo Votos" : "⚫️ Cerrada"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-xl border border-[#ff5a3d]/10 bg-[#ff5a3d]/[0.02] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#ff8d74]">Cola de Verificación</p>
                  <p className="mt-1 text-sm text-white"><span className="font-bold text-[#ff5a3d]">{formatNumber(summary.needs_manual)}</span> videos requieren revisión manual.</p>
                </div>
                <Button type="button" size="sm" className="bg-[#ff5a3d] hover:bg-[#ff4728] text-white shadow-lg shadow-[#ff5a3d]/20" onClick={() => window.open(mapUrl, "_blank")}>
                  Revisar en Mapa <MapPin size={14} className="ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab === "activity" ? "block" : "hidden")}>
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="flex flex-col justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Users size={16} weight="duotone" />
              <p className="text-xs font-semibold uppercase tracking-wider">Votos Acumulados</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(totalVotes)}</p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <GlobeHemisphereWest size={16} weight="duotone" />
              <p className="text-xs font-semibold uppercase tracking-wider">Países Alcanzados</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(summary.total_countries)}</p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Video size={16} weight="duotone" />
              <p className="text-xs font-semibold uppercase tracking-wider">Videos Mapeados</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(summary.total_videos)}</p>
          </div>
        </div>
        
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] shadow-xl backdrop-blur-md p-1 md:p-4">
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

function getBulkSponsorPillClasses(status: SponsorDetectionStatus) {
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
