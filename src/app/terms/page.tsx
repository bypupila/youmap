import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos | TravelYourMap",
  description: "Términos de uso de TravelYourMap y referencia obligatoria a los términos de YouTube.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-4xl px-4 py-12 text-foreground">
      <h1 className="text-3xl font-semibold">Términos de uso</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        TravelYourMap no está afiliado, patrocinado ni respaldado por YouTube ni por Google.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        TravelYourMap utiliza YouTube API Services para validar canales, importar metadatos y mostrar
        contenido con el reproductor oficial de YouTube.
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6 text-[#d6dce3]">
        <p>
          Al usar TravelYourMap aceptas estos términos y también aceptas quedar sujeto a los{" "}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            Términos de Servicio de YouTube
          </a>
          .
        </p>
        <p>
          No descargamos ni rehosteamos videos de YouTube. La reproducción se realiza mediante el
          player oficial embebido o redirección al video en YouTube.
        </p>
        <p>
          Los datos provenientes de YouTube API Services se usan para operar la experiencia del mapa
          y se mantienen bajo reglas de frescura y expiración para cumplir políticas vigentes.
        </p>
        <p>
          Si no aceptas estos términos, no debes usar funciones de importación o reproducción
          vinculadas a YouTube API Services.
        </p>
      </section>

      <div className="mt-10">
        <Link href="/privacy" className="text-sm underline underline-offset-2">
          Ver Política de Privacidad
        </Link>
      </div>
    </main>
  );
}
