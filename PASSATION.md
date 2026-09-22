# PASSATION — Refonte « Nuréa Gestion »

> **Pour l'agent qui prend la suite.** Ce fichier est le point d'entrée : il dit où en est le
> chantier, ce qui reste, comment travailler sur ce poste et quels pièges ont déjà coûté du
> temps. La conception complète, elle, vit dans `docs/refonte/`.
> Dernière mise à jour : 22 septembre 2026.

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

**Livré et fusionné dans `refonte/integration`** (jalons J0 à J16, moins le reste du §4) :

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

**Dernier passage complet sur la branche fusionnée (18/09/2026) :**

| Suite | Commande | Résultat |
|---|---|---|
| Unitaires + architecture | `npm test` | **808 verts** |
| Base réelle | `npm run test:db` | **473 verts** |
| Invariants d'affichage | `npm run test:layout` | **513 verts** |
| Parcours | `npm run test:e2e` | **79 verts** |
| Types / lint | `npm run typecheck`, `npm run lint` | propres |

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
| **En ligne** (aperçu Vercel de la branche) | `https://nurea-parfums-git-refonte-integration-rayanetks-7861s-projects.vercel.app/admin` | **fictives** (base Neon `nurea-repetition`, jeu `e2e/fixtures/seed.ts`) | `essai` / `motdepasse-essai-2026` |
| **Local** | `http://localhost:3000/admin` (+ l'IP du poste pour l'iPhone) | **réelles, migrées** (base locale `nurea_repetition`) | idem |

L'aperçu est protégé par l'authentification Vercel : régénérer au besoin un lien de partage
(valable 24 h). Le serveur local n'est pas relancé automatiquement après une fin de session.

## 4. Ce qui reste

`docs/refonte/00-README.md` § « Ce qui reste avant la bascule » tient la liste complète
(colonne du gérant G-1…G-8, colonne de l'exécutant E-1…E-9). Par ordre de travail :

1. **Finir J17 — retour arrière + parcours de première utilisation.** Travail **commencé et
   non commité** dans le worktree `.claude/worktrees/agent-a8596bbfb881c6d84` (branche
   `refonte/j17-rollback-pc12`, partie de `407587b`) : `scripts/migration/rollback.ts`,
   `scripts/migration/lib/vidage.ts`, `tests/db/rollback.test.ts`, plus des retouches de
   `apply-sql-migration.ts`, `reference.ts`, `lib/reference-format.ts`,
   `repetition/lib/garde-cible.ts`, `repetition/lib/restauration.ts`, `package.json` et de la
   migration expand. **Rien n'a été exécuté** : le test de retour arrière n'a jamais tourné.
   Cible : `npm run migration:rollback -- --instantane <dossier>` qui remet l'ancien monde avec
   Node seul (pas de `pg_restore` sur ce poste), vide `public` et `legacy` sans supprimer les
   schémas, contrôle la référence au centime ; plus `e2e/parcours/premiere-utilisation.spec.ts`
   (PC-12, sur base vide).
2. **Répétition générale** de la procédure du jour J (`07` §1.6), retour arrière compris.
3. **Fusionner `fix/vitrine-slug-maintenance` dans `main`** avant la bascule (L1 : le catalogue
   public ne lit plus `Perfume.slug` ; L2 : mode maintenance). Prête, vérifiée, non fusionnée.
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
- **Base locale de test** : PostgreSQL embarqué (Docker Desktop ne démarre pas ici),
  `localhost:54329`, `nurea`/`nurea`. Il **tombe à chaque fin de session**. Relancer par
  `node start.mjs &` depuis le dossier `pg/` du scratchpad de session ; si la session a changé,
  réinstaller `embedded-postgres@15.18.0-beta.17` dans un dossier de travail et y recopier un
  `start.mjs` équivalent (initialise, démarre sur 54329, crée `nurea_test` et `nurea_shadow`).
  Bases utiles : `nurea_test` (tests), `nurea_test_e2e` (parcours), `nurea_repetition` (copie réelle).
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

| Branche | Rôle |
|---|---|
| `main` | Production (vitrine + ancienne gestion), intacte |
| `refonte/integration` | La refonte ; **branche de travail**, poussée sur GitHub |
| `fix/vitrine-slug-maintenance` | L1 + L2, prêtes pour `main` (worktree `../nurea-fix`) |
| `refonte/j17-rollback-pc12` | Retour arrière + PC-12 — **en cours, non commité** |
| autres `refonte/j*` et `worktree-agent-*` | Jalons déjà fusionnés ; supprimables avec leurs worktrees |
