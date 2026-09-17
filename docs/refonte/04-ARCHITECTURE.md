# 04 — Architecture applicative

**Date : 17 septembre 2026.**

**But du document.** Fixer l'architecture applicative de la refonte de « Nuréa Gestion » (PWA admin iOS de Nuréa Parfums) : couches et règles d'import, arborescence complète, pile d'écriture unique, helper transactionnel, module monétaire, implémentation unique des chiffres, lectures sans effet de bord, authentification, erreurs, cache et revalidation, stock, contrat vitrine, pages et streaming, PWA, performance, tests, configuration. Chaque sujet reçoit une **décision nette**, justifiée par l'audit ou par une contrainte des documents amont. Ce document est autoportant : un exécutant qui n'a jamais vu ce repo peut monter le socle et y brancher les écrans sans autre source que la série `docs/refonte/`.

**Docs amont** : `docs/refonte/00-README.md` (cadre, invariants), `docs/refonte/01-AUDIT-EXISTANT.md` (bugs §4, infra/auth §4.7, calculs §4.9, thèmes transversaux §2.2, contrat vitrine §5), `docs/refonte/02-VISION-PRODUIT.md` (principes §3, périmètre §4, nouveautés N1–N11 §5, vocabulaire §6, sécurité §7), `docs/refonte/03-MODELE-DONNEES.md` (schéma §3, qui écrit quoi §4.2, transactions T1–T15 §4.3, SQL des chiffres §5, migration §7), `docs/refonte/05-DESIGN-SYSTEM.md` (emplacements `src/ui/*`, `src/app-shell/*`, `src/design/*`, règles d'écran §5).
**Docs aval** : `06-ECRANS-PARCOURS.md` (compose les écrans sur ce socle : rattachement des routes aux onglets, présentation page ou sheet), `07-PLAN-EXECUTION.md` (ordonnance la construction du socle puis des écrans, et la bascule de 03 §7).

**Directive prioritaire du client** : la prise en main et l'aspect pratique priment. Toute décision d'architecture se juge à ce qu'elle rend possible à l'écran : un geste terrain qui aboutit du premier coup, un chiffre juste immédiatement, une saisie jamais perdue. La sécurité est explicitement secondaire (02 §7) : un garde simple, systématique et invisible.

**Écart intégré le 17/09/2026** (01 §3.11). La production (`9e0b5d8`) porte des capacités absentes de l'ancien `main` sur lequel ce document a été écrit ; elles entrent dans le module catalogue (§2.1, §3.4, §3.5, §12 « Visuels story ») et dans les tags (§10.1) : **visuels story `PerfumeMedia`** (chemin de stockage décidé par le serveur, objet retiré du bucket après le commit), **contenances 10 / 50 / 80 ml** (§3.4), **logo jamais recadré** (§12, déjà la règle ici). La fenêtre de 48 h des commandes livrées et la suppression de la purge sur GET (`3291428`) confirment §7.2.

**Conventions de lecture.** Next.js 16 (App Router), React, TypeScript, Prisma 6.19, PostgreSQL ≥ 15 (Supabase), déploiement Vercel région `cdg1`. « RSC » = composant serveur React ; « action » = Server Action Next (`"use server"`) ; « writer » = fichier serveur qui détient le droit d'écrire une table. Les chiffres s'écrivent **Encaissé / À encaisser / Marge nette / Trésorerie**, sans synonyme.

---

## 0. Les décisions en bref

| # | Sujet | Décision | § |
|---|---|---|---|
| 1 | Pile d'écriture | **Server actions par domaine** (`src/server/<domaine>/actions.ts`), toutes fabriquées par `defineAction`. Aucune route REST d'écriture. | 3 |
| 2 | Routes HTTP | **Cinq GET en liste fermée** : recherche à la frappe, sélecteur de ligne, export CSV, manifeste PWA, service worker. Toutes les autres routes `app/api/admin/*` sont supprimées. | 3.5 |
| 3 | Transactions | **`inTransaction`**, unique point d'ouverture d'une transaction ; verrous dans un ordre canonique ; rejeu automatique des interblocages ; idempotence par identifiant fourni par le client. | 4 |
| 4 | Propriété des tables | Un **writer** par table, seul à l'écrire ; vérifié par test d'architecture. | 4.3 |
| 5 | Argent | **`src/domain/money.ts`**, seul importeur de `decimal.js-light` : parsing, arithmétique exacte, arrondi demi vers le haut, conversion DZD→EUR, formatage. Transport en `MoneyString`. | 5 |
| 6 | Chiffres | **`src/server/chiffres/`** : `encaisse`, `aEncaisser`, `margeNette`, `tresorerie`, `enRetard`, `documentBalance` — le SQL de 03 §5, écrit une fois, composable en un aller-retour ; jumeau TypeScript testé en parité. | 6 |
| 7 | Lectures | Une lecture n'écrit **jamais** : purge supprimée, « replié » = prédicat de lecture, maintenance = scripts CLI explicites. | 7 |
| 8 | Authentification | Cookie JWT 7 jours à renouvellement glissant ; `proxy.ts` (garde optimiste) + **`requireSession`** appelé par construction dans `defineAction`, `defineQuery`, `defineReadRoute`. **Aucun rôle.** | 8 |
| 9 | Erreurs | **`ActionResult` unique** (huit codes), messages français « constat + geste », traduction centralisée des erreurs Prisma/PostgreSQL ; erreurs de lecture confinées au bloc. | 9 |
| 10 | Cache | Deux familles de tags : **`gestion`** et le contrat vitrine **`admin-catalogue` / `public-catalogue`** ; invalidation **automatique** déduite des modèles écrits ; clé de cache préfixée par le déploiement. | 10 |
| 11 | Stock | `Perfume.stock` (`NULL` = non suivi) ; deux fonctions d'écriture dans `src/server/catalogue/stock.ts` ; seul le module documents décide des deltas (quantités livrées). | 11 |
| 12 | Vitrine | Point de lecture et point d'invalidation inchangés ; règles de publication dans un module pur partagé. Visuels story (`PerfumeMedia`) côté gestion seulement : chemin de stockage décidé par le serveur, jamais cru du client ; objet supprimé du bucket après le commit. | 12 |
| 13 | Structure | `src/domain` · `src/contracts` · `src/server` · `src/features` · `src/ui` · `src/app-shell` ; routes en français sous `app/admin/(gestion)/`. | 2 |
| 14 | PWA | Manifeste, icônes et 12 splash conservés ; service worker versionné par déploiement ; page hors ligne autonome ; **pas de données hors ligne**, mais brouillons locaux et réessai idempotent. | 14 |
| 15 | Performance | Règles mesurées de l'audit (agrégat en une passe, `react.cache`, Suspense par bloc, listes fenêtrées) ; chiffres de l'Accueil en **un** aller-retour. | 15 |
| 16 | Tests | Unitaires (argent, domaine) · architecture (règles de ce document) · base réelle (T1–T15, triggers, parité des chiffres, reprise) · e2e (`npm run test:layout` + parcours clés à budget de taps). | 16 |

### 0.1 Amendements reportés au jalon J0 (font foi sur le reste du document)

04 et 06 ont été écrits en parallèle. La réconciliation (07 §3.0.2) tranche : **06 fait foi pour la présentation, la navigation, les gestes et les textes ; ce document fait foi pour le reste**. Les amendements ci-dessous priment sur les passages de ce document qui les contrediraient.

| # | Amendement | Sections touchées |
|---|---|---|
| A-1 | Onglets **Accueil · Commandes · Vendre · Clients · Catalogue** ; rattachements et parents de 06 §1.4 (Compta, Journal, Lots, Journée, Statistiques, Réglages sous Accueil ; `/admin/encaisser` sous Clients). | §2.1, §2.3 |
| A-2 | Route ajoutée : `app/admin/(gestion)/compta/journal/page.tsx` (journal de Trésorerie par mois, E04). | §2.1 |
| A-3 | **La fiche document est une sheet adressable** `?doc=<id>` (+ `edition=1`) acceptée sur toute page du shell. `PageScaffold` reçoit une prop `docId?: string` et rend `<Block><DocumentSheetBlock id={docId} /></Block>` ; chaque page de `src/features/*/pages` lit `searchParams.doc` et la transmet (vérifié par `tests/architecture/document-sheet.test.ts`). Pas de slot parallèle `@sheet`. Les pages `commandes/[id]`, `commandes/[id]/modifier`, `compta/ventes/[id]`, `compta/ventes/[id]/modifier` et `commandes/nouvelle` ne sont **pas** créées : ce sont des redirections de `next.config.mjs` vers `?doc=` et `/admin/vendre?mode=commande`. | §2.1, §2.3 |
| A-4 | Mémoire d'onglet (dernier écran, filtres, défilement), retaper l'onglet actif ferme / remonte / réinitialise, retour qui restitue le contexte du parent (06 §1.5). | §2.1 (`navigation.ts`) |
| A-5 | Actions composées transactionnelles : `deliverAndCollectAction` (T7 puis T4 en **une** transaction) et `collectAllAction` (un T7 par document, du plus ancien au plus récent, **une** transaction). Règles de mise en œuvre : §3.4 (J6). | §3.4 |
| A-6 | Fiche parfum et grille tarifaire en **un** enregistrement : `createPerfumeAction` et `updatePerfumeAction` reçoivent la grille (`pricing`) ; aucune action de tarifs séparée. | §3.4 |
| A-7 | Requêtes d'écran de 06 §8.1.6 : documents d'une période, séries du graphe par période, classement en unités, coût à compléter, récents du composeur, « Achète souvent », libellés de dépense récents. | §6, queries |
| A-8 | Paramètres d'URL de 06 §8.1.7 et redirections complémentaires de 06 §1.6. | §2.3 |
| A-9 | « Refaire » / « Revendre » pré-remplissent le composeur (`?depuis=`, `?client=`, `?parfum=`) ; `duplicateDocumentAction` n'est pas créée. | §3.4 |
| A-11 | Scripts : `build` passe par `scripts/migration/migrate-deploy-guarded.ts` jusqu'à la bascule (07 §2.3) ; scripts `migration:*` et `repetition:refresh` (07 §2.2) ; mode maintenance `NUREA_GESTION_MAINTENANCE=1` dans `proxy.ts` (503 statique pour `/admin/*`, 503 JSON pour `/api/admin/*`) ; bandeau « Essai — ces données seront effacées » quand `NUREA_ENV=preprod`. | §8.3, §17.3 |
| A-12 | Note par ligne (`SaleLine.note`) éditable dans le composeur et la fiche document. | §3.4 |
| A-13 | `tableauDeBord()` : Encaissé et Marge nette **du mois**, À encaisser, Trésorerie ; pas d'Encaissé depuis toujours ni de tuile « Ce mois ». | §6.3, §6.6 |

---

## 1. Principes et vue d'ensemble

### 1.1 Ce qu'on garde de l'existant

L'audit a montré une architecture **bonne dans son dessin et minée dans son application** (01 §2.1). La refonte garde le dessin et rend l'application mécanique.

| Hérité (01) | Reconduit | Ce qui change |
|---|---|---|
| `src/features/<domaine>/{pages,components}` + `src/server/<domaine>/{queries,actions}` | Oui | + `blocks/` (un bloc streamé = une requête) ; `writer.ts` distinct des actions ; contrats partagés dans `src/contracts/`. |
| Shell `src/app-shell/` (header, 5 onglets, `navigation.ts` testé, undo 5 s, pull-to-refresh, viewport clavier) | Oui (05 §3.4) | Monté par `app/admin/(gestion)/layout.tsx`, plus de bypass par test de chemin. |
| Domaine pur testé (`order-status.ts`, `balance.ts`, `signedAmount`) | Oui | Généralisé : toute règle métier calculable sans base vit dans `src/domain/`. |
| Perf commentée : agrégats SQL en une passe, `react.cache`, `unstable_cache` taggé, Suspense par bloc, `WindowedList` | Oui (§15) | Encapsulée dans `defineQuery` et `cached()` pour qu'on ne puisse plus l'oublier. |
| `revalidateAdminData` (« les mêmes euros, agrégés ailleurs ») | L'idée | L'invalidation n'est plus appelée à la main : elle est déduite des écritures (§10). |
| `requireAdmin` uniformément appliqué sur les routes REST | L'idée | Généralisé à toute action et toute lecture, sans rôle (§8). |
| `movements.ts` prêt pour l'atomicité (client transactionnel en paramètre) | L'idée | Branché : aucun writer ne peut écrire hors transaction (§4). |
| Politique du service worker (jamais d'API ni de HTML authentifié en cache) | Oui (§14) | Version dérivée du déploiement, repli hors ligne autonome. |

**Pourquoi l'application tiendra cette fois.** Chaque règle de ce document qui a été violée dans l'existant par oubli (auth des actions, revalidation, transaction, écriture concurrente d'une table, calcul dupliqué, `Number()` sur de l'argent, `useSearchParams` hors Suspense) est **vérifiée par une machine** : un wrapper sans lequel le code ne s'exporte pas, un test d'architecture qui échoue, une contrainte ou un trigger en base (§16.2). La discipline n'est plus le mécanisme.

### 1.2 Les couches

```mermaid
flowchart TB
  subgraph NAV["Navigateur — PWA iOS"]
    CC["features/*/components<br/>composants clients"]
    UIS["ui/* · app-shell/*"]
  end
  subgraph SRV["Serveur Next — Node, cdg1"]
    PX["proxy.ts<br/>garde optimiste"]
    PG["app/admin/(gestion)/**/page.tsx<br/>features/*/pages · blocks (RSC)"]
    RH["app/api/admin/* — GET seulement"]
    ACT["server/*/actions.ts<br/>defineAction"]
    Q["server/*/queries.ts · server/chiffres<br/>defineQuery · cached"]
    TX["server/db/transaction.ts<br/>inTransaction"]
    W["server/*/writer.ts"]
  end
  DB[("PostgreSQL Supabase<br/>CHECK · triggers · vue DocumentBalance")]
  DOM["domain/* · contracts/*<br/>purs, partagés client et serveur"]
  CC -- "appel d'action" --> ACT
  CC -- "fetch GET" --> RH
  PX --> PG
  PG --> Q
  RH --> Q
  ACT --> TX
  TX --> W
  W --> DB
  Q --> DB
  CC -.-> DOM
  ACT -.-> DOM
  W -.-> DOM
  Q -.-> DOM
```

Le trajet d'une écriture, de bout en bout :

```mermaid
sequenceDiagram
  participant UI as Composant client
  participant A as defineAction
  participant T as inTransaction
  participant W as writers
  participant PG as PostgreSQL
  participant C as invalidation
  UI->>A: recordPaymentAction({ id, documentId, amount, pocketId })
  A->>A: requireSession · validation zod (contrat partagé)
  A->>T: ouvre l'unité de travail
  T->>PG: BEGIN · verrous (document, poche)
  T->>W: paymentsWriter.record(tx, …)
  W->>PG: INSERT CashMovement · INSERT Payment
  T->>PG: COMMIT (triggers différés vérifiés)
  A->>C: modèles écrits → tag « gestion »
  A-->>UI: { ok: true, data } + RSC de la page déjà à jour
```

### 1.3 Règles d'import entre couches

| Couche | Peut importer | Ne peut **jamais** importer | Garde-fou |
|---|---|---|---|
| `src/domain/**` | `decimal.js-light` (depuis `money.ts` seulement) | `next/*`, `react`, `@prisma/client`, tout `src/server`, `src/features`, `src/ui` | ESLint `no-restricted-imports` + test `layers` |
| `src/contracts/**` | `src/domain`, `zod` | `next/*`, `react`, `@prisma/client`, `src/server` | idem |
| `src/server/db/**`, `src/server/core/**`, `src/server/cache/**`, `src/server/auth/**` | `@prisma/client`, `src/lib/db/prisma.ts`, `next/*` utiles, `src/domain`, `src/contracts` | `src/features`, `src/ui`, `src/app-shell` | `import "server-only"` en tête de chaque fichier |
| `src/server/<domaine>/writer.ts` | type `Tx`, writers d'autres domaines (composition), `src/domain`, `src/contracts` | le client Prisma global, `next/*`, `queries.ts`, `actions.ts` | test `table-ownership` |
| `src/server/<domaine>/queries.ts`, `src/server/chiffres/**` | client Prisma, `cached`, `defineQuery`, `src/domain`, `src/contracts` | tout `writer.ts`, tout `actions.ts` | test `layers` |
| `src/server/<domaine>/actions.ts` | `defineAction`, `inTransaction`, writers, `src/contracts`, `src/domain` | `queries.ts` (une action lit via `tx.db` dans sa transaction) | test `server-actions` |
| `app/api/**/route.ts` | `defineReadRoute`, queries | writers, actions | test `route-handlers` |
| `src/features/*/pages`, `src/features/*/blocks` (RSC) | queries, `src/server/chiffres`, `src/ui`, `src/app-shell`, `src/contracts`, `src/domain`, composants de la feature | writers, `src/server/db` | test `layers` |
| `src/features/*/components` (clients) | **fonctions** d'actions, `src/contracts`, `src/domain`, `src/ui`, `src/app-shell` | queries, writers, `src/server/db` (le build échoue grâce à `server-only`) | `server-only` + test `layers` |
| `src/ui/**` | `src/design`, `src/domain` (formatage) | `src/features`, `src/server`, `src/app-shell` | test `layers` |
| `src/app-shell/**` | `src/ui`, `src/domain`, `src/contracts`, actions `auth` | `src/features` | test `layers` |
| Vitrine (`app/(shop)`, `src/components`, `src/lib` hors `db/`, `pwa/`) | inchangé | `src/server`, `src/features`, `src/ui`, `src/app-shell`, `src/contracts` | test `layers` (registres disjoints, CLAUDE.md) |

---

## 2. Arborescence cible

### 2.1 L'arbre commenté

```text
nurea-parfums/
├── proxy.ts                          Garde optimiste /admin/* : JWT vérifié, renouvellement glissant,
│                                     en-tête x-nurea-admin-route (remplace middleware.ts, convention Next 16)
├── instrumentation.ts                Contrôle des variables d'environnement de la gestion au démarrage
│                                     (journalise fort, ne bloque jamais la vitrine)
├── next.config.mjs                   Existant + headers() de sécurité (admin) + redirects() des anciennes URL
├── vitest.config.ts                  Projets unit · arch · db (§16)
├── playwright.config.ts              Projets Mobile / Desktop ; globalSetup : base de test + connexion réelle
├── prisma/
│   ├── schema.prisma                 Le schéma de 03 §3
│   └── migrations/                   expand · contract · cleanup (03 §7) ; CHECK, triggers, vue et fonctions
│                                     de période écrits à la main en SQL. Jamais de `db push` en production.
├── scripts/
│   ├── create-admin.ts               Crée ou réinitialise le compte unique (sans rôle) — CLI
│   ├── build-admin-pwa-assets.mjs    Icônes + 12 splash (sharp) ; lit src/lib/pwa/splash-targets.json
│   ├── check-invariants.ts           Tâche explicite, lecture seule : invariants de 03 §5.7
│   ├── storage-orphans.ts            Tâche explicite : objets du bucket non référencés par Brand, Perfume,
│   │                                 PerfumeMedia ou SaleLine.imageUrl (--apply pour supprimer, §7.3)
│   └── migration/
│       └── reprise.ts                Reprise one-shot de 03 §7 (--dry-run par défaut, ROLLBACK final)
├── public/
│   ├── admin-offline.html            Page hors ligne autonome : CSS inline, aucune ressource externe
│   └── pwa/admin/                    Icônes et splash générés (inchangés)
├── tests/
│   ├── architecture/                 Les règles de ce document, vérifiées par lecture des sources (§16.2)
│   └── db/                           Intégration sur un vrai PostgreSQL migré (§16.3)
├── e2e/
│   ├── global-setup.ts               Migre et remplit la base de test, se connecte par l'écran → storageState
│   ├── fixtures/seed.ts              Jeu minimal : poches, 20 parfums, 5 clients, 1 lot ouvert
│   ├── helpers/
│   │   ├── layoutInvariants.ts       Conservé
│   │   └── tap.ts                    Clic compté (budget de taps des parcours, 02 §2)
│   ├── layout-invariants.spec.ts     `npm run test:layout` — conservé, liste de routes mise à jour (§2.3)
│   └── parcours/*.spec.ts            Parcours clés (§16.4)
├── app/
│   ├── layout.tsx                    Root minimal sans CSS — inchangé
│   ├── (shop)/…                      Vitrine — hors périmètre, inchangée
│   ├── admin-sw.js/route.ts          GET service worker, version = identifiant de déploiement (public)
│   ├── api/
│   │   ├── perfume-search/route.ts   Vitrine — inchangé
│   │   ├── pwa/shop/route.ts         Vitrine — inchangé
│   │   ├── pwa/admin/route.ts        GET manifeste PWA gestion (public) — conservé
│   │   └── admin/
│   │       ├── search/route.ts       GET recherche à la frappe (palette, sélecteurs)
│   │       ├── picker/route.ts       GET parfums + tarifs pour le sélecteur de ligne, versionné (livrée à J11)
│   │       └── export/compta/route.ts GET export CSV comptable
│   └── admin/
│       ├── layout.tsx                Metadata PWA (splash, manifeste, themeColor), globals.admin.css.
│       │                             Ni garde, ni shell (sert aussi la connexion).
│       ├── login/page.tsx            Connexion — hors garde, hors shell
│       └── (gestion)/                Groupe de routes : tout ce qui exige une session
│           ├── layout.tsx            await requireSession() puis <AdminShell>
│           ├── loading.tsx           Squelette générique d'écran (header + corps)
│           ├── error.tsx             Erreur d'écran : ErrorBanner + « Réessayer »
│           ├── page.tsx              Accueil
│           ├── journee/page.tsx      Récap de journée (N4)
│           ├── commandes/
│           │   └── page.tsx          Liste groupée par urgence (fiche document en sheet ?doc=, A-3)
│           ├── vendre/page.tsx       Composeur unique vente | commande (?mode=commande)
│           ├── encaisser/page.tsx    Rattaché à l'onglet Clients (A-1)
│           ├── compta/
│           │   ├── page.tsx          Vues Ventes / Trésorerie (?vue=tresorerie)
│           │   └── journal/page.tsx  Journal de Trésorerie par mois (A-2)
│           ├── lots/
│           │   ├── page.tsx
│           │   ├── nouveau/page.tsx
│           │   └── [id]/page.tsx     (?assigner=1 ouvre la sheet d'assignation)
│           ├── clients/
│           │   ├── page.tsx
│           │   ├── nouveau/page.tsx
│           │   └── [id]/
│           │       ├── page.tsx
│           │       └── modifier/page.tsx
│           ├── catalogue/
│           │   ├── page.tsx          Onglets parfums / marques / en avant (?tab, ?q, ?stock=bas)
│           │   ├── parfums/
│           │   │   ├── nouveau/page.tsx
│           │   │   └── [id]/
│           │   │       ├── page.tsx  Fiche en consultation (cible de la palette, 02 §4.6)
│           │   │       └── modifier/page.tsx
│           │   └── marques/
│           │       ├── nouvelle/page.tsx
│           │       └── [id]/modifier/page.tsx
│           ├── statistiques/page.tsx Top parfums par période
│           └── reglages/page.tsx     Déconnexion, taux DZD par défaut, poche par défaut (N3)
└── src/
    ├── domain/                       PUR : ni Next, ni React, ni Prisma. Importable client ET serveur.
    │   ├── money.ts                  LE module monétaire (§5)
    │   ├── document-status.ts        Machine d'états + réserves (reprise de order-status.ts, READY → CONFIRMED)
    │   ├── document-balance.ts       Jumeau TS de la vue DocumentBalance (aperçus, plafonds) (§6.4)
    │   ├── fulfillment.ts            deriveFulfillment, remainingToDeliver (repris)
    │   ├── stock.ts                  Statut de stock (non suivi / rupture / bas / ok), réserve de plancher
    │   ├── publication.ts            Règles de visibilité et de mise en avant (§12)
    │   ├── periods.ts                Bornes Europe/Paris pour l'affichage et les clés de cache
    │   ├── phone.ts                  Normalisation des formats français vers E.164
    │   ├── sale-line.ts              Contenances 10/50/80, règles d'une ligne jumelles des CHECK (garde des lignes reprises)
    │   ├── ids.ts                    newId() (crypto.randomUUID) + parseurs d'identifiants
    │   ├── errors.ts                 DomainError, NeedsConfirmation
    │   └── __tests__/
    ├── contracts/                    Frontière client ↔ serveur, partagée
    │   ├── result.ts                 ActionResult, ActionError, codes (§9)
    │   ├── zod-fr.ts                 Carte d'erreurs zod en français
    │   ├── fields.ts                 Champs communs : identifiant, texte libre, date, drapeau de confirmation
    │   ├── documents.ts              Schémas d'entrée zod + types DTO de sortie
    │   ├── payments.ts · batches.ts · treasury.ts · catalogue.ts · customers.ts · settings.ts · auth.ts
    │   └── search.ts · chiffres.ts        (DTO du sélecteur de ligne : dans catalogue.ts, pas de picker.ts)
    ├── server/                       `import "server-only"` en tête de chaque fichier
    │   ├── env.ts                    Variables de la gestion validées (zod), BUILD_ID
    │   ├── core/
    │   │   ├── define-action.ts      defineAction (§3.3)
    │   │   ├── define-query.ts       defineQuery (§8.4)
    │   │   ├── define-read-route.ts  defineReadRoute (§3.5)
    │   │   ├── errors.ts             Traduction exceptions → ActionError (§9.3)
    │   │   ├── error-messages.ts     Messages par contrainte SQL et par code Prisma
    │   │   ├── log.ts                Une ligne JSON par action (nom, code, durée, référence)
    │   │   └── maintenance.ts        Page et réponses 503 du mode maintenance (A-11), servies par proxy.ts
    │   ├── db/
    │   │   ├── client.ts             Client Prisma étendu (enregistrement des modèles écrits, §10.2)
    │   │   ├── transaction.ts        inTransaction (§4.1)
    │   │   ├── locks.ts              Verrous en ordre canonique (§4.2)
    │   │   └── unit-of-work.ts       Contexte AsyncLocalStorage : modèles écrits pendant l'action
    │   ├── cache/
    │   │   ├── tags.ts               Tags et correspondance modèle → tags
    │   │   ├── cached.ts             Seul appelant de unstable_cache (§10.3)
    │   │   └── invalidate.ts         Seul appelant de updateTag / revalidateTag / revalidatePath
    │   │                             (contient revalidateAdminCatalogue, corps inchangé)
    │   ├── auth/
    │   │   ├── token.ts              Signature / vérification JWT (jose), sans API Next — partagé avec proxy.ts
    │   │   ├── session.ts            readSession, requireSession
    │   │   ├── actions.ts            loginAction (seule action publique), logoutAction
    │   │   └── writer.ts             AdminUser : compteur d'échecs, verrouillage temporaire
    │   ├── chiffres/                 LES définitions des chiffres (§6) — lecture seule
    │   │   ├── sql.ts                Fragments SQL de 03 §5, paramétrés
    │   │   ├── index.ts              encaisse, aEncaisser, margeNette, tresorerie, enRetard, creancesAnciennes, documentBalance,
    │   │   │                         variantes groupées et composite tableauDeBord
    │   │   └── dto.ts                Conversion lignes SQL → DTO (MoneyString)
    │   ├── documents/                Module « documents » (03 §4.2)
    │   │   ├── actions.ts            "use server" — defineAction uniquement
    │   │   ├── writer.ts             SaleDocument, SaleLine ; décide les deltas de stock ; apprend les tarifs ;
    │   │   │                         corps de T1 (paiements compris), T4b, T5, T7 et A-5, qui composent les
    │   │   │                         pièces de payments/writer.ts (§3.4, J6)
    │   │   └── queries.ts            Listes (commandes, compta), fiche, vendus récemment, candidats d'un lot
    │   ├── payments/                 Module « encaissements »
    │   │   ├── actions.ts            (recordPaymentAction et collectAllAction ouvrent la transaction du writer documents)
    │   │   └── writer.ts             Payment seul (+ son mouvement via treasury/movements.ts) ; corps de T8
    │   │                             (annuler, corriger, rembourser) ; n'importe jamais documents/writer.ts
    │   ├── treasury/                 Module « trésorerie »
    │   │   ├── actions.ts
    │   │   ├── movements.ts          LE seul INSERT de CashMovement (et la mise à jour de son libellé)
    │   │   ├── writer.ts             Pocket
    │   │   └── queries.ts            Poches actives, journal par mois
    │   ├── batches/                  Module « lots »
    │   │   ├── actions.ts · writer.ts (Batch, BatchExpense) · queries.ts
    │   ├── catalogue/                Module « catalogue »
    │   │   ├── actions.ts
    │   │   ├── writer.ts             Brand, Perfume (hors stock), PerfumePricing (grille de la fiche :
    │   │   │                         savePricingGrid ; apprentissage N8 : upsertPricing) ; verrous de marque (§4.2)
    │   │   ├── media.ts              Writer de PerfumeMedia (visuels story) : ajout (rang calculé, plafond 24),
    │   │   │                         libellé, réordonnancement, retrait qui rend l'URL de l'objet à effacer (§12)
    │   │   ├── stock.ts              setStock, applyDeliveredDeltas — seules écritures de Perfume.stock (§11)
    │   │   ├── resoudMarque.ts       Dédoublonnage des marques (02 §4.5), en LECTURE seule : lecteur en paramètre
    │   │   │                         (tx.db ou client de lecture) ; resoudMarqueParNom rend { existante } | { aCreer } ;
    │   │   │                         la création passe par writer.createBrand
    │   │   ├── storage.ts            URL signée Supabase (chemin DÉCIDÉ par le serveur selon l'usage :
    │   │   │                         parfum, logo, story), URL publique recalculée depuis le chemin,
    │   │   │                         suppression d'objets APRÈS le commit, seulement dans notre bucket
    │   │   │                         (best-effort journalisé)
    │   │   ├── dto.ts                Grille tarifaire et état de marque en DTO (MoneyString)
    │   │   └── queries.ts            Instantané admin (tag admin-catalogue, nombre de visuels story par parfum
    │   │                             compris), fiche parfum non cachée (galerie story, activité des ventes, §10.4),
    │   │                             brouillon de duplication, fiche marque, alertes de stock, contenu et version
    │   │                             du sélecteur (empreinte sha256, tag admin-catalogue, §3.5)
    │   ├── customers/                actions.ts · writer.ts · queries.ts
    │   ├── settings/                 actions.ts · writer.ts (readSettings, updateSettings, rememberPocket,
    │   │                             forgetPocket) · queries.ts (getSettings)
    │   ├── search/queries.ts         Recherche à la frappe sur instantanés cachés (§15) — J8
    │   ├── stats/queries.ts          Top parfums par période
    │   └── export/compta-csv.ts      Construction du CSV (BOM, point-virgule)
    ├── features/                     UI par écran — compose, ne réimplémente rien
    │   ├── <feature>/
    │   │   ├── pages/                RSC : un fichier par écran, affiche le titre immédiatement
    │   │   ├── blocks/               RSC async : un bloc = ses requêtes = un <Block> (§13)
    │   │   ├── components/           "use client" : interactions, formulaires, sheets
    │   │   └── index.ts              N'exporte que les pages
    │   │   (features : auth, dashboard, orders, documents, sell, collect, compta, treasury,
    │   │    batches, customers, catalogue, stats, settings)
    ├── ui/                           05 §3 : primitives/, patterns/ — rien d'autre
    ├── app-shell/                    05 §3.4 + :
    │   ├── navigation.ts             Onglets, parents, mémoire d'onglet, onTabPress (conservé, testé)
    │   ├── routes.ts                 Constructeurs d'URL — seul endroit où une URL admin s'écrit ;
    │   │                             inventaire de 06 §1.2 avec l'état de chaque écran (à venir, provisoire, livré)
    │   ├── Block.tsx                 Suspense + frontière d'erreur par bloc (§13.2)
    │   ├── hooks/                    useAction, useDraft, useUrlState, useCoalescedAction, useReadRoute
    │   │                             (+ noyaux purs testés : draft-store, coalesce, url-patch, action-errors)
    │   ├── AdminShell · AppHeader · TabBar · CommandPalette · PullToRefresh (J4)
    │   ├── FeedbackProvider.tsx      Toast unique (z 100, portalisé : 05 §2.7, §3.1) et confirmations `useConfirm` (J4)
    │   ├── UndoProvider · SheetRegistry · ShellNavigation (J4)
    │   ├── ViewportService.tsx       LE service viewport ; viewport.ts : son calcul pur (J4)
    │   ├── PreprodBanner.tsx, preprod.ts   Bandeau et suffixe « (essai) » (A-11, J4)
    │   ├── session-hint.ts           Témoin « une session a existé ici » : message d'expiration (06 E18, J4)
    │   └── pwa/service-worker.ts     Source du service worker (§14.3)
    ├── design/                       tokens.ts (source), globals.admin.css (dérivée) — 05 §2
    ├── lib/                          Vitrine et partagé historique : db/prisma.ts (client de base), pwa/,
    │                                 nommage.ts, slugify.ts, catalogue-service.ts (contrat vitrine, §12)
    ├── components/                   Vitrine — hors périmètre
    └── actions/contact.ts            Vitrine — hors périmètre
```

### 2.2 Conventions de nommage

- **Code en anglais** (dossiers, fichiers, fonctions, types), comme le schéma Prisma. **URL et textes d'écran en français.**
- **Exceptions nommées, et seulement elles** :
  - les fonctions de `src/server/chiffres/` (`encaisse`, `aEncaisser`, `margeNette`, `tresorerie`, `enRetard`) portent les noms fixés par 03 §5.7. Raison : ce sont les termes du vocabulaire canonique ; les traduire créerait un synonyme, que la règle « un chiffre = un nom » interdit jusque dans le code (une recherche de `aEncaisser` trouve tous les consommateurs) ;
  - `src/lib/nommage.ts` (`cleNom`, `normalise*`), repris tel quel, et `src/server/catalogue/resoudMarque.ts` (`marqueEquivalente`, `resoudMarqueParNom`), repris en lecture seule (§2.1) avec la même règle de comparaison (02 §4.5), noms conservés pour que leurs tests et commentaires restent valables.
- Action : suffixe `Action` (`recordPaymentAction`). Writer : `<domaine>Writer` à l'import (`import * as paymentsWriter from "@/server/payments/writer"`).
- Une URL admin ne s'écrit **que** dans `src/app-shell/routes.ts` (`routes.document({ id, origin })`, `routes.client(id)`…). Un test vérifie que chaque constructeur pointe sur un `page.tsx` existant.
  *Précisé à J4* (`tests/architecture/routes-builders.test.ts`) : chaque constructeur porte l'état de son écran — un écran **à venir** existe déjà comme constructeur mais n'a pas encore de page (vérifié, son jalon listé en `todo`), un écran **provisoire** ou **livré** a la sienne ; aucune page de `app/admin` n'échappe à l'inventaire. La règle « aucune URL littérale » vaut pour les couches d'interface (`src/app-shell` hors `routes.ts` et `navigation.ts`, `src/features`, `src/ui`, `app/admin`) : le socle serveur (`defineQuery`, `logoutAction`), `src/contracts/auth.ts`, `proxy.ts` et `src/lib/pwa/manifests.ts` écrivent `/admin` et `/admin/login` en dur, faute de pouvoir importer le shell (§1.3).

### 2.3 Carte des routes et redirections

La route `ordres` n'est pas reconduite (02 §6) ; toutes les routes passent en français. `06-ECRANS-PARCOURS.md` rattache chaque route à un onglet dans `navigation.ts` (invariant : une route, un onglet ; onglet actif et retour racontent le même trajet).

- **Un document s'ouvre en sheet adressable** (amendement A-3, §0.1) : `routes.document({ id, origin })` renvoie `/admin/commandes?doc=<id>` (origine `ORDER`) ou `/admin/compta?doc=<id>` (origine `DIRECT_SALE`). Les adresses `/admin/commandes/[id]`, `/admin/compta/ventes/[id]` et leurs `/modifier` restent joignables **par redirection** vers ces formes (`&edition=1` pour `/modifier`) ; aucune page n'y est créée.
- **Une sheet qui a besoin de données serveur est pilotée par l'URL** (`?assigner=1`, `?vue=tresorerie`) : ses données arrivent par le RSC de la page, sous `Block`. Aucune route JSON pour charger une sheet.

Redirections permanentes dans `next.config.mjs` (`redirects()`), dans cet ordre :

| Ancienne URL | Nouvelle URL |
|---|---|
| `/admin/ordres/new` | `/admin/commandes/nouvelle` |
| `/admin/ordres/:id/edit` | `/admin/commandes/:id/modifier` |
| `/admin/ordres/:path*` | `/admin/commandes/:path*` |
| `/admin/perfumes/new` | `/admin/catalogue/parfums/nouveau` |
| `/admin/perfumes/:id/edit` | `/admin/catalogue/parfums/:id/modifier` |
| `/admin/brands/new` | `/admin/catalogue/marques/nouvelle` |
| `/admin/brands/:id/edit` | `/admin/catalogue/marques/:id/modifier` |
| `/admin/clients/new` | `/admin/clients/nouveau` |
| `/admin/clients/:id/edit` | `/admin/clients/:id/modifier` |
| `/admin/lots/new` | `/admin/lots/nouveau` |
| `/admin/stats/top-parfums` | `/admin/statistiques` |
| `/admin/offline` | `/admin` |

Les identifiants de documents sont conservés par la migration (03 §7.4) : une ancienne fiche commande reste joignable. Le paramètre `?sale=` de l'ancienne compta n'est pas repris.

*Mise en œuvre J3 (`next.config.mjs`, `ADMIN_REDIRECTS`).* Ordre effectif : (1) compléments de 06 §1.6 conditionnés par la query (`has`), placés **avant** la règle générique `ordres` qui les masquerait ; (2) le tableau ci-dessus ; (3) les adresses de document de l'amendement A-3 (`/admin/commandes/nouvelle` → `/admin/vendre?mode=commande`, `/admin/commandes/:id[/modifier]` → `/admin/commandes?doc=:id[&edition=1]`, idem `compta/ventes`). Les règles se chaînent : `/admin/ordres/abc` → `/admin/commandes/abc` → `/admin/commandes?doc=abc` (308 puis 308, vérifié sur un build de production). Deux comportements de Next à connaître : la query d'origine est **recopiée** dans la destination (`/admin/ordres?filter=ready` aboutit à `?filter=ready&filtre=confirmees` ; le paramètre mort est ignoré par la page) ; en conséquence `/admin/compta?sale=<id>` n'a pas de règle (elle bouclerait) et la page ignore simplement `sale`. `tests/architecture/redirects.test.ts` rejoue chaque règle avec les fonctions de correspondance de Next et vérifie que toute destination appartient à l'inventaire de 06 §1.2, avec des paramètres que la route reconnaît, sans boucle.

### 2.4 Ce qui disparaît du code

| Existant | Devenir |
|---|---|
| `middleware.ts` | `proxy.ts` (§8.3) |
| `app/api/admin/**` sauf `search` | Supprimé (§3.5) |
| `app/admin/offline/` | `public/admin-offline.html` (§14.4) |
| `public/admin-sw.js` | `app/admin-sw.js/route.ts` + `src/app-shell/pwa/service-worker.ts` (§14.3) |
| `src/lib/admin/*` (`audit.ts`, `cache-tags.ts`, `http.ts`, `loginRateLimit.ts`, `parseCookie.ts`, `requireAdmin.ts`, `session.ts`, `revalidateAdminData.ts`, `revalidateAdminCatalogue.ts`, `resoudMarque.ts`, `image-utils.ts`, `catalogue-types.ts`, `index.ts`) | Répartis : `src/server/auth`, `src/server/cache`, `src/server/catalogue`, `src/features/catalogue/components` ; audit, rate-limit mémoire et cookies parsés à la main supprimés |
| `src/lib/gestion/*` (dont `orderPurge.ts`, `orderJson.ts`, `calculations.ts`, `orderLineValidation.ts`) | Supprimé (`orderPurge.ts` l'est déjà en production depuis `3291428`) |
| Visuels story de la production (10/09/2026) : `app/api/admin/perfumes/[id]/media/**`, `src/server/catalogue/media.ts` (client Prisma global), `src/lib/supabase/adminStorage.ts` (`safeImagePath` à portée, `removeObjects`), `prepareStoryImage` de `src/lib/admin/image-utils.ts`, `src/features/catalogue/components/PerfumeMediaPanel.tsx`, `src/ui/patterns/MediaGallery.tsx` | Règles reprises (§12) : actions et writer `media.ts` du module catalogue, `storage.ts`, `image-convert.ts`, galerie de E16 ; `MediaGallery` porté dans `src/ui/patterns/` au jalon J11 (05 §3.2) |
| `src/domain/volumes.ts` (production, 10/09/2026 : `VOLUMES_ML`, `LEGACY_VOLUME_ML`, `normalizeVolumeMl`) | `VOLUMES_ML` et `DEFAULT_VOLUME_ML` dans `src/domain/sale-line.ts` ; la traduction 30 → 10 / 100 → 80 n'est pas reconduite (données déjà traduites en production ; une valeur héritée restante est listée et demandée, 03 §7.7) |
| `src/lib/numeric.ts`, `src/domain/money.ts` actuel, `src/domain/balance.ts` | Remplacés par `src/domain/money.ts` et `src/domain/document-balance.ts` |
| `src/schemas/*` | `src/contracts/*` |
| `src/server/sales/*`, `src/server/orders/*`, `src/server/collect/*`, `src/server/kpi/*`, `src/server/pricing/*` | `src/server/documents`, `payments`, `chiffres`, `catalogue` |
| `src/hooks/useLastExchangeRate.ts`, `useAdminKeyboardInset.ts`, `usePullToRefresh.ts` | Taux par défaut en base (N3) ; service viewport unique et pull-to-refresh dans `src/app-shell` (05) |
| `src/app-shell/AdminLoadingProgress.tsx`, `ViewportSync.tsx` | Supprimé ; service viewport unique (05 §3.4) |
| Dépendances sans importeur à la date de l'audit : `@tanstack/react-query`, `nuqs`, `class-variance-authority`, `motion` | Retirées après vérification par recherche dans `src/` et `app/` |

---

## 3. Une seule pile d'écriture : les server actions par domaine

### 3.1 Décision

**Toute écriture passe par une server action d'un module de domaine, fabriquée par `defineAction`.** Aucune route REST n'écrit.

Pourquoi les actions et pas le REST : l'audit (01 §2.2 n°3, §4.7) montre que les écrans récents écrivaient déjà par actions, que la pile REST ne subsistait que par inertie avec des règles divergentes, et que le REST impose une plomberie répétée (parse JSON, garde, try/catch, sérialisation) qui a produit les oublis. Les actions apportent en plus : types de bout en bout sans contrat dupliqué à la main (la dérive du pont `fromOrder` est née d'un tel contrat), protection CSRF native de Next (origine vérifiée), et **la page courante renvoyée à jour dans la même réponse** quand l'action invalide un tag — l'écran reflète l'écriture sans re-navigation (principe 6 de 02).

### 3.2 Anatomie d'un module serveur

```text
src/server/payments/
├── actions.ts   "use server". N'exporte QUE des `export const xAction = defineAction(…)`.
│                Rôle : ouvrir la transaction, prendre les verrous, composer les writers.
├── writer.ts    Seul fichier autorisé à écrire Payment. Fonctions `(tx: Tx, input) => Promise<…>`.
│                Ne reçoit jamais le client Prisma global : impossible d'écrire hors transaction.
└── queries.ts   (si le module a des lectures propres) `export const x = defineQuery(…)`.
```

Les schémas d'entrée (zod) et les DTO de sortie vivent dans `src/contracts/payments.ts`, importés à la fois par le formulaire client (validation immédiate, mêmes messages) et par l'action (validation d'autorité).

### 3.3 `defineAction`

```ts
// src/server/core/define-action.ts
import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import type { ActionResult } from "@/contracts/result";
import { requireSession } from "@/server/auth/session";
import { runUnitOfWork } from "@/server/db/unit-of-work";
import { invalidateWrittenModels } from "@/server/cache/invalidate";
import { toActionError, validationError } from "@/server/core/errors";
import { logAction } from "@/server/core/log";

// Un handler rend ses données, ou withNotice(data, "…") pour un succès accompagné d'une information.
type WithNotice<T> = { readonly [NOTICE]: true; data: T; notice: string };
type Handler<S extends z.ZodTypeAny, T> = (input: z.output<S>) => Promise<T | WithNotice<T>>;

export function defineAction<S extends z.ZodTypeAny, T>(
  name: string,                       // "payments.record" — journal et messages
  schema: S,
  handler: Handler<S, T>,
  options: { public?: true } = {},    // `public` : autorisé pour loginAction seulement (test d'architecture)
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async function action(raw) {
    const started = Date.now();
    const written = new Set<string>();         // modèles Prisma écrits pendant l'action
    try {
      if (!options.public) await requireSession();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: validationError(parsed.error) };
      const out = await runUnitOfWork(written, () => handler(parsed.data));
      logAction(name, "ok", started);
      return isWithNotice(out)
        ? { ok: true, data: out.data, notice: out.notice }
        : { ok: true, data: out };
    } catch (e) {
      unstable_rethrow(e);                     // laisse passer redirect()/notFound() de Next
      const error = toActionError(e);
      logAction(name, error.code, started, e);
      return { ok: false, error };
    } finally {
      invalidateWrittenModels(written);        // après COMMIT ou ROLLBACK : toujours sûr (§10.2)
    }
  };
}
```

Règles :

- Un fichier `actions.ts` commence par `"use server"` et **n'exporte que** des constantes produites par `defineAction`. Aucun autre fichier du repo ne contient `"use server"` (hors `src/actions/contact.ts`, vitrine).
- Une action ne fait **jamais** `redirect()` (le client navigue sur `ok`), sauf `logoutAction`.
- Une action ne lit pas via `queries.ts` : elle lit dans sa transaction (`tx.db`), sur des lignes verrouillées.
- Une action renvoie le minimum utile à l'écran (id, URL canonique, solde du document) ; le reste arrive par le RSC rafraîchi.
- Le succès peut porter une `notice` (« Louis Vuitton existe déjà au catalogue : elle a été sélectionnée. ») affichée en toast d'information — elle n'emprunte plus jamais le canal d'erreur (bug 01 §4.5).
- *Mise en œuvre J3.* `withNotice(data, notice)` est exporté par `define-action.ts` ; `logAction({ action, startedAt, error?, cause? })` journalise aussi les refus de validation ; le détail technique (SQLSTATE, contrainte, pile) n'est écrit que pour `UNEXPECTED`, `UNAVAILABLE` et les CHECK. `defineReadRoute(name, handler)` : le handler rend ses données (`Cache-Control: private, no-store`), `reply(data, { cacheControl })` pour un en-tête choisi (sélecteur versionné), ou une `Response` (export CSV) ; statut HTTP déduit du code (`SESSION_EXPIRED` ⇒ 401, `NOT_FOUND` ⇒ 404, `UNAVAILABLE` ⇒ 503…).

### 3.4 Inventaire des actions

Chaque action correspond à un geste de 02 et, pour les écritures multi-tables, à une transaction numérotée de 03 §4.3.

| Module | Action | Transaction (03 §4.3) | Geste servi |
|---|---|---|---|
| documents | `createDocumentAction` | T1 | Vendre (vente directe + « Reçu maintenant », N1), prendre une commande (+ acompte), avec lot dès la création (N9) et client créé en ligne |
| documents | `updateDocumentAction` | T2 | Modifier lignes (en place), client, date de livraison prévue, notes |
| documents | `setLineDeliveredAction` | T3 | Pointer une livraison (valeur absolue, bornée) |
| documents | `changeDocumentStatusAction` | T4 | Livrer, revenir, confirmer, réactiver (réserves confirmées ; une vente directe annulée se réactive en livrée, 03 §2.3). Renvoie le jeton d'annulation de T4b (réactivation comprise) |
| documents | `deliverAndCollectAction` | T7 + T4 (A-5) | « Encaisser 60 € et livrer » (S02 variante Livrer) : un solde puis la livraison, en une transaction. Renvoie le jeton de T4b |
| documents | `revertDocumentChangeAction` | T4b (+ T8) | « Annuler » du toast (5 s) après tout changement de statut, tout encaissement (T7), « Livrer et encaisser » ou « Tout encaisser » : rétablit l'état d'avant (statut, horodatages, quantités livrées, stock) et contre-passe les paiements du geste, en une transaction ; `CONFLICT` si le document a changé depuis |
| documents | `cancelDocumentAction` | T5 | Annuler, avec remboursements proposés |
| documents | `deleteDocumentAction` | T6 | Supprimer un document sans paiement (undo 5 s côté shell) |
| documents | `assignDocumentsToBatchAction` | T13 | Rattacher / détacher (unitaire et en masse, diff) |
| payments | `recordPaymentAction` | T7 | Acompte, solde, encaissement depuis Encaisser — **une seule action pour tout encaissement** (fin de la dualité `collectAction` / `recordPaymentAction`). Renvoie le jeton d'annulation de T4b (état d'avant, paiement créé) |
| payments | `collectAllAction` | T7 ×n (A-5) | « Tout encaisser » d'un client : un T7 par document, du plus ancien au plus récent, en une transaction. Renvoie **un** jeton de T4b pour tous ses documents |
| payments | `voidPaymentAction` | T8 | Annuler un paiement (contre-passation datée comme l'original). Annuler un remboursement : la contre-passation positive est portée par un paiement d'entrée (DEPOSIT ou BALANCE, 03 §4.4). Ne change jamais le statut |
| payments | `correctPaymentAction` | T8 | Corriger montant, date, poche, moyen ou note |
| payments | `refundAction` | T8 | Rembourser (sortie datée du jour) |
| batches | `createBatchAction`, `updateBatchAction`, `setBatchStatusAction`, `deleteBatchAction` | — | Créer, renommer / date prévue / notes, clôturer / rouvrir, supprimer un lot vide |
| batches | `addBatchExpenseAction` | T9 | Ajouter une dépense (datable) |
| batches | `deleteBatchExpenseAction` | T10 | Supprimer une dépense (contre-passation) |
| treasury | `createPocketAction`, `updatePocketAction` | — | Créer, renommer, réordonner |
| treasury | `archivePocketAction` | T15 | Archiver (solde nul) |
| treasury | `deletePocketAction` | — | Supprimer une poche non système **sans aucun mouvement** (poche créée par erreur ; son solde d'ouverture sort de la Trésorerie, la confirmation le dit ; `Setting.defaultPocketId` repasse à NULL). Avec un mouvement : `CONFLICT` « Cette poche a un historique : archive-la une fois son solde à 0. » (règle de 03 §4.4 ; message de §9.3) |
| treasury | `transferAction` | T11 | Transfert, « Répartir le non attribué » |
| treasury | `adjustAction`, `recordSupplierPaymentAction` | — | Ajustement signé, paiement fournisseur |
| treasury | `reverseMovementAction` | T12 | Annuler un mouvement manuel (les deux jambes d'un transfert) |
| catalogue | `createPerfumeAction`, `updatePerfumeAction` | — | Fiche parfum **et** grille tarifaire en un enregistrement (A-6) : l'entrée porte `pricing`, la grille cible **complète** sur les contenances réelles 10 / 50 / 80 ml (`VOLUMES_ML` de `src/domain/sale-line.ts` ; défaut de saisie 80 ml). Un volume absent est retiré ; un coût ou un taux vidé est effacé (saisie explicite — l'apprentissage N8, lui, garde l'ancienne valeur) ; un prix vide ou à 0 est refusé (`VALIDATION` « Indique le prix du 80 ml, ou retire ce volume. ») ; un coût sans taux est accepté (le taux par défaut sera proposé à la vente). La marque est `{ kind: "existing", brandId } \| { kind: "new", name }`, résolue dans la même transaction. `updatePerfumeInput` n'a ni `stock` (une clé `stock` reçue est ignorée, §11) ni visibilité : la visibilité ne peut que **baisser** (visuel retiré, marque masquée), avec une notice, et la mise en avant est perdue avec elle |
| catalogue | `deletePerfumeAction` | — | Supprimer un parfum ; visuels et planches story retirés du bucket après le commit (§12 « Suppression ») |
| catalogue | `setPerfumeStatusAction`, `setPerfumeFeaturedAction` | — | Visibilité (1 tap), mise en avant (≤ 2, `PUBLISHED`) |
| catalogue | `setPerfumeStockAction` | — | Réglage absolu du stock (geste dédié, `null` = non suivi) |
| catalogue | `createBrandAction`, `updateBrandAction`, `deleteBrandAction` | — (T14 pour `updateBrandAction`) | Marque (dédoublonnage : l'existante est rendue avec la `notice` « Louis Vuitton existe déjà au catalogue : elle a été sélectionnée. »). `updateBrandAction` rend `{ brand, hiddenPerfumes, republishable }` et porte la cascade T14 quand l'enregistrement masque la marque ou la passe en gamme complète |
| catalogue | `setBrandVisibilityAction` | T14 | Masquer / gamme complète, cascade `DRAFT` ; rend `{ brand, hiddenPerfumes, republishable }` (`republishable` : parfums masqués qui ont un visuel, pour proposer « Republier ») |
| catalogue | `republishBrandPerfumesAction` | — | « Republier les N parfums qui ont un visuel » (E15, E17) : repasse `PUBLISHED` les parfums masqués de la marque qui ont un visuel, si la marque peut les montrer |
| catalogue | `createImageUploadUrlAction` | — | URL signée d'upload direct navigateur → Supabase ; entrée `{ usage: "parfum" \| "logo" \| "story", perfumeId?, extension }` — le serveur fabrique le chemin (§12 « Images » ; le nom de fichier du client est jeté, seule l'extension survit : jpg, jpeg, png, webp, gif, heic, heif, avif) et le rend avec l'URL signée et l'URL publique |
| catalogue | `addPerfumeMediaAction` | — | Ranger un visuel story déposé sur la fiche parfum : chemin **vérifié strictement** (exactement `stories/<perfumeId>/<horodatage ms>-<8 hexa>.<ext>`, forme délivrée par le serveur), URL **recalculée** depuis le chemin, poids ≤ 12 Mo, dimensions entières de 1 à 20 000, rang calculé (jamais reçu), 24 visuels au plus (`CONFLICT` « Maximum 24 visuels par parfum. Supprime-en un avant d'en ajouter. ») ; renvoyer le même chemin rend le visuel déjà rangé, sans rien écrire |
| catalogue | `setPerfumeMediaLabelAction` | — | Libellé libre d'un visuel story (« Story 9:16 », « Fond clair » ; 80 caractères, vidé = effacé) |
| catalogue | `reorderPerfumeMediaAction` | — | Réordonner la galerie (identifiants inconnus ignorés), une transaction |
| catalogue | `removePerfumeMediaAction` | — | Retirer un visuel : DELETE de la ligne, puis suppression de l'objet désigné par son URL **après** le commit, seulement s'il est dans notre bucket (§12) ; déjà retiré : succès sans écriture |
| customers | `createCustomerAction`, `updateCustomerAction`, `deleteCustomerAction` | — | Fiche client (suppression refusée, avec sa raison, si un document `PENDING` ou `CONFIRMED` est lié — règle unique de 03 §4.4 ; documents livrés ou annulés conservés sous le nom) |
| settings | `updateSettingsAction` | — | Taux DZD par défaut, poche par défaut |
| auth | `loginAction` (publique), `logoutAction` | — | Connexion, déconnexion |

*Mise en œuvre J5 (documents, clients, lots — sans paiement).* Précisions tranchées en construisant, éprouvées par `tests/db/transactions/t01…t13`, `stock.test.ts` et `customers.test.ts` :

- **Où vit le corps d'une transaction.** Chaque fonction exportée de `documents/writer.ts` (`createDocument`, `updateDocument`, `setLineDelivered`, `changeDocumentStatus`, `deleteDocument`, `assignDocumentsToBatch`) est le corps complet de sa transaction : verrous, lectures, gardes et réserves, puis écritures ; elle compose elle-même `customers/writer`, `catalogue/stock` et `catalogue/writer`. L'action ne fait qu'ouvrir `inTransaction` autour ; J6 a suivi la même règle pour l'argent (ci-dessous) : l'exemple du §4.4, qui compose dans l'action, illustre la composition, pas l'emplacement réel du code. `createDocument(tx, input, { pockets })` prend les verrous de poche des paiements de création dans le même appel que le lot, pour tenir l'ordre canonique.
- **Contrats.** `src/contracts/fields.ts` porte les champs communs (`entityId`, `optionalText`, `optionalDate`, `confirmFlag`) ; dans une modification, un champ absent n'est pas touché, un champ vidé (`null` ou « ») est effacé. Client d'un document : `{ kind: "passing", name, contact }` · `{ kind: "linked", customerId }` · `{ kind: "new", customer }` (fiche créée dans la transaction). Un nom est exigé pour une commande, et pour une vente dont il reste à encaisser **après les paiements de création** (règle serveur de 06 E11 zone 4).
- **Lignes.** Montants saisis au clavier normalisés par le contrat ; ligne offerte à prix non nul, ligne non offerte sans prix, coût sans taux : `VALIDATION` sous le champ. La contenance (10, 50 ou 80 ml) est exigée, jamais posée par défaut côté serveur. En T2, **chaque ligne porte son identifiant**, généré par le formulaire pour une ligne ajoutée : connue, elle est mise à jour en place ; inconnue, elle est créée sous cet id ; un renvoi du même état ne duplique rien (§3.6). Le parfum d'une ligne existante peut changer (stock : −livré sur l'ancien, +livré sur le nouveau) ; une ligne ne passe jamais du catalogue au hors-catalogue ni l'inverse (`isOffCatalog` fixé à la saisie, 03 §3). Coût en euros : recalculé par `dzdToEur` seulement si le coût DZD ou le taux change — un coût en euros repris sans coût en dinars survit à l'édition.
- **Livré en T2.** Ligne ajoutée : 0, sauf dans un document `DELIVERED` où elle naît livrée ; ligne entièrement livrée d'un document `DELIVERED` : elle le reste à sa nouvelle quantité ; sinon le livré est conservé, borné à la quantité avec la réserve « Sauvage 50 ml — 2 déjà livrés : le livré passera à 1. ». Réserves de ligne et de stock réunies en un dialogue « Enregistrer les modifications ? ».
- **T3** refusé (`CONFLICT`) sur une vente directe (livrée en entier, sans pointage) et sur un document annulé ; même valeur renvoyée : aucune écriture. **T4** : même statut, succès sans écriture ; « Annuler » n'est pas un statut cible (T5). **T6** et suppressions de fiche client ou de lot : une entité déjà absente est un **succès** `{ deleted: false }` (renvoi après coupure).
- **T13** reçoit des changements `{ documentId, from, to }` (`null` = sans lot) : rattacher, retirer, déplacer, unitaire ou en masse. Le lot doit être ouvert **des deux côtés** (un document ne sort pas non plus d'un lot clos, 06 S01) ; un document dont le lot courant n'est pas `from` est refusé (`CONFLICT`), jamais déplacé en silence (01 §4.4) ; déjà à `to` : sans effet ; tout ou rien.
- **Mémoire de prix (N8).** Apprend des lignes non offertes créées ou dont le parfum, la contenance, le prix, le coût ou le taux change ; un coût ou un taux absent de la ligne n'efface pas celui qui est mémorisé.
- **Idempotence élargie** : `createCustomerAction` et `createBatchAction` acceptent un `id` facultatif (création en ligne S10, S11).
- **Clients.** Conflit de numéro nommé à la création comme à la modification ; suppression : fiche verrouillée `FOR UPDATE`, refus « Impossible : 2 commandes en cours. Livre-les ou annule-les d'abord. », puis `documents/writer.freezeCustomerName` recopie le **dernier** nom de la fiche dans le snapshot des documents liés avant le `SetNull` (06 E14 : ils « restent affichés sous son nom »).
- **Lots.** Clôturer et supprimer prennent le lot `FOR UPDATE` (un rattachement en `FOR SHARE` attend) ; refus de suppression chiffré : « Impossible : 12 documents et 3 dépenses rattachés. Clôture-le plutôt. », ou « Impossible : ce lot a un historique de dépenses. Clôture-le plutôt. » si toutes ont été supprimées.

*Mise en œuvre J6 (argent, `2e9ac88`).* Précisions tranchées en construisant, éprouvées par `tests/db/transactions/t01-create-document-with-payments`, `t04b`, `t05`, `t07`…`t12`, `t15`, `pockets-and-settings`, `composed-actions.test.ts` et `concurrency.test.ts` :

- **Où vit le corps.** T7 (`recordPayment`), `collectAll` et `deliverAndCollect` (A-5), T4b et T5 vivent dans `documents/writer.ts` : ils écrivent `SaleDocument` (confirmation automatique, statut, horodatages). `payments/writer.ts` n'écrit que `Payment` : il fournit les pièces (`insertPayment`, `reversePayment`) et porte le corps de T8 (annuler, corriger, rembourser), qui n'écrit aucun document ; il n'importe jamais `documents/writer` (pas de cycle). Les actions `recordPaymentAction` et `collectAllAction` restent dans `payments/actions.ts` et ouvrent la transaction du writer `documents`.
- **Jeton de T4b.** Signé HMAC-SHA256 avec `ADMIN_JWT_SECRET` (l'écran le renvoie sans pouvoir fabriquer l'état qu'il rétablit) ; il porte le type de geste, `issuedAt`, et pour chaque document l'état d'avant (statut, horodatages, livré par ligne), l'empreinte de l'état d'après (statut, horodatages, `updatedAt`, lignes, identifiants des paiements) et les paiements créés. Tout T4 rend un jeton (réactivation comprise), tout T7, `deliverAndCollectAction` et `collectAllAction` (un jeton pour tous ses documents, annulés ensemble en une transaction) ; un geste **renvoyé** (même identifiant) rend `undo: null`. Refus `CONFLICT` si le document a changé depuis le geste (« Ce document a changé depuis ce geste : rien n'a été annulé. Corrige-le depuis sa fiche. ») ou au-delà de 10 minutes (« Trop tard pour annuler ce geste : corrige-le depuis la fiche du document. »). L'exception « payé net nul » de 03 §4.3 (une commande confirmée par un paiement ne revient « En attente » que si son payé net est nul après contre-passation ; sinon notice « La commande reste confirmée : 120,00 € à encaisser. ») ne vaut que pour un encaissement et « Tout encaisser ». Le « Annuler » du toast après un solde ou « Tout encaisser » passe donc par `revertDocumentChangeAction`, jamais par `voidPaymentAction`.
- **Actions composées (A-5).** `deliverAndCollectAction` enregistre un **solde** (BALANCE) sans confirmation automatique intermédiaire : la transition part du statut réel, avec ses propres réserves, calculées avec le payé **après** l'encaissement ; toutes les gardes (plafond au dû, transition, stock) passent avant la première écriture. `collectAllAction` verrouille tous les documents d'un appel, les ordonne par `confirmedAt` (à défaut `orderedAt`), puis `orderedAt`, puis id, applique une date de valeur unique, mémorise la poche une fois, et vérifie tous les plafonds avant d'écrire : un plafond dépassé sur le dernier document n'écrit rien.
- **Création avec paiements (T1, N1).** Σ des paiements > total ⇒ `VALIDATION` sous `payments` : « Le montant reçu dépasse le total (120,00 €). » (contrat et writer) ; plusieurs paiements : la poche du **premier** est mémorisée (N2).
- **Renvois.** Supprimer une dépense déjà supprimée (T10) : succès `{ deleted: false }`. Annuler (T8) un paiement ou un mouvement manuel (T12) déjà contre-passé : `CONFLICT` « Ce mouvement a déjà été annulé. » ; une contre-passation ne se contre-passe pas (03 §4.4).

*Mise en œuvre J11 côté serveur (catalogue, `95fdc3c`).* Éprouvée par `tests/db/catalogue.test.ts`, `catalogue-media.test.ts` et `catalogue-vitrine.test.ts` :

- **Marque d'une fiche.** `{ kind: "existing", brandId }` (choisie dans S05) ou `{ kind: "new", name }` (saisie) : la marque est résolue **dans la transaction de la fiche** par `resoudMarque` ; une marque équivalente déjà au catalogue est rattachée, avec la notice « Rattaché à Louis Vuitton, déjà au catalogue. ». Rien n'est créé avant « Ajouter au catalogue » ou « Enregistrer » : abandonner E19 ne laisse aucune marque orpheline.
- **Textes serveur** (06 E17, E19, S18). Parfum enregistré masqué faute de pouvoir être visible : « Sauvage ajouté, masqué : ajoute un visuel pour publier ce parfum. » ; modification qui lui fait perdre la visibilité : « Sauvage masqué : rends d'abord la marque Dior visible. » (raison : le message du domaine, `src/domain/publication.ts`) ; doublon de nom dans la marque, au sens de `cleNom` (autre graphie comprise) : `CONFLICT` « Dior a déjà un parfum nommé Sauvage. » ; renommer une marque vers le nom d'une autre : `CONFLICT` « La marque Louis Vuitton porte déjà ce nom : ouvre-la plutôt que d'en renommer une autre. » ; une gamme complète visible sans logo : `CONFLICT` « Ajoute un logo pour publier une gamme complète. » — jamais masquée en silence.
- **Réserve de T14.** Titre « Masquer Dior ? » ou « Passer Dior en gamme complète ? » (« Masquer les parfums de Dior ? » si la marque était déjà masquée ou en gamme complète) ; réserve « Ses 14 parfums seront masqués sur la vitrine. », où le nombre compte les parfums **visibles** (« Son parfum visible sera masqué sur la vitrine. » pour un seul) ; levée avant toute écriture. Sans parfum visible, pas de réserve.
- **« Dupliquer » (E16)** n'est pas une action : E19 lit `perfumeDuplicationDraft(id)` (marque et grille) et pré-remplit le formulaire, comme A-9 ; rien n'est écrit avant « Ajouter au catalogue ».

### 3.5 Le sort des routes REST

**Décision : toutes les routes `app/api/admin/*` existantes sont supprimées**, sauf `search` (refaite). Les seules routes HTTP de la gestion forment une **liste fermée de cinq GET**, vérifiée par le test `route-handlers` (tout `route.ts` hors liste fait échouer la CI) :

| Route | Rôle | Pourquoi une route et pas une action ni un RSC |
|---|---|---|
| `GET /api/admin/search?q=&scope=all\|customers\|perfumes\|documents` | Recherche à la frappe : palette de commandes, `SelectSheet` client et parfum | Une action est un POST mis en file d'attente côté client (une recherche lente retarderait la frappe suivante et toute écriture), non annulable par `AbortController`, non cachable. Une frappe débouncée annulable est un GET. |
| `GET /api/admin/picker?v=<version>` | Parfums (nom, marque, vignette, statut, stock) + grille tarifaire par volume, pour le sélecteur de ligne (Vendre, commande, édition) | Charge utile de quelques dizaines de Ko à ne pas renvoyer à chaque navigation : l'URL porte la version du catalogue (fournie par le RSC de la page), la réponse est donc cachable par le navigateur (`Cache-Control: private, max-age=31536000, immutable` quand `v` est courante, `no-store` sinon). Remplace aussi les N appels unitaires de pré-remplissage tarifaire et le cache module jamais invalidé du picker (01 §4.2). |
| `GET /api/admin/export/compta?du=AAAA-MM-JJ&au=AAAA-MM-JJ` | Fichier CSV (BOM, `;`, colonnes au vocabulaire canonique, même périmètre que l'écran) | Un téléchargement est une réponse HTTP avec `Content-Disposition`. |
| `GET /api/pwa/admin` | Manifeste PWA (public) | Conservé tel quel (01 §3.7) ; raccourcis mis à jour vers les nouvelles routes. |
| `GET /admin-sw.js` | Service worker (public) | Version injectée par déploiement (§14.3). |

Les trois routes `/api/admin/*` passent par `defineReadRoute` : session exigée, n'exporte que `GET`, corps JSON au format `ActionResult` (401 + `SESSION_EXPIRED` sans session), `Cache-Control: private` explicite, jamais d'import d'un writer.

*Mise en œuvre J11.* `GET /api/admin/picker?v=` est livrée avec le serveur du catalogue (J11), avant les écrans qui la consomment : contenu `pickerCatalogue()` et version `pickerVersion()` de `src/server/catalogue/queries.ts`, DTO `PickerCatalogue` / `PickerPerfume` dans `src/contracts/catalogue.ts` (il n'y a pas de `picker.ts`). La version est l'**empreinte sha256** du contenu (16 premiers caractères hexadécimaux), calculée avec lui et cachée sous le tag `admin-catalogue` : elle change si et seulement si ce que le sélecteur affiche change. « Vendus récemment » (N7) ne fait pas partie de cette charge utile : c'est une requête de `src/server/documents/queries.ts`. `GET /api/admin/search` et `src/server/search/queries.ts` relèvent de J8.

Correspondance avec l'existant :

| Route existante | Remplacée par |
|---|---|
| `orders` (GET avec purge, POST), `orders/[id]` (GET avec purge, PATCH, DELETE), `orders/[id]/balance`, `/payments`, `/fulfillment` | RSC `documents/queries` ; actions `documents` et `payments` |
| `sales` (POST), `sales/[id]` (PATCH, DELETE), `sales/stats` | Actions `documents` et `payments` ; RSC `stats/queries` |
| `compta` (GET de rafraîchissement) | RSC rafraîchi automatiquement après action |
| `compta/export` | `GET /api/admin/export/compta` |
| `batches`, `batches/[id]`, `/assign`, `/assign-orders`, `/candidates`, `/order-candidates`, `/expenses`, `/expenses/[expenseId]` | Actions `batches`, `assignDocumentsToBatchAction` ; candidats par RSC sous `?assigner=1` |
| `customers`, `customers/[id]`, `customers/search` | Actions `customers` ; RSC ; `GET /api/admin/search?scope=customers` |
| `perfumes`, `perfumes/[id]` (GET, PUT, PATCH, DELETE), `perfumes/[id]/pricing` | Actions `catalogue` ; RSC ; tarifs dans `GET /api/admin/picker` |
| `perfumes/[id]/media` (GET, POST dépôt ou réordonnancement), `perfumes/[id]/media/[mediaId]` (DELETE) — ajoutées en production le 10/09/2026 | RSC de la fiche parfum (galerie) ; `addPerfumeMediaAction`, `reorderPerfumeMediaAction`, `removePerfumeMediaAction` |
| `brands`, `brands/[id]` | Actions `catalogue` |
| `catalogue` (dont `mode=picker`) | RSC `catalogue/queries` ; `GET /api/admin/picker` |
| `treasury/pockets` | RSC (poches passées en props aux formulaires) |
| `storage/sign` (dont `scope: "story"` + `perfumeId`, 10/09/2026) | `createImageUploadUrlAction` (`usage`) |
| `login`, `logout` | `loginAction`, `logoutAction` |
| `session` | Supprimée (plus de rôle à relire côté client) |
| `health` + `ADMIN_DASHBOARD_SECRET` | Supprimées (02 §4.7) |

### 3.6 Idempotence et double tap

Les créations sensibles au double envoi — **document, paiement, dépense** — reçoivent leur identifiant du client (03 §3, notes du schéma) :

1. Le formulaire génère `id = newId()` (`crypto.randomUUID()`, `src/domain/ids.ts`) à son ouverture et le garde jusqu'au succès (y compris à travers un rechargement, via le brouillon local, §3.7).
2. Le writer commence par chercher l'id : s'il existe, il renvoie le résultat existant sans rien écrire (rejeu).
3. Si deux envois se croisent, le second bloque sur l'index de clé primaire puis échoue en `P2002` sur `id` : `inTransaction` rejoue une fois, l'étape 2 trouve la ligne, le second envoi est un succès.

Conséquence produit : **« Réessayer » est toujours sûr**, y compris après une coupure réseau dont on ignore si l'écriture a abouti. C'est ce qui rend acceptable l'absence de file d'écriture hors ligne (§14.5).

Les autres gestes sont idempotents par nature : valeurs absolues (`setLineDeliveredAction` envoie la quantité cible, pas « +1 »), transitions vers un statut cible, contre-passations protégées par l'unicité de `reversesId`.

*Mise en œuvre J6.* Les contrats distinguent deux formes d'identifiant. Une **nouvelle création** reçoit un `entityId` (UUID du formulaire) : document, paiement (y compris le remboursement de T5, le nouveau paiement d'une correction), dépense, et, facultatifs, poche (`createPocketAction`), transfert (l'`id` est celui de la jambe sortante **et** du groupe de transfert : un renvoi rend le transfert déjà écrit), ajustement et paiement fournisseur. Une **ligne existante** désignée par l'écran (paiement, mouvement, dépense, poche) est lue par `recordId` (`src/contracts/treasury.ts`) : cuid, UUID, identifiant déterministe de la reprise `mig-…` (03 §7), ou `poche-non-attribue` (§7.4) — `entityId` refuserait les pièces reprises, qu'on ne pourrait plus annuler.

### 3.7 Côté client

`src/app-shell/hooks/useAction.ts` est le **seul** moyen d'appeler une action depuis un composant :

```ts
const { run, pending } = useAction(recordPaymentAction, {
  success: (d) => `${formatEur(eurFromWire(d.amount))} encaissés`,
});
await run({ id: paymentId, documentId, amount, pocketId });
```

Il gère, une fois pour toutes :

| Situation | Comportement |
|---|---|
| `pending` | Bouton `isLoading`, second tap inhibé |
| `ok` | Toast de succès (+ `notice` éventuelle), pulse de confirmation (05 §4.4), brouillon effacé |
| `NEEDS_CONFIRMATION` | Ouvre `ConfirmDialog` avec les réserves renvoyées ; sur « Confirmer », rappelle l'action avec `confirm: true` **et le même id** |
| `VALIDATION` | Rend `error.fields` au formulaire (messages sous les champs), aucun toast |
| `SESSION_EXPIRED` | Sauve le brouillon, redirige vers `/admin/login?retour=<page>` |
| Échec réseau (exception `fetch`) | Transforme en `OFFLINE` : toast « Pas de réseau. Ta saisie est gardée — réessaie. » avec « Réessayer » |
| Autres codes | Toast d'erreur avec le message serveur (jamais un générique quand le serveur a dit pourquoi) |

Règles d'état client :

- **Les données serveur arrivent en props et ne sont jamais recopiées dans `useState`** (anti-pattern `OrderDetailClient`, 01 §4.1). L'affichage immédiat d'une écriture rapide passe par `useOptimistic` au-dessus des props ; la vérité revient avec le RSC rafraîchi.
- Pré-contrôle : le client évalue les réserves avec les mêmes fonctions pures (`src/domain/document-status.ts`, `stock.ts`, `document-balance.ts`) pour ouvrir la confirmation **avant** l'aller-retour ; le serveur recontrôle toujours.
- **Coalescence** (`useCoalescedAction`) : le stepper de livraison envoie la valeur finale 400 ms après le dernier tap, pas une requête par tap (les actions Next s'exécutent en file).
- **Brouillons** (`useDraft(key)`) : les formulaires Vendre, commande (création et modification) et dépense de lot sont sauvegardés en `localStorage` à chaque changement (id compris), restaurés à l'ouverture, effacés au succès, expirés après 24 h. iOS tue les PWA en arrière-plan : une vente interrompue ne se perd pas.
- **État d'URL** (`useUrlState`) : seul importeur autorisé de `useSearchParams` (ESLint) ; le composant qui l'utilise est sous `<Suspense>` dans sa page — vérifié par la détection d'hydratation de `npm run test:layout`.

---

## 4. Transactions : le helper unique

### 4.1 `inTransaction`

**Décision : toute écriture, d'une ligne ou de quinze, passe par `inTransaction`.** Aucune autre fonction du code applicatif n'appelle `$transaction`. En particulier, une pièce comptable (paiement, dépense) et son mouvement de Trésorerie sont **toujours** écrits dans la même transaction, par composition de writers : compta et Trésorerie ne peuvent plus diverger (01 §2.2 n°4, 02 §4.3). Pourquoi aussi pour une seule ligne : l'horloge de l'écriture, la traduction des erreurs, l'idempotence et l'enregistrement des modèles écrits s'y rattachent ; et une écriture « simple » aujourd'hui (créer un client) devient composée demain (créer un client en ligne pendant une vente). Le surcoût (BEGIN/COMMIT) est négligeable avec des fonctions dans la même région que la base (§15).

```ts
// src/server/db/transaction.ts
import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { createLocks, type Locks } from "@/server/db/locks";
import { isRetryable, isIdempotentReplayConflict } from "@/server/core/errors";

export type Tx = {
  /** Seul accès base d'un writer. */
  readonly db: DbTransaction;   // client transactionnel du client ÉTENDU (§10.2), pas Prisma.TransactionClient (J3)
  /** Horloge unique de la transaction (horodatages, dates de valeur par défaut). */
  readonly now: Date;
  /** Verrous en ordre canonique (§4.2). */
  readonly lock: Locks;
};

const OPTIONS = { maxWait: 5_000, timeout: 15_000, isolationLevel: "ReadCommitted" } as const;

export async function inTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  assertNotNested();                                   // un writer reçoit `tx`, il n'en ouvre pas
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.$transaction(
        (client) => work({ db: client, now: new Date(), lock: createLocks(client) }),
        OPTIONS,
      );
    } catch (e) {
      const replay = isIdempotentReplayConflict(e);   // P2002 sur la clé primaire d'une création idempotente
      if (attempt <= 2 && (isRetryable(e) || (replay && attempt === 1))) {
        await sleep(40 * attempt + Math.random() * 40);
        continue;                                      // tout a été annulé : rejouer est sûr
      }
      throw e;
    }
  }
}
```

- **Rejouables** : conflit d'écriture ou interblocage (`P2034`, SQLSTATE `40001`, `40P01`) — deux tentatives supplémentaires au plus.
- **Rejeu d'idempotence** : une seule nouvelle tentative, qui trouvera la ligne (§3.6).
- **Jamais rejouées** : erreurs de validation, contraintes, `NeedsConfirmation`, erreurs de programmation.
- Les triggers différés de 03 §4.10 s'exécutent au `COMMIT` : un writer fautif (paiement sans mouvement, contre-passation incohérente) fait échouer la transaction entière — rien n'est écrit.
- Rien de ce qui suit le `COMMIT` ne peut faire échouer l'action : les effets de bord externes (suppression d'images Supabase) sont en `try/catch` journalisé, après la transaction.
- *Mise en œuvre J3.* L'imbrication est détectée par un `AsyncLocalStorage` propre à `transaction.ts` (erreur de programmation). Budgets indépendants : deux rejeux pour conflit ou interblocage, un rejeu d'idempotence. Le rejeu d'idempotence vaut pour tout `P2002` portant sur la seule colonne `id` (ailleurs qu'aux trois créations idempotentes, l'id vient de `cuid()` et ne se croise jamais). Éprouvé par `tests/db/transactions.test.ts` : deux envois croisés du même id ⇒ une ligne, deux succès, trois tentatives ; interblocage provoqué ⇒ les deux transactions aboutissent.

### 4.2 Verrous et ordre canonique

03 §4.3 impose l'ordre document → poche(s) → parfum(s), par id croissant. Le lot (verrou partagé de T13) s'intercale après les documents. `src/server/db/locks.ts` rend cet ordre **impossible à violer** :

```ts
await tx.lock({
  documents: [documentId],                 // FOR UPDATE
  batches: { share: [batchId] },           // FOR SHARE
  pockets: { update: [unassignedId], share: [pocketId] },
  perfumes: [12, 7],                       // FOR UPDATE — triés
});
```

| Rang | Catégorie | SQL |
|---|---|---|
| 1 | `documents` | `SELECT id FROM "SaleDocument" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE` |
| 2 | `batches` | `… FROM "Batch" … ORDER BY id FOR SHARE` (ou `FOR UPDATE` à la suppression) |
| 3 | `pockets` | `… FROM "Pocket" … ORDER BY id FOR UPDATE` puis `FOR SHARE` sur les autres |
| 4 | `perfumes` | `SELECT id, stock FROM "Perfume" WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE` |

- Un même appel acquiert dans l'ordre des rangs et trie les ids. Un appel ultérieur est permis **seulement pour un rang ≥ au dernier acquis** (lire les lignes du document verrouillé, puis verrouiller leurs parfums) ; sinon `LockOrderError` — erreur de programmation, remontée en `UNEXPECTED` et attrapée par les tests.
- **Tout mouvement verrouille sa poche** (`insertMovement` vérifie que le verrou est détenu, sinon erreur de programmation) : **au moins en partage pour une entrée**, **exclusivement pour toute sortie**, quelle que soit la poche — un mouvement ne peut pas entrer dans une poche en cours d'archivage (T15 prend `FOR UPDATE`), et deux sorties concurrentes lisent le solde l'une après l'autre.
- Sorties, donc verrou exclusif : **T5** (remboursements à l'annulation), T8 (y compris composé dans T4b), T9 (dépense), T11 (source), T12 et toute autre contre-passation qui retire de l'argent, ajustement « Retirer », paiement fournisseur. Le contrôle « Non attribué ≥ 0 » se fait sur la ligne verrouillée (règle de 03 §4.9). `deliverAndCollectAction`, `collectAllAction`, T7 et T1 n'écrivent que des entrées : verrou partagé.
- Un document **neuf** (T1) ne se verrouille pas : aucune autre transaction ne le voit.
- *Mise en œuvre J3.* `tx.lock(…)` rend les lignes réellement verrouillées (`{ documents, batches, pockets, perfumes: { id, stock }[] }` : un id absent n'y figure pas, le stock relu sert `applyDeliveredDeltas`) ; `batches` accepte `{ update, share }` comme `pockets` ; un id demandé dans les deux modes est pris `FOR UPDATE` ; `tx.lock.held(catégorie, id)` rend le mode détenu (`insertMovement` s'en sert depuis J6 pour exiger le verrou de poche du bon mode). Un appel sans rien à verrouiller ne change pas le rang atteint.
- *Mise en œuvre J11 — verrous du catalogue.* Ils se prennent **avant** les lignes `Perfume` (rang 4) : ligne `Brand` **en partage** pour publier ou rattacher un parfum (un parfum ne peut pas être publié pendant que sa marque se masque), ligne `Brand` **exclusive** pour modifier, masquer (T14) ou supprimer la marque ; mise en avant sérialisée par le verrou consultatif `pg_advisory_xact_lock(hashtext('nurea:catalogue:featured'))`, sous lequel le décompte des emplacements est relu (quatre demandes simultanées : deux réussissent). Ces verrous sont écrits en SQL dans `src/server/catalogue/writer.ts` (ids triés, `FOR SHARE` / `FOR UPDATE`) et pourront rejoindre `locks.ts` comme catégorie.

### 4.3 Propriété des tables

Transposition exacte de 03 §4.2 (« une table n'a qu'un point d'INSERT/UPDATE dans le code »). Le test `table-ownership` cherche toute écriture Prisma (`.<modèle>.create|createMany|update|updateMany|upsert|delete|deleteMany`) et l'autorise uniquement dans le fichier propriétaire ; `$executeRaw` est interdit hors `prisma/` et `scripts/`.

| Modèle | Seul(s) fichier(s) d'écriture | Appelé par |
|---|---|---|
| `SaleDocument`, `SaleLine` | `src/server/documents/writer.ts` | actions `documents` |
| `Payment` | `src/server/payments/writer.ts` | T8 (son propre corps) ; writer `documents` (T1, T4b, T5, T7, A-5) |
| `CashMovement` | `src/server/treasury/movements.ts` (`insertMovement`, `insertReversal`, `setMovementLabel`) | writers `payments`, `batches`, `treasury` |
| `Pocket` | `src/server/treasury/writer.ts` | actions `treasury` |
| `Batch`, `BatchExpense` | `src/server/batches/writer.ts` | actions `batches` |
| `Brand`, `Perfume` (hors `stock`), `PerfumePricing` | `src/server/catalogue/writer.ts` (`savePricingGrid` pour la fiche, `upsertPricing` pour l'apprentissage) | actions `catalogue` ; writer `documents` pour l'apprentissage des tarifs (N8) |
| `Perfume.stock` | `src/server/catalogue/stock.ts` (`setStock`, `applyDeliveredDeltas`) | `setPerfumeStockAction` ; writer `documents` (T1–T6, T4b) |
| `PerfumeMedia` (visuels story) ; objets du bucket (visuels, logos, planches story) | `src/server/catalogue/media.ts` (lignes) ; `src/server/catalogue/storage.ts` (objets, après commit, seulement dans notre bucket) | `addPerfumeMediaAction`, `setPerfumeMediaLabelAction`, `reorderPerfumeMediaAction`, `removePerfumeMediaAction` ; `deletePerfumeAction` et `deleteBrandAction` (URL lues avant le DELETE, cascade en base, objets retirés après commit, §12) |
| `Customer` | `src/server/customers/writer.ts` | actions `customers` ; `createDocumentAction` (création en ligne) |
| `Setting` | `src/server/settings/writer.ts` (`updateSettings`, `rememberPocket`, `forgetPocket`) | `updateSettingsAction` ; writers `documents` (T1, T7, A-5) et `batches` (T9) pour la poche par défaut (N2) ; writer `treasury` (création « Proposer par défaut », archivage T15) |
| `AdminUser` | `src/server/auth/writer.ts` | `loginAction` ; `scripts/create-admin.ts` |

Un writer **décide et valide** (plafonds, statuts, lot ouvert, réserves) puis écrit ; un autre module qui a besoin d'écrire sa table **appelle sa fonction** en lui passant `tx`. C'est la composition qui rend T1 atomique sans dupliquer une règle.

### 4.4 Exemple composé : T1, une vente directe encaissée

```ts
// src/server/documents/actions.ts
"use server";
export const createDocumentAction = defineAction(
  "documents.create",
  createDocumentInput,                                   // src/contracts/documents.ts
  async (input) =>
    inTransaction(async (tx) => {
      const replay = await documentsWriter.findExisting(tx, input.id);
      if (replay) return replay;                         // double envoi : même réponse, rien d'écrit

      await tx.lock({
        batches: input.batchId ? { share: [input.batchId] } : undefined,
        pockets: { share: input.payments.map((p) => p.pocketId ?? UNASSIGNED) },
        perfumes: perfumeIdsOf(input.lines),
      });

      const customerId = input.newCustomer
        ? (await customersWriter.create(tx, input.newCustomer)).id
        : input.customerId;

      const doc = await documentsWriter.create(tx, { ...input, customerId });
      //   ↳ SaleDocument (origin, statut, confirmedAt/deliveredAt) + SaleLine ×n (snapshots, unitCostEur via money.dzdToEur)
      //   ↳ si né DELIVERED : catalogueStock.applyDeliveredDeltas(tx, deltas, { confirm: input.confirm })
      //   ↳ catalogueWriter.upsertPricing(tx, …) pour chaque ligne non offerte (N8)
      //   ↳ lot : refus CONFLICT si CLOSED

      for (const p of input.payments) {
        await paymentsWriter.record(tx, { ...p, documentId: doc.id, balance: doc.balance });
        //   ↳ nature fixée par le serveur (DEPOSIT si non livré, BALANCE sinon)
        //   ↳ plafond : Σ paiements ≤ total (money), sinon VALIDATION sous `payments`
        //   ↳ treasuryMovements.insertMovement(tx, { kind: "PAYMENT", … }) puis INSERT Payment
        //   ↳ settingsWriter.rememberPocket(tx, p.pocketId)
      }
      return { id: doc.id, origin: doc.origin, balance: doc.balanceWire };
      // L'URL est construite côté client par routes.document({ id, origin }) : une action n'importe pas app-shell.
    }),
);
```

*Mise en œuvre J5–J6.* L'exemple montre ce que la transaction compose ; dans le code, ce corps vit dans `documents/writer.createDocument` et l'action n'ouvre que `inTransaction` (§3.4). La pièce s'écrit par `paymentsWriter.insertPayment` (le mouvement par `treasury/movements.ts`) ; un dépassement du total est un `VALIDATION` sous `payments` (« Le montant reçu dépasse le total (120,00 €). »), vérifié par le contrat puis par le writer ; plusieurs paiements : la poche du premier est mémorisée.

### 4.5 Connexion à la base

- `DATABASE_URL` : pooler Supabase en mode transaction (port 6543, `pgbouncer=true`) — les transactions interactives Prisma y fonctionnent (la connexion est tenue le temps de la transaction). `DIRECT_URL` : connexion directe (5432), pour les migrations seulement.
- **Ne pas fixer `connection_limit=1`** : les blocs d'une page exécutent leurs requêtes en parallèle, une limite à 1 les sérialiserait. Valeur de départ 5 par instance, ajustée par la mesure du jalon performance (07).
- Client unique : `src/lib/db/prisma.ts` (client de base, partagé avec la vitrine, inchangé) ; `src/server/db/client.ts` exporte `db = prisma.$extends(…)` pour la gestion (§10.2). Même moteur, même pool.
- Aucune dépendance au fuseau de session PostgreSQL : toute borne temporelle passe par `nurea_period_start` / `nurea_period_end` (03 §5.1).

---

## 5. Le module monétaire unique

### 5.1 Décision

**`src/domain/money.ts` est le seul fichier qui importe une bibliothèque décimale, et cette bibliothèque est `decimal.js-light`.** `decimal.js` (moteur de `Prisma.Decimal`), `Prisma.Decimal` pour du calcul, `Number()`, `parseFloat` et `toFixed` sur un montant sont interdits partout ailleurs.

Justification. 03 §4.8 laissait le choix à ce document en suggérant `Prisma.Decimal`. Mais le client (aperçus de Vendre, rendu monnaie, plafonds) ne peut pas utiliser `Prisma.Decimal` proprement : une conversion à la frontière base est donc **inévitable dans tous les cas** — autant la faire à un seul endroit (`eurFromDb`) et choisir la bibliothèque la plus légère pour l'iPhone. `decimal.js-light` est déjà la bibliothèque des calculs sains de l'existant (01 §4.8), offre l'arrondi demi vers le haut et suffit à tous les besoins (addition, multiplication par une quantité, division pour la conversion et les pourcentages).

### 5.2 API

```ts
// src/domain/money.ts — seul importeur de decimal.js-light
// Types opaques : à l'exécution une instance Decimal, mais aucune de ses méthodes n'est accessible hors du module.
declare const opaque: unique symbol;
type Opaque<Name extends string> = { readonly [opaque]: Name };

export type Eur = Opaque<"Eur">;    // euros, 2 décimales, signé
export type Dzd = Opaque<"Dzd">;    // dinars, 2 décimales
export type Rate = Opaque<"Rate">;  // dinars pour 1 €, 4 décimales, > 0
export type MoneyString = string & { readonly __wire: "eur" };  // "1234.50" — point, 2 décimales, signe éventuel
export type RateString = string & { readonly __wire: "rate" };  // "277.0000"

// Saisie utilisateur (virgule ou point, espaces tolérés) ; null si invalide
export function parseEurInput(text: string, o?: { signed?: boolean }): Eur | null; // > 2 décimales ⇒ null
export function parseDzdInput(text: string): Dzd | null;
export function parseRateInput(text: string): Rate | null;                           // ≤ 4 décimales, > 0

// Frontières
export function eurFromDb(v: { toString(): string } | string): Eur;  // Prisma.Decimal, numeric::text
export function dzdFromDb(v: { toString(): string } | string): Dzd;
export function rateFromDb(v: { toString(): string } | string): Rate;
export function toDb(v: Eur | Dzd | Rate): string;                   // passé tel quel à Prisma
export function toWire(v: Eur): MoneyString;
export function eurFromWire(v: MoneyString): Eur;

// Arithmétique exacte
export const eur: {
  zero: Eur;
  add(a: Eur, b: Eur): Eur;  sub(a: Eur, b: Eur): Eur;  neg(a: Eur): Eur;
  times(a: Eur, quantity: number): Eur;       // quantité entière ≥ 0, sinon exception
  sum(values: readonly Eur[]): Eur;
  max(a: Eur, b: Eur): Eur;  min(a: Eur, b: Eur): Eur;  clampZero(a: Eur): Eur;
  compare(a: Eur, b: Eur): -1 | 0 | 1;  isZero(a: Eur): boolean;  isNegative(a: Eur): boolean;
};

// Règles métier
export function dzdToEur(cost: Dzd, rate: Rate): Eur;   // LA conversion : arrondi(cost ÷ rate, 2), demi vers le haut
export function halfForCash(v: Eur): Eur;               // « La moitié » arrondie à l'euro (au centime si l'euro donne 0)
export function percentOf(part: Eur, whole: Eur): string | null; // « 23,4 » ; null si whole = 0

// Affichage
export function formatEur(v: Eur, o?: { compact?: boolean; signed?: boolean }): string; // « 1 234,50 € »
export function formatDzd(v: Dzd): string;
export function spokenEur(v: Eur): string;              // « 1 234 euros 50 » (VoiceOver, 05 §6)
```

### 5.3 Règles

1. **Arrondi** : demi vers le haut (`ROUND_HALF_UP`), identique au `round(numeric, 2)` de PostgreSQL sur des valeurs positives. Précision interne 28 chiffres.
2. **Conversion DZD → EUR** : uniquement `dzdToEur`, uniquement à l'écriture d'une ligne ; le résultat est stocké dans `SaleLine.unitCostEur` et jamais recalculé (03 §4.8). Coût d'une ligne = `eur.times(unitCostEur, quantity)` — fin de l'écart d'un centime entre commande et vente (01 §4.9).
3. **Transport** : un montant qui quitte le serveur est une `MoneyString`. Les objets `Eur` ne sont pas sérialisables par React : une fuite vers un composant client échoue au rendu, ce qui force le passage par `toWire`.
4. **SQL** : les agrégats sont calculés en `numeric` par PostgreSQL (03 §5) et relus en `::text` puis `eurFromDb`. Aucun agrégat monétaire n'est refait en JavaScript sur des lignes chargées.
5. **Pas d'epsilon** : valeurs exactes à deux décimales, comparaisons exactes (fin du `0,005` littéral).
6. **Formatage** : `fr-FR`, espace fine insécable (U+202F) avant `€` et entre milliers, signe moins typographique ; le composant `Money` (05 §3.2) n'appelle que `formatEur` et `spokenEur`.
7. **Garde-fous** : ESLint `no-restricted-imports` (`decimal.js`, `decimal.js-light` hors `money.ts`) et `no-restricted-syntax` (`Prisma.Decimal` hors `src/server/db/**`) ; le test `money-imports` le revérifie.

### 5.4 Tests obligatoires (`src/domain/__tests__/money.test.ts`)

| Cas | Entrée | Attendu |
|---|---|---|
| Conversion courante | 30 000 DZD, taux 277 | 108,30 € |
| Demi vers le haut | 201 DZD, taux 200 (1,005) | 1,01 € |
| Taux à quatre décimales | 25 000 DZD, taux 245,5000 | 101,83 € |
| Coût de ligne | 108,30 € × 2 | 216,60 € |
| Somme exacte | 0,10 € + 0,20 € | 0,30 € (égalité stricte) |
| Saisie à virgule | « 12,5 » | 12,50 € |
| Saisie avec espaces | « 1 234,56 » | 1 234,56 € |
| Saisie refusée | « 12,345 », « abc », « », « -3 » (non signé) | `null` |
| Saisie signée | « -3,5 » avec `signed` | −3,50 € |
| La moitié | 75,00 € ; 74,00 € ; 0,90 € | 38,00 € ; 37,00 € ; 0,45 € |
| Pourcentage | 23,40 sur 100,00 ; x sur 0 | « 23,4 » ; `null` |
| Frontière base | `Prisma.Decimal("-12.3")` | −12,30 € |
| Formatage | 1 234,5 € | « 1 234,50 € » (U+202F) |
| Quantité invalide | `times(x, 1.5)` | exception |

---

## 6. Les chiffres : définitions implémentées une fois

### 6.1 Décision

**`src/server/chiffres/` est l'unique implémentation des chiffres de 02 §6**, par transcription du SQL de 03 §5. Aucun écran, aucune requête de domaine, aucun export ne recompose un chiffre : ils appellent ce module. Il est en lecture seule et n'importe aucun writer.

### 6.2 API

```ts
// src/server/chiffres/index.ts — chaque fonction est exportée via defineQuery ; signatures :
export type Period =
  | "all"
  | { unit: "day" | "week" | "month" | "year"; offset?: number }   // bornes calculées en SQL, Europe/Paris
  | { from: Date; to: Date };                                         // intervalle [from, to[

interface Chiffres {
  encaisse(scope?: { period?: Period; batchId?: string; customerId?: string }): Promise<MoneyString>;
  aEncaisser(scope?: { batchId?: string; customerId?: string }): Promise<MoneyString>;
  margeNette(scope?: { period?: Period; batchId?: string }): Promise<{
    value: MoneyString; percent: string | null;          // percent : Marge nette ÷ Encaissé du même périmètre
    costs: MoneyString; expenses: MoneyString;           // composantes, mêmes CTE
    hasUnknownCost: boolean;                             // « coût à compléter » (03 §3, SaleLine.unitCostEur NULL)
  }>;
  tresorerie(): Promise<{ total: MoneyString; unassigned: MoneyString; pockets: PocketBalanceDTO[] }>;
  enRetard(): Promise<{ count: number; documentIds: string[] }>;
  creancesAnciennes(): Promise<ReceivableDTO[]>;                     // 03 §5.8 : engagées, dû > 0, > 30 j
  documentBalance(ids: string[]): Promise<Record<string, DocumentBalanceDTO>>;

  // Variantes : MÊME fragment SQL, sans SUM ou avec GROUP BY — jamais une réécriture
  aEncaisserDetail(): Promise<ReceivableDTO[]>;                      // écran Encaisser (due > 0)
  aEncaisserParClient(): Promise<Record<string, MoneyString>>;        // badges de la liste clients
  chiffresParLot(): Promise<Record<string, BatchFiguresDTO>>;        // liste des lots
  encaisseParSemaine(weeks: number): Promise<WeeklyDTO[]>;           // graphe de la compta

  // Composite : un seul aller-retour pour l'Accueil
  tableauDeBord(): Promise<DashboardFiguresDTO>;
}
```

`src/server/chiffres/sql.ts` expose un fragment `Prisma.Sql` par définition (`encaisseSql`, `aEncaisserSql`, `coutsSql`, `depensesSql`, `margeNetteSql`, `tresorerieSql`, `enRetardSql`), chacun paramétré par période, lot, client et regroupement. **Ces fragments sont la seule copie du SQL de 03 §5 dans le code applicatif** (la migration de reprise en garde sa propre copie de l'*ancienne* définition pour la référence de 03 §7.2, ce qui est l'objet même de la comparaison).

### 6.3 Un aller-retour pour l'Accueil

`tableauDeBord()` exécute **une** requête qui assemble les fragments en CTE : Encaissé du mois, Marge nette du mois (valeur, pourcentage, coût inconnu), À encaisser (à date), Trésorerie totale et « Non attribué », nombre en retard, et les compteurs de l'Accueil (06 E01 : clients à relancer selon `creancesAnciennes`, documents au coût à compléter, commandes en attente et confirmées). **Pas d'Encaissé depuis toujours** : l'Accueil ne montre qu'un Encaissé, daté du mois (arbitrage n°13 de 06, amendement A-13 de 07) ; le total historique se lit dans la Compta, période « Tout ». Le test `chiffres-parity` vérifie que chaque champ du composite est égal à l'appel individuel correspondant, sur plusieurs jeux de données. Les blocs de l'Accueil (argent, alertes, pipeline) partagent ce résultat par `react.cache` : le premier bloc paie l'aller-retour, les autres le lisent en mémoire.

### 6.4 Le jumeau TypeScript et le test de parité

`src/domain/document-balance.ts` calcule **en mémoire** le total, le coût, le payé et le dû d'un document (aperçu du formulaire, plafond d'encaissement avant envoi, réserves). C'est l'unique calcul d'argent hors SQL (03 §5.7). Le test `tests/db/chiffres-parity.test.ts` génère des documents aléatoires (graine fixe, lignes offertes, coûts inconnus, remboursements, trop-perçus), écrit par les writers, puis compare la vue `DocumentBalance` au jumeau pour chaque document : un centime d'écart fait échouer la CI.

Correspondance des champs (`documentBalance(lines, payments)`) : `total`, `paid`, `due`, `hasUnknownCost` ↔ colonnes homonymes ; **colonne `cost` ↔ `knownCost`** (coûts inconnus comptés 0, règle de la Marge nette, 03 §5.4). Le jumeau expose en plus `cost: Eur | null` — `null` dès qu'une ligne a un coût inconnu, parce qu'un document affiche alors « Marge avant dépenses : coût à compléter » et jamais une marge gonflée par un 0 (06 S01) —, `marginBeforeExpenses` (`null` dans le même cas) et `overpaid` (« Trop-perçu », 06 §1.7). Ces trois champs se déduisent des colonnes : le test de parité vérifie `cost === null ⇔ hasUnknownCost`.

### 6.5 Le temps

- Bornes métier (« aujourd'hui », « ce mois », « semaine » calendaire commençant le lundi, « en retard ») : **en SQL**, via `nurea_period_start` / `nurea_period_end` en Europe/Paris. Jamais `setHours(0,0,0,0)` ni `new Date(année, mois, 1)` côté serveur (bug 01 §4.6).
- `src/domain/periods.ts` sert l'affichage (« septembre 2026 ») et la clé de cache du jour (`parisDayKey()`), avec des tests aux changements d'heure (29 mars et 25 octobre 2026) confrontés à `nurea_period_start` dans `tests/db/periods.test.ts`.

### 6.6 Qui appelle quoi

| Écran ou bloc | Chiffre(s) | Appel |
|---|---|---|
| Accueil — bloc argent | Encaissé du mois (dominant), Marge nette du mois (+ %), À encaisser, Trésorerie | `tableauDeBord()` |
| Accueil — alertes, pipeline | en retard, non attribué, clients à relancer, coût à compléter | `tableauDeBord()` (+ `catalogue.stockAlerts()`, §11) |
| Commandes — groupe « En retard » | en retard | `enRetard()` : même prédicat, le lien de l'alerte ouvre exactement cet ensemble |
| Récap de journée (N4) | Encaissé du jour | `encaisse({ period: { unit: "day" } })` |
| Compta — vue Ventes | Encaissé, Marge nette (période choisie), À encaisser (à date : un encours, sans période) | `encaisse`, `margeNette`, `aEncaisser` |
| Récap du jour, À encaisser (filtre « Plus de 30 jours ») | créances anciennes | `creancesAnciennes()` |
| Compta — graphe | Encaissé par semaine | `encaisseParSemaine(8)` |
| Compta — vue Trésorerie | Trésorerie, soldes, non attribué | `tresorerie()` |
| Encaisser | À encaisser (liste et total) | `aEncaisserDetail()` |
| Lots — liste et détail | Encaissé, Marge nette, À encaisser, coûts, dépenses | `chiffresParLot()` ; `…({ batchId })` |
| Clients — liste (badge) et fiche | À encaisser | `aEncaisserParClient()` ; `aEncaisser({ customerId })` |
| Fiche document | total, payé, dû | `documentBalance([id])` |
| Export CSV | Encaissé de la période | `encaisse({ period: { from, to } })` |

*État à la sortie de J6, repris par J7.* Les formulaires d'argent (chips de poche de S02, S12, S15 ; S14) lisent `treasury/queries.activePockets()`, qui **répète** le SQL de solde de 03 §5.5 (poche système en dernier) : J7 fait de `tresorerie()` la seule source de ce calcul, et `activePockets` s'y adosse. `treasury/queries.movementJournal(month, pocketId)` (mois calendaire de Paris, filtre de poche `?poche=`) est prêt pour E04.

---

## 7. Lectures sans effet de bord

### 7.1 Règle

**Une lecture n'écrit jamais rien** : aucune page RSC, aucun bloc, aucune route GET, aucune fonction de `queries.ts` ou de `chiffres/` n'insère, ne met à jour, ne supprime, ni n'invalide un cache. Application mécanique :

- les writers n'acceptent qu'un `Tx`, que seules les actions obtiennent (`inTransaction`) ;
- `queries.ts`, `chiffres/**`, `app/**/page.tsx`, `features/**/pages|blocks` et `route.ts` ne peuvent importer ni writer ni action (test `layers`) ;
- `updateTag`, `revalidateTag`, `revalidatePath` n'apparaissent que dans `src/server/cache/invalidate.ts`, appelé par `defineAction` (test `cache-calls`) — fin du GET détail lot qui purgeait les caches (01 §4.4) ;
- en base, les tables d'argent refusent toute suppression (triggers de 03 §4.10).

### 7.2 Fin de la purge : « replié » est une requête

La purge « éphémère » (01 §3.1, `orderPurge.ts`) disparaît sous toute forme — la production l'a déjà retirée le 10/09/2026 (`3291428`), en la remplaçant par une fenêtre de visibilité de 48 h sur les commandes livrées (01 §3.11) : même intention, sans rien effacer, ce que la refonte obtient par le segment « Livrées » de E10 (06). **Il n'y a ni tâche d'archivage ni colonne d'archive** : un document « replié » est un prédicat de lecture — `DELIVERED` avec `due = 0`, ou `CANCELLED` (03 §4.4). Les listes chargent ces groupes repliés à la demande et paginés (§15). Rien ne vieillit en base, rien ne s'efface, aucun job ne peut échouer en silence.

### 7.3 Tâches explicites

Toute maintenance est un **script lancé à la main**, jamais un effet de requête :

| Script | Rôle | Écrit ? |
|---|---|---|
| `scripts/create-admin.ts` | Créer ou réinitialiser le compte (identifiant, mot de passe) | `AdminUser` |
| `scripts/migration/reprise.ts` | Reprise de 03 §7, `--dry-run` par défaut (ROLLBACK final + rapport) | Oui, une transaction |
| `scripts/check-invariants.ts` | Invariants de 03 §5.7 (Σ payé = Σ mouvements `PAYMENT`, transferts à deux jambes de somme nulle, poches archivées à solde nul, contraintes restées `NOT VALID`) | Non |
| `scripts/storage-orphans.ts` | Objets du bucket `catalog` non référencés par `Brand` / `Perfume` (`image`, `imageLight`) / `PerfumeMedia` (`path`) / `SaleLine.imageUrl` (vignette de l'historique, qui protège l'image d'un parfum supprimé) ; `--apply` pour supprimer. Une image **remplacée** sur une fiche n'est pas supprimée par l'écriture (§12) : elle devient un orphelin de ce script si plus rien ne la référence. Un objet sous `stories/<parfum>/` sans ligne `PerfumeMedia` est un orphelin (dépôt abandonné, ou suppression d'objet échouée après commit) | Stockage seulement |
| `node scripts/build-admin-pwa-assets.mjs` | Icônes et splash (CLAUDE.md) | Fichiers |

**Pas de cron en v1.** Le jour où une tâche planifiée écrira (notifications push, N10, v2), elle sera une route `POST` nommée, protégée par un secret de cron, inscrite dans la liste fermée du §3.5 — jamais un GET.

### 7.4 Pas d'écriture paresseuse

La poche système « Non attribué » et la ligne `Setting` (id 1) **sont créées par la migration** sur la base réelle (03 §7.3, étapes 3a et 3b), et **jamais « à la demande » pendant une lecture** (fin de `ensureUnassignedPocket` et de sa course, 01 §4.3). Sur une base neuve (tests, préproduction vide), elles naissent dans une **écriture** :

- « Non attribué » est créée par `treasury/writer.unassignedPocketId(tx)`, dans la transaction du premier geste qui en a besoin (encaissement ou mouvement sans poche choisie), sous l'identifiant **fixe** `poche-non-attribue` : deux créations concurrentes butent sur la clé primaire et la seconde est rejouée (§3.6) au lieu d'échouer sur l'index `pocket_single_system_uq`.
- `Setting` : sans ligne, la lecture rend les valeurs par défaut (taux 277, poche `NULL` = « Non attribué ») — `readSettings(tx)` dans le writer, `getSettings()` (`defineQuery`, `settings/queries.ts`) pour les écrans ; la première écriture fait un `upsert` de l'id 1.

---

## 8. Authentification minimale invisible

### 8.1 Décision

02 §7 est confirmé et appliqué : **un compte, aucun rôle**, un garde unique et systématique, zéro tap supplémentaire au quotidien. Les rôles `OWNER` / `EDITOR` / `VIEWER`, `AuditLog`, la route de santé et son second secret disparaissent.

### 8.2 Jeton et cookie

| Élément | Valeur |
|---|---|
| Cookie | `nurea_admin` (nom conservé : les sessions en cours survivent à la bascule, les id `AdminUser` étant conservés) — `httpOnly`, `secure` en production, `SameSite=Lax`, `path=/`, 7 jours |
| Jeton | JWT HS256 signé par `ADMIN_JWT_SECRET` ; revendications `sub` (id `AdminUser`) et `username` ; `iat`, `exp` 7 jours |
| Renouvellement glissant | Si `iat` a plus de 24 h, `proxy.ts` réémet un jeton de 7 jours sur la réponse : ouvrir l'app au moins une fois par semaine suffit à ne jamais être déconnecté |
| Révocation | Déconnexion (efface le cookie) ; révocation globale par rotation de `ADMIN_JWT_SECRET`. Pas de table de sessions (02 §7). |
| Code | `src/server/auth/token.ts` (`signSessionToken`, `verifySessionToken`, `renewIfStale`, `sessionCookieOptions`) — sans API Next, importable par `proxy.ts` |

### 8.3 `proxy.ts` : la garde optimiste

Next 16 remplace la convention `middleware.ts` par `proxy.ts` (exécuté en Node). Rôle : rediriger tôt vers la connexion et poser l'en-tête qu'exige le root layout pour appliquer le registre admin.

```ts
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, renewIfStale, sessionCookieOptions, verifySessionToken } from "@/server/auth/token";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isGestionInMaintenance()) return maintenanceResponse(pathname);   // A-11 : 503 HTML ou JSON, sans base
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set("x-nurea-admin-route", "1");
  const pass = () => NextResponse.next({ request: { headers } });

  if (pathname === "/admin/login") return pass();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;     // ConfigurationError ⇒ 503 texte
  if (!session) {
    // Un appel d'action n'est jamais redirigé : defineAction répond SESSION_EXPIRED proprement.
    if (request.headers.has("next-action")) return pass();
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("retour", pathname + search);
    return NextResponse.redirect(login);
  }
  const response = pass();
  const renewed = await renewIfStale(session);
  if (renewed) response.cookies.set(SESSION_COOKIE, renewed, sessionCookieOptions());
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
```

Le JWT est **vérifié** (signature, algorithme HS256, expiration) et non plus seulement présent (bug haute 01 §4.7). Le matcher couvre `/api/admin/*` **pour le seul mode maintenance** (amendement A-11) : hors maintenance, ces routes ne sont ni redirigées ni marquées, elles répondent elles-mêmes en JSON (`defineReadRoute`). La vitrine n'est pas couverte.

*Mise en œuvre J3.* La page 503 est servie depuis la constante `MAINTENANCE_HTML` de `src/server/core/maintenance.ts` (sur Vercel, le proxy ne lit pas `public/`) ; `public/admin-maintenance.html` en est la copie exacte, joignable en direct, et `tests/architecture/maintenance-page.test.ts` vérifie l'égalité et l'autonomie. Réponses `Cache-Control: no-store`, `Retry-After: 300` ; `/api/admin/*` reçoit un `ActionResult` `UNAVAILABLE` réessayable. Vérifié sur un build de production : `/admin`, `/admin/login` et `/api/admin/orders` ⇒ 503, `/` et `/marque` ⇒ 200. Un en-tête `x-nurea-admin-route` forgé sur la vitrine n'altère que le rendu du navigateur qui l'envoie (01 §4.7, impact nul) : non traité.

### 8.4 `requireSession`, appliqué par construction

```ts
// src/server/auth/session.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

export type Session = { userId: string; username: string };
export class SessionExpired extends Error {}

export const readSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;     // une vérification par rendu, mémoïsée
});

export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) throw new SessionExpired();
  return session;
}
```

| Point d'entrée | Qui appelle `requireSession` | Sans session |
|---|---|---|
| Toute action | `defineAction` (§3.3) | `{ ok: false, error: { code: "SESSION_EXPIRED" } }` |
| Toute lecture serveur | `defineQuery` | `redirect("/admin/login")` |
| Route `/api/admin/*` | `defineReadRoute` | 401 + `ActionResult` `SESSION_EXPIRED` |
| Toute page du groupe `(gestion)` | `app/admin/(gestion)/layout.tsx` (en plus de `proxy.ts`) | `redirect("/admin/login")` |

```ts
// src/server/core/define-query.ts
export function defineQuery<A extends readonly unknown[], R>(fn: (...args: A) => Promise<R>) {
  return cache(async (...args: A): Promise<R> => {
    await requireSession().catch((e) => { if (e instanceof SessionExpired) redirect("/admin/login"); throw e; });
    return fn(...args);
  });
}
```

Aucune requête ni action ne peut s'exporter sans passer par ces fabriques (tests `server-actions` et `queries-defined`). C'est la réponse structurelle au trou béant de l'audit : **il n'existe pas de chemin de lecture ou d'écriture de la gestion qui ne vérifie pas la session.** Les arguments de `defineQuery` sont des primitives (ou une clé de chaîne) pour que `react.cache` déduplique.

### 8.5 Connexion, backoff, déconnexion, expiration

- **`loginAction`** (seule action `public`, écran `/admin/login`) : identifiant normalisé (trim, minuscules) ; compte inconnu → `bcrypt.compare` contre un hash factice (temps de réponse égalisé, conservé de l'existant) ; message indifférencié « Identifiant ou mot de passe incorrect. ».
- **Backoff persistant** (`AdminUser.failedLoginCount`, `lockedUntil`, 03 §3) : au 5ᵉ échec consécutif, verrouillage 1 min, puis doublé à chaque nouvel échec (2, 4, 8 min), plafonné à 15 min ; remis à zéro au succès. Message : « Trop d'essais. Réessaie dans 4 min. » Efficace en serverless, contrairement à la `Map` en mémoire de l'existant.
- **Succès** : cookie posé, `ok` avec la destination ; le client fait `router.replace(retour)` — `retour` n'est accepté que s'il désigne, une fois résolu sur la même origine, `/admin` ou un chemin sous `/admin/` (ni `//`, ni `/\`, ni URL absolue, ni `/admin/login`) ; sinon la destination est `/admin`, sans erreur de validation. `/admin` seul doit passer : c'est le `retour` que pose `proxy.ts` pour l'Accueil. Implémentation : `safeReturnPath` de `src/contracts/auth.ts`, appliqué par le schéma `loginInput`.
- **`logoutAction`** : écran Réglages ; efface le cookie, redirige vers la connexion.
- **Expiration en cours de saisie** : brouillon sauvé, retour à la connexion avec `retour`, brouillon restauré au retour (§3.7) ; le message « Ta session a expiré » est enfin affiché (paramètres morts de l'existant, 01 §4.7).

*Précisions de mise en œuvre (J3, `src/server/auth/`).*
- **Codes** : identifiants refusés ⇒ `VALIDATION` (message indifférencié, sans champ désigné, pour ne pas dire lequel est faux) ; verrou actif ⇒ `CONFLICT` « Trop d'essais. Réessaie dans N min. » (minutes restantes arrondies au-dessus).
- **Pendant un verrou, un essai n'est ni vérifié ni compté** (même avec le bon mot de passe) : marteler ne prolonge pas l'attente. Le compteur ne progresse qu'à l'essai qui suit l'expiration, d'où la suite 1, 2, 4, 8, 15, 15 min aux 5ᵉ à 10ᵉ échecs.
- Le compte est lu `FOR UPDATE` : deux essais simultanés comptent deux échecs. L'échec est écrit **dans** la transaction et le refus levé **après** son `COMMIT` (un refus levé dedans serait annulé par le `ROLLBACK`).
- **Compatibilité du jeton** : `verifySessionToken` ignore la revendication `role` des jetons émis par l'existant et rogne le secret comme lui ; il rend `{ userId, username, issuedAt }` et `renewIfStale` prend ce résultat. Vérifié : `src/server/auth/__tests__/token.test.ts` et `tests/db/login.test.ts`.
- **Page provisoire** : `app/admin/login/page.tsx` + `LoginForm.tsx` (formulaire nu branché sur `loginAction`) servent les critères de J3 et sont remplacés par E18 à J4.
- `scripts/create-admin.ts` écrit par `src/server/auth/writer.ts` dans `inTransaction` ; il se lance avec `tsx --conditions=react-server` (les modules serveur importent `server-only`) et refuse la production sans `--confirm-host` (garde d'hôte de 07 §1.3).

### 8.6 Hygiène, écrite une fois

- **En-têtes** (`next.config.mjs`, `headers()`, sur `/admin/:path*`, `/api/admin/:path*`, `/admin-sw.js`) : `Strict-Transport-Security: max-age=31536000`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. Pas de CSP en v1 (nonces sur les scripts inline de Next : coût sans bénéfice pour un opérateur unique) — décision explicite, révisable.
- **Variables** : `src/server/env.ts` valide `ADMIN_JWT_SECRET` (≥ 24 caractères), `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`. `instrumentation.ts` l'exécute au démarrage et **journalise** une configuration invalide sans lever d'exception : la vitrine partage le process et ne doit jamais tomber pour une variable de la gestion. Les points d'entrée gestion (`proxy.ts`, `requireSession`) répondent alors « Configuration serveur incomplète : ADMIN_JWT_SECRET » au lieu d'une erreur à chaque requête.
- La clé de service Supabase ne quitte jamais le serveur ; l'upload passe par URL signée (§12).

---

## 9. Gestion d'erreurs unifiée

### 9.1 `ActionResult`

```ts
// src/contracts/result.ts
export type ActionErrorCode =
  | "VALIDATION"          // saisie invalide (zod ou règle de champ)
  | "NEEDS_CONFIRMATION"  // réserve du domaine non confirmée
  | "NOT_FOUND"           // l'entité n'existe plus
  | "CONFLICT"            // une règle métier refuse, ou l'état a changé entre-temps
  | "SESSION_EXPIRED"
  | "OFFLINE"             // produit côté client seulement : l'appel n'a pas atteint le serveur
  | "UNAVAILABLE"         // base injoignable, délai dépassé, verrou non obtenu
  | "UNEXPECTED";         // erreur de programmation

export type ActionError = {
  code: ActionErrorCode;
  /** Phrase française complète : ce qui se passe + ce qu'on peut faire. */
  message: string;
  /** VALIDATION : message par chemin de champ ("lines.0.unitPriceEur"). */
  fields?: Record<string, string>;
  /** NEEDS_CONFIRMATION : ce que ConfirmDialog affiche. */
  confirm?: { title: string; reserves: string[]; confirmLabel: string };
  /** UNEXPECTED : référence courte, retrouvable dans les journaux. */
  reference?: string;
  retryable: boolean;
};

export type ActionResult<T> =
  | { ok: true; data: T; notice?: string }
  | { ok: false; error: ActionError };
```

Côté domaine, `src/domain/errors.ts` fournit `DomainError(code, message, field?)` et `NeedsConfirmation(title, reserves, confirmLabel)` ; les writers les lèvent, `toActionError` les convertit. Les routes GET renvoient le même format.

### 9.2 Codes et comportements

| Code | Exemple de message | Réessayable | Comportement client (`useAction`) |
|---|---|---|---|
| `VALIDATION` | « Indique un prix pour cette ligne, ou coche Offert. » | non | Messages sous les champs, focus sur le premier |
| `NEEDS_CONFIRMATION` | titre « Livrer la commande ? » ; réserves « Il reste 40,00 € à encaisser. », « Stock de Sauvage à 1 : la fiche passera à 0. » | — | `ConfirmDialog`, rappel avec `confirm: true` |
| `NOT_FOUND` | « Cette commande n'existe plus. Elle a peut-être été supprimée depuis un autre écran. » | non | Toast, retour à l'écran parent |
| `CONFLICT` | « Le lot « Mars » est clos : rouvre-le pour y rattacher cette vente. » ; « Le montant dépasse le reste dû (35,00 €). » | non | Toast, état optimiste annulé, écran rafraîchi |
| `SESSION_EXPIRED` | « Ta session a expiré. Reconnecte-toi : ta saisie est gardée. » | — | Brouillon, redirection vers la connexion |
| `OFFLINE` | « Pas de réseau. Ta saisie est gardée — réessaie quand ça capte. » | oui | Toast avec « Réessayer » (sûr, §3.6) |
| `UNAVAILABLE` | « La base ne répond pas. Rien n'a été enregistré — réessaie. » | oui | Toast avec « Réessayer » |
| `UNEXPECTED` | « Une erreur imprévue a bloqué l'enregistrement. Rien n'a été modifié. (réf. 7F3A) » | non | Toast ; ligne de journal serveur avec la même référence |

« Rien n'a été enregistré » est **vrai par construction** : toute écriture est une transaction unique (§4). C'est la première fois que l'app peut le promettre.

### 9.3 Traduction des erreurs de base

`src/server/core/errors.ts` est le seul endroit qui lit un code Prisma ou un SQLSTATE ; `error-messages.ts` porte le dictionnaire. **Un message Prisma brut n'atteint jamais l'écran** (01 §4.10).

| Source | Détection | Code | Message |
|---|---|---|---|
| Unicité `Customer.phoneE164` | `P2002`, cible | `CONFLICT` | « Ce numéro est déjà celui de {nom}. » (le writer cherche la fiche pour la nommer) |
| Unicité `Perfume (brandId, name)` | `P2002`, cible | `CONFLICT` | « {Marque} a déjà un parfum nommé {nom}. » |
| Unicité `Brand.name` | — | — | Ne survient pas : `resoudMarque` rend la marque existante avec une `notice` |
| Clé primaire d'une création idempotente | `P2002` sur `id` de `SaleDocument`, `Payment`, `BatchExpense` | — | Rejeu (§3.6), succès |
| Unicité `CashMovement.reversesId` | `P2002` | `CONFLICT` | « Ce mouvement a déjà été annulé. » |
| Suppression bloquée (`Restrict`) | `P2003`, nom de contrainte | `CONFLICT` | lot : « Ce lot porte encore des ventes ou des dépenses : clôture-le plutôt. » ; poche : « Cette poche a un historique : archive-la une fois son solde à 0. » ; document : « Ce document a des paiements : annule-le plutôt. » |
| Enregistrement absent | `P2025` | `NOT_FOUND` | par entité |
| CHECK de 03 §4.9 | SQLSTATE `23514`, nom de contrainte | `CONFLICT` | ex. `line_gift_ck` : « Une ligne offerte est à 0 €. » ; `perfume_publish_image_ck` : « Ajoute un visuel pour publier ce parfum. », `brand_complete_logo_ck` : « Ajoute un logo pour publier une gamme complète. » (textes de `src/domain/publication.ts`, les mêmes que les pré-contrôles de l'écran, §12) — journalisé en avertissement (la validation aurait dû l'attraper) |
| Conflit, interblocage | `P2034`, `40001`, `40P01` | rejoué, puis `UNAVAILABLE` | « La base est occupée. Rien n'a été enregistré — réessaie. » |
| Base injoignable, délai | `P1001`, `P1002`, `P1017`, `P2024`, `57014` | `UNAVAILABLE` | « La base ne répond pas. Rien n'a été enregistré — réessaie. » |
| Trigger `nurea_*` (écriture seule, cohérence pièce ↔ mouvement) | message commençant par « Nuréa : » | `UNEXPECTED` | Générique + référence ; journalisé en erreur : un writer a enfreint une règle d'or |
| Stockage d'images Supabase (URL signée refusée, service injoignable) | `Error` levée par `src/server/catalogue/storage.ts` | **Aujourd'hui** `UNEXPECTED` ; **à faire** : `UNAVAILABLE` (réessayable) | Aujourd'hui générique + référence ; prévu : « Le stockage des images ne répond pas. Rien n'a été enregistré — réessaie. » (une panne du stockage n'est pas une erreur de programmation). Une variable Supabase absente est déjà un `ConfigurationError` ⇒ `UNAVAILABLE` ; une suppression d'objet après commit ne fait jamais échouer le geste (§12) |
| `LockOrderError`, toute autre exception | — | `UNEXPECTED` | Générique + référence |

*Formes réelles relevées sur Prisma 6.19 (J3, éprouvées par `tests/db/errors.test.ts`).* `P2002` porte `meta.modelName` et `meta.target` (champs) ; `P2003` porte `meta.constraint` — une contrainte **de la table écrite** signale une ligne visée disparue (`NOT_FOUND` de l'entité visée), sinon une suppression bloquée (`CONFLICT`) ; `P2025` porte `meta.modelName`. Un CHECK et un trigger n'ont **pas** de code Prisma : ils arrivent en `PrismaClientUnknownRequestError` (trigger différé : au `COMMIT`), le SQLSTATE et le nom de contrainte se lisent dans le texte ; une requête `$queryRaw` en échec arrive en `P2010` avec le SQLSTATE dans `meta.code` (interblocage `40P01` compris). Les messages « {nom} » et « {Marque} » ci-dessus restent ceux des writers, qui cherchent la fiche avant d'écrire (J10, J11) ; la traduction de dernier recours, sans contexte, dit « Ce numéro est déjà celui d'une autre fiche client : ouvre-la plutôt que d'en créer une. ». Un `ConfigurationError` (secret absent) devient `UNAVAILABLE` « Configuration serveur incomplète : ADMIN_JWT_SECRET. ».

### 9.4 Rédaction des messages

- Une phrase en français direct, tutoiement comme l'existant : **ce qui bloque + le geste qui débloque** (« Rends d'abord la marque X visible »).
- Les montants sont formatés par `formatEur` ; les noms sont ceux que l'utilisateur voit (nom de lot, de client, de parfum).
- Jamais de code technique, d'identifiant brut, de nom de table, de « Erreur 500 ».
- Un dialogue de confirmation **dit la vérité** sur les conséquences (05 §3.2) : ses textes viennent des réserves du domaine, pas d'une copie dans l'UI.

### 9.5 Erreurs de lecture et journalisation

- **Par bloc** : `src/app-shell/Block.tsx` enveloppe chaque bloc streamé d'un `Suspense` (squelette exact) et d'une frontière d'erreur cliente ; une requête qui échoue affiche `ErrorBanner` (« Ce bloc n'a pas pu se charger. » + « Réessayer » → `router.refresh()`) **à la place du bloc**, le reste de l'écran vit (05 §5.1).
- **Par écran** : `app/admin/(gestion)/error.tsx` pour une page qui ne peut pas se rendre du tout.
- **Journal** : `src/server/core/log.ts` écrit une ligne JSON par action (`action`, `code`, `ms`, `reference`, `sqlstate`, `constraint`) et une ligne par bloc en erreur. Actions de plus de 1 s journalisées en avertissement. Journaux Vercel ; pas d'outil tiers en v1.

---

## 10. Cache et revalidation par tags

### 10.1 Deux familles de tags, pas plus

| Tag | Porte sur | Invalidé quand un de ces modèles est écrit |
|---|---|---|
| `gestion` | Toute donnée métier de la gestion : documents, lignes, paiements, mouvements, poches, lots, dépenses, clients, réglages, et tous les chiffres | `SaleDocument`, `SaleLine`, `Payment`, `CashMovement`, `Pocket`, `Batch`, `BatchExpense`, `Customer`, `Setting` — **et** `Brand`, `Perfume`, `PerfumePricing` (le stock et les liens vers les parfums apparaissent dans les écrans de gestion) |
| `admin-catalogue` | Instantané catalogue admin (dont le nombre de visuels story par parfum), version et contenu du sélecteur, alertes de stock | `Brand`, `Perfume` (dont `stock`), `PerfumePricing`, `PerfumeMedia` |
| `public-catalogue` | Catalogue de la vitrine (contrat 01 §5, **nom inchangé**) | `Brand`, `Perfume` (dont `stock`), `PerfumePricing` |

**Pourquoi un seul tag de gestion.** L'audit a relevé huit appels à un tag attaché à aucun cache, des ventes qui oubliaient d'invalider les chiffres, une clé de cache bumpée à la main quatre fois (01 §4.3, §4.9). La finesse des tags n'achète rien à ce volume (un commerce individuel, un opérateur) et chaque tag fin est une occasion d'oubli. Un seul tag, invalidé automatiquement, ne peut pas être oublié. Coût : une écriture recalcule aussi des lectures qu'elle n'a pas touchées — une requête agrégée, quelques millisecondes.

`src/server/cache/tags.ts` importe `PUBLIC_CATALOGUE_CACHE_TAG` et `ADMIN_CATALOGUE_CACHE_TAG` depuis `src/lib/catalogue-service.ts` : les noms du contrat vitrine ne sont jamais redéfinis.

**`PerfumeMedia` n'invalide pas la vitrine.** La vitrine ne lit pas les visuels story (03 §6.1) : une écriture de `PerfumeMedia` seule invalide `gestion` et `admin-catalogue` (`updateTag`), **sans** `revalidateAdminCatalogue()` — déposer une planche story ne recalcule pas le catalogue public. Une action qui écrit aussi `Brand`, `Perfume` ou `PerfumePricing` (suppression d'un parfum) déclenche l'invalidation vitrine par ces modèles-là.

### 10.2 Écriture : invalidation déduite des modèles écrits

```ts
// src/server/db/client.ts
import "server-only";
import { prisma } from "@/lib/db/prisma";
import { recordWrite } from "@/server/db/unit-of-work";

const WRITES = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany",
  "updateManyAndReturn", "upsert", "delete", "deleteMany"]);

export const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (WRITES.has(operation)) recordWrite(model);   // no-op hors unité de travail (scripts, tests)
        return query(args);
      },
    },
  },
});
```

- `runUnitOfWork` (appelé par `defineAction`) ouvre un contexte `AsyncLocalStorage` qui collecte les modèles écrits, **y compris dans la transaction interactive**.
- Dans son `finally`, `defineAction` appelle `invalidateWrittenModels(written)` : modèles → tags (tableau §10.1) → `updateTag(tag)` pour `gestion` et `admin-catalogue` (lecture de ses propres écritures : la page renvoyée par l'action est déjà juste), et `revalidateAdminCatalogue()` — corps de l'existant conservé — dès qu'un modèle du catalogue a été écrit.
- Invalider après un `ROLLBACK` est sans danger (recalcul inutile) ; ne pas invalider après un `COMMIT` est impossible (le `finally` s'exécute toujours).
- Les écritures `$executeRaw` étant interdites dans le code applicatif (§4.3), l'extension voit toutes les écritures.
- **Critères de vérification** (le mécanisme repose sur deux comportements de bibliothèques, donc testés) : `tests/db/invalidation.test.ts` prouve que les écritures faites dans `inTransaction` sont enregistrées ; `e2e/parcours/lecture-de-ses-ecritures.spec.ts` prouve qu'après un encaissement la tuile Encaissé de l'Accueil affiche le nouveau montant sans rechargement. Si l'un échoue au jalon 0 (07) : repli sur des appels explicites `tx.touch("gestion" | "catalogue")` dans les writers (vérifiables par le test d'ownership) et/ou sur `revalidateTag(tag, { expire: 0 })`, comportement éprouvé de l'existant.

**Résultats des vérifications (jalon J3, 17 septembre 2026 ; Next 16.2.1, Prisma 6.19.2, PostgreSQL 15 local).**

| Vérification | Résultat | Preuve |
|---|---|---|
| **V-lib-1** — l'extension `$allOperations` enregistre, via `AsyncLocalStorage`, les modèles écrits dans un `$transaction` interactif | **Validée.** Aucun repli. | `tests/db/invalidation.test.ts` : `create`, `updateMany`, `upsert` dans `inTransaction` ⇒ `Batch`, `Brand`, `Customer`, `Perfume` enregistrés, lecture exclue ; écritures d'une transaction annulée enregistrées aussi ; deux unités de travail concurrentes isolées ; rien hors unité de travail ; `defineAction` ⇒ `updateTag("gestion")` pour un modèle de gestion, `gestion` + `admin-catalogue` + `revalidateAdminCatalogue()` pour un modèle du catalogue, rien pour une action sans écriture. |
| **V-lib-2** — une server action qui appelle `updateTag` renvoie la page déjà rafraîchie, sans `router.refresh()` | **Validée** sur un build de production (`next build` puis `next start`), dans un navigateur. Aucun repli. | Preuve jetable (retirée après coup) : une page `force-dynamic` affichait un compteur lu par `defineQuery(cached(…, "gestion", …))` ; deux actions fabriquées par `defineAction` incrémentaient le compteur en mémoire, l'une en inscrivant une écriture dans l'unité de travail (⇒ `updateTag("gestion")` par `invalidateWrittenModels`), l'autre non. Action sans écriture : la page garde la valeur cachée (0) alors que le serveur est à 1. Action avec écriture : la page affiche 2 et une nouvelle heure de lecture, dans le **même document** (marqueur JavaScript conservé, une seule entrée de navigation, seul trafic : le `POST` de l'action). |
| Reste à éprouver au jalon J8 | — | `e2e/parcours/lecture-de-ses-ecritures.spec.ts` : la même propriété sur un vrai écran et une vraie base (encaissement ⇒ tuile Encaissé de l'Accueil), écran rendu en streaming sous `Block` (la preuve J3 rendait la valeur hors `Suspense`), et l'invalidation `admin-catalogue` vue par la page du catalogue. |

*Limite connue de l'enregistrement.* Prisma appelle `$allOperations` pour le modèle **de tête** d'une requête : une écriture imbriquée (`saleDocument.create({ data: { lines: { create } } })`) n'inscrit que `SaleDocument`. Sans effet tant que les deux familles de tags ne se mélangent pas dans une même requête : **un writer n'imbrique jamais une écriture du catalogue (`Brand`, `Perfume`, `PerfumePricing`) dans une écriture de gestion, ni l'inverse** — il appelle la fonction du writer propriétaire (§4.3), ce qui est déjà la règle. `AdminUser` n'invalide rien (aucune lecture cachée) ; un modèle absent de `tags.ts` invalide `gestion` par défaut.

### 10.3 Lecture : `cached()`

```ts
// src/server/cache/cached.ts — seul appelant de unstable_cache
export function cached<A extends readonly (string | number | null)[], R extends Json>(
  name: string,
  family: "gestion" | "catalogue",
  fn: (...args: A) => Promise<R>,
  options: { daily?: boolean } = {},
) {
  return (...args: A): Promise<R> =>
    unstable_cache(() => fn(...args), [BUILD_ID, name, ...(options.daily ? [parisDayKey()] : []), ...args.map(String)], {
      tags: family === "gestion" ? [GESTION_TAG] : [ADMIN_CATALOGUE_CACHE_TAG],
      revalidate: family === "gestion" ? 60 : false,
    })();
}
```

- **`BUILD_ID` en tête de clé** (`VERCEL_DEPLOYMENT_ID`, à défaut `VERCEL_GIT_COMMIT_SHA`, à défaut `local`) : le cache de données Vercel survit aux déploiements ; un changement de forme d'un résultat ne peut plus servir l'ancienne forme. Fin des clés « -v4 » bumpées à la main. *Mise en œuvre J3* : les arguments entrent dans la clé par `JSON.stringify` et non `String` (`null` et `"null"` restent deux clés).
- **`daily`** pour tout ce qui dépend du jour (en retard, ce mois, Encaissé du jour) : la clé change à minuit, heure de Paris.
- **Filet de 60 s** sur `gestion` (valeur de l'existant) : même si une invalidation manquait, l'écart est borné. Le catalogue garde l'invalidation par tag seule, comme aujourd'hui.
- **Le résultat est un DTO JSON** (`MoneyString`, dates ISO) : `unstable_cache` sérialise, un `Decimal` ou une `Date` ne survivraient pas.
- `cached()` ne lit ni cookie ni en-tête : la session est vérifiée **avant** par `defineQuery`, qui enveloppe la fonction cachée.
- Encapsulation voulue : le jour où `cacheComponents` / `"use cache"` sera activé, seul ce fichier change. Il n'est pas activé en v1 parce que ce réglage est global à l'application Next et imposerait des modifications de la vitrine (routes `force-dynamic`), hors périmètre.

### 10.4 Ce qui n'est pas mis en cache inter-requêtes

- La fiche d'un document ouverte pour agir (solde, paiements) : `defineQuery` sans `cached()` — elle doit être exacte à l'instant où l'on encaisse.
- La fiche parfum (E16, `catalogue/queries.perfumeSheet`) : elle porte l'activité des ventes, qui change avec chaque document (famille `gestion`) et non avec le catalogue. Activité = `units` (Σ des quantités des lignes du parfum), `documents` (nombre de documents), `lastSoldAt` (`orderedAt` le plus récent), documents annulés exclus ; « Vendu N fois » affiche **N unités** (décision du 17/09/2026 : c'est ce qui parle au gérant pour son réassort). La fiche marque et le brouillon de duplication ne sont pas cachés non plus ; l'instantané admin, les alertes de stock et le sélecteur le sont (`admin-catalogue`).
- Les réglages et poches lus par les formulaires d'écriture : idem.
- Les résultats de recherche (instantanés cachés, filtrage à la volée).
- Toute lecture faite **dans** une action : elle passe par `tx.db`, sur des lignes verrouillées.

---

## 11. Stock

| Question | Réponse |
|---|---|
| **Où il se tient** | `Perfume.stock Int?` (03 §3) : un compteur physique tous volumes confondus. `NULL` = non suivi (aucune écriture automatique, aucun badge, aucune alerte) ; `0` = rupture ; `CHECK (stock IS NULL OR stock >= 0)`. La vitrine ne le lit pas (01 §5.1). |
| **Ce qui le fait bouger** | Uniquement le **delta de `SaleLine.deliveredQuantity`** d'une ligne rattachée à un parfum (03 §4.7) : T1 (né livré), T2 (ligne modifiée, parfum changé), T3 (pointage), T4 (entrée en `DELIVERED`), T4b (annulation d'un geste : quantités d'avant), T5 (annulation : livré remis à 0), T6 (suppression : restitution). Et le **réglage absolu** du gérant. |
| **Qui décide** | Le writer `documents`, seul à connaître les quantités livrées avant et après. |
| **Qui écrit** | `src/server/catalogue/stock.ts`, seul fichier qui met à jour `Perfume.stock` : `applyDeliveredDeltas(tx, deltas, { confirm })` (appelé par le writer `documents`) et `setStock(tx, perfumeId, value \| null)` (appelé par `setPerfumeStockAction`). |
| **Jamais** | Le formulaire de fiche parfum : `updatePerfumeInput` n'a pas de champ `stock` — une clé `stock` reçue est ignorée (fin de l'écrasement par l'auto-save, 01 §4.5). Jamais « lire puis réécrire » hors verrou. |

Algorithme de `applyDeliveredDeltas` :

1. Agréger les deltas par parfum (une ligne dont le parfum change produit −livré sur l'ancien, +livré sur le nouveau).
2. Les parfums sont déjà verrouillés `FOR UPDATE` par l'action (rang 4, §4.2) ; relire `stock`.
3. Parfum non suivi (`NULL`) : ignorer.
4. `nouveau = stock − delta`. Si `nouveau < 0` et `confirm` absent : lever `NeedsConfirmation` avec la réserve « Stock de {parfum} à {stock} : la fiche passera à 0. » (« {parfum} est en rupture : la fiche restera à 0. » si le stock est déjà à 0) ; confirmé : `nouveau = 0`. Calcul et texte : `applyDeliveredDelta` de `src/domain/stock.ts` ; un geste de statut joint ces réserves à celles de la transition (`assertTransition(…, { extraReserves })`) pour un seul dialogue.
5. `UPDATE` par ligne (via Prisma, donc vu par l'invalidation : tags catalogue + `gestion`).

Lecture : `src/domain/stock.ts` expose `stockStatus(stock: number | null): "untracked" | "out" | "low" | "ok"` avec `LOW_STOCK_THRESHOLD = 3` (valeur existante) ; badges de liste, chips « Rupture » et « Stock bas », picker et alerte de l'Accueil l'utilisent. `stockAlerts()` compte **séparément** les parfums suivis en rupture (`out`, stock 0) et en stock bas (`low`, 1 à 3) : l'Accueil en fait deux rangées, dont les liens `?stock=rupture` et `?stock=bas` ouvrent chacun exactement l'ensemble compté (06 E01) — les « fausses alertes massives » de l'existant disparaissent avec `NULL` (01 §2.3 n°10).

Tests (`tests/db/stock.test.ts`) : vente directe décrémente ; pointage partiel puis retour arrière ; annulation restitue ; changement de parfum sur une ligne livrée ; plancher avec réserve ; non suivi intact ; réglage absolu concurrent d'une livraison (sérialisés par le verrou de ligne).

*Mise en œuvre J5.* `stock.ts` reprend lui-même le verrou `FOR UPDATE` des parfums (rang 4, le dernier : toujours permis, sans effet s'il est déjà détenu) avant de relire le stock ; il n'exige donc pas que l'action l'ait pris. Il expose en plus `stockReserves(tx, deltas)`, qui calcule les réserves sans écrire : T4 les passe en `extraReserves` de `assertTransition`, T1 et T2 les vérifient avant toute écriture. Des deltas qui s'annulent sur un même parfum n'écrivent rien. J5 éprouve la restitution par la suppression (T6) et le retrait d'une ligne livrée (T2) ; J6, par l'annulation (T5, `t05-cancel-document`) et le filet « Annuler » (T4b, `t04b-revert-document-change`), qui écrivent leur stock sans réserve (une restitution, ou un retour à l'état d'avant, borné à 0).

---

## 12. Contrat vitrine et catalogue

Le contrat de 01 §5 et 03 §6 est honoré tel quel ; l'architecture l'isole.

- **Un point de lecture** : `getCachedCatalogue()` dans `src/lib/catalogue-service.ts`, inchangé à deux retraits près, livrés avant la bascule (03 §6.3) : `slug` sorti du `select` public ; la partie admin (`getCachedAdminCatalogue`) déplacée dans `src/server/catalogue/queries.ts` avec **le même tag** `admin-catalogue`.
- **Un point d'invalidation** : `revalidateAdminCatalogue()` (tags `public-catalogue` + `admin-catalogue`, chemins `/` et `/admin/catalogue`), désormais dans `src/server/cache/invalidate.ts` et **déclenché automatiquement** par toute écriture de `Brand`, `Perfume` (stock compris) ou `PerfumePricing` (§10.2) — l'équivalent exact, sans oubli possible, des appels manuels de l'existant.
- **Règles de publication en un seul endroit** : `src/domain/publication.ts` (pur) — parfum publiable si visuel non vide, marque `PUBLISHED` et `CURATED` ; marque `COMPLETE` publiable si logo ; mise en avant réservée à un parfum `PUBLISHED`, deux au plus. Le writer `catalogue` les applique (et les CHECK de 03 §4.9 les doublent en base) ; l'UI appelle les mêmes fonctions pour ses pré-contrôles et affiche **les mêmes messages** (fin des trois formulations divergentes, 01 §4.5).
- **`Brand.slug` stable** : calculé une fois par `createBrand` (suffixe d'unicité), jamais par `updateBrand` ; test unitaire du writer « renommer ne change pas le slug » (02 §4.9).
- **`Perfume.id`** : séquence PostgreSQL, plus jamais `max(id)+1` (01 §5.3).
- **Cascade de masquage** (T14) : `setBrandVisibilityAction` (ou `updateBrandAction`) passe les parfums en `DRAFT`, et leur retire la mise en avant, dans la même transaction, après une réserve confirmée s'il y avait des parfums visibles (§3.4, J11) ; une gamme complète visible sans logo est refusée (`CONFLICT`), jamais masquée en silence.
- **Suppression** d'un parfum ou d'une marque : les lignes de documents gardent leur snapshot (`SetNull`) ; tarifs et visuels story partent en cascade. Les URL des objets devenus inutiles — `image` et `imageLight` du parfum (de chaque parfum de la marque), logo et variante claire de la marque, planches story — sont lues **avant** le DELETE ; après le commit, seules sont supprimées celles qui désignent **notre** bucket (préfixe exact du projet et du bucket) **et** que plus rien ne référence une fois les DELETE faits (`Perfume.image`/`imageLight`, `Brand.image`/`imageLight`, `SaleLine.imageUrl`, `PerfumeMedia.url`, relu dans la transaction) : la vignette d'un document de l'historique et une fiche dupliquée qui partage l'image sont protégées. Un visuel repris avec une URL d'un autre projet (la préproduction lit les images de la production) voit sa ligne retirée, jamais son objet. Suppression best-effort journalisée ; **remplacer** une image sur une fiche ne supprime pas l'ancienne : les orphelins relèvent de `scripts/storage-orphans.ts` (§7.3).
- **Images** : `createImageUploadUrlAction` rend une URL signée, l'URL publique et le chemin, décidé par le serveur : `perfumes/`, `brands/` ou `stories/<perfumeId>/`, suivi de `<horodatage ms sur 13 chiffres>-<8 hexa>.<ext>` (forme de la production, `77985aa`), extension de la saisie conservée, dans le bucket `catalog` ; l'URL signée est demandée avec `upsert: true` (un renvoi du même envoi après coupure n'échoue pas, le chemin étant neuf) ; conversion WebP côté client dans `src/features/catalogue/components/image-convert.ts` — recadrage portrait 1024×1536 pour un parfum, **jamais pour un logo de marque** (proportions intouchables, règle projet : le logo est seulement plafonné à 1024 px sur le grand côté, comme le fait la production depuis `12e2327`) ; l'auto-save après upload sur fiche existante est conservé (`updatePerfumeAction` sans stock). Extensions acceptées : jpg, png, webp, gif, **heic, heif** (appareil photo de l'iPhone), avif — le navigateur convertit en WebP avant l'envoi.
- **Visuels story (`PerfumeMedia`, 03 §3)** — capacité de la production (`77985aa`, `b8d015c`, `3707715`), reconduite telle quelle dans ses règles :
  - **Chemin décidé par le serveur, jamais cru du client.** `createImageUploadUrlAction({ usage: "story", perfumeId })` fabrique `stories/<perfumeId>/<horodatage>-<aléa>.<ext>` (nom d'origine jeté) ; `addPerfumeMediaAction` valide le chemin **strictement** contre cette forme (`isStoryPathOf` : ce parfum, 13 chiffres, tiret, 8 hexadécimaux, extension acceptée, ni `..` ni sous-dossier) et **recalcule** l'URL publique depuis le chemin (l'URL n'est pas une entrée) ; renvoyer un chemin déjà rangé rend le visuel existant sans rien écrire (double tap, « Réessayer »). Poids ≤ 12 Mo, dimensions entières de 1 à 20 000 px. Raison : l'objet de ce visuel finit dans une suppression le jour où il est retiré — un chemin arbitraire offrirait la suppression de n'importe quel objet du bucket, l'image catalogue d'un autre parfum comprise.
  - **Rang et plafond côté serveur** : `sortOrder` = dernier rang + 1, calculé dans la transaction (deux dépôts simultanés ne prennent pas le même rang) ; 24 visuels au plus par parfum.
  - **Suppression de l'objet après le commit.** `removePerfumeMediaAction` supprime la ligne, **puis**, une fois la transaction validée, l'objet désigné par son URL — seulement si elle est dans notre bucket (`storage.commitThenRemoveObjects`, best-effort journalisé : une ligne supprimée avec un objet resté est un orphelin pour `scripts/storage-orphans.ts`, jamais un geste refusé). `deletePerfumeAction` et `deleteBrandAction` lisent les URL des visuels **avant** le DELETE (la cascade les efface en base) et retirent les objets après le commit, selon la règle de « Suppression » ci-dessus. Rien n'est supprimé du bucket dans une transaction qui pourrait être annulée.
  - **Préparation côté client, jamais de recadrage** : `prepareStoryImage` (dans `image-convert.ts`) plafonne le grand côté à 1920 px, convertit en WebP (HEIC compris), refuse au-delà de 12 Mo avant tout envoi ; une planche 9:16 n'est jamais recadrée en 2:3 (elle perdrait le nom du parfum et les notes). Plusieurs fichiers partent l'un après l'autre ; un échec n'arrête pas les suivants, le bilan est dit.
  - **Récupération** (pattern `MediaGallery`, 05 §3.2) : partage natif avec fichier (`navigator.canShare({ files })` → feuille de partage iOS : Snapchat, Photos), sinon téléchargement d'un blob de même origine ; fermer la feuille de partage (`AbortError`) n'enchaîne pas sur le téléchargement ; aucun `window.open` après un `await` (bloqué par Safari) — l'échec s'affiche avec un lien réel « Ouvrir dans un onglet ».
  - **Lecture** : la fiche parfum (E16) charge la galerie ; l'instantané admin porte le nombre de visuels par parfum (pastille de la liste E15). La vitrine n'en lit rien.
- Aucun fichier de la vitrine n'importe `src/server`, `src/features`, `src/ui` ou `src/app-shell` (test `layers`).

---

## 13. Pages, streaming et état client

### 13.1 Le patron d'un écran

```tsx
// app/admin/(gestion)/encaisser/page.tsx — trois lignes, rien d'autre
import { CollectPage } from "@/features/collect";
export const metadata = { title: "À encaisser" };
export default CollectPage;
```

```tsx
// src/features/collect/pages/CollectPage.tsx (RSC) — aucun await avant le titre
export function CollectPage() {
  return (
    <PageScaffold header={<SectionHeader title="À encaisser" />}>
      <Block fallback={<ReceivablesSkeleton />}>
        <ReceivablesBlock />
      </Block>
    </PageScaffold>
  );
}

// src/features/collect/blocks/ReceivablesBlock.tsx (RSC async)
export async function ReceivablesBlock() {
  const [items, pockets, settings] = await Promise.all([aEncaisserDetail(), listActivePockets(), getSettings()]);
  return <ReceivablesList items={items} pockets={pockets} defaultPocketId={settings.defaultPocketId} />;
}
```

Règles :

1. La page rend son titre **sans attendre** de données (~50 ms, 05 §5.1) ; tout ce qui attend une requête est dans un `Block`.
2. **Un bloc = ses requêtes** (lancées en parallèle par `Promise.all`), un squelette aux proportions exactes, une frontière d'erreur.
3. Les `searchParams` (promesse en Next 16) sont lus par la page et passés en props aux blocs ; les composants clients ne lisent l'URL que via `useUrlState` sous `<Suspense>`.
4. Les données passées aux composants clients sont des **DTO** de `src/contracts` (montants en `MoneyString`, dates ISO).
5. Une sheet qui a besoin de données serveur est pilotée par un paramètre d'URL et alimentée par un bloc de la page (§2.3).
6. Après une action, la page se met à jour par la réponse de l'action (tags invalidés) : pas de `router.refresh()` manuel, pas de refetch client (fin du double chemin RSC + GET de la compta, 01 §4.3).

### 13.2 `Block`

`src/app-shell/Block.tsx` : composant client qui compose `<ErrorBoundary fallback={<ErrorBanner … onRetry={router.refresh} />}>` et `<Suspense fallback={fallback}>`. Il complète l'inventaire du shell de 05 §3.4. Une erreur survenue dans un composant serveur enfant est rejouée côté client à cet emplacement : c'est le mécanisme de `error.tsx`, appliqué à la granularité du bloc.

---

## 14. PWA

### 14.1 Ce qui est conservé tel quel

- **Manifeste** `GET /api/pwa/admin` (`src/lib/pwa/manifests.ts`) : `id`, `start_url`, `scope` = `/admin`, `standalone`, portrait, `background_color` `#7B0B1D`, `theme_color` `#F2F2F7`, icônes 192/512 + maskable. Raccourcis mis à jour : Vendre `/admin/vendre`, Nouvelle commande `/admin/commandes/nouvelle`, Encaisser `/admin/encaisser`.
- **Metadata** de `app/admin/layout.tsx` : noindex, `appleWebApp` (capable, titre « Nuréa Gestion », `statusBarStyle: "default"`), clé historique `apple-mobile-web-app-capable` (iOS < 17), `themeColor` `#F2F2F7` (heure iOS lisible), `viewportFit: "cover"`, zoom autorisé, `colorScheme: "light"`.
- **12 splash iOS exacts** et icônes générés par `node scripts/build-admin-pwa-assets.mjs` dans `public/pwa/admin/`. Correction : la liste des cibles vit dans **un** fichier `src/lib/pwa/splash-targets.json`, lu par le script et par `admin-splash.ts` (fin du « doit rester aligné », 01 §4.7).
- **Enregistrement** du service worker en production seulement, après `load`, désenregistrement automatique en développement.
- **Carte d'installation** iOS dans le flux de l'Accueil, dismiss persisté (05 §3.4).

### 14.2 Politique du service worker (inchangée dans son principe)

| Requête | Traitement |
|---|---|
| Non-GET, autre origine | Ignorée |
| `/api/*` | **Jamais** interceptée ni mise en cache |
| Navigation (HTML) | Réseau ; en cas d'échec **ou après 10 s sans réponse**, page hors ligne en cache. Jamais de HTML authentifié en cache. |
| `/_next/static/*`, `/pwa/admin/*`, `/branding/*` (URL versionnées par leur contenu) | Cache d'abord, rempli à la volée |
| `/admin-offline.html` | Pré-caché à l'installation |
| Tout le reste (dont `/_next/image`) | Ignoré (en-têtes HTTP longs suffisants, stockage non borné sinon) |

### 14.3 Versionnement par déploiement

- Source : `src/app-shell/pwa/service-worker.ts` exporte `renderServiceWorker(version: string): string`.
- Service : `app/admin-sw.js/route.ts` répond `GET /admin-sw.js` avec `renderServiceWorker(BUILD_ID)`, `Content-Type: text/javascript; charset=utf-8`, `Cache-Control: no-cache`. Le script à la racine contrôle le scope `/admin/`.
- Chaque déploiement change les octets du script : le navigateur installe la nouvelle version, qui **attend** (plus de `skipWaiting` inconditionnel).
- Le registrar détecte la version en attente et affiche un toast discret « Nouvelle version prête » avec « Recharger » (message `skip-waiting` → `controllerchange` → rechargement). Ignoré, il s'applique au prochain lancement à froid — jamais de rechargement imposé en pleine vente.
- À l'activation : suppression de tous les caches d'une autre version (les chunks des anciens déploiements ne s'accumulent plus), `clients.claim()`.
- Test unitaire : le script rendu ne contient aucune règle de mise en cache de `/api/` ni de navigation, et se parse (`new Function`).
- CLAUDE.md (« `public/admin-sw.js` ») est mis à jour au jalon correspondant (07).

### 14.4 Page hors ligne autonome

`public/admin-offline.html` : HTML statique, **CSS inline** (valeurs de `tokens.ts` : fond `#F2F2F7`, surface blanche, bordeaux `#7B0B1D`, pile de polices système), titre « Pas de connexion », texte « Les données de gestion sont toujours lues en direct. Reconnecte-toi au réseau pour continuer. », bouton « Réessayer » (`location.reload()` inline), cible tactile ≥ 44 px, `lang="fr"`. Aucune ressource externe : elle s'affiche sans réseau et ne dépend d'aucun bundle disparu (bug 01 §4.7). Hors du matcher de `proxy.ts` : le pré-cache ne suit plus jamais une redirection vers la connexion. Test : le fichier existe et ne référence aucune URL hors `/admin`.

### 14.5 Hors ligne : décision

**Pas de lecture ni d'écriture de données hors ligne en v1.** Une file d'écritures différées ferait naître des encaissements sans poche vérifiée, des plafonds contrôlés trop tard et des conflits à arbitrer — exactement les pertes d'argent silencieuses que la refonte élimine (02 principe 5). La réalité terrain (réseau médiocre) est servie autrement, et mieux :

- **brouillons locaux** : aucune saisie perdue, même si iOS tue l'app (§3.7) ;
- **réessai idempotent** : « Réessayer » ne peut jamais créer un doublon (§3.6) ;
- **messages vrais** : « Pas de réseau. Ta saisie est gardée — réessaie. » ;
- **squelettes et titres immédiats** : l'app répond au doigt même quand la base tarde.

Les notifications push (N10) sont v2 : elles demanderont une table d'abonnements, des clés VAPID, un gestionnaire `push` dans le service worker et une route planifiée (§7.3).

---

## 15. Performance

Règles héritées de l'existant, mesurées et documentées par l'audit (01 §4.3, §4.6, §4.8, 05 §5.6), rendues automatiques par les fabriques de ce document :

| # | Règle | Mesure ou justification (audit) | Où elle vit |
|---|---|---|---|
| 1 | **Agréger côté base, en une passe** : un bloc = une requête ; `FILTER`, CTE, jamais trois `count` séparés, jamais un agrégat refait en JS sur des lignes chargées | Aller-retour base ≈ 140 ms ; `listBatches` chargeait tout pour en afficher 3 | `src/server/chiffres/sql.ts`, `tableauDeBord()` (§6.3) |
| 2 | **Dédupliquer par rendu** (`react.cache`) | Blocs de l'Accueil qui rouvraient le même aller-retour | `defineQuery` (§8.4) |
| 3 | **Cache inter-requêtes taggé** | Accueil instantané entre deux écritures | `cached()` (§10.3) |
| 4 | **Titre immédiat, Suspense par bloc, squelettes exacts** | Compta passée de 3,4 s à 35 ms au premier affichage | Patron d'écran, `Block` (§13) |
| 5 | **Listes fenêtrées** : le rendu serveur ne contient que la première fenêtre | 539 Ko → 157 Ko de HTML | `WindowedList` (05 §3.1) |
| 6 | **Pagination par curseur** à tri stable (`orderBy` + `id` en départage), pages de 50, « Charger plus » qui **ajoute** | Curseur ambigu et liste remplacée (01 §4.10) | `queries.ts` des listes |
| 7 | **Groupes repliés chargés à l'ouverture** (Livrées, Annulées, lots clos) | Listes qui s'accumulent sans fin | Blocs dédiés |
| 8 | **Vignettes ≤ 256 px**, qualité 60, `fetchPriority="low"` | srcset 1080/1920 évités | `nureaAdminThumbLoader` |
| 9 | **Charges utiles versionnées** : sélecteur de ligne cachable par le navigateur tant que le catalogue ne change pas | N requêtes tarifaires unitaires, cache module jamais invalidé | `GET /api/admin/picker?v=` (§3.5) |
| 10 | **Recherche sur instantanés en mémoire** : clients, parfums, documents récents filtrés par `cleNom` et normalisation téléphone, 6 résultats par groupe | Volumes < 10⁴ lignes : quelques millisecondes, insensible aux accents partout, sans extension SQL. À revoir au-delà de 10⁴ clients ou documents (`pg_trgm` + `unaccent`) | `src/server/search/queries.ts` |
| 11 | **Chargement différé** du graphe (recharts), de la palette et du code de conversion d'image (`next/dynamic` / import au premier usage) | Bundle initial des écrans terrain | Features concernées |
| 12 | **Pas de N+1** : libellés du journal de Trésorerie résolus par jointures (FK réelles, 03 §4.5) | Résolution par lots de l'existant, simplifiée | `treasury/queries.ts` |
| 13 | **Région** : fonctions Vercel `cdg1`, au plus près de la base | Commit `d1516f9` | `vercel.json` (inchangé) |
| 14 | **Pool** : pas de `connection_limit=1` | Sérialiserait les blocs parallèles | `DATABASE_URL` (§4.5) |

Garde-fous de performance :

- `tests/db/perf.test.ts` : sur un jeu de données à 10 × le volume réel (généré), `tableauDeBord()`, `aEncaisserDetail()` et la première page des commandes restent sous 50 ms d'exécution SQL (`EXPLAIN ANALYZE`). Au-delà, la vue `DocumentBalance` se discute (index, matérialisation) — pas avant.
- Journalisation des actions > 1 s (§9.5).
- Budgets de perception (titre, premier bloc, retour d'une écriture) mesurés sur iPhone en 4G au jalon performance de `07-PLAN-EXECUTION.md` ; les objectifs de vitesse des tâches (02 §2) restent l'arbitre.

---

## 16. Stratégie de tests

### 16.1 Les étages

| Étage | Outil | Commande | Base | Cible |
|---|---|---|---|---|
| Unitaires | Vitest, projet `unit` | `npm test` | aucune | `src/domain/**`, `src/contracts/**`, hooks purs du shell |
| Architecture | Vitest, projet `arch` | `npm test` | aucune | `tests/architecture/**` — lecture des sources |
| Intégration base | Vitest, projet `db` (exécution séquentielle) | `npm run test:db` | PostgreSQL ≥ 15 jetable (`TEST_DATABASE_URL`) migré par `prisma migrate reset --force --skip-seed` | `tests/db/**` |
| Invariants d'affichage | Playwright | `npm run test:layout` | base de test | **Conservé** : toutes les routes × 320/375/430 px × clavier ouvert/fermé |
| Parcours clés | Playwright, projet Mobile | `npm run test:e2e` | base de test | `e2e/parcours/**` |

`npm run verify` = `typecheck` + `lint` + `test` + `test:db`, exécuté avant tout déploiement ; `test:layout` après toute modification d'UI admin (CLAUDE.md) et `test:e2e` à chaque jalon (07). Aucun test ne touche la base de production.

### 16.2 Tests d'architecture (`tests/architecture/`)

Ils lisent les fichiers sources (glob + expressions régulières, sans dépendance) et échouent avec un message qui cite la règle et le paragraphe de ce document.

| Fichier | Vérifie |
|---|---|
| `route-handlers.test.ts` | Les `route.ts` de la gestion sont exactement les cinq du §3.5 ; ceux de `/api/admin` n'exportent que `GET` via `defineReadRoute` |
| `server-actions.test.ts` | `"use server"` n'apparaît que dans `src/server/*/actions.ts` (et `src/actions/contact.ts`) ; chaque export est `export const …Action = defineAction(` ; `public` seulement pour `loginAction` |
| `queries-defined.test.ts` | Chaque export de `queries.ts` et de `chiffres/index.ts` est fabriqué par `defineQuery` |
| `table-ownership.test.ts` | Écritures Prisma par modèle seulement dans le fichier propriétaire (§4.3) ; pas de `$executeRaw` applicatif ; pas de `$transaction` hors `transaction.ts` ; pas d'import du client Prisma dans un `writer.ts` |
| `layers.test.ts` | Règles d'import du §1.3, dont registres vitrine / admin disjoints |
| `money-imports.test.ts` | `decimal.js-light` importé seulement par `src/domain/money.ts` ; pas de `Prisma.Decimal` hors `src/server/db/**` |
| `cache-calls.test.ts` | `unstable_cache` seulement dans `cached.ts` ; `updateTag`, `revalidateTag`, `revalidatePath` seulement dans `invalidate.ts` |
| `routes-builders.test.ts` | Chaque constructeur de `src/app-shell/routes.ts` correspond à un `page.tsx` (écran provisoire ou livré ; un écran à venir n'en a pas) ; toute page de `app/admin` est dans l'inventaire ; aucune URL `/admin/…` littérale dans les couches d'interface hors `routes.ts` et `navigation.ts` (§2.2) |
| `navigation.test.ts` (conservé, `src/app-shell/__tests__`) | 5 onglets, toute page rattachée à un onglet, parents cohérents avec l'onglet actif |
| `tokens-sync.test.ts` | `tokens.ts` ↔ `globals.admin.css` (05 §2) |
| `offline-page.test.ts` | `public/admin-offline.html` autonome (§14.4) — en attente (`todo`) jusqu'à J16, s'active dès que le fichier existe |
| `vocabulaire.test.ts` (07 J3) | Chaînes littérales et texte JSX de `src/features`, `src/ui`, `src/app-shell`, `src/server/export` (hors tests) : aucun terme interdit, mots entiers, « CA » sensible à la casse |
| `redirects.test.ts` (07 J3) | Chaque règle de `redirects()` aboutit, sans boucle, à une route de 06 §1.2 avec des paramètres reconnus ; les adresses de travail ne sont jamais redirigées (§2.3) |
| `maintenance-page.test.ts` (A-11) | `public/admin-maintenance.html` = page servie par `proxy.ts`, autonome ; 503 HTML ou JSON (§8.3) |

*Mise en œuvre J3.* Chaque test d'architecture contient un auto-contrôle (une violation écrite en dur doit être détectée), et chacun a été vu échouer sur une violation réelle introduite puis retirée. Écarts assumés : `cache-calls` admet `unstable_cache` dans `src/lib/catalogue-service.ts` (point de lecture du contrat vitrine, §12, qui reste où il est) ; `table-ownership` tolérait l'écriture de `Brand` par `src/lib/admin/resoudMarque.ts` jusqu'à son déplacement dans `src/server/catalogue/` (tolérance retirée à J11 : le module ne fait plus que lire, `createBrand` du writer écrit) ; `route-handlers` liste en `todo` les routes de la liste fermée pas encore livrées ; `server-actions` exige en plus que `"use server"` soit la première instruction et interdit `defineAction` hors d'un `actions.ts` ; `layers` vérifie aussi l'`import "server-only"` de tête de chaque fichier de `src/server`. Les tests de `src/app-shell` sont écrits dès maintenant et deviennent effectifs avec le shell (J4).

### 16.3 Intégration sur base réelle (`tests/db/`)

Les triggers, CHECK, la vue et les fonctions de période de 03 n'existent qu'en SQL : ils se testent sur PostgreSQL, pas sur des mocks. Remise à zéro entre fichiers par `TRUNCATE … RESTART IDENTITY CASCADE` (qui ne déclenche pas les triggers d'écriture seule, 03 §4.10). Les actions sont testées via leurs writers dans `inTransaction` ; `next/headers` et `next/cache` sont simulés pour les quelques tests de `defineAction`.

| Fichier | Contenu |
|---|---|
| `transactions/t01-create-document.test.ts` … `t15-archive-pocket.test.ts` | Un fichier par transaction de 03 §4.3 : cas nominal, gardes (plafonds, lot clos, poche archivée, réserves), atomicité (erreur injectée au milieu ⇒ rien d'écrit) |
| `concurrency.test.ts` | Deux encaissements simultanés dépassant le dû ⇒ un succès, un `CONFLICT` ; deux transferts depuis « Non attribué » ⇒ jamais négatif (J6). *Livrés à J3 dans `transactions.test.ts`* : double création même id ⇒ une ligne, deux succès ; ordre de verrous violé ⇒ `LockOrderError` ; interblocage rejoué |
| `login.test.ts` (J3) | Message indifférencié ; backoff 1, 2, 4, 8, 15, 15 min puis remise à zéro ; essais simultanés comptés ; `retour` sans redirection ouverte ; jeton de l'existant accepté |
| `errors.test.ts` (J3) | `toActionError` sur les erreurs réelles de Prisma et PostgreSQL (§9.3) |
| `triggers.test.ts` | `DELETE` / `UPDATE` de `Payment`, `CashMovement`, `BatchExpense` refusés ; mouvement `PAYMENT` sans paiement refusé au `COMMIT` ; contre-passation incohérente refusée ; annulation d'un remboursement : paiement d'entrée (BALANCE) sur un mouvement positif qui contre-passe le REFUND accepté, `Payment` REFUND sur un mouvement positif refusé |
| `chiffres-parity.test.ts` | Vue `DocumentBalance` = jumeau TS ; composite = appels individuels ; Σ groupé = total |
| `chiffres-definitions.test.ts` | Scénarios de 02 §6 : acompte sur commande annulée compté dans l'Encaissé ; `PENDING` hors À encaisser ; trop-perçu ne compensant pas une autre dette ; dépense supprimée sortie de sa période ; en retard dès 00:00 Paris |
| `invariants.test.ts` | Requêtes de 03 §5.7 vertes après chaque scénario |
| `periods.test.ts` | `nurea_period_start/end` = `src/domain/periods.ts` autour des changements d'heure |
| `stock.test.ts` | §11 |
| `catalogue-media.test.ts` (J11) | Visuels story (§12) : chemin hors `stories/<parfum>/` ou avec `..` refusé ; URL recalculée ; rang calculé sous dépôts concurrents ; 25e visuel refusé ; retrait : suppression d'objet appelée **après** le commit et jamais sur une transaction annulée ; suppression du parfum : URL lues avant le DELETE |
| `constraints.test.ts` | CHECK de 03 §4.9 (contenances 10/50/80 : 30 et 100 refusés) ; `PerfumeMedia_path_key` ; cascade `Perfume` → `PerfumeMedia` |
| `invalidation.test.ts` | Modèles écrits enregistrés, y compris en transaction (§10.2) |
| `reprise.test.ts` | `scripts/migration/reprise.ts` sur un jeu de données « ancien schéma » (production du 10/09/2026 comprise : contenances 10/50/80, `PerfumeMedia`) reproduisant les cas A, B, C de 03 §7.5 et les cas particuliers de 03 §7.7 : V1–V7 vertes ; écart injecté ⇒ ROLLBACK intégral ; contract appliqué ensuite malgré des lignes qui violent un CHECK (contraintes restées `NOT VALID`, V8) ; visuels story conservés (V11) — détail en 07 J2 |
| `perf.test.ts` | §15 |

### 16.4 Parcours de bout en bout (`e2e/parcours/`)

- **Connexion réelle** : `e2e/global-setup.ts` migre la base de test, applique `e2e/fixtures/seed.ts`, crée le compte par `scripts/create-admin.ts`, se connecte **par l'écran** et enregistre le `storageState` réutilisé par tous les tests, `test:layout` compris (fin du JWT forgé couplé au format interne, 01 §4.7).
- **Budget de taps** : `e2e/helpers/tap.ts` compte les interactions ; chaque parcours vérifie l'objectif de 02 §2.
- *Mise en œuvre J4.* **Aucun `.env` n'est lu** par `playwright.config.ts` (ils pointent sur la production) : l'app est lancée par Playwright avec `DATABASE_URL`/`DIRECT_URL` sur la base e2e (`E2E_DATABASE_URL`, défaut `postgresql://nurea:nurea@localhost:54329/nurea_test_e2e`), un `ADMIN_JWT_SECRET` de test, et Supabase, Resend et Fraganty neutralisés — Next ne remplace jamais une variable déjà posée. `global-setup` **recrée** la base (UTF-8 ; hôte local et nom `nurea_test…` exigés, comme `tests/db/global-setup.ts`), la migre (`prisma migrate deploy`), la remplit, crée par `scripts/create-admin.ts` le compte principal et deux comptes `verrou-e2e-<projet>` (le blocage après 5 échecs ne touche jamais le compte principal), se connecte par l'écran et enregistre la session dans `test-results/.auth/gerant.json` (ignoré par Git, vidé à chaque exécution). Serveur : `next dev` par défaut, les écrans de `e2e/routes.ts` compilés d'avance par `global-setup` (une compilation en cours recharge les pages ouvertes par les autres tests) ; `E2E_SERVER=start` sert un build existant, **projet Desktop seulement** (en production le cookie de session est `Secure`, que WebKit refuse sur `http://localhost`). Un serveur déjà lancé n'est réutilisé qu'avec `E2E_REUSE_SERVER=1`. `E2E_REMOTE=1` : ni base ni serveur ; `PLAYWRIGHT_BASE_URL`, `E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD` exigés ; blocage éprouvé seulement avec `E2E_VERROU_USERNAME`. `e2e/environnement.spec.ts` vérifie bandeau et suffixe « (essai) » selon `NUREA_ENV` du lanceur ; `e2e/parcours/connexion.spec.ts`, les critères de connexion de 07 J4.

| Parcours | Tâche (02 §2) | Assertions |
|---|---|---|
| `vente-directe.spec.ts` | n°1 | ≤ 8 taps ; poche par défaut pré-sélectionnée ; Encaissé de l'Accueil augmenté du montant ; stock décrémenté |
| `vente-a-credit.spec.ts` | n°1 (N1) | « Reçu maintenant » partiel ⇒ document présent dans Encaisser avec le bon dû |
| `encaisser-creance.spec.ts` | n°2 | ≤ 4 taps depuis l'Accueil ; dû à 0 ; même montant sur la fiche client |
| `commande-acompte-livraison.spec.ts` | n°3, n°4, n°5 | Commande + acompte ≤ 15 taps ; livraison partielle puis complète ; solde ; statut et tuiles à jour sans rechargement |
| `annuler-paiement.spec.ts` | correction | Contre-passation visible au journal ; dû restauré |
| `lot-depense.spec.ts` | n°8 | Dépense ≤ 5 taps ; Marge nette du lot baisse ; suppression confirmée la rétablit |
| `transfert.spec.ts` | Trésorerie | Soldes des deux poches ; « Non attribué » jamais négatif |
| `catalogue-parfum.spec.ts` | n°7 | Création avec image, visibilité en 1 tap ; publication refusée sans visuel avec le message du domaine |
| `session.spec.ts` | transverse | Cookie supprimé en cours de vente ⇒ connexion puis retour avec brouillon intact ; déconnexion depuis Réglages |
| `lecture-de-ses-ecritures.spec.ts` | principe 6 | Après encaissement, Accueil à jour immédiatement (§10.2) |
| `hors-ligne.spec.ts` | réseau | Réseau coupé pendant l'envoi ⇒ message « Pas de réseau », « Réessayer » réseau rétabli ⇒ une seule écriture |

Pour chaque parcours, le chiffre affiché est confronté à la requête de 03 §5 exécutée sur la base de test.

---

## 17. Configuration et exploitation

### 17.1 Variables d'environnement de la gestion

| Variable | Usage | Remarque |
|---|---|---|
| `DATABASE_URL` | Pooler Supabase (transaction, 6543, `pgbouncer=true`) | Pas de `connection_limit=1` (§4.5) |
| `DIRECT_URL` | Connexion directe (5432) | Migrations |
| `ADMIN_JWT_SECRET` | Signature des sessions | ≥ 24 caractères ; sa rotation déconnecte |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Upload signé, suppression d'images | Bucket `catalog` par défaut |
| `VERCEL_DEPLOYMENT_ID`, `VERCEL_GIT_COMMIT_SHA` | `BUILD_ID` (clés de cache, version du service worker) | Fournies par Vercel |
| `TEST_DATABASE_URL` | Tests `db` et e2e | Jamais la production |
| ~~`ADMIN_DASHBOARD_SECRET`~~ | — | Supprimée |

Les variables de la vitrine (Resend, Fraganty, recherche externe…) sont inchangées et hors de `src/server/env.ts`.

### 17.2 `next.config.mjs`

Ajouts à l'existant, sans toucher aux réglages de la vitrine : `headers()` (§8.6) et `redirects()` (§2.3). `serverExternalPackages: ["@prisma/client"]`, images Supabase, `poweredByHeader: false` conservés.

### 17.3 Scripts npm

| Script | Contenu |
|---|---|
| `build` | `prisma generate && prisma migrate deploy && next build` (conservé ; les migrations destructives suivent le couple expand / contract de 03 §7.3, jamais dans la même release que leur reprise) |
| `typecheck`, `lint`, `test` | Existants ; `test` exécute les projets `unit` et `arch` |
| `test:db` | Migration de `TEST_DATABASE_URL` puis projet `db` |
| `test:layout` | Inchangé : `playwright test layout-invariants --project=Desktop --workers=2` |
| `test:e2e` | `playwright test parcours environnement --project=Mobile` (J4 : `environnement.spec.ts`, bandeau de préproduction et manifeste) |
| `verify` | `typecheck && lint && test && test:db` |
| `admin:create-user` | `tsx --conditions=react-server scripts/create-admin.ts` (sans rôle ; garde d'hôte `--confirm-host`) |
| `migration:reprise` | `scripts/migration/reprise.ts` (`--dry-run` par défaut) |
| `check:invariants` | `scripts/check-invariants.ts` (lecture seule). Exige une `DATABASE_URL` **explicite**, lue avant l'import de Prisma et jamais dans `.env` (qui désigne la production) ; `--confirm-host <hôte>` pour la production (garde partagée des scripts). Exporte `checkInvariants` pour les tests ; option `--chiffres` : J7 |
| Supprimés | `db:push`, `db:sync` (jamais de `db push` : il ignorerait CHECK, triggers et vue — 03 §3), `db:seed-migrate` |
| Inchangés (vitrine) | `verify:integration`, `analyze` |

### 17.4 Dépendances

- **Ajouts** : `server-only` ; `esbuild` en dépendance de développement (banc e2e des couches, `e2e/helpers/banc.ts`, qui ne l'avait qu'en dépendance transitive).
- **Retraits** : `@tanstack/react-query`, `nuqs`, `class-variance-authority`, `motion` (sans importeur à l'audit, à confirmer par recherche avant retrait).
- **Conservées** : `decimal.js-light` (§5), `jose`, `bcryptjs`, `zod`, `@radix-ui/*`, `vaul`, `cmdk`, `recharts` (chargé à la demande), `@supabase/supabase-js`, `lucide-react`.
- **React** : l'App Router de Next 16 s'exécute avec la version de React qu'il embarque ; aligner `react`, `react-dom`, `@types/react`, `@types/react-dom` sur la 19 pour que `useOptimistic` et les types associés soient exposés — vérifié par `npm run typecheck` au jalon 0.

### 17.5 Mises à jour de la documentation du repo

Au jalon qui les rend vraies (07) : `CLAUDE.md` et `AGENTS.md` (domaines `src/features` et `src/server`, emplacement du service worker, `proxy.ts`, routes françaises, `src/contracts`, `src/server/chiffres`), `docs/admin/PRODUCT.md` et `docs/admin/DESIGN.md` (écrans Encaisser, Réglages, Journée, Statistiques). Un commentaire ou une documentation qui promet ce que le code ne fait pas est traité comme un bug (02 §8).

---

## 18. Ce que ce document laisse aux documents aval

| Sujet | Document | Contrainte posée ici |
|---|---|---|
| Rattachement de `/admin/journee`, `/admin/reglages`, `/admin/statistiques`, `/admin/encaisser`, `/admin/clients`, `/admin/lots`, `/admin/compta/ventes/[id]` aux onglets | 06 | Une route, un onglet ; onglet actif et retour cohérents (test `navigation`) |
| Présentation page ou sheet de la fiche d'une vente directe, de l'assignation au lot, du ticket | 06 | Adresses du §2.3 ; données par RSC, état par URL |
| Écrans qui activent le swipe d'action, textes de toasts de succès, colonnes exactes du CSV | 06 | Vocabulaire canonique ; messages d'erreur selon §9.4 |
| Ordre de construction | 07 | Le socle d'abord : `proxy.ts` + auth, `core/`, `db/`, `cache/`, `money.ts`, `chiffres/`, tests d'architecture et `test:db` verts — **avant** le premier écran |
| Vérifications de bibliothèques du §10.2 (enregistrement en transaction, lecture de ses écritures) | 07, jalon 0 | Repli documenté si l'une échoue |
| Bascule et reprise des données | 07 | 03 §7, `scripts/migration/reprise.ts`, `tests/db/reprise.test.ts` |
| Budgets de perception mesurés sur iPhone | 07, jalon performance | Règles du §15 |

---

*Fin du document 04. Le document suivant, `06-ECRANS-PARCOURS.md`, compose les écrans sur ce socle — pages, blocs, sheets et gestes — en respectant les adresses, la pile d'écriture et les règles d'état de ce document ; `07-PLAN-EXECUTION.md` construit d'abord le socle vérifié mécaniquement, puis les écrans, puis la bascule de 03 §7.*
