/**
 * Le composeur Vendre (06 E11) en fonctions pures, testées : le brouillon, ce qui manque, le libellé du CTA qui dit
 * l'effet complet, l'entrée de T1, la carte de confirmation. L'écran ne fait que les afficher.
 */
import type { BatchSummary } from "@/contracts/batches";
import type { PickerPerfume } from "@/contracts/catalogue";
import type { ComposerPrefillDTO, CreateDocumentInput, DocumentSummary, RecentlySoldDTO } from "@/contracts/documents";
import type { PocketSummary } from "@/contracts/treasury";
import { isTextId, newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur, parseEurInput, toWire, type Eur, type MoneyString } from "@/domain/money";
import { parseParisDayKey } from "@/domain/periods";
import { isVolumeMl } from "@/domain/sale-line";
import { PASSING_CUSTOMER, defaultPocket, deliveryLabel } from "@/features/documents/components/document-model";
import {
  decimalText,
  draftMargin,
  draftTotal,
  lineFields,
  lineItemOf,
  missingOf,
  newCatalogueLine,
  newOffCatalogLine,
  type LineDraft,
  type LineMissing,
} from "@/features/documents/components/line-draft";
import { amountToInputText } from "@/ui/primitives/MoneyInput";

export type ComposerMode = "vente" | "commande";

export type ComposerCustomer =
  | { kind: "passing"; name: string; contact: string }
  | { kind: "linked"; id: string; fullName: string; contact: string | null };

/** Lot du document (N9) : proposé (le lot ouvert le plus récent) tant qu'il n'a pas été choisi. */
export type BatchChoice = { kind: "auto" } | { kind: "chosen"; id: string | null; name: string | null };

export type SplitEntry = { pocketId: string; amount: string };

/** Le brouillon (04 §3.7, 06 E11 « Brouillon ») : tout ce qui est saisi, identifiants de création compris. */
export type ComposerDraft = {
  v: 1;
  /** UUID du document, généré à l'ouverture et gardé jusqu'au succès : un renvoi n'écrit jamais deux fois (04 §3.6). */
  id: string;
  mode: ComposerMode;
  customer: ComposerCustomer;
  lines: LineDraft[];
  /** Jour de Paris « AAAA-MM-JJ » (Commande). */
  deliveryDay: string | null;
  /** « HH:MM » ou vide. */
  deliveryTime: string;
  notes: string;
  batch: BatchChoice;
  /** Texte du « Reçu maintenant » (Vente) ou de l'acompte (Commande) ; null : proposé (le total, ou rien). */
  received: string | null;
  /** Poche choisie ; null : la poche proposée (N2). */
  pocketId: string | null;
  /** Répartition sur plusieurs poches (S08), valable pour le montant reçu qu'elle répartit. */
  split: { received: MoneyString; entries: SplitEntry[] } | null;
  /** Identifiants des paiements de création, un par poche : stables jusqu'au succès. */
  paymentIds: string[];
};

export const MAX_PAYMENTS = 10;

export function freshDraft(mode: ComposerMode = "vente"): ComposerDraft {
  return {
    v: 1,
    id: newId(),
    mode,
    customer: { kind: "passing", name: "", contact: "" },
    lines: [],
    deliveryDay: null,
    deliveryTime: "",
    notes: "",
    batch: { kind: "auto" },
    received: null,
    pocketId: null,
    split: null,
    paymentIds: Array.from({ length: MAX_PAYMENTS }, () => newId()),
  };
}

/** Un brouillon « vide » n'est pas gardé : ni point sur l'onglet, ni bandeau de reprise. */
export function isDraftEmpty(draft: ComposerDraft): boolean {
  return (
    draft.lines.length === 0 &&
    draft.customer.kind === "passing" &&
    draft.customer.name.trim() === "" &&
    draft.customer.contact.trim() === "" &&
    draft.notes.trim() === "" &&
    draft.deliveryDay === null
  );
}

const isString = (value: unknown): value is string => typeof value === "string";

