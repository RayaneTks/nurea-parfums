# 08 — Recette de la refonte

> **Statut** : ouvert au jalon **J16**. À faire passer **avec le gérant**, en
> préproduction, **avant** la bascule (`07-PLAN-EXECUTION.md` §1.5, critère G8).
> **Objet** : prouver, capacité par capacité, que la nouvelle gestion ne perd rien.

## 0. Comment se sert ce document

`01-AUDIT-EXISTANT.md` §3 est la **carte fonctionnelle** de l'app d'avant : tout ce
qu'elle faisait, en **141 lignes**. Ce document les reprend **toutes**, et pour chacune
répond à deux questions et deux seulement :

1. **Où vit-elle maintenant ?** — l'écran, la sheet, le geste. Pas une intention : un
   endroit où poser le doigt.
2. **Comment sait-on qu'elle marche ?** — le **nom du test** qui la couvre, ou, à
   défaut, « **à la main** » suivi du **geste exact** à exécuter.

Une ligne « à la main » sans geste écrit est un trou dans la recette, pas une ligne.

**Numérotation.** Les identifiants `NR-x.y` sont ceux de `07 §6.3`, conservés pour que
les renvois existants restent valides. Là où 07 avait fondu deux capacités de 01 en une
seule ligne, elles sont **séparées** ici par un suffixe (`NR-3.14a` / `NR-3.14b`) : une
capacité fondue dans une autre est une capacité qu'on oublie de vérifier. Une ligne
ajoutée par ce document porte le numéro suivant de sa section (`NR-11.11`).

**Comptage.**

