/**
 * 3d — Paiements et mouvements : reconstruction du ledger document par document
 * (docs/refonte/03-MODELE-DONNEES.md §7.5, compléments de 07-PLAN-EXECUTION.md §2.2).
 *
 * Cible « payé » T : document issu d'une vente → clamp(totalRevenue − remainingDue, 0, totalRevenue) ;
 * commande sans vente → son payé net (R reste nul, rien à ventiler).
 *
 * 1. Paiements de la commande, par paidAt (puis création, puis id) → `Payment` (même id, même nature) :
 *    - mouvement = le premier mouvement historique (refType PaymentTransaction) dont le montant est celui
 *      de la pièce (signé) ; les autres deviennent des écarts « doublon de mouvement » (même montant) ou
 *      « montant de paiement divergent » (07 §2.2 : la pièce fait foi) ;
 *    - aucun mouvement conforme → mouvement CRÉÉ en « Non attribué », à la date du paiement ;
 *    - REFUND « Annulation paiement <id> » sans mouvement propre, <id> étant une entrée de la même commande
 *      et du même montant → mouvement créé comme CONTRE-PASSATION du mouvement de <id> (même poche, même
 *      date, montant opposé, `reversesId`). Traité après les autres paiements de la commande. Si <id> est
 *      déjà contre-passé (annulé deux fois), le REFUND suit la règle générale.
 * 2. R := T − payé net.
 * 3. Vente : preuves (refType Sale), par occurredAt puis création : montant ≤ 0 → écart ; R ≤ 0 → écart
 *    « excédent » ; montant ≤ R → Payment BALANCE, R −= montant ; sinon scission (le mouvement garde R,
 *    un ADJUSTMENT « écart historique » du reste est créé dans la même poche à la même date).
 * 4. R > 0 → Payment BALANCE créé (+R, « Non attribué », date de la vente) ; R < 0 → Payment REFUND créé
 *    (R négatif), document listé « écart à arbitrer ».
 *
 * Choix J2 (documenté en 03 §7.5) : quand plusieurs mouvements historiques visent la même pièce, le
 * premier CONFORME est lié (et non le premier tout court) — aucun mouvement n'est créé sans nécessité.
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
  creerPaiement,
  ecrireEnAttente,
  euros,
  inscrireCorrespondances,
  kindAncienPaiement,
  libelleEcart,
  montantSigne,
  reduireMontant,
  type Contexte,
  type MouvementHistorique,
  type NaturePaiement,
} from "./contexte";

interface PieceHistorique {
  id: string;
  commandeId: string;
  type: NaturePaiement;
  montant: string;
  payeLe: string;
  method: string | null;
  note: string | null;
  creeLe: string;
}

interface VenteHistorique {
  id: string;
  documentId: string;
  paire: boolean;
  totalRevenue: string;
  remainingDue: string;
  vendueLe: string;
}

interface MouvementRetenu {
  id: string;
  pocketId: string;
  montant: bigint;
  occurredAt: string;
}

const ANNULATION = /^Annulation paiement ([^\s:]+)/;

/** Mouvements historiques indexés par origine (`refType:refId`), en ordre chronologique. */
export function indexerParOrigine(historiques: Iterable<MouvementHistorique>): Map<string, MouvementHistorique[]> {
  const index = new Map<string, MouvementHistorique[]>();
  for (const m of historiques) {
    if (!m.refType || !m.refId) continue;
    const cle = `${m.refType}:${m.refId}`;
    index.set(cle, [...(index.get(cle) ?? []), m]);
  }
  for (const [cle, liste] of index) index.set(cle, chronologique(liste, (m) => [m.occurredAt, m.createdAt, m.id]));
  return index;
}

export async function chargerHistoriques(ctx: Contexte): Promise<void> {
  const mouvements = await lignes<MouvementHistorique>(
    ctx.tx,
    `SELECT id, "pocketId", amount::text AS montant, kind::text AS kind, "refType", "refId", "transferGroupId",
            to_char("occurredAt", ${FORMAT_DATE}) AS "occurredAt", to_char("createdAt", ${FORMAT_DATE}) AS "createdAt", label
     FROM "CashMovement"`,
  );
  for (const m of mouvements) ctx.historiques.set(m.id, m);
}

