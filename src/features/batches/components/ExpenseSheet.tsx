"use client";

import { useRef, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { BatchExpenseRowDTO } from "@/contracts/batches";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur, parseEurInput, toWire } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { addBatchExpenseAction, updateBatchExpenseAction } from "@/server/batches/actions";
import { PocketChips } from "@/features/documents/components/PocketChips";
import { useDiscardGuard } from "@/features/documents/components/useDiscardGuard";
import { defaultPocket } from "@/features/documents/components/document-model";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { formatDate } from "@/ui/patterns/date-format";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { expenseCta } from "./batches-model";

type ExpenseSheetProps = {
  open: boolean;
  onClose: () => void;
  batchId: string;
  /** Rappelé dans le titre quand la sheet s'ouvre ailleurs que sur la fiche du lot (06 S12). */
  batchName: string;
  /** Titre court : la fiche du lot nomme déjà le lot. */
  standalone?: boolean;
  /** Libellés déjà saisis, ceux du lot d'abord (A10). */
  labels: readonly string[];
  pockets: readonly PocketSummary[];
  /** Renseignée : mode modification (libellé et notes seuls). */
  expense?: BatchExpenseRowDTO;
  nested?: boolean;
};

function fieldError(error: ActionError | null, name: string): string | undefined {
  return error?.fields?.[name];
}

/**
 * La veille du jour de Paris donné. Dérivée du jour déjà lu, jamais d'un second appel à l'horloge : le
 * rendu reste pur, et « Hier » ne peut pas désigner un autre jour que la veille d'« Aujourd'hui ».
 * Minuit de Paris moins 12 h tombe toujours dans la journée précédente, changement d'heure compris.
 */
function yesterdayOf(dayKey: string): string {
  const midnight = parseParisDayKey(dayKey);
  return midnight ? parisDayKey(new Date(midnight.getTime() - 12 * 60 * 60 * 1000)) : dayKey;
}

/**
 * S12 — Dépense de lot (06 S12). Une dépense datée en 3 taps et un montant : un chip de libellé, le
 * montant au clavier décimal, le CTA. La date vaut « Aujourd'hui » sans qu'on la touche, et la poche
 * est celle que l'app propose (N2) — ce sont les deux valeurs justes neuf fois sur dix.
 *
 * Le CTA nomme ce qu'il va écrire (« Ajouter 45 € · Banque ») : on ne valide pas un formulaire, on
 * confirme une phrase.
 *
 * En modification, montant, date et poche sont en LECTURE SEULE avec le chemin pour les changer. Le
 * trigger `batch_expense_append_only` les refuse de toute façon : mieux vaut le dire que le subir —
 * l'ancienne app laissait saisir puis échouait (01 §4.4).
 */
