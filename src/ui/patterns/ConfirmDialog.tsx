"use client";

import { useState } from "react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import { HStack, Stack } from "@/ui/primitives/Stack";

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
    <Sheet
      open={open}
      onOpenChange={(o) => (busy ? null : onOpenChange(o))}
      title={title}
      description={description}
      dismissible={!busy}
      handle={false}
      footer={
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
      }
    >
      <Stack gap={2}>
        <p className="text-[14px] leading-relaxed text-[var(--admin-text-muted)]">
          {tone === "danger"
            ? "Cette action est irréversible."
            : "Merci de confirmer."}
        </p>
      </Stack>
    </Sheet>
  );
}
