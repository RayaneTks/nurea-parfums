/**
 * Libellés et décisions d'écran de la fiche document (06 S01, §1.7), purs et testés : un état ou un objet a UN
 * libellé partout — liste Commandes, À encaisser, recherche, fiche.
 */
import type { DocumentPaymentDTO, DocumentSheetDTO } from "@/contracts/documents";
import type { PocketSummary } from "@/contracts/treasury";
import { isEngaged, type DocumentOrigin, type DocumentStatus } from "@/domain/document-status";
import { eur, eurFromWire, formatEur, type Eur, type MoneyString } from "@/domain/money";
import { isVolumeMl } from "@/domain/sale-line";
import { formatDate } from "@/ui/patterns/date-format";

export const PASSING_CUSTOMER = "Client de passage";

const money = (value: MoneyString) => formatEur(eurFromWire(value));

export const noun = (origin: DocumentOrigin) => (origin === "DIRECT_SALE" ? "vente" : "commande");
export const Noun = (origin: DocumentOrigin) => (origin === "DIRECT_SALE" ? "Vente" : "Commande");

/** « Commande du 12 sept. », « Vente du 3 août » (06 §1.7). */
export function documentTitle(origin: DocumentOrigin, orderedAt: string, now: Date = new Date()): string {
  return `${Noun(origin)} du ${formatDate(new Date(orderedAt), "short", now)}`;
}

/** Nom affiché : fiche vivante, sinon nom saisi, sinon « Client de passage ». */
export function customerLabel(doc: { customer?: { fullName: string } | null; customerName: string | null }): string {
  return doc.customer?.fullName ?? (doc.customerName?.trim() ? doc.customerName : PASSING_CUSTOMER);
}

/** « livraison sam. 20 sept. » (+ « · 14 h 30 » si une heure a été choisie). */
export function deliveryLabel(expectedDeliveryAt: string | null, hasTime: boolean, now: Date = new Date()): string | null {
  if (!expectedDeliveryAt) return null;
  const date = new Date(expectedDeliveryAt);
  const day = formatDate(date, "day", now);
  return hasTime ? `${day} · ${formatDate(date, "time", now)}` : day;
}

/** Description de la sheet : « Commande du 12 sept. · livraison sam. 20 sept. ». */
export function documentDescription(doc: Pick<DocumentSheetDTO, "origin" | "orderedAt" | "expectedDeliveryAt" | "expectedDeliveryHasTime" | "status">): string {
  const title = documentTitle(doc.origin, doc.orderedAt);
  const delivery = doc.origin === "ORDER" && doc.status !== "DELIVERED" && doc.status !== "CANCELLED"
    ? deliveryLabel(doc.expectedDeliveryAt, doc.expectedDeliveryHasTime)
    : null;
  return delivery ? `${title} · livraison ${delivery}` : title;
}

// ── Argent ─────────────────────────────────────────────────────────────────────

export type MoneyTile = { label: "Total" | "Payé" | "À encaisser" | "Trop-perçu"; value: MoneyString; tone: "default" | "warning" };

export type MoneyView = {
  tiles: MoneyTile[];
  /** Ligne sous les tuiles : attente, payé conservé. */
  note: string | null;
};

/** Zone 3 de S01 : trois chiffres pour un document engagé, deux et une phrase sinon. */
export function moneyView(doc: Pick<DocumentSheetDTO, "status" | "balance">): MoneyView {
  const { total, paid, due, overpaid } = doc.balance;
  const base: MoneyTile[] = [
    { label: "Total", value: total, tone: "default" },
    { label: "Payé", value: paid, tone: "default" },
  ];
  if (doc.status === "PENDING") {
    return { tiles: base, note: "En attente : rien à encaisser tant qu'elle n'est pas confirmée." };
  }
  if (doc.status === "CANCELLED") {
    const kept = eurFromWire(paid);
    return { tiles: base, note: eur.compare(kept, eur.zero) > 0 ? `${formatEur(kept)} encaissés conservés` : null };
  }
  const over = eurFromWire(overpaid);
  return {
    tiles: [
      ...base,
      eur.compare(over, eur.zero) > 0
        ? { label: "Trop-perçu", value: overpaid, tone: "default" }
        : { label: "À encaisser", value: due, tone: "warning" },
    ],
    note: null,
  };
}

/** « Marge avant dépenses 87 € · 42 % » ou « Marge avant dépenses : coût à compléter ». */
export function marginLabel(doc: Pick<DocumentSheetDTO, "balance">): { text: string; unknown: boolean } {
  const { marginBeforeExpenses, marginPercent } = doc.balance;
  if (marginBeforeExpenses === null) return { text: "Marge avant dépenses : coût à compléter", unknown: true };
  const percent = marginPercent === null ? "" : ` · ${marginPercent.replace(/,0$/, "")} %`;
  return { text: `Marge avant dépenses ${money(marginBeforeExpenses)}${percent}`, unknown: false };
}

