-- Purge des mouvements de trésorerie orphelins.
--
-- Une vente/commande supprimée avant le correctif laissait ses CashMovement en place
-- (référence souple refType/refId, sans cascade FK). Résultat : argent fantôme dans la
-- trésorerie + libellés « Remboursement · client » trompeurs (le paiement d'origine
-- n'existant plus, le titre retombait sur « Remboursement »).
--
-- On supprime les mouvements dont l'origine n'existe plus. Les transferts, ajustements,
-- ouvertures (refId NULL) ne sont pas concernés.

DELETE FROM "CashMovement"
WHERE "refType" = 'Sale'
  AND "refId" IS NOT NULL
  AND "refId" NOT IN (SELECT "id" FROM "Sale");

DELETE FROM "CashMovement"
WHERE "refType" = 'PaymentTransaction'
  AND "refId" IS NOT NULL
  AND "refId" NOT IN (SELECT "id" FROM "PaymentTransaction");

DELETE FROM "CashMovement"
WHERE "refType" = 'BatchExpense'
  AND "refId" IS NOT NULL
  AND "refId" NOT IN (SELECT "id" FROM "BatchExpense");
