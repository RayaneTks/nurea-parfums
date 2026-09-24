# Développement — Nuréa Parfums

Le contexte complet (architecture, règles, pièges) est dans **[`CLAUDE.md`](CLAUDE.md)**. Ce
fichier-ci dit comment travailler sans casser la production.

## ⚠️ Avant la première commande

`.env` et `.env.local` pointent sur la base de **production**, et `@prisma/client` charge `.env`
tout seul à l'import. Donc, sur ce poste :

| Ne jamais lancer | Pourquoi | À la place |
|---|---|---|
| `npm run build` tel quel | enchaîne `prisma generate`, **la migration de production** et `next build` | `NUREA_SKIP_MIGRATE_DEPLOY=1` avec des `DATABASE_URL` / `DIRECT_URL` factices ou locales |
| `prisma db push` | synchronise le schéma en ignorant CHECK, triggers et vue | une migration dans `prisma/migrations/`, ou rien |
| `prisma migrate reset`, `db push --force-reset` | **vide la base** | la base de test locale, ci-dessous |
| `prisma migrate dev`, `prisma db seed` sans URL explicite | écrit en production | idem |

## Prérequis

Node.js (LTS) et npm. Docker ne démarre pas sur ce poste : la base de test est un PostgreSQL
embarqué.

## Commandes

| But | Commande |
|---|---|
| Serveur de développement | `npm run dev` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests purs et d'architecture | `npm test` |
| Tests sur base réelle (locale) | `TEST_DATABASE_URL=postgresql://nurea:nurea@localhost:54329/nurea_test npm run test:db` |
| Tout sauf navigateur | `npm run verify` |
| Invariants d'affichage de la gestion | `npm run test:layout` |
| Parcours de bout en bout | `npm run test:e2e` |

**Base de test locale** : PostgreSQL embarqué sur `localhost:54329` (`nurea` / `nurea`). Elle
tombe à chaque fin de session ; la relancer par `node C:\Users\User\nurea-pg\start.mjs`
(source : `scripts/local-db/start.mjs`). Quatre bases jetables : `nurea_test`, `nurea_test_e2e`,
`nurea_test_e2e_vide`, `nurea_shadow`.

Les autres scripts (reprise des données, retour arrière, invariants, compte de gestion) sont
listés dans `CLAUDE.md` § « Commandes utiles ». Chacun exige une URL de base **explicite** et, pour
la production, un `--confirm-host`.

## Variables d'environnement

Modèle : [`.env.example`](.env.example). La gestion valide les siennes au démarrage
(`src/server/env.ts`) et répond « Configuration serveur incomplète » plutôt que de planter la
vitrine.

## Où est quoi

Deux registres disjoints, jusque dans les feuilles de style :

| | Vitrine | Gestion |
|---|---|---|
| Routes | `app/(shop)/` | `app/admin/` |
| Composants | `src/components/` (dont `editorial/` pour les pages éditoriales) | `src/features/`, `src/ui/`, `src/app-shell/` |
| Logique | `src/lib/` | `src/domain/` (pur), `src/contracts/`, `src/server/` |
| Styles | `app/globals.css` | `src/design/globals.admin.css` (dérivé de `src/design/tokens.ts`) |
| Documentation | `DESIGN.md`, `PRODUCT.md` | `docs/admin/`, `docs/refonte/` |

Commun : `prisma/` (schéma et migrations, source de vérité de la base), `e2e/` (Playwright),
`tests/architecture/` (règles vérifiées par lecture des sources), `public/branding/` (logos,
monogrammes). Le site est en français (`lang="fr"`).

## Règles métier du catalogue

Détail : [`docs/catalog-database.md`](docs/catalog-database.md) et
[`src/domain/publication.ts`](src/domain/publication.ts).

- Un parfum n'est jamais plus visible que sa marque.
- **Gamme complète** : la marque s'affiche en une carte faite de son logo, sans ses parfums ; elle
  exige un logo pour être visible. Passer une marque en gamme complète, ou la masquer, masque ses
  parfums (avec confirmation).
- Un parfum ne se publie qu'avec un visuel. `image` est la variante sombre (principale),
  `imageLight` la claire, facultative.
- Deux parfums mis en avant au plus.
- Le slug d'une marque est fixé à la création et jamais recalculé : c'est la valeur publique du
  filtre `?maison=`.
- Filtres du catalogue : choisir un onglet de catégorie remet à zéro les filtres de marque ; l'état
  vit dans l'URL (`cat`, `maison`, `brands`).
