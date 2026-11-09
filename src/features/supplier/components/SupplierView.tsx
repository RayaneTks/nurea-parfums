"use client";

import { useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useUndo } from "@/app-shell/UndoProvider";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { SupplierDetailDebtDTO, SupplierEntryDTO, SupplierEntryRowDTO, SupplierLedgerDTO, SupplierPickerDTO } from "@/contracts/supplier";
import { dzd, dzdFromDb, formatDzd, rateFromDb, toDb, type Rate } from "@/domain/money";
import type { SupplierAllocation } from "@/domain/supplier-debt";
import { deleteSupplierEntryAction } from "@/server/supplier/actions";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { ListSection } from "@/ui/patterns/ListSection";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { DetailSheet } from "./DetailSheet";
import { supplierDetail } from "./detail-model";
import { EntrySheet, type EntryRequest } from "./EntrySheet";
import { LineSheet } from "./LineSheet";
import { PickerSheet } from "./PickerSheet";
import { RateSheet } from "./RateSheet";
import { balanceHeadline, entryAmountText, entryKindLabel, entryTitle, eurReading, groupByMonth, ledgerAllocation, rateLabel, remainingWithout, splitLedger } from "./supplier-model";

type SupplierViewProps = {
  ledger: SupplierLedgerDTO;
  /** La ligne de `?ligne=<id>`, servie par la page ; `null` : pas de sheet. */
  entry: SupplierEntryDTO | null;
  /** Le sélecteur de `?selection=1` (S25), servi par la page ; `null` : pas de sheet. */
  picker: SupplierPickerDTO | null;
  /** Les dettes qui ont encore un reste, avec leurs parfums (S27), de la plus ancienne à la plus récente. */
  detail: SupplierDetailDebtDTO[];
};

type RowProps = { row: SupplierEntryRowDTO; allocation: SupplierAllocation; onOpen: (id: string) => void };

/** Une ligne qui compte encore : une dette (avec son reste si elle est entamée) ou un versement en avance. */
function OpenRow({ row, allocation, onOpen }: RowProps) {
  const amount = dzdFromDb(row.amountDzd);
  const debt = allocation.debts.get(row.id);
  const advance = allocation.payments.get(row.id)?.unallocated;
  const started = debt !== undefined && dzd.compare(debt.paid, dzd.zero) > 0;
  const partial = advance !== undefined && dzd.compare(advance, amount) < 0;
  return (
    <ListRow
      onClick={() => onOpen(row.id)}
      primary={entryTitle(row)}
      secondary={
        <>
          {started ? `sur ${formatDzd(amount)}` : advance ? (partial ? `Avance, sur ${formatDzd(amount)}` : "Avance") : "Dette"} · <DateLabel date={row.occurredAt} />
        </>
      }
      trailing={
        <Text as="span" variant="bodyEm" tone={advance ? "success" : "default"} className="tnum">
          {started ? `Reste ${formatDzd(debt.remaining)}` : advance ? entryAmountText("PAYMENT", toDb(advance)) : entryAmountText("DEBT", row.amountDzd)}
        </Text>
      }
      chevron
    />
  );
}

/** Une ligne réglée : une dette remboursée (geste « Marquer remboursée » ou versements) ou un versement entièrement utilisé. */
function DoneRow({ row, allocation, onOpen }: RowProps) {
  const paidAt = row.settledBy?.occurredAt ?? allocation.debts.get(row.id)?.paidAt;
  return (
    <ListRow
      onClick={() => onOpen(row.id)}
      primary={entryTitle(row)}
      secondary={
        row.kind === "DEBT" && paidAt ? (
          <>
            Remboursée le <DateLabel date={paidAt} format="short" />
          </>
        ) : (
          <>
            {row.label?.trim() ? "Versement · " : null}
            <DateLabel date={row.occurredAt} format="short" />
          </>
        )
      }
      trailing={
        <Text as="span" variant="body" tone="muted" className="tnum">
          {row.kind === "DEBT" ? formatDzd(dzdFromDb(row.amountDzd)) : entryAmountText("PAYMENT", row.amountDzd)}
        </Text>
      }
      chevron
    />
  );
}

/**
 * E22 — Fournisseur (docs/admin/dettes-fournisseur.md). L'en-tête dit le Reste à payer en dinars et en
 * euros (au taux du carnet, modifiable d'un tap), puis deux gestes — « Noter une dette » (le seul bouton
 * primaire) et « Noter un versement » — et le carnet, du plus récent au plus ancien, rangé par mois.
 * Les versements paient les dettes de la plus ancienne à la plus récente. Seul ce qui compte encore s'y lit :
 * dettes avec un reste, versements avec une avance. Le reste va dans « Déjà réglé », replié par défaut.
 *
 * Aucune ligne n'est un mouvement d'argent : rien ici ne touche la Trésorerie ni la compta.
 * Une suppression se masque aussitôt (le Reste à payer suit) et s'écrit au bout des 5 s du filet « Annuler ».
 */
