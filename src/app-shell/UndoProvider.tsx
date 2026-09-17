"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useToast } from "./FeedbackProvider";

/** Délai du filet « Annuler » (06 §4.3). */
export const UNDO_DELAY_MS = 5000;

export type ScheduleDeleteArgs = {
  /** « Commande supprimée », « Fares supprimé ». */
  message: string;
  /** L'écriture réelle, exécutée à la fin du délai (ou plus tôt, voir ci-dessous). */
  onCommit: () => void | Promise<void>;
  /** Restauration de l'écran quand l'utilisateur annule. */
  onUndo?: () => void;
  /** Message du toast d'erreur si l'écriture échoue. */
  errorMessage?: string;
};

type UndoValue = { scheduleDelete: (args: ScheduleDeleteArgs) => void };

const UndoContext = createContext<UndoValue | null>(null);

/**
 * Suppression différée de 5 s avec « Annuler » (05 §3.4, 06 §4.3), passée par le canal de toasts du
 * shell : un seul toast à la fois, et un nouveau geste (un autre toast) valide le précédent.
 *
 * - Survit aux navigations : monté par `AdminShell`.
 * - Toast fermé, délai écoulé ou remplacé : l'écriture part tout de suite.
 * - L'app passe en arrière-plan (iOS peut la tuer) : l'écriture part aussi — la suppression a été
 *   confirmée, la perdre serait la surprise.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const { showToast, dismissToast } = useToast();
  const pending = useRef<{ toastId: number; args: ScheduleDeleteArgs } | null>(null);

  const commit = useCallback(
    (args: ScheduleDeleteArgs) => {
      Promise.resolve()
        .then(args.onCommit)
        .catch(() => {
          showToast({ type: "error", message: args.errorMessage ?? "La suppression n'a pas pu aboutir. Réessaie." });
        });
    },
    [showToast],
  );

  const scheduleDelete = useCallback(
    (args: ScheduleDeleteArgs) => {
      const entry = { toastId: 0, args };
      entry.toastId = showToast({
        type: "info",
        message: args.message,
        duration: UNDO_DELAY_MS,
        actionLabel: "Annuler",
        onAction: () => {
          if (pending.current === entry) pending.current = null;
          args.onUndo?.();
        },
        onDismiss: () => {
          if (pending.current === entry) pending.current = null;
          commit(args);
        },
      });
      pending.current = entry;
    },
    [commit, showToast],
  );

  useEffect(() => {
    const flush = (event: Event) => {
      const leaving = event.type === "pagehide" || document.visibilityState === "hidden";
      if (leaving && pending.current) dismissToast(pending.current.toastId);
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [dismissToast]);

  const value = useMemo(() => ({ scheduleDelete }), [scheduleDelete]);
  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndo(): UndoValue {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo : composant hors du shell (UndoProvider manquant).");
  return ctx;
}
