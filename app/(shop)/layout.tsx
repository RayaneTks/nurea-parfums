import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RootJsonLd } from "@/components/seo/JsonLd";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  DEFAULT_DESCRIPTION,
  pageOg,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import { THEME_COLOR } from "@/design/brand";
import { brandFontClassName } from "@/design/fonts";

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Perfume store",
  robots: {
    index: true,
    follow: true,
    /*
     * Sans `max-image-preview: large`, Google plafonne la vignette d'un
     * résultat à une miniature. Sur un site dont l'argument est visuel — des
     * flacons — c'est la moitié du bénéfice d'une image qu'on abandonne.
     * `max-snippet: -1` lève de même la limite de longueur de l'extrait.
     */
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: { "fr-FR": "/" },
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  /*
   * Valeurs de repli : chaque page appelle `pageOg` et fournit les siennes.
   *
   * Ni titre, ni description, ni image ici. Le titre et la description sont
   * repris de ceux, résolus, de la page. L'image l'est de la convention de
   * fichier `opengraph-image.tsx` — l'ancienne URL écrite à la main,
   * « /opengraph-image », renvoyait un 404 : Next sert la vignette sous une
   * adresse hachée par son contenu, recalculée à chaque build. /contact et
   * /legal annonçaient donc une image morte aux robots des messageries.
   */
  openGraph: pageOg("/"),
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  /** Vitrine : manifeste PWA = entrée sur `/` (voir `app/api/pwa/shop`). */
  manifest: "/api/pwa/shop",
  icons: {
    icon: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  /** Sert d’icône sur Android; le manifeste PWA est `manifest` + `/api/pwa/shop` */
  other: { "mobile-web-app-capable": "yes" },
};

/**
 * Coque commune à toutes les pages de la vitrine.
 *
 * La barre de navigation et le pied de page vivent ici, pas dans chaque page :
 * ils sont présents partout, et les y recopier avait fini par produire quatre
 * enveloppes légèrement différentes. Les pages ne rendent plus que leur contenu.
 */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${brandFontClassName} flex min-h-svh flex-col`}
    >
      <a
        href="#main-content"
        className="nurea-label sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[100] focus:bg-nurea-accent focus:px-6 focus:py-4 focus:text-nurea-on-accent"
      >
        Aller au contenu principal
      </a>
      <RootJsonLd />
      <ThemeProvider>
        <Navbar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </ThemeProvider>
    </div>
  );
}
