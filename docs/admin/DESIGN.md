---
name: Nuréa Admin Design System
version: 1.0
register: product
---

# Nuréa Admin — Design System

Outil opérationnel PWA iOS. Registre **`product`** — distinct du registre vitrine **`brand`** ([`DESIGN.md`](../../DESIGN.md) racine).

**Sources de vérité** : `src/design/tokens.ts` → `src/design/globals.admin.css` → composants `src/ui/primitives/*` et shell `src/app-shell/*`.

## Atmosphere

Application iOS native légère : fond gris système `#F2F2F7`, surfaces blanches, accent bordeaux Nuréa `#7B0B1D`. Sensation familière (Réglages, Banque), pas boutique de nuit. La hiérarchie vient de la densité d'information et des états sémantiques, pas du décor.

## Color Palette

Tokens CSS sous `.admin-theme` (`globals.admin.css`). Ne pas réutiliser `--nurea-*` ni `--luxury-gold` de la vitrine.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--admin-bg` | `#f2f2f7` | Fond app (iOS system gray) |
| `--admin-surface` | `#ffffff` | Cartes, sheets, menus |
| `--admin-surface-alt` | `#f9f8f6` | Variante surface |
| `--admin-surface-muted` | `#efeae4` | Zones atténuées, hover focus |
| `--admin-surface-hover` | `#e9e2da` | Hover subtil |
| `--admin-border` | `rgba(0,0,0,0.08)` | Séparateurs |
| `--admin-border-strong` | `rgba(0,0,0,0.14)` | Bordures emphase |
| `--admin-text` | `#111114` | Texte principal |
| `--admin-text-muted` | `#5f5862` | Labels secondaires |
| `--admin-text-subtle` | `#8a828e` | Hints, placeholders |
| `--admin-accent` | `#7b0b1d` | **Bordeaux** — liens actifs, focus, indicateur tab |
| `--admin-accent-hover` | `#8f1428` | Hover accent |
| `--admin-accent-bg` | `rgba(123,11,29,0.08)` | Fond sélection légère |
| `--admin-accent-subtle` | `rgba(123,11,29,0.12)` | Sélection texte |
| `--admin-accent-ring` | `rgba(123,11,29,0.3)` | Anneaux focus alternatifs |
| `--admin-cuivre` | `#b4895e` | Accent secondaire (rare) |
| `--admin-success` | `#1e7d45` | Validé, payé |
| `--admin-warning` | `#a35b12` | Attention, retard |
| `--admin-danger` | `#b72938` | Erreur, suppression |
| `--admin-info` | `#3e5a7a` | Information neutre |
| `--admin-overlay` | `rgba(26,18,21,0.38)` | Backdrop modals/sheets |

Chaque état sémantique expose aussi `*-bg`, `*-subtle`, `*-border` pour badges et alertes.

**PWA** : `theme_color` et `background_color` manifest = `#7B0B1D` (`src/lib/pwa/manifests.ts`, `app/admin/layout.tsx`).

**Stratégie couleur** : committed light-only — bordeaux unique sur neutres iOS, pas de palette multicolore décorative.

## Typography

Stack **SF system** — pas de Google Fonts, pas de Didot/Inter vitrine.

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", system-ui, -apple-system-body, sans-serif;
font-feature-settings: "ss01", "cv11";
```

| Variant (`tokens.ts`) | Taille | Poids | Usage |
|----------------------|--------|-------|-------|
| `display` | 32px | 700 | Titres hero rares |
| `h1` | 28px | 700 | Titres de page |
| `h2` | 20px | 600 | Sections |
| `h3` | 16px | 600 | Sous-sections |
| `body` | 15px | 400 | Texte courant |
| `bodyEm` | 15px | 600 | Emphase inline |
| `caption` | 13px | 400 | Métadonnées |
| `micro` | 11px | 500 | Labels tab bar (10px en UI) |

**Chiffres** : classe `.tnum` — tabular nums pour montants et compteurs.

**Tab bar labels** : `text-[10px]`, `font-bold` actif / `font-medium` inactif.

## Spacing & Layout

Grille **4px** (`tokens.space`). Pas de breakpoints — calibré **320–430px**.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--admin-app-max-width` | `430px` | Rail max (iPhone 14 Pro Max) |
| `--admin-header-height` | `56px` | Header sticky |
| `--admin-tab-bar-height` | `64px` | Hauteur tab bar (hors safe area) |
| `--admin-touch-min` | `44px` | Cible tactile iOS HIG |
| `--admin-scroll-bottom-pad` | `tab-bar + safe-area-bottom + 16px` | Padding bas listes |
| `--admin-sticky-cta-pad` | `0.75rem + safe-area + keyboard-inset` | Barres d'action fixes |
| `--admin-keyboard-inset` | `0px` (dynamique) | Offset clavier virtuel |

**Shell** (`AdminShell.tsx`) :

- `h-[100dvh] overflow-hidden` sur le conteneur racine.
- Header fixe + `#admin-scroll-root.admin-shell-scroll` scrollable.
- `admin-page-bottom-pad` / `admin-form-scroll-pad` sur le contenu.

**Desktop** : même rail 430px centré — pas d'expansion latérale.

## Safe Areas

Classes utilitaires et tokens `env()` :

