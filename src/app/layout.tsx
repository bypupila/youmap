import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import Script from "next/script";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { AgentationToolbar } from "@/components/dev/agentation-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TravelMap for YouTube Creators",
  description:
    "Mapea tus videos de YouTube en un globo 3D con una interfaz nativa tipo YouTube Studio, analytics por país, sponsors y páginas públicas.",
  openGraph: {
    title: "TravelMap for YouTube Creators",
    description:
      "Conecta tu canal, importa tus videos y conviértelos en un mapa 3D con UI nativa de YouTube, analytics y monetización.",
    type: "website",
    url: siteUrl,
    siteName: "TravelMap - BY PUPILA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TravelMap for YouTube Creators",
    description: "Una capa geográfica para YouTube con UI nativa, analytics por destino y sponsor hub.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn(outfit.variable, jetbrainsMono.variable, "font-sans dark")}>
      <body className="travel-shell">
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wf6i1kgiq2");
          `}
        </Script>
        <TooltipProvider>{children}</TooltipProvider>
        <AgentationToolbar />
      </body>
    </html>
  );
}
