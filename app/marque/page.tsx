import type { Metadata } from "next";
import { MarquePageClient } from "@/components/marque/MarquePageClient";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { MarqueFaqJsonLd } from "@/components/seo/MarqueFaqJsonLd";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "La Maison",
  description: `${SITE_NAME} — Découvrez l&apos;histoire et l&apos;exigence de notre Maison de Haute Parfumerie. Un sillage, une émotion, une signature unique.`,
  keywords: [
    "Nuréa Parfums",
    "maison de parfum",
    "art du sillage",
    "parfumerie artisanale",
  ],
  alternates: {
    canonical: "/marque",
  },
  openGraph: {
    title: `${SITE_NAME} — La Maison`,
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/marque`,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    title: `${SITE_NAME} — La Maison`,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function MarquePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "La Maison", path: "/marque" },
        ]}
      />
      <MarqueFaqJsonLd />
      <MarquePageClient />
    </>
  );
}
