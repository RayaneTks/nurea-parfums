import type { Brand, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { cleNom, normaliseMarque } from "@/lib/nommage";
import { brandSlug } from "@/lib/slugify";

/**
 * Retrouve une marque par son nom, quelle que soit la façon dont on l'a tapée.
 *
 * Le code cherchait la marque avec `where: { name }`, une égalité exacte. Sur
 * une base PostgreSQL sensible à la casse, « Louis Vuitton », « louis vuitton »
 * et « LOUIS VUITTON » sont trois chaînes différentes : chacune créait sa
 * propre marque, et le catalogue se retrouvait avec la même maison en triple,
 * chacune portant une partie des parfums.
 *
 * On compare donc sur la clé de `cleNom` — sans casse, sans accents, sans
 * ponctuation. Soixante-dix marques tiennent en mémoire, le filtrage se fait
 * ici plutôt qu'en SQL : `mode: "insensitive"` de Prisma ignore la casse mais
 * pas les accents ni l'esperluette, et laisserait passer « Lancome » contre
 * « Lancôme ».
 */
export type MarqueResolue = {
  brand: Brand;
  /** Vrai si la marque vient d'être créée par cet appel. */
  creee: boolean;
  /**
   * L'orthographe retenue, quand elle diffère de ce qui a été tapé.
   *
   * Sert à le dire à l'utilisateur : une saisie silencieusement corrigée est
   * une saisie qu'on refera à l'identique la fois suivante.
   */
  corrigeeEn?: string;
};

/** Un slug libre, dérivé du nom, suffixé si besoin. */
async function slugLibre(nom: string, client: Prisma.TransactionClient | typeof prisma) {
  const racine = brandSlug(nom);
  let slug = racine;
  for (let n = 2; await client.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${racine}-${n}`;
  }
  return slug;
}

/**
 * Rend la marque correspondant à `saisie`, en la créant si elle n'existe pas.
 *
 * Quand la marque existe, on garde SON orthographe : c'est une orthographe
 * qu'un humain a déjà validée, elle vaut mieux que tout ce que des règles de
 * casse pourraient produire. On ne renomme jamais une marque existante pour la
 * faire coller à ce qui vient d'être tapé — ce serait laisser la dernière
 * frappe l'emporter sur le catalogue.
 */
export async function resoudMarqueParNom(saisie: string): Promise<MarqueResolue | null> {
  const brut = saisie.trim();
  if (brut === "") return null;

  const cle = cleNom(brut);
  if (cle === "") return null;

  const existantes = await prisma.brand.findMany();
  const trouvee = existantes.find((b) => cleNom(b.name) === cle);
  if (trouvee) {
    return {
      brand: trouvee,
      creee: false,
      corrigeeEn: trouvee.name === brut ? undefined : trouvee.name,
    };
  }

  const nom = normaliseMarque(brut);
  const brand = await prisma.brand.create({
    data: {
      name: nom,
      slug: await slugLibre(nom, prisma),
      catalogMode: "CURATED",
    },
  });
  return { brand, creee: true, corrigeeEn: nom === brut ? undefined : nom };
}

/**
 * La marque qui ferait doublon avec `saisie`, s'il y en a une.
 *
 * `saufId` exclut la marque qu'on est en train de renommer, sans quoi elle se
 * signalerait comme son propre doublon.
 */
export async function marqueEquivalente(
  saisie: string,
  saufId?: string,
): Promise<Brand | null> {
  const cle = cleNom(saisie);
  if (cle === "") return null;
  const existantes = await prisma.brand.findMany();
  return (
    existantes.find((b) => b.id !== saufId && cleNom(b.name) === cle) ?? null
  );
}

export { slugLibre as slugMarqueLibre };
