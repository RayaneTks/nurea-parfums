-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CashSale" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "perfumeId" INTEGER NOT NULL,
    "buyPriceCents" INTEGER NOT NULL,
    "sellPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CashSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashSale_createdAt_idx" ON "CashSale"("createdAt");
CREATE INDEX "CashSaleLine_saleId_idx" ON "CashSaleLine"("saleId");
CREATE INDEX "CashSaleLine_perfumeId_idx" ON "CashSaleLine"("perfumeId");
CREATE INDEX "CustomerOrder_status_idx" ON "CustomerOrder"("status");
CREATE INDEX "CustomerOrder_createdAt_idx" ON "CustomerOrder"("createdAt");

ALTER TABLE "CashSaleLine" ADD CONSTRAINT "CashSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashSaleLine" ADD CONSTRAINT "CashSaleLine_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
