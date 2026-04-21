import { normalizeUsername } from "@/lib/auth-identifiers";
import { DEMO_CHANNEL, DEMO_CHANNEL_ID, DEMO_CHANNEL_SLUG, DEMO_USERNAME, getDemoSponsorByCountry, isDemoUsername } from "@/lib/demo-data";
import { loadMapDataByChannelId, type MapDataPayload } from "@/lib/map-data";
import { buildPollOptionsFromVideos, loadMapPoll, type MapPollRecord } from "@/lib/map-polls";
import { sql } from "@/lib/neon";
import type { TravelChannel } from "@/lib/types";

export interface MapViewerContext {
  isOwner: boolean;
  shareUrl: string;
  adminUrl: string | null;
}

export interface MapRailSponsor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  description: string | null;
  discount_code: string | null;
  affiliate_url: string | null;
  country_codes: string[];
  isExample?: boolean;
}

export interface PublicMapPayload extends MapDataPayload {
  channel: TravelChannel & {
    canonicalHandle: string | null;
  };
  viewer: MapViewerContext;
  sponsors: MapRailSponsor[];
  activePoll: MapPollRecord | null;
  availablePollOptions: ReturnType<typeof buildPollOptionsFromVideos>;
}

interface PublicChannelRow {
  id: string;
  user_id: string;
  username: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  youtube_channel_id: string | null;
  last_synced_at: string | null;
}

const FALLBACK_SHARE_HOST = "https://youmap.bypupila.com";
const BY_PUPILA_KEYS = new Set(["bypupila", "by.pupila"]);

const EXAMPLE_SPONSORS: MapRailSponsor[] = [
  {
    id: "example-sponsor-1",
    brand_name: "Nomad Gear",
    logo_url: null,
    description: "Backpacks y packing systems pensados para creators que se mueven todo el año.",
    discount_code: "PUPILA10",
    affiliate_url: "https://example.com/nomad-gear",
    country_codes: ["GLOBAL"],
    isExample: true,
  },
  {
    id: "example-sponsor-2",
    brand_name: "RailPass Japan",
    logo_url: null,
    description: "Transporte y eSIM para rutas intensas por Japón y Asia urbana.",
    discount_code: "TOKYO5",
    affiliate_url: "https://example.com/railpass-japan",
    country_codes: ["JP"],
    isExample: true,
  },
  {
    id: "example-sponsor-3",
    brand_name: "Andes Outdoor",
    logo_url: null,
    description: "Equipamiento outdoor para roadtrips, altura y trekkings largos.",
    discount_code: "ANDES12",
    affiliate_url: "https://example.com/andes-outdoor",
    country_codes: ["AR", "CL", "PE"],
    isExample: true,
  },
];

export function normalizeChannelHandle(value?: string | null) {
  const normalized = normalizeUsername(String(value || ""));
  return normalized || null;
}

export function preserveChannelHandleSlug(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^\/+/, "");
}

export function buildPublicShareUrl(handleOrUsername?: string | null) {
  const slug = preserveChannelHandleSlug(handleOrUsername) || DEMO_USERNAME;
  return `${FALLBACK_SHARE_HOST}/${slug}`;
}

async function resolvePublicChannel(identifier: string): Promise<PublicChannelRow | null> {
  if (!identifier) return null;
  const normalized = normalizeUsername(identifier);

  if (isDemoUsername(normalized)) {
    return {
      id: DEMO_CHANNEL_SLUG,
      user_id: DEMO_CHANNEL.user_id,
      username: DEMO_USERNAME,
      channel_name: DEMO_CHANNEL.channel_name,
      channel_handle: DEMO_CHANNEL.channel_handle || null,
      thumbnail_url: DEMO_CHANNEL.thumbnail_url || null,
      subscriber_count: DEMO_CHANNEL.subscriber_count || null,
      youtube_channel_id: DEMO_CHANNEL.youtube_channel_id || null,
      last_synced_at: DEMO_CHANNEL.last_synced_at || null,
    };
  }

  const rows = await sql<PublicChannelRow[]>`
    select
      c.id,
      c.user_id,
      u.username,
      c.channel_name,
      c.channel_handle,
      c.thumbnail_url,
      c.subscriber_count,
      c.youtube_channel_id,
      c.last_synced_at
    from public.channels c
    inner join public.users u on u.id = c.user_id
    where u.username = ${normalized}
       or ltrim(lower(coalesce(c.channel_handle, '')), '@') = ${normalized}
    limit 1
  `;

  return rows[0] || null;
}

