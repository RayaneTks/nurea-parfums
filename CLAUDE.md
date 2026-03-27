# CLAUDE.md

Ce fichier centralise le **contexte projet** pour les assistants et les contributeurs. À relire en début de session pour limiter les incohérences.

## Commands

```bash
npm run dev          # Dev (Turbopack)
npm run build        # Production build
npm run start        # Sert le build de production
npm run lint         # eslint .
npm run test:e2e     # Playwright (dossier e2e/)
```

## Qualité & Amélioration Continue (Loop)

Tout travail sur ce dépôt doit suivre la **Boucle de Qualité** définie dans **[GEMINI.md](GEMINI.md)** :
1.  **Vérification technique** : `tsc`, `lint`, et surtout `npm run build` local avant validation.
2.  **Auto-correction** : Documentation immédiate des pièges rencontrés.
3.  **Audit UX/UI** : Respect strict du Mobile-first et du Design System.
4.  **Documentation active** : Actualisation de CLAUDE.md après chaque changement structurel.

## Architecture & Tech Stack

- **Framework** : Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS.
- **Base de données** : PostgreSQL + Prisma.
- **Authentification** : JWT (jose) + Cookies sécurisés (admin uniquement).

### Key Directories

- `src/components/layout/` — Navbar, Footer.
- `src/components/home/` — HomePageClient (catalogue, filtres, sync URL).
- `src/components/features/` — Hero, PerfumeCard, **PerfumeCardSkeleton (CatalogSkeleton)**.
- `src/components/admin/` — AdminDashboard, Formulaires, Visualiseurs.
- `src/hooks/` — useScrollReveal, **useScrollDirection**.
- `src/lib/admin/` — Logique métier, authentification, audit.

## Admin UX & PWA (iOS)

- **App Feel** : Verrouillage du zoom (`user-scalable=no`), Safe Areas, `start_url` sur `/admin/login`.
- **Interactions** : Hitbox 44px min, `active:scale-95`, **Sticky Actions** en bas de formulaire.
- **Quick Look** : Tiroirs (Drawers) plein écran pour visualiser les images Dark/Light sans encombrer les listes.
- **Performance** : Requêtes groupées (`/api/admin/catalogue`), Skeletons animés.

## Pièges & Règles critiques (Important)

- **Next.js Suspense** : Tout composant utilisant `useSearchParams()` (ex: `AdminDashboard`, `HomePageClient`) **DOIT** être wrappé dans `<Suspense>` pour éviter l'erreur de build "CSR Bailout" sur Vercel.
- **Prisma & DB** : 
  - Les relations doivent être indexées (`@@index`). 
  - Toute nouvelle propriété UI (ex: `isFeatured`) doit impérativement être ajoutée au schéma Prisma avant le déploiement.
  - Vérifier l'intégrité des accolades du schéma après modification.
- **Mobile-First** : Ne jamais développer une vue sans tester le rendu à 390px.
- **No Hallucination** : Si une information manque, utiliser `grep_search` ou `list_directory`. Ne jamais inventer un chemin de fichier ou une variable d'environnement.

## Design System

- **Typographie** : **GFS Didot** (Titres), **Inter** (Corps).
- **Couleurs** : Variables CSS `--nurea-*` (Bordeaux, Ivoire, Cuivre). Dark-first.
- **Angles** : Border-radius `0px` par défaut (angles vifs), sauf exceptions UI spécifiques (tuiles dashboard `rounded-3xl`).
