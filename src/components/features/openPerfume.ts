import type { MouseEvent } from "react";

/**
 * Ouvrir une fiche depuis n'importe quelle surface de l'accueil (nouveautés, choix de Nuréa) sans
 * recharger la page : le catalogue (`CatalogSection`) écoute la demande et ouvre la feuille
 * (`?parfum=<id>`), comme depuis une carte.
 */

/** Demande d'ouverture d'une fiche (`detail` = id du parfum), annulée par le catalogue quand il s'en charge. */
export const OPEN_PERFUME_EVENT = "nurea:open-perfume";

/** Demande faite avant que le catalogue soit prêt (page en cours d'hydratation) : il la reprend. */
let pending: number | null = null;

/** Le catalogue, à son montage : la fiche demandée trop tôt, une seule fois. */
export function takePendingPerfume(): number | null {
  const id = pending;
  pending = null;
  return id;
}

/** Le catalogue annule l'événement s'il ouvre la fiche ; sinon la demande attend son montage. */
export function requestSheet(id: number) {
  const handled = !window.dispatchEvent(new CustomEvent(OPEN_PERFUME_EVENT, { detail: id, cancelable: true }));
  if (!handled) pending = id;
}

/**
 * Un vrai lien vers la page indexable du parfum qui, au clic simple, ouvre la feuille à la place.
 * Sans JavaScript, ou par un clic modifié (nouvel onglet, bouton du milieu), le lien fait son travail.
 */
export function openSheetFromLink(id: number) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    requestSheet(id);
  };
}
