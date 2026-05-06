import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad | TravelYourMap",
  description: "Política de privacidad de TravelYourMap para uso de YouTube API Services.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-4xl px-4 py-12 text-foreground">
      <h1 className="text-3xl font-semibold">Política de Privacidad</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        TravelYourMap no está afiliado, patrocinado ni respaldado por YouTube ni por Google.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Esta política explica cómo TravelYourMap usa datos relacionados con YouTube API Services.
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6 text-[#d6dce3]">
        <p>
          TravelYourMap usa YouTube API Services para resolver canales, cargar metadatos de videos y
          renderizar contenido con el reproductor oficial.
        </p>
        <p>
          Datos procesados: ID de canal/video, título, descripción, miniatura, fechas de publicación,
          métricas públicas disponibles, estado de ubicación y señales técnicas del pipeline.
        </p>
        <p>
          Los datos de estadísticas no autorizadas se refrescan o expiran de acuerdo con políticas de
          YouTube API Services. Cuando datos están expirados, el sistema los marca para actualización.
        </p>
        <p>
          También registramos métricas propias de producto (por ejemplo, apertura de paneles y
          acciones de navegación) para mejorar la operación de TravelYourMap.
        </p>
        <p>
          Para más detalle sobre el tratamiento de datos por parte de Google, consulta la{" "}
          <a
            href="https://www.google.com/policies/privacy"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            Política de Privacidad de Google
          </a>
          .
        </p>
      </section>

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/terms" className="underline underline-offset-2">
          Ver Términos
        </Link>
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener" className="underline underline-offset-2">
          Términos de YouTube
        </a>
      </div>
    </main>
  );
}
