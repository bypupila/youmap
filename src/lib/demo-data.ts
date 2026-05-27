import { buildAnalyticsFromVideoLocations, type ChannelAnalytics } from "@/lib/analytics";
import demoVideosMapaSeeds from "@/data/demo-videos-mapa-seeds.json";
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

type DemoVideoSeed = {
  youtube_video_id: string;
  slug: string;
  title: string;
  view_count: number;
  duration_seconds: number;
  published_at: string;
  country_code: string;
  country_name: string;
  location_label: string;
  lat: number;
  lng: number;
  confidence_score: number;
};

const DEMO_THUMBNAIL_BASE_PATH = "/images/demo/map-thumbnails";

const DEMO_VIDEO_SEEDS_BASE: DemoVideoSeed[] = [
  {
    youtube_video_id: "n8Qm3Lx7P0a",
    slug: "Ruta-costera-entre-acantilados-y-calas-escondidas",
    title: "Ruta costera entre acantilados y calas escondidas",
    view_count: 1_924_300,
    duration_seconds: 702,
    published_at: "2026-04-19T15:00:00Z",
    country_code: "PT",
    country_name: "Portugal",
    location_label: "Costa del Algarve",
    lat: 37.1028,
    lng: -8.6742,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "c4Vt9Hr2KqM",
    slug: "Templos-y-mercados-nocturnos-en-la-capital",
    title: "Templos y mercados nocturnos en la capital",
    view_count: 1_448_900,
    duration_seconds: 648,
    published_at: "2026-03-22T16:00:00Z",
    country_code: "TH",
    country_name: "Thailand",
    location_label: "Bangkok",
    lat: 13.7563,
    lng: 100.5018,
    confidence_score: 0.94,
  },
  {
    youtube_video_id: "p7Ds1Wy5JzR",
    slug: "Lagos-glaciares-y-senderos-de-alta-montana",
    title: "Lagos glaciares y senderos de alta montana",
    view_count: 1_736_500,
    duration_seconds: 731,
    published_at: "2026-02-11T14:00:00Z",
    country_code: "CH",
    country_name: "Switzerland",
    location_label: "Interlaken",
    lat: 46.6863,
    lng: 7.8632,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "t2Gb8Nx4UvC",
    slug: "Islas-tropicales-en-barco-al-amanecer",
    title: "Islas tropicales en barco al amanecer",
    view_count: 2_083_700,
    duration_seconds: 689,
    published_at: "2026-01-07T13:00:00Z",
    country_code: "PH",
    country_name: "Philippines",
    location_label: "El Nido",
    lat: 11.2024,
    lng: 119.4179,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "m5Kr0Qp6LdX",
    slug: "Safari-fotografico-entre-elefantes-y-sabanas",
    title: "Safari fotografico entre elefantes y sabanas",
    view_count: 2_317_800,
    duration_seconds: 812,
    published_at: "2025-11-02T12:00:00Z",
    country_code: "KE",
    country_name: "Kenya",
    location_label: "Maasai Mara",
    lat: -1.4061,
    lng: 35.0083,
    confidence_score: 0.96,
  },
  {
    youtube_video_id: "kC-5tLI9IeU",
    slug: "Bali-secreto-la-cascada-que-casi-nadie-conoce",
    title: "Bali secreto: la cascada que casi nadie conoce",
    view_count: 1_842_000,
    duration_seconds: 861,
    published_at: "2025-10-14T15:00:00Z",
    country_code: "ID",
    country_name: "Indonesia",
    location_label: "Bali",
    lat: -8.4095,
    lng: 115.1889,
    confidence_score: 0.96,
  },
  {
    youtube_video_id: "Z2DWxQyDnuM",
    slug: "Japon-ruta-epica-entre-tokio-y-monte-fuji",
    title: "Japon: ruta epica entre Tokio y Monte Fuji",
    view_count: 2_104_500,
    duration_seconds: 737,
    published_at: "2025-09-20T14:00:00Z",
    country_code: "JP",
    country_name: "Japan",
    location_label: "Tokyo y Monte Fuji",
    lat: 35.6762,
    lng: 138.2529,
    confidence_score: 0.96,
  },
  {
    youtube_video_id: "K5B86nQxDOE",
    slug: "Suiza-de-postal-los-alpes-mas-brutales-del-viaje",
    title: "Suiza de postal: los Alpes mas brutales del viaje",
    view_count: 1_355_000,
    duration_seconds: 683,
    published_at: "2025-08-12T13:00:00Z",
    country_code: "CH",
    country_name: "Switzerland",
    location_label: "Alpes Suizos",
    lat: 46.8182,
    lng: 8.2275,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "39_qlmYxTJU",
    slug: "Nueva-zelanda-roadtrip-cascadas-y-rutas-salvajes",
    title: "Nueva Zelanda roadtrip: cascadas y rutas salvajes",
    view_count: 1_116_000,
    duration_seconds: 785,
    published_at: "2025-07-23T14:00:00Z",
    country_code: "NZ",
    country_name: "New Zealand",
    location_label: "Isla Sur",
    lat: -41.2865,
    lng: 174.7762,
    confidence_score: 0.94,
  },
  {
    youtube_video_id: "VrIO-r1OyhM",
    slug: "Tailandia-en-barco-islas-que-parecen-irreales",
    title: "Tailandia en barco: islas que parecen irreales",
    view_count: 2_432_400,
    duration_seconds: 615,
    published_at: "2025-06-05T16:00:00Z",
    country_code: "TH",
    country_name: "Thailand",
    location_label: "Phi Phi Islands",
    lat: 15.87,
    lng: 100.9925,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "TPWJWlw6YqA",
    slug: "Machu-picchu-la-historia-real-tras-la-maravilla",
    title: "Machu Picchu: la historia real tras la maravilla",
    view_count: 3_021_900,
    duration_seconds: 608,
    published_at: "2025-05-11T15:00:00Z",
    country_code: "PE",
    country_name: "Peru",
    location_label: "Machu Picchu",
    lat: -13.1631,
    lng: -72.545,
    confidence_score: 0.97,
  },
  {
    youtube_video_id: "lr-cAWKdWxk",
    slug: "Islandia-ring-road-glaciares-cascadas-y-viento-extremo",
    title: "Islandia Ring Road: glaciares, cascadas y viento extremo",
    view_count: 1_788_200,
    duration_seconds: 942,
    published_at: "2025-04-03T17:00:00Z",
    country_code: "IS",
    country_name: "Iceland",
    location_label: "Ring Road",
    lat: 64.9631,
    lng: -19.0208,
    confidence_score: 0.96,
  },
  {
    youtube_video_id: "xqcDfRrcC2o",
    slug: "Italia-pueblos-de-costa-que-parecen-pintados",
    title: "Italia: pueblos de costa que parecen pintados",
    view_count: 2_763_100,
    duration_seconds: 751,
    published_at: "2025-03-10T14:00:00Z",
    country_code: "IT",
    country_name: "Italy",
    location_label: "Amalfi y Positano",
    lat: 41.8719,
    lng: 12.5674,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "5uiep7baVWE",
    slug: "Cartagena-colores-sabor-y-historia-caribena",
    title: "Cartagena: colores, sabor y historia caribena",
    view_count: 954_400,
    duration_seconds: 678,
    published_at: "2025-02-18T13:00:00Z",
    country_code: "CO",
    country_name: "Colombia",
    location_label: "Cartagena",
    lat: 10.391,
    lng: -75.4794,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "uu6MPdB09Fw",
    slug: "Marruecos-medinas-azules-y-calles-que-enamoran",
    title: "Marruecos: medinas azules y calles que enamoran",
    view_count: 1_487_300,
    duration_seconds: 587,
    published_at: "2025-01-27T12:00:00Z",
    country_code: "MA",
    country_name: "Morocco",
    location_label: "Chefchaouen",
    lat: 35.1714,
    lng: -5.2697,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "6OxG4LdJAhs",
    slug: "Parques-nacionales-usa-los-mejores-miradores-del-oeste",
    title: "Parques nacionales USA: los mejores miradores del oeste",
    view_count: 2_014_800,
    duration_seconds: 744,
    published_at: "2024-12-08T16:00:00Z",
    country_code: "US",
    country_name: "United States",
    location_label: "Grand Canyon",
    lat: 36.1069,
    lng: -112.1129,
    confidence_score: 0.94,
  },
  {
    youtube_video_id: "sHxS15K3D1U",
    slug: "Australia-great-ocean-road-canguros-y-playas-top",
    title: "Australia Great Ocean Road: canguros y playas top",
    view_count: 1_639_700,
    duration_seconds: 630,
    published_at: "2024-11-21T15:00:00Z",
    country_code: "AU",
    country_name: "Australia",
    location_label: "Great Ocean Road",
    lat: -38.6809,
    lng: 143.3919,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "uIO-GXYdHZo",
    slug: "Bahia-de-ha-long-vietnam-en-barco-entre-montanas",
    title: "Bahia de Ha Long: Vietnam en barco entre montanas",
    view_count: 1_323_200,
    duration_seconds: 599,
    published_at: "2024-10-06T11:00:00Z",
    country_code: "VN",
    country_name: "Vietnam",
    location_label: "Ha Long Bay",
    lat: 20.9101,
    lng: 107.1839,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "SARQfbvT5Q4",
    slug: "Delhi-caos-cultura-y-joyas-ocultas-de-la-india",
    title: "Delhi: caos, cultura y joyas ocultas de la India",
    view_count: 1_719_500,
    duration_seconds: 667,
    published_at: "2024-09-16T13:00:00Z",
    country_code: "IN",
    country_name: "India",
    location_label: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "CIy9wAkQvr8",
    slug: "Estambul-atardecer-y-globos-sobre-turquia",
    title: "Estambul: atardecer y globos sobre Turquia",
    view_count: 2_245_600,
    duration_seconds: 612,
    published_at: "2024-08-19T16:00:00Z",
    country_code: "TR",
    country_name: "Turkey",
    location_label: "Estambul",
    lat: 41.0082,
    lng: 28.9784,
    confidence_score: 0.94,
  },
  {
    youtube_video_id: "VQ5BQu4ANMU",
    slug: "Banff-el-lago-mas-azul-de-canada",
    title: "Banff: el lago mas azul de Canada",
    view_count: 1_552_900,
    duration_seconds: 669,
    published_at: "2024-07-02T15:00:00Z",
    country_code: "CA",
    country_name: "Canada",
    location_label: "Banff National Park",
    lat: 51.4968,
    lng: -115.9281,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "8_77KYMwHNI",
    slug: "Algarve-acantilados-playas-secretas-y-pueblos-blancos",
    title: "Algarve: acantilados, playas secretas y pueblos blancos",
    view_count: 1_044_300,
    duration_seconds: 576,
    published_at: "2024-06-11T14:00:00Z",
    country_code: "PT",
    country_name: "Portugal",
    location_label: "Algarve",
    lat: 37.0194,
    lng: -7.9304,
    confidence_score: 0.94,
  },
  {
    youtube_video_id: "PKLLYmZi1lI",
    slug: "Santorini-la-isla-griega-que-si-vale-la-pena",
    title: "Santorini: la isla griega que si vale la pena",
    view_count: 2_308_500,
    duration_seconds: 673,
    published_at: "2024-05-07T13:00:00Z",
    country_code: "GR",
    country_name: "Greece",
    location_label: "Santorini",
    lat: 36.3932,
    lng: 25.4615,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "L0CWioBXnrs",
    slug: "Bali-guia-completa-templos-arrozales-y-consejos-clave",
    title: "Bali guia completa: templos, arrozales y consejos clave",
    view_count: 1_286_200,
    duration_seconds: 655,
    published_at: "2024-04-23T15:00:00Z",
    country_code: "ID",
    country_name: "Indonesia",
    location_label: "Ubud",
    lat: -8.5069,
    lng: 115.2625,
    confidence_score: 0.95,
  },
  {
    youtube_video_id: "QwLQwLPDUBY",
    slug: "Safari-en-sudafrica-elefantes-a-metros-del-auto",
    title: "Safari en Sudafrica: elefantes a metros del auto",
    view_count: 1_674_100,
    duration_seconds: 794,
    published_at: "2024-03-14T14:00:00Z",
    country_code: "ZA",
    country_name: "South Africa",
    location_label: "Kruger National Park",
    lat: -23.9884,
    lng: 31.5547,
    confidence_score: 0.96,
  },
];

const DEMO_VIDEO_SEEDS: DemoVideoSeed[] = [...(demoVideosMapaSeeds as DemoVideoSeed[]), ...DEMO_VIDEO_SEEDS_BASE];

export const DEMO_VIDEO_LOCATIONS: TravelVideoLocation[] = DEMO_VIDEO_SEEDS.map((video) => ({
  ...video,
  video_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
  thumbnail_url: `${DEMO_THUMBNAIL_BASE_PATH}/${video.slug}.png`,
}));

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
