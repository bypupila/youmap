import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getRequestHashesFromHeaders,
  isPublicMapPath,
  recordMapEvent,
  requestUserOwnsChannel,
  resolvePathFromRequest,
  resolveReferrerFromRequest,
} from "@/lib/map-events";
import {
  buildSponsorInquiryNotificationEmail,
  buildSponsorInquiryReceiptEmail,
  sendAppEmail,
} from "@/lib/email";
import { APP_EMAILS } from "@/lib/app-emails";
import { sql } from "@/lib/neon";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";

const payloadSchema = z.object({
  channelId: z.string().uuid(),
  brandName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(180),
  websiteUrl: z.string().trim().max(240).optional().or(z.literal("")).transform((value) => value || null).refine((value) => !value || isValidUrl(value), {
    message: "websiteUrl must be a valid URL",
  }),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")).transform((value) => value || null),
  proposedBudgetUsd: z.number().int().positive().max(100000000).optional().nullable(),
  brief: z.string().trim().min(20).max(1200),
  mapUrl: z.string().trim().max(280).optional().or(z.literal("")).transform((value) => value || null).refine((value) => !value || isValidUrl(value), {
    message: "mapUrl must be a valid URL",
  }),
});

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRequestRateLimit({
      request,
      scope: "api:sponsors-inquiry",
      windowMinutes: 30,
      maxAttempts: 5,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Reintenta en unos minutos." },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
        }
      );
    }

    const payload = payloadSchema.parse(await request.json());

    const channelRows = await sql<Array<{ id: string; user_id: string; channel_name: string | null }>>`
      select id, user_id, channel_name
      from public.channels
      where id = ${payload.channelId}
      limit 1
    `;

    const channel = channelRows[0];
    if (!channel?.id) {
      return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
    }
    const creatorName = channel.channel_name || "TravelYourMap creator";

    const requestHashes = getRequestHashesFromHeaders(request.headers);

    await sql`
      insert into public.sponsor_inquiries (
        channel_id,
        creator_user_id,
        brand_name,
        contact_name,
        contact_email,
        website_url,
        whatsapp,
        proposed_budget_usd,
        brief,
        map_url,
        ip_hash,
        user_agent_hash
      )
      values (
        ${payload.channelId},
        ${channel.user_id},
        ${payload.brandName},
        ${payload.contactName},
        ${payload.contactEmail},
        ${payload.websiteUrl},
        ${payload.whatsapp},
        ${payload.proposedBudgetUsd || null},
        ${payload.brief},
        ${payload.mapUrl},
        ${requestHashes.ipHash},
        ${requestHashes.userAgentHash}
      )
    `;

    const adminEmail = buildSponsorInquiryNotificationEmail({
      brandName: payload.brandName,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      proposedBudgetUsd: payload.proposedBudgetUsd || null,
      brief: payload.brief,
      mapUrl: payload.mapUrl,
    });
    const receiptEmail = buildSponsorInquiryReceiptEmail({
      brandName: payload.brandName,
      contactName: payload.contactName,
      creatorName,
      mapUrl: payload.mapUrl,
    });

    const [adminResult, receiptResult] = await Promise.all([
      sendAppEmail({
        from: "admin",
        to: APP_EMAILS.admin,
        replyTo: payload.contactEmail,
        subject: adminEmail.subject,
        text: adminEmail.text,
        html: adminEmail.html,
      }),
      sendAppEmail({
        from: "noreply",
        to: payload.contactEmail,
        subject: receiptEmail.subject,
        text: receiptEmail.text,
        html: receiptEmail.html,
      }),
    ]);
    if (!adminResult.sent || !receiptResult.sent) {
      console.warn("[api/sponsors/inquiry] email delivery issue", {
        adminError: adminResult.error,
        receiptError: receiptResult.error,
      });
    }

    const path = resolvePathFromRequest(request, payload.mapUrl);
    if (isPublicMapPath(path) && !(await requestUserOwnsChannel(request, payload.channelId))) {
      try {
        await recordMapEvent({
          channelId: payload.channelId,
          eventType: "inquiry_submit",
          viewerMode: "viewer",
          path,
          referrer: resolveReferrerFromRequest(request, null),
          ipHash: requestHashes.ipHash,
          userAgentHash: requestHashes.userAgentHash,
          metadata: {
            brand_name: payload.brandName,
            proposed_budget_usd: payload.proposedBudgetUsd || null,
          },
        });
      } catch (eventError) {
        console.warn("[api/sponsors/inquiry] map event skipped", eventError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/sponsors/inquiry]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos invalidos", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "No se pudo registrar la solicitud" }, { status: 500 });
  }
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