function isLine(value: unknown): value is LineDraft {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    isString(line.id) &&
    isString(line.perfumeName) &&
    (line.perfumeId === null || typeof line.perfumeId === "number") &&
    typeof line.quantity === "number" &&
    Number.isSafeInteger(line.quantity) &&
    line.quantity >= 1 &&
    (line.volumeMl === null || typeof line.volumeMl === "number") &&
    isString(line.price) &&
    isString(line.lastPrice) &&
    isString(line.cost) &&
    isString(line.rate) &&
    isString(line.note) &&
    typeof line.isGift === "boolean" &&
    typeof line.isOffCatalog === "boolean"
  );
}

/** Un brouillon relu sur l'appareil ; `null` s'il n'a pas la forme attendue (ancienne version, stockage abîmé). */
export function parseDraft(value: unknown): ComposerDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const d = value as Record<string, unknown>;
  if (d.v !== 1 || !isTextId(d.id) || (d.mode !== "vente" && d.mode !== "commande")) return null;
  const customer = d.customer as Record<string, unknown> | null;
  const customerOk =
    typeof customer === "object" &&
    customer !== null &&
    ((customer.kind === "passing" && isString(customer.name) && isString(customer.contact)) ||
      (customer.kind === "linked" && isString(customer.id) && isString(customer.fullName)));
  if (!customerOk || !Array.isArray(d.lines) || !d.lines.every(isLine)) return null;
  if (!Array.isArray(d.paymentIds) || d.paymentIds.length < MAX_PAYMENTS || !d.paymentIds.every(isTextId)) return null;
  const batch = d.batch as Record<string, unknown> | null;
  const batchOk = typeof batch === "object" && batch !== null && (batch.kind === "auto" || batch.kind === "chosen");
  if (!batchOk) return null;
  return value as ComposerDraft;
}

// ── Lectures du brouillon ──────────────────────────────────────────────────────

export const total = (draft: ComposerDraft): Eur => draftTotal(draft.lines);

export function hasCustomerName(draft: ComposerDraft): boolean {
  return draft.customer.kind === "linked" || draft.customer.name.trim().length >= 2;
}

/** « Fares Benali », le nom saisi, ou « Client de passage ». */
export function customerDisplay(customer: ComposerCustomer): string {
  if (customer.kind === "linked") return customer.fullName;
  return customer.name.trim() || PASSING_CUSTOMER;
}

/** Le montant reçu (Vente) ou l'acompte (Commande) ; null tant que la saisie n'est pas un montant. */
export function receivedOf(draft: ComposerDraft): Eur | null {
  if (draft.received === null) return draft.mode === "vente" ? total(draft) : eur.zero;
  if (draft.received.trim() === "") return eur.zero;
  return parseEurInput(draft.received);
}

/** Le texte du champ : la saisie, ou le montant proposé. */
export function receivedText(draft: ComposerDraft): string {
  if (draft.received !== null) return draft.received;
  return draft.mode === "vente" ? amountToInputText(total(draft)) : "0";
}

/**
 * Écrire le champ reçu : en Vente, taper le total (ou « Tout ») revient au montant proposé, qui suit le total quand on
 * ajoute une ligne ; en Commande, « Rien » revient au proposé.
 */
export function withReceived(draft: ComposerDraft, text: string, amount: Eur | null): ComposerDraft {
  const proposed = draft.mode === "vente" ? total(draft) : eur.zero;
  const next = amount !== null && eur.compare(amount, proposed) === 0 ? null : text;
  return { ...draft, received: next, split: null };
}

/** Basculer Vente | Commande conserve lignes, client, lot et montant saisi (06 E11 zone 1). */
export function withMode(draft: ComposerDraft, mode: ComposerMode): ComposerDraft {
  if (draft.mode === mode) return draft;
  return { ...draft, mode, split: null };
}

export function resolveBatch(draft: ComposerDraft, batches: readonly Pick<BatchSummary, "id" | "name">[]): { id: string; name: string } | null {
  if (draft.batch.kind === "auto") {
    const latest = batches[0];
    return latest ? { id: latest.id, name: latest.name } : null;
  }
  return draft.batch.id ? { id: draft.batch.id, name: draft.batch.name ?? "Lot" } : null;
}

export function chosenPocket(draft: ComposerDraft, pockets: readonly PocketSummary[]): PocketSummary | null {
  return pockets.find((pocket) => pocket.id === draft.pocketId) ?? defaultPocket(pockets);
}

