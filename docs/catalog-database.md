# Catalogue, base de données et recherche (Nuréa Parfums)

## 1. Architecture retenue

- **Framework** : Next.js 16 (App Router), React 18, TypeScript.
- **Catalogue affiché** : chargé côté serveur via `getCatalogPerfumes()` puis passé à `HomePageClient` (`catalogPerfumes`).
- **Sans `DATABASE_URL`** : comportement inchangé — données = `mockPerfumes` dans `src/lib/data.ts`.
- **Avec `DATABASE_URL`** : catalogue = parfums `PUBLISHED` non supprimés (Prisma → PostgreSQL).
- **Recherche locale** : même moteur fuzzy qu’avant (`fuzzySearchMatch`, `compareSearchRelevance`), appliqué à la liste fournie (mock ou DB).
- **Fallback externe** : si `FRAGANTY_API_KEY` est défini → **Fraganty** (`GET https://fraganty.ai/api/perfumes?q=…`, en-tête `X-API-Key`) ; sinon connecteur générique `PERFUME_EXTERNAL_*`. Les suggestions ne conservent que `name`, `brand`, `externalId` (slug) et un `raw` minimal `{ id, name, brand }`, aligné sur une future fiche catalogue.
- **Cache externe** : table `SearchExternalCache` (positif / négatif / erreur) ; sans DB, cache **mémoire** process (comme avant, avec TTL configurables).

## 2. Base de données recommandée (Vercel)

**Recommandation : PostgreSQL managé**, idéalement **Neon** (intégration Vercel simple, scale-to-zero, branching) ou **Supabase** (PostgreSQL + auth/storage si besoin plus tard).

**Supabase + Prisma** : préférer l’URL **Session pooler** (dashboard → Database → *Connection string* → *Session mode*), hôte `*.pooler.supabase.com`, port **5432**, utilisateur **`postgres.<PROJECT_REF>`**, avec **`?sslmode=require`**. Elle contourne souvent les problèmes IPv4 / réseau vers l’hôte direct `db.<ref>.supabase.co` depuis Vercel ou certains FAI.

**Pourquoi pas MySQL sur alwaysdata pour ce flux** : Prisma + serverless Vercel est optimisé pour Postgres ; Neon évite la gestion d’instances toujours allumées et les pièges de connexions.

**ORM** : **Prisma 6** — schéma dans `prisma/schema.sql`, client typé, migrations `prisma migrate`.

## 3. Fichiers créés ou modifiés

| Fichier | Rôle |
|--------|------|
| `prisma/schema.prisma` | Modèles Prisma |
| `database/schema.sql` | SQL de référence (création des tables) |
| `prisma/seed.ts` | Import `mockPerfumes` → base |
| `src/lib/db/prisma.ts` | Client Prisma singleton |
| `src/lib/catalog/getCatalogPerfumes.ts` | Lecture catalogue DB ou mock |
| `src/lib/catalog/externalSearchCache.ts` | Cache recherche externe (DB ou mémoire) |
| `src/lib/searchPerfumeWithFallback.ts` | Orchestration (async + catalogue dynamique) |
| `src/lib/searchLocalCatalog.ts` | Prend `perfumes[]` en premier argument |
| `src/lib/searchExternalPerfumeApi.ts` | Résultats `disabled` / `hit` / `miss` / `error` |
| `src/lib/perfumeSearchTypes.ts` | `source` sur suggestion externe |
| `app/page.tsx` | `await getCatalogPerfumes()` → props |
| `src/components/home/HomePageClient.tsx` | Prop `catalogPerfumes` |
| `app/admin/page.tsx` | Squelette panel admin |
| `app/api/admin/health/route.ts` | Sonde Bearer secret |
| `src/lib/admin/index.ts` | Point d’extension futur |
| `package.json` | Scripts `db:*`, `postinstall`, build + `prisma generate` |
| `next.config.mjs` | `serverExternalPackages: ["@prisma/client"]` |
| `.env.example` | Variables DB, cache, admin |

