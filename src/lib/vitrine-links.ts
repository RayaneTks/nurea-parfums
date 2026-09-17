import { SITE_URL } from "@/lib/site";

/**
 * Adresses publiques de la vitrine citées par la gestion (06 E17 « Lien public », A17).
 *
 * Le paramètre du filtre de marque est celui que lit la vitrine (`src/components/home/useCatalogFilters.ts`) :
 * sa valeur est le `slug`, fixé à la création de la marque et jamais recalculé — un lien partagé survit
 * au renommage (02 §4.9, 04 §12). Le nom du paramètre vit ici, côté vitrine, et nulle part dans les
 * textes de la gestion.
 */
export const BRAND_FILTER_PARAM = "maison";

/** « https://nureaparfums.fr/?maison=dior » */
export function brandPublicUrl(slug: string): string {
  const url = new URL("/", SITE_URL);
  url.searchParams.set(BRAND_FILTER_PARAM, slug);
  return url.toString();
}
