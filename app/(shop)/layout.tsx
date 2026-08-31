import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RootJsonLd } from "@/components/seo/JsonLd";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  DEFAULT_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import { THEME_COLOR } from "@/design/brand";
import { brandFontClassName } from "@/design/fonts";

/** OG dynamique 1200×630 — voir `app/(shop)/opengraph-image.tsx` */
const ogImage = "/opengraph-image";

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
  robots: { index: true, follow: true },
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
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [ogImage],
  },
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
