# Revenir sur la traduction des contenances

La migration `20260910120000_real_volumes_10_50_80` a traduit 30 → 10 et
100 → 80 **sans conserver l'avant**. Aucune table de sauvegarde n'existe : elle
avait été ajoutée au fichier après que la migration eut déjà tourné, donc elle
n'a jamais été exécutée.

Un retour en arrière reste possible, par une autre voie : la correspondance
était déterministe et rien ne créait de lignes en 10 ou 80 ml avant le
10/09/2026 08:23 UTC. Toute ligne dans ces contenances dont la commande ou la
vente parente est antérieure à cet instant vient donc d'une traduction.

```sql
-- Commandes
UPDATE "OrderItem" i SET "volumeMl" = CASE i."volumeMl" WHEN 10 THEN 30 ELSE 100 END
FROM "Order" o
WHERE o."id" = i."orderId"
  AND o."createdAt" < TIMESTAMP '2026-09-10 08:23:00'
  AND i."volumeMl" IN (10, 80);

-- Ventes
UPDATE "SaleItem" i SET "volumeMl" = CASE i."volumeMl" WHEN 10 THEN 30 ELSE 100 END
FROM "Sale" s
WHERE s."id" = i."saleId"
  AND s."createdAt" < TIMESTAMP '2026-09-10 08:23:00'
  AND i."volumeMl" IN (10, 80);
```

`PerfumePricing` n'a pas de date de création : ses tarifs seraient à ressaisir.

Passé quelques semaines d'exploitation, cette voie cesse d'être fiable — des
lignes légitimes en 10 et 80 ml se seront ajoutées sur des commandes anciennes
rouvertes. Ce fichier n'a donc de valeur que peu après le déploiement.
