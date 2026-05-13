# Catalogue et base de données (refonte Mars 2026)

## 1) Modèle de données retenu (minimal)

Objectif: éviter l’abstrait et garder un schéma maintenable.

### `Brand`
- `id`
- `name` (unique)
- `slug` (unique)
- `catalogMode` (`CURATED` ou `COMPLETE`)
- `image` (nullable)
- timestamps

### `Perfume`
- `id` (numérique)
- `brandId` (FK)
- `name`
- `slug` (unique)
- `image` (obligatoire)
- `imageLight` (facultative)
- `status` (`PUBLISHED` ou `DRAFT`)
- timestamps
- contrainte anti-doublon faible: `UNIQUE(brandId, name)`

### Admin
- `AdminUser` (`username`, `passwordHash`, `role`)
- `AuditLog`

## 2) Règles métier

- `catalogMode = COMPLETE` signifie "Gamme complète".
- Une marque en `COMPLETE` est affichée dans le catalogue comme une carte.
- Si une marque passe en `COMPLETE`, ses parfums individuels passent en `DRAFT`.
- Suppression admin = suppression réelle (hard delete).

## 3) Règles images

- Parfum:
  - `image` obligatoire (fallback dark + light)
  - `imageLight` facultative (si présente, utilisée en light)
- Marque:
  - `image` facultative en `CURATED`
  - `image` obligatoire en `COMPLETE` (validation API/admin)

## 4) Catalogue public

- Source principale: DB (Prisma).
- Items affichés:
  - parfums `PUBLISHED` des marques `CURATED`
  - marques `COMPLETE` projetées en cartes “Gammes Complètes”
- Plus de dépendance runtime au mock pour la grille principale.

## 5) Admin (API)

- `POST /api/admin/perfumes`:
  - accepte `brandId` ou `brandName`
  - si marque absente et `brandName` fourni: création auto de marque en `CURATED`
  - refuse création parfum si marque en `COMPLETE`
- `PUT /api/admin/perfumes/[id]`:
  - refuse édition parfum si marque en `COMPLETE`
- `PATCH /api/admin/brands/[id]`:
  - supporte `catalogMode` + `image`
  - impose image si passage en `COMPLETE`
  - masque les parfums de la marque (`DRAFT`) en cas de `COMPLETE`

## 6) Commandes utiles

```bash
npx dotenv -e .env.local -- prisma db push --force-reset
npx dotenv -e .env.local -- prisma db seed
npm run lint
npm run build
```

## 7) Fichiers de référence

- Schéma Prisma: `prisma/schema.prisma`
- SQL miroir: `database/schema.sql`
- Seed: `prisma/seed.ts`
- Lecture catalogue: `src/lib/catalog/getCatalogPerfumes.ts`
- Admin API: `app/api/admin/brands/*`, `app/api/admin/perfumes/*`
