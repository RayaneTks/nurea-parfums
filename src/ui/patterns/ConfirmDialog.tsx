"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/ui/primitives/Button";
import { HStack, Stack } from "@/ui/primitives/Stack";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Texte du bouton de confirmation (defaut "Supprimer"). */
  confirmLabel?: string;
  /** Texte du bouton d'annulation (defaut "Annuler"). */
  cancelLabel?: string;
  /** "danger" rouge (defaut) ou "primary" pour confirms non-destructifs. */
  tone?: "danger" | "primary";
  /** @deprecated — sans effet, l'implémentation Radix passe par-dessus toute Sheet parente. */
  nested?: boolean;
  /** Handler async — la dialog reste ouverte pendant l'exécution. */
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

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="admin-theme fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: 90 }}
        />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "admin-theme fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100vw-2rem)] max-w-[400px] rounded-[20px]",
            "bg-[var(--admin-surface)] outline-none shadow-[var(--admin-shadow-lg)]",
          )}
          style={{ zIndex: 91 }}
        >
          <div className="px-5 pt-5">
            <Dialog.Title className="text-[17px] font-semibold leading-tight text-[var(--admin-text)]">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-[13px] text-[var(--admin-text-muted)]">
                {description}
              </Dialog.Description>
            ) : null}
          </div>

          <div className="px-5 pt-3">
            <Stack gap={2}>
              <p className="text-[13px] leading-relaxed text-[var(--admin-text-muted)]">
                {tone === "danger"
                  ? "Cette action est irréversible."
                  : "Merci de confirmer."}
              </p>
            </Stack>
          </div>

          <div
            className="mt-4 px-4 pb-4 pt-3"
            style={{ borderTop: "1px solid var(--admin-border)" }}
          >
            <HStack gap={2}>
              <Button
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
                {confirmLabel}
              </Button>
            </HStack>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
