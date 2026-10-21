import type { FC } from "react";
import Link from "next/link";
import type { Perfume } from "@/lib/data";
import { brandPath, CATALOGUE_PATH } from "@/lib/seo/paths";
import { BrandLineup } from "./BrandLineup";

type ShelfPerfume = Pick<Perfume, "brand" | "brandSlug">;

export interface BrandShelfEntry<P extends ShelfPerfume = Perfume> {
  name: string;
  slug: string;
  /** Parfums publiés de la marque. */
  count: number;
  /** Ses premiers parfums, dans l'ordre reçu : la petite ligne de flacons de la tuile. */
  lineup: P[];
}

/** Les marques les plus fournies montrées à l'accueil ; toutes les autres sont à `/parfums`. */
export const BRAND_SHELF_SIZE = 8;

/** Flacons montrés par marque. */
export const LINEUP_SIZE = 3;

/**
 * Les `BRAND_SHELF_SIZE` marques qui ont le plus de parfums publiés, puis par nom : un ordre stable,
 * tiré du catalogue, jamais d'un choix éditorial. Chaque marque garde ses `LINEUP_SIZE` premiers
 * parfums dans l'ordre reçu (l'ordre de découverte de l'accueil : un autre tirage à chaque visite).
 */
export function topBrands<P extends ShelfPerfume>(perfumes: readonly P[], size = BRAND_SHELF_SIZE): BrandShelfEntry<P>[] {
  const bySlug = new Map<string, BrandShelfEntry<P>>();
  for (const perfume of perfumes) {
    const { brand, brandSlug } = perfume;
    if (!brandSlug) continue;
    const entry = bySlug.get(brandSlug);
    if (!entry) bySlug.set(brandSlug, { name: brand, slug: brandSlug, count: 1, lineup: [perfume] });
    else {
      entry.count += 1;
      if (entry.lineup.length < LINEUP_SIZE) entry.lineup.push(perfume);
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, size);
}

/**
 * « Marques » (04-PLAN-EXECUTION.md § B.10) : entrer par la marque, pas par le produit. Une tuile par
 * marque — son nom en `subtitle`, son nombre de parfums en `caption`, et dessous sa petite ligne de
 * flacons (trois miniatures 2:3 côte à côte) : on reconnaît la marque à sa collection, aucun produit
 * n'est mis en vedette. Toute la tuile mène à la page de la marque ; « Toutes les marques » mène à
 * l'index A→Z (`/parfums`).
 *
 * Compacte : sur téléphone, **une seule rangée** qu'on fait glisser (2,2 tuiles visibles, calée sur la
 * gouttière), pour ne pas repousser le catalogue ; dès 768 px, 4 colonnes. Langage des composants :
 * tuile = carte (`--surface-1`, `--r-lg`, appui `--press`), miniatures `--r-sm`.
 */
export const BrandShelf: FC<{ brands: BrandShelfEntry[] }> = ({ brands }) =>
  brands.length === 0 ? null : (
    <section aria-labelledby="marques-titre" className="mt-[var(--space-section)]">
      <div className="page-x mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="marques-titre" className="t-title">
          Marques
        </h2>
        <Link href={CATALOGUE_PATH} className="press inline-flex min-h-11 items-center text-fg-2 underline-offset-4 decoration-1 mouse-hover:underline">
          Toutes les marques
        </Link>
      </div>
      <ul className="marques">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={brandPath(brand.slug)}
              className="group press flex h-full flex-col gap-3 rounded-lg bg-surface-1 p-3 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
            >
              <span className="flex min-w-0 flex-col gap-0.5 px-1 pt-1">
                <span className="t-subtitle [overflow-wrap:anywhere] underline-offset-[6px] decoration-1 group-mouse-hover:underline">
                  {brand.name}
                </span>
                <span className="t-caption">
                  {brand.count} parfum{brand.count > 1 ? "s" : ""}
                </span>
              </span>
              <BrandLineup perfumes={brand.lineup} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
