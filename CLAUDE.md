# CLAUDE.md

Ce fichier centralise le **contexte projet** pour les assistants (Claude Code, Cursor, etc.) et les contributeurs : commandes, architecture, conventions et pièges connus — à relire en début de session pour limiter les incohérences.

Voir aussi **[DEVELOPER.md](DEVELOPER.md)** (commandes et arborescence courte).

## Commands

```bash
npm run dev          # Dev (webpack — voir package.json)
npm run build        # Production build
npm run start        # Sert le build de production
npm run lint         # eslint .
npm run test:e2e     # Playwright (dossier e2e/)
```

## Architecture

Nurea Parfums est un site catalogue de parfums de luxe : **Next.js 16 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**. Langue du site : **français** (`lang="fr"` dans `app/layout.tsx`).

### Routing

- `/` — Accueil : catalogue filtrable, hero, section éditoriale featured
- `/contact` — Contact / conciergerie (WhatsApp, Snapchat, formulaire)
- `/marque` — Page « marque » (SEO / storytelling)
- `/mockup` — Maquettes internes
- `app/sitemap.ts` — Sitemap XML
- `app/robots.ts` — Robots
- `app/manifest.ts` — Web manifest
- `app/opengraph-image.tsx` / `app/twitter-image.tsx` — Images de partage social
- `app/not-found.tsx` — 404

### Key Directories

- `src/components/layout/` — Navbar, Footer
- `src/components/home/` — HomePageClient (catalogue, filtres, recherche, sync URL `?q=` / `?cat=` / `?sort=`)
- `src/components/features/` — Hero, FeaturedSection, PerfumeCard, ContactSection
- `src/components/marque/` — MarquePageClient
- `src/components/seo/` — JsonLd, etc.
- `src/components/ui/` — ScrollReveal, Separator
- `src/components/providers/` — ThemeProvider (`next-themes`, `defaultTheme="dark"`, `enableSystem={false}`)
- `src/hooks/` — useScrollReveal
- `src/lib/data.ts` — **Catalogue `mockPerfumes` (59 entrées)** + recherche floue + `getPerfumeImage` (variantes light/dark quand définies)
- `src/lib/externalSearchHints.ts` + `src/lib/externalHintsExtra.ts` — Parfums « hors catalogue » pour la recherche (suggestions + `similarCatalogIds`)
- `src/lib/externalSearchTypes.ts` — Types `ExternalPerfumeHint` (dont `footnote` pour le texte de la zone vide de recherche)
- `src/actions/contact.ts` — Formulaire contact (Resend si clés présentes, sinon `mailto:`)

### Patterns

- Pages fines côté serveur qui importent des composants client (`HomePageClient`, `ContactPageClient`, etc.)
- État local React uniquement (pas de store global)
- Alias : `@/*` → `./src/*`
- Images : `next/image` et fichiers sous `/public/` (`/parfums/`, `/branding/`)

### Thème et hydratation (important)

- `resolvedTheme` peut être **`undefined`** au premier rendu : pour les assets qui dépendent du thème, utiliser **`resolvedTheme !== "light"`** (ou attendre `mounted` selon le cas) pour rester aligné avec `defaultTheme="dark"`.
- Éviter les branches serveur/client qui diffèrent sur `Date.now()`, `Math.random()`, etc.

## Design System

Esthétique « Nuit Bordeaux », dark-first. Thème via `next-themes` (stratégie `class` sur `<html>`).

### Colors (variables CSS dans `globals.css`)

- Dark : fond `#0A0508`, accent `#C46A6A`, secondaire cuivre `#C4956A`, texte ivoire `#F0E6E0`
- Light : fond `#FAF6F2`, accent bordeaux `#8B3A3A`

### Typography

- Serif : **GFS Didot** (titres)
- Sans : **Inter** (corps)
- Chargées via `next/font/google` dans `app/layout.tsx`

### Tailwind (`tailwind.config.ts`)

- Border radius : `0px`
- Easing custom type « out-expo » : `cubic-bezier(0.16, 1, 0.3, 1)`
- Couleurs via variables `--nurea-*`

## Search

`src/lib/data.ts` : recherche floue sur le catalogue avec :

- Normalisation des accents, réduction des répétitions de lettres
- Distance de Levenshtein (tolérance ≤ 3 selon contexte)
- Phrase exacte ou correspondance par tokens
- Champs indexés : nom, marque, catégorie, tags, alias, `classics` (gammes)

Recherche « hors catalogue » : voir `findExternalPerfumeHint` et les fichiers `externalSearchHints.ts` / `externalHintsExtra.ts`.

## Contact & env

- Variables : voir `.env.example` (Resend, emails)
- Liens sociaux et coordonnées : `src/lib/data.ts` → `CONTACT`

## Search (fichiers)

- **Ne pas** mélanger les intentions : catalogue = `mockPerfumes` ; recherche élargie = hints externes + message de secours `EXTERNAL_SEARCH_FALLBACK_MESSAGE` dans `HomePageClient` lorsque la grille est vide.
