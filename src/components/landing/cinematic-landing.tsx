import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChartBar,
  CurrencyDollar,
  GlobeHemisphereWest,
  MapPin,
  Play,
  RocketLaunch,
  Users,
  UsersThree,
  Video,
  CheckCircle,
  XCircle,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { MiniMapModel } from "@/components/landing/mini-map-model";
import { PricingSection } from "@/components/landing/pricing-section";
import { ContactStrip } from "@/components/site/contact-strip";
import { DemoChannelShowcase } from "@/components/landing/demo-channel-showcase";
import { DEMO_VIDEO_LOCATIONS } from "@/lib/demo-data";
import type { TravelVideoLocation } from "@/lib/types";

const creatorStats = [
  { value: "2406", label: "videos mapeados", icon: YoutubeLogo },
  { value: "165", label: "países cubiertos", icon: GlobeHemisphereWest },
];

const BRAND_PROFILE_IMAGE = "/creators/by-pupila.png";
const DESTINATION_PREVIEW_IMAGE = "/creators/travelyourmap-influencer.png";
const FINAL_CTA_IMAGE = "/creators/demo-hero-mountain.png";
const CREATOR_AVATARS = [
  { src: BRAND_PROFILE_IMAGE, alt: "BY PUPILA" },
  { src: "/creators/drew-binsky.png", alt: "Drew Binsky" },
  { src: "/creators/alan-por-el-mundo.png", alt: "Alan por el Mundo" },
  { src: "/creators/misias-pero-viajeras.png", alt: "Misias pero Viajeras" },
];

const keyFeatures = [
  "Influencers de viajes",
  "Agencias",
  "Sponsors",
  "Colaboraciones",
  "Mapas interactivos",
];

const keyFeatureIcons = [UsersThree, Users, CurrencyDollar, RocketLaunch, GlobeHemisphereWest, Video];
const DEMO_MAP_HREF = "/map?channelId=demo-channel";

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

const planRows = ["Videos ilimitados", "Competitor analytics", "Sponsor hub", "Sync prioritaria", "Página pública avanzada"];

const faqs = [
  "¿TravelYourMap reemplaza a YouTube?",
  "¿Puedo activar sponsors por país o ciudad?",
  "¿Pierdo mis views o ingresos?",
  "¿Necesito editar mis videos?",
  "¿Qué tipos de creadores pueden usarlo?",
  "¿Cuánto tarda configurarlo?",
];

