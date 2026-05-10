"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowsClockwise, Check, Copy, GlobeHemisphereWest, MapPin, Plus, Trash, Video } from "@phosphor-icons/react";
import { FanVoteCard } from "@/components/map/fan-vote-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MapFanVoteSummary } from "@/lib/map-fan-votes";
import type { MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor } from "@/lib/map-public";
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
  initialSponsors,
}: CreatorAdminPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pollState, setPollState] = useState<MapPollRecord | null>(initialPoll);
  const [sponsors, setSponsors] = useState<MapRailSponsor[]>(initialSponsors);
  const [creatingSponsor, setCreatingSponsor] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [deletingSponsorId, setDeletingSponsorId] = useState<string | null>(null);

  const totalVotes = initialFanVotes?.total_votes || 0;
  const activeLive = Boolean(pollState?.status === "live");

  async function copyMapUrl() {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(mapUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  async function createSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      brand_name: String(formData.get("brand_name") || "").trim(),
      logo_url: String(formData.get("logo_url") || "").trim() || null,
      affiliate_url: String(formData.get("affiliate_url") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      country_code: String(formData.get("country_code") || "").trim().toUpperCase() || null,
    };

    if (!payload.brand_name) return;

    setCreatingSponsor(true);
    setSponsorError(null);
    try {
      if (isDemoMode) {
        setSponsors((current) => [
          {
            id: `demo-sponsor-${Date.now()}`,
            brand_name: payload.brand_name,
            logo_url: payload.logo_url,
            description: payload.description,
            discount_code: null,
            affiliate_url: payload.affiliate_url,
            country_codes: payload.country_code ? [payload.country_code] : ["GLOBAL"],
            isExample: true,
          },
          ...current,
        ]);
        event.currentTarget.reset();
        return;
      }

      const response = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) throw new Error(body?.error || "No se pudo crear el sponsor.");
      const sponsorId = body.id;
      setSponsors((current) => [
        {
          id: sponsorId,
          brand_name: payload.brand_name,
          logo_url: payload.logo_url,
          description: payload.description,
          discount_code: null,
          affiliate_url: payload.affiliate_url,
          country_codes: payload.country_code ? [payload.country_code] : ["GLOBAL"],
        },
        ...current,
      ]);
      event.currentTarget.reset();
    } catch (error) {
      setSponsorError(error instanceof Error ? error.message : "No se pudo crear el sponsor.");
    } finally {
      setCreatingSponsor(false);
    }
  }

  async function removeSponsor(sponsorId: string) {
    if (!sponsorId) return;
    if (isDemoMode) {
      setSponsors((current) => current.filter((entry) => entry.id !== sponsorId));
      return;
    }

    setDeletingSponsorId(sponsorId);
    setSponsorError(null);
    try {
      const response = await fetch(`/api/sponsors?id=${encodeURIComponent(sponsorId)}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No se pudo eliminar el sponsor.");
      setSponsors((current) => current.filter((entry) => entry.id !== sponsorId));
    } catch (error) {
      setSponsorError(error instanceof Error ? error.message : "No se pudo eliminar el sponsor.");
    } finally {
      setDeletingSponsorId(null);
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
        <Card className="tm-surface-strong rounded-xl border-white/10">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Sponsors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 pt-1">
            <form className="grid gap-2 md:grid-cols-2" onSubmit={createSponsor}>
              <input name="brand_name" required placeholder="Marca" className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f5f7fb] outline-none" />
              <input name="country_code" placeholder="Pais ISO (MX)" className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f5f7fb] outline-none" />
              <input name="affiliate_url" placeholder="URL afiliado" className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f5f7fb] outline-none md:col-span-2" />
              <input name="description" placeholder="Descripcion corta" className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#f5f7fb] outline-none md:col-span-2" />
              <Button type="submit" size="sm" className="md:col-span-2 md:w-fit" disabled={creatingSponsor}>
                <Plus size={14} />
                {creatingSponsor ? "Guardando..." : "Agregar sponsor"}
              </Button>
            </form>
            {sponsorError ? <p className="text-[12px] text-[#ffb4b4]">{sponsorError}</p> : null}
            <div className="space-y-2">
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#f5f7fb]">{sponsor.brand_name}</p>
                    <p className="truncate text-[11px] text-[#9da5ae]">{(sponsor.country_codes || []).join(", ") || "GLOBAL"}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => void removeSponsor(sponsor.id)}
                    disabled={deletingSponsorId === sponsor.id}
                    aria-label={`Eliminar sponsor ${sponsor.brand_name}`}
                  >
                    {deletingSponsorId === sponsor.id ? <ArrowsClockwise size={14} className="animate-spin" /> : <Trash size={14} />}
                  </Button>
                </div>
              ))}
              {sponsors.length === 0 ? <p className="text-[12px] text-[#9da5ae]">No hay sponsors cargados.</p> : null}
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
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}
