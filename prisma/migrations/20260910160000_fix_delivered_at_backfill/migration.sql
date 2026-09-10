-- Rattrape le rattrapage : la migration précédente a daté les livraisons avec
-- la date PRÉVUE au lieu de la date réelle.
--
-- Ce qui s'est passé. `20260910120000_real_volumes_10_50_80` remplissait
-- `deliveredAt` avec `COALESCE("deliveryAt", "updatedAt")`. Or `deliveryAt` est
-- la livraison PRÉVUE, saisie à la création dans « Livraison prévue » : elle
-- n'a aucun rapport avec le moment où la commande est réellement passée en
-- livrée. Une commande prévue pour dans trois semaines et livrée en avance
-- porte donc une date de livraison DANS LE FUTUR — et `recentlyDelivered()`
-- la garde alors indéfiniment dans la fenêtre de 48 h, ce que cette fenêtre
-- existe précisément pour éviter. À l'inverse, une commande dont la date
-- prévue était ancienne sort du suivi trop tôt.
--
-- Pourquoi une nouvelle migration plutôt qu'une correction de l'ancienne :
-- l'ancienne a déjà tourné en production (le 10/09 à 08:23, pendant un build
-- de prévisualisation de la branche). La modifier après coup ne rejouerait
-- rien et casserait sa somme de contrôle. Une migration appliquée est un fait
-- historique : on la corrige par la suivante, jamais en la réécrivant.

-- Sont concernées les seules lignes que le rattrapage a écrites depuis
-- `deliveryAt` : rien n'écrivait `deliveredAt` avant lui, donc une égalité
-- stricte entre les deux colonnes ne peut venir que de ce COALESCE.
UPDATE "Order"
SET "deliveredAt" = "updatedAt"
WHERE "status" = 'DELIVERED'
  AND "deliveryAt" IS NOT NULL
  AND "deliveredAt" = "deliveryAt";
