# Développement — Nuréa Parfums

**Contexte projet détaillé (architecture, pièges, recherche)** : voir **[CLAUDE.md](CLAUDE.md)** à la racine du dépôt.

## Prérequis

- Node.js (LTS recommandé)
- npm

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (webpack) |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Tests Playwright |

Variables d’environnement : voir `.env.example` (contact / envoi mail).

Pour Prisma:
- `DATABASE_URL` est requis pour les commandes DB:
  - `npx prisma migrate dev`
  - `npx prisma db seed`
  - `npx prisma studio`

## Structure du dépôt

- `app/` — routes et layout Next.js (App Router)
- `src/components/` — interface (layout, features, home, ui)
- `src/lib/` — données catalogue (`data.ts`), recherche, types
- `public/` — images et assets statiques (`parfums/`, `branding/`)
- `e2e/` — scénarios de test end-to-end

Le site est en **français** (`lang="fr"` dans `app/layout.tsx`).

## Règles métier clés (catalogue)

- `Gamme complète` = entrée de marque/gamme, pas une fiche parfum individuelle.
- En mode `Gamme complète`, la marque doit rester cohérente (nom de marque, catégorie `Gammes Complètes`).
- Dans l’admin, les entrées `Gammes Complètes` se pilotent dans l’onglet `Marques` (pas dans `Parfums`).
- En admin, une marque a aussi un statut de visibilité (`Visible`/`Masquée`) indépendant du mode de catalogue.
- Si une marque devient `Masquée`, tous ses parfums passent automatiquement en `Masqué`.
- Un parfum d’une marque en `Gamme complète` ne peut jamais devenir `Visible`.
- Création d’un parfum sur une marque en `Gamme complète`:
  - confirmation explicite requise
  - création autorisée mais statut forcé à `Masqué` tant que la marque reste en `Gamme complète`
- La suppression admin est une suppression réelle avec confirmation.
- Logique image:
  - `image` = image principale
  - `imageLight` = variante claire optionnelle
  - `image` principale parfum: remplaçable uniquement (pas de suppression directe)
- Tiroir filtres catalogue:
  - Le bouton `Appliquer` affiche le nombre de résultats correspondant aux filtres cochés.
  - Les filtres marque/type restent non superposés avec les onglets de catégorie (`Tout voir`, `Gamme complète`, etc.).
