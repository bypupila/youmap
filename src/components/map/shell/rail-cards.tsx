import Image from "next/image";
import {
  ArrowsClockwise,
  Clock,
  MapPin,
  Plus,
  Target,
  WarningCircle,
} from "@phosphor-icons/react";
import type { ManualVerificationItem } from "@/lib/map-data";
import type { MapRailSponsor } from "@/lib/map-public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CountryCodeMark,
  EmptyPanel,
  MiniSummary,
  ProgressRing,
} from "@/components/map/shell/map-pieces";
import { formatExactNumber, getInitials } from "@/components/map/lib/format";
import type { DestinationCandidate } from "@/components/map/lib/aggregations";
import type { SyncState, SyncSummary } from "@/components/map/shell/shell-types";

/**
 * The "Proximo destino" hero card. The component is the same on every
 * breakpoint: the surrounding shell decides where to mount it and how wide
 * it is. We never let the title wrap onto two lines because the topbar /
 * mobile bottom nav already steal vertical real estate.
 */
export function DestinationCard({
  destination,
  fallbackCandidates,
  onRefresh,
  allowRefresh,
  syncState,
  onSelect,
}: {
  destination: DestinationCandidate | null;
  fallbackCandidates: DestinationCandidate[];
  onRefresh: () => void;
  allowRefresh: boolean;
  syncState: SyncState;
  onSelect?: (countryCode: string | null) => void;
}) {
  const percent = destination?.percent || 0;
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardHeader className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[16px] font-semibold text-[#f5f7fb]">Proximo destino</CardTitle>
          {allowRefresh ? (
            <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={syncState === "running"}>
              <ArrowsClockwise size={14} className={syncState === "running" ? "animate-spin" : undefined} />
              {syncState === "running" ? "Sync" : "Actualizar"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {destination ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <CountryCodeMark code={destination.country_code} />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-semibold uppercase tracking-wide text-[#f5f7fb]">
                    {destination.country_name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#aab2bc]">
                    {destination.cities.slice(0, 3).join(", ") || "Destino abierto"}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-[#ff4b42]">
                    {destination.votes > 0
                      ? `${formatExactNumber(destination.votes)} votos`
                      : `${formatExactNumber(fallbackCandidates.length)} sugerencias`}
                  </p>
                </div>
              </div>
              <ProgressRing percent={percent} />
            </div>
            <div className="mt-4 h-px bg-white/10" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12px] text-[#aab2bc]">
                <Clock size={15} />
                {destination.source === "poll" ? "Votacion activa" : "Basado en videos"}
              </span>
              <Button
                type="button"
                size="sm"
                className="bg-[#c91f18] hover:bg-[#e03128]"
                onClick={() => onSelect?.(destination.country_code)}
              >
                <Plus size={14} />
                Ver foco
              </Button>
            </div>
          </div>
        ) : (
          <EmptyPanel title="Sin destino sugerido" body="Cuando haya videos o votos, este espacio prioriza el siguiente viaje." />
        )}
      </CardContent>
    </Card>
  );
}

export function FanVoteSummary({
  candidates,
  onSelect,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
}) {
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardHeader className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <CardTitle className="text-[16px] font-semibold text-[#f5f7fb]">Fan vote activo</CardTitle>
        <Badge variant="outline" className="bg-white/[0.04] text-[11px]">Top destinos</Badge>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {candidates.slice(0, 4).map((candidate, index) => (
          <button
            key={candidate.country_code}
            type="button"
            onClick={() => onSelect(candidate.country_code)}
            className="flex w-full items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-left transition hover:bg-white/[0.07]"
          >
            <span className="w-4 text-right text-[14px] font-semibold text-[#f5b82e]">{index + 1}</span>
            <CountryCodeMark code={candidate.country_code} compact />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#f5f7fb]">{candidate.country_name}</span>
              <span className="block truncate text-[11px] text-[#9da5ae]">{candidate.cities[0] || "Destino sugerido"}</span>
            </span>
            <span className="text-right text-[12px] text-[#d8dee6]">
              {formatExactNumber(candidate.votes || candidate.percent)}
              <br />
              <span className="text-[10px] text-[#8c96a1]">votos</span>
            </span>
          </button>
        ))}
        {candidates.length === 0 ? (
          <EmptyPanel title="Sin votacion" body="El creador todavia no publico una votacion." />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OperationsCard({
  syncState,
  syncError,
  lastSyncSummary,
  pendingManual,
  allowRefresh,
  onRefresh,
  onMissing,
}: {
  syncState: SyncState;
  syncError: string | null;
  lastSyncSummary: SyncSummary | null;
  pendingManual: ManualVerificationItem[];
  allowRefresh: boolean;
  onRefresh: () => void;
  onMissing: () => void;
}) {
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[15px] font-semibold text-[#f5f7fb]">Operacion del mapa</CardTitle>
          {allowRefresh ? (
            <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={syncState === "running"}>
              <ArrowsClockwise size={14} className={syncState === "running" ? "animate-spin" : undefined} />
              Refresh
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {pendingManual.length > 0 ? (
          <button
            type="button"
            onClick={onMissing}
            className="w-full rounded-xl border border-[rgba(255,0,0,0.24)] bg-[rgba(255,0,0,0.09)] px-3 py-3 text-left"
          >
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ffaaa5]">
              <WarningCircle size={15} />
              Videos faltantes
            </p>
            <p className="mt-1 text-[13px] text-[#f0c7c4]">
              {pendingManual.length} videos necesitan confirmacion manual.
            </p>
          </button>
        ) : null}
        {syncState === "running" ? (
          <p
            className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] text-[#aab2bc]"
            role="status"
            aria-live="polite"
          >
            Sincronizando videos y ubicaciones.
          </p>
        ) : null}
        {lastSyncSummary ? (
          <div className="grid grid-cols-2 gap-2">
            <MiniSummary label="Scanned" value={lastSyncSummary.videos_scanned} />
            <MiniSummary label="Auto" value={lastSyncSummary.videos_verified_auto} />
            <MiniSummary label="Manual" value={lastSyncSummary.videos_verified_manual} />
            <MiniSummary label="Shorts" value={lastSyncSummary.excluded_shorts} />
          </div>
        ) : null}
        {syncError ? (
          <p className="text-[12px] leading-5 text-[#ff8b8b]" role="alert">
            {syncError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SponsorsRail({ sponsors }: { sponsors: MapRailSponsor[] }) {
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardHeader className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <CardTitle className="text-[16px] font-semibold text-[#f5f7fb]">Sponsors</CardTitle>
        <Badge variant="outline" className="bg-white/[0.04] text-[11px]">Ver todos</Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-5">
          {sponsors.slice(0, 5).map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.affiliate_url || sponsor.logo_url || "#"}
              target={sponsor.affiliate_url ? "_blank" : undefined}
              rel={sponsor.affiliate_url ? "noreferrer" : undefined}
              className="group min-w-0 text-center"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white text-[11px] font-semibold text-[#07101a] transition group-hover:scale-[1.04]">
                {sponsor.logo_url ? (
                  <Image
                    src={sponsor.logo_url}
                    alt={sponsor.brand_name}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  getInitials(sponsor.brand_name)
                )}
              </span>
              <span className="mt-2 block truncate text-[11px] text-[#d9e0e7]">{sponsor.brand_name}</span>
              <span
                className={
                  sponsor.isExample
                    ? "block truncate text-[10px] text-[#f0a09a]"
                    : "block truncate text-[10px] text-[#49c47a]"
                }
              >
                {sponsor.isExample ? "Ejemplo" : "Activo"}
              </span>
            </a>
          ))}
          <span className="min-w-0 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-[#c6cdd5]">
              <Plus size={18} />
            </span>
            <span className="mt-2 block truncate text-[11px] text-[#9da5ae]">Agregar</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SponsorEmptyState() {
  return (
    <Card className="tm-surface-strong rounded-2xl">
      <CardContent className="px-4 py-4">
        <p className="text-[14px] font-semibold text-[#f5f7fb]">Sponsors</p>
        <p className="mt-1 text-[12px] leading-5 text-[#9da5ae]">
          Este mapa todavia no tiene sponsors activos.
        </p>
      </CardContent>
    </Card>
  );
}

export function SuggestedDestinations({
  candidates,
  onSelect,
  className,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
  className?: string;
}) {
  if (candidates.length === 0) return null;

  return (
    <div
      className={
        className ||
        "pointer-events-auto mx-auto hidden max-w-[760px] rounded-2xl border border-white/10 bg-[#07101a]/82 p-3 backdrop-blur-2xl md:block"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-[#f5f7fb]">
          Proximos destinos sugeridos por la comunidad
        </h2>
        <span className="text-[11px] text-[#aab2bc]">Ver todas las votaciones</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {candidates.slice(0, 4).map((candidate) => (
          <button
            key={candidate.country_code}
            type="button"
            onClick={() => onSelect(candidate.country_code)}
            className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-left transition hover:bg-white/[0.08]"
          >
            <div className="h-16 bg-[linear-gradient(135deg,rgba(255,0,0,0.42),rgba(17,28,42,0.92)),url('https://unpkg.com/three-globe/example/img/night-sky.png')] bg-cover" />
            <div className="p-2">
              <p className="truncate text-[11px] font-semibold text-[#f5f7fb]">{candidate.country_name}</p>
              <p className="truncate text-[10px] text-[#9da5ae]">
                {candidate.cities[0] || candidate.country_code}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-[#ff6a61]">
                <Target size={10} weight="fill" />
                {candidate.votes > 0 ? `${formatExactNumber(candidate.votes)} votos` : `${candidate.percent}% score`}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SuggestedDestinationsCompact({
  candidates,
  onSelect,
}: {
  candidates: DestinationCandidate[];
  onSelect: (countryCode: string | null) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <section className="rounded-xl border border-white/10 bg-[#07101a]/88 p-3 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      <h2 className="text-[14px] font-semibold text-[#f5f7fb]">Proximos destinos</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 xs:grid-cols-4">
        {candidates.slice(0, 4).map((candidate) => (
          <button
            key={candidate.country_code}
            type="button"
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-left transition hover:bg-white/[0.08]"
            onClick={() => onSelect(candidate.country_code)}
          >
            <span className="flex aspect-square w-full items-center justify-center rounded-md bg-[linear-gradient(135deg,rgba(255,0,0,0.36),rgba(17,28,42,0.92))] text-[11px] font-semibold text-white">
              {candidate.country_code}
            </span>
            <span className="mt-1.5 block truncate text-[11px] font-semibold text-[#f5f7fb]">
              {candidate.country_name}
            </span>
            <span className="block truncate text-[10px] text-[#aab2bc]">
              {candidate.cities[0] || "Destino"}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[10px] text-[#ff5a52]">
              <MapPin size={9} weight="fill" />
              {candidate.votes || candidate.percent} votos
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
