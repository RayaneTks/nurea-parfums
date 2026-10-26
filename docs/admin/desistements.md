# Désistements, flacons en stock et acompte gardé

**Décidé le 26/10/2026 avec le gérant.** Document amont du chantier : il fait foi pour la base, le
serveur et les écrans. Proposition validée : Claude Doc « Nuréa Gestion — désistements, acomptes et
revente : plan » (réponses du gérant écrites dedans, section Questions). Ordre imposé : ce document,
puis la planche montrée au gérant, puis le code, en quatre phases.

## Le besoin

Avant que les règles d'acompte soient resserrées, beaucoup de clients se sont désistés après une
commande confirmée. La gestion ne savait pas le dire : le gérant gardait la commande et, quand le
parfum était revendu, **changeait le nom du client**. L'historique du premier client disparaissait
et son acompte passait au nom du nouvel acheteur.

Cas réels : khali.khali, François, Faycal. Faycal a versé un acompte ; il ne lui est pas rendu ; son
parfum a été revendu au prix prévu à quelqu'un d'autre. Ces trois cas sont des exemples : le gérant
les passera lui-même avec les nouveaux gestes une fois en ligne, aucun script ne les réécrit.

## Les décisions du gérant

| Question | Décision (26/10/2026) |
|---|---|
| L'acompte d'un désistement | **Gardé par défaut.** Ce n'est pas un avoir ni une dette envers le client. La feuille de désistement demande quand même : on le garde, on rend tout, ou on rend une partie (gérant, 26/10, après la planche). |
| À quoi sert de le voir | Quand le client revient, savoir qu'il avait laissé un acompte. Rien n'engage à le déduire. |
| Le déduire quand même | Une **remise** au montant choisi sur la nouvelle vente ou commande, pas un transfert d'argent. |
| Le flacon d'une commande confirmée désistée | Il a été commandé au fournisseur : il passe **en stock**. |
| Le stock aujourd'hui | Non suivi. Nuréa travaille à la commande ; les flacons en stock sont l'exception à voir d'un coup d'œil. |
| Revendre un flacon en stock | Une **vente directe**, pas une commande à étapes. Même coût d'achat ; prix prévu (celui de la commande désistée, sinon le catalogue) ; lot du moment de la vente, pas le lot d'origine. |
| Désistement après livraison | N'existe pas. Un retour de flacon reste une annulation. |

Choix de l'agent : une commande **En attente** (pas encore commandée au fournisseur) qui se désiste ne
crée aucun flacon en stock.

## Les mots

- **« Désistée »** : le client a renoncé à une commande confirmée. Distincte d'**« Annulée »**
  (erreur de saisie, rupture, retour de flacon).
- **« Acompte gardé »** : ce que le client avait versé sur une commande désistée, net de tout
  remboursement. Toujours ce mot, jamais « avoir » (ce serait une dette envers lui).
- **« En stock »** : les flacons disponibles, un par flacon, chacun avec sa provenance.
- **« Remise »** : ce qu'on retire du prix d'une vente ou d'une commande, avec son motif.

## Règles

| Règle | Où elle sera tenue |
|---|---|
| Une désistée est une annulée **avec un motif** : `CANCELLED` + `cancelReason = WITHDRAWN`. Elle sort de tous les chiffres comme toute annulée ; ses paiements restent dans l'Encaissé. | colonne `SaleDocument.cancelReason`, CHECK motif ⇒ statut `CANCELLED` |
| Se désister n'est possible que sur une commande (`ORDER`) **En attente** ou **Confirmée**, jamais livrée, même en partie | writer `withdrawDocument`, `canTransition` |
| Se désister demande ce qu'on fait de l'acompte : **garder** (choix d'office), **rendre tout**, ou **rendre une partie** (montant ≤ payé net). Un remboursement est un `REFUND` ordinaire : il sort d'une poche, se voit en compta et sur la fiche client. Seul le reste est l'acompte gardé | feuille de désistement, writer `withdrawDocument` (mêmes plafonds que `cancelDocument`) |
| Une confirmée désistée crée **un flacon en stock par unité** de chaque ligne non offerte (catalogue ou hors catalogue) ; une En attente n'en crée aucun | writer `withdrawDocument`, `src/server/stock/writer.ts` |
| Les articles d'une désistée ne se modifient plus (ses flacons en sont nés) ; réactiver d'abord | writer `updateDocument` |
| Un flacon en stock garde son parfum, sa contenance, son coût d'achat (DA, taux, €), son prix prévu et sa provenance (commande et ligne d'origine) | table `StockBottle` |
| Un flacon est **disponible** tant qu'aucune ligne de vente ne le reprend ; une ligne reprend **au plus un** flacon par unité | `StockBottle.soldLineId` unique ; disponibilité dérivée, jamais un drapeau |
| Supprimer ou annuler la vente qui reprenait un flacon le rend disponible ; le flacon ne disparaît jamais en silence | FK `soldLineId ON DELETE SET NULL`, writer d'annulation |
| Réactiver une désistée est refusé si l'un de ses flacons a été revendu ; sinon ses flacons disponibles sont retirés du stock | writer `reactivate` |
| « Retirer du stock » (flacon cassé, gardé, offert hors vente) supprime le flacon, avec confirmation et filet « Annuler » 5 s | writer `removeStockBottle` |
| Revendre un flacon reprend son coût d'achat sur la ligne : la marge de la revente est juste, le coût n'est jamais compté deux fois (la désistée est hors des chiffres) | writer `createDocument` |
| Le lot d'une revente suit la règle habituelle de Vendre (lot ouvert le plus récent, ou choisi), jamais le lot d'origine | `resolveBatch` |
| L'acompte gardé d'un client = Σ payé net de ses désistées, **dérivé**, jamais stocké | requête client, jumeau TS + test de parité |
| Une remise est un montant ≥ 0, au plus le total des lignes, avec un motif ; elle baisse le total, donc l'À encaisser et la Marge nette | colonnes `SaleDocument.discountEur`, `discountNote`, vue `DocumentBalance`, CHECK |
| Une remise peut citer la désistée qui la motive ; rien ne plafonne une remise à l'acompte gardé (le gérant décide) | `SaleDocument.discountSourceId`, FK `SET NULL` |
| En compta, un paiement d'une désistée se lit « Acompte gardé · <client> · désistement », pas comme une vente | modèle de la compta, journal |