export type PrimaryAction =
  | { kind: "acompte" }
  | { kind: "solde"; amount: MoneyString }
  | { kind: "rembourser"; amount: MoneyString }
  | null;

export type FooterPlan = { primary: PrimaryAction; share: "recap" | "recu" | null };

/** Tableau des actions du pied de S01 (06 S01) : l'argent et le partage, jamais un changement de statut. */
export function footerPlan(doc: Pick<DocumentSheetDTO, "origin" | "status" | "balance">): FooterPlan {
  const due = eurFromWire(doc.balance.due);
  const paid = eurFromWire(doc.balance.paid);
  const overpaid = eurFromWire(doc.balance.overpaid);
  const positive = (value: Eur) => eur.compare(value, eur.zero) > 0;
  if (doc.status === "CANCELLED") {
    return { primary: positive(paid) ? { kind: "rembourser", amount: doc.balance.paid } : null, share: null };
  }
  if (positive(overpaid)) return { primary: { kind: "rembourser", amount: doc.balance.overpaid }, share: "recu" };
  if (doc.status === "PENDING") {
    return { primary: positive(eurFromWire(doc.balance.total)) ? { kind: "acompte" } : null, share: null };
  }
  const delivered = doc.status === "DELIVERED";
  if (positive(due)) return { primary: { kind: "solde", amount: doc.balance.due }, share: "recap" };
  return { primary: null, share: delivered ? "recu" : "recap" };
}

// ── Articles ───────────────────────────────────────────────────────────────────

/** « Livré 3/4 » sur l'en-tête des articles d'une commande. */
export function deliveredSummary(lines: readonly { quantity: number; deliveredQuantity: number }[]): { delivered: number; quantity: number } {
  return lines.reduce(
    (acc, line) => ({ delivered: acc.delivered + Math.min(line.deliveredQuantity, line.quantity), quantity: acc.quantity + line.quantity }),
    { delivered: 0, quantity: 0 },
  );
}

/** « 80 ml · 2 × 120 € », « Volume à choisir · 1 × 90 € ». */
export function lineCaption(line: { volumeMl: number | null; quantity: number; unitPriceEur: MoneyString; isGift: boolean }): string {
  const volume = isVolumeMl(line.volumeMl) ? `${line.volumeMl} ml` : null;
  const price = line.isGift ? "offert" : money(line.unitPriceEur);
  return [volume, `${line.quantity} × ${price}`].filter(Boolean).join(" · ");
}

// ── Paiements ──────────────────────────────────────────────────────────────────

export type PaymentRowView = {
  payment: DocumentPaymentDTO;
  /** « Acompte », « Solde », « Paiement », « Remboursement », « Paiement annulé », « Remboursement annulé ». */
  label: string;
  /** La paire paiement + contre-passation se replie : l'original porte la ligne, barrée. */
  voided: boolean;
  /** Un paiement actif se corrige ou s'annule ; une ligne repliée ou une contre-passation, non. */
  actionable: boolean;
};

/** Zone 5 de S01 : la contre-passation d'un paiement ne s'affiche pas, l'original se replie sous « … annulé ». */
export function paymentRows(payments: readonly DocumentPaymentDTO[], origin: DocumentOrigin): PaymentRowView[] {
  return payments
    .filter((payment) => payment.reversesPaymentId === null)
    .map((payment) => {
      const voided = payment.reversedByPaymentId !== null;
      const base =
        payment.kind === "DEPOSIT" ? "Acompte" : payment.kind === "BALANCE" ? (origin === "ORDER" ? "Solde" : "Paiement") : "Remboursement";
      const label = voided ? (payment.kind === "REFUND" ? "Remboursement annulé" : "Paiement annulé") : base;
      return { payment, label, voided, actionable: !voided };
    });
}

/** Montant d'un paiement tel qu'on le saisit (positif), quel que soit son sens. */
export function paymentMagnitude(payment: Pick<DocumentPaymentDTO, "amount">): Eur {
  const amount = eurFromWire(payment.amount);
  return eur.isNegative(amount) ? eur.neg(amount) : amount;
}

/**
 * Description vraie de « Annuler ce paiement » (06 S18) : l'écriture inverse, sa poche et sa date ; et, sur un
 * document engagé, ce qui restera à encaisser — le statut ne change pas (03 §4.4).
 */
