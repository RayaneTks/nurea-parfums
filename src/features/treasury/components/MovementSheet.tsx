"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur, parseEurInput, type Eur } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { useDiscardGuard } from "@/features/documents/components/useDiscardGuard";
import { adjustAction, recordSupplierPaymentAction, transferAction } from "@/server/treasury/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import {
  defaultOwnPocket,
  movementDoneMessage,
  movementEffect,
  outgoingMax,
  ownPockets,
  systemPocket,
  type MovementMode,
} from "./treasury-model";

export type MovementRequest = {
  mode: MovementMode;
  /** Poche de départ (transfert), ou poche concernée (ajustement, paiement fournisseur). */
  pocketId?: string | null;
};

type MovementSheetProps = {
  open: boolean;
  onClose: () => void;
  request: MovementRequest;
  pockets: readonly PocketSummary[];
  /** Ouverte depuis la fiche d'une poche (S14). */
  nested?: boolean;
};

const MODE_OPTIONS = [
  { value: "transfert", label: "Transfert" },
  { value: "ajustement", label: "Ajustement" },
  { value: "fournisseur", label: "Paiement fournisseur" },
] as const;

const DIRECTION_OPTIONS = [
  { value: "in", label: "Ajouter" },
  { value: "out", label: "Retirer" },
] as const;

type DateChoice = "today" | "yesterday" | "custom";

function occurredAtOf(choice: DateChoice, customDay: string): string | undefined {
  if (choice === "today") return undefined;
  const key = choice === "yesterday" ? parisDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000)) : customDay;
  return parseParisDayKey(key)?.toISOString();
}

function fieldError(error: ActionError | null, field: string): string | undefined {
  if (!error?.fields) return undefined;
  return Object.entries(error.fields).find(([path]) => path === field || path.endsWith(`.${field}`))?.[1];
}

