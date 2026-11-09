import type { SupplierDetailDebtDTO } from "@/contracts/supplier";
import { dzd, dzdFromDb, toDb, type Dzd } from "@/domain/money";
import type { SupplierAllocation } from "@/domain/supplier-debt";
import { PASSING_CUSTOMER } from "@/features/documents/components/document-model";
import { formatDate } from "@/ui/patterns/date-format";
import { dzdInputText } from "./supplier-model";

/**
 * « Détail du reste à payer » (gérant, 09/11/2026) : ce qu'on doit encore au fournisseur, parfum par parfum,
 * rangé par client, pour comparer avec ses comptes à lui. Pur et testé.
 *
 * Périmètre : les dettes qui ont encore un reste, entamées comprises, **en entier**. Le total des lignes vaut
 * donc la somme de ces dettes ; « Déjà versé » (la part que les versements ont déjà payée sur elles) le ramène
 * au Reste à payer de l'en-tête. Rien n'est inventé :
 * - une dette notée à la main n'a aucun parfum : elle va sous « Autres », avec son nom et son montant ;
 * - une ligne sans coût est montrée « coût manquant » et compte 0 ;
 * - quand les coûts relus aujourd'hui ne font pas le montant noté (coût corrigé depuis, montant retouché),
 *   l'écart va sous « Autres », signé : le total reste celui du carnet.
 */

export type DetailLine = {
  label: string;
  quantity: number;
  /** Quantité × coût unitaire ; null : coût manquant. */
  amount: Dzd | null;
  cancelled: boolean;
};

export type DetailGroup = { key: string; customer: string; lines: DetailLine[] };

export type DetailOther = { label: string; amount: Dzd };

export type SupplierDetail = {
  groups: DetailGroup[];
  others: DetailOther[];
  /** Chaque montant dans l'ordre du texte : ce que la ligne « 2500+1400 = … » additionne. */
  terms: Dzd[];
  total: Dzd;
  /** Ce que les versements ont déjà payé sur ces dettes. */
  paid: Dzd;
  remaining: Dzd;
  missingCosts: number;
};

const normalized = (text: string) => text.trim().toLowerCase();

/** « L'Heure Bleue GUERLAIN 80ML » : parfum, marque en capitales, contenance, comme dans les notes du gérant. */
export function detailLineLabel(line: { perfumeName: string; brandName: string | null; volumeMl: number | null }): string {
  return [line.perfumeName.trim(), line.brandName?.trim().toUpperCase() || null, line.volumeMl ? `${line.volumeMl}ML` : null]
    .filter(Boolean)
    .join(" ");
}

/** « 2500 », « 2500,50 », « -300 » : un montant sans espace ni unité, pour l'addition. */
export function plainDzd(amount: Dzd): string {
  return dzdInputText(toDb(amount));
}

/** « Lot d'octobre », à défaut « dette du 3 nov. ». */
function debtName(debt: Pick<SupplierDetailDebtDTO, "label" | "occurredAt">): string {
  return debt.label?.trim() || `dette du ${formatDate(new Date(debt.occurredAt), "short")}`;
}

/** `oldestFirst` : les dettes à détailler, de la plus ancienne à la plus récente. */
export function supplierDetail(oldestFirst: readonly SupplierDetailDebtDTO[], allocation: SupplierAllocation): SupplierDetail {
  const groups = new Map<string, DetailGroup>();
  const others: DetailOther[] = [];
  let missingCosts = 0;
  const paid: Dzd[] = [];

  for (const debt of oldestFirst) {
    const amount = dzdFromDb(debt.amountDzd);
    paid.push(allocation.debts.get(debt.id)?.paid ?? dzd.zero);

    if (!debt.hasItems) {
      others.push({ label: debt.label?.trim() || `Dette du ${formatDate(new Date(debt.occurredAt), "short")}`, amount });
      continue;
    }

    const counted: Dzd[] = [];
    for (const line of debt.lines) {
      const name = line.customerName?.trim() ?? "";
      // Deux clients de passage ne se rejoignent pas : sans nom, rien ne dit que c'est la même personne.
      const key = name ? `nom:${normalized(name)}` : `doc:${line.documentId}`;
      const group = groups.get(key) ?? { key, customer: name || PASSING_CUSTOMER, lines: [] };
      groups.set(key, group);
      const lineAmount = line.unitCostDzd === null ? null : dzd.times(dzdFromDb(line.unitCostDzd), line.quantity);
      if (lineAmount === null) missingCosts += 1;
      else counted.push(lineAmount);
      group.lines.push({ label: detailLineLabel(line), quantity: line.quantity, amount: lineAmount, cancelled: line.cancelled });
    }

    const gap = dzd.sub(amount, dzd.sum(counted));
    if (dzd.compare(gap, dzd.zero) !== 0) others.push({ label: `Écart sur ${debtName(debt)}`, amount: gap });
  }

  const list = [...groups.values()];
  const terms = [
    ...list.flatMap((group) => group.lines.flatMap((line) => (line.amount ? [line.amount] : []))),
    ...others.map((other) => other.amount),
  ];
  const total = dzd.sum(oldestFirst.map((debt) => dzdFromDb(debt.amountDzd)));
  const paidSum = dzd.sum(paid);
  return { groups: list, others, terms, total, paid: paidSum, remaining: dzd.sub(total, paidSum), missingCosts };
}

/** « - The One D&G 80ML x2 2800DA » ; « coût manquant » quand le coût n'est pas saisi. */
function lineText(line: DetailLine): string {
  const quantity = line.quantity > 1 ? ` x${line.quantity}` : "";
  const amount = line.amount ? ` ${plainDzd(line.amount)}DA` : " (coût manquant)";
  return `- ${line.label}${quantity}${amount}${line.cancelled ? " (commande annulée)" : ""}`;
}

/** « 2500+1400-300 » : les montants à la suite, le signe d'un écart négatif gardé. */
export function sumText(terms: readonly Dzd[]): string {
  return terms
    .map((term, index) => {
      const text = plainDzd(term);
      return index === 0 || text.startsWith("-") ? text : `+${text}`;
    })
    .join("");
}

/**
 * Le texte copié pour le fournisseur :
 *
 *   Kais
 *   - L'Heure Bleue GUERLAIN 80ML 2500DA
 *
 *   Badis
 *   - The One D&G 80ML 1400DA
 *
 *   2500+1400 = 3900 DA
 *   Déjà versé : 1000 DA
 *   Reste à payer : 2900 DA
 */
export function detailMessage(detail: SupplierDetail): string {
  const blocks = detail.groups.map((group) => [group.customer, ...group.lines.map(lineText)].join("\n"));
  if (detail.others.length > 0) {
    blocks.push(["Autres", ...detail.others.map((other) => `- ${other.label} ${plainDzd(other.amount)}DA`)].join("\n"));
  }
  const totals = [`${detail.terms.length > 0 ? sumText(detail.terms) : "0"} = ${plainDzd(detail.total)} DA`];
  if (dzd.compare(detail.paid, dzd.zero) > 0) {
    totals.push(`Déjà versé : ${plainDzd(detail.paid)} DA`, `Reste à payer : ${plainDzd(detail.remaining)} DA`);
  }
  return [...blocks, totals.join("\n")].join("\n\n");
}

/** Les dettes qui ont encore un reste, d'après la répartition des versements de l'écran. */
export function openDebtIds(allocation: SupplierAllocation): string[] {
  return [...allocation.debts].filter(([, owed]) => dzd.compare(owed.remaining, dzd.zero) > 0).map(([id]) => id);
}
