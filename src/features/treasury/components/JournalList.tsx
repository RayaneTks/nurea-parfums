"use client";

import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import type { JournalEntry } from "@/contracts/treasury";
import { eurFromWire, formatEur } from "@/domain/money";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { reverseMovementAction } from "@/server/treasury/actions";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { capitalizeFirst, formatDate } from "@/ui/patterns/date-format";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { cn } from "@/lib/utils";
import {
  canReverse,
  groupByDay,
  journalItems,
  movementCaption,
  movementLabel,
  reverseActionLabel,
  reverseConfirmation,
  reversedMessage,
  type JournalItem,
  type ReversibleKind,
} from "./treasury-model";

type JournalListProps = {
  entries: readonly JournalEntry[];
  /** `day` : sections par jour (E04) ; `flat` : une section, date dans la légende (E03 zone 5, S14). */
  grouping: "day" | "flat";
  /** Titre et légende de la section à plat (« Journal · septembre », « Net du mois +1 240 € »). */
  title?: string;
  description?: ReactNode;
  footer?: ReactNode;
  /** Au plus N éléments (paires repliées comptées une fois). */
  limit?: number;
  /** Le nom de la poche est omis de la légende quand la liste est déjà celle d'une poche (S14, E04 filtré). */
  showPocket?: boolean;
  /** Le menu « … » s'ouvre au-dessus d'une sheet (S14). */
  nested?: boolean;
};

/**
 * Mouvements de Trésorerie (06 E04 zone 4, E03 zone 5, S14) : libellés du lexique (06 §1.7), montant signé ; une
 * paire mouvement + contre-passation se replie sous « Annulé », dépliable. Tap sur un paiement : la fiche de son
 * document ; menu « … » d'un transfert, d'un ajustement ou d'un paiement fournisseur actif : « Annuler » (T12,
 * confirmation qui dit l'effet).
 */
export function JournalList({ entries, grouping, title, description, footer, limit, showPocket = true, nested = false }: JournalListProps) {
  const confirm = useConfirm();
  const documentSheet = useDocumentSheetNavigation();
  const [menu, setMenu] = useState<JournalEntry | null>(null);
  const reversing = useRef<ReversibleKind>("TRANSFER");
  const reverse = useAction(reverseMovementAction, { success: () => reversedMessage(reversing.current) });

  const all = journalItems(entries);
  const items = limit === undefined ? all : all.slice(0, limit);

  const requestReverse = async (entry: JournalEntry) => {
    setMenu(null);
    if (!canReverse(entry)) return;
    reversing.current = entry.kind;
    await confirm({ ...reverseConfirmation(entry), cancelLabel: "Garder", tone: "danger" }, async () => {
      const result = await reverse.run({ movementId: entry.id });
      if (!result.ok) throw new Error(result.error.message);
    });
  };

  const row = (item: JournalItem) => (
    <JournalRow
      key={item.type === "pair" ? item.original.id : item.entry.id}
      item={item}
      withDate={grouping === "flat"}
      showPocket={showPocket}
      onMenu={setMenu}
      onOpenDocument={(id) => documentSheet.open(id)}
    />
  );

  const sections =
    grouping === "day" ? (
      groupByDay(items).map((group) => (
        <ListSection key={group.day} title={capitalizeFirst(formatDate(new Date(`${group.day}T12:00:00Z`), "long"))}>
          {group.items.map(row)}
        </ListSection>
      ))
    ) : items.length > 0 ? (
      <ListSection title={title ?? "Mouvements"} description={description} footer={footer}>
        {items.map(row)}
      </ListSection>
    ) : null;

  return (
    <>
      {sections}
      <Sheet
        open={menu !== null}
        onOpenChange={(open) => (open ? undefined : setMenu(null))}
        nested={nested}
        size="auto"
        title={menu ? movementLabel(menu) : "Mouvement"}
        description={menu ? `${formatEur(eurFromWire(menu.amount), { signed: true })} · ${movementCaption(menu, { withDate: true })}` : undefined}
      >
        <Card padding={0}>
          {menu && canReverse(menu) ? (
            <ListRow
              primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">{reverseActionLabel(menu.kind)}</span>}
              onClick={() => void requestReverse(menu)}
            />
          ) : null}
        </Card>
      </Sheet>
    </>
  );
}

function JournalRow({
  item,
  withDate,
  showPocket,
  onMenu,
  onOpenDocument,
}: {
  item: JournalItem;
  withDate: boolean;
  showPocket: boolean;
  onMenu: (entry: JournalEntry) => void;
  onOpenDocument: (documentId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (item.type === "pair") {
    const { original, reversal } = item;
    return (
      <div data-journal-pair={original.id}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="tap-scale flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]"
        >
          <span className="min-w-0 flex-1">
            <span className="admin-type-body block truncate font-medium text-[var(--admin-text-muted)]">Annulé · {movementLabel(original)}</span>
            <span className="admin-type-caption mt-0.5 block truncate text-[var(--admin-text-muted)]">
              {movementCaption(original, { withDate, showPocket })}
            </span>
          </span>
          <Money value={original.amount} signed tone="muted" className="line-through" />
          <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-[var(--admin-text-subtle)] admin-transition", open ? "rotate-180" : null)} />
        </button>
        {open ? (
          <div className="border-t border-[var(--admin-border)] bg-[var(--admin-surface-alt)]">
            {[original, reversal].map((entry) => (
              <ListRow
                key={entry.id}
                primary={<span className="admin-type-body block truncate text-[var(--admin-text-muted)]">{entry.reversesId ? "Écriture inverse" : movementLabel(entry)}</span>}
                secondary={movementCaption(entry, { withDate, showPocket })}
                trailing={<Money value={entry.amount} signed tone="muted" />}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const { entry } = item;
  const label = entry.reversesId ? `Annulation · ${movementLabel(entry)}` : movementLabel(entry);
  const trailing = (
    <span className="flex items-center gap-1">
      <Money value={entry.amount} signed tone={entry.reversesId ? "muted" : "default"} />
      {canReverse(entry) ? (
        <Button variant="ghost" iconOnly ariaLabel={`Actions : ${label}`} onClick={() => onMenu(entry)}>
          <MoreHorizontal size={18} />
        </Button>
      ) : null}
    </span>
  );
  const common = { primary: label, secondary: movementCaption(entry, { withDate, showPocket }), trailing };
  const documentId = entry.payment?.documentId;
  return (
    <div data-journal-entry={entry.id} data-movement-kind={entry.kind}>
      {documentId ? <ListRow {...common} onClick={() => onOpenDocument(documentId)} /> : <ListRow {...common} />}
    </div>
  );
}
