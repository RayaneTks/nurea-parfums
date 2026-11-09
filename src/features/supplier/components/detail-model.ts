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
 * Seul ce qui reste dû est listé, et l'addition finale vaut le Reste à payer de l'en-tête. Les versements
 * paient déjà les dettes de la plus ancienne à la plus récente (`allocateSupplierPayments`) ; dans une dette
 * entamée, ce qu'elle a reçu paie ses parfums dans l'ordre de la liste : les parfums payés disparaissent, celui
 * qui est payé en partie montre son reste (« reste 2000DA (sur 4000DA) »), les suivants restent entiers.
 * Rien n'est inventé :
 * - une dette notée à la main n'a aucun parfum : elle va sous « Autres », avec son nom et ce qu'il en reste ;
 * - une ligne sans coût est montrée « coût manquant » et compte 0 ;
 * - quand les coûts relus aujourd'hui ne font pas le montant noté (coût corrigé depuis, montant retouché),
 *   l'écart va sous « Autres », payé en dernier ; un écart négatif (dette notée en dessous) compte comme déjà
 *   payé, en premier. Le total reste celui du carnet.
 */

export type DetailLine = {
  label: string;
  quantity: number;
  /** Ce qu'il reste à payer sur ce parfum ; null : coût manquant. */
  amount: Dzd | null;
  /** Le coût entier, quand le parfum est payé en partie ; null sinon. */
  partialOf: Dzd | null;
  cancelled: boolean;
};

export type DetailGroup = { key: string; customer: string; lines: DetailLine[] };

export type DetailOther = { label: string; amount: Dzd; partialOf: Dzd | null };

export type SupplierDetail = {
  groups: DetailGroup[];
  others: DetailOther[];
  /** Chaque montant dans l'ordre du texte : ce que la ligne « 2500+1400 = … » additionne. */
  terms: Dzd[];
  /** Σ des restes : le Reste à payer. */
  total: Dzd;
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

/** Ce qu'un versement laisse sur un montant : le reste, et le crédit qu'il n'a pas pris. */
function pay(amount: Dzd, credit: Dzd): { due: Dzd; credit: Dzd } {
  const covered = dzd.min(amount, credit);
  return { due: dzd.sub(amount, covered), credit: dzd.sub(credit, covered) };
}

const positive = (amount: Dzd) => dzd.compare(amount, dzd.zero) > 0;

/** `oldestFirst` : les dettes à détailler, de la plus ancienne à la plus récente. */
export function supplierDetail(oldestFirst: readonly SupplierDetailDebtDTO[], allocation: SupplierAllocation): SupplierDetail {
  const groups = new Map<string, DetailGroup>();
  const others: DetailOther[] = [];
  let missingCosts = 0;

  for (const debt of oldestFirst) {
    const amount = dzdFromDb(debt.amountDzd);
    let credit = allocation.debts.get(debt.id)?.paid ?? dzd.zero;

    if (!debt.hasItems) {
      const { due } = pay(amount, credit);
      if (positive(due)) {
        const label = debt.label?.trim() || `Dette du ${formatDate(new Date(debt.occurredAt), "short")}`;
        others.push({ label, amount: due, partialOf: dzd.compare(due, amount) < 0 ? amount : null });
      }
      continue;
    }

    const costs = debt.lines.map((line) => (line.unitCostDzd === null ? null : dzd.times(dzdFromDb(line.unitCostDzd), line.quantity)));
    const gap = dzd.sub(amount, dzd.sum(costs.filter((cost): cost is Dzd => cost !== null)));
    // Dette notée en dessous des coûts : la différence est comme déjà payée.
    if (dzd.compare(gap, dzd.zero) < 0) credit = dzd.sum([credit, dzd.sub(dzd.zero, gap)]);

    debt.lines.forEach((line, index) => {
      const cost = costs[index] ?? null;
      let due: Dzd | null = null;
      if (cost !== null) {
        ({ due, credit } = pay(cost, credit));
        if (!positive(due) && positive(cost)) return; // déjà payé
      } else {
        missingCosts += 1;
      }
      const name = line.customerName?.trim() ?? "";
      // Deux clients de passage ne se rejoignent pas : sans nom, rien ne dit que c'est la même personne.
      const key = name ? `nom:${normalized(name)}` : `doc:${line.documentId}`;
      const group = groups.get(key) ?? { key, customer: name || PASSING_CUSTOMER, lines: [] };
      groups.set(key, group);
      group.lines.push({
        label: detailLineLabel(line),
        quantity: line.quantity,
        amount: due,
        partialOf: cost !== null && due !== null && dzd.compare(due, cost) < 0 ? cost : null,
        cancelled: line.cancelled,
      });
    });

    if (positive(gap)) {
      const { due } = pay(gap, credit);
      if (positive(due)) others.push({ label: `Écart sur ${debtName(debt)}`, amount: due, partialOf: dzd.compare(due, gap) < 0 ? gap : null });
    }
  }

  const list = [...groups.values()];
  const terms = [
    ...list.flatMap((group) => group.lines.flatMap((line) => (line.amount && positive(line.amount) ? [line.amount] : []))),
    ...others.map((other) => other.amount),
  ];
  return { groups: list, others, terms, total: dzd.sum(terms), missingCosts };
}

/** « 2500DA », ou « reste 2000DA (sur 4000DA) » pour un parfum payé en partie. */
function dueText(amount: Dzd, partialOf: Dzd | null): string {
  return partialOf ? `reste ${plainDzd(amount)}DA (sur ${plainDzd(partialOf)}DA)` : `${plainDzd(amount)}DA`;
}

/** « - The One D&G 80ML x2 2800DA » ; « coût manquant » quand le coût n'est pas saisi. */
function lineText(line: DetailLine): string {
  const quantity = line.quantity > 1 ? ` x${line.quantity}` : "";
  const amount = line.amount ? ` ${dueText(line.amount, line.partialOf)}` : " (coût manquant)";
  return `- ${line.label}${quantity}${amount}${line.cancelled ? " (commande annulée)" : ""}`;
}

/** « 2500+1400+2000 » : les montants à la suite. */
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
 *   Lina
 *   - Rouge Trafalgar 80ML reste 2000DA (sur 4000DA)
 *
 *   2500+1400+2000 = 5900 DA
 */
export function detailMessage(detail: SupplierDetail): string {
  const blocks = detail.groups.map((group) => [group.customer, ...group.lines.map(lineText)].join("\n"));
  if (detail.others.length > 0) {
    blocks.push(["Autres", ...detail.others.map((other) => `- ${other.label} ${dueText(other.amount, other.partialOf)}`)].join("\n"));
  }
  blocks.push(`${detail.terms.length > 0 ? sumText(detail.terms) : "0"} = ${plainDzd(detail.total)} DA`);
  return blocks.join("\n\n");
}

/** Les dettes qui ont encore un reste, d'après la répartition des versements de l'écran. */
export function openDebtIds(allocation: SupplierAllocation): string[] {
  return [...allocation.debts].filter(([, owed]) => dzd.compare(owed.remaining, dzd.zero) > 0).map(([id]) => id);
}
