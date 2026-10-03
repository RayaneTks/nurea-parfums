import { CONTACT, type Category, type Perfume } from "@/lib/data";

/**
 * Règles de présentation partagées par la fiche, le détail et la recherche.
 *
 * Elles vivaient jusqu'ici recopiées dans trois composants — d'où des liens de
 * commande qui divergeaient selon l'endroit où l'on cliquait.
 */

/** Catégorie « gamme » : la fiche représente une marque, pas un flacon. */
export const COMPLETE_RANGE_CATEGORY = "Gammes Complètes";

export function isCompleteRange(perfume: Perfume): boolean {
  return perfume.category === COMPLETE_RANGE_CATEGORY;
}

/**
 * Le parfum appartient-il à cette catégorie ? Seule règle, pour la grille comme pour la recherche.
 *
 * « Nouveautés » n'est pas une catégorie qu'on attribue à la main — elle restait vide : ce sont les
 * derniers parfums entrés au catalogue, marqués `isNew` par le catalogue serveur.
 */
export function inCategory(perfume: Perfume, category: Category): boolean {
  if (category === "Tout voir") return true;
  if (category === "Nouveautés") return perfume.isNew === true;
  return perfume.category === category;
}

/**
 * L'étiquette de marque d'une fiche : « Dior · La Collection Privée » quand le parfum a une gamme,
 * « Dior » sinon. Une seule règle pour la carte, la fiche en surimpression et la page indexable.
 */
export function brandLineLabel(brand: string, line?: string | null): string {
  const gamme = line?.trim() ?? "";
  return gamme === "" ? brand : `${brand} · ${gamme}`;
}

/** Formulaire de contact pré-rempli avec le parfum consulté. */
export function contactHref(perfume: string, brand: string): string {
  const params = new URLSearchParams({ parfum: perfume, marque: brand });
  return `/contact?${params}`;
}

/**
 * Conversation WhatsApp amorcée sur une référence précise.
 *
 * Rend `null` tant que le canal n'est pas ouvert, pour que l'appelant retire le
 * bouton au lieu de proposer un lien mort.
 */
export function whatsappOrderUrl(perfume: string, brand: string): string | null {
  if (!CONTACT.whatsapp) return null;
  const [base] = CONTACT.whatsapp.split("?");
  const message = `Bonjour, je souhaite commander le parfum ${perfume} de ${brand}.`;
  return `${base ?? CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}
