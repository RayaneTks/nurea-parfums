"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DRAFT_KEYS, readDraft } from "@/app-shell/hooks/draft-store";
import { useDraft } from "@/app-shell/hooks/useDraft";
import { freshDraft, isDraftEmpty, parseDraft, type ComposerDraft, type ComposerMode } from "./composer-model";

const DRAFT_OPTIONS = {
  initial: null,
  isEmpty: (value: unknown) => {
    const draft = parseDraft(value);
    return draft === null || isDraftEmpty(draft);
  },
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Le brouillon du composeur (04 §3.7, 06 E11 « Brouillon ») : chaque changement est écrit sur l'appareil — mode,
 * client, lignes, livraison, lot, montants, poche et l'identifiant du document — et restauré au retour, après
 * fermeture de l'app ou expiration de session ; expiré après 24 h.
 *
 * Un brouillon vide n'est pas gardé (pas de point sur l'onglet) : ce qui ne le rend pas « non vide » — le mode
 * Commande choisi, un lot, une poche — vit en mémoire le temps de l'écran.
 */
export function useComposerDraft() {
  const stored = useDraft<unknown>(DRAFT_KEYS.vendre, DRAFT_OPTIONS);
  const [memory, setMemory] = useState<ComposerDraft>(() => freshDraft());
  const restored = stored.restored ? parseDraft(stored.value) : null;
  const value = restored ?? memory;

  const current = useRef(value);
  useLayoutEffect(() => {
    current.current = value;
  });

  /** Le brouillon du moment, relu sur l'appareil s'il y est (un effet qui suit l'hydratation le voit déjà). */
  const peek = useCallback((): ComposerDraft => {
    const store = storage();
    const saved = store ? parseDraft(readDraft<unknown>(store, DRAFT_KEYS.vendre)?.value) : null;
    return saved ?? current.current;
  }, []);

  const { set: write, clear: erase } = stored;

  const update = useCallback(
    (change: (draft: ComposerDraft) => ComposerDraft) => {
      const next = change(peek());
      current.current = next;
      setMemory(next);
      write(next);
    },
    [peek, write],
  );

  /** Remise à zéro : après une écriture réussie (mode Vente), « Vider le ticket », « Nouveau ticket ». */
  const reset = useCallback(
    (mode: ComposerMode = "vente") => {
      const next = freshDraft(mode);
      current.current = next;
      setMemory(next);
      erase();
    },
    [erase],
  );

  return useMemo(() => ({ draft: value, update, reset, peek }), [value, update, reset, peek]);
}
