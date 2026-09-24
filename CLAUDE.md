# CLAUDE.md — Nuréa Parfums

Fichier de contexte projet chargé automatiquement par Claude Code.

Le dépôt porte **deux applications disjointes** : la **vitrine** publique (`app/(shop)`,
registre `brand`) et **Nuréa Gestion** (`app/admin`, registre `product`), refondue
de zéro — le dossier pilote de la refonte est `docs/refonte/` (`00-README.md` d'abord).

## Commandes Utiles

| But | Commande |
|---|---|
| Développement | `npm run dev` |
| Type Check | `npm run typecheck` (`tsc --noEmit`) |
| Lint | `npm run lint` (`eslint .`) |
| Tests purs + architecture | `npm test` (projets `unit` et `arch`) |
| Tests sur base réelle | `npm run test:db` (projet `db`) |
| Tout sauf navigateur | `npm run verify` |
| Invariants d'affichage | `npm run test:layout` |
| Parcours de bout en bout | `npm run test:e2e` (dont `test:e2e:premiere`, PC-12 sur base vide) |
| Reprise des données | `npm run migration:reprise` (`--dry-run` par défaut), `migration:reference`, `migration:verify`, `migration:sql` |
| Retour arrière de la bascule | `npm run migration:instantane` (lecture seule), puis `npm run migration:rollback -- --instantane <dossier>` |
| Répétition de bascule | `npm run repetition:refresh` (locale), `npm run repetition:preprod` (distante) |
| Invariants en base | `npm run check:invariants` (lecture seule) |
| Compte de gestion | `npm run admin:create-user` |
| Assets PWA | `node scripts/build-admin-pwa-assets.mjs` |
| Optimisation Images | `sharp` via scripts Node si nécessaire |

### Base de données : les règles vitales

- `.env` et `.env.local` **pointent sur la PRODUCTION**, et `@prisma/client` charge
  `.env` tout seul à l'import. Tout script lit son URL **avant** cet import.
- Base locale de test : PostgreSQL embarqué (`embedded-postgres`) sur
  `localhost:54329`, utilisateur/mot de passe `nurea`/`nurea` — Docker Desktop ne
  démarre pas sur ce poste. Elle tombe à chaque fin de session : relancer par
  `node C:\Users\User\nurea-pg\start.mjs` (source et reconstruction :
  `scripts/local-db/start.mjs`).
  `TEST_DATABASE_URL=postgresql://nurea:nurea@localhost:54329/nurea_test npm run test:db`.
  Quatre bases seulement, toutes jetables et recréées par les suites : `nurea_test`,
  `nurea_test_e2e`, `nurea_test_e2e_vide` (harnais PC-12) et `nurea_shadow`.
- **Il n'existe plus de préproduction** : la base Neon a été supprimée le 24/09, et
  la cible `preview` retirée de `DATABASE_URL`/`DIRECT_URL` chez Vercel. Un aperçu
  n'a donc plus d'URL de base et **échoue franchement** au lieu d'écrire dans les
  vraies données. En refaire une : `npm run repetition:preprod`.
- **Jamais `npm run build` tel quel** : il enchaîne `prisma generate`, la migration
  gardée et `next build`. Hors production, toujours `NUREA_SKIP_MIGRATE_DEPLOY=1`
  avec des `DATABASE_URL`/`DIRECT_URL` factices ou locales.
- **Jamais `prisma migrate reset`, jamais `prisma db push`** : une synchronisation
  directe du schéma ignorerait CHECK, triggers et vue (03 §3). Les scripts npm qui
  l'exposaient ont été supprimés ; on passe par une migration ou par rien.
- Mode maintenance : `NUREA_GESTION_MAINTENANCE=1` fait répondre 503 à toute la
  gestion sans lire la base (`proxy.ts`, `src/server/core/maintenance.ts`).

## Architecture & Tech Stack

- **Framework** : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **Base de données** : Prisma (PostgreSQL / Supabase).
- **Stockage** : Supabase Storage (bucket `catalog`).
- **Composants UI** : Radix UI (primitifs), Vaul (sheets),
  Recharts (chargé à la demande), Lucide React (icônes).
- **Argent** : `decimal.js-light` derrière `src/domain/money.ts` — un seul module.

## Structure des Dossiers

Deux registres **disjoints**, jusque dans les feuilles de style :

| | Vitrine (`brand`) | Gestion (`product`) |
|---|---|---|
| Routes | `app/(shop)/*` | `app/admin/*` (shell : groupe `app/admin/(gestion)`) |
| Layout | `app/(shop)/layout.tsx` — `globals.css`, Newsreader + Instrument Sans, sombre par défaut | `app/admin/layout.tsx` — `globals.admin.css`, `-apple-system`, thème clair |
| Composants | `src/components/*` | `src/features/*` + `src/ui/*` + `src/app-shell/*` |
| Docs | `PRODUCT.md`, `DESIGN.md` (racine) | `docs/admin/PRODUCT.md`, `docs/admin/DESIGN.md`, `docs/refonte/*` |

`app/layout.tsx` est un root layout **minimal** (html/body, aucune CSS) : y importer
une feuille de style l'embarquerait dans les deux registres. Il lit l'en-tête
`x-nurea-admin-route` posé par `proxy.ts` pour appliquer la classe de registre.

### Vitrine
- `src/design/` — `brand.ts` (charte en TS), `fonts.ts` (Newsreader + Instrument Sans).
  Les jetons CSS eux-mêmes vivent dans `app/globals.css`.
- `src/components/ui/` — briques : `Button`, `Field`, `ScrollReveal`, `Icons`.
- `src/components/layout/` — Navbar, Footer, BrandLogo. **Montés par le layout**,
  jamais par une page.
- `src/components/home/` — CatalogSection et ses pièces : `CatalogToolbar`,
  `CatalogEmptyState`, `CatalogFilterDrawer`, `useCatalogFilters`, `useExtendedSearch`.
- `src/components/features/` — Hero, FeaturedSection, PerfumeCard, PerfumeDialog,
  PerfumeImage.
- `src/lib/search/` — Logique de recherche, API externe, cache.
- `src/lib/catalog/` — Fetching database, transformation, `perfumePresentation.ts`.
- `src/actions/` — Server Actions de la vitrine (Contact).

### Gestion (PWA « Nuréa Gestion »)

Les couches, du bas vers le haut (règles d'import : `docs/refonte/04-ARCHITECTURE.md` §1.3) :

- `src/domain/` — **pur**, sans I/O ni Prisma : `money.ts` (le seul calcul monétaire),
  `document-status.ts`, `document-balance.ts`, `fulfillment.ts`, `sale-line.ts`
  (`VOLUMES_ML`, `DEFAULT_VOLUME_ML`), `stock.ts`, `publication.ts`, `periods.ts`,
  `phone.ts`, `ids.ts`, `errors.ts`.
- `src/contracts/` — schémas Zod partagés client/serveur, un fichier par domaine
  (`documents`, `payments`, `catalogue`, `customers`, `batches`, `treasury`,
  `chiffres`, `compta`, `stats`, `settings`, `auth`, `search`), plus `result.ts`
  (`ActionResult`), `fields.ts`, `zod-fr.ts`.
- `src/server/<domaine>/` — requêtes Prisma et server actions : `documents`,
  `payments`, `treasury`, `catalogue`, `customers`, `batches`, `settings`, `stats`,
  `search`, `auth`, `export`, et **`chiffres/`** — une définition SQL par chiffre,
  avec son jumeau TypeScript et un test de parité au centime.
- `src/server/core/` — `defineAction`, `defineQuery`, `defineReadRoute`, erreurs,
  journalisation, maintenance. `src/server/db/` — client, transactions, verrous.
  `src/server/cache/` — `cached()`, tags, invalidation déduite des modèles écrits.
- `src/app-shell/` — shell, header, tab bar, palette de commandes, toasts, filet
  « Annuler », service viewport, pull-to-refresh, **`navigation.ts`** (onglets,
  parents, mémoire d'onglet) et **`routes.ts`** (LE seul endroit où une URL
  d'écran s'écrit).
- `src/ui/primitives/` — briques neutres (Button, Input, Card, Sheet…).
- `src/ui/patterns/` — compositions (PageScaffold, StickyAction, FormSection,
  CustomerField, ConfirmDialog, MediaGallery…).
- `src/features/<domaine>/` — un dossier par domaine métier : `dashboard`,
  `documents`, `orders`, `sell`, `collect`, `compta`, `treasury`, `customers`,
  `batches`, `catalogue`, `settings`. Chacun expose `pages/` (RSC) et
  `components/` (clients).
- `src/design/` — `tokens.ts` (**source unique**) et `globals.admin.css` (dérivé,
  vérifié par `tests/architecture/tokens-sync.test.ts`).

**Interdit** : créer un second jeu de composants de gestion hors de `src/ui/*`.

### Routes de la gestion (toutes en français)

`/admin` · `/admin/journee` · `/admin/compta` · `/admin/compta/journal` ·
`/admin/lots` (+ `/nouveau`, `/[id]`) · `/admin/statistiques` · `/admin/reglages` ·
`/admin/commandes` · `/admin/vendre` · `/admin/encaisser` · `/admin/clients`
(+ `/nouveau`, `/[id]`, `/[id]/modifier`) · `/admin/catalogue`
(+ `parfums/*`, `marques/*`) · `/admin/login` (hors shell).

- **Les anciennes adresses en anglais n'existent plus** (elles étaient sous
  `/admin/perfumes`, `/admin/brands`, `/admin/stats`, et la liste des commandes
  portait un nom anglais) : elles sont servies par les redirections permanentes de
  `next.config.mjs`, rejouées par `tests/architecture/redirects.test.ts`. Écrire un
  lien vers l'une d'elles est une erreur — tout lien passe par `src/app-shell/routes.ts`.
- **Une fiche document est une sheet adressable**, jamais une page :
  `?doc=<id>` sur `/admin/commandes` (origine `ORDER`) ou `/admin/compta`
  (origine `DIRECT_SALE`). Les paramètres de sheet sont `doc`, `edition`, `assigner`.
- L'inventaire des écrans, de leurs paramètres d'URL et de leur jalon vit dans
  `src/app-shell/routes.ts` ; `tests/architecture/routes-builders.test.ts` refuse
  toute page hors inventaire.

### API : liste fermée

Il ne reste que quatre routes de lecture et deux manifestes :
`app/api/admin/search`, `app/api/admin/picker`, `app/api/admin/export/compta`,
`app/api/perfume-search` (vitrine), `app/api/pwa/admin`, `app/api/pwa/shop`.
Toute écriture passe par une **server action** de `src/server/*/actions.ts`
(plus `src/actions/contact.ts` côté vitrine) — vérifié par
`tests/architecture/server-actions.test.ts` et `route-handlers.test.ts`.

## Règles Critiques & Design
- **Travail Intelligent** : Ne jamais modifier les proportions d'un logo. Toujours rogner le vide inutile des images sources.
- **Images** : Format WebP obligatoire (conversion **côté serveur** : l'iPhone n'encode
  pas le WebP). Image principale = Dark mode (base). ImageLight = Variante Light mode optionnelle.
- **Visibilité** : Tout parfum ou marque sans image Dark est masqué automatiquement (status DRAFT).
- **Navigation** : Standard mobile-first (Zone du pouce). Zones de clic min 44px.
- **Copywriting** : Utiliser "Marque", "Catalogue", "Parfum". Éviter "Maison", "Galerie", "Sillage".
- **CSR Bailout** : `useSearchParams()` nécessite un wrap `<Suspense>`.

## Sécurité (les deux registres)

Détail et justifications : `docs/SECURITE.md`, décisions dans `docs/refonte/04-ARCHITECTURE.md` §8.6.

- **En-têtes** : `next.config.mjs`, `headers()`. Deux jeux, sur deux sources qui ne se recouvrent
  pas — une règle générique plus une règle `/admin` poserait chaque en-tête deux fois. CSP,
  HSTS (`includeSubDomains; preload`), `X-Frame-Options`, `nosniff`, `Permissions-Policy`,
  `Referrer-Policy`, et `X-Robots-Tag: noindex` sur la gestion. Tenus par
  `tests/architecture/securite-headers.test.ts`.
- **`app/robots.ts` est un fichier public** : n'y écrire aucune adresse qu'on préfère discrète.
  La gestion tient hors des index par son en-tête, pas par un `Disallow`.
- **Débit** : `src/lib/security/rate-limit.ts` — recherche, contact et connexion. Frein en mémoire
  d'instance, jamais un quota exact ; le volume réparti se traite au pare-feu Vercel.
- **Formulaire public** : `src/lib/contact/guard.ts` (leurre, temps de saisie, plafonds, retours
  ligne retirés des en-têtes de courriel). Un refus anti-robot est **silencieux**.
- **JSON-LD** : toujours `jsonLdHtml()` (`src/lib/seo/jsonLd.ts`), jamais `JSON.stringify` nu dans
  un `<script>`.
- **`src/components/security/ContentGuard.tsx`** dissuade le clic droit et le glisser d'image sur
  la vitrine. C'est de la friction, **pas** de la sécurité : ne jamais lui confier une garantie, ni
  l'étendre en `debugger` en boucle ou en détection d'outils ouverts.

## Référencement (vitrine)

Stratégie, attentes et suivi : `docs/SEO.md`. Gestes hors code : `docs/seo/INSTRUCTIONS-CHROME.md`.

- **Pages indexables du catalogue** : `/parfums` (index A→Z), `/parfums/<slug-marque>`,
  `/parfums/<marque>/<nom>-<id>`. Toute adresse passe par `src/lib/seo/paths.ts`. **L'identifiant
  fait foi** : un nom corrigé redirige en 308, l'ancienne adresse ne meurt pas.
- Ces pages lisent `getSeoCatalogue()` (`src/lib/catalogue-service.ts`), **sans repli** : une base
  injoignable répond 500, jamais 404 (un 404 désindexe).
- **Chaque page déclare sa canonique** ; le layout n'en pose aucune (un repli y ferait passer
  une page neuve pour un doublon de l'accueil). Pas de hreflang : le site n'a qu'une langue.
- **Sitemap** (`app/sitemap.ts`) : `lastModified` seulement quand il est vrai (`updatedAt`).
- **Pas de balisage `Product`** tant qu'aucun prix n'est public : Google le compterait en erreur.
- Le titre (H1) de l'accueil porte « Nuréa Parfums » et « Marseille » : ne pas le réduire à une accroche.

## Règles Vitrine (charte graphique v3)

La référence complète est `DESIGN.md`. Les trois règles sans exception :
- **Angles 0** — aucun arrondi, boutons et images compris.
- **Aucune ombre** — on sépare au filet 1 px ; les blocs partagent leurs bords.
- **Survol : la couleur seule**, 160 ms `ease-out`. Jamais de déplacement ni
  d'agrandissement.

Le reste :
- **Jetons** : `app/globals.css` (`--nurea-*`, en canaux RVB) et `src/design/brand.ts`
  pour ce qui ne lit pas de CSS (`next/og`, manifeste, `themeColor`). Les deux
  doivent rester synchronisés.
- **Typographie** : une classe par rôle (`.nurea-title`, `.nurea-name`,
  `.nurea-body`, `.nurea-label`, `.nurea-caption`). Une taille arbitraire en dur
  signale un rôle manquant — ajoutez-le plutôt que de le contourner.
- **Boutons** : `src/components/ui/Button.tsx`, trois variantes. **Un seul bouton
  plein par écran.**
- **Images bi-thème** : bascule en CSS (`dark:`), jamais via `useTheme` — voir
  `PerfumeImage` et `BrandLogo`. Les grilles restent rendues côté serveur.
- **Coque** : Navbar, Footer et l'unique `<main id="main-content">` sont rendus par
  `app/(shop)/layout.tsx`. Une page ne rend que son contenu.
- **Mode clair** : hors charte, dérivé. Le cuivre y tombe à 2,5:1 — il n'y porte
  aucun texte, l'accent devient le bordeaux.
- **Fiche produit** : ordre imposé marque / nom / contenance ; jamais de prix en
  grille. Une ligne sans donnée vraie est omise, pas inventée.

## Règles Gestion (PWA)

- **Navigation** : cinq onglets, pas de menu « Plus ».
  Ce sont **Accueil · Commandes · Vendre · Clients · Catalogue**.
  Toute route `/admin/*` doit être rattachée
  à exactement un onglet dans `src/app-shell/navigation.ts`. Compta, Trésorerie,
  Lots, Journée, Statistiques et Réglages sont sous l'onglet Accueil : on y entre
  **en touchant leur chiffre**.
- **Retour** : rendu par le header du shell (`getParentScreen`), dérivé de la route
  et jamais de l'historique. Une page ne rend jamais son propre lien retour.
- **Vocabulaire des chiffres** : **Encaissé / À encaisser / Marge nette / Trésorerie**.
  Pas de synonyme (voir `docs/admin/PRODUCT.md`). La liste complète des termes
  bannis — et le terme à dire à la place — est **dans le test**, source unique :
  `tests/architecture/vocabulaire.test.ts`. Il refuse le terme mort dans toute
  chaîne et tout texte JSX de `src/features`, `src/ui`, `src/app-shell` et
  `src/server/export`.
- **Un seul document** : commande et vente sont le même objet (`SaleDocument`,
  origine `ORDER` ou `DIRECT_SALE`), avec un ledger de paiements unique. Le dû,
  l'Encaissé et le payé se **dérivent** du ledger — jamais un scalaire dénormalisé.
- **Contenances réelles** : **10 / 50 / 80 ml**, 80 par défaut, source unique
  `src/domain/sale-line.ts`, tenue par les CHECK `line_volume_ck` et
  `pricing_volume_ck`. Les contenances héritées d'avant le 10/09/2026 ont été
  traduites en production et ne sont pas reconduites ; une contenance hors règle
  n'est jamais réécrite en silence, elle est listée à la reprise et demandée au
  premier geste.
- **Chiffres** : une définition SQL par chiffre dans `src/server/chiffres/`, avec
  jumeau TypeScript et test de parité. Deux chiffres qui mesurent la même somme
  sous deux noms sur un même écran sont un bug.
- **Lectures sans effet de bord** : aucune lecture n'écrit (plus de purge sur GET).
- **Assets PWA** : régénérer via `node scripts/build-admin-pwa-assets.mjs` après
  tout changement d'icône ou de couleur d'accent. Les 12 cibles de splash iOS
  vivent dans **un** fichier, `src/lib/pwa/splash-targets.json`.
- **Service worker** : **rendu par une route**, `app/admin-sw.js/route.ts` à partir
  de `src/app-shell/pwa/service-worker.ts`, versionné par déploiement. Il ne met
  en cache que des URL versionnées par leur contenu et **jamais** une réponse
  `/api/*`. La page hors ligne est `public/admin-offline.html`, autonome (CSS inline).
- **Invariants d'affichage** : `npm run test:layout` éprouve toutes les routes à
  320/375/430 px, clavier ouvert comme fermé (hydratation, débordement, texte
  rogné, cibles tactiles, contenu masqué). À lancer après toute modification
  d'UI de gestion — voir `docs/admin/DESIGN.md`.
- **Suspense** : tout composant client utilisant `useSearchParams()` doit être
  sous `<Suspense>` dans sa page, sinon l'écran s'affiche sans s'hydrater.
- **Une documentation qui ment est un bug** : si un jalon remet en cause une
  décision, on amende d'abord le document amont, puis on code.
