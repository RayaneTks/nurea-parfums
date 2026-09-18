"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import type { MargeNetteDTO } from "@/contracts/chiffres";
import { eurFromWire, formatEur } from "@/domain/money";
import { Money } from "@/ui/patterns/Money";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { percentLabel } from "./compta-model";

type MargeNetteSheetProps = {
  open: boolean;
  onClose: () => void;
  /** « Marge nette · septembre », « Marge nette · Commande de mars ». */
  title: string;
  figures: MargeNetteDTO;
  /**
   * « 2 documents au coût à compléter, comptés 0 € › » : au périmètre d'une période (E03), ferme la sheet et
   * pose `filtre=cout-a-completer` en gardant la période ; au périmètre d'un lot (E06, J13), déplie la liste.
   */
  onShowUnknownCost?: () => void;
};

function Line({ label, value, strong = false }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2">
      <span className={strong ? "admin-type-body-em min-w-0 text-[var(--admin-text)]" : "admin-type-body min-w-0 text-[var(--admin-text-muted)]"}>{label}</span>
      <span className={strong ? "admin-type-body-em shrink-0" : "admin-type-body shrink-0"}>{value}</span>
    </div>
  );
}

/**
 * S19 — Détail de la Marge nette (06 S19, arbitrage n°16) : l'équation en quatre lignes, au même périmètre que le
 * chiffre touché — mêmes composantes que `margeNette()` (03 §5.4), rien n'est recalculé. Pourcentage absent quand
 * l'Encaissé est nul.
 */
export function MargeNetteSheet({ open, onClose, title, figures, onShowUnknownCost }: MargeNetteSheetProps) {
  useShellSheet(open, onClose);
  const percent = percentLabel(figures.percent);
  const unknown = figures.unknownCostCount;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())} title={title} size="auto">
      <div className="flex flex-col gap-4 pb-2" data-marge-nette-sheet>
        <Card padding={0}>
          <div data-marge-line="encaisse">
            <Line label="Encaissé" value={<Money value={figures.encaisse} />} />
          </div>
          <Divider />
          <div data-marge-line="couts">
            <Line label="− Coûts d'achat des documents engagés" value={<Money value={figures.costs} />} />
          </div>
          <Divider />
          <div data-marge-line="depenses">
            <Line label="− Dépenses de lot" value={<Money value={figures.expenses} />} />
          </div>
          <Divider />
          <div data-marge-line="marge">
            <Line
              strong
              label="= Marge nette"
              value={
                <span className="flex items-baseline gap-1">
                  <Money value={figures.value} bold />
                  {percent ? <span className="tnum text-[var(--admin-text-muted)]">· {percent}</span> : null}
                </span>
              }
            />
          </div>
        </Card>

        {unknown > 0 ? (
          onShowUnknownCost ? (
            <button
              type="button"
              onClick={onShowUnknownCost}
              className="tap-scale flex min-h-[var(--admin-touch-min)] w-full items-center justify-between gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] px-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
              data-unknown-cost
            >
              <span className="admin-type-body font-medium text-[var(--admin-warning)]">
                {unknown} document{unknown > 1 ? "s" : ""} au coût à compléter, compté{unknown > 1 ? "s" : ""} 0 €
              </span>
              <ChevronRight size={18} aria-hidden className="shrink-0 text-[var(--admin-warning)]" />
            </button>
          ) : (
            <Text variant="body" tone="warning">
              {unknown} document{unknown > 1 ? "s" : ""} au coût à compléter, compté{unknown > 1 ? "s" : ""} 0 €
            </Text>
          )
        ) : null}

        <Text variant="caption" tone="muted">
          La Marge nette, c&apos;est ce qui a été encaissé, moins le coût d&apos;achat des documents engagés et les dépenses de
          lot, sur le même périmètre. Elle est toujours comptée après dépenses.
          {figures.percent === null ? null : ` Le pourcentage rapporte la Marge nette à l'Encaissé (${formatEur(eurFromWire(figures.encaisse))}).`}
        </Text>
      </div>
    </Sheet>
  );
}
