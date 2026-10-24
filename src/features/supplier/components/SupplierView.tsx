"use client";

import { useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useUndo } from "@/app-shell/UndoProvider";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { SupplierEntryDTO, SupplierLedgerDTO } from "@/contracts/supplier";
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
import { RateSheet } from "./RateSheet";
import { balanceHeadline, entryAmountText, entryKindLabel, entryTitle, eurReading, rateLabel, remainingWithout } from "./supplier-model";

type SupplierViewProps = {
  ledger: SupplierLedgerDTO;
  /** La ligne de `?ligne=<id>`, servie par la page ; `null` : pas de sheet. */
  entry: SupplierEntryDTO | null;
};

/**
 * E22 — Fournisseur (docs/admin/dettes-fournisseur.md). L'en-tête dit le Reste à payer en dinars et en
 * euros (au taux du carnet, modifiable d'un tap), puis deux gestes — « Noter une dette » (le seul bouton
 * primaire) et « Noter un versement » — et le carnet, du plus récent au plus ancien.
 *
 * Aucune ligne n'est un mouvement d'argent : rien ici ne touche la Trésorerie ni la compta.
 * Une suppression se masque aussitôt (le Reste à payer suit) et s'écrit au bout des 5 s du filet « Annuler ».
 */
export function SupplierView({ ledger, entry }: SupplierViewProps) {
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

  const remove = (target: SupplierEntryDTO) => {
    hide(target.id, true);
    closeLine();
    scheduleDelete({
      message: `${entryKindLabel(target.kind)} supprimé${target.kind === "DEBT" ? "e" : ""}`,
      onUndo: () => hide(target.id, false),
      onCommit: async () => {
        const result = await deleteSupplierEntryAction({ id: target.id });
        if (!result.ok) {
          hide(target.id, false);
          showToast({ type: "error", message: result.error.message });
        }
      },
    });
  };

  const payAll = headline.state === "due" ? ledger.remainingDzd : undefined;

  return (
    <>
      <Card padding={4} className="flex flex-col gap-4" data-supplier-header={headline.state}>
        <div className="flex flex-col gap-1">
          {headline.caption ? (
            <Text variant="micro" tone="subtle" className="uppercase">
              {headline.caption}
            </Text>
          ) : null}
          <Text variant="display" className="tnum" data-supplier-remaining>
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
          <Button variant="primary" size="lg" fullWidth onClick={() => setForm({ mode: "new", kind: "DEBT" })}>
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
            <Button variant="secondary" onClick={() => setForm({ mode: "new", kind: "DEBT" })}>
              Noter une dette
            </Button>
          }
        />
      ) : (
        <Card padding={0} data-supplier-ledger>
          {entries.map((row) => {
            const amount = dzdFromDb(row.amountDzd);
            return (
              <ListRow
                key={row.id}
                onClick={() => url.set({ ligne: row.id }, { history: "push" })}
                primary={entryTitle(row)}
                secondary={
                  <>
                    {entryKindLabel(row.kind)} · <DateLabel date={row.occurredAt} />
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
      )}

      {form ? <EntrySheet request={form} rate={rate} onClose={() => setForm(null)} nested={form.mode === "edit"} /> : null}

      {entry && !hidden.has(entry.id) ? (
        <LineSheet
          entry={entry}
          rate={rate}
          onClose={closeLine}
          onEdit={() => setForm({ mode: "edit", entry })}
          onDelete={() => remove(entry)}
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
