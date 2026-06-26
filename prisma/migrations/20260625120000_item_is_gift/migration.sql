-- Don : parfum offert (prix 0, coût compté en perte).
ALTER TABLE "OrderItem" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SaleItem" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;
