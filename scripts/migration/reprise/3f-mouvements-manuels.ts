/**
 * 3f — Mouvements manuels et écarts historiques (docs/refonte/03-MODELE-DONNEES.md §7.6).
 *
 * Tout mouvement historique que 3d et 3e n'ont pas classé :
 * - origine `Sale`, `PaymentTransaction` ou `BatchExpense` disparue (commande purgée, vente ou lot
 *   supprimés) → écart « origine supprimée » ;
 * - TRANSFER d'un groupe à exactement deux jambes de somme nulle → TRANSFER ; sinon écart
 *   « transfert incomplet » (`transferGroupId` à NULL) ;
 * - ADJUSTMENT → ADJUSTMENT ; OPENING → ADJUSTMENT libellé « Ouverture » ;
 * - SUPPLIER_OUT négatif → SUPPLIER (`refType = 'Batch'` abandonné) ; positif → écart ;
 * - toute autre nature d'encaissement ou de dépense sans origine reconnue → écart « origine introuvable ».
 * Montant, poche et date ne changent jamais. Puis chaque mouvement historique est inscrit dans
 * `legacy."MigrationMap"` avec sa catégorie (V5 : exactement une catégorie par mouvement).
 */
import {
  ECART,
  centimes,
  classer,
  classerEcart,
  ecrireEnAttente,
  inscrireCorrespondances,
  relabelliser,
  type Contexte,
  type MouvementHistorique,
} from "./contexte";

const ORIGINES_PIECES = new Set(["Sale", "PaymentTransaction", "BatchExpense"]);

export async function etape3fMouvementsManuels(ctx: Contexte): Promise<void> {
  const restants = [...ctx.historiques.values()]
    .filter((m) => !ctx.classements.has(m.id))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const groupes = new Map<string, MouvementHistorique[]>();
  for (const m of restants) {
    if (m.kind === "TRANSFER" && m.transferGroupId && !ORIGINES_PIECES.has(m.refType ?? "")) {
      groupes.set(m.transferGroupId, [...(groupes.get(m.transferGroupId) ?? []), m]);
    }
  }
  const groupeValide = (m: MouvementHistorique) => {
    const jambes = m.transferGroupId ? groupes.get(m.transferGroupId) ?? [] : [];
    return jambes.length === 2 && jambes.reduce((acc, j) => acc + centimes(j.montant), 0n) === 0n;
  };

  for (const m of restants) {
    if (ORIGINES_PIECES.has(m.refType ?? "")) {
      classerEcart(ctx, m, ECART.origineSupprimee);
    } else if (m.kind === "TRANSFER") {
      if (groupeValide(m)) classer(ctx, m, "manuel", "transfert", "TRANSFER");
      else classerEcart(ctx, m, ECART.transfertIncomplet);
    } else if (m.kind === "ADJUSTMENT") {
      classer(ctx, m, "manuel", "ajustement", "ADJUSTMENT");
    } else if (m.kind === "OPENING") {
      classer(ctx, m, "manuel", "ouverture", "ADJUSTMENT");
      if (!m.label || m.label.trim() === "") relabelliser(ctx, m, "Ouverture");
    } else if (m.kind === "SUPPLIER_OUT") {
      if (centimes(m.montant) < 0n) classer(ctx, m, "manuel", "paiement fournisseur", "SUPPLIER");
      else classerEcart(ctx, m, ECART.fournisseurSigne);
    } else {
      classerEcart(ctx, m, ECART.origineIntrouvable);
    }
  }

  await ecrireEnAttente(ctx);

  const nonClasses = [...ctx.historiques.keys()].filter((id) => !ctx.classements.has(id));
  if (nonClasses.length > 0) throw new Error(`3f : mouvements sans catégorie : ${nonClasses.join(", ")}.`);

  await inscrireCorrespondances(
    ctx.tx,
    [...ctx.classements.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([id, c]) => ({ oldTable: "CashMovement", oldId: id, newTable: "CashMovement", newId: id, note: `${c.categorie} : ${c.motif}` })),
  );
}
