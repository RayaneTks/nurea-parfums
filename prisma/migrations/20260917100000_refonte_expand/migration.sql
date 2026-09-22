-- Refonte « Nuréa Gestion » — migration EXPAND (additive).
-- Référence : docs/refonte/03-MODELE-DONNEES.md §7.3 étape 2 ; docs/refonte/07-PLAN-EXECUTION.md §2.
--
-- Ne s'applique JAMAIS par un build (garde scripts/migration/migrate-deploy-guarded.ts) :
-- en production et en répétition, `npm run migration:sql -- refonte_expand`. Sur une base
-- de test, `prisma migrate reset` l'enchaîne avec le contract (aucune donnée à reprendre).
--
-- Additive : l'ancienne app continue de fonctionner si la reprise échoue (03 §7.9).
-- Ne touche aucune colonne lue par la vitrine.
--
-- S'ordonne APRÈS toutes les migrations ordinaires déjà appliquées en production, dont les trois du
-- 10/09/2026 (20260910120000_real_volumes_10_50_80, 20260910140000_perfume_media,
-- 20260910160000_fix_delivered_at_backfill) : la table "PerfumeMedia" existe donc déjà, et reste
-- dans public telle quelle (03 §7.4).
--
-- Tant qu'elle n'a pas été appliquée en production, ce fichier se MODIFIE au lieu d'être
-- complété par un nouveau dossier (07 §2.1, règle des deux migrations).

BEGIN;

-- ─── Schéma des anciennes tables et des traces de reprise ───────────────────────────
-- IF NOT EXISTS : le retour arrière (07 §1.7) VIDE `legacy` sans le supprimer — ses droits par
-- défaut restent posés. Une seconde tentative de bascule, après un retour arrière, retrouve donc un
-- schéma `legacy` vide, et l'expand doit s'y appliquer tel quel.
CREATE SCHEMA IF NOT EXISTS legacy;

-- Correspondance ancienne ligne → nouvelle ligne (noms fixés par 07 §2.2).
-- Une Sale fusionnée dans le document de sa commande : ('Sale', <Sale.id>, 'SaleDocument', <Order.id>, 'paire').
CREATE TABLE legacy."MigrationMap" (
  "oldTable" TEXT NOT NULL,
  "oldId"    TEXT NOT NULL,
  "newTable" TEXT,
  "newId"    TEXT,
  note       TEXT
);
CREATE INDEX "MigrationMap_old_idx" ON legacy."MigrationMap" ("oldTable", "oldId");
CREATE INDEX "MigrationMap_new_idx" ON legacy."MigrationMap" ("newTable", "newId");

-- Référence figée avant bascule (03 §7.2), calculée sur l'ancien schéma par
-- `npm run migration:reference` et insérée par la reprise : une ligne par exécution.
CREATE TABLE legacy."MigrationReference" (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "computedAt"  TIMESTAMPTZ(3) NOT NULL,
  host          TEXT NOT NULL,
  reference     JSONB NOT NULL,
  "insertedAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Enums neufs ─────────────────────────────────────────────────────────────────────
CREATE TYPE "DocumentOrigin" AS ENUM ('ORDER', 'DIRECT_SALE');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'BALANCE', 'REFUND');
-- Nature cible des mouvements. Porte le suffixe V2 tant que l'ancien "CashMovementKind"
-- existe ; le contract supprime l'ancien et renomme celui-ci en "CashMovementKind".
CREATE TYPE "CashMovementKindV2" AS ENUM ('PAYMENT', 'EXPENSE', 'SUPPLIER', 'TRANSFER', 'ADJUSTMENT');

