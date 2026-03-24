# Nuréa Parfums — Redesign Complet UI/UX

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesigner entièrement le frontend du site catalogue Nuréa Parfums avec la DA "Nuit Bordeaux" — palette bordeaux/noir violacé, typographie GFS Didot + Inter, brand kit NP, mobile-first, dark mode par défaut.

**Architecture:** Réécriture complète des composants existants en conservant la même structure de fichiers et le même data model (`src/lib/data.ts` reste inchangé). Chaque composant est réécrit avec la nouvelle DA, nouvelles couleurs, nouvelles fonts. Le design system (globals.css + tailwind.config.ts) est mis à jour en premier, puis chaque composant est redesigné séquentiellement.

**Tech Stack:** Next.js 16 (App Router), React 18, Tailwind CSS 3.4, next-themes, lucide-react, next/font/google (GFS Didot + Inter)

**Contrainte absolue :** `src/lib/data.ts` ne doit JAMAIS être modifié.

---

## Palette "Nuit Bordeaux"

| Token | Hex | Rôle |
|-------|-----|------|
| `--bg-deep` | `#0A0508` | Fond body (noir violacé) |
| `--surface` | `#140E12` | Cards, navbar, surfaces élevées |
| `--surface-hover` | `#1E151A` | Hover sur surfaces |
| `--accent` | `#8B3A3A` | CTA, hover, prix, liens actifs |
| `--accent-hover` | `#A44545` | Hover sur accent |
| `--text-primary` | `#F0E6E0` | Titres, texte principal (ivoire rosé) |
| `--text-muted` | `#6E5560` | Labels, descriptions secondaires |
| `--text-subtle` | `#4A3A42` | Placeholders, bordures textuelles |
| `--border` | `rgba(139,58,58,0.12)` | Bordures subtiles |
| `--border-hover` | `rgba(139,58,58,0.3)` | Bordures hover |
| `--cuivre` | `#C4956A` | Monogramme NP uniquement |

**Light mode (secondaire) :**

| Token | Hex |
|-------|-----|
| `--bg-deep` | `#F8F4F0` |
| `--surface` | `#FFFFFF` |
| `--accent` | `#8B3A3A` |
| `--text-primary` | `#1A1215` |
| `--text-muted` | `#8A7580` |

## Typographie

| Usage | Police | Poids | Google Fonts |
|-------|--------|-------|--------------|
| Display / Titres / Noms parfums / Prix | GFS Didot | 400 | Oui |
| UI / Nav / Body / CTA / Labels | Inter | 300, 400, 500, 600 | Oui |

## Assets Brand Kit (déjà en place)

| Asset | Chemin | Usage |
|-------|--------|-------|
| Logo horizontal dark | `/branding/logos/nurea-logo-horizontal-dark.png` | Header navbar |
| Logo horizontal light | `/branding/logos/nurea-logo-horizontal-light.png` | Header light mode |
| Monogramme NP libre cuivré | `/branding/monogram/np-free-cuivre.png` | Fond hero (5-8% opacité) |
| Monogramme NP cercle cuivré | `/branding/monogram/np-circle-cuivre.png` | Footer |
| Monogramme NP cercle ivoire | `/branding/monogram/np-circle-ivory.png` | Footer light |
| Icône WhatsApp bordeaux | `/branding/icons/nurea_icon_whatsapp_bordeaux.svg` | CTA |
| Icône WhatsApp ivoire | `/branding/icons/nurea_icon_whatsapp_ivory.svg` | CTA dark |
| Icône Snapchat bordeaux | `/branding/icons/nurea_icon_snapchat_bordeaux.svg` | CTA |
| Icône Snapchat ivoire | `/branding/icons/nurea_icon_snapchat_ivory.svg` | CTA dark |
| Séparateur bordeaux | `/branding/separators/nurea_separator_bordeaux.svg` | Entre sections |
| Séparateur cuivré | `/branding/separators/nurea_separator_copper.svg` | Variante |
| Favicon | `/favicon.ico` | Déjà en place |

---

## File Structure

### Fichiers modifiés (dans l'ordre)