export async function CinematicLanding() {
  const videoLocations = DEMO_VIDEO_LOCATIONS;

  return (
    <main className="creator-landing min-h-[100dvh] overflow-x-clip bg-[#070a0d] text-[#f5f2ed]">
      <div className="pointer-events-none fixed inset-0 z-0 creator-noise" />
      <div className="relative z-[1] mx-auto w-full max-w-[1500px] px-5 py-4 sm:px-8 lg:px-14">
        <CreatorNav />
        <HeroSection videoLocations={videoLocations} />
        <BrandStrip />
        <HowItWorks />
        <FeatureGrid />
        <SponsorComparison />
        <DemoChannelShowcase />
        <PricingSection planRows={planRows} />
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
          <span className="hidden rounded-full border border-[#ff473b]/65 px-3 py-2 text-white/85 md:inline-flex">ES</span>
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
}: {
  videoLocations: TravelVideoLocation[];
}) {
  return (
    <section className="relative mt-[30px] grid min-h-[720px] items-start gap-10 pb-6 pt-20 lg:min-h-[680px] lg:grid-cols-[0.92fr_1.08fr] lg:pt-4">
      <div className="relative z-10 max-w-[620px]">
        <p className="mb-5 text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#ff473b]">El media kit interactivo para creadores de viajes</p>
        <h1 className="max-w-[11ch] text-[46px] font-extrabold leading-[0.98] tracking-[-0.055em] text-white sm:text-[68px] lg:text-[76px]">
          Convierte tu canal en un mapa que <span className="text-[#ff473b]">abre puertas.</span>
        </h1>
        <p className="mt-7 max-w-[48ch] text-[16px] leading-8 text-white/66">
          Importa tu canal de YouTube, detectamos destinos y crea tu página web interactiva lista para marcas y sponsors.
        </p>
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center -space-x-3.5">
            {CREATOR_AVATARS.map((creator, index) => (
              <div
                key={creator.alt}
                className="relative h-11 w-11 overflow-hidden rounded-[12px] border border-white/20 bg-[#101419] shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
                style={{ zIndex: CREATOR_AVATARS.length - index }}
              >
                <Image src={creator.src} alt={creator.alt} fill sizes="44px" className="object-cover" />
              </div>
            ))}
          </div>
          <div className="max-w-[310px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff473b]/35 bg-[#ff473b]/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#ff6a60]">
              <RocketLaunch size={14} weight="fill" />
              Creator Mode
            </div>
            <p className="mt-2 text-[13px] leading-5 text-white/68">
              Únete a una red de creadores ficticios y reales que ya están cerrando mejores deals.
            </p>
          </div>
        </div>
      </div>

      <div className="relative min-h-[560px] lg:min-h-[760px]">
        <CreatorGlobe videoLocations={videoLocations} />
        <div className="absolute right-0 top-10 z-20 flex w-full max-w-[430px] flex-col gap-4 sm:right-4 lg:right-0">
          <div className="grid w-full max-w-[410px] grid-cols-2 gap-4 self-end lg:w-[410px]">
            {creatorStats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
          </div>
          <div className="w-full max-w-[410px] self-end lg:w-[410px]">
            <DestinationCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorGlobe({ videoLocations }: { videoLocations: TravelVideoLocation[] }) {
  return (
    <div className="creator-real-globe absolute -left-[14%] -top-[180px] h-[780px] w-[780px] overflow-hidden rounded-full lg:-left-[8%] lg:-top-[196px] lg:h-[980px] lg:w-[980px]">
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

function DestinationCard() {
  return (
    <div className="w-full rounded-[24px] border border-white/13 bg-[#101419]/90 p-4 shadow-[0_32px_90px_-44px_rgba(0,0,0,0.95)] backdrop-blur-xl">
      <div className="relative h-[170px] overflow-hidden rounded-[16px]">
        <Image
          src={DESTINATION_PREVIEW_IMAGE}
          alt="Vista previa creada de TravelYourMap"
          fill
          sizes="(max-width: 768px) 100vw, 410px"
          className="object-cover"
        />
      </div>
      <div className="px-3 pb-1 pt-4">
        <div className="grid gap-3">
          <Link
            href={DEMO_MAP_HREF}
            className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-white/18 bg-white/[0.03] px-8 py-4 text-[14px] font-bold text-white transition hover:bg-white/[0.07] active:translate-y-0 active:scale-[0.98]"
          >
            Ver mapa demo <Play size={15} weight="fill" />
          </Link>
          <Link
            href={DEMO_MAP_HREF}
            className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-[#ff473b] px-8 py-4 text-[14px] font-bold text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.85)] transition hover:-translate-y-0.5 hover:bg-[#ff5b50] active:translate-y-0 active:scale-[0.98]"
          >
            Crear mi mapa <ArrowRight size={17} weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BrandStrip() {
  return (
    <section className="border-y border-white/8 py-9">
      <div className="mx-auto grid max-w-[980px] gap-6">
        <div className="mx-auto max-w-[620px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">Perfil comercial</p>
          <p className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-[-0.045em] text-white sm:text-[40px]">Trabajamos con</p>
          <p className="mt-4 text-[15px] leading-7 text-white/58">
            Influencers de viajes, agencias y sponsors que necesitan presentar su cobertura con contexto geográfico.
          </p>
        </div>
        <div className="grid grid-cols-2 justify-items-center gap-4 md:grid-cols-3 lg:grid-cols-5">
          {keyFeatures.map((feature, index) => {
            const Icon = keyFeatureIcons[index] ?? GlobeHemisphereWest;

            return (
              <div key={feature} className="grid min-h-20 w-full place-items-center rounded-[16px] border border-white/9 bg-white/[0.035] px-4 py-4 text-center text-[14px] font-extrabold leading-5 tracking-[-0.03em] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Icon size={28} weight="fill" className="mb-3 text-[#ff473b]" />
                {feature}
              </div>
            );
          })}
        </div>
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
        <div className="relative min-h-[260px] overflow-hidden rounded-[40px] border border-white/10 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] lg:min-h-[320px]">
          <Image
            src={FINAL_CTA_IMAGE}
            alt="Influencer de viaje grabando en una montaña"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a0d] via-transparent to-transparent opacity-40" />
        </div>
        <div className="max-w-[620px] self-center">
          <h2 className="text-[34px] font-extrabold leading-[1.04] tracking-[-0.05em] text-white sm:text-[46px]">Tu contenido ya existe.<br />Ahora necesita <span className="text-[#ff473b]">verse profesional.</span></h2>
          <p className="mt-5 text-[15px] leading-7 text-white/65">Transforma tu canal en un media kit interactivo listo para sponsors, marcas y partnerships.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/onboarding?lang=es" className="rounded-[9px] bg-[#ff473b] px-10 py-4 text-[14px] font-extrabold text-white shadow-[0_20px_46px_-24px_rgba(255,71,59,0.85)]">Crear mi mapa gratis</Link>
            <Link href={DEMO_MAP_HREF} className="inline-flex items-center gap-4 rounded-[9px] border border-white/20 px-10 py-4 text-[14px] font-extrabold text-white">Ver demo en vivo <Play size={15} weight="fill" /></Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-6 text-[12px] text-white/52"><span>Requiere tarjeta de crédito</span><span>Configuración en minutos</span></div>
        </div>
      </div>
      <div className="mx-auto max-w-[1500px] px-5 pb-14 sm:px-8 lg:px-14">
        <ContactStrip
          title="Contacto"
          description="Escribe a soporte si algo no funciona, a marketing para alianzas o a hello para consultas generales."
          items={[
            { label: "General", email: "hello" },
            { label: "Marketing", email: "marketing" },
            { label: "Soporte", email: "support" },
          ]}
          tone="dark"
          className="mt-0 border-t-white/10"
        />
      </div>
    </section>
  );
}
