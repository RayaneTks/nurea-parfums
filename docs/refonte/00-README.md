# Refonte Nuréa Gestion — Dossier pilote

> **Statut** : **BASCULÉ le 22/09/2026** — la refonte est en production, `main` la porte, la base
> est au schéma cible (migration en 20 s, 14 contrôles verts, chiffres identiques au centime). Le
> détail et les deux écarts au plan sont en tête de `PASSATION.md`. Reste : la surveillance de sept
> jours (`07` §1.8), la recette de `08` qui n'a pas été passée, et le jalon N à J+30 (suppression du
> schéma `legacy`, qui est conservé comme chemin de retour).
>
> **J0 à J17 livrés et fusionnés** dans `refonte/integration` — suites complètes
> vertes (808 unitaires et d'architecture, 487 sur base réelle, 513 invariants d'affichage,
> 93 parcours). Le **retour arrière** de la bascule est éprouvé, sur base de test comme sur la copie
> des données réelles ; le parcours de **première utilisation** (PC-12) a son test de bout en bout.
> Reste au chantier : la répétition générale, puis la recette avec le gérant. La reprise des données
> a été répétée avec succès sur la copie réelle. Démarré le 17 septembre 2026.
> **Il reste, avant la bascule, des actions qui n'appartiennent pas à l'exécutant** : voir
> « Ce qui reste avant la bascule » plus bas. Fil de reprise d'un agent : `PASSATION.md` (racine).
> **Objet** : refonte complète, from scratch, de l'application de gestion (`/admin`),
> dite « Nuréa Gestion ». La vitrine publique (`app/(shop)`) n'est **pas** dans le
> périmètre, mais ses dépendances aux tables partagées sont une contrainte dure.

## Pourquoi une refonte

L'application actuelle est fonctionnelle mais s'est construite par corrections et
ajouts successifs : incohérences entre écrans, caches dénormalisés fragiles,
dualité structurelle commandes/ventes, chemins dupliqués vers la même tâche.
Plutôt que d'empiler une rustine de plus, on repart d'une conception propre —
sans rien perdre : la nouvelle version doit couvrir 100 % de l'existant
(liste de non-régression dans `01-AUDIT-EXISTANT.md`, §3).

## Directive prioritaire (donnée par le client le 17/09/2026)

**La priorité n°1 est la prise en main, la facilité d'utilisation et l'aspect
pratique** : l'app doit rendre les tâches terrain rapides et agréables. Ajouter
des fonctionnalités absentes de l'existant est bienvenu si ça sert l'usage réel.
**La sécurité est explicitement secondaire** : un garde simple et invisible
suffit (un seul opérateur en pratique) — on corrige les trous béants de l'audit
au passage, sans en faire un chantier ni ajouter de friction.

## Ce que la refonte doit livrer

- Une app **web + PWA iOS installée** (rail 430 px, standalone, offline de repli),
  mobile-first une main, gestes intuitifs.
- La **même identité** : registre `product`, bordeaux `#7B0B1D` sur neutres iOS,
  SF system, français direct — version évoluée et premium, pas une autre app.
- Un **modèle de données irréprochable** (MCD → MLD documentés) sans les défauts
  relevés par l'audit.
- Des **workflows impeccables** : chaque tâche terrain en 1–3 taps, un seul chemin
  par tâche, états toujours visibles.
- Zéro régression fonctionnelle : l'utilisateur retrouve tout, en mieux.

## La série de documents

Chaque document est autoportant et se lit dans l'ordre. C'est la passation
complète : un agent (ou un humain) qui n'a jamais vu ce repo peut exécuter la
refonte en lisant cette série.

