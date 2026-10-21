import type { FC } from "react";
import Link from "next/link";
import type { Perfume } from "@/lib/data";
import { brandPath, CATALOGUE_PATH } from "@/lib/seo/paths";
import { PerfumeImage } from "./PerfumeImage";

export interface BrandShelfEntry {
  name: string;
  slug: string;
  /** Parfums publiés de la marque. */
  count: number;
  /** Le parfum qui représente la marque sur le rayon (son visuel). */
  perfume: Perfume;
}

/** Les marques les plus fournies montrées à l'accueil ; toutes les autres sont à `/parfums`. */
export const BRAND_SHELF_SIZE = 8;

type ShelfPerfume = Pick<Perfume, "brand" | "brandSlug" | "isFeatured" | "imageLight">;

/** Mis en avant, puis visuel clair disponible : le parfum qui représente le mieux sa marque dans les deux thèmes. */
function represents(candidate: ShelfPerfume, current: ShelfPerfume): boolean {
  if (!!candidate.isFeatured !== !!current.isFeatured) return !!candidate.isFeatured;
  return !!candidate.imageLight && !current.imageLight;
}

/**
 * Les `BRAND_SHELF_SIZE` marques qui ont le plus de parfums publiés, puis par nom : un ordre stable,
 * tiré du catalogue, jamais d'un choix éditorial. Chaque marque est représentée par l'un de ses
 * parfums (`represents`), dans l'ordre reçu.
 */
export function topBrands<P extends ShelfPerfume>(perfumes: readonly P[], size = BRAND_SHELF_SIZE): (Omit<BrandShelfEntry, "perfume"> & { perfume: P })[] {
  const bySlug = new Map<string, Omit<BrandShelfEntry, "perfume"> & { perfume: P }>();
  for (const perfume of perfumes) {
    const { brand, brandSlug } = perfume;
    if (!brandSlug) continue;
    const entry = bySlug.get(brandSlug);
    if (!entry) bySlug.set(brandSlug, { name: brand, slug: brandSlug, count: 1, perfume });
    else {
      entry.count += 1;
      if (represents(perfume, entry.perfume)) entry.perfume = perfume;
    }
  }
  return [...bySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, size);
}

/**
 * Rayon des marques de l'accueil (04-PLAN-EXECUTION.md § B.10) : une parfumerie se parcourt par
 * marque, et une marque se reconnaît à un flacon, pas à une ligne d'annuaire. Un rayon horizontal
 * de visuels 2:3 (vignette 640), nom en `subtitle`, compteur en `caption` ; tout le bloc mène à la
 * page de la marque. Téléphone et tablette : on fait glisser le rayon ; dès 1024 px, les huit
 * tiennent sur une ligne.
 */
export const BrandShelf: FC<{ brands: BrandShelfEntry[] }> = ({ brands }) =>
  brands.length === 0 ? null : (
    <section aria-labelledby="marques-titre" className="mt-[var(--space-section)]">
      <div className="page-x mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="marques-titre" className="t-title">
          Marques
        </h2>
        <Link href={CATALOGUE_PATH} className="press inline-flex min-h-11 items-center text-fg-2 underline-offset-4 decoration-1 mouse-hover:underline">
          Toutes, de A à Z
        </Link>
      </div>
      <ul className="rayon">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link href={brandPath(brand.slug)} className="group press block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-surface-2">
                <PerfumeImage perfume={brand.perfume} sizes="(min-width: 1024px) 160px, 144px" />
              </div>
              <p className="t-subtitle mt-2 [overflow-wrap:anywhere] group-active:text-fg-2 group-mouse-hover:underline underline-offset-[6px] decoration-1">
                {brand.name}
              </p>
              <p className="t-caption mt-0.5">
                {brand.count} parfum{brand.count > 1 ? "s" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
