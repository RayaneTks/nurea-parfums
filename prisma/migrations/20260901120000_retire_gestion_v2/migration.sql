-- Retrait de la refonte « gestion v2 », abandonnée.
--
-- Ces six tables et leur enum avaient été créés par la migration
-- 20260831210000_gestion_v2 sur une branche qui n'a jamais été fusionnée. Elles
-- contenaient une COPIE des données, reconstruite depuis Order, Sale et
-- CashMovement — lesquels sont intacts et restent la seule source de vérité de
-- l'app. Vérifié avant écriture : aucune clé étrangère d'une table de l'ancien
-- modèle ne pointe vers l'une d'elles.
--
-- Écrit à la main plutôt que généré : le diff automatique proposait AUSSI de
-- supprimer SaleItem.note, qui n'a rien à voir avec la v2 et porte une vraie
-- colonne. On ne mélange pas ce qu'on retire volontairement et ce qu'un outil
-- propose au passage.

-- Les enfants d'abord : Ecriture référence Poche, Commande, Lot et elle-même.
DROP TABLE IF EXISTS "Ecriture";
DROP TABLE IF EXISTS "Ligne";
DROP TABLE IF EXISTS "DepenseLot";
DROP TABLE IF EXISTS "Commande";
DROP TABLE IF EXISTS "Lot";
DROP TABLE IF EXISTS "Poche";

DROP TYPE IF EXISTS "NatureEcriture";
