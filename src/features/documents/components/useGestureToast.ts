"use client";

import { useCallback, useRef } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { revertDocumentChangeAction } from "@/server/documents/actions";

/**
 * Le filet « Annuler » (5 s) après tout encaissement, « Livrer et encaisser », « Tout encaisser » et tout
 * changement de statut (06 §4.3, 03 §4.3 T4b) : il passe TOUJOURS par `revertDocumentChangeAction` avec le jeton
 * rendu par le geste — jamais par `voidPaymentAction`. Un renvoi (même identifiant) rend `undo: null` : pas de
 * filet à proposer, le premier envoi l'a déjà fait. La notice du serveur (« La commande reste confirmée :
 * 120,00 € à encaisser. ») remplace le message d'annulation.
 *
 * À monter dans un composant qui survit à la fermeture de la sheet d'action (liste, fiche) : le toast vit 5 s.
 */
export function useGestureToast() {
  const { showToast } = useToast();
  const undone = useRef("Geste annulé.");
  const revert = useAction(revertDocumentChangeAction, { success: () => undone.current });

  return useCallback(
    (message: string, undo: string | null, undoneMessage = "Geste annulé.") => {
      showToast({
        type: "success",
        message,
        ...(undo
          ? {
              actionLabel: "Annuler",
              onAction: () => {
                undone.current = undoneMessage;
                void revert.run({ token: undo });
              },
            }
          : {}),
      });
    },
    [revert, showToast],
  );
}