async function loadSponsorsForUser(userId: string, fallbackKey: string | null) {
  if (userId === DEMO_CHANNEL.user_id) {
    return [
      { ...getDemoSponsorByCountry(null), country_codes: ["GLOBAL"] },
      { ...getDemoSponsorByCountry("JP"), country_codes: ["JP"] },
      { ...getDemoSponsorByCountry("AR"), country_codes: ["AR"] },
    ].map((sponsor) => ({
      ...sponsor,
      logo_url: null,
    }));
  }

  const sponsors = await sql<Array<{
    id: string;
    brand_name: string;
    logo_url: string | null;
    description: string | null;
    discount_code: string | null;
    affiliate_url: string | null;
    country_codes: string[] | null;
  }>>`
    select
      s.id,
      s.brand_name,
      s.logo_url,
      s.description,
      s.discount_code,
      s.affiliate_url,
      array_remove(array_agg(distinct sgr.country_code), null) as country_codes
    from public.sponsors s
    left join public.sponsor_geo_rules sgr on sgr.sponsor_id = s.id
    where s.user_id = ${userId}
      and s.active = true
    group by s.id
    order by s.created_at desc
    limit 6
  `;

  if (sponsors.length > 0) {
    return sponsors.map((sponsor) => ({
      ...sponsor,
      country_codes: sponsor.country_codes || [],
    }));
  }

  if (fallbackKey && BY_PUPILA_KEYS.has(fallbackKey)) {
    return EXAMPLE_SPONSORS;
  }

  return [];
}

export async function loadPublicMapPayload({
  identifier,
  viewerUserId,
  voterFingerprint,
}: {
  identifier: string;
  viewerUserId?: string | null;
  voterFingerprint?: string | null;
}): Promise<PublicMapPayload | null> {
  const channelRef = await resolvePublicChannel(identifier);
  if (!channelRef) return null;

  return loadPublicMapPayloadByChannelRef(channelRef, viewerUserId || null, voterFingerprint || null);
}

export async function loadPublicMapPayloadByChannelId({
  channelId,
  viewerUserId,
  voterFingerprint,
}: {
  channelId: string;
  viewerUserId?: string | null;
  voterFingerprint?: string | null;
}): Promise<PublicMapPayload | null> {
  if (channelId === DEMO_CHANNEL_SLUG || channelId === DEMO_CHANNEL_ID) {
    const demoChannelRef = await resolvePublicChannel(DEMO_USERNAME);
    if (!demoChannelRef) return null;
    return loadPublicMapPayloadByChannelRef(demoChannelRef, viewerUserId || null, voterFingerprint || null);
  }

  const channelRows = await sql<PublicChannelRow[]>`
    select
      c.id,
      c.user_id,
      u.username,
      c.channel_name,
      c.channel_handle,
      c.thumbnail_url,
      c.subscriber_count,
      c.youtube_channel_id,
      c.last_synced_at
    from public.channels c
    inner join public.users u on u.id = c.user_id
    where c.id = ${channelId}
    limit 1
  `;

  const channelRef = channelRows[0] || null;
  if (!channelRef) return null;
  return loadPublicMapPayloadByChannelRef(channelRef, viewerUserId || null, voterFingerprint || null);
}

async function loadPublicMapPayloadByChannelRef(
  channelRef: PublicChannelRow,
  viewerUserId: string | null,
  voterFingerprint: string | null
): Promise<PublicMapPayload | null> {
  const mapPayload = await loadMapDataByChannelId(channelRef.id);
  if (!mapPayload) return null;

  const canonicalHandle = normalizeChannelHandle(channelRef.channel_handle || channelRef.username);
  const isOwner = Boolean(viewerUserId && viewerUserId === channelRef.user_id);
  const availablePollOptions = buildPollOptionsFromVideos(mapPayload.videoLocations);
  const activePoll = await loadMapPoll(channelRef.id, {
    includeDraft: isOwner,
    voterFingerprint,
  });
  const sponsors = await loadSponsorsForUser(channelRef.user_id, canonicalHandle || normalizeUsername(channelRef.username));

  return {
    ...mapPayload,
    manualQueue: isOwner ? mapPayload.manualQueue : [],
    channel: {
      ...mapPayload.channel,
      canonicalHandle,
    },
    viewer: {
      isOwner,
      shareUrl: buildPublicShareUrl(channelRef.channel_handle || channelRef.username),
      adminUrl: isOwner ? `/dashboard?channelId=${encodeURIComponent(channelRef.id)}` : null,
    },
    sponsors,
    activePoll,
    availablePollOptions,
  };
}
