/**
 * E06 — deux lectures des lignes d'un lot, pures et testées :
 *
 * - **la liste du fournisseur** : ce qu'on lui fait préparer, client par client — parfum, marque,
 *   contenance, quantité. Jamais un prix : le message part tel quel chez lui ;
 * - **l'achat en dinars** : la tuile « Achat des parfums » relue dans la monnaie où elle a été payée,
 *   taux par taux. Même périmètre que la tuile (documents engagés), donc la même somme en euros.
 */
import type { BatchLineDTO } from "@/contracts/batches";
import {
  dzd,
  dzdFromDb,
  eur,
  eurFromWire,
  formatDzd,
  formatEur,
  formatRate,
  rateFromDb,
  sameRate,
  type Dzd,
  type Eur,
  type Rate,
} from "@/domain/money";
import { PASSING_CUSTOMER } from "@/features/documents/components/document-model";

// ── Liste du fournisseur ───────────────────────────────────────────────────────

/** Un parfum à préparer pour un client : les lignes identiques (parfum, marque, contenance) fusionnent. */
export type SupplierItem = {
  key: string;
  perfumeName: string;
  brandName: string | null;
  volumeMl: number | null;
  quantity: number;
  /** Tout est déjà remis au client : décoché d'office, on ne le refait pas préparer. */
  delivered: boolean;
};

export type SupplierGroup = { key: string; customer: string; items: SupplierItem[] };

const normalized = (text: string | null) => (text ?? "").trim().toLowerCase();

/**
 * Les lignes groupées par client, dans l'ordre des demandes. Deux documents d'un même nom se rejoignent ;
 * deux clients de passage, non : sans nom, rien ne dit que c'est la même personne.
 */
export function supplierGroups(lines: readonly BatchLineDTO[]): SupplierGroup[] {
  const groups = new Map<string, SupplierGroup>();
  for (const line of lines) {
    const name = line.customerName?.trim() ?? "";
    const groupKey = name ? `nom:${normalized(name)}` : `doc:${line.documentId}`;
    const group = groups.get(groupKey) ?? { key: groupKey, customer: name || PASSING_CUSTOMER, items: [] };
    groups.set(groupKey, group);

    const delivered = line.deliveredQuantity >= line.quantity;
    const itemKey = [normalized(line.perfumeName), normalized(line.brandName), line.volumeMl ?? "", delivered].join("|");
    const item = group.items.find((candidate) => candidate.key === itemKey);
    if (item) {
      item.quantity += line.quantity;
    } else {
      group.items.push({
        key: itemKey,
        perfumeName: line.perfumeName,
        brandName: line.brandName,
        volumeMl: line.volumeMl,
        quantity: line.quantity,
        delivered,
      });
    }
  }
  return [...groups.values()];
}

/** « Sauvage · Dior · 80 ml » — la contenance omise quand elle n'est pas connue. */
export function supplierItemLabel(item: Pick<SupplierItem, "perfumeName" | "brandName" | "volumeMl">): string {
  return [item.perfumeName, item.brandName?.trim() || null, item.volumeMl ? `${item.volumeMl} ml` : null].filter(Boolean).join(" · ");
}

/** Clé de sélection d'un parfum dans un groupe (un même parfum chez deux clients se coche à part). */
export const selectionKey = (group: Pick<SupplierGroup, "key">, item: Pick<SupplierItem, "key">) => `${group.key}::${item.key}`;

/** Sélection de départ : tout ce qui n'est pas déjà remis au client. */
export function initialSelection(groups: readonly SupplierGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.filter((item) => !item.delivered).map((item) => selectionKey(group, item))));
}

/** Toutes les clés de sélection : « Tout cocher ». */
export function allSelection(groups: readonly SupplierGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => selectionKey(group, item))));
}

/** « 12 flacons · 5 clients » pour la sélection. */
export function supplierCount(groups: readonly SupplierGroup[], selected: ReadonlySet<string>): { bottles: number; customers: number } {
  let bottles = 0;
  let customers = 0;
  for (const group of groups) {
    const chosen = group.items.filter((item) => selected.has(selectionKey(group, item)));
    if (chosen.length === 0) continue;
    customers += 1;
    bottles += chosen.reduce((sum, item) => sum + item.quantity, 0);
  }
  return { bottles, customers };
}

