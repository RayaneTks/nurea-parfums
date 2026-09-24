"use client";

import { useMemo } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import type { BatchLineDTO } from "@/contracts/batches";
import { formatDzd } from "@/domain/money";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { purchaseDetail, purchaseLineCaption, rateLine } from "./supplier-model";

/**
 * E06 — la tuile « Achat des parfums » relue en dinars : le total payé au fournisseur, chaque taux pratiqué et
 * ce qu'il donne en euros, puis ligne par ligne. Même périmètre que la tuile (documents engagés) : la somme en
 * euros est la sienne, au centime.
 */
export function PurchaseSheet({ open, onClose, lines }: { open: boolean; onClose: () => void; lines: readonly BatchLineDTO[] }) {
  const detail = useMemo(() => purchaseDetail(lines), [lines]);
  useShellSheet(open, onClose);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Achat des parfums"
      description="Avant conversion, au taux de chaque ligne"
    >
      <div className="flex flex-col gap-4" data-purchase-detail>
        <Card padding={4}>
          <div className="flex flex-col gap-1">
            <Text variant="caption" tone="muted" className="font-semibold">
              Payé au fournisseur
            </Text>
            <span className="admin-type-display tnum text-[var(--admin-text)]">{formatDzd(detail.totalDzd)}</span>
            <Text variant="body" tone="muted" className="tnum">
              soit <Money value={detail.totalEur} />
            </Text>
          </div>
        </Card>

        {detail.rates.length > 0 ? (
          <ListSection title="Par taux">
            {detail.rates.map((group) => (
              <ListRow key={rateLine(group)} primary={<span className="tnum">{rateLine(group)}</span>} />
            ))}
          </ListSection>
        ) : null}

        {detail.unknown > 0 ? (
          <Text variant="caption" tone="warning">
            {detail.unknown} ligne{detail.unknown > 1 ? "s" : ""} sans achat renseigné, comptée{detail.unknown > 1 ? "s" : ""} 0 € dans la tuile.
          </Text>
        ) : null}

        {detail.lines.length > 0 ? (
          <ListSection title="Parfums" count={detail.lines.length}>
            {detail.lines.map((line) => (
              <ListRow
                key={line.id}
                primary={line.label}
                secondary={purchaseLineCaption(line)}
                trailing={<span className="admin-type-body-em tnum">{formatDzd(line.totalDzd)}</span>}
              />
            ))}
          </ListSection>
        ) : (
          <Text variant="body" tone="muted">
            Aucun achat renseigné sur les commandes confirmées ou livrées de ce lot.
          </Text>
        )}
      </div>
    </Sheet>
  );
}
