# CLAUDE.md — Nuréa Parfums

Fichier de contexte projet chargé automatiquement par Claude Code.

## Commandes Utiles
- **Build** : `npm run build`
- **Lint** : `npx next lint`
- **Type Check** : `npx tsc --noEmit`
- **Optimisation Images** : Utiliser `sharp` via scripts Node si nécessaire.

## Architecture & Tech Stack
- **Framework** : Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS.
- **Base de données** : Prisma (PostgreSQL / Supabase).
- **Stockage** : Supabase Storage (Bucket 'catalog').
- **Composants UI** : Radix UI (primitifs), Lucide React (icônes).

## Structure des Dossiers

Deux registres **disjoints**, jusque dans les feuilles de style :

| | Vitrine (`brand`) | Gestion (`product`) |
|---|---|---|
| Routes | `app/(shop)/*` | `app/admin/*` |
| Layout | `app/(shop)/layout.tsx` — `globals.css`, Newsreader + Instrument Sans, sombre par défaut | `app/admin/layout.tsx` — `globals.admin.css`, `-apple-system`, thème clair |
| Composants | `src/components/*` | `src/features/*` + `src/ui/*` + `src/app-shell/*` |
| Docs | `PRODUCT.md`, `DESIGN.md` (racine) | `docs/admin/PRODUCT.md`, `docs/admin/DESIGN.md` |

`app/layout.tsx` est un root layout **minimal** (html/body, aucune CSS) : y importer
une feuille de style l'embarquerait dans les deux registres.

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
- `src/actions/` — Server Actions (Contact, etc.).

### Gestion (PWA admin)
- `src/app-shell/` — shell, header, tab bar, palette de commandes, `navigation.ts`.
- `src/ui/primitives/` — briques neutres (Button, Input, Card, Sheet…).
- `src/ui/patterns/` — compositions (PageScaffold, FormSection, CustomerField…).
- `src/features/<domaine>/` — un dossier par domaine métier : `catalogue`, `orders`,
  `sell`, `compta`, `customers`, `batches`, `treasury`, `dashboard`, `auth`.
  Chacun expose `pages/` (RSC) et `components/` (clients).
- `src/server/<domaine>/` — requêtes Prisma et server actions.
- `src/design/` — `tokens.ts` (source) et `globals.admin.css` (dérivé).

**Interdit** : créer un second jeu de composants admin hors de `src/ui/*`.

## Règles Critiques & Design
- **Travail Intelligent** : Ne jamais modifier les proportions d'un logo. Toujours rogner le vide inutile des images sources.
- **Images** : Format WebP obligatoire. Image principale = Dark mode (base). ImageLight = Variante Light mode optionnelle.
- **Visibilité** : Tout parfum ou marque sans image Dark est masqué automatiquement (status DRAFT).
- **Navigation** : Standard mobile-first (Zone du pouce). Zones de clic min 44px.
- **Copywriting** : Utiliser "Marque", "Catalogue", "Parfum". Éviter "Maison", "Galerie", "Sillage".
- **CSR Bailout** : `useSearchParams()` nécessite un wrap `<Suspense>`.

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

## Règles Admin (PWA)
- **Navigation** : cinq onglets, pas de menu « Plus ». Toute route `/admin/*` doit
  être rattachée à un onglet dans `src/app-shell/navigation.ts`.
- **Retour** : rendu par le header du shell (`getParentScreen`). Une page ne rend
  jamais son propre lien retour.
- **Vocabulaire des chiffres** : Encaissé / À encaisser / Marge nette / Trésorerie.
  Pas de synonyme (voir `docs/admin/PRODUCT.md`).
- **Assets PWA** : régénérer via `node scripts/build-admin-pwa-assets.mjs` après tout
  changement d'icône ou de couleur d'accent.
- **Service worker** : `public/admin-sw.js` ne met en cache que des URL versionnées
  par leur contenu. Jamais de réponse `/api/*`.
- **Invariants d'affichage** : `npm run test:layout` éprouve toutes les routes à
  320/375/430 px, clavier ouvert comme fermé (hydratation, débordement, texte
  rogné, cibles tactiles, contenu masqué). À lancer après toute modification
  d'UI admin — voir `docs/admin/DESIGN.md`.
- **Suspense** : tout composant client utilisant `useSearchParams()` doit être
  sous `<Suspense>` dans sa page, sinon l'écran s'affiche sans s'hydrater.
