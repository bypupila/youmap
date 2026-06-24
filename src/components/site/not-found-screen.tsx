"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  EnvelopeSimple,
  HouseLine,
  MapPinLine,
  MapTrifold,
  SealQuestion,
  WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_EMAILS } from "@/lib/app-emails";
import { cn } from "@/lib/utils";

type NotFoundVariant = "public" | "private";

type RouteItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof HouseLine;
  external?: boolean;
};

interface NotFoundScreenProps {
  variant?: NotFoundVariant;
}

const variantCopy: Record<
  NotFoundVariant,
  {
    eyebrow: string;
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    supportLabel: string;
    supportDescription: string;
    supportHref: string;
  }
> = {
  public: {
    eyebrow: "Error 404 · ruta perdida",
    title: "Mapa no encontrado",
    description:
      "La URL no coincide con una página pública activa, el perfil fue retirado o el enlace llegó cortado. Volvé a una ruta segura y seguí desde ahí.",
    primaryLabel: "Volver al inicio",
    secondaryLabel: "Abrir mapa demo",
    supportLabel: "Escribir a soporte",
    supportDescription: "Si el enlace debería existir, revisamos el caso con el equipo técnico.",
    supportHref: `mailto:${APP_EMAILS.support}`,
  },
  private: {
    eyebrow: "Portal privado · acceso inválido",
    title: "Portal no disponible",
    description:
      "El enlace puede estar vencido, revocado o incompleto. Pedí un acceso nuevo al creador o regresá al inicio para seguir navegando.",
    primaryLabel: "Volver al inicio",
    secondaryLabel: "Crear un mapa",
    supportLabel: "Contactar soporte",
    supportDescription: "Podemos validar el enlace y confirmar si todavía está activo.",
    supportHref: `mailto:${APP_EMAILS.support}`,
  },
};

const publicRoutes: RouteItem[] = [
  {
    href: "/",
    label: "Inicio",
    description: "Regresá a la portada principal.",
    icon: HouseLine,
  },
  {
    href: "/map",
    label: "Mapa demo",
    description: "Explorá un mapa público ya cargado.",
    icon: MapTrifold,
  },
  {
    href: "/explore",
    label: "Explorar",
    description: "Navegá perfiles y hallá otros creadores.",
    icon: Compass,
  },
  {
    href: "/onboarding",
    label: "Crear mapa",
    description: "Arrancá un flujo nuevo para tu canal.",
    icon: MapPinLine,
  },
];

const privateRoutes: RouteItem[] = [
  {
    href: "/",
    label: "Inicio",
    description: "Volvé al punto de partida.",
    icon: HouseLine,
  },
  {
    href: "/onboarding",
    label: "Crear mapa",
    description: "Generá un nuevo espacio público.",
    icon: MapTrifold,
  },
  {
    href: `mailto:${APP_EMAILS.support}`,
    label: "Soporte",
    description: "Pedí validación sobre el enlace recibido.",
    icon: EnvelopeSimple,
    external: true,
  },
];

