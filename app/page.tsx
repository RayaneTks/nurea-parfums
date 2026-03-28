import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/features/Hero";
import { Separator } from "@/components/ui/Separator";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { CatalogSection } from "@/components/home/CatalogSection";
import { Footer } from "@/components/layout/Footer";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCatalogBrowse } from "@/lib/catalog/getCatalogBrowse";
import { getCatalogPerfumes } from "@/lib/catalog/getCatalogPerfumes";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "La Galerie",
  description: `${SITE_NAME} — Une invitation à l'exceptionnel. Découvrez notre sélection de sillages rares et engagez le dialogue pour une expertise personnalisée. Site officiel.`,
  keywords: [
    "Nuréa Parfums",
    "parfumerie d'exception",
    "sillage rare",
    "haute parfumerie",
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
    <div className="grain min-h-screen bg-[var(--nurea-bg)] p-10 pt-32" aria-busy="true">
      <CatalogSkeleton />
    </div>
  );
}

export default async function HomePage() {
  const [catalogPerfumes, browseBrands] = await Promise.all([
    getCatalogPerfumes(),
    getCatalogBrowse(),
  ]);

  const featuredPerfumes = catalogPerfumes.filter((p) => p.isFeatured).slice(0, 2);

  return (
    <div id="main-content" className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
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
