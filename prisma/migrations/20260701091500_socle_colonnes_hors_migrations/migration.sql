-- Socle historique (suite) : les colonnes de lignes que la production a reçues par
-- `prisma db push`, jamais par une migration.
--
-- Pourquoi ici : la migration suivante (20260701093000_backfill_orderitem_unitcost) lit
-- OrderItem."unitCostDzd" et OrderItem."exchangeRate", qu'aucune migration n'ajoute.
-- SaleItem porte les mêmes colonnes, plus "note" (drift constaté par
-- 20260901120000_retire_gestion_v2, adopté par docs/refonte/03-MODELE-DONNEES.md §7.4).
-- Voir 20260325000000_socle_tables_initiales pour le contexte.
--
-- Purement additif et sans effet sur une base existante (IF EXISTS / IF NOT EXISTS) :
-- no-op en production, avant comme après la refonte (les tables sont alors dans `legacy`).

ALTER TABLE IF EXISTS "OrderItem" ADD COLUMN IF NOT EXISTS "unitCostDzd"  DECIMAL(10, 2);
ALTER TABLE IF EXISTS "OrderItem" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(10, 2);

ALTER TABLE IF EXISTS "SaleItem" ADD COLUMN IF NOT EXISTS "unitCostDzd"  DECIMAL(10, 2);
ALTER TABLE IF EXISTS "SaleItem" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(10, 2);
ALTER TABLE IF EXISTS "SaleItem" ADD COLUMN IF NOT EXISTS "note"         TEXT;
