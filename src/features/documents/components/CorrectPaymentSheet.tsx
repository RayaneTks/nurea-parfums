"use client";

import { useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import type { DocumentPaymentDTO } from "@/contracts/documents";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { eur, formatEur, parseEurInput, toWire } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { correctPaymentAction } from "@/server/payments/actions";
import { FormField } from "@/ui/patterns/FormField";
import { formatDate } from "@/ui/patterns/date-format";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { paymentMagnitude } from "./document-model";
import { PocketChips } from "./PocketChips";
import { useDiscardGuard } from "./useDiscardGuard";

type CorrectPaymentSheetProps = {
  open: boolean;
  onClose: () => void;
  payment: DocumentPaymentDTO;
  /** « Acompte », « Solde », « Paiement », « Remboursement ». */
  label: string;
  pockets: readonly PocketSummary[];
};

const METHODS = ["Espèces", "Virement", "Carte", "Autre"] as const;

function fieldError(error: ActionError | null, suffix: string): string | undefined {
  if (!error?.fields) return undefined;
  return Object.entries(error.fields).find(([path]) => path.endsWith(suffix))?.[1];
}

/**
 * S04 — Corriger un paiement (06 S04) : l'ancien paiement est annulé à sa date et remplacé, en une transaction ;
 * seuls le moyen ou la note : la pièce est modifiée en place. Le CTA nomme ce qui change (« Corriger : 50 € au
 * lieu de 80 € ») ; rien ne change : « Aucune modification ».
 */
export function CorrectPaymentSheet({ open, onClose, payment, label, pockets }: CorrectPaymentSheetProps) {
  const { showToast } = useToast();
  const original = paymentMagnitude(payment);
  const originalDay = parisDayKey(new Date(payment.occurredAt));
  const [newPaymentId] = useState(newId);
  const [text, setText] = useState(() => amountToInputText(original));
  const [pocketId, setPocketId] = useState<string | null>(payment.pocketId);
  const [day, setDay] = useState(originalDay);
  const [method, setMethod] = useState<string | null>(payment.method);
  const [note, setNote] = useState(payment.note ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const amount = parseEurInput(text);
  const amountChanged = amount !== null && eur.compare(amount, original) !== 0;
  const pocketChanged = pocketId !== payment.pocketId;
  const dayChanged = day !== originalDay;
  const detailsChanged = (method ?? null) !== (payment.method ?? null) || note.trim() !== (payment.note ?? "");
  const dirty = text !== amountToInputText(original) || pocketChanged || dayChanged || detailsChanged;
  const guard = useDiscardGuard(dirty);
  const requestClose = () => void guard().then((ok) => ok && onClose());
  useShellSheet(open, requestClose);

  const pocketName = (id: string | null) => pockets.find((p) => p.id === id)?.name ?? "Non attribué";
  const correct = useAction(correctPaymentAction, {
    onSuccess: () => {
      onClose();
      showToast({ type: "success", message: `${label} corrigé` });
    },
  });

  const cta = (() => {
    if (amount === null || eur.compare(amount, eur.zero) <= 0) {
      return { label: "Saisir le montant", disabled: false, onPress: () => inputRef.current?.focus() };
    }
    const changes: string[] = [];
    if (amountChanged) changes.push(`${formatEur(amount)} au lieu de ${formatEur(original)}`);
    if (pocketChanged) changes.push(`${pocketName(pocketId)} au lieu de ${pocketName(payment.pocketId)}`);
    if (dayChanged) {
      const chosen = parseParisDayKey(day);
      if (chosen) changes.push(`le ${formatDate(chosen, "short")} au lieu du ${formatDate(new Date(payment.occurredAt), "short")}`);
    }
    if (changes.length === 0 && !detailsChanged) return { label: "Aucune modification", disabled: true, onPress: () => undefined };
    const text = changes.length > 0 ? `Corriger : ${changes.join(", ")}` : "Enregistrer le moyen et la note";
    return {
      label: text,
      disabled: false,
      onPress: () =>
        void correct.run({
          paymentId: payment.id,
          newPaymentId,
          amount: toWire(amount),
          ...(pocketChanged ? { pocketId } : {}),
          ...(dayChanged ? { occurredAt: parseParisDayKey(day)?.toISOString() } : {}),
          method: method ?? null,
          note: note.trim() || null,
        }),
    };
  })();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested
      dismissible={!dirty && !correct.pending}
      title={`Corriger · ${label}`}
      // Le titre nomme déjà le paiement : une ligne, même à 320 px.
      description={`${formatDate(new Date(payment.occurredAt), "short")} · ${formatEur(original)} · ${payment.pocketName}`}
      size="auto"
    >
      <div className="flex flex-col gap-5">
        <Text variant="body" tone="muted">
          L&apos;ancien paiement sera annulé à sa date et remplacé par celui-ci.
        </Text>
        <FormField label="Montant" error={fieldError(correct.error, "amount")}>
          {(field) => <MoneyInput ref={inputRef} {...field} value={text} onChange={(next) => setText(next)} onSubmitAmount={() => cta.onPress()} />}
        </FormField>
        <FormField label="Date du paiement" error={fieldError(correct.error, "occurredAt")}>
          {(field) => <Input {...field} type="date" max={parisDayKey()} value={day} onChange={(e) => setDay(e.target.value)} />}
        </FormField>
        <PocketChips pockets={pockets} value={pocketId} onChange={setPocketId} />
        <div className="flex flex-col gap-2" role="group" aria-label="Moyen">
          <Text variant="caption" tone="muted" className="font-semibold">
            Moyen
          </Text>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <Chip key={m} active={method === m} onClick={() => setMethod(method === m ? null : m)}>
                {m}
              </Chip>
            ))}
          </div>
        </div>
        <FormField label="Note">
          {(field) => <Textarea {...field} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />}
        </FormField>
        {/* Sheet de saisie courte : le CTA dans le corps, après la saisie (règle de S20 ; un pied écrasait le montant à 320 px). */}
        <Button variant="primary" size="lg" fullWidth isLoading={correct.pending} disabled={cta.disabled} onClick={cta.onPress}>
          {cta.label}
        </Button>
      </div>
    </Sheet>
  );
}
