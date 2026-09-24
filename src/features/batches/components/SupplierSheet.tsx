"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import type { BatchLineDTO } from "@/contracts/batches";
import { ListSection } from "@/ui/patterns/ListSection";
import { ShareButton, shareOrCopy } from "@/ui/patterns/ShareButton";
import { Button } from "@/ui/primitives/Button";
import { Checkbox } from "@/ui/primitives/Checkbox";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import {
  allSelection,
  initialSelection,
  selectionKey,
  supplierCount,
  supplierCountLabel,
  supplierGroups,
  supplierItemLabel,
  supplierMessage,
} from "./supplier-model";

/**
 * E06 « ⋯ » → Liste pour le fournisseur : ce qu'on lui fait préparer, client par client — parfum, marque,
 * contenance, jamais un prix. Tout est coché sauf ce qui est déjà remis ; on décoche ce qui ne part pas, puis
 * la feuille de partage iOS envoie le message (repli : copie).
 */
export function SupplierSheet({
  open,
  onClose,
  batchName,
  lines,
}: {
  open: boolean;
  onClose: () => void;
  batchName: string;
  lines: readonly BatchLineDTO[];
}) {
  const { showToast } = useToast();
  const groups = useMemo(() => supplierGroups(lines), [lines]);
  const [selected, setSelected] = useState(() => initialSelection(groups));
  useShellSheet(open, onClose);

  const count = supplierCount(groups, selected);
  const everything = useMemo(() => allSelection(groups), [groups]);
  const allChosen = selected.size === everything.size;
  const message = supplierMessage(batchName, groups, selected);
  const feedback = (msg: string, type: "success" | "error") => showToast({ type, message: msg });
  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Liste pour le fournisseur"
      description={groups.length === 0 ? batchName : supplierCountLabel(count)}
      footer={
        groups.length === 0 ? undefined : (
          <div className="flex flex-col gap-2">
            <ShareButton
              payload={{ text: message }}
              label="Envoyer au fournisseur…"
              variant="primary"
              size="lg"
              fullWidth
              disabled={count.bottles === 0}
              onFeedback={feedback}
            />
            <Button
              variant="secondary"
              fullWidth
              disabled={count.bottles === 0}
              onClick={() =>
                void shareOrCopy({ text: message }, { clipboard: navigator.clipboard }).then((outcome) =>
                  outcome === "copied" ? feedback("Liste copiée", "success") : feedback("Copie impossible sur cet appareil.", "error"),
                )
              }
            >
              Copier la liste
            </Button>
          </div>
        )
      }
    >
      {groups.length === 0 ? (
        <Text variant="body" tone="muted">
          Aucun parfum dans ce lot : rattache d&apos;abord des commandes.
        </Text>
      ) : (
        <div className="flex flex-col gap-4" data-supplier-list>
          <div className="flex items-start justify-between gap-3">
            <Text variant="caption" tone="muted">
              Sans aucun prix. Ce qui est déjà remis au client est décoché : coche ce qui part chez le fournisseur.
            </Text>
            <Button variant="text" size="sm" onClick={() => setSelected(allChosen ? new Set() : new Set(everything))}>
              {allChosen ? "Tout décocher" : "Tout cocher"}
            </Button>
          </div>
          {groups.map((group) => (
            <ListSection key={group.key} title={group.customer}>
              {group.items.map((item) => {
                const key = selectionKey(group, item);
                const checked = selected.has(key);
                const label = supplierItemLabel(item);
                return (
                  <ListRow
                    key={key}
                    leading={<Checkbox checked={checked} onCheckedChange={() => toggle(key)} ariaLabel={`${label}, ${group.customer}`} />}
                    primary={label}
                    secondary={item.delivered ? "Déjà remis au client" : undefined}
                    trailing={item.quantity > 1 ? <span className="admin-type-body-em tnum">×{item.quantity}</span> : undefined}
                    onClick={() => toggle(key)}
                  />
                );
              })}
            </ListSection>
          ))}
        </div>
      )}
    </Sheet>
  );
}
