import type { Prisma } from "@prisma/client";

/**
 * Filtres de recherche partagés entre la compta, les commandes et les lots.
 *
 * Avant ce module, chaque écran écrivait son propre `where`. Celui de la compta
 * ne regardait que le nom du client : chercher « sauvage » dans la compta ne
 * renvoyait rien, alors que la vente contenant ce parfum était bien là. Le
 * patron cherche par ce qu'il a en tête — un parfum, une marque, un pseudo
 * Snapchat — pas par le champ qu'un développeur a jugé principal.
 *
 * Deux règles fondent ces filtres :
 *
 * 1. **Plusieurs mots = toutes les conditions.** « dior sauvage » doit trouver
 *    la vente qui porte la marque Dior ET le parfum Sauvage, et non tout ce qui
 *    contient l'un ou l'autre. Chaque mot doit donc matcher quelque part, mais
 *    pas forcément le même champ que ses voisins.
 *
 * 2. **On cherche aussi dans les instantanés.** Un parfum hors catalogue ne vit
 *    que dans `perfumeSnapshot` ; l'ignorer rendrait introuvable exactement les
 *    lignes les plus difficiles à retrouver autrement.
 *
 * Limite connue et assumée : PostgreSQL compare ici sans tenir compte de la
 * casse, mais **pas des accents** (`mode: "insensitive"` ne déplie pas les
 * diacritiques). On interroge donc aussi la forme sans accents du terme saisi,
 * ce qui couvre le cas courant — une donnée saisie sans accent, cherchée avec.
 * L'inverse exigerait l'extension `unaccent` côté base.
 */

const MAX_TERMS = 6;

/** Retire les diacritiques : « Élysée » → « Elysee ». */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Découpe la saisie en termes exploitables.
 *
 * Les termes d'une seule lettre sont écartés : ils matchent presque tout et
 * font passer une recherche utile pour une liste complète. Le nombre de termes
 * est plafonné, une saisie collée par accident ne doit pas produire une requête
 * à cinquante jointures.
 */
export function searchTerms(q: string | null | undefined): string[] {
  if (!q) return [];
  const parts = q
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return [...new Set(parts)].slice(0, MAX_TERMS);
}

/** Les deux écritures d'un terme à confronter à la base : telle quelle, et sans accents. */
function variants(term: string): string[] {
  const folded = fold(term);
  return folded === term ? [term] : [term, folded];
}

function contains(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

/**
 * Même chose pour un champ JSON. `mode` compte autant ici qu'ailleurs : sans
 * lui, chercher « sauvage » ne trouve pas un parfum hors catalogue saisi
 * « Sauvage » — et c'est précisément sur ces lignes-là, dont le nom ne vit
 * nulle part ailleurs, que la recherche est le seul moyen de les retrouver.
 */
function snapshotContains(key: string, term: string) {
  return { path: [key], string_contains: term, mode: "insensitive" as const };
}

/** Conditions sur une vente pour UN terme. Le terme matche si l'une d'elles passe. */
function saleTermFilter(term: string): Prisma.SaleWhereInput {
  const OR: Prisma.SaleWhereInput[] = [];
  for (const v of variants(term)) {
    OR.push(
      { customerName: contains(v) },
      { customerContact: contains(v) },
      { notes: contains(v) },
      { customer: { fullName: contains(v) } },
      { customer: { phoneE164: contains(v) } },
      { batch: { name: contains(v) } },
      { items: { some: { perfume: { name: contains(v) } } } },
      { items: { some: { perfume: { brand: { name: contains(v) } } } } },
      // Lignes hors catalogue : le nom ne vit que dans l'instantané JSON.
      { items: { some: { perfumeSnapshot: snapshotContains("name", v) } } },
      { items: { some: { perfumeSnapshot: snapshotContains("brandName", v) } } },
    );
  }
  return { OR };
}

/** Conditions sur une commande pour UN terme. */
function orderTermFilter(term: string): Prisma.OrderWhereInput {
  const OR: Prisma.OrderWhereInput[] = [];
  for (const v of variants(term)) {
    OR.push(
      { customerName: contains(v) },
      { customerContact: contains(v) },
      { notes: contains(v) },
      { customer: { fullName: contains(v) } },
      { customer: { phoneE164: contains(v) } },
      { batch: { name: contains(v) } },
      { items: { some: { perfume: { name: contains(v) } } } },
      { items: { some: { perfume: { brand: { name: contains(v) } } } } },
      { items: { some: { note: contains(v) } } },
      { items: { some: { perfumeSnapshot: snapshotContains("name", v) } } },
      { items: { some: { perfumeSnapshot: snapshotContains("brandName", v) } } },
    );
  }
  return { OR };
}

/**
 * `where` de recherche pour les ventes. Rend `{}` si la saisie est vide — un
 * filtre neutre, pas un filtre qui ne matche rien.
 */
export function saleSearchWhere(q: string | null | undefined): Prisma.SaleWhereInput {
  const terms = searchTerms(q);
  if (terms.length === 0) return {};
  return { AND: terms.map(saleTermFilter) };
}

/** `where` de recherche pour les commandes. */
export function orderSearchWhere(q: string | null | undefined): Prisma.OrderWhereInput {
  const terms = searchTerms(q);
  if (terms.length === 0) return {};
  return { AND: terms.map(orderTermFilter) };
}
