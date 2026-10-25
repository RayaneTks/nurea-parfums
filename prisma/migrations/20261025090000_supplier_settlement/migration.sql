-- Carnet fournisseur : « Marquer remboursée » (docs/admin/dettes-fournisseur.md, décidé le 25/10/2026).
-- Un versement PEUT rembourser une dette précise : il porte alors son identifiant. Le Reste à payer
-- reste Σ dettes − Σ versements ; rien ici ne touche l'argent de la gestion.
-- Purement additive : une colonne vide, ses contraintes valides dès leur pose.

ALTER TABLE "SupplierEntry" ADD COLUMN "settlesEntryId" TEXT;

-- Une dette n'est remboursée qu'une fois.
CREATE UNIQUE INDEX "SupplierEntry_settlesEntryId_key" ON "SupplierEntry"("settlesEntryId");

-- Seul un versement rembourse, et jamais lui-même.
ALTER TABLE "SupplierEntry" ADD CONSTRAINT supplier_entry_settles_ck
  CHECK ("settlesEntryId" IS NULL OR ("kind" = 'PAYMENT' AND "settlesEntryId" <> "id"));

-- Supprimer la dette emporte son remboursement : le Reste à payer ne bouge pas.
ALTER TABLE "SupplierEntry" ADD CONSTRAINT "SupplierEntry_settlesEntryId_fkey"
  FOREIGN KEY ("settlesEntryId") REFERENCES "SupplierEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
