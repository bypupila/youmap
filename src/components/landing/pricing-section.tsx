"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";

type BillingCycle = "monthly" | "annual";

type PricingSectionProps = {
  planRows: string[];
};

type PricingPlan = {
  title: string;
  monthlyPrice: number;
  rows: string[];
  featured?: boolean;
  muted?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
  annualDiscount?: number;
};

const DEFAULT_ANNUAL_DISCOUNT = 0.2;

const pricingPlans: PricingPlan[] = [
  {
    title: "Sin TravelYourMap",
    monthlyPrice: 0,
    rows: ["PDFs y documentos", "Links desordenados", "Información difícil de entender", "Propuesta poco profesional"],
    muted: true,
  },
  {
    title: "Creator Pro",
    monthlyPrice: 79,
    rows: [],
    featured: true,
    ctaHref: "/onboarding?lang=es",
    ctaLabel: "Comenzar ahora",
  },
  {
    title: "Agency",
    monthlyPrice: 199,
    rows: ["Portafolio de canales", "API de acceso", "Portal de marcas", "Soporte dedicado"],
    ctaHref: "/pricing",
    ctaLabel: "Contactar ventas",
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function getBillingAmount(monthlyPrice: number, billingCycle: BillingCycle, annualDiscount: number) {
  if (billingCycle === "monthly") {
    return {
      price: monthlyPrice,
      suffix: "/mes",
      helper: monthlyPrice > 0 ? "Facturación mensual" : "Sin cargo",
      savings: null as number | null,
    };
  }

  const yearlyBase = monthlyPrice * 12;
  const discountedYearly = yearlyBase * (1 - annualDiscount);

  return {
    price: discountedYearly,
    suffix: "/año",
    helper: `Equivale a ${formatMoney(discountedYearly / 12)}/mes`,
    savings: yearlyBase - discountedYearly,
  };
}

export function PricingSection({ planRows }: PricingSectionProps) {
  const billingCycleLabelId = useId();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const toggleCopy =
    billingCycle === "annual"
      ? {
          title: "Ahorra 20%",
          detail: "Paga una vez al año y baja el costo mensual real.",
        }
      : {
          title: "Pago mensual",
          detail: "Mantén flexibilidad con facturación mes a mes.",
        };

  return (
    <section id="pricing" className="border-t border-white/8 py-12">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <h2 className="text-[36px] font-extrabold tracking-[-0.05em] text-white">Elige el plan perfecto para ti</h2>
        <div className="w-full max-w-[300px] self-center lg:mr-2">
          <div
            aria-label="Ciclo de facturación"
            role="tablist"
            className="inline-flex w-full rounded-[999px] border border-white/10 bg-white/[0.035] p-1 text-[12px] font-bold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={billingCycle === "monthly"}
              aria-controls={billingCycleLabelId}
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 rounded-full px-4 py-2 text-center transition ${
                billingCycle === "monthly"
                  ? "border border-[#ff473b]/55 bg-[#ff473b] text-white"
                  : "border border-[#ff473b]/28 text-white/58 hover:text-white/78"
              }`}
            >
              <span className="block text-white">Mensual</span>
              <span className="block text-[11px] font-semibold text-white/80">{formatMoney(79)}/mes</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billingCycle === "annual"}
              aria-controls={billingCycleLabelId}
              onClick={() => setBillingCycle("annual")}
              className={`flex-1 rounded-full px-4 py-2 text-center transition ${
                billingCycle === "annual"
                  ? "border border-[#ff473b]/55 bg-[#ff473b] text-white"
                  : "border border-[#ff473b]/28 text-white/58 hover:text-white/78"
              }`}
            >
              <span className="block text-white">Anual</span>
              <span className="block text-[11px] font-semibold text-white/80">-20% real</span>
            </button>
          </div>
          <p id={billingCycleLabelId} className="mt-2 text-center text-[11px] font-semibold tracking-[0.04em] text-white/52">
            {toggleCopy.title} · {toggleCopy.detail}
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1fr_1fr_1fr]">
        <div className="py-5">
          <h3 className="text-[25px] font-extrabold leading-tight text-white">
            Las marcas compran <span className="text-[#ff473b]">destinos</span>, no solo views.
          </h3>
          <p className="mt-5 text-[14px] leading-7 text-white/62">
            TravelYourMap te ayuda a mostrar tu cobertura, experiencia y posicionamiento de forma clara y profesional para que cierres mejores deals.
          </p>
        </div>
        <PlanCard title="Sin TravelYourMap" rows={pricingPlans[0].rows} muted />
        <PlanCard
          title="Creator Pro"
          rows={planRows}
          featured
          monthlyPrice={pricingPlans[1].monthlyPrice}
          billingCycle={billingCycle}
          annualDiscount={pricingPlans[1].annualDiscount ?? DEFAULT_ANNUAL_DISCOUNT}
          ctaHref={pricingPlans[1].ctaHref}
          ctaLabel={pricingPlans[1].ctaLabel}
        />
        <PlanCard
          title="Agency"
          rows={pricingPlans[2].rows}
          monthlyPrice={pricingPlans[2].monthlyPrice}
          billingCycle={billingCycle}
          annualDiscount={pricingPlans[2].annualDiscount ?? DEFAULT_ANNUAL_DISCOUNT}
          ctaHref={pricingPlans[2].ctaHref}
          ctaLabel={pricingPlans[2].ctaLabel}
        />
      </div>
    </section>
  );
}

function PlanCard({
  title,
  rows,
  monthlyPrice = 0,
  billingCycle = "monthly",
  annualDiscount = DEFAULT_ANNUAL_DISCOUNT,
  featured = false,
  muted = false,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  rows: string[];
  monthlyPrice?: number;
  billingCycle?: BillingCycle;
  annualDiscount?: number;
  featured?: boolean;
  muted?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const pricing = getBillingAmount(monthlyPrice, billingCycle, annualDiscount);
  const showPrice = monthlyPrice > 0 && !muted;
  const badgeLabel = billingCycle === "annual" && pricing.savings !== null ? `Ahorras ${formatMoney(pricing.savings)}` : "Facturación flexible";

  return (
    <article className={`relative rounded-[17px] border p-7 ${featured ? "border-[#ff473b]/70 bg-[#121014]" : "border-white/10 bg-white/[0.035]"}`}>
      {featured ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#ff473b]/70 bg-[#2b1210] px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">Más popular</span> : null}
      <h3 className="text-[14px] font-extrabold text-white/82">{title}</h3>
      {showPrice ? (
        <div className="mt-3">
          <p className="text-[34px] font-extrabold tracking-[-0.04em] text-white">
            {formatMoney(pricing.price)}
            <span className="text-[13px] font-medium text-white/55"> {pricing.suffix}</span>
          </p>
          <p className="mt-1 text-[12px] font-semibold text-white/52">{pricing.helper}</p>
        </div>
      ) : null}
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <p key={row} className="flex items-center gap-2 text-[13px] text-white/68">
            {muted ? <XCircle size={16} className="text-[#ff473b]" /> : <CheckCircle size={16} className="text-[#ff735f]" />}
            {row}
          </p>
        ))}
      </div>
      {!muted && billingCycle === "annual" ? (
        <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-bold text-white/68">{badgeLabel}</div>
      ) : null}
      {featured && ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-7 inline-flex w-full justify-center rounded-[9px] bg-[#ff473b] px-4 py-3 text-[13px] font-extrabold text-white">
          {ctaLabel}
        </Link>
      ) : null}
      {!featured && !muted && ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-7 inline-flex w-full justify-center rounded-[9px] border border-white/14 px-4 py-3 text-[13px] font-extrabold text-white/78">
          {ctaLabel}
        </Link>
      ) : null}
    </article>
  );
}
