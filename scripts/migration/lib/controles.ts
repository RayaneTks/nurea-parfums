/**
 * Contrôles chiffrés partagés par la reprise (étape 3i, dans la transaction) et par
 * `verify-post.ts` (après le contract) : docs/refonte/03-MODELE-DONNEES.md §7.8 (V1–V7) et
 * 07-PLAN-EXECUTION.md §2.5 (C1–C6).
 *
 * UNE écriture de chaque requête, paramétrée par la forme du ledger :
 * - « dans la transaction » : la nature d'un mouvement est lue dans `"kindV2"` (l'ancien `kind` n'a
 *   ni PAYMENT ni EXPENSE) et `occurredAt` est encore un `timestamp` sans fuseau (UTC) ;
 * - « finale » : `kind` et `occurredAt` en `timestamptz`.
 * La vue `DocumentBalance` et les fonctions de période existent dès l'expand : les deux formes les lisent.
 */
import { centimes, euros } from "./argent";
import { lignes, premiere, type Sql } from "./base";
import type { Reference } from "./reference-format";

export interface FormeLedger {
  nom: "transaction" | "finale";
  /** Colonne de nature, qualifiée par l'alias du mouvement. */
  nature: (alias?: string) => string;
  /** Date de valeur en `timestamptz`. */
  dateValeur: (alias: string) => string;
}

export const FORME_TRANSACTION: FormeLedger = {
  nom: "transaction",
  nature: (alias) => (alias ? `${alias}."kindV2"` : `"kindV2"`),
  dateValeur: (alias) => `(${alias}."occurredAt" AT TIME ZONE 'UTC')`,
};

export const FORME_FINALE: FormeLedger = {
  nom: "finale",
  nature: (alias) => (alias ? `${alias}.kind` : `kind`),
  dateValeur: (alias) => `${alias}."occurredAt"`,
};

export interface Controle {
  code: string;
  libelle: string;
  bloquant: boolean;
  ok: boolean;
  /** Chiffres du contrôle (référence, recalcul, écart), en chaînes à deux décimales. */
  valeurs: Record<string, string | number>;
  /** Lignes fautives, triées. Vide si le contrôle est vert. */
  ecarts: Record<string, unknown>[];
}

function controle(
  code: string,
  libelle: string,
  ecarts: Record<string, unknown>[],
  valeurs: Record<string, string | number> = {},
  bloquant = true,
): Controle {
  return { code, libelle, bloquant, ok: ecarts.length === 0, valeurs, ecarts };
}

const SOLDES_POCHES = `
  SELECT p.id, p.name, p.archived, p."isSystem",
         (p."openingBalance" + COALESCE((SELECT SUM(m.amount) FROM "CashMovement" m WHERE m."pocketId" = p.id), 0))::numeric(12,2) AS solde
  FROM "Pocket" p`;

const FUSIONS_POCHES = `
  SELECT "oldId" AS id, "newId" AS cible FROM legacy."MigrationMap" WHERE "oldTable" = 'Pocket' AND "newTable" = 'Pocket'`;

const DOCUMENTS_DE_VENTE = `
  SELECT DISTINCT "oldId" AS vente, "newId" AS doc FROM legacy."MigrationMap" WHERE "oldTable" = 'Sale' AND "newTable" = 'SaleDocument'`;

export interface SoldePoche {
  id: string;
  nom: string | null;
  reference: string;
  actuel: string | null;
}

/** Soldes recalculés face à la référence, doublons de poche système fusionnés (03 §7.7). */
export function soldesFaceReference(db: Sql, reference: Reference): Promise<SoldePoche[]> {
  return lignes<SoldePoche>(
    db,
    `WITH ref AS (SELECT * FROM json_to_recordset($1::json) AS r(id text, solde numeric)),
          fusion AS (${FUSIONS_POCHES}),
          ref_fusionnee AS (SELECT COALESCE(f.cible, r.id) AS id, SUM(r.solde) AS solde
                            FROM ref r LEFT JOIN fusion f ON f.id = r.id GROUP BY 1),
          actuel AS (${SOLDES_POCHES})
     SELECT COALESCE(a.id, rf.id) AS id, a.name AS nom,
            COALESCE(rf.solde, 0)::numeric(12,2)::text AS reference, a.solde::text AS actuel
     FROM actuel a FULL JOIN ref_fusionnee rf ON rf.id = a.id
     ORDER BY COALESCE(a.id, rf.id) COLLATE "C"`,
    JSON.stringify(reference.mesures.poches.map((p) => ({ id: p.id, solde: p.solde }))),
  );
}