export function NotFoundScreen({ variant = "public" }: NotFoundScreenProps) {
  const reducedMotion = useReducedMotion();
  const copy = variantCopy[variant];
  const routes = variant === "public" ? publicRoutes : privateRoutes;
  const spring = { type: "spring" as const, stiffness: 110, damping: 18 };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#111416] text-[#f3eee7]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,90,61,0.18),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(255,90,61,0.11),transparent_20%),radial-gradient(circle_at_70%_82%,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.95),transparent_92%)]" />
      <div className="absolute left-[6%] top-[12%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,90,61,0.18),transparent_68%)] blur-3xl" />
      <div className="absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <section className="max-w-2xl">
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[#f3eee7]">
              <WarningCircle className="size-3.5" />
              <span>{copy.eyebrow}</span>
            </Badge>

            <div className="mt-6 space-y-5">
              <h1 className="max-w-[11ch] text-4xl font-semibold tracking-tighter text-[#fff8f2] sm:text-5xl md:text-6xl md:leading-none">
                {copy.title}
              </h1>
              <p className="max-w-[62ch] text-base leading-7 text-[#c5beb4] sm:text-[17px]">
                {copy.description}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#ff5a3d] text-[#fff8f2] hover:bg-[#d8462f]">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  {copy.primaryLabel}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/10 bg-white/[0.03] text-[#f3eee7] hover:bg-white/[0.06]">
                <Link href={variant === "public" ? "/map" : "/onboarding"}>{copy.secondaryLabel}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-[#d8d2c8] hover:bg-white/[0.05] hover:text-[#fff8f2]">
                <Link href={copy.supportHref}>
                  <EnvelopeSimple className="size-4" />
                  {copy.supportLabel}
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <InfoPill label="Estado" value="404" accent />
              <InfoPill label="Siguiente paso" value={variant === "public" ? "Mapa demo" : "Inicio"} />
              <InfoPill label="Soporte" value={APP_EMAILS.support.split("@")[0]} />
            </div>
          </section>

          <motion.aside
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={spring}
            className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.82)] backdrop-blur-xl sm:p-6"
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_34%,transparent_68%,rgba(255,90,61,0.05))]" />
            <div className="absolute right-4 top-4 text-[clamp(5rem,16vw,8rem)] font-black tracking-[-0.08em] text-white/[0.05]">404</div>

            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#ff8c75]">Ruta sugerida</p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#fff8f2]">Accesos rápidos para salir de este punto</h2>
                </div>
                <motion.div
                  aria-hidden="true"
                  animate={reducedMotion ? undefined : { y: [0, -8, 0], scale: [1, 1.03, 1] }}
                  transition={reducedMotion ? undefined : { duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#ff5a3d]"
                >
                  <MapPinLine className="size-5" />
                </motion.div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[#0f1214]/85 p-4">
                <div className="flex items-center gap-3 text-[#d8d2c8]">
                  <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#ff5a3d]">
                    <SealQuestion className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#fff8f2]">Trayectoria interrumpida</p>
                    <p className="text-sm text-[#b9b2a7]">El destino pedido no está disponible en este momento.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-l border-white/10 pl-4">
                  {routes.map((route, index) => {
                    const Icon = route.icon;
                    return (
                      <motion.div
                        key={route.label}
                        initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                        transition={{ ...spring, delay: index * 0.08 }}
                        className="group rounded-2xl border border-white/0 bg-white/[0.03] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                      >
                        {route.external ? (
                          <a href={route.href} className="flex items-start gap-3">
                            <RouteIcon icon={Icon} />
                            <RouteCopy label={route.label} description={route.description} />
                          </a>
                        ) : (
                          <Link href={route.href} className="flex items-start gap-3">
                            <RouteIcon icon={Icon} />
                            <RouteCopy label={route.label} description={route.description} />
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.18 }}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8c75]">Señal</p>
                  <p className="mt-2 text-sm leading-6 text-[#d8d2c8]">
                    Si llegaste desde un enlace compartido, pedí que te lo reenvíen sin espacios ni caracteres recortados.
                  </p>
                </motion.div>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.24 }}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8c75]">Contacto</p>
                  <p className="mt-2 text-sm leading-6 text-[#d8d2c8]">{copy.supportDescription}</p>
                </motion.div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}

function InfoPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.22em]", accent ? "text-[#ff8c75]" : "text-[#a8a096]")}>{label}</p>
      <p className="mt-2 text-sm font-medium tracking-tight text-[#fff8f2]">{value}</p>
    </div>
  );
}

function RouteIcon({ icon: Icon }: { icon: typeof HouseLine }) {
  return (
    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#ff5a3d] transition-transform group-hover:scale-[1.03]">
      <Icon className="size-4" />
    </div>
  );
}

function RouteCopy({ label, description }: { label: string; description: string }) {
  return (
    <div className="min-w-0 pt-0.5">
      <p className="text-sm font-semibold text-[#fff8f2]">{label}</p>
      <p className="mt-1 text-sm leading-5 text-[#b9b2a7]">{description}</p>
    </div>
  );
}
