"use client";

import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { MonthlyJournal, PocketSummary } from "@/contracts/treasury";
import { Money } from "@/ui/patterns/Money";
import { Chip } from "@/ui/primitives/Chip";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Text } from "@/ui/primitives/Text";
import { JournalList } from "./JournalList";

/**
 * E04 — Journal (06 E04) : chips de poche (`poche`), « Net du mois » calculé sur le mois ENTIER de la poche filtrée
 * (jamais sur un sous-ensemble, 01 §4.3), mouvements groupés par jour, paires annulées repliées, « Annuler » d'un
 * mouvement manuel. Le mois est choisi par le navigateur de la page.
 */
export function JournalView({ journal, pockets, monthLabel }: { journal: MonthlyJournal; pockets: readonly PocketSummary[]; monthLabel: string }) {
  const url = useUrlState();
  const selected = journal.pocketId;
  const known = pockets.some((pocket) => pocket.id === selected);
  const archivedName = selected && !known ? (journal.entries[0]?.pocketName ?? "Poche archivée") : null;
  const pocketName = selected ? (pockets.find((pocket) => pocket.id === selected)?.name ?? archivedName) : null;

  return (
    <div className="flex flex-col gap-4" data-journal={journal.month}>
      {pockets.length > 1 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Poche">
          <Chip active={selected === null} onClick={() => selected !== null && url.set({ poche: null })}>
            Toutes
          </Chip>
          {pockets.map((pocket) => (
            <Chip key={pocket.id} active={pocket.id === selected} onClick={() => pocket.id !== selected && url.set({ poche: pocket.id })}>
              {pocket.name}
            </Chip>
          ))}
          {archivedName ? (
            <Chip active clearable onClick={() => url.set({ poche: null })}>
              {archivedName}
            </Chip>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3" data-net-du-mois>
        <Text variant="bodyEm">Net du mois</Text>
        <Money value={journal.net} signed bold className="admin-type-h2" />
      </div>

      {journal.entries.length === 0 ? (
        <EmptyState done title={pocketName ? `Aucun mouvement ${pocketName === "Non attribué" ? "non attribué" : `dans ${pocketName}`} en ${monthLabel}.` : `Aucun mouvement en ${monthLabel}.`} />
      ) : (
        <JournalList entries={journal.entries} grouping="day" showPocket={selected === null} />
      )}
    </div>
  );
}
