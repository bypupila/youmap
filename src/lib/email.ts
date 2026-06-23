import "server-only";

import { Resend } from "resend";
import { APP_EMAILS, type AppEmailKey } from "@/lib/app-emails";

const allowedSenderEmails = new Set(Object.values(APP_EMAILS));
const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const appBaseUrl = resolveAppBaseUrl();

export interface AppEmailMessage {
  subject: string;
  text: string;
  html: string;
}

export interface SendAppEmailInput extends AppEmailMessage {
  from: AppEmailKey;
  to: string | string[];
  replyTo?: string | string[] | undefined;
}

export interface SendAppEmailResult {
  sent: boolean;
  error: string | null;
  id: string | null;
}

export function resolveAppUrl(pathname: string) {
  return new URL(pathname, appBaseUrl).toString();
}

export function buildMailto(email: string, subject?: string, body?: string) {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) return null;
  const query = new URLSearchParams();
  if (subject) query.set("subject", subject);
  if (body) query.set("body", body);
  const suffix = query.toString();
  return `mailto:${encodeURIComponent(normalizedEmail)}${suffix ? `?${suffix}` : ""}`;
}

export function appEmailAddress(key: AppEmailKey) {
  return APP_EMAILS[key];
}

export function appEmailFrom(key: AppEmailKey) {
  return `BY PUPILA <${APP_EMAILS[key]}>`;
}

