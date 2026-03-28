import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePageClient } from "@/components/home/HomePageClient";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCatalogBrowse } from "@/lib/catalog/getCatalogBrowse";
import { getCatalogPerfumes } from "@/lib/catalog/getCatalogPerfumes";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "La Galerie",
  description: `${SITE_NAME} — Une invitation à l&apos;exceptionnel. Découvrez notre sélection de sillages rares et engagez le dialogue pour une expertise personnalisée. Site officiel.`,
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
  
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePageClient catalogPerfumes={catalogPerfumes} browseBrands={browseBrands} />
    </Suspense>
  );
}
