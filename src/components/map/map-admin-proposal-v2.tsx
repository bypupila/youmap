"use client";

import {
  ArrowUpRight,
  Bell,
  ChartBar,
  CheckCircle,
  Clock,
  Eye,
  EyeSlash,
  Flag,
  GlobeHemisphereWest,
  House,
  List,
  PencilSimple,
  Play,
  Star,
  Tag,
  Users,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SponsorCreatorWizard, type SponsorWizardPayload } from "@/components/creator/sponsor-creator-wizard";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  CreatorAdminCountry,
  CreatorAdminAlert,
  CreatorAdminPayload,
  CreatorAdminPoll,
  CreatorAdminSponsor,
  CreatorAdminTab,
  CreatorAdminUiStatus,
  CreatorAdminVideo,
} from "@/lib/creator-admin-data";
import {
  PollEditorFields,
  buildPollEditorCountriesFromVideos,
  buildPollEditorFormState,
  type PollEditorFormState,
} from "@/components/map/poll-editor-form";
import { cn } from "@/lib/utils";
import type { TravelVideoLocation } from "@/lib/types";
import {
  SPONSOR_CARD_STYLE_OPTIONS,
  getSponsorCardStyleLabel,
  normalizeSponsorCardStyle,
} from "@/lib/sponsor-card-style";

type InitialFilters = {
  status: string;
  country: string;
  modal: string | null;
  id: string | null;
};

type SponsorReportLinkSummary = {
  id: string;
  sponsor_id: string;
  sponsor_name: string;
  active: boolean;
  period_days: number;
  view_count: number;
  last_viewed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  public_url?: string;
};

type SponsorReportCadence = "weekly" | "monthly" | "quarterly";

type SponsorReportScheduleSummary = {
  id: string;
  channel_id: string;
  sponsor_id: string;
  sponsor_name: string;
  cadence: SponsorReportCadence;
  period_days: number;
  recipient_email: string;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_report_link_id: string | null;
  last_report_public_url?: string;
  last_email_sent_at: string | null;
  last_error: string | null;
  paused_at: string | null;
  created_at: string;
};

type MediaKitAdminPayload = {
  settings: {
    public_enabled: boolean;
    headline: string | null;
    bio: string | null;
    audience_note: string | null;
    partnership_email: string | null;
    rate_card_url: string | null;
    preferred_cta_label: string | null;
    featured_country_codes: string[];
  };
  urls: {
    mediaKitUrl: string;
    mapUrl: string;
    absoluteMediaKitUrl: string;
  };
  summary: {
    videos: number;
    countries: number;
    cities: number;
    youtube_views: number;
    youtube_likes: number;
    map_events_30d: number;
    sponsor_clicks_30d: number;
    inquiries_30d: number;
    active_sponsors: number;
  };
  topCountries: Array<{ country_code: string; country_name: string; videos_count: number; youtube_views: number; map_events: number }>;
};

type SponsorCrmStatus = "lead" | "proposal" | "negotiation" | "active" | "delivered" | "paid" | "lost";
type SponsorInquiryPipelineStatus = "new" | "reviewed" | "contacted" | "proposal_sent" | "negotiation" | "won" | "lost";
type SponsorDeliverableStatus = "todo" | "in_progress" | "submitted" | "approved" | "published";
type SponsorPaymentStatus = "pending" | "invoiced" | "paid" | "overdue";
type SponsorAgreementType = "paid_sponsor" | "barter" | "hotel_stay" | "experience" | "product" | "affiliate" | "other";
type SponsorEvaluationResult = "good_fit" | "review" | "poor_fit" | "not_evaluated";
type SponsorMinimumFit = "meets" | "partial" | "does_not_meet" | "unknown";
type SponsorBalanceItemKind = "in_kind_value" | "cost" | "effort";
type SponsorBalanceItemStatus = "estimated" | "promised" | "confirmed" | "received" | "partial" | "not_received" | "paid" | "not_applicable";
type SponsorEffortMode = "hourly" | "project";
type SponsorCurrency = "USD" | "EUR" | "MXN" | "ARS" | "COP" | "CLP" | "PEN";

type SponsorCampaignBalance = {
  estimated_cash: number;
  actual_cash: number;
  estimated_in_kind: number;
  actual_in_kind: number;
  estimated_costs: number;
  actual_costs: number;
  estimated_effort: number;
  actual_effort: number;
  estimated_total: number;
  actual_total: number;
  estimated_total_with_effort: number;
  actual_total_with_effort: number;
};

type SponsorCrmPayload = {
  inquiries: Array<{
    id: string;
    brand_name: string;
    contact_name: string;
    contact_email: string;
    proposed_budget_usd: number | null;
    brief: string;
    status: SponsorInquiryPipelineStatus;
    source: string;
    created_at: string;
    updated_at: string;
    campaign_id: string | null;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    brand_name: string;
    contact_name: string | null;
    contact_email: string | null;
    status: SponsorCrmStatus;
    budget_usd: number | null;
    currency_code: SponsorCurrency;
    agreement_type: SponsorAgreementType | null;
    agreement_type_other: string | null;
    includes_payment: boolean;
    includes_barter: boolean;
    includes_affiliate: boolean;
    includes_discount_code: boolean;
    includes_map_presence: boolean;
    includes_brand_report: boolean;
    requires_exclusivity: boolean;
    requires_preapproval: boolean;
    requires_travel: boolean;
    evaluation_result: SponsorEvaluationResult;
    minimum_amount: number | null;
    accepts_barter: boolean | null;
    minimum_requires_payment: boolean;
    minimum_requires_accommodation: boolean;
    minimum_requires_transport: boolean;
    minimum_requires_creative_freedom: boolean;
    minimum_requires_no_preapproval: boolean;
    minimum_requires_clear_dates: boolean;
    minimum_requires_link_or_coupon: boolean;
    minimum_conditions_notes: string | null;
    minimum_fit: SponsorMinimumFit;
    acceptance_override_note: string | null;
    country_code: string | null;
    destination_label: string | null;
    final_learning_note: string | null;
    would_collaborate_again: "yes" | "maybe" | "no" | null;
    start_date: string | null;
    end_date: string | null;
    objective: string | null;
    internal_notes: string | null;
    balance: SponsorCampaignBalance;
    balance_items: Array<{
      id: string;
      campaign_id: string;
      kind: SponsorBalanceItemKind;
      item_type: string;
      label: string;
      enabled: boolean;
      estimated_amount: number | null;
      actual_amount: number | null;
      status: SponsorBalanceItemStatus;
      expected_date: string | null;
      track_in_agenda: boolean;
      notes: string | null;
      sort_order: number;
      effort_mode: SponsorEffortMode | null;
      estimated_hours: number | null;
      actual_hours: number | null;
      hourly_rate: number | null;
    }>;
    deliverables: Array<{
      id: string;
      title: string;
      deliverable_type: string;
      due_date: string | null;
      status: SponsorDeliverableStatus;
      public_url: string | null;
    }>;
    payments: Array<{
      id: string;
      label: string;
      amount_usd: number;
      due_date: string | null;
      status: SponsorPaymentStatus;
      paid_at: string | null;
    }>;
    portal_links: Array<{
      id: string;
      active: boolean;
      require_access_code: boolean;
      access_email: string | null;
      view_count: number;
      last_viewed_at: string | null;
      revoked_at: string | null;
      created_at: string;
      public_url?: string;
    }>;
  }>;
  summary: {
    open_leads: number;
    active_campaigns: number;
    pipeline_usd: number;
    pending_payments_usd: number;
    overdue_deliverables: number;
    collaboration_count: number;
    balance_by_currency: Array<SponsorCampaignBalance & { currency_code: SponsorCurrency; campaign_count: number }>;
  };
};

type BusinessAgendaItem = {
  id: string;
  kind: "deliverable" | "payment" | "balance_item";
  campaign_id: string;
  campaign_title: string;
  brand_name: string;
  title: string;
  due_date: string;
  status: SponsorDeliverableStatus | SponsorPaymentStatus | SponsorBalanceItemStatus;
  amount_usd?: number;
  currency_code?: SponsorCurrency;
  balance_item_kind?: SponsorBalanceItemKind;
  overdue: boolean;
  days_until_due: number;
  action_label: string;
  busy_key: string;
  action_payload: Record<string, unknown>;
  success_message: string;
};

const TABS: Array<{ id: CreatorAdminTab; label: string; icon: typeof House; secondary?: boolean }> = [
  { id: "resumen", label: "Resumen", icon: House },
  { id: "videos", label: "Videos", icon: Play },
  { id: "paises", label: "Paises", icon: GlobeHemisphereWest },
  { id: "votaciones", label: "Votaciones", icon: ChartBar },
  { id: "sponsors", label: "Sponsors", icon: Tag },
  { id: "media-kit", label: "Media Kit", icon: Star },
  { id: "negocio", label: "Negocio", icon: List },
  { id: "audiencia", label: "Audiencia", icon: Users, secondary: true },
  { id: "actividad", label: "Actividad", icon: Clock, secondary: true },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "auto", label: "Auto" },
  { value: "manual", label: "Manual" },
  { value: "pending", label: "Pendientes" },
  { value: "unlocated", label: "Sin ubicar" },
];

export function MapAdminProposalV2({
  payload,
  activeTab,
  initialFilters,
  basePath = "/map-admin-proposal",
}: {
  payload: CreatorAdminPayload;
  activeTab: CreatorAdminTab;
  initialFilters: InitialFilters;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tab = normalizeTab(searchParams.get("tab") || activeTab);
  const statusFilter = searchParams.get("status") || initialFilters.status || "all";
  const countryFilter = searchParams.get("country") || initialFilters.country || "all";
  const modal = searchParams.get("modal") || initialFilters.modal;
  const modalId = searchParams.get("id") || initialFilters.id;

  const selectedVideo = payload.videos.find((video) => video.id === modalId) || null;
  const selectedSponsor = payload.sponsors.find((sponsor) => sponsor.id === modalId) || null;
  const selectedCountry = payload.countries.find((country) => country.country_code === countryFilter) || payload.countries[0] || null;

  const filteredVideos = useMemo(() => {
    return payload.videos.filter((video) => {
      const statusMatches =
        statusFilter === "all" ||
        video.ui_status === statusFilter ||
        (statusFilter === "pending" && (video.ui_status === "pending" || video.ui_status === "unlocated"));
      const countryMatches = countryFilter === "all" || video.country_code === countryFilter;
      return statusMatches && countryMatches;
    });
  }, [countryFilter, payload.videos, statusFilter]);

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("channelId", payload.channel.id);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function closeModal() {
    updateQuery({ modal: null, id: null });
  }

  async function mutate(url: string, init: RequestInit, success: string) {
    setNotice(null);
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setNotice(body?.error || "No se pudo guardar el cambio.");
      return false;
    }
    setNotice(success);
    startTransition(() => router.refresh());
    return true;
  }

  async function patchVideo(videoId: string, payloadPatch: Record<string, unknown>, success: string) {
    return mutate(
      `/api/map-admin/videos/${videoId}`,
      { method: "PATCH", body: JSON.stringify({ channelId: payload.channel.id, ...payloadPatch }) },
      success
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#07090d] text-[#f5f7fb]">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[96px_minmax(0,1fr)]">
        <AdminSidebar
          payload={payload}
          tab={tab}
          onTab={(nextTab) => {
            updateQuery({ tab: nextTab, status: null, country: null, modal: null, id: null });
            setMobileNavOpen(false);
          }}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <section className="min-w-0">
          <TopBar
            payload={payload}
            alertsOpen={alertsOpen}
            onOpenMobile={() => setMobileNavOpen(true)}
            onToggleAlerts={() => setAlertsOpen((current) => !current)}
          />

          <div className="mx-auto w-full max-w-[1480px] gap-4 px-3 pb-8 pt-4 md:px-5">
            <div className="min-w-0 space-y-4">
              {notice ? (
                <div className="rounded-lg border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 px-3 py-2 text-[12px] text-[#ffd3ca]">
                  {notice}
                </div>
              ) : null}

              {tab === "resumen" ? (
                <SummaryTab payload={payload} onNavigate={(updates) => updateQuery(updates)} onOpenAlerts={() => setAlertsOpen(true)} />
              ) : null}
              {tab === "videos" ? (
                <VideosTab
                  payload={payload}
                  videos={filteredVideos}
                  statusFilter={statusFilter}
                  countryFilter={countryFilter}
                  onFilter={updateQuery}
                  onPatchVideo={patchVideo}
                  onOpenVideo={(videoId) => updateQuery({ tab: "videos", modal: "edit-video", id: videoId })}
                  pending={isPending}
                />
              ) : null}
              {tab === "paises" ? (
                <CountriesTab payload={payload} selectedCountry={selectedCountry} onNavigate={updateQuery} />
              ) : null}
              {tab === "votaciones" ? (
                <VotesTab payload={payload} mutate={mutate} onOpenNewVote={() => updateQuery({ tab: "votaciones", modal: "new-vote" })} />
              ) : null}
              {tab === "sponsors" ? (
                <SponsorsTab
                  payload={payload}
                  mutate={mutate}
                  onNew={(countryCode) => updateQuery({ tab: "sponsors", modal: "new-sponsor", country: countryCode || null })}
                  onEdit={(sponsorId) => updateQuery({ tab: "sponsors", modal: "edit-sponsor", id: sponsorId })}
                />
              ) : null}
              {tab === "media-kit" ? <MediaKitTab payload={payload} /> : null}
              {tab === "negocio" ? <BusinessTab payload={payload} /> : null}
              {tab === "audiencia" ? <AudienceTab payload={payload} /> : null}
              {tab === "actividad" ? <ActivityTab payload={payload} /> : null}
            </div>
          </div>

          <AlertsRail
            payload={payload}
            open={alertsOpen}
            onClose={() => setAlertsOpen(false)}
            onNavigate={(href) => router.push(withChannel(href, payload.channel.id, basePath))}
          />
        </section>
      </div>

      {modal === "edit-video" && selectedVideo ? (
        <EditVideoModal video={selectedVideo} countries={payload.countries} onClose={closeModal} onSubmit={patchVideo} />
      ) : null}
      {(modal === "new-sponsor" || modal === "edit-sponsor") ? (
        <SponsorModal
          payload={payload}
          sponsor={selectedSponsor}
          defaultCountry={countryFilter !== "all" ? countryFilter : null}
          onClose={closeModal}
          mutate={mutate}
        />
      ) : null}
      {modal === "new-vote" ? <NewVoteModal payload={payload} onClose={closeModal} mutate={mutate} /> : null}
    </div>
  );
}

function AdminSidebar({
  payload,
  tab,
  onTab,
  mobileOpen,
  onCloseMobile,
}: {
  payload: CreatorAdminPayload;
  tab: CreatorAdminTab;
  onTab: (tab: CreatorAdminTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pendingVideos = payload.videos.filter((video) => video.ui_status === "pending" || video.ui_status === "unlocated").length;
  const activeVotes = payload.polls.filter((poll) => poll.status === "live").length;
  const sidebar = (
    <aside className="flex h-full flex-col border-r border-white/10 bg-[#0a0d13] px-3 py-4 lg:items-center lg:px-2">
      <div className="flex items-center justify-between px-2 lg:w-full lg:justify-center lg:px-0">
        <div className="min-w-0 lg:flex lg:h-10 lg:w-10 lg:items-center lg:justify-center lg:rounded-lg lg:border lg:border-white/10 lg:bg-white/[0.04]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6a4e] lg:sr-only">TravelYourMap</p>
          <h1 className="mt-1 text-[17px] font-black tracking-tight text-white lg:sr-only">Creator Admin</h1>
          <span className="hidden text-[11px] font-black tracking-tight text-white lg:inline">TYM</span>
        </div>
        <button type="button" className="rounded-lg p-2 text-[#9aa3af] lg:hidden" onClick={onCloseMobile} aria-label="Cerrar menu">
          <X size={18} />
        </button>
      </div>

      <nav className="mt-5 w-full space-y-1 lg:flex lg:flex-col lg:items-center">
        {TABS.filter((item) => !item.secondary).map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            active={tab === item.id}
            badge={item.id === "videos" ? pendingVideos : item.id === "votaciones" ? activeVotes : 0}
            onClick={() => onTab(item.id)}
          />
        ))}
      </nav>

      <div className="mt-5 w-full border-t border-white/10 pt-4">
        <p className="px-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#6f7a88] lg:sr-only">Secundario</p>
        <nav className="mt-2 space-y-1 lg:flex lg:flex-col lg:items-center">
          {TABS.filter((item) => item.secondary).map((item) => (
            <SidebarButton key={item.id} item={item} active={tab === item.id} onClick={() => onTab(item.id)} />
          ))}
        </nav>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={onCloseMobile} aria-label="Cerrar menu" />
          <div className="relative h-full w-[290px] max-w-[86vw]">{sidebar}</div>
        </div>
      ) : null}
    </>
  );
}

