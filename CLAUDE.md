# CLAUDE.md — Nuréa Parfums

Fichier de contexte projet pour Gemini CLI.

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
- `src/components/layout/` — Navbar, Footer.
- `src/components/home/` — CatalogSection, CatalogFilterDrawer (Bottom Sheet).
- `src/components/features/` — Hero, FeaturedSection, PerfumeCard.
- `src/lib/search/` — Logique de recherche, API Fraganty, Cache.
- `src/lib/catalog/` — Fetching database et transformation de données.
- `src/actions/` — Server Actions (Contact, etc.).
- `src/components/admin/` — Interface admin **mobile-first / PWA** (tab bar, thème **sombre** via `--admin-*`), caisse (`AdminCaisseDashboard`), manifest `GET /admin/manifest`.
- **Admin — Caisse** (`/admin/caisse`) : onglets Comptabilité · Enregistrement · Commandes ; API `/api/admin/caisse/*` ; modèles Prisma `CashSale`, `CashSaleLine`, `CustomerOrder` (migration `20260425120000_admin_cash_models`).

## Règles Critiques & Design
- **Travail Intelligent** : Ne jamais modifier les proportions d'un logo. Toujours rogner le vide inutile des images sources.
- **Images** : Format WebP obligatoire. Image principale = Dark mode (base). ImageLight = Variante Light mode optionnelle.
- **Visibilité** : Tout parfum ou marque sans image Dark est masqué automatiquement (status DRAFT).
- **Navigation** : Standard mobile-first (Zone du pouce). Zones de clic min 44px.
- **Copywriting** : Utiliser "Marque", "Catalogue", "Parfum". Éviter "Maison", "Galerie", "Sillage".
- **CSR Bailout** : `useSearchParams()` nécessite un wrap `<Suspense>`.
