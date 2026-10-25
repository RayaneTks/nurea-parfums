import type { SupplierEntrySummary } from "@/contracts/supplier";
import { dzd, dzdFromDb, dzdToEur, formatDzd, formatEur, formatRate, type Dzd, type Rate } from "@/domain/money";
import { supplierBalanceState, type SupplierBalanceState, type SupplierEntryKind } from "@/domain/supplier-debt";

/** Le texte « ≈ 334,65 € » d'un montant en dinars, relu au taux affiché à l'écran. */
export function eurReading(amountDzd: Dzd, rate: Rate): string {
  return `≈ ${formatEur(dzdToEur(amountDzd, rate))}`;
}

/** « 277 DA pour 1 € » : le taux du carnet, dit en toutes lettres. */
export function rateLabel(rate: Rate): string {
  return `${formatRate(rate)} DA pour 1 €`;
}

/**
 * Reste à payer tel que l'écran le montre : celui du serveur, moins les lignes dont la suppression est en
 * cours (le filet « Annuler » de 5 s). Une dette masquée baisse le reste, un versement masqué le relève.
 */
export function remainingWithout(
  remainingDzd: string,
  entries: readonly Pick<SupplierEntrySummary, "id" | "kind" | "amountDzd">[],
  hidden: ReadonlySet<string>,
): Dzd {
  let remaining = dzdFromDb(remainingDzd);
  for (const entry of entries) {
    if (!hidden.has(entry.id)) continue;
    const amount = dzdFromDb(entry.amountDzd);
    remaining = entry.kind === "DEBT" ? dzd.sub(remaining, amount) : dzd.sum([remaining, amount]);
  }
  return remaining;
}

export type BalanceHeadline = { state: SupplierBalanceState; amount: string; caption: string };

/** « 48 300 DA » / « Rien à payer » / « Avance de 500 DA » : jamais un reste négatif brut. */
export function balanceHeadline(remaining: Dzd): BalanceHeadline {
  const state = supplierBalanceState(remaining);
  if (state === "settled") return { state, amount: "Rien à payer", caption: "" };
  if (state === "advance") {
    const advance = dzd.sub(dzd.zero, remaining);
    return { state, amount: `Avance de ${formatDzd(advance)}`, caption: "Tu as versé plus que ce que tu dois." };
  }
  return { state, amount: formatDzd(remaining), caption: "Reste à payer" };
}

/** Le montant d'une ligne, avec son sens dans le texte : « + 92 700 DA » (dette), « − 40 000 DA » (versement). */
export function entryAmountText(kind: SupplierEntryKind, amountDzd: string): string {
  return `${kind === "DEBT" ? "+" : "−"} ${formatDzd(dzdFromDb(amountDzd))}`;
}

export function entryKindLabel(kind: SupplierEntryKind): string {
  return kind === "DEBT" ? "Dette" : "Versement";
}

/** Le nom de la ligne ; à défaut, son sens (« Dette », « Versement », « Remboursement »). */
export function entryTitle(entry: Pick<SupplierEntrySummary, "kind" | "label"> & { settlesEntryId?: string | null }): string {
  return entry.label?.trim() || (entry.settlesEntryId ? "Remboursement" : entryKindLabel(entry.kind));
}

/** Sous le nom, dans le carnet : « Dette », « Dette remboursée », « Versement » ou « Remboursement ». */
export function entryCaption(entry: Pick<SupplierEntrySummary, "kind" | "settlesEntryId" | "settledBy">): string {
  if (entry.settledBy) return "Dette remboursée";
  if (entry.settlesEntryId) return "Remboursement";
  return entryKindLabel(entry.kind);
}

/** Montant de base → texte de champ : « 92700.00 » devient « 92700 », « 92700.50 » devient « 92700,50 ». */
export function dzdInputText(stored: string): string {
  return stored.replace(/\.00$/, "").replace(".", ",");
}
