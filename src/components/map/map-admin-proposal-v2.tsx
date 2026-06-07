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
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import type {
  CreatorAdminCountry,
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

const TABS: Array<{ id: CreatorAdminTab; label: string; icon: typeof House; secondary?: boolean }> = [
  { id: "resumen", label: "Resumen", icon: House },
  { id: "videos", label: "Videos", icon: Play },
  { id: "paises", label: "Paises", icon: GlobeHemisphereWest },
  { id: "votaciones", label: "Votaciones", icon: ChartBar },
  { id: "sponsors", label: "Sponsors", icon: Tag },
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
}: {
  payload: CreatorAdminPayload;
  activeTab: CreatorAdminTab;
  initialFilters: InitialFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    router.push(`/map-admin-proposal?${params.toString()}`);
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
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
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
          <TopBar payload={payload} onOpenMobile={() => setMobileNavOpen(true)} />

          <div className="mx-auto grid w-full max-w-[1480px] gap-4 px-3 pb-8 pt-4 md:px-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <QuickAction payload={payload} onNavigate={(href) => router.push(withChannel(href, payload.channel.id))} />
              {notice ? (
                <div className="rounded-lg border border-[#ff5a3d]/30 bg-[#ff5a3d]/10 px-3 py-2 text-[12px] text-[#ffd3ca]">
                  {notice}
                </div>
              ) : null}

              {tab === "resumen" ? (
                <SummaryTab payload={payload} onNavigate={(updates) => updateQuery(updates)} />
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
              {tab === "audiencia" ? <AudienceTab payload={payload} /> : null}
              {tab === "actividad" ? <ActivityTab payload={payload} /> : null}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <SystemAlerts payload={payload} onNavigate={(href) => router.push(withChannel(href, payload.channel.id))} />
              <MapConnection payload={payload} />
            </aside>
          </div>
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
    <aside className="flex h-full flex-col border-r border-white/10 bg-[#0a0d13] px-3 py-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6a4e]">TravelYourMap</p>
          <h1 className="mt-1 text-[17px] font-black tracking-tight text-white">Creator Admin</h1>
        </div>
        <button type="button" className="rounded-lg p-2 text-[#9aa3af] lg:hidden" onClick={onCloseMobile} aria-label="Cerrar menu">
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <p className="truncate text-[13px] font-bold text-white">{payload.channel.channel_name}</p>
        <p className="mt-1 truncate text-[11px] text-[#8e98a6]">{payload.channel.channel_handle || payload.channel.canonicalHandle || "Canal"}</p>
        <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
          <MetricMini label="Videos" value={payload.summary.videos_mapped} />
          <MetricMini label="Paises" value={payload.summary.countries_covered} />
          <MetricMini label="Pend." value={payload.summary.pending_review} />
        </div>
      </div>

      <nav className="mt-5 space-y-1">
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

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="px-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#6f7a88]">Secundario</p>
        <nav className="mt-2 space-y-1">
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
        <div className="fixed inset-0 z-40 lg:hidden">
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-bold transition active:translate-y-px",
        active ? "border border-[#ff5a3d]/25 bg-[#ff5a3d]/12 text-[#ff7d63]" : "text-[#c2cad4] hover:bg-white/[0.05] hover:text-white"
      )}
    >
      <Icon size={17} weight={active ? "fill" : "regular"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? <span className="rounded-full bg-[#ff5a3d] px-1.5 py-0.5 text-[9px] font-black text-white">{badge}</span> : null}
    </button>
  );
}

