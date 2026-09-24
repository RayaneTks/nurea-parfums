import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/features/Hero";
import { FeaturedSection } from "@/components/features/FeaturedSection";
import { CatalogSection } from "@/components/home/CatalogSection";
import { CatalogSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { getCachedCatalogue } from "@/lib/catalogue-service";
import { pageOg, SITE_NAME } from "@/lib/site";

/** Données via `getCachedCatalogue` (tag `public-catalogue`) — pas de HTML figé au build. */
export const dynamic = "force-dynamic";

/** Au-delà, la mise en avant éditoriale repousse le catalogue trop bas. */
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
 * Formulation : la marque d'abord, parce que le trafic vient du bouche-à-oreille
 * et de Snapchat — on cherche « nuréa parfums » avant de chercher « parfum pas
 * cher ». Puis les deux mots de la recherche locale, « parfum » et « Marseille ».
 * 54 caractères : au-delà de 60, Google coupe. « Au meilleur prix » est passé
 * dans la description, où il a la place.
 */
const TITRE_ACCUEIL = `${SITE_NAME} — Parfums de grandes marques à Marseille`;

const DESCRIPTION_ACCUEIL = `${SITE_NAME}, parfumerie à Marseille : les plus grandes marques de parfum pour homme et femme, au meilleur prix. Commande sur Snapchat, remise en main propre ou envoi.`;

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
