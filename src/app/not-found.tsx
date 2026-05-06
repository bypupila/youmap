import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[.18em] text-slate-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-100">Mapa no encontrado</h1>
      <p className="mt-3 text-sm text-slate-300">Ese creador todavía no tiene TravelYourMap público o el username no existe.</p>
      <Link href="/" className="mt-6 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400">
        Volver al inicio
      </Link>
    </main>
  );
}
