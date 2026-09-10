"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/ui/primitives/Button";
import { HStack } from "@/ui/primitives/Stack";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /**
   * Ce que l'utilisateur doit savoir avant de valider — la conséquence réelle,
   * écrite par l'appelant qui la connaît. Une boîte sans description ne dit
   * rien de plus que son titre : c'est presque toujours le signe qu'il manque
   * une phrase, pas que la phrase serait superflue.
   */
  description?: string;
  /** Texte du bouton de confirmation (defaut "Supprimer"). */
  confirmLabel?: string;
  /** Texte du bouton d'annulation (defaut "Annuler"). */
  cancelLabel?: string;
  /** "danger" rouge (defaut) ou "primary" pour confirms non-destructifs. */
  tone?: "danger" | "primary";
  /** @deprecated — sans effet, l'implémentation Radix passe par-dessus toute Sheet parente. */
  nested?: boolean;
  /**
   * Handler de confirmation. **Rends une promesse** : la boîte reste ouverte et
   * verrouillée tant qu'elle n'est pas résolue, et affiche l'erreur si elle
   * rejette. Un handler qui rend `void` court sans surveillance — le bouton
   * redevient tapable aussitôt et deux taps rapides envoient deux requêtes.
   */
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Une réouverture repart d'une ardoise propre : garder l'erreur du refus
  // précédent la ferait passer pour celle de la tentative en cours.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      /*
       * L'échec s'affiche DANS la boîte, pas à côté.
       *
       * Il partait en toast — lequel, tant qu'un dialogue modal est ouvert,
       * vit dans le sous-arbre que Radix neutralise : ni annonçable, ni
       * tapable, et effacé au bout de trois secondes. L'utilisateur voyait
       * donc sa confirmation ne produire strictement rien, retapait, et
       * recommençait. Le message doit être là où le regard est déjà.
       */
      setError(e instanceof Error ? e.message : "L'action a échoué. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="admin-theme fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: "var(--admin-z-modal-backdrop)" }}
        />
        <Dialog.Content
          /*
           * Le focus va sur « Annuler », et non nulle part.
           *
           * L'ancienne version annulait le focus automatique : sur iOS le
           * clavier restait donc levé au-dessus de la boîte, recouvrant ses
           * deux boutons, et les frappes continuaient d'alimenter le champ
           * caché derrière le voile. Donner le focus à un bouton referme le
           * clavier — et le donner au bouton le moins destructeur évite qu'une
           * touche Entrée réflexe déclenche l'action.
           */
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus();
          }}
          className={cn(
            "admin-theme fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-[20px]",
            "bg-[var(--admin-surface)] outline-none shadow-[var(--admin-shadow-lg)]",
          )}
          style={{
            zIndex: "var(--admin-z-modal)",
            /*
             * Le corps du texte défile, la barre de boutons non. Sans plafond,
             * une description longue — trois réserves cumulées, du texte
             * agrandi, un écran en paysage — poussait « Annuler / Confirmer »
             * hors de l'écran, et le body de cette PWA ne défile pas : les
             * boutons devenaient inatteignables, sans même une barre de
             * défilement à rattraper.
             */
            maxHeight: "calc(var(--admin-vh, 100dvh) - 2rem)",
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
            <Dialog.Title className="text-[17px] font-semibold leading-tight text-[var(--admin-text)]">
              {title}
            </Dialog.Title>
            {/*
              La description est rendue même vide : Radix avertit sinon à chaque
              ouverture qu'aucune ne décrit la boîte, et un lecteur d'écran
              n'annonce plus que le titre.
            */}
            <Dialog.Description
              className={cn(
                "mt-1.5 text-[13px] leading-relaxed text-[var(--admin-text-muted)]",
                description ? null : "sr-only",
              )}
            >
              {description ?? title}
            </Dialog.Description>
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-[10px] px-3 py-2 text-[13px] leading-snug"
                style={{
                  background: "var(--admin-danger-bg)",
                  color: "var(--admin-danger)",
                  border: "1px solid var(--admin-danger)",
                }}
              >
                {error}
              </p>
            ) : null}
          </div>

          <div
            className="shrink-0 px-4 pb-4 pt-3"
            style={{ borderTop: "1px solid var(--admin-border)" }}
          >
            {/* `wrap` : à 320 px, « Enregistrer quand même » ne tient pas à côté
                d'« Annuler » — les deux passent alors l'un sous l'autre plutôt
                que de rogner leur libellé. */}
            <HStack gap={2} wrap>
              <Button
                ref={cancelRef}
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                size="lg"
                fullWidth
                isLoading={busy}
                onClick={() => void handleConfirm()}
              >
                {error ? "Réessayer" : confirmLabel}
              </Button>
            </HStack>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
