"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../primitives/Button";
import { isToastTarget } from "../primitives/Toast";

/** Message affiché quand l'échec ne dit rien d'exploitable (rejet sans `Error`, message vide). */
export const CONFIRM_FALLBACK_ERROR = "L'action n'a pas abouti. Rien n'a été modifié — réessaie.";

/** Texte montré dans la boîte pour un rejet de `onConfirm` (05 §3.2). */
export function confirmErrorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : CONFIRM_FALLBACK_ERROR;
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Question directe : « Supprimer Fares ? », « Abandonner la saisie ? ». */
  title: string;
  /**
   * LA VÉRITÉ sur les conséquences : « Ses 12 documents sont conservés »,
   * « Un remboursement est ajouté en face ». Aucune phrase par défaut — un
   * « Cette action est irréversible » générique mentait quand l'annulation 5 s existe.
   */
  description?: ReactNode;
  /** Verbe de l'action : « Supprimer », « Confirmer », « Abandonner ». */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` : destruction. `primary` : réserve à lever (cycle de statuts). */
  tone: "danger" | "primary";
  /**
   * L'écriture confirmée. **Rends une vraie promesse** (jamais une fonction qui lance un
   * `startTransition` et rend `void`) : le bouton reste en attente et la boîte non fermable jusqu'à
   * sa fin, un second tap est sans effet. À l'appelant de fermer après succès.
   *
   * **Échec : rejette avec une `Error` au message français** — il s'affiche DANS la boîte, qui reste
   * ouverte, boutons réactivés (05 §3.2). Jamais de toast : sous une modale, Radix le rend inerte.
   */
  onConfirm: () => Promise<void> | void;
  /** Troisième voie, moins forte : « Masquer plutôt ». */
  alternative?: { label: string; onAction: () => void };
};

/**
 * Confirmation bloquante (05 §3.2) — Radix Dialog, bande `modal` (90/91) : au-dessus des sheets
 * (70/71) et des sheets imbriquées (80/81) par son z-index, jamais par l'ordre de montage des portails
 * (05 §2.7) ; sous le toast (100).
 *
 * Posé en bas de l'écran, sous le pouce, comme une feuille d'action iOS :
 * on confirme d'une main, sans remonter au centre.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  tone,
  onConfirm,
  alternative,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Verrou synchrone : deux taps dans la même image ne lancent pas deux écritures.
  const running = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Une réouverture repart d'une ardoise propre : l'erreur d'hier passerait pour celle d'aujourd'hui.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (cause) {
      /*
       * L'échec s'affiche DANS la boîte (correction de production `3291428`). Il partait en toast,
       * c'est-à-dire dans le sous-arbre que la modale neutralise : ni lu par VoiceOver, ni tapable,
       * effacé en 3 s. On voyait sa confirmation ne rien produire, on retapait. Le message doit être
       * là où le regard est déjà.
       */
      setError(confirmErrorMessage(cause));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  // Le toast passe au-dessus (05 §2.7) : le toucher n'est pas « cliquer à côté » de la boîte.
  const keepOpenForToast = (event: { target: EventTarget | null; preventDefault: () => void }) => {
    if (isToastTarget(event.target)) event.preventDefault();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-admin-overlay
          className={cn(
            "admin-theme fixed inset-0 z-[var(--admin-z-modal-backdrop)] bg-[var(--admin-overlay)]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:[animation-duration:var(--admin-duration-slow)]",
          )}
        />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          data-confirm-dialog
          // Focus initial sur « Annuler », jamais sur l'action : une touche Entrée réflexe ne supprime
          // rien, et le focus pris par un bouton referme le clavier iOS qui recouvrait la boîte.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus();
          }}
          onPointerDownOutside={keepOpenForToast}
          className={cn(
            "admin-theme fixed inset-x-0 z-[var(--admin-z-modal)] mx-auto flex w-[calc(100%-2rem)] flex-col overflow-hidden outline-none",
            "rounded-[var(--admin-radius-xl)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-xl)]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:slide-in-from-bottom-4",
            "motion-safe:data-[state=open]:[animation-duration:var(--admin-duration-slow)] motion-safe:data-[state=open]:[animation-timing-function:var(--admin-easing-default)]",
          )}
          style={{
            maxWidth: "calc(var(--admin-app-max-width) - 2rem)",
            bottom: "calc(var(--admin-space-4) + var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))",
            /*
             * Le corps défile, les boutons non (05 §3.2). Sans plafond, une description longue (réserves
             * cumulées, texte agrandi, clavier levé) poussait les boutons hors de l'écran — et le corps
             * de cette PWA ne défile pas. Hauteur visible, moins la marge basse et une marge haute.
             */
            maxHeight:
              "calc(var(--admin-vh, 100dvh) - var(--admin-space-4) * 2 - var(--admin-safe-area-bottom) - env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5 [-webkit-overflow-scrolling:touch]">
            <Dialog.Title className="admin-type-h3 text-[var(--admin-text)]">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="admin-type-body mt-1.5 text-[var(--admin-text-muted)]">
                {description}
              </Dialog.Description>
            ) : null}
            {error ? (
              <div
                role="alert"
                data-confirm-error
                className="mt-3 flex items-start gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] px-3 py-2.5"
              >
                <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--admin-danger)]" />
                <p className="admin-type-caption min-w-0 flex-1 font-medium text-[var(--admin-danger)]">{error}</p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--admin-border)] p-3">
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              size="lg"
              fullWidth
              isLoading={busy}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
            {alternative ? (
              <Button variant="secondary" size="lg" fullWidth disabled={busy} onClick={alternative.onAction}>
                {alternative.label}
              </Button>
            ) : null}
            <Button ref={cancelRef} variant="ghost" size="lg" fullWidth disabled={busy} onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
