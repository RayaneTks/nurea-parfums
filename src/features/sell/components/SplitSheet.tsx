"use client";

import { useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import type { PocketSummary } from "@/contracts/treasury";
import { eur, formatEur, parseEurInput, toWire, type Eur } from "@/domain/money";
import { useDiscardGuard } from "@/features/documents/components/useDiscardGuard";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { MoneyInput } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import type { SplitEntry } from "./composer-model";

type SplitSheetProps = {
  open: boolean;
  onClose: () => void;
  received: Eur;
  pockets: readonly PocketSummary[];
  initial: readonly SplitEntry[];
  onValidate: (split: { received: ReturnType<typeof toWire>; entries: SplitEntry[] } | null) => void;
};

/**
 * S08 — Plusieurs poches (06 S08) : ventiler le reçu d'une création sur plusieurs poches (cas rare). En-tête « Reçu
 * 120 € · réparti 100 € · reste 20 € » ; le reste ira dans « Non attribué ». Aucune écriture : T1 la porte au CTA.
 */
export function SplitSheet({ open, onClose, received, pockets, initial, onValidate }: SplitSheetProps) {
  const rows = pockets.filter((pocket) => !pocket.isSystem);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((pocket) => [pocket.id, initial.find((entry) => entry.pocketId === pocket.id)?.amount ?? ""])),
  );
  const spread = eur.sum(rows.map((pocket) => parseEurInput(amounts[pocket.id] ?? "") ?? eur.zero));
  const rest = eur.sub(received, spread);
  const over = eur.isNegative(rest);
  const invalid = rows.some((pocket) => (amounts[pocket.id] ?? "").trim() !== "" && parseEurInput(amounts[pocket.id] ?? "") === null);
  const dirty = rows.some((pocket) => (amounts[pocket.id] ?? "") !== (initial.find((entry) => entry.pocketId === pocket.id)?.amount ?? ""));
  const guard = useDiscardGuard(dirty);
  const requestClose = () => void guard().then((ok) => ok && onClose());
  useShellSheet(open, requestClose);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      dismissible={!dirty}
      title="Plusieurs poches"
      size="auto"
    >
      <div className="flex flex-col gap-4" data-split-sheet>
        <Text variant="bodyEm" className="tnum">
          Reçu {formatEur(received)} · réparti {formatEur(spread)} · reste {formatEur(eur.clampZero(rest))}
        </Text>
        {rows.map((pocket) => (
          <FormField key={pocket.id} label={pocket.name}>
            {(field) => (
              <MoneyInput
                {...field}
                value={amounts[pocket.id] ?? ""}
                onChange={(text) => setAmounts((current) => ({ ...current, [pocket.id]: text }))}
                enterKeyHint="next"
              />
            )}
          </FormField>
        ))}
        {over ? (
          <Text variant="caption" tone="danger" className="font-medium">
            {formatEur(eur.neg(rest))} de trop
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            Le reste ira dans Non attribué.
          </Text>
        )}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={over || invalid}
            onClick={() => {
              const entries = rows.flatMap((pocket) => {
                const amount = parseEurInput(amounts[pocket.id] ?? "");
                return amount !== null && eur.compare(amount, eur.zero) > 0 ? [{ pocketId: pocket.id, amount: amounts[pocket.id] as string }] : [];
              });
              onValidate(entries.length > 0 ? { received: toWire(received), entries } : null);
              onClose();
            }}
          >
            Valider la répartition
          </Button>
          <Button
            variant="text"
            fullWidth
            onClick={() => {
              onValidate(null);
              onClose();
            }}
          >
            Une seule poche
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
