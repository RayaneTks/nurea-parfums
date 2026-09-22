"use client";

import { Banknote, Inbox, Landmark, Plus, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { MonthlyJournal, PocketActivity, PocketKind, PocketSummary } from "@/contracts/treasury";
import { eur, eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { JournalList } from "./JournalList";
import { MovementSheet, type MovementRequest } from "./MovementSheet";
import { NewPocketSheet } from "./NewPocketSheet";
import { PocketOrderSheet } from "./PocketOrderSheet";
import { PocketSheet } from "./PocketSheet";
import { POCKET_KIND_LABELS, ownPockets, sameAsName, systemPocket } from "./treasury-model";

const POCKET_ICONS: Record<PocketKind, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  SUPPLIER: Truck,
  OTHER: Wallet,
  UNASSIGNED: Inbox,
};

/** Journal de E03 zone 5 : les 20 derniers mouvements du mois (06 E03). */
const JOURNAL_PREVIEW = 20;

type TreasuryViewProps = {
  total: MoneyString;
  pockets: readonly PocketSummary[];
  activity: Record<string, PocketActivity>;
  journal: MonthlyJournal;
  /** « septembre » : « Journal · septembre ». */
  monthLabel: string;
  journalHref: string;
};

/**
 * E03 vue Trésorerie (06 E03) : la Trésorerie à date, le non attribué et « Répartir » (S15, PC-11 en 2 taps), les
 * poches (S14 ; « Nouvelle poche » S16 ; « Ordre » S21), « Nouveau mouvement » (S15), le journal du mois (net du
 * mois complet) et « Tout le journal » (E04). Écran de lecture : aucune action primaire. Soldes lus hors cache
 * (`tresorerie("instant")`) : après un geste, l'écran rafraîchi les montre à jour sans rechargement.
 */
export function TreasuryView({ total, pockets, activity, journal, monthLabel, journalHref }: TreasuryViewProps) {
  const pocketSheet = useTransientSheet<string>();
  const movement = useTransientSheet<MovementRequest>();
  const newPocket = useTransientSheet<true>();
  const order = useTransientSheet<true>();

  const own = ownPockets(pockets);
  const unassigned = systemPocket(pockets);
  const unassignedAmount = unassigned ? eurFromWire(unassigned.balance) : eur.zero;
  const opened = pocketSheet.subject ? (pockets.find((pocket) => pocket.id === pocketSheet.subject) ?? null) : null;

  return (
    <div className="flex flex-col gap-4" data-treasury>
      <div className="flex flex-col gap-0.5" data-figure="tresorerie">
        <Text variant="micro" tone="subtle" uppercase>
          Trésorerie
        </Text>
        <Money value={total} bold className="admin-type-display" />
      </div>

      {eur.compare(unassignedAmount, eur.zero) > 0 ? (
        <Card padding={0} className="border-[var(--admin-warning-border)]">
          <div className="flex min-h-[56px] items-center justify-between gap-3 py-2 pl-4 pr-2" data-unassigned>
            <Text variant="bodyEm" truncate>
              {formatEur(unassignedAmount)} non attribués
            </Text>
            {own.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => movement.show({ mode: "repartir" })}>
                Répartir
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {own.length === 0 ? (
        <EmptyState
          title="Crée ta première poche"
          description="Espèces, Banque : chaque encaissement y sera rangé."
          action={
            <Button variant="primary" onClick={() => newPocket.show(true)}>
              Nouvelle poche
            </Button>
          }
        />
      ) : (
        <ListSection
          title="Poches"
          count={own.length}
          action={
            own.length > 1 ? (
              <Button variant="text" size="sm" onClick={() => order.show(true)}>
                Ordre
              </Button>
            ) : undefined
          }
        >
          {pockets.map((pocket) => {
            const Icon = POCKET_ICONS[pocket.kind];
            const balance = eurFromWire(pocket.balance);
            return (
              <div key={pocket.id} data-pocket-row={pocket.name}>
                <ListRow
                  leading={<Icon size={20} aria-hidden className="text-[var(--admin-accent)]" />}
                  primary={pocket.name}
                  secondary={[pocket.isSystem || sameAsName(pocket) ? null : POCKET_KIND_LABELS[pocket.kind], !pocket.isSystem && pocket.isDefault ? "par défaut" : null]
                    .filter(Boolean)
                    .join(" · ") || undefined}
                  trailing={<Money value={pocket.balance} bold tone={eur.isNegative(balance) ? "danger" : "default"} />}
                  ariaLabel={`Poche ${pocket.name}`}
                  onClick={() => pocketSheet.show(pocket.id)}
                />
              </div>
            );
          })}
          <ListRow
            leading={<Plus size={20} aria-hidden className="text-[var(--admin-accent)]" />}
            primary={<span className="admin-type-body block truncate font-medium text-[var(--admin-accent)]">Nouvelle poche</span>}
            ariaLabel="Nouvelle poche"
            onClick={() => newPocket.show(true)}
          />
        </ListSection>
      )}

      {own.length > 0 ? (
        <Button variant="secondary" fullWidth onClick={() => movement.show({ mode: "transfert" })}>
          Nouveau mouvement
        </Button>
      ) : null}

      <JournalList
        entries={journal.entries}
        grouping="flat"
        limit={JOURNAL_PREVIEW}
        title={`Journal · ${monthLabel}`}
        description={
          <span data-net-du-mois>
            Net du mois <Money value={journal.net} signed bold />
          </span>
        }
        footer={
          <Link
            href={journalHref}
            className="admin-type-caption admin-hit-target tap-scale self-start rounded-[var(--admin-radius-md)] px-1 font-semibold text-[var(--admin-accent)]"
          >
            Tout le journal
          </Link>
        }
      />
      {journal.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-1">
          <EmptyState done title={`Aucun mouvement en ${monthLabel}.`} />
          <Link href={journalHref} className="admin-type-caption admin-hit-target tap-scale rounded-[var(--admin-radius-md)] px-1 font-semibold text-[var(--admin-accent)]">
            Tout le journal
          </Link>
        </div>
      ) : null}

      {opened ? (
        <PocketSheet
          key={pocketSheet.key}
          open={pocketSheet.open}
          onClose={pocketSheet.hide}
          pocket={opened}
          activity={activity[opened.id]}
          pockets={pockets}
        />
      ) : null}
      {movement.subject ? (
        <MovementSheet key={movement.key} open={movement.open} onClose={movement.hide} request={movement.subject} pockets={pockets} />
      ) : null}
      {newPocket.subject ? <NewPocketSheet key={newPocket.key} open={newPocket.open} onClose={newPocket.hide} pockets={pockets} /> : null}
      {order.subject ? <PocketOrderSheet key={order.key} open={order.open} onClose={order.hide} pockets={pockets} /> : null}
    </div>
  );
}
