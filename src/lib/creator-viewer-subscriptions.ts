import { sql } from "@/lib/neon";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export type CreatorViewerSubscriptionSource =
  | "creator_map"
  | "viewer_register"
  | "viewer_login"
  | "manual_import";

interface UpsertCreatorViewerSubscriptionInput {
  channelId?: string | null;
  viewerUserId: string;
  source: CreatorViewerSubscriptionSource;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export function normalizeAttributionChannelId(value?: string | null) {
  const normalized = String(value || "").trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeOptionalText(value?: string | null, maxLength = 160) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function upsertCreatorViewerSubscription({
  channelId,
  viewerUserId,
  source,
  utmSource,
  utmMedium,
  utmCampaign,
}: UpsertCreatorViewerSubscriptionInput) {
  const normalizedChannelId = normalizeAttributionChannelId(channelId);
  if (!normalizedChannelId || !normalizeAttributionChannelId(viewerUserId)) return null;

  const channelRows = await sql<Array<{ user_id: string }>>`
    select user_id
    from public.channels
    where id = ${normalizedChannelId}
      and is_public = true
    limit 1
  `;
  const creatorUserId = channelRows[0]?.user_id || null;
  if (!creatorUserId || creatorUserId === viewerUserId) return null;

  const rows = await sql<Array<{ id: string }>>`
    insert into public.creator_viewer_subscriptions (
      channel_id,
      creator_user_id,
      viewer_user_id,
      source,
      registration_utm_source,
      registration_utm_medium,
      registration_utm_campaign,
      subscribed_at,
      unsubscribed_at,
      updated_at
    )
    values (
      ${normalizedChannelId},
      ${creatorUserId},
      ${viewerUserId},
      ${source},
      ${normalizeOptionalText(utmSource, 120)},
      ${normalizeOptionalText(utmMedium, 120)},
      ${normalizeOptionalText(utmCampaign, 160)},
      now(),
      null,
      now()
    )
    on conflict (channel_id, viewer_user_id)
    do update set
      source = excluded.source,
      creator_user_id = excluded.creator_user_id,
      registration_utm_source = coalesce(excluded.registration_utm_source, public.creator_viewer_subscriptions.registration_utm_source),
      registration_utm_medium = coalesce(excluded.registration_utm_medium, public.creator_viewer_subscriptions.registration_utm_medium),
      registration_utm_campaign = coalesce(excluded.registration_utm_campaign, public.creator_viewer_subscriptions.registration_utm_campaign),
      unsubscribed_at = null,
      updated_at = excluded.updated_at
    returning id
  `;

  return rows[0]?.id || null;
}
