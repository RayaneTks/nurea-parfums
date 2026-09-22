/**
 * Libellés de la liste Commandes (06 E10) : sections, légendes de ligne, élément de droite. Purs et testés.
 */
import type { OrderFilter, OrderRowDTO, OrderSectionDTO, OrderView } from "@/contracts/documents";
import { eur, eurFromWire, formatEur } from "@/domain/money";
import { parseParisDayKey, periodLabel } from "@/domain/periods";
import { formatDate } from "@/ui/patterns/date-format";

const URGENCY_TITLES: Record<string, string> = {
  retard: "En retard",
  aujourdhui: "Aujourd'hui",
  demain: "Demain",
  semaine: "Cette semaine",
  "plus-tard": "Plus tard",
  "sans-date": "Sans date",
};

/** « En retard », « À encaisser », « septembre 2026 ». */
export function sectionTitle(section: Pick<OrderSectionDTO, "key" | "kind">): string {
  if (section.kind === "urgency") return URGENCY_TITLES[section.key] ?? section.key;
  if (section.kind === "receivable") return "À encaisser";
  const first = parseParisDayKey(`${section.key}-01`);
  if (!first) return section.key;
  const label = periodLabel("month", first);
  return label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1);
}

export const FILTER_LABELS: Record<OrderFilter, string> = {
  retard: "En retard",
  aujourdhui: "Aujourd'hui",
  demain: "Demain",
  "en-attente": "En attente",
  confirmees: "Confirmées",
};

/** « Client de passage » pour un document sans nom (06 §1.7). */
export const rowName = (row: Pick<OrderRowDTO, "customerName">) => (row.customerName?.trim() ? row.customerName : "Client de passage");

/**
 * Légende d'une ligne : « 2 articles · sam. 20 sept. » (+ « · 14 h 30 » si une heure a été fixée, + « · Livré 1/3 »
 * si partielle) ; livrées : « livrée jeu. 3 sept. » ; annulées : « 40 € encaissés conservés » quand il en reste.
 */
export function rowCaption(row: OrderRowDTO, view: OrderView, now: Date = new Date()): string {
  const articles = `${row.itemCount} article${row.itemCount > 1 ? "s" : ""}`;
  if (view === "a-livrer") {
    const parts = [articles];
    if (row.expectedDeliveryAt) {
      const date = new Date(row.expectedDeliveryAt);
      parts.push(formatDate(date, "day", now));
      if (row.expectedDeliveryHasTime) parts.push(formatDate(date, "time", now));
    }
    if (row.deliveredCount > 0 && row.deliveredCount < row.itemCount) parts.push(`Livré ${row.deliveredCount}/${row.itemCount}`);
    return parts.join(" · ");
  }
  if (view === "livrees") {
    return row.deliveredAt ? `${articles} · livrée ${formatDate(new Date(row.deliveredAt), "day", now)}` : articles;
  }
  const paid = eurFromWire(row.paid);
  if (eur.compare(paid, eur.zero) > 0) return `${formatEur(paid)} encaissés conservés`;
  return row.cancelledAt ? `${articles} · annulée ${formatDate(new Date(row.cancelledAt), "day", now)}` : articles;
}

/** Un seul élément à droite, par priorité (06 E10 zone 5) : « En attente », sinon « À encaisser », sinon rien. */
export function rowTrailing(row: OrderRowDTO, view: OrderView): "pending" | "due" | "total" | null {
  const due = eur.compare(eurFromWire(row.due), eur.zero) > 0;
  if (view === "a-livrer") return row.status === "PENDING" ? "pending" : due ? "due" : null;
  if (view === "livrees") return due ? "due" : "total";
  return "total";
}

export const hasDue = (row: Pick<OrderRowDTO, "due">) => eur.compare(eurFromWire(row.due), eur.zero) > 0;