| Doc | Contenu | Statut |
|---|---|---|
| `00-README.md` | Ce document — cadre et méthode. | ✅ |
| `01-AUDIT-EXISTANT.md` | Audit exhaustif de l'app actuelle : carte fonctionnelle (non-régression), bugs confirmés, incohérences, dette, forces à préserver, contraintes vitrine. | ✅ |
| `02-VISION-PRODUIT.md` | Vision cible : utilisateurs, tâches, principes, vocabulaire, périmètre v1. | ✅ |
| `03-MODELE-DONNEES.md` | MCD (entités/relations) puis MLD (schéma Prisma cible), stratégie de migration des données existantes. | ✅ |
| `04-ARCHITECTURE.md` | Architecture applicative : arborescence, couches (RSC / server actions / services), auth, transactions, invariants d'intégrité, PWA. | ✅ |
| `05-DESIGN-SYSTEM.md` | Design system : tokens, primitives, patterns, motion, a11y — hérité de l'existant, consolidé. | ✅ |
| `06-ECRANS-PARCOURS.md` | Architecture d'information, navigation, spec écran par écran avec états (vide/chargement/erreur) et gestes. | ✅ |
| `07-PLAN-EXECUTION.md` | Ordre de construction, jalons vérifiables, stratégie de bascule et de migration, critères d'acceptation. | ✅ |
| `08-RECETTE.md` | **La recette**, à passer avec le gérant avant la bascule : les 141 capacités de 01 §3, où chacune vit désormais, et comment elle est vérifiée (nom du test, ou geste exact). Plus les parcours chronométrés et ce qui exige la préproduction ou son iPhone. | ✅ ouvert (J16) |

## Méthode

1. **Comprendre** ✅ — audit multi-agents de l'existant (11 domaines), bugs
   contre-vérifiés adversarialement (doc 01).
2. **Concevoir** ✅ — vision (02) ; modèle de données arbitré entre trois
   propositions concurrentes (03) ; parcours arbitrés entre trois propositions
   — vitesse, clarté, iOS natif (06) ; architecture (04) ; design system (05).
3. **Planifier** ✅ — 17 jalons vérifiables, bascule répétée, migration chiffrée (07).
4. **Vérifier** ✅ — deux relectures croisées (données/technique, UX/produit) :
   27 incohérences relevées dont 7 bloquantes, toutes corrigées dans les docs.
5. **Exécuter** — en cours : voir « Avancement de la construction » ci-dessous.

## Avancement de la construction

Branche de travail : **`refonte/integration`** (la production reste sur `main`, intacte).

