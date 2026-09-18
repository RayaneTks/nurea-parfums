"use client";

import Link from "next/link";
import { ClipboardList, HandCoins, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { isNavigable, routes } from "@/app-shell/routes";
import type { ReceivableDTO } from "@/contracts/chiffres";
import type { PocketSummary } from "@/contracts/treasury";
import { eur, eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import { CollectSheet, type CollectVariant } from "@/features/documents/components/CollectSheet";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { SwipeableRow } from "@/ui/primitives/SwipeableRow";
import { Text } from "@/ui/primitives/Text";
import { scrollFieldIntoView } from "@/ui/primitives/field-behavior";
import {
  ageLabel,
  countsLabel,
  filterGroups,
  groupReceivables,
  receivableCaption,
  receivableTitle,
  relanceText,
  targetOfReceivable,
  type ReceivableGroup,
} from "./collect-model";
import { RelanceSheet } from "./RelanceSheet";

/** Au-delà de 6 groupes, la recherche est visible (06 E13 zone 3). */
const SEARCH_THRESHOLD = 6;
const SEARCH_DEBOUNCE_MS = 200;

type CollectSubject = { variant: CollectVariant; groupKey: string; documentIds: string[] };

/**
 * E13 — À encaisser (06 E13) : un groupe par client, plus anciennes créances d'abord ; bouton-montant (S02) et
 * glissement « Encaisser » sur chaque document, « Tout encaisser » dès deux documents, « Relancer » (S09), chip
 * « Plus de 30 jours ». La liste est exactement l'ensemble sommé par `aEncaisser()` ; sous `anciennete=30`,
 * exactement `creancesAnciennes()`.
 */
export function ReceivablesView({
  total,
  receivables,
  old,
  pockets,
}: {
  total: MoneyString;
  receivables: readonly ReceivableDTO[];
  old: readonly ReceivableDTO[];
  pockets: readonly PocketSummary[];
}) {
  const url = useUrlState();
  const sheet = useDocumentSheetNavigation();
  const collect = useTransientSheet<CollectSubject>();
  const relance = useTransientSheet<ReceivableGroup>();
  const onlyOld = url.get("anciennete") === "30";
  const urlQuery = url.get("q") ?? "";
  const setUrl = url.set;

  const [query, setQuery] = useState(urlQuery);
  const sent = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== sent.current) {
      sent.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);
  useEffect(() => {
    const next = query.trim();
    if (next === sent.current) return;
    const timer = window.setTimeout(() => {
      sent.current = next;
      setUrl({ q: next || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, setUrl]);

  const allGroups = useMemo(() => groupReceivables(receivables), [receivables]);
  const oldGroups = useMemo(() => groupReceivables(old), [old]);
  const scoped = onlyOld ? oldGroups : allGroups;
  const groups = useMemo(() => filterGroups(scoped, query), [scoped, query]);
  const filtering = onlyOld || query.trim() !== "";
  const showSearch = scoped.length > SEARCH_THRESHOLD || query !== "" || urlQuery !== "";
  const showOldChip = onlyOld || (oldGroups.length > 0 && oldGroups.length < allGroups.length);

  const byDocument = useMemo(() => new Map(receivables.map((item) => [item.documentId, item])), [receivables]);
  const subject = collect.subject;
  const targets = subject ? subject.documentIds.map((id) => byDocument.get(id)).filter((item): item is ReceivableDTO => !!item).map(targetOfReceivable) : [];
  const subjectGroup = subject ? allGroups.find((group) => group.key === subject.groupKey) : undefined;

  const clear = () => {
    sent.current = "";
    setQuery("");
    setUrl({ q: null, anciennete: null });
  };

  return (
    <div className="flex flex-col gap-4" data-receivables>
      <div className="flex flex-col gap-0.5">
        <Money value={total} tone="warning" bold className="admin-type-display" />
        <Text variant="caption" tone="muted">
          {countsLabel(receivables.length, allGroups.length)}
        </Text>
      </div>

      {showOldChip ? (
        <div className="flex gap-2" role="group" aria-label="Filtres">
          <Chip
            active={onlyOld}
            clearable={onlyOld}
            count={oldGroups.length}
            onClick={() => setUrl({ anciennete: onlyOld ? null : 30 })}
          >
            Plus de 30 jours
          </Chip>
        </div>
      ) : null}

      {showSearch ? (
        <SearchField value={query} onChange={setQuery} placeholder="Client" ariaLabel="Rechercher un client" onFocus={scrollFieldIntoView} />
      ) : null}

      {receivables.length === 0 ? (
        <EmptyState done title="Rien à encaisser." />
      ) : groups.length === 0 && filtering ? (
        <EmptyState
          title="Aucune créance ne correspond"
          action={
            <Button variant="secondary" onClick={clear}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <ReceivableGroupSection
            key={group.key}
            group={group}
            onOpen={(id) => sheet.open(id)}
            onCollect={(item) => collect.show({ variant: "solde", groupKey: group.key, documentIds: [item.documentId] })}
            onCollectAll={() => collect.show({ variant: "tout", groupKey: group.key, documentIds: group.items.map((item) => item.documentId) })}
            onRelance={() => relance.show(group)}
          />
        ))
      )}

      {subject && targets.length > 0 ? (
        <CollectSheet
          key={collect.key}
          open={collect.open}
          onClose={collect.hide}
          variant={subject.variant}
          customerName={subjectGroup?.name ?? "Client de passage"}
          targets={targets}
          pockets={pockets}
        />
      ) : null}
      {relance.subject ? (
        <RelanceSheet
          key={relance.key}
          open={relance.open}
          onClose={relance.hide}
          name={relance.subject.name}
          text={relanceText(relance.subject)}
        />
      ) : null}
    </div>
  );
}

function ReceivableGroupSection({
  group,
  onOpen,
  onCollect,
  onCollectAll,
  onRelance,
}: {
  group: ReceivableGroup;
  onOpen: (documentId: string) => void;
  onCollect: (item: ReceivableDTO) => void;
  onCollectAll: () => void;
  onRelance: () => void;
}) {
  const clientHref = group.customerId ? routes.client(group.customerId) : null;
  const title =
    clientHref && isNavigable(clientHref) ? (
      <Link href={clientHref} className="admin-hit-target tap-scale rounded-[var(--admin-radius-md)]">
        {group.name}
      </Link>
    ) : (
      group.name
    );
  const totalAll = formatEur(eurFromWire(group.total));
  return (
    <ListSection
      title={title}
      amount={group.total}
      amountTone="warning"
      description={
        <span className={group.isOld ? "font-medium text-[var(--admin-danger)]" : undefined}>{ageLabel(group.ageDays)}</span>
      }
      action={
        <>
          <Button variant="text" size="sm" onClick={onRelance}>
            Relancer
          </Button>
          {group.items.length >= 2 ? (
            <Button variant="text" size="sm" onClick={onCollectAll}>
              Tout encaisser {totalAll}
            </Button>
          ) : null}
        </>
      }
    >
      {group.items.map((item) => {
        const due = eurFromWire(item.due);
        const title = receivableTitle(item);
        return (
          <SwipeableRow
            key={item.documentId}
            rightAction={{ icon: <HandCoins size={20} />, label: "Encaisser", tone: "warning", onAction: () => onCollect(item) }}
          >
            <div data-receivable={item.documentId}>
              <ListRow
                leading={
                  item.origin === "ORDER" ? (
                    <ClipboardList size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
                  ) : (
                    <ShoppingBag size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
                  )
                }
                primary={title}
                secondary={receivableCaption(item)}
                onClick={() => onOpen(item.documentId)}
                ariaLabel={`${title} · ${group.name}`}
                trailing={
                  eur.compare(due, eur.zero) > 0 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border-[var(--admin-warning-border)] font-semibold text-[var(--admin-warning)]"
                      onClick={() => onCollect(item)}
                      ariaLabel={`Encaisser ${formatEur(due)} · ${group.name}`}
                    >
                      {formatEur(due)}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          </SwipeableRow>
        );
      })}
    </ListSection>
  );
}
