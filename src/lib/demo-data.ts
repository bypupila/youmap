import { buildAnalyticsFromVideoLocations, type ChannelAnalytics } from "@/lib/analytics";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export const DEMO_USERNAME = "demo";
export const DEMO_CHANNEL_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CHANNEL_SLUG = "demo-channel";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  username: DEMO_USERNAME,
  email: "demo@travelyourmap.local",
  displayName: "Pupila Nomad",
};

export const DEMO_CHANNEL: TravelChannel = {
  id: DEMO_CHANNEL_ID,
  user_id: DEMO_USER.id,
  channel_name: "Pupila Nomad",
  channel_handle: "@pupila.nomad",
  thumbnail_url: null,
  subscriber_count: 128_400,
};

export const DEMO_VIDEO_LOCATIONS: TravelVideoLocation[] = [
  {
    youtube_video_id: "csfgZX_5BzQ",
    video_url: "https://www.youtube.com/watch?v=csfgZX_5BzQ",
    title: "Compré el pase VIP para el mundo Nintendo en Japón | ¿Vale la pena? 🎟️🎢",
    thumbnail_url: "https://i.ytimg.com/vi/csfgZX_5BzQ/maxresdefault.jpg",
    view_count: 360640,
    published_at: "2026-04-10T15:19:26Z",
    country_code: "JP",
    country_name: "Japan",
    location_label: "Japan",
    lat: 35.748115261061606,
    lng: 138.25151242795437,
    confidence_score: 0.72,
  },
  {
    youtube_video_id: "bN76aYAfDlI",
    video_url: "https://www.youtube.com/watch?v=bN76aYAfDlI",
    title: "Una muy sabrosa bebida japonesa 😋 🇯🇵 #drinkmaruhi  #ad #21+ @officialgoldengai",
    thumbnail_url: "https://i.ytimg.com/vi/bN76aYAfDlI/maxresdefault.jpg",
    view_count: 218652,
    published_at: "2025-07-21T13:41:03Z",
    country_code: "JP",
    country_name: "Japan",
    location_label: "Japan",
    lat: 35.76710877195399,
    lng: 138.23688476318188,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "uHOZJ0RdH1w",
    video_url: "https://www.youtube.com/watch?v=uHOZJ0RdH1w",
    title: "Esta ciudad tiene la mejor comida callejera de España | MÁLAGA 🇪🇸",
    thumbnail_url: "https://i.ytimg.com/vi/uHOZJ0RdH1w/maxresdefault.jpg",
    view_count: 12589127,
    published_at: "2024-07-23T15:45:51Z",
    country_code: "ES",
    country_name: "Spain",
    location_label: "Spain",
    lat: 40.1660402138522,
    lng: -3.452377638221341,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "TomHiqgd0Nc",
    video_url: "https://www.youtube.com/watch?v=TomHiqgd0Nc",
    title: "La tradición “más polémica” de España: ¿es como dicen? | EL COLACHO 🇪🇸",
    thumbnail_url: "https://i.ytimg.com/vi/TomHiqgd0Nc/maxresdefault.jpg",
    view_count: 4035255,
    published_at: "2024-06-26T17:42:39Z",
    country_code: "ES",
    country_name: "Spain",
    location_label: "Spain",
    lat: 40.93490306362158,
    lng: -3.755533644372023,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "ggHTnGrnuzE",
    video_url: "https://www.youtube.com/watch?v=ggHTnGrnuzE",
    title: "¿Cuál es el mejor ALFAJOR de Argentina? | ¡Compré todos los de la tienda! 🇦🇷",
    thumbnail_url: "https://i.ytimg.com/vi/ggHTnGrnuzE/maxresdefault.jpg",
    view_count: 4394763,
    published_at: "2023-05-08T16:45:43Z",
    country_code: "AR",
    country_name: "Argentina",
    location_label: "Argentina",
    lat: -35.03344817724625,
    lng: -64.93651163642912,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "cqisQbPgimc",
    video_url: "https://www.youtube.com/watch?v=cqisQbPgimc",
    title: "La vida en un barrio “peligroso” de Argentina | FUERTE APACHE 🇦🇷",
    thumbnail_url: "https://i.ytimg.com/vi/cqisQbPgimc/maxresdefault.jpg",
    view_count: 12706862,
    published_at: "2023-05-04T17:44:12Z",
    country_code: "AR",
    country_name: "Argentina",
    location_label: "Argentina",
    lat: -34.57898027736903,
    lng: -64.80587144704906,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "VaORuff0Q4A",
    video_url: "https://www.youtube.com/watch?v=VaORuff0Q4A",
    title: "¿Por qué hay pescados bajo la arena del desierto del Sahara? | DAKHLA 🇲🇦🇪🇭🇪🇸",
    thumbnail_url: "https://i.ytimg.com/vi/VaORuff0Q4A/maxresdefault.jpg",
    view_count: 5918452,
    published_at: "2024-07-17T20:18:34Z",
    country_code: "MA",
    country_name: "Morocco",
    location_label: "Morocco",
    lat: 32.42449572716711,
    lng: -4.975336646853326,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "xvvJwdUBONw",
    video_url: "https://www.youtube.com/watch?v=xvvJwdUBONw",
    title: "Explorando el interior de una cueva de hielo | Glaciar en ISLANDIA 🥶🇮🇸",
    thumbnail_url: "https://i.ytimg.com/vi/xvvJwdUBONw/sddefault.jpg",
    view_count: 5726173,
    published_at: "2022-12-23T19:06:43Z",
    country_code: "IS",
    country_name: "Iceland",
    location_label: "Iceland",
    lat: 66.08350971155649,
    lng: -18.500421524990912,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "gSorBbkdAq0",
    video_url: "https://www.youtube.com/watch?v=gSorBbkdAq0",
    title: "Probando los taxis “del futuro” sin un chofer humano: ¿SON SEGUROS? 🤖🚕",
    thumbnail_url: "https://i.ytimg.com/vi/gSorBbkdAq0/maxresdefault.jpg",
    view_count: 10339068,
    published_at: "2025-06-12T18:05:23Z",
    country_code: "US",
    country_name: "United States",
    location_label: "United States",
    lat: 38.593489134857315,
    lng: -96.75012020212601,
    confidence_score: 0.72,
  },
  {
    youtube_video_id: "XMvqwnyhA7I",
    video_url: "https://www.youtube.com/watch?v=XMvqwnyhA7I",
    title: "Volé en el asiento de $15,000 con ducha: ¿vale la pena? | SUITE EMIRATES ✈️🚿",
    thumbnail_url: "https://i.ytimg.com/vi/XMvqwnyhA7I/maxresdefault.jpg",
    view_count: 9012220,
    published_at: "2026-03-18T17:22:19Z",
    country_code: "AE",
    country_name: "United Arab Emirates",
    location_label: "United Arab Emirates",
    lat: 24.542093627339252,
    lng: 54.31308668413271,
    confidence_score: 0.72,
  },
  {
    youtube_video_id: "FTJT9OY7iW8",
    video_url: "https://www.youtube.com/watch?v=FTJT9OY7iW8",
    title: "ASÍ ES SRI LANKA: el país “más barato” de Asia | ¿Cómo viven? 🇱🇰",
    thumbnail_url: "https://i.ytimg.com/vi/FTJT9OY7iW8/maxresdefault.jpg",
    view_count: 3803649,
    published_at: "2026-04-06T16:07:22Z",
    country_code: "LK",
    country_name: "Sri Lanka",
    location_label: "Sri Lanka",
    lat: 7.116847552793764,
    lng: 82.00398315518488,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "swQ0Ksk50vY",
    video_url: "https://www.youtube.com/watch?v=swQ0Ksk50vY",
    title: "Probando comida callejera en SRI LANKA: el país “más barato” de Asia 🇱🇰",
    thumbnail_url: "https://i.ytimg.com/vi/swQ0Ksk50vY/maxresdefault.jpg",
    view_count: 7015522,
    published_at: "2026-03-30T17:16:51Z",
    country_code: "LK",
    country_name: "Sri Lanka",
    location_label: "Sri Lanka",
    lat: 6.379356402119006,
    lng: 80.08993926489259,
    confidence_score: 0.95,
  },
];

