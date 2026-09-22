/**
 * État partagé des étapes 3a–3i de la reprise (docs/refonte/03-MODELE-DONNEES.md §7.3–7.8).
 *
 * Les étapes lisent l'ancien modèle en quelques requêtes, décident en TypeScript (montants en centimes
 * entiers, dates en chaînes ISO UTC), puis écrivent en masse par `json_to_recordset` : quelques dizaines
 * d'allers-retours au total, même sur une base distante.
 *
 * Identifiants des lignes créées : DÉTERMINISTES (`mig-…-<id d'origine>`), pour que deux reprises sur
 * les mêmes données produisent le même rapport (07 §1.6 B6 : rapport de production = rapport de la jumelle).
 */
import { centimes, euros } from "../lib/argent";
import { paquets, type Sql } from "../lib/base";
import type { Controle } from "../lib/controles";
import type { Reference } from "../lib/reference-format";

export type Categorie = "paiement" | "depense" | "manuel" | "ecart";
export type NatureV2 = "PAYMENT" | "EXPENSE" | "SUPPLIER" | "TRANSFER" | "ADJUSTMENT";
export type NaturePaiement = "DEPOSIT" | "BALANCE" | "REFUND";

/** Ancien `CashMovement`, tel qu'il était avant la reprise (après fusion des poches système). */
export interface MouvementHistorique {
  id: string;
  pocketId: string;
  montant: string;
  kind: string;
  refType: string | null;
  refId: string | null;
  transferGroupId: string | null;
  occurredAt: string;
  createdAt: string;
  label: string | null;
}

export interface Classement {
  categorie: Categorie;
  motif: string;
  natureV2: NatureV2;
}

export interface MouvementCree {
  id: string;
  pocketId: string;
  montant: string;
  /** Valeur de l'ancienne colonne `kind` (NOT NULL jusqu'au contract). */
  kind: string;
  natureV2: NatureV2;
  occurredAt: string;
  label: string;
  refId: string;
  reversesId: string | null;
  motif: string;
  /**
   * Motif de la compensation (3g) : toute création qui change le solde de sa poche.
   * `null` pour la moitié « écart » d'une scission (la preuve scindée perd exactement ce montant).
   */
  motifCompensation: string | null;
  documentId: string | null;
}

export interface PaiementCree {
  id: string;
  documentId: string;
  kind: NaturePaiement;
  movementId: string;
  method: string | null;
  note: string | null;
  createdAt: string;
}

interface Modification {
  id: string;
  natureV2: NatureV2;
  montant: string | null;
  label: string | null;
  labelModifie: boolean;
  sansGroupe: boolean;
}

export const LISTES_R4 = [
  "ecartsAArbitrer",
  "horsCatalogueReconstituees",
  "volumesAtypiques",
  "donsPrixNonNul",
  "coutsDzdSansTaux",
  "autresLignesHorsRegles",
  "catalogueHorsRegles",
  "pairesCommandeNonLivree",
  "coutsEnrichis",
  "coutsInconnus",
  "stocksPassesANull",
  "liensClientRecuperes",
  "liensLotRecuperes",
  "cachesAcompteDivergents",
  "resteDuHorsBornes",
  "documentsSansClient",
  "pochesSystemeFusionnees",
  "pocheSystemeCreee",
  "tauxDeChangeIllisible",
] as const;
export type ListeR4 = (typeof LISTES_R4)[number];

export interface Contexte {
  tx: Sql;
  reference: Reference;
  /** Instant de la reprise (transaction_timestamp), ISO UTC sans fuseau : date de la compensation. */
  instant: string;
  pocheSysteme: string;
  historiques: Map<string, MouvementHistorique>;
  classements: Map<string, Classement>;
  creations: MouvementCree[];
  paiements: PaiementCree[];
  r4: Record<ListeR4, Record<string, unknown>[]>;
  compensations: { pocketId: string; montant: string; decomposition: { motif: string; montant: string }[] }[];
  controles: Controle[];
  enAttente: { creations: MouvementCree[]; paiements: PaiementCree[]; modifications: Map<string, Modification> };
}

export function nouveauContexte(tx: Sql, reference: Reference, instant: string): Contexte {
  return {
    tx,
    reference,
    instant,
    pocheSysteme: "",
    historiques: new Map(),
    classements: new Map(),
    creations: [],
    paiements: [],
    r4: Object.fromEntries(LISTES_R4.map((nom) => [nom, []])) as unknown as Contexte["r4"],
    compensations: [],
    controles: [],
    enAttente: { creations: [], paiements: [], modifications: new Map() },
  };
}

