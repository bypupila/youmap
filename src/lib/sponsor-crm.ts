import { createHash, createHmac, randomInt, randomUUID } from "crypto";
import { columnExists, tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";
import { normalizeSponsorInquiryStatus, type SponsorInquiryStatus } from "@/lib/sponsor-inquiries";

export const SPONSOR_CAMPAIGN_STATUSES = ["lead", "proposal", "negotiation", "active", "delivered", "paid", "lost"] as const;
export type SponsorCampaignStatus = (typeof SPONSOR_CAMPAIGN_STATUSES)[number];

export const SPONSOR_DELIVERABLE_STATUSES = ["todo", "in_progress", "submitted", "approved", "published"] as const;
export type SponsorDeliverableStatus = (typeof SPONSOR_DELIVERABLE_STATUSES)[number];

export const SPONSOR_PAYMENT_STATUSES = ["pending", "invoiced", "paid", "overdue"] as const;
export type SponsorPaymentStatus = (typeof SPONSOR_PAYMENT_STATUSES)[number];

export const SPONSOR_DELIVERABLE_TYPES = ["video", "short", "story", "post", "map_placement", "report", "other"] as const;
export type SponsorDeliverableType = (typeof SPONSOR_DELIVERABLE_TYPES)[number];

export const SPONSOR_COLLABORATION_CURRENCIES = ["USD", "EUR", "MXN", "ARS", "COP", "CLP", "PEN"] as const;
export type SponsorCollaborationCurrency = (typeof SPONSOR_COLLABORATION_CURRENCIES)[number];

export const SPONSOR_AGREEMENT_TYPES = ["paid_sponsor", "barter", "hotel_stay", "experience", "product", "affiliate", "other"] as const;
export type SponsorAgreementType = (typeof SPONSOR_AGREEMENT_TYPES)[number];

export const SPONSOR_EVALUATION_RESULTS = ["good_fit", "review", "poor_fit", "not_evaluated"] as const;
export type SponsorEvaluationResult = (typeof SPONSOR_EVALUATION_RESULTS)[number];

export const SPONSOR_MINIMUM_FITS = ["meets", "partial", "does_not_meet", "unknown"] as const;
export type SponsorMinimumFit = (typeof SPONSOR_MINIMUM_FITS)[number];

export const SPONSOR_WOULD_COLLABORATE_AGAIN = ["yes", "maybe", "no"] as const;
export type SponsorWouldCollaborateAgain = (typeof SPONSOR_WOULD_COLLABORATE_AGAIN)[number];

export const SPONSOR_BALANCE_ITEM_KINDS = ["in_kind_value", "cost", "effort"] as const;
export type SponsorBalanceItemKind = (typeof SPONSOR_BALANCE_ITEM_KINDS)[number];

export const SPONSOR_BALANCE_ITEM_STATUSES = ["estimated", "promised", "confirmed", "received", "partial", "not_received", "paid", "not_applicable"] as const;
export type SponsorBalanceItemStatus = (typeof SPONSOR_BALANCE_ITEM_STATUSES)[number];

export const SPONSOR_EFFORT_MODES = ["hourly", "project"] as const;
export type SponsorEffortMode = (typeof SPONSOR_EFFORT_MODES)[number];

export interface SponsorCampaignBalance {
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
}

export interface SponsorBalanceByCurrency extends SponsorCampaignBalance {
  currency_code: SponsorCollaborationCurrency;
  campaign_count: number;
}

export interface SponsorCampaignBalanceItem {
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
  created_at: string;
  updated_at: string;
}

export interface SponsorCrmInquiry {
  id: string;
  channel_id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  website_url: string | null;
  whatsapp: string | null;
  proposed_budget_usd: number | null;
  brief: string;
  status: SponsorInquiryStatus;
  source: string;
  map_url: string | null;
  created_at: string;
  updated_at: string;
  campaign_id: string | null;
}

export interface SponsorCrmCampaign {
  id: string;
  channel_id: string;
  sponsor_id: string | null;
  inquiry_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  title: string;
  brand_name: string;
  status: SponsorCampaignStatus;
  budget_usd: number | null;
  currency_code: SponsorCollaborationCurrency;
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
  would_collaborate_again: SponsorWouldCollaborateAgain | null;
  start_date: string | null;
  end_date: string | null;
  objective: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  deliverables: SponsorCrmDeliverable[];
  payments: SponsorCrmPayment[];
  balance_items: SponsorCampaignBalanceItem[];
  balance: SponsorCampaignBalance;
  portal_links: BrandPortalLinkSummary[];
}

export interface BrandPortalLinkSummary {
  id: string;
  campaign_id: string;
  active: boolean;
  require_access_code: boolean;
  access_email: string | null;
  view_count: number;
  last_viewed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  public_url?: string;
}

export interface BrandPortalLinkCreateResult {
  id: string;
  public_url: string;
  access_email: string | null;
  access_code: string | null;
}

export interface BrandPortalPayload {
  link: BrandPortalLinkSummary;
  creator: {
    channel_name: string;
    channel_handle: string | null;
    thumbnail_url: string | null;
  };
  campaign: SponsorCrmCampaign;
}

export type BrandPortalLoadResult =
  | { status: "not_found" }
  | { status: "access_required"; token: string; brand_name: string; access_email_hint: string | null }
  | { status: "ok"; portal: BrandPortalPayload };

export interface SponsorCrmDeliverable {
  id: string;
  campaign_id: string;
  title: string;
  deliverable_type: SponsorDeliverableType;
  due_date: string | null;
  status: SponsorDeliverableStatus;
  public_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorCrmPayment {
  id: string;
  campaign_id: string;
  label: string;
  amount_usd: number;
  due_date: string | null;
  status: SponsorPaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorCrmPayload {
  inquiries: SponsorCrmInquiry[];
  campaigns: SponsorCrmCampaign[];
  summary: {
    open_leads: number;
    active_campaigns: number;
    pipeline_usd: number;
    pending_payments_usd: number;
    overdue_deliverables: number;
    collaboration_count: number;
    balance_by_currency: SponsorBalanceByCurrency[];
  };
}

export interface CampaignRenewalEmailResult {
  renewal_campaign_id: string;
  portal_url: string | null;
  recipient_email: string | null;
  email_sent: boolean;
  mailto_url: string | null;
  error: string | null;
}

export async function sponsorCampaignsTableExists() {
  return tableExists("public", "sponsor_campaigns");
}

async function brandPortalLinksTableExists() {
  return tableExists("public", "brand_portal_links");
}

async function loadCollaborationSchemaFeatures() {
  const [
    hasCampaignContactName,
    hasCampaignContactEmail,
    hasCurrencyCode,
    hasAgreementType,
    hasAgreementTypeOther,
    hasIncludesPayment,
    hasIncludesBarter,
    hasIncludesAffiliate,
    hasIncludesDiscountCode,
    hasIncludesMapPresence,
    hasIncludesBrandReport,
    hasRequiresExclusivity,
    hasRequiresPreapproval,
    hasRequiresTravel,
    hasEvaluationResult,
    hasMinimumAmount,
    hasAcceptsBarter,
    hasMinimumRequiresPayment,
    hasMinimumRequiresAccommodation,
    hasMinimumRequiresTransport,
    hasMinimumRequiresCreativeFreedom,
    hasMinimumRequiresNoPreapproval,
    hasMinimumRequiresClearDates,
    hasMinimumRequiresLinkOrCoupon,
    hasMinimumConditionsNotes,
    hasMinimumFit,
    hasAcceptanceOverrideNote,
    hasCountryCode,
    hasDestinationLabel,
    hasFinalLearningNote,
    hasWouldCollaborateAgain,
    hasBalanceItems,
  ] = await Promise.all([
    columnExists("public", "sponsor_campaigns", "contact_name"),
    columnExists("public", "sponsor_campaigns", "contact_email"),
    columnExists("public", "sponsor_campaigns", "currency_code"),
    columnExists("public", "sponsor_campaigns", "agreement_type"),
    columnExists("public", "sponsor_campaigns", "agreement_type_other"),
    columnExists("public", "sponsor_campaigns", "includes_payment"),
    columnExists("public", "sponsor_campaigns", "includes_barter"),
    columnExists("public", "sponsor_campaigns", "includes_affiliate"),
    columnExists("public", "sponsor_campaigns", "includes_discount_code"),
    columnExists("public", "sponsor_campaigns", "includes_map_presence"),
    columnExists("public", "sponsor_campaigns", "includes_brand_report"),
    columnExists("public", "sponsor_campaigns", "requires_exclusivity"),
    columnExists("public", "sponsor_campaigns", "requires_preapproval"),
    columnExists("public", "sponsor_campaigns", "requires_travel"),
    columnExists("public", "sponsor_campaigns", "evaluation_result"),
    columnExists("public", "sponsor_campaigns", "minimum_amount"),
    columnExists("public", "sponsor_campaigns", "accepts_barter"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_payment"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_accommodation"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_transport"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_creative_freedom"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_no_preapproval"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_clear_dates"),
    columnExists("public", "sponsor_campaigns", "minimum_requires_link_or_coupon"),
    columnExists("public", "sponsor_campaigns", "minimum_conditions_notes"),
    columnExists("public", "sponsor_campaigns", "minimum_fit"),
    columnExists("public", "sponsor_campaigns", "acceptance_override_note"),
    columnExists("public", "sponsor_campaigns", "country_code"),
    columnExists("public", "sponsor_campaigns", "destination_label"),
    columnExists("public", "sponsor_campaigns", "final_learning_note"),
    columnExists("public", "sponsor_campaigns", "would_collaborate_again"),
    tableExists("public", "sponsor_campaign_balance_items"),
  ]);

  return {
    hasCampaignContactName,
    hasCampaignContactEmail,
    hasCurrencyCode,
    hasAgreementType,
    hasAgreementTypeOther,
    hasIncludesPayment,
    hasIncludesBarter,
    hasIncludesAffiliate,
    hasIncludesDiscountCode,
    hasIncludesMapPresence,
    hasIncludesBrandReport,
    hasRequiresExclusivity,
    hasRequiresPreapproval,
    hasRequiresTravel,
    hasEvaluationResult,
    hasMinimumAmount,
    hasAcceptsBarter,
    hasMinimumRequiresPayment,
    hasMinimumRequiresAccommodation,
    hasMinimumRequiresTransport,
    hasMinimumRequiresCreativeFreedom,
    hasMinimumRequiresNoPreapproval,
    hasMinimumRequiresClearDates,
    hasMinimumRequiresLinkOrCoupon,
    hasMinimumConditionsNotes,
    hasMinimumFit,
    hasAcceptanceOverrideNote,
    hasCountryCode,
    hasDestinationLabel,
    hasFinalLearningNote,
    hasWouldCollaborateAgain,
    hasBalanceItems,
  };
}

function hashBrandPortalToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function hashBrandPortalAccessCode(code: string) {
  return createHash("sha256").update(String(code || "").trim()).digest("base64url");
}

function buildBrandPortalUrl(origin: string | undefined, token: string) {
  const path = `/brand-portal/${encodeURIComponent(token)}`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

function resolvePublicPortalUrl(origin: string, pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${origin.replace(/\/$/, "")}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export async function loadSponsorCrm(channelId: string): Promise<SponsorCrmPayload> {
  if (!(await sponsorCampaignsTableExists())) {
    const inquiries = await loadCrmInquiries(channelId, false);
    return {
      inquiries,
      campaigns: [],
      summary: {
        open_leads: inquiries.filter((inquiry) => !["won", "lost"].includes(inquiry.status)).length,
        active_campaigns: 0,
        pipeline_usd: inquiries.reduce((sum, inquiry) => sum + Number(inquiry.proposed_budget_usd || 0), 0),
        pending_payments_usd: 0,
        overdue_deliverables: 0,
        collaboration_count: 0,
        balance_by_currency: [],
      },
    };
  }

  const features = await loadCollaborationSchemaFeatures();
  const selectContactName = features.hasCampaignContactName ? "coalesce(sc.contact_name, si.contact_name) as contact_name" : "si.contact_name";
  const selectContactEmail = features.hasCampaignContactEmail ? "coalesce(sc.contact_email, si.contact_email) as contact_email" : "si.contact_email";
  const selectCurrencyCode = features.hasCurrencyCode ? "sc.currency_code" : "'USD'::text as currency_code";
  const selectAgreementType = features.hasAgreementType ? "sc.agreement_type" : "null::text as agreement_type";
  const selectAgreementTypeOther = features.hasAgreementTypeOther ? "sc.agreement_type_other" : "null::text as agreement_type_other";
  const selectIncludesPayment = features.hasIncludesPayment ? "sc.includes_payment" : "false::boolean as includes_payment";
  const selectIncludesBarter = features.hasIncludesBarter ? "sc.includes_barter" : "false::boolean as includes_barter";
  const selectIncludesAffiliate = features.hasIncludesAffiliate ? "sc.includes_affiliate" : "false::boolean as includes_affiliate";
  const selectIncludesDiscountCode = features.hasIncludesDiscountCode ? "sc.includes_discount_code" : "false::boolean as includes_discount_code";
  const selectIncludesMapPresence = features.hasIncludesMapPresence ? "sc.includes_map_presence" : "false::boolean as includes_map_presence";
  const selectIncludesBrandReport = features.hasIncludesBrandReport ? "sc.includes_brand_report" : "false::boolean as includes_brand_report";
  const selectRequiresExclusivity = features.hasRequiresExclusivity ? "sc.requires_exclusivity" : "false::boolean as requires_exclusivity";
  const selectRequiresPreapproval = features.hasRequiresPreapproval ? "sc.requires_preapproval" : "false::boolean as requires_preapproval";
  const selectRequiresTravel = features.hasRequiresTravel ? "sc.requires_travel" : "false::boolean as requires_travel";
  const selectEvaluationResult = features.hasEvaluationResult ? "sc.evaluation_result" : "'not_evaluated'::text as evaluation_result";
  const selectMinimumAmount = features.hasMinimumAmount ? "sc.minimum_amount" : "null::integer as minimum_amount";
  const selectAcceptsBarter = features.hasAcceptsBarter ? "sc.accepts_barter" : "null::boolean as accepts_barter";
  const selectMinimumRequiresPayment = features.hasMinimumRequiresPayment ? "sc.minimum_requires_payment" : "false::boolean as minimum_requires_payment";
  const selectMinimumRequiresAccommodation = features.hasMinimumRequiresAccommodation ? "sc.minimum_requires_accommodation" : "false::boolean as minimum_requires_accommodation";
  const selectMinimumRequiresTransport = features.hasMinimumRequiresTransport ? "sc.minimum_requires_transport" : "false::boolean as minimum_requires_transport";
  const selectMinimumRequiresCreativeFreedom = features.hasMinimumRequiresCreativeFreedom ? "sc.minimum_requires_creative_freedom" : "false::boolean as minimum_requires_creative_freedom";
  const selectMinimumRequiresNoPreapproval = features.hasMinimumRequiresNoPreapproval ? "sc.minimum_requires_no_preapproval" : "false::boolean as minimum_requires_no_preapproval";
  const selectMinimumRequiresClearDates = features.hasMinimumRequiresClearDates ? "sc.minimum_requires_clear_dates" : "false::boolean as minimum_requires_clear_dates";
  const selectMinimumRequiresLinkOrCoupon = features.hasMinimumRequiresLinkOrCoupon ? "sc.minimum_requires_link_or_coupon" : "false::boolean as minimum_requires_link_or_coupon";
  const selectMinimumConditionsNotes = features.hasMinimumConditionsNotes ? "sc.minimum_conditions_notes" : "null::text as minimum_conditions_notes";
  const selectMinimumFit = features.hasMinimumFit ? "sc.minimum_fit" : "'unknown'::text as minimum_fit";
  const selectAcceptanceOverrideNote = features.hasAcceptanceOverrideNote ? "sc.acceptance_override_note" : "null::text as acceptance_override_note";
  const selectCountryCode = features.hasCountryCode ? "sc.country_code" : "null::text as country_code";
  const selectDestinationLabel = features.hasDestinationLabel ? "sc.destination_label" : "null::text as destination_label";
  const selectFinalLearningNote = features.hasFinalLearningNote ? "sc.final_learning_note" : "null::text as final_learning_note";
  const selectWouldCollaborateAgain = features.hasWouldCollaborateAgain ? "sc.would_collaborate_again" : "null::text as would_collaborate_again";

  const [inquiries, campaignRows, deliverableRows, paymentRows, portalRows, balanceRows] = await Promise.all([
    loadCrmInquiries(channelId, true),
    sql.query<Array<Omit<SponsorCrmCampaign, "deliverables" | "payments" | "balance_items" | "balance">>>(
      `
      select
        sc.id::text as id,
        sc.channel_id::text as channel_id,
        sc.sponsor_id::text as sponsor_id,
        sc.inquiry_id::text as inquiry_id,
        ${selectContactName},
        ${selectContactEmail},
        sc.title,
        sc.brand_name,
        sc.status,
        sc.budget_usd,
        ${selectCurrencyCode},
        ${selectAgreementType},
        ${selectAgreementTypeOther},
        ${selectIncludesPayment},
        ${selectIncludesBarter},
        ${selectIncludesAffiliate},
        ${selectIncludesDiscountCode},
        ${selectIncludesMapPresence},
        ${selectIncludesBrandReport},
        ${selectRequiresExclusivity},
        ${selectRequiresPreapproval},
        ${selectRequiresTravel},
        ${selectEvaluationResult},
        ${selectMinimumAmount},
        ${selectAcceptsBarter},
        ${selectMinimumRequiresPayment},
        ${selectMinimumRequiresAccommodation},
        ${selectMinimumRequiresTransport},
        ${selectMinimumRequiresCreativeFreedom},
        ${selectMinimumRequiresNoPreapproval},
        ${selectMinimumRequiresClearDates},
        ${selectMinimumRequiresLinkOrCoupon},
        ${selectMinimumConditionsNotes},
        ${selectMinimumFit},
        ${selectAcceptanceOverrideNote},
        ${selectCountryCode},
        ${selectDestinationLabel},
        ${selectFinalLearningNote},
        ${selectWouldCollaborateAgain},
        sc.start_date::text as start_date,
        sc.end_date::text as end_date,
        sc.objective,
        sc.internal_notes,
        sc.created_at,
        sc.updated_at
      from public.sponsor_campaigns sc
      left join public.sponsor_inquiries si on si.id = sc.inquiry_id
      where sc.channel_id = ${channelId}
      order by
        case sc.status
          when 'active' then 0
          when 'negotiation' then 1
          when 'proposal' then 2
          when 'lead' then 3
          when 'delivered' then 4
          when 'paid' then 5
          else 6
        end,
        sc.updated_at desc
      limit 120
    `,
      [channelId]
    ),
    sql<SponsorCrmDeliverable[]>`
      select
        d.id::text as id,
        d.campaign_id::text as campaign_id,
        d.title,
        d.deliverable_type,
        d.due_date::text as due_date,
        d.status,
        d.public_url,
        d.notes,
        d.created_at,
        d.updated_at
      from public.sponsor_campaign_deliverables d
      inner join public.sponsor_campaigns c on c.id = d.campaign_id
      where c.channel_id = ${channelId}
      order by coalesce(d.due_date, d.created_at::date) asc, d.created_at asc
      limit 500
    `,
    sql<SponsorCrmPayment[]>`
      select
        p.id::text as id,
        p.campaign_id::text as campaign_id,
        p.label,
        p.amount_usd,
        p.due_date::text as due_date,
        p.status,
        p.paid_at,
        p.notes,
        p.created_at,
        p.updated_at
      from public.sponsor_campaign_payments p
      inner join public.sponsor_campaigns c on c.id = p.campaign_id
      where c.channel_id = ${channelId}
      order by coalesce(p.due_date, p.created_at::date) asc, p.created_at asc
      limit 500
    `,
    loadBrandPortalLinks(channelId),
    loadBalanceItems(channelId, features.hasBalanceItems),
  ]);

  const deliverablesByCampaign = groupBy(deliverableRows, (row) => row.campaign_id);
  const paymentsByCampaign = groupBy(paymentRows, (row) => row.campaign_id);
  const portalsByCampaign = groupBy(portalRows, (row) => row.campaign_id);
  const balanceItemsByCampaign = groupBy(balanceRows, (row) => row.campaign_id);
  const campaigns = campaignRows.map((campaign) => ({
    ...campaign,
    status: normalizeCampaignStatus(campaign.status),
    currency_code: normalizeCurrency(campaign.currency_code),
    agreement_type: normalizeAgreementType(campaign.agreement_type),
    evaluation_result: normalizeEvaluationResult(campaign.evaluation_result),
    minimum_fit: normalizeMinimumFit(campaign.minimum_fit),
    would_collaborate_again: normalizeWouldCollaborateAgain(campaign.would_collaborate_again),
    budget_usd: campaign.budget_usd === null ? null : Number(campaign.budget_usd),
    minimum_amount: campaign.minimum_amount === null ? null : Number(campaign.minimum_amount),
    includes_payment: Boolean(campaign.includes_payment),
    includes_barter: Boolean(campaign.includes_barter),
    includes_affiliate: Boolean(campaign.includes_affiliate),
    includes_discount_code: Boolean(campaign.includes_discount_code),
    includes_map_presence: Boolean(campaign.includes_map_presence),
    includes_brand_report: Boolean(campaign.includes_brand_report),
    requires_exclusivity: Boolean(campaign.requires_exclusivity),
    requires_preapproval: Boolean(campaign.requires_preapproval),
    requires_travel: Boolean(campaign.requires_travel),
    minimum_requires_payment: Boolean(campaign.minimum_requires_payment),
    minimum_requires_accommodation: Boolean(campaign.minimum_requires_accommodation),
    minimum_requires_transport: Boolean(campaign.minimum_requires_transport),
    minimum_requires_creative_freedom: Boolean(campaign.minimum_requires_creative_freedom),
    minimum_requires_no_preapproval: Boolean(campaign.minimum_requires_no_preapproval),
    minimum_requires_clear_dates: Boolean(campaign.minimum_requires_clear_dates),
    minimum_requires_link_or_coupon: Boolean(campaign.minimum_requires_link_or_coupon),
    deliverables: (deliverablesByCampaign.get(campaign.id) || []).map(normalizeDeliverable),
    payments: (paymentsByCampaign.get(campaign.id) || []).map(normalizePayment),
    balance_items: (balanceItemsByCampaign.get(campaign.id) || []).map(normalizeBalanceItem),
    balance: emptyCampaignBalance(),
    portal_links: portalsByCampaign.get(campaign.id) || [],
  })).map((campaign) => ({
    ...campaign,
    balance: calculateCampaignBalance(campaign.payments, campaign.balance_items),
  }));

  const balanceByCurrency = calculateBalanceByCurrency(campaigns);

  return {
    inquiries,
    campaigns,
    summary: {
      open_leads: inquiries.filter((inquiry) => !["won", "lost"].includes(inquiry.status)).length,
      active_campaigns: campaigns.filter((campaign) => ["proposal", "negotiation", "active"].includes(campaign.status)).length,
      pipeline_usd: campaigns
        .filter((campaign) => !["paid", "lost"].includes(campaign.status))
        .reduce((sum, campaign) => sum + Number(campaign.budget_usd || 0), 0),
      pending_payments_usd: campaigns.flatMap((campaign) => campaign.payments)
        .filter((payment) => payment.status !== "paid")
        .reduce((sum, payment) => sum + Number(payment.amount_usd || 0), 0),
      overdue_deliverables: campaigns.flatMap((campaign) => campaign.deliverables)
        .filter((deliverable) => Boolean(deliverable.due_date) && !["approved", "published"].includes(deliverable.status) && new Date(deliverable.due_date!).getTime() < Date.now())
        .length,
      collaboration_count: campaigns.filter((campaign) => Boolean(campaign.agreement_type)).length,
      balance_by_currency: balanceByCurrency,
    },
  };
}

export async function createBrandPortalLink({
  channelId,
  campaignId,
  createdByUserId,
  accessEmail,
}: {
  channelId: string;
  campaignId: string;
  createdByUserId: string;
  accessEmail?: string | null;
}): Promise<BrandPortalLinkCreateResult | null> {
  if (!(await brandPortalLinksTableExists())) {
    throw new Error("La tabla brand_portal_links no existe. Ejecuta las migraciones antes de crear portales de marca.");
  }
  const token = randomUUID();
  const tokenHash = hashBrandPortalToken(token);
  const email = normalizeEmail(accessEmail);
  const accessCode = email ? String(randomInt(100000, 999999)) : null;
  const accessCodeHash = accessCode ? hashBrandPortalAccessCode(accessCode) : null;
  const rows = await sql<Array<{ id: string }>>`
    insert into public.brand_portal_links (
      id,
      channel_id,
      campaign_id,
      created_by_user_id,
      token_hash,
      access_email,
      access_code_hash,
      require_access_code
    )
    select ${token}, channel_id, id, ${createdByUserId}, ${tokenHash}
      , ${email || null}, ${accessCodeHash}, ${Boolean(accessCode)}
    from public.sponsor_campaigns
    where id = ${campaignId}
      and channel_id = ${channelId}
    returning id::text as id
  `;
  const id = rows[0]?.id || null;
  return id
    ? {
        id,
        public_url: buildBrandPortalUrl(undefined, token),
        access_email: email || null,
        access_code: accessCode,
      }
    : null;
}

export async function revokeBrandPortalLink({ channelId, portalId }: { channelId: string; portalId: string }) {
  if (!(await brandPortalLinksTableExists())) return false;
  const rows = await sql<Array<{ id: string }>>`
    update public.brand_portal_links
    set active = false,
        revoked_at = coalesce(revoked_at, now())
    where id = ${portalId}
      and channel_id = ${channelId}
      and active = true
    returning id::text as id
  `;
  return Boolean(rows[0]?.id);
}

export function getBrandPortalAccessCookieName(token: string) {
  const safe = createHash("sha256").update(token).digest("base64url").slice(0, 24);
  return `tym_brand_portal_${safe}`;
}

export async function verifyBrandPortalAccessCode({
  token,
  email,
  code,
}: {
  token: string;
  email: string;
  code: string;
}) {
  if (!(await brandPortalLinksTableExists())) return null;
  const tokenHash = hashBrandPortalToken(token);
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (!normalizedEmail || normalizedCode.length !== 6) return null;

  const rows = await sql<Array<{ id: string; access_email: string | null; access_code_hash: string | null }>>`
    select id::text as id, access_email, access_code_hash
    from public.brand_portal_links
    where token_hash = ${tokenHash}
      and active = true
      and revoked_at is null
      and (expires_at is null or expires_at > now())
    limit 1
  `;
  const link = rows[0] || null;
  if (!link?.access_code_hash || normalizeEmail(link.access_email) !== normalizedEmail) return null;
  if (hashBrandPortalAccessCode(normalizedCode) !== link.access_code_hash) return null;

  await sql`
    update public.brand_portal_links
    set access_granted_count = access_granted_count + 1,
        last_access_granted_at = now()
    where id = ${link.id}
  `;

  return {
    cookieName: getBrandPortalAccessCookieName(token),
    cookieValue: signBrandPortalAccessCookie({ token, linkId: link.id, accessCodeHash: link.access_code_hash }),
  };
}

export async function loadBrandPortalByToken(token: string, accessCookie?: string | null): Promise<BrandPortalLoadResult> {
  if (!(await brandPortalLinksTableExists())) return { status: "not_found" };
  const tokenHash = hashBrandPortalToken(token);
  const linkRows = await sql<Array<BrandPortalLinkSummary & { channel_id: string; token_hash: string; access_code_hash: string | null; brand_name: string }>>`
    select
      id::text as id,
      channel_id::text as channel_id,
      campaign_id::text as campaign_id,
      token_hash,
      s.brand_name,
      active,
      require_access_code,
      access_email,
      access_code_hash,
      view_count,
      last_viewed_at,
      revoked_at,
      created_at
    from public.brand_portal_links
    where token_hash = ${tokenHash}
      and active = true
      and revoked_at is null
      and (expires_at is null or expires_at > now())
    limit 1
  `;
  const link = linkRows[0] || null;
  if (!link) return { status: "not_found" };

  if (link.require_access_code && !isValidBrandPortalAccessCookie({
    cookieValue: accessCookie,
    token,
    linkId: link.id,
    accessCodeHash: link.access_code_hash,
  })) {
    return {
      status: "access_required",
      token,
      brand_name: link.brand_name,
      access_email_hint: maskEmail(link.access_email),
    };
  }

  await sql`
    update public.brand_portal_links
    set view_count = view_count + 1,
        last_viewed_at = now()
    where id = ${link.id}
  `;

  const crm = await loadSponsorCrm(link.channel_id);
  const campaign = crm.campaigns.find((entry) => entry.id === link.campaign_id) || null;
  if (!campaign) return { status: "not_found" };

  const channelRows = await sql<Array<{ channel_name: string; channel_handle: string | null; thumbnail_url: string | null }>>`
    select channel_name, channel_handle, thumbnail_url
    from public.channels
    where id = ${link.channel_id}
    limit 1
  `;
  const creator = channelRows[0] || { channel_name: "TravelYourMap creator", channel_handle: null, thumbnail_url: null };

  return {
    status: "ok",
    portal: {
      link: {
        ...link,
        require_access_code: Boolean(link.require_access_code),
        access_email: link.access_email,
        view_count: Number(link.view_count || 0) + 1,
        public_url: buildBrandPortalUrl(undefined, link.id),
      },
      creator,
      campaign,
    },
  };
}

export async function updateInquiryStatus({ channelId, inquiryId, status }: { channelId: string; inquiryId: string; status: SponsorInquiryStatus }) {
  const rows = await sql<Array<{ id: string; status: string }>>`
    update public.sponsor_inquiries
    set status = ${status}, updated_at = now()
    where id = ${inquiryId}
      and channel_id = ${channelId}
    returning id::text as id, status
  `;
  const row = rows[0] || null;
  return row ? { id: row.id, status: normalizeSponsorInquiryStatus(row.status) } : null;
}

async function loadBrandPortalLinks(channelId: string): Promise<BrandPortalLinkSummary[]> {
  if (!(await brandPortalLinksTableExists())) return [];
  const rows = await sql<BrandPortalLinkSummary[]>`
    select
      id::text as id,
      campaign_id::text as campaign_id,
      active,
      require_access_code,
      access_email,
      view_count,
      last_viewed_at,
      revoked_at,
      created_at
    from public.brand_portal_links
    where channel_id = ${channelId}
    order by created_at desc
    limit 200
  `;
  return rows.map((row) => ({
    ...row,
    view_count: Number(row.view_count || 0),
    public_url: buildBrandPortalUrl(undefined, row.id),
  }));
}

export async function createCampaign(input: {
  channelId: string;
  creatorUserId: string;
  sponsorId?: string | null;
  inquiryId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  title: string;
  brandName: string;
  status?: SponsorCampaignStatus;
  budgetUsd?: number | null;
  currencyCode?: SponsorCollaborationCurrency | null;
  agreementType?: SponsorAgreementType | null;
  agreementTypeOther?: string | null;
  includesPayment?: boolean;
  includesBarter?: boolean;
  includesAffiliate?: boolean;
  includesDiscountCode?: boolean;
  includesMapPresence?: boolean;
  includesBrandReport?: boolean;
  requiresExclusivity?: boolean;
  requiresPreapproval?: boolean;
  requiresTravel?: boolean;
  evaluationResult?: SponsorEvaluationResult;
  minimumAmount?: number | null;
  acceptsBarter?: boolean | null;
  minimumRequiresPayment?: boolean;
  minimumRequiresAccommodation?: boolean;
  minimumRequiresTransport?: boolean;
  minimumRequiresCreativeFreedom?: boolean;
  minimumRequiresNoPreapproval?: boolean;
  minimumRequiresClearDates?: boolean;
  minimumRequiresLinkOrCoupon?: boolean;
  minimumConditionsNotes?: string | null;
  minimumFit?: SponsorMinimumFit;
  acceptanceOverrideNote?: string | null;
  countryCode?: string | null;
  destinationLabel?: string | null;
  finalLearningNote?: string | null;
  wouldCollaborateAgain?: SponsorWouldCollaborateAgain | null;
  startDate?: string | null;
  endDate?: string | null;
  objective?: string | null;
  internalNotes?: string | null;
}) {
  if (!(await sponsorCampaignsTableExists())) {
    throw new Error("La tabla sponsor_campaigns no existe. Ejecuta las migraciones antes de crear campañas.");
  }

  const features = await loadCollaborationSchemaFeatures();
  const columns = [
    "channel_id",
    "creator_user_id",
    "sponsor_id",
    "inquiry_id",
    "title",
    "brand_name",
    "status",
    "budget_usd",
    "start_date",
    "end_date",
    "objective",
    "internal_notes",
  ];
  const values: unknown[] = [
    input.channelId,
    input.creatorUserId,
    input.sponsorId || null,
    input.inquiryId || null,
    input.title,
    input.brandName,
    input.status || "proposal",
    input.budgetUsd || null,
    input.startDate || null,
    input.endDate || null,
    cleanText(input.objective),
    cleanText(input.internalNotes),
  ];
  function addColumn(column: string, value: unknown, enabled: boolean) {
    if (!enabled) return;
    columns.push(column);
    values.push(value);
  }
  addColumn("contact_name", cleanText(input.contactName), features.hasCampaignContactName);
  addColumn("contact_email", normalizeEmail(input.contactEmail) || null, features.hasCampaignContactEmail);
  addColumn("currency_code", normalizeCurrency(input.currencyCode), features.hasCurrencyCode);
  addColumn("agreement_type", normalizeAgreementType(input.agreementType), features.hasAgreementType);
  addColumn("agreement_type_other", cleanText(input.agreementTypeOther), features.hasAgreementTypeOther);
  addColumn("includes_payment", Boolean(input.includesPayment), features.hasIncludesPayment);
  addColumn("includes_barter", Boolean(input.includesBarter), features.hasIncludesBarter);
  addColumn("includes_affiliate", Boolean(input.includesAffiliate), features.hasIncludesAffiliate);
  addColumn("includes_discount_code", Boolean(input.includesDiscountCode), features.hasIncludesDiscountCode);
  addColumn("includes_map_presence", Boolean(input.includesMapPresence), features.hasIncludesMapPresence);
  addColumn("includes_brand_report", Boolean(input.includesBrandReport), features.hasIncludesBrandReport);
  addColumn("requires_exclusivity", Boolean(input.requiresExclusivity), features.hasRequiresExclusivity);
  addColumn("requires_preapproval", Boolean(input.requiresPreapproval), features.hasRequiresPreapproval);
  addColumn("requires_travel", Boolean(input.requiresTravel), features.hasRequiresTravel);
  addColumn("evaluation_result", normalizeEvaluationResult(input.evaluationResult), features.hasEvaluationResult);
  addColumn("minimum_amount", input.minimumAmount ?? null, features.hasMinimumAmount);
  addColumn("accepts_barter", input.acceptsBarter ?? null, features.hasAcceptsBarter);
  addColumn("minimum_requires_payment", Boolean(input.minimumRequiresPayment), features.hasMinimumRequiresPayment);
  addColumn("minimum_requires_accommodation", Boolean(input.minimumRequiresAccommodation), features.hasMinimumRequiresAccommodation);
  addColumn("minimum_requires_transport", Boolean(input.minimumRequiresTransport), features.hasMinimumRequiresTransport);
  addColumn("minimum_requires_creative_freedom", Boolean(input.minimumRequiresCreativeFreedom), features.hasMinimumRequiresCreativeFreedom);
  addColumn("minimum_requires_no_preapproval", Boolean(input.minimumRequiresNoPreapproval), features.hasMinimumRequiresNoPreapproval);
  addColumn("minimum_requires_clear_dates", Boolean(input.minimumRequiresClearDates), features.hasMinimumRequiresClearDates);
  addColumn("minimum_requires_link_or_coupon", Boolean(input.minimumRequiresLinkOrCoupon), features.hasMinimumRequiresLinkOrCoupon);
  addColumn("minimum_conditions_notes", cleanText(input.minimumConditionsNotes), features.hasMinimumConditionsNotes);
  addColumn("minimum_fit", normalizeMinimumFit(input.minimumFit), features.hasMinimumFit);
  addColumn("acceptance_override_note", cleanText(input.acceptanceOverrideNote), features.hasAcceptanceOverrideNote);
  addColumn("country_code", cleanCountryCode(input.countryCode), features.hasCountryCode);
  addColumn("destination_label", cleanText(input.destinationLabel), features.hasDestinationLabel);
  addColumn("final_learning_note", cleanText(input.finalLearningNote), features.hasFinalLearningNote);
  addColumn("would_collaborate_again", normalizeWouldCollaborateAgain(input.wouldCollaborateAgain), features.hasWouldCollaborateAgain);

  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await sql.query<Array<{ id: string }>>(
    `insert into public.sponsor_campaigns (${columns.join(", ")})
     values (${placeholders})
     returning id::text as id`,
    values
  );

  if (input.inquiryId) {
    await updateInquiryStatus({ channelId: input.channelId, inquiryId: input.inquiryId, status: "proposal_sent" });
  }

  return rows[0]?.id || null;
}

export async function createCampaignFromInquiry({ channelId, creatorUserId, inquiryId }: { channelId: string; creatorUserId: string; inquiryId: string }) {
  const inquiries = await sql<Array<{
    id: string;
    brand_name: string;
    contact_name: string | null;
    contact_email: string | null;
    proposed_budget_usd: number | null;
    brief: string;
  }>>`
    select id::text as id, brand_name, contact_name, contact_email, proposed_budget_usd, brief
    from public.sponsor_inquiries
    where id = ${inquiryId}
      and channel_id = ${channelId}
    limit 1
  `;
  const inquiry = inquiries[0] || null;
  if (!inquiry) return null;

  return createCampaign({
    channelId,
    creatorUserId,
    inquiryId,
    contactName: inquiry.contact_name,
    contactEmail: inquiry.contact_email,
    title: `${inquiry.brand_name} partnership`,
    brandName: inquiry.brand_name,
    budgetUsd: inquiry.proposed_budget_usd,
    objective: inquiry.brief,
    status: "proposal",
  });
}

export async function createCollaboration(input: {
  channelId: string;
  creatorUserId: string;
  title: string;
  brandName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  budgetUsd?: number | null;
  currencyCode?: SponsorCollaborationCurrency | null;
  agreementType: SponsorAgreementType;
  agreementTypeOther?: string | null;
  includesPayment?: boolean;
  includesBarter?: boolean;
  includesAffiliate?: boolean;
  includesDiscountCode?: boolean;
  includesMapPresence?: boolean;
  includesBrandReport?: boolean;
  requiresExclusivity?: boolean;
  requiresPreapproval?: boolean;
  requiresTravel?: boolean;
  evaluationResult?: SponsorEvaluationResult;
  minimumAmount?: number | null;
  acceptsBarter?: boolean | null;
  minimumRequiresPayment?: boolean;
  minimumRequiresAccommodation?: boolean;
  minimumRequiresTransport?: boolean;
  minimumRequiresCreativeFreedom?: boolean;
  minimumRequiresNoPreapproval?: boolean;
  minimumRequiresClearDates?: boolean;
  minimumRequiresLinkOrCoupon?: boolean;
  minimumConditionsNotes?: string | null;
  minimumFit?: SponsorMinimumFit;
  acceptanceOverrideNote?: string | null;
  countryCode?: string | null;
  destinationLabel?: string | null;
  finalLearningNote?: string | null;
  wouldCollaborateAgain?: SponsorWouldCollaborateAgain | null;
  startDate?: string | null;
  endDate?: string | null;
  objective?: string | null;
}) {
  const features = await loadCollaborationSchemaFeatures();
  if (!features.hasAgreementType) {
    throw new Error("Falta aplicar la migracion de colaboraciones antes de crear oportunidades.");
  }
  return createCampaign({
    channelId: input.channelId,
    creatorUserId: input.creatorUserId,
    title: input.title,
    brandName: input.brandName,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    budgetUsd: input.budgetUsd,
    currencyCode: input.currencyCode || "USD",
    agreementType: input.agreementType,
    agreementTypeOther: input.agreementTypeOther,
    includesPayment: input.includesPayment,
    includesBarter: input.includesBarter,
    includesAffiliate: input.includesAffiliate,
    includesDiscountCode: input.includesDiscountCode,
    includesMapPresence: input.includesMapPresence,
    includesBrandReport: input.includesBrandReport,
    requiresExclusivity: input.requiresExclusivity,
    requiresPreapproval: input.requiresPreapproval,
    requiresTravel: input.requiresTravel,
    evaluationResult: input.evaluationResult,
    minimumAmount: input.minimumAmount,
    acceptsBarter: input.acceptsBarter,
    minimumRequiresPayment: input.minimumRequiresPayment,
    minimumRequiresAccommodation: input.minimumRequiresAccommodation,
    minimumRequiresTransport: input.minimumRequiresTransport,
    minimumRequiresCreativeFreedom: input.minimumRequiresCreativeFreedom,
    minimumRequiresNoPreapproval: input.minimumRequiresNoPreapproval,
    minimumRequiresClearDates: input.minimumRequiresClearDates,
    minimumRequiresLinkOrCoupon: input.minimumRequiresLinkOrCoupon,
    minimumConditionsNotes: input.minimumConditionsNotes,
    minimumFit: input.minimumFit,
    acceptanceOverrideNote: input.acceptanceOverrideNote,
    countryCode: input.countryCode,
    destinationLabel: input.destinationLabel,
    finalLearningNote: input.finalLearningNote,
    wouldCollaborateAgain: input.wouldCollaborateAgain,
    startDate: input.startDate,
    endDate: input.endDate,
    objective: input.objective,
    status: "lead",
    evaluationResult: "not_evaluated",
    minimumFit: "unknown",
  });
}

export async function createCollaborationFromInquiry({
  channelId,
  creatorUserId,
  inquiryId,
  agreementType,
}: {
  channelId: string;
  creatorUserId: string;
  inquiryId: string;
  agreementType: SponsorAgreementType;
}) {
  const features = await loadCollaborationSchemaFeatures();
  if (!features.hasAgreementType) {
    throw new Error("Falta aplicar la migracion de colaboraciones antes de crear oportunidades.");
  }
  const inquiries = await sql<Array<{
    id: string;
    brand_name: string;
    contact_name: string | null;
    contact_email: string | null;
    proposed_budget_usd: number | null;
    brief: string;
  }>>`
    select id::text as id, brand_name, contact_name, contact_email, proposed_budget_usd, brief
    from public.sponsor_inquiries
    where id = ${inquiryId}
      and channel_id = ${channelId}
    limit 1
  `;
  const inquiry = inquiries[0] || null;
  if (!inquiry) return null;

  return createCampaign({
    channelId,
    creatorUserId,
    inquiryId,
    contactName: inquiry.contact_name,
    contactEmail: inquiry.contact_email,
    title: `${inquiry.brand_name} colaboracion`,
    brandName: inquiry.brand_name,
    budgetUsd: inquiry.proposed_budget_usd,
    objective: inquiry.brief,
    status: "lead",
    agreementType,
    currencyCode: "USD",
    evaluationResult: "not_evaluated",
    minimumFit: "unknown",
  });
}

export async function createCampaignRenewal({
  channelId,
  creatorUserId,
  campaignId,
}: {
  channelId: string;
  creatorUserId: string;
  campaignId: string;
}) {
  if (!(await sponsorCampaignsTableExists())) {
    throw new Error("La tabla sponsor_campaigns no existe. Ejecuta las migraciones antes de crear renovaciones.");
  }

  const rows = await sql<Array<{
    id: string;
    sponsor_id: string | null;
    inquiry_id: string | null;
    title: string;
    brand_name: string;
    budget_usd: number | null;
    start_date: string | null;
    end_date: string | null;
    objective: string | null;
  }>>`
    select
      id::text as id,
      sponsor_id::text as sponsor_id,
      inquiry_id::text as inquiry_id,
      title,
      brand_name,
      budget_usd,
      start_date::text as start_date,
      end_date::text as end_date,
      objective
    from public.sponsor_campaigns
    where id = ${campaignId}
      and channel_id = ${channelId}
      and status in ('delivered', 'paid')
    limit 1
  `;
  const source = rows[0] || null;
  if (!source) return null;

  const budgetUsd = source.budget_usd ? roundBudget(Number(source.budget_usd) * 1.15) : null;
  const startDate = nextIsoDate(source.end_date);
  const endDate = addDays(startDate, campaignDurationDays(source.start_date, source.end_date));
  const renewalId = await createCampaign({
    channelId,
    creatorUserId,
    sponsorId: source.sponsor_id,
    inquiryId: source.inquiry_id,
    title: `Renovacion: ${source.title}`.slice(0, 140),
    brandName: source.brand_name,
    status: "proposal",
    budgetUsd,
    startDate,
    endDate,
    objective: [
      `Renovacion comercial para ${source.brand_name}.`,
      source.objective ? `Objetivo anterior: ${source.objective}` : null,
      "Incluye continuidad de presencia en TravelYourMap, reporte de resultados y nueva propuesta de contenidos/destinos.",
    ].filter(Boolean).join(" "),
    internalNotes: `Renovacion creada desde campaña ${source.id}. Budget sugerido: ${budgetUsd ? `$${budgetUsd}` : "pendiente"}.`,
  });
  if (!renewalId) return null;

  await createDeliverable({
    channelId,
    campaignId: renewalId,
    title: "Propuesta de renovacion",
    deliverableType: "other",
    dueDate: startDate,
  });
  await createDeliverable({
    channelId,
    campaignId: renewalId,
    title: "Reporte de resultados actualizado",
    deliverableType: "report",
    dueDate: startDate,
  });
  if (budgetUsd) {
    await createPayment({
      channelId,
      campaignId: renewalId,
      label: "Reserva renovacion",
      amountUsd: Math.max(1, Math.round(budgetUsd * 0.5)),
      dueDate: startDate,
    });
  }

  return renewalId;
}

export async function createCampaignRenewalWithEmail({
  channelId,
  creatorUserId,
  campaignId,
  origin,
}: {
  channelId: string;
  creatorUserId: string;
  campaignId: string;
  origin: string;
}): Promise<CampaignRenewalEmailResult | null> {
  const renewalId = await createCampaignRenewal({ channelId, creatorUserId, campaignId });
  if (!renewalId) return null;

  const renewalRows = await sql<Array<{
    id: string;
    title: string;
    brand_name: string;
    budget_usd: number | null;
    contact_name: string | null;
    contact_email: string | null;
  }>>`
    select
      sc.id::text as id,
      sc.title,
      sc.brand_name,
      sc.budget_usd,
      si.contact_name,
      si.contact_email
    from public.sponsor_campaigns sc
    left join public.sponsor_inquiries si on si.id = sc.inquiry_id
    where sc.id = ${renewalId}
      and sc.channel_id = ${channelId}
    limit 1
  `;
  const renewal = renewalRows[0] || null;
  if (!renewal) return null;

  let portalUrl: string | null = null;
  let accessCode: string | null = null;
  try {
    const portal = await createBrandPortalLink({
      channelId,
      campaignId: renewalId,
      createdByUserId: creatorUserId,
      accessEmail: renewal.contact_email,
    });
    if (portal) {
      portalUrl = resolvePublicPortalUrl(origin, portal.public_url);
      accessCode = portal.access_code;
    }
  } catch {
    portalUrl = null;
  }

  const recipientEmail = normalizeEmail(renewal.contact_email);
  const subject = `Propuesta de renovacion - ${renewal.brand_name}`;
  const body = buildRenewalEmailBody({
    contactName: renewal.contact_name,
    brandName: renewal.brand_name,
    budgetUsd: renewal.budget_usd,
    portalUrl,
    accessCode,
  });
  const mailtoUrl = recipientEmail
    ? `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  if (!recipientEmail) {
    return {
      renewal_campaign_id: renewalId,
      portal_url: portalUrl,
      recipient_email: null,
      email_sent: false,
      mailto_url: null,
      error: "La campaña no tiene email de contacto asociado. Agrega o conserva el lead original para enviar renovaciones.",
    };
  }

  const emailResult = await sendRenewalEmail({
    to: recipientEmail,
    subject,
    body,
    brandName: renewal.brand_name,
    portalUrl,
    accessCode,
  });

  return {
    renewal_campaign_id: renewalId,
    portal_url: portalUrl,
    recipient_email: recipientEmail,
    email_sent: emailResult.sent,
    mailto_url: emailResult.sent ? null : mailtoUrl,
    error: emailResult.error,
  };
}

export async function updateCampaign(input: {
  channelId: string;
  campaignId: string;
  status?: SponsorCampaignStatus;
  title?: string;
  brandName?: string;
  budgetUsd?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  currencyCode?: SponsorCollaborationCurrency | null;
  agreementType?: SponsorAgreementType | null;
  agreementTypeOther?: string | null;
  includesPayment?: boolean;
  includesBarter?: boolean;
  includesAffiliate?: boolean;
  includesDiscountCode?: boolean;
  includesMapPresence?: boolean;
  includesBrandReport?: boolean;
  requiresExclusivity?: boolean;
  requiresPreapproval?: boolean;
  requiresTravel?: boolean;
  evaluationResult?: SponsorEvaluationResult;
  minimumAmount?: number | null;
  acceptsBarter?: boolean | null;
  minimumRequiresPayment?: boolean;
  minimumRequiresAccommodation?: boolean;
  minimumRequiresTransport?: boolean;
  minimumRequiresCreativeFreedom?: boolean;
  minimumRequiresNoPreapproval?: boolean;
  minimumRequiresClearDates?: boolean;
  minimumRequiresLinkOrCoupon?: boolean;
  minimumConditionsNotes?: string | null;
  minimumFit?: SponsorMinimumFit;
  acceptanceOverrideNote?: string | null;
  countryCode?: string | null;
  destinationLabel?: string | null;
  finalLearningNote?: string | null;
  wouldCollaborateAgain?: SponsorWouldCollaborateAgain | null;
  startDate?: string | null;
  endDate?: string | null;
  objective?: string | null;
  internalNotes?: string | null;
}) {
  const features = await loadCollaborationSchemaFeatures();
  const setClauses: string[] = [];
  const values: unknown[] = [];
  function addSet(column: string, value: unknown, enabled = true) {
    if (!enabled) return;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  if (input.status) addSet("status", input.status);
  if (typeof input.title !== "undefined") addSet("title", cleanText(input.title));
  if (typeof input.brandName !== "undefined") addSet("brand_name", cleanText(input.brandName));
  if (typeof input.budgetUsd !== "undefined") addSet("budget_usd", input.budgetUsd);
  if (typeof input.contactName !== "undefined") addSet("contact_name", cleanText(input.contactName), features.hasCampaignContactName);
  if (typeof input.contactEmail !== "undefined") addSet("contact_email", normalizeEmail(input.contactEmail) || null, features.hasCampaignContactEmail);
  if (typeof input.currencyCode !== "undefined") addSet("currency_code", normalizeCurrency(input.currencyCode), features.hasCurrencyCode);
  if (typeof input.agreementType !== "undefined") addSet("agreement_type", normalizeAgreementType(input.agreementType), features.hasAgreementType);
  if (typeof input.agreementTypeOther !== "undefined") addSet("agreement_type_other", cleanText(input.agreementTypeOther), features.hasAgreementTypeOther);
  if (typeof input.includesPayment !== "undefined") addSet("includes_payment", Boolean(input.includesPayment), features.hasIncludesPayment);
  if (typeof input.includesBarter !== "undefined") addSet("includes_barter", Boolean(input.includesBarter), features.hasIncludesBarter);
  if (typeof input.includesAffiliate !== "undefined") addSet("includes_affiliate", Boolean(input.includesAffiliate), features.hasIncludesAffiliate);
  if (typeof input.includesDiscountCode !== "undefined") addSet("includes_discount_code", Boolean(input.includesDiscountCode), features.hasIncludesDiscountCode);
  if (typeof input.includesMapPresence !== "undefined") addSet("includes_map_presence", Boolean(input.includesMapPresence), features.hasIncludesMapPresence);
  if (typeof input.includesBrandReport !== "undefined") addSet("includes_brand_report", Boolean(input.includesBrandReport), features.hasIncludesBrandReport);
  if (typeof input.requiresExclusivity !== "undefined") addSet("requires_exclusivity", Boolean(input.requiresExclusivity), features.hasRequiresExclusivity);
  if (typeof input.requiresPreapproval !== "undefined") addSet("requires_preapproval", Boolean(input.requiresPreapproval), features.hasRequiresPreapproval);
  if (typeof input.requiresTravel !== "undefined") addSet("requires_travel", Boolean(input.requiresTravel), features.hasRequiresTravel);
  if (typeof input.evaluationResult !== "undefined") addSet("evaluation_result", normalizeEvaluationResult(input.evaluationResult), features.hasEvaluationResult);
  if (typeof input.minimumAmount !== "undefined") addSet("minimum_amount", input.minimumAmount, features.hasMinimumAmount);
  if (typeof input.acceptsBarter !== "undefined") addSet("accepts_barter", input.acceptsBarter, features.hasAcceptsBarter);
  if (typeof input.minimumRequiresPayment !== "undefined") addSet("minimum_requires_payment", Boolean(input.minimumRequiresPayment), features.hasMinimumRequiresPayment);
  if (typeof input.minimumRequiresAccommodation !== "undefined") addSet("minimum_requires_accommodation", Boolean(input.minimumRequiresAccommodation), features.hasMinimumRequiresAccommodation);
  if (typeof input.minimumRequiresTransport !== "undefined") addSet("minimum_requires_transport", Boolean(input.minimumRequiresTransport), features.hasMinimumRequiresTransport);
  if (typeof input.minimumRequiresCreativeFreedom !== "undefined") addSet("minimum_requires_creative_freedom", Boolean(input.minimumRequiresCreativeFreedom), features.hasMinimumRequiresCreativeFreedom);
  if (typeof input.minimumRequiresNoPreapproval !== "undefined") addSet("minimum_requires_no_preapproval", Boolean(input.minimumRequiresNoPreapproval), features.hasMinimumRequiresNoPreapproval);
  if (typeof input.minimumRequiresClearDates !== "undefined") addSet("minimum_requires_clear_dates", Boolean(input.minimumRequiresClearDates), features.hasMinimumRequiresClearDates);
  if (typeof input.minimumRequiresLinkOrCoupon !== "undefined") addSet("minimum_requires_link_or_coupon", Boolean(input.minimumRequiresLinkOrCoupon), features.hasMinimumRequiresLinkOrCoupon);
  if (typeof input.minimumConditionsNotes !== "undefined") addSet("minimum_conditions_notes", cleanText(input.minimumConditionsNotes), features.hasMinimumConditionsNotes);
  if (typeof input.minimumFit !== "undefined") addSet("minimum_fit", normalizeMinimumFit(input.minimumFit), features.hasMinimumFit);
  if (typeof input.acceptanceOverrideNote !== "undefined") addSet("acceptance_override_note", cleanText(input.acceptanceOverrideNote), features.hasAcceptanceOverrideNote);
  if (typeof input.countryCode !== "undefined") addSet("country_code", cleanCountryCode(input.countryCode), features.hasCountryCode);
  if (typeof input.destinationLabel !== "undefined") addSet("destination_label", cleanText(input.destinationLabel), features.hasDestinationLabel);
  if (typeof input.finalLearningNote !== "undefined") addSet("final_learning_note", cleanText(input.finalLearningNote), features.hasFinalLearningNote);
  if (typeof input.wouldCollaborateAgain !== "undefined") addSet("would_collaborate_again", normalizeWouldCollaborateAgain(input.wouldCollaborateAgain), features.hasWouldCollaborateAgain);
  if (typeof input.startDate !== "undefined") addSet("start_date", input.startDate);
  if (typeof input.endDate !== "undefined") addSet("end_date", input.endDate);
  if (typeof input.objective !== "undefined") addSet("objective", cleanText(input.objective));
  if (typeof input.internalNotes !== "undefined") addSet("internal_notes", cleanText(input.internalNotes));
  if (setClauses.length === 0) return false;

  values.push(input.campaignId, input.channelId);
  const rows = await sql.query<Array<{ id: string }>>(
    `update public.sponsor_campaigns
     set ${setClauses.join(", ")}, updated_at = now()
     where id = $${values.length - 1}
       and channel_id = $${values.length}
     returning id::text as id`,
    values
  );
  return Boolean(rows[0]?.id);
}

export async function createDeliverable(input: {
  channelId: string;
  campaignId: string;
  title: string;
  deliverableType: SponsorDeliverableType;
  dueDate?: string | null;
}) {
  const rows = await sql<Array<{ id: string }>>`
    insert into public.sponsor_campaign_deliverables (campaign_id, title, deliverable_type, due_date)
    select id, ${input.title}, ${input.deliverableType}, ${input.dueDate || null}
    from public.sponsor_campaigns
    where id = ${input.campaignId}
      and channel_id = ${input.channelId}
    returning id::text as id
  `;
  return rows[0]?.id || null;
}

export async function updateDeliverable(input: {
  channelId: string;
  deliverableId: string;
  status: SponsorDeliverableStatus;
  publicUrl?: string | null;
}) {
  const rows = await sql<Array<{ id: string }>>`
    update public.sponsor_campaign_deliverables d
    set status = ${input.status},
        public_url = coalesce(${cleanText(input.publicUrl)}, public_url),
        updated_at = now()
    from public.sponsor_campaigns c
    where c.id = d.campaign_id
      and c.channel_id = ${input.channelId}
      and d.id = ${input.deliverableId}
    returning d.id::text as id
  `;
  return Boolean(rows[0]?.id);
}

export async function createPayment(input: {
  channelId: string;
  campaignId: string;
  label: string;
  amountUsd: number;
  dueDate?: string | null;
}) {
  const rows = await sql<Array<{ id: string }>>`
    insert into public.sponsor_campaign_payments (campaign_id, label, amount_usd, due_date)
    select id, ${input.label}, ${input.amountUsd}, ${input.dueDate || null}
    from public.sponsor_campaigns
    where id = ${input.campaignId}
      and channel_id = ${input.channelId}
    returning id::text as id
  `;
  return rows[0]?.id || null;
}

export async function updatePayment(input: {
  channelId: string;
  paymentId: string;
  status: SponsorPaymentStatus;
}) {
  const rows = await sql<Array<{ id: string }>>`
    update public.sponsor_campaign_payments p
    set status = ${input.status},
        paid_at = case when ${input.status} = 'paid' then coalesce(paid_at, now()) else paid_at end,
        updated_at = now()
    from public.sponsor_campaigns c
    where c.id = p.campaign_id
      and c.channel_id = ${input.channelId}
      and p.id = ${input.paymentId}
    returning p.id::text as id
  `;
  return Boolean(rows[0]?.id);
}

export async function createBalanceItem(input: {
  channelId: string;
  campaignId: string;
  kind: SponsorBalanceItemKind;
  itemType: string;
  label: string;
  estimatedAmount?: number | null;
  actualAmount?: number | null;
  status?: SponsorBalanceItemStatus;
  expectedDate?: string | null;
  trackInAgenda?: boolean;
  notes?: string | null;
  sortOrder?: number | null;
  effortMode?: SponsorEffortMode | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  hourlyRate?: number | null;
}) {
  if (!(await tableExists("public", "sponsor_campaign_balance_items"))) {
    throw new Error("La tabla sponsor_campaign_balance_items no existe. Ejecuta las migraciones antes de registrar balance.");
  }
  const rows = await sql<Array<{ id: string }>>`
    insert into public.sponsor_campaign_balance_items (
      campaign_id,
      kind,
      item_type,
      label,
      estimated_amount,
      actual_amount,
      status,
      expected_date,
      track_in_agenda,
      notes,
      sort_order,
      effort_mode,
      estimated_hours,
      actual_hours,
      hourly_rate
    )
    select
      id,
      ${normalizeBalanceKind(input.kind)},
      ${cleanText(input.itemType) || "other"},
      ${input.label},
      ${input.estimatedAmount ?? null},
      ${input.actualAmount ?? null},
      ${normalizeBalanceStatus(input.status)},
      ${input.expectedDate || null},
      ${Boolean(input.trackInAgenda)},
      ${cleanText(input.notes)},
      ${input.sortOrder ?? 100},
      ${normalizeEffortMode(input.kind, input.effortMode)},
      ${input.kind === "effort" ? input.estimatedHours ?? null : null},
      ${input.kind === "effort" ? input.actualHours ?? null : null},
      ${input.kind === "effort" ? input.hourlyRate ?? null : null}
    from public.sponsor_campaigns
    where id = ${input.campaignId}
      and channel_id = ${input.channelId}
    returning id::text as id
  `;
  return rows[0]?.id || null;
}

export async function updateBalanceItem(input: {
  channelId: string;
  balanceItemId: string;
  kind?: SponsorBalanceItemKind;
  itemType?: string;
  label?: string;
  enabled?: boolean;
  estimatedAmount?: number | null;
  actualAmount?: number | null;
  status?: SponsorBalanceItemStatus;
  expectedDate?: string | null;
  trackInAgenda?: boolean;
  notes?: string | null;
  sortOrder?: number | null;
  effortMode?: SponsorEffortMode | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  hourlyRate?: number | null;
}) {
  if (!(await tableExists("public", "sponsor_campaign_balance_items"))) return false;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  function addSet(column: string, value: unknown) {
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }
  const nextKind = typeof input.kind !== "undefined" ? normalizeBalanceKind(input.kind) : null;
  const shouldClearEffortFields = typeof input.kind !== "undefined" && nextKind !== "effort";
  if (typeof input.kind !== "undefined") addSet("kind", nextKind);
  if (typeof input.itemType !== "undefined") addSet("item_type", cleanText(input.itemType) || "other");
  if (typeof input.label !== "undefined") addSet("label", cleanText(input.label) || "Item");
  if (typeof input.enabled !== "undefined") addSet("enabled", Boolean(input.enabled));
  if (typeof input.estimatedAmount !== "undefined") addSet("estimated_amount", input.estimatedAmount);
  if (typeof input.actualAmount !== "undefined") addSet("actual_amount", input.actualAmount);
  if (typeof input.status !== "undefined") addSet("status", normalizeBalanceStatus(input.status));
  if (typeof input.expectedDate !== "undefined") addSet("expected_date", input.expectedDate);
  if (typeof input.trackInAgenda !== "undefined") addSet("track_in_agenda", Boolean(input.trackInAgenda));
  if (typeof input.notes !== "undefined") addSet("notes", cleanText(input.notes));
  if (typeof input.sortOrder !== "undefined") addSet("sort_order", input.sortOrder ?? 100);
  if (typeof input.effortMode !== "undefined" || shouldClearEffortFields) {
    addSet("effort_mode", shouldClearEffortFields ? null : input.effortMode);
  }
  if (typeof input.estimatedHours !== "undefined" || shouldClearEffortFields) {
    addSet("estimated_hours", shouldClearEffortFields ? null : input.estimatedHours);
  }
  if (typeof input.actualHours !== "undefined" || shouldClearEffortFields) {
    addSet("actual_hours", shouldClearEffortFields ? null : input.actualHours);
  }
  if (typeof input.hourlyRate !== "undefined" || shouldClearEffortFields) {
    addSet("hourly_rate", shouldClearEffortFields ? null : input.hourlyRate);
  }
  if (setClauses.length === 0) return false;

  values.push(input.balanceItemId, input.channelId);
  const rows = await sql.query<Array<{ id: string }>>(
    `update public.sponsor_campaign_balance_items bi
     set ${setClauses.join(", ")}, updated_at = now()
     from public.sponsor_campaigns c
     where c.id = bi.campaign_id
       and c.channel_id = $${values.length}
       and bi.id = $${values.length - 1}
     returning bi.id::text as id`,
    values
  );
  return Boolean(rows[0]?.id);
}

async function loadCrmInquiries(channelId: string, includeCampaignId: boolean) {
  const selectCampaignId = includeCampaignId
    ? "(select sc.id::text from public.sponsor_campaigns sc where sc.inquiry_id = si.id limit 1) as campaign_id"
    : "null::text as campaign_id";
  const rows = await sql.query<Array<Omit<SponsorCrmInquiry, "status"> & { status: string }>>(
    `
      select
        si.id::text as id,
        si.channel_id::text as channel_id,
        si.brand_name,
        si.contact_name,
        si.contact_email,
        si.website_url,
        si.whatsapp,
        si.proposed_budget_usd,
        si.brief,
        si.status,
        si.source,
        si.map_url,
        si.created_at,
        si.updated_at,
        ${selectCampaignId}
      from public.sponsor_inquiries si
      where si.channel_id = $1
      order by si.created_at desc
      limit 200
    `,
    [channelId]
  );
  return rows.map((row) => ({
    ...row,
    proposed_budget_usd: row.proposed_budget_usd === null ? null : Number(row.proposed_budget_usd),
    status: normalizeSponsorInquiryStatus(row.status),
  }));
}

function normalizeCampaignStatus(value: string): SponsorCampaignStatus {
  return SPONSOR_CAMPAIGN_STATUSES.includes(value as SponsorCampaignStatus) ? (value as SponsorCampaignStatus) : "proposal";
}

function normalizeDeliverable(row: SponsorCrmDeliverable): SponsorCrmDeliverable {
  return {
    ...row,
    deliverable_type: SPONSOR_DELIVERABLE_TYPES.includes(row.deliverable_type) ? row.deliverable_type : "other",
    status: SPONSOR_DELIVERABLE_STATUSES.includes(row.status) ? row.status : "todo",
  };
}

function normalizePayment(row: SponsorCrmPayment): SponsorCrmPayment {
  return {
    ...row,
    amount_usd: Number(row.amount_usd || 0),
    status: SPONSOR_PAYMENT_STATUSES.includes(row.status) ? row.status : "pending",
  };
}

function normalizeBalanceItem(row: SponsorCampaignBalanceItem): SponsorCampaignBalanceItem {
  return {
    ...row,
    kind: SPONSOR_BALANCE_ITEM_KINDS.includes(row.kind) ? row.kind : "in_kind_value",
    enabled: Boolean(row.enabled),
    estimated_amount: row.estimated_amount === null ? null : Number(row.estimated_amount),
    actual_amount: row.actual_amount === null ? null : Number(row.actual_amount),
    status: SPONSOR_BALANCE_ITEM_STATUSES.includes(row.status) ? row.status : "estimated",
    track_in_agenda: Boolean(row.track_in_agenda),
    sort_order: Number(row.sort_order || 100),
    effort_mode: row.effort_mode && SPONSOR_EFFORT_MODES.includes(row.effort_mode) ? row.effort_mode : null,
    estimated_hours: row.estimated_hours === null ? null : Number(row.estimated_hours),
    actual_hours: row.actual_hours === null ? null : Number(row.actual_hours),
    hourly_rate: row.hourly_rate === null ? null : Number(row.hourly_rate),
  };
}

function normalizeCurrency(value: string | null | undefined): SponsorCollaborationCurrency {
  return SPONSOR_COLLABORATION_CURRENCIES.includes(value as SponsorCollaborationCurrency)
    ? (value as SponsorCollaborationCurrency)
    : "USD";
}

function normalizeAgreementType(value: string | null | undefined): SponsorAgreementType | null {
  return SPONSOR_AGREEMENT_TYPES.includes(value as SponsorAgreementType) ? (value as SponsorAgreementType) : null;
}

function normalizeEvaluationResult(value: string | null | undefined): SponsorEvaluationResult {
  return SPONSOR_EVALUATION_RESULTS.includes(value as SponsorEvaluationResult) ? (value as SponsorEvaluationResult) : "not_evaluated";
}

function normalizeMinimumFit(value: string | null | undefined): SponsorMinimumFit {
  return SPONSOR_MINIMUM_FITS.includes(value as SponsorMinimumFit) ? (value as SponsorMinimumFit) : "unknown";
}

function normalizeWouldCollaborateAgain(value: string | null | undefined): SponsorWouldCollaborateAgain | null {
  return SPONSOR_WOULD_COLLABORATE_AGAIN.includes(value as SponsorWouldCollaborateAgain) ? (value as SponsorWouldCollaborateAgain) : null;
}

function normalizeBalanceKind(value: string | null | undefined): SponsorBalanceItemKind {
  return SPONSOR_BALANCE_ITEM_KINDS.includes(value as SponsorBalanceItemKind) ? (value as SponsorBalanceItemKind) : "in_kind_value";
}

function normalizeBalanceStatus(value: string | null | undefined): SponsorBalanceItemStatus {
  return SPONSOR_BALANCE_ITEM_STATUSES.includes(value as SponsorBalanceItemStatus) ? (value as SponsorBalanceItemStatus) : "estimated";
}

function normalizeEffortMode(kind: string | null | undefined, value: string | null | undefined): SponsorEffortMode | null {
  if (kind !== "effort") return null;
  return SPONSOR_EFFORT_MODES.includes(value as SponsorEffortMode) ? (value as SponsorEffortMode) : "project";
}

function cleanCountryCode(value: string | null | undefined) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function emptyCampaignBalance(): SponsorCampaignBalance {
  return {
    estimated_cash: 0,
    actual_cash: 0,
    estimated_in_kind: 0,
    actual_in_kind: 0,
    estimated_costs: 0,
    actual_costs: 0,
    estimated_effort: 0,
    actual_effort: 0,
    estimated_total: 0,
    actual_total: 0,
    estimated_total_with_effort: 0,
    actual_total_with_effort: 0,
  };
}

function calculateCampaignBalance(payments: SponsorCrmPayment[], items: SponsorCampaignBalanceItem[]): SponsorCampaignBalance {
  const balance = emptyCampaignBalance();
  balance.estimated_cash = payments.reduce((sum, payment) => sum + Number(payment.amount_usd || 0), 0);
  balance.actual_cash = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount_usd || 0), 0);

  for (const item of items.filter((entry) => entry.enabled && entry.status !== "not_applicable")) {
    const estimated = Number(item.estimated_amount || 0);
    if (item.kind === "in_kind_value") {
      const actual = Number(item.actual_amount ?? item.estimated_amount ?? 0);
      balance.estimated_in_kind += estimated;
      if (["received", "partial"].includes(item.status)) balance.actual_in_kind += actual;
    }
    if (item.kind === "cost") {
      const actual = Number(item.actual_amount ?? item.estimated_amount ?? 0);
      balance.estimated_costs += estimated;
      if (["confirmed", "paid"].includes(item.status)) balance.actual_costs += actual;
    }
    if (item.kind === "effort") {
      const estimatedEffort =
        item.estimated_amount !== null
          ? estimated
          : item.estimated_hours !== null && item.hourly_rate !== null
            ? Math.round(Number(item.estimated_hours) * Number(item.hourly_rate))
            : estimated;
      const actualEffort =
        item.actual_amount !== null
          ? Number(item.actual_amount)
          : item.actual_hours !== null && item.hourly_rate !== null
            ? Math.round(Number(item.actual_hours) * Number(item.hourly_rate))
            : 0;
      balance.estimated_effort += estimatedEffort;
      balance.actual_effort += actualEffort;
    }
  }

  balance.estimated_total = balance.estimated_cash + balance.estimated_in_kind - balance.estimated_costs;
  balance.actual_total = balance.actual_cash + balance.actual_in_kind - balance.actual_costs;
  balance.estimated_total_with_effort = balance.estimated_total - balance.estimated_effort;
  balance.actual_total_with_effort = balance.actual_total - balance.actual_effort;
  return balance;
}

function calculateBalanceByCurrency(campaigns: SponsorCrmCampaign[]): SponsorBalanceByCurrency[] {
  const rows = new Map<SponsorCollaborationCurrency, SponsorBalanceByCurrency>();
  for (const campaign of campaigns) {
    if (!["active", "delivered", "paid"].includes(campaign.status)) continue;
    const current = rows.get(campaign.currency_code) || {
      currency_code: campaign.currency_code,
      campaign_count: 0,
      ...emptyCampaignBalance(),
    };
    current.campaign_count += 1;
    current.estimated_cash += campaign.balance.estimated_cash;
    current.actual_cash += campaign.balance.actual_cash;
    current.estimated_in_kind += campaign.balance.estimated_in_kind;
    current.actual_in_kind += campaign.balance.actual_in_kind;
    current.estimated_costs += campaign.balance.estimated_costs;
    current.actual_costs += campaign.balance.actual_costs;
    current.estimated_effort += campaign.balance.estimated_effort;
    current.actual_effort += campaign.balance.actual_effort;
    current.estimated_total += campaign.balance.estimated_total;
    current.actual_total += campaign.balance.actual_total;
    current.estimated_total_with_effort += campaign.balance.estimated_total_with_effort;
    current.actual_total_with_effort += campaign.balance.actual_total_with_effort;
    rows.set(campaign.currency_code, current);
  }
  return Array.from(rows.values()).sort((a, b) => a.currency_code.localeCompare(b.currency_code));
}

async function loadBalanceItems(channelId: string, hasBalanceItems: boolean): Promise<SponsorCampaignBalanceItem[]> {
  if (!hasBalanceItems) return [];
  return sql<SponsorCampaignBalanceItem[]>`
    select
      bi.id::text as id,
      bi.campaign_id::text as campaign_id,
      bi.kind,
      bi.item_type,
      bi.label,
      bi.enabled,
      bi.estimated_amount,
      bi.actual_amount,
      bi.status,
      bi.expected_date::text as expected_date,
      bi.track_in_agenda,
      bi.notes,
      bi.sort_order,
      bi.effort_mode,
      bi.estimated_hours,
      bi.actual_hours,
      bi.hourly_rate,
      bi.created_at,
      bi.updated_at
    from public.sponsor_campaign_balance_items bi
    inner join public.sponsor_campaigns c on c.id = bi.campaign_id
    where c.channel_id = ${channelId}
    order by bi.sort_order asc, bi.created_at asc
    limit 800
  `;
}

function groupBy<T>(rows: T[], getKey: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    map.set(key, [...(map.get(key) || []), row]);
  }
  return map;
}

function cleanText(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function roundBudget(value: number) {
  return Math.max(300, Math.round(value / 50) * 50);
}

function nextIsoDate(date: string | null) {
  const base = date ? new Date(`${date}T00:00:00Z`) : new Date();
  if (!Number.isFinite(base.getTime())) return new Date().toISOString().slice(0, 10);
  base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + Math.max(14, Math.min(180, days)));
  return base.toISOString().slice(0, 10);
}

function campaignDurationDays(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 30;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 30;
  return Math.round((end - start) / 86400000);
}

function normalizeEmail(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function maskEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  if (!email) return null;
  const [local, domain] = email.split("@");
  const visibleLocal = local.length <= 2 ? `${local[0] || ""}*` : `${local.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
}

function brandPortalAccessSecret() {
  return String(process.env.BRAND_PORTAL_ACCESS_SECRET || process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || "dev-brand-portal-secret").trim();
}

function signBrandPortalAccessCookie({
  token,
  linkId,
  accessCodeHash,
}: {
  token: string;
  linkId: string;
  accessCodeHash: string;
}) {
  const payload = `${token}.${linkId}.${accessCodeHash}`;
  const signature = createHmac("sha256", brandPortalAccessSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

function isValidBrandPortalAccessCookie({
  cookieValue,
  token,
  linkId,
  accessCodeHash,
}: {
  cookieValue: string | null | undefined;
  token: string;
  linkId: string;
  accessCodeHash: string | null;
}) {
  if (!cookieValue || !accessCodeHash) return false;
  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) return false;
  const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  if (payload !== `${token}.${linkId}.${accessCodeHash}`) return false;
  const expected = createHmac("sha256", brandPortalAccessSecret()).update(payload).digest("base64url");
  return signature === expected;
}

function buildRenewalEmailBody({
  contactName,
  brandName,
  budgetUsd,
  portalUrl,
  accessCode,
}: {
  contactName: string | null;
  brandName: string;
  budgetUsd: number | null;
  portalUrl: string | null;
  accessCode: string | null;
}) {
  return [
    contactName ? `Hola ${contactName},` : "Hola,",
    "",
    `Te comparto una propuesta de renovacion para ${brandName} en TravelYourMap.`,
    budgetUsd ? `Budget sugerido para la nueva etapa: $${budgetUsd} USD.` : "El budget queda abierto para ajustar segun objetivos y destinos.",
    portalUrl ? `Puedes revisar la propuesta y el estado de la campaña en este portal privado: ${portalUrl}` : null,
    accessCode ? `Codigo de acceso: ${accessCode}` : null,
    "",
    "La idea es sostener presencia en el mapa, sumar nuevos contenidos/destinos y mantener reportes de resultados para la marca.",
    "",
    "Quedo atento/a para avanzar.",
  ].filter(Boolean).join("\n");
}

async function sendRenewalEmail({
  to,
  subject,
  body,
  brandName,
  portalUrl,
  accessCode,
}: {
  to: string;
  subject: string;
  body: string;
  brandName: string;
  portalUrl: string | null;
  accessCode: string | null;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.REPORT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey || !from) {
    return {
      sent: false,
      error: "Email transaccional no configurado. Define RESEND_API_KEY y REPORT_EMAIL_FROM; se preparo un mailto como fallback.",
    };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">Propuesta de renovacion - ${escapeHtml(brandName)}</h1>
      <p>${escapeHtml(body).replaceAll("\n", "<br />")}</p>
      ${accessCode ? `<p style="font-size:16px;font-weight:700">Codigo de acceso: ${escapeHtml(accessCode)}</p>` : ""}
      ${portalUrl ? `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700">Abrir portal privado</a></p>` : ""}
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text: body, html }),
  });
  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    return {
      sent: false,
      error: `Resend no pudo enviar la renovacion (${response.status}). ${responseBody.slice(0, 180)}`.trim(),
    };
  }

  return { sent: true, error: null };
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
