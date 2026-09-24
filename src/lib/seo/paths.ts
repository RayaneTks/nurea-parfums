/**
 * Adresses publiques des pages marque et parfum.
 *
 * Une marque garde son `slug` pour toujours (fixé à la création, jamais régénéré au renommage) :
 * `/parfums/<slug>` est donc stable tel quel.
 *
 * Un parfum n'a pas de slug en base, et son nom SE CORRIGE : l'audit du 23/09/2026 a renommé
 * une douzaine de fiches (Hacivat → Hundred Silent Ways, Elisabeth → Elizabeth Arden…). Une
 * adresse tirée du nom seul serait morte au premier renommage — et une page morte, c'est un
 * lien partagé sur Snapchat qui mène au vide, et une page que Google retire de l'index.
 *
 * D'où `/parfums/<marque>/<nom>-<id>` : l'identifiant retrouve la fiche, le nom n'est là que
 * pour être lisible. Si le nom a changé depuis, la page redirige en 308 vers la bonne adresse —
 * l'ancienne ne meurt jamais, elle transmet.
 */

export const CATALOGUE_PATH = "/parfums";

/** « Oud Maracujá » → « oud-maracuja » ; « Sì Passione » → « si-passione ». */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brandPath(brandSlug: string): string {
  return `${CATALOGUE_PATH}/${brandSlug}`;
}

/** Segment final d'une fiche parfum : le nom lisible, puis l'identifiant qui fait foi. */
export function perfumeSegment(name: string, id: number): string {
  const slug = slugify(name);
  return slug ? `${slug}-${id}` : String(id);
}

export function perfumePath(brandSlug: string, name: string, id: number): string {
  return `${brandPath(brandSlug)}/${perfumeSegment(name, id)}`;
}

/**
 * L'identifiant porté par un segment de fiche parfum, ou `null`.
 *
 * Seul le nombre final compte : « sauvage-12 », « nom-ancien-12 » et « 12 » désignent la même
 * fiche. Un nombre qui n'est pas un entier positif sûr n'est pas un identifiant.
 */
export function perfumeIdFromSegment(segment: string): number | null {
  const match = /(?:^|-)(\d{1,9})$/.exec(segment);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * « Dior » + « Sauvage » → « Dior Sauvage », mais « Dior » + « Gris Dior » → « Gris Dior » :
 * quand le nom du flacon porte déjà la marque, la répéter donnerait « Dior Gris Dior », un
 * titre qui a l'air d'une faute et qui gâche des caractères comptés.
 */
export function fullPerfumeName(brand: string, name: string): string {
  const norm = (s: string) => slugify(s);
  return norm(name).includes(norm(brand)) ? name : `${brand} ${name}`;
}