// ─── Motifs (écarts historiques : 03 §7.6 ; créations : décomposition de la compensation) ─────────────
export const ECART = {
  origineSupprimee: "origine supprimée",
  origineIntrouvable: "origine introuvable",
  doublon: "doublon de mouvement",
  paiementDivergent: "montant de paiement divergent",
  depenseDivergente: "montant de dépense divergent",
  excedentFinalisation: "excédent de finalisation (double comptage)",
  excedentVentilation: "excédent de ventilation",
  transfertIncomplet: "transfert incomplet",
  venteNegative: "mouvement de vente négatif ou nul",
  fournisseurSigne: "paiement fournisseur de signe incohérent",
} as const;

export const CREATION = {
  paiementSansMouvement: "paiement sans mouvement en Trésorerie",
  paiementConforme: "paiement conforme à la pièce (mouvement historique divergent)",
  contrePassation: "contre-passation d'une annulation de paiement historique",
  encaissementSansTrace: "encaissement de vente sans trace en Trésorerie",
  ecartAArbitrer: "écart à arbitrer (reste dû remonté après coup)",
  depenseSansMouvement: "dépense sans mouvement en Trésorerie",
  depenseConforme: "dépense conforme à la pièce (mouvement historique divergent)",
} as const;

export const LIBELLE_COMPENSATION = "Reprise migration — compensation (voir rapport)";

export function libelleEcart(motif: string, ancienLibelle: string | null): string {
  return ancienLibelle && ancienLibelle.trim() !== ""
    ? `Écart historique — ${motif} — ${ancienLibelle}`
    : `Écart historique — ${motif}`;
}

/** Tri chronologique des pièces et preuves : date, puis création, puis identifiant. */
export function chronologique<T>(liste: readonly T[], cle: (x: T) => [string, string, string]): T[] {
  return [...liste].sort((a, b) => {
    const ka = cle(a);
    const kb = cle(b);
    for (let i = 0; i < 3; i += 1) {
      if ((ka[i] as string) < (kb[i] as string)) return -1;
      if ((ka[i] as string) > (kb[i] as string)) return 1;
    }
    return 0;
  });
}

// ─── Enregistrement des décisions ─────────────────────────────────────────────────────────────────────
function modification(ctx: Contexte, mouvement: MouvementHistorique, natureV2: NatureV2): Modification {
  const existante = ctx.enAttente.modifications.get(mouvement.id);
  const modif: Modification = existante ?? {
    id: mouvement.id,
    natureV2,
    montant: null,
    label: null,
    labelModifie: false,
    sansGroupe: false,
  };
  modif.natureV2 = natureV2;
  modif.sansGroupe = natureV2 !== "TRANSFER" && mouvement.transferGroupId !== null;
  ctx.enAttente.modifications.set(mouvement.id, modif);
  return modif;
}

export function classer(
  ctx: Contexte,
  mouvement: MouvementHistorique,
  categorie: Categorie,
  motif: string,
  natureV2: NatureV2,
): void {
  if (ctx.classements.has(mouvement.id)) {
    throw new Error(`Mouvement ${mouvement.id} classé deux fois (V5) : ${ctx.classements.get(mouvement.id)?.motif} puis ${motif}.`);
  }
  ctx.classements.set(mouvement.id, { categorie, motif, natureV2 });
  modification(ctx, mouvement, natureV2);
}

export function classerEcart(ctx: Contexte, mouvement: MouvementHistorique, motif: string): void {
  classer(ctx, mouvement, "ecart", motif, "ADJUSTMENT");
  const modif = ctx.enAttente.modifications.get(mouvement.id) as Modification;
  modif.label = libelleEcart(motif, mouvement.label);
  modif.labelModifie = true;
}

/** Scission d'une preuve (03 §7.5 étape 3) : le mouvement garde `montantGarde`. */
export function reduireMontant(ctx: Contexte, mouvement: MouvementHistorique, montantGarde: string): void {
  const modif = ctx.enAttente.modifications.get(mouvement.id);
  if (!modif) throw new Error(`Scission de ${mouvement.id} avant son classement.`);
  modif.montant = montantGarde;
}

export function relabelliser(ctx: Contexte, mouvement: MouvementHistorique, label: string): void {
  const modif = ctx.enAttente.modifications.get(mouvement.id);
  if (!modif) throw new Error(`Libellé de ${mouvement.id} avant son classement.`);
  modif.label = label;
  modif.labelModifie = true;
}

export function creerMouvement(ctx: Contexte, mouvement: MouvementCree): MouvementCree {
  if (centimes(mouvement.montant) === 0n) throw new Error(`Création d'un mouvement nul refusée : ${mouvement.id}.`);
  ctx.creations.push(mouvement);
  ctx.enAttente.creations.push(mouvement);
  return mouvement;
}

