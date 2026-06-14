import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCreatorActivity, requireCreatorChannelAccess } from "@/lib/creator-admin-actions";
import { getValidSessionUserFromRequest } from "@/lib/current-user";
import { isDemoChannelId } from "@/lib/demo-data";
import {
  SPONSOR_CAMPAIGN_STATUSES,
  SPONSOR_AGREEMENT_TYPES,
  SPONSOR_BALANCE_ITEM_KINDS,
  SPONSOR_BALANCE_ITEM_STATUSES,
  SPONSOR_DELIVERABLE_STATUSES,
  SPONSOR_DELIVERABLE_TYPES,
  SPONSOR_EFFORT_MODES,
  SPONSOR_EVALUATION_RESULTS,
  SPONSOR_MINIMUM_FITS,
  SPONSOR_PAYMENT_STATUSES,
  SPONSOR_COLLABORATION_CURRENCIES,
  SPONSOR_WOULD_COLLABORATE_AGAIN,
  createBalanceItem,
  createCampaign,
  createCampaignFromInquiry,
  createCampaignRenewal,
  createCampaignRenewalWithEmail,
  createBrandPortalLink,
  createCollaboration,
  createCollaborationFromInquiry,
  createDeliverable,
  createPayment,
  loadSponsorCrm,
  revokeBrandPortalLink,
  updateBalanceItem,
  updateCampaign,
  updateDeliverable,
  updateInquiryStatus,
  updatePayment,
} from "@/lib/sponsor-crm";
import { SPONSOR_INQUIRY_STATUSES } from "@/lib/sponsor-inquiries";

export const dynamic = "force-dynamic";

const channelQuerySchema = z.object({
  channelId: z.string().uuid(),
});

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

const optionalDate = z.string().date().optional().nullable();
const optionalText = (max = 1200) => z.string().trim().max(max).optional().nullable();
const collaborationFields = {
  contactName: optionalText(120),
  contactEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  currencyCode: z.enum(SPONSOR_COLLABORATION_CURRENCIES).default("USD"),
  agreementType: z.enum(SPONSOR_AGREEMENT_TYPES),
  agreementTypeOther: optionalText(120),
  includesPayment: z.boolean().optional(),
  includesBarter: z.boolean().optional(),
  includesAffiliate: z.boolean().optional(),
  includesDiscountCode: z.boolean().optional(),
  includesMapPresence: z.boolean().optional(),
  includesBrandReport: z.boolean().optional(),
  requiresExclusivity: z.boolean().optional(),
  requiresPreapproval: z.boolean().optional(),
  requiresTravel: z.boolean().optional(),
  evaluationResult: z.enum(SPONSOR_EVALUATION_RESULTS).default("not_evaluated"),
  minimumAmount: z.number().int().nonnegative().max(100000000).optional().nullable(),
  acceptsBarter: z.boolean().optional().nullable(),
  minimumRequiresPayment: z.boolean().optional(),
  minimumRequiresAccommodation: z.boolean().optional(),
  minimumRequiresTransport: z.boolean().optional(),
  minimumRequiresCreativeFreedom: z.boolean().optional(),
  minimumRequiresNoPreapproval: z.boolean().optional(),
  minimumRequiresClearDates: z.boolean().optional(),
  minimumRequiresLinkOrCoupon: z.boolean().optional(),
  minimumConditionsNotes: optionalText(800),
  minimumFit: z.enum(SPONSOR_MINIMUM_FITS).default("unknown"),
  acceptanceOverrideNote: optionalText(800),
  countryCode: z.string().trim().max(2).optional().or(z.literal("")).nullable(),
  destinationLabel: optionalText(160),
  finalLearningNote: optionalText(900),
  wouldCollaborateAgain: z.enum(SPONSOR_WOULD_COLLABORATE_AGAIN).optional().nullable(),
};