/** V1 et C1 : Trésorerie par poche, total des poches non archivées, « non attribué ». */
export async function controlerTresorerie(db: Sql, reference: Reference): Promise<Controle[]> {
  const soldes = await soldesFaceReference(db, reference);
  const v1 = soldes
    .filter((s) => s.actuel !== s.reference)
    .map((s) => ({
      poche: s.id,
      nom: s.nom,
      reference: s.reference,
      recalcule: s.actuel,
      ecart: s.actuel === null ? null : euros(centimes(s.actuel) - centimes(s.reference)),
    }));
  const totaux = await premiere<{ totalNonArchivees: string; nonAttribue: string }>(
    db,
    `SELECT COALESCE(SUM(solde) FILTER (WHERE NOT archived), 0)::numeric(12,2)::text AS "totalNonArchivees",
            COALESCE(SUM(solde) FILTER (WHERE "isSystem"), 0)::numeric(12,2)::text AS "nonAttribue"
     FROM (${SOLDES_POCHES}) s`,
  );
  const ref = reference.mesures.tresorerie;
  const c1: Record<string, unknown>[] = [...v1];
  if (totaux.totalNonArchivees !== ref.totalNonArchivees) {
    c1.push({ total: "poches non archivées", reference: ref.totalNonArchivees, recalcule: totaux.totalNonArchivees });
  }
  if (totaux.nonAttribue !== ref.nonAttribue) {
    c1.push({ total: "non attribué", reference: ref.nonAttribue, recalcule: totaux.nonAttribue });
  }
  const valeursPoches = Object.fromEntries(soldes.map((s) => [s.id, s.actuel ?? "absente"]));
  return [
    controle("V1", "Solde recalculé de chaque poche = référence, au centime", v1, valeursPoches),
    controle("C1", "Trésorerie : par poche, total des poches non archivées, non attribué", c1, {
      totalNonArchiveesReference: ref.totalNonArchivees,
      totalNonArchivees: totaux.totalNonArchivees,
      nonAttribueReference: ref.nonAttribue,
      nonAttribue: totaux.nonAttribue,
    }),
  ];
}

/** V2 : dû de chaque document issu d'une vente = dû de référence de la vente. */
export async function controlerDusVentes(db: Sql, reference: Reference): Promise<Controle> {
  const ecarts = await lignes<Record<string, unknown>>(
    db,
    `WITH ref AS (SELECT * FROM json_to_recordset($1::json) AS r(id text, du numeric)),
          map AS (${DOCUMENTS_DE_VENTE})
     SELECT r.id AS vente, m.doc AS document, r.du::numeric(12,2)::text AS reference, b.due::text AS recalcule
     FROM ref r LEFT JOIN map m ON m.vente = r.id LEFT JOIN "DocumentBalance" b ON b."documentId" = m.doc
     WHERE b.due IS DISTINCT FROM r.du::numeric(12,2)
     ORDER BY r.id COLLATE "C"`,
    JSON.stringify(reference.mesures.ventes.map((v) => ({ id: v.id, du: v.du }))),
  );
  return controle("V2", "Dû de chaque document issu d'une vente = dû de référence", ecarts, {
    ventes: reference.mesures.ventes.length,
  });
}

/** V3 : dû de chaque commande sans vente = max(0, total − payé net) de référence. */
export async function controlerDusCommandes(db: Sql, reference: Reference): Promise<Controle> {
  const commandes = reference.mesures.commandes.filter((c) => !c.aUneVente);
  const ecarts = await lignes<Record<string, unknown>>(
    db,
    `WITH ref AS (SELECT * FROM json_to_recordset($1::json) AS r(id text, du numeric))
     SELECT r.id AS commande, r.du::numeric(12,2)::text AS reference, b.due::text AS recalcule
     FROM ref r LEFT JOIN "DocumentBalance" b ON b."documentId" = r.id
     WHERE b.due IS DISTINCT FROM r.du::numeric(12,2)
     ORDER BY r.id COLLATE "C"`,
    JSON.stringify(commandes.map((c) => ({ id: c.id, du: c.du }))),
  );
  return controle("V3", "Dû de chaque commande sans vente = max(0, total − payé net) de référence", ecarts, {
    commandes: commandes.length,
  });
}

