"use client";

import { useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import type { DocumentSheetDTO } from "@/contracts/documents";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur, parseEurInput, toWire } from "@/domain/money";
import { cancelDocumentAction } from "@/server/documents/actions";
import { refundAction } from "@/server/payments/actions";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Switch } from "@/ui/primitives/Switch";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { Noun, customerLabel, defaultPocket, noun } from "./document-model";
import { PocketChips } from "./PocketChips";
import { useDiscardGuard } from "./useDiscardGuard";

type CancelSheetProps = {
  open: boolean;
  onClose: () => void;
  /** `cancel` : annuler le document (T5) ; `refund` : rendre de l'argent (T8). */
  mode: "cancel" | "refund";
  doc: DocumentSheetDTO;
  pockets: readonly PocketSummary[];
};

function amountError(error: ActionError | null): string | undefined {
  if (!error?.fields) return undefined;
  return Object.entries(error.fields).find(([path]) => path.endsWith("amount"))?.[1];
}

/**
 * S03 — Annuler le document / Rembourser (06 S03) : dire ce qui arrive à l'argent et au stock. Annuler : le
 * remboursement du payé net est proposé, activé par défaut, plafonné ; la réserve d'un document livré (« le stock
 * est restitué ») se confirme par le dialogue du serveur. Rembourser : plafond au payé net d'un document annulé, au
 * trop-perçu sinon. Identifiant du remboursement généré à l'ouverture : un renvoi n'écrit rien deux fois.
 */
export function CancelSheet({ open, onClose, mode, doc, pockets }: CancelSheetProps) {
  const { showToast } = useToast();
  const paid = eurFromWire(doc.balance.paid);
  const cap = mode === "cancel" || doc.status === "CANCELLED" ? eur.clampZero(paid) : eurFromWire(doc.balance.overpaid);
  const hasMoney = eur.compare(cap, eur.zero) > 0;
  const proposed = defaultPocket(pockets);

  const [refundId] = useState(newId);
  const [refund, setRefund] = useState(hasMoney);
  const [text, setText] = useState(() => (hasMoney ? amountToInputText(cap) : ""));
  const [pocketId, setPocketId] = useState<string | null>(proposed?.id ?? null);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const initialText = hasMoney ? amountToInputText(cap) : "";
  const dirty = text !== initialText || pocketId !== (proposed?.id ?? null) || refund !== hasMoney || note.trim() !== "";
  const guard = useDiscardGuard(dirty);
  const requestClose = () => void guard().then((ok) => ok && onClose());
  useShellSheet(open, requestClose);

  const amount = parseEurInput(text);
  const valid = amount !== null && eur.compare(amount, eur.zero) > 0;
  const over = amount !== null && eur.compare(amount, cap) > 0;
  const pocket = pockets.find((p) => p.id === pocketId) ?? null;
  const n = noun(doc.origin);

  const cancel = useAction(cancelDocumentAction, {
    onSuccess: (data) => {
      onClose();
      const refunded = eur.neg(eur.sum(data.refunds.map((payment) => eurFromWire(payment.amount))));
      showToast({
        type: "success",
        message: eur.compare(refunded, eur.zero) > 0 ? `${Noun(doc.origin)} annulée · ${formatEur(refunded)} remboursés` : `${Noun(doc.origin)} annulée`,
      });
    },
  });
  const giveBack = useAction(refundAction, {
    onSuccess: (data) => {
      onClose();
      showToast({ type: "success", message: `${formatEur(eur.neg(eurFromWire(data.payment.amount)))} remboursés · ${pocket?.name ?? "Non attribué"}` });
    },
  });
  const pending = cancel.pending || giveBack.pending;
  const error = cancel.error ?? giveBack.error;

  const cta = (() => {
    if (mode === "cancel") {
      if (!refund || !hasMoney) {
        return { label: `Annuler la ${n}`, tone: "danger" as const, onPress: () => void cancel.run({ documentId: doc.id }) };
      }
      if (!valid) return { label: "Saisir le montant à rembourser", tone: "danger" as const, onPress: () => inputRef.current?.focus() };
      if (over) return { label: `Ramener à ${formatEur(cap)}`, tone: "danger" as const, onPress: () => setText(amountToInputText(cap)) };
      return {
        label: `Annuler et rembourser ${formatEur(amount)}`,
        tone: "danger" as const,
        onPress: () => void cancel.run({ documentId: doc.id, refunds: [{ id: refundId, amount: toWire(amount), pocketId }] }),
      };
    }
    if (!valid) return { label: "Saisir le montant à rembourser", tone: "primary" as const, onPress: () => inputRef.current?.focus() };
    if (over) return { label: `Ramener à ${formatEur(cap)}`, tone: "primary" as const, onPress: () => setText(amountToInputText(cap)) };
    return {
      label: `Rembourser ${formatEur(amount)} · ${pocket?.name ?? "Non attribué"}`,
      tone: "primary" as const,
      onPress: () =>
        void giveBack.run({ id: refundId, documentId: doc.id, amount: toWire(amount), pocketId, note: note.trim() || undefined }),
    };
  })();

  const title = mode === "cancel" ? `Annuler la ${n}` : `Rembourser · ${customerLabel(doc)}`;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested
      dismissible={!dirty && !pending}
      title={title}
      size="auto"
    >
      <div className="flex flex-col gap-5">
        {mode === "cancel" ? (
          <Text variant="body" tone="muted">
            Le document reste consultable, marqué annulé. Les articles livrés reviennent en stock.
          </Text>
        ) : (
          <Text variant="body" tone="muted">
            {doc.status === "CANCELLED"
              ? `Payé sur cette ${n} annulée : ${formatEur(cap)}.`
              : `Trop-perçu sur cette ${n} : ${formatEur(cap)}.`}
          </Text>
        )}

        {mode === "cancel" && hasMoney ? (
          <Switch
            checked={refund}
            onCheckedChange={(checked) => setRefund(checked)}
            label={`Rembourser ${formatEur(cap)}`}
            description={refund ? "Sorti de la poche choisie, daté d'aujourd'hui." : `Les ${formatEur(paid)} encaissés restent comptés dans l'Encaissé.`}
          />
        ) : null}

        {(mode === "refund" || (refund && hasMoney)) ? (
          <>
            <FormField label="Montant remboursé" error={amountError(error)}>
              {(field) => (
                <MoneyInput
                  ref={inputRef}
                  {...field}
                  value={text}
                  onChange={(next) => setText(next)}
                  max={cap}
                  quickAmounts={[{ label: "Tout", amount: cap }]}
                  onSubmitAmount={() => cta.onPress()}
                />
              )}
            </FormField>
            <PocketChips pockets={pockets} value={pocketId} onChange={setPocketId} label="Depuis la poche" />
            {mode === "refund" ? (
              <FormField label="Note">
                {(field) => <Textarea {...field} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />}
              </FormField>
            ) : null}
          </>
        ) : null}

        {/* Sheet de saisie courte : le CTA dans le corps, sous la saisie (règle de S20 ; un pied écrasait le montant à 320 px). */}
        <Button variant={cta.tone} size="lg" fullWidth isLoading={pending} onClick={cta.onPress}>
          {cta.label}
        </Button>
      </div>
    </Sheet>
  );
}
