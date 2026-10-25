"use client";

import { useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useUndo } from "@/app-shell/UndoProvider";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { SupplierEntryDTO, SupplierLedgerDTO, SupplierPickerDTO } from "@/contracts/supplier";
import { dzd, dzdFromDb, rateFromDb, type Rate } from "@/domain/money";
import { deleteSupplierEntryAction } from "@/server/supplier/actions";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { EntrySheet, type EntryRequest } from "./EntrySheet";
import { LineSheet } from "./LineSheet";
import { PickerSheet } from "./PickerSheet";
import { RateSheet } from "./RateSheet";
import { balanceHeadline, entryAmountText, entryCaption, entryKindLabel, entryTitle, eurReading, rateLabel, remainingWithout } from "./supplier-model";

type SupplierViewProps = {
  ledger: SupplierLedgerDTO;
  /** La ligne de `?ligne=<id>`, servie par la page ; `null` : pas de sheet. */
  entry: SupplierEntryDTO | null;
  /** Le sélecteur de `?selection=1` (S25), servi par la page ; `null` : pas de sheet. */
  picker: SupplierPickerDTO | null;
};

/**
 * E22 — Fournisseur (docs/admin/dettes-fournisseur.md). L'en-tête dit le Reste à payer en dinars et en
 * euros (au taux du carnet, modifiable d'un tap), puis deux gestes — « Noter une dette » (le seul bouton
 * primaire) et « Noter un versement » — et le carnet, du plus récent au plus ancien.
 *
 * Aucune ligne n'est un mouvement d'argent : rien ici ne touche la Trésorerie ni la compta.
 * Une suppression se masque aussitôt (le Reste à payer suit) et s'écrit au bout des 5 s du filet « Annuler ».
 */
export function SupplierView({ ledger, entry, picker }: SupplierViewProps) {
  const url = useUrlState();
  const { showToast } = useToast();
  const { scheduleDelete } = useUndo();

  const [form, setForm] = useState<EntryRequest | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  // Le taux choisi à l'instant, tant que la page n'a pas relu le sien.
  const [chosen, setChosen] = useState<{ from: string; rate: Rate } | null>(null);
  const rate = chosen && chosen.from === ledger.rate ? chosen.rate : rateFromDb(ledger.rate);

  const remaining = remainingWithout(ledger.remainingDzd, ledger.entries, hidden);
  const headline = balanceHeadline(remaining);
  const entries = ledger.entries.filter((row) => !hidden.has(row.id));

  const hide = (id: string, on: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

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
        <div data-supplier-ledger>
          <Card padding={0}>
            {entries.map((row) => {
              const amount = dzdFromDb(row.amountDzd);
              return (
                <ListRow
                  key={row.id}
                  onClick={() => url.set({ ligne: row.id }, { history: "push" })}
                  primary={entryTitle(row)}
                  secondary={
                    <>
                      {entryCaption(row)} · <DateLabel date={row.occurredAt} />
                    </>
                  }
                  trailing={
                    <span className="flex flex-col items-end">
                      <Text as="span" variant="bodyEm" tone={row.kind === "PAYMENT" ? "success" : "default"} className="tnum">
                        {entryAmountText(row.kind, row.amountDzd)}
                      </Text>
                      <Text as="span" variant="caption" tone="muted" className="tnum">
                        {eurReading(amount, rate)}
                      </Text>
                    </span>
                  }
                  chevron
                />
              );
            })}
          </Card>
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
          nested={form.mode === "edit" || picker !== null}
        />
      ) : null}

      {entry && !hidden.has(entry.id) ? (
        <LineSheet
          entry={entry}
          rate={rate}
          onClose={closeLine}
          onEdit={() => setForm({ mode: "edit", entry })}
          onDelete={() => remove(entry)}
          onUnsettle={(paymentId) => schedule([paymentId], "Remboursement annulé")}
        />
      ) : null}

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