export async function etape3dPaiements(ctx: Contexte): Promise<void> {
  const pieces = await lignes<PieceHistorique>(
    ctx.tx,
    `SELECT id, "orderId" AS "commandeId", type::text AS type, amount::text AS montant,
            to_char("paidAt", ${FORMAT_DATE}) AS "payeLe", method, note, to_char("createdAt", ${FORMAT_DATE}) AS "creeLe"
     FROM "PaymentTransaction"`,
  );
  const ventes = await lignes<VenteHistorique>(
    ctx.tx,
    `SELECT s.id, COALESCE(o.id, s.id) AS "documentId", o.id IS NOT NULL AS paire,
            s."totalRevenue"::text AS "totalRevenue", s."remainingDue"::text AS "remainingDue",
            to_char(s."soldAt", ${FORMAT_DATE}) AS "vendueLe"
     FROM "Sale" s LEFT JOIN "Order" o ON o.id = s."orderId"`,
  );
  const commandes = await lignes<{ id: string }>(ctx.tx, `SELECT id FROM "Order"`);

  const parOrigine = indexerParOrigine(ctx.historiques.values());
  const piecesParId = new Map(pieces.map((p) => [p.id, p]));
  const piecesParCommande = new Map<string, PieceHistorique[]>();
  for (const p of pieces) piecesParCommande.set(p.commandeId, [...(piecesParCommande.get(p.commandeId) ?? []), p]);
  const venteParDocument = new Map(ventes.map((v) => [v.documentId, v]));
  const documents = [...new Set([...commandes.map((c) => c.id), ...ventes.map((v) => v.documentId)])].sort();

  for (const documentId of documents) {
    const payeNet = traiterPaiementsDuDocument(ctx, documentId, piecesParCommande.get(documentId) ?? [], piecesParId, parOrigine);
    const vente = venteParDocument.get(documentId);
    if (vente) traiterVente(ctx, vente, payeNet, parOrigine);
  }

  await ecrireEnAttente(ctx);
  await inscrireCorrespondances(
    ctx.tx,
    [...pieces]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((p) => ({ oldTable: "PaymentTransaction", oldId: p.id, newTable: "Payment", newId: p.id, note: "paiement" })),
  );
}

function traiterPaiementsDuDocument(
  ctx: Contexte,
  documentId: string,
  pieces: readonly PieceHistorique[],
  piecesParId: ReadonlyMap<string, PieceHistorique>,
  parOrigine: ReadonlyMap<string, MouvementHistorique[]>,
): bigint {
  const triees = chronologique(pieces, (p) => [p.payeLe, p.creeLe, p.id]);
  const mouvementDe = new Map<string, MouvementRetenu>();
  const contrePasses = new Set<string>();
  let payeNet = 0n;

  const origineAnnulee = (piece: PieceHistorique): PieceHistorique | null => {
    if (piece.type !== "REFUND") return null;
    const match = ANNULATION.exec(piece.note ?? "");
    if (!match) return null;
    const origine = piecesParId.get(match[1] as string);
    if (!origine || origine.commandeId !== piece.commandeId || origine.type === "REFUND") return null;
    if (centimes(origine.montant) !== centimes(piece.montant)) return null;
    if ((parOrigine.get(`PaymentTransaction:${piece.id}`) ?? []).length > 0) return null;
    return origine;
  };

  const annulations = triees.filter((p) => origineAnnulee(p) !== null);
  const ordinaires = triees.filter((p) => origineAnnulee(p) === null);

  for (const piece of ordinaires) {
    payeNet += lierOuCreer(ctx, documentId, piece, parOrigine, mouvementDe);
  }

  for (const piece of annulations) {
    const origine = origineAnnulee(piece) as PieceHistorique;
    const mouvementOrigine = mouvementDe.get(origine.id);
    if (!mouvementOrigine || contrePasses.has(mouvementOrigine.id)) {
      payeNet += lierOuCreer(ctx, documentId, piece, parOrigine, mouvementDe);
      continue;
    }
    contrePasses.add(mouvementOrigine.id);
    const montant = -mouvementOrigine.montant;
    const cree = creerMouvement(ctx, {
      id: `mig-pay-${piece.id}`,
      pocketId: mouvementOrigine.pocketId,
      montant: euros(montant),
      kind: kindAncienPaiement("REFUND"),
      natureV2: "PAYMENT",
      occurredAt: mouvementOrigine.occurredAt,
      label: `Reprise migration — annulation du paiement ${origine.id}`,
      refId: piece.id,
      reversesId: mouvementOrigine.id,
      motif: CREATION.contrePassation,
      motifCompensation: CREATION.contrePassation,
      documentId,
    });
    creerPaiement(ctx, paiementDePiece(piece, documentId, cree.id));
    mouvementDe.set(piece.id, { id: cree.id, pocketId: cree.pocketId, montant, occurredAt: cree.occurredAt });
    payeNet += montant;
  }

  return payeNet;
}

function paiementDePiece(piece: PieceHistorique, documentId: string, movementId: string) {
  return {
    id: piece.id,
    documentId,
    kind: piece.type,
    movementId,
    method: piece.method,
    note: piece.note,
    createdAt: piece.creeLe,
  };
}