-- ─── Tables neuves (forme finale, 03 §3) ─────────────────────────────────────────────
CREATE TABLE "SaleDocument" (
  "id"                      TEXT NOT NULL,
  "origin"                  "DocumentOrigin" NOT NULL,
  "status"                  "DocumentStatus" NOT NULL DEFAULT 'PENDING',
  "customerId"              TEXT,
  "customerName"            TEXT,
  "customerContact"         TEXT,
  "batchId"                 TEXT,
  "orderedAt"               TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedDeliveryAt"      TIMESTAMPTZ(3),
  "expectedDeliveryHasTime" BOOLEAN NOT NULL DEFAULT false,
  "confirmedAt"             TIMESTAMPTZ(3),
  "deliveredAt"             TIMESTAMPTZ(3),
  "cancelledAt"             TIMESTAMPTZ(3),
  "notes"                   TEXT,
  "createdAt"               TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SaleDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SaleDocument_status_expectedDeliveryAt_idx" ON "SaleDocument"("status", "expectedDeliveryAt");
CREATE INDEX "SaleDocument_status_confirmedAt_idx" ON "SaleDocument"("status", "confirmedAt");
CREATE INDEX "SaleDocument_deliveredAt_idx" ON "SaleDocument"("deliveredAt");
CREATE INDEX "SaleDocument_orderedAt_idx" ON "SaleDocument"("orderedAt");
CREATE INDEX "SaleDocument_customerId_idx" ON "SaleDocument"("customerId");
CREATE INDEX "SaleDocument_batchId_idx" ON "SaleDocument"("batchId");
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SaleLine" (
  "id"                TEXT NOT NULL,
  "documentId"        TEXT NOT NULL,
  "position"          INTEGER NOT NULL DEFAULT 0,
  "perfumeId"         INTEGER,
  "isOffCatalog"      BOOLEAN NOT NULL DEFAULT false,
  "perfumeName"       TEXT NOT NULL,
  "brandName"         TEXT,
  "imageUrl"          TEXT,
  "volumeMl"          INTEGER,
  "quantity"          INTEGER NOT NULL DEFAULT 1,
  "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitPriceEur"      DECIMAL(10,2) NOT NULL,
  "isGift"            BOOLEAN NOT NULL DEFAULT false,
  "unitCostDzd"       DECIMAL(10,2),
  "exchangeRate"      DECIMAL(10,4),
  "unitCostEur"       DECIMAL(10,2),
  "note"              TEXT,
  "createdAt"         TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SaleLine_documentId_idx" ON "SaleLine"("documentId");
CREATE INDEX "SaleLine_perfumeId_idx" ON "SaleLine"("perfumeId");
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "SaleDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_perfumeId_fkey"
  FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id"         TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "kind"       "PaymentKind" NOT NULL,
  "movementId" TEXT NOT NULL,
  "method"     TEXT,
  "note"       TEXT,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_movementId_key" ON "Payment"("movementId");
CREATE INDEX "Payment_documentId_idx" ON "Payment"("documentId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "SaleDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_movementId_fkey"
  FOREIGN KEY ("movementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Setting" (
  "id"                  INTEGER NOT NULL DEFAULT 1,
  "defaultExchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 277,
  "defaultPocketId"     TEXT,
  "updatedAt"           TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_defaultPocketId_fkey"
  FOREIGN KEY ("defaultPocketId") REFERENCES "Pocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Colonnes nouvelles, nullables, sur les tables en place ──────────────────────────
-- CashMovement : nature cible (remplie par la reprise) et contre-passation.
ALTER TABLE "CashMovement" ADD COLUMN "kindV2" "CashMovementKindV2";
ALTER TABLE "CashMovement" ADD COLUMN "reversesId" TEXT;
CREATE UNIQUE INDEX "CashMovement_reversesId_key" ON "CashMovement"("reversesId");
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_reversesId_fkey"
  FOREIGN KEY ("reversesId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- BatchExpense : son mouvement (posé par la reprise, NOT NULL au contract).
ALTER TABLE "BatchExpense" ADD COLUMN "movementId" TEXT;
CREATE UNIQUE INDEX "BatchExpense_movementId_key" ON "BatchExpense"("movementId");
ALTER TABLE "BatchExpense" ADD CONSTRAINT "BatchExpense_movementId_fkey"
  FOREIGN KEY ("movementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AdminUser : backoff persistant (NOT NULL au contract).
ALTER TABLE "AdminUser" ADD COLUMN "failedLoginCount" INTEGER DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN "lockedUntil" TIMESTAMPTZ(3);

-- ─── Socle des définitions canoniques (03 §5.1) ──────────────────────────────────────
-- Créé dès l'expand : les assertions de la reprise (3i) lisent LA définition. La vue ne lit
-- que les tables neuves et CashMovement.id / amount, que le contract ne modifie pas
-- (PostgreSQL refuserait un ALTER COLUMN … TYPE sur une colonne lue par une vue).

-- Bornes calendaires en Europe/Paris (PostgreSQL ≥ 12). La semaine commence le lundi.
-- unit ∈ ('day', 'week', 'month', 'year').
CREATE OR REPLACE FUNCTION nurea_period_start(unit text, ref timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT date_trunc(unit, ref, 'Europe/Paris')
$$;

CREATE OR REPLACE FUNCTION nurea_period_end(unit text, ref timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((date_trunc(unit, ref, 'Europe/Paris') AT TIME ZONE 'Europe/Paris')
          + ('1 ' || unit)::interval) AT TIME ZONE 'Europe/Paris'
$$;

-- Total, coût, payé et dû de chaque document. LA seule définition de ces quatre nombres.
CREATE OR REPLACE VIEW "DocumentBalance" AS
WITH line_totals AS (
  SELECT l."documentId",
         SUM(l.quantity * l."unitPriceEur")                AS total,
         SUM(l.quantity * COALESCE(l."unitCostEur", 0))    AS cost,
         BOOL_OR(l."unitCostEur" IS NULL)                  AS "hasUnknownCost"
  FROM "SaleLine" l
  GROUP BY l."documentId"
), paid AS (
  SELECT p."documentId", SUM(m.amount) AS paid
  FROM "Payment" p
  JOIN "CashMovement" m ON m.id = p."movementId"
  GROUP BY p."documentId"
)
SELECT d.id                                                        AS "documentId",
       d.status, d.origin, d."customerId", d."batchId", d."confirmedAt", d."deliveredAt",
       COALESCE(lt.total, 0)::numeric(12,2)                        AS total,
       COALESCE(lt.cost, 0)::numeric(12,2)                         AS cost,
       COALESCE(pd.paid, 0)::numeric(12,2)                         AS paid,
       GREATEST(COALESCE(lt.total, 0) - COALESCE(pd.paid, 0), 0)::numeric(12,2) AS due,
       COALESCE(lt."hasUnknownCost", false)                        AS "hasUnknownCost"
FROM "SaleDocument" d
LEFT JOIN line_totals lt ON lt."documentId" = d.id
LEFT JOIN paid        pd ON pd."documentId" = d.id;

COMMIT;
