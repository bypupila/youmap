import Link from "next/link";

export default function SponsorReportNotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f1e8] px-4 text-[#16120d]">
      <section className="w-full max-w-md rounded-lg border border-[#d7cbbb] bg-white/75 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b6b4a]">Reporte privado</p>
        <h1 className="mt-3 text-2xl font-black">Reporte no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f574f]">
          El link puede estar revocado, vencido o no existir. Solicita un nuevo enlace al creador.
        </p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#16120d] px-4 text-sm font-black text-white">
          Volver a TravelYourMap
        </Link>
      </section>
    </main>
  );
}