export function SupplierView({ ledger, entry, picker, detail }: SupplierViewProps) {
  const url = useUrlState();
  const { showToast } = useToast();
  const { scheduleDelete } = useUndo();

  const [form, setForm] = useState<EntryRequest | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  // Le taux choisi à l'instant, tant que la page n'a pas relu le sien.
  const [chosen, setChosen] = useState<{ from: string; rate: Rate } | null>(null);
  const rate = chosen && chosen.from === ledger.rate ? chosen.rate : rateFromDb(ledger.rate);

  const remaining = remainingWithout(ledger.remainingDzd, ledger.entries, hidden);
  const headline = balanceHeadline(remaining);
  const entries = ledger.entries.filter((row) => !hidden.has(row.id));
  const allocation = ledgerAllocation(entries);
  const { open, done } = splitLedger(entries, allocation);
  // Une dette dont la suppression est en cours sort aussi du détail.
  const detailView = supplierDetail(
    detail.filter((debt) => !hidden.has(debt.id)),
    allocation,
  );

  const hide = (id: string, on: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const openLine = (id: string) => url.set({ ligne: id }, { history: "push" });
  const closeLine = () => url.set({ ligne: null });
  const openPicker = () => url.set({ selection: true }, { history: "push" });
  const closePicker = () => url.set({ selection: null });

  /** Masque puis supprime au bout du filet ; une dette remboursée emporte son remboursement (cascade). */
  const schedule = (ids: readonly [string, ...string[]], message: string) => {
    const mark = (on: boolean) => ids.forEach((id) => hide(id, on));
    mark(true);
    scheduleDelete({
      message,
      onUndo: () => mark(false),
      onCommit: async () => {
        const result = await deleteSupplierEntryAction({ id: ids[0] });
        if (!result.ok) {
          mark(false);
          showToast({ type: "error", message: result.error.message });
        }
      },
    });
  };

  const remove = (target: SupplierEntryDTO) => {
    closeLine();
    const ids: [string, ...string[]] = target.settledBy ? [target.id, target.settledBy.id] : [target.id];
    schedule(ids, `${entryKindLabel(target.kind)} supprimé${target.kind === "DEBT" ? "e" : ""}`);
  };

  const payAll = headline.state === "due" ? ledger.remainingDzd : undefined;

  return (
    <>
      <Card padding={4} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1" data-supplier-header={headline.state}>
          {headline.caption ? (
            <Text variant="micro" tone="subtle" className="uppercase">
              {headline.caption}
            </Text>
          ) : null}
          <Text variant="display" className="tnum">
            {headline.amount}
          </Text>
          {headline.state !== "settled" ? (
            <Text variant="body" tone="muted" className="tnum">
              {eurReading(headline.state === "advance" ? dzd.sub(dzd.zero, remaining) : remaining, rate)}
            </Text>
          ) : null}
        </div>
        {headline.state === "due" ? (
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="admin-type-body-em admin-row-press -mx-2 -my-2 flex min-h-[44px] items-center self-start rounded-[var(--admin-radius-md)] px-2 text-[var(--admin-accent)]"
            data-supplier-detail-open
          >
            Voir le détail, parfum par parfum
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setRateOpen(true)}
          className="admin-type-caption admin-row-press -mx-2 flex min-h-[44px] items-center self-start rounded-[var(--admin-radius-md)] px-2 text-[var(--admin-accent)]"
          aria-label={`Taux du carnet : ${rateLabel(rate)}. Modifier`}
        >
          Taux : {rateLabel(rate)} · Modifier
        </button>
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" fullWidth onClick={openPicker}>
            Noter une dette
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setForm({ mode: "new", kind: "PAYMENT", suggestedDzd: payAll })}>
            Noter un versement
          </Button>
        </div>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          title="Le carnet est vide."
          description="Note ici ce que tu dois au fournisseur et ce que tu lui verses : le reste se calcule tout seul."
          action={
            <Button variant="secondary" onClick={openPicker}>
              Noter une dette
            </Button>
          }
        />
      ) : (
        <div data-supplier-ledger className="flex flex-col gap-5">
          {groupByMonth(open).map((group) => (
            <ListSection key={group.month} title={group.month}>
              {group.rows.map((row) => (
                <OpenRow key={row.id} row={row} allocation={allocation} onOpen={openLine} />
              ))}
            </ListSection>
          ))}

          {done.length > 0 ? (
            <div data-supplier-done>
              <ListSection collapsible title="Déjà réglé" count={done.length}>
                {done.map((row) => (
                  <DoneRow key={row.id} row={row} allocation={allocation} onOpen={openLine} />
                ))}
              </ListSection>
            </div>
          ) : null}
        </div>
      )}

      {picker ? (
        <PickerSheet
          data={picker}
          rate={rate}
          onClose={closePicker}
          onPicked={(picked) => setForm({ mode: "new", kind: "DEBT", picked })}
          onManual={() => setForm({ mode: "new", kind: "DEBT" })}
        />
      ) : null}

      {form ? (
        <EntrySheet
          request={form}
          rate={rate}
          onClose={() => setForm(null)}
          // Depuis le sélecteur : la dette écrite ferme les deux sheets ; « Fermer » ramène aux cases cochées.
          onSaved={() => {
            setForm(null);
            if (picker) closePicker();
          }}
          nested={form.mode === "edit" || picker !== null || entry !== null}
        />
      ) : null}

      {entry && !hidden.has(entry.id) ? (
        <LineSheet
          entry={entry}
          lines={entries}
          allocation={allocation}
          rate={rate}
          onClose={closeLine}
          onEdit={() => setForm({ mode: "edit", entry })}
          onPayRest={(remainingDzd) => setForm({ mode: "new", kind: "PAYMENT", suggestedDzd: remainingDzd })}
          onDelete={() => remove(entry)}
          onUnsettle={(paymentId) => schedule([paymentId], "Remboursement annulé")}
        />
      ) : null}

      {detailOpen && headline.state === "due" ? <DetailSheet detail={detailView} onClose={() => setDetailOpen(false)} /> : null}

      {rateOpen ? (
        <RateSheet
          rate={rate}
          remainingDzd={headline.state === "due" ? ledger.remainingDzd : null}
          onClose={() => setRateOpen(false)}
          onSaved={(saved) => setChosen({ from: ledger.rate, rate: saved })}
        />
      ) : null}
    </>
  );
}
