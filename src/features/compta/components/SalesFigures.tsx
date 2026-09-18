"use client";

import { ChevronRight } from "lucide-react";
import type { MargeNetteDTO } from "@/contracts/chiffres";
import { eur, eurFromWire, type MoneyString } from "@/domain/money";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { Money } from "@/ui/patterns/Money";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { datedLabel, percentLabel } from "./compta-model";
import { MargeNetteSheet } from "./MargeNetteSheet";
import { useReplaceUrl } from "./useReplaceUrl";

type SalesFiguresProps = {
  /** « septembre », « aujourd'hui », « depuis le début ». */
  period: string;
  encaisse: MoneyString;
  margeNette: MargeNetteDTO;
  aEncaisser: MoneyString;
  /** Adresse de l'écran à `aEncaisser` (E13). */
  collectHref: string;
  /** L'URL courante avec `filtre=cout-a-completer` (période gardée) : le lien de S19. */
  unknownCostHref: string;
};

const isZero = (value: MoneyString) => eur.isZero(eurFromWire(value));

/**
 * E03 zone 2 — les chiffres de la période, sur leur écran de référence : pas de tuile (05 §3.2 `KpiTile`), un
 * libellé daté et un montant. Seule la Marge nette se touche, pour s'expliquer (S19). Encaissé et Marge nette
 * parlent la même période ; « À encaisser » est un encours, sans période, qui mène à son écran d'action.
 */
export function SalesFigures({ period, encaisse, margeNette, aEncaisser, collectHref, unknownCostHref }: SalesFiguresProps) {
  const detail = useTransientSheet<true>();
  const [go] = useReplaceUrl();
  const percent = percentLabel(margeNette.percent);
  const empty = isZero(encaisse) && isZero(margeNette.costs) && isZero(margeNette.expenses) && margeNette.unknownCostCount === 0;
  const encaisseLabel = datedLabel("Encaissé", period);
  const margeLabel = datedLabel("Marge nette", period);

  return (
    <section className="flex flex-col gap-3" aria-label={`Chiffres · ${period}`} data-sales-figures>
      {empty ? (
        <EmptyState done title="Aucune vente sur cette période." />
      ) : (
        <>
          <div className="flex flex-col gap-0.5" data-figure="encaisse">
            <Text variant="micro" tone="subtle" uppercase>
              {encaisseLabel}
            </Text>
            <Money value={encaisse} bold className="admin-type-display" />
          </div>

          <Card padding={0}>
            <div data-figure="marge-nette">
              <ListRow
                primary={margeLabel}
                ariaLabel={`${margeLabel} : voir le détail`}
                onClick={() => detail.show(true)}
                trailing={
                  <span className="flex items-center gap-1">
                    <Money value={margeNette.value} bold />
                    {percent ? <span className="admin-type-caption tnum text-[var(--admin-text-muted)]">· {percent}</span> : null}
                    <ChevronRight size={16} aria-hidden className="text-[var(--admin-text-subtle)]" />
                  </span>
                }
              />
            </div>
            <Divider />
            <div data-figure="depenses">
              <ListRow primary={datedLabel("Dépenses déduites", period)} trailing={<Money value={margeNette.expenses} tone="muted" />} />
            </div>
          </Card>
        </>
      )}

      {!isZero(aEncaisser) ? (
        <Card padding={0} className="border-[var(--admin-warning-border)]">
          <div data-figure="a-encaisser">
            <ListRow href={collectHref} primary="À encaisser" chevron trailing={<Money value={aEncaisser} tone="warning" bold />} />
          </div>
        </Card>
      ) : null}

      {detail.subject ? (
        <MargeNetteSheet
          key={detail.key}
          open={detail.open}
          onClose={detail.hide}
          title={margeLabel}
          figures={margeNette}
          onShowUnknownCost={() => {
            detail.hide();
            go(unknownCostHref);
          }}
        />
      ) : null}
    </section>
  );
}
