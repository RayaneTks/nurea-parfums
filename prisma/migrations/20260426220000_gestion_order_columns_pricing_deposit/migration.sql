-- Alignement base / schéma Prisma : acompte commande + volumes & prix sur les lignes + volume vente.
-- Indispensable pour GET /api/admin/orders si la base ne datait que de 20260424230000_add_gestion_models.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_depositPaid_idx" ON "Order"("depositPaid");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "volumeMl" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "volumeMl" INTEGER;
