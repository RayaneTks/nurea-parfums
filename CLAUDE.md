# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
```

No test framework is configured.

## Architecture

Nurea Parfums is a luxury fragrance catalog site built with **Next.js 16 (App Router)**, **React 18**, **TypeScript**, and **Tailwind CSS**. The site is in French (`lang="fr"`).

### Routing

- `/` — Home page with filterable perfume catalog
- `/contact` — Contact/concierge page (WhatsApp, Snapchat, email)
- `/mockup` — Mockup page
- `sitemap.ts` — Dynamic XML sitemap

### Key Directories

- `src/components/layout/` — Navbar, Footer (shared across pages)
- `src/components/home/` — HomePageClient (main catalog with filtering/search)
- `src/components/features/` — Hero, FeaturedSection, PerfumeCard, SearchOverlay
- `src/components/ui/` — Reusable primitives (ScrollReveal, Separator)
- `src/components/providers/` — ThemeProvider (next-themes)
- `src/hooks/` — useScrollReveal (IntersectionObserver-based reveal)
- `src/lib/data.ts` — Perfume catalog data (18 items) and fuzzy search logic

### Patterns

- Pages are thin server components that export client components (`HomePageClient`, `ContactPageClient`)
- State is local React hooks only — no global state library
- Path alias: `@/*` → `./src/*`
- Images served from `/public/` via `next/image`

## Design System

Dark-first luxury aesthetic ("Nuit Bordeaux" palette). Theme toggling via `next-themes` with class strategy.

### Colors (CSS variables in `globals.css`)

- Dark default: near-black bg (`#0A0508`), dusty rose accent (`#C46A6A`), copper secondary (`#C4956A`), ivory text (`#F0E6E0`)
- Light mode: warm cream bg (`#FAF6F2`), deep burgundy accent (`#8B3A3A`)

### Typography

- Serif: **GFS Didot** (headings, luxury feel)
- Sans: **Inter** (body text)
- Both loaded via `next/font/google` in `app/layout.tsx`

### Tailwind Customizations (`tailwind.config.ts`)

- Border radius: `0px` (sharp corners throughout)
- Custom easing: `cubic-bezier(0.16, 1, 0.3, 1)` ("out-expo")
- All colors reference CSS variables (`--nurea-*`)

## Search

`src/lib/data.ts` implements fuzzy search with:
- Accent normalization, letter-repetition reduction
- Levenshtein distance (tolerance ≤ 3)
- Exact phrase matching
- Searches across name, brand, category, tags, and aliases