function lierOuCreer(
  ctx: Contexte,
  documentId: string,
  piece: PieceHistorique,
  parOrigine: ReadonlyMap<string, MouvementHistorique[]>,
  mouvementDe: Map<string, MouvementRetenu>,
): bigint {
  const signe = montantSigne(piece.type, piece.montant);
  const candidats = parOrigine.get(`PaymentTransaction:${piece.id}`) ?? [];
  const conforme = candidats.find((m) => centimes(m.montant) === signe);

  for (const m of candidats) {
    if (m === conforme) {
      classer(ctx, m, "paiement", piece.type === "REFUND" ? "remboursement lié à sa pièce" : "paiement lié à sa pièce", "PAYMENT");
    } else {
      classerEcart(ctx, m, centimes(m.montant) === signe ? ECART.doublon : ECART.paiementDivergent);
    }
  }

  let retenu: MouvementRetenu;
  if (conforme) {
    retenu = { id: conforme.id, pocketId: conforme.pocketId, montant: signe, occurredAt: conforme.occurredAt };
  } else {
    const motif = candidats.length > 0 ? CREATION.paiementConforme : CREATION.paiementSansMouvement;
    const cree = creerMouvement(ctx, {
      id: `mig-pay-${piece.id}`,
      pocketId: ctx.pocheSysteme,
      montant: euros(signe),
      kind: kindAncienPaiement(piece.type),
      natureV2: "PAYMENT",
      occurredAt: piece.payeLe,
      label: `Reprise migration — ${motif}`,
      refId: piece.id,
      reversesId: null,
      motif,
      motifCompensation: motif,
      documentId,
    });
    retenu = { id: cree.id, pocketId: cree.pocketId, montant: signe, occurredAt: cree.occurredAt };
  }

  creerPaiement(ctx, paiementDePiece(piece, documentId, retenu.id));
  mouvementDe.set(piece.id, retenu);
  return signe;
}

function traiterVente(
  ctx: Contexte,
  vente: VenteHistorique,
  payeNet: bigint,
  parOrigine: ReadonlyMap<string, MouvementHistorique[]>,
): void {
  const total = centimes(vente.totalRevenue);
  const encaisse = total - centimes(vente.remainingDue);
  const cible = encaisse < 0n ? 0n : encaisse > total ? total : encaisse;
  let reste = cible - payeNet;
  const motifExcedent = vente.paire ? ECART.excedentFinalisation : ECART.excedentVentilation;

  for (const preuve of parOrigine.get(`Sale:${vente.id}`) ?? []) {
    const montant = centimes(preuve.montant);
    if (montant <= 0n) {
      classerEcart(ctx, preuve, ECART.venteNegative);
    } else if (reste <= 0n) {
      classerEcart(ctx, preuve, motifExcedent);
    } else if (montant <= reste) {
      classer(ctx, preuve, "paiement", "encaissement de vente lié", "PAYMENT");
      creerPaiement(ctx, {
        id: `mig-vente-${preuve.id}`,
        documentId: vente.documentId,
        kind: "BALANCE",
        movementId: preuve.id,
        method: null,
        note: null,
        createdAt: preuve.createdAt,
      });
      reste -= montant;
    } else {
      classer(ctx, preuve, "paiement", "encaissement de vente scindé (excédent en écart)", "PAYMENT");
      reduireMontant(ctx, preuve, euros(reste));
      creerPaiement(ctx, {
        id: `mig-vente-${preuve.id}`,
        documentId: vente.documentId,
        kind: "BALANCE",
        movementId: preuve.id,
        method: null,
        note: null,
        createdAt: preuve.createdAt,
      });
      creerMouvement(ctx, {
        id: `mig-scission-${preuve.id}`,
        pocketId: preuve.pocketId,
        montant: euros(montant - reste),
        kind: "ADJUSTMENT",
        natureV2: "ADJUSTMENT",
        occurredAt: preuve.occurredAt,
        label: libelleEcart(motifExcedent, preuve.label),
        refId: preuve.id,
        reversesId: null,
        motif: motifExcedent,
        motifCompensation: null,
        documentId: vente.documentId,
      });
      reste = 0n;
    }
  }

  if (reste === 0n) return;
  const entree = reste > 0n;
  const motif = entree ? CREATION.encaissementSansTrace : CREATION.ecartAArbitrer;
  const id = `mig-reprise-${vente.id}`;
  creerMouvement(ctx, {
    id,
    pocketId: ctx.pocheSysteme,
    montant: euros(reste),
    kind: entree ? "BALANCE_IN" : "REFUND_OUT",
    natureV2: "PAYMENT",
    occurredAt: vente.vendueLe,
    label: entree
      ? "Reprise migration — encaissement sans trace en Trésorerie"
      : "Reprise migration — écart à arbitrer",
    refId: vente.id,
    reversesId: null,
    motif,
    motifCompensation: motif,
    documentId: vente.documentId,
  });
  creerPaiement(ctx, {
    id,
    documentId: vente.documentId,
    kind: entree ? "BALANCE" : "REFUND",
    movementId: id,
    method: null,
    note: null,
    createdAt: ctx.instant,
  });
  if (!entree) {
    ctx.r4.ecartsAArbitrer.push({
      document: vente.documentId,
      vente: vente.id,
      totalRevenue: vente.totalRevenue,
      remainingDue: vente.remainingDue,
      cible: euros(cible),
      payeAvantReprise: euros(payeNet),
      remboursementCree: euros(reste),
    });
  }
}