/** V4 : Σ lignes de chaque document = total de référence. */
export async function controlerTotaux(db: Sql, reference: Reference): Promise<Controle> {
  const ecarts = await lignes<Record<string, unknown>>(
    db,
    `WITH ventes AS (SELECT * FROM json_to_recordset($1::json) AS r(id text, total numeric)),
          commandes AS (SELECT * FROM json_to_recordset($2::json) AS r(id text, total numeric)),
          map AS (${DOCUMENTS_DE_VENTE}),
          attendu AS (
            SELECT v.id AS ancien, 'Sale' AS source, m.doc AS document, v.total FROM ventes v LEFT JOIN map m ON m.vente = v.id
            UNION ALL
            SELECT c.id, 'Order', c.id, c.total FROM commandes c)
     SELECT a.source, a.ancien, a.document, a.total::numeric(12,2)::text AS reference, b.total::text AS recalcule
     FROM attendu a LEFT JOIN "DocumentBalance" b ON b."documentId" = a.document
     WHERE b.total IS DISTINCT FROM a.total::numeric(12,2)
     ORDER BY a.source, a.ancien COLLATE "C"`,
    JSON.stringify(reference.mesures.ventes.map((v) => ({ id: v.id, total: v.totalRevenue }))),
    JSON.stringify(reference.mesures.commandes.filter((c) => !c.aUneVente).map((c) => ({ id: c.id, total: c.total }))),
  );
  return controle("V4", "Σ lignes de chaque document = total de référence", ecarts);
}

/** V6 : intégrité du ledger (mêmes règles que les CHECK et triggers de 03 §4.9–4.10). */
export async function controlerLedger(db: Sql, forme: FormeLedger): Promise<Controle> {
  const k = forme.nature;
  const ecarts = await lignes<Record<string, unknown>>(
    db,
    `SELECT regle, id FROM (
       SELECT 'paiement sans mouvement PAYMENT de signe cohérent' AS regle, p.id
       FROM "Payment" p JOIN "CashMovement" m ON m.id = p."movementId"
       WHERE ${k("m")} IS DISTINCT FROM 'PAYMENT' OR (p.kind = 'REFUND') <> (m.amount < 0) OR m.amount = 0
       UNION ALL
       SELECT 'mouvement PAYMENT sans paiement', m.id FROM "CashMovement" m
       WHERE ${k("m")} = 'PAYMENT' AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."movementId" = m.id)
       UNION ALL
       SELECT 'mouvement EXPENSE sans dépense', m.id FROM "CashMovement" m
       WHERE ${k("m")} = 'EXPENSE' AND m."reversesId" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "BatchExpense" e WHERE e."movementId" = m.id)
       UNION ALL
       SELECT 'dépense sans mouvement EXPENSE négatif', e.id FROM "BatchExpense" e
       LEFT JOIN "CashMovement" m ON m.id = e."movementId"
       WHERE m.id IS NULL OR ${k("m")} IS DISTINCT FROM 'EXPENSE' OR m."reversesId" IS NOT NULL OR m.amount >= 0
       UNION ALL
       SELECT 'contre-passation incohérente (nature, poche, date ou montant)', m.id
       FROM "CashMovement" m JOIN "CashMovement" o ON o.id = m."reversesId"
       WHERE ${k("o")} IS DISTINCT FROM ${k("m")} OR o."pocketId" <> m."pocketId"
          OR o.amount <> -m.amount OR o."occurredAt" <> m."occurredAt" OR m."reversesId" = m.id
       UNION ALL
       SELECT 'groupe de transfert qui n''a pas deux jambes de somme nulle', "transferGroupId"
       FROM "CashMovement" WHERE ${k()} = 'TRANSFER' AND "transferGroupId" IS NOT NULL
       GROUP BY "transferGroupId" HAVING COUNT(*) <> 2 OR SUM(amount) <> 0
       UNION ALL
       SELECT 'nature TRANSFER sans groupe, ou groupe hors TRANSFER', id FROM "CashMovement"
       WHERE (${k()} = 'TRANSFER') IS DISTINCT FROM ("transferGroupId" IS NOT NULL)
       UNION ALL
       SELECT 'mouvement sans nature cible', id FROM "CashMovement" WHERE ${k()} IS NULL
       UNION ALL
       SELECT 'mouvement de montant nul', id FROM "CashMovement" WHERE amount = 0
       UNION ALL
       SELECT 'dépense ou paiement fournisseur de signe incohérent', id FROM "CashMovement"
       WHERE ${k()} IN ('EXPENSE', 'SUPPLIER') AND ("reversesId" IS NULL) <> (amount < 0)
       UNION ALL
       SELECT 'poche archivée à solde non nul', s.id FROM (${SOLDES_POCHES}) s WHERE s.archived AND s.solde <> 0
       UNION ALL
       SELECT 'plusieurs poches système', string_agg(id, ', ' ORDER BY id COLLATE "C") FROM "Pocket"
       WHERE "isSystem" HAVING COUNT(*) > 1
     ) v ORDER BY v.regle, v.id COLLATE "C"`,
  );
  return controle("V6", "Intégrité du ledger : pièces, signes, contre-passations, transferts, poches archivées", ecarts);
}

