# PASSATION — Refonte « Nuréa Gestion »

> **Pour l'agent qui prend la suite.** Ce fichier est le point d'entrée : il dit où en est le
> chantier, ce qui reste, comment travailler sur ce poste et quels pièges ont déjà coûté du
> temps. La conception complète, elle, vit dans `docs/refonte/`.
> Dernière mise à jour : 22 septembre 2026 — **la bascule est faite**.

## 0. La bascule a eu lieu (22/09/2026, ~15 h 40)

**La refonte est en production.** `main` la porte, la base de production est au schéma cible, et
l'ancienne gestion n'est plus servie. Ce qui suit est l'état réel, pas un plan.

| | |
|---|---|
| Tag de bascule | `bascule-2026-09-22` |
| Dernier commit d'avant | tag `avant-refonte` (`f3c0344`) |
| Déploiement de retour (P0) | `nurea-parfums-6zlbktll5` |
| Instantané de retour arrière | `migration-artifacts/2026-09-22/bascule/instantane` (19 tables, 1 209 lignes) |
| Durée de la migration | **20 s** — référence 2 s, expand 5 s, reprise 5 s, contract 5 s, vérifications 3 s |

Chiffres, identiques au centime : Trésorerie **1 611,00 €**, Encaissé **2 185,00 €**,
À encaisser **680,00 €**, Marge nette 1 253,56 € → **1 253,55 €** (un centime d'arrondi, `03` §4.8).
Les quatorze contrôles chiffrés verts, les trois invariants de l'argent verts sur la production,
les treize routes répondent comme attendu, la vitrine rend les mêmes comptages qu'avant
(207 visuels, 108 entrées de marque).

**Deux écarts au plan de `07` §1.6, assumés :**

1. **Pas de gel (étape B1).** Le déploiement M — ancienne app en maintenance — n'a jamais abouti :
   lancé depuis le worktree, il est d'abord parti créer un projet Vercel parasite (`nurea-fix`, à
   supprimer), puis est resté bloqué 20 minutes à l'envoi. Le gérant étant le seul à écrire et
   présent à ce moment, la fenêtre a été couverte par une consigne orale plutôt que par un 503. La
   migration a duré 20 s.
2. **Le schéma `legacy` est CONSERVÉ.** Le gérant a demandé de « virer les anciennes bases » ; c'est
   le jalon N, prévu à **J+30**, et c'est le chemin de retour. Il se supprime en une commande le jour
   où plus personne n'en veut.

**Ce qui reste, et qui n'a pas été fait :** la recette de `08` (146 lignes) n'a pas été passée, les
parcours chronométrés sur l'iPhone non plus. La bascule a été faite sur demande explicite du gérant,
qui a maintenu sa décision après avoir été averti. À faire maintenant : la surveillance de `07` §1.8
(`npm run check:invariants` chaque matin pendant sept jours, lecture des journaux Vercel), et les
deux arbitrages déjà tranchés de `07` §1.8 à appliquer dans l'app (coût 0 € sur la ligne Grand Soir ;
ne pas annuler l'écart historique de 100 € tout seul).

## 1. Le chantier en trois phrases

L'application de gestion de Nuréa Parfums (`/admin`, PWA iPhone) a été **refondue de zéro** :
elle s'était construite par rustines et comptait l'argent deux fois selon le chemin emprunté.
La refonte vit sur la branche **`refonte/integration`** ; la production tourne toujours sur
`main`, intacte. La priorité absolue du client est **la prise en main et l'aspect pratique** —
la sécurité est explicitement secondaire (un garde simple et invisible), et le client délègue
tous les arbitrages : **on tranche, on consigne dans le doc concerné, on continue.**

## 2. Où lire quoi

