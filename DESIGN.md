---
name: Nurea Parfums Design System
version: 1.0
register: brand
---

# Nuréa Parfums — Design System

## Atmosphere

Boutique de nuit parisienne : fond charbon chaud, accents or champagne, typographie serif pour le prestige, sans fioritures excessives. Sensation feutrée, premium, intime.

## Color Palette

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `30 8% 8%` | Fond principal (charbon chaud) |
| `--foreground` | `45 50% 85%` | Texte principal (ivoire doré) |
| `--primary` / `--luxury-gold` | `45 65% 60%` | Accent or, CTAs, liens actifs |
| `--secondary` / `--luxury-ivory` | `40 35% 88%` | Texte secondaire clair |
| `--muted` | `30 8% 15%` | Surfaces secondaires |
| `--muted-foreground` | `45 30% 65%` | Texte atténué |
| `--border` | `45 30% 25%` | Bordures subtiles |
| `--card` | `30 8% 12%` | Cartes produit |

**Stratégie couleur** : Committed — or unique sur fond sombre, pas de palette multicolore.

## Typography

- **Display / titres** : `font-serif` (Playfair ou équivalent), `tracking-tight`, `leading-[0.9]` à `leading-none`
- **Corps / UI** : sans-serif léger (`font-light`), `uppercase tracking-wider` pour nav et boutons
- **Échelle hero** : `text-6xl md:text-8xl lg:text-9xl` (à modérer si débordement mobile)
- **Corps** : `text-lg md:text-xl`, `max-w-2xl`, `leading-relaxed`

## Spacing & Layout

- Container : `max-w-6xl mx-auto`, `max-w-7xl` pour catalogue
- Sections : `--section-padding: 6rem` desktop, `3rem` mobile
- Hero : `min-h-screen` → migrer vers `min-h-[100dvh]` (iOS Safari)
- Grilles catalogue : CSS Grid, pas de flex-math

## Components

- **Boutons** : `rounded-none`, `uppercase tracking-wider`, `font-light`, or plein ou outline
- **Cartes parfum** : `Card` shadcn, fond `--card`, hover subtil
- **Header** : fixe, `backdrop-blur-md`, `bg-background/98`, bordure basse légère
- **Drawers** : fiches produit et marques en slide-over

## Motion

- Transitions : `cubic-bezier(0.4, 0, 0.2, 1)` — à renforcer avec courbes Emil (`ease-out` custom)
- Durée UI : 150-250ms pour hovers, pas de `transition: all`
- Scroll : `behavior: smooth` sur ancres
- Pas d'animations lourdes par défaut (catalogue consulté souvent)

## Radius

- `--radius: 0.75rem` global shadcn
- Boutons hero : `rounded-none` (exception volontaire, angles droits = luxe)

## Stack

React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui + Lucide (à migrer vers Phosphor si redesign majeur)

## Dark Mode

Thème sombre unique (pas de bascule light/dark). `:root` et `.dark` identiques.
