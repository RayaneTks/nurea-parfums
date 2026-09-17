"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur, halfForCash, parseEurInput, toWire, type Eur } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { changeDocumentStatusAction, deliverAndCollectAction } from "@/server/documents/actions";
import { collectAllAction, recordPaymentAction } from "@/server/payments/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { allocate, defaultPocket, methodForPocket, type CollectTarget } from "./document-model";
import { PocketChips } from "./PocketChips";
import { useDiscardGuard } from "./useDiscardGuard";
import { useGestureToast } from "./useGestureToast";

/** S02 — les quatre variantes (06 S02). */
export type CollectVariant = "acompte" | "solde" | "livrer" | "tout";

export type { CollectTarget };

type CollectSheetProps = {
  open: boolean;
  /** Fermeture demandée (après la garde de saisie) ou après succès. */
  onClose: () => void;
  variant: CollectVariant;
  customerName: string;
  /** Un document ; « Tout encaisser » : ceux du client, du plus ancien au plus récent. */
  targets: readonly CollectTarget[];
  pockets: readonly PocketSummary[];
  /** Ouverte depuis la fiche document. */
  nested?: boolean;
  /**
   * Refus de validation porté par une ligne reprise hors règles (`lines.<id>.volumeMl`, 03 §4.3) : l'appelant
   * ouvre la fiche en édition sur la ligne.
   */
  onValidation?: (error: ActionError) => void;
};

const METHODS = ["Espèces", "Virement", "Carte", "Autre"] as const;
const BANKNOTES = [20, 50, 100] as const;

type DateChoice = "today" | "yesterday" | "custom";

const TITLES: Record<CollectVariant, string> = {
  acompte: "Acompte",
  solde: "Encaisser",
  livrer: "Livrer",
  tout: "Tout encaisser",
};

const sumDue = (targets: readonly CollectTarget[]): Eur => eur.sum(targets.map((target) => eurFromWire(target.due)));

function occurredAtOf(choice: DateChoice, customDay: string): string | undefined {
  if (choice === "today") return undefined;
  const key = choice === "yesterday" ? parisDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000)) : customDay;
  return parseParisDayKey(key)?.toISOString();
}

function fieldError(error: ActionError | null, suffix: string): string | undefined {
  if (!error?.fields) return undefined;
  const entry = Object.entries(error.fields).find(([path]) => path === suffix || path.endsWith(`.${suffix}`));
  return entry?.[1];
}

/**
 * S02 — Encaisser (06 S02) : montant et poche pré-remplis, plafond au dû, CTA qui dit l'effet complet
 * (« Encaisser 80 € · Espèces ») ou ce qui manque. Identifiant de paiement généré à l'ouverture et gardé jusqu'au
 * succès : « Réessayer » après coupure n'écrit jamais deux fois (04 §3.6). Succès : la sheet se ferme, toast avec
 * « Annuler » (T4b).
 */