| | Nombre |
|---|---|
| Lignes de 01 §3 (la liste de non-régression) | **141** |
| Lignes de recette dans ce document | **146** |
| Couvertes par au moins un test automatique | **135** |
| Exigeant un geste humain (§1) | **24** |
| — dont **aussi** couvertes par un test (la machine tient la mécanique, l'humain juge) | 13 |
| — dont **rien** qu'un automate puisse voir | 11 |
| Abandonnées en entier par une décision de 02 §4 (§2) | **7** |
| Fusionnées dans un autre mécanisme — la capacité demeure | 2 |

Les 146 lignes couvrent les 141 de 01 §3 : quatre d'entre elles sont scindées en deux
(`NR-3.14`, `NR-4.4`, `NR-9.5`, `NR-9.6`) et une est ajoutée (`NR-11.11`).

Une seule ligne n'a ni test ni geste : **NR-7.8**, le journal d'audit, abandonné — il
n'y a rien à vérifier. Les 24 gestes humains sont les 23 lignes marquées `(§1a)`,
`(§1b)` ou `(§1c)` dans les tableaux, plus **PC-12** (§4) : depuis J17 il a son test e2e
sur base vide, mais son objectif — une première vente en moins de cinq minutes — se juge
sur l'iPhone du gérant, chronomètre en main.

**Comment lire la colonne « Preuve ».**

| Écriture | Signifie |
|---|---|
| `e2e nom` | `e2e/parcours/nom.spec.ts` — Playwright, iPhone simulé |
| `db nom` | `tests/db/nom.test.ts` — PostgreSQL réel |
| `db tNN` | `tests/db/transactions/tNN-*.test.ts` — une transaction du moteur |
| `unit nom` | test pur, sans base (`src/**/__tests__/`) |
| `arch nom` | `tests/architecture/nom.test.ts` — lecture des sources |
| `layout` | `npm run test:layout` — toutes routes × 320/375/430 px, clavier ouvert et fermé |
| **à la main** | Aucun automate ne peut le voir. Le geste est écrit ; il figure aussi en §1. |

**La colonne « Vu ».** Cochée par **le gérant**, sur **son iPhone**, en préproduction,
devant l'exécutant. Une case non cochée bloque la bascule — ou justifie une décision
écrite de la laisser passer, consignée en §6.

---

## 1. Ce qui n'est pas couvert par un test automatique

**Ces 24 lignes sont le vrai travail de la recette.** Tout le reste est déjà tenu par
la machine à chaque envoi ; celles-ci ne le sont par personne tant que quelqu'un ne les
fait pas. Elles sont ici en tête pour qu'aucune ne se perde par omission.

Trois raisons distinctes d'être là — elles n'appellent pas le même effort :

**(a) Le geste dépend de l'appareil.** Le partage natif iOS, l'installation sur l'écran
d'accueil, les écrans de lancement, le clavier réel : aucun navigateur de test ne les
reproduit. → **iPhone du gérant obligatoire.**

| # | Capacité | Geste exact |
|---|---|---|
| NR-11.2 | Récupérer un visuel story par le partage natif avec fichier | Fiche parfum → visuel → **Partager**. La feuille iOS doit proposer **Snapchat** et **Enregistrer l'image**. Fermer la feuille sans choisir : **rien** ne doit se télécharger ensuite. |
| NR-1.13 | Partager le récap client | Fiche document → **Partager le récap**. Le texte partagé porte le **payé réel** (somme des paiements), pas un acompte figé. |
| NR-7.12 | 12 écrans de lancement iOS | Fermer l'app installée, la rouvrir : l'écran de lancement est **bordeaux avec le logo**, jamais un flash blanc. À refaire sur l'iPhone du gérant, son modèle décidant de la cible utilisée. |
| NR-7.17 | Invitation à installer | Ouvrir la préproduction dans **Safari** (pas l'app installée) : la carte apparaît dans le flux de l'Accueil. La fermer, recharger : elle ne revient pas. |
| NR-7.15 | Enregistrement du service worker en production seulement | En `npm run dev`, Réglages Safari → Avancé → Inspecteur : **aucun** service worker actif sur `localhost`. |
| NR-7.13 | Script de génération des assets PWA | `node scripts/build-admin-pwa-assets.mjs`, puis vérifier que `git status` ne montre **aucune** différence : les fichiers du dépôt sont bien ceux que le script produit. |

**(b) Le juge est un œil.** Un automate vérifie qu'un élément existe et qu'il tient dans
le rail ; il ne voit pas qu'il est laid, illisible ou de travers. → **contrôle visuel.**

| # | Capacité | Geste exact |
|---|---|---|
| NR-9.4 | Mise en avant éditoriale de la vitrine (2 bandeaux) | Ouvrir `/` : exactement **deux** bandeaux, alternés, au-dessus du catalogue. |
| NR-9.8 | Images bi-thème de la vitrine, en CSS pur | Sur `/`, Réglages iOS → Luminosité → **Sombre**, puis **Clair**, la page restant ouverte : les visuels basculent **sans rechargement et sans clignotement**. |
| NR-9.7 | Fiche parfum en dialogue, Snapchat, contact pré-rempli, jamais de prix | Sur `/`, toucher une fiche : dialogue ; bouton **Snapchat** en aplat ; **WhatsApp absent** si le parfum n'en a pas ; « Nous écrire » ouvre le formulaire avec `?parfum=&marque=` remplis ; **aucun prix** nulle part. |
| NR-9.6a | ~1080 « hints » de marques virales absentes du catalogue | Sur `/`, chercher **« lattafa »** : une caption de conciergerie et des alternatives du catalogue. |
| NR-9.6b | État vide « Pistes au catalogue » | Sur `/`, chercher **« zzzzz »** : l'état vide propose jusqu'à **6** pistes, jamais zéro ligne muette. |
| NR-9.5b | Recherche élargie serveur (API externe) | Sur `/`, chercher un parfum réel absent du catalogue (ex. **« initio oud for greatness »**) : **une** suggestion externe au plus, après ~350 ms. Dépend d'une clé d'API : à faire en préproduction, pas en local. |
| NR-7.20 | Metadata de la gestion (barre d'état lisible, zoom autorisé) | App installée : l'**heure** en haut est **noire et lisible**. Écarter deux doigts sur un écran : le zoom **fonctionne** (WCAG). |

**(c) Le verdict est un jugement de gérant.** Le texte est-il juste ? le chiffre
correspond-il à ce qu'il a en tête ? → **relecture, puis décision.**

| # | Capacité | Geste exact |
|---|---|---|
| NR-3.10 | Reprise de l'historique (remplace « Importer l'historique ») | Lire le **rapport de reprise** (`migration:verify`) ligne à ligne avec le gérant : Trésorerie, Encaissé, À encaisser, Marge nette. Chaque écart est expliqué **au centime** ou corrigé. C'est la relecture n°2 de 07 §2.6. |
| NR-5.13 | Stock : les ≤ 0 repris passent en « non suivi » | Lire la liste des parfums passés en « non suivi » au rapport de reprise, et **ressaisir** le stock de ceux qui sont réellement tenus. |
| NR-11.8 | Contenances hors règle jamais réécrites | Lire la liste des contenances hors 10/50/80 au rapport de reprise. Ouvrir un de ces documents : l'app **demande** la contenance au lieu de l'inventer. |
| NR-9.9 | Résilience de la vitrine (disjoncteur 90 s) | Revue du diff de `catalogue-service.ts` : il ne doit **rien** contenir hors L1. Le code de la vitrine n'est pas dans le périmètre de la refonte. |
| NR-9.10 | Invalidation du cache public pilotée par la gestion | En préproduction : masquer un parfum dans la gestion, recharger `/` dans les 10 s → il a disparu. Le remettre visible → il revient. |
| NR-5.15 | Invalidation coordonnée vitrine + gestion | Même geste que NR-9.10, plus : la liste du catalogue de la gestion est à jour **sans** rechargement manuel. |
| PC-12 | Première utilisation (carte « Pour commencer ») | `e2e/parcours/premiere-utilisation.spec.ts` couvre le parcours entier sur base vide (16 taps, 13,5 s). **Ce qui reste un geste** : le refaire sur l'iPhone du gérant, sur une base fraîche, en le chronométrant — l'objectif de 5 minutes se juge à son doigt et à son réseau, pas au banc. |
| NR-6.3 | Textes des cartes « Nouveautés » et « Pour commencer » | Relecture des textes avec le gérant (07 §6.5). Ils expliquent les six décisions qui changent un geste ; il doit s'y reconnaître. |
| NR-2.13 | Gabarit du message de relance | Relecture du texte avec le gérant (07 §6.5) : il doit pouvoir l'envoyer tel quel, sans le réécrire. |
| NR-1.11 | Textes des confirmations (S18) | Relecture (07 §6.5) : une confirmation qui dit « sans retour possible » doit être sans retour possible ; une qui promet un filet de 5 s doit l'offrir. |
| NR-7.11 | Manifeste PWA (raccourcis à jour) | Installer l'app, appui long sur l'icône : les raccourcis proposés sont **Vendre**, **Nouvelle commande**, **Encaisser** — et chacun ouvre le bon écran. |

---

## 2. Ce qui est abandonné volontairement

**Rien de tout cela n'est un oubli.** Chaque ligne est une capacité de l'app d'avant que
`02-VISION-PRODUIT.md` §4 a décidé de ne pas reconduire, avec sa raison. Elles sont ici
pour que le gérant les voie disparaître **en connaissance de cause**, pas pour qu'il les
découvre le jour de la bascule.

| # | Ce qui disparaît | Pourquoi (02 §4) | Ce qui le remplace |
|---|---|---|---|
| NR-1.15 | **Purge « éphémère »** : les commandes livrées étaient supprimées à J+1, les annulées immédiatement — et la suppression était déclenchée par une simple **lecture** | §4.1. Perte d'historique et de créances, mouvements orphelins, destruction sur lecture. La production l'avait elle-même retirée le 10/09/2026. | **Rien ne s'efface.** Segments « Livrées » et « Annulées » de E10 ; la compta garde tout. |
| NR-8.10 | Cycle de vie éphémère des commandes, côté schéma | §4.1, même décision | Voir NR-1.15 |
| NR-1.9 / NR-2.9 | **« Finaliser la vente »** (`?fromOrder`) : une commande se re-saisissait en vente | §4.1. Le pont perdait coût DZD, taux, dons, client et lot, et comptait l'argent deux fois en Trésorerie. | **Un seul document.** « Livrer » et S02 « Encaisser et livrer ». `?fromOrder` redirige. |
| NR-2.15 / NR-7.8 / NR-8.9 | **Journal d'audit** (`AuditLog`) | §4.7. Écrit, jamais lu, `actorId` null sur les chemins vivants — un seul opérateur. | Rien. Réintroductible si un second opérateur arrive. |
| NR-5.16 / NR-8.9 | **Rôles OWNER / EDITOR / VIEWER** | §4.5, §4.7. Lecture seule partielle et contournable — protection de façade. | Une garde de session unique, invisible. |
| NR-7.6 | `GET /api/admin/session` (lisait le rôle) | 04 §3.5. Sans rôle, il n'a plus d'objet. | Supprimé |
| NR-7.9 | **Sonde `/api/admin/health`** et son second secret `ADMIN_DASHBOARD_SECRET` | §4.7. Un deuxième secret à gérer pour une sonde que personne n'appelait. | Supprimée ; variable retirée |
| NR-3.10 | **« Importer l'historique »** (backfill permanent) | §4.3. Un bouton de rattrapage permanent est un aveu que les écritures ne sont pas fiables. | La **reprise** (07 §2), faite une fois, vérifiée au centime |
| NR-6.10 | **Barre de progression de navigation** (600 ms après coup) | §4.6. Elle mesurait une attente imaginaire. | Squelettes aux proportions du contenu |
| NR-2.x | **Correction du reste dû en champ libre** dans le ticket de compta | §4.2. Deux chemins pour la même action, dont un sans poche ni contre-passation. | La dette **se paie** (encaissement) ou **se contre-passe** (annulation d'un paiement) |
| NR-8.x | `Sale.remainingDue` (dette scalaire devenue pivot) | §4.2 | Dérivée du ledger unique |
| NR-5.x | `Perfume.isPrivate`, `Perfume.slug` « p-{id}- », `ExternalImportSuggestion`, `BatchExpense.countInCompta` | §4.3, §4.5. Champs et tables morts, ou promesses jamais tenues. | Supprimés |
| NR-1.x / NR-5.x | **Pile REST héritée** (`app/api/admin/**` d'écriture) | §4.1, §4.5. Règles divergentes de celles du domaine : la moitié des bugs. | Une seule pile d'écriture : les server actions |
| — | Chiffres sans définition : « CA », « bénéfice », « panier moyen », « prévision » | §6 | Les quatre chiffres canoniques, définis une fois |

---

## 3. La non-régression, ligne par ligne

### 3.1 Commandes (01 §3.1 — 14 lignes, 15 de recette)

| # | Capacité (01 §3.1) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-1.1 | Liste groupée par urgence, compteurs, filtre segmenté dans l'URL | **E10** `/admin/commandes` : sections En retard · Aujourd'hui · Demain · Cette semaine · Plus tard · Sans date ; segments `?vue=` et chips `?filtre=` | e2e `commande-acompte-livraison` ; `layout` E10 | [ ] |
| NR-1.2 | Plafond de 200 lignes | **Simplifié** (02 §4.1) : « Afficher plus » qui **ajoute** (`?pages=`), recherche client ou parfum, segments Livrées / Annulées | e2e `commande-acompte-livraison` (60 commandes semées) ; db `documents-queries` | [ ] |
| NR-1.3 | Création : client lié ou libre, catalogue ou hors catalogue, contenances, don, coût DZD + taux, **note par ligne**, date de livraison, notes | **E11** `/admin/vendre?mode=commande` (composeur unique), sheets **S05** (parfum) et **S06** (client) | e2e `commande-acompte-livraison` (PC-03, 9 taps) ; db `t01` ; unit `line-draft` | [ ] |
| NR-1.4 | Acompte initial à la création ⇒ commande confirmée | **E11** champ « Reçu maintenant » + poche ; le document naît `CONFIRMED` si la réserve est levée, **avec** son mouvement de Trésorerie | db `t01-create-document-with-payments` ; e2e `commande-acompte-livraison` | [ ] |
| NR-1.5 | Mémoire de prix serveur, pré-remplissage prix / coût / taux, dernier taux | `PerfumePricing` **apprenante** ; taux DZD par défaut dans **E08 Réglages** | db `t01` ; e2e `vente-directe`, `reglages` | [ ] |
| NR-1.6 | Cycle de statuts à réserves confirmables ; confirmation auto au premier acompte sans réserve | **S01** zone 2 (segment de statut) + **S18** (confirmation) ; `src/domain/document-status.ts` | unit `document-status` ; db `t04`, `t07` | [ ] |
| NR-1.7 | Paiements sur fiche (acompte, solde, poche, méthode, note), historique typé, annulation par contre-écriture | **S01** zone 5 ; sheets **S02** (encaisser) et **S04** (historique) ; contre-passation par `reversesId` | db `t07`, `t08` ; e2e `annuler-paiement` (PC-10, 3 taps) | [ ] |
| NR-1.8 | Livraison partielle par ligne (stepper, « Tout », clamp serveur, optimiste, badge « Partiel ») | **S01** zone 4 « Livré 1/3 » ; **1 tap** par ligne ; légende de E10 ; segment « Livrée » mis en évidence quand tout est pointé | db `t03-set-line-delivered` ; e2e `commande-acompte-livraison` ; unit `fulfillment` | [ ] |
| NR-1.9 | Finalisation en vente (`?fromOrder`) | **Fusionnée** (02 §4.1) : « Livrer », et **S02** « Encaisser et livrer ». `?fromOrder` redirige. | db `composed-actions` ; arch `redirects` ; e2e `commande-acompte-livraison` | [ ] |
| NR-1.10 | Duplication « réassort » | **S01** → « Refaire » → **E11** `?depuis=` : lignes, client et lot repris, **paiements laissés de côté** | e2e `refaire` | [ ] |
| NR-1.11 | Suppression avec confirmation et annulation 5 s | Document **sans paiement** : suppression (T6) + filet « Annuler » 5 s. **Avec** paiement : « Annuler le document » (S03), contre-passé. | db `t06`, `t05` ; e2e `couches` (le filet sous une sheet) ; **texte à la main** (§1c) | [ ] |
| NR-1.12 | Rattachement aux lots (fiche et masse) | **S01** zone 6, **S07** (choix de lot), **S13** (masse), **E11** zone 7 — **dès la création** | db `t13` ; e2e `lot-depense` | [ ] |
| NR-1.13 | Partage du récap client, marge estimée, nom modifiable en place | **S01** : « Partager le récap » (payé **réel**), « Marge avant dépenses », nom éditable en place | e2e `client` (partage simulé) ; unit `share` ; **partage réel à la main** (§1a) | [ ] |
| NR-1.14 | Créances des commandes dans « À encaisser » et en compta | **E13** `/admin/encaisser` et **E03** : un seul `aEncaisser()` | db `chiffres-definitions`, `chiffres-parity` ; e2e `encaisser-creance` | [ ] |
| NR-1.15 | Purge « éphémère » (livrées supprimées à J+1) | **Abandonnée** (02 §4.1) — voir §2 | e2e `commande-acompte-livraison` : une commande livrée reprise **reste visible** | [ ] |

### 3.2 Vendre / Encaisser (01 §3.2 — 15 lignes)

| # | Capacité (01 §3.2) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-2.1 | Vente multi-lignes : sélecteur sans accents, contenances, stepper, prix €, coût DZD, taux par ligne | **E11** `/admin/vendre` + **S05** : un parfum déjà au ticket **s'incrémente** au lieu de doubler la ligne | e2e `vente-directe` (PC-01, **3 taps**) ; unit `composer-model` | [ ] |
| NR-2.2 | Pré-remplissage à l'ajout d'une ligne et au changement de contenance | **E11** chips de contenance ; `GET /api/admin/picker` | e2e `vente-directe` ; db `catalogue` | [ ] |
| NR-2.3 | Dernier taux mémorisé (277 en dur ×3) | **Simplifié** (02 §4.2) : `Setting.defaultExchangeRate` dans **E08 Réglages**, plus les tarifs appris | e2e `reglages` ; db `pockets-and-settings` | [ ] |
| NR-2.4 | Dons : « Offert », prix forcé à 0, coût compté en perte | Bascule par ligne dans **E11** ; CHECK `line_gift_ck` ; décocher **restaure le dernier prix** | db `t01` ; e2e `vente-directe` | [ ] |
| NR-2.5 | Hors catalogue : saisie normalisée, rattachement de marque, détection « déjà au catalogue » | **S05** sous-formulaire (`nommage.ts`, `resoudMarque`) | e2e `vente-directe`, `marque-doublon` ; unit `nommage` ; db `catalogue` | [ ] |
| NR-2.6 | Client lié ou de passage + contact, snapshot dénormalisé | **S06** (sélecteur) et **S10** (contact) ; la clé étrangère client est **toujours** propagée | db `t01`, `customers` | [ ] |
| NR-2.7 | Total, marge en temps réel, calculatrice « reçu espèces → à rendre » | **E11** zone 8 : « Marge avant dépenses », « Donné en espèces » | e2e `vente-directe` ; unit `composer-model`, `money` | [ ] |
| NR-2.8 | Répartition par poches, reliquat vers « Non attribué » | **Poche par défaut** pré-sélectionnée (zéro tap dans le cas courant) ; **S08** pour répartir ; plafond serveur Σ ≤ reçu | db `t01`, `t11` ; e2e `reglages`, `transfert` | [ ] |
| NR-2.9 | Solde de commande par `?fromOrder` | **Fusionné** — voir NR-1.9 | arch `redirects` | [ ] |
| NR-2.10 | Décrément du stock à la vente, restitution à la suppression | **Deltas de quantités livrées** sur tous les chemins (T1–T6), plancher explicite, `NULL` distinct de 0 | db `stock` ; unit `stock` | [ ] |
| NR-2.11 | Mouvements d'encaissement liés et contre-passés | Un mouvement de Trésorerie **par paiement**, dans la **même transaction** ; contre-passation à l'annulation | db `triggers`, `t07`, `t08`, `t12` | [ ] |
| NR-2.12 | Écran « À encaisser » unifié, plus anciennes d'abord, > 30 jours signalées, recherche | **E13** `/admin/encaisser`, groupé par client, « depuis 42 j », chip « Plus de 30 jours » | e2e `encaisser-creance` (PC-02, **4 taps** depuis l'Accueil) ; db `documents-queries` | [ ] |
| NR-2.13 | Sheet d'encaissement : montant au reste dû, « La moitié », « Tout solder », poche, plafond serveur | **S02** ; « La moitié » **arrondie à l'euro** (on paie en espèces) | unit `money`, `collect-model` ; db `t07` ; **texte de relance à la main** (§1c) | [ ] |
| NR-2.14 | Encaissement d'une commande par le ledger | Une action unique, `recordPaymentAction` — plus de chemin parallèle | db `t07` ; arch `server-actions` | [ ] |
| NR-2.15 | Journal d'audit et revalidation par tags | Audit **abandonné** (02 §4.7) ; **revalidation déduite des modèles écrits**, automatique | db `invalidation` ; e2e `lecture-de-ses-ecritures` | [ ] |

### 3.3 Compta / Trésorerie (01 §3.3 — 15 lignes)

| # | Capacité (01 §3.3) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-3.1 | Deux vues basculées, vue dans l'URL (`?vue=tresorerie`) | **E03** `/admin/compta?vue=` | e2e `compta` | [ ] |
| NR-3.2 | Tuiles Encaissé (décomposition) et Marge nette %, bandeau À encaisser, dépenses déduites | **E03** zone 2 + **S19** (détail du calcul). La décomposition ventes/commandes est **sans objet** : un seul document. | db `chiffres-parity` ; e2e `compta` (« Encaissé − coûts − dépenses = Marge nette affichée ») | [ ] |
| NR-3.3 | Liste en trois sections, groupes repliables | **E03** zone 5 : par **lot**, puis **hors lot**. Les commandes en cours vivent dans E10, leur écran. | e2e `compta` | [ ] |
| NR-3.4 | Recherche client au-delà de 6 groupes | **E03** zone 4 — et elle **reste montée** tant qu'elle filtre (le champ ne disparaît plus sous le doigt) | e2e `compta` ; db `compta` | [ ] |
| NR-3.5 | Graphe « Encaissé par semaine » | **E03** zone 3, séries par période ; masqué sous deux points de mesure | db `chiffres-parity` (séries) ; unit `bar-chart-model` | [ ] |
| NR-3.6 | Ticket `?sale=` : consultation, édition, lot, partage, suppression | **S01** `?doc=` — la fiche est la **même** pour une commande et une vente. `?sale=` n'est pas repris : la page l'ignore. | e2e `compta` (« ancien lien de ticket ») ; arch `document-sheet`, `redirects` | [ ] |
| NR-3.7 | Export CSV comptable (BOM Excel, séparateur `;`) | `GET /api/admin/export/compta` | e2e `compta` (BOM, `;`, Σ « Encaissé (€) » = `encaisse(période)` sur trois périodes) ; unit `export-file` ; arch `vocabulaire` (aucun en-tête interdit) | [ ] |
| NR-3.8 | Vue Trésorerie : total, alerte non attribué, poches, créer / transférer / répartir / ajuster / payer un fournisseur | **E03** vue Trésorerie + **S14**, **S15**, **S16** ; ordre des poches réglable (**S21**) | e2e `transfert` (PC-11 : répartir 2 taps, transférer 5 taps), `compta` ; db `t11`, `t15` | [ ] |
| NR-3.9 | Journal groupé par mois, libellés résolus, lien vers l'origine | **E04** `/admin/compta/journal?mois=&poche=` : chips de poche, liens vers S01 et E06 | e2e `compta` (net du mois = somme SQL de 45 mouvements), `transfert` | [ ] |
| NR-3.10 | « Importer l'historique » | **Abandonné** (02 §4.3) : remplacé par la **reprise** (07 §2) | db `reprise` ; **rapport de reprise à relire** (§1c) | [ ] |
| NR-3.11 | Mouvements automatiques (vente, paiement, encaissement, dépense) | Un paiement **est** un mouvement, dans la même transaction — jamais l'un sans l'autre | db `t01`, `t07`, `t09`, `triggers` | [ ] |
| NR-3.12 | Réversibilité par origine | Contre-passation liée (`reversesId`) : suppression, annulation de paiement, dépense retirée | db `t08`, `t10`, `t12` | [ ] |
| NR-3.13 | Poche système « Non attribué » | Index unique partiel, créée par la migration, **ni renommable ni archivable**, jamais sous zéro | db `constraints`, `t15`, `pockets-and-settings` ; e2e `transfert` | [ ] |
| NR-3.14a | KPI serveur cachés (`revenueSummary`, `monthSummary`, `pipelineCounts`, tops, `dailyRevenue`) | `src/server/chiffres/` : **une définition SQL par chiffre**, jumeau TypeScript, `cached()` | db `chiffres-definitions`, `chiffres-parity`, `perf` ; arch `cache-calls`, `queries-defined` | [ ] |
| NR-3.14b | Blocs Argent et Alertes du tableau de bord qui les consomment | **E01** blocs « À faire » et Argent : Encaissé dominant, À encaisser, Trésorerie ; l'alerte « X € non attribués » ouvre la répartition | e2e `accueil` (PC-11 : 2 taps depuis l'alerte) ; db `accueil` | [ ] |

### 3.4 Lots (01 §3.4 — 12 lignes)

| # | Capacité (01 §3.4) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-4.1 | Liste Ouverts / Clos avec KPI recalculés par ligne | **Simplifiée** (02 §4.4) : **E05** `/admin/lots` — Marge nette par ligne, « À encaisser » en légende s'il y en a. Les KPI complets sont sur E06, où on agit. | e2e `lot-depense` (PC-08 : marge du lot en **2 taps**) ; db `batches-queries` | [ ] |
| NR-4.2 | Création (nom, date prévue, notes) puis détail | **E21** `/admin/lots/nouveau` → **E06** ; **S11** en ligne depuis un document | e2e `lot-depense` ; db `batches-queries` | [ ] |
| NR-4.3 | Détail : renommage en place, clôturer / rouvrir, tuiles, sections | **E06** `/admin/lots/[id]` : **cinq tuiles fixes** (plus de tuile qui change de sens selon le contexte) ; date et notes modifiables | e2e `lot-depense` ; db `batches-queries` | [ ] |
| NR-4.4a | Assignation en masse des **ventes** | **S13**, sheet unique (fusion, 02 §4.4), candidats chargés par RSC sous `?assigner=1` | db `t13` ; e2e `lot-depense` | [ ] |
| NR-4.4b | Assignation en masse des **commandes** | **S13**, la même — une seule sheet pour les deux | db `t13` ; e2e `lot-depense` | [ ] |
| NR-4.5 | Assignation unitaire inverse (lots ouverts seulement), avec retrait | **S01** zone 6 et **S07** | e2e `lot-depense` ; db `t13` | [ ] |
| NR-4.6 | Dépenses de lot : ajout avec poche source, suppression contre-passée | **S12** ; T9 (ajout, **datable**) et T10 (retrait, confirmé) | db `t09`, `t10` ; e2e `lot-depense` (dépense en **4 taps**) | [ ] |
| NR-4.7 | KPI cash-basis du lot | `margeNette({ batchId })` et apparentés — **une seule** fonction de chiffres par lot, quel que soit l'écran | db `chiffres-parity`, `batches-queries` | [ ] |
| NR-4.8 | Statut OPEN / CLOSED et ses effets | Idem, **plus un verrou serveur** (02 §4.4) : un lot clos ne se laisse plus modifier par une requête directe | db `t13` ; e2e `lot-depense` | [ ] |
| NR-4.9 | Suppression de lot protégée | Clé étrangère `Restrict` **et raison affichée** — plus de `window.confirm` nu | e2e `lot-depense` (« la suppression refusée dit pourquoi ») ; db `constraints` | [ ] |
| NR-4.10 | Intégrations Accueil, compta, Trésorerie | **E01** « Lots ouverts » ; **E03** sections par lot ; **E04** → **E06** | e2e `accueil`, `compta`, `lot-depense` | [ ] |
| NR-4.11 | Gardes `requireAdmin` / `requireEditor` | **Garde unique sans rôle** (02 §7), appliquée **par construction** : `defineAction`, `defineQuery`, `defineReadRoute` | arch `server-actions`, `queries-defined`, `route-handlers` ; db `invalidation` (« sans session ⇒ SESSION_EXPIRED ») | [ ] |

### 3.5 Catalogue (01 §3.5 — 17 lignes)

| # | Capacité (01 §3.5) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-5.1 | Trois onglets, recherche, chips à compteurs, état dans l'URL, `?stock=low` | **E15** `/admin/catalogue?tab=&q=&stock=&visibilite=&gamme=` ; `?stock=bas` (`low` redirigé) ; recherche insensible aux accents | e2e `catalogue-parfum` ; arch `redirects` ; `layout` E15 | [ ] |
| NR-5.2 | CRUD parfum complet, suppression définitive | **E16** (fiche), **E19** (formulaire) ; suppression avec confirmation, filet 5 s et « **Masquer plutôt** » | e2e `catalogue-parfum` ; db `catalogue` | [ ] |
| NR-5.3 | CRUD marque, dédoublonnage, suppression en cascade | **E17** ; `resoudMarque` rend l'existante au lieu d'une erreur | e2e `marque-doublon` ; db `catalogue` | [ ] |
| NR-5.4 | Bascule de visibilité optimiste avec rollback | **E15** (œil) et **E16** (interrupteur) | e2e `catalogue-parfum` (« visibilité basculée en 1 tap, gardée au rechargement ») | [ ] |
| NR-5.5 | Mise en avant limitée à 2 emplacements | **E15** onglet « En avant » ; **parfum visible exigé** ; plafond tenu **en base** | db `catalogue` (« quatre mises en avant simultanées : exactement deux réussissent ») | [ ] |
| NR-5.6 | Upload d'images : WebP recadré, URL signée, visuel sombre + variante claire | `ImageField` ; conversion WebP **côté serveur** (l'iPhone n'encode pas le WebP) ; un **logo n'est jamais recadré** | unit `image-convert`, `webp`, `storage` ; e2e `catalogue-parfum` (« original illisible : refusé avec sa raison, et Réessayer ») | [ ] |
| NR-5.7 | Enregistrement automatique après upload sur une fiche existante | **E19** en modification | e2e `catalogue-parfum` ; db `catalogue` | [ ] |
| NR-5.8 | Normalisation orthographique (`nommage.ts`) | Reprise **telle quelle** — la doctrine « on ne recasse que ce dont on est sûr » est conservée | unit `nommage` ; e2e `vente-directe`, `marque-doublon` | [ ] |
| NR-5.9 | Dédoublonnage des marques, création à la volée | **S05** mode marques ; slug **stable** au renommage | db `catalogue` (« renommer ne change jamais le slug ») ; e2e `marque-doublon` | [ ] |
| NR-5.10 | Verrous de publication en cascade | `src/domain/publication.ts` — **un seul** jeu de règles et de messages ; CHECK en base ; T14 | unit `publication` ; db `catalogue`, `constraints` | [ ] |
| NR-5.11 | Grille tarifaire par (parfum, contenance) | **E19** zone 3 — fiche et grille en **un seul enregistrement** (A-6) ; CHECK `pricing_volume_ck` | db `catalogue` (atomicité), `constraints` ; e2e `catalogue-parfum` | [ ] |
| NR-5.12 | Pré-remplissage des formulaires par les tarifs | `GET /api/admin/picker` | e2e `vente-directe` ; arch `route-handlers` | [ ] |
| NR-5.13 | Suivi de stock : saisie, décrément, badges, alerte, filtre | **S20** (réglage absolu), badges de E15, alerte de E01, filtre `?stock=` ; **`NULL` « non suivi » distinct de 0** (02 §4.5) | db `stock` ; unit `stock` ; e2e `accueil`, `catalogue-parfum` ; **ressaisie à la main** (§1c) | [ ] |
| NR-5.14 | Instantané catalogue en cache, mode sélecteur allégé | Tag `admin-catalogue` ; route `picker` versionnée | db `catalogue` (« instantané admin »), `invalidation` ; arch `cache-calls` | [ ] |
| NR-5.15 | Invalidation coordonnée vitrine + gestion | `src/server/cache/invalidate.ts`, **déduite des modèles écrits** — plus de liste de tags à tenir à jour | db `invalidation` (« invalide gestion, admin-catalogue et le contrat vitrine »), `catalogue-vitrine` ; **+ contrôle en préproduction** (§1c) | [ ] |
| NR-5.16 | Rôles VIEWER / EDITOR et audit des mutations | **Abandonnés** (02 §4.5, §4.7) — voir §2 | arch `server-actions` (aucune garde de rôle résiduelle) | [ ] |
| NR-5.17 | Listes virtualisées, vignettes ≤ 256 px | `WindowedList` ; `nureaAdminThumbLoader`. Le rendu serveur ne part **plus** de la liste entière (539 Ko → 157 Ko). | `layout` E15 | [ ] |

### 3.6 Accueil / Tableau de bord / Shell (01 §3.6 — 11 lignes)

| # | Capacité (01 §3.6) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-6.1 | Tableau de bord en blocs streamés, squelettes dimensionnés | **E01** `/admin` : un `Suspense` par bloc, squelettes aux proportions exactes | e2e `accueil` (« le bloc Argent n'a pas bougé entre son squelette et son contenu ») ; db `accueil` | [ ] |
| NR-6.2 | Bloc Argent : Encaissé dominant + Marge nette %, À encaisser, Trésorerie, Ce mois | **E01** : « Encaissé · (mois) » dominant, À encaisser, Trésorerie ; l'historique complet est en Compta période « Tout » | e2e `accueil` (« un seul Encaissé, daté du mois, et le même nombre que sur la Compta ») | [ ] |
| NR-6.3 | Alertes conditionnelles (retard, non attribué, stock) — rien à faire = rien rendu | **E01** bloc « À faire » ; **chaque rangée ouvre exactement l'ensemble qu'elle compte** | e2e `accueil` ; **textes à relire** (§1c) | [ ] |
| NR-6.4 | Pipeline des commandes (compteurs, liens vers la liste filtrée) | **E01** « Commandes à livrer » ; « en retard » dans « À faire » | e2e `accueil` | [ ] |
| NR-6.5 | Raccourcis vers Clients, Lots, Statistiques | **Clients devient un onglet** ; « Lots ouverts » est un bloc ; « Tout le classement » mène à E07 | unit `navigation` ; e2e `accueil` | [ ] |
| NR-6.6 | Palette : navigation, création, recherche globale | **S17** : groupes « Créer » et « Aller à », résultats, et **actions de résultat** — « Encaisser 70 € » sur un client, « Vendre » sur un parfum, **sans changer d'écran** | e2e `shell`, `recherche` ; db `search` | [ ] |
| NR-6.7 | Header : logo sur racine, retour **dérivé de la route**, recherche | `AppHeader` + `getParentScreen` ; le retour restitue le parent **avec ses filtres et son défilement** | unit `navigation`, `shell` ; e2e `shell` | [ ] |
| NR-6.8 | Tab bar 5 onglets, Vendre accentué | **Accueil · Commandes · Vendre · Clients · Catalogue** — l'onglet Compta disparaît (décision n°1) | unit `navigation` ; arch `documentation` ; `layout` | [ ] |
| NR-6.9 | Écran de classement des parfums | **E07** `/admin/statistiques` : période, **unités**, « Hors catalogue » signalé, « Afficher plus » | e2e `accueil` (E07) ; db `accueil` | [ ] |
| NR-6.10 | Shell PWA : rail 430 px, clavier, pull-to-refresh, annulation 5 s, installation, service worker, hors ligne, connexion hors shell | Shell (J4) + PWA (J16). Barre de progression factice **abandonnée** (02 §4.6). | `layout` ; e2e `shell`, `couches`, `connexion` ; arch `offline-page` | [ ] |
| NR-6.11 | Cache serveur taggé, mémoïsation par rendu | `cached()` et `defineQuery` ; `react.cache` par rendu — deux blocs ne paient pas deux fois la Trésorerie | arch `cache-calls`, `queries-defined` ; db `perf` | [ ] |

### 3.7 Auth / PWA / Infra (01 §3.7 — 20 lignes)

| # | Capacité (01 §3.7) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-7.1 | Connexion identifiant / mot de passe, bcrypt, JWT 7 jours, cookie `nurea_admin` | **E18** `/admin/login` ; `loginAction` ; **renouvellement glissant** de la session | e2e `connexion`, `session` ; db `login` ; unit `token` | [ ] |
| NR-7.2 | Limitation des tentatives de connexion | **Backoff persistant** (02 §4.7) — plus de compteur en mémoire perdu à chaque déploiement | db `login` | [ ] |
| NR-7.3 | Garde sur `/admin` + en-tête `x-nurea-admin-route` | **`proxy.ts`** : le JWT est **vérifié**, pas seulement constaté présent ; l'en-tête est posé | e2e `connexion` ; arch `maintenance-page`, `css-registers` | [ ] |
| NR-7.4 | Root layout minimal, sans CSS | Inchangé — une feuille importée là s'embarquerait dans les deux registres | arch `css-registers` | [ ] |
| NR-7.5 | Garde des routes d'API | `defineReadRoute`, `defineAction`, `defineQuery` — la garde est **la seule porte** | arch `route-handlers`, `server-actions`, `queries-defined` | [ ] |
| NR-7.6 | `GET /api/admin/session` | **Supprimé** (plus de rôle à lire, 04 §3.5) | arch `route-handlers` (liste fermée des routes) | [ ] |
| NR-7.7 | Route de déconnexion (qui n'avait aucune interface) | **E08 Réglages** → « Se déconnecter », avec confirmation ; le brouillon local est gardé sur l'appareil | e2e `session` | [ ] |
| NR-7.8 | Journal d'audit | **Abandonné** (02 §4.7) — voir §2 | — | [ ] |
| NR-7.9 | Sonde de santé + second secret | **Abandonnée** (02 §4.7) ; `ADMIN_DASHBOARD_SECRET` retirée | arch `route-handlers` | [ ] |
| NR-7.10 | Création de compte par CLI | `scripts/create-admin.ts`, sans rôle, avec garde d'hôte | e2e (tous) : `e2e/global-setup.ts` **appelle le script** pour créer le compte du banc — un `npm run test:e2e` vert prouve qu'il fonctionne | [ ] |
| NR-7.11 | Manifeste PWA dynamique (scope, couleurs, icônes, raccourcis) | `GET /api/pwa/admin` ; raccourcis Vendre / Nouvelle commande / Encaisser | e2e `environnement` ; **appui long sur l'icône à la main** (§1c) | [ ] |
| NR-7.12 | 12 écrans de lancement iOS | `src/lib/pwa/splash-targets.json` — **un seul** fichier, lu par le script et par `admin-splash.ts` | **à la main** (§1a) | [ ] |
| NR-7.13 | Script sharp des assets PWA | `scripts/build-admin-pwa-assets.mjs`, conservé | **à la main** (§1a) : relancer, `git status` vide | [ ] |
| NR-7.14 | Service worker prudent (jamais `/api/*`) | **Rendu par route** : `app/admin-sw.js/route.ts` depuis `src/app-shell/pwa/service-worker.ts`, versionné par déploiement ; une nouvelle version **attend** | unit du script rendu (aucune règle `/api/`, se parse) | [ ] |
| NR-7.15 | Enregistrement en production seulement, désenregistrement en développement | Registrar conservé | **à la main** (§1a) | [ ] |
| NR-7.16 | Page hors ligne | `public/admin-offline.html` — statique, **CSS inline**, aucune ressource externe | arch `offline-page` ; e2e `hors-ligne` | [ ] |
| NR-7.17 | Bannière d'installation iOS | **Carte dans le flux de l'Accueil** (plus `beforeinstallprompt`), fermeture persistée | e2e `accueil` ; **installation réelle à la main** (§1a) | [ ] |
| NR-7.18 | Shell : connexion hors shell, header, tab bar, palette, pull-to-refresh | Groupe de routes `(gestion)` ; `/admin/login` **hors** shell | `layout` ; e2e `shell`, `connexion` ; arch `routes-builders` | [ ] |
| NR-7.19 | Synchronisation du viewport clavier iOS | **Service viewport unique** — un seul écrivain de `--admin-vh`, `--admin-keyboard-inset`, `--admin-vv-offset` | `layout` **clavier ouvert** (`champ-sous-clavier`, `cta-sous-clavier`, `sheet-ecrasee`) | [ ] |
| NR-7.20 | Metadata (noindex, `appleWebApp`, `themeColor` `#F2F2F7`, zoom autorisé) | `app/admin/layout.tsx`, conservé | e2e `environnement` ; **heure et zoom à l'œil** (§1b) | [ ] |

### 3.8 Socle de données (01 §3.8 — 11 lignes)

| # | Capacité (01 §3.8) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-8.1 | Catalogue bi-registre `Brand` / `Perfume` | **Inchangé pour la vitrine** (03 §6) — c'est le contrat dur de la refonte | db `catalogue-vitrine` ; e2e `catalog-filters` | [ ] |
| NR-8.2 | Mémoire de prix `PerfumePricing` | Conservée, **apprenante** | db `t01`, `catalogue` | [ ] |
| NR-8.3 | Fichier clients `Customer` (téléphone unique) | Conservé, téléphone **normalisé en E.164** à l'écriture | db `customers`, `customers-queries` ; unit `phone` | [ ] |
| NR-8.4 | Pipeline `Order` / `OrderItem` | **`SaleDocument`** origine `ORDER` + **`SaleLine`** | db `reprise` ; arch `table-ownership` | [ ] |
| NR-8.5 | Ledger `PaymentTransaction` | **`Payment`** + `CashMovement`, **mêmes identifiants** qu'avant (les liens partagés survivent) | db `reprise`, `t07` | [ ] |
| NR-8.6 | Tickets `Sale` / `SaleItem` à snapshots figés | **`SaleDocument`** origine `DIRECT_SALE`, snapshots **typés** (plus de JSON à interroger) | db `reprise`, `documents-queries` | [ ] |
| NR-8.7 | Lots et dépenses | `Batch`, `BatchExpense` **liée à son mouvement** | db `t09`, `t10`, `batches-queries` | [ ] |
| NR-8.8 | Trésorerie poches / mouvements | Conservée, **en écriture seule** : un mouvement ne se modifie pas, il se contre-passe | db `triggers`, `constraints` | [ ] |
| NR-8.9 | Comptes à rôles et journal d'audit | Compte **unique sans rôle** ; audit **abandonné** (02 §4.7) | db `login` ; arch `server-actions` | [ ] |
| NR-8.10 | Cycle de vie éphémère des commandes | **Abandonné** (02 §4.1) — voir NR-1.15 | db `reprise` | [ ] |
| NR-8.11 | KPI cash-basis calculés sur le modèle | `src/server/chiffres/`, définitions de 02 §6, une par chiffre | db `chiffres-definitions`, `chiffres-parity`, `periods` | [ ] |

### 3.9 Vitrine publique (01 §3.9 — 12 lignes)

**Hors périmètre de la refonte.** Elle doit fonctionner **à l'identique** avant, pendant
et après. C'est la contrainte la plus dure du chantier : la vitrine lit les mêmes tables.

| # | Capacité (01 §3.9) | Preuve | Moment | Vu |
|---|---|---|---|---|
| NR-9.1 | Catalogue une page, filtres, 12 fiches visibles, **toutes dans le DOM** (référencement) | e2e `catalog-filters` ; comptage du DOM | Chaque fin de jalon, et B10 | [ ] |
| NR-9.2 | Filtres miroirs de l'URL (`q`, `cat`, `sort`, `maison`, `brands`) ; un lien `?maison=` partagé survit à un renommage de marque | e2e `catalog-filters` ; db `catalogue` (slug stable) | J11, B10 | [ ] |
| NR-9.3 | Cartes « Gammes complètes » synthétisées depuis les marques `COMPLETE` | db `catalogue-vitrine` (comptage) | Répétitions, B10 | [ ] |
| NR-9.4 | Mise en avant éditoriale (2 bandeaux alternés) | **à la main** (§1b) : deux bandeaux sur `/` | B10 | [ ] |
| NR-9.5a | Recherche floue locale (accents, Levenshtein, tokens, pertinence) | e2e `catalog-filters` | B10 | [ ] |
| NR-9.5b | Recherche élargie serveur (cache, Fraganty, suggestion unique) | **à la main** (§1b) : une requête absente du catalogue | J16, B10 | [ ] |
| NR-9.6a | ~1080 « hints » de marques virales | **à la main** (§1b) : chercher « lattafa » | J16 | [ ] |
| NR-9.6b | État vide « Pistes au catalogue », plafonné à 6 | **à la main** (§1b) : chercher « zzzzz » | J16 | [ ] |
| NR-9.7 | Fiche en dialogue, Snapchat, WhatsApp conditionnel, contact pré-rempli, **jamais de prix** | **à la main** (§1b) | J16, B10 | [ ] |
| NR-9.8 | Images bi-thème par CSS pur (jamais via JavaScript) | **à la main** (§1b) : basculer le thème iOS page ouverte | J16 | [ ] |
| NR-9.9 | Résilience base (disjoncteur 90 s) | **à la main** (§1c) : revue du diff de `catalogue-service.ts` | B10 | [ ] |
| NR-9.10 | Invalidation du cache public pilotée par la gestion | db `invalidation`, `catalogue-vitrine` ; **+ contrôle en préproduction** (§1c) | J11, B10 | [ ] |

### 3.10 Clients (01 §3.10 — 7 lignes)

| # | Capacité (01 §3.10) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-10.1 | Liste A–Z, recherche dans l'URL, badge « X € dû », pagination | **E12** `/admin/clients` : « Afficher plus » qui **ajoute**, initiales accentuées **sous leur lettre de base**, noms sans initiale sous « # » | e2e `client` ; db `customers-queries` (« badge = À encaisser de la fiche ») | [ ] |
| NR-10.2 | Création par formulaire **et en ligne** depuis une commande ou une vente | **E20** `/admin/clients/nouveau` ; **S06** + **S10** sans quitter le composeur | e2e `client` (téléphone « 06 12 34 56 78 » → E.164, homonyme et numéro pris **dits avant l'envoi**) ; db `customers` | [ ] |
| NR-10.3 | Fiche : nom en place, « client depuis », 3 KPI, Appeler / WhatsApp / Snap, notes, historique | **E14** : Documents · À encaisser · Dernier achat ; historique **complet**, paginé (plus de plafond à 50) | e2e `client` (PC-06 : dû en **2 taps**, relance en 2 de plus) ; db `customers-queries` | [ ] |
| NR-10.4 | Édition ; suppression avec garde serveur et annulation 5 s | **E20** ; **E14** — la suppression **dit pourquoi** elle est refusée, et l'historique reste sous le **dernier** nom connu | e2e `client` ; db `customers` (garde, atomicité, snapshots) | [ ] |
| NR-10.5 | Sélecteur partagé fiche / « client de passage, sans fiche » | **S06** : combobox plein écran, clients proposés **avant toute frappe** | e2e `vente-directe`, `client` ; db `search` | [ ] |
| NR-10.6 | Recherche globale des clients (palette) | **S17** : téléphone normalisé, WhatsApp et Snap cherchés, sans accents, tous les mots | db `search` ; e2e `recherche` | [ ] |
| NR-10.7 | Ardoise dérivée à la volée, jamais stockée | `aEncaisser({ customerId })` — **le même nombre** en liste, sur la fiche et dans À encaisser | e2e `client` (« même montant partout… pour trois clients ») ; db `chiffres-definitions` | [ ] |

### 3.11 Écart intégré le 17/09/2026 (01 §3.11.1 — 7 lignes, 11 de recette)

Les capacités des onze commits de production (`47aaad4..9e0b5d8`) mis en ligne le
10/09/2026, absentes de la base de l'audit. Elles sont dans la non-régression au même
titre que le reste.

| # | Capacité (01 §3.11.1) | Où elle vit maintenant | Preuve | Vu |
|---|---|---|---|---|
| NR-11.1 | Visuels story : dépôt multiple (HEIC), sans recadrage, galerie, plafond 24, pastille du nombre en liste | **E16** zone 7 ; légende de **E15** ; `PerfumeMedia` conservée | e2e `story` ; db `catalogue-media`, `catalogue` (instantané), `reprise` | [ ] |
| NR-11.2 | Récupération par le **partage natif avec fichier** (Snapchat, Photos), sinon téléchargement ; feuille fermée = rien | Visionneuse de `MediaGallery` | e2e `story` ; unit `media-gallery`, `share-and-image` ; **essai sur l'iPhone** (§1a, PC-13) | [ ] |
| NR-11.3 | Retrait d'un visuel et suppression de ses objets (aussi à la suppression du parfum) ; chemin de stockage **jamais cru du client** | `removePerfumeMediaAction`, `deletePerfumeAction`, `addPerfumeMediaAction` | db `catalogue-media` (« source hors `tmp/stories/<parfum>/` ⇒ VALIDATION : rien de lu, rien d'écrit ») | [ ] |
| NR-11.4 | « À rattacher » : commandes **et** ventes sans lot, livrées comprises, rattachées ligne par ligne, recherche débouncée ; **jamais tronquée en silence** | **E05** zone 0 ; **S07** ; T13 | e2e `lot-depense` (PC-08 variante : **3 taps** ; « la liste est bornée, le reste est nommé et se déplie ») ; db `t13` | [ ] |
| NR-11.5 | Recherche étendue (client, contact, notes, lot, parfum, marque, hors catalogue ; tous les mots ; sans accents) | **E10** zone 3, **E03** zone 4, **E05** zone 0, **S13** — les noms d'articles sont désormais des **colonnes typées**, plus un JSON | db `search`, `documents-queries`, `compta` ; e2e `compta`, `lot-depense` | [ ] |
| NR-11.6 | Livrées retirées du suivi **sans suppression** (fenêtre de 48 h), statut toujours modifiable | **E10** : « À livrer » ne contient jamais une livrée ; segment « Livrées » les garde **toutes**, sans minuterie ; le statut reste modifiable depuis **S01** zone 2 | e2e `commande-acompte-livraison` ; db `documents-queries` | [ ] |
| NR-11.7 | Commande en attente rattachable ; appartenance visible quel que soit le statut ; lot non supprimable tant qu'un document y est rattaché | **E06** zone 3, **S13** ; clé étrangère `Restrict` | e2e `lot-depense` (« une commande en attente est listée **hors** des chiffres, une annulée est repliée, la suppression refusée dit pourquoi ») ; db `t13`, `constraints` | [ ] |
| NR-11.8 | Contenances réelles **10 / 50 / 80 ml**, 80 par défaut ; contenance inconnue **jamais réécrite** | CHECK `line_volume_ck` / `pricing_volume_ck` ; `VOLUMES_ML` et `DEFAULT_VOLUME_ML` dans `src/domain/sale-line.ts` | unit `sale-line` ; db `constraints`, `reprise` ; **liste du rapport de reprise à lire** (§1c) | [ ] |
| NR-11.9 | Date de livraison **réelle** d'une commande (jamais la date prévue) | `SaleDocument.deliveredAt`, posé par la **seule** fonction de transition ; reprise : `Order.deliveredAt`, sinon `updatedAt`, **jamais `deliveryAt`** | db `reprise` (cas 26), `t04` ; CHECK `doc_delivered_at_ck` dans `constraints` | [ ] |
| NR-11.10 | Confirmation lisible et honnête ; filet « Annuler » tapable **sous une sheet** | `ConfirmDialog` : texte fourni par l'appelant, focus sur « Annuler », **erreur dans la boîte**, corps défilant ; toast portalisé au-dessus de tout | e2e `couches` (« le filet passe au-dessus, répond au doigt et laisse la sheet ouverte ») ; arch `tokens-sync` (bandes d'empilement) ; `layout` | [ ] |
| NR-11.11 | **Créer directement une commande confirmée sans acompte** (`3291428`) | **E11** mode Commande : `PENDING → CONFIRMED` sans acompte est une **réserve confirmable**, jamais un refus. Le document naît `PENDING`, ou `CONFIRMED` si un acompte lève la réserve. | unit `document-status` ; db `t04`, `t01` | [ ] |

> **NR-11.11 est ajoutée par ce document.** `07 §6.3` couvrait les six premières
> capacités de 01 §3.11.1 et enchaînait sur deux correctifs de `§3.11.2` (NR-11.9,
> NR-11.10), sautant la septième. La capacité existe et est testée ; c'était la ligne
> de recette qui manquait. `07 §6.3` a été amendé en conséquence.

---

## 4. Parcours chronométrés

### 4.1 Protocole de mesure

iPhone du gérant, PWA **installée** depuis la préproduction, Wi-Fi coupé (réseau
cellulaire), base jumelle fraîche, mémoires pré-remplies comme en usage réel (poche par
défaut, tarifs appris, un lot ouvert). **Le gérant exécute** ; l'exécutant enregistre
l'écran et compte les taps sur la vidéo. Chronomètre du **premier tap** au **retour
visuel de l'écriture** (carte de confirmation, toast ou pulse). Un essai
d'échauffement, puis trois essais : la **médiane** est retenue.

En parallèle, `e2e/helpers/tap.ts` compte les taps **à chaque envoi** : le nombre de
taps n'est pas un objectif déclaratif, c'est un invariant tenu par la machine.

### 4.2 Règle d'acceptation

Bloquant : nombre de taps **≤ cible de 06** (déterministe, vérifié en e2e) **et** temps
médian **≤ objectif de 02 §2**. Le temps visé de 06 est une intention : un dépassement
de plus de 50 % est analysé, et corrigé s'il vient de l'app (et non du réseau).

### 4.3 Les parcours

« Mesuré » = ce qui est constaté **aujourd'hui** sur le banc e2e ; la colonne se remplit
au chronomètre pendant la recette.

| Parcours | Objectif bloquant | Cible 06 | Test e2e | Mesuré à ce jour | Seuil | Vu |
|---|---|---|---|---|---|---|
| PC-01 Vente simple | ≤ 8 taps, < 20 s | 3 taps, ≈ 6 s | `vente-directe` | **3 taps, 2,2 s** (J9) | **bascule** | [ ] |
| PC-01 Vente à crédit partiel | < 20 s (tâche n°1) | 6 taps + saisie, ≈ 18 s | `vente-a-credit` | e2e vert | **bascule** | [ ] |
| PC-02 Encaisser une créance | ≤ 4 taps depuis l'Accueil, < 10 s | 3 taps, ≈ 6 s | `encaisser-creance` | **4 taps** depuis l'Accueil, dont 2 sur la liste (J8) | **bascule** | [ ] |
| PC-03 Prendre une commande | ≤ 15 taps, < 60 s | 9 taps, ≈ 15 s | `commande-acompte-livraison` | **9 taps** (J9) | **bascule** | [ ] |
| PC-04 Livrer (soldée / avec solde) | ≤ 3 taps (livraison complète) | 3 / 4 taps, ≈ 4–6 s | `commande-acompte-livraison` | **3 / 4 taps** (J8) | **bascule** | [ ] |
| PC-04 Pointer une ligne | 2 taps par ligne depuis la fiche | 1 tap | `commande-acompte-livraison` | **1 tap** (J8) | **bascule** | [ ] |
| PC-05 Paiement depuis la fiche | ≤ 5 taps | 2–3 taps | `commande-acompte-livraison` | **3 taps** (acompte), **2 taps** (solde) (J8) | **bascule** | [ ] |
| PC-06 Fiche client / relance | 2 taps / + 2 taps | 2 / 4 taps, ≈ 12 s | `client` | **2 taps** puis **2 de plus** (J10) | fiche : **bascule** ; relance : terminé | [ ] |
| PC-07 Nouveau parfum / visibilité | < 90 s / 1 tap | 9 taps + 2 saisies, ≈ 40 s / 1 tap | `catalogue-parfum` | **≤ 9 taps, < 90 s** / **1 tap** (J11) | **bascule** | [ ] |
| PC-08 Dépense de lot / marge du lot | ≤ 5 taps / 2 taps | 4 taps + saisie / 0 tap | `lot-depense` | **4 taps** / **2 taps** (J13) | **bascule** | [ ] |
| PC-09 Récap du jour / compta du mois | 1 tap / 2 taps | 0–1 tap / 1 tap | `accueil`, `compta` | récap **1 tap**, compta **1–2 taps** (J14) | compta : **bascule** ; récap : terminé | [ ] |
| PC-10 Défaire une erreur | ≤ 3 taps | 1–3 taps | `annuler-paiement` | **3 taps** (J8) | **bascule** | [ ] |
| PC-11 Répartir / transférer | ≤ 2 / ≤ 5 taps | 2 / 5 taps + saisie | `transfert`, `accueil` | **2 taps** / **5 taps + saisie** (J12) | **bascule** | [ ] |
| PC-12 Première utilisation | Première vente < 5 min | 16 taps, 13,5 s sur base vide | `premiere-utilisation` (`npm run test:e2e:premiere`) | **13,5 s** (J17) | terminé | [ ] |
| PC-13 Publier la story d'un parfum | 2 gestes une fois sur la fiche | 5 taps + saisie, ≈ 15 s depuis l'Accueil | `story` | e2e vert ; **partage natif non mesurable au banc** | **bascule** | [ ] |
| PC-08 variante · Ranger un document sans lot | 3 taps | 3 taps | `lot-depense` | **3 taps** (J13) | **bascule** | [ ] |

> **PC-12 a désormais son test e2e** *(J17, 22/09/2026)*. `07 §6.4` nommait un fichier
> `premiere-utilisation` qui n'existait pas ; il existe : il joue le parcours entier
> sur une base **vide** — les trois étapes de « Pour commencer », la marque créée dans
> la sheet du parfum, la vente pour un client de passage, puis la carte qui s'efface.
> Le jeu e2e partagé ne pouvait pas le porter (il a des poches, des parfums et des
> documents) : le parcours a son harnais — base `nurea_test_e2e_vide`, ports 3102/3103,
> aucun seed, projet `Mobile-premiere` —, lancé par `npm run test:e2e:premiere`, qui est
> la troisième commande de `npm run test:e2e`. Reste un geste humain : le refaire sur
> l'iPhone du gérant, chronomètre en main (§1a). Son seuil est « terminé », pas
> « bascule » : il ne bloque pas la bascule.

> **`commande-saisie` n'existe pas non plus.** `07 §6.3` le citait pour NR-1.3 et
> `07 §6.4` pour PC-03 : le parcours est en fait dans
> `e2e/parcours/commande-acompte-livraison.spec.ts` (« PC-03 : commande avec acompte
> créée par le composeur en 9 taps »). Les deux renvois ont été corrigés dans 07.

---

## 5. Ce qui exige la préproduction ou l'iPhone du gérant

Trois choses ne se prouvent **nulle part ailleurs**. Elles décident de la date de
bascule autant que le code.

### 5.1 Ce qui exige la préproduction

La préproduction est un **projet Supabase distinct** avec une **copie** des données
réelles, et un déploiement Vercel *Preview* qui pointe dessus. Sans elle, rien de ce
qui suit ne peut être fait — et il n'existe pas de contournement local.

| Quoi | Pourquoi la machine de test ne suffit pas |
|---|---|
| **Répétition générale de la reprise** (07 §2.4) | La reprise se juge sur les **vraies** données : les cas tordus sont ceux que personne n'a imaginés. Le rapport chiffré (Trésorerie, Encaissé, À encaisser, Marge nette) n'a de sens que sur la copie réelle. |
| **Relecture n°2 du rapport de reprise** avec le gérant (07 §2.6) | Il est le seul à savoir si « 1 097,39 € » est le bon nombre. |
| **NR-9.10 / NR-5.15** — invalidation du cache public | Le cache de Next ne se comporte comme en production que **déployé**. En local, tout paraît toujours frais. |
| **NR-9.5b** — recherche élargie de la vitrine | Elle appelle une API externe sous clé : jamais en local. |
| **Réglage G9 du bucket Supabase** | Les formats d'origine (HEIC, PNG) doivent être autorisés **avant** la bascule, sans quoi le dépôt d'un visuel depuis l'iPhone échoue. Réglage à faire dans la console Supabase du projet, pas dans le code. |
| **Budgets de perception** (J16) | Une mesure de latence sur `localhost` ne mesure rien. À refaire **à J+7** après la bascule. |
| **PWA installée** | `start_url`, `scope`, écrans de lancement et service worker ne s'observent que servis en HTTPS sur un vrai domaine. |

### 5.2 Ce qui exige l'iPhone du gérant

Pas « un iPhone » : **le sien**, avec son modèle, sa taille d'écran, ses réglages
d'accessibilité et son réseau.

| Quoi | Pourquoi |
|---|---|
| **Les 16 parcours chronométrés** (§4) | Le nombre de taps est tenu par la machine ; le **temps** dépend de son doigt, de son réseau et de son habitude. |
| **NR-11.2 / PC-13** — partage natif avec fichier | La feuille de partage iOS et son intégration Snapchat n'existent que sur l'appareil. |
| **NR-7.12** — écrans de lancement | La cible utilisée dépend de son modèle exact. |
| **NR-7.17** — installation sur l'écran d'accueil | Le geste Safari « Sur l'écran d'accueil » n'est pas automatisable. |
| **NR-7.20** — heure lisible, zoom autorisé | Se constate à l'œil, app installée. |
| **NR-7.19** — clavier | Le banc **simule** l'inset clavier ; seul le vrai clavier iOS prouve que rien ne passe dessous. |
| **NR-1.13** — partage du récap | La feuille de partage, et ce qu'il en fait ensuite. |

### 5.3 Ce qui n'exige ni l'un ni l'autre

Tout le reste — **135 lignes sur 146** — est tenu par
`npm run verify`, `npm run test:layout` et `npm run test:e2e`, à chaque envoi. La
recette ne les rejoue pas une à une : elle vérifie que les trois commandes sont vertes
sur la révision exacte qui sera déployée, et passe aux 24 lignes de §1.

---

## 6. Feuille de passage

À remplir **pendant** la séance, pas après.

| | |
|---|---|
| Date | ………………… |
| Révision (SHA) éprouvée | ………………… |
| URL de préproduction | ………………… |
| Appareil | iPhone ………… , iOS ………… |
| Présents | ………………… |

**Préalables, tous verts sur la révision ci-dessus :**

- [ ] `npm run verify` (typecheck, lint, `unit` + `arch`, `db`)
- [ ] `npm run test:layout`
- [ ] `npm run test:e2e`
- [ ] `npm run check:invariants -- --confirm-host <hôte de préproduction>`
- [ ] Répétition générale de la reprise verte de bout en bout (07 §2.4)

**Puis, dans l'ordre :**

- [ ] §1(a) — 6 gestes sur l'iPhone
- [ ] §1(b) — 7 contrôles à l'œil
- [ ] §1(c) — 11 relectures et décisions
- [ ] §4 — 16 parcours chronométrés, médiane de trois essais
- [ ] §3 — parcours des 146 lignes, colonne « Vu »

**Décisions prises en séance** (toute case laissée vide doit apparaître ici, avec sa
raison et qui l'a tranchée) :

| Ligne | Décision | Par |
|---|---|---|
| | | |

**Verdict.**

- [ ] **Prêt à basculer** (07 §6.1, seuil 1) — le gérant ne perd rien.
- [ ] Ajourné. Ce qui manque : …………………

---

*Fin du document 08. Il se lit après `07-PLAN-EXECUTION.md` et se passe avant la
bascule (B12, « feu vert de bascule »). Une ligne non vérifiée n'est pas une ligne
vérifiée : c'est exactement pour cela que ce document existe.*
