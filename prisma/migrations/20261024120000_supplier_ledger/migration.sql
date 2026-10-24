-- Carnet fournisseur (docs/admin/dettes-fournisseur.md) : ce que le gérant doit au fournisseur, en
-- dinars, et ce qu'il lui a versé. Indépendant de l'argent de la gestion : aucune clé vers
-- CashMovement ni Pocket, et aucun chiffre (src/server/chiffres) ne lit ces tables.
-- Purement additive : deux tables neuves et une colonne vide. Rien d'existant n'est réécrit ;
-- les contraintes sont donc valides dès leur pose (pas de NOT VALID).

-- Taux de lecture du carnet, mémorisé. NULL : l'écran prend Setting.defaultExchangeRate.
ALTER TABLE "Setting" ADD COLUMN "supplierExchangeRate" DECIMAL(10,4);
ALTER TABLE "Setting" ADD CONSTRAINT setting_supplier_rate_ck CHECK ("supplierExchangeRate" > 0);

CREATE TYPE "SupplierEntryKind" AS ENUM ('DEBT', 'PAYMENT');

CREATE TABLE "SupplierEntry" (
    "id" TEXT NOT NULL,
    "kind" "SupplierEntryKind" NOT NULL,
    "amountDzd" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "SupplierEntry_pkey" PRIMARY KEY ("id"),
    -- Le sens est porté par « kind » : un montant toujours positif, jamais signé.
    CONSTRAINT supplier_entry_amount_ck CHECK ("amountDzd" > 0),
    -- Un texte vide s'écrit NULL (contrat optionalText) : la base le tient aussi.
    CONSTRAINT supplier_entry_label_ck CHECK ("label" IS NULL OR length(btrim("label")) > 0),
    CONSTRAINT supplier_entry_note_ck CHECK ("note" IS NULL OR length(btrim("note")) > 0)
);

CREATE TABLE "SupplierEntryItem" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "documentId" TEXT,
    "batchId" TEXT,
    "amountDzd" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "SupplierEntryItem_pkey" PRIMARY KEY ("id"),
    -- Un élément coché est un document OU un lot, jamais les deux, jamais aucun.
    CONSTRAINT supplier_item_target_ck CHECK (num_nonnulls("documentId", "batchId") = 1),
    -- Coût affiché au moment de noter ; 0 quand aucune ligne n'avait de coût.
    CONSTRAINT supplier_item_amount_ck CHECK ("amountDzd" >= 0)
);

CREATE INDEX "SupplierEntry_occurredAt_idx" ON "SupplierEntry"("occurredAt");
CREATE INDEX "SupplierEntryItem_documentId_idx" ON "SupplierEntryItem"("documentId");
CREATE INDEX "SupplierEntryItem_batchId_idx" ON "SupplierEntryItem"("batchId");
CREATE UNIQUE INDEX "SupplierEntryItem_entryId_documentId_key" ON "SupplierEntryItem"("entryId", "documentId");
CREATE UNIQUE INDEX "SupplierEntryItem_entryId_batchId_key" ON "SupplierEntryItem"("entryId", "batchId");

-- Cascade partout : supprimer une ligne du carnet emporte ses éléments ; supprimer un document
-- (sans paiement) ou un lot (vide) n'est jamais bloqué par le carnet, seul le lien disparaît.
ALTER TABLE "SupplierEntryItem" ADD CONSTRAINT "SupplierEntryItem_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SupplierEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierEntryItem" ADD CONSTRAINT "SupplierEntryItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SaleDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierEntryItem" ADD CONSTRAINT "SupplierEntryItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
