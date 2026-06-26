-- Stock parfum (unités, tous volumes). Décrémenté à la vente.
ALTER TABLE "Perfume" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;
