import "server-only";
import { cleNom, normaliseMarque } from "@/lib/nommage";
import { brandSlug } from "@/lib/slugify";
import type { DbTransaction } from "@/server/db/client";

/**
 * Retrouve une marque par son nom, quelle que soit la façon dont on l'a tapée (repris de
 * `src/lib/admin/resoudMarque.ts`, 07 §3.0.3 ; 02 §4.5).
 *
 * Le code cherchait autrefois la marque avec `where: { name }`, une égalité exacte. Sur une base
 * PostgreSQL sensible à la casse, « Louis Vuitton », « louis vuitton » et « LOUIS VUITTON » sont trois
 * chaînes différentes : chacune créait sa propre marque, et le catalogue se retrouvait avec la même
 * marque en triple, chacune portant une partie des parfums.
 *
 * On compare donc sur la clé de `cleNom` — sans casse, sans accents, sans ponctuation. Soixante-dix
 * marques tiennent en mémoire, le filtrage se fait ici plutôt qu'en SQL : `mode: "insensitive"` de
 * Prisma ignore la casse mais pas les accents ni l'esperluette, et laisserait passer « Lancome » contre
 * « Lancôme ».
 *
 * Ce module ne fait que LIRE : la création passe par le writer du catalogue (`createBrand`), seul à
 * écrire `Brand` (04 §4.3). Le lecteur est le client d'une transaction (`tx.db`) ou le client de lecture.
 */

export type BrandReader = Pick<DbTransaction, "brand">;

const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  catalogMode: true,
  status: true,
  image: true,
  imageLight: true,
} as const;

export type MarqueTrouvee = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "DRAFT" | "PUBLISHED";
  image: string | null;
  imageLight: string | null;
};

export type MarqueResolue =
  | {
      /** La marque équivalente déjà au catalogue : on garde SON orthographe. */
      existante: MarqueTrouvee;
      /**
       * L'orthographe retenue, quand elle diffère de ce qui a été tapé. Sert à le dire à l'utilisateur :
       * une saisie silencieusement corrigée est une saisie qu'on refera à l'identique la fois suivante.
       */
      corrigeeEn: string | undefined;
    }
  | {
      /** Aucune équivalente : le nom normalisé sous lequel la créer. */
      aCreer: string;
      corrigeeEn: string | undefined;
    };

/**
 * La marque qui ferait doublon avec `saisie`, s'il y en a une. `saufId` exclut la marque qu'on est en
 * train de renommer, sans quoi elle se signalerait comme son propre doublon.
 */
export async function marqueEquivalente(
  reader: BrandReader,
  saisie: string,
  saufId?: string,
): Promise<MarqueTrouvee | null> {
  const cle = cleNom(saisie);
  if (cle === "") return null;
  const existantes = await reader.brand.findMany({ select: BRAND_SELECT });
  return existantes.find((b) => b.id !== saufId && cleNom(b.name) === cle) ?? null;
}

/**
 * Ce que devient `saisie` : la marque existante, ou le nom normalisé à créer ; `null` si la saisie ne
 * contient rien de nommable.
 *
 * Quand la marque existe, on garde SON orthographe : c'est une orthographe qu'un humain a déjà validée,
 * elle vaut mieux que tout ce que des règles de casse pourraient produire. On ne renomme jamais une marque
 * existante pour la faire coller à ce qui vient d'être tapé — ce serait laisser la dernière frappe
 * l'emporter sur le catalogue.
 */
export async function resoudMarqueParNom(reader: BrandReader, saisie: string): Promise<MarqueResolue | null> {
  const brut = saisie.trim();
  if (brut === "" || cleNom(brut) === "") return null;

  const existante = await marqueEquivalente(reader, brut);
  if (existante) {
    return { existante, corrigeeEn: existante.name === brut ? undefined : existante.name };
  }
  const nom = normaliseMarque(brut);
  return { aCreer: nom, corrigeeEn: nom === brut ? undefined : nom };
}

/**
 * Un slug libre, dérivé du nom, suffixé si besoin (« dior-2 »). Calculé UNE fois, à la création : le slug
 * est la valeur publique de `?maison=`, un lien partagé doit survivre au renommage (04 §12, 02 §4.9).
 */
export async function slugMarqueLibre(reader: BrandReader, nom: string): Promise<string> {
  const racine = brandSlug(nom);
  let slug = racine;
  for (let n = 2; await reader.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${racine}-${n}`;
  }
  return slug;
}
