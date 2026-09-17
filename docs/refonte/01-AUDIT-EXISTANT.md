# 01 — Audit de l'existant

## 1. But du document

**Date : 17 septembre 2026.**

Ce document est la **mémoire complète de l'audit de « Nuréa Gestion »** (PWA admin iOS de Nuréa Parfums) avant sa refonte. Il consigne, domaine par domaine, tout ce que l'app fait aujourd'hui, chaque bug relevé et contre-vérifié, chaque incohérence, chaque friction UX, chaque dette technique — et chaque force à préserver. Rien de ce qui suit n'est résumé au point d'être perdu : ce document doit permettre de retrouver n'importe quel constat de l'audit sans rouvrir le code.

Il est le **premier document de la série `docs/refonte/`** :

| N° | Document | Statut |
|---|---|---|
| 01 | Audit de l'existant (**ce document**) | Écrit |
| 02 | Vision produit | À écrire |
| 03 | Modèle de données | À écrire |
| 04 | Architecture | À écrire |
| 05 | Design system | À écrire |
| 06 | Écrans & parcours | À écrire |
| 07 | Plan d'exécution | À écrire |

**Méthode.** Un lecteur par domaine a audité le code et produit un constat structuré (rôle, features, parcours, données, bugs, incohérences, UX, dette, forces). Les domaines couverts : Commandes · Vendre / Encaisser · Compta / Trésorerie · Lots · Catalogue · Clients · Accueil / Dashboard / Shell · Auth / PWA / Infra · Modèle de données (Prisma) · Calculs financiers (transversal) · Dépendances vitrine.

**Note de lecture des tableaux de bugs.** Une partie des audits porte une contre-vérification explicite bug par bug (champ *preuve* = note de vérification sur pièces, fichier:ligne à l'appui). Les autres domaines rapportent leurs bugs tels que relevés par le lecteur, avec leur localisation précise ; plusieurs sont recoupés par les audits contre-vérifiés (le double comptage trésorerie, par exemple, est constaté indépendamment par quatre lecteurs et prouvé par l'audit « Vendre / Encaisser »). Les bugs **réfutés** lors de la contre-vérification sont sortis des sections domaine et consignés en annexe (§6) — à ne pas retraiter.

**Vocabulaire imposé** (repris tel quel de `docs/admin/PRODUCT.md` et appliqué dans tout ce document) : **Encaissé / À encaisser / Marge nette / Trésorerie**. Pas de synonyme, pas de « CA ».

---

## 2. Synthèse exécutive

### 2.1 État général

L'app est **fonctionnellement riche et remarquablement soignée en surface** : UX mobile travaillée (hitbox 44 px, optimistic updates avec rollback, undo 5 s, skeletons aux proportions exactes, streaming par bloc), performance mesurée et justifiée en commentaires (agrégats SQL en une passe, caches taggés), vocabulaire des chiffres tenu, et un vrai savoir-faire métier documenté dans le code (machine à états des commandes, poche « Non attribué », snapshots immuables).

Mais les **fondations sont minées** :

- **La sécurité est illusoire** : le middleware ne vérifie que la *présence* du cookie, les server actions — le chemin d'écriture réellement utilisé par les écrans récents — n'ont **aucune** authentification ni contrôle de rôle, et la quasi-totalité des pages RSC rendent leurs données sans vérifier le JWT.
- **L'argent est compté deux fois ou perdu** selon le chemin emprunté : double comptage en Trésorerie à la finalisation d'une commande, acomptes sans mouvement de poche, suppressions sans contre-passation, mouvements orphelins.
- **Deux mondes d'écriture coexistent** (server actions vs REST legacy) avec des règles divergentes pour les mêmes entités, plus un fichier entier de server actions ventes **mort** (`src/server/sales/actions.ts`) à la logique contraire du chemin vivant.
- **Deux modèles de dette** cohabitent : le ledger `PaymentTransaction` (commandes) et le scalaire `Sale.remainingDue`, documenté « legacy » dans le schéma alors qu'il est le pivot actif de tout le cash-basis ventes.
- **Une refonte a déjà été tentée et abandonnée** : la migration `20260831210000_gestion_v2` (tables Ecriture/Ligne/Commande/Lot/Poche/DepenseLot) a été créée sur une branche jamais fusionnée puis droppée en `20260901120000`. La présente refonte doit expliquer pourquoi elle réussira là où la v2 a échoué.

### 2.2 Thèmes récurrents transversaux

1. **Caches dénormalisés divergents** — `Order.depositPaid`/`depositAmount` a trois écrivains concurrents aux règles différentes (server action à la création, `refreshOrderCache`, PATCH REST en écriture directe sans transaction de paiement) ; les totaux `Sale` sont figés et jamais réalignés avec la Trésorerie ; le trio client (`customerId` + `customerName` + `customerContact`) est dupliqué sur `Order` ET `Sale`.
2. **Dualité Order/Sale** — deux tables pour « document de vente », deux modèles de dette, `OrderItem`/`SaleItem` miroirs structurels, et un pont `?fromOrder` qui perd les coûts DZD, le taux, `isGift`, `customerId` et `batchId` au passage.
3. **Chemins d'écriture dupliqués** — server actions vs routes REST pour les mêmes tables, avec deux conventions d'erreur, deux systèmes de revalidation, deux niveaux d'auth ; la somme des paiements est réimplémentée au moins 6 fois, le triplet total/payé/dû au moins 4 fois, la conversion DZD→EUR 3 fois (+ 1 version morte).
4. **Couplage compta/Trésorerie jamais atomique** — partout, la mutation puis le mouvement de poche sont des écritures séparées hors transaction ; `movements.ts` accepte pourtant un `TransactionClient` que personne ne lui passe.
5. **Effets de bord destructeurs en lecture** — la purge « éphémère » supprime des commandes (et leurs paiements, en cascade) sur un simple GET ; le GET détail lot déclenche `revalidateAdminData`.
6. **Liens souples sans FK** — `CashMovement.refType/refId` en chaînes libres : orphelins structurels, déjà purgés une fois par migration réparatrice (`20260701120000`), recréés par le code.
7. **Champs, tables et code morts** — `Order.deliveredAt`, `PaymentTransaction.recordedById`, `BatchExpense.countInCompta`, `Perfume.isPrivate`, `ExternalImportSuggestion`, `AppSetting`, `src/server/sales/actions.ts`, `src/domain/money.ts`, route `/admin/reglages` fantôme, endpoints REST sans appelant.
8. **Périmètres KPI divergents** — trois définitions du « dû », trois définitions de la Marge nette, deux définitions d'« en retard », deux définitions de la semaine, deux définitions du CA (facturé vs Encaissé), et des tuiles voisines du même écran qui ne parlent pas le même périmètre.
9. **Commentaires mensongers** — `voidPaymentAction` (« delete original » jamais fait), SQL pipeline (« hors REFUND » contredit par le code), `collectAction` (« plafonné » non plafonné côté commandes), schéma (`remainingDue` « legacy », `countInCompta` jamais honoré), middleware (« contrôle JWT côté API » faux pour les actions).
10. **Audit log write-only** — écrit partout, lu nulle part, `actorId` null sur tous les chemins server actions.

### 2.3 Les 10 problèmes les plus structurants pour la refonte

