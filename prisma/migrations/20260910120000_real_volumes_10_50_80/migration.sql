-- Contenances réelles : 10 / 50 / 80 ml.
--
-- Le catalogue annonçait 30 ml pour un flacon de 10 ml et 100 ml pour un 80 ml.
-- Ce ne sont pas de nouveaux produits, seulement la contenance exacte des mêmes
-- flacons : on traduit l'historique plutôt que de le laisser cohabiter avec la
-- nouvelle offre, sinon la compta compare des lignes qui ne se comparent plus.

-- FILET DE SÉCURITÉ — à conserver.
--
-- Les UPDATE qui suivent écrasent des valeurs sans les mémoriser : il n'existe
-- aucune migration inverse possible une fois qu'un 100 est devenu un 80, parce
-- que rien ne distingue plus un 80 traduit d'un 80 saisi. Cette table garde
-- donc l'avant, ligne par ligne. Elle est minuscule (deux entiers par ligne
-- concernée) et permet de tout remettre en place si la traduction s'avérait
-- fausse pour une partie du catalogue.
--
-- Pour revenir en arrière :
--   UPDATE "OrderItem" o SET "volumeMl" = b."ancienVolumeMl"
--   FROM "_backup_volumes_2026_09_10" b
--   WHERE b."table" = 'OrderItem' AND b."rowId" = o."id";
-- (idem pour SaleItem et PerfumePricing, dont la clé est perfumeId:volumeMl)
--
-- À supprimer quand les contenances auront tenu quelques semaines sans plainte.
CREATE TABLE IF NOT EXISTS "_backup_volumes_2026_09_10" (
  "table"          TEXT    NOT NULL,
  "rowId"          TEXT    NOT NULL,
  "ancienVolumeMl" INTEGER NOT NULL
);

INSERT INTO "_backup_volumes_2026_09_10" ("table", "rowId", "ancienVolumeMl")
SELECT 'OrderItem', "id", "volumeMl" FROM "OrderItem" WHERE "volumeMl" IN (30, 100);

INSERT INTO "_backup_volumes_2026_09_10" ("table", "rowId", "ancienVolumeMl")
SELECT 'SaleItem', "id", "volumeMl" FROM "SaleItem" WHERE "volumeMl" IN (30, 100);

INSERT INTO "_backup_volumes_2026_09_10" ("table", "rowId", "ancienVolumeMl")
SELECT 'PerfumePricing', "perfumeId" || ':' || "volumeMl", "volumeMl"
FROM "PerfumePricing" WHERE "volumeMl" IN (30, 100);

-- De même pour l'horodatage de livraison, écrit plus bas sur des commandes qui
-- n'en avaient pas : la trace permet de distinguer une date rattrapée d'une
-- date réellement enregistrée depuis.
CREATE TABLE IF NOT EXISTS "_backup_delivered_at_2026_09_10" (
  "orderId" TEXT NOT NULL
);

INSERT INTO "_backup_delivered_at_2026_09_10" ("orderId")
SELECT "id" FROM "Order" WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;

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