## 4. Variables d’environnement

Voir `.env.example`. Principales :

- `DATABASE_URL` — PostgreSQL (Neon / Supabase pooler session / Vercel Postgres).
- `PERFUME_EXTERNAL_API_URL`, `PERFUME_EXTERNAL_API_KEY`, etc. — source externe parfums.
- `PERFUME_EXTERNAL_SOURCE_LABEL` — champ `source` JSON (défaut `external_api`).
- `SEARCH_CACHE_POSITIVE_TTL_MS`, `SEARCH_CACHE_NEGATIVE_TTL_MS`, `SEARCH_CACHE_ERROR_TTL_MS`.
- `ADMIN_DASHBOARD_SECRET` — Bearer pour `GET /api/admin/health`.

## 5. Flux de recherche (API `/api/perfume-search`)

1. Charger le catalogue (`getCatalogPerfumes`).
2. `searchLocalCatalog(catalog, q, { category })` — si résultats → `{ type: "local_results", results }` (**pas d’appel externe**).
3. Si requête &lt; 3 caractères après trim → `{ type: "no_results" }`.
4. Sinon lire le cache (`normalizedQuery` + `categoryKey`) :
   - **FOUND** → `external_suggestion`
   - **NOT_FOUND** ou **ERROR** (non expiré) → `no_results` **sans** rappeler l’externe
5. Si cache vide : appeler l’API externe si configurée :
   - `hit` → enregistrer cache positif → `external_suggestion`
   - `miss` → cache négatif → `no_results`
   - `error` → cache erreur (TTL court) → `no_results`
   - `disabled` (pas d’URL) → `no_results` **sans** écrire en cache négatif

Le front conserve debounce + pas d’appel API tant que le catalogue local a des résultats.

## 6. Préparation panel admin

- Tables : `Brand`, `Perfume` (+ alias, tags, classiques, tailles, images, notes), `SearchExternalCache`, `AdminUser`, `AuditLog`, `ExternalImportSuggestion`.
- Route UI : `/admin` (placeholder).
- API : `GET /api/admin/health` avec `Authorization: Bearer <ADMIN_DASHBOARD_SECRET>`.
- Logique métier future : `src/lib/admin/index.ts` + routes `/api/admin/*` à ajouter.

## 7. Mise en production (Vercel)

1. Créer une base Postgres (ex. Neon), copier `DATABASE_URL` dans les env Vercel.
2. `npx prisma migrate dev` en local (ou `prisma db push` pour un premier jet), puis déployer.
3. `npm run db:seed` avec `DATABASE_URL` pointant sur la base (ou exécuter le seed une fois en CI / locale).
4. Vérifier que le build exécute `prisma generate` (`postinstall` + script `build`).

## 8. Points suivants possibles

- Auth réelle (Auth.js / Clerk) et protection `middleware` sur `/admin`.
- CRUD `/api/admin/perfumes` + formulaires.
- Nettoyage planifié des lignes `SearchExternalCache` expirées (cron Vercel).
- Recherche full-text Postgres (`pg_trgm` / `tsvector`) si le catalogue grossit fortement.
- Retrait progressif de `mockPerfumes` du runtime une fois la DB validée (garder le seed comme source).

## 9. Tests manuels suggérés

- Sans `DATABASE_URL` : accueil identique à avant ; recherche Dior ; suggestion API mockée (Playwright).
- Avec `DATABASE_URL` + seed : même contenu qu’avant ; modifier un nom en base et vérifier le rendu.
- Recherche sans résultat local + API configurée : suggestion ou « Aucun résultat » ; recharger : pas de nouvel appel externe tant que le cache est valide.
- `GET /api/admin/health` sans / avec Bearer correct.

## 10. Schéma SQL

Fichier canonique : **`database/schema.sql`**. Aligné avec `prisma/schema.prisma` pour les migrations Prisma.