function TopBar({ payload, onOpenMobile }: { payload: CreatorAdminPayload; onOpenMobile: () => void }) {
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
          <button type="button" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white md:inline-flex" aria-label="Notificaciones">
            <Bell size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

function QuickAction({ payload, onNavigate }: { payload: CreatorAdminPayload; onNavigate: (href: string) => void }) {
  const action = payload.quickAction;
  return (
    <section className={cn("sticky top-[65px] z-20 rounded-lg border px-3 py-3 backdrop-blur-xl", action.severity === "success" ? "border-emerald-400/20 bg-emerald-400/10" : action.severity === "error" ? "border-red-400/25 bg-red-400/10" : "border-[#ffbf47]/20 bg-[#14100a]/95")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {action.severity === "success" ? <CheckCircle size={18} className="text-emerald-300" /> : <WarningCircle size={18} className="text-[#ffbf47]" />}
          <p className="text-[13px] font-semibold text-white">{action.label}</p>
        </div>
        {action.href ? (
          <button type="button" className="h-8 rounded-lg bg-[#ff5a3d] px-3 text-[12px] font-black text-white transition hover:bg-[#ff6d54] active:translate-y-px" onClick={() => onNavigate(action.href || "")}>
            {action.cta}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SummaryTab({ payload, onNavigate }: { payload: CreatorAdminPayload; onNavigate: (updates: Record<string, string | null>) => void }) {
  const lastVideo = payload.videos[0] || null;
  const topCountry = payload.countries[0] || null;
  return (
    <div className="space-y-4">
      {payload.videos.length === 0 ? (
        <EmptyState title="Tu mapa esta vacio" description="Conecta tu canal de YouTube o importa videos para generar el mapa administrativo." action="Ir a onboarding" />
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Videos mapeados" value={payload.summary.videos_mapped} detail={`${payload.summary.videos_hidden} ocultos`} onClick={() => onNavigate({ tab: "videos", status: null })} />
        <Kpi title="Paises cubiertos" value={payload.summary.countries_covered} detail={`${payload.summary.cities_covered} ciudades unicas`} onClick={() => onNavigate({ tab: "paises" })} />
        <Kpi title="Pendientes" value={payload.summary.pending_review} detail="Necesitan ubicacion manual" tone={payload.summary.pending_review > 0 ? "warning" : "success"} onClick={() => onNavigate({ tab: "videos", status: "pending" })} />
        <Kpi title="Votos activos" value={payload.summary.active_vote_count} detail={payload.polls.some((poll) => poll.status === "live") ? "En votacion activa" : "Sin votacion activa"} onClick={() => onNavigate({ tab: "votaciones" })} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Actividad reciente" action="Ver todo" onAction={() => onNavigate({ tab: "actividad" })}>
          <div className="divide-y divide-white/10">
            {payload.activity.slice(0, 5).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
            {payload.activity.length === 0 ? <InlineEmpty text="Todavia no hay actividad editorial registrada." /> : null}
          </div>
        </Panel>
        <Panel title="Progreso del mapa">
          <div className="space-y-4">
            {topCountry ? (
              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold text-white">{topCountry.country_name}</span>
                  <span className="font-mono text-[#9aa3af]">{topCountry.videos_count} videos</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#ff5a3d]" style={{ width: "100%" }} />
                </div>
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
  const inventory = payload.countries.filter((country) => !country.has_sponsor);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Sponsors activos" action="Nuevo sponsor" onAction={() => onNew(null)}>
        <div className="divide-y divide-white/10">
          {payload.sponsors.map((sponsor) => (
            <div key={sponsor.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black text-white">{sponsor.brand_name}</p>
                <p className="mt-1 truncate text-[11px] text-[#8e98a6]">{sponsor.scope.toUpperCase()} · {sponsor.country_codes.join(", ") || `${sponsor.video_ids.length} videos` || "GLOBAL"}</p>
              </div>
              <span className={cn("w-fit rounded-full border px-2 py-1 text-[10px] font-black uppercase", sponsor.active ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#9aa3af]")}>
                {sponsor.active ? "Activo" : "Pausado"}
              </span>
              <div className="flex gap-2 md:justify-end">
                <ActionButton onClick={() => onEdit(sponsor.id)}>Editar</ActionButton>
                <ActionButton onClick={() => void mutate(`/api/map-admin/sponsors?channelId=${payload.channel.id}&sponsorId=${sponsor.id}`, { method: "DELETE" }, "Sponsor pausado.")}>Pausar</ActionButton>
              </div>
            </div>
          ))}
          {payload.sponsors.length === 0 ? <EmptyState title="No hay sponsors cargados" description="Crea un sponsor global, por pais o por video para mostrarlo en el mapa." action="Crear sponsor" onAction={() => onNew(null)} /> : null}
        </div>
      </Panel>
      <Panel title="Espacios disponibles">
        <div className="divide-y divide-white/10">
          {inventory.map((country) => (
            <div key={country.country_code} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-white">{country.country_name}</p>
                  <p className="text-[11px] text-[#8e98a6]">{country.videos_count} videos · {formatCompact(country.total_views)} views</p>
                </div>
                <button type="button" className="h-8 rounded-lg bg-[#ff5a3d] px-2 text-[11px] font-black text-white" onClick={() => onNew(country.country_code)}>
                  Agregar
                </button>
              </div>
            </div>
          ))}
          {inventory.length === 0 ? <InlineEmpty text="Todos los paises activos tienen sponsor asignado." /> : null}
        </div>
      </Panel>
    </div>
  );
}

function AudienceTab({ payload }: { payload: CreatorAdminPayload }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Consumo del mapa" description="Datos first-party generados por TravelYourMap.">
        <RankList rows={payload.audience.top_countries.map((row) => ({ label: row.country_code, value: row.events }))} empty="Todavia no hay eventos por pais." />
      </Panel>
      <Panel title="Videos abiertos desde el mapa">
        <RankList rows={payload.audience.top_videos.map((row) => ({ label: row.title, value: row.events }))} empty="Todavia no hay aperturas registradas." />
      </Panel>
      <Panel title="Sponsors con mas clicks">
        <RankList rows={payload.audience.sponsor_clicks.map((row) => ({ label: row.brand_name, value: row.clicks }))} empty="Todavia no hay clicks de sponsors." />
      </Panel>
      <Panel title="YouTube Analytics">
        <EmptyState title="Datos no disponibles" description="Conecta YouTube Analytics para ver watch time, retencion, edad, genero y CTR. Por ahora el panel muestra solo datos first-party." />
      </Panel>
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

function SystemAlerts({ payload, onNavigate }: { payload: CreatorAdminPayload; onNavigate?: (href: string) => void }) {
  return (
    <Panel title="Alertas">
      <div className="space-y-2">
        {payload.alerts.map((alert) => (
          <button key={alert.id} type="button" className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.055]" onClick={() => onNavigate?.(alert.href)}>
            <div className="flex items-start gap-2">
              <WarningCircle size={16} className={alert.severity === "error" ? "text-red-300" : "text-[#ffbf47]"} />
              <div>
                <p className="text-[12px] font-black text-white">{alert.title}</p>
                <p className="mt-1 text-[11px] leading-4 text-[#9aa3af]">{alert.description}</p>
              </div>
            </div>
          </button>
        ))}
        {payload.alerts.length === 0 ? <InlineEmpty text="No hay alertas activas." /> : null}
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
  const [scope, setScope] = useState<"global" | "country" | "video">(sponsor?.scope || (defaultCountry ? "country" : "global"));
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const countryCodes = formData.getAll("country_codes").map(String);
    const videoIds = formData.getAll("video_ids").map(String);
    const body = {
      channelId: payload.channel.id,
      sponsorId: sponsor?.id,
      brand_name: String(formData.get("brand_name") || "").trim(),
      logo_url: String(formData.get("logo_url") || "").trim() || null,
      website_url: String(formData.get("website_url") || "").trim() || null,
      affiliate_url: String(formData.get("affiliate_url") || "").trim() || null,
      discount_code: String(formData.get("discount_code") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      scope,
      country_codes: countryCodes,
      video_ids: videoIds,
      active: formData.get("active") === "on",
      start_date: null,
      end_date: null,
      internal_notes: String(formData.get("internal_notes") || "").trim() || null,
    };
    const ok = await mutate("/api/map-admin/sponsors", { method: sponsor ? "PATCH" : "POST", body: JSON.stringify(body) }, sponsor ? "Sponsor actualizado." : "Sponsor creado.");
    if (ok) onClose();
  }
  return (
    <BaseModal title={sponsor ? "Editar sponsor" : "Nuevo sponsor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Marca" name="brand_name" defaultValue={sponsor?.brand_name || ""} required />
          <Field label="Logo URL" name="logo_url" type="text" defaultValue={sponsor?.logo_url || ""} />
          <Field label="Website" name="website_url" type="text" defaultValue={sponsor?.website_url || ""} />
          <Field label="URL afiliada" name="affiliate_url" type="text" defaultValue={sponsor?.affiliate_url || ""} />
          <Field label="Codigo" name="discount_code" defaultValue={sponsor?.discount_code || ""} />
          <Field label="Descripcion corta" name="description" maxLength={80} defaultValue={sponsor?.description || ""} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">Scope</label>
          <select value={scope} onChange={(event) => setScope(event.target.value as "global" | "country" | "video")} className="h-10 w-full rounded-lg border border-white/10 bg-[#0d1118] px-3 text-[13px] text-white outline-none">
            <option value="global">Global</option>
            <option value="country">Por pais</option>
            <option value="video">Por video</option>
          </select>
        </div>
        {scope === "country" ? (
          <CheckboxGrid name="country_codes" options={payload.countries.map((country) => ({ value: country.country_code, label: country.country_name }))} defaultValues={sponsor?.country_codes || (defaultCountry ? [defaultCountry] : [])} />
        ) : null}
        {scope === "video" ? (
          <CheckboxGrid name="video_ids" options={payload.videos.slice(0, 24).map((video) => ({ value: video.id, label: video.title }))} defaultValues={sponsor?.video_ids || []} />
        ) : null}
        <label className="flex items-center gap-2 text-[12px] font-bold text-white">
          <input type="checkbox" name="active" defaultChecked={sponsor?.active ?? true} className="h-4 w-4 accent-[#ff5a3d]" />
          Activo
        </label>
        <TextArea label="Notas internas" name="internal_notes" defaultValue={sponsor?.internal_notes || ""} />
        <ModalFooter onClose={onClose} submitLabel={sponsor ? "Guardar sponsor" : "Crear sponsor"} />
      </form>
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

function Panel({
  title,
  description,
  action,
  onAction,
  children,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0d1118] shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-[14px] font-black tracking-tight text-white">{title}</h3>
          {description ? <p className="mt-1 text-[12px] text-[#8e98a6]">{description}</p> : null}
        </div>
        {action ? (
          <button type="button" onClick={onAction} className="h-8 rounded-lg border border-white/10 px-2.5 text-[11px] font-black text-white hover:bg-white/[0.06]">
            {action}
          </button>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Kpi({ title, value, detail, tone = "neutral", onClick }: { title: string; value: number; detail: string; tone?: "neutral" | "warning" | "success"; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-white/10 bg-[#0d1118] p-4 text-left transition hover:bg-[#101722] active:translate-y-px">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8e98a6]">{title}</p>
      <p className={cn("mt-3 font-mono text-[28px] font-black", tone === "warning" ? "text-[#ffcf70]" : tone === "success" ? "text-emerald-300" : "text-white")}>{formatNumber(value)}</p>
      <p className="mt-1 text-[12px] text-[#8e98a6]">{detail}</p>
    </button>
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

function BaseModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Cerrar modal" />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-white/10 bg-[#0d1118] p-4 shadow-2xl md:max-w-2xl md:rounded-xl md:p-5">
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

function SelectField({ label, name, options }: { label: string; name: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa3af]">{label}</span>
      <select name={name} className="h-10 w-full rounded-lg border border-white/10 bg-[#090d13] px-3 text-[13px] text-white outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CheckboxGrid({ name, options, defaultValues }: { name: string; options: Array<{ value: string; label: string }>; defaultValues: string[] }) {
  const defaults = new Set(defaultValues);
  return (
    <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2 md:grid-cols-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-white hover:bg-white/[0.04]">
          <input type="checkbox" name={name} value={option.value} defaultChecked={defaults.has(option.value)} className="h-4 w-4 accent-[#ff5a3d]" />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
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

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-lg border border-white/10 px-2.5 text-[11px] font-black text-white hover:bg-white/[0.06] active:translate-y-px">
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

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
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

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 text-center">
      <p className="font-mono text-[15px] font-black text-white">{formatNumber(value)}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7d8794]">{label}</p>
    </div>
  );
}

function normalizeTab(value: string): CreatorAdminTab {
  return TABS.some((tab) => tab.id === value) ? (value as CreatorAdminTab) : "resumen";
}

function withChannel(href: string, channelId: string) {
  const url = new URL(href, "https://local.travelyourmap");
  url.searchParams.set("channelId", channelId);
  return `${url.pathname}?${url.searchParams.toString()}`;
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
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin datos";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
