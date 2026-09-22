/**
 * 3c — Documents et lignes (docs/refonte/03-MODELE-DONNEES.md §7.4, horodatages et lignes : §7.7).
 *
 * - `Order` sans vente → `SaleDocument` (id conservé, origine ORDER, READY → CONFIRMED) ;
 * - paire `Order` + `Sale` → UN document (id de la commande, DELIVERED), client/lot/contact récupérés
 *   de la commande si la vente les a perdus, notes concaténées si différentes ;
 * - `Sale` sans commande (directe, ou commande purgée) → document DIRECT_SALE (id de la vente) ;
 * - lignes : `OrderItem` des commandes sans vente et tous les `SaleItem` (ids conservés) ; les
 *   `OrderItem` d'une paire ne sont pas repris (la vente fait foi) et ne servent qu'à rendre aux lignes
 *   de vente le coût perdu au pont.
 *
 * Horodatages (03 §7.7) :
 * - commande READY sans vente : `confirmedAt` = premier `paidAt` DEPOSIT/BALANCE, sinon `orderedAt` ;
 * - commande DELIVERED sans vente : même règle, bornée par `deliveredAt` — l'engagement ne peut pas
 *   suivre la livraison, règle que 03 §7.7 écrit pour les paires (décision J2, documentée en 03 §7.7) ;
 *   `deliveredAt` = `Order.deliveredAt`, sinon `updatedAt` — JAMAIS `deliveryAt`, qui est la livraison
 *   PRÉVUE : une commande livrée en avance serait datée dans le futur (erreur corrigée en production
 *   par `20260910160000_fix_delivered_at_backfill`, commit 9e0b5d8) ;
 * - paire (quel que soit le statut de la commande) : premier `paidAt` DEPOSIT/BALANCE s'il précède
 *   `soldAt`, sinon `soldAt` ; `deliveredAt` = `soldAt` ;
 * - vente sans commande : `orderedAt` = `confirmedAt` = `deliveredAt` = `soldAt` ;
 * - `cancelledAt` = `updatedAt`.
 * Les anciennes dates sont des `timestamp` sans fuseau écrits en UTC par Prisma : `AT TIME ZONE 'UTC'`.
 *
 * Appariement pour les coûts (03 §7.7) : dans une paire, chaque `SaleItem` est apparié au `OrderItem`
 * de même parfum et même volume de même rang (ordre des identifiants) — « la première ligne non encore
 * appariée ». Une ligne de vente au coût inconnu (`unitCost = 0` et `unitCostDzd` NULL) reprend le coût
 * €, le coût DZD et le taux de sa ligne de commande si celle-ci en a un. Une ligne hors catalogue
 * (`perfumeId` NULL) n'est jamais appariée : aucun critère sûr (décision J2).
 */
import { lignes } from "../lib/base";
import type { Contexte } from "./contexte";

