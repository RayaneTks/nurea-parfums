import "server-only";

/**
 * LA raison d'un refus de suppression de lot, écrite une fois (06 E06, 02 §4.4) : le writer la lève à
 * l'écriture, la fiche l'affiche sur son entrée désactivée. Deux textes différents pour la même règle,
 * c'est l'écran qui promet ce que le serveur refuse — ou l'inverse (01 §4.4).
 *
 * Module pur : ni Prisma, ni Next. Le writer le garde comme voisin, pas comme dépendance d'écriture.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export type BatchDeletionCounts = {
  /** Documents rattachés, annulés compris. */
  documents: number;
  /** Dépenses jamais effacées de l'histoire du lot, contre-passées comprises. */
  expenses: number;
  /** Dépenses encore vivantes (mouvement non contre-passé). */
  activeExpenses: number;
};

/** Pourquoi un lot ne se supprime pas, ou `null` s'il est vide de toute histoire. */
export function batchDeletionRefusal(counts: BatchDeletionCounts): string | null {
  const { documents, expenses, activeExpenses } = counts;
  if (documents > 0 && activeExpenses > 0) {
    return `Impossible : ${plural(documents, "document", "documents")} et ${plural(activeExpenses, "dépense", "dépenses")} rattachés. Clôture-le plutôt.`;
  }
  if (documents > 0) {
    return `Impossible : ${plural(documents, "document rattaché", "documents rattachés")}. Clôture-le plutôt.`;
  }
  if (activeExpenses > 0) {
    return `Impossible : ${plural(activeExpenses, "dépense rattachée", "dépenses rattachées")}. Clôture-le plutôt.`;
  }
  if (expenses > 0) return "Impossible : ce lot a un historique de dépenses. Clôture-le plutôt.";
  return null;
}
