-- Trésorerie : poches + mouvements d'argent.
CREATE TYPE "PocketKind" AS ENUM ('CASH', 'BANK', 'SUPPLIER', 'OTHER', 'UNASSIGNED');
CREATE TYPE "CashMovementKind" AS ENUM ('OPENING', 'SALE_IN', 'DEPOSIT_IN', 'BALANCE_IN', 'REFUND_OUT', 'EXPENSE_OUT', 'SUPPLIER_OUT', 'TRANSFER', 'ADJUSTMENT');

CREATE TABLE "Pocket" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "PocketKind" NOT NULL DEFAULT 'OTHER',
  "openingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pocket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Pocket_archived_idx" ON "Pocket"("archived");

CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "pocketId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "kind" "CashMovementKind" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "label" TEXT,
  "refType" TEXT,
  "refId" TEXT,
  "transferGroupId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashMovement_pocketId_idx" ON "CashMovement"("pocketId");
CREATE INDEX "CashMovement_refType_refId_idx" ON "CashMovement"("refType", "refId");
CREATE INDEX "CashMovement_transferGroupId_idx" ON "CashMovement"("transferGroupId");
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_pocketId_fkey" FOREIGN KEY ("pocketId") REFERENCES "Pocket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