export async function sendAppEmail(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const senderEmail = APP_EMAILS[input.from];
  if (!allowedSenderEmails.has(senderEmail)) {
    return {
      sent: false,
      error: `Remitente no permitido: ${senderEmail}`,
      id: null,
    };
  }

  if (!resendClient) {
    return {
      sent: false,
      error: "Resend no está configurado. Define RESEND_API_KEY en Vercel o en .env.local.",
      id: null,
    };
  }

  const response = await resendClient.emails.send({
    from: appEmailFrom(input.from),
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (response.error) {
    return {
      sent: false,
      error: response.error.message || "Resend no pudo enviar el email.",
      id: null,
    };
  }

  return {
    sent: true,
    error: null,
    id: response.data?.id || null,
  };
}

export function buildSimpleEmailMessage(input: {
  preview: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; href: string } | null;
  closing?: string | null;
}) : AppEmailMessage {
  const text = [
    input.title,
    "",
    ...input.paragraphs,
    input.cta ? `${input.cta.label}: ${input.cta.href}` : null,
    input.closing || null,
  ].filter(Boolean).join("\n\n");

  const htmlParagraphs = input.paragraphs
    .map((paragraph) => `<p style="margin:0 0 14px">${escapeHtml(paragraph)}</p>`)
    .join("");
  const htmlCta = input.cta
    ? `<p style="margin:18px 0 0"><a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(input.cta.label)}</a></p>`
    : "";
  const htmlClosing = input.closing ? `<p style="margin:18px 0 0">${escapeHtml(input.closing)}</p>` : "";

  return {
    subject: input.title,
    text,
    html: renderHtmlEmail({
      preview: input.preview,
      title: input.title,
      content: `${htmlParagraphs}${htmlCta}${htmlClosing}`,
    }),
  };
}

export function buildWelcomeEmail(input: {
  displayName: string;
  role: "creator" | "viewer";
}) {
  const dashboardUrl = resolveAppUrl(input.role === "creator" ? "/dashboard" : "/");
  const title = input.role === "creator"
    ? "Bienvenido a TravelYourMap"
    : "Tu cuenta viewer está lista";
  const preview = input.role === "creator"
    ? "Activa tu mapa, revisa el dashboard y empieza a publicar tu presencia."
    : "Ya puedes entrar al mapa, votar y guardar contenido.";
  return buildSimpleEmailMessage({
    preview,
    title,
    paragraphs: input.role === "creator"
      ? [
          `Hola ${input.displayName},`,
          "Tu cuenta creator ya quedó registrada. Desde aquí puedes importar tu canal, revisar tu mapa y continuar con el onboarding comercial.",
          `Si necesitas ayuda técnica, escribe a ${APP_EMAILS.support}.`,
        ]
      : [
          `Hola ${input.displayName},`,
          "Tu cuenta viewer ya quedó registrada. Ya puedes entrar al mapa, votar, guardar y seguir contenido.",
          `Si necesitas ayuda o detectas un problema de acceso, escribe a ${APP_EMAILS.support}.`,
        ],
    cta: {
      label: input.role === "creator" ? "Abrir dashboard" : "Entrar al mapa",
      href: dashboardUrl,
    },
    closing: "BY PUPILA",
  });
}

export function buildSponsorInquiryNotificationEmail(input: {
  brandName: string;
  contactName: string;
  contactEmail: string;
  proposedBudgetUsd: number | null;
  brief: string;
  mapUrl: string | null;
}) {
  return buildSimpleEmailMessage({
    preview: `Nueva solicitud comercial para ${input.brandName}`,
    title: `Nueva solicitud comercial - ${input.brandName}`,
    paragraphs: [
      `Marca: ${input.brandName}`,
      `Contacto: ${input.contactName} <${input.contactEmail}>`,
      input.proposedBudgetUsd ? `Budget propuesto: USD ${formatMoney(input.proposedBudgetUsd)}` : "Budget propuesto: no informado",
      `Brief: ${input.brief}`,
      input.mapUrl ? `Mapa: ${input.mapUrl}` : null,
    ].filter((value): value is string => Boolean(value)),
    cta: input.mapUrl
      ? {
          label: "Abrir mapa",
          href: input.mapUrl,
        }
      : null,
    closing: `Responder directamente a ${input.contactEmail}.`,
  });
}

export function buildSponsorInquiryReceiptEmail(input: {
  brandName: string;
  contactName: string;
  creatorName: string;
  mapUrl: string | null;
}) {
  return buildSimpleEmailMessage({
    preview: `Recibimos tu solicitud para ${input.brandName}`,
    title: `Recibimos tu solicitud - ${input.brandName}`,
    paragraphs: [
      `Hola ${input.contactName},`,
      `Ya recibimos tu solicitud comercial para ${input.brandName} en TravelYourMap.`,
      `El equipo de ${input.creatorName} la revisará y responderá por esta misma vía.`,
      input.mapUrl ? `Mapa de referencia: ${input.mapUrl}` : null,
      `Si necesitas soporte, escribe a ${APP_EMAILS.support}.`,
    ].filter((value): value is string => Boolean(value)),
    cta: input.mapUrl
      ? {
          label: "Ver mapa",
          href: input.mapUrl,
        }
      : null,
    closing: `BY PUPILA · ${APP_EMAILS.hello}`,
  });
}

export function buildBrandPortalAccessEmail(input: {
  brandName: string;
  contactName: string | null;
  portalUrl: string;
  accessCode: string | null;
}) {
  return buildSimpleEmailMessage({
    preview: `Acceso al portal privado de ${input.brandName}`,
    title: `Acceso al portal privado - ${input.brandName}`,
    paragraphs: [
      input.contactName ? `Hola ${input.contactName},` : "Hola,",
      `Ya está listo el portal privado de ${input.brandName}.`,
      input.accessCode ? `Tu código de acceso es ${input.accessCode}.` : null,
      `Portal privado: ${input.portalUrl}`,
      `Si necesitas ayuda, escribe a ${APP_EMAILS.support}.`,
    ].filter((value): value is string => Boolean(value)),
    cta: {
      label: "Abrir portal",
      href: input.portalUrl,
    },
    closing: `BY PUPILA · ${APP_EMAILS.support}`,
  });
}

export function buildCampaignRenewalEmail(input: {
  contactName: string | null;
  brandName: string;
  budgetUsd: number | null;
  portalUrl: string | null;
  accessCode: string | null;
}) {
  return buildSimpleEmailMessage({
    preview: `Propuesta de renovación para ${input.brandName}`,
    title: `Propuesta de renovación - ${input.brandName}`,
    paragraphs: [
      input.contactName ? `Hola ${input.contactName},` : "Hola,",
      `Te comparto una propuesta de renovación para ${input.brandName} en TravelYourMap.`,
      input.budgetUsd ? `Budget sugerido para la nueva etapa: USD ${formatMoney(input.budgetUsd)}.` : "El budget queda abierto para ajustar según objetivos y destinos.",
      input.portalUrl ? `Puedes revisar la propuesta y el estado de la campaña en el portal privado.` : null,
      input.accessCode ? `Código de acceso: ${input.accessCode}` : null,
      "La idea es sostener presencia en el mapa, sumar nuevos contenidos/destinos y mantener reportes de resultados para la marca.",
      `Si quieres responder o pedir soporte, escribe a ${APP_EMAILS.marketing} o ${APP_EMAILS.support}.`,
    ].filter((value): value is string => Boolean(value)),
    cta: input.portalUrl
      ? {
          label: "Abrir portal privado",
          href: input.portalUrl,
        }
      : null,
    closing: `BY PUPILA · ${APP_EMAILS.marketing}`,
  });
}

export function buildSponsorReportEmail(input: {
  sponsorName: string;
  publicUrl: string;
}) {
  return buildSimpleEmailMessage({
    preview: `Reporte privado de ${input.sponsorName}`,
    title: `Reporte de resultados - ${input.sponsorName}`,
    paragraphs: [
      "Hola,",
      `Te compartimos el reporte privado de resultados de ${input.sponsorName} en TravelYourMap.`,
      "Incluye clicks, actividad en el mapa, videos destacados, países principales y contexto importado desde YouTube.",
      `Si necesitas soporte técnico sobre el envío, escribe a ${APP_EMAILS.support}.`,
    ],
    cta: {
      label: "Abrir reporte privado",
      href: input.publicUrl,
    },
    closing: `BY PUPILA · ${APP_EMAILS.marketing}`,
  });
}

function renderHtmlEmail(input: { preview: string; title: string; content: string }) {
  return `<!doctype html>
  <html lang="es">
    <body style="margin:0;background:#f6f7f2;color:#111827;font-family:Arial,Helvetica,sans-serif">
      <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(input.preview)}</span>
      <div style="padding:32px 16px">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
          <p style="margin:0 0 10px;text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#ff5a3d;font-weight:700">BY PUPILA</p>
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.15">${escapeHtml(input.title)}</h1>
          ${input.content}
        </div>
      </div>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveAppBaseUrl() {
  const raw = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value || 0);
}