const balanceItemFields = {
  kind: z.enum(SPONSOR_BALANCE_ITEM_KINDS),
  itemType: z.string().trim().min(1).max(80),
  label: z.string().trim().min(2).max(120),
  estimatedAmount: z.number().int().nonnegative().max(100000000).optional().nullable(),
  actualAmount: z.number().int().nonnegative().max(100000000).optional().nullable(),
  status: z.enum(SPONSOR_BALANCE_ITEM_STATUSES).default("estimated"),
  expectedDate: optionalDate,
  trackInAgenda: z.boolean().optional(),
  notes: optionalText(600),
  sortOrder: z.number().int().min(0).max(10000).optional().nullable(),
  effortMode: z.enum(SPONSOR_EFFORT_MODES).optional().nullable(),
  estimatedHours: z.number().nonnegative().max(100000).optional().nullable(),
  actualHours: z.number().nonnegative().max(100000).optional().nullable(),
  hourlyRate: z.number().int().nonnegative().max(100000000).optional().nullable(),
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_inquiry"),
    channelId: z.string().uuid(),
    inquiryId: z.string().uuid(),
    status: z.enum(SPONSOR_INQUIRY_STATUSES),
  }),
  z.object({
    action: z.literal("create_campaign_from_inquiry"),
    channelId: z.string().uuid(),
    inquiryId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_collaboration_from_inquiry"),
    channelId: z.string().uuid(),
    inquiryId: z.string().uuid(),
    agreementType: z.enum(SPONSOR_AGREEMENT_TYPES).default("paid_sponsor"),
  }),
  z.object({
    action: z.literal("create_campaign"),
    channelId: z.string().uuid(),
    title: z.string().trim().min(2).max(140),
    brandName: z.string().trim().min(2).max(120),
    budgetUsd: z.number().int().positive().max(100000000).optional().nullable(),
    startDate: z.string().date().optional().nullable(),
    endDate: z.string().date().optional().nullable(),
    objective: z.string().trim().max(1200).optional().nullable(),
    internalNotes: z.string().trim().max(1200).optional().nullable(),
  }),
  z.object({
    action: z.literal("create_collaboration"),
    channelId: z.string().uuid(),
    title: z.string().trim().min(2).max(140),
    brandName: z.string().trim().min(2).max(120),
    budgetUsd: z.number().int().positive().max(100000000).optional().nullable(),
    startDate: optionalDate,
    endDate: optionalDate,
    objective: optionalText(1200),
    ...collaborationFields,
  }),
  z.object({
    action: z.literal("update_campaign_collaboration"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
    title: z.string().trim().min(2).max(140).optional(),
    brandName: z.string().trim().min(2).max(120).optional(),
    budgetUsd: z.number().int().positive().max(100000000).optional().nullable(),
    startDate: optionalDate,
    endDate: optionalDate,
    objective: optionalText(1200),
    internalNotes: optionalText(1200),
    ...collaborationFields,
  }),
  z.object({
    action: z.literal("update_campaign_status"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
    status: z.enum(SPONSOR_CAMPAIGN_STATUSES),
  }),
  z.object({
    action: z.literal("create_campaign_renewal"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_campaign_renewal_email"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_deliverable"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
    title: z.string().trim().min(2).max(160),
    deliverableType: z.enum(SPONSOR_DELIVERABLE_TYPES).default("video"),
    dueDate: z.string().date().optional().nullable(),
  }),
  z.object({
    action: z.literal("update_deliverable"),
    channelId: z.string().uuid(),
    deliverableId: z.string().uuid(),
    status: z.enum(SPONSOR_DELIVERABLE_STATUSES),
    publicUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
  }),
  z.object({
    action: z.literal("create_payment"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
    label: z.string().trim().min(2).max(100).default("Pago"),
    amountUsd: z.number().int().positive().max(100000000),
    dueDate: z.string().date().optional().nullable(),
  }),
  z.object({
    action: z.literal("update_payment"),
    channelId: z.string().uuid(),
    paymentId: z.string().uuid(),
    status: z.enum(SPONSOR_PAYMENT_STATUSES),
  }),
  z.object({
    action: z.literal("create_balance_item"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
    ...balanceItemFields,
  }),
  z.object({
    action: z.literal("update_balance_item"),
    channelId: z.string().uuid(),
    balanceItemId: z.string().uuid(),
    kind: z.enum(SPONSOR_BALANCE_ITEM_KINDS).optional(),
    itemType: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(2).max(120).optional(),
    enabled: z.boolean().optional(),
    estimatedAmount: z.number().int().nonnegative().max(100000000).optional().nullable(),
    actualAmount: z.number().int().nonnegative().max(100000000).optional().nullable(),
    status: z.enum(SPONSOR_BALANCE_ITEM_STATUSES).optional(),
    expectedDate: optionalDate,
    trackInAgenda: z.boolean().optional(),
    notes: optionalText(600),
    sortOrder: z.number().int().min(0).max(10000).optional().nullable(),
    effortMode: z.enum(SPONSOR_EFFORT_MODES).optional().nullable(),
    estimatedHours: z.number().nonnegative().max(100000).optional().nullable(),
    actualHours: z.number().nonnegative().max(100000).optional().nullable(),
    hourlyRate: z.number().int().nonnegative().max(100000000).optional().nullable(),
  }),
  z.object({
    action: z.literal("create_brand_portal"),
    channelId: z.string().uuid(),
    campaignId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("revoke_brand_portal"),
    channelId: z.string().uuid(),
    portalId: z.string().uuid(),
  }),
]);

export async function GET(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = channelQuerySchema.safeParse({
      channelId: new URL(request.url).searchParams.get("channelId") || "",
    });
    if (!parsed.success) return NextResponse.json({ error: "channelId is required" }, { status: 400 });

    const access = await requireCreatorChannelAccess(parsed.data.channelId, sessionUser.id);
    if (!access) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    const crm = await loadSponsorCrm(parsed.data.channelId);
    return NextResponse.json({ crm });
  } catch (error) {
    console.error("[api/creator/sponsor-crm GET]", error);
    return NextResponse.json({ error: "Could not load sponsor CRM" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getValidSessionUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = actionSchema.parse(await request.json());
    if (isDemoChannelId(payload.channelId)) {
      return NextResponse.json({ error: "Modo demo: esta operación no persiste cambios." }, { status: 400 });
    }
    const access = await requireCreatorChannelAccess(payload.channelId, sessionUser.id);
    if (!access?.ownerUserId) return NextResponse.json({ error: "Channel not found for this user" }, { status: 404 });

    let entityId: string | null = null;
    let activity: string = payload.action;

    if (payload.action === "update_inquiry") {
      const updated = await updateInquiryStatus({
        channelId: payload.channelId,
        inquiryId: payload.inquiryId,
        status: payload.status,
      });
      if (!updated) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
      entityId = payload.inquiryId;
      activity = `inquiry_${payload.status}`;
    }

    if (payload.action === "create_campaign_from_inquiry") {
      entityId = await createCampaignFromInquiry({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        inquiryId: payload.inquiryId,
      });
      if (!entityId) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    if (payload.action === "create_collaboration_from_inquiry") {
      entityId = await createCollaborationFromInquiry({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        inquiryId: payload.inquiryId,
        agreementType: payload.agreementType,
      });
      if (!entityId) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    if (payload.action === "create_campaign") {
      entityId = await createCampaign({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        title: payload.title,
        brandName: payload.brandName,
        budgetUsd: payload.budgetUsd,
        startDate: payload.startDate,
        endDate: payload.endDate,
        objective: payload.objective,
        internalNotes: payload.internalNotes,
      });
    }

    if (payload.action === "create_collaboration") {
      entityId = await createCollaboration({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        title: payload.title,
        brandName: payload.brandName,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        budgetUsd: payload.budgetUsd,
        currencyCode: payload.currencyCode,
        agreementType: payload.agreementType,
        agreementTypeOther: payload.agreementTypeOther,
        includesPayment: payload.includesPayment,
        includesBarter: payload.includesBarter,
        includesAffiliate: payload.includesAffiliate,
        includesDiscountCode: payload.includesDiscountCode,
        includesMapPresence: payload.includesMapPresence,
        includesBrandReport: payload.includesBrandReport,
        requiresExclusivity: payload.requiresExclusivity,
        requiresPreapproval: payload.requiresPreapproval,
        requiresTravel: payload.requiresTravel,
        evaluationResult: payload.evaluationResult,
        minimumAmount: payload.minimumAmount,
        acceptsBarter: payload.acceptsBarter,
        minimumRequiresPayment: payload.minimumRequiresPayment,
        minimumRequiresAccommodation: payload.minimumRequiresAccommodation,
        minimumRequiresTransport: payload.minimumRequiresTransport,
        minimumRequiresCreativeFreedom: payload.minimumRequiresCreativeFreedom,
        minimumRequiresNoPreapproval: payload.minimumRequiresNoPreapproval,
        minimumRequiresClearDates: payload.minimumRequiresClearDates,
        minimumRequiresLinkOrCoupon: payload.minimumRequiresLinkOrCoupon,
        minimumConditionsNotes: payload.minimumConditionsNotes,
        minimumFit: payload.minimumFit,
        acceptanceOverrideNote: payload.acceptanceOverrideNote,
        countryCode: payload.countryCode,
        destinationLabel: payload.destinationLabel,
        finalLearningNote: payload.finalLearningNote,
        wouldCollaborateAgain: payload.wouldCollaborateAgain,
        startDate: payload.startDate,
        endDate: payload.endDate,
        objective: payload.objective,
      });
    }

    if (payload.action === "update_campaign_collaboration") {
      const ok = await updateCampaign({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        title: payload.title,
        brandName: payload.brandName,
        budgetUsd: payload.budgetUsd,
        startDate: payload.startDate,
        endDate: payload.endDate,
        objective: payload.objective,
        internalNotes: payload.internalNotes,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        currencyCode: payload.currencyCode,
        agreementType: payload.agreementType,
        agreementTypeOther: payload.agreementTypeOther,
        includesPayment: payload.includesPayment,
        includesBarter: payload.includesBarter,
        includesAffiliate: payload.includesAffiliate,
        includesDiscountCode: payload.includesDiscountCode,
        includesMapPresence: payload.includesMapPresence,
        includesBrandReport: payload.includesBrandReport,
        requiresExclusivity: payload.requiresExclusivity,
        requiresPreapproval: payload.requiresPreapproval,
        requiresTravel: payload.requiresTravel,
        evaluationResult: payload.evaluationResult,
        minimumAmount: payload.minimumAmount,
        acceptsBarter: payload.acceptsBarter,
        minimumRequiresPayment: payload.minimumRequiresPayment,
        minimumRequiresAccommodation: payload.minimumRequiresAccommodation,
        minimumRequiresTransport: payload.minimumRequiresTransport,
        minimumRequiresCreativeFreedom: payload.minimumRequiresCreativeFreedom,
        minimumRequiresNoPreapproval: payload.minimumRequiresNoPreapproval,
        minimumRequiresClearDates: payload.minimumRequiresClearDates,
        minimumRequiresLinkOrCoupon: payload.minimumRequiresLinkOrCoupon,
        minimumConditionsNotes: payload.minimumConditionsNotes,
        minimumFit: payload.minimumFit,
        acceptanceOverrideNote: payload.acceptanceOverrideNote,
        countryCode: payload.countryCode,
        destinationLabel: payload.destinationLabel,
        finalLearningNote: payload.finalLearningNote,
        wouldCollaborateAgain: payload.wouldCollaborateAgain,
      });
      if (!ok) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      entityId = payload.campaignId;
    }

    if (payload.action === "update_campaign_status") {
      const ok = await updateCampaign({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        status: payload.status,
      });
      if (!ok) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      entityId = payload.campaignId;
    }

    if (payload.action === "create_campaign_renewal") {
      entityId = await createCampaignRenewal({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        campaignId: payload.campaignId,
      });
      if (!entityId) return NextResponse.json({ error: "Campaign not found or not ready for renewal" }, { status: 404 });
    }

    let actionResult: unknown = null;
    if (payload.action === "create_campaign_renewal_email") {
      const result = await createCampaignRenewalWithEmail({
        channelId: payload.channelId,
        creatorUserId: access.ownerUserId,
        campaignId: payload.campaignId,
        origin: requestOrigin(request),
      });
      if (!result) return NextResponse.json({ error: "Campaign not found or not ready for renewal" }, { status: 404 });
      entityId = result.renewal_campaign_id;
      actionResult = result;
    }

    if (payload.action === "create_deliverable") {
      entityId = await createDeliverable({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        title: payload.title,
        deliverableType: payload.deliverableType,
        dueDate: payload.dueDate,
      });
      if (!entityId) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (payload.action === "update_deliverable") {
      const ok = await updateDeliverable({
        channelId: payload.channelId,
        deliverableId: payload.deliverableId,
        status: payload.status,
        publicUrl: payload.publicUrl,
      });
      if (!ok) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
      entityId = payload.deliverableId;
    }

    if (payload.action === "create_payment") {
      entityId = await createPayment({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        label: payload.label,
        amountUsd: payload.amountUsd,
        dueDate: payload.dueDate,
      });
      if (!entityId) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (payload.action === "update_payment") {
      const ok = await updatePayment({
        channelId: payload.channelId,
        paymentId: payload.paymentId,
        status: payload.status,
      });
      if (!ok) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      entityId = payload.paymentId;
    }

    if (payload.action === "create_balance_item") {
      entityId = await createBalanceItem({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        kind: payload.kind,
        itemType: payload.itemType,
        label: payload.label,
        estimatedAmount: payload.estimatedAmount,
        actualAmount: payload.actualAmount,
        status: payload.status,
        expectedDate: payload.expectedDate,
        trackInAgenda: payload.trackInAgenda,
        notes: payload.notes,
        sortOrder: payload.sortOrder,
        effortMode: payload.effortMode,
        estimatedHours: payload.estimatedHours,
        actualHours: payload.actualHours,
        hourlyRate: payload.hourlyRate,
      });
      if (!entityId) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (payload.action === "update_balance_item") {
      const ok = await updateBalanceItem({
        channelId: payload.channelId,
        balanceItemId: payload.balanceItemId,
        kind: payload.kind,
        itemType: payload.itemType,
        label: payload.label,
        enabled: payload.enabled,
        estimatedAmount: payload.estimatedAmount,
        actualAmount: payload.actualAmount,
        status: payload.status,
        expectedDate: payload.expectedDate,
        trackInAgenda: payload.trackInAgenda,
        notes: payload.notes,
        sortOrder: payload.sortOrder,
        effortMode: payload.effortMode,
        estimatedHours: payload.estimatedHours,
        actualHours: payload.actualHours,
        hourlyRate: payload.hourlyRate,
      });
      if (!ok) return NextResponse.json({ error: "Balance item not found" }, { status: 404 });
      entityId = payload.balanceItemId;
    }

    if (payload.action === "create_brand_portal") {
      const result = await createBrandPortalLink({
        channelId: payload.channelId,
        campaignId: payload.campaignId,
        createdByUserId: sessionUser.id,
      });
      if (!result) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      entityId = result.id;
      actionResult = result;
    }

    if (payload.action === "revoke_brand_portal") {
      const ok = await revokeBrandPortalLink({
        channelId: payload.channelId,
        portalId: payload.portalId,
      });
      if (!ok) return NextResponse.json({ error: "Brand portal not found" }, { status: 404 });
      entityId = payload.portalId;
    }

    await recordCreatorActivity({
      channelId: payload.channelId,
      actorUserId: sessionUser.id,
      eventType: `sponsor_crm_${payload.action}`,
      entityType: "sponsor",
      entityId,
      description: `${sessionUser.username} actualizo el CRM comercial`,
      metadata: { action: activity },
    });

    const crm = await loadSponsorCrm(payload.channelId);
    return NextResponse.json({ ok: true, crm, result: actionResult });
  } catch (error) {
    console.error("[api/creator/sponsor-crm POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid sponsor CRM payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update sponsor CRM" },
      { status: 400 }
    );
  }
}
