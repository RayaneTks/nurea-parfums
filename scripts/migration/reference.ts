/**
 * Référence figée AVANT la reprise (docs/refonte/03-MODELE-DONNEES.md §7.2 ; 07-PLAN-EXECUTION.md §2.2, §2.5).
 *
 *   npm run migration:reference -- [--out <dossier>] [--instant <ISO>] [--confirm-host <hôte>]
 *
 * Calcule sur l'ANCIEN schéma, avec les ANCIENNES formules recopiées en SQL :
 * - solde de chaque poche (archivées comprises), total des poches non archivées, non attribué (C1) ;
 * - dû de chaque vente, total / payé net / dû de chaque commande (V2–V4) ;
 * - ancien Encaissé global (`revenueSummary` de src/server/kpi/queries.ts + `confirmedOrdersFinancials`
 *   de src/server/orders/financials.ts, branche main) et sa décomposition D0, D1, D2 (C2, C3) ;
 * - ancien À encaisser (`listOutstanding` de src/server/collect/queries.ts, reste dû borné, C4) ;
 * - informatif : ancienne liste À encaisser non bornée, Encaissé du mois, Marge nette globale (C6) ;
 * - comptages par table et les trois comptages de la vitrine (V9) ;
 * - nombre et empreinte des visuels story `PerfumeMedia`, table conservée en place (V11).
 *
 * Lecture seule : une transaction REPEATABLE READ READ ONLY (toutes les mesures voient le même
 * instantané). Refuse de s'exécuter si la table "Order" n'existe plus dans public (déjà contractée).
 * Écrit `<dossier>/reference.json` (dossier relatif rangé sous migration-artifacts/<date>/).
 *
 * `--instant <ISO>` remplace `transaction_timestamp()` par l'instant donné : deux mesures informatives
 * dépendent du calendrier (le mois courant et son Encaissé). Le retour arrière (§1.7) le passe pour
 * recalculer la référence dans la MÊME fenêtre de mois que celle d'avant la bascule — `mesures` ne
 * dépend alors plus que des données, et la comparaison peut être exacte au centime. Nulle part ailleurs.
 */
import path from "node:path";
import { centimes, euros } from "./lib/argent";
import { ecrireFichier, json, parId, resoudreSortie } from "./lib/artefacts";
import { FORMAT_DATE, HostRefusedError, lignes, lireCible, ouvrirBase, premiere, type Sql } from "./lib/base";
import { ErreurUsage, lireArguments } from "./lib/cli";
import {
  FORMAT_REFERENCE,
  type CommandeReference,
  type Comptages,
  type PocheReference,
  type Reference,
  type VenteReference,
} from "./lib/reference-format";
import { mesurerVisuels } from "./lib/visuels";
import { comptagesVitrine } from "./lib/vitrine";
import { hostOf } from "../lib/garde-hote";

const USAGE = "migration:reference";

/** Payé net et total de chaque commande sans vente (base de C2, C3, C4 : 07 §2.5). */
const REF_COMMANDES = `
  SELECT o.id, o.status::text AS status,
         (SELECT COALESCE(SUM(i."unitPrice" * i.quantity), 0) FROM "OrderItem" i WHERE i."orderId" = o.id) AS total,
         (SELECT COALESCE(SUM(CASE WHEN t.type = 'REFUND' THEN -t.amount ELSE t.amount END), 0)
            FROM "PaymentTransaction" t WHERE t."orderId" = o.id) AS paye
  FROM "Order" o
  WHERE NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = o.id)`;

/** Format de `--instant` : celui que le script écrit lui-même (`FORMAT_DATE` + « Z »). */
const FORMAT_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

