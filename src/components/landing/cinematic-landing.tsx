import Link from "next/link";
import {
  ArrowRight,
  ChartBar,
  CheckCircle,
  Copy,
  CurrencyDollar,
  GlobeHemisphereWest,
  MapPin,
  Play,
  RocketLaunch,
  UsersThree,
  Video,
  XCircle,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { MiniMapModel } from "@/components/landing/mini-map-model";
import { loadLuisitoMapData } from "@/lib/luisito-map-data";
import type { TravelVideoLocation } from "@/lib/types";

const creatorStats = [
  { value: "2406", label: "videos mapeados", icon: YoutubeLogo },
  { value: "165", label: "países cubiertos", icon: GlobeHemisphereWest },
];

const sponsorLogos = ["Booking.com", "GoPro", "airbnb", "NordVPN", "LATAM AIRLINES", "SafetyWing"];

const steps = [
  { title: "Conecta tu canal de YouTube", icon: YoutubeLogo },
  { title: "Detectamos tus destinos", icon: MapPin },
  { title: "Organizamos tu mapa", icon: GlobeHemisphereWest },
  { title: "Publica y comparte tu página", icon: RocketLaunch },
];

const features = [
  {
    title: "Mapa 3D Interactivo",
    text: "Tus videos organizados por destinos en un mapa visual espectacular.",
    icon: GlobeHemisphereWest,
  },
  {
    title: "Videos Oficiales de YouTube",
    text: "Usamos el embed oficial. No pierdes views, ingresos, ni control.",
    icon: YoutubeLogo,
  },
  {
    title: "Sponsors por Destino",
    text: "Activa sponsors por país, ciudad o ruta. Tú eliges dónde y cómo.",
    icon: CurrencyDollar,
  },
  {
    title: "Analytics por País",
    text: "Descubre qué destinos generan más interés y cómo crece tu audiencia.",
    icon: ChartBar,
  },
  {
    title: "Votaciones de Fans",
    text: "Deja que tu comunidad vote tu próximo destino y aumente el engagement.",
    icon: UsersThree,
  },
  {
    title: "Página Pública SEO",
    text: "Tu propio sitio web optimizado para buscadores. Comparte tu enlace y destaca.",
    icon: Video,
  },
];

const profileDestinations = [
  ["Japón", "41 videos"],
  ["Argentina", "22 videos"],
  ["Italia", "19 videos"],
  ["Tailandia", "17 videos"],
  ["México", "13 videos"],
];

const planRows = ["Videos ilimitados", "Competitor analytics", "Sponsor hub", "Sync prioritaria", "Página pública avanzada"];

const faqs = [
  "¿TravelYourMap reemplaza a YouTube?",
  "¿Puedo activar sponsors por país o ciudad?",
  "¿Pierdo mis views o ingresos?",
  "¿Necesito editar mis videos?",
  "¿Qué tipos de creadores pueden usarlo?",
  "¿Cuánto tarda configurarlo?",
];

type JapanDestination = {
  videoCount: number;
  thumbnailUrl?: string | null;
};

type PreviewVideo = {
  country: string;
  title: string;
  thumbnailUrl: string;
};

export async function CinematicLanding() {
  const { videoLocations } = await loadLuisitoMapData();
  const japanVideos = videoLocations.filter((video) => video.country_code?.toUpperCase() === "JP");
  const japanDestination: JapanDestination = {
    videoCount: japanVideos.length,
    thumbnailUrl: japanVideos.find((video) => video.thumbnail_url)?.thumbnail_url,
  };
  const previewVideos = buildPreviewVideos(videoLocations);

  return (
    <main className="creator-landing min-h-[100dvh] overflow-hidden bg-[#070a0d] text-[#f5f2ed]">
      <div className="pointer-events-none fixed inset-0 z-0 creator-noise" />
      <div className="relative z-[1] mx-auto w-full max-w-[1500px] px-5 py-4 sm:px-8 lg:px-14">
        <CreatorNav />
        <HeroSection videoLocations={videoLocations} japanDestination={japanDestination} />
        <BrandStrip />
        <HowItWorks />
        <FeatureGrid />
        <SponsorComparison />
        <PublicPagePreview previewVideos={previewVideos} />
        <PricingSection />
        <FaqSection />
      </div>
      <FinalCta />
    </main>
  );
}

function CreatorNav() {
  return (
    <header className="sticky top-3 z-30 rounded-full border border-white/10 bg-[#080b0e]/80 px-3 py-3 shadow-[0_18px_80px_-44px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      <nav className="flex items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Travel Your Map home">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ff473b]/40 bg-[#151719] text-[#ff4f42] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <GlobeHemisphereWest size={22} weight="fill" />
          </span>
          <span className="leading-none">
            <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">BY PUPILA</span>
            <span className="block text-[13px] font-extrabold uppercase tracking-[0.08em] text-white">Travel Your Map</span>
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-[13px] font-medium text-white/72 lg:flex">
          <a href="#features" className="transition hover:text-white">Funciones</a>
          <a href="#pricing" className="transition hover:text-white">Precios</a>
          <a href="#examples" className="transition hover:text-white">Ejemplos</a>
          <a href="#faq" className="transition hover:text-white">Recursos</a>
          <Link href="/explore" className="transition hover:text-white">Explorar</Link>
        </div>
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <button className="hidden rounded-full px-3 py-2 text-white/75 transition hover:text-white md:inline-flex" type="button">ES</button>
          <Link href="/auth" className="hidden rounded-full px-4 py-2 text-white/75 transition hover:text-white md:inline-flex">Iniciar sesión</Link>
          <Link href="/onboarding?lang=es" className="rounded-full bg-[#ff473b] px-5 py-3 text-white shadow-[0_18px_38px_-22px_rgba(255,71,59,0.85)] transition hover:-translate-y-0.5 hover:bg-[#ff594e] active:translate-y-0 active:scale-[0.98]">
            Crear mi mapa
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroSection({
  videoLocations,
  japanDestination,
}: {
  videoLocations: TravelVideoLocation[];
  japanDestination: JapanDestination;
}) {
  return (
    <section className="relative grid min-h-[860px] items-center gap-10 pb-12 pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:pt-8">
      <div className="relative z-10 max-w-[620px]">
        <p className="mb-5 text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#ff473b]">El media kit interactivo para creadores de viajes</p>
        <h1 className="max-w-[11ch] text-[46px] font-extrabold leading-[0.98] tracking-[-0.055em] text-white sm:text-[68px] lg:text-[76px]">
          Convierte tu canal en un mapa que <span className="text-[#ff473b]">abre puertas.</span>
        </h1>
        <p className="mt-7 max-w-[48ch] text-[16px] leading-8 text-white/66">
          Importa tu canal de YouTube, detectamos destinos y crea tu página web interactiva lista para marcas y sponsors.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/onboarding?lang=es" className="inline-flex items-center gap-3 rounded-full bg-[#ff473b] px-8 py-4 text-[14px] font-bold text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.85)] transition hover:-translate-y-0.5 hover:bg-[#ff5b50] active:translate-y-0 active:scale-[0.98]">
            Crear mi mapa <ArrowRight size={17} weight="bold" />
          </Link>
          <Link href="/map?channelId=luisito-global-map" className="inline-flex items-center gap-4 rounded-full border border-white/18 bg-white/[0.025] px-8 py-4 text-[14px] font-bold text-white transition hover:bg-white/[0.07] active:scale-[0.98]">
            Ver demo <Play size={15} weight="fill" />
          </Link>
        </div>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            {["LM", "DB", "AV", "MP"].map((item) => (
              <span key={item} className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#080b0e] bg-[linear-gradient(145deg,#ffe2c4,#6b392c)] text-[11px] font-extrabold text-[#1c0f0c]">{item}</span>
            ))}
          </div>
          <div>
            <div className="flex gap-1 text-[#ff473b]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => <span key={index} className="h-2 w-2 rounded-full bg-current" />)}
            </div>
            <p className="mt-2 max-w-[250px] text-[13px] leading-5 text-white/68">Únete a creadores que ya están cerrando mejores deals.</p>
          </div>
        </div>
      </div>

      <div className="relative min-h-[620px] lg:min-h-[820px]">
        <CreatorGlobe videoLocations={videoLocations} />
        <div className="absolute right-0 top-10 z-20 grid w-[210px] gap-5 sm:right-4 lg:right-0">
          {creatorStats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
        </div>
        <DestinationCard destination={japanDestination} />
      </div>
    </section>
  );
}

function CreatorGlobe({ videoLocations }: { videoLocations: TravelVideoLocation[] }) {
  return (
    <div className="creator-real-globe absolute -left-[12%] top-0 h-[720px] w-[720px] overflow-hidden rounded-full lg:-left-[4%] lg:h-[850px] lg:w-[850px]">
      <MiniMapModel
        videoLocations={videoLocations}
        markerMode="videos"
        pointOfView={{ lat: 25, lng: 12, altitude: 1.85 }}
        autoRotateSpeed={-0.32}
        className="rounded-full bg-transparent"
      />
    </div>
  );
}

function MetricCard({ value, label, icon: Icon }: { value: string; label: string; icon: typeof YoutubeLogo }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-[#101419]/82 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_70px_-44px_rgba(0,0,0,0.95)] backdrop-blur-xl">
      <Icon size={29} weight="fill" className="text-[#ff473b]" />
      <p className="mt-5 font-mono text-[34px] font-bold leading-none tracking-[-0.05em] text-[#ff473b]">{value}</p>
      <p className="mt-2 text-[13px] text-white/55">{label}</p>
    </div>
  );
}

function DestinationCard({ destination }: { destination: JapanDestination }) {
  return (
    <div className="absolute bottom-20 right-0 z-20 w-full max-w-[410px] rounded-[24px] border border-white/13 bg-[#101419]/90 p-4 shadow-[0_32px_90px_-44px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:right-4 lg:right-0">
      <div className="relative h-[170px] overflow-hidden rounded-[16px] bg-[linear-gradient(165deg,rgba(255,209,165,0.82),rgba(42,65,89,0.72)_45%,rgba(12,17,21,0.98))]">
        {destination.thumbnailUrl ? (
          <img
            src={destination.thumbnailUrl}
            alt="Video de Luisito Comunica en Japón"
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,10,13,0.18))]" />
      </div>
      <div className="px-3 pb-1 pt-4">
        <p className="text-[13px] font-bold text-white/55">Luisito Comunica</p>
        <p className="mt-1 flex items-center gap-2 text-[17px] font-bold"><span className="h-3 w-3 rounded-full bg-[#ff473b]" /> Japón</p>
        <p className="mt-2 text-[13px] text-white/60">{destination.videoCount} videos de @luisitocomunica</p>
        <Link href="/map?channelId=luisito-global-map" className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold text-white">Ver destino <ArrowRight size={14} weight="bold" /></Link>
      </div>
    </div>
  );
}

function BrandStrip() {
  return (
    <section className="border-y border-white/8 py-9">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-white/56">Creado para trabajar con</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {sponsorLogos.map((logo) => (
          <div key={logo} className="grid h-20 place-items-center rounded-[16px] border border-white/9 bg-white/[0.035] px-4 text-center text-[20px] font-extrabold tracking-[-0.04em] text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {logo}
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="grid gap-8 border-b border-white/8 py-12 lg:grid-cols-[300px_1fr]">
      <h2 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.045em] text-white sm:text-[40px]">De tu canal<br />a un mapa en<br /><span className="text-[#ff473b]">minutos.</span></h2>
      <div className="grid gap-5 md:grid-cols-4">
        {steps.map((step, index) => <StepCard key={step.title} index={index + 1} {...step} />)}
      </div>
    </section>
  );
}

function StepCard({ title, icon: Icon, index }: { title: string; icon: typeof YoutubeLogo; index: number }) {
  return (
    <div className="relative min-h-[190px] rounded-[17px] border border-white/10 bg-white/[0.035] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="absolute -left-2 -top-3 grid h-9 w-9 place-items-center rounded-full bg-[#ff473b] text-[13px] font-extrabold text-white">{index}</span>
      <div className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full border border-[#ff473b]/25 bg-[#ff473b]/8 text-[#ff473b]">
        <Icon size={37} weight="fill" />
      </div>
      <p className="mx-auto mt-5 max-w-[130px] text-[13px] leading-5 text-white/82">{title}</p>
    </div>
  );
}

function FeatureGrid() {
  return (
    <section id="features" className="py-16">
      <div className="mx-auto max-w-[760px] text-center">
        <h2 className="text-[34px] font-extrabold leading-[1.03] tracking-[-0.05em] text-white sm:text-[44px]">Todo lo que necesitas para<br /><span className="text-[#ff473b]">crecer</span> como creador de viajes</h2>
        <p className="mt-3 text-[14px] text-white/55">Una plataforma, todas las herramientas para mostrar tu mundo.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </div>
    </section>
  );
}

function FeatureCard({ title, text, icon: Icon }: { title: string; text: string; icon: typeof YoutubeLogo }) {
  return (
    <article className="grid min-h-[150px] grid-cols-[82px_1fr] items-center gap-5 rounded-[16px] border border-white/9 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="grid h-16 w-16 place-items-center rounded-full border border-[#ff473b]/25 bg-[#ff473b]/8 text-[#ff473b]">
        <Icon size={35} weight="duotone" />
      </div>
      <div>
        <h3 className="text-[16px] font-extrabold text-white">{title}</h3>
        <p className="mt-2 max-w-[36ch] text-[13px] leading-5 text-white/62">{text}</p>
      </div>
    </article>
  );
}

function SponsorComparison() {
  return (
    <section className="grid gap-8 border-y border-white/8 py-12 lg:grid-cols-[0.82fr_1.8fr]">
      <div>
        <h2 className="text-[31px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white">¿Por qué <span className="text-[#ff473b]">TravelYourMap</span><br />te ayuda a cerrar mejores deals?</h2>
        <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-white/66">Las marcas compran destinos, audiencias y relevancia geográfica. Muéstralo todo en segundos.</p>
        <div className="mt-10 inline-flex items-center gap-4 rounded-[14px] border border-white/10 bg-white/[0.035] p-4 text-[13px] font-bold text-white/82">
          <ChartBar size={30} className="text-[#ff473b]" /> Un solo sponsorship puede pagar tu suscripción anual.
        </div>
      </div>
      <div className="grid rounded-[18px] border border-white/10 bg-white/[0.035] md:grid-cols-[1fr_auto_1.28fr]">
        <ComparisonPanel title="Sin TravelYourMap" bad items={["PDFs estáticos", "Videos sueltos", "Datos difíciles de entender", "Sin contexto geográfico", "Propuestas poco efectivas"]} />
        <div className="grid place-items-center border-y border-white/10 px-4 py-5 md:border-x md:border-y-0"><span className="rounded-full border border-white/18 px-4 py-3 text-[13px] font-extrabold">VS</span></div>
        <ComparisonPanel title="Con TravelYourMap" items={["Mapa interactivo", "Cobertura por destino", "Sponsors visibles", "Datos claros y visuales", "Propuestas que convierten"]} />
      </div>
    </section>
  );
}

function ComparisonPanel({ title, items, bad = false }: { title: string; items: string[]; bad?: boolean }) {
  return (
    <div className="p-8">
      <h3 className={`text-[15px] font-extrabold ${bad ? "text-white" : "text-[#ff473b]"}`}>{title}</h3>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <p key={item} className="flex items-center gap-3 text-[13px] text-white/70">
            {bad ? <XCircle size={18} className="text-[#ff473b]" /> : <CheckCircle size={18} className="text-[#49b86f]" />}
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function PublicPagePreview({ previewVideos }: { previewVideos: PreviewVideo[] }) {
  return (
    <section id="examples" className="grid gap-10 py-12 lg:grid-cols-[1.32fr_0.9fr] lg:items-center">
      <div className="rounded-[20px] border border-white/12 bg-[#0c1014] p-4 shadow-[0_32px_90px_-54px_rgba(0,0,0,0.95)]">
        <div className="mb-4 flex gap-2"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /></div>
        <div className="grid min-h-[470px] gap-5 rounded-[16px] bg-[radial-gradient(circle_at_65%_48%,rgba(56,143,205,0.34),transparent_28%),radial-gradient(circle_at_62%_50%,#19314a,#071018_58%,#05070a)] p-7 md:grid-cols-[190px_1fr]">
          <aside className="relative z-10">
            <div className="h-24 w-24 rounded-full border-4 border-white bg-[linear-gradient(145deg,#ffcf9d,#6d3529)]" />
            <h3 className="mt-5 text-[20px] font-extrabold">Luisito Comunica</h3>
            <p className="text-[12px] text-white/62">@luisitocomunica</p>
            <p className="mt-2 text-[12px] text-white/62">193 videos · 86 países</p>
            <div className="mt-7 grid gap-2 rounded-[14px] bg-[#0b1116]/78 p-3">
              {profileDestinations.map(([country, count]) => <p key={country} className="flex justify-between gap-3 text-[12px]"><span>{country}</span><span className="text-white/52">{count}</span></p>)}
              <Link href="/u/luisitocomunica" className="mt-3 text-[12px] font-bold text-white">Ver todos los destinos</Link>
            </div>
          </aside>
          <div className="relative min-h-[320px] overflow-hidden rounded-[18px] bg-[#05070a] p-3">
            <div className="grid h-full min-h-[320px] grid-cols-2 gap-3">
              {previewVideos.map((video, index) => (
                <article
                  key={`${video.country}-${video.thumbnailUrl}`}
                  className={index === 0 ? "relative col-span-2 overflow-hidden rounded-[14px]" : "relative overflow-hidden rounded-[14px]"}
                >
                  <img src={video.thumbnailUrl} alt={video.title} className="h-full min-h-[140px] w-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(5,8,13,0.82))]" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[11px] font-extrabold uppercase text-[#ff473b]">{video.country}</p>
                    <h4 className="mt-1 line-clamp-2 text-[13px] font-extrabold leading-4 text-white">{video.title}</h4>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-white/52">Tu página. Tu marca.</p>
        <h2 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-[-0.05em] text-white">Una página profesional para mostrar <span className="text-[#ff473b]">tu mundo.</span></h2>
        <div className="mt-8 grid gap-4">
          {["Tu link personalizado", "Mapa 3D con todos tus destinos", "Sponsors visibles por país o ciudad", "Tus videos con el embed oficial", "Optimizada para SEO"].map((item) => (
            <p key={item} className="flex items-center gap-3 text-[15px] text-white/72"><CheckCircle size={20} className="text-[#ff473b]" />{item}</p>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between rounded-[12px] border border-white/12 bg-white/[0.035] px-5 py-4 text-[14px] text-white/72">
          travelyourmap.com/u/luisitocomunica <Copy size={20} />
        </div>
      </div>
    </section>
  );
}

function buildPreviewVideos(videoLocations: TravelVideoLocation[]): PreviewVideo[] {
  const preferredCountries = ["JP", "AR", "IT", "TH"];
  return preferredCountries.flatMap((countryCode) => {
    const video = videoLocations.find((item) => item.country_code?.toUpperCase() === countryCode && item.thumbnail_url);
    if (!video?.thumbnail_url) return [];
    return [{
      country: video.country_name || countryCode,
      title: video.title,
      thumbnailUrl: video.thumbnail_url,
    }];
  });
}

function PricingSection() {
  return (
    <section id="pricing" className="border-t border-white/8 py-12">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <h2 className="text-[36px] font-extrabold tracking-[-0.05em] text-white">Elige el plan perfecto para ti</h2>
        <div className="rounded-full border border-white/10 bg-white/[0.035] p-1 text-[12px] font-bold"><span className="inline-flex rounded-full bg-[#ff473b]/14 px-4 py-2 text-[#ff473b]">Mensual</span><span className="inline-flex px-4 py-2 text-white/58">Anual</span><span className="inline-flex px-4 py-2 text-white/58">Ahorra 20%</span></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1fr_1fr_1fr]">
        <div className="py-5">
          <h3 className="text-[25px] font-extrabold leading-tight text-white">Las marcas compran <span className="text-[#ff473b]">destinos</span>, no solo views.</h3>
          <p className="mt-5 text-[14px] leading-7 text-white/62">TravelYourMap te ayuda a mostrar tu cobertura, experiencia y posicionamiento de forma clara y profesional para que cierres mejores deals.</p>
        </div>
        <PlanCard title="Sin TravelYourMap" price="" rows={["PDFs y documentos", "Links desordenados", "Información difícil de entender", "Propuesta poco profesional"]} muted />
        <PlanCard title="Creator Pro" price="$79" rows={planRows} featured />
        <PlanCard title="Agency" price="$199" rows={["Portafolio de canales", "API de acceso", "Portal de marcas", "Soporte dedicado"]} />
      </div>
    </section>
  );
}

function PlanCard({ title, price, rows, featured = false, muted = false }: { title: string; price?: string; rows: string[]; featured?: boolean; muted?: boolean }) {
  return (
    <article className={`relative rounded-[17px] border p-7 ${featured ? "border-[#ff473b]/70 bg-[#121014]" : "border-white/10 bg-white/[0.035]"}`}>
      {featured ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#ff473b]/70 bg-[#2b1210] px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">Más popular</span> : null}
      <h3 className="text-[14px] font-extrabold text-white/82">{title}</h3>
      {price ? <p className="mt-3 text-[34px] font-extrabold tracking-[-0.04em] text-white">{price}<span className="text-[13px] font-medium text-white/55"> /mes</span></p> : null}
      <div className="mt-6 grid gap-3">
        {rows.map((row) => <p key={row} className="flex items-center gap-2 text-[13px] text-white/68">{muted ? <XCircle size={16} className="text-[#ff473b]" /> : <CheckCircle size={16} className="text-[#ff735f]" />}{row}</p>)}
      </div>
      {featured ? <Link href="/onboarding?lang=es" className="mt-7 inline-flex w-full justify-center rounded-[9px] bg-[#ff473b] px-4 py-3 text-[13px] font-extrabold text-white">Comenzar ahora</Link> : null}
      {!featured && !muted ? <Link href="/pricing" className="mt-7 inline-flex w-full justify-center rounded-[9px] border border-white/14 px-4 py-3 text-[13px] font-extrabold text-white/78">Contactar ventas</Link> : null}
    </article>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="grid gap-7 border-y border-white/8 py-9 lg:grid-cols-[280px_1fr]">
      <h2 className="text-[24px] font-extrabold text-white">Preguntas frecuentes</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {faqs.map((question) => (
          <details key={question} className="group rounded-[10px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-bold text-white/78">{question}<span className="text-xl leading-none text-white/62 group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-[13px] leading-6 text-white/58">Sí. La plataforma se configura sobre tu contenido existente, mantiene YouTube como fuente oficial y ordena tu valor por destino.</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative mt-8 min-h-[360px] overflow-hidden border-t border-white/8 bg-[linear-gradient(90deg,rgba(7,10,13,0.34),rgba(7,10,13,0.96)_52%),linear-gradient(145deg,#4a3424,#101820_45%,#070a0d)]">
      <div className="absolute left-[8%] top-[18%] h-[220px] w-[340px] rounded-[48%] bg-[radial-gradient(circle,#f3b46f,transparent_68%)] opacity-18 blur-3xl" />
      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-14">
        <div className="min-h-[230px] rounded-[40px] bg-[radial-gradient(circle_at_50%_20%,rgba(255,223,165,0.35),transparent_35%),linear-gradient(150deg,#2e231d,#11181d_52%,#070a0d)]" />
        <div className="max-w-[620px] self-center">
          <h2 className="text-[34px] font-extrabold leading-[1.04] tracking-[-0.05em] text-white sm:text-[46px]">Tu contenido ya existe.<br />Ahora necesita <span className="text-[#ff473b]">verse profesional.</span></h2>
          <p className="mt-5 text-[15px] leading-7 text-white/65">Transforma tu canal en un media kit interactivo listo para sponsors, marcas y partnerships.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/onboarding?lang=es" className="rounded-[9px] bg-[#ff473b] px-10 py-4 text-[14px] font-extrabold text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.85)]">Crear mi mapa gratis</Link>
            <Link href="/map?channelId=luisito-global-map" className="inline-flex items-center gap-4 rounded-[9px] border border-white/20 px-10 py-4 text-[14px] font-extrabold text-white">Ver demo en vivo <Play size={15} weight="fill" /></Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-6 text-[12px] text-white/52"><span>Sin tarjeta de crédito</span><span>Configuración en minutos</span></div>
        </div>
      </div>
    </section>
  );
}