| # | Problème | Où |
|---|---|---|
| 1 | **Aucune authentification réelle sur les server actions** (ni JWT ni rôle ; middleware présence-cookie seule ; pages RSC non gardées sauf deux) : un cookie forgé écrit paiements, ventes, Trésorerie | `middleware.ts:21-29`, tout `src/server/*` |
| 2 | **Double comptage en Trésorerie à la finalisation commande→vente** : DEPOSIT_IN/BALANCE_IN jamais contre-passés + SALE_IN du total (le client n'envoie jamais `remainingDue`) | `app/api/admin/sales/route.ts:388`, `SellPageClient.tsx:246-264` |
| 3 | **Deux modèles de dette** : `Sale.remainingDue` « legacy » mais pivot actif de tout le cash-basis vs ledger `PaymentTransaction` — la doc du schéma décrit une migration (P6) qui n'a jamais eu lieu | `prisma/schema.prisma:292-295` |
| 4 | **Deux piles d'écriture concurrentes** (server actions vs REST legacy) aux règles divergentes + fichier ventes entier mort à logique contraire | `src/server/*` vs `app/api/admin/*`, `src/server/sales/actions.ts` |
| 5 | **Couplage compta/Trésorerie non transactionnel généralisé** : paiement, cache, mouvement, statut = écritures séparées ; un échec au milieu désynchronise les deux registres | `paymentActions.ts:52-103`, `sales/route.ts:316-421`, `collect/actions.ts:78-90`, `expenses/route.ts:71-91` |
| 6 | **Purge destructrice déclenchée par des GET** : commandes livrées hard-delete J+1 (cascade paiements), mouvements orphelins, dette client effacée silencieusement, historique perdu | `src/lib/gestion/orderPurge.ts`, `app/api/admin/orders/[id]/route.ts:69-72` |
| 7 | **Le pont `?fromOrder` perd les données** : coûts DZD/taux/`isGift`/`perfumeSnapshot` non sérialisés (marge ~100 % fausse), `customerId` non copié (historique client vide), `batchId` non propagé (le lot perd ses montants au moment où la commande se conclut) | `src/lib/gestion/orderJson.ts:62`, `SellPageClient.tsx:110` |
| 8 | **Caches dénormalisés à écrivains multiples** : `depositPaid`/`depositAmount` écrits par trois chemins contradictoires ; annuler un BALANCE ampute l'acompte | `paymentActions.ts:16-27`, `orders/route.ts:248`, `orders/[id]/route.ts:141` |
| 9 | **Calculs financiers dupliqués et arithmétiques mixtes** : ≥6 implémentations de la somme des paiements, 3 sémantiques du « dû », 3 arithmétiques monétaires (decimal.js-light, Prisma.Decimal, float `Number()`) — écarts au centime entre écrans | `src/domain/balance.ts`, `financials.ts`, `kpi/queries.ts:389-411`, etc. |
| 10 | **Stock non tenu sur les chemins d'édition** : PATCH vente ne réajuste jamais le stock, pas de plancher (négatif silencieux), sémantique « stock 0 » surchargée (non suivi vs rupture) → fausses alertes massives | `app/api/admin/sales/[id]/route.ts:244`, `sales/route.ts:375-381` |

---

## 3. Carte fonctionnelle complète

Tout ce que l'app **fait** aujourd'hui. C'est la **liste de non-régression** de la refonte : chaque capacité ci-dessous doit exister (ou être explicitement abandonnée par une décision du document 02) dans la cible.

### 3.1 Commandes

- Liste groupée par urgence (En retard / Aujourd'hui / À traiter / À venir / Livrées / Annulées) avec compteurs, filtre segmenté Tout/En attente/À traiter/Livrées synchronisé à l'URL, plafonnée à 200 lignes (`src/server/orders/queries.ts:87-195`).
- Création : client lié (`Customer`) ou nom libre, lignes catalogue ou hors-catalogue (`perfumeSnapshot`), volume 30/50/100, don (`isGift`, prix forcé à 0), coût DZD + taux de change, note par ligne, date de livraison et notes repliées (`OrderForm`).
- Acompte initial optionnel à la création → `PaymentTransaction` DEPOSIT + passage direct en READY (`src/server/orders/actions.ts:41-96`).
- Mémoire de prix serveur `PerfumePricing` (upsert par parfum+volume) + pré-remplissage prix/coût/taux au choix du parfum et au changement de volume ; mémoire locale du dernier taux (`useLastExchangeRate`).
- Cycle de statuts par SegmentedControl : garde domaine `canTransition` qui n'interdit plus rien mais retourne des « réserves » affichées en ConfirmDialog (`src/domain/order-status.ts`) ; auto-transition PENDING→READY au premier acompte seulement si le verdict est sans réserve (`paymentActions.ts:78-103`).
- Paiements sur fiche : sheet Acompte/Solde (montant pré-rempli au dû, poche de Trésorerie, méthode, note), historique typé, annulation par contre-écriture REFUND + suppression du mouvement de Trésorerie d'origine, recalcul des caches `Order.depositPaid`/`depositAmount` (`paymentActions.ts`).
- Livraison partielle par ligne : stepper −/+ et bouton « Tout » (hitbox 44 px), clamp serveur 0..quantity, optimistic update avec rollback, état dérivé none/partial/full, badge « Partiel » en liste, CTA « Tout est livré — marquer livrée » (`OrderItemsFulfillment` + `app/api/admin/orders/[id]/fulfillment/route.ts`).
- Finalisation en vente : bouton « Finaliser la vente » (si READY, dû ≤ 0,01, sans vente) → `/admin/vendre?fromOrder=` pré-rempli → POST `/api/admin/sales` crée la `Sale` liée (unique par commande), passe la commande en DELIVERED, décrémente le stock, enregistre l'Encaissé par poche (SALE_IN).
- Duplication « réassort » : nouvelle commande PENDING avec mêmes lignes et client, sans paiements (`duplicateOrderAction`).
- Suppression avec ConfirmDialog + undo 5 s (`scheduleDelete` du shell) → DELETE REST, cascade items + paiements ; la vente liée survit (`orderId` → null).
- Rattachement aux lots : BatchPicker sur fiche (si statut ≠ PENDING/CANCELLED) via PATCH `{batchId}`, et assignation en masse côté lot limitée aux READY/DELIVERED sans vente.
- Partage du récap client (Web Share), marge estimée (coût DZD/taux) sur fiche et sur le form, édition inline du nom client.
- Créances commandes agrégées dans l'écran Encaisser (`collectAction` → BALANCE) et dans la compta (`confirmedOrdersFinancials`, exclut les commandes déjà vendues).
- Purge « éphémère » côté REST legacy : commandes CANCELLED supprimées, livrées supprimées à J+1 du jour de livraison — déclenchée uniquement par les GET de l'API legacy (`orderPurge.ts`).

### 3.2 Vendre / Encaisser

- Vente directe multi-lignes : picker catalogue (recherche sans accents, parfums déjà au ticket exclus) + volume 30/50/100, stepper quantité, prix €, coût DZD, taux de change par ligne.
- Pré-remplissage prix/coût/taux depuis `PerfumePricing` (clé perfumeId+volumeMl) à l'ajout d'une ligne et à chaque changement de volume (fetch `/api/admin/perfumes/[id]/pricing`).
- Mémorisation du dernier taux de change utilisé en localStorage (défaut 277) pour préremplir les lignes suivantes.
- Dons (`isGift`) : toggle par ligne qui force le prix à 0, affiche « Offert », garde le coût en perte ; persisté sur `SaleItem.isGift`.
- Hors-catalogue : saisie libre nom+marque avec normalisation orthographique, rattachement à une marque existante et détection « déjà au catalogue » pour éviter les doublons phonétiques.
- Rattachement client : recherche/création `Customer` (`CustomerField`) ou nom libre + contact, snapshot dénormalisé sur la vente.
- Total ticket, marge € et % en temps réel ; calculatrice « Reçu espèces → à rendre / manque ».
- Répartition de l'Encaissé par poches de Trésorerie (`PocketSplit`) ; le reliquat non réparti part dans la poche système « Non attribué ».
- Solde de commande via `/admin/vendre?fromOrder=<id>` : préremplissage nom/contact/lignes, dialog de confirmation, transition Order → DELIVERED dans la même transaction.
- Décrément de `Perfume.stock` par ligne catalogue à la création de la vente ; restitution intégrale à la suppression de la vente (DELETE `/api/admin/sales/[id]`).
- Mouvements de Trésorerie SALE_IN à la création (un par poche répartie + un pour le reliquat), liés par refType/refId « Sale » et contre-passés à la suppression.
- Écran « À encaisser » (`/admin/encaisser`) : liste unifiée des ventes à `remainingDue` > 0 et des commandes READY/DELIVERED sans vente partiellement payées, triée plus anciennes d'abord, créances > 30 jours signalées en rouge, recherche client au-delà de 6 lignes.
- `CollectSheet` : montant prérempli au reste dû, raccourcis « La moitié » / « Tout solder », sélection de poche (auto si une seule), plafonnement serveur au dû, mouvement BALANCE_IN.
- Encaissement d'une commande délégué à `recordPaymentAction` (type BALANCE) : historique `PaymentTransaction`, refresh du cache `depositPaid`/`depositAmount`, Trésorerie.
- Audit log (sale.create, sale.collect, sale.update, sale.delete) et revalidation ciblée par tags (sales, kpi, treasury, perfumes, batches).

### 3.3 Compta / Trésorerie

- Écran `/admin/compta` à deux vues basculées par SegmentedControl ; la vue active vit dans l'URL (`?vue=tresorerie`) pour les deep-links depuis le dashboard (`ComptaWithTreasury.tsx:49-61`).
- Vue Ventes : tuiles « Encaissé » (avec décomposition ventes/commandes en légende) et « Marge nette » (+%), bandeau « À encaisser » cliquable vers `/admin/encaisser`, ligne « Dépenses déduites » (`ComptaKpiRow.tsx`).
- Liste en trois sections : « Commandes en cours » (READY/DELIVERED sans vente, reste dû en avant), « Lots » (groupes par batch, OPEN d'abord), « Hors lot » (groupes par client) — chaque groupe repliable avec Encaissé + badge À encaisser.
- Recherche client (`?q=`, debounce 200 ms) affichée seulement au-delà de 6 groupes ; refetch client via GET `/api/admin/compta`.
- Graphe « Encaissé par semaine » (recharts, 8 semaines, encaissé = totalRevenue − remainingDue) rendu sous la liste, masqué pendant une recherche.
- `TicketSheet` (deep link `?sale=<id>`) : consultation/édition d'une vente — nom inline, contact, lot (BatchPicker PATCH `{batchId}`), paiement (champ « restera à encaisser »), lignes (volume 30/50/100, qté, prix €, coût DZD, taux), partage du reçu (Web Share), suppression avec ConfirmDialog.
- Export CSV des ventes pour le comptable (BOM Excel, séparateur ;) via `/api/admin/compta/export`, filtre `?period` géré côté serveur.
- Vue Trésorerie : total toutes poches, alerte rouge « X € non attribué » ouvrant la répartition, liste des poches avec soldes calculés (openingBalance + Σ mouvements), 5 sheets d'action : créer poche, transfert, répartir le non attribué, ajustement signé, paiement fournisseur.
- Journal des mouvements groupés par mois (repli/dépli, net mensuel signé, libellé résolu « Vente · Fares » avec lien vers l'origine vente/commande/lot), 30 derniers mouvements.
- « Importer l'historique » : backfill idempotent des ventes encaissées, paiements de commandes et dépenses vers « Non attribué », dédoublonné par origine (refType:refId).
- Enregistrement automatique des mouvements : vente → SALE_IN (répartition par poches via `PocketSplit` + reliquat vers « Non attribué ») ; paiement commande → DEPOSIT_IN/BALANCE_IN/REFUND_OUT ; encaissement `collectAction` → BALANCE_IN plafonné au dû ; baisse du reste dû en PATCH → BALANCE_IN ; dépense de lot → EXPENSE_OUT avec choix de poche.
- Réversibilité par origine : suppression de vente ou de dépense et annulation de paiement suppriment leurs mouvements (`reverseMovementsFor` refType/refId).
- Poche système « Non attribué » (isSystem, kind UNASSIGNED) auto-créée, refusée au renommage/archivage, cible par défaut de tout mouvement sans poche.
- KPI serveur (`src/server/kpi/queries.ts`) : `revenueSummary` global (unstable_cache 60 s taggé kpi/sales/batches/orders), `monthSummary`, `pipelineCounts` (30 s), tops parfums/marques/clients et `dailyRevenue` en SQL brut.
- Dashboard : `MoneyBlock` (Encaissé dominant, tuiles À encaisser / Trésorerie / Ce mois) et `AlertsBlock` (« X € non attribués » → `?vue=tresorerie`) consomment `revenueSummary` + `treasurySummary`.

### 3.4 Lots (batches)

- Liste `/admin/lots` scindée Ouverts/Clos, chaque rangée avec KPIs recalculés : Encaissé, Marge nette, Marge %, badge « X € à encaisser », compte ventes + commandes, total dépenses.
- Création d'un lot (nom min 2 car., date prévue optionnelle, notes) avec redirection immédiate vers le détail.
- Détail : renommage inline, bouton Clôturer/Rouvrir, 4 tuiles KPI (Encaissé, Marge nette + %, Dépenses, et À encaisser OU Coût achats selon le contexte), sections Ventes / Commandes / Dépenses / Notes.
- Assignation en masse de ventes via sheet : candidats = ventes sans lot ou de ce lot, recherche par client, cases à cocher, envoi du seul diff attach/detach en transaction.
- Assignation en masse de commandes (sheet jumelle) : éligibles = READY/DELIVERED sans vente liée.
- Assignation unitaire inverse : BatchPicker sur le ticket de vente (compta) et sur le détail commande (hors PENDING/CANCELLED), listant les lots OPEN uniquement, avec retrait (croix).
- Dépenses de lot : ajout (libellé, montant, poche de Trésorerie source — défaut « Non attribué »), création simultanée d'un mouvement EXPENSE_OUT ; suppression avec contre-passation du mouvement.
- KPIs cash-basis : Encaissé = Σ(vente.totalRevenue − remainingDue) + Σ(payé commandes) ; Marge nette = Encaissé − coûts d'achat − dépenses ; % sur l'Encaissé ; le facturé (totalRevenue) est exposé mais non affiché.
- Statut OPEN/CLOSED : clôturer retire le lot des pickers (`listOpenBatchesLite`), masque les boutons Assigner, le déplace en section « Clos » (liste, compta) et grise son icône — aucun autre effet.
- Suppression de lot protégée : 409 serveur si ventes rattachées, bouton visible seulement à 0 vente, `window.confirm`.
- Intégrations : bloc « Lots ouverts » du dashboard (3 max), groupes par lot en compta (OPEN d'abord), mouvements de Trésorerie liés au lot avec deep-link, backfill Trésorerie des dépenses historiques.
- Sécurité : `requireAdmin` sur les lectures, `requireEditor` sur toutes les mutations ; audit log systématique.

### 3.5 Catalogue

- Liste catalogue à 3 onglets (Parfums / Marques / En avant) avec recherche, chips de filtres à compteurs, état persisté dans l'URL (`?tab,q,pf,bf`) et deep-link `?stock=low` depuis l'alerte du tableau de bord (`src/features/catalogue/components/CatalogueClient.tsx`).
- CRUD parfum complet : POST (création avec id manuel), PUT (fiche entière), PATCH (statut + isFeatured), DELETE hard (`app/api/admin/perfumes/route.ts`, `app/api/admin/perfumes/[id]/route.ts`).
- CRUD marque : POST avec dédoublonnage (rend l'existante au lieu d'un 409), PATCH partiel, DELETE cascade des parfums (`app/api/admin/brands/route.ts`, `app/api/admin/brands/[id]/route.ts`).
- Bascule de visibilité optimiste depuis la liste (œil), avec rollback et toast en cas d'échec serveur (`CatalogueClient.tsx:246-293`).
- Mise en avant vitrine limitée à 2 emplacements matérialisés (`FeaturedPanel`), vérifiée côté client (`FEATURED_LIMIT`) et côté serveur (compteur en base).
- Upload d'images : conversion WebP + recadrage 1024×1536 côté client, URL signée Supabase (bucket via `/api/admin/storage/sign`), PUT direct navigateur→storage, image principale (dark) + variante claire optionnelle (`src/lib/admin/image-utils.ts`, `src/ui/patterns/ImageField.tsx`).
- Auto-save immédiat de la fiche après chaque upload d'image sur une fiche existante (`PerfumeForm.tsx:156-176`, `BrandForm.tsx:130-150`).
- Normalisation orthographique des noms : casse de titre à la française, sigles préservés (MYSLF, YSL), mots-outils, doctrine « on ne recasse que ce dont on est sûr » (`src/lib/nommage.ts`).
- Dédoublonnage des marques par clé insensible à la casse, aux accents et à la ponctuation (`cleNom`) : création à la volée depuis le BrandPicker, résolution par nom côté serveur (`src/lib/admin/resoudMarque.ts`).
- Verrous de publication en cascade : un parfum n'est publiable que s'il a une image, que sa marque est PUBLISHED et en mode CURATED ; marque COMPLETE sans logo forcée DRAFT ; passage d'une marque en COMPLETE ou DRAFT force tous ses parfums en DRAFT.
- Grille tarifaire `PerfumePricing` par (parfum, volume 30/50/100) : prix € de vente, coût DZD, taux de change ; upsert/delete par server actions, éditée en slot dans la fiche parfum (`PerfumePricingPanel.tsx`, `src/server/pricing/actions.ts`).
- Pré-remplissage des formulaires vente/commande/compta via GET `/api/admin/perfumes/[id]/pricing?volumeMl=` (`SellPageClient`, `OrderForm`, `TicketItemsList`).
- Suivi de stock : saisie manuelle sur la fiche (clampée ≥0), décrément à la création de vente, restitution à la suppression de vente, badges Rupture/Stock bas dans la liste, alerte tableau de bord, filtre « Stock bas ».
- Snapshot catalogue admin en cache (unstable_cache, tag admin-catalogue) partagé entre la page RSC et `/api/admin/catalogue`, avec `mode=picker` allégé pour le sélecteur de vente.
- Invalidation coordonnée des caches vitrine + admin après chaque mutation (`revalidateAdminCatalogue` : 2 tags + 2 chemins).
- Rôles : VIEWER en lecture seule (boutons masqués, `requireEditor` côté API), EDITOR/OWNER en écriture ; audit log sur chaque mutation (`writeAudit`).
- Listes virtualisées (`WindowedList`) et vignettes plafonnées à 256 px via un loader d'image dédié (`nureaAdminThumbLoader`).

### 3.6 Accueil / Dashboard / Shell

- Dashboard en 6 blocs streamés indépendamment (Suspense par bloc avec squelettes dimensionnés) : alertes, argent, pipeline commandes, raccourcis, lots ouverts (3 max), top 5 parfums — `DashboardPage.tsx`.
- Bloc argent hiérarchisé : une tuile dominante Encaissé (+ Marge nette et %), trois tuiles secondaires À encaisser / Trésorerie / Ce mois, chacune étant un lien profond vers l'écran d'action (`MoneyBlock.tsx`).
- Bandeau d'alertes conditionnel (rien à faire = rien rendu) : commandes en retard, argent non attribué aux poches, stock en rupture/bas avec heuristique « stock non tenu » (`AlertsBlock.tsx`).
- Pipeline commandes : compteurs En attente / À traiter / dont en retard (cette dernière tuile masquée à zéro), liens vers la liste filtrée (`PipelineBlock.tsx`).
- Raccourcis vers les écrans sans onglet dédié : Clients, Lots, Statistiques (`ShortcutsBlock.tsx`).
- Palette de commandes Cmd+K / bouton loupe : navigation statique (7 destinations), 4 actions de création, et recherche globale débouncée 200 ms sur `/api/admin/search` (6 parfums + 6 clients + 6 commandes, min 2 caractères) — `CommandPalette.tsx` + `src/server/search/queries.ts`.
- Header sans titre : logo→`/admin` sur racine d'onglet, sinon bouton retour dérivé de `getParentScreen` (jamais de l'historique) ; bouton recherche avec libellé sur les racines, loupe seule ailleurs (`AppHeader.tsx`).
- Tab bar 5 onglets fixes sans menu Plus, onglet Vendre traité en bouton accentué, état actif par fonction `match()` par route (`TabBar.tsx` + `navigation.ts`).
- Écran stats top-parfums : classement complet (limit 500) avec rang, barres proportionnelles au CA, badge Hors catalogue pour les ventes hors référentiel, totaux en sous-titre (`app/admin/stats/top-parfums/page.tsx`).
- Shell PWA : frame 430 px max, `ViewportSync` (`--admin-vh` via visualViewport), `useAdminKeyboardInset`, pull-to-refresh custom (`router.refresh`), `UndoProvider` (suppression différée 5 s avec toast Annuler), barre de progression de navigation, bannière d'installation iOS dismissible (localStorage), service worker scope `/admin/` avec page offline statique, bypass complet du shell sur `/admin/login` (`AdminShell.tsx`).
- Cache serveur discipliné : unstable_cache taggé (revalidate 60 s KPI / 30 s pipeline) + revalidateTag centralisé (`cache-tags.ts`), mémoïsation `react cache()` par rendu pour dédupliquer les appels entre blocs.

### 3.7 Auth / PWA / Infra

- Connexion par identifiant/mot de passe : POST `/api/admin/login`, bcrypt.compare contre `AdminUser`, JWT HS256 (jose) 7 jours posé en cookie httpOnly `nurea_admin` SameSite=Lax secure(prod) (`app/api/admin/login/route.ts`, `src/lib/admin/session.ts`).
- Rate-limit login en mémoire : 20 tentatives / 15 min par IP (x-forwarded-for) (`src/lib/admin/loginRateLimit.ts`).
- Middleware Next sur `/admin` et `/admin/:path*` : redirige vers `/admin/login` si le cookie est ABSENT (présence seule, pas de vérification JWT) et tague la requête `x-nurea-admin-route=1` (`middleware.ts`).
- Root layout minimal qui lit `x-nurea-admin-route` pour appliquer la classe admin-route sans embarquer la CSS vitrine (`app/layout.tsx:23`).
- Garde API : `requireAdmin` (vérif JWT complète) + `requireEditor` (VIEWER bloqué en 403) appliqués sur toutes les routes REST `/api/admin/*` (`src/lib/admin/requireAdmin.ts`).
- Endpoint session GET `/api/admin/session` renvoyant `{username, role}` ; utilisé par BrandForm/PerfumeForm pour passer en lecture seule si VIEWER.
- Route POST `/api/admin/logout` qui supprime le cookie — existe mais n'est référencée par aucune UI.
- Journal d'audit : table `AuditLog` remplie par `writeAudit` (best-effort, erreur avalée) depuis les routes REST (avec ctx.sub) et les server actions (avec undefined) (`src/lib/admin/audit.ts`).
- Sonde d'intégration GET `/api/admin/health` protégée par un second secret Bearer `ADMIN_DASHBOARD_SECRET` (`app/api/admin/health/route.ts`).
- Création de compte uniquement par CLI : `scripts/create-admin.ts` (bcrypt cost 12, upsert, rôle défaut OWNER).
- Manifeste PWA admin dynamique `/api/pwa/admin` : id/start_url/scope `/admin`, standalone, portrait, background bordeaux #7B0B1D, theme_color gris iOS #F2F2F7, icônes 192/512 + maskable, 3 shortcuts Android (`src/lib/pwa/manifests.ts`).
- 12 splash screens iOS exacts (points CSS + ratio + orientation) déclarés via `appleWebApp.startupImage` (`src/lib/pwa/admin-splash.ts`).
- Script sharp de génération des assets PWA : icônes (safe zone maskable 46 %) + splash bordeaux avec logo (`scripts/build-admin-pwa-assets.mjs`).
- Service worker scope `/admin/` : navigations network-first avec repli `/admin/offline`, assets immuables (`/_next/static`, `/pwa/admin`, `/branding`) cache-first, `/api/*` jamais touché, purge des caches d'anciennes versions (`public/admin-sw.js`).
- Enregistrement SW prod-only après l'événement load, avec désenregistrement automatique en dev (`src/app-shell/ServiceWorkerRegistrar.tsx`).
- Page hors-ligne statique `/admin/offline` (EmptyState + bouton Réessayer = location.reload).
- Bannière d'installation iOS Safari hors standalone, dismiss persistant en localStorage (`src/app-shell/PwaInstallHint.tsx`).
- Shell admin : bypass complet sur `/admin/login`, header avec retour dérivé de la route (`getParentScreen`), TabBar 5 onglets, palette de commandes, pull-to-refresh (`router.refresh`), barre de progression de navigation (`src/app-shell/AdminShell.tsx`, `navigation.ts`).
- `ViewportSync` : synchronise `--admin-vh`/`--admin-vv-offset` sur visualViewport pour que le shell se compresse au-dessus du clavier iOS (`src/app-shell/ViewportSync.tsx`).
- Metadata admin : noindex, appleWebApp + clé legacy apple-mobile-web-app-capable (iOS < 17), themeColor #F2F2F7 choisi pour la lisibilité de l'heure, zoom non bloqué (`app/admin/layout.tsx`).

### 3.8 Socle de données (capacités portées par le schéma Prisma)

- Catalogue bi-registre : `Brand` + `Perfume` avec statut de publication, mode de catalogue (CURATED/COMPLETE), images dark/light, mise en avant (isFeatured plafonné), stock.
- Mémoire de prix serveur `PerfumePricing` par (parfum, volume) qui pré-remplit les formulaires commande/vente.
- Fichier clients `Customer` (téléphone E.164 unique, Snapchat, WhatsApp, adresse) lié aux commandes et ventes en SetNull.
- Pipeline commandes `Order`/`OrderItem` : 4 statuts, acompte initial, lignes multi-volumes (30/50/100), dons (isGift), coût d'achat en DZD + taux de change figés par ligne, livraison partielle par ligne (deliveredQuantity), lignes hors-catalogue via snapshot JSON.
- Ledger de paiements `PaymentTransaction` (DEPOSIT/BALANCE/REFUND) par commande, avec cache dénormalisé `depositPaid`/`depositAmount` et auto-transition PENDING→READY au premier acompte.
- Tickets de vente `Sale`/`SaleItem` : totaux et marges figés ligne à ligne, snapshot parfum JSON, reste dû scalaire (`remainingDue`), lien optionnel 1-1 vers la commande d'origine.
- Lots fournisseur `Batch` regroupant commandes et ventes d'un même envoi, avec dépenses logistiques `BatchExpense` déduites de la Marge nette.
- Trésorerie `Pocket`/`CashMovement` : soldes par poche, 9 types de mouvements signés, poche système « Non attribué », transferts appariés, backfill idempotent de l'historique.
- Comptes admin à rôles (OWNER/EDITOR/VIEWER) et journal d'audit `AuditLog` sur chaque mutation.
- Cycle de vie éphémère des commandes : annulées supprimées immédiatement, livrées supprimées J+1 (la vente seule reste en compta).
- KPI cash-basis calculés sur le modèle : Encaissé = ventes (total − remainingDue) + commandes confirmées (ledger), À encaisser, Marge nette après dépenses, tops parfums/marques/clients via SQL brut sur les snapshots JSON.

### 3.9 Vitrine publique (lecture du catalogue — contrat détaillé en §5)

- Catalogue public une seule page (`/`, force-dynamic) : grille filtrable par recherche libre, catégorie, tri, marque unique (via fiche gamme) et multi-marques (drawer), tronquée à 12 fiches visibles en CSS (toutes dans le DOM pour Google).
- Filtres miroirs de l'URL : `?q=`, `?cat=`, `?sort=`, `?maison=<brand.slug>`, `?brands=slug1,slug2` — écrits en replaceState débouncé 300 ms, relus au popstate (`useCatalogFilters.ts`).
- Cartes « Gammes Complètes » synthétisées depuis les marques catalogMode=COMPLETE (image marque = visuel, id fictif) ; cliquer restreint la grille à la marque au lieu d'ouvrir un détail.
- Mise en avant éditoriale : les 2 premiers parfums isFeatured en bandeaux alternés au-dessus du catalogue (`page.tsx` MAX_FEATURED=2, plafond aussi côté PATCH admin).
- Recherche fuzzy locale côté client : normalisation accents, Levenshtein, tokens, scoring de pertinence (`data.ts`) — tri par pertinence quand une requête est active.
- Recherche élargie serveur `/api/perfume-search?q=` déclenchée seulement à 0 résultat local et ≥3 caractères, débounce 350 ms, abort des requêtes caduques : re-recherche locale serveur → cache mémoire de suggestions (TTL 7 j positif / 24 h négatif / 2 min erreur, configurables par env) → Fraganty si FRAGANTY_API_KEY sinon API générique configurable (URL+clé env) → une suggestion externe unique max.
- ~1080 lignes de « hints » codés en dur (marques virales absentes du catalogue : Lattafa, Initio…) matchés côté client avec caption conciergerie et alternatives catalogue (`externalSearchHints.ts` + `externalHintsExtra.ts`).
- État vide avec « Pistes au catalogue » : gamme de la marque suggérée + parfums des hints + suggestions fuzzy similaires, fusionnés et plafonnés à 6.
- Fiche parfum en dialog (seule surface de commande) : Snapchat en aplat, WhatsApp conditionnel (null → bouton retiré), lien formulaire contact pré-rempli `?parfum=&marque=` ; jamais de prix.
- Images bi-thème par CSS pur : image (dark, obligatoire) + imageLight optionnelle basculées en `dark:` sans JS, blur placeholder statique, hôte Supabase unique autorisé dans `next.config.mjs`.
- Résilience DB : circuit breaker mémoire 90 s (`prismaRuntimeCircuit`) + repli sur `mockPerfumes` — qui est VIDE, donc catalogue vide sans erreur visible.
- Invalidation du cache public pilotée par la gestion : toutes les routes admin brands/perfumes/pricing/sales appellent `revalidateAdminCatalogue()` (tags public-catalogue + admin-catalogue, paths `/` et `/admin/catalogue`, expire:0).

### 3.10 Clients

- Liste alphabétique sectionnée A–Z (tri `localeCompare` fr), recherche débouncée 200 ms dans l'URL (`?q=`, nom/téléphone/snap), badge « X € dû » par ligne, pagination cursor « Charger plus » (pages de 100).
- Création par formulaire (nom seul requis ; téléphone/WhatsApp E.164, Snap, adresse, notes optionnels) ou **création inline** depuis le sélecteur client d'une commande/vente sans quitter le formulaire.
- Fiche client : nom éditable inline, « Client depuis le … », 3 KPI (Commandes / À encaisser / Dernière), boutons d'action directe Appeler / WhatsApp / Snap (`tel:`, `wa.me`), notes, historique des 50 dernières commandes avec reste dû par commande.
- Édition par formulaire pré-rempli ; suppression avec confirmation + undo 5 s (shell), refus serveur si commandes actives liées, historique préservé (`SetNull` + snapshots de nom).
- Sélecteur partagé commande/vente (`CustomerField`) : combobox plein écran en Sheet, clients proposés avant toute frappe, ou « Client de passage, sans fiche » (nom libre, sans fiche créée).
- Recherche globale : palette de commandes → jusqu'à 6 clients → fiche.
- Ardoise dérivée à la volée (jamais stockée) : Σ lignes − Σ paiements sur commandes actives.

---

## 4. Audit par domaine

### 4.1 Commandes

**Rôle.** Suivi des commandes clients de la prise de commande à l'encaissement : statuts (PENDING/READY/DELIVERED/CANCELLED), acomptes et paiements journalisés (`PaymentTransaction`), livraison partielle par ligne, pont vers la vente comptable (« Finaliser ») et rattachement aux lots fournisseur. C'est le pivot financier de l'app : le dashboard (pipeline), l'écran Encaisser, la compta et la Trésorerie dérivent tous des commandes.

**Parcours implémentés.**

- Créer : onglet Commandes → bouton « Nouvelle » (en-tête, pas de FAB) → formulaire unique (client, picker parfums, chips volume, stepper qté, toggle Don, prix/DZD/taux, acompte cochable, livraison+notes repliées) → « Créer la commande » (server action) → redirection fiche. Acompte coché → statut READY immédiat.
- Fiche commande : header (avatar, nom éditable inline via PATCH REST, badge statut, dates) → contrôle statut 3 segments (réserve éventuelle → ConfirmDialog → PATCH REST) → tuiles Total/Payé/Dû → marge estimée → panneau « Acomptes & solde » → BatchPicker → notes → articles avec livraison par ligne → Modifier / Finaliser → Partager → Dupliquer → Supprimer.
- Encaisser un paiement : bouton Acompte ou Solde → sheet (montant pré-rempli au dû pour le solde, poche, méthode, note) → `recordPaymentAction` (server action) → `PaymentTransaction` + `CashMovement` + refresh cache + auto-READY éventuel → seul le panneau paiements se rafraîchit (fetch REST balance/payments), le reste de la fiche reste sur son état initial.
- Livrer partiellement : stepper par ligne → optimistic → PATCH fulfillment (clamp serveur, refusé si vente liée ou CANCELLED) → compteur « Livré x/y · reste N articles » → quand full : bouton « Tout est livré — marquer livrée » → PATCH status DELIVERED direct, sans dialogue de réserve.
- Finaliser : dû soldé → « Finaliser la vente » → écran Vendre en mode « Encaisser » (lignes et client pré-remplis, modifiables, lien retour vers la commande) → répartition par poche (`PocketSplit`) + reçu espèces/monnaie à rendre → ConfirmDialog « La commande passera en livrée » → POST `/api/admin/sales` → redirection compta.
- Modifier : bouton Modifier (masqué si DELIVERED/CANCELLED mais URL `/edit` accessible) → OrderForm pré-rempli → `updateOrderAction` : update scalaires + remplacement complet des lignes (deleteMany + createMany) → retour fiche.
- Annuler un paiement : bouton ↺ sur une ligne DEPOSIT/BALANCE → ConfirmDialog danger (« L'écriture d'origine est conservée : on ajoute un remboursement en face ») → `voidPaymentAction` : création REFUND + suppression du CashMovement d'origine + refresh cache.
- Supprimer : bouton fantôme (masqué si vente liée) → ConfirmDialog → retour liste immédiat + toast « Annuler » 5 s → DELETE REST différé → cascade OrderItem + PaymentTransaction.
- Annulation de commande : il n'existe plus de geste « annuler » — l'UI dit explicitement d'utiliser « Supprimer » ; le statut CANCELLED n'est atteignable par aucun écran actuel.
- Encaisser depuis le dashboard : écran Encaisser liste les créances des commandes READY/DELIVERED sans vente (avec les ventes à reste dû) → `collectAction` → `recordPaymentAction` type BALANCE.

**Données touchées.**

- `Order` : status, orderedAt/deliveryAt, customerId (FK SetNull) + customerName/customerContact (snapshots dénormalisés), notes, batchId (FK SetNull) ; `deliveredAt` est déclaré (« archivage 24h ») mais jamais écrit nulle part — champ et index (status,deliveredAt) morts.
- `Order.depositPaid` / `depositAmount` : caches dénormalisés dont la source de vérité déclarée est `PaymentTransaction` ; recalculés par `refreshOrderCache` (somme DEPOSIT − somme REFUND, tous types confondus) uniquement sur mutation de paiement, mais aussi écrits DIRECTEMENT depuis le body par la REST legacy (POST/PATCH) sans transaction de paiement — deux vérités concurrentes.
- `OrderItem` : quantity, deliveredQuantity (0..quantity, livraison partielle), volumeMl, unitPrice, unitCost (€ figé = unitCostDzd/exchangeRate arrondi à l'écriture), unitCostDzd, exchangeRate, isGift, note, perfumeSnapshot Json (hors-catalogue, non typé), perfumeId Int? SetNull ; cascade delete avec Order.
- `PaymentTransaction` : type DEPOSIT/BALANCE/REFUND, montant toujours positif (le sens est porté par le type), paidAt, method libre, note, recordedById ; cascade delete avec Order (les paiements disparaissent avec la commande) ; le REFUND n'est pas typé contre le paiement qu'il annule (seule la note le référence).
- `Sale` : orderId String? @unique SetNull — une vente au plus par commande ; à la finalisation ni le batchId ni les paiements de la commande ne sont recopiés ; remainingDue documenté « legacy » mais encore alimenté par POST `/api/admin/sales`.
- `CashMovement` (Trésorerie) : DEPOSIT_IN/BALANCE_IN/REFUND_OUT avec refType=PaymentTransaction créés par `recordPaymentAction`, SALE_IN avec refType=Sale à la vente ; solde des poches = groupBy sum brut, aucune déduplication entre les deux origines.
- `PerfumePricing` : mémoire de prix (perfumeId, volumeMl) → defaultUnitPriceEur/defaultUnitCostDzd, upsert avec `update:{}` — n'apprend que la première saisie, jamais mise à jour ensuite.
- `AuditLog` : order.create/update/cancel/delete, order.payment.record/void, order.fulfillment, batch.assign-orders — actorId renseigné par les routes REST (ctx.sub) mais null pour toutes les server actions.

**Bugs relevés** (audit sans champ de contre-vérification individuel ; la localisation vaut preuve, plusieurs constats sont recoupés par les audits contre-vérifiés des §4.2, §4.6, §4.7 et §5).

| Sévérité | Description | Fichier |
|---|---|---|
| haute | Double comptage en Trésorerie à la finalisation d'une commande : l'acompte et le solde ont déjà créé DEPOSIT_IN/BALANCE_IN, puis SellPageClient ne transmet jamais remainingDue ni ne déduit ces paiements, donc la route ventes enregistre SALE_IN pour la totalité du CA (cashed = totalRevenue − 0). Chaque « Finaliser la vente » compte le ticket deux fois dans les poches. *(Confirmé en §4.2.)* | `app/api/admin/sales/route.ts:388-421` (et `src/features/sell/components/SellPageClient.tsx:246-264`) |
| haute | L'acompte saisi à la création de commande crée la PaymentTransaction mais aucun CashMovement (pas de recordMovement, pas de choix de poche dans DepositSection) : cet argent n'apparaît dans aucune poche, contrairement au même acompte saisi ensuite via le panneau paiements. | `src/server/orders/actions.ts:86-96` |
| haute | Toute édition de commande remet la livraison à zéro : updateOrderAction remplace les lignes par deleteMany + createMany sans reporter deliveredQuantity (défaut 0). Corriger une note suffit à effacer l'avancement de livraison partielle ; même défaut sur le PATCH items REST (`route.ts:326-329`). | `src/server/orders/actions.ts:167-190` |
| haute | Contradiction de garde sur PENDING→READY sans acompte : le domaine l'autorise avec réserve (`order-status.ts:110-112`), l'UI fait confirmer le dialogue, puis l'API rejette en 400 (« Acompte reçu requis ») sur la base du cache depositPaid. Le cas « commande offerte à 0 € » qui a motivé le renversement documenté reste bloqué en bout de chaîne. | `app/api/admin/orders/[id]/route.ts:355-368` |
| haute | Les server actions d'écriture (createOrder, updateOrder, cancelOrder, duplicateOrder, recordPayment, voidPayment) ne vérifient ni JWT ni rôle : la middleware ne teste que la présence du cookie nurea_admin (`middleware.ts:21-29`), alors que la REST équivalente exige requireAdmin + requireEditor. Un cookie forgé quelconque suffit à écrire des paiements. *(Confirmé en §4.7.)* | `src/server/orders/paymentActions.ts:29` (et `actions.ts`) |
| haute | La page d'édition ne sélectionne pas isGift : une ligne « Don » revient avec isGift=false et prix 0, et la validation « Prix manquant » bloque l'enregistrement tant qu'on ne re-coche pas le don à la main. Éditer une commande contenant un cadeau est cassé par défaut. | `app/admin/ordres/[id]/edit/page.tsx:38-58` |
| moyenne | La tuile « Payé » de la fiche affiche depositPaid = DEPOSIT − REFUND, qui exclut les paiements BALANCE (`queries.ts:252`) : dès qu'un solde partiel est encaissé, Total ≠ Payé + Dû à l'écran. Le récap partagé au client reprend la même valeur fausse. | `src/features/orders/components/OrderSummaryCard.tsx:26` |
| moyenne | Annuler un paiement BALANCE ampute le cache d'acompte : refreshOrderCache calcule depositTotal = somme DEPOSIT − somme de TOUS les REFUND, sans distinguer ce que le refund annule. depositAmount devient faux (voire 0) alors que l'acompte est toujours là. | `src/server/orders/paymentActions.ts:16-27` |
| moyenne | La fiche ne se resynchronise pas après un paiement : OrderDetailClient fige la commande dans useState (`current`), et BalancePanel ne rafraîchit que son propre panneau. Après un acompte, les tuiles Payé/Dû, le badge statut (auto-READY) et l'apparition de « Finaliser la vente » restent périmés jusqu'à re-navigation. | `src/features/orders/components/OrderDetailClient.tsx:57` |
| moyenne | recordPaymentAction n'est pas transactionnel : création du paiement, refresh du cache, mouvement de Trésorerie et transition de statut sont 4 écritures séparées. Un échec au milieu laisse un paiement sans mouvement de poche ou un cache incohérent. | `src/server/orders/paymentActions.ts:52-103` |
| moyenne | « Tout est livré — marquer livrée » PATCHe DELIVERED directement sans passer par canTransition côté client : la réserve « Il reste X € à encaisser » qu'affiche OrderStatusControl pour la même transition est silencieusement sautée. | `src/features/orders/components/OrderDetailClient.tsx:82-99` |
| moyenne | Supprimer une commande (ou la purge éphémère) cascade-supprime ses PaymentTransaction sans contre-passer les CashMovement liés (aucun reverseMovementsFor) : la Trésorerie garde définitivement l'argent d'une commande disparue, avec des refId orphelins. | `app/api/admin/orders/[id]/route.ts:388-416` (et `src/lib/gestion/orderPurge.ts`) |
| moyenne | Un simple GET peut détruire des données : purgeOrderIfEphemeral supprime la commande CANCELLED ou livrée passée J+1 lors du GET REST par id — ouvrir `/admin/vendre?fromOrder=<vieille commande>` efface la commande et affiche « Commande introuvable ». | `app/api/admin/orders/[id]/route.ts:69-72` |
| moyenne | Deux définitions d'« en retard » : la liste compte deliveryAt < début du jour (`queries.ts:167-172`), le dashboard compte deliveryAt < maintenant − 24 h. Les deux compteurs divergent une partie de la journée. | `src/server/kpi/queries.ts:356-365` |
| basse | collectAction promet « montant plafonné au reste dû » mais la branche commande ne plafonne rien (recordPaymentAction non plus) : on peut encaisser plus que le dû et créer un solde négatif. | `src/server/collect/actions.ts:35-55` |
| basse | voidPaymentAction accepte d'annuler un REFUND (aucune garde sur le type) : cela crée un second REFUND du même montant qui double la déduction ; seule l'UI empêche le geste. | `src/server/orders/paymentActions.ts:131-150` |
| basse | L'image d'une ligne hors-catalogue est perdue sur la fiche : le mapping lit uniquement `it.perfume?.image` et ignore `perfumeSnapshot.image`, pourtant prévu par le schéma zod et affiché ailleurs (edit, vendre). | `src/server/orders/queries.ts:270` |
| basse | duplicateOrderAction caste volumeMl en 30\|50\|100 sans valider : une ligne historique à volume atypique fait échouer toute la duplication au parse zod, alors que la page edit normalise à 100 dans le même cas. | `src/server/orders/actions.ts:283` |

**Incohérences.**

- Deux piles d'écriture complètes et divergentes : server actions (`src/server/orders`, zod, hors-catalogue accepté, pas d'auth réelle) vs REST legacy (`app/api/admin/orders`, validation à la main, hors-catalogue interdit sur PATCH items, cache d'acompte écrit directement, requireEditor). La fiche mélange les deux : formulaire → actions, statut/nom/lot/suppression → REST.
- Statut CANCELLED zombie : `cancelOrderAction` existe sans aucun appelant, listOrders rend un groupe « Annulées », canTransition gère la réactivation d'une annulée (« elle va réapparaître dans le suivi ») — mais l'UI dit « Pour annuler, supprime », la REST refuse le statut CANCELLED (création et PATCH) et la purge legacy les efface. Trois philosophies contradictoires cohabitent.
- Le doc du domaine (`order-status.ts:20-22`) affirme que changer un statut « ne modifie aucune vente ni paiement » en citant la route REST, mais l'auto-transition de recordPaymentAction et la bascule DELIVERED de la création de vente écrivent le statut par d'autres chemins que celui documenté.
- Quatre implémentations du même calcul total/payé/dû : `computeBalance` (`domain/balance.ts`), sumLines+sumPayments (`orders/queries.ts`), sumPaid (`orders/financials.ts`) et le SQL brut du pipeline (`kpi/queries.ts:390-411`) — plus les recalculs client (OrderDetailClient, OrderForm, SellPage). Le commentaire du SQL (« hors REFUND ») contredit son propre code (REFUND soustrait).
- Trois définitions du « dû » : pipeline dashboard inclut les PENDING, Encaisser et compta ne comptent que READY/DELIVERED sans vente — le patron lit trois chiffres différents pour la même question.
- Route `/admin/ordres` alors que tout le vocabulaire (labels, tags de cache « commandes », docs) dit « Commandes » — « ordres » n'est pas le mot métier.
- Deux mécanismes d'annulation d'argent : void = suppression du mouvement de Trésorerie d'origine + REFUND comptable ; refund direct = mouvement REFUND_OUT. Le même concept produit deux traces différentes dans les poches.
- Audit à deux vitesses : les routes REST écrivent l'acteur (ctx.sub), toutes les server actions écrivent actorId=null — la moitié du journal ne dit pas qui a agi.
- `new/page.tsx` vérifie le JWT lui-même (cookies + verifyAdminToken), `edit/page.tsx` et les pages liste/fiche s'appuient sur la seule présence du cookie en middleware.
- OrdersListClient utilise useSearchParams sans `<Suspense>` dans OrdersPage, en contradiction avec la règle critique du projet (CLAUDE.md) appliquée ailleurs.
- OrdersGroup masque systématiquement le badge statut (hideStatus) alors que les groupes « En retard / Aujourd'hui / À venir » mélangent PENDING et READY : l'information de statut disparaît là où elle n'est pas redondante.
- À la finalisation, le batchId de la commande n'est pas propagé à la Sale et la commande garde son lot tout en étant exclue des agrégats (sale ≠ null) — le rattachement au lot doit être refait à la main sur la vente.
- voidPaymentAction : le commentaire dit « REFUND inverse + delete original » et enveloppe une seule écriture dans une transaction ; le code conserve l'original (ce que l'UI, elle, décrit correctement).

**Frictions UX.**

- Après enregistrement d'un paiement, l'écran ne reflète ni le nouveau Dû, ni le passage automatique « à traiter », ni l'apparition de « Finaliser la vente » : le toast annonce une chose que la fiche ne montre pas tant qu'on ne quitte pas la page.
- Confirmer « Passer à traiter » sans acompte affiche d'abord le dialogue de réserve, puis échoue en erreur 400 après confirmation — double friction et cul-de-sac sur le cas pourtant visé (commande offerte).
- Aucun avertissement que « Modifier » efface l'avancement de livraison partielle ; et la page `/edit` reste accessible par URL sur une commande livrée ou avec vente liée alors que le bouton est masqué (updateOrderAction n'a aucune garde).
- Ouvrir « Encaisser » depuis une vieille commande livrée déclenche sa suppression par la purge du GET et affiche « Commande introuvable » — perte de données vécue comme un bug aléatoire.
- Liste plafonnée à 200 sans pagination, sans recherche ni accès par client ; « Livrées » et « Annulées » s'accumulent indéfiniment côté nouvelle UI (l'archivage J+1 promis ne tourne plus).
- Le stock n'est décrémenté qu'à la création de la vente : livrer partiellement des flacons ne bouge pas l'inventaire, le catalogue ment entre la livraison et la finalisation.
- L'acompte à la création ne propose pas de poche de Trésorerie alors que le même geste sur la fiche le propose — deux parcours pour la même action avec des conséquences différentes (et invisibles).
- Annuler un paiement est irréversible et sans undo, alors que supprimer une commande entière bénéficie d'un filet « Annuler » de 5 s — la hiérarchie des protections est inversée.
- Le choix « créer une commande » vs « vendre directement » n'est jamais guidé : deux formulaires quasi identiques (mêmes pickers, mêmes champs) sans passerelle une fois engagé du mauvais côté.
- Le récap partagé au client annonce comme « payé » les seuls acomptes (depositPaid), pas les soldes partiels — un client ayant versé un solde partiel reçoit un récap faux.
- La transition liste→fiche→retour perd le filtre segmenté seulement si on revient par le tab bar ; le paramètre `?filter` est bien géré, mais aucun état de scroll n'est restauré sur une liste longue.

**Dette technique.**

- Pile REST legacy quasi morte mais active : GET liste + POST création + PATCH items n'ont plus d'appelant UI, mais restent exposés avec leurs règles périmées (cache d'acompte écrit à la main, hors-catalogue refusé, purge au GET). À ne pas reconduire — choisir UNE pile.
- Champs et code morts : `Order.deliveredAt` (+ index status,deliveredAt) jamais écrit, `cancelOrderAction` sans appelant, `orderListFilterSchema` (cursor/limit) jamais utilisé, `createSaleAction`/`updateSaleAction`/`deleteSaleAction` (server actions ventes) sans appelant alors que la route REST ventes fait autre chose (stock, Trésorerie).
- Caches dénormalisés depositPaid/depositAmount à double écriture (recalcul depuis PaymentTransaction vs body REST) : la refonte doit soit les supprimer, soit les recalculer en un seul endroit transactionnel.
- PerfumePricing avec upsert `update:{}` : la « mémoire de prix » ne s'actualise jamais après la première saisie — rustine qui fige les prix de 2024.
- REFUND non lié au paiement annulé (référence en texte libre dans note) : impossible de recalculer proprement « acomptes nets » vs « soldes nets », d'où les bugs de cache et d'affichage.
- perfumeSnapshot Json non typé, parsé à la main à quatre endroits avec des fallbacks divergents (« Hors catalogue » vs « — » vs « Sans nom »).
- Commentaires périmés qui contredisent le code (voidPaymentAction « delete original », SQL pipeline « hors REFUND », collectAction « plafonné au reste dû », commentaire createOrderAction « clamp deposit » sans clamp) — dangereux comme matière première de refonte.
- Deux systèmes d'invalidation de cache coexistent (revalidateTag/tagFor manuels côté actions, revalidateAdminData côté REST) ; cancelOrderAction n'invalide aucun tag du tout.
- writeAudit best-effort silencieux et hors transaction ; erreurs serveur renvoyées brutes au client (e.message Prisma) côté server actions.
- Purge « éphémère » déclenchée par des lectures (GET) : effet de bord destructeur dans un handler idempotent par contrat HTTP.
- OrderDetailClient : état dupliqué (current, fulfillment) jamais resynchronisé avec les props RSC après revalidation — pattern à proscrire dans la refonte au profit d'un état serveur unique.

**À préserver.**

- Le domaine pur `src/domain/order-status.ts` + `balance.ts` : machine à états « on n'interdit que ce qui casse les données, tout le reste se confirme », réserves textuelles produites par le domaine (jamais copiées dans l'UI), exhaustivité TypeScript (never), et tests vitest qui documentent le renversement de philosophie. À garder tel quel.
- L'auto-transition qui refuse d'avaler une réserve : recordPaymentAction ne passe PENDING→READY que sur un feu vert SANS réserve (guard.ok && !guard.confirm), avec un commentaire qui explique pourquoi — un invariant subtil et correct.
- `PaymentTransaction` comme journal append-only : montants toujours positifs, sens porté par le type, annulation par contre-écriture plutôt que suppression — le bon modèle comptable, à conserver (en le reliant au paiement annulé).
- Clamp serveur systématique de la livraison partielle (« jamais confiance au client »), refus si vente liée ou annulée, et deriveFulfillment/remainingToDeliver dérivés plutôt que stockés.
- Perf réfléchie et mesurée : agrégats SQL en une passe (COUNT FILTER), react cache + unstable_cache taggés avec revalidate court, revalidateAdminData centralisé par domaine métier avec justification écrite (« les mêmes euros, agrégés ailleurs »).
- UX mobile solide : hitbox 44 px partout (stepper, boutons void), optimistic update + rollback sur la livraison, undo 5 s sur suppression, montant du solde pré-rempli au dû, mémoire du dernier taux de change, empty states différenciés par filtre, action « Nouvelle » dans l'en-tête avec la justification anti-FAB documentée.
- Choix d'affichage intelligents et commentés : « À encaisser » mis en avant plutôt que le total redondant, ambre = argent attendu / vert = fait / bordeaux = travail (OrderStatusBadge), pas de « Pas de date » sur chaque ligne — chaque décision porte son pourquoi en commentaire.
- Vocabulaire des chiffres respecté (Encaissé / À encaisser / Marge nette) et groupes de liste orientés action (En retard / Aujourd'hui / À traiter) plutôt que par statut technique.
- Hors-catalogue (perfumeSnapshot) et don (isGift) intégrés de bout en bout du formulaire à la vente ; pré-remplissage prix/coût par (parfum, volume) via PerfumePricing.
- La séparation compta anti-double-comptage : confirmedOrdersFinancials exclut explicitement les commandes déjà transformées en vente (sale: null), Encaissé plafonné au total — le principe est le bon, il ne manque que son équivalent côté Trésorerie.
- L'unicité `Sale.orderId @unique` en base : l'invariant « une vente au plus par commande » est garanti par le schéma, pas seulement par l'application.

---

### 4.2 Vendre / Encaisser

**Rôle.** Le domaine couvre la caisse terrain : créer un ticket de vente multi-lignes (catalogue ou saisie libre, coût en DZD converti en euros, marge calculée en direct), soit en vente directe, soit pour solder une commande existante (`?fromOrder`). Il porte aussi l'écran « À encaisser » qui unifie les créances des deux modèles de dette (`Sale.remainingDue` pour les ventes, `PaymentTransaction` pour les commandes) et génère les mouvements de Trésorerie correspondants. C'est le point d'entrée principal de l'argent dans l'app : stock, compta et Trésorerie en dépendent.

**Parcours implémentés.**

- Vente directe : onglet Vendre (accentué dans la tab bar) → état vide « Choisir un parfum » → sheet picker, onglets Catalogue / Saisie libre → ligne ajoutée préremplie via pricing → ajustements volume/qté/prix/coût/don → cartes Total+Marge, Reçu espèces, Encaissement par poche → CTA sticky « Enregistrer la vente » → POST `/api/admin/sales` → toast succès → redirection `/admin/compta`.
- Don : toggle cadeau sur la ligne → prix verrouillé à 0 et « Offert » affiché ; la validation n'exige un prix > 0 que pour les lignes non-don.
- Solde de commande : fiche commande (bouton « Finaliser la vente » visible seulement si READY + dû ≤ 0,01 € + pas de vente) → `/admin/vendre?fromOrder=<id>` → fetch GET `/api/admin/orders/[id]`, écran renommé « Encaisser » avec carte lien vers la commande → mêmes lignes éditables → ConfirmDialog « La commande passera en livrée » → même POST avec orderId → Sale créée + Order.status=DELIVERED (transaction).
- Encaisser une créance : Accueil (MoneyBlock) ou Compta (KPI « À encaisser ») → `/admin/encaisser` → chaque ligne porte son bouton-montant → CollectSheet (montant prérempli, poche) → `collectAction` : vente = décrément remainingDue + BALANCE_IN ; commande = recordPaymentAction BALANCE → toast + router.refresh.
- Consulter une créance : tap sur le nom → commande : `/admin/ordres/[id]` ; vente : `/admin/compta?sale=<id>` (ouvre le ticket en compta).
- Corriger/solder depuis le ticket compta (chemin parallèle hérité) : TicketSheet édite remainingDue à la main → PATCH `/api/admin/sales/[id]` → si baisse, BALANCE_IN enregistré vers « Non attribué » (jamais de choix de poche).
- Annuler une vente : DELETE `/api/admin/sales/[id]` → suppression cascade des items, contre-passation des mouvements, restitution du stock ; la commande liée reste DELIVERED.

**Données touchées.**

- `Sale` : totaux dénormalisés figés (totalRevenue/totalCost/totalMargin), remainingDue (documenté « legacy » mais toujours écrit par POST, PATCH et collectAction), customerName/customerContact en snapshot, customerId nullable, orderId @unique, batchId attaché a posteriori (PATCH), notes.
- `SaleItem` : perfumeSnapshot Json obligatoire (name/brandName/image/volumeMl) + perfumeId SetNull → l'historique survit à la suppression du parfum ; isGift, unitCostDzd + exchangeRate (sources), unitCost dérivé, lineRevenue/lineCost/lineMargin figés.
- `Perfume.stock` : décrémenté uniquement dans POST `/api/admin/sales` (transaction), incrémenté uniquement dans DELETE ; jamais ajusté par PATCH ; aucun plancher à 0.
- `PerfumePricing` (@@id perfumeId+volumeMl) : defaultUnitPriceEur, defaultUnitCostDzd, defaultExchangeRate — lu par l'écran Vendre, écrit uniquement depuis le Catalogue.
- `CashMovement` : SALE_IN à la création de vente (répartition + reliquat), BALANCE_IN aux encaissements, refType/refId=Sale pour réversibilité (reverseMovementsFor au DELETE) ; Pocket système « Non attribué » (kind UNASSIGNED) créée à la demande.
- `Order` : payé via PaymentTransaction (DEPOSIT/BALANCE/REFUND) avec cache dénormalisé depositPaid/depositAmount ; statut → DELIVERED à la finalisation en vente ; sale:null sert de filtre anti-double-comptage en compta et à Encaisser.
- `Batch` : Sale.batchId regroupe les ventes d'un lot pour la Marge nette après BatchExpense ; utilisé par le groupement compta (batchGroups avant customerGroups).
- `AuditLog` : sale.create / sale.update / sale.delete / sale.collect avec meta (montants, itemCount, orderId).

**Bugs confirmés** (tous contre-vérifiés `confirmed: true`).

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| haute | Double comptage en Trésorerie à la finalisation d'une commande : les acomptes/soldes ont déjà créé des DEPOSIT_IN/BALANCE_IN (`paymentActions.ts:68`), et la vente créée réenregistre 100 % du CA en SALE_IN car SellPageClient n'envoie jamais remainingDue (donc cashed = total). Les poches sont créditées deux fois du même argent. | `app/api/admin/sales/route.ts:388` | `SellPageClient.tsx:248-264` n'envoie pas remainingDue → `route.ts:299-302` le met à 0 → cashed=total (`route.ts:388`) enregistré en SALE_IN, alors que `paymentActions.ts:68-76` a déjà créé DEPOSIT_IN/BALANCE_IN jamais contre-passés : même argent crédité deux fois. |
| haute | Le bridge fromOrder perd les coûts : serializeOrder n'expose ni unitCostDzd, ni exchangeRate, ni isGift, ni perfumeSnapshot alors que SellPageClient les attend (`SellPageClient.tsx:42-51`). Résultat : coût DZD vide, taux retombé à 277, lineCost=0 → marge de la vente finalisée surestimée à ~100 % sauf ressaisie manuelle. | `src/lib/gestion/orderJson.ts:62` | `orderJson.ts:62-73` n'expose ni unitCostDzd, ni exchangeRate, ni isGift, ni perfumeSnapshot (champs présents sur OrderItem, `schema.prisma:232-238`) et `SellPageClient.tsx:129-130` retombe sur '' et '277' → unitCostDzd envoyé '0' (`SellPageClient.tsx:260`) → lineCost=0, marge ~100 %. |
| haute | Vente issue d'une commande jamais rattachée au Customer : serializeOrder n'envoie pas customerId et SellPageClient ne copie que customerName → Sale.customerId reste null, l'historique de la fiche client ignore toutes les commandes finalisées. | `src/features/sell/components/SellPageClient.tsx:110` | `orderJson.ts:48-77` n'émet pas customerId (Order.customerId existe, `schema.prisma:181`) et `SellPageClient.tsx:110` ne copie que customerName ; le POST (`route.ts:286-296`) ne lit que body.customerId → Sale.customerId reste null. |
| haute | collectAction est un server action sans aucune authentification ni contrôle de rôle (pas de verifyAdminToken ; le middleware ne vérifie que la présence du cookie, `middleware.ts:14-26`). Un VIEWER — ou un cookie forgé — peut encaisser et muter la Trésorerie, alors que les routes API équivalentes exigent requireAdmin+requireEditor. | `src/server/collect/actions.ts:38` | `src/server/collect/actions.ts:38-113` n'importe ni requireAdmin/verifyAdminToken ni contrôle de rôle, et `middleware.ts:21-29` ne vérifie que la présence du cookie (commentaire l.26 : le JWT strict est « côté API ») — contrairement à `app/api/admin/sales/route.ts:92-95`. |
| moyenne | PATCH ticket ne réajuste jamais le stock : changer une quantité, ajouter (newItems) ou retirer (removeItemIds) des lignes laisse Perfume.stock au niveau du ticket d'origine ; seule la suppression complète restitue. | `app/api/admin/sales/[id]/route.ts:244` | Dans PATCH (`app/api/admin/sales/[id]/route.ts:214-392`) aucune écriture sur Perfume.stock pour items/newItems/removeItemIds ; seul DELETE (l.463-470) restitue le stock. |
| moyenne | DELETE d'une vente liée à une commande ne repasse pas l'Order en READY (contrairement au code mort deleteSaleAction, `src/server/sales/actions.ts:315`) : la commande reste DELIVERED sans vente et resurgit dans compta/Encaisser avec un dû recalculé. | `app/api/admin/sales/[id]/route.ts:460` | DELETE (`app/api/admin/sales/[id]/route.ts:460-470`) supprime la vente sans toucher Order.status, alors que deleteSaleAction (`src/server/sales/actions.ts:315-320`, aucun appelant trouvé) rebascule en READY ; `collect/queries.ts:66` refait apparaître l'ordre DELIVERED sale:null avec dû>0. |
| moyenne | Ligne don d'une commande infinalisable : isGift absent du JSON de GET `/api/admin/orders/[id]` → la ligne arrive avec unitPrice "0.00" sans isGift, et submit() bloque sur « Prix manquant » tant qu'on ne re-toggle pas le don à la main. | `src/features/sell/components/SellPageClient.tsx:230` | serializeOrder (`orderJson.ts:62-73`) omet isGift (existant sur OrderItem, `schema.prisma:232`) → la ligne bridge arrive isGift undefined avec unitPrice '0.00', et submit() bloque sur !l.isGift && prix<=0 (`SellPageClient.tsx:230-232`). |
| moyenne | Impossible d'enregistrer une vente directe partiellement payée : l'écran Vendre n'a aucun champ « reste à payer » et le POST reçoit remainingDue=0 par défaut → toute vente à crédit crédite la Trésorerie du total, à corriger après coup dans le ticket. | `src/features/sell/components/SellPageClient.tsx:246` | L'écran Vendre n'a aucun champ reste-à-payer et le payload (`SellPageClient.tsx:248-264`) omet remainingDue → `route.ts:300-302` le fixe à 0 et `route.ts:388-420` crédite la Trésorerie du total. |
| moyenne | PocketSplit sans plafond : répartir plus que le total du ticket enregistre tous les splits en SALE_IN (attributed > cashed, remainder négatif simplement ignoré) → Trésorerie créditée au-delà de la vente ; le client masque le dépassement (Math.max(0,...), `PocketSplit.tsx:27`). | `app/api/admin/sales/route.ts:390` | `route.ts:390-405` enregistre chaque split en SALE_IN sans plafonner attributed à cashed (remainder négatif ignoré, l.408-409), et `PocketSplit.tsx:27` masque le dépassement via Math.max(0,…). |
| moyenne | collectAction (branche vente) n'est pas transactionnel : sale.update puis recordMovement séparés — un échec du mouvement laisse la dette réduite sans argent tracé en Trésorerie, exactement le défaut que ce module dit corriger. | `src/server/collect/actions.ts:78` | `collect/actions.ts:78-90` : sale.update puis recordMovement sont deux appels séparés hors $transaction — un échec du second laisse remainingDue réduit sans mouvement. |
| moyenne | `?fromOrder` ne vérifie ni statut ni solde côté serveur (seulement l'absence de vente liée, `route.ts:256-269`) : par URL directe on finalise une commande PENDING/impayée → sa dette disparaît (l'ordre sort de « À encaisser » car il a une vente, et la vente naît remainingDue=0). | `app/api/admin/sales/route.ts:256` | `route.ts:256-272` ne vérifie que l'existence de la commande et l'absence de vente (ni statut ni solde), la vente naît remainingDue=0 (l.299-302) et l'ordre sort de listOutstanding qui filtre sale:null (`collect/queries.ts:66`). |
| basse | Remonter remainingDue via PATCH (correction d'un encaissement saisi à tort) ne contre-passe rien : le mouvement BALANCE_IN n'est créé que si le dû baisse → Trésorerie définitivement surévaluée. | `app/api/admin/sales/[id]/route.ts:408` | `app/api/admin/sales/[id]/route.ts:408-421` : mouvement BALANCE_IN créé seulement si collected=before−after > 0.005 ; une hausse du dû ne contre-passe rien. |
| basse | Stock décrémenté sans plancher ni avertissement : on peut vendre à stock 0, le champ devient négatif silencieusement. | `app/api/admin/sales/route.ts:375` | `route.ts:375-381` décrémente stock sans contrôle ni plancher (Perfume.stock Int sans contrainte, `schema.prisma:77`) — le champ devient négatif silencieusement. |
| basse | collectAction branche commande renvoie due:"0.00" en dur même pour un paiement partiel ; le montant est de plus transmis sans plafonnement serveur au dû (recordPaymentAction accepte tout), seule la sheet borne côté client. | `src/server/collect/actions.ts:55` | `collect/actions.ts:55` renvoie due:'0.00' en dur pour la branche commande, et recordPaymentAction (`paymentActions.ts:38-50`) n'impose que amount>0 sans plafond au dû. |
| basse | Décocher « don » laisse unitPrice à "0" (le patch ne restaure pas l'ancien prix) → soumission bloquée « Prix manquant » jusqu'à ressaisie. | `src/features/sell/components/SellLineRow.tsx:98` | `SellLineRow.tsx:98` : décocher envoie { isGift: false } sans restaurer unitPrice (mis à '0' au toggle on) → submit bloqué « Prix manquant » (`SellPageClient.tsx:230-232`). |

**Incohérences.**

- Deux logiques complètes de création/édition/suppression de vente coexistent : les routes API (stock, Trésorerie, isGift, remainingDue) et les server actions de `src/server/sales/actions.ts` (aucun stock, aucune Trésorerie, pas d'isGift, pas d'auth) — ces dernières ne sont importées nulle part.
- Trois implémentations de la conversion coût DZD→EUR : resolveUnitCostEur (POST, partagé), recalcul ad hoc dans PATCH [id] (`app/api/admin/sales/[id]/route.ts:276-282`), et computeLine du code mort — avec des règles de fallback différentes.
- « Encaisser » désigne deux choses : le titre de l'écran Vendre en mode fromOrder (`SellPageClient.tsx:289`) et l'écran `/admin/encaisser` des créances ; `docs/admin/PRODUCT.md` n'inscrit d'ailleurs pas `/admin/encaisser` dans sa table des onglets.
- `/admin/encaisser` surligne l'onglet Compta (`navigation.ts:62-64`) mais son bouton retour mène à l'Accueil (`navigation.ts:104`) : deux ancrages contradictoires pour le même écran.
- `Sale.remainingDue` est documenté « legacy, remplacé fonctionnellement par PaymentTransaction en P6 » (`schema.prisma:292-295`) alors qu'il est le mécanisme actif et exclusif de la dette des ventes — la doc du schéma ment à la refonte.
- Le plafonnement de l'encaissement au reste dû est appliqué côté serveur pour les ventes (`collect/actions.ts:68`) mais pas pour les commandes (recordPaymentAction ne borne rien).
- Deux chemins pour solder une vente aux comportements différents : CollectSheet (choix de poche obligatoire de fait) vs TicketSheet compta via PATCH (toujours « Non attribué », sans question).
- Deux définitions de la période « week » : 7 jours glissants (`src/server/sales/queries.ts:114-121`) vs semaine calendaire commençant lundi (`src/lib/gestion/calculations.ts:65-76`).
- Deux définitions du CA : `/api/admin/sales/stats` agrège le facturé (totalRevenue), la compta et le dashboard parlent en Encaissé (totalRevenue − remainingDue).
- Deux bibliothèques décimales mélangées : decimal.js-light (queries, collect, actions) et Prisma.Decimal (calculations, routes API).

**Frictions UX.**

- La répartition par poches repart de zéro à chaque vente (aucune poche par défaut) : sans geste supplémentaire, tout l'Encaissé tombe dans « Non attribué » et devra être re-ventilé depuis la Trésorerie.
- Vendre à crédit est un parcours en deux temps non guidé : enregistrer la vente « payée », puis retrouver le ticket en compta et corriger le reste dû à la main.
- Après enregistrement, redirection générique vers `/admin/compta` au lieu du ticket créé ; le toast de succès part au moment du push et se voit à peine.
- Aucune information de stock dans le picker ni sur la ligne : on vend un parfum en rupture sans aucun signal.
- Si PerfumePricing n'existe pas pour le volume choisi, le prix reste vide en silence — pas d'invite à créer le tarif ni de rappel du dernier prix pratiqué.
- En mode fromOrder, l'utilisateur doit ressaisir le coût DZD de chaque ligne (perdu par l'API) sans en être averti : l'écran affiche une marge fausse mais plausible.
- L'écran À encaisser ne distingue pas visuellement ventes et commandes (juste un mot en sous-titre) et n'affiche total/déjà payé que dans la sheet, pas dans la liste.
- Le bouton « La moitié » de CollectSheet divise sans arrondi métier : montants à centimes arbitraires à encaisser en espèces.

**Dette technique.**

- `src/server/sales/actions.ts` en entier : createSaleAction/updateSaleAction/deleteSaleAction + _computeSaleTotals, code mort jamais importé, sans auth, porteur d'une logique divergente (pas de stock, pas de Trésorerie) — à ne pas reconduire.
- `Sale.remainingDue` « legacy » devenu pilier actif : la refonte doit choisir un seul modèle de dette (PaymentTransaction généralisé ou remainingDue assumé), pas les deux.
- ComptaListResult.groups conservé @deprecated pour back-compat (`src/server/sales/queries.ts:89-90`), period « conservé pour back-compat » également.
- Contrats API dupliqués à la main côté client (type FromOrder dans SellPageClient vs serializeOrder) sans source partagée : la dérive a déjà eu lieu (unitCostDzd/exchangeRate/isGift/customerId absents) et rien ne la détecte.
- Validation du POST `/api/admin/sales` entièrement manuelle (~200 lignes de Number/isFinite/erreurs 400) alors que des schémas zod existent (`src/schemas/sale.ts`) — mais ne servent que le code mort.
- Trésorerie et audit écrits hors transaction après la création de la vente (`route.ts:387-428`) : une panne à mi-chemin laisse une vente sans mouvements, indétectable.
- pickerCache au niveau module jamais invalidé (`PerfumePicker.tsx:16`) : un parfum créé pendant la session PWA n'apparaît pas dans le picker avant rechargement complet.
- Taux de change par défaut « 277 » codé en dur à trois endroits (`SellPageClient.tsx:130`, `useLastExchangeRate.ts:6`, placeholder SellLineRow) alors que le modèle AppSetting est prévu pour ça.
- L'auth des server actions repose implicitement sur le middleware (présence du cookie seulement) : toute refonte doit centraliser verifyAdminToken + rôle dans une garde unique partagée routes/actions.

**À préserver.**

- Snapshots SaleItem systématiques (nom/marque/image/volume) avec perfumeId SetNull : l'historique de vente survit à la suppression du parfum ; le parseur toSnap tolère les Json malformés avec fallback (`queries.ts:376-401`).
- Totaux et marges toujours recalculés côté serveur en Decimal — aucune confiance dans les montants envoyés par le client, aucun float.
- L'écran À encaisser est une vraie réussite de conception : unification des deux modèles de dette en une action unique, montant prérempli au dû, plafonné serveur, poche auto-sélectionnée s'il n'y en a qu'une, créances anciennes en tête et signalées — et les commentaires d'intention (`collect/queries.ts:5-15`) documentent le pourquoi.
- Principe de conservation en Trésorerie : tout Encaissé est tracé, le non-réparti tombe dans la poche système « Non attribué » au lieu de disparaître ; mouvements liés par refType/refId et contre-passés à la suppression de la source.
- Pas de double comptage du CA en compta : les commandes finalisées (sale != null) sont exclues des financiers commandes (`financials.ts:76-84`) — l'invariant est le bon, seul le volet Trésorerie du bridge le viole.
- PerfumePricing par (parfum, volume) avec refetch au changement de volume : la saisie d'une ligne descend à deux ou trois taps sur le terrain.
- La saisie libre du picker attaque la racine des doublons : normalisation orthographique, rattachement aux marques existantes, détection « déjà au catalogue » avec bascule en un tap — à garder tel quel.
- Invariants d'affichage éprouvés : `/admin/vendre` et `/admin/encaisser` couverts par `e2e/layout-invariants.spec.ts` à 320/375/430 px ; useSearchParams correctement isolé sous Suspense (`SellPage.tsx:6`).
- Vocabulaire des chiffres tenu (Encaissé / À encaisser / Marge nette) sur les écrans du domaine, et revalidation de cache fine par tags (sales, kpi, treasury, perfumes, batches).
- Micro-UX terrain pertinente : calculatrice de rendu monnaie, mémorisation du dernier taux de change, exclusion des parfums déjà au ticket, CTA sticky au pouce, état vide qui remplace le bouton désactivé.

---

### 4.3 Compta / Trésorerie

**Rôle.** Suivi financier cash-basis du business : l'écran `/admin/compta` expose deux vues — « Ventes » (ventes groupées par lot puis par client, KPIs Encaissé / Marge nette / À encaisser, ticket éditable) et « Trésorerie » (poches d'argent, journal de mouvements CashMovement, transferts et ajustements). Le module alimente aussi le tableau de bord (MoneyBlock, alertes) et l'écran d'encaissement des créances (`/admin/encaisser`).

**Parcours implémentés.**

- Consulter la compta : onglet Compta → skeleton aux proportions exactes → tuiles KPI + sections → tap sur un groupe pour déplier → tap sur une vente → TicketSheet en mode view (totaux Vendu/Coût/Marge, état de paiement, lignes) → « Modifier » passe en mode edit → « Enregistrer » PATCH puis refetch de la liste.
- Encaisser une créance : bandeau « À encaisser » (compta ou dashboard) → `/admin/encaisser` (listOutstanding : ventes remainingDue>0 + commandes READY/DELIVERED non soldées, plus anciennes d'abord) → CollectSheet choisit montant + poche → collectAction plafonne au dû, décrémente remainingDue ou crée un BALANCE (commande), enregistre BALANCE_IN.
- Basculer en Trésorerie : segmented control ou deep link `?vue=tresorerie` → total, alerte non attribué → « Répartir » (transfert système → poche réelle), « Transfert », « Ajuster » (montant signé + raison), « Paiement fournisseur » (SUPPLIER_OUT, note libre) — chaque action ferme le sheet, toast, router.refresh().
- Vente directe (Vendre) : lignes + « Encaissement par poche » (PocketSplit pré-remplit le reste) → POST `/api/admin/sales` → transaction (vente + items + décrément stock + commande → DELIVERED si bridge) puis mouvements SALE_IN hors transaction ; reliquat non réparti → « Non attribué » ; redirection vers `/admin/compta`.
- Paiement partiel après coup : ouvrir le ticket → Modifier → champ « Restera à encaisser » (saisir le nouveau reste dû) → PATCH crée un BALANCE_IN du delta vers « Non attribué » (sans choix de poche) — la vue Trésorerie doit ensuite servir à répartir.
- Dépense de lot : `/admin/lots/[id]` → ajouter dépense (libellé, montant, poche optionnelle) → POST crée BatchExpense + EXPENSE_OUT ; poubelle → DELETE + reverseMovementsFor.
- Reprise d'historique : bouton « Importer l'historique » en bas de la vue Trésorerie → backfillTreasuryAction crée les mouvements manquants dans « Non attribué » → toast avec le nombre importé.
- Supprimer une vente : ticket → Supprimer → ConfirmDialog → DELETE : vente supprimée, mouvements Sale:<id> supprimés, stock restitué.

**Données touchées.**

- `Pocket` : kind CASH/BANK/SUPPLIER/OTHER/UNASSIGNED, openingBalance (point de départ, jamais mouvementé), isSystem (poche « Non attribué » unique par convention, sans contrainte DB), archived, sortOrder ; solde jamais stocké = openingBalance + Σ mouvements (`treasury/queries.ts:46-90`).
- `CashMovement` : amount signé (+entrée/−sortie via signedAmount), kind à 9 valeurs (OPENING jamais émis), refType/refId lien souple vers Sale / PaymentTransaction / BatchExpense / Batch pour la réversibilité (deleteMany), transferGroupId appariant les 2 lignes d'un transfert, occurredAt rétrodatable (soldAt des ventes).
- `Sale` : totalRevenue/totalCost/totalMargin dénormalisés depuis SaleItem (recalculés à chaque PATCH d'items), remainingDue champ « legacy » (`schema.prisma:292-295`) resté le pivot de tout le reste-dû vente ; orderId unique (1 vente max par commande), batchId pour le groupement par lot.
- `SaleItem` : lineRevenue/lineCost/lineMargin snapshotés, unitCostDzd + exchangeRate (coût saisi en dinars converti en €), perfumeSnapshot JSON pour les lignes hors catalogue, isGift.
- `PaymentTransaction` (DEPOSIT/BALANCE/REFUND, montants positifs) : source de vérité du payé des commandes ; Order.depositPaid/depositAmount = cache dénormalisé recalculé par refreshOrderCache après chaque paiement.
- `BatchExpense` : amount toujours positif, countInCompta déclaré au schéma (dépense hors business non déduite, sans mouvement) mais jamais lu ni écrit par le code — champ mort.
- Caches Next : unstable_cache « kpi-revenue-summary-cash-v4 » (60 s, tags kpi/sales/batches/orders) et « kpi-pipeline-counts » (30 s) ; le tag admin:treasury est revalidé en 8 endroits mais n'est attaché à aucun cache (treasurySummary est uncached, react.cache par rendu seulement).

**Bugs relevés** (audit sans champ de contre-vérification individuel ; la localisation vaut preuve ; le double comptage est prouvé en §4.2).

| Sévérité | Description | Fichier |
|---|---|---|
| haute | Double comptage en Trésorerie quand une commande est finalisée en vente : les DEPOSIT_IN des acomptes restent (jamais contre-passés) et Vendre n'envoie pas remainingDue, donc la vente crée un SALE_IN du total complet. Un acompte de 50 € devient 50 € comptés deux fois dans les poches. *(Confirmé en §4.2.)* | `app/api/admin/sales/route.ts:387-421` |
| haute | TicketSheet : les lignes ajoutées ou supprimées en mode édition ne sont jamais persistées — saveAll ne construit ni newItems ni removeItemIds (filtre `key.startsWith("id:")`) alors que l'API PATCH les supporte. La ligne ajoutée disparaît à l'enregistrement, la ligne supprimée réapparaît, sans aucune erreur. | `src/features/compta/components/TicketSheet.tsx:139-148` |
| haute | Augmenter le reste dû d'une vente (corriger un encaissement saisi à tort) ne contre-passe rien : seul `collected > 0` crée un mouvement, le cas négatif est ignoré. La Trésorerie garde définitivement l'argent d'un encaissement annulé. | `app/api/admin/sales/[id]/route.ts:408-422` |
| haute | cancelOrderAction passe la commande en CANCELLED sans toucher ni aux PaymentTransaction ni à leurs mouvements : les DEPOSIT_IN restent en Trésorerie alors que la commande sort du périmètre Encaissé (READY/DELIVERED). Trésorerie et compta divergent silencieusement à chaque annulation après acompte. | `src/server/orders/actions.ts:224-237` |
| moyenne | Éditer les lignes d'une vente recalcule totalRevenue (donc l'Encaissé implicite totalRevenue − remainingDue) sans ajuster les mouvements SALE_IN existants. Passer une vente payée de 100 € à 130 € augmente l'Encaissé de 30 € que la Trésorerie n'a jamais vus. | `app/api/admin/sales/[id]/route.ts:370-390` |
| moyenne | POST `/api/admin/sales` ne valide pas Σ(payments) ≤ Encaissé : une répartition PocketSplit excédentaire crée des SALE_IN au-delà du réel (le reliquat négatif est simplement ignoré, PocketSplit ne bloque pas non plus la sur-saisie). | `app/api/admin/sales/route.ts:390-420` |
| moyenne | assignUnattributedAction et transferAction ne plafonnent pas au solde disponible : on peut répartir plus que le « Non attribué », qui devient négatif — et l'alerte disparaît (condition > 0.005), masquant l'erreur. | `src/server/treasury/actions.ts:108-126` |
| moyenne | backfillTreasuryAction saute toute vente ayant déjà UN mouvement quelconque (dédup par refType:refId) : une vieille vente partiellement encaissée ensuite via collectAction (qui crée un BALANCE_IN) ne verra jamais son Encaissé initial importé. | `src/server/treasury/actions.ts:177-202` |
| moyenne | Le journal est tronqué aux 30 derniers mouvements (limit:30, aucune pagination) mais MovementsByMonth affiche un « net » mensuel calculé sur ce sous-ensemble : dès 31 mouvements, le total du mois affiché est faux sans indication. | `src/features/compta/pages/ComptaPage.tsx:49` |
| moyenne | ensureUnassignedPocket fait findFirst puis create sans contrainte unique en base : deux requêtes concurrentes peuvent créer deux poches système ; treasurySummary écrase alors `unattributed` avec la dernière rencontrée (`queries.ts:73`), l'alerte ne montre qu'une partie. | `src/server/treasury/movements.ts:32-48` |
| moyenne | BatchExpense.countInCompta n'est lu nulle part : une dépense marquée « hors business » serait quand même déduite de la marge (`kpi/queries.ts:59`, `sales/queries.ts:285`) et importée en EXPENSE_OUT par le backfill — le contrat du schéma (ligne 339-341) n'est pas honoré. | `prisma/schema.prisma:341` |
| moyenne | La recherche disparaît quand elle réussit : le champ n'est monté qu'au-delà de 6 groupes, or une requête qui réduit les résultats sous ce seuil démonte le SearchField avec la saisie dedans — plus aucun moyen dans l'UI d'effacer le filtre actif. | `src/features/compta/components/ComptaListClient.tsx:134` |
| basse | Pendant une recherche `?q=`, le summary mélange ventes filtrées et commandes/dépenses NON filtrées (confirmedOrdersFinancials et batchExpense.aggregate ignorent q) : les tuiles Encaissé/Marge affichent un hybride sans sens. | `src/server/sales/queries.ts:285-301` |
| basse | voidPaymentAction annonce « REFUND inverse + delete original » mais ne supprime jamais le paiement d'origine ; un backfill ultérieur recrée alors DEPOSIT_IN + REFUND_OUT fantômes pour un paiement annulé (net nul mais journal pollué). | `src/server/orders/paymentActions.ts:138-153` |
| basse | Les mouvements sont créés hors transaction Prisma, après le commit de la vente : un échec entre les deux laisse une vente encaissée sans aucune trace en Trésorerie, sans erreur visible côté client. | `app/api/admin/sales/route.ts:316-421` |
| basse | Création et suppression de vente ne revalident ni tagFor.kpi() ni tagFor.sales() : l'Encaissé du tableau de bord (cache 60 s) reste périmé après la vente, alors que collectAction, lui, revalide tout. | `app/api/admin/sales/route.ts:430-432` |
| basse | treasurySummary exclut les poches archivées de la liste et du total mais leurs mouvements subsistent : archiver une poche non vide ferait disparaître son argent du total sans transfert (latent : l'archivage n'a pas d'UI aujourd'hui). | `src/server/treasury/queries.ts:48-83` |

**Incohérences.**

- Trois périmètres pour le « dû » : compta/dashboard = remainingDue ventes + commandes READY/DELIVERED sans vente (`financials.ts:76-83`) ; pipelineCounts.dueAmount = commandes PENDING+READY avec netting global qui laisse les trop-payés compenser les dûs (`kpi/queries.ts:387-411`) ; `/admin/encaisser` suit le périmètre compta.
- « Marge nette » à trois définitions : summary = Encaissé − coûts − dépenses ; lignes de groupe client/lot = Encaissé − coûts SANS dépenses (`sales/queries.ts:218`) ; TicketTotals = totalMargin comptable (facturé − coûts), renommée « Marge à risque » si dette.
- Le tooltip du graphe mélange les bases : barres = Encaissé (cash), « Marge » = totalMargin facturée (accrual) — deux conventions dans la même bulle (`ComptaTrendChart.tsx:55-57, 95`).
- Le graphe « Encaissé par semaine » et la tuile « Ce mois » ne comptent que les Sales, alors que la tuile « Encaissé » voisine inclut les commandes confirmées — deux chiffres côte à côte à périmètres différents.
- L'export CSV titre sa colonne « CA (€) » (vocabulaire interdit par `docs/admin/PRODUCT.md`) et exporte le facturé (totalRevenue), sans commandes ni dépenses : les totaux du fichier ne recoupent pas l'écran (`export/route.ts:52-73`).
- Deux systèmes de dette coexistent : Sale.remainingDue (« legacy », `schema.prisma:292-295`) et PaymentTransaction — le schéma annonce le remplacement, tout le module compta pivote encore sur remainingDue.
- revalidateTag(tagFor.treasury()) est appelé dans 8 fichiers mais aucun cache ne porte ce tag : rituel systématiquement sans effet, qui laisse croire à un cache Trésorerie inexistant.
- listMovements résout BatchExpense en titre + lien lot, mais pas les SUPPLIER_OUT à refType « Batch » (posés par supplierPaymentAction:163-164) : même origine, un cas cliquable, l'autre non (`treasury/queries.ts:157-185`).
- Mutations du même domaine en deux styles : routes REST (ventes, dépenses de lot) vs server actions (paiements, Trésorerie, collect) — deux conventions d'erreur et de revalidation à maintenir.
- Baisser le reste dû existe par deux chemins parallèles aux règles différentes : collectAction (plafonné au dû, poche choisie, revalidations complètes) et PATCH du ticket (non plafonné à la baisse près, toujours « Non attribué », aucune revalidation de tags).
- SaleListRow teinte une vente à dette en fond danger (rouge) alors que le badge et la doctrine MoneyBlock réservent l'ambre à l'argent attendu et le rouge à la vraie perte (`SaleListRow.tsx:36-38`).

**Frictions UX.**

- Encaisser un partiel depuis le ticket impose une gymnastique inversée : saisir « ce qui restera dû » (et non le montant reçu), sans choix de poche — l'argent tombe dans « Non attribué » et exige un second passage en vue Trésorerie.
- L'écran Vendre ne permet pas de saisir un reste dû : une vente partiellement payée doit être créée « payée en entier » puis corrigée dans le ticket, chemin qui déclenche précisément le bug de contre-passation manquante.
- Aucune UI pour renommer, réordonner ou archiver une poche (les server actions existent, jamais branchées), ni pour corriger/supprimer un mouvement individuel — seule issue : un ajustement compensatoire qui salit le journal.
- Le journal des mouvements n'a ni pagination ni filtre par poche (listMovements accepte pocketId mais l'UI ne le passe jamais) : au-delà de 30 mouvements l'historique est simplement inaccessible.
- « Importer l'historique » — opération de maintenance one-shot — reste affichée en permanence en bas de la vue Trésorerie, avec un paragraphe d'explication à chaque visite.
- Fermeture d'un ticket en cours d'édition via window.confirm natif (`TicketSheet.tsx:216`), incohérent avec le ConfirmDialog stylé utilisé pour la suppression juste à côté.
- Les KPIs de la vue Ventes sont all-time sans sélecteur de période (le paramètre period existe côté serveur mais n'est plus exposé) : impossible de répondre à « ce mois vs le mois dernier » sans le dashboard.
- Chaque action de Trésorerie fait un router.refresh() complet de la page (re-fetch des 3 requêtes) : latence visible après chaque transfert sur connexion mobile, sans optimistic UI.
- En cas d'échec de chargement des poches (usePockets avale l'erreur), PocketSplit affiche « Aucune poche : l'encaissé ira dans Non attribué » — message faux qui déguise une panne réseau en état normal.

**Dette technique.**

- Sale.remainingDue conservé « pour compat schéma » (`schema.prisma:292-295`) mais structurel dans tout le module : la dette la plus lourde à trancher pour la refonte (un seul modèle de paiement, PaymentTransaction, pour ventes ET commandes).
- Champs et valeurs morts : BatchExpense.countInCompta jamais lu, CashMovementKind.OPENING jamais émis (l'ouverture passe par Pocket.openingBalance), ComptaListResult.groups dupliquant customerGroups (@deprecated, `sales/queries.ts:89-90`), renamePocketAction/archivePocketAction non branchés, pipelineCounts.dueAmount calculé par une requête CTE à chaque appel mais plus affiché nulle part (PipelineBlock n'utilise que les compteurs).
- Le triplet total/payé/dû d'une commande est réimplémenté 4 fois avec des règles de cap différentes : orderComptaMath (cap au total, plancher 0), SQL de pipelineCounts (netting global), listOutstanding, listBatches/getBatchById — toute refonte doit n'en garder qu'une.
- Double chemin de données pour la même liste : RSC (ComptaPage → listSalesGroupedByCustomer) + refetch client GET `/api/admin/compta` après édition — deux entrées à garder synchrones pour un seul écran.
- Mouvements créés hors transaction et en boucle séquentielle (backfill = 1 requête par mouvement) ; recordMovement n'est jamais passé le client transactionnel pourtant prévu par sa signature (type Db).
- Tag de cache « admin:treasury » revalidé partout mais jamais attaché ; version de cache bumpée à la main dans la clé (« kpi-revenue-summary-cash-v4 ») — deux signes d'un système de cache piloté au doigt mouillé.
- TicketBatchPicker est un wrapper d'une ligne autour de BatchPicker (indirection sans valeur).
- Revalidations incohérentes entre routes : la création de vente oublie kpi/sales, le PATCH n'en revalide aucune, collectAction revalide tout — aucune convention.
- Le seuil d'auto-transition PENDING→READY, le cap d'encaissement et l'epsilon 0.005 sont redéclarés localement dans plusieurs fichiers au lieu d'une constante partagée.

**À préserver.**

- Vocabulaire des chiffres verrouillé et documenté (Encaissé / À encaisser / Marge nette / Trésorerie, `docs/admin/PRODUCT.md:80-83`) et réellement appliqué dans l'UI — jusqu'aux commentaires qui bannissent « CA » ; à reconduire tel quel.
- Modèle Trésorerie sain dans son principe : soldes jamais stockés (openingBalance + Σ mouvements signés), signedAmount centralisé et couvert par un test unitaire, transferts appariés par transferGroupId, et la poche « Non attribué » comme filet de conservation — aucun encaissement n'est jamais perdu, seulement à répartir.
- Réversibilité par lien souple refType/refId indexé : supprimer une vente ou une dépense, annuler un paiement, retire bien ses mouvements (reverseMovementsFor) — le principe est bon, seuls des cas (annulation de commande, hausse du reste dû) ne l'appliquent pas.
- confirmedOrdersFinancials évite proprement le double comptage compta entre Sale et Order (sale: null) et plafonne l'Encaissé au total commandé.
- Performance travaillée et expliquée : agrégations SQL en un aller-retour (COUNT FILTER, CTE), unstable_cache taggé + react.cache par rendu, résolution des origines de mouvements en batch anti-N+1, chaque choix justifié en commentaire avec la latence mesurée (~140 ms/aller-retour).
- Décimal partout pour l'argent (decimal.js-light côté lecture, Prisma.Decimal côté écriture) — aucun calcul monétaire en float.
- collectAction est le bon modèle d'écriture financière : point d'entrée unique pour les deux types de créance, montant plafonné au dû, poche explicite, revalidations complètes — à généraliser à tous les chemins d'argent dans la refonte.
- Qualité UI mobile constante : skeletons aux proportions exactes du rendu (zéro layout shift), Suspense pour le premier pixel, cibles 44 px, contrôles côte à côte plutôt qu'imbriqués (BatchGroupSection documente le refus du HTML invalide), état de vue dans l'URL pour les deep-links.
- Petites attentions métier justes : précision monétaire homogénéisée dans un même rapport (TicketPayment), marge qui garde son signe vrai avec l'ambre pour l'attente (SaleListRow), export CSV pensé pour Excel FR (BOM + point-virgule), backfill idempotent.

---

### 4.4 Lots (batches)

**Rôle.** Le domaine Lots regroupe les ventes et les commandes confirmées d'un même envoi fournisseur (« Commande de mars », lot mensuel) pour leur imputer les dépenses logistiques partagées — transport, douane, billet d'avion — et connaître la Marge nette réelle par envoi, en cash-basis (Encaissé, pas facturé). C'est la brique qui relie compta, commandes et Trésorerie : chaque dépense de lot sort d'une poche de Trésorerie, et la Marge nette globale de l'app déduit toutes les dépenses de lot. Le statut OPEN/CLOSED sépare l'envoi en cours (assignable, visible au dashboard) des envois terminés.

**Parcours implémentés.**

- Créer un lot : Compta → lien Lots (ou dashboard/palette) → « Nouveau » → formulaire nom / date prévue / notes → CTA sticky « Créer le lot » → POST `/api/admin/batches` → redirection directe vers le détail du lot créé.
- Assigner des ventes : détail lot (OPEN seulement) → « Assigner » → sheet chargeant les candidates (ventes sans lot OU de ce lot, pré-cochées si assignées) → recherche client, toggles → « Enregistrer (N changements) » → POST `/assign` avec le diff attach/detach → refresh du détail + toast.
- Assigner des commandes : même parcours via le second sheet → POST `/assign-orders`, restreint serveur aux READY/DELIVERED sans vente ; les PENDING sont invisibles.
- Rattacher depuis la vente : compta → ticket (TicketSheet) → carte « Lot » (BatchPicker) → dropdown des lots OPEN (max 50) → PATCH `/api/admin/sales/[id]` { batchId } ; croix pour retirer. Idem depuis le détail commande si statut ≠ PENDING/CANCELLED, via PATCH `/api/admin/orders/[id]`.
- Ajouter une dépense : détail lot → section Dépenses → « Ajouter » → libellé + montant + poche source (défaut « Non attribué ») → POST `/expenses` → crée BatchExpense + mouvement EXPENSE_OUT dans la poche → Marge nette du lot ET globale baissent, solde de la poche baisse.
- Supprimer une dépense : tap poubelle (sans confirmation) → DELETE → supprime la dépense et son mouvement de Trésorerie (contre-passation par suppression).
- Clôturer / rouvrir : bouton en-tête → PATCH { status } → toast « Lot clôturé/rouvert » ; le lot change de section, sort des pickers, perd ses boutons Assigner — les données restent intégralement modifiables par API.
- Supprimer un lot : bouton visible seulement à 0 vente → window.confirm → DELETE → 409 si des ventes existent côté serveur ; sinon commandes détachées (SetNull), dépenses supprimées en cascade → retour liste.
- Consulter : dashboard bloc « Lots ouverts » (3 max, N lignes + Encaissé + Marge nette) → détail ; compta groupée par lot (repli/dépli, lien externe vers le lot) ; Trésorerie liste « Dépense · <libellé> » avec lien vers le lot.
- Naviguer : chaque vente du lot ouvre son ticket via `/admin/compta?sale=<id>` (deep-link auto-open), chaque commande son détail `/admin/ordres/[id]` ; retour du détail lot → `/admin/lots` → `/admin/compta` (getParentScreen).

**Données touchées.**

- `Batch` : name libre, expectedAt (info éditoriale), status OPEN/CLOSED (défaut OPEN), notes, index sur status et createdAt. Aucun champ monétaire stocké — tous les KPIs sont recalculés à chaque lecture.
- `Sale.batchId` et `Order.batchId` : FKs nullables onDelete: SetNull — le rattachement est souple, la suppression du lot détache sans casser. Index sur batchId des deux côtés.
- `BatchExpense` : label, amount € (Decimal 10,2, toujours positif), occurredAt, notes, countInCompta (mort, jamais écrit ni lu), onDelete: Cascade vers Batch. Pas de devise DZD contrairement aux coûts d'articles.
- `CashMovement` avec refType="BatchExpense"/refId : lien souple SANS FK vers la dépense — chaque dépense crée un EXPENSE_OUT signé négatif dans une poche (ou « Non attribué »), contre-passé par suppression du mouvement quand la dépense est supprimée individuellement (`src/server/treasury/movements.ts:86`).
- `Sale.totalRevenue/totalCost/remainingDue` : snapshots dénormalisés à la création, seule source des KPIs de lot côté ventes (Encaissé = totalRevenue − remainingDue). remainingDue est documenté « legacy, remplacé par PaymentTransaction en P6 » mais reste LA donnée pivot.
- `Order` : aucun snapshot financier — total/payé/dû du lot recalculés à chaque lecture depuis OrderItem (unitPrice×quantity, unitCost×quantity) et PaymentTransaction (DEPOSIT+BALANCE−REFUND), avec dû plafonné à 0.
- Seules les commandes READY/DELIVERED sans vente liée (sale: null) comptent dans un lot — la conversion en vente les exclut automatiquement des agrégats (anti-double-comptage, `src/server/batches/queries.ts:123`).
- `AuditLog` : toutes les mutations lots tracées (batch.create/update/delete, batch.expense.add/delete, batch.sync, batch.assign-orders) avec meta.

**Bugs confirmés** (contre-vérifiés `confirmed: true` ; un bug réfuté est reporté en annexe §6).

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| haute | Finaliser en vente une commande rattachée à un lot fait disparaître ses montants du lot : la vente créée n'hérite jamais de order.batchId (aucun des deux chemins de création), et la commande est exclue des agrégats dès que sale != null (filtre sale: null). L'Encaissé du lot chute silencieusement au moment précis où la commande se conclut. | `app/api/admin/sales/route.ts:316` (idem `src/server/sales/actions.ts:112` ; exclusion : `src/server/batches/queries.ts:123,222`) | Aucun 'batchId' dans `app/api/admin/sales/route.ts` (create l.317-363) ni `src/server/sales/actions.ts:112-137`, et les agrégats lot excluent les commandes dès que sale != null (`src/server/batches/queries.ts:123` et 222) : les montants de la commande sortent du lot sans que la vente en hérite. |
| haute | Supprimer un lot supprime ses BatchExpense en cascade (onDelete: Cascade) sans contre-passer leurs mouvements EXPENSE_OUT — le DELETE n'appelle pas reverseMovementsFor, contrairement à la suppression unitaire d'une dépense (`expenses/[expenseId]/route.ts:33`). Les poches gardent des sorties orphelines (« Dépense · — » sans lien) qu'aucune UI ne permet d'annuler sauf ajustement manuel. | `app/api/admin/batches/[id]/route.ts:116-146` | BatchExpense est onDelete: Cascade (`prisma/schema.prisma:334`) et le DELETE lot (`app/api/admin/batches/[id]/route.ts:143`) ne fait que prisma.batch.delete sans reverseMovementsFor, contrairement à la suppression unitaire (`app/api/admin/batches/[id]/expenses/[expenseId]/route.ts:33`). |
| moyenne | countInCompta est un champ mort : jamais écrit (le POST dépense ne l'accepte pas, aucune UI) et jamais lu — toutes les agrégations (lot, KPI, compta, backfill Trésorerie) somment TOUTES les dépenses sans filtre, contredisant le contrat documenté dans le schéma (« NON déduite de la marge et SANS mouvement de trésorerie »). | `prisma/schema.prisma:341` (agrégats sans filtre : `src/server/batches/queries.ts:129`, `src/server/kpi/queries.ts:59`, `src/server/sales/queries.ts:285`, `src/server/treasury/actions.ts:226`) | countInCompta n'apparaît que dans `prisma/schema.prisma:341` et sa migration (grep repo entier : aucune lecture/écriture), tandis que tous les agrégats somment sans filtre (`src/server/batches/queries.ts:129`, `src/server/kpi/queries.ts:59`, `src/server/sales/queries.ts:285`, `src/server/treasury/actions.ts:226`). |
| moyenne | Création de dépense non transactionnelle : prisma.batchExpense.create puis recordMovement en deux appels séparés — si le mouvement échoue, la dépense existe (Marge nette réduite) sans sortie de Trésorerie, et l'utilisateur reçoit une erreur 500 laissant croire que rien n'a été enregistré. | `app/api/admin/batches/[id]/expenses/route.ts:71-91` | `app/api/admin/batches/[id]/expenses/route.ts:71` crée la dépense puis appelle recordMovement à la l.82 hors de toute $transaction ; un échec du mouvement laisse la dépense en base et renvoie l'erreur du catch (l.103-106). |
| moyenne | Aucun contrôle serveur du statut CLOSED : `/assign`, `/assign-orders` et les PATCH batchId de ventes/commandes acceptent d'attacher à un lot clos ; le verrou n'existe que dans l'UI (boutons masqués, picker filtré OPEN). L'endpoint `/assign` rattache aussi des ventes déjà membres d'un AUTRE lot sans garde batchId: null (vol silencieux possible entre deux écrans ouverts). | `app/api/admin/batches/[id]/assign/route.ts:54-63` (aussi `sales/[id]/route.ts:122`, `orders/[id]/route.ts:207`) | `assign/route.ts:49` et `assign-orders/route.ts:48` font findUnique({select:{id:true}}) sans test status==='OPEN' (idem `sales/[id]/route.ts:122-130` et `orders/[id]/route.ts:207-217`), et l'attach de ventes (`assign/route.ts:58-61`) filtre seulement id in attachIds sans garde batchId: null. |
| basse | Le PATCH order accepte batchId sans filtre de statut : une commande PENDING ou CANCELLED peut être rattachée par API, mais les agrégats du lot ignorent ces statuts (READY/DELIVERED seulement) et le BatchPicker est masqué pour PENDING/CANCELLED (`OrderDetailClient.tsx:190`) — rattachement invisible et non désassignable dans l'UI. Même invisibilité si une commande rattachée revient de READY à PENDING. | `app/api/admin/orders/[id]/route.ts:207-217` | `orders/[id]/route.ts:207-217` accepte batchId sur toute commande (seule l'existence du lot est vérifiée), alors que les agrégats exigent status in [READY,DELIVERED] (`src/server/batches/queries.ts:123`) et que le BatchPicker est masqué pour PENDING/CANCELLED (`OrderDetailClient.tsx:190`). |
| basse | La suppression de lot n'est bloquée que par les ventes (_count.sales) : un lot avec commandes rattachées et dépenses se supprime sans avertissement — commandes détachées en silence (SetNull), dépenses effacées. Le garde client vérifie aussi seulement salesCount (`BatchDetailClient.tsx:115`). | `app/api/admin/batches/[id]/route.ts:127-142` | Le DELETE ne vérifie que _count.sales (`app/api/admin/batches/[id]/route.ts:127-142`) alors qu'Order.batch est SetNull (`schema.prisma:199`) et BatchExpense Cascade (`schema.prisma:334`) ; le garde client aussi ne teste que salesCount (`BatchDetailClient.tsx:115`). |
| basse | Le GET détail lot appelle revalidateAdminData(["lots"]) : une simple lecture (chaque refresh() du client après mutation locale) purge les caches de `/admin`, `/admin/lots` et `/admin/compta` — effet de bord d'écriture dans un handler de lecture. À l'inverse, le PATCH (rename/clôture) ne revalide rien alors que POST et DELETE le font. | `app/api/admin/batches/[id]/route.ts:32` | Le GET appelle revalidateAdminData(['lots']) (`app/api/admin/batches/[id]/route.ts:32`), qui exécute revalidateTag(expire:0)+revalidatePath sur `/admin`, `/admin/lots`, `/admin/compta` (`revalidateAdminData.ts:22,86-87`), tandis que le PATCH (l.40-114) ne revalide rien. |

**Incohérences.**

- Seul domaine sans server actions : toutes les mutations passent par des API routes REST + fetch() client (`app/api/admin/batches/*`), alors que la convention du repo est `src/server/<domaine>/` « requêtes Prisma et server actions » — `src/server/batches/` ne contient que `queries.ts`.
- Deux fallbacks de nom client : « Client inconnu » dans `candidates/route.ts:53` (qui ne résout pas customer.fullName) vs « Anonyme » dans `batches/queries.ts:317,340` (qui le résout) — la même vente peut changer de nom entre le sheet et le détail.
- L'en-tête du détail ne compte que les ventes (« X ventes · Ouvert », `BatchDetailClient.tsx:167`) alors que `BatchListRow.tsx:19-28` a été corrigé précisément parce que « afficher 0 vente à côté de 295 € encaissés était faux » — la rustine n'a été posée que sur la liste.
- Le même lot affiche des montants différents entre `/admin/compta` et `/admin/lots/[id]` : le BatchGroup de compta (`sales/queries.ts:224-246`) agrège les ventes seules, sans les commandes rattachées ni les dépenses.
- BatchAssignSheet et BatchAssignOrdersSheet : ~240 lignes quasi identiques (fetch, diff, save, rendu) dupliquées au lieu d'un composant paramétré ; TicketBatchPicker est un wrapper de 20 lignes qui ne fait que préfixer l'endpoint.
- Deux styles de revalidation mélangés : revalidateTag(tag, "default") dans les routes dépenses vs revalidateAdminData avec { expire: 0 } ailleurs ; POST et DELETE lot revalident, PATCH non, GET détail si.
- Deux dialogues de confirmation différents : window.confirm natif pour supprimer un lot (`BatchDetailClient.tsx:119`) alors que le domaine orders utilise le ConfirmDialog du design system.
- L'API dépenses accepte occurredAt et notes (`expenses/route.ts:17-19`) et BatchExpenseRow expose notes, mais le formulaire n'offre ni l'un ni l'autre et la liste n'affiche jamais les notes — surface API et données mortes côté UI.

**Frictions UX.**

- « Clôturer » est un tap sans confirmation ni explication de ses effets (qui sont quasi nuls : retrait des pickers et reclassement) — l'utilisateur ne peut pas savoir ce que la clôture change, et rien ne fige les chiffres du lot fermé.
- Supprimer une dépense = un seul tap sur la poubelle sans confirmation (`BatchExpensesSection.tsx:171-179`), alors que ça contre-passe un mouvement de Trésorerie ; supprimer le lot, lui, confirme — via window.confirm natif hors design system.
- Le formulaire de dépense n'offre ni date (occurredAt forcé à aujourd'hui — impossible de saisir une dépense d'hier), ni notes, ni le caractère « hors compta » pourtant prévus par l'API et le schéma ; le bouton Annuler ne réinitialise pas la poche choisie.
- expectedAt et notes ne sont plus éditables après création (le PATCH les supporte, aucune UI) — une faute de frappe dans les notes est définitive à l'écran.
- Aucun rattachement possible au moment de créer la vente (flux sell) ou la commande : il faut toujours revenir après coup sur le ticket, le détail commande ou le sheet du lot — parcours en deux temps pour l'usage terrain principal.
- La liste des lots n'affiche aucune date (ni création ni arrivée prévue) : deux « Commande de mars » d'années différentes sont indiscernables sans ouvrir.
- Sur le détail, l'en-tête dit « 0 vente » pour un lot rempli de commandes, juste au-dessus de tuiles pleines — la contradiction corrigée sur la liste subsiste ici.
- La tuile « À encaisser » remplace « Coût achats » quand il y a un dû (`BatchDetailClient.tsx:214-235`) : une information disparaît selon l'état, la grille de KPIs n'est pas stable d'une visite à l'autre.

**Dette technique.**

- Mutations en API routes + fetch() au lieu de server actions : seul domaine dans ce style, avec la plomberie répétée dans chaque route (parse JSON, requireAdmin/Editor, try/catch, jsonFromPrismaGestionError) — à ne pas reconduire.
- countInCompta : champ + migration (20260701140000) livrés sans jamais brancher ni l'écriture ni la lecture — fonctionnalité fantôme « dépense hors business » à décider (implémenter ou supprimer) lors de la refonte.
- Sale.remainingDue marqué « legacy, remplacé fonctionnellement par PaymentTransaction en P6, gardé pour compat » (`schema.prisma:292-295`) mais toujours pivot de TOUS les calculs d'Encaissé du lot — migration inachevée, double source de vérité potentielle avec les PaymentTransaction des commandes.
- Le calcul total/payé/dû d'une commande est réécrit à la main au moins quatre fois (listBatches, getBatchById agrégat + rangées, order-candidates, orders/financials) — toute évolution des règles de paiement doit être répliquée partout.
- listBatches charge toutes les ventes, commandes, items et paiements de tous les lots pour agréger en JS — pas d'agrégation SQL contrairement à `kpi/queries.ts` qui montre le bon pattern ($queryRaw FILTER) ; le dashboard n'en affiche que 3.
- Aucune pagination : findMany intégral sur les lots, les candidats ventes/commandes ; listOpenBatchesLite plafonné arbitrairement à 50.
- Liens de Trésorerie par refType/refId en chaînes libres sans FK ni contrainte — les orphelins après suppression de lot sont structurellement possibles et déjà observables (bug haute).
- Duplication BatchAssignSheet / BatchAssignOrdersSheet et wrapper TicketBatchPicker ; refresh() du détail qui re-fetch tout le lot via GET après chaque micro-mutation au lieu d'utiliser la réponse du PATCH.

**À préserver.**

- Vocabulaire des chiffres rigoureusement tenu : Encaissé / À encaisser / Marge nette partout (tuiles, badges, rangées), avec le facturé volontairement exposé mais non affiché « pour audit / debug » — le contrat est documenté en tête de `src/server/batches/queries.ts:7-17`.
- Calculs serveur entièrement en Decimal (decimal.js-light), avec la règle d'anti-double-comptage propre et commentée : une commande sort des agrégats dès qu'une vente lui est liée (sale: null), mêmes règles de paiement que la compta (REFUND soustrait, dû plafonné à 0).
- listBatches mémoïsé par rendu (react.cache) avec un commentaire perf qui explique le pourquoi (base distante, allers-retours partagés entre blocs du dashboard) — à conserver tel quel.
- Les commandes confirmées intégrées aux montants du lot avec le commentaire qui documente le bug corrigé (BatchRowLite.ordersCount, `queries.ts:26-31`) — bel exemple de correction expliquée dans le code.
- Sheets d'assignation bien pensées côté client : diff attach/detach (seuls les changements partent), recherche client, compteur de sélection, skeletons, états vides distincts avec/sans filtre — et transaction Prisma côté serveur.
- La poche « Non attribué » jamais bloquante (ensureUnassignedPocket) : saisir une dépense ne peut pas échouer faute de poche, la répartition se fait plus tard — excellent pour la saisie terrain.
- Écrans couverts par les invariants layout e2e (liste, création, détail via linkPattern dans `e2e/layout-invariants.spec.ts:44,146,222`) et par audit-screenshots.
- Navigation conforme aux règles admin : `/admin/lots` rattaché à l'onglet Compta, retours déclarés dans `navigation.ts:102-103` et testés (`navigation.test.ts`).
- Deep-links croisés cohérents : vente du lot → ticket compta (`?sale=`), commande → détail commande, mouvement de Trésorerie → lot ; audit log sur chaque mutation avec meta.
- Protection de suppression côté serveur (409 si ventes rattachées) et pas seulement côté client ; requireEditor systématique sur les mutations.

---

### 4.5 Catalogue (parfums, marques, mise en avant, prix de référence, images)

**Rôle.** Le domaine Catalogue est le référentiel produit de Nuréa : il gère les marques (mode Sélection ou Gamme complète), les parfums (fiche, visuels dark/light, visibilité, stock, mise en avant) et les prix de référence par volume (30/50/100 ml) qui pré-remplissent commandes, ventes et compta. C'est aussi la source unique de la vitrine publique : chaque mutation invalide les caches public et admin.

**Parcours implémentés.**

- Consulter le catalogue : onglet Catalogue → CataloguePage (RSC, vérifie le JWT, lit le snapshot en cache) → CatalogueClient hydrate 3 onglets ; le titre défile, seule la barre recherche+chips reste épinglée ; les chips n'apparaissent que si elles discriminent (comptes différents) ; listes virtualisées, ligne entière = ouvrir la fiche, œil à droite = bascule visibilité.
- Créer un parfum : bouton « + Parfum » → `/admin/perfumes/new` → choisir/créer la marque dans le BrandPicker (recherche accent-insensible ; « Créer la marque » seulement si aucune équivalente ; l'API peut rendre une existante avec notice) → saisir nom + stock → uploader l'image (crop portrait WebP, upload direct Supabase) → si marque COMPLETE, dialog « Enregistrer quand même » puis création forcée en DRAFT → POST → retour `/admin/catalogue`.
- Éditer un parfum : tap sur la ligne → `/admin/perfumes/[id]/edit` → la fiche se charge côté client (GET API), la grille de prix est chargée côté serveur et passée en slot → chaque upload d'image déclenche un PUT auto-save immédiat → le CTA sticky « Enregistrer » envoie le PUT complet et revient au catalogue → suppression via bouton texte rouge + ConfirmDialog → DELETE hard.
- Régler les prix : dans la fiche parfum, 3 sous-cartes 30/50/100 ml (Prix €, Coût DZD, Taux) → un bouton « Enregistrer » apparaît par volume modifié (dirty) → server action upsert + toast ; « Retirer » supprime la ligne de ce volume — indépendant du CTA principal du formulaire.
- Créer/éditer une marque : `/admin/brands/new|[id]/edit` → nom seul suffit (normalisé serveur) ; choix du mode par cartes radio (Sélection / Gamme complète) ; logo + variante claire optionnels sauf COMPLETE où le logo est requis (sinon Visibilité verrouillée DRAFT) → POST/PATCH → retour `/admin/catalogue?tab=brands` ; supprimer avertit « tous ses parfums seront supprimés ».
- Basculer la visibilité depuis la liste : tap œil → gardes client (marque DRAFT → toast « Rends d'abord la marque visible » ; marque COMPLETE → toast explicatif) → mise à jour optimiste → PATCH { status } → rollback + message serveur si refus (dont refus sans image).
- Mettre en avant : onglet « En avant » → 2 emplacements (remplis ou « Emplacement libre » en pointillés) → la liste des candidats réutilise la recherche → tap = PATCH { isFeatured: true } (refus au-delà de 2, client et serveur) → X sur un emplacement pour retirer ; la vitrine affiche ces parfums en tête d'accueil (s'ils sont PUBLISHED).
- Suivi du stock : saisie du stock sur la fiche (hint « Décrémenté automatiquement à chaque vente. Laisse 0 si tu ne suis pas le stock ») → chaque vente créée décrémente les lignes catalogue dans la transaction → supprimer la vente ré-incrémente → si au moins une référence a du stock, badges Rupture/Stock N et chip « Stock bas » apparaissent ; l'alerte dashboard pointe vers `/admin/catalogue?stock=low`.
- Consommation par la vente terrain : PerfumePicker charge `/api/admin/catalogue?mode=picker` (cache module, tous parfums y compris DRAFT) → sélection d'un parfum + volume → GET pricing pré-remplit prix/coût/taux ; ligne manuelle possible (hors catalogue, snapshot JSON).

**Données touchées.**

- `Brand` : id cuid, name unique, slug unique (suffixé -2, -3… si collision), catalogMode CURATED|COMPLETE, status PUBLISHED|DRAFT (enum BrandVisibilityStatus dédié), image/imageLight nullables (`prisma/schema.prisma:50-63`).
- `Perfume` : id Int assigné manuellement (max+1, pas la séquence), brandId (Cascade), name (unique par marque), slug unique « p-{id}-{marque}-{nom} » jamais consommé par la vitrine, image obligatoire (dark), imageLight optionnelle, isFeatured, isPrivate (jamais écrit — mort), stock Int tous volumes confondus, status PublicationStatus (`schema.prisma:65-91`).
- `PerfumePricing` : PK composite (perfumeId, volumeMl), defaultUnitPriceEur Decimal(10,2), defaultUnitCostDzd et defaultExchangeRate nullables ; remplace l'ancienne pricingMemory localStorage ; lu par sell/orders/compta pour pré-remplir, écrit uniquement depuis la fiche parfum (`schema.prisma:95-106`).
- `ExternalImportSuggestion` : table complète (externalId, payload Json, reviewedAt…) sans aucun code de lecture ni d'écriture — morte (`schema.prisma:133-143`).
- Liens sortants : OrderItem.perfumeId SetNull SANS snapshot pour les lignes catalogue (le nom est perdu à la suppression du parfum) ; SaleItem.perfumeId SetNull mais perfumeSnapshot Json obligatoire (l'historique de vente survit) ; Perfume.stock décrémenté par POST `/api/admin/sales`, ré-incrémenté par DELETE `/api/admin/sales/[id]`, jamais ajusté par PATCH.
- Caches dénormalisés : snapshot admin (brands + perfumes triés updatedAt desc) et catalogue public (PUBLISHED uniquement, marques COMPLETE converties en pseudo-parfums avec ids synthétiques max+idx) sous unstable_cache, tags admin-catalogue / public-catalogue, purgés par revalidateAdminCatalogue (`src/lib/catalogue-service.ts`).
- `AuditLog` : toutes les mutations catalogue écrivent une entrée (perfume.create/update/patch/hard_delete, brand.*, perfume-pricing.*) — mais les actions pricing passent actorId undefined.

**Bugs relevés** (audit sans champ de contre-vérification individuel ; la localisation vaut preuve ; la sécurité des actions pricing est confirmée en §4.7, le PATCH vente sans stock en §4.2).

| Sévérité | Description | Fichier |
|---|---|---|
| haute | Les server actions pricing n'ont AUCUN contrôle d'authentification ni de rôle (pas de requireAdmin/requireEditor), et le middleware ne vérifie que la PRÉSENCE du cookie, pas le JWT (`middleware.ts:26-29`). Un cookie forgé « nurea_admin=x » — ou un compte VIEWER — peut modifier/supprimer tous les prix. | `src/server/pricing/actions.ts:9` |
| haute | La page RSC d'édition parfum charge et sert la grille tarifaire (prix, coûts DZD, taux) sans vérifier le token, contrairement à CataloguePage qui appelle verifyAdminToken ; combiné au middleware présence-seule, un cookie forgé lit les données de marge. | `app/admin/perfumes/[id]/edit/page.tsx:19` |
| haute | Supprimer un parfum (ou une marque, cascade) met OrderItem.perfumeId à null SANS snapshot (réservé aux lignes hors catalogue) : les lignes de commandes historiques s'affichent « Hors catalogue » sans nom ni marque (`src/server/orders/queries.ts:262-270`). Le ConfirmDialog n'avertit pas de cette perte. | `app/api/admin/perfumes/[id]/route.ts:281` |
| haute | PATCH d'une vente (modifier des quantités, ajouter/retirer des lignes) ne réajuste JAMAIS le stock, alors que POST décrémente et DELETE ré-incrémente : le stock dérive à chaque édition de vente et le compteur devient faux silencieusement. *(Confirmé en §4.2.)* | `app/api/admin/sales/[id]/route.ts:73` |
| moyenne | Création de parfum : id calculé par max(id)+1 hors transaction puis inséré explicitement ; deux créations concurrentes entrent en collision (P2002), et la séquence Postgres d'autoincrement n'est jamais avancée ni utilisée. *(Confirmé en §5.)* | `app/api/admin/perfumes/route.ts:115-117` |
| moyenne | Le PUT du formulaire parfum renvoie toujours le stock de l'état client, y compris lors de l'auto-save déclenché par un upload d'image : une vente enregistrée pendant que la fiche est ouverte est écrasée par la valeur périmée (buildBody `PerfumeForm.tsx:145` → route [id] PUT:136-138). | `src/features/catalogue/components/PerfumeForm.tsx:145` |
| moyenne | Le décrément de stock à la vente n'a pas de plancher : stock peut devenir négatif (`app/api/admin/sales/route.ts:379`), s'affiche « Rupture » sans le montant, puis est re-clampé à 0 en silence à la prochaine sauvegarde du formulaire (perte de la dette réelle). | `app/api/admin/sales/route.ts:379` |
| moyenne | convertToWebp recadre TOUTE image en 1024×1536 portrait (cover crop), y compris les logos de marque uploadés depuis BrandForm : un logo carré est amputé, en violation de la règle projet « ne jamais modifier les proportions d'un logo » — le prop aspect="square" ne joue que sur l'aperçu. | `src/lib/admin/image-utils.ts:13-33` |
| moyenne | PATCH isFeatured=true n'exige pas que le parfum soit PUBLISHED et les candidats du FeaturedPanel incluent les masqués (`CatalogueClient.tsx:227`) : un des 2 emplacements vitrine peut être occupé par un parfum invisible au public, sans aucun avertissement. | `app/api/admin/perfumes/[id]/route.ts:214-240` |
| moyenne | La restitution du stock à la suppression d'une vente s'exécute hors transaction (delete puis boucle d'updates) : un échec à mi-boucle laisse la vente supprimée mais le stock partiellement restitué. | `app/api/admin/sales/[id]/route.ts:460-470` |
| basse | La recherche de l'écran catalogue est sensible aux accents (toLowerCase().includes) alors que BrandPicker et PerfumePicker utilisent cleNom : taper « lancome » ne trouve pas « Lancôme » dans l'onglet Parfums mais le trouve dans le sélecteur de vente. | `src/features/catalogue/components/CatalogueClient.tsx:41-43` |
| basse | La vitrine ne filtre pas isPrivate (loadPublicCatalogFromDb, where sans isPrivate:false) alors que le schéma promet « exclu du catalogue public » — sans effet aujourd'hui uniquement parce que rien n'écrit jamais isPrivate=true. *(Confirmé en §5.)* | `src/lib/catalogue-service.ts:80-103` |
| basse | La notice de succès du POST marque (« déjà au catalogue, elle a été sélectionnée ») est affichée via onError, donc rendue dans la bannière d'ERREUR rouge du formulaire. | `src/features/catalogue/components/BrandPicker.tsx:133` |
| basse | Les champs warning et notice renvoyés par POST `/api/admin/perfumes` (parfum créé masqué, marque rattachée à une graphie existante) ne sont jamais lus par le client : save() ne lit que json.error, les messages sont perdus. | `src/features/catalogue/components/PerfumeForm.tsx:192-194` |
| basse | Mojibake dans un message d'erreur : « Statut de visibilitÃ© invalide. » (encodage cassé). *(Confirmé en §5.)* | `app/api/admin/brands/route.ts:91` |
| basse | Renommer une marque régénère son slug mais pas ceux de ses parfums, qui embarquent le nom de marque (perfumeSlug) : les slugs en base restent sur l'ancien nom jusqu'au prochain PUT de chaque fiche. | `app/api/admin/brands/[id]/route.ts:94-95` |
| basse | Arriver via `?stock=low` quand aucune référence n'a de stock active le filtre lowStock sans chip visible pour l'enlever, et la liste montre alors TOUT le catalogue (tous les stocks 0 comptent « out ») au lieu d'un état vide explicite. | `src/features/catalogue/components/CatalogueClient.tsx:56-61` |

**Incohérences.**

- La limite de mise en avant existe en double : FEATURED_LIMIT=2 côté client (`src/features/catalogue/types.ts:39`) et « >= 2 » codé en dur avec son message côté API (`app/api/admin/perfumes/[id]/route.ts:219-221`).
- Deux enums Prisma distincts pour la même paire de valeurs : PublicationStatus (parfum) et BrandVisibilityStatus (marque), tous deux DRAFT/PUBLISHED — toute la logique doit les traiter séparément.
- Les gardes de visibilité (marque DRAFT, gamme complète, image manquante) sont dupliquées en TROIS endroits avec des formulations différentes : client toggleVisibility (`CatalogueClient.tsx:250-266`), PUT (`[id]/route.ts:105-122`) et PATCH (`[id]/route.ts:191-210`).
- Deux conventions de mutation cohabitent : parfum édité via PUT « fiche complète » + PATCH « champ isolé », marque uniquement via PATCH mais avec payload toujours complet envoyé par BrandForm — la sémantique partielle du PATCH marque n'est jamais exploitée par le formulaire.
- Typage AdminPerfumeRow relâché (status: string, stock/isFeatured optionnels — séquelles des rustines « colonne manquante ») là où AdminBrandRow a des unions strictes (`src/lib/admin/catalogue-types.ts:16-31`).
- POST `/api/admin/brands` contient du code mort empilé : force DRAFT si COMPLETE sans image (lignes 94-97) immédiatement suivi d'un retour 400 sur la même condition (99-101), puis un updateMany des parfums d'une marque qui vient d'être créée donc n'en a aucun (121-126) ; même doublon force-DRAFT/400 dans le PATCH [id] (124-137).
- Dans PATCH perfumes, le try/catch P2022 autour d'une simple affectation « updates.isFeatured = body.isFeatured » ne peut jamais lever (232-239) — rustine copiée sans objet.
- Franglais structurel : fichiers et fonctions en français (`nommage.ts`, `resoudMarque.ts`, cleNom, marqueEquivalente) côtoient l'anglais (catalogue-service, pricing, requireAdmin) sans règle.
- Ordres de tri divergents pour la même liste : snapshot admin trié updatedAt desc (`catalogue-service.ts:251`), GET `/api/admin/perfumes` trié id asc (route par ailleurs jamais appelée).
- Le PerfumeForm récupère les marques via `/api/admin/brands` (requête directe non cachée) alors que l'écran liste utilise le snapshot admin caché : deux chemins de données pour la même liste.
- Les compteurs stock divergent : le dashboard exclut isPrivate (`AlertsBlock.tsx:54`, SQL brut) alors que l'écran catalogue compte tous les parfums (`CatalogueClient.tsx:156-165`) — deux définitions de « rupture » pour le même chiffre.

**Frictions UX.**

- Stock 0 est surchargé : il signifie à la fois « non suivi » (hint du formulaire) et « rupture ». Dès qu'UNE référence a du stock, toutes celles à 0 affichent « Rupture » et gonflent le compteur « Stock bas » — fausses alertes permanentes sur les références achetées à la commande (`CatalogueClient.tsx:137-166`, `PerfumeListRow.tsx:39-40`).
- La grille tarifaire est rendue et éditable pour le rôle VIEWER : le pricingSlot est affiché sans condition (`PerfumeForm.tsx:359`) et PerfumePricingPanel n'a pas de prop readOnly — la lecture seule du reste de la fiche est contournée sur les prix.
- Deux systèmes de sauvegarde cohabitent sur le même écran : le CTA sticky « Enregistrer » (PUT du formulaire) et un bouton « Enregistrer » par volume dans la grille de prix (server action) — modifier un prix puis taper le CTA principal ne sauvegarde pas le prix.
- À la création d'un parfum, l'image est uploadée vers Supabase AVANT que la fiche existe : abandonner l'écran laisse des fichiers orphelins dans le bucket, et supprimer un parfum ne supprime jamais ses images (DELETE ne touche que la base).
- Le dialog de suppression d'une marque annonce « tous ses parfums seront supprimés » mais pas l'effet réel sur l'historique : les lignes de commandes liées perdent leur nom (voir bug SetNull sans snapshot).
- Repasser une marque de « Gamme complète » à « Sélection » (ou de Masquée à Visible) laisse tous ses parfums en DRAFT sans proposition de republication : il faut rouvrir chaque fiche une par une.
- Le sélecteur de vente (mode=picker) liste aussi les parfums DRAFT sans les distinguer visuellement : on peut vendre une référence masquée sans le savoir (`app/api/admin/catalogue/route.ts:20-32`).
- Après création/édition, retour systématique à `/admin/catalogue` en perdant la position de défilement et les filtres actifs (router.push sur l'URL nue, sans les query params qu'on avait).
- La saisie du champ Marque s'efface au focus (setQuery("") dans onFocus, `BrandPicker.tsx:153-156`) : rouvrir le picker pour corriger oblige à retaper la recherche.

**Dette technique.**

- `ExternalImportSuggestion` : table Prisma entièrement morte — aucun code ne la lit ni ne l'écrit, seule mention un commentaire (`src/lib/admin/index.ts:2`). À ne pas reconduire, ou à implémenter vraiment.
- `Perfume.isPrivate` : colonne + index jamais écrits par aucune UI ni API ; lue uniquement par deux requêtes SQL brutes de KPI (`src/server/kpi/queries.ts:202,239`) et l'alerte stock. Feature fantôme dont la promesse (« exclu du catalogue public ») n'est même pas implémentée côté vitrine.
- batchLookupPricings exporté et documenté (« pré-remplir form commande ») mais jamais appelé — les forms font N requêtes unitaires à la place (`src/server/pricing/queries.ts:45-65`).
- GET `/api/admin/perfumes` (liste avec `?status=`) jamais appelé par l'app : endpoint mort qui expose pourtant tout le catalogue.
- Rustines P2022 « colonne manquante, lancez npx prisma db push » dans PATCH perfumes et GET catalogue : le schéma est géré par db push sans migrations versionnées, et le code applicatif compense.
- writeAudit(undefined, …) dans les actions pricing : entrées d'audit sans acteur, alors que toutes les routes API passent ctx.sub (`src/server/pricing/actions.ts:36,52`).
- Slug parfum « p-{id}-{marque}-{nom} » : unique en base, régénéré à chaque PUT, jamais utilisé par la vitrine (les pages publiques filtrent par slug de MARQUE uniquement) — complexité et risque de collision pour rien.
- Commentaire et code divergents dans `image-utils.ts` : « Compression maîtrisée (0.80) » en tête, toBlob à 0.95 ligne 48 ; generateBlurDataUrl exporté jamais branché sur l'upload.
- Ids synthétiques de la vitrine : les marques COMPLETE deviennent des pseudo-parfums avec id = maxId+idx (`catalogue-service.ts:149`) — fragile si on s'en sert un jour comme clé stable.
- Middleware `/admin` présence-seule du cookie « pour éviter les faux positifs edge » : tout le modèle de sécurité repose sur la discipline de chaque page/route à appeler requireAdmin — les oublis existent déjà (pricing).
- Filtres anti-legacy dans le mapping vitrine (exclusion placeholder.svg et `/parfums/`) : traces d'anciennes données jamais nettoyées en base, refiltées à chaque lecture (`catalogue-service.ts:141-146,161-168`).
- PerfumeForm charge le rôle via `/api/admin/session` et les marques via `/api/admin/brands` à chaque montage : trois fetchs séquentiels au lieu d'un chargement serveur comme CataloguePage.

**À préserver.**

- `src/lib/nommage.ts` : normalisation orthographique remarquable — séparation nette « retrouver » (cleNom) vs « écrire » (normalise*), doctrine explicite « on ne recasse que ce dont on est sûr » validée sur cas réels (MYSLF, J'adore, L'Interdit), mots-outils et sigles. À reprendre tel quel.
- resoudMarque + BrandPicker : le dédoublonnage des marques rend l'existante au lieu d'un 409 sec (« louis vuitton » → sélectionne « Louis Vuitton » avec notice), tuant à la racine les marques en triple constatées en base.
- Performance des listes : virtualisation WindowedList, loader d'images plafonné à 256 px (nureaAdminThumbLoader) contre les srcset 1080/1920, quality 60, fetchPriority low, snapshot unstable_cache par tags avec invalidation ciblée après mutation.
- Cascade de visibilité cohérente et défendue aux deux bouts : un parfum ne peut jamais être plus visible que sa marque, avec messages d'erreur actionnables (« Rends d'abord la marque X visible »).
- UX mobile pensée et JUSTIFIÉE dans les commentaires (mesures à l'appui) : zone épinglée réduite à la recherche (60 px au lieu de 124), chips masquées quand elles ne discriminent rien, entrée « Créer la marque » en tête de popover à cause du clavier iPhone, ConfirmDialog du thème au lieu de window.confirm hors-cadre iOS, StickyAction au lieu d'un fixed calé en dur.
- Mutations optimistes systématiques avec rollback propre + toast (visibilité, mise en avant), et ensembles pending par id pour bloquer le double-tap.
- Auto-save immédiat après upload d'image sur fiche existante — élimine le cas réel « image envoyée puis perdue en quittant sans Enregistrer ».
- État des filtres dans l'URL (replace débouncé, deep-link `?stock=low` depuis le dashboard) : partage et retour arrière fonctionnent sans polluer l'historique.
- Upload direct navigateur→Supabase par URL signée : le serveur ne relaie jamais les octets, et la conversion WebP + recadrage se fait côté client avant envoi.
- PerfumePricing en base (PK composite parfum+volume) remplaçant une pricingMemory localStorage : les prix de référence survivent aux appareils et pré-remplissent commandes, ventes et compta.
- FeaturedPanel : les 2 emplacements matérialisés (remplis ou en pointillés) montrent d'un coup d'œil les places restantes — meilleur que l'ancien compteur 0/2.
- Audit log sur toutes les mutations catalogue avec actions nommées (perfume.hard_delete, brand.update…), et commentaires de code qui documentent le POURQUOI des choix — une base de connaissance à préserver dans la refonte.

---

### 4.6 Accueil / Dashboard / Shell

**Rôle.** Le shell (`src/app-shell/`) fournit la coque PWA iOS de toute l'app de gestion : header avec retour dérivé de la route, tab bar 5 onglets, palette de commandes, pull-to-refresh, undo global, service worker et sync viewport clavier. Le dashboard (`src/features/dashboard/`) est l'écran d'atterrissage : alertes actionnables, KPI cash-basis (Encaissé / À encaisser / Marge nette / Trésorerie), pipeline de commandes, raccourcis vers les écrans sans onglet, lots ouverts et top parfums. L'écran stats (`app/admin/stats/top-parfums`) est le seul écran statistique : classement complet des parfums vendus.

**Parcours implémentés.**

- Ouverture de l'app → AdminShell monte header/tab bar/palette → `/admin` rend DashboardPage : les squelettes s'affichent, puis chaque bloc hydrate dès que SA requête répond (alertes et argent d'abord) ; ordre de lecture voulu du plus urgent au plus contextuel.
- Consulter l'argent : tap tuile Encaissé → `/admin/compta` ; tap À encaisser → `/admin/encaisser` (écran d'encaissement, pas la liste) ; tap Trésorerie → `/admin/compta?vue=tresorerie` (le paramètre vue est bien lu par ComptaWithTreasury) ; la tuile Ce mois n'existe que si ≥1 vente dans le mois.
- Traiter une alerte : tap « N commandes en retard » → `/admin/ordres?filter=ready` ; tap « X € non attribués » → `/admin/compta?vue=tresorerie` ; tap « Stock à réapprovisionner » → `/admin/catalogue?stock=low` (filtre pré-armé côté CatalogueClient).
- Aller aux écrans orphelins : depuis le dashboard uniquement, via ShortcutsBlock (Clients, Lots, Statistiques) ou la palette ; depuis un autre onglet il faut d'abord revenir sur Accueil ou ouvrir la palette.
- Rechercher : tap loupe (ou Cmd+K au clavier) → palette ; <2 caractères : liste Navigation + Créer filtrable ; ≥2 : fetch débouncé, résultats groupés Parfums/Clients/Commandes ; sélection → navigation directe (parfum → `/admin/perfumes/:id/edit`, client → fiche, commande → détail) et fermeture.
- Revenir en arrière : le chevron du header applique PARENTS (première règle qui matche) : édition → sa fiche (clients/:id/edit → clients/:id), détail → sa liste, liste orpheline → Accueil ou Compta ; une racine d'onglet n'affiche jamais de retour.
- Rafraîchir : tirer vers le bas en haut de la zone scroll → indicateur flèche/spinner → au-delà de 64 px relâcher → router.refresh() + 600 ms de feedback fixe.
- Supprimer avec filet (depuis les features consommatrices) : useUndo().scheduleDelete → toast « Annuler » 5 s → à échéance ou fermeture manuelle le commit s'exécute ; un nouveau schedule commit immédiatement le précédent.
- Hors ligne : navigation qui échoue → le SW sert `/admin/offline` (mise en cache à l'install) avec bouton réessayer ; les données API ne sont jamais cachées.
- Installer la PWA : sur iOS Safari hors standalone → bannière au-dessus du header « Partager puis Sur l'écran d'accueil » → dismiss persisté (nurea-pwa-hint-dismissed-v1).

**Données touchées.**

- `Sale` : champs dénormalisés totalRevenue/totalCost/totalMargin/remainingDue sommés par prisma.aggregate pour l'Encaissé global (Encaissé = totalRevenue − remainingDue) et par SQL brut pour Ce mois (soldAt >= début de mois) — `src/server/kpi/queries.ts`.
- `Order` + `OrderItem` (unitPrice, unitCost, quantity) + `PaymentTransaction` (DEPOSIT/BALANCE/REFUND) : compteurs pipeline par status PENDING/READY et retard via deliveryAt < now−24h ; l'Encaissé des commandes READY/DELIVERED sans Sale liée est recalculé ligne à ligne en Node (confirmedOrdersFinancials) et additionné aux ventes.
- `BatchExpense.amount` : agrégé et déduit de la Marge nette globale (dashboard = toutes les dépenses, sans borne de période).
- `Pocket` (openingBalance, isSystem, archived) + `CashMovement.amount` groupé par poche : total Trésorerie et solde de la poche système « Non attribué » qui déclenche l'alerte — `src/server/treasury/queries.ts`.
- `Perfume` (stock défaut 0, isPrivate, status) : comptages rupture/stock bas en une requête SQL FILTER (seuil LOW_STOCK_THRESHOLD=3), et recherche palette (sans filtre isPrivate — voulu côté admin).
- `SaleItem.perfumeSnapshot` (JSON name/brandName) : top parfums groupés par clé 'catalog:id' ou 'manual:nom normalisé', avec COALESCE nom live / snapshot ; les parfums catalogue non publiés ou privés sont exclus du classement.
- `Batch` (status OPEN/CLOSED) : bloc Lots ouverts via listBatches() complet puis filtre/slice(0,3) côté Node — les KPI par lot sont recalculés, pas stockés.
- `Customer` (fullName, phoneE164) : recherche palette via searchCustomers.

**Bugs confirmés** (tous contre-vérifiés `confirmed: true`).

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| moyenne | L'alerte « N commandes en retard » compte les statuts PENDING et READY (`kpi/queries.ts:363-365`) mais son lien ouvre `/admin/ordres?filter=ready` : une commande PENDING en retard est comptée dans le chiffre et invisible dans la vue ouverte. Le PipelineBlock a le même lien (défaut assumé en commentaire, lignes 49-55). | `src/features/dashboard/components/AlertsBlock.tsx:71` | `queries.ts:363-365` compte PENDING+READY en retard, `AlertsBlock.tsx:71` lie `/admin/ordres?filter=ready`, et `src/server/orders/queries.ts:93-94` montre que filter=ready ne renvoie que status READY — une PENDING en retard est comptée mais absente de la vue (`PipelineBlock.tsx:49-55` assume le même défaut). |
| moyenne | pipelineCounts calcule dueAmount via une requête SQL à deux CTE exécutée à CHAQUE rendu du dashboard, hors unstable_cache — et aucun consommateur n'existe dans tout le repo. Un aller-retour DB (~140 ms selon les propres commentaires du fichier) payé pour rien à chaque affichage de l'accueil. | `src/server/kpi/queries.ts:389-413` | `queries.ts:389-411` : la requête dueAmount est dans pipelineCounts (react cache() par rendu, hors unstable_cache qui ne couvre que cachedPipelineCounts l.346-377), et grep 'dueAmount' ne trouve aucun consommateur hors queries.ts alors que pipelineCounts est appelé par `AlertsBlock.tsx:45` et `PipelineBlock.tsx:21` à chaque affichage du dashboard. |
| moyenne | Alerte stock : Perfume.stock vaut 0 par défaut (« Laisse 0 si tu ne suis pas le stock », PerfumeForm), donc dès qu'UNE référence a stock>0, toutes les références non suivies passent en « rupture » (le garde-fou ligne 90 ne coupe l'alerte que si 100 % du catalogue est à 0). Faux positifs massifs en suivi partiel du stock. | `src/features/dashboard/components/AlertsBlock.tsx:90-103` | `AlertsBlock.tsx:90` (stockIsTracked = trackedTotal>0 && outOfStock<trackedTotal) ne désactive l'alerte que si 100% du catalogue est à 0, alors que `PerfumeForm.tsx:310` dit « Laisse 0 si tu ne suis pas le stock » — en suivi partiel, toute référence non suivie compte dans « X en rupture » (l.51 stock<=0). |
| moyenne | La tuile « Ce mois » (monthSummary) ne somme que la table Sale, alors que l'« Encaissé » global du même bloc inclut l'Encaissé des commandes confirmées : un acompte encaissé ce mois sur une commande gonfle le global mais pas le mois. Deux chiffres du même écran ne parlent pas le même périmètre. | `src/server/kpi/queries.ts:130-144` | `queries.ts:132-138` : monthSummary n'agrège que la table Sale, tandis que le cashedRevenue global (`queries.ts:95`) ajoute agg.ordersCashed — les deux chiffres cohabitent dans `MoneyBlock.tsx` (l.57 « Encaissé » vs l.92 « Ce mois ») avec des périmètres différents. |
| basse | navigation.ts rattache `/admin/reglages` à l'onglet Accueil (ligne 41) et lui définit un parent (ligne 106) alors qu'aucune route `app/admin/reglages` n'existe. Configuration fantôme. | `src/app-shell/navigation.ts:41` | `navigation.ts:41` (match startsWith('/admin/reglages')) et :106 (parent /admin/reglages/*) alors que Glob `app/admin/reglages/**` ne renvoie aucun fichier — aucune route n'existe. |
| basse | `/admin/encaisser` : l'onglet actif est Compta (`navigation.ts:64`) mais le bouton retour mène à Accueil (PARENTS ligne 104). L'utilisateur voit deux signaux de hiérarchie contradictoires sur le même écran. | `src/app-shell/navigation.ts:104` | `navigation.ts:64` rattache `/admin/encaisser` à l'onglet Compta tandis que PARENTS:104 fait pointer son bouton retour vers `/admin` (« Accueil ») — deux signaux de hiérarchie contradictoires sur le même écran. |
| basse | todayStart/startOfMonth/cutoff utilisent l'horloge locale du serveur (UTC en prod typiquement) : autour de minuit et au 1er du mois, « Ce mois » et « en retard » peuvent inclure/exclure des ventes d'une à deux heures par rapport à l'heure de Paris. La date affichée en tête du dashboard (`DashboardPage.tsx:59`) a le même biais. | `src/server/kpi/queries.ts:10-25` | `queries.ts:10-25` (new Date() + setHours(0,0,0,0), new Date(y,m,1)) et `DashboardPage.tsx:59-63` (Intl.DateTimeFormat sans timeZone sur new Date()) utilisent l'horloge locale du serveur — en prod UTC, décalage d'1-2 h avec l'heure de Paris autour de minuit et du 1er du mois. |
| basse | Le détail de l'alerte retard dit « Date de livraison dépassée » mais le comptage exige deliveryAt < now−24h : pendant les 24 premières heures de dépassement, ni alerte ni compteur, alors que le libellé promet le contraire. | `src/server/kpi/queries.ts:356` | `queries.ts:356` (cutoff = now − 24h) + :363-365 exigent deliveryAt < now−24h alors que `AlertsBlock.tsx:70` affiche « Date de livraison dépassée » — pendant les 24 premières heures de dépassement, ni alerte ni compteur. |
| basse | AdminLoadingProgress affiche une barre de 600 ms à chaque changement de pathname ET au premier montage, sans lien avec un état de chargement réel (admis en commentaire, qui parle d'ailleurs de 1,6 s alors que le code fait 600 ms). Feedback factice, y compris sur navigation instantanée. | `src/app-shell/AdminLoadingProgress.tsx:17-21` | `AdminLoadingProgress.tsx:17-21` : useEffect([pathname]) déclenche setActive(true) au premier montage et à chaque navigation avec un setTimeout fixe de 600 ms, sans état de chargement réel, et le commentaire l.9 parle de '1.6s'. |
| basse | MoneyBlockFallback affiche toujours 3 tuiles secondaires alors que le rendu réel n'en a que 2 quand le mois est vide (grid-cols-2, `MoneyBlock.tsx:66`) : saut de mise en page à la résolution du Suspense, précisément les premiers jours du mois. | `src/features/dashboard/components/MoneyBlock.tsx:146-156` | MoneyBlockFallback (`MoneyBlock.tsx:150-154`) rend toujours grid-cols-3 avec 3 tuiles alors que le rendu réel bascule en grid-cols-2 avec 2 tuiles quand month.count===0 (l.66 et 89-96) — saut de mise en page à la résolution du Suspense les jours sans vente du mois. |

**Incohérences.**

- Le même concept source==='manual' est badgé « Saisie libre » sur le dashboard (`TopPerfumesBlock.tsx:60`) et « Hors catalogue » sur l'écran stats (`top-parfums/page.tsx:66`) : deux mots pour la même chose, contraire à la règle produit du vocabulaire unique.
- Le résumé cash-basis est implémenté DEUX fois : revenueSummary (`src/server/kpi/queries.ts:85-118`) et le summary de comptaList (`src/server/sales/queries.ts:297-309`) recopient les mêmes formules (Encaissé ventes + commandes, marge = Encaissé − coûts − dépenses). Elles concordent aujourd'hui mais toute évolution doit être faite en double, et leur fraîcheur diverge (cache 60 s côté dashboard, direct côté compta).
- Deux mécanismes viewport concurrents abonnés au même visualViewport : ViewportSync pose --admin-vh/--admin-vv-offset, useAdminKeyboardInset pose --admin-keyboard-inset — deux sources de vérité pour le même phénomène clavier iOS.
- La CommandPalette code ses z-index en dur (z-[80], z-[90]) au lieu des jetons --admin-z-modal-backdrop/--admin-z-command-palette définis dans `globals.admin.css:130-139` ; les valeurs coïncident par chance aujourd'hui.
- Dans la palette, « Nouvelle vente » (groupe Créer) et « Vendre » (groupe Navigation) mènent tous deux à `/admin/vendre` ; et la navigation palette couvre Clients et Lots mais pas Statistiques ni Encaisser, pourtant écrans de même rang (raccourci dashboard / tuile).
- La feature « collect » (écran `/admin/encaisser`) n'apparaît pas dans la liste officielle des domaines de CLAUDE.md (catalogue, orders, sell, compta, customers, batches, treasury, dashboard, auth).
- La date du dashboard porte la classe CSS capitalize qui capitalise CHAQUE mot (« Mercredi 17 Septembre »), contraire à la typographie française qui ne capitalise que l'initiale (`DashboardPage.tsx:70`).
- Le test `navigation.test.ts` ne couvre ni `/admin/encaisser` ni le parent de `/admin/stats/*` : les deux rattachements les plus ambigus de la table sont justement ceux non testés.

**Frictions UX.**

- Architecture d'information : l'onglet Accueil sert de fourre-tout (clients, stats, réglages fantômes, offline) et l'onglet Compta absorbe lots et encaisser. Ça tient à 5 onglets uniquement parce que le dashboard rejoue une deuxième navigation (ShortcutsBlock) — depuis Commandes ou Catalogue, atteindre Clients demande 2 taps + un détour visuel par l'Accueil.
- Taper « Lots » depuis l'Accueil fait sauter l'onglet actif sur Compta (match `navigation.ts:63`) : l'utilisateur part d'Accueil, arrive sur un écran estampillé Compta, et le retour dit « Compta » — trois signaux qui ne racontent pas le même trajet.
- Statistiques : une seule page (top-parfums), plein historique sans filtre de période ni pagination (limit 500 rendu d'un bloc sur un rail 430 px) ; topBrands, topCustomers et dailyRevenue existent côté serveur mais aucun écran ne les montre — la promesse du raccourci « Statistiques » est plus grosse que l'écran.
- La bannière d'installation PWA est rendue AU-DESSUS du header, hors zone de scroll (`AdminShell.tsx:53`) : elle compresse tout l'écran en permanence tant qu'elle n'est pas fermée, sur l'écran le plus dense de l'app.
- Depuis la palette, sélectionner un parfum ouvre directement le formulaire d'édition (`/admin/perfumes/:id/edit`) : chercher pour CONSULTER n'existe pas, le premier écran est déjà un formulaire.
- Le pull-to-refresh résout après un délai fixe de 600 ms (`PullToRefresh.tsx:24`) sans attendre la fin réelle de router.refresh() : le spinner disparaît alors que les données peuvent encore être en vol — feedback qui ment sur les connexions lentes.
- L'affordance ⌘K (kbd affiché dans la palette, aria-keyshortcuts) est pensée desktop sur une PWA exclusivement tactile ; inoffensif mais du bruit visuel dans un champ étroit.
- Le dashboard n'a aucun état « première utilisation » : sans données, il rend un écran quasi vide (alertes, pipeline, lots masqués ; seul Top parfums affiche « Pas encore de ventes ») sans orienter vers les premières actions (créer un parfum, un lot, une vente).

**Dette technique.**

- Code mort serveur : topBrands, topCustomers, dailyRevenue (`src/server/kpi/queries.ts:263-337`) n'ont aucun consommateur ; dueAmount de pipelineCounts non plus (et lui coûte une requête par rendu). À ne pas reconduire tels quels — ou à brancher sur un vrai écran stats.
- Duplication de la logique KPI cash-basis entre `kpi/queries.ts` et `sales/queries.ts` (et une troisième variante par lot dans `batches/queries.ts` computeKpis) : la refonte doit centraliser UNE fonction de calcul partagée par dashboard, compta et lots.
- listBatches() charge tous les lots avec leurs agrégats pour que le dashboard en garde 3 (`ActiveBatchesBlock.tsx:9-10`) : le filtre OPEN et la limite devraient être dans la requête.
- Route fantôme `/admin/reglages` câblée dans la navigation sans exister ; à trancher (créer l'écran ou purger la config).
- Deux hooks viewport redondants (ViewportSync + useAdminKeyboardInset) à fusionner en un seul service viewport.
- Focus-trap et overlay de la CommandPalette réimplémentés à la main (`CommandPalette.tsx:60-111`) alors que Radix Dialog est déjà dans le stack et le fournit (aria, scroll-lock, restauration de focus inclus).
- AdminLoadingProgress est un placebo assumé ; Next expose désormais des mécanismes de pending réels (useLinkStatus / transitions) — à remplacer plutôt que reconduire.
- Dépendance à unstable_cache (API non stabilisée de Next) pour tout le cache KPI ; à migrer vers l'API stable équivalente lors de la refonte.
- Toutes les bornes temporelles serveur sont en fuseau du serveur ; la refonte doit fixer explicitement Europe/Paris pour todayStart/startOfMonth/cutoff.
- Le commentaire d'AlertsBlock parle de « trois bannières indépendantes » historiques et PipelineBlock d'une ancienne tuile « encaissable » : plusieurs strates de rustines déjà réécrites une fois — le vocabulaire des commentaires témoigne d'une logique métier qui n'a jamais eu de spécification centrale.

**À préserver.**

- `navigation.ts` comme source de vérité unique de l'IA (onglets + parents), testée par vitest (5 onglets, unicité du rattachement, anti self-parent, édition→fiche) : le retour dérivé de la route rend les deep links (palette, alertes, raccourcis) robustes — à conserver tel quel.
- Discipline exemplaire des allers-retours DB : agrégations SQL FILTER en une passe (AlertsBlock, pipelineCounts, monthSummary), mémoïsation react cache() pour dédupliquer entre blocs d'un même rendu, unstable_cache taggé avec revalidation ciblée centralisée (`cache-tags.ts`) — le raisonnement « la latence domine, pas le travail » est documenté et juste.
- Streaming par bloc : un Suspense par bloc avec squelettes aux dimensions exactes du rendu final, le premier chiffre s'affiche sans attendre la requête la plus lente — pattern à reprendre à l'identique.
- Vocabulaire des chiffres tenu : Encaissé / À encaisser / Marge nette / Trésorerie identiques entre dashboard et compta, définitions écrites en tête de MoneyBlock et de `kpi/queries.ts` ; l'historique des synonymes supprimés est même documenté.
- Principe « rien à faire → rien rendu » appliqué partout (alertes, pipeline, tuile retard, tuile mois, lots) : l'écran ne bavarde jamais à vide, et les couleurs d'alerte ne s'usent pas sur des zéros (raisonnements explicités en commentaires).
- Chaque montant est un lien vers l'écran d'ACTION correspondant (À encaisser → `/admin/encaisser` et non la liste) : la sémantique tap = action est cohérente.
- Shell PWA iOS très soigné : ViewportSync/visualViewport pour le clavier, pull-to-refresh custom techniquement propre (listeners passifs, refs anti re-souscription, résistance), service worker prudent (jamais d'API ni de HTML authentifié en cache, dés-enregistrement en dev), UndoProvider 5 s survivant aux navigations, bypass shell sur `/admin/login`.
- Accessibilité réelle : aria-label/aria-current/aria-busy systématiques, focus-visible rings, cibles 44 px via --admin-touch-min, pinch-zoom non bloqué (WCAG documenté dans layout.tsx), couleur d'état-barre iOS raisonnée.
- Les commentaires de code expliquent les DÉCISIONS produit (pourquoi ambre et pas rouge, pourquoi pas de tuile à zéro, pourquoi le retour n'est pas l'historique) : cette mémoire des choix est une matière première précieuse pour la refonte.

---

### 4.7 Auth / PWA / Infra

**Rôle.** Ce domaine porte l'entrée dans « Nuréa Gestion » : connexion par identifiant/mot de passe avec session JWT en cookie httpOnly, barrière middleware sur `/admin/*`, et rôles OWNER/EDITOR/VIEWER. Il porte aussi toute l'enveloppe PWA iOS : manifeste dynamique, icônes et splash screens générés, service worker de cache, page hors-ligne, bannière d'installation, et le shell applicatif (header retour, 5 onglets, viewport clavier iOS).

**Parcours implémentés.**

- Connexion : GET `/admin/*` sans cookie → middleware redirige `/admin/login` → LoginForm (shell bypassé, carte centrée) → POST `/api/admin/login` → rate-limit IP → lookup AdminUser (username trim+lowercase) → bcrypt.compare (hash factice si compte inconnu) → cookie JWT 7 j → router.replace('/admin') + refresh → tableau de bord.
- Navigation authentifiée : chaque requête `/admin/*` passe le middleware (présence cookie), reçoit x-nurea-admin-route → root layout applique la classe admin → AdminShell rend header (retour getParentScreen), zone scroll, TabBar, palette.
- Lecture/mutation via API REST (écrans catalogue, marques, upload) : adminFetchJson (credentials include, no-store) → requireAdmin vérifie le JWT → requireEditor si mutation (VIEWER 403) → Prisma → writeAudit(ctx.sub, …).
- Mutation via server action (vendre, ordres, clients, encaisser, trésorerie, pricing) : le composant client appelle directement l'action `src/server/*` → validation zod éventuelle → Prisma SANS aucun contrôle de session ni de rôle → writeAudit(undefined, …) → revalidateTag.
- Session invalide/expirée : page vérifiante (CataloguePage, ordres/new) → redirect `/admin/login` ; route REST → 401 JSON géré au cas par cas par chaque composant ; server action → s'exécute quand même.
- Installation PWA iOS : visite `/admin` dans Safari → PwaInstallHint (si non installée, non dismissée) → Partager > Sur l'écran d'accueil → manifeste `/api/pwa/admin` → lancement standalone : splash bordeaux exact au device → `/admin` (ou login si pas de cookie).
- Premier lancement prod : AdminShell monte ServiceWorkerRegistrar → après load, register('/admin-sw.js', scope '/admin/') → install : met `/admin/offline` en cache + skipWaiting → activate : purge caches étrangers + clients.claim.
- Hors ligne : navigation échoue → SW sert la copie en cache de `/admin/offline` → message « Pas de connexion » + Réessayer (reload) ; aucune donnée métier accessible hors ligne, par principe.
- Rafraîchissement : tirer le scroll-root vers le bas → indicateur sous le header → router.refresh() re-exécute les RSC.
- Création/rotation de compte : opérateur lance `scripts/create-admin.ts` en CLI (aucune UI de gestion des comptes ni de changement de mot de passe dans l'app).

**Données touchées.**

- `AdminUser` (`prisma/schema.prisma:108`) : id cuid, username unique (stocké lowercase), passwordHash bcrypt, role AdminRole @default(EDITOR), relations auditLogs[] et payments[] (PaymentTransaction garde l'admin encaisseur).
- enum `AdminRole` OWNER/EDITOR/VIEWER (`schema.prisma:26`) ; hiérarchie rank VIEWER<EDITOR<OWNER dans `requireAdmin.ts:20` mais aucun contrôle n'exige jamais OWNER.
- `AuditLog` (`schema.prisma:119`) : actorId nullable (SetNull), action, entity, entityId, meta Json, index (createdAt) et (entity, entityId) — écrit par toutes les mutations, lu par RIEN (aucun findMany dans le code).
- Le JWT duplique {sub=AdminUser.id, username, role} : le rôle est figé 7 jours dans le token, un changement de rôle ou une suppression de compte en base n'a aucun effet avant expiration.
- Aucune table de session/révocation : la validité repose uniquement sur la signature + l'expiration du JWT.

**Bugs confirmés** (tous contre-vérifiés `confirmed: true`).

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| haute | Les server actions n'ont AUCUNE authentification : aucun fichier de `src/server/*` ne lit le cookie ni n'appelle verifyAdminToken (grep cookies\|requireAdmin\|session = 0 résultat), et le middleware ne vérifie que la PRÉSENCE du cookie (`middleware.ts:21-29`). Avec un cookie forgé quelconque (nurea_admin=x), toutes les mutations sont exécutables : créer/modifier/supprimer ventes, commandes, clients, encaisser, transférer la Trésorerie. | `src/server/sales/actions.ts:55` (idem `orders/actions.ts`, `orders/paymentActions.ts`, `collect/actions.ts`, `customers/actions.ts`, `pricing/actions.ts`, `treasury/actions.ts`) | Grep cookies\|requireAdmin\|verifyAdminToken\|session dans `src/server/*` = 0 résultat, createSaleAction (`src/server/sales/actions.ts:55`) écrit en base sans aucun contrôle, et `middleware.ts:21-29` ne teste que la présence du cookie avec le commentaire explicite que le JWT n'est vérifié que « côté API admin ». |
| haute | Seules deux pages RSC vérifient réellement le JWT (`CataloguePage.tsx:8-12` et `ordres/new/page.tsx:22-25`) ; toutes les autres (dashboard, compta, trésorerie, clients, lots, ordres, vendre) rendent leurs données Prisma dès que le middleware voit un cookie non vide — un cookie invalide donne accès en lecture à toute la donnée métier. | `middleware.ts:21` | Grep verifyAdminToken sur tout le repo ne le montre que dans `src/features/catalogue/pages/CataloguePage.tsx:11` et `app/admin/ordres/new/page.tsx:24` côté pages ; `app/admin/layout.tsx` ne contient ni verify ni cookie, donc tout autre écran rend ses données dès que `middleware.ts:21` voit un cookie non vide. |
| haute | Le rôle VIEWER n'est appliqué que sur les routes REST (requireEditor) et l'UI catalogue ; les écrans vendre/ordres/clients/trésorerie passent par des server actions sans contrôle de rôle et n'ont aucun mode lecture seule (grep role dans `src/features` : catalogue uniquement) — un VIEWER peut tout modifier. | `src/lib/admin/requireAdmin.ts:30` | requireEditor (`src/lib/admin/requireAdmin.ts:30`) n'est importé que par les routes `app/api/admin/*`, aucune server action de `src/server/*` ne lit le rôle (grep = 0), et 'role' dans `src/features` n'apparaît que dans les composants catalogue — un VIEWER passe donc par createSaleAction, `treasury/actions.ts`, etc. sans contrôle. |
| moyenne | Aucune déconnexion possible : la route POST `/api/admin/logout` n'est appelée par aucun composant (grep logout/déconnexion dans src et app = 0) ; la session de 7 jours n'est ni affichée ni révocable depuis l'app. | `app/api/admin/logout/route.ts:6` | `app/api/admin/logout/route.ts:6` existe mais grep 'logout\|déconne' sur tout le repo ne renvoie aucun appelant hors la route elle-même (dont le contenu ne matche même pas), et le cookie est posé pour 7 jours (`login/route.ts:69`) sans UI de révocation. |
| moyenne | Toutes les server actions écrivent l'audit avec actorId=undefined (ex. sale.create à `actions.ts:152`, order.payment.record à `paymentActions.ts:105`) : les lignes AuditLog des flux réellement utilisés n'ont pas d'auteur, et la Trésorerie n'écrit aucun audit du tout (`treasury/actions.ts`). | `src/server/sales/actions.ts:152` | Les 15 appels writeAudit de `src/server/*` passent tous undefined comme actorId (ex. `sales/actions.ts:152`, `paymentActions.ts:105`), et `src/server/treasury/actions.ts` n'importe pas writeAudit du tout (grep writeAudit = 0 dans ce fichier). |
| moyenne | Rate-limit login dans une Map en mémoire de process : inopérant en serverless (chaque instance/cold start repart de zéro) et contournable en variant l'en-tête x-forwarded-for lu tel quel (`login/route.ts:10-14`). | `src/lib/admin/loginRateLimit.ts:3` | `src/lib/admin/loginRateLimit.ts:3` est une Map au niveau module (perdue à chaque cold start / non partagée entre instances) et `app/api/admin/login/route.ts:9-14` prend le premier élément de x-forwarded-for tel que fourni par l'en-tête entrant. |
| basse | À l'installation du SW, cache.add('/admin/offline') suit les redirections : si le cookie est absent/expiré à ce moment, le middleware redirige vers `/admin/login` et c'est la page de connexion (ou un échec) qui devient le repli hors-ligne ; de plus SHELL_CACHE n'est repeuplé qu'à un changement d'octets du SW (VERSION manuelle jamais bumpée), donc le repli en cache peut référencer des bundles `/_next/static` disparus après plusieurs déploiements. | `public/admin-sw.js:29-37` | `admin-sw.js:33` fait cache.add('/admin/offline') alors que `middleware.ts:22-24` redirige cette URL vers `/admin/login` sans cookie (seul `/admin/login` est exempté, ligne 17), et VERSION='nurea-admin-v1' (`admin-sw.js:15`) fige SHELL_CACHE tant que les octets du SW ne changent pas. |
| basse | LoginForm gère des paramètres `?err=config` et `?err=session` que rien dans le code n'émet jamais (grep err=session\|err=config = 0) : messages morts, la vraie expiration de session arrive sans explication. | `src/features/auth/components/LoginForm.tsx:26` | `LoginForm.tsx:26-31` gère err=config et err=session mais grep 'err=' sur tout le repo = 0 émetteur, et la redirection d'expiration (`middleware.ts:23`) part vers `/admin/login` sans aucun paramètre. |
| basse | Le listener de message 'skip-waiting' du SW n'a aucun émetteur dans le code (grep postMessage = 0 côté admin), et skipWaiting() est déjà appelé inconditionnellement à l'install : pas de flux « nouvelle version disponible », l'utilisateur ne sait jamais qu'une mise à jour a eu lieu. | `public/admin-sw.js:50-52` | Le listener 'skip-waiting' (`admin-sw.js:50-52`) n'a aucun postMessage côté admin (les seuls postMessage du repo sont dans `Charte-graphique-Nuréa.html`, hors app), et skipWaiting() est déjà appelé inconditionnellement à l'install (`admin-sw.js:35`). |
| basse | Sur les routes non-/admin, le middleware laisse passer l'en-tête entrant x-nurea-admin-route sans le nettoyer : un client peut l'envoyer sur la vitrine et forcer la classe admin-route/enlever .dark sur le html (`app/layout.tsx:23-28`). Impact cosmétique seulement. | `middleware.ts:14-16` | Le matcher du middleware (`middleware.ts:32-34`) ne couvre que `/admin*`, donc un x-nurea-admin-route: 1 envoyé par le client sur la vitrine arrive intact à `app/layout.tsx:23-28` qui bascule alors html en admin-route-root et retire la classe dark — impact cosmétique. |
| basse | AdminLoadingProgress se déclenche APRÈS le changement de pathname (navigation déjà terminée) : la « barre de progression » est un feedback factice de 600 ms post-navigation, et son commentaire annonce 1,6 s. | `src/app-shell/AdminLoadingProgress.tsx:17-21` | `AdminLoadingProgress.tsx:17-21` déclenche la barre dans un useEffect sur pathname (donc après que la navigation a commité) pour 600 ms, alors que le commentaire ligne 9 annonce 'anime une barre 1.6s'. |
| basse | Aucun en-tête de sécurité configuré (pas de headers() dans `next.config.mjs` : ni CSP, ni HSTS, ni X-Frame-Options) pour une app qui manipule chiffre d'affaires et clients. | `next.config.mjs:21` | `next.config.mjs:21-66` n'a aucune fonction headers() (ni CSP, HSTS ou X-Frame-Options, seul poweredByHeader:false), et `vercel.json` ne contient que regions — aucun en-tête de sécurité configuré nulle part. |

**Incohérences.**

- Le commentaire du middleware (`middleware.ts:26-28`) affirme que « le contrôle JWT strict est fait côté API admin » — vrai pour les routes REST, faux pour les server actions et la quasi-totalité des pages : la doc interne décrit une protection qui n'existe pas.
- Deux registres de mutation coexistent pour les mêmes entités avec deux niveaux de sécurité : `/api/admin/sales` (requireAdmin + requireEditor + audit attribué) et createSaleAction (rien) créent la même Sale ; idem orders, customers, pricing.
- Récupération du rôle côté client hétérogène : CataloguePage l'injecte en prop RSC, `BrandForm.tsx:77` et `PerfumeForm.tsx:91` refont chacun un fetch `/api/admin/session` à l'hydratation.
- SPLASH_TARGETS est dupliqué à l'identique entre `scripts/build-admin-pwa-assets.mjs:64` et `src/lib/pwa/admin-splash.ts:15`, avec pour seule garantie un commentaire « doit rester alignée ».
- OWNER et EDITOR sont strictement équivalents partout : la hiérarchie rank existe mais aucun endpoint ni écran ne distingue les deux rôles.
- `/api/admin/health` utilise un secret séparé ADMIN_DASHBOARD_SECRET en Bearer, décrit comme « futur garde pour routes /api/admin/* » jamais concrétisé — deux mécanismes d'auth pour le même préfixe d'API.
- `docs/admin-supabase-setup.md:60` montre la création d'un compte avec un e-mail (« votre@email.com ») alors que le champ est un username libre lowercased ; la doc décrit aussi VIEWER comme « lecture seule », ce que le code n'assure que dans le catalogue.
- `app/admin/ordres/new/page.tsx` vérifie le JWT mais pas `app/admin/ordres/[id]/edit` — deux écrans du même domaine, deux niveaux de garde.

**Frictions UX.**

- Aucun moyen de se déconnecter ni de voir qui est connecté : pas d'écran compte/réglages, la route logout est orpheline — sur un téléphone partagé, la session de 7 jours est inamovible.
- Expiration de session muette : retour brutal sur `/admin/login` sans message (les libellés « Session expirée » existent dans LoginForm mais ne sont jamais déclenchés), et l'état des formulaires en cours est perdu.
- Bannière d'installation limitée à iOS Safari : aucun parcours d'installation Android/desktop (beforeinstallprompt ignoré) alors que le manifeste et les shortcuts Android existent.
- Pas de notification de mise à jour de l'app : skipWaiting immédiat + claim, la nouvelle version s'active silencieusement au prochain démarrage, sans invite de rechargement.
- Navigation hors ligne network-first sans timeout : sur réseau très dégradé (pire cas terrain), l'écran attend l'échec réseau complet avant d'afficher le repli.
- Gestion des comptes 100 % CLI : créer un vendeur ou changer un mot de passe exige un terminal et l'accès à la base — aucun parcours dans l'app.
- La barre de progression de navigation n'apparaît qu'après l'arrivée sur la page : aucun feedback pendant l'attente réelle d'une RSC lente (le vrai feedback est `app/admin/loading.tsx`).
- Le login ne propose ni « mot de passe oublié » ni révélation du mot de passe saisi.

**Dette technique.**

- Middleware présence-seule assumé comme rustine (« éviter les faux positifs de configuration edge ») : le contrôle réel a été délégué à des couches qui ne le font pas — à remplacer par une vérification JWT edge (jose fonctionne en edge) + un guard unique partagé pages/actions.
- Migration REST → server actions inachevée : les routes REST portent auth/rôles/audit, les server actions (chemin réellement utilisé par les écrans récents) n'ont rien ; ne reconduire qu'UN des deux registres, avec un wrapper d'auth obligatoire.
- AuditLog write-only : jamais affiché, actorId null sur les flux principaux, échec d'écriture avalé en console (`audit.ts:20-22`) — décider à la refonte s'il sert (et alors le lire) ou le supprimer.
- Version du SW en dur « nurea-admin-v1 », jamais dérivée du build ; listener skip-waiting mort ; le repli offline dépend d'un bump manuel qui n'arrive jamais.
- Code mort : paramètres err=config/err=session du LoginForm, route `/api/admin/logout` orpheline, `/api/admin/health` + ADMIN_DASHBOARD_SECRET vestigiels.
- `e2e/helpers/adminSession.ts` forge un JWT directement avec ADMIN_JWT_SECRET : les tests sont couplés au format interne du token — prévoir une vraie fixture de login.
- loginRateLimit en Map process-local : à remplacer par un store partagé (ou un backoff sur AdminUser) si l'app reste serverless.
- getSecret() lève à chaque appel si ADMIN_JWT_SECRET est court : le contrôle de configuration est fait à l'exécution de chaque requête plutôt qu'au démarrage.

**À préserver.**

- Hygiène du login : cookie httpOnly SameSite=Lax secure, bcrypt cost 12, hash factice sur compte inconnu pour égaliser le temps de réponse (`login/route.ts:50`), messages d'erreur indifférenciés, username normalisé — à reconduire tel quel.
- requireAdmin/requireEditor : petit guard net, uniformément appliqué sur TOUTES les routes REST `/api/admin/*` — le bon modèle à généraliser aux server actions.
- Politique du service worker exemplaire et documentée en tête de fichier : jamais d'/api/*, jamais de HTML authentifié en cache, uniquement des URL immuables versionnées par contenu — exactement la règle du CLAUDE.md.
- Enveloppe PWA iOS très soignée : 12 splash exacts par device, theme_color gris choisi pour que l'heure iOS reste lisible (raisonnement documenté), icône maskable avec safe zone, clé legacy apple-mobile-web-app-capable pour iOS < 17, le tout généré par un script sharp reproductible.
- Séparation stricte des deux registres CSS via root layout minimal + en-tête x-nurea-admin-route : la PWA admin n'embarque ni la CSS vitrine ni les polices Google.
- `navigation.ts` comme source de vérité unique (5 onglets + règles parent) avec tests unitaires, et retour dérivé de la route plutôt que de l'historique — les liens profonds (raccourcis, palette) reviennent toujours au bon parent.
- ViewportSync/--admin-vh : traitement correct du clavier iOS via visualViewport, prérequis des invariants layout 320/375/430 px.
- ServiceWorkerRegistrar : désenregistrement automatique en dev (évite les bundles périmés) et enregistrement différé après load.
- Page offline statique honnête, cohérente avec le principe « données toujours en direct ».
- LoginForm : autoComplete/enterKeyHint/autoCapitalize corrects, Suspense autour de useSearchParams respecté, gestion des réponses non-JSON.

---

### 4.8 Modèle de données (Prisma)

**Rôle.** Le schéma Prisma (PostgreSQL/Supabase) est l'unique base des deux registres de l'app : le catalogue vitrine (Brand/Perfume) et toute la gestion PWA — commandes, ventes, paiements, clients, lots fournisseur et Trésorerie. Il matérialise une compta cash-basis en EUR avec coûts d'achat en DZD figés par ligne, et sert directement les KPI du tableau de bord via agrégations SQL. C'est le point de convergence des rustines successives : caches dénormalisés, double modèle de dette, tables mortes et une refonte « v2 » déjà tentée puis retirée.

**Parcours implémentés (flux d'écriture du modèle).**

- Créer une commande (OrderForm → createOrderAction) : transaction Order + items (+ snapshot si hors-catalogue) ; si acompte initial > 0 → PaymentTransaction DEPOSIT + cache depositPaid/depositAmount + statut READY d'emblée ; upsert PerfumePricing en create-only ; aucun mouvement de Trésorerie pour cet acompte initial-là (créé seulement via recordPaymentAction).
- Encaisser sur une commande (BalancePanel → recordPaymentAction) : création PaymentTransaction → refreshOrderCache (recalcul du cache depuis le ledger) → CashMovement DEPOSIT_IN/BALANCE_IN/REFUND_OUT vers la poche choisie ou « Non attribué » → auto-transition PENDING→READY si le guard ne porte aucune réserve — quatre écritures séquentielles hors transaction.
- Changer un statut (OrderStatusControl → PATCH `/api/admin/orders/[id]`) : canTransition rend un verdict avec confirmation plutôt qu'interdiction ; CANCELLED refusé par PATCH (on passe par DELETE) ; READY exige cache depositPaid + montant > 0.
- Pointer une livraison partielle (OrderItemsFulfillment → PATCH …/fulfillment) : clamp serveur 0..quantity par ligne, refusé si vente liée ou commande annulée ; fulfillment (none/partial/full) dérivé à la lecture, jamais stocké.
- Vendre (SellPageClient → POST `/api/admin/sales`) : normalisation des lignes (coût EUR = DZD/taux), snapshot JSON hydraté serveur, remainingDue saisi par le client (plafonné au total), transaction Sale+items + Order lié → DELIVERED + décrément stock ; PUIS hors transaction : mouvements SALE_IN répartis par poche + reliquat en « Non attribué ».
- Éditer un ticket (TicketSheet → PATCH `/api/admin/sales/[id]`) : patch de lignes existantes / ajout / suppression, retotaux serveur, clamp remainingDue au nouveau total ; une baisse du reste dû crée un BALANCE_IN forcément en « Non attribué ».
- Encaisser une créance (CollectSheet → collectAction) : pour une commande, délègue au ledger (BALANCE) ; pour une vente, décrémente remainingDue (plafonné au dû) + BALANCE_IN — l'écran « Encaisser » fusionne à la lecture les deux modèles de dette (listOutstanding).
- Supprimer une vente (DELETE `/api/admin/sales/[id]`) : delete cascade des items, contre-passation des mouvements (reverseMovementsFor), restitution du stock ; la commande liée reste DELIVERED.
- Cycle éphémère : tout GET `/api/admin/orders` purge d'abord les CANCELLED (immédiat) et les DELIVERED dont le jour de livraison (deliveryAt, sinon soldAt de la vente) est passé en fuseau Europe/Paris — delete cascade items + paiements, Sale.orderId passe à null.
- Lots : rattachement libre d'orders et de sales à un Batch (PATCH batchId), dépenses ajoutées via POST …/expenses avec EXPENSE_OUT immédiat ; Marge nette du lot = ventes rattachées − coûts − dépenses, calculée à la lecture (`batches/queries`).
- Trésorerie : création/renommage/archivage de poches (la poche système est intouchable), transferts et répartition du « Non attribué » en paires TRANSFER, ajustements signés, paiement fournisseur SUPPLIER_OUT, et backfill idempotent de tout l'historique vers « Non attribué ».

**Données (modèle complet).**

- `Brand` : name/slug uniques, status (BrandVisibilityStatus), catalogMode CURATED/COMPLETE, image+imageLight bi-thème. Filtré status=PUBLISHED côté vitrine (`catalogue-service.ts`).
- `Perfume` : id Int autoincrément (seule PK numérique du schéma), slug unique + @@unique(brandId,name), isFeatured (max contrôlé en route), isPrivate (jamais écrit), stock Int décrémenté à la vente, status PublicationStatus.
- `PerfumePricing` : PK composite (perfumeId, volumeMl), mémoire serveur des prix par volume ; defaultExchangeRate Decimal(8,4) alors que les items stockent le taux en Decimal(10,2). Upsert « create only » (update:{}) dans `orders/actions.ts:107` vs vrai upsert dans `pricing/actions.ts:21`.
- `Customer` : phoneE164 unique, snapchat, whatsappE164 (utilisé : liens wa.me dans CustomerHeader/DetailClient), address, notes ; @@index(fullName) B-tree inutile pour les recherches contains/insensitive pratiquées. Aucune déduplication par nom.
- `Order` : customerId FK SetNull + customerName/customerContact dénormalisés (snapshot), depositPaid/depositAmount = CACHE du ledger (recalculé par refreshOrderCache mais aussi écrit en direct par PATCH API), deliveryAt (prévu) vs deliveredAt (mort : backfillé en migration 20260701090000, jamais écrit/lu ensuite, index [status,deliveredAt] mort), batchId SetNull. Entité éphémère : purgée J+1 après livraison.
- `OrderItem` : perfumeId nullable + perfumeSnapshot Json pour le hors-catalogue (contrat non contraint en DB), volumeMl/unitPrice/unitCost EUR + unitCostDzd/exchangeRate DZD, isGift, deliveredQuantity (livraison partielle), note.
- `PaymentTransaction` : ledger DEPOSIT/BALANCE/REFUND, montants positifs (le type porte le sens), recordedById jamais renseigné (mort), cascade avec Order → l'historique paiements meurt avec la commande purgée.
- `Sale` : orderId unique SetNull, customerId + customerName/customerContact dénormalisés (mêmes trois champs que Order), totalRevenue/totalCost/totalMargin dénormalisés recalculés serveur, remainingDue marqué « legacy » mais en réalité pivot actif de tout le cash-basis (KPI, encaisser, batches, export CSV, tickets), batchId, soldAt indexé.
- `SaleItem` : miroir structurel d'OrderItem (mêmes colonnes prix/coût/devise/isGift/volume) + lineRevenue/lineCost/lineMargin figés et perfumeSnapshot Json OBLIGATOIRE lu en SQL brut (->>'name') par les KPI ; la DB porte une colonne note absente du schema.prisma (drift constaté par la migration retire_gestion_v2).
- `Batch`/`BatchExpense` : lot fournisseur libre rattaché aux Orders ET aux Sales (SetNull), dépenses Cascade avec countInCompta jamais écrit ni filtré (les KPI somment tout).
- `Pocket`/`CashMovement` : solde = openingBalance + Σ amounts signés ; kinds typés (OPENING/SALE_IN/DEPOSIT_IN/BALANCE_IN/REFUND_OUT/EXPENSE_OUT/SUPPLIER_OUT/TRANSFER/ADJUSTMENT), poche système UNASSIGNED unique, transferts appariés transferGroupId, lien souple refType/refId sans FK (source des orphelins) ; pas d'index occurredAt malgré le tri par date.
- `AdminUser`/`AuditLog` : rôles OWNER/EDITOR/VIEWER (hiérarchie dans requireAdmin) ; AuditLog écrit partout (writeAudit) mais jamais lu par aucun écran — table et index write-only ; actorId null sur tous les chemins server-actions.
- `ExternalImportSuggestion` et `AppSetting` : tables mortes — la première n'a aucun usage code, la seconde n'est écrite que par seed-migrate (exchangeRateDzdEur=277) et jamais lue, le taux courant vivant en localStorage (useLastExchangeRate).
- Monnaie : EUR = devise comptable (Decimal(10,2) partout), DZD = devise d'achat conservée par ligne (unitCostDzd + exchangeRate) avec conversion unitCost = dzd/taux figée à l'écriture ; les routes API convertissent via Number() (float) là où actions et domaine utilisent decimal.js-light.
- Migrations : 20 dossiers de 2026-03 à 2026-09 racontant l'histoire — gestion (04), remainingDue (04), admin v2 Customer/Payments/Pricing (05), batches (05), deliveredQuantity (06), trésorerie/pockets (06), stock (06), deliveredAt + purge orphelins + countInCompta (07), retrait de la refonte « gestion v2 » jamais fusionnée (09) : une première tentative de refonte (tables Ecriture/Ligne/Commande/Lot/Poche) a déjà été abandonnée.

**Bugs relevés** (audit sans champ de contre-vérification individuel ; la localisation vaut preuve ; plusieurs sont recoupés en §4.2 et §4.4).

| Sévérité | Description | Fichier |
|---|---|---|
| haute | Purge J+1 : les commandes DELIVERED sont hard-delete le lendemain (GET `/api/admin/orders` déclenche purgeEphemeralOrders), cascade sur PaymentTransaction → l'Encaissé des commandes sans vente disparaît des KPI (confirmedOrdersFinancials) et une créance non soldée disparaît de « Encaisser ». Les CashMovement liés deviennent orphelins (lien souple refType/refId sans FK). | `src/lib/gestion/orderPurge.ts:29` |
| haute | DELETE `/api/admin/orders/[id]` supprime la commande sans contre-passer les mouvements de Trésorerie de ses paiements (reverseMovementsFor jamais appelé, contrairement au DELETE vente) → argent fantôme dans les poches. La migration 20260701120000 a déjà dû purger ces orphelins une fois ; le code recrée le problème. | `app/api/admin/orders/[id]/route.ts:408` |
| haute | updateOrderAction remplace les items par deleteMany+createMany ; deliveredQuantity (défaut 0) n'est jamais recopié → toute édition d'une commande réinitialise silencieusement le suivi de livraison partielle (OrderForm envoie toujours items en mode edit). | `src/server/orders/actions.ts:167` |
| haute | PATCH `/api/admin/sales/[id]` : modifier les lignes change totalRevenue donc l'« Encaissé » (total − remainingDue) sans créer aucun CashMovement ; le clamp l.386-388 réécrit remainingDue silencieusement. Compta et Trésorerie divergent à chaque édition de ticket. | `app/api/admin/sales/[id]/route.ts:370` |
| moyenne | Ré-augmenter remainingDue (dé-encaisser) ne crée aucun mouvement négatif : seul collected > 0 est traité → la Trésorerie reste surévaluée. | `app/api/admin/sales/[id]/route.ts:408` |
| moyenne | PATCH `/api/admin/orders/[id]` écrit depositPaid/depositAmount directement sans PaymentTransaction ni CashMovement, alors que le schéma déclare le ledger « source de vérité » ; le prochain recordPaymentAction recalcule le cache depuis le ledger et écrase la saisie (refreshOrderCache). | `app/api/admin/orders/[id]/route.ts:141` |
| moyenne | POST `/api/admin/sales` crée les CashMovement hors transaction après la vente (crash → vente sans trace Trésorerie) et ne plafonne pas la somme des payments à l'Encaissé : une répartition qui dépasse cashed est enregistrée telle quelle. | `app/api/admin/sales/route.ts:388` |
| moyenne | Stock : décrémenté à la création de vente (sans plancher, négatif possible) et restitué au DELETE, mais jamais ajusté quand PATCH modifie quantités, ajoute (newItems) ou supprime (removeItemIds) des lignes → dérive du stock. | `app/api/admin/sales/route.ts:379` |
| moyenne | Perfume.isPrivate est documenté « exclu du catalogue public » mais la requête vitrine ne filtre que status PUBLISHED, pas isPrivate ; par ailleurs aucun écran ni route ne permet d'écrire ce champ (latent tant qu'il reste false). *(Confirmé en §5.)* | `src/lib/catalogue-service.ts:81` |
| basse | backfillTreasuryAction importe toutes les BatchExpense en EXPENSE_OUT sans respecter countInCompta, dont le contrat schéma est « SANS mouvement de trésorerie » quand false. | `src/server/treasury/actions.ts:226` |
| basse | DELETE d'une vente liée à une commande ne rebascule pas la commande (reste DELIVERED sans vente), contrairement au deleteSaleAction mort qui remettait READY — la commande purgée J+1 emporte alors ses paiements. | `app/api/admin/sales/[id]/route.ts:460` |
| basse | voidPaymentAction : le commentaire promet « REFUND inverse + delete original » mais l'original n'est jamais supprimé, et la $transaction n'enveloppe qu'une seule écriture (le reverse Trésorerie et le refresh cache sont hors transaction). | `src/server/orders/paymentActions.ts:138` |
| basse | createSaleAction/recordPaymentAction : suites d'écritures hors transaction (payment → cache → mouvement → statut) ; un échec au milieu laisse cache et Trésorerie incohérents. | `src/server/orders/paymentActions.ts:52` |

**Incohérences.**

- Deux surfaces de mutation concurrentes pour les mêmes tables : Server Actions (`src/server/orders`, collect, treasury) ET routes REST (`app/api/admin/*`) — la création de commande API écrit depositPaid sans PaymentTransaction ni mouvement (`app/api/admin/orders/route.ts:248`) là où createOrderAction crée le ledger (`orders/actions.ts:86`).
- `src/server/sales/actions.ts` (354 lignes : create/update/delete vente) est du code mort jamais importé, à la logique divergente du chemin vivant : pas de stock, pas de Trésorerie, pas de remainingDue, remise READY au delete, snapshot {id,…} au lieu de {perfumeId,…}.
- Deux modèles de dette co-existants : commandes = ledger PaymentTransaction, ventes = scalaire Sale.remainingDue ; le commentaire schéma le dit « legacy, remplacé en P6 » alors qu'il est le mécanisme actif de tout le cash-basis (`kpi/queries.ts:29`, collect, batches, export).
- perfumeSnapshot Json non typé avec trois formes en base : {perfumeId,name,brandName,image,volumeMl} (route ventes), {name,brandName,image} (commandes), {id,name,image,brandName} (action morte) — lu en SQL brut ->>'name' par les KPI.
- Duplication structurelle OrderItem/SaleItem (mêmes colonnes prix/coût/DZD/taux/isGift/volume) et duplication du trio client (customerId + customerName + customerContact) sur Order ET Sale : deux tables pour « ligne vendue », deux snapshots client à réconcilier partout (customer?.fullName ?? customerName ?? 'Anonyme' répété dans 6 fichiers).
- Deux enums identiques PublicationStatus et BrandVisibilityStatus (DRAFT/PUBLISHED, ordre inversé).
- Précision du taux de change incohérente : Decimal(8,4) dans PerfumePricing.defaultExchangeRate, Decimal(10,2) sur OrderItem/SaleItem.exchangeRate ; conversions monétaires en Number() (float) dans les routes API contre decimal.js-light dans actions et domaine.
- La « mémoire prix » apprend différemment selon le chemin : upsert avec update:{} (ne se met jamais à jour) dans `orders/actions.ts:107` vs vrai upsert écrasant dans `pricing/actions.ts:21` ; le taux par défaut vit en localStorage (useLastExchangeRate) et non dans AppSetting prévu pour ça.
- Attribution des écritures incohérente : les routes API passent ctx.sub à writeAudit et createdById, toutes les server actions passent undefined → AuditLog.actorId et CashMovement.createdById nuls selon le chemin emprunté.
- Le doc de `src/domain/order-status.ts:20` affirme que changer un statut « ne supprime aucun paiement » — passer en DELIVERED déclenche pourtant la purge J+1 qui cascade sur PaymentTransaction.

**Frictions UX (conséquences visibles du modèle).**

- La purge J+1 fait disparaître toute commande livrée de l'app le lendemain : impossible de rouvrir une fiche pour vérifier ou corriger, l'historique ne subsiste que si une vente a été créée.
- Une commande livrée mais non soldée disparaît de « Encaisser » à la purge — la dette du client s'efface silencieusement, sans aucun écran pour la retrouver.
- Le reste dû d'une vente se corrige en champ texte libre (TicketPayment) au lieu de découler d'encaissements enregistrés : pas d'historique montant/date/moyen par vente, l'argent file en « Non attribué » sans qu'on demande la poche.
- Éditer une commande réinitialise les quantités livrées à zéro sans aucun avertissement — l'utilisateur repointe sa livraison partielle sans comprendre pourquoi.
- Tout encaissement saisi sans poche atterrit dans « Non attribué » à re-répartir plus tard : une étape de rangement supplémentaire récurrente sur mobile.
- AuditLog est alimenté à chaque mutation mais aucun écran ne l'affiche : zéro traçabilité visible pour l'utilisateur (qui a changé quoi), alors que le coût d'écriture est payé partout.
- Le champ WhatsApp est toujours saisi et affiché côté admin (CustomerForm, liens wa.me) alors que la vitrine vient de retirer WhatsApp au profit de Snapchat seul (commit f84b6ed) — vocabulaire de contact divergent entre registres.

**Dette technique.**

- Tables mortes : `ExternalImportSuggestion` (zéro usage code, pas d'index, reviewedById sans relation) et `AppSetting` (écrite une fois par seed-migrate, jamais lue — supplantée par localStorage).
- Champs morts : `Order.deliveredAt` (backfillé par migration + index [status,deliveredAt], jamais écrit ni lu — la purge utilise deliveryAt), `PaymentTransaction.recordedById` (jamais renseigné), `BatchExpense.countInCompta` (jamais écrit ni filtré, doc de schéma mensongère), `Perfume.isPrivate` (aucun chemin d'écriture).
- Fichier entier mort : `src/server/sales/actions.ts` (create/update/delete vente + _computeSaleTotals testé) — 354 lignes qui divergent du chemin réel et piègeront toute lecture future.
- Drift schéma/DB : la base porte une colonne SaleItem.note absente de schema.prisma (attestée par le commentaire de la migration 20260901120000) — donnée inaccessible à Prisma, diff automatique piégé.
- Une refonte a déjà été tentée et abandonnée : la migration `20260831210000_gestion_v2` (tables françaises Ecriture/Ligne/Commande/Lot/Poche/DepenseLot, copie des données) créée sur branche jamais fusionnée puis droppée en `20260901120000` — la nouvelle refonte doit expliquer pourquoi elle réussira là où la v2 a échoué.
- Le lien souple CashMovement.refType/refId sans FK a déjà nécessité une migration réparatrice (20260701120000 purge des orphelins) et le code recrée des orphelins (DELETE commande, purge J+1) — rustine sur rustine.
- Caches dénormalisés Order.depositPaid/depositAmount : trois écrivains concurrents (création action, refreshOrderCache, PATCH API en direct) pour un champ dont la seule utilité de lecture est un filtre API `?depositPaid=` ; les écrans recalculent depuis le ledger.
- Parsing monétaire artisanal dupliqué dans chaque route (String(x).replace(',', '.'), Number(), parseMoneyField, parseOptionalMoneyToZero, parseAmount) — cinq variantes du même besoin, en float.
- Index douteux : AuditLog doublement indexé mais jamais lu ; @@index([depositPaid]) sur booléen à faible cardinalité ; @@index([fullName]) et les recherches contains/insensitive (Order.customerName, Sale.customerName sans index) que le B-tree ne sert pas — il faudrait pg_trgm ou une recherche dédiée.
- Aucune contrainte DB sur les invariants énoncés en commentaire : perfumeSnapshot obligatoire si perfumeId null (OrderItem), montants ≥ 0, volumes ∈ {30,50,100}, remainingDue ≤ totalRevenue — tout est garde applicative, contournable par la moitié des chemins.
- Un MCD propre ferait : une seule entité Document de vente (la commande devient une vente livrée, pas deux tables), un ledger unique Paiement rattaché au document (remainingDue devient une vue), un snapshot typé (colonnes name/brandName/image plutôt que Json), l'archivage par flag/date au lieu du hard-delete, une FK réelle des mouvements vers leur origine, et EUR/DZD portés par un type Money explicite.

**À préserver.**

- Le ledger PaymentTransaction : types DEPOSIT/BALANCE/REFUND avec montants toujours positifs (le type porte le sens), annulation par contre-écriture — le bon modèle, à généraliser aux ventes dans la refonte.
- La Trésorerie est le sous-modèle le mieux conçu : signedAmount centralisé et testé, poche système « Non attribué » jamais bloquante (conservation : tout Encaissé est tracé), transferts appariés par transferGroupId, solde = openingBalance + Σ mouvements.
- La machine à états commande vit en domaine pur (`src/domain/order-status.ts`), testée, avec une philosophie documentée remarquable : « on n'interdit que ce qui casserait les données, tout le reste se confirme » ; deriveFulfillment idem.
- Les snapshots figés de SaleItem (prix, coût, marge par ligne + perfumeSnapshot) rendent la compta immuable face aux changements de catalogue ; tous les totaux sont recalculés serveur depuis DZD/taux, jamais de confiance dans le unitCost client.
- Argent en Decimal(10,2) DB + decimal.js-light dans le domaine et les actions, montants transportés en string vers le client — la discipline est là où elle compte.
- KPI agrégés en base en un aller-retour (COUNT FILTER, groupBy, CTE), sous unstable_cache tagué + react.cache, avec commentaires chiffrant la latence économisée (140 ms/aller-retour).
- PerfumePricing en PK composite (perfumeId, volumeMl) : normalisation simple et juste, qui a remplacé un localStorage.
- Idempotence pensée : ensureUnassignedPocket, backfill Trésorerie par Set refType:refId, seed-migrate rejouable ; migrations écrites à la main avec des commentaires d'intention exemplaires (retire_gestion_v2 refuse de mélanger retrait volontaire et suggestion d'outil).
- Les onDelete sont globalement bien choisis : Cascade parent→lignes, SetNull pour toute référence historique (perfume, customer, batch, actor) — l'historique survit aux suppressions du référentiel.
- Le chemin DELETE vente est complet et cohérent : suppression cascade, contre-passation Trésorerie, restitution du stock — la preuve que l'équipe sait fermer une boucle quand elle la voit.

---

### 4.9 Calculs financiers (transversal)

**Rôle.** Couche transversale qui calcule tout l'argent de l'app : soldes de commandes (total/payé/dû via PaymentTransaction), totaux figés des ventes (CA/coût/marge avec conversion DZD→EUR), agrégats compta des commandes confirmées, Trésorerie par poches (CashMovement signés) et KPIs cash-basis du tableau de bord. Elle maintient deux registres parallèles — compta (Sale/PaymentTransaction) et Trésorerie (CashMovement) — couplés par des écritures applicatives jamais atomiques, ce qui est la source principale des divergences relevées.

**Parcours implémentés (flux d'argent).**

- Acompte sur commande : fiche commande → BalancePanel → recordPaymentAction(type, montant, poche) → création PaymentTransaction → recalcul du cache depositPaid/depositAmount → mouvement de poche → si 1er DEPOSIT et guard sans réserve, PENDING→READY → revalidations de tags ; 4 écritures séquentielles hors transaction.
- Vente terrain : `/admin/vendre` (SellPageClient) → POST `/api/admin/sales` avec lignes (isGift force unitPrice "0" côté client), remainingDue saisi et payments[] par poche → $transaction(Sale+items+Order→DELIVERED+décrément stock) → PUIS mouvements SALE_IN hors transaction, reliquat non ventilé vers « Non attribué ».
- Encaisser une créance : `/admin/encaisser` (listOutstanding fusionne Sale.remainingDue>0 et commandes READY/DELIVERED sans vente partiellement payées, plus anciennes d'abord) → CollectSheet → collectAction plafonné au dû → maj remainingDue puis BALANCE_IN (deux écritures séparées).
- Corriger un ticket : compta → TicketSheet → PATCH `/api/admin/sales/[id]` → $transaction(lignes+totaux+clamp remainingDue) → après la transaction, si le reste dû a baissé, mouvement BALANCE_IN dans « Non attribué » (pas de choix de poche).
- Annuler un paiement : BalancePanel → voidPaymentAction → REFUND compensateur créé (l'original N'EST PAS supprimé malgré le commentaire) → suppression du mouvement d'origine → refresh cache commande.
- Supprimer une vente : compta → DELETE `/api/admin/sales/[id]` → delete Sale → reverse des mouvements refType Sale → restitution stock ligne par ligne ; la commande liée ne repasse pas en READY sur ce chemin (contrairement à deleteSaleAction, mort).
- Dépense de lot : fiche lot → POST expenses (label, montant, poche) → BatchExpense puis EXPENSE_OUT ; suppression → delete puis reverse.
- Trésorerie : `/admin/tresorerie` → transferts entre poches, répartition du solde « Non attribué » vers une poche réelle, ajustements manuels signés, paiement fournisseur ; backfill one-shot de l'historique vers « Non attribué ».
- Création de commande avec acompte : OrderForm → createOrderAction → $transaction(Order+PaymentTransaction DEPOSIT+PerfumePricing) — aucun mouvement de Trésorerie n'est créé pour cet acompte initial.
- Tableau de bord : revenueSummary (ventes agrégées + confirmedOrdersFinancials) + monthSummary + pipelineCounts + tops, servis depuis les caches 30-60 s invalidés par tags.

**Données touchées.**

- `PaymentTransaction` : type DEPOSIT/BALANCE/REFUND, montant toujours positif, direction portée par le type ; source déclarée de vérité des paiements de commande, cascade-delete avec l'Order.
- `Order.depositPaid` / `depositAmount` : caches dénormalisés (ΣDEPOSIT−ΣREFUND) recalculés par refreshOrderCache (`paymentActions.ts:16`) mais AUSSI écrits directement, sans paiement ni mouvement, par POST/PATCH `/api/admin/orders` — trois écrivains aux règles différentes.
- `Sale.totalRevenue/totalCost/totalMargin` : snapshots figés à la création/édition, jamais recalculés à la lecture ; `Sale.remainingDue` : commenté « legacy » dans le schéma (`prisma/schema.prisma:292-295`) mais en réalité pivot de TOUT le cash-basis ventes (KPI, lots, encaisser, backfill).
- `SaleItem` : lineRevenue/lineCost/lineMargin figés Decimal(10,2), unitCostDzd + exchangeRate Decimal(10,2) conservés pour recalcul, perfumeSnapshot JSON, isGift ; OrderItem idem avec unitCost € dérivé de DZD/taux arrondi à 2 décimales au stockage.
- `CashMovement` : montant signé, kind (OPENING/SALE_IN/DEPOSIT_IN/BALANCE_IN/REFUND_OUT/EXPENSE_OUT/SUPPLIER_OUT/TRANSFER/ADJUSTMENT), ref souple refType/refId SANS contrainte FK (les origines peuvent disparaître), transferGroupId pour lier les 2 jambes d'un transfert.
- `Pocket` : solde jamais stocké, toujours openingBalance + Σ(movements.amount) ; poche système UNASSIGNED unique, créée à la volée, non modifiable.
- `BatchExpense` : montant positif, countInCompta documenté « non déduit si false » mais jamais lu ni écrit par le code (champ mort) ; Batch relie ventes + commandes + dépenses pour la marge par lot.
- Conversion DZD→EUR : unitCost € = unitCostDzd / exchangeRate, implémentée 3 fois (computeLine `sales/actions.ts:27` en Decimal, resolveUnitCostEur `orderLineValidation.ts:35` en float, lineUnitCostEur `orders/actions.ts:13` en Decimal arrondi) + une 4e version morte dans `domain/money.ts`.

**Bugs relevés** (audit sans champ de contre-vérification individuel ; la localisation vaut preuve ; les recoupements avec §4.1–4.4 sont nombreux).

| Sévérité | Description | Fichier |
|---|---|---|
| haute | L'acompte initial d'une commande crée la PaymentTransaction mais aucun CashMovement — c'est le chemin principal (OrderForm) : la Trésorerie est fausse dès qu'une commande naît avec acompte, jusqu'à un éventuel backfill manuel. | `src/server/orders/actions.ts:86` |
| haute | DELETE commande : les PaymentTransaction partent en cascade mais leurs CashMovements ne sont jamais reversés — mouvements orphelins, la Trésorerie garde l'argent d'une commande disparue de la compta. | `app/api/admin/orders/[id]/route.ts:408` |
| haute | POST `/api/admin/orders` (:248) et PATCH (:141-163) écrivent depositPaid/depositAmount directement, sans PaymentTransaction ni mouvement : la compta (calculée sur payments) et la Trésorerie ne voient jamais ces acomptes ; le prochain refreshOrderCache les écrase. | `app/api/admin/orders/route.ts:248` |
| haute | Couplage compta/Trésorerie jamais atomique : recordPaymentAction (`paymentActions.ts:53-76`), collectAction vente (`collect/actions.ts:78-90`), POST sales (`route.ts:316` puis 388), PATCH sales (:214 puis 408), POST expense (:71 puis 82), DELETE sale (:460-470) écrivent la mutation puis le mouvement en appels séparés — une erreur au milieu laisse un registre sans l'autre, alors que `movements.ts` accepte un TransactionClient jamais utilisé. | `src/server/orders/paymentActions.ts:53` |
| moyenne | La ventilation payments[] d'une vente n'est pas plafonnée à l'Encaissé : attribuer 100 € de poches sur une vente encaissée 50 € enregistre 100 € de SALE_IN (le reliquat négatif est ignoré) — Trésorerie > compta. | `app/api/admin/sales/route.ts:390` |
| moyenne | Remonter le remainingDue d'une vente (correction de saisie) ne retire rien de la Trésorerie : seule la baisse crée un mouvement (:412), la hausse laisse l'argent fantôme en poche. | `app/api/admin/sales/[id]/route.ts:408` |
| moyenne | refreshOrderCache calcule depositAmount = ΣDEPOSIT − ΣREFUND : annuler un paiement BALANCE crée un REFUND qui s'impute sur l'acompte — depositPaid retombe à false alors que l'acompte est bien payé. | `src/server/orders/paymentActions.ts:19` |
| moyenne | recordPaymentAction ne vérifie pas qu'une vente existe déjà sur la commande : payer une commande DELIVERED finalisée encaisse côté commande alors que la dette vit dans Sale.remainingDue — la créance reste affichée dans `/admin/encaisser` et l'argent est compté en Trésorerie. | `src/server/orders/paymentActions.ts:43` |
| moyenne | BatchExpense.countInCompta (`schema.prisma:341`) n'est lu nulle part : les dépenses « informatives » sont déduites de la Marge nette dans les KPIs (`kpi/queries.ts:59`) et les lots (`batches/queries.ts:168`), contrairement au contrat documenté du schéma. | `src/server/kpi/queries.ts:59` |
| moyenne | cancelOrderAction annule sans traiter les paiements existants, puis recordPaymentAction refuse TOUT paiement (REFUND compris) sur une commande CANCELLED (:48-50) : impossible de rembourser proprement, l'argent reste en Trésorerie et disparaît de la compta (CANCELLED hors périmètre confirmedOrdersFinancials). | `src/server/orders/actions.ts:224` |
| moyenne | voidPaymentAction : le commentaire dit « REFUND inverse + delete original » mais l'original n'est jamais supprimé ; le REFUND compensateur n'a aucun mouvement et reverseMovementsFor efface l'entrée d'origine — solde de poche correct mais historique de poche amputé des deux opérations. | `src/server/orders/paymentActions.ts:138` |
| basse | pipelineCounts.dueAmount = Σtotaux − Σpayés sans clamp par commande : une commande surpayée réduit le dû global des autres — incohérent avec orderComptaMath qui clampe à 0 par commande. | `src/server/kpi/queries.ts:389` |
| basse | orderComptaMath absorbe silencieusement un surpaiement (Encaissé plafonné, dû 0) : l'excédent encaissé en Trésorerie n'apparaît dans aucun total compta. | `src/server/orders/financials.ts:57` |
| basse | monthSummary attribue (totalRevenue − remainingDue) au mois du soldAt : un encaissement de ce mois sur une vieille vente gonfle rétroactivement le mois passé et manque au mois courant. | `src/server/kpi/queries.ts:130` |
| basse | PATCH vente combinant remainingDue ET lignes : le clamp (:386) lit existing.remainingDue (valeur d'avant requête) et peut écraser le remainingDue demandé dans la même requête. | `app/api/admin/sales/[id]/route.ts:379` |
| basse | POST sale ne revalide que treasury/perfumes (:430-432) et PATCH sale ne revalide aucun tag : les caches KPI/compta (unstable_cache tags sales/kpi) restent périmés jusqu'à 60 s après une vente ou une correction. | `app/api/admin/sales/route.ts:430` |
| basse | Même marchandise, deux coûts : en commande unitCost est arrondi à 2 déc. puis ×qty (30000/277→108,30×2=216,60) ; en vente lineCost = coût flottant ×qty arrondi en base (216,61) — 1 centime d'écart entre écrans pour la même ligne. | `src/lib/gestion/orderLineValidation.ts:50` |
| basse | isGift n'est contraint qu'en UI (`SellLineRow.tsx:98` force unitPrice "0") : les routes acceptent isGift=true avec prix > 0, comptant à la fois un don et du CA. | `app/api/admin/sales/route.ts:227` |

**Incohérences.**

- La somme des paiements (DEPOSIT+BALANCE−REFUND) est réimplémentée au moins 6 fois avec des clamps différents : sumPaid (`financials.ts:30`), computeBalance (`domain/balance.ts:45`), sumPayments (`orders/queries.ts:70`), boucles inline dans `collect/queries.ts:102`, `batches/queries.ts:158/272/331`, et le SQL de pipelineCounts (`kpi/queries.ts:398`).
- Trois sémantiques de « dû » coexistent : computeBalance.due peut être négatif, orderComptaMath.due est clampé ≥0, le dueAmount SQL du dashboard n'est pas clampé par commande — le même chiffre « À encaisser » diffère selon l'écran.
- Trois arithmétiques monétaires : decimal.js-light (server actions, financials, kpi), Prisma.Decimal (routes API, movements) et float Number() (resolveUnitCostEur, remainingDue, ventilation Encaissé) — les arrondis divergent au centime près selon le chemin.
- Deux chemins de création de vente aux règles opposées : createSaleAction (mort — ni stock, ni mouvement, ni remainingDue) vs POST `/api/admin/sales` (vivant) ; deux suppressions aux effets différents : deleteSaleAction remet l'Order en READY sans toucher Trésorerie/stock, DELETE API fait Trésorerie+stock sans toucher l'Order.
- Deux chemins de création de commande : server action (PaymentTransaction pour l'acompte, sans mouvement) vs route API legacy (cache dénormalisé seul, sans PaymentTransaction) — trois représentations d'un acompte (cache, transaction, mouvement) jamais alignées.
- dailyRevenue trace le facturé (totalRevenue) alors que toutes les tuiles affichent de l'Encaissé — le graphe et les KPIs du même écran ne racontent pas le même chiffre ; topCustomers compte des ventes dans un champ nommé ordersCount.
- topPerfumes exclut totalement des stats les parfums dépubliés/privés (WHERE status='PUBLISHED' AND isPrivate=false) au lieu de retomber sur le snapshot : des ventes réelles disparaissent du classement quand le catalogue change.
- Le schéma documente Sale.remainingDue comme « legacy, remplacé par PaymentTransaction en P6 » : la migration n'a jamais eu lieu, ce champ est le pivot du cash-basis ventes — la doc décrit une architecture qui n'existe pas.
- Les encaissements ultérieurs d'une vente sont typés BALANCE_IN sous refType « Sale » tandis que la création est SALE_IN : le kind seul ne distingue pas un solde de vente d'un solde de commande, et le libellé « Solde vente » est reconstruit à la main à 2 endroits (`collect/actions.ts:87`, `sales/[id]/route.ts:417`).
- L'epsilon d'arrondi 0,005 est un littéral répété (`collect/queries.ts:39`, sales route :389/:409, sales/[id] :412) au lieu d'une constante partagée.

**Frictions UX.**

- Aucun écran de rapprochement compta/Trésorerie : toutes les divergences décrites (acompte sans mouvement, mouvement orphelin, ventilation excédentaire) sont invisibles pour l'utilisateur jusqu'à ce que les totaux « ne collent plus ».
- À la création d'une vente, l'Encaissé se déduit d'un « reste à payer » saisi à la main : champ vide = 0 = « tout encaissé » silencieux, l'inversion mentale (saisir ce qui manque plutôt que ce qu'on a reçu) favorise les créances fantômes.
- Un échec de Trésorerie après une vente réussie n'est pas signalé : le POST répond succès une fois la $transaction commitée, les mouvements ratés en aval sont perdus sans toast ni retry.
- Impossible de rembourser une commande annulée depuis sa fiche (blocage CANCELLED) : l'utilisateur doit bricoler un ajustement manuel de poche sans lien avec la commande, hors de tout historique client.
- La correction du reste dû depuis le ticket envoie l'argent d'office en « Non attribué » sans proposer de poche : chaque correction crée du travail de répartition différé dans la Trésorerie.
- Les caches 30-60 s sans revalidation systématique côté ventes font qu'après « Vendre », le tableau de bord peut afficher l'ancien Encaissé — sur mobile terrain, cela ressemble à une vente perdue.

**Dette technique.**

- `src/server/sales/actions.ts` est mort : createSaleAction/updateSaleAction/deleteSaleAction ne sont importés nulle part ; seul _computeSaleTotals est consommé… par son propre test — la couverture éprouve la math du chemin abandonné, pas celle du chemin vivant (computeLineTotals + resolveUnitCostEur, non testés).
- `src/domain/money.ts` : abstraction Money complète (types brandés, dzdToEur, add/sub, tests dédiés) jamais importée par le code de prod — la conversion DZD→EUR vit en 3 copies ailleurs ; à adopter ou supprimer, pas garder à côté.
- BatchExpense.countInCompta : migration dédiée (20260701140000) + doc schéma, zéro lecture/écriture — champ mort au comportement documenté mais inexistant.
- POST `/api/admin/orders` : chemin de création legacy (cache dénormalisé seul) qui n'est plus appelé par `src/features` mais reste servi et divergent — à supprimer, pas à reconduire.
- Order.depositPaid/depositAmount : cache dénormalisé à trois écrivains contradictoires ; la refonte doit choisir UNE source (PaymentTransaction) et dériver le reste.
- backfillTreasuryAction : rustine de migration one-shot devenue action permanente ; ignore les commandes PENDING et CANCELLED, importe tout en « Non attribué » — symptôme du couplage non transactionnel qu'elle rafistole.
- Clé de cache versionnée à la main (« kpi-revenue-summary-cash-v4 ») : quatre changements de sémantique encaissée dans le suffixe, signe que la définition des KPIs n'a jamais été stabilisée.
- `movements.ts` est prêt pour l'atomicité (paramètre Db = TransactionClient) mais aucun appelant ne le passe : l'infrastructure du bon design existe, elle n'a juste jamais été branchée.
- voidPaymentAction : $transaction inutile autour d'un unique create + commentaire décrivant une suppression qui n'existe pas — code et doc localement mensongers.
- Tests serveur : 3 fichiers ciblant uniquement des fonctions pures (signedAmount, orderComptaMath, _computeSaleTotals mort) ; zéro test sur le couplage mutation↔mouvement, refreshOrderCache, la ventilation par poches, le backfill ou les agrégats KPI — précisément les endroits où vivent les bugs relevés.

**À préserver.**

- Le noyau mathématique est pur, isolé et testé : computeBalance (`domain/balance.ts`), orderComptaMath (`financials.ts`) et signedAmount (`movements.ts`) prennent des données brutes et rendent des chaînes à 2 décimales, sans Prisma — ce modèle « math pure + tests » est exactement ce qu'il faut généraliser.
- Le principe cash-basis est cohérent et assumé partout : Encaissé réel, coût sunk, marge = Encaissé − coût − dépenses, dû exposé à part — documenté en tête de `kpi/queries.ts:27-36` avec le vocabulaire imposé (Encaissé / À encaisser / Marge nette / Trésorerie).
- L'anti double comptage ventes/commandes est explicite et reproduit à l'identique (status READY/DELIVERED + `sale: null`) dans la compta, l'encaissement et les lots, avec commentaires expliquant pourquoi.
- La poche « Non attribué » est une vraie bonne idée : aucun encaissement n'est jamais bloqué par l'absence de choix de poche, la conservation de l'argent prime, le reliquat non ventilé est auto-tracé (sales route :407-420) et se répartit plus tard.
- Les snapshots figés des lignes (prix, coût, DZD, taux, perfumeSnapshot JSON) rendent l'historique immuable face aux changements de catalogue — les tops retombent sur le snapshot pour les lignes hors catalogue.
- transfer() écrit les deux jambes en un seul createMany atomique lié par transferGroupId — le seul endroit du domaine où l'écriture double est réellement insécable.
- listOutstanding unifie les deux modèles de dette (Sale.remainingDue et commandes partiellement payées) en une seule action d'encaissement plafonnée au dû, triée par ancienneté — le commentaire (`collect/queries.ts:5-15`) raconte honnêtement le problème résolu.
- La performance est travaillée et surtout expliquée : agrégats SQL en un aller-retour (FILTER, monthSummary), unstable_cache par tags + react.cache par rendu, anti-N+1 par résolution batch dans listMovements, avec commentaires chiffrés (~140 ms/aller-retour) qui justifient chaque choix.
- Les gardes serveur sont systématiques sur les routes vivantes : montants ≥ 0, remainingDue ≤ total, volumes 30/50/100, encaissement plafonné au dû, epsilon d'arrondi — la validation ne fait jamais confiance au client pour les totaux.
- L'auto-transition PENDING→READY refuse d'avaler une réserve du guard (`paymentActions.ts:90-99`) : le commentaire sur « une transition automatique n'a personne à qui montrer un avertissement » est un raisonnement produit à conserver tel quel.
- reverseMovementsFor offre une réversibilité uniforme par référence souple, réutilisée à l'identique pour ventes, dépenses et paiements annulés.

### 4.10 Clients

**Rôle.** Référentiel des acheteurs (coordonnées, notes) qui alimente l'autocomplete des formulaires commande/vente, l'ardoise (« À encaisser ») et le fallback de nom partout où une commande ou une vente s'affiche. Domaine périphérique dans le shell : pas d'onglet propre, rattaché à Accueil (`src/app-shell/navigation.ts:35-42`), accessible par raccourci dashboard et palette de commandes.

**Parcours implémentés.**

- Liste : Accueil → raccourci « Clients » (ShortcutsBlock) ou palette → liste alphabétique sectionnée A–Z (tri client `localeCompare` fr), recherche débouncée 200 ms poussée dans l'URL (`?q=`, nom/téléphone/snap), badge « X € dû » par ligne, pagination cursor « Charger plus » (pages de 100).
- Créer : bouton « Nouveau » dans l'en-tête (anti-FAB documenté) ou palette « Nouveau client » → formulaire (nom seul requis ; téléphone/WhatsApp E.164, Snap, adresse, notes optionnels) → `createCustomerAction` → redirection fiche.
- Créer inline : depuis le sélecteur client d'une commande ou d'une vente, taper un nom inconnu → « Créer "X" » → fiche nom-seul créée et sélectionnée sans quitter le formulaire (`CustomerCombobox.tsx:105-129`).
- Fiche : avatar + nom éditable inline (server action), « Client depuis le … », 3 KPI (Commandes / À encaisser / Dernière), boutons Appeler / WhatsApp / Snap (`tel:`, `wa.me`, lien Snapchat), notes, historique des 50 dernières commandes avec reste dû par commande → lien fiche commande.
- Modifier : même formulaire pré-rempli → `updateCustomerAction` → retour fiche. Le nom est aussi éditable directement sur la fiche (InlineNameEditor).
- Supprimer : ConfirmDialog → retour liste immédiat + toast « Annuler » 5 s (UndoProvider shell) → DELETE REST différé ; refus serveur si commandes PENDING/READY liées ; sinon commandes/ventes détachées (`onDelete: SetNull`), les noms snapshots survivent.
- Sélection dans commande/vente : `CustomerField` partagé — combobox plein écran en Sheet (clients récents avant toute frappe, recherche 220 ms) OU « Client de passage, sans fiche » (nom libre ; champ contact libre proposé côté vente uniquement).
- Recherche globale : palette de commandes → jusqu'à 6 clients (`searchCustomers`) → fiche.

**Données touchées.**

- `Customer` : fullName (index), phoneE164 `@unique`, snapchat, whatsappE164 (ni unique ni cherché), address, notes ; relations `orders[]`/`sales[]` en SetNull (`prisma/schema.prisma:156-172`).
- `Order.customerId` (FK SetNull) + `customerName` snapshot toujours rempli (zod min 2 : copie du fullName choisi, ou saisie libre) ; `Order.customerContact` n'est jamais écrit par l'UI actuelle — le formulaire ne le propose pas (`CustomerSection.tsx:23-28`, `orders/actions.ts:50-59`), seule la REST legacy l'accepte (`app/api/admin/orders/route.ts:246`).
- `Sale.customerId` (FK SetNull) + `customerName`/`customerContact` nullables, écrits par POST/PATCH `/api/admin/sales` (vente directe : fiche choisie → customerId+nom ; passage → nom+contact libres) ; les zod `createSaleInputSchema`/`updateSaleInputSchema` (chemin mort) ignorent customerContact (`src/schemas/sale.ts:38-61`).
- Ardoise : aucun champ stocké — dérivée à la volée : Σ(OrderItem.unitPrice×qty) − Σ(PaymentTransaction DEPOSIT+BALANCE−REFUND), sur les seules commandes PENDING/READY (`customers/queries.ts:174-233`) ; `Sale.remainingDue` jamais consulté par ce domaine.
- Affichage du nom : chaîne de fallback `customer?.fullName ?? customerName ?? "Anonyme"` généralisée (orders, collect, palette) — les fiches liées suivent les renommages, les orphelins gardent leur snapshot.
- `AuditLog` : customer.create/update/delete avec `actorId` systématiquement null (`actions.ts:31,55,78`).

**Bugs confirmés.**

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| haute | Les trois server actions clients ne vérifient ni JWT ni rôle : la middleware ne teste que la présence du cookie, et un VIEWER (interdit d'édition côté REST) crée/renomme des fiches sans obstacle. | `src/server/customers/actions.ts:11-85` | Aucun `requireAdmin` dans le fichier ; `middleware.ts:21-29` (« contrôle JWT strict fait côté API ») ; contraste avec `app/api/admin/customers/[id]/route.ts:21-25` (requireAdmin+requireEditor). Même faille que §4.1/§4.7. |
| haute | L'« À encaisser » de la fiche et de la liste est faux : il ne compte que les commandes PENDING/READY et ignore les commandes DELIVERED impayées ainsi que `Sale.remainingDue` — un client présent dans Encaisser peut afficher 0 € sur sa fiche. | `src/server/customers/queries.ts:181` | Encaisser compte READY+DELIVERED sans vente et les ventes à reste dû (`src/server/collect/queries.ts:49,65`) ; l'hypothèse du commentaire (`queries.ts:169-172` « le BALANCE aura été enregistré avant DELIVERED ») est démentie par les deux passages réels en DELIVERED sans exigence de solde (`app/api/admin/sales/route.ts:367-371` et PATCH direct « Tout est livré », §4.1). |
| moyenne | « Finaliser » une commande liée à une fiche produit une vente sans `customerId` : le pont ne transporte que nom et contact, jamais la FK, et la route ne la reconstruit pas depuis la commande. Le lien fiche→vente se rompt à chaque finalisation. | `src/features/sell/components/SellPageClient.tsx:38-52` | `FromOrder` n'a pas de champ customerId ; seuls `setCustomerName`/`setCustomerContact` (l.110-111) sont repris ; payload `customerId: customer?.id ?? null` (l.250) ; côté serveur seul `orderCustomerName` est récupéré de la commande (`app/api/admin/sales/route.ts:271,282-296`). |
| moyenne | L'historique de la fiche affiche « X € à encaisser » sur des commandes annulées (et livrées impayées) : la requête ne filtre aucun statut et le dû est calculé pour toutes — en contradiction directe avec la tuile « À encaisser » au-dessus. | `src/features/customers/pages/CustomerDetailPage.tsx:14` | `where: { customerId: id }` sans statut ; dû clampé à ≥0 (l.47-48) ; rendu ambre dès `due > 0.005` quel que soit le badge statut (`CustomerOrdersHistory.tsx:43-52`) — une CANCELLED sans paiement affiche son total en « à encaisser ». |
| moyenne | Rechercher après avoir paginé exclut silencieusement les premières pages : l'effet de recherche recopie tous les searchParams et ne retire que `q`, jamais `cursor` — la requête filtrée est évaluée « après » le cursor. | `src/features/customers/components/CustomersListClient.tsx:34-47` | `new URLSearchParams(searchParams)` conserve `cursor` ; `listCustomers` l'applique tel quel (`queries.ts:52`) sur le résultat filtré — les clients triés avant le cursor ne peuvent plus matcher. |
| moyenne | Le refus de suppression n'est jamais expliqué : le message serveur (« Impossible : N commande(s) active(s) liée(s)… ») est jeté puis avalé — l'utilisateur, qui a déjà vu « Client supprimé », reçoit 5 s plus tard un « Suppression échouée. » générique. | `src/app-shell/UndoProvider.tsx:52-56` | `commit()` catch ignore l'erreur et affiche `args.errorMessage` fixe ; `CustomerDetailClient.tsx:48-61` construit pourtant le message précis avant de le `throw` — code mort ; garde serveur : `actions.ts:68-75`. |
| basse | Le dialogue de suppression annonce l'inverse du comportement : « X et son historique seront supprimés », alors que commandes et ventes sont conservées et seulement détachées (SetNull). | `src/features/customers/components/CustomerDetailClient.tsx:182` | `onDelete: SetNull` sur `Order.customer` (`schema.prisma:182`) et `Sale.customer` (`schema.prisma:283`) ; `deleteCustomerAction` ne touche que la ligne Customer (`actions.ts:77`). |
| basse | Pagination cursor sur tri non unique : `orderBy { fullName }` seul avec `cursor { id }` — position du cursor ambiguë dès que deux clients partagent un nom, pages avec sauts/doublons possibles. | `src/server/customers/queries.ts:52-53` | Aucun tiebreaker `id` dans l'orderBy ; footgun Prisma documenté (cursor exige un tri stable). |
| basse | Un conflit de téléphone à l'édition remonte le message Prisma brut dans le toast, alors que la création traduit le même P2002 en français. | `src/server/customers/actions.ts:59-62` | `return { ok:false, error: e.message }` sans détection « Unique constraint », contrairement à `actions.ts:36-38`. |
| basse | Les initiales accentuées tombent dans la section « # » en fin de liste : `letterOf` teste `/[A-Z]/` après toUpperCase, donc « Élise » est triée parmi les E mais rangée sous « # ». | `src/features/customers/components/CustomersListClient.tsx:22-26` | `'É'` ne matche pas `[A-Z]` ; le tri `localeCompare(fr, base)` (l.50-52) place pourtant É avec E — section et tri se contredisent. |

**Incohérences.**

- Trois définitions de la dette client dans l'app : fiche = PENDING+READY (commandes seules), Encaisser = READY+DELIVERED sans vente + ventes à reste dû, pipeline dashboard = encore autre chose (§4.1) — le même client « doit » trois montants différents selon l'écran.
- Deux piles de mutation pour la même entité : création/édition/renommage par server actions non authentifiées, suppression par REST (requireEditor) ; et une surface REST morte (GET/POST `/api/admin/customers`, GET/PATCH `/[id]`) sans aucun appelant UI mais avec ses propres invalidations (`revalidateAdminData` vs `revalidatePath`).
- Audit non attribué : `writeAudit(undefined, …)` sur les trois actions clients, même quand elles sont appelées par la route REST authentifiée qui possède `ctx.sub` — contrairement aux ventes (`sale.create` avec acteur).
- La recherche (liste, combobox, palette) couvre nom/téléphone/snap mais jamais `whatsappE164` (`queries.ts:41-45,116-121`) ; le placeholder « Nom, téléphone, Snap… » est honnête, le champ WhatsApp est de fait introuvable.
- `recentCustomers` : le commentaire promet un tri « par dernière commande » mais le code trie par nombre de commandes puis date de création (`queries.ts:99-104`).
- La palette retrouve une commande par son `customerName` snapshot uniquement (`search/queries.ts:55`) alors que l'affichage résout le nom vivant (`orders/queries.ts:124`) : après renommage d'une fiche, ses commandes ne sont plus trouvables sous le nouveau nom.
- La tuile « Commandes » compte les annulées ; « Historique commandes (N) » est plafonné à 50 (`CustomerDetailPage.tsx:16`) alors que la tuile compte tout — les deux nombres divergent au-delà.
- `Sale.customerId` est indexé et rempli, mais aucune UI ne liste jamais les ventes d'un client : la fiche ignore les ventes directes (historique, compteur, « Dernière » = commandes uniquement).
- `Order.customerContact` existe, est lu par le pont Vendre (`SellPageClient.tsx:111`), mais n'est plus jamais écrit par le parcours vivant — il n'est alimentable que par la REST legacy sans appelant.
- `CustomersListClient` consomme `useSearchParams` sans `<Suspense>` dans `CustomersPage` (`CustomersPage.tsx:16-24`), en contradiction avec la règle critique du projet (CLAUDE.md), comme la liste des commandes.
- Le type documente un solde négatif « trop-perçu » (`queries.ts:11`) qu'aucun écran n'affiche jamais (badge et KPI seulement si > 0,01 €).

**Frictions UX.**

- Aucune normalisation téléphone : « 06 12 34 56 78 » est rejeté avec un message technique (« Format E.164 »), il faut taper soi-même `+33612345678` ; et chercher un client en tapant « 06… » échoue puisque la base stocke `+336…` (`contains` littéral).
- La création inline depuis le combobox produit une fiche nom-seul sans jamais ramener l'utilisateur la compléter ; l'anti-doublon se limite à une égalité stricte sur les 10 résultats chargés (`CustomerCombobox.tsx:92-93`) et rien n'empêche deux fiches homonymes.
- « Charger plus » ne charge pas plus : la navigation remplace la liste (les sections A–… disparaissent) et le compteur « N fiches » ne compte que la page affichée (`CustomersListClient.tsx:74,128-137`).
- La suppression annonce « Client supprimé » et renvoie à la liste avant que la garde serveur ait statué ; en cas de refus, un toast générique arrive 5 s plus tard sans raison ni chemin de correction.
- La tuile « À encaisser » de la fiche n'est pas actionnable : aucun lien vers Encaisser ni vers les commandes impayées qui la composent.
- Les « clients récents » du combobox sont en réalité les plus gros clients (tri par nombre de commandes) : une fiche créée la veille peut ne pas figurer dans les 8 proposées.
- Le nom s'édite à deux endroits (inline sur la fiche + formulaire), mais téléphone/snap/adresse exigent le formulaire complet — asymétrie non signalée.

**Dette technique.**

- `listCustomers` charge toutes les commandes (id+date) de chaque client de la page juste pour un count et un max (`queries.ts:60-66`), puis recharge items+paiements de toutes les commandes actives pour l'ardoise — coût croissant avec l'historique, pour une liste de 100.
- Deux implémentations de l'ardoise dans le même domaine : `computeBalancesForCustomers` (agrégat par client) et le recalcul par commande de `CustomerDetailPage` (l.27-57), aux règles différentes (statuts filtrés vs non filtrés, clamp à 0 vs solde signé).
- Surface REST clients aux trois quarts morte (seuls DELETE et `/search` ont un appelant) mais maintenue avec sa propre validation et ses invalidations.
- Trois types cousins construits à la main (`CustomerListRow`/`CustomerSearchRow`/`CustomerDetail`) et un `ActionResult` local redéclaré par domaine.
- Erreurs serveur renvoyées brutes au client (`e.message` Prisma) sur create/update — fuite d'internals et messages non traduits.
- La dualité FK/snapshot n'est écrite nulle part comme règle : chaque écrivain (order action, sale route, duplicate, PATCH ticket) recompose sa propre logique de remplissage, d'où le trou du pont commande→vente.

**À préserver.**

- La dualité assumée « fiche liée OU client de passage », bien expliquée dans l'UI : saisie libre repliée derrière « Client de passage, sans fiche » avec le hint « Aucune fiche ne sera créée » (`CustomerField.tsx:56-77`) — le modèle FK + snapshot est le bon, il ne manque que sa cohérence d'écriture.
- La chaîne de fallback de nom `customer?.fullName ?? customerName ?? "Anonyme"` généralisée : renommages propagés sur les enregistrements liés, orphelins historiques toujours lisibles.
- Le combobox : clients proposés avant toute frappe (le pourquoi est commenté, `queries.ts:95-100`), création inline sans quitter le formulaire, bouton « Créer » rétrogradé en secondaire dès que des fiches correspondent (`CustomerCombobox.tsx:131-146`).
- `SetNull` en base + garde sur commandes actives + undo 5 s au niveau shell (survit à la navigation) : la suppression d'une fiche ne détruit jamais l'historique comptable.
- Le schéma zod clients : trim et vide→null systématiques, E.164 vérifié, `phoneE164 @unique` garanti par la base, messages en français — couvert par des tests (`src/schemas/__tests__/customer-schema.test.ts`).
- La fiche montre le reste dû par commande, pas le facturé, avec la justification en commentaire (`CustomerDetailPage.tsx:32-39`) ; les boutons de contact volontairement neutres pour ne pas diluer les couleurs d'argent (`CustomerDetailClient.tsx:85-91`) ; actions directes `tel:`/`wa.me`/Snap.
- Rattachement propre au shell : parents de navigation déclarés et testés (`navigation.test.ts`), entrées palette (navigation, création, résultats clients), recherche synchronisée dans l'URL.

---

## 5. Contraintes de compatibilité vitrine

**Rôle du domaine.** La vitrine publique (`app/(shop)`) lit le catalogue en base via un unique service caché par tag et expose une recherche avec repli externe. Pour la refonte gestion, ce domaine définit **le contrat que l'admin doit continuer d'honorer** : quels champs Brand/Perfume le site lit, quelles règles de visibilité (statuts, images, catalogMode) le protègent, et quel mécanisme d'invalidation (tag `public-catalogue`) chaque mutation doit déclencher.

### 5.1 Le contrat de données (ce que la vitrine lit)

- `Perfume` (LECTURE vitrine) : id, name, slug, image, imageLight, isFeatured, status — filtres SQL `status=PUBLISHED`, `brand.status=PUBLISHED`, `name!=''`, `image!=''`, puis re-filtre JS excluant placeholder.svg et les chemins legacy `/parfums/*` (`catalogue-service.ts:80-103, 160-169`). `slug` est sélectionné mais jamais mappé ni utilisé (pas d'URL par parfum) ; `stock`, `isPrivate` et les prix ne sont JAMAIS lus par la vitrine.
- `Brand` (LECTURE vitrine) : id, name, slug, catalogMode, status, image, imageLight. Trois usages : jointure des parfums publiés (name/slug/catalogMode), cartes « gamme complète » synthétisées depuis les marques COMPLETE+PUBLISHED avec image (id fictif maxId+idx+1), et panneau Explorer avec comptage des parfums PUBLISHED par marque (`catalogue-service.ts:104-134, 189-199`).
- `Brand.slug` est la valeur du filtre public `?maison=` (URL partageable) — c'est le seul identifiant DB exposé dans les URLs de la vitrine ; **sa stabilité est un invariant** (la clé de cache a dû être bumpée en v2 après correction manuelle de slugs, `catalogue-service.ts:214-220`).
- `Perfume.slug` : format `p-{id}-{marque}-{nom}` régénéré à chaque PUT admin (`perfumes/[id]/route.ts:124`), unique par construction (embarque l'id) — champ mort côté vitrine, à réévaluer dans la refonte.
- `Perfume.isFeatured` : lu par la vitrine pour les bandeaux d'accueil (max 2 côté page ET côté PATCH admin qui refuse au-delà de 2).
- Aucune autre table n'est lue par la vitrine : le formulaire contact part par Resend (`src/actions/contact.ts`), rien en base ; PerfumePricing, Order, Sale, Customer, Batch, Pocket sont invisibles du site public.
- `ExternalImportSuggestion` : table déclarée (`schema.prisma:133-143`) prévue pour l'import depuis suggestion.externalId — jamais lue ni écrite par aucun code, morte.
- Cache de données : `unstable_cache` clé `public-catalogue-v2` + tag `public-catalogue` (vitrine) et `admin-catalogue-snapshot-v2` + tag `admin-catalogue` (admin) — les deux purgés ensemble par `revalidateAdminCatalogue()` après toute mutation Brand/Perfume/Sale (`src/lib/admin/revalidateAdminCatalogue.ts`).

### 5.2 Les flux qui lient gestion et vitrine

- Rendu accueil : `app/(shop)/page.tsx` (force-dynamic) → getCachedCatalogue() → unstable_cache clé « public-catalogue-v2 » tag « public-catalogue » → 3 requêtes Prisma parallèles (parfums publiés + marques COMPLETE avec image + marques du panneau Explorer) → mapping en Perfume[] (catégorie dérivée de catalogMode, blur statique) + CatalogBrowseBrand[] → CatalogSection (client) filtre/trie tout en mémoire.
- Filtrage client : chaque frappe met à jour l'état, réécrit l'URL en replaceState après 300 ms ; le filtre marque compare `perfume.brandSlug` (DB) au `?maison=` ; catégorie choisie → filtres marque annulés ; fiche « gamme » cliquée → restreint la grille à la marque (pas de dialog).
- Recherche élargie : 0 résultat local + requête ≥3 chars → debounce 350 ms → GET `/api/perfume-search?q=` (sans cat) → le serveur recharge le même cache catalogue et refait une recherche locale ; sinon cache mémoire de suggestions (clé requête normalisée|catégorie) ; sinon Fraganty (X-API-Key, timeout 8 s, 3 niveaux de matching : strict ≥72, assoupli ≥52, inclusion de slug) ou API générique ; résultat écrit au cache avec TTL selon l'issue ; réponse affichée dans CatalogEmptyState.
- Hint statique : en parallèle, findExternalPerfumeHint matche la requête contre les ~1080 lignes de hints embarquées (scoring Levenshtein/tokens, seuil 72) et alimente caption + « pistes » via getPerfumesByIds(similarCatalogIds).
- **Invalidation depuis la gestion** : toute mutation Brand/Perfume (create/update/patch/delete/pricing) et toute création/suppression de VENTE (qui décrémente/réincrémente Perfume.stock, `sales/route.ts:379` et `sales/[id]/route.ts:467`) → `revalidateAdminCatalogue()` → revalidateTag(public-catalogue, {expire:0}) + revalidateTag(admin-catalogue) + revalidatePath(`/` et `/admin/catalogue`) ; certaines routes l'enveloppent dans after().
- Cascade de visibilité à l'écriture : marque passée COMPLETE ou DRAFT → updateMany force tous ses parfums en DRAFT ; parfum sans image → DRAFT forcé ; publication refusée (400) si pas d'image, marque COMPLETE ou marque DRAFT — la vitrine re-filtre tout cela en lecture de toute façon.
- Commande visiteur : fiche → PerfumeDialog → Snapchat (lien fixe CONTACT.snapchat) ou formulaire `/contact?parfum=&marque=` → server action submitContactForm → Resend si configuré, sinon repli mailto ; aucune écriture en base.
- Panne DB : échec Prisma → registerPrismaCatalogFailure (cooldown 90 s) → tous les rendus suivants servent le mock vide sans toucher la base, jusqu'au premier succès qui réarme.

### 5.3 Bugs confirmés (contre-vérifiés `confirmed: true`)

| Sévérité | Description | Fichier | Preuve |
|---|---|---|---|
| haute | La requête catalogue public ne filtre PAS `isPrivate` alors que le schéma le documente comme « exclu du catalogue public » (`schema.prisma:74-75`). Sans danger aujourd'hui uniquement parce qu'aucune route n'écrit ce champ ; dès que la refonte le rendra éditable, un parfum privé PUBLISHED fuitera sur le site. | `src/lib/catalogue-service.ts:80-103` | Le where du catalogue public (`src/lib/catalogue-service.ts:80-86`) ne filtre que status/name/image et jamais isPrivate, alors que `prisma/schema.prisma:74-75` le documente « exclu du catalogue public » (aucune route n'écrit ce champ aujourd'hui, seuls `src/server/kpi/queries.ts:202` et AlertsBlock le lisent). |
| moyenne | `externalHint.similarCatalogIds` (ex. [11, 9, 10]) sont des IDs de l'ancien mockPerfumes (commentaire `externalSearchHints.ts:4`) appliqués via getPerfumesByIds aux IDs autoincrement de la DB actuelle : les « Pistes au catalogue » affichent des parfums arbitraires sans rapport avec le hint. | `src/components/home/CatalogSection.tsx:151` | Les similarCatalogIds sont documentés « IDs mockPerfumes » (`externalSearchHints.ts:4`, `externalHintsExtra.ts:3`) alors que mockPerfumes est vide (`src/lib/data.ts:67`) et que `CatalogSection.tsx:151` les applique via getPerfumesByIds aux IDs autoincrement du catalogue DB — les correspondances sont donc arbitraires. |
| moyenne | Renommage de marque : `data.slug = brandSlug(name)` sans le suffixe d'unicité `-n` utilisé à la création (`resoudMarque.ts:35-42`) → P2002 possible, renvoyé sous le message faux « Nom de marque déjà utilisé ». De plus le slug change, donc toute URL publique partagée `/?maison=ancien-slug` filtre silencieusement sur rien (0 résultat). | `app/api/admin/brands/[id]/route.ts:95` | Le point URL est prouvé — data.slug = brandSlug(name) (`app/api/admin/brands/[id]/route.ts:95`) change le slug et `CatalogSection.tsx:72` filtre slug === filters.brandSlug, donc `/?maison=ancien-slug` rend 0 résultat — mais la moitié P2002 est quasi inatteignable : marqueEquivalente (route:87-93) bloque en 409 toute collision, car cleNom (`nommage.ts:36-42`) et brandSlug (`slugify.ts:3-12`) appliquent la même normalisation (slug sans tirets ≡ cleNom), le suffixe -n de slugLibre étant lui-même du code effectivement mort. |
| moyenne | La catégorie « Nouveautés » est déclarée dans le type et la liste `categories` mais le mapping DB n'assigne que « Gammes Complètes »/« Sélections Individuelles » (`catalogue-service.ts:178-180`) : le filtre `?cat=Nouveautés` est accepté et rend toujours 0 résultat. | `src/lib/data.ts:36` | « Nouveautés » figure dans categories (`src/lib/data.ts:55-60`), readFilters l'accepte (`useCatalogFilters.ts:35-37`), mais le mapping DB n'assigne que Gammes Complètes/Sélections Individuelles (`catalogue-service.ts:178-180, 153`) donc perfume.category === "Nouveautés" (`CatalogSection.tsx:70-71`) ne matche jamais. |
| basse | Création de parfum : `nextId = max(id)+1` calculé hors transaction puis passé explicitement — deux créations simultanées violent la contrainte unique, et la séquence autoincrement Postgres n'est jamais avancée (dérive si un jour un create omet l'id). | `app/api/admin/perfumes/route.ts:115-117` | `app/api/admin/perfumes/route.ts:115-117` calcule nextId = max(id)+1 via aggregate hors transaction puis le passe explicitement au create (ligne 132), ce qui permet la collision concurrente sur l'id unique et n'avance jamais la séquence Postgres. |
| basse | `useExtendedSearch` n'envoie jamais le paramètre `cat` alors que la route le parse et que le cache serveur de suggestions est keyé par catégorie : une recherche filtrée par catégorie côté client peut recevoir une suggestion hors catégorie ; le paramètre serveur est mort. | `src/components/home/useExtendedSearch.ts:60` | `useExtendedSearch.ts:59-60` ne fetch que ?q= (seul appelant réel, cf. grep perfume-search), alors que la route parse cat (`app/api/perfume-search/route.ts:15`) et que le cache de suggestions est keyé par categoryKey (`searchPerfumeWithFallback.ts:36,51,56,64`) — le paramètre serveur est mort et la recherche déclenchée sous filtre catégorie (`CatalogSection.tsx:118`) part sans lui. |
| basse | Message d'erreur mojibake « Statut de visibilitÃ© invalide. » (UTF-8 double-encodé) affiché tel quel à l'admin. | `app/api/admin/brands/route.ts:91` | `app/api/admin/brands/route.ts:91` contient littéralement « Statut de visibilitÃ© invalide. » (mojibake) alors que les autres messages du même fichier sont correctement encodés (ex. ligne 79), et il est renvoyé tel quel au client. |
| basse | Code mort dupliqué : le statut est forcé DRAFT si COMPLETE sans image (lignes 94-97) puis la même condition renvoie 400 juste après (99-101) — l'assignation ne s'exécute jamais utilement ; même doublon dans le PATCH (`brands/[id]/route.ts:124-137`). | `app/api/admin/brands/route.ts:94-101` | Dans le POST, `brands/route.ts:95-97` force statusRaw="DRAFT" sous la condition exacte (COMPLETE && !image) qui renvoie 400 juste après (lignes 99-101), rendant l'assignation morte ; le PATCH (`[id]/route.ts:124-126` vs 132-137) duplique le même schéma (seule une image en espaces blancs venue de la DB séparerait les deux conditions). |
| basse | Le contrat `PerfumeSearchCatalogItem` déclare `imageDark?` jamais produit, et la route renvoie en réalité les objets `Perfume` complets (brandSlug, blurDataURL, isFeatured inclus) : le contrat n'est pas appliqué, le payload public expose plus que déclaré. | `src/lib/search/perfumeSearchTypes.ts:14-25` | imageDark n'apparaît nulle part ailleurs que dans le type (grep : seul `perfumeSearchTypes.ts:21`), et la route renvoie results: local où local est Perfume[] complet (`searchPerfumeWithFallback.ts:26-28` via getCatalogPerfumes) — brandSlug, blurDataURL et isFeatured partent donc dans le payload sans figurer au contrat. |

### 5.4 Incohérences

- Le commentaire de l'orchestrateur promet « cache externe (DB ou mémoire) » (`searchPerfumeWithFallback.ts:13`) mais seul le cache mémoire existe ; la variante DB (table ExternalImportSuggestion) n'a jamais été branchée.
- Deux implémentations de Levenshtein coexistent (`data.ts:81` et `searchExternalPerfumeApi.ts:29`) avec le même algorithme réécrit.
- Deux seuils de score « 72 » définis indépendamment : EXTERNAL_HINT_MIN_SCORE (`data.ts:174`) et MIN_PERFUME_EXTERNAL_SCORE (`searchExternalPerfumeApi.ts:7`) — même valeur, deux barèmes de scoring différents, aucune référence croisée.
- La création de marque suffixe le slug pour l'unicité (slugMarqueLibre) mais le renommage ne le fait pas (`brands/[id]/route.ts:95`) : deux conventions pour la même opération.
- Le doc `docs/admin-supabase-setup.md:10` parle d'un filtre `deletedAt` (« parfums PUBLISHED et non supprimés ») qui n'existe pas dans le schéma : la suppression est physique (hard delete).
- `perfumeSearchCache.ts` n'est qu'un ré-export marqué @deprecated vers catalog/externalSearchCache — la migration de l'arborescence search/ vers catalog/ est restée à mi-chemin.
- La vitrine re-filtre en JS (placeholder.svg, `/parfums/*`) ce que le SQL vient de filtrer partiellement : deux couches de la même règle « pas d'image, pas de fiche », dont une contre des données legacy.
- browseFromMock classe une marque en COMPLETE si un mock porte la catégorie « Gammes Complètes » — logique dupliquée de la vraie dérivation DB (catalogMode), maintenue pour un mock désormais vide.

### 5.5 Frictions UX (côté visiteur et effets de bord gestion→vitrine)

- DB en panne ou DATABASE_URL absent : le visiteur voit un catalogue à 0 résultat et des « Inspirations » vides, sans aucun message — la dégradation est invisible et ressemble à une boutique fermée (`catalogue-service.ts:70-76`, mock vide).
- Renommer une marque dans la gestion casse silencieusement les liens publics partagés `/?maison=ancien-slug` (le filtre ne matche plus rien) — l'admin n'est pas prévenu de cet effet de bord vitrine.
- La recherche élargie ne propose qu'UNE suggestion externe maximum, sans visuel ni lien d'action directe autre que le contact — l'entonnoir dépend entièrement du message conciergerie.
- Supprimer un parfum ou une marque côté gestion est un hard delete immédiat (DELETE routes) : aucune corbeille, une fausse manip retire la fiche du site public sans retour arrière possible.

### 5.6 Dette technique

- mockPerfumes est vide depuis la migration DB mais tout le chemin de repli (perfumesFromMock, browseFromMock, `catalogue-service.ts:28-67`) est conservé : ~40 lignes qui produisent un catalogue vide, plus la logique de catégorisation mock dupliquée — le « repli mock » est en réalité un repli « vitrine vide ».
- Table ExternalImportSuggestion morte dans le schéma : ni lue ni écrite, vestige d'un import automatique jamais construit — supprimer ou implémenter.
- ~1080 lignes de hints marketing codés en dur (`externalSearchHints.ts` 575 + `externalHintsExtra.ts` 503), embarquées dans le bundle client via `data.ts`, alimentées à la main, avec des similarCatalogIds cassés — à remplacer par des données en base ou supprimer.
- `data.ts` est un fourre-tout partagé client/serveur : CONTACT, types catalogue, fuzzy search, scoring, ré-exports de hints — tout composant vitrine en dépend, toute modification invalide tout ; à éclater.
- Clé de cache versionnée à la main (« public-catalogue-v2 » après correction manuelle de slugs en base, commentaire `catalogue-service.ts:214-220`) : pattern rustine correction-SQL-puis-bump-de-clé à ne pas reconduire.
- `Perfume.slug` : généré, unique, régénéré à chaque PUT, jamais consommé par la vitrine (pas d'URL par parfum, sitemap limité à 3 pages statiques) — décider dans la refonte : pages produit réelles ou suppression du champ.
- `isPrivate` : champ indexé, documenté, lu par les KPI gestion (`kpi/queries.ts:202`) et AlertsBlock (SQL brut), mais inscriptible par aucune route et non filtré côté vitrine — un invariant à moitié construit, dangereux en l'état.
- Filtres JS anti-legacy (`placeholder.svg`, `/parfums/*`) dans le mapping public : rustines contre d'anciennes données en base ; la refonte devrait nettoyer la base et faire de « image = URL Supabase valide » une contrainte d'écriture.
- Hostname Supabase hardcodé dans `next.config.mjs:8` — changer de projet Supabase casse toutes les images sans erreur de build.
- `perfumeSearchCache.ts` : ré-export @deprecated à supprimer une fois les imports migrés.
- Cache de suggestions externes en Map module-scope : perdu à chaque cold start serverless et non partagé entre instances — acceptable aujourd'hui, à documenter comme choix ou déplacer en DB dans la refonte.
- Gestion défensive de la colonne isFeatured absente (P2022, message « npx prisma db push » renvoyé à l'utilisateur, `perfumes/[id]/route.ts:224-239`) : rustine d'une époque sans migrations, à retirer une fois le schéma stabilisé.

### 5.7 À préserver (le contrat que la refonte doit honorer)

- Un seul point de lecture (getCachedCatalogue) et un seul point d'invalidation (revalidateAdminCatalogue) : chaque route de mutation catalogue ET ventes purge les deux tags — contrat simple à préserver tel quel.
- Défense en profondeur sur la visibilité : la lecture publique re-filtre status parfum + status marque + image non vide, même si l'écriture (DRAFT auto sans image, cascade DRAFT sur marque masquée/COMPLETE, refus de PUBLISHED) échouait — les deux couches se protègent mutuellement.
- Circuit breaker Prisma (90 s de cooldown après échec, réarmé au premier succès) : la vitrine ne martèle jamais une DB en panne (`prismaRuntimeCircuit.ts`).
- Résolution de marque insensible casse/accents/ponctuation (resoudMarqueParNom, cleNom) avec slug suffixé à la création et retour explicite « corrigeeEn » à l'utilisateur — élimine les marques en triple.
- Bascule d'image bi-thème en CSS pur (PerfumeImage) : grilles rendues serveur, une seule image demandée dans le cas courant, pas de flash de thème — règle CLAUDE.md respectée à la lettre.
- Contrat API de recherche discriminé (3 types) validé côté client avant usage (parseResponse), requêtes caduques annulées par AbortController, appel réseau seulement après échec du catalogue local.
- Validation stricte de l'entrée de recherche : longueur max 120, caractères de contrôle refusés, normalisation partagée pour les clés de cache (`normalizePerfumeQuery.ts`).
- Filtres catalogue = URL partageable, avec replaceState débouncé (pas d'entrée d'historique par frappe) et relecture au popstate — pattern propre à reconduire.
- Toutes les fiches dans le DOM avec troncature CSS (`contents`/`hidden`) : catalogue entier indexable par Google sans coût réseau (commentaire documenté `CatalogSection.tsx:99-113`).
- whatsappOrderUrl rend `null` tant que le canal n'existe pas : le type force chaque appelant à retirer le bouton plutôt qu'à afficher un lien mort (`perfumePresentation.ts`).
- Règles de présentation centralisées dans `perfumePresentation.ts` (dédupliquées de trois composants qui divergeaient) — fiche, détail et recherche partagent contactHref/isCompleteRange.
- Timeouts et TTLs externes configurables par env avec bornes saines (min 2 s / max 30 s ; TTL min 60 s) — jamais de valeur folle possible.
- `scripts/verify-integration.ts` éprouve l'orchestrateur de bout en bout (local, cache négatif, cache erreur, hit externe) avec compteurs HTTP instrumentés.

---

## 6. Annexe — bugs réfutés ou non prouvés

Consignés pour trace. **À ne pas retraiter** dans la refonte : la contre-vérification a montré que le constat initial était infondé (ou sans impact démontrable).

| Domaine | Bug allégué | Fichier | Verdict et note de réfutation |
|---|---|---|---|
| Lots | Montant de dépense parsé en float (Number + replace virgule) puis converti `new Prisma.Decimal(float)` — précision binaire au lieu de passer la chaîne à Decimal ; le reste du domaine calcule pourtant tout en Decimal. | `app/api/admin/batches/[id]/expenses/route.ts:54,75` | **Réfuté** (`confirmed: false`). Le pattern Number+Decimal existe (`expenses/route.ts:54,75`) mais Prisma.Decimal (decimal.js) convertit un number via sa représentation décimale exacte (new Decimal(0.1) === '0.1') et la colonne est Decimal(10,2) : aucune perte binaire démontrable, et la route ventes fait pareil pour remainingDue (`sales/route.ts:302,328`). |

Aucun bug n'a été classé `confirmed: null` (non prouvé) lors de la contre-vérification. Les bugs des audits sans champ de contre-vérification individuel (Commandes, Compta / Trésorerie, Catalogue, Modèle de données, Calculs financiers) sont reportés dans leurs sections respectives (§4) avec la mention « Bugs relevés » ; plusieurs y sont recoupés par les preuves des audits contre-vérifiés, signalées *(Confirmé en §…)*.

À noter également, pour nuance (sans sortir le bug du tableau confirmé) : la moitié « P2002 possible » du bug de renommage de marque (§5.3) a été jugée quasi inatteignable par la contre-vérification — seule la casse silencieuse des URLs `/?maison=ancien-slug` est prouvée.

---

*Fin du document 01. Le document suivant de la série (`docs/refonte/02-VISION-PRODUIT.md`) doit trancher, pour chaque capacité de la carte fonctionnelle (§3) et chaque problème structurant (§2.3), ce que la refonte conserve, corrige ou abandonne.*