/** V7 : cohérence statut / horodatages (règles des CHECK doc_*_ck). */
export async function controlerHorodatages(db: Sql): Promise<Controle> {
  const ecarts = await lignes<Record<string, unknown>>(
    db,
    `SELECT id AS document, status::text AS statut,
            to_char("confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "confirmedAt",
            to_char("deliveredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "deliveredAt",
            to_char("cancelledAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "cancelledAt"
     FROM "SaleDocument"
     WHERE (status IN ('CONFIRMED', 'DELIVERED')) <> ("confirmedAt" IS NOT NULL)
        OR (status = 'DELIVERED') <> ("deliveredAt" IS NOT NULL)
        OR (status = 'CANCELLED') <> ("cancelledAt" IS NOT NULL)
     ORDER BY id COLLATE "C"`,
  );
  return controle("V7", "Cohérence statut / horodatages des documents", ecarts);
}

export interface ChiffresEncaisse {
  perimetreAncien: string;
  nouveau: string;
  aEncaisser: string;
}

/** C2, C3, C4 : Encaissé (périmètre ancien, définition canonique) et À encaisser. */
export async function controlerEncaisse(
  db: Sql,
  reference: Reference,
  forme: FormeLedger,
): Promise<{ controles: Controle[]; chiffres: ChiffresEncaisse }> {
  const chiffres = await premiere<ChiffresEncaisse>(
    db,
    `WITH doc_vente AS (SELECT DISTINCT doc AS id FROM (${DOCUMENTS_DE_VENTE}) d)
     SELECT
       (COALESCE(SUM(b.paid) FILTER (WHERE b."documentId" IN (SELECT id FROM doc_vente)), 0)
        + COALESCE(SUM(GREATEST(LEAST(b.paid, b.total), 0)) FILTER (
            WHERE b."documentId" NOT IN (SELECT id FROM doc_vente)
              AND b.status IN ('CONFIRMED', 'DELIVERED')), 0))::numeric(12,2)::text AS "perimetreAncien",
       (SELECT COALESCE(SUM(m.amount), 0) FROM "CashMovement" m JOIN "Payment" p ON p."movementId" = m.id
         WHERE ${forme.nature("m")} = 'PAYMENT')::numeric(12,2)::text                          AS nouveau,
       COALESCE(SUM(b.due) FILTER (WHERE b.status IN ('CONFIRMED', 'DELIVERED')), 0)::numeric(12,2)::text AS "aEncaisser"
     FROM "DocumentBalance" b`,
  );
  const { ancien, d0, d1, d2 } = reference.mesures.encaisse;
  const perimetreAttendu = euros(centimes(ancien) - centimes(d0));
  const nouveauAttendu = euros(centimes(ancien) - centimes(d0) + centimes(d1) + centimes(d2));
  const residu = euros(centimes(chiffres.nouveau) - centimes(nouveauAttendu));
  const aEncaisserReference = reference.mesures.aEncaisser.ancien;

  const c2 =
    chiffres.perimetreAncien === perimetreAttendu
      ? []
      : [{ attendu: perimetreAttendu, recalcule: chiffres.perimetreAncien }];
  const c3 = residu === "0.00" ? [] : [{ attendu: nouveauAttendu, recalcule: chiffres.nouveau, residu }];
  const c4 = chiffres.aEncaisser === aEncaisserReference ? [] : [{ reference: aEncaisserReference, recalcule: chiffres.aEncaisser }];

  return {
    chiffres,
    controles: [
      controle("C2", "Encaissé à périmètre constant = ancien Encaissé − D0", c2, {
        encaisseAncien: ancien,
        d0,
        attendu: perimetreAttendu,
        recalcule: chiffres.perimetreAncien,
      }),
      controle("C3", "Encaissé (définition canonique) = ancien − D0 + D1 + D2, résidu 0,00 €", c3, {
        encaisseAncien: ancien,
        d0,
        d1,
        d2,
        attendu: nouveauAttendu,
        encaisseNouveau: chiffres.nouveau,
        residu,
      }),
      controle("C4", "À encaisser (nouvelle définition) = ancien À encaisser", c4, {
        reference: aEncaisserReference,
        recalcule: chiffres.aEncaisser,
      }),
    ],
  };
}

