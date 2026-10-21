import type { FC } from "react";
import Link from "next/link";
import { brandPath, CATALOGUE_PATH } from "@/lib/seo/paths";

type ShelfPerfume = { brand: string; brandSlug?: string };

export interface BrandShelfEntry {
  name: string;
  slug: string;
  /** Parfums publiés de la marque. */
  count: number;
}

/** Les marques les plus fournies montrées à l'accueil ; toutes les autres sont à `/parfums`. */
export const BRAND_SHELF_SIZE = 12;

/**
 * Les `BRAND_SHELF_SIZE` marques qui ont le plus de parfums publiés, puis par nom : un ordre stable,
 * tiré du catalogue, jamais d'un choix éditorial.
 */
export function topBrands(perfumes: readonly ShelfPerfume[], size = BRAND_SHELF_SIZE): BrandShelfEntry[] {
  const bySlug = new Map<string, BrandShelfEntry>();
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

/**
 * « Marques » (04-PLAN-EXECUTION.md § B.10) : un **index typographique** — les noms des marques les plus
 * fournies, à la suite, en `subtitle`, chacun suivi de son nombre de parfums en `caption` ; chaque nom
 * mène à la page de la marque, « Toutes les marques » à l'index A→Z (`/parfums`).
 *
 * Pourquoi du texte et pas des images : les flacons sont déjà dans « À l'affiche » et dans le catalogue,
 * juste en dessous ; des miniatures ici les répétaient, alourdissaient la page et concurraient avec les
 * vedettes. Une marque se reconnaît à son nom. Douze noms tiennent en quelques lignes sur téléphone ;
 * chaque lien fait au moins 44 px de haut.
 */
export const BrandShelf: FC<{ brands: BrandShelfEntry[] }> = ({ brands }) =>
  brands.length === 0 ? null : (
    <section aria-labelledby="marques-titre" className="page-x mt-[var(--space-section)]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="marques-titre" className="t-title">
          Marques
        </h2>
        <Link href={CATALOGUE_PATH} className="press inline-flex min-h-11 items-center text-fg-2 underline-offset-4 decoration-accent decoration-1 mouse-hover:underline">
          Toutes les marques
        </Link>
      </div>
      <ul className="flex flex-wrap gap-x-6">
        {brands.map((brand) => {
          const count = `${brand.count} parfum${brand.count > 1 ? "s" : ""}`;
          return (
            <li key={brand.slug}>
              <Link
                href={brandPath(brand.slug)}
                aria-label={`${brand.name}, ${count}`}
                className="group press inline-flex min-h-11 items-baseline gap-1.5 py-1"
              >
                <span className="t-subtitle underline-offset-[6px] decoration-accent decoration-1 group-mouse-hover:underline">{brand.name}</span>
                <span className="t-caption" aria-hidden="true">
                  {brand.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