| Classe / usage | CSS |
|----------------|-----|
| `.admin-safe-top` | `padding-top: env(safe-area-inset-top)` |
| `.admin-safe-bottom` | `padding-bottom: env(safe-area-inset-bottom)` |
| `.admin-tab-bar` | `padding-bottom/left/right: env(safe-area-inset-*)` |
| `html.admin-route-root` | `scroll-padding-top: safe-area-top + 6.5rem` |

Viewport : `viewportFit: cover` pour que le contenu respecte encoche et home indicator.

## Tab Bar

Composant : `src/app-shell/TabBar.tsx`. Styles : `.admin-tab-bar`, `.admin-tab-bar__inner`, `.admin-tab-bar__item`.

**Structure** :

- Fixée `bottom-0`, `max-w-[var(--admin-app-max-width)]`, centrée.
- 5 onglets primaires + bouton **Plus** (menu popover).
- Indicateur actif : barre 3px bordeaux en haut de l'onglet.
- Icônes Lucide 22px ; labels 10px.

**Onglets** :

| Label | Route | Match étendu |
|-------|-------|----------------|
| Tableau | `/admin` | exact |
| Produits | `/admin/catalogue` | + `/admin/perfumes`, `/admin/brands` |
| Commandes | `/admin/ordres` | préfixe |
| Vendre | `/admin/vendre` | préfixe |
| Compta | `/admin/compta` | + `/admin/lots` |
| Plus → Clients | `/admin/clients` | menu secondaire |

**Visuel** :

- Fond `color-mix(surface 92%, transparent)` + `backdrop-filter: saturate(180%) blur(20px)`.
- Bordure top `--admin-border`.
- `z-index: var(--admin-z-tab-bar)` (50) — sous sheets (70+).
- `transform: translateZ(0)` — isolation du scale Vaul sur `body`.

## Components

| Pattern | Notes |
|---------|-------|
| **Header** | `.admin-header-blur` — même blur que tab bar, `z-index: 40` |
| **Sheets** | Vaul ; handle `.admin-sheet-handle` ; z 70–71 |
| **Modals** | z 80–81 |
| **Command palette** | z 90 ; `Cmd+K` |
| **Toasts** | z 95 — au-dessus de tout |
| **Cartes** | `.admin-card-press` / `.tap-scale` — `:active scale(0.97)` |
| **Squelettes** | `.admin-skeleton` — pulse 1.6s |
| **Sticky CTA** | `.admin-sticky-cta-spacer` pour home indicator |
| **Progress nav** | `.admin-nav-route-progress` — barre indéterminée bordeaux |

**Radius** (`tokens.radius`) : `sm` 8px, `lg` 14px (menus Plus), `full` pour handles.

**Ombres** : `--admin-shadow-sm` à `--admin-shadow-xl` — teint bordeaux légère.

## Motion

| Token | Valeur |
|-------|--------|
| `--admin-duration-fast` | `100ms` |
| `--admin-duration-default` | `200ms` |
| `--admin-duration-slow` | `260ms` |
| `--admin-easing-default` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--admin-easing-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` |

- **Press** : `tap-scale` / `admin-card-press` → `scale(0.97)` ~100ms (Emil).
- **Hover** : `.admin-lift` uniquement `@media (hover: hover) and (pointer: fine)`.
- **Jamais** : `transition: all` sur éléments tactiles ; bounce/elastic.
- **`prefers-reduced-motion`** : neutralise press, squelettes, pulse nav.

## Stack

- Next.js 16 App Router, React 18, TypeScript
- Tailwind CSS + variables `--admin-*`
- Radix primitives via `src/ui/primitives/*`
- Lucide React (icônes)
- Vaul (bottom sheets)
- **Pas** de shadcn vitrine, **pas** de GFS Didot

## Theme Mode

**Light uniquement** — `color-scheme: light` sur `body.admin-route` et `.admin-theme`. Pas de bascule dark.

## Anti-patterns (registre product)

- Réutiliser tokens `--nurea-*` ou palette or/charbon vitrine.
- Serif display, uppercase tracking large façon landing.
- Layout > 430px utile (tableaux larges non scrollables).
- Oublier safe area ou padding tab bar sur listes longues.
- `h-screen` au lieu de `100dvh` / `-webkit-fill-available`.

## Self-audit (avant livraison UI admin)

1. L'action principale est-elle atteignable sans scroll excessif ?
2. Les états vide / chargement / erreur sont-ils guidants ?
3. Tous les tokens passent-ils par `--admin-*` ?
4. Tab bar masque-t-elle du contenu ou des toasts ?
5. Focus clavier et 44px respectés sur chaque contrôle ?

## Fichiers de référence

| Fichier | Rôle |
|---------|------|
| [`docs/admin/PRODUCT.md`](./PRODUCT.md) | Contexte produit, flows, contraintes PWA. |
| [`src/design/globals.admin.css`](../../src/design/globals.admin.css) | Feuille CSS admin complète. |
| [`src/design/tokens.ts`](../../src/design/tokens.ts) | Tokens TypeScript. |
| [`src/app-shell/TabBar.tsx`](../../src/app-shell/TabBar.tsx) | Navigation principale. |
| [`src/app-shell/AdminShell.tsx`](../../src/app-shell/AdminShell.tsx) | Layout shell. |
| [`app/admin/layout.tsx`](../../app/admin/layout.tsx) | Viewport, manifest, metadata PWA. |
