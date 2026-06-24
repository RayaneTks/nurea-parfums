"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast } from "@/ui/primitives/Toast";

const UNDO_MS = 5000;

type ScheduleArgs = {
  /** Message affiché dans le toast (ex. « Commande supprimée »). */
  message: string;
  /** Action réelle exécutée si l'undo n'est pas déclenché (ex. fetch DELETE). */
  onCommit: () => void | Promise<void>;
  /** Optionnel : restauration UI quand l'utilisateur annule (ex. router.refresh). */
  onUndo?: () => void;
  /** Optionnel : message d'erreur si onCommit échoue. */
  errorMessage?: string;
};

type UndoContextValue = {
  scheduleDelete: (args: ScheduleArgs) => void;
};

const UndoContext = createContext<UndoContextValue | null>(null);

/**
 * Filet « Annuler » au niveau shell : suppression différée de 5 s.
 *
 * - Survit aux navigations (monté dans AdminShell).
 * - Un seul undo en vol : programmer un nouveau commit l'éventuel précédent.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ScheduleArgs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<ScheduleArgs | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commit = useCallback((args: ScheduleArgs) => {
    Promise.resolve(args.onCommit()).catch(() => {
      setError(args.errorMessage ?? "Action échouée.");
    });
  }, []);

  const scheduleDelete = useCallback(
    (args: ScheduleArgs) => {
      // Valide d'abord un éventuel undo encore en vol.
      if (pendingRef.current) commit(pendingRef.current);
      clearTimer();
      pendingRef.current = args;
      setPending(args);
      timerRef.current = window.setTimeout(() => {
        commit(args);
        pendingRef.current = null;
        setPending(null);
        timerRef.current = null;
      }, UNDO_MS);
    },
    [commit],
  );

  const handleUndo = useCallback(() => {
    clearTimer();
    const args = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    args?.onUndo?.();
  }, []);

  const handleClose = useCallback(() => {
    // Fermeture manuelle = valider tout de suite.
    clearTimer();
    const args = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (args) commit(args);
  }, [commit]);

  useEffect(() => () => clearTimer(), []);

  return (
    <UndoContext.Provider value={{ scheduleDelete }}>
      {children}
      {pending ? (
        <Toast
          type="info"
          message={pending.message}
          duration={0}
          actionLabel="Annuler"
          onAction={handleUndo}
          onClose={handleClose}
        />
      ) : null}
      {error ? (
        <Toast type="error" message={error} onClose={() => setError(null)} />
      ) : null}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo doit être utilisé dans <UndoProvider>.");
  return ctx;
}
