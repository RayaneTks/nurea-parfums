/**
 * Vignettes des visuels de parfum — une règle de nommage, partagée par la gestion qui les écrit
 * (`src/server/catalogue/storage.ts`) et par le chargeur d'images qui les sert (`loader.ts`).
 *
 * Pourquoi des vignettes : les visuels sont déposés au cadre 1024 × 1536 (~150 Ko). Sur téléphone,
 * une carte du catalogue fait ~170 px de large — 340 px utiles sur un écran Retina —, et le
 * téléphone téléchargeait quand même l'original. Au changement de thème, il fallait ainsi recharger
 * ~2 Mo de variantes claires ou sombres pour le seul premier écran : c'est la lenteur relevée le
 * 28/09/2026.
 *
 * Pourquoi pas l'optimiseur de Vercel : son quota gratuit a été épuisé le 22/09/2026 (toutes les
 * fiches en 402) ; et les transformations de Supabase ne sont pas ouvertes sur cette offre (403).
 * La vignette est donc un vrai fichier, écrit une fois à côté de l'original : `x.webp` → `x-640.webp`.
 */

export const THUMB_WIDTH = 640;
export const THUMB_HEIGHT = 960;
/**
 * 640 px et non 512 : une carte du catalogue fait ~190 px sur téléphone, soit ~570 px sur un écran
 * à densité triple (iPhone récents) — à 512 px, ces téléphones retombaient sur l'original.
 * Qualité : à cette taille, l'écart avec 82 ne se voit pas, le poids si.
 */
export const THUMB_QUALITY = 76;

const SUFFIX = `-${THUMB_WIDTH}`;

/**
 * Un visuel de parfum de NOTRE stockage, sous le nom exact que lui donne la gestion :
 * `perfumes/<horodatage 13 chiffres>-<8 hexadécimaux>.webp`. Seuls ceux-là ont une vignette — ni les
 * logos (`brands/`), ni les planches story (`stories/`), ni une vignette elle-même, ni un fichier au
 * nom inattendu : servir l'original est toujours sûr, promettre une vignette absente ne l'est pas.
 */
const VISUAL_FILE = String.raw`\d{13}-[0-9a-f]{8}\.webp`;
const PERFUME_VISUAL_URL = new RegExp(String.raw`/storage/v1/object/public/[^/]+/perfumes/${VISUAL_FILE}$`);
const PERFUME_VISUAL_PATH = new RegExp(`^perfumes/${VISUAL_FILE}$`);

export function hasThumbnail(url: string): boolean {
  return PERFUME_VISUAL_URL.test(url);
}

/** Un chemin d'objet (`perfumes/<horodatage>-<aléa>.webp`) dont la vignette existe à côté. */
export function hasThumbnailPath(path: string): boolean {
  return PERFUME_VISUAL_PATH.test(path);
}

/** `perfumes/x.webp` → `perfumes/x-640.webp` (chemin d'objet ou URL publique, indifféremment). */
export function thumbnailOf(pathOrUrl: string): string {
  if (!pathOrUrl.endsWith(".webp") || pathOrUrl.endsWith(`${SUFFIX}.webp`)) {
    throw new RangeError(`thumbnailOf : pas un visuel WebP d'origine « ${pathOrUrl} »`);
  }
  return `${pathOrUrl.slice(0, -".webp".length)}${SUFFIX}.webp`;
}
