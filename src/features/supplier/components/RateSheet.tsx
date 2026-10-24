"use client";

import { useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import { RATE_MESSAGE } from "@/contracts/settings";
import { dzdFromDb, parseRateInput, rateFromDb, toDb, type Rate } from "@/domain/money";
import { rateToInputText } from "@/features/settings/components/settings-model";
import { setSupplierRateAction } from "@/server/supplier/actions";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Sheet } from "@/ui/primitives/Sheet";
import { eurReading } from "./supplier-model";

type RateSheetProps = {
  rate: Rate;
  /** Le Reste à payer positif, pour montrer ce que le nouveau taux change. */
  remainingDzd: string | null;
  onClose: () => void;
  onSaved: (rate: Rate) => void;
};

/**
 * S26 — Taux du carnet. L'euro n'est qu'une lecture : changer le taux recalcule tout de suite chaque
 * ligne et le Reste à payer, sans rien réécrire. Ce taux est à part de celui des Réglages (proposé à la
 * vente) : le changer ici ne bouge pas l'autre.
 */
export function RateSheet({ rate, remainingDzd, onClose, onSaved }: RateSheetProps) {
  const initial = rateToInputText(toDb(rate));
  const [text, setText] = useState(initial);
  useShellSheet(true, onClose);

  const typed = parseRateInput(text);
  const save = useAction(setSupplierRateAction, {
    success: "Taux enregistré",
    onSuccess: (stored) => {
      onSaved(rateFromDb(stored));
      onClose();
    },
  });

  const example = typed && remainingDzd ? eurReading(dzdFromDb(remainingDzd), typed) : null;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Taux du carnet"
      description="Dinars pour 1 €. Sert seulement à lire les montants en euros."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={save.pending}
          disabled={typed === null}
          onClick={() => void save.run({ rate: text })}
        >
          {typed === null ? "Saisir le taux" : "Enregistrer le taux"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5" data-supplier-rate-sheet>
        <FormField
          label="Taux"
          required
          error={text.trim() !== "" && typed === null ? RATE_MESSAGE : save.error?.fields?.rate}
          hint={example ? `Reste à payer ${example} à ce taux.` : undefined}
        >
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              numeric
              value={text}
              onChange={(event) => setText(event.target.value)}
              trailingSlot={<span className="admin-type-body text-[var(--admin-text-muted)]">DA / €</span>}
              enterKeyHint="done"
              onKeyDown={(event) => {
                if (event.key === "Enter" && typed !== null) void save.run({ rate: text });
              }}
            />
          )}
        </FormField>
      </div>
    </Sheet>
  );
}