## Données (phase 2 et 4, migrations additives)

- `SaleDocument.cancelReason` — enum `CancelReason` (`WITHDRAWN` seul), NULL ; CHECK `doc_cancel_reason_ck`. Les annulées
  existantes restent NULL et s'affichent « Annulée ».
- `StockBottle` — `id`, `perfumeId` (SetNull), `perfumeName`, `brandName`, `volumeMl`, `unitCostDzd`,
  `exchangeRate`, `unitCostEur`, `plannedPriceEur`, `sourceDocumentId` (Restrict), `sourceLineId`
  (SetNull), `soldLineId` (unique, SetNull), `createdAt`.
- `SaleLine.fromBottleId` n'existe pas : le lien est porté par `StockBottle.soldLineId`, un seul sens.
- `SaleDocument.discountEur` Decimal(10,2) NULL, `discountNote`, `discountSourceId` — phase 4.
- `Perfume.stock` (compteur général) n'est **pas** touché : les flacons en stock sont une liste à part.

## Écrans

Les textes ci-dessous sont ceux de l'écran (planche validée le 26/10, revue du gérant : parler simplement,
jamais le jargon de nos échanges). « Acompte gardé » est un mot de travail ; à l'écran : « Il avait laissé
20,00 € d'acompte », « Acompte laissé ».


- **Fiche commande (S01)** : sur une En attente ou Confirmée, geste **« Le client se désiste »** à côté
  d'« Annuler ». Feuille : « Faycal ne prend plus sa commande ? », puis « Il avait versé 20,00 € d'acompte » avec trois
  choix (On le garde · On lui rend tout · On lui rend une partie + montant + poche), puis ce qui suit
  (la commande reste dans sa fiche, son flacon rejoint le stock), un seul bouton « Valider le désistement ». Une désistée affiche son motif, ses flacons et, s'ils sont
  revendus, à qui.
- **En stock** (sous Catalogue) : un rang par flacon : parfum, contenance, prix prévu, provenance,
  date. Toucher un rang : « Vendre ce flacon » ou « Retirer du stock ».
- **Vendre** : quand des flacons sont en stock, ils sont proposés en tête du choix de parfum ; en
  choisir un préremplit la ligne (parfum, contenance, prix prévu, coût).
- **Fiche client** : ligne « Acompte gardé : 30 € · désistement du 12/10 » sous le nom, si non nul.
  Même ligne dans Vendre et dans une nouvelle commande dès que ce client est choisi.
- **Remise** : dans le récapitulatif d'une vente ou commande, « Faire une remise » : montant, motif
  prérempli quand le client a un acompte gardé.
- **Compta** : libellé « Acompte gardé » pour l'argent d'une désistée.

## État

- **Phase 2 faite le 26/10/2026** (branche `claude/project-thread-b8ia5e`, pas en ligne) : migration
  `20261026090000_withdrawal_stock`, `withdrawDocumentAction`, `src/server/stock/*`, feuille
  `WithdrawSheet`, écran E23 `/admin/catalogue/stock` (rangée « En stock » en tête du Catalogue),
  tests `tests/db/transactions/withdraw-document.test.ts`, captures `e2e/captures/phase2-desistement.spec.ts`.
- En attendant la phase 3, la feuille d'un flacon dit : créer la vente dans Vendre, puis le retirer du stock.

## Phases

1. Ce document et la planche des écrans → ok du gérant.
2. Désistement et flacons en stock (migration, writer, fiche commande, écran En stock).
3. Vendre depuis le stock (choix du flacon, ligne préremplie, flacon repris).
4. Acompte gardé visible, remise, libellé en compta.

Chaque phase : tests (`npm run typecheck`, `lint`, `test`, `test:db`, `test:layout`), captures → ok →
mise en ligne → vérification sur le vrai site.
