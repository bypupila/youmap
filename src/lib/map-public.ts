import { normalizeUsername } from "@/lib/auth-identifiers";
import { getSessionUserById, type AppUserRole, userIsSuperAdmin } from "@/lib/current-user";
import { DEMO_CHANNEL, DEMO_CHANNEL_ID, DEMO_CHANNEL_SLUG, DEMO_USERNAME, getDemoSponsorByCountry, isDemoUsername } from "@/lib/demo-data";
import { loadMapDataByChannelId, type MapDataPayload } from "@/lib/map-data";
import { buildPollOptionsFromVideos, loadMapPoll, type MapPollRecord } from "@/lib/map-polls";
import { sql } from "@/lib/neon";
import type { TravelChannel } from "@/lib/types";

export interface MapViewerContext {
  isOwner: boolean;
  isAuthenticated: boolean;
  role: AppUserRole;
  isSuperAdmin: boolean;
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

const FALLBACK_SHARE_HOST = "https://travelyourmap.bypupila.com";
const BY_PUPILA_KEYS = new Set(["bypupila", "by.pupila"]);
const LOCAL_GLOBAL_MAP_IDS = new Set(["luisito-global-map", "drew-global-map"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXAMPLE_SPONSORS: MapRailSponsor[] = [
  {
    id: "example-sponsor-1",
    brand_name: "Booking.com",
    logo_url: "/brands/booking.svg",
    description: "Plataforma global de alojamiento para creators y audiencias viajeras.",
    discount_code: null,
    affiliate_url: "https://www.booking.com",
    country_codes: ["GLOBAL"],
    isExample: true,
  },
  {
    id: "example-sponsor-2",
    brand_name: "GetYourGuide",
    logo_url: "/brands/getyourguide.svg",
    description: "Tours y experiencias para creadores de viajes en rutas urbanas y culturales.",
    discount_code: null,
    affiliate_url: "https://www.getyourguide.com",
    country_codes: ["JP"],
    isExample: true,
  },
  {
    id: "example-sponsor-3",
    brand_name: "IATI Seguros",
    logo_url: "/brands/iati.svg",
    description: "Seguro de viaje utilizado por creadores hispanohablantes.",
    discount_code: null,
    affiliate_url: "https://www.iatiseguros.com",
    country_codes: ["AR", "CL", "PE"],
    isExample: true,
  },
  {
    id: "example-sponsor-4",
    brand_name: "Airbnb",
    logo_url: "/brands/airbnb.svg",
    description: "Alojamientos y experiencias para contenido de viajes auténtico.",
    discount_code: null,
    affiliate_url: "https://www.airbnb.com",
    country_codes: ["GLOBAL"],
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
      id: DEMO_CHANNEL_ID,
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
    const demoSponsors = [
      { ...getDemoSponsorByCountry(null), country_codes: ["GLOBAL"] },
      { ...getDemoSponsorByCountry("JP"), country_codes: ["JP"] },
      { ...getDemoSponsorByCountry("AR"), country_codes: ["AR"] },
      { ...getDemoSponsorByCountry("MA"), country_codes: ["MA"] },
    ];
    return demoSponsors.map((sponsor) => ({
      ...sponsor,
      logo_url:
        sponsor.brand_name === "Booking.com"
          ? "/brands/booking.svg"
          : sponsor.brand_name === "GetYourGuide"
            ? "/brands/getyourguide.svg"
            : sponsor.brand_name === "IATI Seguros"
              ? "/brands/iati.svg"
              : sponsor.brand_name === "Airbnb"
                ? "/brands/airbnb.svg"
                : null,
      isExample: true,
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

  if (LOCAL_GLOBAL_MAP_IDS.has(channelId)) {
    const mapPayload = await loadMapDataByChannelId(channelId);
    if (!mapPayload) return null;
    const canonicalHandle = normalizeChannelHandle(mapPayload.channel.channel_handle || mapPayload.channel.channel_name);
    return {
      ...mapPayload,
      channel: {
        ...mapPayload.channel,
        canonicalHandle,
      },
      viewer: {
        isOwner: false,
        isAuthenticated: Boolean(viewerUserId),
        role: "viewer",
        isSuperAdmin: false,
        shareUrl: `${FALLBACK_SHARE_HOST}/map?channelId=${encodeURIComponent(channelId)}`,
        adminUrl: null,
      },
      sponsors: [],
      activePoll: null,
      availablePollOptions: buildPollOptionsFromVideos(mapPayload.videoLocations),
    };
  }

  // Backward compatibility: old links may pass handle/username in channelId.
  // Avoid hitting `where c.id = ...` with non-UUID values, which throws 22P02.
  if (!UUID_PATTERN.test(channelId)) {
    return loadPublicMapPayload({
      identifier: channelId,
      viewerUserId,
      voterFingerprint,
    });
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

  const sessionUser = viewerUserId ? await getSessionUserById(viewerUserId) : null;
  const isSuperAdmin = userIsSuperAdmin(sessionUser?.role);
  const canonicalHandle = normalizeChannelHandle(channelRef.channel_handle || channelRef.username);
  const isOwner = Boolean((viewerUserId && viewerUserId === channelRef.user_id) || isSuperAdmin);
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
      isAuthenticated: Boolean(viewerUserId),
      role: sessionUser?.role || "viewer",
      isSuperAdmin,
      shareUrl: buildPublicShareUrl(channelRef.channel_handle || channelRef.username),
      adminUrl: isOwner || isSuperAdmin ? `/dashboard?channelId=${encodeURIComponent(channelRef.id)}` : null,
    },
    sponsors,
    activePoll,
    availablePollOptions,
  };
}
