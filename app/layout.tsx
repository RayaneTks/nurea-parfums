import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Cormorant_Garamond, Manrope } from "next/font/google";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600"],
  variable: "--font-serif",
});

const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nureaparfums.com"),
  title: {
    default: "Nuréa Parfums | Haute Parfumerie — Conciergerie Privée",
    template: "%s | Nuréa Parfums",
  },
  description:
    "Découvrez notre sélection privée de haute parfumerie. Des grandes Maisons aux créations de niche les plus confidentielles, Nuréa vous accompagne vers votre signature olfactive.",
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
