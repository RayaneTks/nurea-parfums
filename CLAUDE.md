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
- `src/components/admin/` — Dashboard catalogue, caisse (ventes, comptabilité, commandes).
- `src/components/home/` — CatalogSection, CatalogFilterDrawer (Bottom Sheet).
- `src/components/features/` — Hero, FeaturedSection, PerfumeCard.
- `src/lib/search/` — Logique de recherche, API Fraganty, Cache.
- `src/lib/catalog/` — Fetching database et transformation de données.
- `src/actions/` — Server Actions (Contact, etc.).

## Règles Critiques & Design
- **Travail Intelligent** : Ne jamais modifier les proportions d'un logo. Toujours rogner le vide inutile des images sources.
- **Images** : Format WebP obligatoire. Image principale = Dark mode (base). ImageLight = Variante Light mode optionnelle.
- **Visibilité** : Tout parfum ou marque sans image Dark est masqué automatiquement (status DRAFT).
- **Navigation** : Standard mobile-first (Zone du pouce). Zones de clic min 44px.
- **Copywriting** : Utiliser "Marque", "Catalogue", "Parfum". Éviter "Maison", "Galerie", "Sillage".
- **CSR Bailout** : `useSearchParams()` nécessite un wrap `<Suspense>`.

## Admin — Caisse (`/admin/caisse`)
- **Enregistrement** : ventes multi-lignes (parfum, prix d’achat €, prix de vente €, quantité). Montants stockés en **centimes** en base. Marges calculées côté UI et agrégées en comptabilité.
- **Comptabilité** : KPI globaux (CA, coût, marge nette, taux, unités, nombre de ventes) + liste des ventes ; suppression possible (éditeurs).
- **Commandes** : prise de commande client (nom, détail, note) ; statuts `En attente` / `Traitée` / `Annulée`.
- **API** : `GET/POST /api/admin/caisse/ventes`, `DELETE /api/admin/caisse/ventes/[id]`, `GET /api/admin/caisse/summary`, `GET/POST /api/admin/caisse/commandes`, `PATCH|DELETE /api/admin/caisse/commandes/[id]`, `GET /api/admin/caisse/parfums`.
- Après déploiement : appliquer la migration Prisma `20260424120000_cash_sales_orders`.
