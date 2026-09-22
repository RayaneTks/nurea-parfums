"use client";

import { useCallback } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";

/**
 * « Abandonner la saisie ? » (06 S18) : une sheet dont la saisie a été modifiée ne se ferme pas d'un revers de
 * pouce. Rend `true` si l'on peut fermer.
 */
export function useDiscardGuard(dirty: boolean): () => Promise<boolean> {
  const confirm = useConfirm();
  return useCallback(async () => {
    if (!dirty) return true;
    return confirm({
      title: "Abandonner la saisie ?",
      description: "Tes modifications ne seront pas enregistrées.",
      confirmLabel: "Abandonner",
      tone: "danger",
    });
  }, [confirm, dirty]);
}
