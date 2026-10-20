/**
 * « Ma sélection » — liste d'identifiants gardée sur l'appareil (DESIGN.md § Composants signature).
 * Aucun compte, aucune écriture serveur. Lue par le cœur de la barre (compteur) et le cœur des
 * cartes, et listée par la feuille de l'accueil (`SelectionSheet`, `?selection=1`).
 */

/** Clé `localStorage` ; changer de format = changer de version (`v2`). */
export const SELECTION_KEY = "nurea:selection:v1";
/** Diffusé dans l'onglet courant après chaque écriture (`storage` ne couvre que les autres onglets). */
export const SELECTION_CHANGE_EVENT = "nurea:selection-change";

/** Identifiants valides d'une valeur stockée ; tout le reste (JSON cassé, autre forme) vaut liste vide. */
export function parseSelection(raw: string | null): number[] {
  try {
    const ids: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is number => Number.isInteger(id)))] : [];
  } catch {
    return [];
  }
}

/** Ajoute l'identifiant s'il manque, le retire sinon. */
export function toggleId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Valeur brute stockée : une chaîne, donc stable entre deux lectures (`useSyncExternalStore`). */
export function readSelectionRaw(): string {
  try {
    return localStorage.getItem(SELECTION_KEY) ?? "[]";
  } catch {
    return "[]"; // navigation privée stricte : la sélection vit le temps de la page
  }
}

export function toggleSelection(id: number): void {
  const next = toggleId(parseSelection(readSelectionRaw()), id);
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(SELECTION_CHANGE_EVENT));
}

export function subscribeSelection(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SELECTION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SELECTION_CHANGE_EVENT, onChange);
  };
}
