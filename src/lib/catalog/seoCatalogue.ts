import { prisma } from "@/lib/db/prisma";
import { getBlurPlaceholder } from "@/lib/blurPlaceholder";
import type { Perfume } from "@/lib/data";

/**
 * Le catalogue tel que le lisent les pages indexables : `/parfums`, `/parfums/<marque>`,
 * `/parfums/<marque>/<parfum>` et le sitemap.
 *
 * Pourquoi pas `getCachedCatalogue()` : lui retombe sur un catalogue de démonstration VIDE quand
 * la base ne répond pas. C'est juste pour l'accueil, qui s'affiche quand même. Pour une page
 * indexée, c'est une catastrophe : chaque fiche répondrait 404, et un 404 est une consigne de
 * désindexation. Ici une panne de base LÈVE — la page répond 500, que Google traite comme un
 * incident passager et réessaie, sans rien retirer.
 *
 * Ce fichier ne fait que LIRE. Le cache, et les accesseurs qui passent par lui
 * (`getSeoCatalogue`, `getSeoBrand`, `getSeoPerfume`), vivent dans `src/lib/catalogue-service.ts`,
 * seul endroit de la vitrine où `unstable_cache` a droit de cité (04 §10) — et sous le même tag que
 * l'accueil : une modification dans la gestion invalide les deux d'un coup.
 */

export type SeoPerfume = {
  id: number;
  name: string;
  image: string;
  imageLight: string | null;
  blurDataURL: string;
  /** ISO 8601 — `unstable_cache` sérialise en JSON, une `Date` n'y survivrait pas. */
  updatedAt: string;
};

export type SeoBrand = {
  name: string;
  slug: string;
  /** Marque vendue en gamme complète : la fiche représente la marque, pas un flacon. */
  complete: boolean;
  /**
   * `Brand.image` : malgré son commentaire de schéma (« logo »), c'est un visuel au format des fiches,
   * que l'accueil affiche comme une carte de gamme. On le traite donc en visuel, pas en logo.
   */
  visual: string | null;
  visualLight: string | null;
  updatedAt: string;
  perfumes: SeoPerfume[];
};

/** Mêmes règles de visibilité que la vitrine : un visuel absent ou provisoire masque la fiche. */
function isPublicImage(image: string | null | undefined): image is string {
  const value = image?.trim() ?? "";
  return value !== "" && !value.includes("placeholder.svg") && !value.startsWith("/parfums/");
}

export async function loadSeoCatalogue(): Promise<SeoBrand[]> {
  const brands = await prisma.brand.findMany({
    where: { status: "PUBLISHED", name: { not: "" } },
    select: {
      name: true,
      slug: true,
      catalogMode: true,
      image: true,
      imageLight: true,
      updatedAt: true,
      perfumes: {
        where: { status: "PUBLISHED", name: { not: "" }, image: { not: "" } },
        select: { id: true, name: true, image: true, imageLight: true, updatedAt: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return brands
    .map((brand): SeoBrand => {
      const perfumes = brand.perfumes
        .filter((p) => isPublicImage(p.image) && p.name.trim() !== "")
        .map((p) => ({
          id: p.id,
          name: p.name,
          image: p.image,
          imageLight: p.imageLight,
          blurDataURL: getBlurPlaceholder(p.image),
          updatedAt: p.updatedAt.toISOString(),
        }));
      const latest = [brand.updatedAt, ...brand.perfumes.map((p) => p.updatedAt)].reduce((a, b) =>
        b > a ? b : a,
      );
      return {
        name: brand.name,
        slug: brand.slug,
        complete: brand.catalogMode === "COMPLETE",
        visual: isPublicImage(brand.image) ? brand.image : null,
        visualLight: brand.imageLight,
        updatedAt: latest.toISOString(),
        perfumes,
      };
    })
    .filter((brand) => brand.perfumes.length > 0 || (brand.complete && brand.visual !== null));
}

/** La forme attendue par les composants de fiche (`PerfumeImage`, cartes). */
export function toCardPerfume(brand: SeoBrand, perfume: SeoPerfume): Perfume {
  return {
    id: perfume.id,
    name: perfume.name,
    brand: brand.name,
    brandSlug: brand.slug,
    // Toujours un flacon réel ici : la catégorie « gamme » est réservée à la fiche-marque synthétique.
    category: "Sélections Individuelles",
    image: perfume.image,
    imageLight: perfume.imageLight ?? undefined,
    blurDataURL: perfume.blurDataURL,
  };
}