export function supplierCountLabel(count: { bottles: number; customers: number }): string {
  const bottles = `${count.bottles} flacon${count.bottles > 1 ? "s" : ""}`;
  const customers = `${count.customers} client${count.customers > 1 ? "s" : ""}`;
  return `${bottles} · ${customers}`;
}

/**
 * Le message envoyé au fournisseur : un bloc par client, un parfum par ligne, sans aucun prix.
 *
 *   Lot « Commande de mars » — 4 flacons · 2 clients
 *
 *   Fares Benali
 *   - Sauvage · Dior · 80 ml
 *   - Libre · Yves Saint Laurent · 50 ml ×2
 */
export function supplierMessage(batchName: string, groups: readonly SupplierGroup[], selected: ReadonlySet<string>): string {
  const blocks: string[] = [];
  for (const group of groups) {
    const chosen = group.items.filter((item) => selected.has(selectionKey(group, item)));
    if (chosen.length === 0) continue;
    const rows = chosen.map((item) => `- ${supplierItemLabel(item)}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`);
    blocks.push([group.customer, ...rows].join("\n"));
  }
  const header = `Lot « ${batchName} » — ${supplierCountLabel(supplierCount(groups, selected))}`;
  return [header, ...blocks].join("\n\n");
}

// ── Achat en dinars ────────────────────────────────────────────────────────────

/** Ce qui compte dans la tuile « Achat des parfums » : les documents engagés (03 §5.4). */
const engaged = (line: BatchLineDTO) => line.status === "CONFIRMED" || line.status === "DELIVERED";

export type PurchaseLine = {
  id: string;
  label: string;
  customer: string;
  quantity: number;
  unitDzd: Dzd;
  rate: Rate;
  totalDzd: Dzd;
  totalEur: Eur;
};

export type PurchaseRate = { rate: Rate; dzd: Dzd; eur: Eur };

export type PurchaseDetail = {
  /** Σ quantité × coût en euros figé : la tuile, au centime. */
  totalEur: Eur;
  totalDzd: Dzd;
  /** Un groupe par taux pratiqué, le plus lourd d'abord. */
  rates: PurchaseRate[];
  lines: PurchaseLine[];
  /** Lignes engagées sans achat renseigné, comptées 0 € (comme la tuile). */
  unknown: number;
};

export function purchaseDetail(lines: readonly BatchLineDTO[]): PurchaseDetail {
  const rows: PurchaseLine[] = [];
  let unknown = 0;
  for (const line of lines.filter(engaged)) {
    if (line.unitCostDzd === null || line.exchangeRate === null || line.unitCostEur === null) {
      unknown += 1;
      continue;
    }
    const unitDzd = dzdFromDb(line.unitCostDzd);
    rows.push({
      id: line.id,
      label: supplierItemLabel(line),
      customer: line.customerName?.trim() || PASSING_CUSTOMER,
      quantity: line.quantity,
      unitDzd,
      rate: rateFromDb(line.exchangeRate),
      totalDzd: dzd.times(unitDzd, line.quantity),
      totalEur: eur.times(eurFromWire(line.unitCostEur), line.quantity),
    });
  }

  const rates: PurchaseRate[] = [];
  for (const row of rows) {
    const group = rates.find((candidate) => sameRate(candidate.rate, row.rate));
    if (group) {
      group.dzd = dzd.sum([group.dzd, row.totalDzd]);
      group.eur = eur.add(group.eur, row.totalEur);
    } else {
      rates.push({ rate: row.rate, dzd: row.totalDzd, eur: row.totalEur });
    }
  }
  rates.sort((a, b) => eur.compare(b.eur, a.eur));

  return {
    totalEur: eur.sum(rows.map((row) => row.totalEur)),
    totalDzd: dzd.sum(rows.map((row) => row.totalDzd)),
    rates,
    lines: rows,
    unknown,
  };
}

/** « 185 000 DA au taux 277 = 667,87 € ». */
export function rateLine(group: PurchaseRate): string {
  return `${formatDzd(group.dzd)} au taux ${formatRate(group.rate)} = ${formatEur(group.eur)}`;
}

/** « 2 × 22 000 DA · taux 277 · Fares Benali ». */
export function purchaseLineCaption(line: PurchaseLine): string {
  const unit = line.quantity > 1 ? `${line.quantity} × ${formatDzd(line.unitDzd)}` : formatDzd(line.unitDzd);
  return `${unit} · taux ${formatRate(line.rate)} · ${line.customer}`;
}