function SidebarButton({
  item,
  active,
  badge = 0,
  onClick,
}: {
  item: (typeof TABS)[number];
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative flex h-10 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-[12px] font-bold transition active:translate-y-px lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:px-0",
            active ? "border-[#ff5a3d]/25 bg-[#ff5a3d]/12 text-[#ff7d63]" : "text-[#c2cad4] hover:bg-white/[0.05] hover:text-white"
          )}
          aria-label={item.label}
          title={item.label}
        >
          <Icon size={18} weight={active ? "fill" : "regular"} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate lg:sr-only">{item.label}</span>
          {badge ? (
            <span className="rounded-full bg-[#ff5a3d] px-1.5 py-0.5 text-[9px] font-black text-white lg:absolute lg:right-0.5 lg:top-0.5 lg:min-w-4 lg:px-1 lg:text-[8px]">
              {badge}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="hidden border border-white/10 bg-[#111722] text-white shadow-xl lg:inline-flex">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function TopBar({
  payload,
  alertsOpen,
  onOpenMobile,
  onToggleAlerts,
}: {
  payload: CreatorAdminPayload;
  alertsOpen: boolean;
  onOpenMobile: () => void;
  onToggleAlerts: () => void;
}) {
  const health = payload.summary.pending_review > 0 || payload.alerts.some((alert) => alert.severity === "error") ? "Requiere revision" : "Operativo";
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07090d]/92 px-3 py-3 backdrop-blur-xl md:px-5">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" className="rounded-lg border border-white/10 p-2 text-white lg:hidden" onClick={onOpenMobile} aria-label="Abrir menu">
            <List size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7d8794]">Panel operacional</p>
            <h2 className="truncate text-[16px] font-black text-white">{payload.channel.channel_name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("hidden rounded-full border px-3 py-1 text-[11px] font-bold md:inline-flex", health === "Operativo" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]")}>
            {health}
          </span>
          <a href={payload.mapUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[12px] font-bold text-white hover:bg-white/[0.08]">
            Ver mi mapa
            <ArrowUpRight size={14} />
          </a>
          <button
            type="button"
            className={cn(
              "hidden h-9 w-9 items-center justify-center rounded-lg border text-white transition md:inline-flex",
              alertsOpen ? "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            )}
            aria-label={alertsOpen ? "Cerrar alertas" : "Ver alertas"}
            aria-pressed={alertsOpen}
            onClick={onToggleAlerts}
          >
            <Bell size={15} weight={alertsOpen ? "fill" : "regular"} />
          </button>
        </div>
      </div>
    </header>
  );
}

function QuickAction({ payload, onNavigate }: { payload: CreatorAdminPayload; onNavigate: (href: string) => void }) {
  const action = payload.quickAction;
  return (
    <section
      className={cn(
        "rounded-2xl border px-4 py-4 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        action.severity === "success"
          ? "border-emerald-400/20 bg-emerald-400/10"
          : action.severity === "error"
            ? "border-red-400/25 bg-red-400/10"
            : "border-[#ffbf47]/20 bg-[#14100a]/95"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9aa3af]">Accion prioritaria</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
            action.severity === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : action.severity === "error"
                ? "border-red-400/25 bg-red-400/10 text-red-300"
                : "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]"
          )}
        >
          {action.severity === "success" ? "OK" : action.severity === "error" ? "Urgente" : "Atencion"}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {action.severity === "success" ? <CheckCircle size={18} className="mt-0.5 text-emerald-300" /> : <WarningCircle size={18} className="mt-0.5 text-[#ffbf47]" />}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-5 text-white">{action.label}</p>
            <p className="mt-1 text-[12px] leading-5 text-[#a6afba]">Ese es el siguiente paso recomendado para mantener el panel limpio.</p>
          </div>
        </div>
        {action.href ? (
          <button
            type="button"
            className="h-8 shrink-0 rounded-lg bg-[#ff5a3d] px-3 text-[12px] font-black text-white transition hover:bg-[#ff6d54] active:translate-y-px"
            onClick={() => onNavigate(action.href || "")}
          >
            {action.cta}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AlertsRail({
  payload,
  open,
  onClose,
  onNavigate,
}: {
  payload: CreatorAdminPayload;
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const alertIdSet = useMemo(() => new Set(payload.alerts.map((alert) => alert.id)), [payload.alerts]);
  const visibleAlerts = useMemo(
    () => payload.alerts.filter((alert) => !dismissedAlertIds.includes(alert.id)),
    [dismissedAlertIds, payload.alerts]
  );

  useEffect(() => {
    setDismissedAlertIds((current) => current.filter((alertId) => alertIdSet.has(alertId)));
  }, [alertIdSet]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          id="alerts-rail"
          initial={{ x: 24, opacity: 0, scale: 0.985 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 24, opacity: 0, scale: 0.985 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed bottom-6 right-6 z-50 hidden w-[min(20rem,calc(100vw-1.5rem))] md:block"
          role="complementary"
          aria-label="Alertas"
        >
          <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0f16]/96 p-3 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.95)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8e98a6]">Panel lateral</p>
                <h3 className="mt-1 text-[14px] font-black text-white">Alertas y estado</h3>
                <p className="mt-1 text-[11px] leading-5 text-[#9aa3af]">
                  {visibleAlerts.length} alertas visibles · {payload.businessReadiness.ready_count}/{payload.businessReadiness.total_count} capacidades listas
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="border border-white/10 bg-white/[0.03] text-[#d7dde5] hover:bg-white/[0.08] hover:text-white"
                aria-label="Cerrar alertas"
                onClick={onClose}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="max-h-[calc(85vh-4.5rem)] space-y-4 overflow-y-auto pr-1 pt-4">
              <QuickAction payload={payload} onNavigate={onNavigate} />
              <SystemAlerts
                payload={payload}
                alerts={visibleAlerts}
                onNavigate={onNavigate}
                onDismissAlert={(alertId) => setDismissedAlertIds((current) => (current.includes(alertId) ? current : [...current, alertId]))}
              />
              <BusinessReadinessCard payload={payload} />
              <MapConnection payload={payload} />
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function SummaryTab({
  payload,
  onNavigate,
  onOpenAlerts,
}: {
  payload: CreatorAdminPayload;
  onNavigate: (updates: Record<string, string | null>) => void;
  onOpenAlerts: () => void;
}) {
  const lastVideo = payload.videos[0] || null;
  const topCountry = payload.countries[0] || null;
  const topMapCountry = payload.audience.top_countries[0] || null;
  const topMapVideo = payload.audience.top_videos[0] || null;
  const sponsorClicks = payload.audience.sponsor_clicks.reduce((sum, row) => sum + row.clicks, 0);
  const mapInteractions = payload.audience.top_countries.reduce((sum, row) => sum + row.events, 0);
  const unmonetizedCountries = payload.countries.filter((country) => !country.has_sponsor && country.videos_count > 0);
  const bestCommercialCountry = unmonetizedCountries
    .slice()
    .sort((a, b) => b.total_views - a.total_views || b.videos_count - a.videos_count)[0] || null;
  const visibleVideos = Math.max(1, payload.summary.videos_mapped + payload.summary.videos_hidden);
  const mapHealth = Math.round((payload.summary.videos_mapped / visibleVideos) * 100);
  return (
    <div className="space-y-4">
      {payload.videos.length === 0 ? (
        <EmptyState
          title="Tu mapa esta vacio"
          description="Conecta tu canal de YouTube o importa videos para generar el mapa administrativo."
          action="Ir a onboarding"
          onAction={() => window.location.assign("/onboarding")}
        />
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Salud del mapa" value={mapHealth} suffix="%" detail={`${payload.summary.videos_mapped} visibles · ${payload.summary.pending_review} pendientes`} tone={payload.summary.pending_review > 0 ? "warning" : "success"} onClick={() => onNavigate({ tab: "videos", status: payload.summary.pending_review > 0 ? "pending" : null })} />
        <Kpi title="Metricas del mapa" value={mapInteractions} detail={topMapCountry ? `Top pais: ${topMapCountry.country_code}` : "Sin eventos first-party"} onClick={() => onNavigate({ tab: "audiencia" })} />
        <Kpi title="Sponsor clicks" value={sponsorClicks} detail={payload.audience.sponsor_clicks[0]?.brand_name || "Sin clicks registrados"} onClick={() => onNavigate({ tab: "audiencia" })} />
        <Kpi title="Oportunidades" value={unmonetizedCountries.length} detail={bestCommercialCountry ? `${bestCommercialCountry.country_name} sin sponsor` : "Inventario cubierto"} tone={unmonetizedCountries.length > 0 ? "warning" : "success"} onClick={() => onNavigate({ tab: bestCommercialCountry ? "paises" : "sponsors", country: bestCommercialCountry?.country_code || null })} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          eyebrow="Travel Your Map"
          title={topMapVideo ? topMapVideo.title : "Sin video lider aun"}
          value={topMapVideo ? topMapVideo.events : 0}
          detail={topMapVideo ? "Interacciones registradas dentro del mapa." : "Cuando la audiencia abra videos desde el mapa, se priorizaran aca."}
          action="Ver audiencia"
          onAction={() => onNavigate({ tab: "audiencia" })}
        />
        <InsightCard
          eyebrow="YouTube + mapa"
          title={topCountry ? topCountry.country_name : "Sin pais principal"}
          value={topCountry ? topCountry.videos_count : 0}
          detail={topCountry ? `${formatCompact(topCountry.total_views)} views de YouTube · ${topCountry.cities_count} ciudades.` : "La cobertura por pais se calcula desde tus videos mapeados."}
          action="Ver paises"
          onAction={() => onNavigate({ tab: "paises", country: topCountry?.country_code || null })}
        />
        <InsightCard
          eyebrow="Operacion"
          title="Alertas activas"
          value={payload.alerts.length}
          detail={payload.alerts.length > 0 ? "Revisa el rail lateral para ver la prioridad actual." : "No hay alertas activas. El panel lateral sigue disponible para estado operativo."}
          tone={payload.alerts.length > 0 ? "warning" : "success"}
          action="Abrir alertas"
          onAction={onOpenAlerts}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Actividad reciente" description="Cambios editoriales, sync y operaciones importantes." action="Ver todo" onAction={() => onNavigate({ tab: "actividad" })}>
          <div className="divide-y divide-white/10">
            {payload.activity.slice(0, 5).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
            {payload.activity.length === 0 ? <InlineEmpty text="Todavia no hay actividad editorial registrada." /> : null}
          </div>
        </Panel>
        <Panel title="Mapa listo para compartir" description="Cobertura editorial y ultimo contenido detectado.">
          <div className="space-y-4">
            {topCountry ? (
              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold text-white">Cobertura visible</span>
                  <span className="font-mono text-[#9aa3af]">{mapHealth}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#ff5a3d]" style={{ width: `${Math.max(4, mapHealth)}%` }} />
                </div>
                <p className="mt-2 text-[12px] text-[#9aa3af]">
                  {payload.summary.countries_covered} paises, {payload.summary.cities_covered} ciudades y {payload.summary.videos_hidden} videos ocultos.
                </p>
              </div>
            ) : null}
            {lastVideo ? (
              <button type="button" className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left" onClick={() => onNavigate({ tab: "videos", modal: "edit-video", id: lastVideo.id })}>
                <VideoThumb video={lastVideo} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-white">{lastVideo.title}</span>
                  <span className="text-[11px] text-[#8e98a6]">{lastVideo.country_name || "Sin pais"}</span>
                </span>
              </button>
            ) : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function VideosTab({
  payload,
  videos,
  statusFilter,
  countryFilter,
  onFilter,
  onPatchVideo,
  onOpenVideo,
  pending,
}: {
  payload: CreatorAdminPayload;
  videos: CreatorAdminVideo[];
  statusFilter: string;
  countryFilter: string;
  onFilter: (updates: Record<string, string | null>) => void;
  onPatchVideo: (videoId: string, payloadPatch: Record<string, unknown>, success: string) => Promise<boolean>;
  onOpenVideo: (videoId: string) => void;
  pending: boolean;
}) {
  return (
    <Panel title="Videos" description="Administra ubicacion, visibilidad y valor comercial de cada video.">
      <div className="mb-3 grid gap-2 md:grid-cols-[180px_220px_minmax(0,1fr)]">
        <Select value={statusFilter} onChange={(value) => onFilter({ tab: "videos", status: value })} options={STATUS_OPTIONS} />
        <Select
          value={countryFilter}
          onChange={(value) => onFilter({ tab: "videos", country: value })}
          options={[{ value: "all", label: "Todos los paises" }, ...payload.countries.map((country) => ({ value: country.country_code, label: country.country_name }))]}
        />
        <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[12px] text-[#9aa3af]">
          {videos.length} videos en esta vista
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-[#7d8794]">
            <tr className="[&>th]:border-b [&>th]:border-white/10 [&>th]:px-3 [&>th]:py-2">
              <th>Video</th>
              <th>Ubicacion</th>
              <th>Rendimiento</th>
              <th>Mapa</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {videos.map((video) => (
              <tr key={video.id} className="group hover:bg-white/[0.025]">
                <td className="max-w-[360px] px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <VideoThumb video={video} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-white" title={video.title}>{video.title}</p>
                      <p className="mt-1 text-[11px] text-[#8e98a6]">{formatDate(video.published_at)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[13px] font-semibold text-white">{video.country_name || "Sin ubicar"}</p>
                  <p className="mt-1 text-[11px] text-[#8e98a6]">{video.city || video.region || "Sin ciudad"}</p>
                  <StatusBadge status={video.ui_status} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-mono text-[13px] text-white">{formatCompact(video.view_count)} views</p>
                  <p className="mt-1 text-[11px] text-[#8e98a6]">{formatCompact(video.like_count)} likes · {formatCompact(video.comment_count)} comentarios</p>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold", video.visible_on_map ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#9aa3af]")}
                      onClick={() => void onPatchVideo(video.id, { visible_on_map: !video.visible_on_map }, "Visibilidad actualizada.")}
                    >
                      {video.visible_on_map ? <Eye size={13} /> : <EyeSlash size={13} />}
                      {video.visible_on_map ? "Visible" : "Oculto"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn("inline-flex h-8 items-center justify-center rounded-lg border px-2", video.featured ? "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffcf70]" : "border-white/10 bg-white/[0.03] text-[#9aa3af]")}
                      onClick={() => void onPatchVideo(video.id, { featured: !video.featured }, "Destacado actualizado.")}
                      aria-label="Cambiar destacado"
                    >
                      <Star size={13} weight={video.featured ? "fill" : "regular"} />
                    </button>
                  </div>
                  {video.sponsor_names.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-[11px] text-[#ffb49f]">{video.sponsor_names.join(", ")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#cfd7e1]">
                          {video.sponsor_names.length} sponsor{video.sponsor_names.length === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex rounded-full border border-[#ff5a3d]/20 bg-[#ff5a3d]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#ff9c84]">
                          {getSponsorCardStyleLabel(video.sponsor_card_style, video.sponsor_names.length)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-right">
                  <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2 text-[11px] font-bold text-white hover:bg-white/[0.06]" onClick={() => onOpenVideo(video.id)}>
                    <PencilSimple size={13} />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {videos.map((video) => (
          <button key={video.id} type="button" className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left" onClick={() => onOpenVideo(video.id)}>
            <div className="flex gap-3">
              <VideoThumb video={video} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{video.title}</p>
                <p className="mt-1 text-[11px] text-[#8e98a6]">{video.country_name || "Sin ubicar"} · {formatCompact(video.view_count)} views</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={video.ui_status} />
                  <span className="text-[10px] text-[#8e98a6]">{video.visible_on_map ? "Visible" : "Oculto"}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {videos.length === 0 ? <EmptyState title="No hay videos para este filtro" description="Cambia los filtros o sincroniza el canal para importar contenido." /> : null}
    </Panel>
  );
}

function CountriesTab({
  payload,
  selectedCountry,
  onNavigate,
}: {
  payload: CreatorAdminPayload;
  selectedCountry: CreatorAdminCountry | null;
  onNavigate: (updates: Record<string, string | null>) => void;
}) {
  const maxVideos = Math.max(1, ...payload.countries.map((country) => country.videos_count));
  const countryVideos = selectedCountry ? payload.videos.filter((video) => video.country_code === selectedCountry.country_code).slice(0, 8) : [];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Paises" description="Lee traccion geografica y oportunidades comerciales por pais.">
        <div className="divide-y divide-white/10">
          {payload.countries.map((country) => (
            <button key={country.country_code} type="button" className="grid w-full gap-3 px-2 py-3 text-left hover:bg-white/[0.025] md:grid-cols-[1fr_1fr_1fr_auto]" onClick={() => onNavigate({ tab: "paises", country: country.country_code })}>
              <div>
                <p className="text-[13px] font-black text-white">{country.country_name}</p>
                <p className="text-[11px] text-[#8e98a6]">{country.country_code}</p>
              </div>
              <div>
                <p className="font-mono text-[13px] text-white">{country.videos_count} videos</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#ff5a3d]" style={{ width: `${Math.max(8, Math.round((country.videos_count / maxVideos) * 100))}%` }} />
                </div>
              </div>
              <div>
                <p className="font-mono text-[13px] text-white">{formatCompact(country.total_views)} views</p>
                <p className="text-[11px] text-[#8e98a6]">{country.top_cities.join(", ") || "Sin ciudades"}</p>
              </div>
              <div className="md:text-right">
                <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase", country.has_sponsor ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]")}>
                  {country.has_sponsor ? "Monetizado" : "Oportunidad"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={selectedCountry ? selectedCountry.country_name : "Detalle"}>
        {selectedCountry ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[12px] font-bold text-white">Oportunidad comercial</p>
              <p className="mt-2 text-[12px] leading-5 text-[#aeb7c2]">
                {selectedCountry.has_sponsor
                  ? `Sponsor activo: ${selectedCountry.sponsor_names.join(", ")}.`
                  : selectedCountry.total_views > 10000
                    ? "Este pais tiene trafico sin monetizar. Conviene crear un sponsor local o global."
                    : selectedCountry.videos_count < 3
                      ? "Pais con poco contenido. Puede entrar como opcion de proxima votacion."
                      : "Hay inventario disponible para sponsor por pais."}
              </p>
            </div>
            <div className="grid gap-2">
              <button type="button" className="h-9 rounded-lg bg-[#ff5a3d] text-[12px] font-black text-white" onClick={() => onNavigate({ tab: "sponsors", modal: "new-sponsor", country: selectedCountry.country_code })}>
                Agregar sponsor para este pais
              </button>
              <button type="button" className="h-9 rounded-lg border border-white/10 text-[12px] font-bold text-white" onClick={() => onNavigate({ tab: "votaciones", modal: "new-vote", country: selectedCountry.country_code })}>
                Crear votacion con este pais
              </button>
              <a href={`${payload.mapUrl}&country=${encodeURIComponent(selectedCountry.country_code)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 text-[12px] font-bold text-white">
                Ver en mapa
              </a>
            </div>
            <div className="divide-y divide-white/10">
              {countryVideos.map((video) => (
                <div key={video.id} className="flex items-center gap-3 py-2">
                  <VideoThumb video={video} />
                  <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{video.title}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <InlineEmpty text="No hay paises mapeados todavia." />
        )}
      </Panel>
    </div>
  );
}

function VotesTab({
  payload,
  mutate,
  onOpenNewVote,
}: {
  payload: CreatorAdminPayload;
  mutate: (url: string, init: RequestInit, success: string) => Promise<boolean>;
  onOpenNewVote: () => void;
}) {
  const activePoll = payload.polls.find((poll) => poll.status === "live") || null;
  return (
    <div className="space-y-4">
      <Panel title="Votacion activa" action="Nueva votacion" onAction={onOpenNewVote}>
        {activePoll ? (
          <PollCard poll={activePoll} payload={payload} mutate={mutate} />
        ) : (
          <EmptyState title="No hay votacion activa" description="Crea una votacion para convertir la audiencia en senales de destino y sponsor." action="Crear votacion" onAction={onOpenNewVote} />
        )}
      </Panel>
      <Panel title="Historial">
        <div className="divide-y divide-white/10">
          {payload.polls.filter((poll) => poll.id !== activePoll?.id).map((poll) => (
            <PollHistoryRow key={poll.id} poll={poll} payload={payload} mutate={mutate} />
          ))}
          {payload.polls.length <= (activePoll ? 1 : 0) ? <InlineEmpty text="Todavia no hay historial de votaciones." /> : null}
        </div>
      </Panel>
    </div>
  );
}

function PollCard({ poll, payload, mutate }: { poll: CreatorAdminPoll; payload: CreatorAdminPayload; mutate: (url: string, init: RequestInit, success: string) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-black text-white">{poll.title}</p>
          <p className="mt-1 text-[12px] text-[#9aa3af]">{poll.prompt}</p>
          <p className="mt-2 text-[11px] text-[#7d8794]">{poll.total_votes} votos · creada {formatDate(poll.created_at)}</p>
        </div>
        <span className="rounded-full border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 px-2 py-1 text-[10px] font-black uppercase text-[#ff9a84]">{poll.status}</span>
      </div>
      <div className="space-y-2">
        {poll.options.map((option) => (
          <div key={`${option.country_code}-${option.city || "country"}`}>
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="font-bold text-white">{option.country_name}{option.city ? `, ${option.city}` : ""}</span>
              <span className="font-mono text-[#9aa3af]">{option.votes} · {option.percentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#ff5a3d]" style={{ width: `${Math.max(4, option.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => void mutate("/api/map-admin/polls", { method: "POST", body: JSON.stringify({ action: "close", channelId: payload.channel.id, pollId: poll.id }) }, "Votacion cerrada.")}>Cerrar votacion</ActionButton>
        <ActionButton onClick={() => void mutate("/api/map-admin/polls", { method: "POST", body: JSON.stringify({ action: "publish", channelId: payload.channel.id, pollId: poll.id }) }, "Resultado publicado.")}>Publicar resultado</ActionButton>
        <ActionButton onClick={() => void mutate("/api/map-admin/polls", { method: "POST", body: JSON.stringify({ action: "convert", channelId: payload.channel.id, pollId: poll.id }) }, "Destino actualizado.")}>Convertir ganador</ActionButton>
      </div>
    </div>
  );
}

function PollHistoryRow({ poll, payload, mutate }: { poll: CreatorAdminPoll; payload: CreatorAdminPayload; mutate: (url: string, init: RequestInit, success: string) => Promise<boolean> }) {
  const winner = poll.options[0] || null;
  return (
    <div className="grid gap-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
      <div>
        <p className="text-[13px] font-bold text-white">{poll.title}</p>
        <p className="mt-1 text-[11px] text-[#8e98a6]">{poll.total_votes} votos · ganador: {winner ? `${winner.country_name}${winner.city ? `, ${winner.city}` : ""}` : "sin votos"}</p>
      </div>
      <span className="text-[11px] text-[#8e98a6]">{poll.converted_to_destination ? "Convertida en destino" : "No convertida"}</span>
      <ActionButton onClick={() => void mutate("/api/map-admin/polls", { method: "POST", body: JSON.stringify({ action: "convert", channelId: payload.channel.id, pollId: poll.id }) }, "Destino actualizado.")}>
        Convertir
      </ActionButton>
    </div>
  );
}

function SponsorsTab({
  payload,
  mutate,
  onNew,
  onEdit,
}: {
  payload: CreatorAdminPayload;
  mutate: (url: string, init: RequestInit, success: string) => Promise<boolean>;
  onNew: (countryCode?: string | null) => void;
  onEdit: (sponsorId: string) => void;
}) {
  const bulkPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [reportLinks, setReportLinks] = useState<SponsorReportLinkSummary[]>([]);
  const [reportSchedules, setReportSchedules] = useState<SponsorReportScheduleSummary[]>([]);
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportEmailDrafts, setReportEmailDrafts] = useState<Record<string, string>>({});
  const [scheduleEmailDrafts, setScheduleEmailDrafts] = useState<Record<string, string>>({});
  const [scheduleCadenceDrafts, setScheduleCadenceDrafts] = useState<Record<string, SponsorReportCadence>>({});
  const activeSponsors = payload.sponsors.filter((sponsor) => sponsor.active);
  const pausedSponsors = payload.sponsors.length - activeSponsors.length;
  const inventory = payload.countries
    .filter((country) => !country.has_sponsor && country.videos_count > 0)
    .sort((a, b) => b.total_views - a.total_views || b.videos_count - a.videos_count);
  const sponsorClicks = payload.sponsors.reduce((sum, sponsor) => sum + sponsor.click_count, 0);
  const sponsoredVideos = new Set(payload.sponsors.flatMap((sponsor) => sponsor.video_ids)).size;
  const sponsoredCountries = new Set(payload.sponsors.flatMap((sponsor) => sponsor.country_codes)).size;
  const globalSponsors = payload.sponsors.filter((sponsor) => sponsor.scope === "global" && sponsor.active).length;
  const bulkCountryOptions = useMemo(() => {
    return payload.countries
      .map((country) => ({ code: country.country_code, name: country.country_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payload.countries]);
  const bulkRows = useMemo(() => {
    const byCountry = bulkCountryFilter === "all" ? null : bulkCountryFilter;
    const byStatus = bulkStatusFilter === "all" ? null : bulkStatusFilter;
    const byTitle = bulkTitleFilter.trim().toLowerCase();
    return payload.videos
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
          sponsorNames: Array.from(new Set((video.sponsor_names || []).filter(Boolean))),
          publishedAt: video.published_at || null,
          views: Number(video.view_count || 0),
          updatedAt: video.updated_at || null,
        };
      });
  }, [bulkCountryFilter, bulkStatusFilter, bulkTitleFilter, payload.videos]);
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
  const activeReportBySponsorId = useMemo(() => {
    const map = new Map<string, SponsorReportLinkSummary>();
    for (const report of reportLinks) {
      if (!report.active || report.revoked_at) continue;
      if (!map.has(report.sponsor_id)) map.set(report.sponsor_id, report);
    }
    return map;
  }, [reportLinks]);
  const scheduleBySponsorId = useMemo(() => {
    const map = new Map<string, SponsorReportScheduleSummary>();
    for (const schedule of reportSchedules) {
      if (!map.has(schedule.sponsor_id)) map.set(schedule.sponsor_id, schedule);
      if (schedule.active) map.set(schedule.sponsor_id, schedule);
    }
    return map;
  }, [reportSchedules]);

  useEffect(() => {
    let cancelled = false;
    async function loadSponsorReportData() {
      try {
        const [reportsResponse, schedulesResponse] = await Promise.all([
          fetch(`/api/sponsors/reports?channelId=${encodeURIComponent(payload.channel.id)}`, { cache: "no-store" }),
          fetch(`/api/sponsors/reports/schedules?channelId=${encodeURIComponent(payload.channel.id)}`, { cache: "no-store" }),
        ]);
        const reportsBody = (await reportsResponse.json().catch(() => null)) as { reports?: SponsorReportLinkSummary[]; error?: string } | null;
        const schedulesBody = (await schedulesResponse.json().catch(() => null)) as { schedules?: SponsorReportScheduleSummary[]; error?: string } | null;
        if (!reportsResponse.ok) throw new Error(reportsBody?.error || "No se pudieron cargar los reportes.");
        if (!schedulesResponse.ok) throw new Error(schedulesBody?.error || "No se pudieron cargar las programaciones.");
        if (!cancelled) {
          setReportLinks(reportsBody?.reports || []);
          setReportSchedules(schedulesBody?.schedules || []);
        }
      } catch (error) {
        if (!cancelled) setReportMessage(error instanceof Error ? error.message : "No se pudieron cargar los reportes.");
      }
    }
    void loadSponsorReportData();
    return () => {
      cancelled = true;
    };
  }, [payload.channel.id]);

  async function refreshSponsorReports() {
    const response = await fetch(`/api/sponsors/reports?channelId=${encodeURIComponent(payload.channel.id)}`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as { reports?: SponsorReportLinkSummary[]; error?: string } | null;
    if (!response.ok) throw new Error(body?.error || "No se pudieron actualizar los reportes.");
    setReportLinks(body?.reports || []);
  }

  async function copySponsorReportUrl(report: SponsorReportLinkSummary) {
    const url = report.public_url;
    if (!url) {
      setReportMessage("El link del reporte no esta disponible.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setReportMessage(`Link copiado: ${report.sponsor_name}`);
    } catch {
      setReportMessage("No se pudo copiar automaticamente. Abre el reporte y copia la URL desde el navegador.");
    }
  }

  function sendSponsorReportEmail(sponsor: CreatorAdminSponsor, report: SponsorReportLinkSummary) {
    const url = report.public_url;
    const email = String(reportEmailDrafts[sponsor.id] || "").trim();
    if (!url) {
      setReportMessage("El link del reporte no esta disponible.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setReportMessage("Escribe un email valido para enviar el reporte.");
      return;
    }

    const subject = `Reporte de resultados - ${sponsor.brand_name}`;
    const body = [
      `Hola,`,
      "",
      `Te comparto el reporte privado de resultados de ${sponsor.brand_name} en TravelYourMap:`,
      url,
      "",
      "El reporte incluye clicks, alcance dentro del mapa, videos destacados, paises con mayor actividad y contexto importado desde YouTube.",
      "",
      `Saludos,`,
      payload.channel.channel_name,
    ].join("\n");
    window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
    setReportMessage(`Email preparado para ${email}.`);
  }

  async function createSponsorReport(sponsorId: string) {
    setReportBusyId(`create:${sponsorId}`);
    setReportMessage(null);
    try {
      const response = await fetch("/api/sponsors/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: payload.channel.id, sponsorId, periodDays: 30 }),
      });
      const body = (await response.json().catch(() => null)) as
        | { report?: SponsorReportLinkSummary | null; public_url?: string; error?: string }
        | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo crear el reporte.");
      await refreshSponsorReports();
      if (body?.public_url) {
        await navigator.clipboard.writeText(body.public_url).catch(() => undefined);
        setReportMessage("Reporte creado. Link copiado al portapapeles.");
      } else {
        setReportMessage("Reporte creado.");
      }
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo crear el reporte.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function createSponsorReportSchedule(sponsorId: string) {
    const recipientEmail = String(scheduleEmailDrafts[sponsorId] || reportEmailDrafts[sponsorId] || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setReportMessage("Escribe un email valido para programar reportes.");
      return;
    }
    const cadence = scheduleCadenceDrafts[sponsorId] || "monthly";
    setReportBusyId(`schedule-create:${sponsorId}`);
    setReportMessage(null);
    try {
      const response = await fetch("/api/sponsors/reports/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: payload.channel.id,
          sponsorId,
          cadence,
          periodDays: 30,
          recipientEmail,
          nextRunAt: new Date().toISOString(),
        }),
      });
      const body = (await response.json().catch(() => null)) as { schedules?: SponsorReportScheduleSummary[]; error?: string } | null;
      if (!response.ok || !body?.schedules) throw new Error(body?.error || "No se pudo programar el reporte.");
      setReportSchedules(body.schedules);
      setReportMessage("Reporte programado. El primer envio queda listo para ejecutarse ahora o por el cron diario.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo programar el reporte.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function updateSponsorReportSchedule(sponsorId: string, schedule: SponsorReportScheduleSummary) {
    const recipientEmail = String(scheduleEmailDrafts[sponsorId] || schedule.recipient_email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setReportMessage("Escribe un email valido para actualizar la programacion.");
      return;
    }
    setReportBusyId(`schedule-update:${schedule.id}`);
    setReportMessage(null);
    try {
      const response = await fetch(`/api/sponsors/reports/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          channelId: payload.channel.id,
          cadence: scheduleCadenceDrafts[sponsorId] || schedule.cadence,
          periodDays: schedule.period_days,
          recipientEmail,
        }),
      });
      const body = (await response.json().catch(() => null)) as { schedules?: SponsorReportScheduleSummary[]; error?: string } | null;
      if (!response.ok || !body?.schedules) throw new Error(body?.error || "No se pudo actualizar la programacion.");
      setReportSchedules(body.schedules);
      setReportMessage("Programacion actualizada.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo actualizar la programacion.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function runSponsorReportScheduleNow(schedule: SponsorReportScheduleSummary) {
    setReportBusyId(`schedule-run:${schedule.id}`);
    setReportMessage(null);
    try {
      const response = await fetch(`/api/sponsors/reports/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now", channelId: payload.channel.id }),
      });
      const body = (await response.json().catch(() => null)) as {
        schedules?: SponsorReportScheduleSummary[];
        result?: { email_sent?: boolean; public_url?: string | null; error?: string | null };
        error?: string;
      } | null;
      if (!response.ok || !body?.schedules) throw new Error(body?.error || "No se pudo ejecutar la programacion.");
      setReportSchedules(body.schedules);
      await refreshSponsorReports().catch(() => undefined);
      if (body.result?.email_sent) {
        setReportMessage("Reporte generado y enviado por email.");
      } else if (body.result?.public_url) {
        setReportMessage(body.result.error || "Reporte generado. Configura email transaccional para enviarlo automaticamente.");
      } else {
        setReportMessage(body.result?.error || "No se pudo generar el reporte programado.");
      }
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo ejecutar la programacion.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function toggleSponsorReportSchedule(schedule: SponsorReportScheduleSummary) {
    setReportBusyId(`schedule-toggle:${schedule.id}`);
    setReportMessage(null);
    try {
      const response = await fetch(`/api/sponsors/reports/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: schedule.active ? "pause" : "resume", channelId: payload.channel.id }),
      });
      const body = (await response.json().catch(() => null)) as { schedules?: SponsorReportScheduleSummary[]; error?: string } | null;
      if (!response.ok || !body?.schedules) throw new Error(body?.error || "No se pudo actualizar la programacion.");
      setReportSchedules(body.schedules);
      setReportMessage(schedule.active ? "Programacion pausada." : "Programacion reactivada.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo actualizar la programacion.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function revokeSponsorReport(reportId: string) {
    setReportBusyId(`revoke:${reportId}`);
    setReportMessage(null);
    try {
      const response = await fetch(`/api/sponsors/reports/${encodeURIComponent(reportId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: payload.channel.id, action: "revoke" }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo revocar el reporte.");
      await refreshSponsorReports();
      setReportMessage("Reporte revocado. El link privado ya no muestra datos.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "No se pudo revocar el reporte.");
    } finally {
      setReportBusyId(null);
    }
  }

  async function archiveSponsor(sponsor: CreatorAdminSponsor) {
    await mutate(
      `/api/map-admin/sponsors?channelId=${payload.channel.id}&sponsorId=${sponsor.id}&action=archive`,
      { method: "DELETE" },
      "Sponsor archivado."
    );
  }

  async function deleteSponsor(sponsor: CreatorAdminSponsor) {
    if (!window.confirm(`Eliminar "${sponsor.brand_name}" borrará su historial y no se puede deshacer.`)) return;
    await mutate(
      `/api/map-admin/sponsors?channelId=${payload.channel.id}&sponsorId=${sponsor.id}&action=delete`,
      { method: "DELETE" },
      "Sponsor eliminado."
    );
  }

  async function triggerBulkWorker(jobId: string) {
    await fetch("/api/map-admin/sponsors/bulk-assign/worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: payload.channel.id, jobId }),
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
      if (status === "queued") void triggerBulkWorker(jobId);
      bulkPollTimerRef.current = setTimeout(() => {
        void pollBulkJob(jobId, false);
      }, 1800);
      return;
    }

    if (status === "completed") {
      setBulkUndoAvailable(Boolean(body.job.reversibleUntil));
      setBulkMessage(`Asignación completada: ${body.job.appliedCount || 0} videos actualizados, ${body.job.skippedCount || 0} omitidos.`);
      if (bulkSelectedSponsorId && bulkSelectedVideoIds.length > 0) {
        void mutate("/api/map-admin/sponsors", { method: "PATCH", body: JSON.stringify({ channelId: payload.channel.id, sponsorId: bulkSelectedSponsorId, brand_name: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.brand_name || "", logo_url: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.logo_url || null, website_url: null, affiliate_url: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.affiliate_url || null, discount_code: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.discount_code || null, description: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.description || null, category_name: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.category_name || null, action_type: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.action_type || "link", action_value: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.action_value || null, cta_label: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.cta_label || null, sponsor_card_style: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.sponsor_card_style || null, sponsor_banner_background_color: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.sponsor_banner_background_color || null, sponsor_banner_text_color: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.sponsor_banner_text_color || null, display_order: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.display_order || 100, scope: "video", country_codes: [], video_ids: Array.from(new Set([...(payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.video_ids || []), ...bulkSelectedVideoIds])), active: true, start_date: null, end_date: null, internal_notes: payload.sponsors.find((entry) => entry.id === bulkSelectedSponsorId)?.internal_notes || null }) }, "Sponsor actualizado.");
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
    }
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
      const response = await fetch("/api/map-admin/sponsors/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: payload.channel.id,
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
      } else if (body?.job?.id) {
        setBulkJobId(body.job.id);
        setBulkJobStatus(body.job.status || null);
        if (body.queued) {
          setBulkMessage(`Job encolado: ${body.requested || 0} seleccionados, ${body.applied || 0} aplicables. Procesando en segundo plano...`);
          void triggerBulkWorker(body.job.id);
          void pollBulkJob(body.job.id, true);
        } else {
          setBulkMessage(`Asignación completada: ${body?.applied || 0} videos actualizados, ${body?.skipped || 0} omitidos.`);
          setBulkUndoAvailable(Boolean(body?.job?.reversibleUntil));
        }
      }
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "No se pudo ejecutar la asignación masiva.");
    } finally {
      setBulkBusy("idle");
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
      setBulkMessage("Deshacer aplicado. La tabla ya refleja la asignación revertida.");
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "No se pudo deshacer el job.");
    } finally {
      setBulkBusy("idle");
    }
  }

  const sponsorSidebar = (
    <div className="space-y-4">
      <Panel title="Espacios disponibles" description="Paises con inventario de videos y views de YouTube sin sponsor activo.">
        <div className="divide-y divide-white/10">
          {inventory.slice(0, 8).map((country) => (
            <div key={country.country_code} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-white">{country.country_name}</p>
                  <p className="text-[11px] text-[#8e98a6]">{country.videos_count} videos · {formatCompact(country.total_views)} views</p>
                </div>
                <button type="button" className="h-8 rounded-lg bg-[#ff5a3d] px-2 text-[11px] font-black text-white" onClick={() => onNew(country.country_code)}>
                  Crear
                </button>
              </div>
            </div>
          ))}
          {inventory.length === 0 ? <InlineEmpty text="Todos los paises activos tienen sponsor asignado." /> : null}
        </div>
      </Panel>
      <Panel title="Asignacion y diseno" description="El wizard conserva preview, CTA, cupones, colores y alcance por pais o video.">
        <div className="space-y-3 text-[12px] leading-5 text-[#aeb7c2]">
          <p>Usa alcance global para marcas generales, pais para sponsors locales y video para integraciones puntuales.</p>
          <p>Cuando dos o mas sponsors caen en una misma card, el mapa usa Multi sponsor automaticamente.</p>
          <button type="button" className="h-9 w-full rounded-lg border border-white/10 text-[12px] font-black text-white hover:bg-white/[0.06]" onClick={() => onNew(null)}>
            Abrir wizard completo
          </button>
        </div>
      </Panel>
    </div>
  );

  return (
    <div className="space-y-4">
      {sponsorSidebar}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Sponsors activos" value={activeSponsors.length} detail={pausedSponsors ? `${pausedSponsors} archivados conservan historial` : "Todos los sponsors estan activos"} onClick={() => onNew(null)} />
        <Kpi title="Clicks sponsor" value={sponsorClicks} detail="Conversiones capturadas en el mapa" />
        <Kpi title="Videos cubiertos" value={sponsoredVideos} detail={`${globalSponsors} sponsor global${globalSponsors === 1 ? "" : "es"}`} />
        <Kpi title="Paises monetizados" value={sponsoredCountries} detail={inventory[0] ? `${inventory[0].country_name} es oportunidad` : "Sin paises pendientes"} tone={inventory.length > 0 ? "warning" : "success"} />
      </section>

      <div className="grid gap-4">
        <Panel title="Sponsors activos" description="Gestiona marca, estilo visual, CTA, alcance y pausa sin perder metricas." action="Nuevo sponsor" onAction={() => onNew(null)}>
          <div className="divide-y divide-white/10">
            {payload.sponsors.map((sponsor) => {
              const report = activeReportBySponsorId.get(sponsor.id) || null;
              const schedule = scheduleBySponsorId.get(sponsor.id) || null;
              const scheduleEmail = scheduleEmailDrafts[sponsor.id] ?? schedule?.recipient_email ?? reportEmailDrafts[sponsor.id] ?? "";
              const scheduleCadence = scheduleCadenceDrafts[sponsor.id] ?? schedule?.cadence ?? "monthly";
              return (
                <div key={sponsor.id} className="py-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <SponsorLogo sponsor={sponsor} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-white">{sponsor.brand_name}</p>
                          <p className="mt-1 truncate text-[11px] text-[#8e98a6]">
                            {sponsor.category_name || "Sin categoria"} · {formatSponsorScope(sponsor)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <SponsorBadge tone={sponsor.active ? "success" : "neutral"}>{sponsor.active ? "Activo" : "Archivado"}</SponsorBadge>
                        <SponsorBadge>{getSponsorCardStyleLabel(sponsor.sponsor_card_style, sponsor.video_ids.length || sponsor.country_codes.length)}</SponsorBadge>
                        {report ? <SponsorBadge tone="success">Reporte activo</SponsorBadge> : null}
                        {schedule ? <SponsorBadge tone={schedule.active ? "success" : "neutral"}>{schedule.active ? "Reporte programado" : "Programacion pausada"}</SponsorBadge> : null}
                        {sponsor.discount_code ? <SponsorBadge tone="warning">{sponsor.discount_code}</SponsorBadge> : null}
                        {sponsor.cta_label ? <SponsorBadge>{sponsor.cta_label}</SponsorBadge> : null}
                      </div>
                      {report ? (
                        <p className="mt-2 text-[11px] text-[#8e98a6]">
                          Reporte {report.period_days} dias · {formatNumber(report.view_count)} vistas · creado {formatDateShort(report.created_at)}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
                      <SponsorMetric label="Clicks" value={sponsor.click_count} />
                      <SponsorMetric label="Paises" value={sponsor.country_codes.length} />
                      <SponsorMetric label="Videos" value={sponsor.video_ids.length} />
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <ActionButton onClick={() => onEdit(sponsor.id)}>Editar</ActionButton>
                      {report ? (
                        <>
                          <input
                            type="email"
                            value={reportEmailDrafts[sponsor.id] || ""}
                            onChange={(event) => setReportEmailDrafts((current) => ({ ...current, [sponsor.id]: event.currentTarget.value }))}
                            placeholder="Email de la marca"
                            className="h-9 min-w-0 flex-[1_1_190px] rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none placeholder:text-[#667085]"
                          />
                          <ActionButton onClick={() => sendSponsorReportEmail(sponsor, report)} disabled={!report.public_url}>Enviar email</ActionButton>
                          <ActionButton onClick={() => report.public_url ? window.open(report.public_url, "_blank", "noopener,noreferrer") : setReportMessage("El link del reporte no esta disponible.")} disabled={!report.public_url}>Abrir reporte</ActionButton>
                          <ActionButton onClick={() => void copySponsorReportUrl(report)} disabled={!report.public_url}>Copiar link</ActionButton>
                          <ActionButton onClick={() => void revokeSponsorReport(report.id)} disabled={reportBusyId === `revoke:${report.id}`}>
                            {reportBusyId === `revoke:${report.id}` ? "Revocando..." : "Revocar"}
                          </ActionButton>
                        </>
                      ) : (
                        <ActionButton onClick={() => void createSponsorReport(sponsor.id)} disabled={reportBusyId === `create:${sponsor.id}`}>
                          {reportBusyId === `create:${sponsor.id}` ? "Creando..." : "Crear reporte"}
                        </ActionButton>
                      )}
                      {sponsor.active ? <ActionButton onClick={() => void archiveSponsor(sponsor)}>Archivar</ActionButton> : null}
                      <ActionButton tone="danger" onClick={() => void deleteSponsor(sponsor)}>Eliminar</ActionButton>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-end">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Reporte programado</p>
                        <p className="mt-1 text-[11px] leading-5 text-[#8e98a6]">
                          {schedule
                            ? `${formatReportCadence(schedule.cadence)} · proximo ${formatDateShort(schedule.next_run_at)} · ${schedule.last_run_at ? `ultimo ${formatDateShort(schedule.last_run_at)}` : "sin ejecuciones"}`
                            : "Genera y envia reportes automaticamente cuando el cron diario procesa la programacion."}
                        </p>
                        {schedule?.last_error ? <p className="mt-1 text-[11px] leading-5 text-[#ffcf70]">{schedule.last_error}</p> : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <input
                          type="email"
                          value={scheduleEmail}
                          onChange={(event) => setScheduleEmailDrafts((current) => ({ ...current, [sponsor.id]: event.currentTarget.value }))}
                          placeholder="reportes@marca.com"
                          className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none placeholder:text-[#667085]"
                        />
                        <select
                          value={scheduleCadence}
                          onChange={(event) => setScheduleCadenceDrafts((current) => ({ ...current, [sponsor.id]: event.currentTarget.value as SponsorReportCadence }))}
                          className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none"
                        >
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                          <option value="quarterly">Trimestral</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {schedule ? (
                          <>
                            <ActionButton onClick={() => void updateSponsorReportSchedule(sponsor.id, schedule)} disabled={reportBusyId === `schedule-update:${schedule.id}`}>
                              {reportBusyId === `schedule-update:${schedule.id}` ? "Guardando..." : "Actualizar"}
                            </ActionButton>
                            <ActionButton onClick={() => void runSponsorReportScheduleNow(schedule)} disabled={reportBusyId === `schedule-run:${schedule.id}`}>
                              {reportBusyId === `schedule-run:${schedule.id}` ? "Ejecutando..." : "Ejecutar ahora"}
                            </ActionButton>
                            <ActionButton onClick={() => void toggleSponsorReportSchedule(schedule)} disabled={reportBusyId === `schedule-toggle:${schedule.id}`}>
                              {schedule.active ? "Pausar envio" : "Reactivar"}
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton onClick={() => void createSponsorReportSchedule(sponsor.id)} disabled={reportBusyId === `schedule-create:${sponsor.id}`}>
                            {reportBusyId === `schedule-create:${sponsor.id}` ? "Programando..." : "Programar envio"}
                          </ActionButton>
                        )}
                        {schedule?.last_report_public_url ? (
                          <ActionButton onClick={() => window.open(schedule.last_report_public_url, "_blank", "noopener,noreferrer")}>Ultimo reporte</ActionButton>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {payload.sponsors.length === 0 ? <EmptyState title="No hay sponsors cargados" description="Crea un sponsor global, por pais o por video para mostrarlo en el mapa." action="Crear sponsor" onAction={() => onNew(null)} /> : null}
          </div>
          {reportMessage ? <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-[#b7d9ff]">{reportMessage}</p> : null}
        </Panel>

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
            {payload.sponsors.map((sponsor) => (
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
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkSelectedVideoIds(bulkRows.map((row) => row.id))} disabled={bulkRows.length === 0 || bulkAllSelected}>
              Seleccionar todo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkSelectedVideoIds([])} disabled={bulkSelectedVideoIds.length === 0}>
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
                    onChange={(event) => {
                      const ids = bulkPageRows.map((row) => row.id);
                      setBulkSelectedVideoIds((current) => {
                        const set = new Set(current);
                        for (const id of ids) {
                          if (event.currentTarget.checked) set.add(id);
                          else set.delete(id);
                        }
                        return Array.from(set);
                      });
                    }}
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
                      onChange={(event) => {
                        setBulkSelectedVideoIds((current) => {
                          const set = new Set(current);
                          if (event.currentTarget.checked) set.add(row.id);
                          else set.delete(row.id);
                          return Array.from(set);
                        });
                      }}
                      aria-label={`Seleccionar ${row.title}`}
                    />
                  </td>
                  <td className="max-w-[340px] px-2 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate">{row.title}</span>
                      {row.sponsorNames.length > 1 ? (
                        <span
                          className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-sky-300"
                          title={row.sponsorNames.join(", ")}
                        >
                          Multi sponsor
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
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">{row.countryCode || "--"}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2">{formatSponsorStatus(row.status)}</td>
                  <td className="px-2 py-2">
                    {row.sponsorNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.sponsorNames.map((sponsorName) => (
                          <span
                            key={sponsorName}
                            className={cn(
                              "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                              getBulkSponsorPillClasses(row.status)
                            )}
                            title={sponsorName}
                          >
                            <span className="min-w-0 truncate">{sponsorName}</span>
                          </span>
                        ))}
                      </div>
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
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkPage((current) => Math.max(1, current - 1))} disabled={safeBulkPage <= 1}>
              Anterior
            </Button>
            <span>
              Página {safeBulkPage} / {bulkTotalPages}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkPage((current) => Math.min(bulkTotalPages, current + 1))} disabled={safeBulkPage >= bulkTotalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaKitTab({ payload }: { payload: CreatorAdminPayload }) {
  const [mediaKit, setMediaKit] = useState<MediaKitAdminPayload | null>(null);
  const [formState, setFormState] = useState<MediaKitAdminPayload["settings"] | null>(null);
  const [busy, setBusy] = useState<"idle" | "loading" | "saving">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMediaKit() {
      setBusy("loading");
      setMessage(null);
      try {
        const response = await fetch(`/api/creator/media-kit?channelId=${encodeURIComponent(payload.channel.id)}`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as { mediaKit?: MediaKitAdminPayload; error?: string } | null;
        if (!response.ok || !body?.mediaKit) throw new Error(body?.error || "No se pudo cargar el media kit.");
        if (!cancelled) {
          setMediaKit(body.mediaKit);
          setFormState(body.mediaKit.settings);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar el media kit.");
      } finally {
        if (!cancelled) setBusy("idle");
      }
    }
    void loadMediaKit();
    return () => {
      cancelled = true;
    };
  }, [payload.channel.id]);

  function updateField<K extends keyof MediaKitAdminPayload["settings"]>(key: K, value: MediaKitAdminPayload["settings"][K]) {
    setFormState((current) => current ? { ...current, [key]: value } : current);
  }

  function toggleFeaturedCountry(countryCode: string) {
    const code = String(countryCode || "").toUpperCase();
    if (!formState || !code) return;
    const current = new Set(formState.featured_country_codes || []);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    updateField("featured_country_codes", Array.from(current).slice(0, 12));
  }

  async function saveMediaKit() {
    if (!formState) return;
    setBusy("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/creator/media-kit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: payload.channel.id, ...formState }),
      });
      const body = (await response.json().catch(() => null)) as { mediaKit?: MediaKitAdminPayload | null; error?: string } | null;
      if (!response.ok || !body?.mediaKit) throw new Error(body?.error || "No se pudo guardar el media kit.");
      setMediaKit(body.mediaKit);
      setFormState(body.mediaKit.settings);
      setMessage("Media kit actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el media kit.");
    } finally {
      setBusy("idle");
    }
  }

  async function copyMediaKitLink() {
    if (!mediaKit?.urls.absoluteMediaKitUrl) {
      setMessage("El link del media kit no esta disponible.");
      return;
    }
    try {
      await navigator.clipboard.writeText(mediaKit.urls.absoluteMediaKitUrl);
      setMessage("Link del media kit copiado.");
    } catch {
      setMessage("No se pudo copiar automaticamente. Abre el media kit y copia la URL del navegador.");
    }
  }

  const selectedCountries = new Set(formState?.featured_country_codes || []);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Videos comerciales" value={mediaKit?.summary.videos || payload.summary.videos_mapped} detail="Inventario visible para marcas" />
        <Kpi title="Paises vendibles" value={mediaKit?.summary.countries || payload.summary.countries_covered} detail={`${mediaKit?.summary.cities || payload.summary.cities_covered} ciudades`} />
        <Kpi title="Sponsors activos" value={mediaKit?.summary.active_sponsors || payload.sponsors.filter((sponsor) => sponsor.active).length} detail="Prueba comercial visible" />
        <Kpi title="Leads 30d" value={mediaKit?.summary.inquiries_30d || 0} detail="Solicitudes recibidas desde sponsor forms" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Configuracion del Media Kit" description="Edita la pagina publica que una marca puede usar para evaluar partnership contigo.">
          {busy === "loading" ? <InlineEmpty text="Cargando media kit..." /> : null}
          {formState ? (
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <span>
                  <span className="block text-[13px] font-black text-white">Media kit publico</span>
                  <span className="mt-1 block text-[12px] text-[#9aa3af]">Si lo desactivas, la ruta publica devuelve no disponible.</span>
                </span>
                <input
                  type="checkbox"
                  checked={formState.public_enabled}
                  onChange={(event) => updateField("public_enabled", event.currentTarget.checked)}
                  className="h-5 w-5"
                  aria-label="Activar media kit publico"
                />
              </label>

              <Field
                label="Headline"
                value={formState.headline || ""}
                maxLength={140}
                onChange={(event) => updateField("headline", event.currentTarget.value)}
              />
              <TextArea
                label="Bio comercial"
                value={formState.bio || ""}
                maxLength={900}
                rows={5}
                onChange={(event) => updateField("bio", event.currentTarget.value)}
              />
              <TextArea
                label="Nota de audiencia"
                value={formState.audience_note || ""}
                maxLength={500}
                rows={3}
                onChange={(event) => updateField("audience_note", event.currentTarget.value)}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  label="Email partnership"
                  type="email"
                  value={formState.partnership_email || ""}
                  onChange={(event) => updateField("partnership_email", event.currentTarget.value)}
                />
                <Field
                  label="Rate card URL"
                  type="url"
                  value={formState.rate_card_url || ""}
                  onChange={(event) => updateField("rate_card_url", event.currentTarget.value)}
                />
                <Field
                  label="CTA principal"
                  value={formState.preferred_cta_label || ""}
                  maxLength={80}
                  onChange={(event) => updateField("preferred_cta_label", event.currentTarget.value)}
                />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">Paises destacados</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {payload.countries.slice(0, 12).map((country) => (
                    <label key={country.country_code} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white">
                      <input
                        type="checkbox"
                        checked={selectedCountries.has(country.country_code)}
                        onChange={() => toggleFeaturedCountry(country.country_code)}
                      />
                      <span className="min-w-0 truncate">{country.country_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void saveMediaKit()} disabled={busy !== "idle"}>
                  {busy === "saving" ? "Guardando..." : "Guardar Media Kit"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyMediaKitLink()} disabled={!mediaKit?.urls.absoluteMediaKitUrl}>
                  Copiar link
                </Button>
                <Button type="button" variant="outline" onClick={() => mediaKit?.urls.absoluteMediaKitUrl ? window.open(mediaKit.urls.absoluteMediaKitUrl, "_blank", "noopener,noreferrer") : setMessage("El link del media kit no esta disponible.")} disabled={!mediaKit?.urls.absoluteMediaKitUrl}>
                  Abrir pagina
                </Button>
              </div>
              {message ? <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-[#b7d9ff]">{message}</p> : null}
            </div>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <Panel title="Preview comercial" description="Lo que una marca entiende antes de escribirte.">
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">URL publica</p>
                <p className="mt-2 break-all text-[12px] font-bold text-white">{mediaKit?.urls.absoluteMediaKitUrl || "Pendiente de cargar"}</p>
              </div>
              <SourcePill label="YouTube importado" value={`${formatCompact(mediaKit?.summary.youtube_views || 0)} views`} />
              <SourcePill label="TravelYourMap 30d" value={`${formatCompact(mediaKit?.summary.map_events_30d || 0)} senales`} />
              <SourcePill label="Clicks sponsor 30d" value={`${formatCompact(mediaKit?.summary.sponsor_clicks_30d || 0)} clicks`} />
            </div>
          </Panel>
          <Panel title="Destinos destacados">
            <RankList
              rows={(mediaKit?.topCountries || []).map((country) => ({
                label: `${country.country_name} · ${country.videos_count} videos`,
                value: country.youtube_views,
              }))}
              empty="Todavia no hay destinos suficientes para mostrar."
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

const INQUIRY_STATUS_OPTIONS: Array<{ value: SponsorInquiryPipelineStatus; label: string }> = [
  { value: "new", label: "Nuevo" },
  { value: "reviewed", label: "Revisado" },
  { value: "contacted", label: "Contactado" },
  { value: "proposal_sent", label: "Propuesta enviada" },
  { value: "negotiation", label: "Negociacion" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
];

const CAMPAIGN_STATUS_OPTIONS: Array<{ value: SponsorCrmStatus; label: string }> = [
  { value: "lead", label: "Lead" },
  { value: "proposal", label: "Propuesta" },
  { value: "negotiation", label: "Negociacion" },
  { value: "active", label: "Activa" },
  { value: "delivered", label: "Entregada" },
  { value: "paid", label: "Pagada" },
  { value: "lost", label: "Perdida" },
];

const DELIVERABLE_STATUS_OPTIONS: Array<{ value: SponsorDeliverableStatus; label: string }> = [
  { value: "todo", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "submitted", label: "Enviado" },
  { value: "approved", label: "Aprobado" },
  { value: "published", label: "Publicado" },
];

const PAYMENT_STATUS_OPTIONS: Array<{ value: SponsorPaymentStatus; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "invoiced", label: "Facturado" },
  { value: "paid", label: "Pagado" },
  { value: "overdue", label: "Vencido" },
];

const BUSINESS_SUBVIEWS = ["resumen", "leads", "campanas", "colaboraciones", "balance", "agenda"] as const;
type BusinessSubview = (typeof BUSINESS_SUBVIEWS)[number];

const BUSINESS_SUBVIEW_LABELS: Record<BusinessSubview, string> = {
  resumen: "Resumen",
  leads: "Leads",
  campanas: "Campanas",
  colaboraciones: "Colaboraciones",
  balance: "Balance",
  agenda: "Agenda",
};

const CURRENCY_OPTIONS: SponsorCurrency[] = ["USD", "EUR", "MXN", "ARS", "COP", "CLP", "PEN"];

const AGREEMENT_TYPE_OPTIONS: Array<{ value: SponsorAgreementType; label: string }> = [
  { value: "paid_sponsor", label: "Sponsor pagado" },
  { value: "barter", label: "Canje" },
  { value: "hotel_stay", label: "Hotel / alojamiento" },
  { value: "experience", label: "Experiencia / tour" },
  { value: "product", label: "Producto" },
  { value: "affiliate", label: "Afiliado" },
  { value: "other", label: "Otro" },
];

const EVALUATION_RESULT_OPTIONS: Array<{ value: SponsorEvaluationResult; label: string }> = [
  { value: "not_evaluated", label: "Sin evaluar" },
  { value: "good_fit", label: "Conviene" },
  { value: "review", label: "Revisar" },
  { value: "poor_fit", label: "No conviene" },
];

const MINIMUM_FIT_OPTIONS: Array<{ value: SponsorMinimumFit; label: string }> = [
  { value: "unknown", label: "Sin revisar" },
  { value: "meets", label: "Cumple" },
  { value: "partial", label: "Parcial" },
  { value: "does_not_meet", label: "No cumple" },
];

const BALANCE_ITEM_KIND_OPTIONS: Array<{ value: SponsorBalanceItemKind; label: string }> = [
  { value: "in_kind_value", label: "Valor recibido" },
  { value: "cost", label: "Costo propio" },
  { value: "effort", label: "Esfuerzo" },
];

const BALANCE_ITEM_STATUS_OPTIONS: Array<{ value: SponsorBalanceItemStatus; label: string }> = [
  { value: "estimated", label: "Estimado" },
  { value: "promised", label: "Prometido" },
  { value: "confirmed", label: "Confirmado" },
  { value: "received", label: "Recibido" },
  { value: "partial", label: "Parcial" },
  { value: "not_received", label: "No recibido" },
  { value: "paid", label: "Pagado" },
  { value: "not_applicable", label: "No aplica" },
];

function BusinessTab({ payload }: { payload: CreatorAdminPayload }) {
  const [crm, setCrm] = useState<SponsorCrmPayload | null>(null);
  const [busy, setBusy] = useState<string | null>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [businessView, setBusinessView] = useState<BusinessSubview>("resumen");

  useEffect(() => {
    let cancelled = false;
    async function loadCrm() {
      setBusy("loading");
      setMessage(null);
      try {
        const response = await fetch(`/api/creator/sponsor-crm?channelId=${encodeURIComponent(payload.channel.id)}`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as { crm?: SponsorCrmPayload; error?: string } | null;
        if (!response.ok || !body?.crm) throw new Error(body?.error || "No se pudo cargar el CRM.");
        if (!cancelled) setCrm(body.crm);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar el CRM.");
      } finally {
        if (!cancelled) setBusy(null);
      }
    }
    void loadCrm();
    return () => {
      cancelled = true;
    };
  }, [payload.channel.id]);

  async function crmAction(action: Record<string, unknown>, success: string, busyKey = "action") {
    setBusy(busyKey);
    setMessage(null);
    try {
      const response = await fetch("/api/creator/sponsor-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: payload.channel.id, ...action }),
      });
      const body = (await response.json().catch(() => null)) as { crm?: SponsorCrmPayload; result?: unknown; error?: string } | null;
      if (!response.ok || !body?.crm) throw new Error(body?.error || "No se pudo actualizar el CRM.");
      setCrm(body.crm);
      setMessage(success);
      return body;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el CRM.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  function resolvePortalUrl(pathOrUrl: string | undefined) {
    if (!pathOrUrl) return "";
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
    return `${window.location.origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  }

  async function copyBrandPortalLink(pathOrUrl: string | undefined) {
    const url = resolvePortalUrl(pathOrUrl);
    if (!url) {
      setMessage("El link del portal no esta disponible.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link del portal de marca copiado.");
    } catch {
      setMessage("No se pudo copiar automaticamente. Abre el portal y copia la URL del navegador.");
    }
  }

  function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void crmAction(
      {
        action: "create_campaign",
        title: String(form.get("title") || ""),
        brandName: String(form.get("brandName") || ""),
        budgetUsd: Number(form.get("budgetUsd") || 0) > 0 ? Number(form.get("budgetUsd")) : null,
        startDate: String(form.get("startDate") || "") || null,
        endDate: String(form.get("endDate") || "") || null,
        objective: String(form.get("objective") || "") || null,
      },
      "Campaña creada.",
      "create-campaign"
    );
    event.currentTarget.reset();
  }

  function handleCreateCollaboration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void (async () => {
      const result = await crmAction(
      {
        action: "create_collaboration",
        title: String(form.get("title") || ""),
        brandName: String(form.get("brandName") || ""),
        contactName: String(form.get("contactName") || "") || null,
        contactEmail: String(form.get("contactEmail") || "") || null,
        budgetUsd: Number(form.get("budgetUsd") || 0) > 0 ? Number(form.get("budgetUsd")) : null,
        currencyCode: String(form.get("currencyCode") || "USD"),
        agreementType: String(form.get("agreementType") || "paid_sponsor"),
        agreementTypeOther: String(form.get("agreementTypeOther") || "") || null,
        countryCode: String(form.get("countryCode") || "") || null,
        destinationLabel: String(form.get("destinationLabel") || "") || null,
        startDate: String(form.get("startDate") || "") || null,
        endDate: String(form.get("endDate") || "") || null,
        objective: String(form.get("objective") || "") || null,
      },
      "Colaboracion creada como oportunidad.",
      "create-collaboration"
    );
      if (result) {
        event.currentTarget.reset();
        setBusinessView("colaboraciones");
      }
    })();
  }

  function handleUpdateCollaboration(event: FormEvent<HTMLFormElement>, campaign: SponsorCrmPayload["campaigns"][number]) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void crmAction(
      {
        action: "update_campaign_collaboration",
        campaignId: campaign.id,
        title: campaign.title,
        brandName: campaign.brand_name,
        contactName: String(form.get("contactName") || "") || null,
        contactEmail: String(form.get("contactEmail") || "") || null,
        currencyCode: String(form.get("currencyCode") || campaign.currency_code || "USD"),
        agreementType: String(form.get("agreementType") || campaign.agreement_type || "paid_sponsor"),
        agreementTypeOther: String(form.get("agreementTypeOther") || "") || null,
        includesPayment: form.get("includesPayment") === "on",
        includesBarter: form.get("includesBarter") === "on",
        includesAffiliate: form.get("includesAffiliate") === "on",
        includesDiscountCode: form.get("includesDiscountCode") === "on",
        includesMapPresence: form.get("includesMapPresence") === "on",
        includesBrandReport: form.get("includesBrandReport") === "on",
        requiresExclusivity: form.get("requiresExclusivity") === "on",
        requiresPreapproval: form.get("requiresPreapproval") === "on",
        requiresTravel: form.get("requiresTravel") === "on",
        evaluationResult: String(form.get("evaluationResult") || "not_evaluated"),
        minimumAmount: Number(form.get("minimumAmount") || 0) > 0 ? Number(form.get("minimumAmount")) : null,
        acceptsBarter: form.get("acceptsBarter") === "yes" ? true : form.get("acceptsBarter") === "no" ? false : null,
        minimumRequiresPayment: form.get("minimumRequiresPayment") === "on",
        minimumRequiresAccommodation: form.get("minimumRequiresAccommodation") === "on",
        minimumRequiresTransport: form.get("minimumRequiresTransport") === "on",
        minimumRequiresCreativeFreedom: form.get("minimumRequiresCreativeFreedom") === "on",
        minimumRequiresNoPreapproval: form.get("minimumRequiresNoPreapproval") === "on",
        minimumRequiresClearDates: form.get("minimumRequiresClearDates") === "on",
        minimumRequiresLinkOrCoupon: form.get("minimumRequiresLinkOrCoupon") === "on",
        minimumConditionsNotes: String(form.get("minimumConditionsNotes") || "") || null,
        minimumFit: String(form.get("minimumFit") || "unknown"),
        acceptanceOverrideNote: String(form.get("acceptanceOverrideNote") || "") || null,
        countryCode: String(form.get("countryCode") || "") || null,
        destinationLabel: String(form.get("destinationLabel") || "") || null,
        finalLearningNote: String(form.get("finalLearningNote") || "") || null,
        wouldCollaborateAgain: String(form.get("wouldCollaborateAgain") || "") || null,
      },
      "Evaluacion de colaboracion actualizada.",
      `collaboration:${campaign.id}`
    );
  }

  function handleCreateBalanceItem(event: FormEvent<HTMLFormElement>, campaignId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = String(form.get("kind") || "in_kind_value") as SponsorBalanceItemKind;
    const effortMode = kind === "effort" ? String(form.get("effortMode") || "project") : null;
    const estimatedHours = Number(form.get("estimatedHours") || 0);
    const hourlyRate = Number(form.get("hourlyRate") || 0);
    const estimatedAmount = kind === "effort" && effortMode === "hourly" && estimatedHours > 0 && hourlyRate > 0
      ? Math.round(estimatedHours * hourlyRate)
      : Number(form.get("estimatedAmount") || 0);
    void crmAction(
      {
        action: "create_balance_item",
        campaignId,
        kind,
        itemType: String(form.get("itemType") || "other"),
        label: String(form.get("label") || ""),
        estimatedAmount: estimatedAmount > 0 ? estimatedAmount : null,
        actualAmount: Number(form.get("actualAmount") || 0) > 0 ? Number(form.get("actualAmount")) : null,
        status: String(form.get("status") || "estimated"),
        expectedDate: String(form.get("expectedDate") || "") || null,
        trackInAgenda: form.get("trackInAgenda") === "on",
        notes: String(form.get("notes") || "") || null,
        effortMode,
        estimatedHours: estimatedHours > 0 ? estimatedHours : null,
        hourlyRate: hourlyRate > 0 ? hourlyRate : null,
      },
      "Item de balance agregado.",
      `balance-item:${campaignId}`
    );
    event.currentTarget.reset();
  }

  function handleCreateDeliverable(event: FormEvent<HTMLFormElement>, campaignId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void crmAction(
      {
        action: "create_deliverable",
        campaignId,
        title: String(form.get("title") || ""),
        deliverableType: String(form.get("deliverableType") || "video"),
        dueDate: String(form.get("dueDate") || "") || null,
      },
      "Entregable agregado.",
      `deliverable:${campaignId}`
    );
    event.currentTarget.reset();
  }

  function handleCreatePayment(event: FormEvent<HTMLFormElement>, campaignId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void crmAction(
      {
        action: "create_payment",
        campaignId,
        label: String(form.get("label") || "Pago"),
        amountUsd: Number(form.get("amountUsd") || 0),
        dueDate: String(form.get("dueDate") || "") || null,
      },
      "Pago agregado.",
      `payment:${campaignId}`
    );
    event.currentTarget.reset();
  }

  async function createRenewalEmail(campaignId: string) {
    const body = await crmAction(
      { action: "create_campaign_renewal_email", campaignId },
      "Renovacion creada. Email procesado.",
      `renewal-email:${campaignId}`
    ) as { result?: { email_sent?: boolean; mailto_url?: string | null; error?: string | null; portal_url?: string | null } } | null;
    if (!body?.result) return;
    if (body.result.email_sent) {
      setMessage("Renovacion creada, portal privado generado y email enviado.");
      return;
    }
    if (body.result.mailto_url) {
      window.open(body.result.mailto_url, "_blank", "noopener,noreferrer");
      setMessage(body.result.error || "Renovacion creada. Se abrio un email listo para enviar.");
      return;
    }
    setMessage(body.result.error || "Renovacion creada, pero no se pudo preparar el email.");
  }

  async function copyBusinessSummary() {
    if (!crm) {
      setMessage("Carga el CRM antes de copiar el resumen comercial.");
      return;
    }
    const summaryLines = [
      `Resumen comercial - ${payload.channel.channel_name}`,
      `Leads abiertos: ${formatNumber(crm.summary.open_leads)}`,
      `Campañas activas: ${formatNumber(crm.summary.active_campaigns)}`,
      `Pipeline: $${formatNumber(crm.summary.pipeline_usd)}`,
      `Pagos pendientes: $${formatNumber(crm.summary.pending_payments_usd)}`,
      `Entregables vencidos: ${formatNumber(crm.summary.overdue_deliverables)}`,
      `Campañas totales: ${formatNumber(crm.campaigns.length)}`,
      `Leads totales: ${formatNumber(crm.inquiries.length)}`,
    ];
    try {
      await navigator.clipboard.writeText(summaryLines.join("\n"));
      setMessage("Resumen comercial copiado.");
    } catch {
      setMessage("No se pudo copiar automaticamente el resumen comercial.");
    }
  }

  function exportBusinessCsv() {
    if (!crm) {
      setMessage("Carga el CRM antes de exportar.");
      return;
    }
    const rows: Array<Record<string, string | number | null>> = [
      ...crm.inquiries.map((inquiry) => ({
        tipo: "lead",
        marca: inquiry.brand_name,
        campana: "",
        titulo: inquiry.brief,
        estado: formatInquiryPipelineStatus(inquiry.status),
        monto_usd: inquiry.proposed_budget_usd,
        fecha: inquiry.created_at,
        contacto: inquiry.contact_name,
        email: inquiry.contact_email,
        detalle: inquiry.source,
      })),
      ...crm.campaigns.flatMap((campaign) => [
        {
          tipo: "campana",
          marca: campaign.brand_name,
          campana: campaign.title,
          titulo: campaign.objective || "",
          estado: formatCampaignStatus(campaign.status),
          monto_usd: campaign.budget_usd,
          fecha: campaign.start_date || campaign.end_date || "",
          contacto: campaign.contact_name || "",
          email: campaign.contact_email || "",
          detalle: campaign.internal_notes || "",
        },
        ...campaign.deliverables.map((deliverable) => ({
          tipo: "entregable",
          marca: campaign.brand_name,
          campana: campaign.title,
          titulo: deliverable.title,
          estado: formatDeliverableStatus(deliverable.status),
          monto_usd: null,
          fecha: deliverable.due_date || "",
          contacto: campaign.contact_name || "",
          email: campaign.contact_email || "",
          detalle: deliverable.deliverable_type,
        })),
        ...campaign.payments.map((payment) => ({
          tipo: "pago",
          marca: campaign.brand_name,
          campana: campaign.title,
          titulo: payment.label,
          estado: formatPaymentStatus(payment.status),
          monto_usd: payment.amount_usd,
          fecha: payment.due_date || payment.paid_at || "",
          contacto: campaign.contact_name || "",
          email: campaign.contact_email || "",
          detalle: payment.paid_at ? `pagado ${formatDateShort(payment.paid_at)}` : "",
        })),
      ]),
    ];
    const csv = toCsv(["tipo", "marca", "campana", "titulo", "estado", "monto_usd", "fecha", "contacto", "email", "detalle"], rows);
    downloadTextFile({
      content: csv,
      filename: `travelyourmap-negocio-${slugifyFilePart(payload.channel.canonicalHandle || payload.channel.channel_name || payload.channel.id)}-${formatDateForFile(new Date())}.csv`,
      type: "text/csv;charset=utf-8",
    });
    setMessage("Export comercial descargado.");
  }

  const openLeadCount = crm?.summary.open_leads || 0;
  const activeCampaignCount = crm?.summary.active_campaigns || 0;
  const campaigns = crm?.campaigns || [];
  const inquiries = crm?.inquiries || [];
  const collaborations = campaigns.filter((campaign) => Boolean(campaign.agreement_type));
  const evaluatingCollaborations = collaborations.filter((campaign) => ["lead", "proposal", "negotiation"].includes(campaign.status));
  const activeCollaborations = collaborations.filter((campaign) => ["active", "delivered", "paid"].includes(campaign.status));
  const staleLead = inquiries.find((inquiry) => ["new", "reviewed"].includes(inquiry.status) && daysSince(inquiry.created_at) >= 3) || null;
  const overduePayment = campaigns
    .flatMap((campaign) => campaign.payments.map((payment) => ({ campaign, payment })))
    .find(({ payment }) => payment.status !== "paid" && isPastDate(payment.due_date)) || null;
  const deliveredWithoutPayment = campaigns.find((campaign) => campaign.status === "delivered" && campaign.budget_usd && campaign.payments.length === 0) || null;
  const needsReportDeliverable = campaigns.find((campaign) =>
    ["active", "delivered"].includes(campaign.status) &&
    !campaign.deliverables.some((deliverable) => deliverable.deliverable_type === "report")
  ) || null;
  const renewalCandidate = campaigns.find((campaign) => isCampaignReadyForRenewal(campaign) && !hasOpenRenewalForCampaign(campaign, campaigns)) || null;
  const pricingOpportunities = payload.countries
    .filter((country) => country.videos_count > 0 && !country.has_sponsor)
    .slice()
    .sort((a, b) => b.total_views - a.total_views || b.videos_count - a.videos_count)
    .slice(0, 4)
    .map((country) => ({
      country,
      pricing: suggestCountrySponsorshipBudget(country.total_views, country.videos_count, country.cities_count),
    }));
  const agendaItems = campaigns
    .flatMap<BusinessAgendaItem>((campaign) => {
      const deliverableItems = campaign.deliverables
        .filter((deliverable) => deliverable.due_date && deliverable.status !== "published")
        .map((deliverable) => {
          const nextStatus = getNextDeliverableStatus(deliverable.status);
          const due = getDueDateDistance(deliverable.due_date);
          return {
            id: `deliverable:${deliverable.id}`,
            kind: "deliverable" as const,
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            brand_name: campaign.brand_name,
            title: deliverable.title,
            due_date: deliverable.due_date!,
            status: deliverable.status,
            overdue: due.overdue,
            days_until_due: due.daysUntilDue,
            action_label: nextStatus.label,
            busy_key: `agenda-deliverable:${deliverable.id}`,
            action_payload: { action: "update_deliverable", deliverableId: deliverable.id, status: nextStatus.status },
            success_message: "Entregable actualizado desde agenda.",
          };
        });
      const paymentItems = campaign.payments
        .filter((payment) => payment.due_date && payment.status !== "paid")
        .map((payment) => {
          const due = getDueDateDistance(payment.due_date);
          const shouldMarkOverdue = due.overdue && payment.status !== "overdue";
          return {
            id: `payment:${payment.id}`,
            kind: "payment" as const,
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            brand_name: campaign.brand_name,
            title: payment.label,
            due_date: payment.due_date!,
            status: payment.status,
            amount_usd: payment.amount_usd,
            currency_code: campaign.currency_code,
            overdue: due.overdue,
            days_until_due: due.daysUntilDue,
            action_label: shouldMarkOverdue ? "Marcar vencido" : "Marcar pagado",
            busy_key: `agenda-payment:${payment.id}`,
            action_payload: { action: "update_payment", paymentId: payment.id, status: shouldMarkOverdue ? "overdue" : "paid" },
            success_message: shouldMarkOverdue ? "Pago marcado como vencido desde agenda." : "Pago marcado como pagado desde agenda.",
          };
        });
      const balanceItems = campaign.balance_items
        .filter((item) => item.enabled && item.track_in_agenda && item.expected_date && !["received", "paid", "not_applicable"].includes(item.status))
        .map((item) => {
          const due = getDueDateDistance(item.expected_date);
          const nextStatus = getNextBalanceItemStatus(item);
          return {
            id: `balance:${item.id}`,
            kind: "balance_item" as const,
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            brand_name: campaign.brand_name,
            title: item.label,
            due_date: item.expected_date!,
            status: item.status,
            amount_usd: item.actual_amount || item.estimated_amount || undefined,
            currency_code: campaign.currency_code,
            balance_item_kind: item.kind,
            overdue: due.overdue,
            days_until_due: due.daysUntilDue,
            action_label: nextStatus.label,
            busy_key: `agenda-balance:${item.id}`,
            action_payload: { action: "update_balance_item", balanceItemId: item.id, status: nextStatus.status },
            success_message: "Item de balance actualizado desde agenda.",
          };
        });
      return [...deliverableItems, ...paymentItems, ...balanceItems];
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.025] p-1">
        <div className="flex min-w-max gap-1">
          {BUSINESS_SUBVIEWS.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setBusinessView(view)}
              className={cn(
                "h-9 rounded-md px-3 text-[12px] font-black transition",
                businessView === view ? "bg-[#ff5a3d] text-white" : "text-[#9aa3af] hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {BUSINESS_SUBVIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {businessView === "resumen" ? (
      <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi title="Leads abiertos" value={openLeadCount} detail="Marcas por responder" />
        <Kpi title="Campañas activas" value={activeCampaignCount} detail="Propuesta, negociacion o activa" />
        <Kpi title="Colaboraciones" value={collaborations.length} detail={`${evaluatingCollaborations.length} en evaluacion`} />
        <Kpi title="Pipeline" value={crm?.summary.pipeline_usd || 0} prefix="$" detail="USD potencial" />
        <Kpi title="Pagos pendientes" value={crm?.summary.pending_payments_usd || 0} prefix="$" detail="Por cobrar" tone={(crm?.summary.pending_payments_usd || 0) > 0 ? "warning" : "success"} />
        <Kpi title="Entregables vencidos" value={crm?.summary.overdue_deliverables || 0} detail="Requieren accion" tone={(crm?.summary.overdue_deliverables || 0) > 0 ? "warning" : "success"} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="min-w-0">
          <p className="text-[13px] font-black text-white">Operaciones comerciales</p>
          <p className="mt-1 text-[11px] text-[#8e98a6]">Exporta datos para contabilidad o comparte un resumen ejecutivo del pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={exportBusinessCsv} disabled={!crm || busy === "loading"}>Exportar CSV</ActionButton>
          <ActionButton onClick={() => void copyBusinessSummary()} disabled={!crm || busy === "loading"}>Copiar resumen</ActionButton>
        </div>
      </div>
      </>
      ) : null}

      {message ? <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-[#b7d9ff]">{message}</p> : null}
      {busy === "loading" ? <InlineEmpty text="Cargando CRM comercial..." /> : null}

      {(businessView === "resumen" || businessView === "agenda") ? (
      <Panel title="Agenda comercial" description="Proximos entregables, pagos, valores recibidos y costos ordenados por urgencia.">
        <div className="grid gap-2 lg:grid-cols-2">
          {agendaItems.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SponsorBadge tone={item.overdue ? "warning" : "neutral"}>{item.overdue ? "Vencido" : formatDueDistance(item.days_until_due)}</SponsorBadge>
                  <SponsorBadge>{formatAgendaItemKind(item)}</SponsorBadge>
                  <SponsorBadge>{formatDateShort(item.due_date)}</SponsorBadge>
                </div>
                <p className="mt-2 truncate text-[13px] font-black text-white">{item.title}</p>
                <p className="mt-1 truncate text-[11px] text-[#8e98a6]">
                  {item.brand_name} · {item.campaign_title}
                  {item.amount_usd ? ` · ${item.currency_code || "USD"} ${formatNumber(item.amount_usd)}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-[#7d8794]">Estado: {formatAgendaItemStatus(item)}</p>
              </div>
              <ActionButton
                disabled={busy === item.busy_key}
                onClick={() => void crmAction(item.action_payload, item.success_message, item.busy_key)}
              >
                {busy === item.busy_key ? "Guardando..." : item.action_label}
              </ActionButton>
            </article>
          ))}
          {agendaItems.length === 0 ? <InlineEmpty text="No hay entregables, pagos ni items de balance con fecha pendiente. Agrega fechas para operar desde agenda." /> : null}
        </div>
      </Panel>
      ) : null}

      {businessView === "resumen" ? (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="Automatizaciones comerciales" description="Acciones sugeridas por leads, entregables, pagos y campañas.">
          <div className="space-y-2">
            {staleLead ? (
              <AutomationRow
                title={`Responder a ${staleLead.brand_name}`}
                detail={`Lead sin contacto hace ${daysSince(staleLead.created_at)} dias. Budget sugerido por marca: ${staleLead.proposed_budget_usd ? `$${formatNumber(staleLead.proposed_budget_usd)}` : "sin budget"}.`}
                action="Marcar contactado"
                disabled={busy === `auto-lead:${staleLead.id}`}
                onAction={() => void crmAction({ action: "update_inquiry", inquiryId: staleLead.id, status: "contacted" }, "Lead marcado como contactado.", `auto-lead:${staleLead.id}`)}
              />
            ) : null}
            {overduePayment ? (
              <AutomationRow
                title={`Pago vencido: ${overduePayment.campaign.brand_name}`}
                detail={`${overduePayment.payment.label} por $${formatNumber(overduePayment.payment.amount_usd)} vencio ${formatDateShort(overduePayment.payment.due_date)}.`}
                action="Marcar vencido"
                disabled={busy === `auto-payment:${overduePayment.payment.id}`}
                onAction={() => void crmAction({ action: "update_payment", paymentId: overduePayment.payment.id, status: "overdue" }, "Pago marcado como vencido.", `auto-payment:${overduePayment.payment.id}`)}
              />
            ) : null}
            {deliveredWithoutPayment ? (
              <AutomationRow
                title={`Crear pago para ${deliveredWithoutPayment.brand_name}`}
                detail={`Campaña entregada por $${formatNumber(deliveredWithoutPayment.budget_usd || 0)} sin pago registrado.`}
                action="Crear pago"
                disabled={busy === `auto-create-payment:${deliveredWithoutPayment.id}`}
                onAction={() => void crmAction({ action: "create_payment", campaignId: deliveredWithoutPayment.id, label: "Pago final", amountUsd: deliveredWithoutPayment.budget_usd || 1, dueDate: null }, "Pago final creado.", `auto-create-payment:${deliveredWithoutPayment.id}`)}
              />
            ) : null}
            {needsReportDeliverable ? (
              <AutomationRow
                title={`Agregar reporte a ${needsReportDeliverable.brand_name}`}
                detail="Toda campaña activa o entregada deberia tener un entregable de reporte para la marca."
                action="Agregar reporte"
                disabled={busy === `auto-report:${needsReportDeliverable.id}`}
                onAction={() => void crmAction({ action: "create_deliverable", campaignId: needsReportDeliverable.id, title: "Reporte de resultados para marca", deliverableType: "report", dueDate: null }, "Entregable de reporte agregado.", `auto-report:${needsReportDeliverable.id}`)}
              />
            ) : null}
            {renewalCandidate ? (
              <AutomationRow
                title={`Renovar ${renewalCandidate.brand_name}`}
                detail={`Campaña ${formatCampaignStatus(renewalCandidate.status).toLowerCase()}${renewalCandidate.end_date ? ` que finalizo ${formatDateShort(renewalCandidate.end_date)}` : ""}. ${renewalCandidate.contact_email ? `Contacto disponible: ${renewalCandidate.contact_email}.` : "Sin email de contacto asociado."}`}
                action={renewalCandidate.contact_email ? "Enviar renovacion" : "Crear renovacion"}
                disabled={busy === `renewal:${renewalCandidate.id}` || busy === `renewal-email:${renewalCandidate.id}`}
                onAction={() => renewalCandidate.contact_email
                  ? void createRenewalEmail(renewalCandidate.id)
                  : void crmAction({ action: "create_campaign_renewal", campaignId: renewalCandidate.id }, "Renovacion creada como nueva campaña.", `renewal:${renewalCandidate.id}`)}
              />
            ) : null}
            {!staleLead && !overduePayment && !deliveredWithoutPayment && !needsReportDeliverable && !renewalCandidate ? (
              <InlineEmpty text="No hay alertas comerciales urgentes. El sistema seguira revisando leads, pagos y entregables." />
            ) : null}
          </div>
        </Panel>

        <Panel title="Pricing recomendado por destino" description="Rangos iniciales calculados desde views de YouTube, cantidad de videos y cobertura por ciudad.">
          <div className="grid gap-2">
            {pricingOpportunities.map(({ country, pricing }) => (
              <article key={country.country_code} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-white">{country.country_name}</p>
                  <p className="mt-1 text-[11px] text-[#8e98a6]">{country.videos_count} videos · {formatCompact(country.total_views)} views · {country.cities_count} ciudades</p>
                  <p className="mt-2 font-mono text-[16px] font-black text-[#ffcf70]">${formatNumber(pricing.min)}-${formatNumber(pricing.max)}</p>
                </div>
                <ActionButton
                  disabled={busy === `pricing:${country.country_code}`}
                  onClick={() => void crmAction({
                    action: "create_campaign",
                    title: `Sponsor ${country.country_name}`,
                    brandName: "Marca por definir",
                    budgetUsd: pricing.recommended,
                    startDate: null,
                    endDate: null,
                    objective: `Propuesta base para sponsor por destino en ${country.country_name}: ${country.videos_count} videos, ${formatCompact(country.total_views)} views importadas de YouTube y presencia contextual en el mapa.`,
                  }, "Campaña base creada desde pricing recomendado.", `pricing:${country.country_code}`)}
                >
                  Crear campaña base
                </ActionButton>
              </article>
            ))}
            {pricingOpportunities.length === 0 ? <InlineEmpty text="No hay destinos sin sponsor con inventario suficiente para recomendar pricing." /> : null}
          </div>
        </Panel>
      </div>
      ) : null}

      {businessView === "leads" ? (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel title="Leads de marcas" description="Solicitudes recibidas desde el Media Kit y el mapa publico.">
          <div className="divide-y divide-white/10">
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-white">{inquiry.brand_name}</p>
                  <p className="mt-1 truncate text-[11px] text-[#8e98a6]">{inquiry.contact_name} · {inquiry.contact_email}</p>
                  <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#aeb7c2]">{inquiry.brief}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SponsorBadge tone={inquiry.status === "won" ? "success" : inquiry.status === "lost" ? "neutral" : "warning"}>{formatInquiryPipelineStatus(inquiry.status)}</SponsorBadge>
                    {inquiry.proposed_budget_usd ? <SponsorBadge>${formatNumber(inquiry.proposed_budget_usd)}</SponsorBadge> : null}
                    {inquiry.campaign_id ? <SponsorBadge tone="success">Campaña creada</SponsorBadge> : null}
                  </div>
                </div>
                <select
                  value={inquiry.status}
                  onChange={(event) => void crmAction({ action: "update_inquiry", inquiryId: inquiry.id, status: event.currentTarget.value }, "Lead actualizado.", `inquiry:${inquiry.id}`)}
                  disabled={busy === `inquiry:${inquiry.id}`}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-white outline-none disabled:opacity-50"
                >
                  {INQUIRY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <ActionButton onClick={() => window.open(`mailto:${inquiry.contact_email}`, "_blank", "noopener,noreferrer")}>Email</ActionButton>
                  <ActionButton
                    onClick={() => {
                      setBusinessView("colaboraciones");
                      void crmAction({ action: "create_collaboration_from_inquiry", inquiryId: inquiry.id, agreementType: "paid_sponsor" }, "Lead convertido en oportunidad.", `opportunity-from:${inquiry.id}`);
                    }}
                    disabled={Boolean(inquiry.campaign_id) || busy === `opportunity-from:${inquiry.id}`}
                  >
                    Crear oportunidad
                  </ActionButton>
                  <ActionButton
                    onClick={() => void crmAction({ action: "create_campaign_from_inquiry", inquiryId: inquiry.id }, "Lead convertido en campaña.", `campaign-from:${inquiry.id}`)}
                    disabled={Boolean(inquiry.campaign_id) || busy === `campaign-from:${inquiry.id}`}
                  >
                    {inquiry.campaign_id ? "Convertido" : "Campaña rápida"}
                  </ActionButton>
                </div>
              </article>
            ))}
            {inquiries.length === 0 ? <InlineEmpty text="Todavia no hay leads de marcas. El formulario del Media Kit alimenta esta lista." /> : null}
          </div>
        </Panel>

        <Panel title="Nueva campaña" description="Crea una campaña manual cuando llega por email, DM o una reunion fuera del mapa.">
          <form className="space-y-3" onSubmit={handleCreateCampaign}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field name="title" label="Nombre campaña" required minLength={2} maxLength={140} placeholder="Japón primavera 2026" />
              <Field name="brandName" label="Marca" required minLength={2} maxLength={120} placeholder="Nomad Gear" />
              <Field name="budgetUsd" label="Budget USD" type="number" min={1} placeholder="2500" />
              <Field name="startDate" label="Inicio" type="date" />
              <Field name="endDate" label="Fin" type="date" />
            </div>
            <TextArea name="objective" label="Objetivo" maxLength={1200} rows={4} placeholder="Qué se entregará, destino, CTA y expectativa de la marca." />
            <Button type="submit" disabled={busy === "create-campaign"}>
              {busy === "create-campaign" ? "Creando..." : "Crear campaña"}
            </Button>
          </form>
        </Panel>
      </div>
      ) : null}

      {businessView === "colaboraciones" ? (
      <div className="space-y-4">
        <Panel title="Nueva colaboracion" description="Evalua una oportunidad antes de aceptarla. No crea sponsor publico automaticamente.">
          <form className="space-y-3" onSubmit={handleCreateCollaboration}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field name="title" label="Nombre" required minLength={2} maxLength={140} placeholder="Hotel en CDMX" />
              <Field name="brandName" label="Marca" required minLength={2} maxLength={120} placeholder="Casa Nomad" />
              <SelectField label="Tipo" name="agreementType" options={AGREEMENT_TYPE_OPTIONS} />
              <Field name="contactName" label="Contacto" maxLength={120} placeholder="Nombre" />
              <Field name="contactEmail" label="Email" type="email" placeholder="marca@ejemplo.com" />
              <SelectField label="Moneda" name="currencyCode" options={CURRENCY_OPTIONS.map((currency) => ({ value: currency, label: currency }))} />
              <Field name="budgetUsd" label="Budget / valor base" type="number" min={1} placeholder="1500" />
              <Field name="countryCode" label="Pais ISO" maxLength={2} placeholder="MX" />
              <Field name="destinationLabel" label="Destino" maxLength={160} placeholder="Ciudad, region o hotel" />
              <Field name="startDate" label="Inicio" type="date" />
              <Field name="endDate" label="Fin" type="date" />
              <Field name="agreementTypeOther" label="Otro tipo" maxLength={120} placeholder="Solo si elegiste Otro" />
            </div>
            <TextArea name="objective" label="Brief operativo" maxLength={1200} rows={4} placeholder="Que pide la marca, que se recibiria y que habria que entregar." />
            <Button type="submit" disabled={busy === "create-collaboration"}>
              {busy === "create-collaboration" ? "Creando..." : "Crear oportunidad"}
            </Button>
          </form>
        </Panel>

        <Panel title="Colaboraciones" description="Vista filtrada de campanas con tipo de acuerdo definido.">
          <div className="space-y-4">
            {collaborations.map((campaign) => (
              <article key={campaign.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SponsorBadge tone={campaign.status === "lost" ? "neutral" : campaign.status === "paid" ? "success" : "warning"}>{formatCampaignStatus(campaign.status)}</SponsorBadge>
                      <SponsorBadge>{formatAgreementType(campaign.agreement_type)}</SponsorBadge>
                      <SponsorBadge tone={campaign.evaluation_result === "good_fit" ? "success" : campaign.evaluation_result === "poor_fit" ? "warning" : "neutral"}>{formatEvaluationResult(campaign.evaluation_result)}</SponsorBadge>
                      {campaign.country_code ? <SponsorBadge>{campaign.country_code}</SponsorBadge> : null}
                    </div>
                    <p className="mt-2 truncate text-[15px] font-black text-white">{campaign.brand_name} · {campaign.title}</p>
                    <p className="mt-1 text-[12px] text-[#9aa3af]">{campaign.destination_label || "Sin destino"} · {campaign.contact_email || "Sin contacto"}</p>
                    {campaign.objective ? <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#aeb7c2]">{campaign.objective}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <SponsorMetric label="Valor real" value={campaign.balance.actual_in_kind + campaign.balance.actual_cash} />
                    <SponsorMetric label="Costos reales" value={campaign.balance.actual_costs} />
                    <SponsorMetric label="Balance" value={campaign.balance.actual_total} />
                    <SponsorMetric label="Con esfuerzo" value={campaign.balance.actual_total_with_effort} />
                  </div>
                </div>

                <form className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3" onSubmit={(event) => handleUpdateCollaboration(event, campaign)}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SelectField label="Tipo" name="agreementType" options={AGREEMENT_TYPE_OPTIONS} defaultValue={campaign.agreement_type || "paid_sponsor"} />
                    <SelectField label="Moneda" name="currencyCode" options={CURRENCY_OPTIONS.map((currency) => ({ value: currency, label: currency }))} defaultValue={campaign.currency_code} />
                    <SelectField label="Resultado" name="evaluationResult" options={EVALUATION_RESULT_OPTIONS} defaultValue={campaign.evaluation_result} />
                    <SelectField label="Cumple minimos" name="minimumFit" options={MINIMUM_FIT_OPTIONS} defaultValue={campaign.minimum_fit} />
                    <Field name="minimumAmount" label="Minimo para aceptar" type="number" min={0} defaultValue={campaign.minimum_amount || ""} />
                    <SelectField label="Acepta canje" name="acceptsBarter" options={[{ value: "", label: "Sin definir" }, { value: "yes", label: "Si" }, { value: "no", label: "No" }]} defaultValue={campaign.accepts_barter === true ? "yes" : campaign.accepts_barter === false ? "no" : ""} />
                    <Field name="contactName" label="Contacto" defaultValue={campaign.contact_name || ""} />
                    <Field name="contactEmail" label="Email" type="email" defaultValue={campaign.contact_email || ""} />
                    <Field name="countryCode" label="Pais ISO" maxLength={2} defaultValue={campaign.country_code || ""} />
                    <Field name="destinationLabel" label="Destino" defaultValue={campaign.destination_label || ""} />
                    <Field name="agreementTypeOther" label="Otro tipo" defaultValue={campaign.agreement_type_other || ""} />
                    <SelectField label="Volveria" name="wouldCollaborateAgain" options={[{ value: "", label: "Sin definir" }, { value: "yes", label: "Si" }, { value: "maybe", label: "Tal vez" }, { value: "no", label: "No" }]} defaultValue={campaign.would_collaborate_again || ""} />
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <CheckboxField name="includesPayment" label="Incluye pago" defaultChecked={campaign.includes_payment} />
                    <CheckboxField name="includesBarter" label="Incluye canje" defaultChecked={campaign.includes_barter} />
                    <CheckboxField name="includesAffiliate" label="Incluye afiliado" defaultChecked={campaign.includes_affiliate} />
                    <CheckboxField name="includesDiscountCode" label="Incluye cupon" defaultChecked={campaign.includes_discount_code} />
                    <CheckboxField name="includesMapPresence" label="Presencia en mapa" defaultChecked={campaign.includes_map_presence} />
                    <CheckboxField name="includesBrandReport" label="Reporte para marca" defaultChecked={campaign.includes_brand_report} />
                    <CheckboxField name="requiresExclusivity" label="Exclusividad" defaultChecked={campaign.requires_exclusivity} />
                    <CheckboxField name="requiresPreapproval" label="Aprobacion previa" defaultChecked={campaign.requires_preapproval} />
                    <CheckboxField name="requiresTravel" label="Requiere viaje" defaultChecked={campaign.requires_travel} />
                    <CheckboxField name="minimumRequiresPayment" label="Minimo: pago" defaultChecked={campaign.minimum_requires_payment} />
                    <CheckboxField name="minimumRequiresAccommodation" label="Minimo: alojamiento" defaultChecked={campaign.minimum_requires_accommodation} />
                    <CheckboxField name="minimumRequiresTransport" label="Minimo: transporte" defaultChecked={campaign.minimum_requires_transport} />
                    <CheckboxField name="minimumRequiresCreativeFreedom" label="Libertad creativa" defaultChecked={campaign.minimum_requires_creative_freedom} />
                    <CheckboxField name="minimumRequiresNoPreapproval" label="Sin aprobacion previa" defaultChecked={campaign.minimum_requires_no_preapproval} />
                    <CheckboxField name="minimumRequiresClearDates" label="Fechas claras" defaultChecked={campaign.minimum_requires_clear_dates} />
                    <CheckboxField name="minimumRequiresLinkOrCoupon" label="Link/cupon" defaultChecked={campaign.minimum_requires_link_or_coupon} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <TextArea name="minimumConditionsNotes" label="Condiciones minimas" defaultValue={campaign.minimum_conditions_notes || ""} />
                    <TextArea name="acceptanceOverrideNote" label="Nota si no cumple minimos" defaultValue={campaign.acceptance_override_note || ""} />
                    <TextArea name="finalLearningNote" label="Aprendizaje final" defaultValue={campaign.final_learning_note || ""} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={busy === `collaboration:${campaign.id}`}>Guardar evaluacion</Button>
                    <ActionButton
                      disabled={busy === `accept:${campaign.id}`}
                      onClick={() => void crmAction({ action: "update_campaign_status", campaignId: campaign.id, status: "active" }, "Colaboracion aceptada.", `accept:${campaign.id}`)}
                    >
                      Aceptar
                    </ActionButton>
                    <ActionButton
                      disabled={busy === `reject:${campaign.id}`}
                      onClick={() => void crmAction({ action: "update_campaign_status", campaignId: campaign.id, status: "lost" }, "Colaboracion rechazada.", `reject:${campaign.id}`)}
                    >
                      Rechazar
                    </ActionButton>
                  </div>
                </form>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Balance de colaboracion</p>
                    <div className="space-y-2">
                      {campaign.balance_items.filter((item) => item.enabled).map((item) => (
                        <div key={item.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-white">{item.label}</p>
                            <p className="text-[11px] text-[#8e98a6]">{formatBalanceItemKind(item.kind)} · {formatBalanceItemStatus(item.status)} · Est. {campaign.currency_code} {formatNumber(item.estimated_amount || 0)} · Real {campaign.currency_code} {formatNumber(item.actual_amount || 0)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <ActionButton onClick={() => void crmAction({ action: "update_balance_item", balanceItemId: item.id, status: item.kind === "cost" ? "paid" : "received" }, "Item actualizado.", `item:${item.id}`)}>Marcar listo</ActionButton>
                            <ActionButton onClick={() => void crmAction({ action: "update_balance_item", balanceItemId: item.id, enabled: false }, "Item desactivado.", `item-off:${item.id}`)}>Desactivar</ActionButton>
                          </div>
                        </div>
                      ))}
                      {campaign.balance_items.filter((item) => item.enabled).length === 0 ? <InlineEmpty text="Sin items de balance activados." /> : null}
                    </div>
                  </div>
                  <form className="rounded-lg border border-white/10 bg-white/[0.02] p-3" onSubmit={(event) => handleCreateBalanceItem(event, campaign.id)}>
                    <p className="text-[12px] font-black text-white">Agregar item</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <SelectField label="Tipo" name="kind" options={BALANCE_ITEM_KIND_OPTIONS} />
                      <Field name="itemType" label="Categoria" required placeholder="hotel, producto, transporte" />
                      <Field name="label" label="Item" required placeholder="3 noches de hotel" />
                      <SelectField label="Estado" name="status" options={BALANCE_ITEM_STATUS_OPTIONS} />
                      <Field name="estimatedAmount" label="Valor estimado" type="number" min={0} />
                      <Field name="actualAmount" label="Valor real" type="number" min={0} />
                      <Field name="expectedDate" label="Fecha esperada" type="date" />
                      <SelectField label="Esfuerzo" name="effortMode" options={[{ value: "project", label: "Proyecto" }, { value: "hourly", label: "Por hora" }]} />
                      <Field name="estimatedHours" label="Horas est." type="number" min={0} step="0.25" />
                      <Field name="hourlyRate" label="Tarifa/hora" type="number" min={0} />
                    </div>
                    <div className="mt-2">
                      <CheckboxField name="trackInAgenda" label="Seguir en agenda si tiene fecha" />
                    </div>
                    <TextArea name="notes" label="Nota operativa" rows={3} className="mt-2" />
                    <Button type="submit" size="sm" disabled={busy === `balance-item:${campaign.id}`}>Agregar item</Button>
                  </form>
                </div>
              </article>
            ))}
            {collaborations.length === 0 ? <InlineEmpty text="Todavia no hay colaboraciones. Crea una oportunidad o convierte un lead." /> : null}
          </div>
        </Panel>
      </div>
      ) : null}

      {businessView === "balance" ? (
      <div className="space-y-4">
        <Panel title="Balance real" description="Solo suma colaboraciones activas, entregadas y pagadas. Las oportunidades siguen en pipeline.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(crm?.summary.balance_by_currency || []).map((balance) => (
              <article key={balance.currency_code} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-black text-white">{balance.currency_code}</p>
                  <SponsorBadge>{balance.campaign_count} colaboraciones</SponsorBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SponsorMetric label="Cash real" value={balance.actual_cash} />
                  <SponsorMetric label="Especie real" value={balance.actual_in_kind} />
                  <SponsorMetric label="Costos reales" value={balance.actual_costs} />
                  <SponsorMetric label="Balance real" value={balance.actual_total} />
                  <SponsorMetric label="Esfuerzo" value={balance.actual_effort} />
                  <SponsorMetric label="Con esfuerzo" value={balance.actual_total_with_effort} />
                </div>
              </article>
            ))}
            {(crm?.summary.balance_by_currency || []).length === 0 ? <InlineEmpty text="Todavia no hay balance real. Acepta o cierra colaboraciones para sumar resultados." /> : null}
          </div>
        </Panel>
        <Panel title="Detalle por colaboracion">
          <div className="divide-y divide-white/10">
            {activeCollaborations.map((campaign) => (
              <div key={campaign.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-white">{campaign.brand_name} · {campaign.title}</p>
                  <p className="mt-1 text-[11px] text-[#8e98a6]">{formatAgreementType(campaign.agreement_type)} · {formatCampaignStatus(campaign.status)} · {campaign.currency_code}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SponsorMetric label="Valor" value={campaign.balance.actual_cash + campaign.balance.actual_in_kind} />
                  <SponsorMetric label="Costos" value={campaign.balance.actual_costs} />
                  <SponsorMetric label="Neto" value={campaign.balance.actual_total} />
                </div>
              </div>
            ))}
            {activeCollaborations.length === 0 ? <InlineEmpty text="No hay colaboraciones activas o cerradas para detallar." /> : null}
          </div>
        </Panel>
      </div>
      ) : null}

      {businessView === "campanas" ? (
      <Panel title="Campañas" description="Controla estado, entregables y pagos sin salir del panel.">
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              {(() => {
                const activePortal = campaign.portal_links.find((link) => link.active && !link.revoked_at) || null;
                const openRenewal = hasOpenRenewalForCampaign(campaign, campaigns);
                return (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Portal de marca</p>
                      <p className="mt-1 truncate text-[12px] text-white">
                        {activePortal
                          ? `Activo · ${formatNumber(activePortal.view_count)} vistas${activePortal.require_access_code ? " · con codigo" : ""}`
                          : "Sin link privado para la marca"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePortal ? (
                        <>
                          <ActionButton
                            disabled={!activePortal.public_url}
                            onClick={() => {
                              const url = resolvePortalUrl(activePortal.public_url);
                              if (url) window.open(url, "_blank", "noopener,noreferrer");
                              else setMessage("El link del portal no esta disponible.");
                            }}
                          >
                            Abrir portal
                          </ActionButton>
                          <ActionButton disabled={!activePortal.public_url} onClick={() => void copyBrandPortalLink(activePortal.public_url)}>Copiar link</ActionButton>
                          <ActionButton
                            disabled={busy === `portal-revoke:${activePortal.id}`}
                            onClick={() => void crmAction({ action: "revoke_brand_portal", portalId: activePortal.id }, "Portal de marca revocado.", `portal-revoke:${activePortal.id}`)}
                          >
                            Revocar
                          </ActionButton>
                        </>
                      ) : (
                        <ActionButton
                          disabled={busy === `portal-create:${campaign.id}`}
                          onClick={() => void crmAction({ action: "create_brand_portal", campaignId: campaign.id }, "Portal de marca creado.", `portal-create:${campaign.id}`)}
                        >
                          Crear portal
                        </ActionButton>
                      )}
                      {isCampaignReadyForRenewal(campaign) ? (
                        <>
                          <ActionButton
                            disabled={openRenewal || busy === `renewal:${campaign.id}`}
                            onClick={() => void crmAction({ action: "create_campaign_renewal", campaignId: campaign.id }, "Renovacion creada como nueva campaña.", `renewal:${campaign.id}`)}
                          >
                            {openRenewal ? "Renovacion creada" : "Renovar"}
                          </ActionButton>
                          {campaign.contact_email && !openRenewal ? (
                            <ActionButton
                              disabled={busy === `renewal-email:${campaign.id}`}
                              onClick={() => void createRenewalEmail(campaign.id)}
                            >
                              {busy === `renewal-email:${campaign.id}` ? "Enviando..." : "Email renovacion"}
                            </ActionButton>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-white">{campaign.title}</p>
                  <p className="mt-1 text-[12px] text-[#9aa3af]">{campaign.brand_name} · {campaign.budget_usd ? `$${formatNumber(campaign.budget_usd)}` : "Sin budget"}</p>
                  {campaign.objective ? <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#aeb7c2]">{campaign.objective}</p> : null}
                </div>
                <select
                  value={campaign.status}
                  onChange={(event) => void crmAction({ action: "update_campaign_status", campaignId: campaign.id, status: event.currentTarget.value }, "Campaña actualizada.", `campaign:${campaign.id}`)}
                  disabled={busy === `campaign:${campaign.id}`}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-white outline-none disabled:opacity-50"
                >
                  {CAMPAIGN_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="flex flex-wrap gap-1.5 lg:justify-end">
                  <SponsorBadge tone={campaign.status === "paid" ? "success" : campaign.status === "lost" ? "neutral" : "warning"}>{formatCampaignStatus(campaign.status)}</SponsorBadge>
                  <SponsorBadge>{campaign.deliverables.length} entregables</SponsorBadge>
                  <SponsorBadge>{campaign.payments.length} pagos</SponsorBadge>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Entregables</p>
                  <div className="space-y-2">
                    {campaign.deliverables.map((deliverable) => (
                      <div key={deliverable.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold text-white">{deliverable.title}</p>
                          <p className="text-[11px] text-[#8e98a6]">{deliverable.deliverable_type} · {formatDateShort(deliverable.due_date)}</p>
                        </div>
                        <select
                          value={deliverable.status}
                          onChange={(event) => void crmAction({ action: "update_deliverable", deliverableId: deliverable.id, status: event.currentTarget.value }, "Entregable actualizado.", `deliverable-status:${deliverable.id}`)}
                          disabled={busy === `deliverable-status:${deliverable.id}`}
                          className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[11px] text-white outline-none disabled:opacity-50"
                        >
                          {DELIVERABLE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    ))}
                    {campaign.deliverables.length === 0 ? <InlineEmpty text="Sin entregables aun." /> : null}
                  </div>
                  <form className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_130px_auto]" onSubmit={(event) => handleCreateDeliverable(event, campaign.id)}>
                    <input name="title" required placeholder="Entregable" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none" />
                    <select name="deliverableType" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none">
                      <option value="video">Video</option>
                      <option value="short">Short</option>
                      <option value="story">Story</option>
                      <option value="map_placement">Mapa</option>
                      <option value="report">Reporte</option>
                    </select>
                    <input name="dueDate" type="date" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none" />
                    <Button type="submit" size="sm" disabled={busy === `deliverable:${campaign.id}`}>Agregar</Button>
                  </form>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Pagos</p>
                  <div className="space-y-2">
                    {campaign.payments.map((payment) => (
                      <div key={payment.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold text-white">{payment.label} · ${formatNumber(payment.amount_usd)}</p>
                          <p className="text-[11px] text-[#8e98a6]">Vence {formatDateShort(payment.due_date)}</p>
                        </div>
                        <select
                          value={payment.status}
                          onChange={(event) => void crmAction({ action: "update_payment", paymentId: payment.id, status: event.currentTarget.value }, "Pago actualizado.", `payment-status:${payment.id}`)}
                          disabled={busy === `payment-status:${payment.id}`}
                          className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[11px] text-white outline-none disabled:opacity-50"
                        >
                          {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    ))}
                    {campaign.payments.length === 0 ? <InlineEmpty text="Sin pagos registrados." /> : null}
                  </div>
                  <form className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_130px_auto]" onSubmit={(event) => handleCreatePayment(event, campaign.id)}>
                    <input name="label" placeholder="Pago" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none" />
                    <input name="amountUsd" required type="number" min={1} placeholder="USD" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none" />
                    <input name="dueDate" type="date" className="h-9 rounded-lg border border-white/10 bg-[#090d13] px-2 text-[12px] text-white outline-none" />
                    <Button type="submit" size="sm" disabled={busy === `payment:${campaign.id}`}>Agregar</Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
          {campaigns.length === 0 ? <InlineEmpty text="Todavia no hay campañas. Convierte un lead o crea una campaña manual." /> : null}
        </div>
      </Panel>
      ) : null}
    </div>
  );
}

function AudienceTab({ payload }: { payload: CreatorAdminPayload }) {
  const mapInteractions = payload.audience.top_countries.reduce((sum, row) => sum + row.events, 0);
  const videoInteractions = payload.audience.top_videos.reduce((sum, row) => sum + row.events, 0);
  const sponsorClicks = payload.audience.sponsor_clicks.reduce((sum, row) => sum + row.clicks, 0);
  const pollVotes = payload.audience.poll_votes;
  const strongestSignal = [
    { label: "Paises explorados", value: mapInteractions },
    { label: "Videos abiertos", value: videoInteractions },
    { label: "Clicks sponsor", value: sponsorClicks },
    { label: "Votos", value: pollVotes },
  ].sort((a, b) => b.value - a.value)[0];
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Paises explorados" value={mapInteractions} detail="Interacciones first-party por destino" />
        <Kpi title="Videos abiertos" value={videoInteractions} detail="Contenido que el mapa hace descubrir" />
        <Kpi title="Clicks sponsor" value={sponsorClicks} detail="Intencion comercial dentro del mapa" />
        <Kpi title="Votos audiencia" value={pollVotes} detail="Demanda declarada de proximos destinos" />
      </section>

      <Panel title="Lectura ejecutiva" description="Senales propias que YouTube Console no puede explicar por si sola.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">Senal dominante</p>
            <p className="mt-2 text-[15px] font-black text-white">{strongestSignal?.label || "Sin actividad"}</p>
            <p className="mt-1 text-[12px] text-[#9aa3af]">{formatNumber(strongestSignal?.value || 0)} eventos registrados.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">Oportunidad de contenido</p>
            <p className="mt-2 text-[15px] font-black text-white">{payload.audience.top_videos[0]?.title || "Sin video lider"}</p>
            <p className="mt-1 text-[12px] text-[#9aa3af]">Usa estos videos para decidir shorts, guias o nuevos destinos.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">Oportunidad comercial</p>
            <p className="mt-2 text-[15px] font-black text-white">{payload.audience.sponsor_clicks[0]?.brand_name || "Sin sponsor lider"}</p>
            <p className="mt-1 text-[12px] text-[#9aa3af]">Los clicks del mapa son una senal directa para propuestas a marcas.</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Consumo del mapa" description="Metricas del mapa generadas dentro de Travel Your Map.">
        <RankList rows={payload.audience.top_countries.map((row) => ({ label: row.country_code, value: row.events }))} empty="Todavia no hay eventos por pais." />
      </Panel>
      <Panel title="Videos que el mapa hace descubrir">
        <RankList rows={payload.audience.top_videos.map((row) => ({ label: row.title, value: row.events }))} empty="Todavia no hay aperturas registradas." />
      </Panel>
      <Panel title="Sponsors con mas clicks">
        <RankList rows={payload.audience.sponsor_clicks.map((row) => ({ label: row.brand_name, value: row.clicks }))} empty="Todavia no hay clicks de sponsors." />
      </Panel>
      <Panel title="YouTube vs Travel Your Map">
        <div className="space-y-3 text-[12px] leading-5 text-[#aeb7c2]">
          <p>
            YouTube explica alcance del canal: views, likes, comentarios y publicacion. Travel Your Map explica intencion dentro del mapa: paises explorados, videos abiertos, votos y clicks sponsor.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <SourcePill label="YouTube" value={`${formatCompact(payload.countries.reduce((sum, country) => sum + country.total_views, 0))} views`} />
            <SourcePill label="Travel Your Map" value={`${formatNumber(mapInteractions + videoInteractions + sponsorClicks + pollVotes)} senales`} />
          </div>
        </div>
      </Panel>
      </div>
    </div>
  );
}

function ActivityTab({ payload }: { payload: CreatorAdminPayload }) {
  return (
    <div className="space-y-4">
      <Panel title="Timeline editorial y operativo">
        <div className="divide-y divide-white/10">
          {payload.activity.map((item) => <ActivityRow key={item.id} item={item} />)}
          {payload.activity.length === 0 ? <InlineEmpty text="No hay actividad registrada." /> : null}
        </div>
      </Panel>
      <SystemAlerts payload={payload} />
    </div>
  );
}

function SystemAlerts({
  payload,
  alerts,
  onNavigate,
  onDismissAlert,
}: {
  payload: CreatorAdminPayload;
  alerts?: CreatorAdminAlert[];
  onNavigate?: (href: string) => void;
  onDismissAlert?: (alertId: string) => void;
}) {
  const visibleAlerts = alerts ?? payload.alerts;
  const canDismiss = Boolean(onDismissAlert);
  return (
    <Panel title="Alertas del sistema">
      <div className="space-y-2">
        {visibleAlerts.map((alert) => (
          <div key={alert.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.055]">
            <div className="flex items-start gap-2">
              {canDismiss ? (
                <button
                  type="button"
                  className="mt-0.5 shrink-0 rounded-md p-1 text-[#9aa3af] transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={`Quitar alerta ${alert.title}`}
                  onClick={() => onDismissAlert?.(alert.id)}
                >
                  <X size={12} />
                </button>
              ) : null}
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onNavigate?.(alert.href)}>
                <div className="flex items-start gap-2">
                  <WarningCircle size={16} className={alert.severity === "error" ? "text-red-300" : "text-[#ffbf47]"} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-white">{alert.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#9aa3af]">{alert.description}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ))}
        {visibleAlerts.length === 0 ? <InlineEmpty text="No hay alertas activas." /> : null}
      </div>
    </Panel>
  );
}

function BusinessReadinessCard({ payload }: { payload: CreatorAdminPayload }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const readiness = payload.businessReadiness;
  const missingRequired = readiness.checks.filter((check) => check.required && check.status === "missing");

  async function copyMigrationCommand() {
    try {
      await navigator.clipboard.writeText("npm run db:migrate");
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  return (
    <Panel
      title="Business OS"
      description={readiness.ready ? "Operacion comercial lista." : `${readiness.missing_required_count} capacidad${readiness.missing_required_count === 1 ? "" : "es"} requerida${readiness.missing_required_count === 1 ? "" : "s"} pendiente${readiness.missing_required_count === 1 ? "" : "s"}.`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div>
            <p className="font-mono text-[22px] font-black text-white">
              {readiness.ready_count}/{readiness.total_count}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#7d8794]">capacidades listas</p>
          </div>
          <SponsorBadge tone={readiness.ready ? "success" : "warning"}>{readiness.ready ? "Listo" : "Pendiente"}</SponsorBadge>
        </div>

        <div className="space-y-2">
          {readiness.checks.map((check) => (
            <div key={check.key} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-2.5">
              {check.status === "ready" ? <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-300" /> : <WarningCircle size={15} className="mt-0.5 shrink-0 text-[#ffbf47]" />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[12px] font-black text-white">{check.label}</p>
                  {!check.required ? <SponsorBadge>Opcional</SponsorBadge> : null}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#8e98a6]">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {missingRequired.length > 0 ? (
          <div className="rounded-lg border border-[#ffbf47]/20 bg-[#ffbf47]/10 p-3">
            <p className="text-[12px] font-black text-[#ffd07a]">Faltan migraciones requeridas.</p>
            <p className="mt-1 text-[11px] leading-4 text-[#d7b46b]">Aplica las migraciones antes de usar reportes, CRM, Media Kit o portales de marca.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ActionButton onClick={() => void copyMigrationCommand()}>
                {copyState === "copied" ? "Comando copiado" : copyState === "error" ? "No se pudo copiar" : "Copiar migracion"}
              </ActionButton>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function MapConnection({ payload }: { payload: CreatorAdminPayload }) {
  return (
    <Panel title="Conexion con mapa">
      <div className="space-y-3 text-[12px] text-[#aeb7c2]">
        <p>Cada cambio de visibilidad, sponsor, votacion y ubicacion impacta en el mapa publico.</p>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="font-mono text-[11px] text-[#8e98a6]">Ultima sync</p>
          <p className="mt-1 font-bold text-white">{formatDateTime(payload.syncStatus.last_run_at)}</p>
          <p className="mt-1 text-[11px] text-[#8e98a6]">{payload.syncStatus.last_status || "Sin estado"}</p>
        </div>
      </div>
    </Panel>
  );
}

function EditVideoModal({
  video,
  countries,
  onClose,
  onSubmit,
}: {
  video: CreatorAdminVideo;
  countries: CreatorAdminCountry[];
  onClose: () => void;
  onSubmit: (videoId: string, payloadPatch: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  const sponsorCount = video.sponsor_names.length;
  const isMultiSponsor = sponsorCount > 1;
  const currentSponsorStyle = normalizeSponsorCardStyle(video.sponsor_card_style) || "cta_red";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payloadPatch: Record<string, unknown> = {
      internal_notes: String(formData.get("internal_notes") || "").trim() || null,
      location: {
        country_code: String(formData.get("country_code") || "").trim().toUpperCase(),
        country_name: String(formData.get("country_name") || "").trim() || null,
        city: String(formData.get("city") || "").trim() || null,
        region: String(formData.get("region") || "").trim() || null,
        lat: numberOrNull(formData.get("lat")),
        lng: numberOrNull(formData.get("lng")),
        label_public: String(formData.get("label_public") || "").trim() || null,
        verification_source: "manual",
        internal_notes: String(formData.get("location_internal_notes") || "").trim() || null,
      },
    };
    if (!isMultiSponsor) {
      payloadPatch.sponsor_card_style = String(formData.get("sponsor_card_style") || currentSponsorStyle);
    }
    const ok = await onSubmit(video.id, payloadPatch, "Ubicacion actualizada.");
    if (ok) onClose();
  }

  return (
    <BaseModal title="Editar video" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <VideoThumb video={video} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{video.title}</p>
            <p className="text-[11px] text-[#8e98a6]">{video.youtube_video_id}</p>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Sponsors del video</p>
              <p className="mt-1 text-[12px] text-white">
                {sponsorCount > 0 ? `${sponsorCount} sponsor${sponsorCount === 1 ? "" : "s"} asignado${sponsorCount === 1 ? "" : "s"}.` : "Sin sponsors asignados."}
              </p>
            </div>
            <span className={cn("rounded-full border px-2 py-1 text-[10px] font-black uppercase", sponsorCount > 0 ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#9aa3af]")}>
              {sponsorCount > 0 ? getSponsorCardStyleLabel(video.sponsor_card_style, sponsorCount) : "Sin sponsor"}
            </span>
          </div>
          {video.sponsor_names.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {video.sponsor_names.map((name) => (
                <span key={name} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-white">
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0b1017] p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#9aa3af]">Diseño sponsor</p>
              <p className="mt-1 text-[12px] text-[#c9d2dc]">
                {isMultiSponsor
                  ? "Auto: cuando hay mas de un sponsor se usa la barra multi sponsor."
                  : "Elige cómo se mostrará el sponsor en todos los mapas públicos."}
              </p>
            </div>
            {isMultiSponsor ? (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#9aa3af]">
                Multi sponsor
              </span>
            ) : null}
          </div>
          {!isMultiSponsor ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {SPONSOR_CARD_STYLE_OPTIONS.map((option) => {
                const active = currentSponsorStyle === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3 transition",
                      active
                        ? "border-[#ff5a3d]/35 bg-[#ff5a3d]/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    )}
                  >
                    <input
                      type="radio"
                      name="sponsor_card_style"
                      value={option.value}
                      defaultChecked={active}
                      className="sr-only"
                    />
                    <p className="text-[12px] font-black text-white">{option.label}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#9aa3af]">{option.description}</p>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Pais ISO" name="country_code" defaultValue={video.country_code || countries[0]?.country_code || ""} required />
          <Field label="Nombre del pais" name="country_name" defaultValue={video.country_name || countries.find((country) => country.country_code === video.country_code)?.country_name || ""} />
          <Field label="Ciudad / region" name="city" defaultValue={video.city || ""} />
          <Field label="Region" name="region" defaultValue={video.region || ""} />
          <Field label="Latitud" name="lat" type="number" step="any" defaultValue={video.lat ?? ""} />
          <Field label="Longitud" name="lng" type="number" step="any" defaultValue={video.lng ?? ""} />
          <Field label="Label publico" name="label_public" defaultValue={video.label_public || ""} className="md:col-span-2" />
          <TextArea label="Notas internas de ubicacion" name="location_internal_notes" defaultValue={video.location_internal_notes || ""} className="md:col-span-2" />
          <TextArea label="Notas internas del video" name="internal_notes" defaultValue={video.internal_notes || ""} className="md:col-span-2" />
        </div>
        <ModalFooter onClose={onClose} submitLabel="Guardar cambios" />
      </form>
    </BaseModal>
  );
}

function SponsorModal({
  payload,
  sponsor,
  defaultCountry,
  onClose,
  mutate,
}: {
  payload: CreatorAdminPayload;
  sponsor: CreatorAdminSponsor | null;
  defaultCountry: string | null;
  onClose: () => void;
  mutate: (url: string, init: RequestInit, success: string) => Promise<boolean>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wizardVideos = useMemo(() => payload.videos.map(toWizardVideo), [payload.videos]);
  const countryOptions = useMemo(
    () => payload.countries.map((country) => ({ code: country.country_code, name: country.country_name })),
    [payload.countries]
  );
  const videoOptions = useMemo(
    () => wizardVideos.filter((video) => Boolean(video.id)).map((video) => ({ ...video, id: String(video.id) })),
    [wizardVideos]
  );
  const categoryOptions = useMemo(() => {
    const dynamic = payload.sponsors.map((entry) => entry.category_name || "").filter(Boolean);
    return Array.from(new Set(["Dónde dormir", "Qué hacer", "Viajar cubierto", "Transporte", "Conectividad", "Equipamiento", "Producto digital", ...dynamic]));
  }, [payload.sponsors]);

  const initialValues = useMemo(() => {
    if (sponsor) {
      return {
        brand_name: sponsor.brand_name,
        logo_url: sponsor.logo_url,
        affiliate_url: sponsor.affiliate_url || sponsor.website_url,
        discount_code: sponsor.discount_code,
        description: sponsor.description,
        category_name: sponsor.category_name,
        cta_label: sponsor.cta_label,
        action_type: sponsor.action_type || (sponsor.discount_code ? "coupon" : "link"),
        scope: sponsor.scope,
        country_codes: sponsor.country_codes,
        video_ids: sponsor.video_ids,
        sponsor_card_style: normalizeSponsorCardStyle(sponsor.sponsor_card_style) || "cta_red",
        sponsor_banner_background_color: sponsor.sponsor_banner_background_color || "#dc2626",
        sponsor_banner_text_color: sponsor.sponsor_banner_text_color || "#ffffff",
      } satisfies Partial<SponsorWizardPayload>;
    }
    if (!defaultCountry) return null;
    return {
      scope: "country" as const,
      country_codes: [defaultCountry],
    };
  }, [defaultCountry, sponsor]);

  async function handleSubmit(payloadPatch: SponsorWizardPayload) {
    setIsSubmitting(true);
    setError(null);
    const body = {
      channelId: payload.channel.id,
      sponsorId: sponsor?.id,
      brand_name: payloadPatch.brand_name,
      logo_url: payloadPatch.logo_url,
      website_url: null,
      affiliate_url: payloadPatch.affiliate_url,
      discount_code: payloadPatch.discount_code,
      description: payloadPatch.description,
      category_name: payloadPatch.category_name,
      action_type: payloadPatch.action_type,
      action_value: payloadPatch.action_type === "coupon" ? payloadPatch.discount_code : null,
      cta_label: payloadPatch.cta_label,
      sponsor_card_style: payloadPatch.sponsor_card_style,
      sponsor_banner_background_color: payloadPatch.sponsor_banner_background_color,
      sponsor_banner_text_color: payloadPatch.sponsor_banner_text_color,
      scope: payloadPatch.scope,
      country_codes: payloadPatch.country_codes,
      video_ids: payloadPatch.video_ids,
      active: sponsor?.active ?? true,
      start_date: null,
      end_date: null,
      internal_notes: sponsor?.internal_notes || null,
    };
    try {
      const ok = await mutate("/api/map-admin/sponsors", { method: sponsor ? "PATCH" : "POST", body: JSON.stringify(body) }, sponsor ? "Sponsor actualizado." : "Sponsor creado.");
      if (ok) onClose();
      else setError("No se pudo guardar el sponsor.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el sponsor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BaseModal title={sponsor ? "Editar sponsor" : "Nuevo sponsor"} onClose={onClose} size="wide">
      <SponsorCreatorWizard
        channelId={payload.channel.id}
        isDemoMode={false}
        mode={sponsor ? "edit" : "create"}
        initialValues={initialValues}
        videos={wizardVideos}
        countryOptions={countryOptions}
        videoOptions={videoOptions}
        categoryOptions={categoryOptions}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        error={error}
      />
    </BaseModal>
  );
}

function NewVoteModal({
  payload,
  onClose,
  mutate,
}: {
  payload: CreatorAdminPayload;
  onClose: () => void;
  mutate: (url: string, init: RequestInit, success: string) => Promise<boolean>;
}) {
  const pollEditorOptions = useMemo(() => buildPollEditorCountriesFromVideos(payload.videos), [payload.videos]);
  const [form, setForm] = useState<PollEditorFormState>(() => buildPollEditorFormState(null, pollEditorOptions));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      action: "save",
      channelId: payload.channel.id,
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      pollMode: form.pollMode,
      status: String(formData.get("status") || "live"),
      visibility: String(formData.get("visibility") || "public"),
      showPopup: form.showPopup,
      closesAt: form.closesAtLocal ? new Date(form.closesAtLocal).toISOString() : null,
      countryOptions: form.countryOptions,
      sponsorUrl: String(formData.get("sponsor_url") || "").trim() || null,
    };
    const ok = await mutate("/api/map-admin/polls", { method: "POST", body: JSON.stringify(body) }, "Votacion guardada.");
    if (ok) onClose();
  }
  return (
    <BaseModal title="Nueva votacion" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PollEditorFields form={form} setForm={setForm} availableOptions={pollEditorOptions} />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Estado" name="status" options={[{ value: "live", label: "Abierta" }, { value: "draft", label: "Borrador" }]} />
          <SelectField label="Visibilidad" name="visibility" options={[{ value: "public", label: "Publica en el mapa" }, { value: "link_only", label: "Solo link directo" }]} />
        </div>
        <Field label="URL sponsor del destino" name="sponsor_url" type="text" placeholder="www.ejemplo.com o https://..." />
        <ModalFooter onClose={onClose} submitLabel="Guardar votacion" />
      </form>
    </BaseModal>
  );
}

type PanelProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
} & (
  | { action?: undefined; onAction?: undefined }
  | { action: string; onAction: () => void }
);

function Panel({
  title,
  description,
  action,
  onAction,
  children,
}: PanelProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] transition-all duration-300 hover:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 px-5 py-4">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">{title}</h3>
          {description ? <p className="mt-1 text-[11px] text-[#8e98a6] leading-relaxed">{description}</p> : null}
        </div>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="h-7.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[10px] font-bold text-[#d8dee6] hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Kpi({
  title,
  value,
  detail,
  prefix = "",
  suffix = "",
  tone = "neutral",
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  prefix?: string;
  suffix?: string;
  tone?: "neutral" | "warning" | "success";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md p-5 text-left transition-all duration-300 hover:bg-[#101722]/50 hover:border-white/10 active:scale-[0.98] group flex flex-col justify-between"
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8e98a6]">{title}</p>
        <p className={cn("mt-2.5 font-mono text-[26px] font-bold tracking-tight", tone === "warning" ? "text-[#ffcf70]" : tone === "success" ? "text-emerald-400" : "text-white")}>
          {prefix}{formatNumber(value)}{suffix}
        </p>
      </div>
      <p className="mt-2 text-[11px] text-[#8e98a6] line-clamp-1">{detail}</p>
    </button>
  );
}

function InsightCard({
  eyebrow,
  title,
  value,
  detail,
  action,
  tone = "neutral",
  onAction,
}: {
  eyebrow: string;
  title: string;
  value: number;
  detail: string;
  action: string;
  tone?: "neutral" | "warning" | "success" | "danger";
  onAction: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-300 hover:border-white/10 hover:bg-white/[0.02]">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8e98a6]">{eyebrow}</p>
            <h3 className="mt-1.5 line-clamp-2 text-[14px] font-bold leading-5 text-white">{title}</h3>
          </div>
          <span
            className={cn(
              "rounded-lg border px-2 py-0.5 font-mono text-[11px] font-bold",
              tone === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : tone === "warning"
                  ? "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]"
                  : tone === "danger"
                    ? "border-red-400/25 bg-red-400/10 text-red-300"
                    : "border-white/10 bg-white/[0.04] text-white"
            )}
          >
          {formatNumber(value)}
        </span>
      </div>
      <p className="mt-3 min-h-10 text-[12px] leading-5 text-[#9aa3af]">{detail}</p>
      <button type="button" onClick={onAction} className="mt-4 h-8 rounded-lg border border-white/10 px-2.5 text-[11px] font-black text-white hover:bg-white/[0.06]">
        {action}
      </button>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: CreatorAdminUiStatus }) {
  const styles: Record<CreatorAdminUiStatus, string> = {
    auto: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    manual: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    pending: "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]",
    unlocated: "border-red-400/25 bg-red-400/10 text-red-300",
  };
  const labels: Record<CreatorAdminUiStatus, string> = {
    auto: "AUTO",
    manual: "MANUAL",
    pending: "PENDIENTE",
    unlocated: "SIN UBICAR",
  };
  return <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black", styles[status])}>{labels[status]}</span>;
}

function ActivityRow({ item }: { item: { id: string; event_type: string; description: string; severity: string; created_at: string } }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", item.severity === "error" ? "border-red-400/25 bg-red-400/10 text-red-300" : item.severity === "warning" ? "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffcf70]" : "border-white/10 bg-white/[0.04] text-[#9aa3af]")}>
        <Clock size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-white">{item.description}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#7d8794]">{item.event_type} · {formatDateTime(item.created_at)}</p>
      </div>
    </div>
  );
}

function RankList({ rows, empty }: { rows: Array<{ label: string; value: number }>; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) return <InlineEmpty text={empty} />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between gap-3 text-[12px]">
            <span className="truncate font-bold text-white">{row.label}</span>
            <span className="font-mono text-[#9aa3af]">{formatNumber(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#ff5a3d]" style={{ width: `${Math.max(6, Math.round((row.value / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SourcePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">{label}</p>
      <p className="mt-1 font-mono text-[14px] font-black text-white">{value}</p>
    </div>
  );
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

function formatDateShort(value: string | null) {
  if (!value) return "-";
  const date = parseStableDate(value);
  if (!date) return "-";
  return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

function formatReportCadence(cadence: SponsorReportCadence) {
  if (cadence === "weekly") return "Semanal";
  if (cadence === "quarterly") return "Trimestral";
  return "Mensual";
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

function SponsorLogo({ sponsor }: { sponsor: CreatorAdminSponsor }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
      {sponsor.logo_url ? (
        <Image src={sponsor.logo_url} alt={sponsor.brand_name} width={40} height={40} className="h-full w-full object-contain p-1.5" unoptimized />
      ) : (
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-white">
          {sponsor.brand_name.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

function SponsorBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
        tone === "success"
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
          : tone === "warning"
            ? "border-[#ffbf47]/25 bg-[#ffbf47]/10 text-[#ffd07a]"
            : "border-white/10 bg-white/[0.03] text-[#cfd7e1]"
      )}
    >
      {children}
    </span>
  );
}

function SponsorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-2 py-1.5">
      <p className="font-mono text-[13px] font-black text-white">{formatNumber(value)}</p>
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#7d8794]">{label}</p>
    </div>
  );
}

function formatSponsorScope(sponsor: CreatorAdminSponsor) {
  if (sponsor.scope === "global") return "GLOBAL";
  if (sponsor.scope === "country") return `PAIS · ${sponsor.country_codes.join(", ") || "sin paises"}`;
  return `VIDEO · ${sponsor.video_ids.length} video${sponsor.video_ids.length === 1 ? "" : "s"}`;
}

function BaseModal({ title, onClose, children, size = "default" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "default" | "wide" }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Cerrar modal" />
      <div
        className={cn(
          "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-white/10 bg-[#0d1118] p-4 shadow-2xl md:rounded-xl md:p-5",
          size === "wide" ? "md:max-w-6xl" : "md:max-w-2xl"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[16px] font-black text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#9aa3af] hover:bg-white/[0.06]" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">{label}</span>
      <input {...props} className="h-10 w-full rounded-lg border border-white/10 bg-[#090d13] px-3 text-[13px] text-white outline-none ring-[#ff5a3d]/40 placeholder:text-[#596271] focus:ring-2" />
    </label>
  );
}

function TextArea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">{label}</span>
      <textarea {...props} className="min-h-20 w-full rounded-lg border border-white/10 bg-[#090d13] px-3 py-2 text-[13px] text-white outline-none ring-[#ff5a3d]/40 placeholder:text-[#596271] focus:ring-2" />
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#090d13] px-3 text-[13px] text-white outline-none">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: Array<{ value: string; label: string }>; defaultValue?: string | null }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">{label}</span>
      <select name={name} defaultValue={defaultValue || undefined} className="h-10 w-full rounded-lg border border-white/10 bg-[#090d13] px-3 text-[13px] text-white outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CheckboxField({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#090d13] px-3 text-[12px] font-bold text-white">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-[#ff5a3d]" />
      <span>{label}</span>
    </label>
  );
}

function ModalFooter({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
      <button type="button" onClick={onClose} className="h-9 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-white">Cancelar</button>
      <button type="submit" className="h-9 rounded-lg bg-[#ff5a3d] px-3 text-[12px] font-black text-white"> {submitLabel}</button>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-black active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        tone === "danger"
          ? "border-[#ff5a3d]/30 bg-[#ff5a3d]/10 text-[#ffd0c6] hover:bg-[#ff5a3d]/18"
          : "border-white/10 text-white hover:bg-white/[0.06]"
      )}
    >
      {children}
    </button>
  );
}

function VideoThumb({ video }: { video: CreatorAdminVideo }) {
  return video.thumbnail_url ? (
    <Image src={video.thumbnail_url} alt="" width={68} height={38} className="h-[38px] w-[68px] shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-[38px] w-[68px] shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[#7d8794]">
      <Play size={16} />
    </span>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
} & (
  | { action?: undefined; onAction?: undefined }
  | { action: string; onAction: () => void }
);

function EmptyState({ title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
      <Flag size={22} className="mx-auto text-[#ff5a3d]" />
      <p className="mt-3 text-[14px] font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-5 text-[#9aa3af]">{description}</p>
      {action ? <button type="button" onClick={onAction} className="mt-4 h-9 rounded-lg bg-[#ff5a3d] px-3 text-[12px] font-black text-white">{action}</button> : null}
    </div>
  );
}

function InlineEmpty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[12px] text-[#8e98a6]">{text}</p>;
}

function AutomationRow({
  title,
  detail,
  action,
  disabled,
  onAction,
}: {
  title: string;
  detail: string;
  action: string;
  disabled?: boolean;
  onAction: () => void;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-black text-white">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-[#9aa3af]">{detail}</p>
      </div>
      <ActionButton onClick={onAction} disabled={disabled}>{action}</ActionButton>
    </article>
  );
}

function daysSince(value: string | null | undefined) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

function isPastDate(value: string | null | undefined) {
  if (!value) return false;
  const ms = new Date(`${value}T23:59:59`).getTime();
  return Number.isFinite(ms) && ms < Date.now();
}

function isCampaignReadyForRenewal(campaign: SponsorCrmPayload["campaigns"][number]) {
  return ["delivered", "paid"].includes(campaign.status);
}

function hasOpenRenewalForCampaign(campaign: SponsorCrmPayload["campaigns"][number], campaigns: SponsorCrmPayload["campaigns"]) {
  const brandName = campaign.brand_name.trim().toLowerCase();
  return campaigns.some((entry) => {
    if (entry.id === campaign.id) return false;
    if (entry.brand_name.trim().toLowerCase() !== brandName) return false;
    if (!["proposal", "negotiation", "active"].includes(entry.status)) return false;
    const renewalText = `${entry.title} ${entry.internal_notes || ""}`.toLowerCase();
    return renewalText.includes("renovacion") || renewalText.includes(campaign.id);
  });
}

function suggestCountrySponsorshipBudget(totalViews: number, videosCount: number, citiesCount: number) {
  const viewWeight = Math.min(9000, Math.round((totalViews || 0) / 1000) * 18);
  const inventoryWeight = Math.min(2400, Math.max(0, videosCount) * 90 + Math.max(0, citiesCount) * 60);
  const recommended = Math.max(500, Math.round((450 + viewWeight + inventoryWeight) / 50) * 50);
  return {
    min: Math.max(300, Math.round(recommended * 0.72 / 50) * 50),
    recommended,
    max: Math.round(recommended * 1.35 / 50) * 50,
  };
}

function formatInquiryPipelineStatus(status: SponsorInquiryPipelineStatus) {
  return INQUIRY_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function formatCampaignStatus(status: SponsorCrmStatus) {
  return CAMPAIGN_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function formatDeliverableStatus(status: SponsorDeliverableStatus) {
  return DELIVERABLE_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function formatPaymentStatus(status: SponsorPaymentStatus) {
  return PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function formatAgreementType(value: SponsorAgreementType | null) {
  if (!value) return "Sin tipo";
  return AGREEMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatEvaluationResult(value: SponsorEvaluationResult) {
  return EVALUATION_RESULT_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatBalanceItemKind(value: SponsorBalanceItemKind) {
  return BALANCE_ITEM_KIND_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatBalanceItemStatus(value: SponsorBalanceItemStatus) {
  return BALANCE_ITEM_STATUS_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatAgendaItemKind(item: BusinessAgendaItem) {
  if (item.kind === "payment") return "Pago";
  if (item.kind === "deliverable") return "Entregable";
  return item.balance_item_kind ? formatBalanceItemKind(item.balance_item_kind) : "Balance";
}

function formatAgendaItemStatus(item: BusinessAgendaItem) {
  if (item.kind === "payment") return formatPaymentStatus(item.status as SponsorPaymentStatus);
  if (item.kind === "deliverable") return formatDeliverableStatus(item.status as SponsorDeliverableStatus);
  return formatBalanceItemStatus(item.status as SponsorBalanceItemStatus);
}

function getNextDeliverableStatus(status: SponsorDeliverableStatus): { status: SponsorDeliverableStatus; label: string } {
  if (status === "todo") return { status: "in_progress", label: "Iniciar" };
  if (status === "in_progress") return { status: "submitted", label: "Marcar enviado" };
  if (status === "submitted") return { status: "approved", label: "Aprobar" };
  return { status: "published", label: "Marcar publicado" };
}

function getNextBalanceItemStatus(item: { kind: SponsorBalanceItemKind; status: SponsorBalanceItemStatus }): { status: SponsorBalanceItemStatus; label: string } {
  if (item.kind === "cost") {
    if (item.status === "estimated") return { status: "confirmed", label: "Confirmar" };
    return { status: "paid", label: "Marcar pagado" };
  }
  if (item.status === "partial") return { status: "received", label: "Completar" };
  if (item.status === "not_received") return { status: "received", label: "Marcar recibido" };
  return { status: "received", label: "Marcar recibido" };
}

function getDueDateDistance(value: string | null | undefined) {
  if (!value) return { overdue: false, daysUntilDue: 0 };
  const due = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(due.getTime())) return { overdue: false, daysUntilDue: 0 };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  return { overdue: daysUntilDue < 0, daysUntilDue };
}

function formatDueDistance(daysUntilDue: number) {
  if (daysUntilDue === 0) return "Hoy";
  if (daysUntilDue === 1) return "Mañana";
  if (daysUntilDue > 1) return `${daysUntilDue} dias`;
  const overdueDays = Math.abs(daysUntilDue);
  return overdueDays === 1 ? "1 dia tarde" : `${overdueDays} dias tarde`;
}

function toCsv(headers: string[], rows: Array<Record<string, string | number | null>>) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ].join("\n");
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile({ content, filename, type }: { content: string; filename: string; type: string }) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "creator";
}

function formatDateForFile(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeTab(value: string): CreatorAdminTab {
  return TABS.some((tab) => tab.id === value) ? (value as CreatorAdminTab) : "resumen";
}

function withChannel(href: string, channelId: string, basePath = "/map-admin-proposal") {
  const url = new URL(href, "https://local.travelyourmap");
  url.searchParams.set("channelId", channelId);
  const pathname = url.pathname === "/map-admin-proposal" ? basePath : url.pathname;
  return `${pathname}?${url.searchParams.toString()}`;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || typeof value === "undefined") return "-";
  return new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = parseStableDate(value);
  if (!date) return "Sin fecha";
  return `${pad2(date.getUTCDate())} ${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin datos";
  const date = parseStableDate(value);
  if (!date) return "Sin datos";
  const hours = date.getUTCHours();
  const minutes = pad2(date.getUTCMinutes());
  const displayHour = pad2(hours % 12 || 12);
  const period = hours < 12 ? "a. m." : "p. m.";
  return `${pad2(date.getUTCDate())} ${MONTH_LABELS[date.getUTCMonth()]} ${displayHour}:${minutes} ${period}`;
}

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function parseStableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

type SponsorWizardVideoLocation = TravelVideoLocation & {
  sponsor_ids: string[];
  sponsor_names: string[];
};

function toWizardVideo(video: CreatorAdminVideo): SponsorWizardVideoLocation {
  return {
    id: video.id,
    youtube_video_id: video.youtube_video_id,
    video_url: video.youtube_url,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    published_at: video.published_at,
    view_count: video.view_count,
    like_count: video.like_count,
    comment_count: video.comment_count,
    location_status: video.raw_location_status as TravelVideoLocation["location_status"],
    verification_source: video.verification_source as TravelVideoLocation["verification_source"],
    sponsor_detection_status: video.sponsor_detection_status,
    sponsor_detectado_texto: video.sponsor_detectado_texto,
    sponsor_detectado_confianza: video.sponsor_detectado_confianza,
    sponsor_detectado_fuente: video.sponsor_detectado_fuente,
    sponsor_card_style: video.sponsor_card_style,
    sponsor_names: video.sponsor_names,
    sponsor_ids: video.sponsor_ids,
    updated_at: video.updated_at,
    city: video.city,
    region: video.region,
    country_code: video.country_code || "",
    country_name: video.country_name,
    location_label: video.label_public,
    lat: video.lat ?? 0,
    lng: video.lng ?? 0,
  };
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