/** « Espèces », « Non attribué » ; plusieurs poches : « Espèces 100,00 € · Banque 20,00 € ». */
export type PaymentPlan = { id: string; amount: Eur; pocketId: string | null; pocketName: string }[];

export function paymentsOf(draft: ComposerDraft, pockets: readonly PocketSummary[]): PaymentPlan {
  const received = receivedOf(draft);
  if (received === null || eur.compare(received, eur.zero) <= 0) return [];
  const system = pockets.find((pocket) => pocket.isSystem) ?? null;
  const nameOf = (pocketId: string | null) =>
    pockets.find((pocket) => pocket.id === pocketId)?.name ?? system?.name ?? "Non attribué";
  if (draft.split && draft.split.received === toWire(received)) {
    const parts = draft.split.entries.flatMap((entry) => {
      const amount = parseEurInput(entry.amount);
      return amount !== null && eur.compare(amount, eur.zero) > 0 ? [{ pocketId: entry.pocketId, amount }] : [];
    });
    const spread = eur.sum(parts.map((part) => part.amount));
    const rest = eur.sub(received, spread);
    const all = eur.compare(rest, eur.zero) > 0 ? [...parts, { pocketId: system?.id ?? null, amount: rest }] : parts;
    return all.slice(0, MAX_PAYMENTS).map((part, index) => ({
      id: draft.paymentIds[index] as string,
      amount: part.amount,
      pocketId: part.pocketId,
      pocketName: nameOf(part.pocketId),
    }));
  }
  const pocket = chosenPocket(draft, pockets);
  return [{ id: draft.paymentIds[0] as string, amount: received, pocketId: pocket?.id ?? null, pocketName: pocket?.name ?? "Non attribué" }];
}

export function pocketsLabel(plan: PaymentPlan): string {
  if (plan.length <= 1) return plan[0]?.pocketName ?? "";
  return plan.map((part) => `${part.pocketName} ${formatEur(part.amount)}`).join(" · ");
}

/** Livraison prévue en ISO : le jour à 00:00 Europe/Paris, ou le jour et l'heure choisis (03 §3). */
export function deliveryIso(day: string | null, time: string): string | null {
  if (!day) return null;
  const midnight = parseParisDayKey(day);
  if (!midnight) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return midnight.toISOString();
  return new Date(midnight.getTime() + (Number(match[1]) * 60 + Number(match[2])) * 60_000).toISOString();
}

// ── CTA (06 E11, table des libellés) ───────────────────────────────────────────

export type CtaPlan =
  | { kind: "hidden" }
  | { kind: "line"; label: string; summary?: string; lineId: string; field: LineMissing["field"] }
  | { kind: "customer"; label: string; summary?: string }
  | { kind: "perfume"; label: string; summary?: string }
  | { kind: "received"; label: string; summary?: string }
  | { kind: "clamp"; label: string; summary?: string; amount: Eur }
  | { kind: "submit"; label: string; summary?: string };

export type ComposerContext = {
  pockets: readonly PocketSummary[];
  batches: readonly Pick<BatchSummary, "id" | "name">[];
};

