# Catalogue — ce que la vitrine lit en base

Contrat de lecture du catalogue par la vitrine publique. Mis à jour le 24/09/2026, après la
refonte de la gestion (bascule du 22/09/2026).

> **Aucune commande de base dans ce document, volontairement.** `.env` et `.env.local` pointent
> sur la **production** : une commande Prisma lancée « pour essayer » y écrit pour de vrai. Les
> règles d'emploi de la base sont dans [`CLAUDE.md`](../CLAUDE.md) § « Base de données : les règles
> vitales » — jamais `prisma db push`, jamais `prisma migrate reset`, jamais `npm run build` tel quel.
> Une version antérieure de ce fichier recommandait `prisma db push --force-reset` sur
> `.env.local` : lancée, elle aurait vidé la base de production.

## 1. Les deux tables lues

Source de vérité : [`prisma/schema.prisma`](../prisma/schema.prisma) et ses migrations.

**`Brand`** — `id` (cuid), `name` (unique), `slug` (unique, **jamais recalculé** au renommage :
c'est la valeur publique du filtre `?maison=`), `catalogMode` (valeur historique, normalisée en `CURATED`), `status` (`PUBLISHED` / `DRAFT`), `image` (visuel de collection, thème sombre),
`imageLight` (variante claire, facultative).

**`Perfume`** — `id` (entier, séquence Postgres), `brandId`, `name`, `image` (visuel sombre,
obligatoire pour publier), `imageLight` (facultative), `isFeatured` (mis en avant, **deux au
plus**), `status`.

Les autres tables (documents, paiements, stock, trésorerie…) appartiennent à la gestion et ne sont
jamais lues par la vitrine.

## 2. Qui s'affiche

Écrit une fois dans [`src/domain/publication.ts`](../src/domain/publication.ts), doublé en base
par le CHECK `perfume_publish_image_ck`.

- Un parfum n'est **jamais plus visible que sa marque** : la vitrine lit les parfums `PUBLISHED`
  d'une marque `PUBLISHED`, avec un nom et un visuel. `catalogMode` ne décide plus de l'affichage.
- Les pages de marque affichent les fiches parfum d'abord ; le visuel de collection facultatif reste
  en fin de page et invite à vérifier d'autres références au catalogue.
- Masquer une marque masque ses parfums (avec confirmation dans la gestion) et leur retire la mise en avant.

## 3. Images

- L'image principale **est** la variante sombre ; `imageLight` est la variante claire facultative.
  La bascule se fait en CSS (`PerfumeImage`, `BrandLogo`), jamais en JavaScript.
- Tous les visuels de parfum sont au format **1024 × 1536 (2:3)**, en WebP, convertis côté serveur
  (`src/server/catalogue/webp.ts`) : l'iPhone n'encode pas le WebP.
- Servis tels quels depuis Supabase Storage (bucket `catalog`) — `images.unoptimized` dans
  `next.config.mjs`, voir le commentaire qui l'explique (quota de transformations Vercel).
- Les photographies sont réalisées par Nuréa Parfums et montrent les flacons d'origine des marques ;
  le client reçoit son parfum dans un flacon Nuréa. La mention est tenue dans
  [`src/lib/mentions.ts`](../src/lib/mentions.ts).

## 4. Chargement

[`src/lib/catalogue-service.ts`](../src/lib/catalogue-service.ts) — `getCachedCatalogue()` :

- une lecture Prisma, mise en cache par `unstable_cache` sous le tag `public-catalogue` ; toute
  écriture de la gestion sur le catalogue invalide ce tag ;
- la clé de cache porte un numéro de version (`public-catalogue-v3`) : le changer au déploiement jette
  l'instantané quand la base a été corrigée hors de la gestion ;
- un disjoncteur (`src/lib/db/prismaRuntimeCircuit.ts`) rend un catalogue vide plutôt qu'une page en
  erreur si la base ne répond pas.

Pages qui le lisent : l'accueil (`app/(shop)/page.tsx`), La parfumerie (`/marque`) et Contact
(`/contact`) — toutes en `force-dynamic`, jamais un HTML figé au build.
