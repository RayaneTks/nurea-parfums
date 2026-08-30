import type { Metadata } from "next";
import { MarquePageClient } from "@/components/marque/MarquePageClient";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "La Parfumerie",
  description: `${SITE_NAME} — Retrouvez les plus grands parfums au meilleur prix. Une sélection rigoureuse des meilleures marques homme et femme.`,
  keywords: [
    "Nuréa Parfums",
    "parfumerie marseille",
    "parfum pas cher",
    "grandes marques",
  ],
  alternates: {
    canonical: "/marque",
  },
  openGraph: {
    title: `${SITE_NAME} — La Parfumerie`,
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/marque`,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    title: `${SITE_NAME} — La Parfumerie`,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function MarquePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "La Parfumerie", path: "/marque" },
        ]}
      />
      <MarqueFaqJsonLd />
      <MarquePageClient />
    </>
  );
}
