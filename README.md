# Nuréa Parfums — Vitrine et gestion commerciale

Site de présentation d’une parfumerie à Marseille, accompagné d’une application de gestion pour le commerçant. Les deux espaces partagent un déploiement Next.js, avec des interfaces et des parcours distincts.

Site référencé par le projet : [nureaparfums.fr](https://nureaparfums.fr).

## Fonctionnalités

| Espace | Public | Fonctionnalités |
|---|---|---|
| Vitrine | Clients | Catalogue de marques et de parfums, filtres, fiches produit et contact. |
| Nuréa Gestion (`/admin`) | Commerçant | Ventes, commandes, encaissements, clients, stocks, catalogue et statistiques. |

La vitrine ne propose ni panier, ni paiement en ligne, ni compte client. Les demandes passent par un échange direct sur Snapchat ou par le formulaire de contact. L’espace de gestion est une application web installable, pensée pour l’usage sur iPhone.

## Technologies

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Prisma · PostgreSQL (Supabase) · Supabase Storage · Vitest · Playwright.

Hébergement : Vercel. Les règles métier et les calculs monétaires sont isolés dans la couche de domaine.

## Installation

**Lire [`CLAUDE.md`](CLAUDE.md) et [`DEVELOPER.md`](DEVELOPER.md) avant toute commande.** Les fichiers `.env` du poste de référence pointent sur la production, et le script de compilation comprend une étape de migration.

Pour un clone neuf, préparer exclusivement un environnement et une base de développement selon [`DEVELOPER.md`](DEVELOPER.md), en utilisant [`.env.example`](.env.example) comme modèle.

```bash
git clone https://github.com/RayaneTks/nurea-parfums.git
cd nurea-parfums
npm ci
# Configurer les variables locales avant le démarrage.
npm run dev
```

Ne pas lancer `prisma db push`, `prisma migrate reset` ou `npm run build` sans les garde-fous documentés. Hors production, la compilation requiert `NUREA_SKIP_MIGRATE_DEPLOY=1` et des URL de base explicitement locales ou factices.

## Commandes

```bash
npm run typecheck  # Vérifier les types
npm run lint       # Vérifier le code
npm test           # Tests unitaires et d’architecture
```

Les tests de base et les parcours Playwright demandent des bases locales dédiées. Consulter [`DEVELOPER.md`](DEVELOPER.md) pour `test:db`, `test:layout` et `test:e2e`.

## Organisation

| Chemin | Rôle |
|---|---|
| `app/(shop)/` | Routes et pages de la vitrine. |
| `app/admin/` | Routes de l’espace de gestion. |
| `src/domain/` | Règles métier et calculs. |
| `src/server/` | Services serveur et accès aux données. |
| `prisma/` | Schéma et migrations PostgreSQL. |
| `docs/` | Documentation produit, technique et d’exploitation. |
| `e2e/` | Parcours et invariants d’interface. |

## Documentation

- [Guide de développement](DEVELOPER.md)
- [Contexte et règles du projet](CLAUDE.md)
- [Dossier de refonte de la gestion](docs/refonte/00-README.md)
- [Reprise du chantier](PASSATION.md)
- [Sécurité](docs/SECURITE.md)
- [Direction visuelle](DESIGN.md) et [présentation produit](PRODUCT.md)

## Licence

Voir [`LICENSE`](LICENSE). Les photographies du site sont réalisées par Nuréa Parfums ; leur reproduction nécessite un accord écrit.
