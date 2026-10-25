"use client";

import { useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { routes } from "@/app-shell/routes";
import type { SupplierEntryDTO } from "@/contracts/supplier";
import { newId } from "@/domain/ids";
import { dzdFromDb, formatDzd, type Rate } from "@/domain/money";
import { settleSupplierDebtAction } from "@/server/supplier/actions";
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
  /** « Annuler le remboursement » : supprime le versement lié, avec le filet « Annuler » de l'écran. */
  onUnsettle: (paymentId: string) => void;
};

/**
 * S22 — Une ligne du carnet (`?ligne=<id>`) : le détail, la note, ce qui avait été coché, puis « Modifier »
 * et « Supprimer » (filet « Annuler » de 5 s, posé par l'écran). L'euro est relu au taux du carnet, jamais
 * figé sur la ligne.
 *
 * Une dette se « marque remboursée » d'un geste : un versement du même montant, daté maintenant, lié à
 * elle (le Reste à payer baisse d'autant ; rien ne sort de la Trésorerie). Remboursée, elle le dit et
 * propose « Annuler le remboursement ».
 */
export function LineSheet({ entry, rate, onClose, onEdit, onDelete, onUnsettle }: LineSheetProps) {
  useShellSheet(true, onClose);
  const url = useUrlState();
  const amount = dzdFromDb(entry.amountDzd);
  const [paymentId] = useState(newId);
  const settle = useAction(settleSupplierDebtAction, { success: "Dette marquée remboursée" });
  const settledBy = entry.settledBy;
  const settles = entry.kind === "PAYMENT" ? entry.settles : null;

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
          {entry.kind === "DEBT" && !settledBy ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={settle.pending}
              onClick={() => void settle.run({ id: paymentId, debtId: entry.id })}
              data-supplier-settle
            >
              Marquer remboursée
            </Button>
          ) : null}
          {settledBy ? (
            <Button variant="secondary" size="lg" fullWidth onClick={() => onUnsettle(settledBy.id)} data-supplier-unsettle>
              Annuler le remboursement
            </Button>
          ) : null}
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

        {settledBy ? (
          // Le marqueur de test sur une balise DOM : une brique de `src/ui` perd les `data-*`.
          <div data-supplier-settled>
            <Text variant="bodyEm" tone="success">
              Remboursée le <DateLabel date={settledBy.occurredAt} format="long" />
            </Text>
          </div>
        ) : null}

        {settles ? (
          <ListSection title="Rembourse la dette">
            <ListRow
              onClick={() => url.set({ ligne: settles.id })}
              primary={settles.label?.trim() || "Dette"}
              secondary="Son montant suit celui de la dette."
              chevron
            />
          </ListSection>
        ) : null}

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
