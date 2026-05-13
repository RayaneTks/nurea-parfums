-- Gestion : Compta / Ordres / Ventes
-- Flux 100% manuel : prix et coûts saisis à chaque ligne, figés en snapshot.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateTable Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerName" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Order
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_orderedAt_idx" ON "Order"("orderedAt");
CREATE INDEX "Order_deliveryAt_idx" ON "Order"("deliveryAt");

-- CreateTable OrderItem
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "perfumeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex OrderItem
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_perfumeId_idx" ON "OrderItem"("perfumeId");

-- AddForeignKey OrderItem
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_perfumeId_fkey"
  FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Sale
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "customerName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRevenue" DECIMAL(10, 2) NOT NULL,
    "totalCost" DECIMAL(10, 2) NOT NULL,
    "totalMargin" DECIMAL(10, 2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Sale
CREATE UNIQUE INDEX "Sale_orderId_key" ON "Sale"("orderId");
CREATE INDEX "Sale_soldAt_idx" ON "Sale"("soldAt");

-- AddForeignKey Sale
ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable SaleItem
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "perfumeId" INTEGER,
    "perfumeSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10, 2) NOT NULL,
    "unitCost" DECIMAL(10, 2) NOT NULL,
    "lineRevenue" DECIMAL(10, 2) NOT NULL,
    "lineCost" DECIMAL(10, 2) NOT NULL,
    "lineMargin" DECIMAL(10, 2) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex SaleItem
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_perfumeId_idx" ON "SaleItem"("perfumeId");

-- AddForeignKey SaleItem
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_perfumeId_fkey"
  FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
