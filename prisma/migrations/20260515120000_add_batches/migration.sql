-- Ajoute la notion de Batch (commande groupée) et de BatchExpense (dépenses
-- logistiques imputées au batch : transport, billet d'avion, douane).
-- Une vente peut être rattachée à un batch via Sale.batchId (FK nullable).

-- 1) Enum BatchStatus
DO $$ BEGIN
  CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Table Batch
CREATE TABLE IF NOT EXISTS "Batch" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "expectedAt" TIMESTAMP(3),
  "status"     "BatchStatus" NOT NULL DEFAULT 'OPEN',
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Batch_status_idx"    ON "Batch"("status");
CREATE INDEX IF NOT EXISTS "Batch_createdAt_idx" ON "Batch"("createdAt");

-- 3) Table BatchExpense
CREATE TABLE IF NOT EXISTS "BatchExpense" (
  "id"         TEXT PRIMARY KEY,
  "batchId"    TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "amount"     DECIMAL(10, 2) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BatchExpense_batchId_idx" ON "BatchExpense"("batchId");

DO $$ BEGIN
  ALTER TABLE "BatchExpense"
    ADD CONSTRAINT "BatchExpense_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4) Sale.batchId
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
CREATE INDEX IF NOT EXISTS "Sale_batchId_idx" ON "Sale"("batchId");

DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
