import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RootJsonLd } from "@/components/seo/JsonLd";
import {
  DEFAULT_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import { GFS_Didot, Inter } from "next/font/google";

const serif = GFS_Didot({
  weight: "400",
  subsets: ["greek", "latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** OG dynamique 1200×630 — voir `app/opengraph-image.tsx` */
const ogImage = "/opengraph-image";

export const viewport: Viewport = {
  themeColor: "#0A0508",
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
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
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
  icons: {
    icon: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  /** Sert d’icône sur Android; `app/manifest.ts` alimente le manifeste PWA. */
  other: { "mobile-web-app-capable": "yes" },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      className="dark transition-colors duration-300 ease-out"
      suppressHydrationWarning
    >
      <body
        className={`${serif.variable} ${sans.variable} font-sans antialiased transition-colors duration-300 ease-out`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-[var(--nurea-accent)] focus:text-white focus:px-4 focus:py-2 focus:text-sm"
        >
          Aller au contenu principal
        </a>
        <RootJsonLd />
        <div className="nurea-viewport-top-shield" aria-hidden />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
