-- Rattachement commande → lot fournisseur (optionnel).
ALTER TABLE "Order" ADD COLUMN "batchId" TEXT;
CREATE INDEX "Order_batchId_idx" ON "Order"("batchId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
