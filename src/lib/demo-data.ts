import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export const DEMO_USERNAME = "demo";
export const DEMO_CHANNEL_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CHANNEL_SLUG = "demo-channel";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  username: DEMO_USERNAME,
  email: "demo@travelmap.local",
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
    youtube_video_id: "demojp001aa1",
    title: "Kyoto al amanecer: templos, trenes y cafeterias",
    thumbnail_url: null,
    view_count: 214000,
    published_at: "2025-01-12T10:00:00.000Z",
    travel_type: "cultural",
    country_code: "JP",
    country_name: "Japan",
    location_label: "Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "demojp002aa2",
    title: "24 horas en Tokio con presupuesto real",
    thumbnail_url: null,
    view_count: 187000,
    published_at: "2025-02-06T10:00:00.000Z",
    travel_type: "city_break",
    country_code: "JP",
    country_name: "Japan",
    location_label: "Tokyo",
    lat: 35.6764,
    lng: 139.6500,
    confidence_score: 0.92,
  },
  {
    youtube_video_id: "demoes001aa3",
    title: "Ruta secreta por Lisboa y Sintra",
    thumbnail_url: null,
    view_count: 143000,
    published_at: "2024-11-03T10:00:00.000Z",
    travel_type: "cultural",
    country_code: "PT",
    country_name: "Portugal",
    location_label: "Lisbon",
    lat: 38.7223,
    lng: -9.1393,
    confidence_score: 0.9,
  },
  {
    youtube_video_id: "demoes002aa4",
    title: "Madrid foodie guide sin trampas turisticas",
    thumbnail_url: null,
    view_count: 119000,
    published_at: "2024-09-18T10:00:00.000Z",
    travel_type: "food",
    country_code: "ES",
    country_name: "Spain",
    location_label: "Madrid",
    lat: 40.4168,
    lng: -3.7038,
    confidence_score: 0.88,
  },
  {
    youtube_video_id: "demoes003aa5",
    title: "Barcelona: barrios, metro y spots locales",
    thumbnail_url: null,
    view_count: 131000,
    published_at: "2024-10-26T10:00:00.000Z",
    travel_type: "city_break",
    country_code: "ES",
    country_name: "Spain",
    location_label: "Barcelona",
    lat: 41.3874,
    lng: 2.1686,
    confidence_score: 0.89,
  },
  {
    youtube_video_id: "demonz001aa6",
    title: "Camperlife en Nueva Zelanda - etapa norte",
    thumbnail_url: null,
    view_count: 98000,
    published_at: "2025-03-02T10:00:00.000Z",
    travel_type: "road_trip",
    country_code: "NZ",
    country_name: "New Zealand",
    location_label: "Auckland",
    lat: -36.8485,
    lng: 174.7633,
    confidence_score: 0.91,
  },
  {
    youtube_video_id: "demonz002aa7",
    title: "Senderos en Queenstown con clima extremo",
    thumbnail_url: null,
    view_count: 86000,
    published_at: "2025-03-22T10:00:00.000Z",
    travel_type: "adventure",
    country_code: "NZ",
    country_name: "New Zealand",
    location_label: "Queenstown",
    lat: -45.0312,
    lng: 168.6626,
    confidence_score: 0.9,
  },
  {
    youtube_video_id: "demoma001aa8",
    title: "Marruecos real: medina, riads y desierto",
    thumbnail_url: null,
    view_count: 175000,
    published_at: "2024-12-12T10:00:00.000Z",
    travel_type: "cultural",
    country_code: "MA",
    country_name: "Morocco",
    location_label: "Marrakesh",
    lat: 31.6295,
    lng: -7.9811,
    confidence_score: 0.93,
  },
  {
    youtube_video_id: "demoar001aa9",
    title: "Mendoza: vino, montaña y budget local",
    thumbnail_url: null,
    view_count: 104000,
    published_at: "2024-08-10T10:00:00.000Z",
    travel_type: "nature",
    country_code: "AR",
    country_name: "Argentina",
    location_label: "Mendoza",
    lat: -32.8895,
    lng: -68.8458,
    confidence_score: 0.87,
  },
  {
    youtube_video_id: "demoar002ab0",
    title: "Buenos Aires en 48h: ruta por barrios",
    thumbnail_url: null,
    view_count: 112000,
    published_at: "2024-07-01T10:00:00.000Z",
    travel_type: "city_break",
    country_code: "AR",
    country_name: "Argentina",
    location_label: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
    confidence_score: 0.89,
  },
  {
    youtube_video_id: "demois001ab1",
    title: "Islandia en invierno: guia de ruta segura",
    thumbnail_url: null,
    view_count: 93000,
    published_at: "2025-01-28T10:00:00.000Z",
    travel_type: "road_trip",
    country_code: "IS",
    country_name: "Iceland",
    location_label: "Reykjavik",
    lat: 64.1466,
    lng: -21.9426,
    confidence_score: 0.92,
  },
  {
    youtube_video_id: "demous001ab2",
    title: "Nueva York low-cost: checklist completo",
    thumbnail_url: null,
    view_count: 156000,
    published_at: "2024-06-20T10:00:00.000Z",
    travel_type: "city_break",
    country_code: "US",
    country_name: "United States",
    location_label: "New York",
    lat: 40.7128,
    lng: -74.006,
    confidence_score: 0.85,
  },
];

export const DEMO_ANALYTICS = {
  top_countries: [
    { country_name: "Japan", video_count: 2 },
    { country_name: "Spain", video_count: 2 },
    { country_name: "Argentina", video_count: 2 },
    { country_name: "New Zealand", video_count: 2 },
    { country_name: "Morocco", video_count: 1 },
    { country_name: "Portugal", video_count: 1 },
    { country_name: "Iceland", video_count: 1 },
    { country_name: "United States", video_count: 1 },
  ],
  videos_by_month: [
    { month: "2024-06", count: 1 },
    { month: "2024-07", count: 1 },
    { month: "2024-08", count: 1 },
    { month: "2024-09", count: 1 },
    { month: "2024-10", count: 1 },
    { month: "2024-11", count: 1 },
    { month: "2024-12", count: 1 },
    { month: "2025-01", count: 2 },
    { month: "2025-02", count: 1 },
    { month: "2025-03", count: 2 },
  ],
  unlocated_videos: [
    { id: "unlocated-demo-1", title: "Q&A de equipo y presupuesto anual", view_count: 52000 },
    { id: "unlocated-demo-2", title: "Review setup de grabacion para viajes", view_count: 38000 },
  ],
  total_countries: 8,
  total_mapped_videos: 12,
  total_views: 1_618_000,
  monthly_visitors: 94_200,
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