| Jalon | État | Commit / remarque |
|---|---|---|
| J0 Chantier | ✅ partie locale | React 19, Vitest en projets, CI, garde d'hôte, amendements A-1…A-13. **Reste** : projet Supabase de préproduction + variables Vercel *Preview* (compte du gérant requis) ; V-lib-3 (pooler) en attente de la préproduction. |
| L1 / L2 sur `main` | ✅ **fusionnés et déployés** (22/09) | `80a88f0` — avance rapide sur `main`. Vérifiés en production sur `nureaparfums.fr` : comptages de la vitrine **identiques** à ceux d'avant le déploiement, `/admin` → 307, `/api/admin/*` → 401, mode maintenance dormant. Trois builds ont été nécessaires (deux échecs réseau du constructeur, aucun lié au code) : voir la note de `07` §1.6. |
| J1 Schéma, migrations, retrait | ✅ | Schéma cible, expand/contract, 72 tests base, ancienne gestion retirée de la branche. |
| J2 Reprise des données | ✅ | Scripts + test des cas tordus. **Répétition n°1 sur la copie réelle (17/09) : verte de bout en bout** — Trésorerie 1 546,00 € = 1 546,00 € ; Encaissé 2 050,00 € = 2 050,00 € (résidu 0,00 €) ; À encaisser 825,00 € = 825,00 € ; Marge nette 1 097,40 € → 1 097,39 € (arrondi d'une ligne historique, règle 03 §4.8). Les 281 stocks à 0 passent en « non suivi » (décision n°5 confirmée : aucun stock n'était réellement suivi). |
| J3 Socle | ✅ | Domaine pur, contrats, defineAction/Query, transactions, cache, session, proxy, redirections, tests d'architecture. V-lib-1 et V-lib-2 validées. |
| J4 Design system + shell | ✅ | Design system `8ab654f` ; shell, connexion et harnais d'écran `a9a0005` ; 4 correctifs de couches venus de la production **appliqués** `01aaed2` (05, « appliqué »). Shell : 5 onglets et mémoire d'onglet, retour qui restitue le parent, palette (cadre), toasts, filet « Annuler », service viewport unique, bandeau de préproduction ; E18 définitif ; 5 racines d'onglet provisoires. `npm run test:layout` 48/48, `npm run test:e2e` 21/21. **Reste** : job CI `layout`. |
| J5 Moteur documents, stock, clients, lots | ✅ | T1 sans paiement, T2, T3, T4, T6, T13 testées sur base réelle. |
| J6 Moteur de l'argent | ✅ | `2e9ac88` — encaissements (T1 avec paiements, T7, A-5), annulations (T4b, T5, T8), Trésorerie (T11, T12, T15, poches), dépenses (T9, T10), réglages ; 383 tests base verts. |
| Écart avec `origin/main` | ✅ intégré | 11 commits de production (contenances 10/50/80, visuels story, « À rattacher »…) : 01 §3.11. |
| J7 Les chiffres | ✅ | `129d4c4` — une définition SQL par chiffre, parité au centime avec le jumeau TS, < 5 ms sur ×10 ; sur la copie réelle : Trésorerie 1 546,00 €, Encaissé 2 050,00 €, À encaisser 825,00 € = rapport de reprise. |
| J8 Fiche document, Commandes, encaissement | ✅ | `c888f65` — fiche en sheet `?doc=`, E10, E13, S02–S04, recherche globale ; taps : acompte 3, solde 2, pointer 1, encaisser une créance 4 depuis l'Accueil. test:layout 204, e2e 34. |
| J9 Vendre | ✅ | `e51bce9` — composeur unique (bascule Vente / Commande), hors catalogue, client de passage, « Reçu maintenant », carte de confirmation (Voir · Reçu · Annuler), brouillon qui survit à la coupure. **Vente simple : 3 taps, 2,2 s** (objectif 8 taps / 20 s) ; commande avec acompte 9 taps. |
| J10 Clients | ✅ | `c7396e9` — E12 liste sectionnée et paginée, E14 fiche (dû, historique, contact direct), E20 formulaire (téléphone normalisé, doublon nommé), relance et récap partageables. Même montant dû en liste, dans À encaisser et sur la fiche. test:layout 288, e2e 39. |
| J11 Catalogue | ✅ | Serveur `95fdc3c`, écrans `c888f65`, conversion WebP côté serveur `6ec8885` (l'iPhone n'encode pas le WebP : le serveur convertit, 0,4 s pour 12 Mpx ; garde de chemin, refus explicités). Réglage Supabase à faire avant la bascule : critère G9 de 07 §1.5. |
| J12 Compta, Trésorerie, Journal | ✅ | `b38588e` — E03 deux vues, E04 journal par mois, S14–S16, S19, S21, export CSV. Chaque chiffre confronté à sa requête canonique (en base et en e2e) ; Σ « Encaissé » du CSV = `encaisse(période)`. test:layout 270, e2e 46. |
| J13 Lots | ✅ | `7fffb10` — E05 (zone « À rattacher »), E06, E21, S13 unique, dépenses datables. Marge d'un lot 2 taps, dépense 4 taps, ranger un document 3 taps. Trois bugs trouvés au passage (chiffre du lot toujours à zéro, paquet client qui embarquait le serveur, libellé de champ pollué par l'astérisque). |
| J14 Accueil, récap du jour, statistiques | ✅ | E01 définitif (zones streamées, chaque alerte ouvre exactement l'ensemble qu'elle compte), E02, E07, cartes « Nouveautés » et « Pour commencer » (remontées de J15). `tableauDeBord()` à 4,4 ms sur dix fois le volume réel. Récap du jour lisible à 0 tap, détaillé en 1 ; compta du mois en 1 tap. Défaut hérité corrigé : collision d'identifiants du jeu e2e (J10/J12) qui empêchait toute la suite de démarrer. |
| J15 Réglages et nouveautés | ✅ | `5d89ae7` — E08 Réglages (poche par défaut, taux DZD, ordre des poches S21, version, déconnexion) et actions rapides dans la recherche (« Encaisser xx € », « Vendre »). Cartes « Nouveautés » et « Pour commencer », récap du jour, relances : livrés à J14. **Reste** : relectures de textes (gabarit de relance, carte « Nouveautés », confirmations) — tranchées par l'agent, à confronter à l'usage en préproduction (08 §1c). |
| J16 Polissage, PWA, recette | 🔄 presque | **Fusionnés** : documentation du dépôt remise au niveau du code et `08-RECETTE.md` (146 capacités, 135 couvertes par un test, 24 gestes humains décrits) ; PWA (service worker rendu par route et versionné, page hors ligne autonome, carte d'installation, 12 écrans de lancement régénérés à l'identique), performance (`tableauDeBord()` 5,1 ms sur dix fois le volume), accessibilité outillée (aucun contrôle sans nom accessible sur 513 cas d'écran ; 34 couples de couleurs vérifiés, **deux corrigés** — les badges « Livré » et « À encaisser » tombaient à 4,06:1 dans leur fond teinté). **Reste** : rien — le retour arrière et PC-12 sont passés à J17. |
| J17 Retour arrière et première utilisation | ✅ | `669255f` — le travail de J17 était écrit et **jamais exécuté** : il l'est. `tests/db/rollback.test.ts` 14/14 (chaîne complète du jour J puis retour arrière, plus le cas de l'instantané altéré) après deux correctifs de requêtes de contrôle ; retour arrière rejoué sur la **copie des données réelles** — R1 à R5 verts, référence recalculée identique au centime (Trésorerie 1 546,00 €, Encaissé 2 050,00 €, À encaisser 825,00 €, vitrine 99/9/42), **51,4 s**. Deux manques comblés : `npm run migration:instantane` (le jour J n'avait aucune commande pour produire la source du retour arrière) et `e2e/parcours/premiere-utilisation.spec.ts` (PC-12, **16 taps, 13 s** sur base vide, harnais `Mobile-premiere`). 07 §1.6, §1.7, §2.2, §6.3, §6.4 et 08 §1c/§3 amendés : ils décrivaient un retour arrière en `pg_restore`/`psql` inexécutable sur ce poste, et disaient PC-12 sans test. |
| Fusion `main` | ✅ | `9b371e2` — écart déjà intégré (01 §3.11), arbre de la refonte conservé. |

**Base de données locale des tests.** Docker Desktop ne démarre pas sur ce poste. Les tests
sur base réelle tournent sur un PostgreSQL 15 embarqué (paquet npm `embedded-postgres`,
port `54329`, `nurea`/`nurea`). `TEST_DATABASE_URL=postgresql://nurea:nurea@localhost:54329/nurea_test npm run test:db`
recrée la base de test en UTF-8 à chaque exécution (uniquement si l'hôte est local).
**Règle vitale** : `.env` et `.env.local` pointent sur la production et Prisma charge `.env`
tout seul — toute commande Prisma reçoit une `DATABASE_URL` **et** une `DIRECT_URL` locales
explicites ; jamais `npm run build` sans `NUREA_SKIP_MIGRATE_DEPLOY=1` et une URL factice.

## Essais disponibles (18/09/2026)

| Essai | Adresse | Données | Compte |
|---|---|---|---|
| **En ligne** (aperçu Vercel de `refonte/integration`) | `https://nurea-parfums-git-refonte-integration-rayanetks-7861s-projects.vercel.app/admin` — protégé par l'authentification Vercel (lien de partage de 24 h à régénérer par `vercel` ou le tableau de bord) | **Fictives** : base Neon `nurea-repetition` créée via la place de marché Vercel, jeu `e2e/fixtures/seed.ts` (20 parfums, 56 clients, 36 documents) | `essai` |
| **Local** | `http://localhost:3000/admin` (et l'IP du poste sur le réseau local, pour l'iPhone) | **Réelles**, migrées : base locale `nurea_repetition`, instantané du 17/09 rejoué par `repetition:refresh` | `essai` |

**Variables d'environnement de l'aperçu.** Les variables *Preview* du projet Vercel pointaient sur la
**base de production** : tout aperçu aurait écrit dans les vraies données. Elles sont désormais
surchargées **au niveau de la branche** `refonte/integration` (base Neon, secret de session distinct,
`SUPABASE_STORAGE_BUCKET=catalog-essai` — aucun visuel de production ne peut être supprimé,
`NUREA_ENV=preprod` pour le bandeau « Essai »). La garde du build a été éprouvée en vrai : le premier
déploiement de la branche, encore branché sur la production, **a échoué** au build avec le message
attendu, sans rien appliquer.

## Reprendre le travail (passation)

Pour un agent ou un développeur qui arrive sur le chantier :

1. **`git fetch` d'abord**, et comparer à `origin/main` : la branche locale peut être
   en retard. La branche de travail est `refonte/integration` ; la production reste
   sur `main`, intacte.
2. Lire **`CLAUDE.md`** (il décrit l'app telle qu'elle est aujourd'hui, pas celle
   d'avant), puis **ce document**, puis `02-VISION-PRODUIT.md` en entier (30 min) —
   c'est le « pourquoi » de toutes les décisions techniques.
3. Lire `07-PLAN-EXECUTION.md` §0 et §3.0 (conventions communes des jalons).
4. Ouvrir le jalon en cours ; ne lire les docs 03–06 **qu'aux sections que le
   jalon cite**. 01 sert de référence (bugs, non-régression), pas de lecture suivie.
5. **Règle d'or** : si un jalon remet en cause une décision, on amende d'abord le
   document amont concerné, puis on code. Une documentation qui ment est un bug —
   `tests/architecture/documentation.test.ts` en fait un bug qui échoue.
6. Après tout jalon d'UI : `npm run test:layout`. Après tout jalon d'argent : les
   tests de parité des chiffres et la reprise rejouée sur copie (07 §2.4).
7. Avant de dire « terminé » : `npm run verify`, et la ligne correspondante de
   `08-RECETTE.md` §3 doit nommer un test qui **existe**.

**Où trouver quoi, sans lire toute la série :**

| Question | Document |
|---|---|
| Comment est fait le dépôt ? quelles commandes ? | `CLAUDE.md` |
| Que faisait l'app d'avant ? | `01` §3 (carte fonctionnelle) |
| Pourquoi cette décision ? | `02` §4 (capacité par capacité) |
| Quelle table, quelle contrainte ? | `03` |
| Quelle couche, quelle transaction, quel cache ? | `04` |
| Quel jeton, quelle primitive ? | `05` (et `src/design/tokens.ts`, la source) |
| À quoi ressemble l'écran E__ ou la sheet S__ ? | `06` §3 |
| Dans quel ordre construire ? | `07` §3 |
| Est-ce vérifié, et par quoi ? | **`08` §3** |

**Points ouverts laissés à l'exécutant** (marqués dans 07) : vérifier que la build
ne touche pas la base ; essayer `vercel deploy --skip-domain` + `promote` en J16 ;
le premier rejeu de la reprise sur copie réelle (J2) dira s'il existe des poches
archivées non vides — *réponse du 17/09/2026 : aucune (trois poches archivées, soldes nuls ;
répétition sur l'instantané réel verte de bout en bout)*.

**Écart intégré le 17/09/2026.** La conception et la branche sont parties de l'ancien `main`
local (`47aaad4`) ; la production (`9e0b5d8`) avait 11 commits de plus (contenances 10/50/80,
visuels story, « À rattacher », recherche étendue, fenêtre de 48 h, correctifs). Inventaire et
effet sur la refonte : `01-AUDIT-EXISTANT.md` §3.11 ; chaque document amendé porte une note
« Écart intégré le 17/09/2026 » en tête. Le SQL de 03 (CHECK, triggers, vue) a été relu mais **pas
exécuté** (pas de Postgres local lors de la conception) : il s'éprouve en J1–J2.

## Ce qui reste avant la bascule

Deux colonnes, parce que deux personnes. **L'exécutant ne peut rien faire de la
colonne de gauche** : elle demande le compte Supabase et le compte Vercel du gérant,
son iPhone, ou son jugement. Tant qu'elle n'est pas faite, la bascule ne peut pas
être datée — ce n'est pas une question d'avancement du code.

### Ce qui appartient au gérant

| # | Action | Pourquoi lui | Bloque |
|---|---|---|---|
| G-1 | ~~**Créer le projet Supabase de préproduction** et y charger une copie des données réelles~~ | — | ✅ **levé le 22/09**, autrement que prévu : la préproduction est une base **Neon** (place de marché Vercel), et elle porte désormais les **données réelles** migrées (`npm run repetition:preprod`). Aucun projet Supabase de préproduction n'a été nécessaire : les visuels sont lus dans le bucket de production, les dépôts vont dans `catalog-essai`. |
| G-2 | **Renseigner les variables Vercel *Preview*** (`DATABASE_URL`, `DIRECT_URL`, `ADMIN_JWT_SECRET`, clés Supabase) vers ce projet | Son compte Vercel | Le déploiement de préproduction |
| G-3 | **Réglage G9 du bucket `catalog`** : autoriser les formats d'origine (HEIC, PNG, JPEG) en dépôt | Console Supabase, son compte | Le dépôt d'un visuel depuis l'iPhone (NR-5.6, NR-11.1) |
| G-4 | **Prêter son iPhone**, une demi-journée, pour la recette | C'est son modèle, son réseau, son doigt | Les 16 parcours chronométrés et les 6 gestes de `08` §1a |
| G-5 | **Relire les textes** : gabarit de relance, carte « Nouveautés », confirmations S18 | Il est le seul à savoir s'il enverrait ce message | `08` §1c |
| G-6 | **Relire le rapport de reprise** (relecture n°2, 07 §2.6), chiffre par chiffre | Il est le seul à savoir si le nombre est le bon | `08` §1c, et le feu vert de bascule |
| G-7 | **Choisir le créneau de bascule** — une heure creuse, sans vente en cours | Son activité | B12 |
| G-8 | **Donner le feu vert** (B12) après la recette | — | La bascule |

**Mise à jour du 22/09/2026** : une préproduction **en ligne** existe déjà (base Neon créée
via la place de marché Vercel, variables d'aperçu surchargées au niveau de la branche), mais
avec des **données fictives**. G-1 et G-2 ne bloquent donc plus l'essai par le gérant ; ils
bloquent encore la répétition générale sur données réelles et les budgets de perception.
Le fil de reprise pour un agent qui arrive est `PASSATION.md`, à la racine.

### Ce qui appartient à l'exécutant

| # | Action | État |
|---|---|---|
| E-1 | Finir J16 : PWA (service worker par route, page hors ligne, carte d'installation), performance, accessibilité | ✅ fusionné |
| E-2 | Documentation du dépôt au niveau du code + `08-RECETTE.md` | ✅ J16 |
| E-3 | Fusionner `fix/vitrine-slug-maintenance` (L1 / L2) dans `main` avant la bascule | ✅ **fait le 22/09**, en production et vérifié (comptages vitrine inchangés, mode maintenance dormant) |
| E-4 | Job CI `layout` (reste de J4) | ✅ job `ecrans` de `.github/workflows/refonte.yml` |
| E-5 | Répétition générale | ✅ **en local ET en préproduction** (22/09) : la procédure du jour J jouée commande par commande sur la copie des données réelles, retour arrière compris et bascule rejouée derrière (`07` §2.4) ; puis la même chaîne rejouée **sur la préproduction Neon**, 14 contrôles verts, 201 s. ⏳ **reste** : la part Vercel (B1, B9, B14), à faire avec le gérant |
| E-6 | Essayer `vercel deploy --skip-domain` puis `promote` (point ouvert de 07) | ⏳ bloqué par G-2 |
| E-7 | Vérifier que la build ne touche pas la base (point ouvert de 07) | ⏳ |
| E-8 | Passer la recette `08` avec le gérant, remplir la feuille de passage §6 | ⏳ bloqué par G-1, G-4 |
| E-9 | Après la bascule : jalon N — supprimer le schéma `legacy`, retirer les scripts de migration, poser le tag `bascule-<date>` | ⏳ |

**Critère d'arrêt.** « Prêt à basculer » (07 §6.1) demande G1–G8 **et** la recette `08`
passée : les 146 lignes vues, les parcours « bascule » tenus, la répétition générale
verte. Une case non cochée n'interdit pas de basculer — elle interdit de basculer
**sans le dire** : toute case laissée vide s'inscrit en `08` §6, avec sa raison et le
nom de qui l'a tranchée.

## Décisions qui changent le quotidien du gérant — tranchées

Le client a délégué les arbitrages (« travaille en autonomie, fais les choix,
qu'ils soient clairs et intuitifs »). Ces points sont donc **décidés** le
17/09/2026 et font foi ; on ne les resoumet pas. Ils modifient des habitudes :
la carte « Nouveautés » de l'Accueil (06 E01) les explique au premier lancement
— **elle est livrée** (J14) et reprend les six lignes du tableau ci-dessous qui
changent un geste (1, 2, 4, 5, 6 ; la 1 en deux lignes : onglets, puis chiffres
qui ouvrent la compta).
Un retour d'usage du gérant en préproduction peut les amender, dans le doc cité.

| # | Décision | Ce qui change pour lui | Où |
|---|---|---|---|
| 1 | **Onglets : Accueil · Commandes · Vendre · Clients · Catalogue** — l'onglet Compta disparaît ; on entre dans la compta, la Trésorerie et les lots **en touchant leur chiffre** sur l'Accueil. | Clients (et « À encaisser ») à 1 tap au lieu de 2 ; la compta, lue le soir, passe par l'Accueil. | 06 arbitrage n°1–3 |
| 2 | **Commande et vente deviennent le même objet** (un « document ») ; un seul écran de saisie avec bascule « Vente \| Commande ». | Plus de « Finaliser en vente » ni de re-saisie : livrer + encaisser suffit. | 02 §4, 03 §1 |
| 3 | **Plus rien ne s'efface tout seul** : les commandes livrées ne sont plus supprimées à J+1, elles se replient. Un document payé ne se supprime pas, il s'annule (remboursement proposé). | Historique complet et dettes jamais perdues ; la liste Livrées se consulte au lieu de disparaître. | 02 §4.1, 03 §4.4 |
| 4 | **« Reçu maintenant »** à la vente : on saisit l'argent reçu, le reste dû se calcule. | Fin de la saisie inversée « ce qui restera dû ». | 02 §5 N1 |
| 5 | **Stock « non suivi » distinct de « rupture »** ; à la reprise, les stocks ≤ 0 passent en « non suivi » (listés au rapport). | Fin des fausses alertes stock ; il faut ressaisir le stock des parfums réellement suivis. | 02 §4.5, 03 §7 |
| 6 | **Une seule définition de chaque chiffre** — notamment « en retard » dès le jour dépassé (plus de tolérance 24 h) et la Marge nette toujours après dépenses. | Certains chiffres affichés changeront de valeur le jour J (écarts expliqués au centime dans le rapport de reprise). | 02 §6, 07 §2.5–2.6 |
| 7 | **Rôles supprimés, journal d'audit supprimé** (mono-opérateur). | Rien au quotidien ; réintroduction possible si un second opérateur arrive. | 02 §7 |

## Invariants non négociables (hérités, vérifiés, conservés)

- Deux registres CSS disjoints (`brand` vitrine / `product` admin) — root layout
  minimal sans CSS.
- Cinq onglets max, pas de menu « Plus » ; toute route rattachée à un onglet.
- Vocabulaire des chiffres : **Encaissé / À encaisser / Marge nette / Trésorerie**
  — jamais de synonyme.
- Invariants d'affichage automatisés (`npm run test:layout`) : 320/375/430 px,
  clavier ouvert/fermé.
- Cibles tactiles ≥ 44 px, safe areas, une seule zone de scroll.
- `useSearchParams()` toujours sous `<Suspense>`.
- Coût réseau : agréger côté base, `react.cache`, titre visible immédiatement.
