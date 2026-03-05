import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