| Besoin | Fichier |
|---|---|
| Cadre, invariants, avancement, ce qui reste avant la bascule | `docs/refonte/00-README.md` **(à lire en premier)** |
| Ce que faisait l'ancienne app, bugs prouvés, liste de non-régression | `docs/refonte/01-AUDIT-EXISTANT.md` |
| Vision produit : tâches, objectifs de vitesse, périmètre, vocabulaire | `docs/refonte/02-VISION-PRODUIT.md` |
| Modèle de données, SQL des chiffres, reprise des données | `docs/refonte/03-MODELE-DONNEES.md` |
| Architecture (couches, actions, transactions, cache, auth, PWA, tests) | `docs/refonte/04-ARCHITECTURE.md` |
| Design system (jetons, briques, gestes, règles d'écran) | `docs/refonte/05-DESIGN-SYSTEM.md` |
| Écrans et parcours, écran par écran, avec leurs quatre états | `docs/refonte/06-ECRANS-PARCOURS.md` |
| Plan d'exécution, jalons, bascule, retour arrière | `docs/refonte/07-PLAN-EXECUTION.md` |
| **Recette** : 146 capacités, où chacune vit, comment elle est vérifiée | `docs/refonte/08-RECETTE.md` |
| Règles du dépôt au quotidien | `CLAUDE.md` |

Règle d'or : **une documentation qui ment est un bug**. Si une décision change, on amende
d'abord le document amont, puis on code.

## 3. Où en est le code

**Livré et fusionné dans `refonte/integration`** (jalons J0 à **J17**, moins le reste du §4) :

- socle : domaine pur, contrats, `defineAction`/`defineQuery`, transactions, cache, session,
  `proxy.ts`, redirections des anciennes adresses ;
- schéma cible, migrations expand/contract, **reprise des données réelles** et ses assertions
  au centime ;
- moteurs : documents (commande et vente = un seul objet), argent (encaissements,
  contre-passations, poches, dépenses), chiffres (une définition SQL chacun) ;
- écrans : Commandes et fiche document, Vendre, Clients et À encaisser, Catalogue (visuels
  story, conversion WebP côté serveur), Compta / Trésorerie / Journal, Lots, Accueil, Récap du
  jour, Statistiques, Réglages, recherche globale ;
- PWA : service worker rendu par route et versionné, page hors ligne autonome, carte
  d'installation, 12 écrans de lancement ;
- documentation du dépôt remise au niveau du code + `08-RECETTE.md`.

**Dernier passage complet sur la branche fusionnée (22/09/2026, après J17) :**

| Suite | Commande | Résultat |
|---|---|---|
| Unitaires + architecture | `npm test` | **808 verts** |
| Base réelle | `npm run test:db` | **487 verts** (+14 : le retour arrière) |
| Invariants d'affichage | `npm run test:layout` | **513 verts** |
| Parcours | `npm run test:e2e` | **93 verts** (89 · 3 réglages · 1 PC-12) |
| Types / lint | `npm run typecheck`, `npm run lint` | propres |

> **Cinq parcours sont tombés au premier passage**, tous en délai dépassé (6 ouvriers sur cette
> machine), et **tous verts relancés seuls** (`--workers=1 --timeout=120000`). C'est exactement le
> piège du §5 : confirmer un échec avant de « corriger » quoi que ce soit.

**Vitesse mesurée** (budgets de `02` §2) : vente simple **3 taps / 2,2 s** (objectif 8 / 20 s),
commande avec acompte 9 taps, créance encaissée 4 taps, marge d'un lot 2 taps, récap du jour
lisible sans tap. `tableauDeBord()` : 4 à 5 ms sur dix fois le volume réel.

**Reprise des données sur copie réelle** : verte de bout en bout. Trésorerie 1 546,00 € =
1 546,00 € ; Encaissé 2 050,00 € = 2 050,00 € (résidu 0,00 €) ; À encaisser 825,00 € =
825,00 € ; Marge nette 1 097,40 € → 1 097,39 € (un centime d'arrondi sur une ligne historique,
règle `03` §4.8). Les 281 stocks à 0 passent en « non suivi ».

### Les deux essais en place

| Essai | Adresse | Données | Compte |
|---|---|---|---|
| **En ligne** (aperçu Vercel de la branche) | `https://nurea-parfums-git-refonte-integration-rayanetks-7861s-projects.vercel.app/admin` — **plus protégé par l'authentification Vercel** (répond 200), on entre directement | **RÉELLES depuis le 22/09** : instantané de production rejoué et migré dans la base Neon par `npm run repetition:preprod` (281 parfums, 73 marques, 29 clients, 35 documents, 32 paiements, 6 poches ; 14 contrôles verts) | **`nureadmin`, avec le mot de passe habituel de production** — le compte vient de l'instantané, son empreinte bcrypt est celle de la production. Le compte `essai` a disparu avec le remplissage. |
| **Local** | `http://localhost:3000/admin` (+ l'IP du poste pour l'iPhone) | **réelles, migrées** (base locale `nurea_repetition`) | idem |

L'aperçu n'est plus protégé par l'authentification Vercel : on ouvre l'adresse et on tombe sur
l'écran de connexion de l'app. Le serveur local n'est pas relancé automatiquement après une fin de
session.

**Les visuels de l'aperçu sont ceux de la production, en lecture.** Les URL enregistrées en base
pointent le bucket `catalog` ; l'aperçu, lui, ÉCRIT dans `catalog-essai`
(`SUPABASE_STORAGE_BUCKET`, variable de branche). Déposer ou retirer un visuel depuis l'aperçu ne
peut donc pas toucher un visuel de production.

## 4. Ce qui reste

`docs/refonte/00-README.md` § « Ce qui reste avant la bascule » tient la liste complète
(colonne du gérant G-1…G-8, colonne de l'exécutant E-1…E-9). Par ordre de travail :

1. ~~Finir J17~~ — **fait le 22/09/2026** (`751de52`, `669255f`, fusion `refonte/integration`).
   Le travail était écrit et n'avait jamais tourné. Il tourne : `tests/db/rollback.test.ts` passe
   14/14 (chaîne complète du jour J, puis retour arrière, plus le cas de l'instantané altéré), après
   deux correctifs de requêtes de contrôle — un `ORDER BY` qui s'appuyait sur un alias de sortie dans
   une expression, et `pg_sequences` interrogé pour une colonne `is_called` qu'il n'expose pas. Le
   retour arrière a aussi été **rejoué sur la copie des données réelles** : R1 à R5 verts, référence
   recalculée identique au centime, **51,4 s** (dont 50,8 s à rejouer les 24 migrations une par une).
   Deux manques trouvés en chemin et comblés :
   - **le jour J ne savait pas produire la source du retour arrière.** `migration:rollback` rejoue un
     instantané JSON (ce poste n'a ni `pg_restore` ni `psql`), et seule la répétition savait en
     extraire un — au prix de détruire une base. D'où `npm run migration:instantane`, lecture seule
     stricte, et l'étape **B2b** du jour J ;
   - **PC-12 n'avait pas de test**, alors que `07 §6.4` en nommait un.
     `e2e/parcours/premiere-utilisation.spec.ts` joue le parcours entier sur base vide —
     **16 taps, 13 s** contre un objectif de 5 minutes. Il lui faut une base sans données : harnais à
     lui (`nurea_test_e2e_vide`, ports 3102/3103, projet `Mobile-premiere`), lancé par
     `npm run test:e2e:premiere`, troisième commande de `npm run test:e2e`.

   Documents amendés au passage (une documentation qui ment est un bug) : `07 §1.7` décrivait un
   retour arrière en `pg_restore` + `psql` **inexécutable sur ce poste**, donc jamais éprouvé ;
   `07 §2.2` annonçait un `--rollback` que `apply-sql-migration.ts` refuse ; `07 §6.3`, `07 §6.4` et
   `08 §1c`/`§3` disaient PC-12 sans test.

2. **Répétition générale** — **faite pour toute la part « données » le 22/09/2026** (`07` §2.4) :
   la procédure du jour J jouée avec les commandes exactes de §1.6, une par une, sur la copie des
   données réelles, **retour arrière compris**. B2b→B8 en 9 à 11 s, retour arrière en 52 s, R1–R5
   verts, puis la bascule **rejouée après le retour arrière** rendant un rapport identique au centime.
   **Reste, et appartient au gérant** : le gel et la promotion Vercel (B1, B9, B14), l'étape B3b
   (tests joués à distance sur une préproduction aux **données réelles** — celle en ligne est
   fictive) et les budgets de perception sur son iPhone.
3. ~~Fusionner `fix/vitrine-slug-maintenance` dans `main`~~ — **fait le 22/09/2026** (`80a88f0`,
   avance rapide, poussé). L1 et L2 sont **en production**, vérifiés sur `https://nureaparfums.fr`
   (le domaine canonique ; `www.nureaparfums.com` y redirige en 308) : vitrine 200 avec **108 entrées
   de marque et 211 visuels — exactement les comptages d'avant le déploiement** (V9 inchangé),
   `/admin` → 307 vers la connexion, `/api/admin/orders` → 401. Le mode maintenance est donc en ligne
   et **dormant**, prêt pour le gel du jour J sans reconstruction.
   **À savoir** : il a fallu **trois builds du même commit** — deux échecs réseau du constructeur
   Vercel (`P1001` sur le pooler Supabase, puis une police Google non téléchargée par Turbopack), le
   troisième vert. Rien dans le code. Note ajoutée en `07` §1.6 : un build rouge se relance avant
   d'être diagnostiqué.
4. **Mécanique Vercel** : `vercel deploy --prod --skip-domain`, `promote`, puis retour au
   déploiement précédent — à faire avec le gérant, c'est la production.
5. **Budgets de perception, VoiceOver, PWA installée** : exigent la préproduction sur données
   réelles et l'iPhone du gérant.
6. **Recette `08` avec le gérant** : 146 lignes, dont 24 gestes humains.
7. Après la bascule : jalon N — supprimer le schéma `legacy`, retirer les scripts de migration,
   poser le tag de bascule.

Ce qui a changé depuis la rédaction de `00-README` : une **préproduction en ligne existe déjà**
(base Neon + variables d'aperçu au niveau de la branche), mais avec des **données fictives**.
G-1 et G-2 ne bloquent donc plus l'essai ; ils bloquent encore la répétition générale sur
données réelles et les budgets de perception.

## 5. Ce poste : les règles vitales

- **`.env` et `.env.local` pointent sur la PRODUCTION**, et `@prisma/client` charge `.env` tout
  seul à l'import. Tout script lit son URL **avant** cet import. Un oubli a déjà fait lire la
  table des migrations de production (lecture seule, sans dégât) — la garde a été corrigée, ne
  la contourne pas.
- **Base locale de test** : PostgreSQL 15 embarqué (Docker Desktop ne démarre pas ici),
  `localhost:54329`, `nurea`/`nurea`. Elle **tombe à chaque fin de session** ; la relancer par
  **`node C:\Users\User\nurea-pg\start.mjs`** (garder le processus en vie, c'est lui le serveur).
  Ce dossier est **hors dépôt et hors répertoire temporaire** — il porte `node_modules` et
  surtout `data`, où vit `nurea_repetition`, la copie des **données réelles migrées** (au
  22/09 : 35 documents, 29 paiements, 29 clients, 281 parfums). Ne le remets jamais dans un
  scratchpad de session, il serait balayé. La source du lanceur, avec la procédure de
  reconstruction si le dossier disparaît, est `scripts/local-db/start.mjs`.
  Bases utiles : `nurea_test` (tests), `nurea_test_e2e` (parcours), `nurea_repetition` (copie réelle) ;
  les `nurea_test_*_j<n>` sont les bases des agents de jalon, jetables.
- **Jamais `npm run build` tel quel** : toujours `NUREA_SKIP_MIGRATE_DEPLOY=1` avec des
  `DATABASE_URL`/`DIRECT_URL` factices ou locales. **Jamais `prisma migrate reset`, jamais `db push`.**
- Un agent parallèle tient parfois le moteur Prisma sous Windows : `prisma generate` échoue alors
  sur un `EPERM` de renommage. Lancer `npx next build` directement, ou réessayer plus tard.
- Serveurs de test qui traînent : les ports 3100 (app e2e) et 3101 (faux stockage) restent parfois
  occupés par une session morte ; les arrêter par leur PID avant de relancer Playwright.
- **Contention machine** : sous charge, deux ou trois parcours tombent en délai dépassé sans
  qu'aucune régression n'existe. Toujours confirmer un échec en le relançant seul
  (`--workers=1 --timeout=120000`) avant de « corriger » quoi que ce soit.

## 6. Comment ce chantier a été mené (et pourquoi continuer ainsi)

- **Un jalon = un agent = un worktree git isolé** (`isolation: "worktree"`), avec sa base et son
  port à lui. C'est ce qui a permis de construire quatre écrans en parallèle sans se gêner.
- **Le pilote code peu** : il cadre la mission (sections de docs à lire, livrables, critères
  exécutables), relit le rapport, **relance lui-même les suites**, résout les conflits, fusionne.
  Chaque fusion se termine par `npm test` puis `npm run test:db`.
- **Recette des conflits récurrents** : `e2e/routes.ts`, `e2e/fixtures/*` et
  `src/app-shell/routes.ts` se touchent à chaque jalon. Résolution : garder **les deux** côtés
  (ce sont des listes additives), refermer l'objet coupé par la frontière du conflit (`},`), et
  pour `routes.ts` garder l'état « livrée » le plus avancé. Vérifier ensuite `npx tsc --noEmit` :
  une liste mal refermée s'y voit immédiatement.
- **Les identifiants du jeu e2e sont un espace partagé** : chaque jalon prend une plage
  (documents 1–59, Compta 60+). Un doublon fait échouer le seed entier et **aucun** parcours ne
  démarre. Un test d'architecture le garde désormais.
- **Les limites d'usage coupent les agents en pleine tâche.** Leur travail reste sur disque :
  les relancer par un message en leur disant de relire l'état réel des fichiers avant d'écrire et
  de ne pas refaire ce qui est fait.
- **Attendre sans gaspiller le contexte** : surveiller la fraîcheur du journal d'un agent
  (`stat -c %Y <dossier tasks>/<id>.output`) plutôt que de rapatrier son transcript, qui sature
  le contexte.

## 7. Décisions tranchées — ne pas les rouvrir

- **Cinq onglets : Accueil · Commandes · Vendre · Clients · Catalogue.** Compta, Trésorerie et
  Lots s'ouvrent **en touchant leur chiffre** depuis l'Accueil.
- **Commande et vente sont le même objet** ; le dû et l'Encaissé se dérivent du ledger de paiements.
- **Rien ne s'efface tout seul** : plus de purge des livrées ; un document payé s'annule (avec
  contre-passation) au lieu d'être supprimé.
- **« Reçu maintenant »** à la vente : on saisit l'argent reçu, le reste dû se calcule.
- **Stock « non suivi » (NULL) distinct de « rupture » (0)**.
- **Contenances réelles 10 / 50 / 80 ml**, 80 proposé par défaut.
- **Un chiffre = une définition SQL** ; l'affichage compact masque des centimes nuls mais
  **n'arrondit jamais**.
- **Pas de rôles, pas de journal d'audit** : un seul opérateur.

## 8. Comptes et infrastructure (état réel)

- **Vercel** : projet `nurea-parfums` (équipe `rayanetks-7861s-projects`, plan Hobby), lié à
  `github.com/RayaneTks/nurea-parfums`. La ligne de commande `vercel` est **déjà authentifiée**
  sur ce poste. Le MCP Vercel ne gère pas les variables d'environnement — passer par la CLI.
- **Piège majeur, déjà désamorcé** : les variables *Preview* du projet pointaient sur la **base de
  production** — tout aperçu aurait écrit dans les vraies données. Elles sont surchargées **au
  niveau de la branche** `refonte/integration` : base Neon, secret de session distinct,
  `SUPABASE_STORAGE_BUCKET=catalog-essai` (aucun visuel de production ne peut être supprimé),
  `NUREA_ENV=preprod`. **Ne jamais déployer la refonte en aperçu sans vérifier ces variables.**
- La **garde du build** a été éprouvée en vrai : le premier déploiement de la branche, encore
  branché sur la production, **a échoué** au build avec le message attendu, sans rien appliquer.
- **Neon** : base de préproduction `nurea-repetition` créée via la place de marché Vercel, migrée
  et remplie de données fictives. Ses valeurs vivent dans un `.env.preprod` **hors du dépôt**
  (scratchpad de session) ; le motif `.env.preprod` est ignoré par git.
- **Supabase** : un seul projet, celui de **production**. Créer un projet de préproduction exige
  une validation dans un navigateur qu'un agent ne peut pas faire ici (extension Chrome non
  connectée, et la prise de contrôle du bureau interdit les clics dans un navigateur).
- **Réglage attendu du gérant** (critère G9 de `07` §1.5) : autoriser les formats d'origine
  (JPEG, PNG, HEIC, jusqu'à 12 Mo) dans le bucket `catalog`, la conversion WebP se faisant
  désormais côté serveur.

## 9. Branches vivantes

**Il n'en reste qu'une : `main`.** Elle porte la vitrine ET la gestion refondue, et c'est elle qui
déploie en production. Depuis la bascule du 22/09, tout le travail courant y va directement.

Le ménage du 24/09 a supprimé les **19 autres branches**, locales et distantes : toutes étaient
entièrement fusionnées dans `main`, donc rien n'a été perdu — leur contenu y est, et les commits de
fusion gardent la trace de d'où chaque chose vient. La raison de les retirer n'est pas la place :
c'est qu'une branche vieille de plusieurs semaines finit par être prise pour la branche de travail,
et qu'on repart d'un état ancien sans s'en apercevoir.

> **Le filet, ce sont les tags, pas les branches.** `avant-refonte` (dernier commit de `main` avant
> la bascule) et `bascule-2026-09-22` (la révision basculée) sont indépendants de tout ce ménage et
> restent le point de retour. L'instantané des données d'avant la bascule est, lui, dans
> `migration-artifacts/2026-09-22/bascule/instantane`.

Empreintes des branches retirées, si l'une devait être ressuscitée (`git branch <nom> <empreinte>`) :

| Branche retirée | Empreinte |
|---|---|
| `refonte/integration` | `a56ffbf` (contenu identique à `main`) |
| `refonte/j17-rollback-pc12` | `669255f` |
| `refonte/j16-pwa` | `af77b87` |
| `refonte/j15-reglages` | `185c9b8` |
| `refonte/j12-compta` | `9a77b0f` |
| `refonte/j10-clients` | `9e82cc5` |
| `fix/vitrine-slug-maintenance` | `f3c0344` |
| `admin-lisible` | `35e9477` |
| `rework` | `c105726` |
| sept `worktree-agent-*` | `01c568b`, `9a2c204`, `9e0b5d8` (×3), `13e9078`, `91cf815` |
