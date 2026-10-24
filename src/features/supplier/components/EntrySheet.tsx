"use client";

import { useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionError } from "@/contracts/result";
import type { SupplierEntrySummary } from "@/contracts/supplier";
import { newId } from "@/domain/ids";
import { dzd, formatDzd, parseDzdInput, type Rate } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { useDiscardGuard } from "@/features/documents/components/useDiscardGuard";
import { recordSupplierEntryAction, updateSupplierEntryAction } from "@/server/supplier/actions";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Sheet } from "@/ui/primitives/Sheet";
import { Textarea } from "@/ui/primitives/Textarea";
import { dzdInputText, entryKindLabel, eurReading } from "./supplier-model";

/** Ce que la sheet fait : noter une dette (S23), un versement (S24), ou corriger une ligne (S22 → « Modifier »). */
export type EntryRequest =
  | { mode: "new"; kind: "DEBT" | "PAYMENT"; suggestedDzd?: string }
  | { mode: "edit"; entry: SupplierEntrySummary };

type EntrySheetProps = {
  request: EntryRequest;
  rate: Rate;
  onClose: () => void;
  /** Ouverte depuis la sheet d'une ligne. */
  nested?: boolean;
};

function fieldError(error: ActionError | null, field: string): string | undefined {
  return error?.fields?.[field];
}

/**
 * S23 Dette à la main, S24 Versement, et la correction d'une ligne : un seul formulaire. Le montant est en
 * dinars, l'euro se lit en direct au taux du carnet. Le versement propose le Reste à payer (payer tout en
 * un geste), mais le gérant paie souvent une partie : le champ reste libre. Un identifiant par ouverture :
 * « Réessayer » n'écrit jamais deux fois (04 §3.6).
 */
export function EntrySheet({ request, rate, onClose, nested = false }: EntrySheetProps) {
  const editing = request.mode === "edit" ? request.entry : null;
  const kind = editing ? editing.kind : request.mode === "new" ? request.kind : "DEBT";
  const today = parisDayKey();

  const initial = {
    amount: editing ? dzdInputText(editing.amountDzd) : request.mode === "new" && request.suggestedDzd ? dzdInputText(request.suggestedDzd) : "",
    label: editing?.label ?? "",
    note: editing?.note ?? "",
    day: editing ? parisDayKey(new Date(editing.occurredAt)) : today,
  };

  const [id] = useState(newId);
  const [amount, setAmount] = useState(initial.amount);
  const [label, setLabel] = useState(initial.label);
  const [note, setNote] = useState(initial.note);
  const [day, setDay] = useState(initial.day);
  const amountRef = useRef<HTMLInputElement>(null);

  const dirty = amount !== initial.amount || label !== initial.label || note !== initial.note || day !== initial.day;
  const guard = useDiscardGuard(dirty);
  const requestClose = () => {
    void guard().then((ok) => ok && onClose());
  };
  useShellSheet(true, requestClose);

  const parsed = parseDzdInput(amount);
  const valid = parsed !== null && dzd.compare(parsed, dzd.zero) > 0;

  const record = useAction(recordSupplierEntryAction, {
    success: kind === "DEBT" ? "Dette notée" : "Versement noté",
    onSuccess: onClose,
  });
  const update = useAction(updateSupplierEntryAction, { success: "Ligne corrigée", onSuccess: onClose });
  const pending = record.pending || update.pending;
  const error = editing ? update.error : record.error;

  /** Une date inchangée n'est pas envoyée : « maintenant » pour une ligne neuve, l'heure d'origine pour une correction. */
  const occurredAt = day === initial.day ? undefined : parseParisDayKey(day)?.toISOString();

  const submit = () => {
    if (!valid) {
      amountRef.current?.focus();
      return;
    }
    if (editing) {
      void update.run({ id: editing.id, amountDzd: amount, label, note, occurredAt });
    } else {
      void record.run({ id, kind, amountDzd: amount, label: label || undefined, note: note || undefined, occurredAt });
    }
  };

  const title = editing ? `Corriger ${editing.kind === "DEBT" ? "la dette" : "le versement"}` : kind === "DEBT" ? "Noter une dette" : "Noter un versement";
  const cta = !valid
    ? "Saisir le montant"
    : editing
      ? "Enregistrer"
      : `Noter ${kind === "DEBT" ? "la dette" : "le versement"} de ${formatDzd(parsed)}`;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested={nested}
      dismissible={!dirty && !pending}
      title={title}
      description={editing ? "Le sens (dette ou versement) ne change pas." : undefined}
      footer={
        <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submit} data-supplier-cta>
          {cta}
        </Button>
      }
    >
      <div className="flex flex-col gap-5" data-supplier-form={editing ? "edit" : kind}>
        <FormField
          label="Montant en dinars"
          required
          error={fieldError(error, "amountDzd")}
          hint={valid ? eurReading(parsed, rate) : undefined}
        >
          {(field) => (
            <Input
              ref={amountRef}
              {...field}
              inputMode="decimal"
              numeric
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="92 700"
              trailingSlot={<span className="admin-type-body text-[var(--admin-text-muted)]">DA</span>}
              enterKeyHint="next"
            />
          )}
        </FormField>

        <FormField label="Nom" hint={kind === "DEBT" ? "Ex. Lot d'octobre, Transport." : "Ex. Virement, en main propre."} error={fieldError(error, "label")}>
          {(field) => <Input {...field} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} enterKeyHint="next" />}
        </FormField>

        <FormField label="Date" error={fieldError(error, "occurredAt")}>
          {(field) => <Input {...field} type="date" max={today} value={day} onChange={(event) => setDay(event.target.value || today)} />}
        </FormField>

        <FormField label="Note" error={fieldError(error, "note")}>
          {(field) => <Textarea {...field} rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />}
        </FormField>

        {kind === "PAYMENT" && !editing ? (
          <p className="admin-type-caption text-[var(--admin-text-muted)]">
            Ce {entryKindLabel(kind).toLowerCase()} est noté dans le carnet seulement : il ne sort rien de la Trésorerie.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