export function voidPaymentDescription(
  doc: Pick<DocumentSheetDTO, "origin" | "status" | "balance">,
  payment: Pick<DocumentPaymentDTO, "amount" | "kind" | "pocketName">,
): string {
  const what = payment.kind === "REFUND" ? "Le remboursement" : "Le paiement";
  const parts = [`Une écriture inverse est ajoutée à la même date dans ${payment.pocketName}. ${what} reste visible, barré.`];
  if (isEngaged(doc.status) && payment.kind !== "REFUND") {
    const after = eur.clampZero(eur.sub(eurFromWire(doc.balance.total), eur.sub(eurFromWire(doc.balance.paid), paymentMagnitude(payment))));
    const state = doc.status === "DELIVERED" ? "livrée" : "confirmée";
    parts.push(`Elle reste ${state} : ${formatEur(after)} resteront à encaisser.`);
  }
  return parts.join(" ");
}

// ── Encaisser (S02) ────────────────────────────────────────────────────────────

/** Un document à encaisser, tel que l'écran appelant le connaît (montants de la vue). */
export type CollectTarget = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  /** « Vente du 3 août », « Commande du 12 sept. ». */
  label: string;
  total: MoneyString;
  paid: MoneyString;
  due: MoneyString;
};

/**
 * « Tout encaisser » (06 S02) : le montant se répartit du plus ancien document au plus récent, chacun à son dû au
 * plus ; un document qui ne reçoit rien n'est pas envoyé.
 */
export function allocate(targets: readonly CollectTarget[], amount: Eur | null): { target: CollectTarget; amount: Eur }[] {
  if (amount === null) return [];
  let remaining = amount;
  const out: { target: CollectTarget; amount: Eur }[] = [];
  for (const target of targets) {
    if (eur.compare(remaining, eur.zero) <= 0) break;
    const part = eur.min(remaining, eurFromWire(target.due));
    if (eur.compare(part, eur.zero) > 0) out.push({ target, amount: part });
    remaining = eur.sub(remaining, part);
  }
  return out;
}

// ── Poches ─────────────────────────────────────────────────────────────────────

/** La poche proposée (N2) : la poche par défaut, sinon « Non attribué ». */
export function defaultPocket(pockets: readonly PocketSummary[]): PocketSummary | null {
  return pockets.find((pocket) => pocket.isDefault) ?? pockets.find((pocket) => pocket.isSystem) ?? pockets[0] ?? null;
}

/** Moyen proposé selon la nature de la poche (06 S02 zone 4). */
export function methodForPocket(pocket: PocketSummary | null): string | null {
  if (!pocket) return null;
  if (pocket.kind === "CASH") return "Espèces";
  if (pocket.kind === "BANK") return "Virement";
  return null;
}

// ── Partage ────────────────────────────────────────────────────────────────────

/**
 * Texte du récap (commande) ou du reçu (livrée, vente) : lignes, « Total », « Payé » RÉEL (la somme du ledger,
 * F-4.1-10), « À encaisser », livraison prévue.
 */
export type ShareableDocument = Pick<
  DocumentSheetDTO,
  "origin" | "status" | "orderedAt" | "expectedDeliveryAt" | "expectedDeliveryHasTime" | "customerName"
> & {
  customer: { fullName: string } | null;
  lines: readonly Pick<DocumentSheetDTO["lines"][number], "perfumeName" | "brandName" | "volumeMl" | "quantity" | "unitPriceEur" | "isGift">[];
  balance: Pick<DocumentSheetDTO["balance"], "total" | "paid" | "due">;
};

export function shareText(doc: ShareableDocument, kind: "recap" | "recu"): string {
  const lines = doc.lines.map((line) => `– ${line.perfumeName}${line.brandName ? ` (${line.brandName})` : ""} · ${lineCaption(line)}`);
  const due = eurFromWire(doc.balance.due);
  const out = [
    `${kind === "recu" ? "Reçu" : "Récap"} — ${documentTitle(doc.origin, doc.orderedAt)}`,
    customerLabel(doc) === PASSING_CUSTOMER ? null : customerLabel(doc),
    "",
    ...lines,
    "",
    `Total : ${money(doc.balance.total)}`,
    `Payé : ${money(doc.balance.paid)}`,
    eur.compare(due, eur.zero) > 0 && isEngaged(doc.status) ? `À encaisser : ${money(doc.balance.due)}` : null,
    doc.origin === "ORDER" && doc.status !== "DELIVERED" && doc.expectedDeliveryAt
      ? `Livraison prévue : ${deliveryLabel(doc.expectedDeliveryAt, doc.expectedDeliveryHasTime)}`
      : null,
    "",
    "Nuréa Parfums",
  ];
  return out.filter((line): line is string => line !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

export function statusVerb(to: DocumentStatus): string {
  switch (to) {
    case "PENDING":
      return "remise en attente";
    case "CONFIRMED":
      return "confirmée";
    case "DELIVERED":
      return "livrée";
    case "CANCELLED":
      return "annulée";
    default: {
      const exhaustive: never = to;
      return exhaustive;
    }
  }
}
