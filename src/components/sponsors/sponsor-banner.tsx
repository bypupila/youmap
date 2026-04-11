"use client";

import { useEffect, useState } from "react";

type Sponsor = {
  id: string;
  brand_name: string;
  logo_url?: string | null;
  description?: string | null;
  discount_code?: string | null;
  affiliate_url?: string | null;
};

export function SponsorBanner({
  channelId,
  countryCode,
  countryName,
}: {
  channelId: string;
  countryCode: string;
  countryName: string;
}) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    fetch(`/api/sponsors/${channelId}?country=${countryCode}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSponsor(data?.sponsor || null))
      .catch(() => setSponsor(null));
  }, [channelId, countryCode]);

  if (!sponsor) return null;

  const handleClick = async () => {
    await fetch("/api/sponsors/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsorId: sponsor.id, channelId, countryCode }),
    });

    if (sponsor.affiliate_url) {
      window.open(sponsor.affiliate_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-4 w-full rounded-xl border border-orange-400/40 bg-orange-500/10 p-3 text-left transition hover:bg-orange-500/20"
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-orange-300">Patrocinado para {countryName}</p>
      <p className="text-sm font-semibold text-slate-100">{sponsor.brand_name}</p>
      {sponsor.description ? <p className="mt-1 text-xs text-slate-300">{sponsor.description}</p> : null}
      {sponsor.discount_code ? (
        <span className="mt-2 inline-block rounded-md border border-yellow-400/45 bg-yellow-500/10 px-2 py-1 text-xs font-semibold text-yellow-200">
          Código: {sponsor.discount_code}
        </span>
      ) : null}
    </button>
  );
}
