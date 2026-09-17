/**
 * 3e — Dépenses de lot (docs/refonte/03-MODELE-DONNEES.md §7.6, « la pièce fait foi »).
 *
 * Pour chaque `BatchExpense` (par date, création, id) :
 * - mouvement lié = le premier mouvement historique `refType = 'BatchExpense'` de montant −amount :
 *   `kindV2 = EXPENSE`, `BatchExpense.movementId` posé ;
 * - les autres mouvements de la même dépense : écarts « doublon de mouvement » (même montant) ou
 *   « montant de dépense divergent » ;
 * - aucun mouvement conforme : mouvement EXPENSE CRÉÉ en « Non attribué », à la date de la dépense
 *   (dépense sans mouvement, ou remplacement d'un mouvement divergent).
 * `countInCompta` n'est lu nulle part (champ mort, 01 §4) : toutes les dépenses ont leur mouvement.
 */
import { FORMAT_DATE, lignes } from "../lib/base";
import {
  CREATION,
  ECART,
  centimes,
  chronologique,
  classer,
  classerEcart,
  creerMouvement,
  ecrireEnAttente,
  euros,
  inscrireCorrespondances,
  type Contexte,
} from "./contexte";
import { indexerParOrigine } from "./3d-paiements";

interface Depense {
  id: string;
  montant: string;
  occurredAt: string;
  createdAt: string;
}

export async function etape3eDepenses(ctx: Contexte): Promise<void> {
  const depenses = await lignes<Depense>(
    ctx.tx,
    `SELECT id, amount::text AS montant, to_char("occurredAt", ${FORMAT_DATE}) AS "occurredAt",
            to_char("createdAt", ${FORMAT_DATE}) AS "createdAt"
     FROM "BatchExpense"`,
  );
  const parOrigine = indexerParOrigine(ctx.historiques.values());
  const liens: { id: string; movementId: string }[] = [];
  const correspondances: { oldTable: string; oldId: string; newTable: string; newId: string; note: string }[] = [];

  for (const depense of chronologique(depenses, (d) => [d.occurredAt, d.createdAt, d.id])) {
    const attendu = -centimes(depense.montant);
    const candidats = parOrigine.get(`BatchExpense:${depense.id}`) ?? [];
    const conforme = candidats.find((m) => centimes(m.montant) === attendu);
    for (const m of candidats) {
      if (m === conforme) classer(ctx, m, "depense", "dépense liée à sa pièce", "EXPENSE");
      else classerEcart(ctx, m, centimes(m.montant) === attendu ? ECART.doublon : ECART.depenseDivergente);
    }
    let movementId: string;
    let note: string;
    if (conforme) {
      movementId = conforme.id;
      note = "dépense liée à son mouvement";
    } else {
      const motif = candidats.length > 0 ? CREATION.depenseConforme : CREATION.depenseSansMouvement;
      movementId = creerMouvement(ctx, {
        id: `mig-dep-${depense.id}`,
        pocketId: ctx.pocheSysteme,
        montant: euros(attendu),
        kind: "EXPENSE_OUT",
        natureV2: "EXPENSE",
        occurredAt: depense.occurredAt,
        label: `Reprise migration — ${motif}`,
        refId: depense.id,
        reversesId: null,
        motif,
        motifCompensation: motif,
        documentId: null,
      }).id;
      note = motif;
    }
    liens.push({ id: depense.id, movementId });
    correspondances.push({ oldTable: "BatchExpense", oldId: depense.id, newTable: "CashMovement", newId: movementId, note });
  }

  await ecrireEnAttente(ctx);
  if (liens.length > 0) {
    const n = await ctx.tx.$executeRawUnsafe(
      `UPDATE "BatchExpense" e SET "movementId" = r."movementId"
       FROM json_to_recordset($1::json) AS r(id text, "movementId" text) WHERE e.id = r.id`,
      JSON.stringify(liens),
    );
    if (n !== liens.length) throw new Error(`3e : ${n} dépenses liées pour ${liens.length} attendues.`);
  }
  await inscrireCorrespondances(ctx.tx, correspondances.sort((a, b) => (a.oldId < b.oldId ? -1 : 1)));
}
