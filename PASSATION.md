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
| Filet de retour arrière | Le **schéma `legacy` en production** (12 tables, vérifié présent le 24/09). L'instantané JSON pris le jour J a été effacé du disque depuis — sans conséquence : après le feu vert du gérant, `07` §1.7 exclut de toute façon un retour de base, les correctifs vont vers l'avant. |
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
| **Surveillance d'après-bascule** : le geste du matin et le journal jour par jour | `docs/refonte/09-SURVEILLANCE.md` |
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

**La bascule est faite** (voir §0) : tout ce que cette section listait avant — finir J17, la
répétition générale, fusionner L1/L2, la mécanique Vercel — est derrière nous. Reste ceci.

### À faire par le gérant

| # | Quoi | Pourquoi lui |
|---|---|---|
| G-a | ~~Deux gestes déjà tranchés, à appliquer dans l'app~~ — **faits, vérifiés en lecture seule le 24/09** : la ligne Grand Soir 10 ml du document de « Yanis secu » porte un coût de **0,00 €** (plus aucune ligne sans coût, plus aucun document « au coût à compléter ») ; l'écart historique de +100,00 € du 19/09 est **intact**, avec la correction de −100,00 € du gérant — les deux se neutralisent, « Non attribué » est à 0,00 €. **Ne pas annuler l'écart seul.** Relevé en `docs/refonte/09-SURVEILLANCE.md`. | Ce sont ses chiffres |
| G-b | **Passer la recette `08`** : 146 lignes, dont 24 gestes humains, et les 16 parcours chronométrés sur son iPhone. **Elle n'a pas été passée** : la bascule a eu lieu sur sa demande explicite, maintenue après avertissement. | Son jugement, son téléphone |
| G-c | **Supprimer les ressources devenues orphelines** : la base Neon de préproduction (`nurea-repetition`) et les variables d'environnement d'aperçu posées au niveau de l'ancienne branche, chez Vercel. Elles ne servent plus à rien depuis le retrait de `refonte/integration` (§9) et continuent peut-être de compter dans ses quotas. | Son compte, sa facturation |

### À faire par l'exécutant

| # | Quoi | Quand |
|---|---|---|
| E-a | **Surveillance de sept jours** (`07` §1.8) : `npm run check:invariants -- --confirm-host <hôte prod>` chaque matin (lecture seule), plus la lecture des journaux Vercel. Tout écart d'invariant est un incident prioritaire. **Le relevé de chaque matin se consigne dans `docs/refonte/09-SURVEILLANCE.md`** ; au 24/09 les invariants sont verts et les deux arbitrages de G-a sont **déjà appliqués en production** (rien à faire). | J+0 à J+7 de la bascule (22/09) |
| E-b | **Jalon N — nettoyage** : supprimer le schéma `legacy`, retirer les scripts de migration, poser le tag de nettoyage. `legacy` porte les anciennes tables et **reste le chemin de retour** : c'est pour ça qu'il est conservé jusque-là. | J+30, soit vers le 22/10/2026 |

### Livré depuis la bascule (23–24/09)

- **Visuels** : les 223 images du bucket ré-encodées (485 Mo → 23 Mo) ; l'optimiseur d'images de
  Vercel n'est plus utilisé (`unoptimized`), après que son quota gratuit eut rendu toutes les fiches
  en 402. L'uploader de l'ancienne app encodait en qualité 0,95, corrigé à 0,82.
- **SEO** : `*.vercel.app` redirige en 308 vers le domaine (en production seulement) ; formes en un
  mot du nom dans le balisage ; FAQ qui distingue la marque homonyme britannique.
- **Mode discret** (Réglages › Application) : brouille montants et noms de clients sur cet appareil,
  pour montrer l'app sans montrer ce qu'elle contient. `docs/admin/PRODUCT.md`.
- **Rattacher au catalogue** : recolle une vente passée — même livrée — au parfum entré au catalogue
  depuis, sans toucher ni l'argent ni le stock. `docs/admin/PRODUCT.md`.
- **Sécurité** (autre session) : en-têtes, frein de débit, garde du formulaire public.
  `docs/SECURITE.md`.
- **Ménage des branches** : il n'en reste qu'une, `main` (§9).


## 5. Ce poste : les règles vitales

- **`.env` et `.env.local` pointent sur la PRODUCTION**, et `@prisma/client` charge `.env` tout
  seul à l'import. Tout script lit son URL **avant** cet import. Un oubli a déjà fait lire la
  table des migrations de production (lecture seule, sans dégât) — la garde a été corrigée, ne
  la contourne pas.
