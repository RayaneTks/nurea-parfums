-- Horodatage réel du passage en statut « Livrée » (archivage 24h de la liste Livrées).
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Backfill : les commandes déjà livrées prennent leur date de dernière mise à jour
-- comme repère de livraison (best-effort, évite qu'elles restent bloquées "il y a 0 min").
UPDATE "Order" SET "deliveredAt" = "updatedAt" WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;

CREATE INDEX "Order_status_deliveredAt_idx" ON "Order"("status", "deliveredAt");
