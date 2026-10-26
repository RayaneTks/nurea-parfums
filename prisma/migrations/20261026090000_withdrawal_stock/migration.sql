-- Désistements et flacons en stock (docs/admin/desistements.md, décidé le 26/10/2026).
-- Une désistée est une annulée avec un motif : les chiffres ne changent pas (CANCELLED en sort déjà).
-- Le flacon d'une commande confirmée désistée devient un « flacon en stock », un par unité, revendu plus
-- tard en vente directe. Purement additive : un type, une colonne vide, une table neuve.

CREATE TYPE "CancelReason" AS ENUM ('WITHDRAWN');

ALTER TABLE "SaleDocument" ADD COLUMN "cancelReason" "CancelReason";

-- Un motif n'existe que sur une annulée, et le désistement que sur une commande.
ALTER TABLE "SaleDocument" ADD CONSTRAINT doc_cancel_reason_ck
  CHECK ("cancelReason" IS NULL OR ("status" = 'CANCELLED' AND "origin" = 'ORDER'));

CREATE TABLE "StockBottle" (
  "id"               TEXT           NOT NULL,
  "perfumeId"        INTEGER,
  "perfumeName"      TEXT           NOT NULL,
  "brandName"        TEXT,
  "imageUrl"         TEXT,
  "volumeMl"         INTEGER,
  "unitCostDzd"      DECIMAL(10,2),
  "exchangeRate"     DECIMAL(10,4),
  "unitCostEur"      DECIMAL(10,2),
  "plannedPriceEur"  DECIMAL(10,2)  NOT NULL,
  "sourceDocumentId" TEXT,
  "sourceLineId"     TEXT,
  "sourceCustomer"   TEXT,
  "soldLineId"       TEXT,
  "createdAt"        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockBottle_pkey" PRIMARY KEY ("id")
);

-- Une ligne de vente reprend au plus un flacon par unité : l'unicité vit sur le flacon.
CREATE UNIQUE INDEX "StockBottle_soldLineId_key" ON "StockBottle"("soldLineId");
CREATE INDEX "StockBottle_sourceDocumentId_idx" ON "StockBottle"("sourceDocumentId");
CREATE INDEX "StockBottle_perfumeId_idx" ON "StockBottle"("perfumeId");

ALTER TABLE "StockBottle" ADD CONSTRAINT bottle_price_ck CHECK ("plannedPriceEur" >= 0);
ALTER TABLE "StockBottle" ADD CONSTRAINT bottle_cost_ck
  CHECK (("unitCostDzd" IS NULL OR "unitCostDzd" >= 0) AND ("unitCostEur" IS NULL OR "unitCostEur" >= 0));
ALTER TABLE "StockBottle" ADD CONSTRAINT bottle_rate_ck CHECK ("exchangeRate" IS NULL OR "exchangeRate" > 0);

-- Le flacon survit à tout : parfum, commande d'origine ou vente supprimés, il garde ses copies.
ALTER TABLE "StockBottle" ADD CONSTRAINT "StockBottle_perfumeId_fkey"
  FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockBottle" ADD CONSTRAINT "StockBottle_sourceDocumentId_fkey"
  FOREIGN KEY ("sourceDocumentId") REFERENCES "SaleDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockBottle" ADD CONSTRAINT "StockBottle_sourceLineId_fkey"
  FOREIGN KEY ("sourceLineId") REFERENCES "SaleLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Supprimer la vente qui le reprenait le rend disponible.
ALTER TABLE "StockBottle" ADD CONSTRAINT "StockBottle_soldLineId_fkey"
  FOREIGN KEY ("soldLineId") REFERENCES "SaleLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
