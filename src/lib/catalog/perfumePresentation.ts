import { CONTACT, type Perfume } from "@/lib/data";

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

/** Formulaire de contact pré-rempli avec le parfum consulté. */
export function contactHref(perfume: string, brand: string): string {
  const params = new URLSearchParams({ parfum: perfume, marque: brand });
  return `/contact?${params}`;
}

/** Conversation WhatsApp amorcée sur une référence précise. */
export function whatsappOrderUrl(perfume: string, brand: string): string {
  const [base] = CONTACT.whatsapp.split("?");
  const message = `Bonjour, je souhaite commander le parfum ${perfume} de ${brand}.`;
  return `${base ?? CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}