const join = (parts: readonly (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ") || undefined;

/**
 * Le bouton principal dit l'effet complet (« Encaisser 120,00 € · Espèces ») et, tant que la saisie est incomplète,
 * ce qui manque — et y mène (arbitrage n°9). Jamais un bouton désactivé muet.
 */
export function ctaPlan(draft: ComposerDraft, ctx: ComposerContext): CtaPlan {
  const order = draft.mode === "commande";
  if (!order && draft.lines.length === 0) return { kind: "hidden" };

  const batch = resolveBatch(draft, ctx.batches);
  const lot = batch ? `lot ${batch.name}` : null;

  if (order && !hasCustomerName(draft)) return { kind: "customer", label: "Choisir le client", summary: "Une commande se suit sous un nom" };
  if (draft.lines.length === 0) return { kind: "perfume", label: "Ajouter un parfum" };

  for (const line of draft.lines) {
    const missing = missingOf(line);
    if (missing) return { kind: "line", label: missing.label, lineId: line.id, field: missing.field };
  }

  const sum = total(draft);
  const received = receivedOf(draft);
  if (received === null) return { kind: "received", label: order ? "Saisir l'acompte" : "Saisir le montant reçu" };
  if (eur.compare(received, sum) > 0) return { kind: "clamp", label: `Ramener à ${formatEur(sum)}`, summary: `${formatEur(sum)} au maximum`, amount: sum };

  const plan = paymentsOf(draft, ctx.pockets);
  const pockets = pocketsLabel(plan);
  const due = eur.sub(sum, received);
  const paid = eur.compare(received, eur.zero) > 0;

  if (order) {
    const when = deliveryLabel(deliveryIso(draft.deliveryDay, draft.deliveryTime), /^\d{2}:\d{2}$/.test(draft.deliveryTime));
    const delivery = when ? `Livraison ${when}` : null;
    if (!paid) return { kind: "submit", label: "Créer la commande", summary: join([delivery, lot]) };
    return { kind: "submit", label: `Créer la commande · acompte ${formatEur(received)}`, summary: join([pockets, lot]) };
  }

  if (eur.compare(due, eur.zero) > 0 && !hasCustomerName(draft)) {
    return { kind: "customer", label: "Choisir le client", summary: `Nécessaire pour suivre les ${formatEur(due)} à encaisser` };
  }
  if (!paid) {
    if (eur.isZero(sum)) return { kind: "submit", label: "Enregistrer la vente", summary: join([customerDisplay(draft.customer), lot]) };
    return { kind: "submit", label: `Enregistrer · ${formatEur(sum)} à encaisser`, summary: join([customerDisplay(draft.customer), lot]) };
  }
  const where = plan.length > 1 ? `${plan.length} poches` : pockets;
  if (eur.compare(due, eur.zero) > 0) {
    return {
      kind: "submit",
      label: `Encaisser ${formatEur(received)} · ${where}`,
      summary: join([plan.length > 1 ? pockets : null, `${formatEur(due)} resteront à encaisser`, lot]),
    };
  }
  return { kind: "submit", label: `Encaisser ${formatEur(received)} · ${where}`, summary: join([plan.length > 1 ? pockets : null, lot]) };
}

/** « Marge avant dépenses 87,00 € » ou « Marge avant dépenses : coût à compléter » (06 §1.7). */
export function marginText(draft: ComposerDraft): { text: string; unknown: boolean } {
  const margin = draftMargin(draft.lines);
  if (margin === null) return { text: "Marge avant dépenses : coût à compléter", unknown: true };
  return { text: `Marge avant dépenses ${formatEur(margin)}`, unknown: false };
}

// ── Écriture (T1) ──────────────────────────────────────────────────────────────

/** L'entrée de `createDocumentAction`, depuis un brouillon dont le CTA est « submit ». */
export function createInput(draft: ComposerDraft, ctx: ComposerContext): CreateDocumentInput {
  const order = draft.mode === "commande";
  const batch = resolveBatch(draft, ctx.batches);
  return {
    id: draft.id,
    origin: order ? "ORDER" : "DIRECT_SALE",
    customer:
      draft.customer.kind === "linked"
        ? { kind: "linked", customerId: draft.customer.id }
        : { kind: "passing", name: draft.customer.name.trim() || null, contact: draft.customer.contact.trim() || null },
    batchId: batch?.id ?? null,
    expectedDeliveryAt: order ? deliveryIso(draft.deliveryDay, draft.deliveryTime) : undefined,
    expectedDeliveryHasTime: order && draft.deliveryDay !== null && /^\d{2}:\d{2}$/.test(draft.deliveryTime),
    notes: order ? draft.notes.trim() || null : undefined,
    lines: draft.lines.map((line) => ({ item: lineItemOf({ ...line, isNew: true }) as NonNullable<ReturnType<typeof lineItemOf>>, ...lineFields(line) })),
    payments: paymentsOf(draft, ctx.pockets).map((part) => ({ id: part.id, amount: toWire(part.amount), pocketId: part.pocketId })),
  };
}

// ── Carte de confirmation (06 E11 zone 3) ──────────────────────────────────────

export type Confirmation = {
  documentId: string;
  origin: "ORDER" | "DIRECT_SALE";
  title: string;
  total: MoneyString;
  paid: MoneyString;
  due: MoneyString;
  payments: { amount: MoneyString; pocketId: string | null; pocketName: string }[];
  customerName: string;
  /** De quoi partager le reçu ou le récap sans relire le serveur. */
  share: {
    customer: { fullName: string } | null;
    customerName: string | null;
    orderedAt: string;
    expectedDeliveryAt: string | null;
    expectedDeliveryHasTime: boolean;
    lines: { perfumeName: string; brandName: string | null; volumeMl: number | null; quantity: number; unitPriceEur: MoneyString; isGift: boolean }[];
  };
};

export function confirmationOf(draft: ComposerDraft, summary: DocumentSummary, ctx: ComposerContext, now: Date = new Date()): Confirmation {
  const plan = paymentsOf(draft, ctx.pockets);
  const name = customerDisplay(draft.customer);
  const paid = eurFromWire(summary.paid);
  const due = eurFromWire(summary.due);
  const expected = summary.origin === "ORDER" ? deliveryIso(draft.deliveryDay, draft.deliveryTime) : null;
  const hasTime = expected !== null && /^\d{2}:\d{2}$/.test(draft.deliveryTime);
  const title =
    summary.origin === "ORDER"
      ? join([
          `Commande de ${name}`,
          expected ? `livraison ${deliveryLabel(expected, hasTime, now)}` : null,
          eur.compare(paid, eur.zero) > 0 ? `acompte ${formatEur(paid)}` : null,
        ])
      : join([
          "Vente enregistrée",
          formatEur(eurFromWire(summary.total)),
          eur.compare(paid, eur.zero) > 0 ? (plan.length > 1 ? `${plan.length} poches` : plan[0]?.pocketName) : null,
          eur.compare(due, eur.zero) > 0 ? `${formatEur(due)} à encaisser` : null,
        ]);
  return {
    documentId: summary.id,
    origin: summary.origin,
    title: title ?? "",
    total: summary.total,
    paid: summary.paid,
    due: summary.due,
    payments: plan.map((part) => ({ amount: toWire(part.amount), pocketId: part.pocketId, pocketName: part.pocketName })),
    customerName: name,
    share: {
      customer: draft.customer.kind === "linked" ? { fullName: draft.customer.fullName } : null,
      customerName: draft.customer.kind === "passing" ? draft.customer.name.trim() || null : draft.customer.fullName,
      orderedAt: now.toISOString(),
      expectedDeliveryAt: expected,
      expectedDeliveryHasTime: hasTime,
      lines: draft.lines.map((line) => ({
        perfumeName: line.perfumeName,
        brandName: line.brandName,
        volumeMl: line.volumeMl,
        quantity: line.quantity,
        unitPriceEur: toWire(line.isGift ? eur.zero : (parseEurInput(line.price) ?? eur.zero)),
        isGift: line.isGift,
      })),
    },
  };
}

/** « d'Espèces », « de Banque » : l'élision devant une voyelle ou un h muet. */
export function fromPocket(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`;
}

/** Texte vrai de « Annuler la vente de 120 € ? » (06 S18) : ce qui sort de quelle poche, et le stock. */
export function cancelDescription(confirmation: Confirmation): string {
  const paid = formatEur(eurFromWire(confirmation.paid));
  const pockets = confirmation.payments.map((part) => part.pocketName);
  const where = pockets.length === 1 ? fromPocket(pockets[0] as string) : "de leurs poches";
  return [
    "Le document reste consultable, marqué annulé.",
    `Les ${paid} sont retirés ${where} aujourd'hui.`,
    confirmation.origin === "DIRECT_SALE" ? "Le stock est restitué." : null,
  ]
    .filter(Boolean)
    .join(" ");
}

// ── Ajouter des lignes ─────────────────────────────────────────────────────────

/** Contexte de pré-remplissage d'une ligne : sélecteur (tarifs, peut-être pas encore lu), récents, taux par défaut. */
export type LineSources = {
  perfumes: readonly PickerPerfume[] | null;
  recent: readonly RecentlySoldDTO[];
  defaultRate: string;
};

/** Retaper un parfum ajoute 1 à sa ligne (06 E11 zone 5 : « ×2 » sur la tuile). */
export function withPerfume(
  draft: ComposerDraft,
  perfume: { id: number; name: string; brandName: string; image: string },
  sources: LineSources,
  lineId: string = newId(),
): ComposerDraft {
  const existing = draft.lines.find((line) => line.perfumeId === perfume.id);
  if (existing) {
    return { ...draft, lines: draft.lines.map((line) => (line === existing ? { ...line, quantity: Math.min(line.quantity + 1, 999) } : line)) };
  }
  const recent = sources.recent.find((item) => item.perfumeId === perfume.id);
  const full = sources.perfumes?.find((candidate) => candidate.id === perfume.id);
  const line = newCatalogueLine(lineId, { ...perfume, pricing: full?.pricing }, {
    volumeMl: recent?.volumeMl ?? null,
    fallbackPrice: recent?.unitPriceEur ?? null,
    defaultRate: sources.defaultRate,
  });
  return { ...draft, lines: [...draft.lines, sources.perfumes ? line : { ...line, awaitingPricing: true }] };
}

export function withOffCatalogLine(draft: ComposerDraft, name: string, brandName: string | null, defaultRate: string, lineId: string = newId()): ComposerDraft {
  return { ...draft, lines: [...draft.lines, newOffCatalogLine(lineId, name, brandName, defaultRate)] };
}

/** Quantité de chaque parfum au ticket (« ×2 » sur la tuile, « Au ticket ×2 » dans S05). */
export function quantitiesByPerfume(lines: readonly LineDraft[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const line of lines) if (line.perfumeId !== null) map.set(line.perfumeId, (map.get(line.perfumeId) ?? 0) + line.quantity);
  return map;
}

// ── Paramètres d'URL (06 E11 « Paramètres d'URL », A-9) ────────────────────────

export type ComposerParams = { mode: ComposerMode | null; prefill: ComposerPrefillDTO | null };

/** Des paramètres à appliquer : sans eux, rien à consommer. */
export function hasParams(params: ComposerParams): boolean {
  const p = params.prefill;
  return params.mode !== null || (p !== null && (p.customer !== null || p.perfume !== null || p.source !== null));
}

/**
 * Applique les paramètres sur un brouillon neuf : `depuis` reprend lignes, client et lot encore ouvert (jamais
 * paiements, livraison ni notes) et le mode de son origine ; `client` pose la fiche ; `parfum` ajoute une ligne ;
 * `mode` l'emporte.
 */
export function applyParams(draft: ComposerDraft, params: ComposerParams, sources: LineSources): ComposerDraft {
  let next = draft;
  const source = params.prefill?.source ?? null;
  if (source) {
    next = {
      ...next,
      mode: source.origin === "ORDER" ? "commande" : "vente",
      customer: source.customer
        ? { kind: "linked", id: source.customer.id, fullName: source.customer.fullName, contact: source.customer.contact }
        : { kind: "passing", name: source.customerName ?? "", contact: source.customerContact ?? "" },
      batch: source.batch ? { kind: "chosen", id: source.batch.id, name: source.batch.name } : next.batch,
      lines: source.lines.map((line) => {
        const price = line.isGift ? "" : amountToInputText(eurFromWire(line.unitPriceEur));
        const base = line.perfumeId === null ? newOffCatalogLine(newId(), line.perfumeName, line.brandName) : newCatalogueLine(newId(), {
          id: line.perfumeId,
          name: line.perfumeName,
          brandName: line.brandName ?? "",
          image: line.imageUrl ?? "",
        });
        return {
          ...base,
          brandName: line.brandName,
          imageUrl: line.imageUrl,
          volumeMl: isVolumeMl(line.volumeMl) ? line.volumeMl : null,
          quantity: line.quantity,
          isGift: line.isGift,
          price,
          lastPrice: price || amountToInputText(eurFromWire(line.unitPriceEur)),
          cost: decimalText(line.unitCostDzd),
          rate: decimalText(line.exchangeRate ?? sources.defaultRate),
        };
      }),
    };
  }
  const customer = params.prefill?.customer ?? null;
  if (customer) next = { ...next, customer: { kind: "linked", id: customer.id, fullName: customer.fullName, contact: customer.contact } };
  const perfume = params.prefill?.perfume ?? null;
  if (perfume) next = withPerfume(next, perfume, sources);
  if (params.mode) next = withMode(next, params.mode);
  return next;
}

/** « 2 articles » (bandeau de reprise, « Vider le ticket ? »). */
export function articlesLabel(lines: readonly LineDraft[]): string {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} article${count > 1 ? "s" : ""}`;
}
