-- Dépense « hors compta » : argent perso / hors business, non déduit de la marge
-- et sans mouvement de trésorerie. Sert uniquement de note de suivi.
ALTER TABLE "BatchExpense" ADD COLUMN "countInCompta" BOOLEAN NOT NULL DEFAULT true;
