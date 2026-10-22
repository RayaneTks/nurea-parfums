import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { SeasonSection } from "@/components/features/SeasonSection";
import { BrandShelf, topBrands } from "@/components/features/BrandShelf";
import { CatalogSection } from "@/components/home/CatalogSection";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { discoveryOrder } from "@/lib/catalog/discoveryOrder";
import { selectionDuMoment } from "@/lib/catalog/saison";
import { pageOg, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site";

/** Données via `getCachedCatalogue` (tag `public-catalogue`) — pas de HTML figé au build. */
export const dynamic = "force-dynamic";

/** Au-delà, « À l'affiche » devient une seconde grille. */
const MAX_FEATURED = 2;

/**
 * Le titre de l'accueil doit être écrit EN ENTIER ici.
 *
 * Le gabarit « %s | Nuréa Parfums » posé par `app/(shop)/layout.tsx` ne
 * s'applique qu'aux segments ENFANTS : /marque, /contact et /legal en héritent,
 * pas l'accueil, qui vit dans le même segment que le layout. La page portait
 * donc « Le catalogue » tout court — sans marque, sans ville, sans intention de
 * recherche, sur la page la plus visitée du site et celle qui s'affiche quand
 * on partage le lien.
 *
 * Formulation (gérant, 21/10/2026 : proposition 1 de `annexes/audit-final.md`) : le nom complet
 * d'abord — on cherche « nuréa parfums » après une story Snapchat —, puis ce qu'est le site et comment
 * commander. Aucune comparaison avec les marques : Nuréa ne vend pas leurs parfums, et toute phrase qui
 * l'en rapproche attend l'avis juridique. Plus de « Marseille » dans le titre (envois dans toute la
 * France) ; la ville reste dans la description comme fait (remise en main propre). 58 caractères :
 * au-delà de 60, Google coupe.
 */
const TITRE_ACCUEIL = `${SITE_NAME} — Catalogue de parfums, commande sur Snapchat`;

const DESCRIPTION_ACCUEIL = DEFAULT_DESCRIPTION;

export const metadata: Metadata = {
  /*
   * `absolute` court-circuite le gabarit du layout parent. Sans ce mot, une
   * chaîne simple serait de toute façon rendue telle quelle ici — mais
   * l'écrire dit l'intention, et protège si la page passait un jour dans un
   * segment enfant.
   */
  title: { absolute: TITRE_ACCUEIL },
  description: DESCRIPTION_ACCUEIL,
  alternates: { canonical: "/" },
  openGraph: pageOg("/"),
};

/**
 * L'accueil (04-PLAN-EXECUTION.md § B.10, composition « Flacon ») : la hero de la marque — qui est
 * Nuréa, ce qu'elle propose, par où entrer —, puis les parfums à l'affiche en compact, les parfums du
 * moment (sélection de saison), le rayon des marques, et le catalogue avec sa recherche et ses filtres, intouchés.
 */
export default async function HomePage() {
  const { perfumes, browseBrands } = await getCachedCatalogue();
  const featured = perfumes.filter((p) => p.isFeatured).slice(0, MAX_FEATURED);
  // Nouvel ordre à chaque visite, marques variées en tête — tiré ici, côté serveur (`discoveryOrder`).
  const catalogue = discoveryOrder(perfumes);
  // Sélection de saison (`saison.ts`) : lue à chaque visite, la page est dynamique.
  const moment = selectionDuMoment(perfumes);

  return (
    <>
      <Hero />

      <FeaturedSection perfumes={featured} />

      {moment ? <SeasonSection {...moment} /> : null}

      <BrandShelf brands={topBrands(perfumes)} />

      {/* `CatalogSection` lit les filtres dans l'URL : sans cette frontière,
          la page entière basculerait en rendu client. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogSection catalogPerfumes={catalogue} browseBrands={browseBrands} />
      </Suspense>
    </>
  );
}
