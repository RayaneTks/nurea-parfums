import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { GFS_Didot, Inter } from "next/font/google";

const serif = GFS_Didot({
  weight: "400",
  subsets: ["greek"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nureaparfums.com"),
  title: {
    default: "Nurea Parfums — Maison de Haute Parfumerie",
    template: "%s | Nurea Parfums",
  },
  description:
    "Decouvrez notre selection privee de parfums d'exception. Fragrances rares et signatures olfactives, disponibles sur commande.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Nurea Parfums",
    title: "Nurea Parfums — Maison de Haute Parfumerie",
    description:
      "Selection privee de parfums d'exception. Fragrances rares disponibles sur commande.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nurea Parfums",
    description: "Maison de Haute Parfumerie — Fragrances d'exception sur commande.",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${serif.variable} ${sans.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
