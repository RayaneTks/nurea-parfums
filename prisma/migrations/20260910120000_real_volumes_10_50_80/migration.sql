-- Contenances réelles : 10 / 50 / 80 ml.
--
-- Le catalogue annonçait 30 ml pour un flacon de 10 ml et 100 ml pour un 80 ml.
-- Ce ne sont pas de nouveaux produits, seulement la contenance exacte des mêmes
-- flacons : on traduit l'historique plutôt que de le laisser cohabiter avec la
-- nouvelle offre, sinon la compta compare des lignes qui ne se comparent plus.

-- Lignes de commande.
UPDATE "OrderItem" SET "volumeMl" = 10 WHERE "volumeMl" = 30;
UPDATE "OrderItem" SET "volumeMl" = 80 WHERE "volumeMl" = 100;

-- Lignes de vente (volumeMl nullable — le NULL reste NULL).
UPDATE "SaleItem" SET "volumeMl" = 10 WHERE "volumeMl" = 30;
UPDATE "SaleItem" SET "volumeMl" = 80 WHERE "volumeMl" = 100;

-- Tarifs par défaut. La clé primaire est (perfumeId, volumeMl) : si un parfum
-- portait DÉJÀ un tarif dans la contenance cible — cas impossible aujourd'hui
-- mais qu'une reprise de sauvegarde peut créer — la traduction entrerait en
-- collision. On supprime alors la ligne héritée : le tarif déjà saisi dans la
-- nouvelle contenance est le plus récent, donc le bon.
DELETE FROM "PerfumePricing" p
WHERE p."volumeMl" = 30
  AND EXISTS (
    SELECT 1 FROM "PerfumePricing" q
    WHERE q."perfumeId" = p."perfumeId" AND q."volumeMl" = 10
  );
DELETE FROM "PerfumePricing" p
WHERE p."volumeMl" = 100
  AND EXISTS (
    SELECT 1 FROM "PerfumePricing" q
    WHERE q."perfumeId" = p."perfumeId" AND q."volumeMl" = 80
  );
UPDATE "PerfumePricing" SET "volumeMl" = 10 WHERE "volumeMl" = 30;
UPDATE "PerfumePricing" SET "volumeMl" = 80 WHERE "volumeMl" = 100;

-- Nouvelle valeur par défaut des lignes de commande.
ALTER TABLE "OrderItem" ALTER COLUMN "volumeMl" SET DEFAULT 80;

-- Horodatage de livraison : la colonne existait depuis
-- 20260701090000_order_delivered_at mais personne ne l'écrivait. Les commandes
-- déjà livrées sont rattrapées sur leur dernière modification, faute de mieux —
-- sans ça elles resteraient éternellement dans la fenêtre de visibilité de 48 h.
-- `updatedAt` et non `deliveryAt` : ce dernier est la date PRÉVUE, saisie à la
-- création dans « Livraison prévue ». Une commande prévue pour dans trois
-- semaines et livrée en avance serait datée d'un futur, et resterait donc
-- indéfiniment dans la fenêtre des livraisons récentes. `updatedAt` est une
-- approximation, mais elle est du bon côté du temps.
UPDATE "Order"
SET "deliveredAt" = "updatedAt"
WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;
