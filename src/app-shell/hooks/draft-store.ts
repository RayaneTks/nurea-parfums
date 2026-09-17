/**
 * Brouillons locaux (04 §3.7, §14.5 ; 06 E11) : une saisie interrompue — iOS tue les PWA en
 * arrière-plan, la session expire — ne se perd jamais. `localStorage`, une entrée par clé, expirée
 * après 24 h, identifiant de document compris (le renvoi reste idempotent, 04 §3.6).
 *
 * Sans DOM ni React : `useDraft` s'y abonne, les tests lui passent une mémoire factice.
 */

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "nurea:brouillon:";
const FORMAT = 1;

/** Clés connues, pour que le shell et l'écran parlent du même brouillon. */
export const DRAFT_KEYS = {
  /** Composeur Vendre (E11) : porte le point de la tab bar (06 §1.5). */
  vendre: "vendre",
} as const;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Stored<T> = { v: typeof FORMAT; savedAt: number; value: T };

export type Draft<T> = { value: T; savedAt: number };

export function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

/** Lecture ; un brouillon illisible, d'un autre format ou expiré est supprimé et vaut `null`. */
export function readDraft<T>(storage: StorageLike, key: string, now: number = Date.now()): Draft<T> | null {
  let raw: string | null;
  try {
    raw = storage.getItem(storageKey(key));
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Stored<T>>;
    if (parsed.v !== FORMAT || typeof parsed.savedAt !== "number" || !("value" in parsed)) throw new Error("format");
    if (now - parsed.savedAt > DRAFT_TTL_MS) throw new Error("expiré");
    return { value: parsed.value as T, savedAt: parsed.savedAt };
  } catch {
    removeDraft(storage, key);
    return null;
  }
}

/** Écriture ; stockage plein ou refusé (navigation privée) : la saisie reste à l'écran, sans erreur. */
export function writeDraft<T>(storage: StorageLike, key: string, value: T, now: number = Date.now()): void {
  const stored: Stored<T> = { v: FORMAT, savedAt: now, value };
  try {
    storage.setItem(storageKey(key), JSON.stringify(stored));
  } catch {
    /* quota ou stockage indisponible : rien à faire de plus */
  }
}

export function removeDraft(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(storageKey(key));
  } catch {
    /* stockage indisponible */
  }
}

// ─── Abonnement (même onglet et autres onglets) ─────────────────────────────

const EVENT = "nurea:brouillon";

export function notifyDraftChange(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function subscribeDraft(key: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const local = (event: Event) => {
    if ((event as CustomEvent<string>).detail === key) onChange();
  };
  const other = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey(key)) onChange();
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", other);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", other);
  };
}
