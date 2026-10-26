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
import { withdrawDocumentAction } from "@/server/documents/actions";
import { FormField } from "@/ui/patterns/FormField";
import { formatDate } from "@/ui/patterns/date-format";
import { Button } from "@/ui/primitives/Button";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { customerLabel, defaultPocket } from "./document-model";
import { PocketChips } from "./PocketChips";
import { useDiscardGuard } from "./useDiscardGuard";

type Choice = "keep" | "all" | "part";

const CHOICES: { value: Choice; label: (paid: string) => string }[] = [
  { value: "keep", label: () => "On le garde" },
  { value: "all", label: (paid) => `On lui rend tout (${paid})` },
  { value: "part", label: () => "On lui rend une partie" },
];

/** Flacons qui passeront en stock : une commande confirmée, une unité par ligne non offerte. */
export function bottlesToStock(doc: Pick<DocumentSheetDTO, "status" | "lines">): number {
  if (doc.status !== "CONFIRMED") return 0;
  return doc.lines.filter((line) => !line.isGift).reduce((sum, line) => sum + line.quantity, 0);
}

function nextText(name: string, bottles: number): string {
  const kept = `La commande reste dans la fiche de ${name}, marquée « Désistée ».`;
  if (bottles === 0) return `${kept} Elle n'était pas confirmée : aucun flacon ne passe en stock.`;
  return bottles === 1
    ? `${kept} Son flacon rejoint tes flacons en stock, prêt à être revendu.`
    : `${kept} Ses ${bottles} flacons rejoignent tes flacons en stock, prêts à être revendus.`;
}

function amountError(error: ActionError | null): string | undefined {
  if (!error?.fields) return undefined;
  return Object.entries(error.fields).find(([path]) => path.endsWith("amount"))?.[1];
}

/**
 * « Le client se désiste » (docs/admin/desistements.md) : une seule question, que faire de son acompte —
 * le garder (choix d'office), le rendre en entier ou en partie —, puis ce qui suit, en clair. Identifiant du
 * remboursement généré à l'ouverture : un renvoi n'écrit rien deux fois.
 */
export function WithdrawSheet({
  open,
  onClose,
  doc,
  pockets,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentSheetDTO;
  pockets: readonly PocketSummary[];
}) {
  const { showToast } = useToast();
  const name = customerLabel(doc);
  const paid = eur.clampZero(eurFromWire(doc.balance.paid));
  const hasMoney = eur.compare(paid, eur.zero) > 0;
  const bottles = bottlesToStock(doc);
  const proposed = defaultPocket(pockets);

  const [refundId] = useState(newId);
  const [choice, setChoice] = useState<Choice>("keep");
  const [text, setText] = useState("");
  const [pocketId, setPocketId] = useState<string | null>(proposed?.id ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dirty = choice !== "keep" || text !== "";
  const guard = useDiscardGuard(dirty);
  const requestClose = () => void guard().then((ok) => ok && onClose());
  useShellSheet(open, requestClose);

  const typed = parseEurInput(text);
  const amount = choice === "all" ? paid : choice === "part" ? typed : eur.zero;
  const pocket = pockets.find((p) => p.id === pocketId) ?? null;

  const withdraw = useAction(withdrawDocumentAction, {
    onSuccess: (data) => {
      onClose();
      const given = eur.neg(eur.sum(data.refunds.map((payment) => eurFromWire(payment.amount))));
      const parts = ["Commande désistée"];
      if (eur.compare(given, eur.zero) > 0) parts.push(`${formatEur(given)} rendus`);
      if (data.bottles > 0) parts.push(data.bottles === 1 ? "1 flacon en stock" : `${data.bottles} flacons en stock`);
      showToast({ type: "success", message: parts.join(" · ") });
    },
  });

  const cta = (() => {
    if (choice === "keep" || !hasMoney) {
      return { label: "Valider le désistement", onPress: () => void withdraw.run({ documentId: doc.id }) };
    }
    if (amount === null || eur.compare(amount, eur.zero) <= 0) {
      return { label: "Saisir le montant rendu", onPress: () => inputRef.current?.focus() };
    }
    if (eur.compare(amount, paid) > 0) {
      return { label: `Ramener à ${formatEur(paid)}`, onPress: () => setText(amountToInputText(paid)) };
    }
    return {
      label: `Valider et rendre ${formatEur(amount)}`,
      onPress: () => void withdraw.run({ documentId: doc.id, refunds: [{ id: refundId, amount: toWire(amount), pocketId }] }),
    };
  })();

  const summary = [doc.lines.map((line) => line.perfumeName).join(", "), `commandée le ${formatDate(new Date(doc.orderedAt), "short")}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      nested
      dismissible={!dirty && !withdraw.pending}
      title={`${name} ne prend plus sa commande ?`}
      description={summary}
      size="auto"
    >
      <div className="flex flex-col gap-5">
        {hasMoney ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">
              <Text variant="micro" tone="muted" uppercase>
                Acompte déjà versé : {formatEur(paid)}
              </Text>
            </legend>
            <div className="flex flex-col overflow-hidden rounded-[var(--admin-radius-md)] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]">
              {CHOICES.map((option, index) => (
                <label
                  key={option.value}
                  className={`admin-hit-target flex min-h-12 cursor-pointer items-center gap-3 px-3 ${index > 0 ? "border-t border-[var(--admin-border)]" : ""}`}
                  data-withdraw-choice={option.value}
                >
                  <input
                    type="radio"
                    name="acompte"
                    value={option.value}
                    checked={choice === option.value}
                    onChange={() => {
                      setChoice(option.value);
                      if (option.value === "part") requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="peer sr-only"
                  />
                  {/* La rangée entière est la cible ; le rond n'est que son dessin (comme `Checkbox`). */}
                  <span
                    aria-hidden
                    className="size-5 shrink-0 rounded-full border-2 border-[var(--admin-border-strong)] peer-checked:border-[6px] peer-checked:border-[var(--admin-accent)] peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--admin-accent-ring)]"
                  />
                  <span className="admin-type-body text-[var(--admin-text)]">{option.label(formatEur(paid))}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {choice === "part" ? (
          <FormField label="Montant rendu" error={amountError(withdraw.error)}>
            {(field) => (
              <MoneyInput ref={inputRef} {...field} value={text} onChange={setText} max={paid} onSubmitAmount={() => cta.onPress()} />
            )}
          </FormField>
        ) : null}
        {choice !== "keep" && hasMoney ? (
          <PocketChips pockets={pockets} value={pocketId} onChange={setPocketId} label="Rendu depuis la poche" />
        ) : null}

        <div className="flex flex-col gap-1">
          <Text variant="micro" tone="muted" uppercase>
            Ensuite
          </Text>
          <Text variant="body">{nextText(name, bottles)}</Text>
          {choice !== "keep" && hasMoney && amount !== null && eur.compare(amount, eur.zero) > 0 && eur.compare(amount, paid) <= 0 ? (
            <Text variant="caption" tone="muted">
              {`${formatEur(amount)} sortent de ${pocket?.name ?? "Non attribué"}, datés d'aujourd'hui.`}
              {eur.compare(amount, paid) < 0 ? ` ${formatEur(eur.sub(paid, amount))} restent gardés.` : ""}
            </Text>
          ) : null}
        </div>

        {/* Saisie courte : le bouton sous la saisie, comme S03. */}
        <Button variant="primary" size="lg" fullWidth isLoading={withdraw.pending} onClick={cta.onPress}>
          {cta.label}
        </Button>
      </div>
    </Sheet>
  );
}
