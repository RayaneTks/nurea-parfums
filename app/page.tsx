import type { Metadata } from "next";
import { Suspense } from "react";

/** Données via `getCachedCatalogue` (tag `public-catalogue`) — pas de HTML figé au build. */
export const dynamic = "force-dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { Separator } from "@/components/ui/Separator";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { CatalogSection } from "@/components/home/CatalogSection";
import { Footer } from "@/components/layout/Footer";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Le Catalogue",
  description: `${SITE_NAME} — Retrouvez vos parfums préférés au meilleur prix. Découvrez notre sélection des plus grandes marques et contactez-nous sur Snapchat ou WhatsApp pour toute commande.`,
  keywords: [
    "Nuréa Parfums",
    "parfums pas cher",
    "grandes marques parfum",
    "parfumerie en ligne",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `La Galerie — ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
};

function HomeFallback() {
  return (
    <div
      className="nurea-vitrine-shell grain min-h-screen bg-[var(--nurea-bg)] p-10 pt-32"
      aria-busy="true"
    >
      <CatalogSkeleton />
    </div>
  );
}

export default async function HomePage() {
  const { perfumes: catalogPerfumes, browseBrands } = await getCachedCatalogue();

  const featuredPerfumes = catalogPerfumes.filter((p) => p.isFeatured).slice(0, 2);

  return (
    <div
      id="main-content"
      className="nurea-vitrine-shell grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]"
    >
      <Navbar />
      
      <Hero />
      <Separator variant="copper" withMonogram />

      {featuredPerfumes.length > 0 && (
        <>
          <FeaturedSection perfumes={featuredPerfumes} />
          <Separator variant="bordeaux" />
        </>
      )}

      <Suspense fallback={<HomeFallback />}>
        <CatalogSection catalogPerfumes={catalogPerfumes} browseBrands={browseBrands} />
      </Suspense>

      <Footer />
    </div>
  );
}
