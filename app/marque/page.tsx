import type { Metadata } from "next";
import { MarquePageClient } from "@/components/marque/MarquePageClient";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Marque officielle & orthographe",
  description: `${SITE_NAME} — orthographe officielle Nurea (N-U-R-E-A), site officiel ${SITE_URL.replace("https://", "")}. Retrouvez la maison sans confusion avec d'autres marques au nom proche.`,
  keywords: [
    "Nurea Parfums officiel",
    "nurea parfum site officiel",
    "orthographe Nurea",
    "nurea parfums",
  ],
  alternates: {
    canonical: "/marque",
  },
  openGraph: {
    title: `${SITE_NAME} — Marque officielle`,
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/marque`,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    title: `${SITE_NAME} — Marque officielle`,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function MarquePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Notre marque", path: "/marque" },
        ]}
      />
      <MarqueFaqJsonLd />
      <MarquePageClient />
    </>
  );
}
