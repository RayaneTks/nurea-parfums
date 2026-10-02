import type { ReferenceBrand } from "./searchReference";
import aC from "./data/a-c.json";
import arabes from "./data/arabes.json";
import dG from "./data/d-g.json";
import hL from "./data/h-l.json";
import mP from "./data/m-p.json";
import qZ from "./data/q-z.json";

/**
 * Le référentiel des marques et parfums du monde, pour reconnaître une saisie hors catalogue.
 * Une marque = une ligne commerciale (Emporio Armani ≠ Giorgio Armani ≠ Armani Privé). Données
 * de reconnaissance de noms, JAMAIS affichées en fiche : le catalogue public reste celui de la base.
 */
const REFERENCE_CATALOGUE: readonly ReferenceBrand[] = [
  ...aC,
  ...arabes,
  ...dG,
  ...hL,
  ...mP,
  ...qZ,
];

export function getReferenceCatalogue(): readonly ReferenceBrand[] {
  return REFERENCE_CATALOGUE;
}
