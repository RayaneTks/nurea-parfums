import type { ReferenceBrand } from "./searchReference";

/**
 * Le référentiel des marques et parfums du monde, pour reconnaître une saisie hors catalogue.
 * Vide tant que les fichiers de `data/` ne sont pas branchés ici.
 */
const REFERENCE_CATALOGUE: readonly ReferenceBrand[] = [];

export function getReferenceCatalogue(): readonly ReferenceBrand[] {
  return REFERENCE_CATALOGUE;
}
