import Link from "next/link";
import { ContactStrip } from "@/components/site/contact-strip";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[.18em] text-slate-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-100">Mapa no encontrado</h1>
      <p className="mt-3 text-sm text-slate-300">Ese creador todavía no tiene TravelYourMap público o el username no existe.</p>
      <Link href="/" className="mt-6 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400">
        Volver al inicio
      </Link>
      <div className="mt-8 w-full">
        <ContactStrip
          title="Contacto"
          description="Si esperabas encontrar una página pública o ves un error, usa soporte técnico."
          items={[
            { label: "Soporte", email: "support" },
            { label: "General", email: "hello" },
          ]}
          tone="dark"
          className="mt-0 border-t-slate-700"
        />
      </div>
    </main>
  );
}