export function CollectSheet({ open, onClose, variant, customerName, targets, pockets, nested = false, onValidation }: CollectSheetProps) {
  const router = useRouter();
  const announce = useGestureToast();
  const target = targets[0];
  const max = variant === "tout" ? sumDue(targets) : target ? eurFromWire(target.due) : eur.zero;
  const initialText = variant === "acompte" ? "" : amountToInputText(max);
  const proposed = defaultPocket(pockets);

  // Identifiants de la saisie : un par document, stables jusqu'au succès.
  const [ids] = useState(() => new Map(targets.map((t) => [t.id, newId()])));
  const idOf = (documentId: string) => {
    let id = ids.get(documentId);
    if (!id) {
      id = newId();
      ids.set(documentId, id);
    }
    return id;
  };

  const [text, setText] = useState(initialText);
  const [pocketId, setPocketId] = useState<string | null>(proposed?.id ?? null);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [customDay, setCustomDay] = useState(() => parisDayKey());
  const [method, setMethod] = useState<string | null>(methodForPocket(proposed));
  const [methodTouched, setMethodTouched] = useState(false);
  const [note, setNote] = useState("");
  const [given, setGiven] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pocket = pockets.find((p) => p.id === pocketId) ?? null;
  const amount = parseEurInput(text);
  const valid = amount !== null && eur.compare(amount, eur.zero) > 0;
  const over = valid && eur.compare(amount, max) > 0;
  const dirty =
    text !== initialText || pocketId !== (proposed?.id ?? null) || dateChoice !== "today" || methodTouched || note.trim() !== "";
  const guard = useDiscardGuard(dirty);

  // Le dû a changé entre-temps (refus du serveur, écran rafraîchi) : le montant est recalé au nouveau plafond.
  const maxWire = toWire(max);
  useEffect(() => {
    const current = parseEurInput(text);
    if (current !== null && eur.compare(current, eurFromWire(maxWire)) > 0 && variant !== "acompte") {
      setText(amountToInputText(eurFromWire(maxWire)));
    }
    // Seul un changement de plafond recale : la frappe au-delà reste visible (« 80 € au maximum »).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxWire]);

  const requestClose = () => {
    void guard().then((ok) => {
      if (ok) onClose();
    });
  };
  useShellSheet(open, requestClose);

  const pocketLabel = pocket?.name ?? "Non attribué";
  const occurredAt = occurredAtOf(dateChoice, customDay);
  const details = { method: method ?? undefined, note: note.trim() || undefined, occurredAt };
  const onError = (error: ActionError) => {
    if (error.code === "CONFLICT") router.refresh();
    if (error.code === "VALIDATION" && Object.keys(error.fields ?? {}).some((path) => path.startsWith("lines."))) onValidation?.(error);
  };

  const single = useAction(recordPaymentAction, {
    onSuccess: (data) => {
      onClose();
      announce(`${formatEur(eurFromWire(data.payment.amount))} encaissés · ${pocketLabel}`, data.undo, "Encaissement annulé.");
    },
  });
  const deliver = useAction(deliverAndCollectAction, {
    onSuccess: (data) => {
      onClose();
      announce(`Livrée · ${formatEur(eurFromWire(data.payment.amount))} encaissés`, data.undo, "Livraison et encaissement annulés.");
    },
  });
  const deliverOnly = useAction(changeDocumentStatusAction, {
    onSuccess: (data) => {
      onClose();
      announce(`Commande de ${customerName} livrée`, data.undo, "Livraison annulée.");
    },
  });
  const all = useAction(collectAllAction, {
    onSuccess: (data) => {
      onClose();
      const received = eur.sum(data.payments.map((payment) => eurFromWire(payment.amount)));
      announce(`${formatEur(received)} encaissés · ${pocketLabel}`, data.undo, "Encaissements annulés.");
    },
  });
  const pending = single.pending || deliver.pending || deliverOnly.pending || all.pending;
  const error = single.error ?? deliver.error ?? deliverOnly.error ?? all.error;

  const allocations = useMemo(() => (variant === "tout" ? allocate(targets, valid && !over ? amount : null) : []), [variant, targets, valid, over, amount]);

  const submit = async () => {
    if (!valid || over || amount === null || !target) return;
    const value = toWire(amount);
    let result;
    if (variant === "tout") {
      result = await all.run({
        pocketId,
        ...details,
        payments: allocations.map(({ target: t, amount: part }) => ({ id: idOf(t.id), documentId: t.id, amount: toWire(part) })),
      });
    } else if (variant === "livrer") {
      result = await deliver.run({ documentId: target.id, payment: { id: idOf(target.id), amount: value, pocketId, ...details } });
    } else {
      result = await single.run({ id: idOf(target.id), documentId: target.id, amount: value, pocketId, ...details });
    }
    if (!result.ok) onError(result.error);
  };

  const cta = (() => {
    if (!valid) return { label: "Saisir le montant", onPress: () => inputRef.current?.focus() };
    if (over) return { label: `Ramener à ${formatEur(max)}`, onPress: () => setText(amountToInputText(max)) };
    const shown = formatEur(amount);
    if (variant === "livrer") return { label: `Encaisser ${shown} et livrer`, onPress: () => void submit() };
    return { label: `Encaisser ${shown} · ${pocketLabel}`, onPress: () => void submit() };
  })();

  const quickAmounts =
    variant === "tout"
      ? []
      : variant === "acompte"
        ? [
            { label: "La moitié", amount: halfForCash(max) },
            { label: "Tout", amount: max },
          ]
        : [
            { label: "Tout", amount: max },
            { label: "La moitié", amount: halfForCash(max) },
          ];

  const change = pocket?.kind === "CASH" && given !== null && valid && !over ? eur.sub(parseEurInput(String(given)) ?? eur.zero, amount) : null;

  const dateSummary = dateChoice === "today" ? "Aujourd'hui" : dateChoice === "yesterday" ? "Hier" : customDay;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested={nested}
      dismissible={!dirty && !pending}
      title={`${TITLES[variant]} · ${customerName}`}
      size="auto"
    >
      <div className="flex flex-col gap-5">
        {variant === "tout" ? (
          <div className="flex flex-col gap-1">
            <Text variant="caption" tone="muted">
              Réparti du plus ancien au plus récent :
            </Text>
            <Text variant="body" className="tnum">
              {(allocations.length > 0 ? allocations : targets.map((t) => ({ target: t, amount: eurFromWire(t.due) })))
                .map(({ target: t, amount: part }) => `${t.label} ${formatEur(part)}`)
                .join(" · ")}
            </Text>
          </div>
        ) : target ? (
          <Text variant="body" tone="muted" className="tnum">
            {target.label} · total {formatEur(eurFromWire(target.total))}, payé {formatEur(eurFromWire(target.paid))}
          </Text>
        ) : null}

        <FormField label="Montant encaissé" error={fieldError(error, "amount")}>
          {(field) => (
            <MoneyInput
              ref={inputRef}
              {...field}
              value={text}
              onChange={(next) => setText(next)}
              max={max}
              quickAmounts={quickAmounts}
              onSubmitAmount={() => void submit()}
              enterKeyHint="done"
            />
          )}
        </FormField>

        <PocketChips
          pockets={pockets}
          value={pocketId}
          onChange={(id) => {
            setPocketId(id);
            if (!methodTouched) setMethod(methodForPocket(pockets.find((p) => p.id === id) ?? null));
          }}
        />

        {pocket?.kind === "CASH" && valid && !over ? (
          <div className="flex flex-col gap-2" role="group" aria-label="Donné en espèces">
            <Text variant="caption" tone="muted" className="font-semibold">
              Donné en espèces
            </Text>
            <div className="flex flex-wrap gap-2">
              {BANKNOTES.filter((bill) => eur.compare(parseEurInput(String(bill)) ?? eur.zero, amount) >= 0).map((bill) => (
                <Chip key={bill} active={given === bill} onClick={() => setGiven(given === bill ? null : bill)}>
                  {formatEur(parseEurInput(String(bill)) ?? eur.zero, { compact: true })}
                </Chip>
              ))}
            </div>
            {change && eur.compare(change, eur.zero) >= 0 ? (
              <Text variant="bodyEm" className="tnum">
                À rendre {formatEur(change)}
              </Text>
            ) : null}
          </div>
        ) : null}

        {/*
          Le CTA suit la saisie au lieu d'occuper un pied de sheet (règle des sheets de saisie courtes, comme S20) : sur
          un iPhone SE clavier ouvert, un pied ne laissait que 72 px au montant. La sheet épouse son contenu : clavier
          fermé, le bouton reste en bas de l'écran, sous le pouce. Les options rares viennent après.
        */}
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={cta.onPress} data-collect-cta>
            {cta.label}
          </Button>
          {variant === "livrer" && target ? (
            <Button
              variant="secondary"
              fullWidth
              disabled={pending}
              onClick={() => void deliverOnly.run({ documentId: target.id, to: "DELIVERED" })}
            >
              Livrer sans encaisser
            </Button>
          ) : null}
        </div>

        <CollapsibleSection title="Plus d'options" summary={`${dateSummary}${method ? ` · ${method}` : ""}`} bare>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2" role="group" aria-label="Date du paiement">
              <div className="flex flex-wrap gap-2">
                <Chip active={dateChoice === "today"} onClick={() => setDateChoice("today")}>
                  Aujourd&apos;hui
                </Chip>
                <Chip active={dateChoice === "yesterday"} onClick={() => setDateChoice("yesterday")}>
                  Hier
                </Chip>
                <Chip active={dateChoice === "custom"} onClick={() => setDateChoice("custom")}>
                  Choisir…
                </Chip>
              </div>
              {dateChoice === "custom" ? (
                <FormField label="Date du paiement" error={fieldError(error, "occurredAt")}>
                  {(field) => (
                    <Input {...field} type="date" max={parisDayKey()} value={customDay} onChange={(e) => setCustomDay(e.target.value)} />
                  )}
                </FormField>
              ) : fieldError(error, "occurredAt") ? (
                <Text variant="caption" tone="danger">
                  {fieldError(error, "occurredAt")}
                </Text>
              ) : null}
            </div>
            <div className="flex flex-col gap-2" role="group" aria-label="Moyen">
              <Text variant="caption" tone="muted" className="font-semibold">
                Moyen
              </Text>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((label) => (
                  <Chip
                    key={label}
                    active={method === label}
                    onClick={() => {
                      setMethodTouched(true);
                      setMethod(method === label ? null : label);
                    }}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
            <FormField label="Note">
              {(field) => <Textarea {...field} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />}
            </FormField>
          </div>
        </CollapsibleSection>
      </div>
    </Sheet>
  );
}
