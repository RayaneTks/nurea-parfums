-- Admin v2 rework (cosmic-sprouting-meteor.md, P1)
-- Ajoute : Customer, PaymentTransaction (+ enum PaymentType), PerfumePricing, AppSetting,
--         Perfume.isPrivate, Order.customerId, OrderItem.perfumeId nullable + perfumeSnapshot,
--         Sale.customerId, index composites.
-- Idempotent (IF [NOT] EXISTS) — safe à re-jouer.

-- ─── Enums ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE', 'REFUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Customer ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Customer" (
  "id"           TEXT PRIMARY KEY,
  "fullName"     TEXT NOT NULL,
  "phoneE164"    TEXT,
  "snapchat"     TEXT,
  "whatsappE164" TEXT,
  "address"      TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phoneE164_key" ON "Customer"("phoneE164");
CREATE INDEX IF NOT EXISTS "Customer_fullName_idx" ON "Customer"("fullName");

-- ─── Perfume.isPrivate ─────────────────────────────────────────
ALTER TABLE "Perfume" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Perfume_isPrivate_idx" ON "Perfume"("isPrivate");
CREATE INDEX IF NOT EXISTS "Perfume_status_brandId_idx" ON "Perfume"("status", "brandId");

-- ─── Brand index status ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Brand_status_idx" ON "Brand"("status");

-- ─── PerfumePricing ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PerfumePricing" (
  "perfumeId"           INTEGER NOT NULL,
  "volumeMl"            INTEGER NOT NULL,
  "defaultUnitPriceEur" DECIMAL(10, 2) NOT NULL,
  "defaultUnitCostDzd"  DECIMAL(10, 2),
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerfumePricing_pkey" PRIMARY KEY ("perfumeId", "volumeMl")
);
DO $$ BEGIN
  ALTER TABLE "PerfumePricing"
    ADD CONSTRAINT "PerfumePricing_perfumeId_fkey"
    FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── AppSetting ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Order.customerId ──────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_status_deliveryAt_idx" ON "Order"("status", "deliveryAt");

-- ─── OrderItem : perfumeId nullable + perfumeSnapshot ──────────
-- Étape 1 : drop FK existante.
DO $$ BEGIN
  ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_perfumeId_fkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
-- Étape 2 : rendre la colonne NULLABLE.
ALTER TABLE "OrderItem" ALTER COLUMN "perfumeId" DROP NOT NULL;
-- Étape 3 : ajouter snapshot.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "perfumeSnapshot" JSONB;
-- Étape 4 : recréer FK avec onDelete SetNull (au lieu de Restrict).
DO $$ BEGIN
  ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_perfumeId_fkey"
    FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── PaymentTransaction ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id"           TEXT PRIMARY KEY,
  "orderId"      TEXT NOT NULL,
  "type"         "PaymentType" NOT NULL,
  "amount"       DECIMAL(10, 2) NOT NULL,
  "paidAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method"       TEXT,
  "note"         TEXT,
  "recordedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_paidAt_idx" ON "PaymentTransaction"("paidAt");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_type_idx" ON "PaymentTransaction"("type");

-- ─── Sale.customerId ───────────────────────────────────────────
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");
-- Pas de FK pour préserver ventes historiques orphelines. Lien purement informatif.

-- ─── AuditLog : index (entity, entityId) ───────────────────────
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