| # | Fichier | Responsabilité |
|---|---------|---------------|
| 1 | `app/globals.css` | Design system : palette Nuit Bordeaux, tokens CSS, animations |
| 2 | `tailwind.config.ts` | Couleurs, fonts (GFS Didot + Inter), tokens Tailwind |
| 3 | `app/layout.tsx` | Fonts Google (GFS Didot + Inter), metadata, defaultTheme dark |
| 4 | `src/components/layout/Navbar.tsx` | Nouveau design navbar avec logo brand kit |
| 5 | `src/components/features/Hero.tsx` | Nouveau hero avec monogramme NP en fond |
| 6 | `src/components/features/PerfumeCard.tsx` | Nouvelles cards avec DA Nuit Bordeaux |
| 7 | `src/components/home/HomePageClient.tsx` | Layout home, filtres, grille catalogue |
| 8 | `src/components/features/SearchOverlay.tsx` | Overlay recherche redesignée |
| 9 | `src/components/layout/Footer.tsx` | Nouveau footer avec monogramme NP + icônes custom |
| 10 | `src/components/contact/ContactPageClient.tsx` | Wrapper contact (léger) |
| 11 | `src/components/features/ContactSection.tsx` | Page contact redesignée |
| 12 | `app/page.tsx` | Metadata mise à jour |

### Fichiers NON modifiés

- `src/lib/data.ts` — **NE PAS TOUCHER**
- `src/components/providers/ThemeProvider.tsx` — reste identique
- `package.json` — pas de nouvelles dépendances

---

## Tasks

### Task 1 : Design System — globals.css

**Files:**
- Modify: `app/globals.css` (réécriture complète)

- [ ] **Step 1: Réécrire globals.css avec la palette Nuit Bordeaux**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Nuit Bordeaux — Light mode */
    --background: 20 14% 95%;
    --foreground: 340 20% 9%;
    --card: 0 0% 100%;
    --card-foreground: 340 20% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 340 20% 9%;
    --primary: 0 41% 38%;
    --primary-foreground: 25 33% 92%;
    --secondary: 20 14% 95%;
    --secondary-foreground: 340 20% 9%;
    --muted: 340 10% 50%;
    --muted-foreground: 340 10% 50%;
    --accent: 0 41% 38%;
    --accent-foreground: 25 33% 92%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 41% 38% / 0.12;
    --input: 0 41% 38% / 0.12;
    --ring: 0 41% 38%;
    --radius: 0px;

    /* Nuréa tokens */
    --nurea-bg: #F8F4F0;
    --nurea-surface: #FFFFFF;
    --nurea-surface-hover: #F0EBE6;
    --nurea-accent: #8B3A3A;
    --nurea-accent-hover: #A44545;
    --nurea-text: #1A1215;
    --nurea-text-muted: #8A7580;
    --nurea-text-subtle: #B0A0A8;
    --nurea-cuivre: #C4956A;
    --nurea-border: rgba(139, 58, 58, 0.12);
    --nurea-border-hover: rgba(139, 58, 58, 0.3);
  }

  .dark {
    --background: 320 43% 2%;
    --foreground: 25 33% 92%;
    --card: 330 24% 7%;
    --card-foreground: 25 33% 92%;
    --popover: 330 24% 7%;
    --popover-foreground: 25 33% 92%;
    --primary: 0 41% 38%;
    --primary-foreground: 25 33% 92%;
    --secondary: 330 24% 7%;
    --secondary-foreground: 25 33% 92%;
    --muted: 330 15% 37%;
    --muted-foreground: 330 15% 37%;
    --accent: 0 41% 38%;
    --accent-foreground: 25 33% 92%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 41% 38% / 0.12;
    --input: 0 41% 38% / 0.12;
    --ring: 0 41% 38%;

    /* Nuréa tokens dark */
    --nurea-bg: #0A0508;
    --nurea-surface: #140E12;
    --nurea-surface-hover: #1E151A;
    --nurea-accent: #8B3A3A;
    --nurea-accent-hover: #A44545;
    --nurea-text: #F0E6E0;
    --nurea-text-muted: #6E5560;
    --nurea-text-subtle: #4A3A42;
    --nurea-cuivre: #C4956A;
    --nurea-border: rgba(139, 58, 58, 0.12);
    --nurea-border-hover: rgba(139, 58, 58, 0.3);
  }
}

@layer base {
  * {
    @apply border-[color:var(--nurea-border)];
  }
  body {
    @apply bg-[var(--nurea-bg)] text-[var(--nurea-text)];
    font-family: var(--font-sans);
  }
}

