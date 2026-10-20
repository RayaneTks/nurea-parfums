import type { FC } from "react";
import Link from "next/link";
import { brandPath, CATALOGUE_PATH } from "@/lib/seo/paths";

export interface BrandIndexEntry {
  name: string;
  slug: string;
  /** Parfums publiés de la marque. */
  count: number;
}

/** Les marques les plus fournies montrées à l'accueil ; toutes les autres sont à `/parfums`. */
export const BRAND_INDEX_SIZE = 8;

/**
 * Les `BRAND_INDEX_SIZE` marques qui ont le plus de parfums publiés, puis par nom : un ordre stable,
 * tiré du catalogue, jamais d'un choix éditorial.
 */
export function topBrands(perfumes: readonly { brand: string; brandSlug?: string }[], size = BRAND_INDEX_SIZE): BrandIndexEntry[] {
  const bySlug = new Map<string, BrandIndexEntry>();
  for (const { brand, brandSlug } of perfumes) {
    if (!brandSlug) continue;
    const entry = bySlug.get(brandSlug);
    if (entry) entry.count += 1;
    else bySlug.set(brandSlug, { name: brand, slug: brandSlug, count: 1 });
  }
  return [...bySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, size);
}

const linkClass =
  "press inline-flex min-h-11 items-center text-fg-1 underline-offset-4 decoration-1 mouse-hover:underline";

/**
 * Index des marques de l'accueil (04-PLAN-EXECUTION.md § B.10) : une parfumerie se parcourt par
 * marque. Une ligne de 56 px par marque, au filet ; toute la ligne mène à la page de la marque.
 * 1 colonne sur téléphone, 2 dès 768 px, 4 dès 1024. Dessous, l'index complet et le contact.
 */
export const BrandIndex: FC<{ brands: BrandIndexEntry[] }> = ({ brands }) =>
  brands.length === 0 ? null : (
  <section aria-labelledby="marques-titre" className="page-x mt-[var(--space-section)]">
    <h2 id="marques-titre" className="t-title mb-4">
      Marques
    </h2>
    <ul className="border-t border-line md:grid md:grid-cols-2 md:gap-x-8 lg:grid-cols-4">
      {brands.map((brand) => (
        <li key={brand.slug} className="border-b border-line">
          <Link
            href={brandPath(brand.slug)}
            className="group flex min-h-14 items-baseline justify-between gap-4 py-3.5"
          >
            <span className="t-subtitle min-w-0 underline-offset-[6px] decoration-1 [overflow-wrap:anywhere] group-active:text-fg-2 group-mouse-hover:underline">
              {brand.name}
            </span>
            <span className="t-caption shrink-0">
              {brand.count} parfum{brand.count > 1 ? "s" : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
    <div className="mt-2 flex flex-wrap gap-x-6">
      <Link href={CATALOGUE_PATH} className={linkClass}>
        Toutes les marques, de A à Z
      </Link>
      <Link href="/contact" className={linkClass}>
        Un parfum manque ? Écrivez-nous
      </Link>
    </div>
  </section>
);
