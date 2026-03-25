# Développement — Nuréa Parfums

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

## Structure du dépôt

- `app/` — routes et layout Next.js (App Router)
- `src/components/` — interface (layout, features, home, ui)
- `src/lib/` — données catalogue (`data.ts`), recherche, types
- `public/` — images et assets statiques (`parfums/`, `branding/`)
- `e2e/` — scénarios de test end-to-end

Le site est en **français** (`lang="fr"` dans `app/layout.tsx`).
