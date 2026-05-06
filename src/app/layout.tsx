import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import Script from "next/script";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn(outfit.variable, jetbrainsMono.variable, "font-sans dark")} suppressHydrationWarning>
      <body className="travel-shell" suppressHydrationWarning>
        {process.env.NODE_ENV === "development" ? (
          <Script id="dev-extension-hydration-guard" strategy="beforeInteractive">
            {`
              (function () {
                var selectors = ["#heurio-app", ".heurio-overlay", "[class*='heurio-']", "[id*='heurio-']"];
                var removeInjectedNodes = function () {
                  selectors.forEach(function (selector) {
                    document.querySelectorAll(selector).forEach(function (node) {
                      node.parentNode && node.parentNode.removeChild(node);
                    });
                  });
                };
                removeInjectedNodes();
                var observer = new MutationObserver(removeInjectedNodes);
                observer.observe(document.documentElement, { childList: true, subtree: true });
                window.addEventListener("load", function () {
                  window.setTimeout(function () {
                    removeInjectedNodes();
                    observer.disconnect();
                  }, 2500);
                });
              })();
            `}
          </Script>
        ) : null}
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
