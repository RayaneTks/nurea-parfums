import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { CatalogSection } from "@/components/home/CatalogSection";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** Données via `getCachedCatalogue` (tag `public-catalogue`) — pas de HTML figé au build. */
export const dynamic = "force-dynamic";

/** Au-delà, la mise en avant éditoriale repousse le catalogue trop bas. */
const MAX_FEATURED = 2;

export const metadata: Metadata = {
  title: "Le catalogue",
  description: `${SITE_NAME} — Retrouvez vos parfums préférés au meilleur prix. Notre sélection des plus grandes marques ; commandez sur Snapchat ou WhatsApp.`,
  keywords: [
    "Nuréa Parfums",
    "parfums pas cher",
    "grandes marques parfum",
    "parfumerie en ligne",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `Le catalogue — ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
};

export default async function HomePage() {
  const { perfumes, browseBrands } = await getCachedCatalogue();
  const featured = perfumes.filter((p) => p.isFeatured).slice(0, MAX_FEATURED);

  return (
    <>
      <Hero />

      {featured.length > 0 && <FeaturedSection perfumes={featured} />}

      {/* `CatalogSection` lit les filtres dans l'URL : sans cette frontière,
          la page entière basculerait en rendu client. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogSection catalogPerfumes={perfumes} browseBrands={browseBrands} />
      </Suspense>
    </>
  );
}
