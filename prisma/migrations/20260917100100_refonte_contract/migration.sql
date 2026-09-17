-- Refonte « Nuréa Gestion » — migration CONTRACT.
-- Référence : docs/refonte/03-MODELE-DONNEES.md §7.3 étape 4, §4.9 (CHECK), §4.10 (triggers) ;
-- docs/refonte/07-PLAN-EXECUTION.md §2.
--
-- S'applique APRÈS la reprise (`npm run migration:reprise -- --apply`), jamais par un build :
-- `npm run migration:sql -- refonte_contract`. Sur une base de test vide, `prisma migrate reset`
-- l'enchaîne directement après l'expand.
--
-- Une seule transaction. Chaque VALIDATE CONSTRAINT est isolé dans son bloc DO … EXCEPTION
-- (point de sauvegarde implicite) : une contrainte que des lignes historiques violent reste
-- NOT VALID sans annuler le contract ; V8 (03 §7.8) la retrouve dans pg_constraint.
--
-- Règle tenue : aucune colonne lue par la vue "DocumentBalance" (créée par l'expand) ne change
-- de type ici — SaleDocument, SaleLine et Payment sont intacts, CashMovement.id et .amount aussi.

BEGIN;

-- ═══ 0. Garde : la reprise a eu lieu ═══════════════════════════════════════════════════
-- Sans elle, ce fichier déplacerait les commandes et ventes dans `legacy` et l'app afficherait
-- une gestion vide (07 §2.3). Sans effet sur une base de test vide.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CashMovement" WHERE "kindV2" IS NULL) THEN
    RAISE EXCEPTION 'Nuréa : contract refusé — des mouvements n''ont pas de nature cible (kindV2). La reprise n''a pas été appliquée.';
  END IF;
  IF EXISTS (SELECT 1 FROM "BatchExpense" WHERE "movementId" IS NULL) THEN
    RAISE EXCEPTION 'Nuréa : contract refusé — des dépenses n''ont pas de mouvement (movementId). La reprise n''a pas été appliquée.';
  END IF;
  IF (EXISTS (SELECT 1 FROM "Order") OR EXISTS (SELECT 1 FROM "Sale"))
     AND NOT EXISTS (SELECT 1 FROM "SaleDocument") THEN
    RAISE EXCEPTION 'Nuréa : contract refusé — "Order"/"Sale" ont des lignes et "SaleDocument" est vide. La reprise n''a pas été appliquée.';
  END IF;
END $$;

-- ═══ 1. Copies vers legacy des colonnes supprimées des tables en place ═════════════════
CREATE TABLE legacy."CashMovementRef" AS
  SELECT "id", "refType", "refId", "createdById" FROM "CashMovement";
ALTER TABLE legacy."CashMovementRef" ADD PRIMARY KEY ("id");

CREATE TABLE legacy."BatchExpenseRef" AS
  SELECT "id", "amount", "occurredAt", "countInCompta" FROM "BatchExpense";
ALTER TABLE legacy."BatchExpenseRef" ADD PRIMARY KEY ("id");

-- ═══ 2. Trésorerie ═════════════════════════════════════════════════════════════════════
-- CashMovement : kindV2 remplace kind ; liens souples et auteur supprimés ; FK Pocket Cascade → Restrict.
ALTER TABLE "CashMovement"
  DROP COLUMN "refType",
  DROP COLUMN "refId",
  DROP COLUMN "createdById",
  DROP COLUMN "kind";
DROP TYPE "CashMovementKind";
ALTER TYPE "CashMovementKindV2" RENAME TO "CashMovementKind";
ALTER TABLE "CashMovement" RENAME COLUMN "kindV2" TO "kind";
ALTER TABLE "CashMovement" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "CashMovement"
  ALTER COLUMN "occurredAt" TYPE TIMESTAMPTZ(3) USING "occurredAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt"  TYPE TIMESTAMPTZ(3) USING "createdAt"  AT TIME ZONE 'UTC';
DROP INDEX IF EXISTS "CashMovement_pocketId_idx";
CREATE INDEX "CashMovement_pocketId_occurredAt_idx" ON "CashMovement"("pocketId", "occurredAt");
CREATE INDEX "CashMovement_kind_occurredAt_idx" ON "CashMovement"("kind", "occurredAt");
ALTER TABLE "CashMovement" DROP CONSTRAINT IF EXISTS "CashMovement_pocketId_fkey";
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_pocketId_fkey"
  FOREIGN KEY ("pocketId") REFERENCES "Pocket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pocket"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ═══ 3. Lots ═══════════════════════════════════════════════════════════════════════════
-- BatchExpense : montant et date vivent dans le mouvement ; movementId obligatoire ; FK Batch Cascade → Restrict.
ALTER TABLE "BatchExpense"
  DROP COLUMN "amount",
  DROP COLUMN "occurredAt",
  DROP COLUMN "countInCompta";
ALTER TABLE "BatchExpense"
  ALTER COLUMN "movementId" SET NOT NULL,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "BatchExpense" DROP CONSTRAINT IF EXISTS "BatchExpense_batchId_fkey";
ALTER TABLE "BatchExpense" ADD CONSTRAINT "BatchExpense_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Batch"
  ALTER COLUMN "expectedAt" TYPE TIMESTAMPTZ(3) USING "expectedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt"  TYPE TIMESTAMPTZ(3) USING "createdAt"  AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt"  TYPE TIMESTAMPTZ(3) USING "updatedAt"  AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt"  DROP DEFAULT;

-- ═══ 4. Clients et accès ═══════════════════════════════════════════════════════════════
ALTER TABLE "Customer"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "AdminUser" SET "failedLoginCount" = 0 WHERE "failedLoginCount" IS NULL;
ALTER TABLE "AdminUser" DROP COLUMN "role";
ALTER TABLE "AdminUser"
  ALTER COLUMN "failedLoginCount" SET NOT NULL,
  ALTER COLUMN "failedLoginCount" SET DEFAULT 0,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ═══ 5. Catalogue ══════════════════════════════════════════════════════════════════════
-- Reliquats de 20260326120000_brand_taxonomy, absents du schéma depuis (IF EXISTS : la
-- production les a déjà perdus par `db push`, une base rejouée depuis les migrations les porte).
ALTER TABLE "Brand" DROP COLUMN IF EXISTS "assortment", DROP COLUMN IF EXISTS "positioning";
DROP TYPE IF EXISTS "BrandAssortment";
DROP TYPE IF EXISTS "BrandPositioning";

-- Brand.status : BrandVisibilityStatus → PublicationStatus (mêmes valeurs).
ALTER TABLE "Brand" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Brand" ALTER COLUMN "status" TYPE "PublicationStatus" USING "status"::text::"PublicationStatus";
ALTER TABLE "Brand" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
DROP TYPE "BrandVisibilityStatus";
ALTER TABLE "Brand"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Perfume : slug et isPrivate (+ index) supprimés ; stock nullable (NULL = non suivi).
ALTER TABLE "Perfume" DROP COLUMN "slug", DROP COLUMN "isPrivate";
ALTER TABLE "Perfume"
  ALTER COLUMN "stock" DROP NOT NULL,
  ALTER COLUMN "stock" DROP DEFAULT,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Séquence de Perfume.id recalée (l'existant calculait max(id)+1 à la main).
DO $$
DECLARE
  seq text := pg_get_serial_sequence('"Perfume"', 'id');
BEGIN
  IF seq IS NULL THEN
    CREATE SEQUENCE "Perfume_id_seq" AS integer OWNED BY "Perfume"."id";
    ALTER TABLE "Perfume" ALTER COLUMN "id" SET DEFAULT nextval('"Perfume_id_seq"');
    seq := pg_get_serial_sequence('"Perfume"', 'id');
  END IF;
  PERFORM setval(seq, COALESCE((SELECT max("id") FROM "Perfume"), 0) + 1, false);
END $$;

-- PerfumePricing : taux élargi (8,4) → (10,4), sans perte.
ALTER TABLE "PerfumePricing"
  ALTER COLUMN "defaultExchangeRate" TYPE DECIMAL(10,4),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- PerfumeMedia (visuels story, 20260910140000_perfume_media) : table de la production CONSERVÉE en
-- place dans public — jamais déplacée dans legacy, aucune ligne touchée. Seule la date passe en
-- timestamptz (convention 03 §3). Sa clé étrangère vers "Perfume" (Cascade) est inchangée.
ALTER TABLE "PerfumeMedia"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- ═══ 6. Anciennes tables → legacy (conservées 30 jours, 03 §7.1) ═══════════════════════
-- 6a. Leurs clés étrangères vers les tables qui restent dans public sont supprimées : legacy
--     reste figé (une suppression de parfum ou de client ne le modifie plus) et public n'en
--     dépend pas. Les clés internes à legacy (OrderItem → Order, Sale → Order…) sont gardées.
DO $$
DECLARE
  anciennes regclass[] := ARRAY[
    '"Order"'::regclass, '"OrderItem"'::regclass, '"Sale"'::regclass, '"SaleItem"'::regclass,
    '"PaymentTransaction"'::regclass, '"AuditLog"'::regclass,
    '"ExternalImportSuggestion"'::regclass, '"AppSetting"'::regclass
  ];
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = ANY (anciennes)
      AND NOT (c.confrelid = ANY (anciennes))
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- 6b. Colonnes d'enum castées en texte (les enums sont supprimés en 6d).
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- 6c. Déplacement.
ALTER TABLE "Order"                    SET SCHEMA legacy;
ALTER TABLE "OrderItem"                SET SCHEMA legacy;
ALTER TABLE "Sale"                     SET SCHEMA legacy;
ALTER TABLE "SaleItem"                 SET SCHEMA legacy;
ALTER TABLE "PaymentTransaction"       SET SCHEMA legacy;
ALTER TABLE "AuditLog"                 SET SCHEMA legacy;
ALTER TABLE "ExternalImportSuggestion" SET SCHEMA legacy;
ALTER TABLE "AppSetting"               SET SCHEMA legacy;

-- 6d. Enums de l'ancien modèle.
DROP TYPE "OrderStatus";
DROP TYPE "PaymentType";
DROP TYPE "AdminRole";

-- ═══ 7. Contraintes SQL (03 §4.9), NOT VALID ═══════════════════════════════════════════
-- ── Catalogue ──
ALTER TABLE "Brand" ADD CONSTRAINT brand_complete_logo_ck
  CHECK (status = 'DRAFT' OR "catalogMode" = 'CURATED' OR COALESCE(btrim(image), '') <> '') NOT VALID;
ALTER TABLE "Perfume" ADD CONSTRAINT perfume_publish_image_ck
  CHECK (status = 'DRAFT' OR btrim(image) <> '') NOT VALID;
ALTER TABLE "Perfume" ADD CONSTRAINT perfume_stock_ck
  CHECK (stock IS NULL OR stock >= 0) NOT VALID;
-- Contenances réelles 10 / 50 / 80 ml : la production a traduit 30 → 10 et 100 → 80 le 10/09/2026
-- (20260910120000_real_volumes_10_50_80). Une valeur héritée restante est hors règle (R4, V8).
ALTER TABLE "PerfumePricing" ADD CONSTRAINT pricing_volume_ck
  CHECK ("volumeMl" IN (10, 50, 80)) NOT VALID;
ALTER TABLE "PerfumePricing" ADD CONSTRAINT pricing_amounts_ck
  CHECK ("defaultUnitPriceEur" >= 0
     AND ("defaultUnitCostDzd"  IS NULL OR "defaultUnitCostDzd"  >= 0)
     AND ("defaultExchangeRate" IS NULL OR "defaultExchangeRate" >  0)) NOT VALID;

-- ── Documents ──
ALTER TABLE "SaleDocument" ADD CONSTRAINT doc_confirmed_at_ck
  CHECK ((status IN ('CONFIRMED', 'DELIVERED')) = ("confirmedAt" IS NOT NULL)) NOT VALID;
ALTER TABLE "SaleDocument" ADD CONSTRAINT doc_delivered_at_ck
  CHECK ((status = 'DELIVERED') = ("deliveredAt" IS NOT NULL)) NOT VALID;
ALTER TABLE "SaleDocument" ADD CONSTRAINT doc_cancelled_at_ck
  CHECK ((status = 'CANCELLED') = ("cancelledAt" IS NOT NULL)) NOT VALID;

ALTER TABLE "SaleLine" ADD CONSTRAINT line_quantity_ck  CHECK (quantity >= 1) NOT VALID;
ALTER TABLE "SaleLine" ADD CONSTRAINT line_delivered_ck CHECK ("deliveredQuantity" BETWEEN 0 AND quantity) NOT VALID;
ALTER TABLE "SaleLine" ADD CONSTRAINT line_price_ck     CHECK ("unitPriceEur" >= 0) NOT VALID;
ALTER TABLE "SaleLine" ADD CONSTRAINT line_gift_ck      CHECK (NOT "isGift" OR "unitPriceEur" = 0) NOT VALID;
-- Toute écriture exige une contenance réelle (10, 50 ou 80 ml) ; les lignes reprises sans volume, ou à une
-- contenance héritée 30/100 non traduite, restent lisibles (contrainte NOT VALID, listées en R4).
ALTER TABLE "SaleLine" ADD CONSTRAINT line_volume_ck
  CHECK ("volumeMl" IS NOT NULL AND "volumeMl" IN (10, 50, 80)) NOT VALID;
-- "exchangeRate" IS NOT NULL explicite : un CHECK évalué à NULL est satisfait, et
-- `"exchangeRate" > 0` vaut NULL quand le taux manque (coût DZD sans taux accepté sinon).
ALTER TABLE "SaleLine" ADD CONSTRAINT line_cost_ck
  CHECK (("unitCostEur" IS NULL OR "unitCostEur" >= 0)
     AND ("unitCostDzd" IS NULL OR ("unitCostDzd" >= 0 AND "exchangeRate" IS NOT NULL AND "exchangeRate" > 0
                                    AND "unitCostEur" IS NOT NULL))) NOT VALID;
ALTER TABLE "SaleLine" ADD CONSTRAINT line_name_ck CHECK (btrim("perfumeName") <> '') NOT VALID;
ALTER TABLE "SaleLine" ADD CONSTRAINT line_off_catalog_ck CHECK (NOT "isOffCatalog" OR "perfumeId" IS NULL) NOT VALID;

-- ── Trésorerie ──
CREATE UNIQUE INDEX pocket_single_system_uq ON "Pocket" ("isSystem") WHERE "isSystem";
ALTER TABLE "Pocket" ADD CONSTRAINT pocket_system_ck
  CHECK (NOT "isSystem" OR (kind = 'UNASSIGNED' AND NOT archived)) NOT VALID;

ALTER TABLE "CashMovement" ADD CONSTRAINT movement_nonzero_ck CHECK (amount <> 0) NOT VALID;
ALTER TABLE "CashMovement" ADD CONSTRAINT movement_transfer_ck
  CHECK ((kind = 'TRANSFER') = ("transferGroupId" IS NOT NULL)) NOT VALID;
-- Dépense et paiement fournisseur sortent (−) ; leur contre-passation seule rentre (+).
ALTER TABLE "CashMovement" ADD CONSTRAINT movement_outflow_sign_ck
  CHECK (kind NOT IN ('EXPENSE', 'SUPPLIER') OR (("reversesId" IS NULL) = (amount < 0))) NOT VALID;
ALTER TABLE "CashMovement" ADD CONSTRAINT movement_not_self_ck
  CHECK ("reversesId" IS NULL OR "reversesId" <> id) NOT VALID;

-- ── Réglages ──
ALTER TABLE "Setting" ADD CONSTRAINT setting_singleton_ck CHECK (id = 1) NOT VALID;
ALTER TABLE "Setting" ADD CONSTRAINT setting_rate_ck CHECK ("defaultExchangeRate" > 0) NOT VALID;

-- ═══ 8. Validation, une contrainte par bloc ════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE "Brand" VALIDATE CONSTRAINT brand_complete_logo_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : brand_complete_logo_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "Perfume" VALIDATE CONSTRAINT perfume_publish_image_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : perfume_publish_image_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "Perfume" VALIDATE CONSTRAINT perfume_stock_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : perfume_stock_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "PerfumePricing" VALIDATE CONSTRAINT pricing_volume_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : pricing_volume_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "PerfumePricing" VALIDATE CONSTRAINT pricing_amounts_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : pricing_amounts_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleDocument" VALIDATE CONSTRAINT doc_confirmed_at_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : doc_confirmed_at_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleDocument" VALIDATE CONSTRAINT doc_delivered_at_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : doc_delivered_at_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleDocument" VALIDATE CONSTRAINT doc_cancelled_at_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : doc_cancelled_at_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_quantity_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_quantity_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_delivered_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_delivered_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_price_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_price_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_gift_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_gift_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_volume_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_volume_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_cost_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_cost_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_name_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_name_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleLine" VALIDATE CONSTRAINT line_off_catalog_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : line_off_catalog_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "Pocket" VALIDATE CONSTRAINT pocket_system_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : pocket_system_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "CashMovement" VALIDATE CONSTRAINT movement_nonzero_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : movement_nonzero_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "CashMovement" VALIDATE CONSTRAINT movement_transfer_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : movement_transfer_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "CashMovement" VALIDATE CONSTRAINT movement_outflow_sign_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : movement_outflow_sign_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "CashMovement" VALIDATE CONSTRAINT movement_not_self_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : movement_not_self_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "Setting" VALIDATE CONSTRAINT setting_singleton_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : setting_singleton_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;
DO $$ BEGIN
  ALTER TABLE "Setting" VALIDATE CONSTRAINT setting_rate_ck;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Nuréa : setting_rate_ck reste NOT VALID (lignes historiques, voir V8).';
END $$;

-- ═══ 9. Triggers : écriture seule et cohérence pièce ↔ mouvement (03 §4.10) ═══════════
-- 1. Écriture seule : ni DELETE, ni UPDATE hors des colonnes descriptives passées en argument.
CREATE OR REPLACE FUNCTION nurea_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Nuréa : % est en écriture seule — contre-passer, ne pas supprimer.', TG_TABLE_NAME;
  END IF;
  IF (to_jsonb(NEW) - TG_ARGV) IS DISTINCT FROM (to_jsonb(OLD) - TG_ARGV) THEN
    RAISE EXCEPTION 'Nuréa : % est en écriture seule — seules les colonnes % sont modifiables.',
      TG_TABLE_NAME, array_to_string(TG_ARGV, ', ');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cash_movement_append_only BEFORE UPDATE OR DELETE ON "CashMovement"
  FOR EACH ROW EXECUTE FUNCTION nurea_append_only('label');
CREATE TRIGGER payment_append_only BEFORE UPDATE OR DELETE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION nurea_append_only('method', 'note');
CREATE TRIGGER batch_expense_append_only BEFORE UPDATE OR DELETE ON "BatchExpense"
  FOR EACH ROW EXECUTE FUNCTION nurea_append_only('label', 'notes');

-- 2. Un mouvement PAYMENT ou EXPENSE a sa pièce ; une contre-passation reprend nature, poche et date
--    de l'original au montant opposé. Vérifié au COMMIT (la pièce est créée dans la même transaction).
CREATE OR REPLACE FUNCTION nurea_movement_consistency() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  orig "CashMovement"%ROWTYPE;
BEGIN
  IF NEW.kind = 'PAYMENT' AND NOT EXISTS (SELECT 1 FROM "Payment" WHERE "movementId" = NEW.id) THEN
    RAISE EXCEPTION 'Nuréa : mouvement PAYMENT % sans paiement.', NEW.id;
  END IF;
  IF NEW.kind = 'EXPENSE' AND NEW."reversesId" IS NULL
     AND NOT EXISTS (SELECT 1 FROM "BatchExpense" WHERE "movementId" = NEW.id) THEN
    RAISE EXCEPTION 'Nuréa : mouvement EXPENSE % sans dépense.', NEW.id;
  END IF;
  IF NEW."reversesId" IS NOT NULL THEN
    SELECT * INTO orig FROM "CashMovement" WHERE id = NEW."reversesId";
    IF orig.kind <> NEW.kind OR orig."pocketId" <> NEW."pocketId"
       OR orig.amount <> -NEW.amount OR orig."occurredAt" <> NEW."occurredAt" THEN
      RAISE EXCEPTION 'Nuréa : la contre-passation % doit reprendre nature, poche et date de %, au montant opposé.',
        NEW.id, NEW."reversesId";
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER cash_movement_consistency
  AFTER INSERT ON "CashMovement" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION nurea_movement_consistency();

-- 3. Une pièce pointe un mouvement de la bonne nature et du bon signe.
CREATE OR REPLACE FUNCTION nurea_payment_consistency() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  mv "CashMovement"%ROWTYPE;
BEGIN
  SELECT * INTO mv FROM "CashMovement" WHERE id = NEW."movementId";
  IF mv.kind <> 'PAYMENT' OR (NEW.kind = 'REFUND') <> (mv.amount < 0) THEN
    RAISE EXCEPTION 'Nuréa : le paiement % (%) exige un mouvement PAYMENT de signe cohérent.', NEW.id, NEW.kind;
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION nurea_expense_consistency() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  mv "CashMovement"%ROWTYPE;
BEGIN
  SELECT * INTO mv FROM "CashMovement" WHERE id = NEW."movementId";
  IF mv.kind <> 'EXPENSE' OR mv."reversesId" IS NOT NULL OR mv.amount >= 0 THEN
    RAISE EXCEPTION 'Nuréa : la dépense % exige un mouvement EXPENSE négatif.', NEW.id;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER payment_consistency
  AFTER INSERT ON "Payment" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION nurea_payment_consistency();
CREATE CONSTRAINT TRIGGER batch_expense_consistency
  AFTER INSERT ON "BatchExpense" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION nurea_expense_consistency();

COMMIT;
