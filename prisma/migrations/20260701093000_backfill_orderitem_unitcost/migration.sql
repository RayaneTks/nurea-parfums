-- Backfill du coût de revient euro des lignes de commande historiques.
--
-- Avant le correctif, l'API commande stockait `unitCost = 0` : le formulaire mobile
-- ne saisit que le coût en DZD + taux de change, jamais un euro direct. Résultat :
-- toutes les commandes existantes affichaient un coût nul → marges des lots faussées
-- (marge = chiffre d'affaires entier). On recalcule l'euro depuis DZD / taux.
UPDATE "OrderItem"
SET "unitCost" = ROUND("unitCostDzd" / "exchangeRate", 2)
WHERE "unitCost" = 0
  AND "unitCostDzd" IS NOT NULL
  AND "unitCostDzd" > 0
  AND "exchangeRate" IS NOT NULL
  AND "exchangeRate" > 0;