export function creerPaiement(ctx: Contexte, paiement: PaiementCree): void {
  ctx.paiements.push(paiement);
  ctx.enAttente.paiements.push(paiement);
}

export function kindAncienPaiement(kind: NaturePaiement): string {
  return kind === "DEPOSIT" ? "DEPOSIT_IN" : kind === "BALANCE" ? "BALANCE_IN" : "REFUND_OUT";
}

/** Montant signé d'une pièce de paiement (l'ancien montant est positif, le sens est dans la nature). */
export function montantSigne(kind: NaturePaiement, montant: string): bigint {
  const valeur = centimes(montant);
  return kind === "REFUND" ? -valeur : valeur;
}

export { centimes, euros };

// ─── Écritures en masse ───────────────────────────────────────────────────────────────────────────────
export async function ecrireEnAttente(ctx: Contexte): Promise<void> {
  const { creations, paiements, modifications } = ctx.enAttente;

  for (const lot of paquets(creations)) {
    await ctx.tx.$executeRawUnsafe(
      `INSERT INTO "CashMovement"
         (id, "pocketId", amount, kind, "kindV2", "occurredAt", label, "refType", "refId",
          "transferGroupId", "reversesId", "createdById", "createdAt")
       SELECT r.id, r."pocketId", r.amount::numeric(10,2), r.kind::"CashMovementKind",
              r."kindV2"::"CashMovementKindV2", r."occurredAt"::timestamp(3), r.label, 'Reprise', r."refId",
              NULL, r."reversesId", NULL, $2::timestamp(3)
       FROM json_to_recordset($1::json) AS r(id text, "pocketId" text, amount text, kind text, "kindV2" text,
                                            "occurredAt" text, label text, "refId" text, "reversesId" text)`,
      JSON.stringify(
        lot.map((m) => ({
          id: m.id,
          pocketId: m.pocketId,
          amount: m.montant,
          kind: m.kind,
          kindV2: m.natureV2,
          occurredAt: m.occurredAt,
          label: m.label,
          refId: m.refId,
          reversesId: m.reversesId,
        })),
      ),
      ctx.instant,
    );
  }

  const modifs = [...modifications.values()];
  for (const lot of paquets(modifs)) {
    const n = await ctx.tx.$executeRawUnsafe(
      `UPDATE "CashMovement" m
       SET "kindV2" = r."kindV2"::"CashMovementKindV2",
           amount = COALESCE(r.amount::numeric(10,2), m.amount),
           label = CASE WHEN r."labelModifie" THEN r.label ELSE m.label END,
           "transferGroupId" = CASE WHEN r."sansGroupe" THEN NULL ELSE m."transferGroupId" END
       FROM json_to_recordset($1::json) AS r(id text, "kindV2" text, amount text, label text,
                                            "labelModifie" boolean, "sansGroupe" boolean)
       WHERE m.id = r.id`,
      JSON.stringify(
        lot.map((m) => ({
          id: m.id,
          kindV2: m.natureV2,
          amount: m.montant,
          label: m.label,
          labelModifie: m.labelModifie,
          sansGroupe: m.sansGroupe,
        })),
      ),
    );
    if (n !== lot.length) throw new Error(`Mise à jour de mouvements : ${n} lignes touchées pour ${lot.length} attendues.`);
  }

  for (const lot of paquets(paiements)) {
    await ctx.tx.$executeRawUnsafe(
      `INSERT INTO "Payment" (id, "documentId", kind, "movementId", method, note, "createdAt")
       SELECT r.id, r."documentId", r.kind::"PaymentKind", r."movementId", r.method, r.note,
              r."createdAt"::timestamp(3) AT TIME ZONE 'UTC'
       FROM json_to_recordset($1::json) AS r(id text, "documentId" text, kind text, "movementId" text,
                                            method text, note text, "createdAt" text)`,
      JSON.stringify(lot),
    );
  }

  ctx.enAttente = { creations: [], paiements: [], modifications: new Map() };
}

/** Lignes de `legacy."MigrationMap"` (07 §2.2). */
export async function inscrireCorrespondances(
  tx: Sql,
  lignes: readonly { oldTable: string; oldId: string; newTable: string | null; newId: string | null; note: string }[],
): Promise<void> {
  for (const lot of paquets(lignes)) {
    await tx.$executeRawUnsafe(
      `INSERT INTO legacy."MigrationMap" ("oldTable", "oldId", "newTable", "newId", note)
       SELECT r."oldTable", r."oldId", r."newTable", r."newId", r.note
       FROM json_to_recordset($1::json) AS r("oldTable" text, "oldId" text, "newTable" text, "newId" text, note text)`,
      JSON.stringify(lot),
    );
  }
}