export function ExpenseSheet({
  open,
  onClose,
  batchId,
  batchName,
  standalone = false,
  labels,
  pockets,
  expense,
  nested = false,
}: ExpenseSheetProps) {
  const { showToast } = useToast();
  const editing = expense !== undefined;
  const today = parisDayKey();

  const [id] = useState(newId);
  const [label, setLabel] = useState(expense?.label ?? "");
  const [text, setText] = useState("");
  const [day, setDay] = useState(today);
  const [pickingDay, setPickingDay] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(() => defaultPocket(pockets)?.id ?? null);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const amountRef = useRef<HTMLInputElement>(null);

  const amount = parseEurInput(text);
  const dirty = editing
    ? label.trim() !== expense.label || notes.trim() !== (expense.notes ?? "")
    : label.trim() !== "" || text.trim() !== "" || notes.trim() !== "" || day !== today;
  const guard = useDiscardGuard(dirty);
  const requestClose = () => void guard().then((ok) => ok && onClose());
  useShellSheet(open, requestClose);

  const add = useAction(addBatchExpenseAction, {
    onSuccess: (created) => {
      onClose();
      // Hors de la fiche du lot, rien à l'écran ne montre le résultat : le toast dit le montant ET le lot.
      showToast({
        type: "success",
        message: standalone
          ? `${formatEur(eurFromWire(created.amount))} de dépense · ${batchName}`
          : `Dépense ajoutée · ${created.label}`,
      });
    },
  });
  const save = useAction(updateBatchExpenseAction, {
    onSuccess: () => {
      onClose();
      showToast({ type: "success", message: "Dépense modifiée" });
    },
  });

  const pocketName = pockets.find((pocket) => pocket.id === pocketId)?.name ?? null;
  const pending = add.pending || save.pending;
  const error = editing ? save.error : add.error;

  const submit = () => {
    if (editing) {
      void save.run({ id: expense.id, label: label.trim(), notes: notes.trim() || null });
      return;
    }
    if (amount === null || eur.compare(amount, eur.zero) <= 0) {
      amountRef.current?.focus();
      return;
    }
    void add.run({
      id,
      batchId,
      label: label.trim(),
      amount: toWire(amount),
      pocketId,
      occurredAt: parseParisDayKey(day)?.toISOString() ?? null,
      notes: notes.trim() || null,
    });
  };

  const cta = editing
    ? dirty
      ? "Enregistrer"
      : "Aucune modification"
    : expenseCta(amount && eur.compare(amount, eur.zero) > 0 ? formatEur(amount) : null, pocketName);

  const dayChips: { key: string; label: string; value: string }[] = [
    { key: "today", label: "Aujourd'hui", value: today },
    { key: "yesterday", label: "Hier", value: yesterdayOf(today) },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested={nested}
      dismissible={!dirty && !pending}
      title={editing ? `Modifier · ${expense.label}` : standalone ? `Dépense · ${batchName}` : "Ajouter une dépense"}
      description={
        editing
          ? `${formatEur(eurFromWire(expense.amount))} · ${formatDate(new Date(expense.occurredAt), "short")} · ${expense.pocketName}`
          : undefined
      }
      size="auto"
    >
      <div className="flex flex-col gap-5" data-expense-sheet>
        {labels.length > 0 && !editing ? (
          <div className="flex flex-col gap-2" role="group" aria-label="Libellés déjà saisis">
            <div className="-mx-1 flex flex-wrap gap-2 px-1">
              {labels.map((known) => (
                <Chip key={known} active={label.trim() === known} onClick={() => setLabel(known)}>
                  {known}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <FormField label="Libellé" required error={fieldError(error, "label")}>
          {(field) => (
            <Input
              {...field}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Transport, Douane…"
              autoComplete="off"
              enterKeyHint="next"
            />
          )}
        </FormField>

        {editing ? (
          <Text variant="caption" tone="muted">
            Pour changer le montant, la date ou la poche, supprime la dépense puis saisis-la à nouveau.
          </Text>
        ) : (
          <>
            <FormField label="Montant" required error={fieldError(error, "amount")}>
              {(field) => (
                <MoneyInput ref={amountRef} {...field} value={text} onChange={(next) => setText(next)} onSubmitAmount={submit} />
              )}
            </FormField>

            <div className="flex flex-col gap-2" role="group" aria-label="Date de la dépense">
              <Text variant="caption" tone="muted" className="font-semibold">
                Date
              </Text>
              <div className="flex flex-wrap gap-2">
                {dayChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    active={!pickingDay && day === chip.value}
                    onClick={() => {
                      setPickingDay(false);
                      setDay(chip.value);
                    }}
                  >
                    {chip.label}
                  </Chip>
                ))}
                <Chip active={pickingDay} onClick={() => setPickingDay(true)}>
                  Choisir…
                </Chip>
              </div>
              {pickingDay ? (
                <FormField label="Date de la dépense" error={fieldError(error, "occurredAt")}>
                  {(field) => <Input {...field} type="date" max={today} value={day} onChange={(e) => setDay(e.target.value)} />}
                </FormField>
              ) : null}
            </div>

            <PocketChips pockets={pockets} value={pocketId} onChange={setPocketId} />
          </>
        )}

        <CollapsibleSection title="Notes" bare defaultOpen={Boolean(expense?.notes)}>
          <FormField label="Notes" error={fieldError(error, "notes")}>
            {(field) => <Textarea {...field} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />}
          </FormField>
        </CollapsibleSection>

        {/* Sheet de saisie courte : le CTA dans le corps, après la saisie (règle de S04/S20). */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={pending}
          disabled={editing && !dirty}
          onClick={submit}
        >
          {cta}
        </Button>
      </div>
    </Sheet>
  );
}