export const DEMO_ANALYTICS: ChannelAnalytics = {
  ...buildAnalyticsFromVideoLocations(DEMO_VIDEO_LOCATIONS, { monthlyVisitors: 94_200 }),
  unlocated_videos: [
    { id: "unlocated-demo-1", title: "Q&A de equipo y presupuesto anual", view_count: 52000 },
    { id: "unlocated-demo-2", title: "Review setup de grabacion para viajes", view_count: 38000 },
  ],
};

type DemoSponsor = {
  id: string;
  brand_name: string;
  description: string;
  discount_code: string | null;
  affiliate_url: string;
};

const DEMO_SPONSOR_GLOBAL: DemoSponsor = {
  id: "22222222-2222-4222-8222-222222222222",
  brand_name: "Booking.com",
  description: "Plataforma global de alojamiento para creators y audiencias viajeras.",
  discount_code: null,
  affiliate_url: "https://www.booking.com",
};

const DEMO_SPONSOR_BY_COUNTRY: Record<string, DemoSponsor> = {
  JP: {
    id: "33333333-3333-4333-8333-333333333333",
    brand_name: "GetYourGuide",
    description: "Tours y experiencias para creadores de viajes en rutas urbanas y culturales.",
    discount_code: null,
    affiliate_url: "https://www.getyourguide.com",
  },
  AR: {
    id: "44444444-4444-4444-8444-444444444444",
    brand_name: "IATI Seguros",
    description: "Seguro de viaje usado frecuentemente por creadores hispanohablantes.",
    discount_code: null,
    affiliate_url: "https://www.iatiseguros.com",
  },
  MA: {
    id: "55555555-5555-4555-8555-555555555555",
    brand_name: "Airbnb",
    description: "Alojamientos y experiencias para contenido de viajes auténtico.",
    discount_code: null,
    affiliate_url: "https://www.airbnb.com",
  },
};

export function isDemoChannelId(channelId: string) {
  return channelId === DEMO_CHANNEL_ID || channelId === DEMO_CHANNEL_SLUG;
}

export function isDemoUsername(username: string) {
  return username.toLowerCase() === DEMO_USERNAME;
}

export function getDemoSponsorByCountry(countryCode?: string | null) {
  if (!countryCode) return DEMO_SPONSOR_GLOBAL;
  return DEMO_SPONSOR_BY_COUNTRY[countryCode.toUpperCase()] || DEMO_SPONSOR_GLOBAL;
}
