"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { setPerfumeStockAction } from "@/server/catalogue/actions";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Sheet } from "@/ui/primitives/Sheet";
import { Stepper } from "@/ui/primitives/Stepper";
import { Switch } from "@/ui/primitives/Switch";
import { ABANDON_DESCRIPTION, ABANDON_TITLE } from "./useLeaveGuard";

const MAX_STOCK = 99_999;

type StockSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfume: { id: number; name: string; stock: number | null };
  /** Après succès : la rangée « Stock » de la fiche pulse. */
  onSaved?: () => void;
};

/** « Mettre le stock à 5 », « Ne plus suivre le stock » : le CTA dit l'effet (06 S20). */
export function stockCta(tracked: boolean, value: number | null): string {
  if (!tracked) return "Ne plus suivre le stock";
  return value === null ? "Saisir le stock" : `Mettre le stock à ${value}`;
}

/**
 * S20 — Ajuster le stock (06 §3.7) : réglage ABSOLU, jamais mêlé à l'enregistrement de la fiche (01 §4.5).
 * « Suivre le stock » désactivé = « Non suivi » (NULL : aucun badge, aucune alerte), distinct de 0 (rupture).
 */
export function StockSheet({ open, onOpenChange, perfume, onSaved }: StockSheetProps) {
  const confirm = useConfirm();
  const initialTracked = perfume.stock !== null;
  const [tracked, setTracked] = useState(initialTracked);
  const [text, setText] = useState(perfume.stock === null ? "0" : String(perfume.stock));
  const { run, pending, error } = useAction(setPerfumeStockAction, {
    success: (data) => (data.stock === null ? `Stock de ${perfume.name} : non suivi` : `Stock de ${perfume.name} : ${data.stock}`),
    onSuccess: () => {
      onOpenChange(false);
      onSaved?.();
    },
  });

  // Chaque ouverture repart de la valeur du serveur.
  useEffect(() => {
    if (!open) return;
    setTracked(perfume.stock !== null);
    setText(perfume.stock === null ? "0" : String(perfume.stock));
  }, [open, perfume.stock]);

  const parsed = /^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : null;
  const value = tracked ? parsed : null;
  const dirty = tracked !== initialTracked || (tracked && value !== perfume.stock);

  const requestClose = () => {
    if (!dirty) {
      onOpenChange(false);
      return;
    }
    void confirm({ title: ABANDON_TITLE, description: ABANDON_DESCRIPTION, confirmLabel: "Abandonner", tone: "danger" }).then((leave) => {
      if (leave) onOpenChange(false);
    });
  };
  useShellSheet(open, requestClose);

  const submit = () => {
    if (tracked && parsed === null) return;
    void run({ id: perfume.id, stock: tracked ? parsed : null });
  };

  const fieldError = tracked && parsed === null ? "Indique un nombre entier de 0 à 99 999." : error?.fields?.stock;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
      title="Ajuster le stock"
      description={perfume.name}
      dismissible={!dirty}
      size="auto"
    >
      <div className="flex flex-col gap-4">
        <Switch
          checked={tracked}
          onCheckedChange={(next) => setTracked(next)}
          label="Suivre le stock"
          description={tracked ? "Rupture et stock bas sont signalés dans le catalogue." : "Non suivi : aucune alerte, aucun badge."}
        />
        {tracked ? (
          <>
            <div className="flex justify-center py-2">
              <Stepper
                value={parsed ?? 0}
                min={0}
                max={MAX_STOCK}
                ariaLabel={`Stock de ${perfume.name}`}
                onChange={(next) => setText(String(next))}
              />
            </div>
            <FormField label="Quantité en stock" error={fieldError}>
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  numeric
                  enterKeyHint="done"
                  value={text}
                  onChange={(event) => setText(event.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                />
              )}
            </FormField>
          </>
        ) : null}
        {/*
          Le CTA suit le champ au lieu d'occuper un pied de sheet : sur un iPhone SE, clavier ouvert, un pied
          ne laissait que 59 px au contenu (invariant « sheet écrasée »). La sheet épouse son contenu : clavier
          fermé, le bouton reste en bas de l'écran, sous le pouce ; clavier ouvert, il est juste sous le champ.
        */}
        <Button variant="primary" size="lg" fullWidth isLoading={pending} disabled={tracked && parsed === null} onClick={submit}>
          {stockCta(tracked, value)}
        </Button>
      </div>
    </Sheet>
  );
}
