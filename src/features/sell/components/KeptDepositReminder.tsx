"use client";

import { useState } from "react";
import type { KeptDepositDTO } from "@/contracts/customers";
import {
  eur,
  eurFromWire,
  formatEur,
  parseEurInput,
  type Eur,
} from "@/domain/money";
import type { LineDraft } from "@/features/documents/components/line-draft";
import { formatDate } from "@/ui/patterns/date-format";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Text } from "@/ui/primitives/Text";

/** « Remise de 15,00 € pour l'acompte laissé le 9 sept. » : la note posée sur la ligne remisée. */
export function discountNote(
  amount: Eur,
  deposit: Pick<KeptDepositDTO, "orderedAt">,
): string {
  return `Remise de ${formatEur(amount)} pour l'acompte laissé le ${formatDate(new Date(deposit.orderedAt), "short")}`;
}

/**
 * Rappel d'acompte laissé (docs/admin/desistements.md) : quand le client du ticket a versé un acompte sur une commande
 * qu'il n'a pas prise, Vendre le dit. Rien n'oblige : « Lui faire une remise » ouvre un montant (proposé : l'acompte),
 * retiré du prix de la ligne la plus chère, avec une note. Une remise posée se retire d'une touche.
 */
export function KeptDepositReminder({
  name,
  deposits,
  lines,
  onApply,
  onRemove,
}: {
  name: string;
  deposits: readonly KeptDepositDTO[];
  lines: readonly LineDraft[];
  onApply: (amount: Eur, note: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const total = eur.sum(deposits.map((deposit) => eurFromWire(deposit.amount)));
  const [text, setText] = useState(() => amountToInputText(total));
  const latest = deposits[0];
  if (!latest) return null;

  const discounted = lines.find((line) => line.discount);
  const amount = parseEurInput(text);
  const valid = amount !== null && eur.compare(amount, eur.zero) > 0;
  const dates = deposits
    .map((deposit) => formatDate(new Date(deposit.orderedAt), "short"))
    .join(", ");

  return (
    // Le marqueur e2e vit sur une balise DOM : `Card` ne transmet pas les `data-*`.
    <div data-kept-deposit-reminder>
      <Card padding={3} tone="muted">
        <div className="flex flex-col gap-3">
          <Text variant="body">
            {`${name} avait laissé ${formatEur(total)} d'acompte sur une commande non prise (${dates}).`}
          </Text>
          {discounted?.discount ? (
            <div className="flex flex-col gap-2">
              <Text variant="caption" tone="muted">
                {`Remise de ${formatEur(parseEurInput(discounted.discount.amount) ?? eur.zero)} appliquée sur ${discounted.perfumeName}.`}
              </Text>
              <Button variant="secondary" onClick={onRemove}>
                Retirer la remise
              </Button>
            </div>
          ) : open ? (
            <div className="flex flex-col gap-2">
              <FormField label="Montant de la remise">
                {(field) => (
                  <MoneyInput
                    {...field}
                    value={text}
                    onChange={setText}
                    onSubmitAmount={() => valid && amount && apply(amount)}
                  />
                )}
              </FormField>
              <Button
                variant="secondary"
                disabled={!valid || lines.length === 0}
                onClick={() => valid && amount && apply(amount)}
              >
                {lines.length === 0
                  ? "Ajoute d'abord un parfum"
                  : valid && amount
                    ? `Retirer ${formatEur(amount)} du prix`
                    : "Saisir le montant"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Text variant="caption" tone="muted">
                Rien ne t&apos;oblige à le déduire.
              </Text>
              <Button variant="secondary" onClick={() => setOpen(true)}>
                Lui faire une remise
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  function apply(value: Eur) {
    if (!latest) return;
    onApply(value, discountNote(value, latest));
    setOpen(false);
  }
}