- **Base locale de test** : PostgreSQL 15 embarqué (Docker Desktop ne démarre pas ici),
  `localhost:54329`, `nurea`/`nurea`. Elle **tombe à chaque fin de session** ; la relancer par
  **`node C:\Users\User\nurea-pg\start.mjs`** (garder le processus en vie, c'est lui le serveur).
  Ce dossier est **hors dépôt et hors répertoire temporaire** — il porte `node_modules` et `data`.
  Ne le remets jamais dans un scratchpad de session, il serait balayé. La source du lanceur, avec
  la procédure de reconstruction si le dossier disparaît, est `scripts/local-db/start.mjs`.

  **Quatre bases y vivent, et pas une de plus** (ménage du 24/09 : 28 bases de jalon supprimées,
  273 Mo rendus) :

  | Base | Rôle | Recréée par |
  |---|---|---|
  | `nurea_test` | `npm run test:db` | la suite, à chaque exécution |
  | `nurea_test_e2e` | les parcours | `e2e/global-setup.ts` |
  | `nurea_test_e2e_vide` | harnais PC-12, base vide | `npm run test:e2e:premiere` |
  | `nurea_shadow` | base d'ombre de Prisma | le lanceur |

  Toutes sont **jetables** : les suites les détruisent et les recréent. `nurea_repetition`, la copie
  locale des données réelles, a été supprimée — la bascule est faite, l'app réelle est en
  production. En recréer une si besoin : `npm run repetition:refresh`.
- **Jamais `npm run build` tel quel** : toujours `NUREA_SKIP_MIGRATE_DEPLOY=1` avec des
  `DATABASE_URL`/`DIRECT_URL` factices ou locales. **Jamais `prisma migrate reset`, jamais `db push`.**
- Un agent parallèle tient parfois le moteur Prisma sous Windows : `prisma generate` échoue alors
  sur un `EPERM` de renommage. Lancer `npx next build` directement, ou réessayer plus tard.
- Serveurs de test qui traînent : les ports 3100 (app e2e) et 3101 (faux stockage) restent parfois
  occupés par une session morte ; les arrêter par leur PID avant de relancer Playwright.
- **Contention machine** : sous charge, deux ou trois parcours tombent en délai dépassé sans
  qu'aucune régression n'existe. Toujours confirmer un échec en le relançant seul
  (`--workers=1 --timeout=120000`) avant de « corriger » quoi que ce soit.
- **Plusieurs sessions peuvent travailler dans CE MÊME répertoire.** Vécu le 23/09 : une autre
  session éditait pendant que `test:layout` tournait — 254 tests passés, puis 76 échecs d'un coup,
  parce que le serveur de test est tombé sous un fichier qui changeait. Rien n'était cassé. Deux
  réflexes : ne jamais faire `git add -A` (on commite le travail en cours d'un autre — c'est
  arrivé, et il a fallu défaire), et relancer une suite avant de conclure à une régression.
- **Vercel est capricieux au build** : le 22/09, **trois builds du même commit** — `P1001` sur le
  pooler Supabase, puis une police Google que Turbopack n'a pas su télécharger, puis vert. Un build
  rouge se relance avant d'être diagnostiqué.

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

## 8. Comptes et infrastructure (état réel au 24/09/2026, après ménage)

- **Vercel** : projet `nurea-parfums` (équipe `rayanetks-7861s-projects`, plan Hobby), lié à
  `github.com/RayaneTks/nurea-parfums`. La ligne de commande `vercel` est **déjà authentifiée** sur
  ce poste. Elle ne sait pas supprimer une variable d'environnement de façon ciblée (`env rm` ne
  prend pas `--git-branch`) : pour ça, passer par l'API REST **en visant l'identifiant**, jamais le
  nom — plusieurs variables portent le même nom sur des cibles différentes.
- **Aucun aperçu ne peut plus atteindre la production.** C'était le piège d'origine : `DATABASE_URL`
  et `DIRECT_URL` portent la base de production et visaient « Production + Preview ». Les variables
  de branche qui les masquaient ont disparu avec la branche, et la base Neon avec elles. La cible
  **`preview` leur a donc été retirée** le 24/09 : un aperçu n'a plus d'URL de base et **échoue
  franchement**, au lieu d'écrire en silence dans les vraies données. Cibles actuelles :
  `DATABASE_URL` → production + development ; `DIRECT_URL` → production.
- **Il n'y a plus de préproduction.** La base Neon `nurea-repetition` a été supprimée le 24/09
  (elle portait une copie des données réelles, devenue inutile après la bascule), ainsi que ses
  18 variables `NEONPP_*` et les 5 variables de l'ancienne branche. Refaire une préproduction, si
  le besoin revient : recréer une base par la place de marché Vercel, puis
  `npm run repetition:preprod -- --confirm-host <hôte>` (`07` §2.2) — la commande existe et a servi.
- **Supabase** : un seul projet, celui de **production** (`db_nureaparfums`). Le bucket `catalog`
  accepte déjà tous les formats d'origine, sans limite de taille : le critère G9 de `07` §1.5 est
  **satisfait**, vérifié le 22/09.
- **Images** : l'optimiseur d'images de Vercel n'est plus utilisé (`unoptimized` dans
  `next.config.mjs`). Son quota gratuit avait été épuisé et toutes les fiches rendaient 402. Les
  visuels sont déposés au cadre exact (1024×1536, qualité 82) et pèsent ~90 Ko : l'optimiseur
  n'apportait rien. **Ne pas le rallumer** sans restreindre `deviceSizes` et `qualities`, sinon le
  mur revient.
- **La garde du build** a été éprouvée en vrai avant la bascule : un déploiement encore branché sur
  la production **a échoué** au build avec le message attendu, sans rien appliquer.
- **Sur le disque du poste** : `migration-artifacts/visuels-avant/` garde les 223 visuels
  **d'origine** (486 Mo), avant le ré-encodage du 22/09. C'est la seule copie ; les versions servies
  aujourd'hui sont ~20 fois plus légères et vérifiées. À supprimer quand le gérant le dira.


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
> le **schéma `legacy`** de la production (12 tables), conservé jusqu'au jalon N. L'instantané JSON
> du jour J n'est plus sur le disque, et ce n'est pas un problème : deux jours de ventes réelles ont
> été saisies depuis, le restaurer les effacerait.

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
