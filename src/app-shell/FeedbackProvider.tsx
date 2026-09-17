"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { Toast, type ToastType } from "@/ui/primitives/Toast";

/**
 * Retours du shell (05 §3.1 `Toast`, §3.2 `ConfirmDialog` ; 06 §3.8) :
 * - UN toast à la fois, rendu ici seulement (bande `toast`, au-dessus de la tab bar et du clavier) ; un
 *   nouveau toast remplace le précédent, qui en est prévenu (`onDismiss("replaced")`) — c'est ainsi
 *   qu'un nouveau geste valide une suppression différée en cours (`UndoProvider`) ;
 * - une confirmation à la fois, demandée par `useConfirm()` et résolue en `true`/`false`
 *   (réserves de `NEEDS_CONFIRMATION`, `useAction`).
 */

export type ToastRequest = {
  type?: ToastType;
  message: string;
  /** Défaut : 3 s ; 5 s dès qu'il y a une action (« Annuler », « Réessayer »). `0` : reste affiché. */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  /** Fin du toast sans son action : délai écoulé, croix, ou remplacement par un autre toast. */
  onDismiss?: (reason: "timeout" | "replaced") => void;
};

type ToastEntry = ToastRequest & { id: number };

export type ConfirmRequest = {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone: "danger" | "primary";
  cancelLabel?: string;
};

type FeedbackValue = {
  showToast: (request: ToastRequest) => number;
  dismissToast: (id?: number) => void;
  /**
   * Demande une confirmation. `perform` (facultatif) est l'écriture confirmée : le dialogue reste
   * ouvert, bouton en attente, jusqu'à sa fin (05 §3.2 : un second tap est sans effet).
   */
  confirm: (request: ConfirmRequest, perform?: () => Promise<void>) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const toastRef = useRef<ToastEntry | null>(null);
  const nextId = useRef(1);

  const [dialog, setDialog] = useState<ConfirmRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  const performRef = useRef<(() => Promise<void>) | null>(null);

  const replace = useCallback((entry: ToastEntry | null) => {
    toastRef.current = entry;
    setToast(entry);
  }, []);

  const showToast = useCallback(
    (request: ToastRequest) => {
      const previous = toastRef.current;
      const id = nextId.current++;
      replace({ ...request, id });
      previous?.onDismiss?.("replaced");
      return id;
    },
    [replace],
  );

  const dismissToast = useCallback(
    (id?: number) => {
      const current = toastRef.current;
      if (!current || (id !== undefined && current.id !== id)) return;
      replace(null);
      current.onDismiss?.("timeout");
    },
    [replace],
  );

  const confirm = useCallback((request: ConfirmRequest, perform?: () => Promise<void>) => {
    return new Promise<boolean>((resolve) => {
      // Une seule confirmation à la fois : la précédente est considérée refusée.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      performRef.current = perform ?? null;
      setDialog(request);
      setDialogOpen(true);
    });
  }, []);

  const closeDialog = useCallback((ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    // Le dialogue reste monté, fermé, le temps de son animation de sortie.
    setDialogOpen(false);
    resolve?.(ok);
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast, confirm }), [showToast, dismissToast, confirm]);

  const current = toast;
  const onClose = useCallback(() => dismissToast(current?.id), [dismissToast, current?.id]);
  const onAction = useCallback(() => {
    if (!current) return;
    replace(null);
    current.onAction?.();
  }, [current, replace]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {current ? (
        <Toast
          key={current.id}
          type={current.type ?? "success"}
          message={current.message}
          duration={current.duration ?? (current.actionLabel ? 5000 : 3000)}
          actionLabel={current.actionLabel}
          onAction={current.actionLabel ? onAction : undefined}
          onClose={onClose}
        />
      ) : null}
      {dialog ? (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={(open) => (open ? undefined : closeDialog(false))}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          tone={dialog.tone}
          onConfirm={async () => {
            const perform = performRef.current;
            performRef.current = null;
            try {
              await perform?.();
            } finally {
              closeDialog(true);
            }
          }}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

/** Retours du shell ; `null` hors shell (écran de connexion) — l'appelant affiche alors en ligne. */
export function useOptionalFeedback(): FeedbackValue | null {
  return useContext(FeedbackContext);
}

export function useToast(): Pick<FeedbackValue, "showToast" | "dismissToast"> {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useToast : composant hors du shell (FeedbackProvider manquant).");
  return ctx;
}

export function useConfirm(): FeedbackValue["confirm"] {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useConfirm : composant hors du shell (FeedbackProvider manquant).");
  return ctx.confirm;
}
