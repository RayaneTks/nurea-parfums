/**
 * 3i — Assertions bloquantes, dans la transaction (docs/refonte/03-MODELE-DONNEES.md §7.8, forme
 * « dans la transaction » ; 07-PLAN-EXECUTION.md §2.5).
 *
 * V1–V7 et C1–C5 ; C6 est mesuré pour le rapport (informatif). Les requêtes viennent du module partagé
 * `scripts/migration/lib/controles.ts`, en forme « transaction » : nature lue dans `kindV2`, date de
 * valeur encore sans fuseau. Un seul contrôle rouge ⇒ la reprise lève une erreur ⇒ ROLLBACK intégral.
 */
import { premiere } from "../lib/base";
import {
  FORME_TRANSACTION,
  controlerCoherenceLedger,
  controlerDusCommandes,
  controlerDusVentes,
  controlerEncaisse,
  controlerHorodatages,
  controlerLedger,
  controlerTotaux,
  controlerTresorerie,
  mesurerInformatif,
  type ChiffresEncaisse,
  type ChiffresInformatifs,
  type Controle,
} from "../lib/controles";
import type { Contexte } from "./contexte";

export interface ResultatAssertions {
  encaisse: ChiffresEncaisse;
  informatif: ChiffresInformatifs;
  tresorerie: { totalNonArchivees: string; nonAttribue: string };
  comptages: Record<string, number>;
}

async function controlerComptages(ctx: Contexte): Promise<{ controle: Controle; comptages: Record<string, number> }> {
  const ref = ctx.reference.mesures.comptages;
  const n = await premiere<Record<string, number>>(
    ctx.tx,
    `SELECT (SELECT count(*)::int FROM "SaleDocument") AS documents,
            (SELECT count(*)::int FROM "SaleLine") AS lignes,
            (SELECT count(*)::int FROM "Payment") AS paiements,
            (SELECT count(*)::int FROM "PaymentTransaction" t
              WHERE NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = t.id)) AS "piecesSansPaiement",
            (SELECT count(*)::int FROM "CashMovement" WHERE "kindV2" IS NULL) AS "mouvementsSansNature",
            (SELECT count(*)::int FROM "BatchExpense" WHERE "movementId" IS NULL) AS "depensesSansMouvement",
            (SELECT count(*)::int FROM "Order") AS "Order",
            (SELECT count(*)::int FROM "OrderItem") AS "OrderItem",
            (SELECT count(*)::int FROM "Sale") AS "Sale",
            (SELECT count(*)::int FROM "SaleItem") AS "SaleItem",
            (SELECT count(*)::int FROM "PaymentTransaction") AS "PaymentTransaction",
            (SELECT count(*)::int FROM "BatchExpense") AS "BatchExpense",
            (SELECT count(*)::int FROM "Customer") AS "Customer",
            (SELECT count(*)::int FROM "Batch") AS "Batch",
            (SELECT count(*)::int FROM "Brand") AS "Brand",
            (SELECT count(*)::int FROM "Perfume") AS "Perfume",
            (SELECT count(*)::int FROM "PerfumePricing") AS "PerfumePricing",
            (SELECT count(*)::int FROM "PerfumeMedia") AS "PerfumeMedia"`,
  );
  const categories = { paiement: 0, depense: 0, manuel: 0, ecart: 0 };
  for (const c of ctx.classements.values()) categories[c.categorie] += 1;

  const attendus: [string, number, number][] = [
    ["documents = commandes + ventes − paires", ref.Order + ref.Sale - ref.paires, n.documents as number],
    ["lignes = OrderItem hors paires + SaleItem", ref.orderItemsHorsPaires + ref.SaleItem, n.lignes as number],
    ["PaymentTransaction sans Payment", 0, n.piecesSansPaiement as number],
    ["mouvements historiques = référence", ref.CashMovement, ctx.historiques.size],
    ["mouvements historiques classés une fois", ctx.historiques.size, ctx.classements.size],
    ["mouvements sans nature cible", 0, n.mouvementsSansNature as number],
    ["dépenses sans mouvement", 0, n.depensesSansMouvement as number],
  ];
  for (const table of ["Order", "OrderItem", "Sale", "SaleItem", "PaymentTransaction", "BatchExpense", "Customer", "Batch", "Brand", "Perfume", "PerfumePricing", "PerfumeMedia"] as const) {
    attendus.push([`${table} = référence`, ref[table], n[table] as number]);
  }
  const ecarts = attendus
    .filter(([, attendu, obtenu]) => attendu !== obtenu)
    .map(([regle, attendu, obtenu]) => ({ regle, attendu, obtenu }));
  const comptages = {
    documents: n.documents as number,
    lignes: n.lignes as number,
    paiements: n.paiements as number,
    mouvementsHistoriques: ctx.historiques.size,
    mouvementsCrees: ctx.creations.length,
    ...Object.fromEntries(Object.entries(categories).map(([k, v]) => [`categorie_${k}`, v])),
  };
  return {
    comptages,
    controle: {
      code: "V5",
      libelle: "Comptages : documents, lignes, paiements, une catégorie par mouvement historique",
      bloquant: true,
      ok: ecarts.length === 0,
      valeurs: comptages,
      ecarts,
    },
  };
}

export async function etape3iAssertions(ctx: Contexte): Promise<ResultatAssertions> {
  const { tx, reference } = ctx;
  const controles: Controle[] = [];

  controles.push(...(await controlerTresorerie(tx, reference)));
  controles.push(await controlerDusVentes(tx, reference));
  controles.push(await controlerDusCommandes(tx, reference));
  controles.push(await controlerTotaux(tx, reference));
  const { controle: v5, comptages } = await controlerComptages(ctx);
  controles.push(v5);
  controles.push(await controlerLedger(tx, FORME_TRANSACTION));
  controles.push(await controlerHorodatages(tx));
  const encaisse = await controlerEncaisse(tx, reference, FORME_TRANSACTION);
  controles.push(...encaisse.controles);
  controles.push(await controlerCoherenceLedger(tx, FORME_TRANSACTION));

  ctx.controles = controles.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const c1 = controles.find((c) => c.code === "C1") as Controle;
  return {
    encaisse: encaisse.chiffres,
    informatif: await mesurerInformatif(tx, reference, FORME_TRANSACTION),
    tresorerie: {
      totalNonArchivees: c1.valeurs.totalNonArchivees as string,
      nonAttribue: c1.valeurs.nonAttribue as string,
    },
    comptages,
  };
}
