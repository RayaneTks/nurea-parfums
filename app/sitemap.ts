import type { MetadataRoute } from "next";
import { getSeoCatalogue } from "@/lib/catalogue-service";
import type { SeoBrand } from "@/lib/catalog/seoCatalogue";
import { brandPath, CATALOGUE_PATH, perfumePath } from "@/lib/seo/paths";
import { SITE_URL } from "@/lib/site";

/** Relu au plus toutes les heures : une fiche ajoutée dans la gestion y entre sans redéploiement. */
export const revalidate = 3600;

const base = SITE_URL.replace(/\/$/, "");

/**
 * Plan du site : les pages fixes, puis chaque marque et chaque parfum publiés.
 *
 * `lastModified` n'est écrit que quand il est VRAI. Il portait `new Date()` partout — la date du
 * rendu, pas celle d'une modification. Google le sait, et un `lastmod` qui ment à chaque lecture
 * finit ignoré pour tout le site, y compris le jour où il dirait vrai. Les pages fixes n'en ont
 * donc pas ; les marques et les parfums portent leur `updatedAt`.
 *
 * `changefreq` et `priority` ont disparu : Google a annoncé les ignorer.
 *
 * Base injoignable : on sert les pages fixes plutôt qu'une erreur. Un plan incomplet ne retire
 * rien de l'index ; une URL absente du plan n'est pas une URL supprimée.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    { url: base },
    { url: `${base}${CATALOGUE_PATH}` },
    { url: `${base}/marque` },
    { url: `${base}/contact` },
  ];

  let brands: SeoBrand[] = [];
  try {
    brands = await getSeoCatalogue();
  } catch (error) {
    console.error("[sitemap] catalogue injoignable, plan réduit aux pages fixes :", error);
    return fixed;
  }

  const latest = brands.reduce<string | null>((acc, b) => (acc === null || b.updatedAt > acc ? b.updatedAt : acc), null);
  if (latest) {
    // L'accueil et l'index affichent le catalogue : ils changent quand lui change.
    fixed[0]!.lastModified = latest;
    fixed[1]!.lastModified = latest;
  }

  const brandEntries: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: `${base}${brandPath(brand.slug)}`,
    lastModified: brand.updatedAt,
    ...(brand.visual ? { images: [brand.visual] } : {}),
  }));

  const perfumeEntries: MetadataRoute.Sitemap = brands.flatMap((brand) =>
    brand.perfumes.map((perfume) => ({
      url: `${base}${perfumePath(brand.slug, perfume.name, perfume.id)}`,
      lastModified: perfume.updatedAt,
      // Sitemap d'images : c'est par elles que Google Images relie un flacon à la boutique.
      images: [perfume.image],
    })),
  );

  return [...fixed, ...brandEntries, ...perfumeEntries];
}