const UTC = (colonne: string) => `(${colonne} AT TIME ZONE 'UTC')`;
const HORS_CATALOGUE = "Hors catalogue";
/** Date d'une ancienne colonne `timestamp` (UTC sans fuseau), en ISO Z. */
const DATE_NAIVE = (colonne: string) => `to_char(${colonne}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
/** Date d'une colonne `timestamptz`, en ISO Z quel que soit le fuseau de session. */
const DATE_TZ = (colonne: string) => `to_char(${colonne} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

/** Nom non vide, sinon NULL (le texte d'origine est conservé tel quel). */
const nonVide = (expression: string) => `CASE WHEN btrim(${expression}) <> '' THEN ${expression} END`;

export async function etape3cDocuments(ctx: Contexte): Promise<void> {
  const { tx } = ctx;

  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE tmp_premier_paiement ON COMMIT DROP AS
    SELECT "orderId", MIN("paidAt") AS "paidAt" FROM "PaymentTransaction"
    WHERE type IN ('DEPOSIT', 'BALANCE') GROUP BY "orderId"`);

  const colonnesDocument = `(id, origin, status, "customerId", "customerName", "customerContact", "batchId", "orderedAt",
     "expectedDeliveryAt", "expectedDeliveryHasTime", "confirmedAt", "deliveredAt", "cancelledAt", notes, "createdAt", "updatedAt")`;

  // Commandes sans vente. Livraison réelle, sinon dernière modification ; la date prévue n'en est pas une.
  const livraison = `COALESCE(o."deliveredAt", o."updatedAt")`;
  await tx.$executeRawUnsafe(`
    INSERT INTO "SaleDocument" ${colonnesDocument}
    SELECT o.id, 'ORDER',
           (CASE o.status::text WHEN 'READY' THEN 'CONFIRMED' ELSE o.status::text END)::"DocumentStatus",
           o."customerId", o."customerName", o."customerContact", o."batchId",
           ${UTC(`o."orderedAt"`)}, ${UTC(`o."deliveryAt"`)}, false,
           CASE o.status::text
             WHEN 'READY' THEN ${UTC(`COALESCE(pp."paidAt", o."orderedAt")`)}
             WHEN 'DELIVERED' THEN ${UTC(`LEAST(COALESCE(pp."paidAt", o."orderedAt"), ${livraison})`)}
           END,
           CASE WHEN o.status::text = 'DELIVERED' THEN ${UTC(livraison)} END,
           CASE WHEN o.status::text = 'CANCELLED' THEN ${UTC(`o."updatedAt"`)} END,
           o.notes, ${UTC(`o."createdAt"`)}, ${UTC(`o."updatedAt"`)}
    FROM "Order" o LEFT JOIN tmp_premier_paiement pp ON pp."orderId" = o.id
    WHERE NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = o.id)`);

  // Paires.
  await tx.$executeRawUnsafe(`
    INSERT INTO "SaleDocument" ${colonnesDocument}
    SELECT o.id, 'ORDER', 'DELIVERED',
           COALESCE(s."customerId", o."customerId"),
           COALESCE(${nonVide(`s."customerName"`)}, o."customerName"),
           COALESCE(${nonVide(`s."customerContact"`)}, o."customerContact"),
           COALESCE(s."batchId", o."batchId"),
           ${UTC(`o."orderedAt"`)}, ${UTC(`o."deliveryAt"`)}, false,
           ${UTC(`CASE WHEN pp."paidAt" < s."soldAt" THEN pp."paidAt" ELSE s."soldAt" END`)},
           ${UTC(`s."soldAt"`)}, NULL,
           CASE WHEN o.notes IS NULL OR btrim(o.notes) = '' THEN COALESCE(s.notes, o.notes)
                WHEN s.notes IS NULL OR btrim(s.notes) = '' OR s.notes = o.notes THEN o.notes
                ELSE o.notes || E'\\n\\n' || s.notes END,
           ${UTC(`o."createdAt"`)}, ${UTC(`GREATEST(o."updatedAt", s."updatedAt")`)}
    FROM "Sale" s JOIN "Order" o ON o.id = s."orderId"
    LEFT JOIN tmp_premier_paiement pp ON pp."orderId" = o.id`);

  // Ventes sans commande.
  await tx.$executeRawUnsafe(`
    INSERT INTO "SaleDocument" ${colonnesDocument}
    SELECT s.id, 'DIRECT_SALE', 'DELIVERED', s."customerId", s."customerName", s."customerContact", s."batchId",
           ${UTC(`s."soldAt"`)}, NULL, false, ${UTC(`s."soldAt"`)}, ${UTC(`s."soldAt"`)}, NULL,
           s.notes, ${UTC(`s."createdAt"`)}, ${UTC(`s."updatedAt"`)}
    FROM "Sale" s
    WHERE s."orderId" IS NULL OR NOT EXISTS (SELECT 1 FROM "Order" o WHERE o.id = s."orderId")`);

  // Appariement des lignes des paires.
  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE tmp_appariement ON COMMIT DROP AS
    WITH rang_vente AS (
      SELECT si.id, si."perfumeId", si."volumeMl", o.id AS "orderId",
             ROW_NUMBER() OVER (PARTITION BY si."saleId", si."perfumeId", si."volumeMl" ORDER BY si.id COLLATE "C") AS rang
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN "Order" o ON o.id = s."orderId"
      WHERE si."perfumeId" IS NOT NULL AND si."volumeMl" IS NOT NULL
    ), rang_commande AS (
      SELECT oi.id, oi."orderId", oi."perfumeId", oi."volumeMl", oi."unitCost", oi."unitCostDzd", oi."exchangeRate",
             ROW_NUMBER() OVER (PARTITION BY oi."orderId", oi."perfumeId", oi."volumeMl" ORDER BY oi.id COLLATE "C") AS rang
      FROM "OrderItem" oi WHERE oi."perfumeId" IS NOT NULL
    )
    SELECT rv.id AS "saleItemId", rc.id AS "orderItemId", rc."unitCost", rc."unitCostDzd", rc."exchangeRate"
    FROM rang_vente rv
    JOIN rang_commande rc ON rc."orderId" = rv."orderId" AND rc."perfumeId" = rv."perfumeId"
                         AND rc."volumeMl" = rv."volumeMl" AND rc.rang = rv.rang`);

  const colonnesLigne = `(id, "documentId", position, "perfumeId", "isOffCatalog", "perfumeName", "brandName", "imageUrl",
     "volumeMl", quantity, "deliveredQuantity", "unitPriceEur", "isGift", "unitCostDzd", "exchangeRate", "unitCostEur",
     note, "createdAt", "updatedAt")`;

  // Lignes des commandes sans vente : jointure Perfume, sinon snapshot, sinon « Hors catalogue ».
  await tx.$executeRawUnsafe(`
    INSERT INTO "SaleLine" ${colonnesLigne}
    SELECT i.id, i."orderId", (ROW_NUMBER() OVER (PARTITION BY i."orderId" ORDER BY i.id COLLATE "C") - 1)::int,
           i."perfumeId", i."perfumeId" IS NULL,
           COALESCE(${nonVide("p.name")}, ${nonVide(`i."perfumeSnapshot"->>'name'`)}, '${HORS_CATALOGUE}'),
           COALESCE(${nonVide("b.name")}, ${nonVide(`i."perfumeSnapshot"->>'brandName'`)}),
           COALESCE(${nonVide("p.image")}, ${nonVide(`i."perfumeSnapshot"->>'image'`)}),
           i."volumeMl", i.quantity, i."deliveredQuantity", i."unitPrice", i."isGift", i."unitCostDzd", i."exchangeRate",
           CASE WHEN i."unitCost" = 0 AND i."unitCostDzd" IS NULL THEN NULL ELSE i."unitCost" END,
           i.note, d."createdAt", d."updatedAt"
    FROM "OrderItem" i
    JOIN "SaleDocument" d ON d.id = i."orderId"
    LEFT JOIN "Perfume" p ON p.id = i."perfumeId" LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = i."orderId")`);

  // Lignes de vente : snapshot, sinon jointure Perfume, sinon « Hors catalogue » ; coût enrichi pour les paires.
  const coutInconnu = `(si."unitCost" = 0 AND si."unitCostDzd" IS NULL)`;
  const enrichi = `(${coutInconnu} AND a."orderItemId" IS NOT NULL AND (a."unitCost" <> 0 OR a."unitCostDzd" IS NOT NULL))`;
  await tx.$executeRawUnsafe(`
    INSERT INTO "SaleLine" ${colonnesLigne}
    SELECT si.id, COALESCE(o.id, s.id),
           (ROW_NUMBER() OVER (PARTITION BY si."saleId" ORDER BY si.id COLLATE "C") - 1)::int,
           si."perfumeId", si."perfumeId" IS NULL,
           COALESCE(${nonVide(`si."perfumeSnapshot"->>'name'`)}, ${nonVide("p.name")}, '${HORS_CATALOGUE}'),
           COALESCE(${nonVide(`si."perfumeSnapshot"->>'brandName'`)}, ${nonVide("b.name")}),
           COALESCE(${nonVide(`si."perfumeSnapshot"->>'image'`)}, ${nonVide("p.image")}),
           si."volumeMl", si.quantity, si.quantity, si."unitPrice", si."isGift",
           CASE WHEN ${enrichi} THEN a."unitCostDzd" ELSE si."unitCostDzd" END,
           CASE WHEN ${enrichi} THEN a."exchangeRate" ELSE si."exchangeRate" END,
           CASE WHEN ${enrichi} THEN a."unitCost" WHEN ${coutInconnu} THEN NULL ELSE si."unitCost" END,
           si.note, d."createdAt", d."updatedAt"
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    LEFT JOIN "Order" o ON o.id = s."orderId"
    JOIN "SaleDocument" d ON d.id = COALESCE(o.id, s.id)
    LEFT JOIN tmp_appariement a ON a."saleItemId" = si.id
    LEFT JOIN "Perfume" p ON p.id = si."perfumeId" LEFT JOIN "Brand" b ON b.id = p."brandId"`);

  // Correspondances (07 §2.2).
  await tx.$executeRawUnsafe(`
    INSERT INTO legacy."MigrationMap" ("oldTable", "oldId", "newTable", "newId", note)
    SELECT 'Order', o.id, 'SaleDocument', o.id,
           CASE WHEN EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = o.id) THEN 'paire' ELSE 'commande' END
    FROM "Order" o
    UNION ALL
    SELECT 'Sale', s.id, 'SaleDocument', COALESCE(o.id, s.id), CASE WHEN o.id IS NULL THEN 'vente sans commande' ELSE 'paire' END
    FROM "Sale" s LEFT JOIN "Order" o ON o.id = s."orderId"
    UNION ALL
    SELECT 'OrderItem', i.id, 'SaleLine', i.id, 'ligne de commande'
    FROM "OrderItem" i WHERE NOT EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = i."orderId")
    UNION ALL
    SELECT 'OrderItem', i.id, 'SaleLine', a."saleItemId",
           'ligne de commande d''une paire, non reprise (la vente fait foi)'
    FROM "OrderItem" i LEFT JOIN tmp_appariement a ON a."orderItemId" = i.id
    WHERE EXISTS (SELECT 1 FROM "Sale" s WHERE s."orderId" = i."orderId")
    UNION ALL
    SELECT 'SaleItem', si.id, 'SaleLine', si.id, 'ligne de vente' FROM "SaleItem" si`);

  await listesR4Documents(ctx);
}

