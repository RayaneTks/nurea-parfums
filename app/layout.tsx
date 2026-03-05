import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Cormorant_Garamond, Montserrat } from "next/font/google";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600"],
  variable: "--font-serif",
});

const sans = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nureaparfums.com"),
  title: {
    default: "Nurea Parfums | Catalogue premium de parfums",
    template: "%s | Nurea Parfums",
  },
  description:
    "Nurea Parfums: catalogue de parfums de luxe, marques iconiques et sélections niche. Navigation mobile-first par catégorie, marque et recherche.",
  robots: {
    index: true,
    follow: true,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

