"use client";

import { useShellSheet } from "@/app-shell/SheetRegistry";
import { routes } from "@/app-shell/routes";
import type { SupplierEntryDTO } from "@/contracts/supplier";
import { dzdFromDb, formatDzd, type Rate } from "@/domain/money";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { ListSection } from "@/ui/patterns/ListSection";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { entryKindLabel, entryTitle, eurReading } from "./supplier-model";

type LineSheetProps = {
  entry: SupplierEntryDTO;
  rate: Rate;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * S22 — Une ligne du carnet (`?ligne=<id>`) : le détail, la note, ce qui avait été coché, puis « Modifier »
 * et « Supprimer » (filet « Annuler » de 5 s, posé par l'écran). L'euro est relu au taux du carnet, jamais
 * figé sur la ligne.
 */
export function LineSheet({ entry, rate, onClose, onEdit, onDelete }: LineSheetProps) {
  useShellSheet(true, onClose);
  const amount = dzdFromDb(entry.amountDzd);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={entryTitle(entry)}
      description={
        <>
          {entryKindLabel(entry.kind)} · <DateLabel date={entry.occurredAt} format="long" />
        </>
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="lg" fullWidth onClick={onEdit}>
            Modifier
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={onDelete}>
            Supprimer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5" data-supplier-line={entry.kind}>
        <div className="flex flex-col gap-0.5">
          <Text variant="h2" className="tnum">
            {formatDzd(amount)}
          </Text>
          <Text variant="caption" tone="muted" className="tnum">
            {eurReading(amount, rate)}
          </Text>
        </div>

        {entry.note ? (
          <Text variant="body" className="whitespace-pre-wrap">
            {entry.note}
          </Text>
        ) : null}

        {entry.items.length > 0 ? (
          <ListSection title="Coché pour cette dette" count={entry.items.length}>
            {entry.items.map((item) => (
              <ListRow
                key={item.id}
                href={item.kind === "batch" ? routes.lot(item.batchId) : routes.document({ id: item.documentId, origin: item.origin })}
                primary={item.kind === "batch" ? item.name : (item.customerName ?? "Client de passage")}
                secondary={item.kind === "batch" ? "Lot" : <DateLabel date={item.orderedAt} />}
                trailing={
                  <Text as="span" variant="bodyEm" className="tnum">
                    {formatDzd(dzdFromDb(item.amountDzd))}
                  </Text>
                }
                chevron
              />
            ))}
          </ListSection>
        ) : null}
      </div>
    </Sheet>
  );
}
