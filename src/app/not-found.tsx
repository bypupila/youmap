import Link from "next/link";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr";

export default function NotFoundPage() {
  return (
    <main className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 text-foreground">
      <div className="platform-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,0,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(255,0,0,0.10),transparent_28%),linear-gradient(180deg,rgba(17,20,22,0.96),rgba(17,20,22,0.86))]"
        aria-hidden="true"
      />

      <section className="tm-surface-strong relative z-10 mx-auto w-full max-w-xl rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,0,0,0.24),rgba(255,0,0,0.08))] text-primary shadow-[inset_0_1px_0_rgba(255,244,238,0.14)]">
          <GlobeHemisphereWest size={26} weight="duotone" aria-hidden="true" />
        </div>
        <p className="yt-overline mt-5">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Mapa no encontrado
        </h1>
        <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          No pudimos encontrar lo que buscás. Puede que el creador todavía no tenga su YouMap publicado, que el enlace haya cambiado, o que la URL tenga un error.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-2">
          <Link href="/" className="yt-btn-primary w-full sm:w-auto">
            Volver al inicio
          </Link>
          <Link href="/explore" className="yt-btn-secondary w-full sm:w-auto">
            Explorar creadores
          </Link>
        </div>
      </section>
    </main>
  );
}
