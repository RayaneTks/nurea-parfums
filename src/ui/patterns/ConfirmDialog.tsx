"use client";

import { useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "../primitives/Button";

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
   * Exécutée bouton en attente (dialogue non fermable pendant ce temps). À
   * l'appelant de fermer après succès — ou de laisser ouvert sur un refus.
   */
  onConfirm: () => Promise<void> | void;
  /** Troisième voie, moins forte : « Masquer plutôt ». */
  alternative?: { label: string; onAction: () => void };
};

/**
 * Confirmation bloquante (05 §3.2) — Radix Dialog, couche `modal` (80/81).
 *
 * Au-dessus d'une sheet (70/71) par son z-index ; au-dessus d'une sheet
 * IMBRIQUÉE (même couche 80/81) par l'ordre de montage : le portail d'un
 * dialogue est ajouté à `<body>` à son ouverture, donc APRÈS la sheet qui l'a
 * ouvert, et à z-index égal le dernier monté l'emporte. Couvert par
 * `npm run test:layout`.
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "admin-theme fixed inset-0 z-[var(--admin-z-modal-backdrop)] bg-[var(--admin-overlay)]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:[animation-duration:var(--admin-duration-slow)]",
          )}
        />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          // Focus initial sur « Annuler », jamais sur l'action : une touche
          // Entrée réflexe ne supprime rien.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus();
          }}
          className={cn(
            "admin-theme fixed inset-x-0 z-[var(--admin-z-modal)] mx-auto w-[calc(100%-2rem)] outline-none",
            "rounded-[var(--admin-radius-xl)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-xl)]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:slide-in-from-bottom-4",
            "motion-safe:data-[state=open]:[animation-duration:var(--admin-duration-slow)] motion-safe:data-[state=open]:[animation-timing-function:var(--admin-easing-default)]",
          )}
          style={{
            maxWidth: "calc(var(--admin-app-max-width) - 2rem)",
            bottom: "calc(var(--admin-space-4) + var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))",
          }}
        >
          <div className="px-5 pb-4 pt-5">
            <Dialog.Title className="admin-type-h3 text-[var(--admin-text)]">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="admin-type-body mt-1.5 text-[var(--admin-text-muted)]">
                {description}
              </Dialog.Description>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--admin-border)] p-3">
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