async function calculerReference(db: Sql, hote: string, instant?: string): Promise<Reference> {
  const { calculeLe } =
    instant === undefined
      ? await premiere<{ calculeLe: string }>(
          db,
          `SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC', ${FORMAT_DATE}) || 'Z' AS "calculeLe"`,
        )
      : { calculeLe: instant };

  const comptages = await premiere<Comptages>(
    db,
    `SELECT
       (SELECT count(*)::int FROM "Order") AS "Order",
       (SELECT count(*)::int FROM "OrderItem") AS "OrderItem",
       (SELECT count(*)::int FROM "Sale") AS "Sale",
       (SELECT count(*)::int FROM "SaleItem") AS "SaleItem",
       (SELECT count(*)::int FROM "PaymentTransaction") AS "PaymentTransaction",
       (SELECT count(*)::int FROM "CashMovement") AS "CashMovement",
       (SELECT count(*)::int FROM "BatchExpense") AS "BatchExpense",
       (SELECT count(*)::int FROM "Pocket") AS "Pocket",
       (SELECT count(*)::int FROM "Customer") AS "Customer",
       (SELECT count(*)::int FROM "Batch") AS "Batch",
       (SELECT count(*)::int FROM "Brand") AS "Brand",
       (SELECT count(*)::int FROM "Perfume") AS "Perfume",
       (SELECT count(*)::int FROM "PerfumePricing") AS "PerfumePricing",
       (SELECT count(*)::int FROM "PerfumeMedia") AS "PerfumeMedia",
       (SELECT count(*)::int FROM "Sale" s JOIN "Order" o ON o.id = s."orderId") AS paires,
       (SELECT count(*)::int FROM "OrderItem" i
         WHERE NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = i."orderId")) AS "orderItemsHorsPaires"`,
  );

  // C1 : solde par poche, tel que l'app l'affichait (archivées comprises pour V1).
  const poches = await lignes<PocheReference>(
    db,
    `SELECT p.id, p.name AS nom, p.archived AS archivee, p."isSystem" AS systeme,
            p."openingBalance"::numeric(12,2)::text AS "soldeOuverture",
            (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS solde
     FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id
     GROUP BY p.id`,
  );
  const tresorerie = await premiere<{ totalNonArchivees: string; nonAttribue: string }>(
    db,
    `SELECT COALESCE(SUM(solde) FILTER (WHERE NOT archived), 0)::numeric(12,2)::text AS "totalNonArchivees",
            COALESCE(SUM(solde) FILTER (WHERE "isSystem"), 0)::numeric(12,2)::text AS "nonAttribue"
     FROM (SELECT p.archived, p."isSystem", p."openingBalance" + COALESCE(SUM(m.amount), 0) AS solde
           FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id GROUP BY p.id) s`,
  );

  // Dû de chaque vente, tel que la compta l'affichait (03 §7.2).
  const ventes = await lignes<VenteReference>(
    db,
    `SELECT s.id, o.id AS "commandeId",
            s."totalRevenue"::numeric(12,2)::text AS "totalRevenue",
            s."remainingDue"::numeric(12,2)::text AS "remainingDue",
            LEAST(GREATEST(s."remainingDue", 0), s."totalRevenue")::numeric(12,2)::text AS du
     FROM "Sale" s LEFT JOIN "Order" o ON o.id = s."orderId"`,
  );

  // Total et payé net de chaque commande ; dû = max(0, total − payé net) (03 §7.2).
  const commandes = await lignes<CommandeReference>(
    db,
    `SELECT c.id, c.statut, c.total::numeric(12,2)::text AS total, c.paye::numeric(12,2)::text AS "payeNet",
            GREATEST(c.total - c.paye, 0)::numeric(12,2)::text AS du, c.a_une_vente AS "aUneVente"
     FROM (SELECT o.id, o.status::text AS statut,
                  (SELECT COALESCE(SUM(i."unitPrice" * i.quantity), 0) FROM "OrderItem" i WHERE i."orderId" = o.id) AS total,
                  (SELECT COALESCE(SUM(CASE WHEN t.type = 'REFUND' THEN -t.amount ELSE t.amount END), 0)
                     FROM "PaymentTransaction" t WHERE t."orderId" = o.id) AS paye,
                  EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = o.id) AS a_une_vente
           FROM "Order" o) c`,
  );

  // C2 (référence), D0, D1, D2, C4 : SQL de 07 §2.5, la vue temporaire écrite en CTE (lecture seule).
  const encaisse = await premiere<{ ancien: string; d0: string; d1: string; d2: string; aEncaisser: string }>(
    db,
    `WITH ref_commandes AS (${REF_COMMANDES})
     SELECT
       ((SELECT COALESCE(SUM("totalRevenue" - "remainingDue"), 0) FROM "Sale")
        + (SELECT COALESCE(SUM(GREATEST(LEAST(paye, total), 0)), 0) FROM ref_commandes
            WHERE status IN ('READY', 'DELIVERED')))::numeric(12,2)::text AS ancien,
       (SELECT COALESCE(SUM(("totalRevenue" - "remainingDue")
                            - LEAST(GREATEST("totalRevenue" - "remainingDue", 0), "totalRevenue")), 0)
          FROM "Sale")::numeric(12,2)::text AS d0,
       (SELECT COALESCE(SUM(paye), 0) FROM ref_commandes
         WHERE status IN ('PENDING', 'CANCELLED'))::numeric(12,2)::text AS d1,
       (SELECT COALESCE(SUM(paye - GREATEST(LEAST(paye, total), 0)), 0) FROM ref_commandes
         WHERE status IN ('READY', 'DELIVERED'))::numeric(12,2)::text AS d2,
       ((SELECT COALESCE(SUM(LEAST(GREATEST("remainingDue", 0), "totalRevenue")), 0) FROM "Sale")
        + (SELECT COALESCE(SUM(GREATEST(total - paye, 0)), 0) FROM ref_commandes
            WHERE status IN ('READY', 'DELIVERED')))::numeric(12,2)::text AS "aEncaisser"`,
  );

  // Informatif (C6, R1, R2). Anciennes formules : listOutstanding (reste dû non borné, seuil 0,005),
  // monthSummary (mois UTC du serveur), revenueSummary (Marge nette = Encaissé − coûts − dépenses).
  const informatif = await premiere<{
    aEncaisserListeAncienne: string;
    mois: string;
    encaisseMoisAncien: string;
    coutsAncien: string;
    depensesAncien: string;
  }>(
    db,
    `WITH ref_commandes AS (${REF_COMMANDES})
     SELECT
       ((SELECT COALESCE(SUM("remainingDue"), 0) FROM "Sale" WHERE "remainingDue" > 0.005)
        + (SELECT COALESCE(SUM(total - paye), 0) FROM ref_commandes
            WHERE status IN ('READY', 'DELIVERED') AND total - paye > 0.005))::numeric(12,2)::text AS "aEncaisserListeAncienne",
       to_char($1::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM') AS mois,
       (SELECT COALESCE(SUM("totalRevenue" - "remainingDue"), 0) FROM "Sale"
         WHERE "soldAt" >= date_trunc('month', $1::timestamptz AT TIME ZONE 'UTC'))::numeric(12,2)::text AS "encaisseMoisAncien",
       ((SELECT COALESCE(SUM("totalCost"), 0) FROM "Sale")
        + (SELECT COALESCE(SUM(i."unitCost" * i.quantity), 0) FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
            WHERE o.status IN ('READY', 'DELIVERED')
              AND NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = o.id)))::numeric(12,2)::text AS "coutsAncien",
       (SELECT COALESCE(SUM(amount), 0) FROM "BatchExpense")::numeric(12,2)::text AS "depensesAncien"`,
    calculeLe,
  );

  const vitrine = await comptagesVitrine(db);
  const visuels = await mesurerVisuels(db);

  return {
    format: FORMAT_REFERENCE,
    horodatages: instant === undefined ? { calculeLe, hote } : { calculeLe, hote, instantImpose: true },
    mesures: {
      comptages,
      poches: parId(poches, (p) => p.id),
      tresorerie,
      ventes: parId(ventes, (v) => v.id),
      commandes: parId(commandes, (c) => c.id),
      encaisse: { ancien: encaisse.ancien, d0: encaisse.d0, d1: encaisse.d1, d2: encaisse.d2 },
      aEncaisser: { ancien: encaisse.aEncaisser },
      informatif: {
        aEncaisserListeAncienne: informatif.aEncaisserListeAncienne,
        mois: informatif.mois,
        encaisseMoisAncien: informatif.encaisseMoisAncien,
        coutsAncien: informatif.coutsAncien,
        depensesAncien: informatif.depensesAncien,
        margeNetteAncienne: euros(
          centimes(encaisse.ancien) - centimes(informatif.coutsAncien) - centimes(informatif.depensesAncien),
        ),
      },
      vitrine,
      visuels,
    },
  };
}

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), { valeurs: ["--out", "--confirm-host", "--instant"] });
  const url = lireCible(USAGE, args.valeurs.get("--confirm-host"));
  const dossier = resoudreSortie(args.valeurs.get("--out"));
  const instant = args.valeurs.get("--instant");
  if (instant !== undefined && !FORMAT_INSTANT.test(instant)) {
    throw new ErreurUsage(`--instant attend un instant UTC à la milliseconde (2026-09-17T22:10:00.000Z), reçu « ${instant} ».`);
  }

  const db = await ouvrirBase(url);
  try {
    const { present } = await premiere<{ present: boolean }>(
      db,
      `SELECT to_regclass('public."Order"') IS NOT NULL AS present`,
    );
    if (!present) {
      console.error(`${USAGE} — refus : la table "Order" n'existe pas dans public (base déjà contractée ?).`);
      return 1;
    }
    const reference = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
        return calculerReference(tx, hostOf(url), instant);
      },
      { maxWait: 10_000, timeout: 10 * 60_000 },
    );
    const fichier = path.join(dossier, "reference.json");
    ecrireFichier(fichier, json(reference));
    const m = reference.mesures;
    console.log(`${USAGE} — ${fichier}`);
    console.log(
      `  Trésorerie ${m.tresorerie.totalNonArchivees} (non attribué ${m.tresorerie.nonAttribue}) · ` +
        `Encaissé ${m.encaisse.ancien} (D0 ${m.encaisse.d0}, D1 ${m.encaisse.d1}, D2 ${m.encaisse.d2}) · ` +
        `À encaisser ${m.aEncaisser.ancien} · vitrine ${m.vitrine.parfumsPublies}/${m.vitrine.cartesGamme}/${m.vitrine.marquesExplorer}`,
    );
    return 0;
  } finally {
    await db.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof HostRefusedError || error instanceof ErreurUsage) {
      console.error(`${USAGE} — ${error.message}`);
    } else {
      console.error(`${USAGE} — échec :`, error);
    }
    process.exit(1);
  },
);