function PocketChoice({
  label,
  pockets,
  value,
  onChange,
}: {
  label: string;
  pockets: readonly PocketSummary[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <Text variant="caption" tone="muted" className="font-semibold">
        {label}
      </Text>
      <div className="flex flex-wrap gap-2">
        {pockets.map((pocket) => (
          <Chip key={pocket.id} active={pocket.id === value} onClick={() => onChange(pocket.id)}>
            {pocket.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/**
 * S15 — Mouvement : Répartir, Transfert, Ajustement, Paiement fournisseur (06 S15). Chaque geste dit son effet
 * complet dans son CTA (« Transférer 300 € vers Banque ») ou ce qui manque ; « Non attribué » ne passe jamais sous
 * zéro (plafond ici, refus du serveur sinon) ; une autre poche qui passerait en négatif est une réserve du serveur,
 * confirmée dans un dialogue. Un identifiant par mode, généré à l'ouverture : « Réessayer » n'écrit jamais deux fois
 * (04 §3.6). CTA dans le corps (sheet de saisie courte).
 */
export function MovementSheet({ open, onClose, request, pockets, nested = false }: MovementSheetProps) {
  const router = useRouter();
  const unassigned = systemPocket(pockets);
  const own = ownPockets(pockets);
  const proposed = defaultOwnPocket(pockets);
  const byId = (id: string | null) => pockets.find((pocket) => pocket.id === id) ?? null;

  const [ids] = useState(() => ({ repartir: newId(), transfert: newId(), ajustement: newId(), fournisseur: newId() }));
  const [mode, setMode] = useState<MovementMode>(request.mode);
  const initialFrom = request.mode === "transfert" ? (request.pocketId ?? proposed?.id ?? own[0]?.id ?? null) : (proposed?.id ?? own[0]?.id ?? null);
  const [fromId, setFromId] = useState<string | null>(initialFrom);
  const [toId, setToId] = useState<string | null>(request.mode === "repartir" ? (proposed?.id ?? null) : null);
  const [pocketId, setPocketId] = useState<string | null>(request.pocketId ?? proposed?.id ?? own[0]?.id ?? null);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const initialText = request.mode === "repartir" && unassigned ? amountToInputText(eur.clampZero(eurFromWire(unassigned.balance))) : "";
  const [text, setText] = useState(initialText);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [customDay, setCustomDay] = useState(() => parisDayKey());
  const amountRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  const dirty = text !== initialText || reason.trim() !== "" || note.trim() !== "" || dateChoice !== "today" || mode !== request.mode;
  const guard = useDiscardGuard(dirty);
  const requestClose = () => {
    void guard().then((ok) => ok && onClose());
  };
  useShellSheet(open, requestClose);

  const from = byId(fromId);
  const to = byId(toId);
  const pocket = byId(pocketId);
  const amount = parseEurInput(text);
  const valid = amount !== null && eur.compare(amount, eur.zero) > 0;

  // Plafond de la sortie : « Non attribué » jamais sous zéro.
  const source = mode === "repartir" ? unassigned : mode === "transfert" ? from : mode === "ajustement" && direction === "in" ? null : pocket;
  const max = outgoingMax(source);
  const over = valid && max !== undefined && eur.compare(amount, max) > 0;

  const done = { to: to?.name ?? null, pocket: pocket?.name ?? null, direction };
  const onSuccess = () => onClose();
  const onError = (error: ActionError) => {
    if (error.code === "CONFLICT" || error.code === "NOT_FOUND") router.refresh();
  };
  const transfer = useAction(transferAction, { success: () => (amount ? movementDoneMessage(mode, amount, done) : null), onSuccess });
  const adjust = useAction(adjustAction, { success: () => (amount ? movementDoneMessage("ajustement", amount, done) : null), onSuccess });
  const supplier = useAction(recordSupplierPaymentAction, {
    success: () => (amount ? movementDoneMessage("fournisseur", amount, done) : null),
    onSuccess,
  });
  const pending = transfer.pending || adjust.pending || supplier.pending;
  const error = mode === "ajustement" ? adjust.error : mode === "fournisseur" ? supplier.error : transfer.error;

  const submit = async () => {
    if (!valid || over || amount === null) return;
    const value = text;
    let result;
    switch (mode) {
      case "repartir":
        if (!to) return;
        result = await transfer.run({ id: ids.repartir, fromPocketId: unassigned?.id ?? null, toPocketId: to.id, amount: value });
        break;
      case "transfert":
        if (!from || !to) return;
        result = await transfer.run({
          id: ids.transfert,
          fromPocketId: from.id,
          toPocketId: to.id,
          amount: value,
          occurredAt: occurredAtOf(dateChoice, customDay),
          label: note.trim() || undefined,
        });
        break;
      case "ajustement":
        if (!pocket || reason.trim().length < 2) return;
        result = await adjust.run({ id: ids.ajustement, pocketId: pocket.id, direction, amount: value, reason: reason.trim() });
        break;
      case "fournisseur":
        if (!pocket) return;
        result = await supplier.run({ id: ids.fournisseur, pocketId: pocket.id, amount: value, note: note.trim() || undefined });
        break;
      default: {
        const exhaustive: never = mode;
        throw new Error(`Mode inconnu : ${exhaustive as string}`);
      }
    }
    if (result && !result.ok) onError(result.error);
  };

  const cta = ((): { label: string; onPress?: () => void; disabled?: boolean } => {
    if (mode === "repartir" && own.length === 0) return { label: "Crée d'abord une poche", disabled: true };
    if (max !== undefined && eur.isZero(max)) return { label: `« ${source?.name ?? "Non attribué"} » est vide`, disabled: true };
    if (!valid) return { label: "Saisir le montant", onPress: () => amountRef.current?.focus() };
    if (over && max !== undefined) return { label: `Ramener à ${formatEur(max)}`, onPress: () => setText(amountToInputText(max)) };
    if ((mode === "repartir" || mode === "transfert") && !to) {
      return { label: "Choisir la poche d'arrivée", onPress: () => toRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }) };
    }
    if (mode === "ajustement" && reason.trim().length < 2) return { label: "Indiquer la raison", onPress: () => reasonRef.current?.focus() };
    const names = { from: from?.name, to: to?.name, pocket: pocket?.name, direction };
    return { label: movementEffect(mode, amount as Eur, names), onPress: () => void submit() };
  })();

  const destinations = mode === "repartir" ? own : pockets.filter((candidate) => candidate.id !== fromId);
  const quickAll =
    source && eur.compare(eurFromWire(source.balance), eur.zero) > 0 && (mode === "transfert" || mode === "repartir")
      ? [{ label: "Tout", amount: eurFromWire(source.balance) }]
      : [];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested={nested}
      dismissible={!dirty && !pending}
      title={mode === "repartir" ? "Répartir le non attribué" : "Nouveau mouvement"}
      description={mode === "repartir" && unassigned ? `${formatEur(eurFromWire(unassigned.balance))} non attribués` : undefined}
      size="auto"
    >
      <div className="flex flex-col gap-5" data-movement-sheet={mode}>
        {mode !== "repartir" ? (
          <SegmentedControl ariaLabel="Type de mouvement" options={MODE_OPTIONS} value={mode} onChange={setMode} />
        ) : null}

        {mode === "transfert" ? (
          <PocketChoice
            label="De"
            pockets={pockets}
            value={fromId}
            onChange={(id) => {
              setFromId(id);
              if (id === toId) setToId(null);
            }}
          />
        ) : null}

        {mode === "repartir" || mode === "transfert" ? (
          <div ref={toRef}>
            <PocketChoice label="Vers" pockets={destinations} value={toId} onChange={setToId} />
            {fieldError(error, "toPocketId") ? (
              <Text variant="caption" tone="danger">
                {fieldError(error, "toPocketId")}
              </Text>
            ) : null}
          </div>
        ) : null}

        {mode === "ajustement" || mode === "fournisseur" ? (
          <PocketChoice label="Poche" pockets={pockets} value={pocketId} onChange={setPocketId} />
        ) : null}

        {mode === "ajustement" ? (
          <SegmentedControl ariaLabel="Sens de l'ajustement" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
        ) : null}

        <FormField label="Montant" error={fieldError(error, "amount")}>
          {(field) => (
            <MoneyInput
              ref={amountRef}
              {...field}
              value={text}
              onChange={(next) => setText(next)}
              max={max}
              quickAmounts={quickAll}
              onSubmitAmount={() => cta.onPress?.()}
              enterKeyHint="done"
            />
          )}
        </FormField>

        {mode === "ajustement" ? (
          <FormField label="Raison" required error={fieldError(error, "reason")}>
            {(field) => (
              <Input
                ref={reasonRef}
                {...field}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={200}
                placeholder="Recomptage de la caisse"
                enterKeyHint="done"
              />
            )}
          </FormField>
        ) : null}

        {mode === "fournisseur" ? (
          <>
            <FormField label="Note">
              {(field) => <Input {...field} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} enterKeyHint="done" />}
            </FormField>
            <Text variant="caption" tone="muted">
              Sort de la Trésorerie sans toucher la Marge nette : le coût des parfums est déjà compté sur les articles.
            </Text>
          </>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={pending}
          disabled={cta.disabled}
          onClick={cta.onPress}
          data-movement-cta
        >
          {cta.label}
        </Button>

        {mode === "transfert" ? (
          <CollapsibleSection title="Plus d'options" summary={dateChoice === "today" ? "Aujourd'hui" : dateChoice === "yesterday" ? "Hier" : customDay} bare>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2" role="group" aria-label="Date du transfert">
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
                  <FormField label="Date du transfert" error={fieldError(error, "occurredAt")}>
                    {(field) => <Input {...field} type="date" max={parisDayKey()} value={customDay} onChange={(event) => setCustomDay(event.target.value)} />}
                  </FormField>
                ) : fieldError(error, "occurredAt") ? (
                  <Text variant="caption" tone="danger">
                    {fieldError(error, "occurredAt")}
                  </Text>
                ) : null}
              </div>
              <FormField label="Note">
                {(field) => <Input {...field} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />}
              </FormField>
            </div>
          </CollapsibleSection>
        ) : null}
      </div>
    </Sheet>
  );
}