async function listesR4Documents(ctx: Contexte): Promise<void> {
  const { tx, r4 } = ctx;
  const nomClient = `COALESCE(c."fullName", d."customerName")`;
  const ligneAvecDocument = `
    FROM "SaleLine" l JOIN "SaleDocument" d ON d.id = l."documentId" LEFT JOIN "Customer" c ON c.id = d."customerId"`;

  r4.horsCatalogueReconstituees.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, ${nomClient} AS client, l."volumeMl" AS "volumeMl",
              l."unitPriceEur"::text AS prix
       ${ligneAvecDocument}
       WHERE l.id IN (
         SELECT i.id FROM "OrderItem" i LEFT JOIN "Perfume" p ON p.id = i."perfumeId"
         WHERE ${nonVide("p.name")} IS NULL AND ${nonVide(`i."perfumeSnapshot"->>'name'`)} IS NULL
         UNION ALL
         SELECT si.id FROM "SaleItem" si LEFT JOIN "Perfume" p ON p.id = si."perfumeId"
         WHERE ${nonVide(`si."perfumeSnapshot"->>'name'`)} IS NULL AND ${nonVide("p.name")} IS NULL)
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.volumesAtypiques.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, ${nomClient} AS client, l."perfumeName" AS parfum,
              l."brandName" AS marque, l."volumeMl" AS "volumeMl"
       ${ligneAvecDocument}
       WHERE l."volumeMl" IS NULL OR l."volumeMl" NOT IN (10, 50, 80)
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.donsPrixNonNul.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, ${nomClient} AS client, l."perfumeName" AS parfum,
              l."brandName" AS marque, l."unitPriceEur"::text AS prix
       ${ligneAvecDocument}
       WHERE l."isGift" AND l."unitPriceEur" <> 0
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.coutsDzdSansTaux.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, ${nomClient} AS client, l."perfumeName" AS parfum,
              l."unitCostDzd"::text AS "coutDzd", l."exchangeRate"::text AS taux, l."unitCostEur"::text AS "coutEur"
       ${ligneAvecDocument}
       WHERE NOT (("unitCostEur" IS NULL OR "unitCostEur" >= 0)
              AND ("unitCostDzd" IS NULL OR ("unitCostDzd" >= 0 AND "exchangeRate" IS NOT NULL AND "exchangeRate" > 0
                                             AND "unitCostEur" IS NOT NULL)))
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.autresLignesHorsRegles.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, l."perfumeName" AS parfum, regle
       FROM (
         SELECT id, 'line_quantity_ck' AS regle FROM "SaleLine" WHERE NOT (quantity >= 1)
         UNION ALL SELECT id, 'line_delivered_ck' FROM "SaleLine" WHERE NOT ("deliveredQuantity" BETWEEN 0 AND quantity)
         UNION ALL SELECT id, 'line_price_ck' FROM "SaleLine" WHERE NOT ("unitPriceEur" >= 0)
         UNION ALL SELECT id, 'line_name_ck' FROM "SaleLine" WHERE NOT (btrim("perfumeName") <> '')
         UNION ALL SELECT id, 'line_off_catalog_ck' FROM "SaleLine" WHERE NOT (NOT "isOffCatalog" OR "perfumeId" IS NULL)
       ) v JOIN "SaleLine" l ON l.id = v.id
       ORDER BY l.id COLLATE "C", regle`,
    )),
  );

  r4.catalogueHorsRegles.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT regle, id FROM (
         SELECT 'brand_complete_logo_ck' AS regle, id::text AS id FROM "Brand"
         WHERE NOT (status::text = 'DRAFT' OR "catalogMode"::text = 'CURATED' OR COALESCE(btrim(image), '') <> '')
         UNION ALL SELECT 'perfume_publish_image_ck', id::text FROM "Perfume"
         WHERE NOT (status::text = 'DRAFT' OR btrim(image) <> '')
         UNION ALL SELECT 'pricing_volume_ck', "perfumeId"::text || ':' || "volumeMl"::text FROM "PerfumePricing"
         WHERE NOT ("volumeMl" IN (10, 50, 80))
         UNION ALL SELECT 'pricing_amounts_ck', "perfumeId"::text || ':' || "volumeMl"::text FROM "PerfumePricing"
         WHERE NOT ("defaultUnitPriceEur" >= 0 AND ("defaultUnitCostDzd" IS NULL OR "defaultUnitCostDzd" >= 0)
                    AND ("defaultExchangeRate" IS NULL OR "defaultExchangeRate" > 0))
       ) v ORDER BY regle, id COLLATE "C"`,
    )),
  );

  r4.pairesCommandeNonLivree.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT d.id AS document, s.id AS vente, ${nomClient} AS client, o.status::text AS "statutCommande",
              ${DATE_NAIVE(`s."soldAt"`)} AS "venduLe", ${DATE_NAIVE(`pp."paidAt"`)} AS "premierPaiement",
              ${DATE_TZ(`d."confirmedAt"`)} AS "confirmedAt",
              CASE WHEN pp."paidAt" < s."soldAt" THEN 'premier paiement' ELSE 'date de la vente' END AS regle
       FROM "Sale" s JOIN "Order" o ON o.id = s."orderId" JOIN "SaleDocument" d ON d.id = o.id
       LEFT JOIN "Customer" c ON c.id = d."customerId"
       LEFT JOIN tmp_premier_paiement pp ON pp."orderId" = o.id
       WHERE o.status::text <> 'DELIVERED'
       ORDER BY d.id COLLATE "C"`,
    )),
  );

  r4.coutsEnrichis.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, a."orderItemId" AS "ligneCommande", l."documentId" AS document, ${nomClient} AS client,
              l."perfumeName" AS parfum, l."volumeMl" AS "volumeMl", l."unitCostEur"::text AS "coutEur",
              l."unitCostDzd"::text AS "coutDzd", l."exchangeRate"::text AS taux
       ${ligneAvecDocument}
       JOIN tmp_appariement a ON a."saleItemId" = l.id
       JOIN "SaleItem" si ON si.id = l.id
       WHERE si."unitCost" = 0 AND si."unitCostDzd" IS NULL AND (a."unitCost" <> 0 OR a."unitCostDzd" IS NOT NULL)
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.coutsInconnus.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT l.id AS ligne, l."documentId" AS document, ${nomClient} AS client, l."perfumeName" AS parfum,
              l."brandName" AS marque, l."volumeMl" AS "volumeMl", l.quantity AS quantite
       ${ligneAvecDocument}
       WHERE l."unitCostEur" IS NULL
       ORDER BY l.id COLLATE "C"`,
    )),
  );

  r4.liensClientRecuperes.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT o.id AS document, s.id AS vente, o."customerId" AS "clientId", c."fullName" AS client
       FROM "Sale" s JOIN "Order" o ON o.id = s."orderId" LEFT JOIN "Customer" c ON c.id = o."customerId"
       WHERE s."customerId" IS NULL AND o."customerId" IS NOT NULL
       ORDER BY o.id COLLATE "C"`,
    )),
  );

  r4.liensLotRecuperes.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT o.id AS document, s.id AS vente, o."batchId" AS "lotId", b.name AS lot
       FROM "Sale" s JOIN "Order" o ON o.id = s."orderId" LEFT JOIN "Batch" b ON b.id = o."batchId"
       WHERE s."batchId" IS NULL AND o."batchId" IS NOT NULL
       ORDER BY o.id COLLATE "C"`,
    )),
  );

  // Cache `depositAmount` = max(Σ DEPOSIT − Σ REFUND, 0) (refreshOrderCache) : écarts > 0,01 € pour information.
  r4.cachesAcompteDivergents.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT o.id AS document, COALESCE(c."fullName", o."customerName") AS client,
              o."depositAmount"::numeric(12,2)::text AS cache, l.acompte::numeric(12,2)::text AS ledger
       FROM "Order" o LEFT JOIN "Customer" c ON c.id = o."customerId"
       CROSS JOIN LATERAL (
         SELECT GREATEST(COALESCE(SUM(CASE t.type::text WHEN 'DEPOSIT' THEN t.amount WHEN 'REFUND' THEN -t.amount ELSE 0 END), 0), 0) AS acompte
         FROM "PaymentTransaction" t WHERE t."orderId" = o.id) l
       WHERE abs(o."depositAmount" - l.acompte) > 0.01
       ORDER BY o.id COLLATE "C"`,
    )),
  );

  r4.resteDuHorsBornes.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT d.id AS document, s.id AS vente, ${nomClient} AS client, s."totalRevenue"::text AS total,
              s."remainingDue"::text AS "resteDu",
              LEAST(GREATEST(s."remainingDue", 0), s."totalRevenue")::numeric(12,2)::text AS "resteDuBorne"
       FROM "Sale" s JOIN "SaleDocument" d ON d.id = COALESCE((SELECT o.id FROM "Order" o WHERE o.id = s."orderId"), s.id)
       LEFT JOIN "Customer" c ON c.id = d."customerId"
       WHERE s."remainingDue" < 0 OR s."remainingDue" > s."totalRevenue"
       ORDER BY d.id COLLATE "C"`,
    )),
  );

  r4.documentsSansClient.push(
    ...(await lignes<Record<string, unknown>>(
      tx,
      `SELECT d.id AS document, d.origin::text AS origine, ${DATE_TZ(`d."orderedAt"`)} AS date
       FROM "SaleDocument" d
       WHERE d."customerId" IS NULL AND (d."customerName" IS NULL OR btrim(d."customerName") = '')
       ORDER BY d.id COLLATE "C"`,
    )),
  );
}