/** C5 : Σ payé = Σ mouvements des paiements ; transferts à deux jambes de somme nulle ; poches archivées à zéro. */
export async function controlerCoherenceLedger(db: Sql, forme: FormeLedger): Promise<Controle> {
  const k = forme.nature;
  const sommes = await premiere<{ paye: string; mouvements: string }>(
    db,
    `SELECT (SELECT COALESCE(SUM(paid), 0) FROM "DocumentBalance")::numeric(12,2)::text AS paye,
            (SELECT COALESCE(SUM(m.amount), 0) FROM "CashMovement" m
               JOIN "Payment" p ON p."movementId" = m.id)::numeric(12,2)::text AS mouvements`,
  );
  const ecarts: Record<string, unknown>[] = [];
  if (sommes.paye !== sommes.mouvements) ecarts.push({ regle: "Σ payé ≠ Σ mouvements des paiements", ...sommes });
  const transferts = await lignes<Record<string, unknown>>(
    db,
    `SELECT 'transfert déséquilibré' AS regle, "transferGroupId" AS groupe, COUNT(*)::int AS jambes,
            SUM(amount)::numeric(12,2)::text AS somme
     FROM "CashMovement" WHERE ${k()} = 'TRANSFER'
     GROUP BY "transferGroupId" HAVING COUNT(*) <> 2 OR SUM(amount) <> 0
     ORDER BY "transferGroupId" COLLATE "C"`,
  );
  const archivees = await lignes<Record<string, unknown>>(
    db,
    `SELECT 'poche archivée à solde non nul' AS regle, id AS poche, solde::text AS solde
     FROM (${SOLDES_POCHES}) s WHERE archived AND solde <> 0 ORDER BY id COLLATE "C"`,
  );
  ecarts.push(...transferts, ...archivees);
  return controle("C5", "Cohérence du ledger : Σ payé = Σ mouvements, transferts, poches archivées", ecarts, sommes);
}

export interface ChiffresInformatifs {
  mois: string;
  encaisseMois: string;
  encaisse: string;
  couts: string;
  depenses: string;
  margeNette: string;
}

/** C6 (informatif) : Encaissé du mois de la référence (Europe/Paris) et Marge nette globale, nouvelles formules. */
export async function mesurerInformatif(db: Sql, reference: Reference, forme: FormeLedger): Promise<ChiffresInformatifs> {
  const k = forme.nature;
  const date = forme.dateValeur("m");
  const ligne = await premiere<Omit<ChiffresInformatifs, "margeNette">>(
    db,
    `SELECT to_char(nurea_period_start('month', $1::timestamptz) AT TIME ZONE 'Europe/Paris', 'YYYY-MM') AS mois,
       (SELECT COALESCE(SUM(m.amount), 0) FROM "CashMovement" m JOIN "Payment" p ON p."movementId" = m.id
         WHERE ${k("m")} = 'PAYMENT' AND ${date} >= nurea_period_start('month', $1::timestamptz)
           AND ${date} < nurea_period_end('month', $1::timestamptz))::numeric(12,2)::text AS "encaisseMois",
       (SELECT COALESCE(SUM(m.amount), 0) FROM "CashMovement" m JOIN "Payment" p ON p."movementId" = m.id
         WHERE ${k("m")} = 'PAYMENT')::numeric(12,2)::text AS encaisse,
       (SELECT COALESCE(SUM(b.cost), 0) FROM "DocumentBalance" b
         WHERE b.status IN ('CONFIRMED', 'DELIVERED'))::numeric(12,2)::text AS couts,
       (SELECT COALESCE(-SUM(m.amount), 0) FROM "CashMovement" m
          JOIN "BatchExpense" e ON e."movementId" = COALESCE(m."reversesId", m.id)
         WHERE ${k("m")} = 'EXPENSE')::numeric(12,2)::text AS depenses`,
    reference.horodatages.calculeLe,
  );
  return {
    ...ligne,
    margeNette: euros(centimes(ligne.encaisse) - centimes(ligne.couts) - centimes(ligne.depenses)),
  };
}
