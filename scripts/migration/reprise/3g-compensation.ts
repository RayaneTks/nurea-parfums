/**
 * 3g — Compensation par poche (docs/refonte/03-MODELE-DONNEES.md §7.6).
 *
 * Les créations de la reprise (paiements sans mouvement, contre-passations, encaissements de reprise,
 * dépenses sans mouvement ou remplacées) changent le solde de leur poche ; les écarts historiques et les
 * scissions, non. Pour chaque poche, un ADJUSTMENT « Reprise migration — compensation (voir rapport) »,
 * daté de l'instant de la reprise, annule exactement la somme de ces créations, décomposée par motif.
 *
 * Choix J2 (documenté en 03 §7.6) : la compensation vaut −(Σ créations expliquées) et non
 * −(solde recalculé − référence). Les deux sont égaux quand la référence décrit la base ; sinon la
 * différence n'est PAS absorbée : V1 échoue et la reprise est annulée (un écart d'un centime entre la
 * référence et la base — écriture depuis le gel, référence d'une autre base — ne se compense jamais).
 */
import { centimes, euros } from "../lib/argent";
import { soldesFaceReference } from "../lib/controles";
import { LIBELLE_COMPENSATION, creerMouvement, ecrireEnAttente, type Contexte } from "./contexte";

export async function etape3gCompensation(ctx: Contexte): Promise<void> {
  const parPoche = new Map<string, Map<string, bigint>>();
  for (const creation of ctx.creations) {
    if (creation.motifCompensation === null) continue;
    const motifs = parPoche.get(creation.pocketId) ?? new Map<string, bigint>();
    motifs.set(creation.motifCompensation, (motifs.get(creation.motifCompensation) ?? 0n) + centimes(creation.montant));
    parPoche.set(creation.pocketId, motifs);
  }

  const soldes = await soldesFaceReference(ctx.tx, ctx.reference);
  for (const solde of soldes) {
    const motifs = parPoche.get(solde.id);
    if (!motifs || solde.actuel === null) continue;
    const explique = [...motifs.values()].reduce((acc, v) => acc + v, 0n);
    if (explique === 0n) continue;
    const montant = -explique;
    creerMouvement(ctx, {
      id: `mig-compensation-${solde.id}`,
      pocketId: solde.id,
      montant: euros(montant),
      kind: "ADJUSTMENT",
      natureV2: "ADJUSTMENT",
      occurredAt: ctx.instant,
      label: LIBELLE_COMPENSATION,
      refId: solde.id,
      reversesId: null,
      motif: "compensation",
      motifCompensation: null,
      documentId: null,
    });
    ctx.compensations.push({
      pocketId: solde.id,
      montant: euros(montant),
      decomposition: [...motifs.entries()]
        .filter(([, v]) => v !== 0n)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([motif, v]) => ({ motif, montant: euros(v) })),
    });
  }
  await ecrireEnAttente(ctx);
}
