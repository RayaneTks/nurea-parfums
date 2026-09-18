"use client";

import type { PocketSummary } from "@/contracts/treasury";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { MovementSheet, type MovementRequest } from "@/features/treasury/components/MovementSheet";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import type { AlertKind, AlertRow } from "./home-model";

type AlertsListProps = {
  rows: readonly AlertRow[];
  /** Adresse de l'écran de chaque alerte, fabriquée par la page (`routes.ts` : 04 §2.2). */
  hrefs: Readonly<Partial<Record<AlertKind, string>>>;
  /** Poches actives : « Répartir » agit SUR PLACE (S15 mode Répartir, PC-11 en 2 taps). */
  pockets: readonly PocketSummary[];
};

const SPREAD: MovementRequest = { mode: "repartir" };

/**
 * E01 zone 3 — « À faire ». Une rangée par chose à faire, et RIEN quand il n'y a rien : le bloc n'est pas
 * rendu, pas même vide (05 §5.3 — « rien à faire ⇒ rien rendu »).
 *
 * Chaque rangée ouvre EXACTEMENT l'ensemble qu'elle compte. C'était le défaut de l'existant (01 §4.6 :
 * l'alerte comptait PENDING + READY et ouvrait READY seule) ; `e2e/parcours/accueil.spec.ts` le vérifie
 * rangée par rangée, en confrontant le nombre affiché au nombre de lignes de l'écran ouvert.
 *
 * « Répartir » n'ouvre pas d'écran : la sheet se pose au-dessus de l'Accueil (PC-11 en 2 taps).
 */
export function AlertsList({ rows, hrefs, pockets }: AlertsListProps) {
  const spread = useTransientSheet<MovementRequest>();
  if (rows.length === 0) return null;

  return (
    <>
      <div data-alerts>
        <ListSection title="À faire" tone="warning" count={rows.length}>
          {rows.map((row) => {
            const trailing = row.amount ? <Money value={row.amount} compact tone="warning" bold /> : undefined;
            if (row.actsInPlace) {
              return (
                <ListRow
                  key={row.kind}
                  primary={<span className="admin-type-body block truncate font-medium" data-alert={row.kind}>{row.label}</span>}
                  trailing={
                    <span className="flex items-center gap-2">
                      {trailing}
                      <Button variant="text" size="sm" onClick={() => spread.show(SPREAD)}>
                        Répartir
                      </Button>
                    </span>
                  }
                />
              );
            }
            const href = hrefs[row.kind];
            if (href === undefined) return null;
            return (
              <ListRow
                key={row.kind}
                href={href}
                primary={
                  <span className="admin-type-body block truncate font-medium" data-alert={row.kind} data-alert-count={row.count ?? ""}>
                    {row.label}
                  </span>
                }
                chevron
                trailing={trailing}
              />
            );
          })}
        </ListSection>
      </div>

      {spread.subject ? (
        <MovementSheet key={spread.key} open={spread.open} onClose={spread.hide} request={spread.subject} pockets={pockets} />
      ) : null}
    </>
  );
}
