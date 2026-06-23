import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgentationToolbar } from "@/components/dev/agentation-toolbar";

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
  title: "TravelYourMap | mapas de viaje para creadores",
  description:
    "Conecta tu canal de YouTube, importa videos y conviértelos en un mapa interactivo con analytics por país, sponsors y páginas públicas.",
  openGraph: {
    title: "TravelYourMap | mapas de viaje para creadores",
    description:
      "Conecta tu canal, importa tus videos y conviértelos en un mapa interactivo con analytics, monetización y páginas públicas.",
    type: "website",
    url: siteUrl,
    siteName: "TravelYourMap - BY PUPILA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TravelYourMap | mapas de viaje para creadores",
    description: "Una capa geográfica para canales de viaje con analytics por destino, sponsors y perfiles públicos.",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn(outfit.variable, jetbrainsMono.variable, "font-sans dark")} suppressHydrationWarning>
      <body className="travel-shell" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <AgentationToolbar />
      </body>
    </html>
  );
}