/* Scrollbar hide utility */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Scroll reveal animation */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

/* Stagger children */
.animate-stagger > * {
  animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.animate-stagger > *:nth-child(1) { animation-delay: 0.1s; }
.animate-stagger > *:nth-child(2) { animation-delay: 0.2s; }
.animate-stagger > *:nth-child(3) { animation-delay: 0.3s; }
.animate-stagger > *:nth-child(4) { animation-delay: 0.4s; }
.animate-stagger > *:nth-child(5) { animation-delay: 0.5s; }
.animate-stagger > *:nth-child(6) { animation-delay: 0.6s; }

/* Hero pulse line */
@keyframes pulseLine {
  0%, 100% { opacity: 0.3; transform: scaleY(0.8); }
  50% { opacity: 1; transform: scaleY(1); }
}
.animate-pulse-line {
  animation: pulseLine 2.5s ease-in-out infinite;
}

/* Card hover glow */
.card-glow {
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
}
.card-glow:hover {
  box-shadow: 0 0 30px rgba(139, 58, 58, 0.08);
  border-color: var(--nurea-border-hover);
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx next build`
Expected: Build réussi sans erreurs CSS

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: nouvelle palette Nuit Bordeaux et design tokens Nuréa"
```

---

### Task 2 : Tailwind Config + Fonts

**Files:**
- Modify: `tailwind.config.ts` (réécriture)
- Modify: `app/layout.tsx` (nouvelles fonts + default dark)

- [ ] **Step 1: Réécrire tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        nurea: {
          bg: "var(--nurea-bg)",
          surface: "var(--nurea-surface)",
          "surface-hover": "var(--nurea-surface-hover)",
          accent: "var(--nurea-accent)",
          "accent-hover": "var(--nurea-accent-hover)",
          text: "var(--nurea-text)",
          muted: "var(--nurea-text-muted)",
          subtle: "var(--nurea-text-subtle)",
          cuivre: "var(--nurea-cuivre)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 2: Réécrire app/layout.tsx avec GFS Didot + Inter**

```tsx
import type { Metadata } from "next";
import { GFS_Didot, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const gfsDidot = GFS_Didot({
  weight: "400",
  subsets: ["greek"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nureaparfums.com"),
  title: {
    default: "Nuréa Parfums — Maison de Haute Parfumerie",
    template: "%s | Nuréa Parfums",
  },
  description:
    "Découvrez notre sélection privée de parfums d'exception. Fragrances rares et signatures olfactives, disponibles sur commande.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${gfsDidot.variable} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Vérifier que le dev server lance**

Run: `npm run dev`
Expected: Aucune erreur, page s'affiche (même si le style est cassé temporairement)

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/layout.tsx
git commit -m "style: tailwind config Nuit Bordeaux + fonts GFS Didot + Inter"
```

---

### Task 3 : Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire Navbar.tsx**

Nouveau design :
- Logo : image `/branding/logos/nurea-logo-horizontal-dark.png` (dark) / `nurea-logo-horizontal-light.png` (light) via `useTheme`
- Fond : transparent → `var(--nurea-surface)` avec backdrop-blur-xl au scroll
- Bordure bottom subtile au scroll : `var(--nurea-border)`
- Mobile : burger gauche, logo centré, search + theme à droite
- Desktop : logo gauche, liens centrés (La Collection, Contact), icônes droite
- Menu burger : plein écran, fond `var(--nurea-bg)`, liens en serif GFS Didot, grande taille
- Couleurs texte : `var(--nurea-text)`, muted : `var(--nurea-text-muted)`, active : `var(--nurea-accent)`
- Transition douce sur tous les éléments interactifs
- Z-index : navbar z-50, menu mobile z-[60]
- Height : h-16 mobile, h-20 desktop
- Next/Image pour le logo (priority, width auto adapté)

Le composant garde les mêmes props (`scrolled`, `onOpenFilters`).

- [ ] **Step 2: Tester visuellement**

Run: `npm run dev` → ouvrir localhost:3000
Check: Navbar s'affiche avec nouveau logo, scroll change le fond, burger fonctionne, theme toggle fonctionne

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: navbar redesign DA Nuit Bordeaux avec logo brand kit"
```

---

### Task 4 : Hero

**Files:**
- Modify: `src/components/features/Hero.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire Hero.tsx**

Nouveau design :
- 100vh, flex center, position relative
- **Fond** : `var(--nurea-bg)` avec monogramme NP libre cuivré en arrière-plan (next/image, absolute, centered, opacity 5-8%, 500x500px, pointer-events-none)
- **Lueur** : radial-gradient bordeaux subtil derrière le titre (pseudo-element ::before)
- **Overline** : "Maison de Parfums" en Inter 500, 11px, uppercase, letter-spacing 0.4em, couleur `var(--nurea-accent)`
- **Titre** : "L'Art de la Séduction" en GFS Didot, italic, clamp(40px, 8vw, 72px), couleur `var(--nurea-text)`, text-center
- **Tagline** : 2 lignes descriptives en Inter 300, 14px, couleur `var(--nurea-text-muted)`, max-w-md
- **CTA** : bouton bordé bordeaux, Inter 500, 12px, uppercase, letter-spacing 0.2em, hover → fond bordeaux 15% opacité
- **Ligne décorative** : div absolute bottom, w-[1px] h-20, gradient du bordeaux vers transparent, animation pulseLine
- Tous les éléments texte avec animate-fade-in-up staggeré
- Smooth scroll vers `#collection` au clic CTA

- [ ] **Step 2: Tester visuellement**

Vérifier : monogramme en fond, texte centré, animation au load, CTA scroll, responsive mobile (titre adaptatif)

- [ ] **Step 3: Commit**

```bash
git add src/components/features/Hero.tsx
git commit -m "feat: hero section avec monogramme NP et DA Nuit Bordeaux"
```

---

### Task 5 : PerfumeCard

**Files:**
- Modify: `src/components/features/PerfumeCard.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire PerfumeCard.tsx**

Nouveau design :
- Fond card : `var(--nurea-surface)`, border `var(--nurea-border)`
- Hover : class `card-glow` (défini dans globals.css), image scale 1.03
- **Image** : aspect-[3/4], next/image fill, object-cover, transition transform 0.5s
- **Tags** : absolute top-3 left-3, Inter 500, 9px, uppercase, letter-spacing 0.15em, fond `var(--nurea-accent)`, texte `var(--nurea-text)`, px-2 py-1
- **Info (sous l'image)** : padding 16px
  - Brand : Inter 500, 9px, uppercase, letter-spacing 0.25em, couleur `var(--nurea-accent)`
  - Nom : GFS Didot, 18px, couleur `var(--nurea-text)`, line-clamp-1
  - Prix : GFS Didot, 16px, couleur `var(--nurea-accent)`, margin-top 4px
- **Overlay au tap/hover** : fond noir 85% opacité, flex column center
  - Pour Gammes Complètes : liste des classiques en boutons, chaque → lien WhatsApp
  - Pour individuels : 2 boutons (WhatsApp + Snapchat) avec icônes custom SVG du brand kit
  - Boutons : bordé `var(--nurea-border-hover)`, Inter 500, 11px, hover → fond `var(--nurea-accent)` 20%
- Transition overlay : opacity + backdrop-blur, cubic-bezier(0.16, 1, 0.3, 1)

Le composant garde les mêmes props.

- [ ] **Step 2: Tester visuellement**

Vérifier : cards s'affichent, hover glow + scale, overlay CTA WhatsApp/Snap fonctionne, responsive 1→2→3 cols

- [ ] **Step 3: Commit**

```bash
git add src/components/features/PerfumeCard.tsx
git commit -m "feat: perfume cards redesign DA Nuit Bordeaux"
```

---

### Task 6 : HomePageClient (layout + filtres + grille)

**Files:**
- Modify: `src/components/home/HomePageClient.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire HomePageClient.tsx**

Structure :
- Navbar (inchangé en termes de props)
- Hero
- **Section #collection** : padding-top 80px
  - **En-tête catégorie** : "La Collection" en GFS Didot 28px + compteur résultats en Inter muted
  - **Tabs catégories** : scroll horizontal, Inter 500, 12px, uppercase, letter-spacing 0.15em
    - Inactif : couleur `var(--nurea-text-muted)`, border-bottom transparent
    - Actif : couleur `var(--nurea-accent)`, border-bottom `var(--nurea-accent)` 2px
  - **Bouton Affiner** : avec badge compteur si filtres actifs, Inter, bordé
  - **Filtres actifs** : chips removable, fond `var(--nurea-surface)`, bordé, Inter 11px
  - **Grille** : grid cols-1 sm:cols-2 lg:cols-3, gap-4, max-w-[1200px] mx-auto
  - **Séparateur Nuréa** : image SVG `/branding/separators/nurea_separator_bordeaux.svg` entre hero et catalogue, opacity 40%, max-w-[200px] mx-auto
  - **No results** : message centré en GFS Didot + suggestion en Inter muted
- **Stagger animation** : les cards apparaissent avec fadeInUp décalé (via animate-stagger ou style inline animation-delay basé sur l'index)
- SearchOverlay
- Footer

Conserver toute la logique métier existante (filtres, fuzzy search, état).

- [ ] **Step 2: Tester visuellement**

Vérifier : filtres fonctionnent, recherche fuzzy, catégories, grille responsive, animations stagger, séparateur visible

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomePageClient.tsx
git commit -m "feat: home page layout redesign avec filtres et grille Nuit Bordeaux"
```

---

### Task 7 : SearchOverlay

**Files:**
- Modify: `src/components/features/SearchOverlay.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire SearchOverlay.tsx**

Nouveau design :
- Plein écran fixe z-[55], fond `var(--nurea-bg)` 98% opacité + backdrop-blur-2xl
- **Header** : "Recherche" en GFS Didot 24px + bouton close (X, couleur muted, hover accent)
- **Input** : GFS Didot, clamp(24px, 5vw, 40px), italic, border-bottom 1px `var(--nurea-border)`, focus → `var(--nurea-accent)`, placeholder en `var(--nurea-text-subtle)`, fond transparent
- **Résultats live** (si searchTerm) :
  - Compteur : Inter 12px muted
  - Cards résultats : flex row, image 48x64 rounded-none, nom en GFS Didot 16px, brand en Inter 10px accent uppercase
  - Max 8 résultats
  - Hover : fond `var(--nurea-surface-hover)`
- **Section filtres** (sous le search) :
  - 2 colonnes : Marques | Catégories
  - Titres : Inter 10px uppercase letter-spacing 0.25em muted
  - Items : Inter 13px, hover → accent, selected → accent + italic
- **Footer overlay** : "Tout effacer" + compteur + "Voir le catalogue" bouton accent
- Transition entrée : opacity 0→1 + légère translate-y

Conserver les mêmes props.

- [ ] **Step 2: Tester visuellement**

Vérifier : overlay s'ouvre/ferme, recherche fonctionne, résultats live, sélection marques/catégories

- [ ] **Step 3: Commit**

```bash
git add src/components/features/SearchOverlay.tsx
git commit -m "feat: search overlay redesign DA Nuit Bordeaux"
```

---

### Task 8 : Footer

**Files:**
- Modify: `src/components/layout/Footer.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire Footer.tsx**

Nouveau design :
- Fond : `var(--nurea-bg)`, border-top `var(--nurea-border)`
- **Monogramme NP** : centré en haut du footer, next/image `/branding/monogram/np-circle-cuivre.png` (dark) / `np-circle-bordeaux.png` (light), 64x64, opacity 60%
- **Séparateur** : image SVG séparateur copper sous le monogramme, max-w-[120px], opacity 30%
- **Liens sociaux** : flex center gap-6
  - WhatsApp : icône custom SVG `/branding/icons/nurea_icon_whatsapp_ivory.svg`, hover opacity
  - Snapchat : icône custom SVG `/branding/icons/nurea_icon_snapchat_ivory.svg`, hover opacity
  - Taille icônes : 24x24
- **Texte** : Inter 11px, `var(--nurea-text-muted)`, text-center
  - "Nuréa Parfums — Maison de Haute Parfumerie"
  - Links : "Contact" | "Mentions légales"
  - "© 2025 Nuréa Parfums. Tous droits réservés."
- Padding : py-16

- [ ] **Step 2: Tester visuellement**

Vérifier : monogramme visible, icônes sociales, texte lisible, responsive

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat: footer redesign avec monogramme NP et icônes custom"
```

---

### Task 9 : Contact Page

**Files:**
- Modify: `src/components/contact/ContactPageClient.tsx` (légère mise à jour)
- Modify: `src/components/features/ContactSection.tsx` (réécriture complète)

- [ ] **Step 1: Réécrire ContactSection.tsx**

Nouveau design :
- **Hero compact** : "Conciergerie Privée" overline accent, "L'Art de l'Échange" titre GFS Didot 36px, description Inter muted
- **2 colonnes desktop** (stack mobile) :
  - **Gauche** : 2 gros boutons CTA
    - WhatsApp : fond `var(--nurea-surface)`, bordé, icône custom SVG + texte Inter, hover → bordure accent + fond surface-hover
    - Snapchat : même style, hover → bordure jaune #FFD100
    - Chaque bouton : height 80px, flex align-center, gap-4, icône 32x32
  - **Droite** : formulaire
    - Fond : `var(--nurea-surface)`, padding 32px
    - Inputs : border-bottom `var(--nurea-border)`, fond transparent, Inter 14px, focus → border accent
    - Labels flottants : Inter 10px uppercase letter-spacing, animate up on focus/fill, couleur muted → accent on focus
    - Submit : fond `var(--nurea-accent)`, texte `var(--nurea-text)`, Inter 12px uppercase, hover → accent-hover
    - Success state : monogramme NP + "Merci pour votre confiance" en GFS Didot

Conserver la même logique de formulaire.

- [ ] **Step 2: Tester visuellement**

Vérifier : page /contact, CTA sociaux, formulaire, labels flottants, soumission, success state

- [ ] **Step 3: Commit**

```bash
git add src/components/contact/ContactPageClient.tsx src/components/features/ContactSection.tsx
git commit -m "feat: contact page redesign DA Nuit Bordeaux"
```

---

### Task 10 : Polish final + metadata

**Files:**
- Modify: `app/page.tsx` (metadata update)
- Éventuels ajustements cross-composants

- [ ] **Step 1: Mettre à jour les metadata dans app/page.tsx**

```tsx
import { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";

export const metadata: Metadata = {
  title: "Collection — Nuréa Parfums",
  description:
    "Explorez notre sélection privée de fragrances d'exception. Parfums rares et signatures olfactives disponibles sur commande via WhatsApp.",
};

export default function Home() {
  return <HomePageClient />;
}
```

- [ ] **Step 2: Test complet responsive**

Run: `npm run dev`
Tester sur :
- Mobile 375px : navigation, hero, catalogue scroll, cards, overlay, footer, contact
- Tablet 768px : grille 2 cols, hero, overlay
- Desktop 1280px : grille 3 cols, navbar desktop, hero plein écran

- [ ] **Step 3: Vérifier le build production**

Run: `npx next build`
Expected: Build réussi, 0 erreurs, 0 warnings critiques

- [ ] **Step 4: Commit final**

```bash
git add app/page.tsx
git commit -m "feat: metadata mise à jour + polish final redesign Nuréa"
```

---

## Ordre d'exécution

```
Task 1 (globals.css) → Task 2 (tailwind + layout) → Task 3 (Navbar) → Task 4 (Hero)
→ Task 5 (PerfumeCard) → Task 6 (HomePageClient) → Task 7 (SearchOverlay)
→ Task 8 (Footer) → Task 9 (Contact) → Task 10 (Polish)
```

Chaque task est indépendante une fois le design system en place (Tasks 1-2). Les Tasks 3-9 peuvent être parallélisées par paires si des subagents sont disponibles, mais l'ordre séquentiel est recommandé pour valider visuellement au fur et à mesure.

## Notes pour l'implémenteur

- **Ne JAMAIS modifier `src/lib/data.ts`** — le data model est figé
- Utiliser `var(--nurea-*)` pour toutes les couleurs, jamais de hex en dur dans les composants
- `font-serif` = GFS Didot (titres, noms, prix) / `font-sans` = Inter (tout le reste)
- Les images du brand kit sont en PNG — utiliser next/image avec priority sur le logo navbar
- Les icônes sociales custom sont en SVG — les inliner ou les charger via next/image
- Le site doit être fonctionnel à chaque commit (pas de breaking changes entre tasks)
- Dark mode = défaut. Light mode = variante. Toujours vérifier les deux.
