-- Libellé manuel pour lignes de commande « hors catalogue site »
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "manualLabel" TEXT;
