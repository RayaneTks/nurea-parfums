/**
 * Décisions d'écran de la Compta, vue Ventes (06 E03), pures et testées : noms des périodes, points du graphe,
 * légendes des lignes. Aucun chiffre n'est calculé ici : les montants arrivent de `src/server/chiffres`.
 */
import type { EncaisseSerieDTO, PeriodParam } from "@/contracts/chiffres";
import type { ComptaDocumentRowDTO } from "@/contracts/compta";
import { isEngaged } from "@/domain/document-status";
import { eur, eurFromWire } from "@/domain/money";
import { parisDayKey } from "@/domain/periods";
import { documentTitle } from "@/features/documents/components/document-model";
import type { BarPoint } from "@/ui/patterns/bar-chart-model";
import { formatDate } from "@/ui/patterns/date-format";

/** Chips du sélecteur de période (06 E03 zone 1), dans l'ordre. */
export const PERIOD_CHIPS: readonly { value: PeriodParam; label: string }[] = [
  { value: "jour", label: "Jour" },
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
  { value: "annee", label: "Année" },
  { value: "tout", label: "Tout" },
];

/** « Encaissé · septembre » (06 §1.7 : un chiffre de flux est toujours daté). */
export function datedLabel(figure: string, period: string): string {
  return `${figure} · ${period}`;
}

/** « 38,5 % » ; un pourcentage rond perd sa décimale nulle (« 39 % », comme la fiche document). */
export function percentLabel(percent: string | null): string | null {
  return percent === null ? null : `${percent.replace(/,0$/, "")} %`;
}

const words = (text: string, count: number) => text.split(" ").slice(0, count).join(" ");

/**
 * Libellé court d'un point du graphe : « lun. 14 » (par jour), « 14 sept. » (par semaine, premier jour du pas
 * dans la période), « sept. » (par mois ; « sept. 2025 » hors de l'année en cours).
 */
export function pointLabel(bucket: EncaisseSerieDTO["bucket"], from: string, now: Date = new Date()): string {
  const date = new Date(from);
  switch (bucket) {
    case "day":
      return words(formatDate(date, "day", now), 2);
    case "week":
      return words(formatDate(date, "short", now), 2);
    case "month": {
      const short = formatDate(date, "short", now).split(" ");
      const month = short[1] ?? "";
      return parisDayKey(date).slice(0, 4) === parisDayKey(now).slice(0, 4) ? month : `${month} ${parisDayKey(date).slice(0, 4)}`;
    }
    case "year":
      return parisDayKey(date).slice(0, 4);
    default: {
      const exhaustive: never = bucket;
      throw new Error(`Pas de graphe inconnu : ${exhaustive as string}`);
    }
  }
}

/** Points du graphe « Encaissé par … » : un par pas, vides compris (Σ = Encaissé de la période, 04 §6.2). */
export function seriesPoints(serie: EncaisseSerieDTO, now: Date = new Date()): BarPoint[] {
  return serie.points.map((point) => ({ label: pointLabel(serie.bucket, point.from, now), value: point.encaisse }));
}

/** Un graphe dont tous les points sont nuls ne raconte rien de plus que « Aucune vente » : il ne s'affiche pas. */
export function seriesHasSignal(points: readonly BarPoint[]): boolean {
  return points.some((point) => !eur.isZero(eurFromWire(point.value)));
}

/** « Vente du 3 sept. · 2 articles » ; « · En attente » ou « · Annulée » quand l'état sort du cours normal. */
export function documentCaption(row: Pick<ComptaDocumentRowDTO, "origin" | "orderedAt" | "itemCount" | "status">, now: Date = new Date()): string {
  const articles = `${row.itemCount} article${row.itemCount > 1 ? "s" : ""}`;
  const state = row.status === "PENDING" ? "En attente" : row.status === "CANCELLED" ? "Annulée" : null;
  return [documentTitle(row.origin, row.orderedAt, now), articles, state].filter(Boolean).join(" · ");
}

/** À droite de la ligne : « À encaisser » (warning) d'un document engagé à dû, sinon son « Total ». */
export function documentTrailing(row: Pick<ComptaDocumentRowDTO, "status" | "due" | "total">): { kind: "due" | "total"; value: ComptaDocumentRowDTO["due"] } {
  return isEngaged(row.status) && eur.compare(eurFromWire(row.due), eur.zero) > 0
    ? { kind: "due", value: row.due }
    : { kind: "total", value: row.total };
}

/** Au-delà de 6 documents, la recherche est visible (06 E03 zone 4). */
export const SEARCH_THRESHOLD = 6;
