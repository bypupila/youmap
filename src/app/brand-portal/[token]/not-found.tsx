import Link from "next/link";

export default function BrandPortalNotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f2] px-4 text-[#151515]">
      <section className="w-full max-w-md rounded-lg border border-[#d8d5ca] bg-white/80 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5a3d]">Portal privado</p>
        <h1 className="mt-3 text-2xl font-black">Portal no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5b53]">
          El link puede estar revocado, vencido o no existir. Solicita un nuevo enlace al creador.
        </p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#151515] px-4 text-sm font-black text-white">
          Volver a TravelYourMap
        </Link>
      </section>
    </main>
  );
}
