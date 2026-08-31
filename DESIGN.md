---
name: Nuréa Parfums — Vitrine
version: 3
register: brand
source: Charte graphique Nuréa Parfums v3
---

# Nuréa Parfums — Système de design de la vitrine

Ce document décrit le registre **vitrine** (`app/(shop)/*`, `src/components/*`).
Le registre gestion a le sien : [`docs/admin/DESIGN.md`](docs/admin/DESIGN.md).

Les valeurs viennent de la charte graphique v3. Elles existent à deux endroits,
et à deux seulement :

| Où | Quoi | Pour qui |
|---|---|---|
| [`app/globals.css`](app/globals.css) | variables CSS `--nurea-*`, classes de rôle | tout le rendu |
| [`src/design/brand.ts`](src/design/brand.ts) | mêmes valeurs en TypeScript | ce qui ne lit pas de CSS : `next/og`, manifeste PWA, `themeColor` |

Toute modification de l'un doit être reportée dans l'autre.

## Trois règles

Elles ne souffrent pas d'exception. Si un écran a besoin d'y déroger, c'est
l'écran qu'il faut revoir.

1. **Angles 0.** Aucun arrondi, nulle part — boutons et images compris.
2. **Aucune ombre.** On sépare au filet 1 px, jamais à la carte flottante.
   Les blocs partagent leurs bords.
3. **Survol : la couleur seule**, en 160 ms `ease-out`. Jamais de déplacement,
   jamais d'agrandissement.

## Couleurs

Quatre couleurs de marque, répartition visée **74 / 18 / 6 / 2**.

| Jeton | Sombre | Rôle |
|---|---|---|
| `--nurea-bg` | `#0A0508` noir | fond de tout |
| `--nurea-text` | `#FDF8F4` ivoire | texte — 19,2:1 |
| `--nurea-accent` | `#C4956A` cuivre | accent, filets — 7,6:1. Au plus 8 % d'un visuel |
| `--nurea-bordeaux` | `#7B0B1D` | sceau, cachet. Un seul aplat par support |

Teintes de support, écran uniquement :

| Jeton | Sombre | Contraste sur le fond |
|---|---|---|
| `--nurea-surface` | `#140E12` | — |
| `--nurea-surface-hover` | `#1C1418` | — |
| `--nurea-text-muted` | `#E4D2DA` | 14,0:1 |
| `--nurea-text-subtle` | `#B49FAB` | 8,2:1 |
| `--nurea-text-disabled` | `#6E5A64` | épuisé, désactivé |
| `--nurea-alert` | `#D88080` | **erreurs seules** — jamais un accent |

Les teintes sont déclarées en **canaux RVB** (`--nurea-accent-rgb: 196 149 106`).
Cela ouvre les modificateurs d'opacité Tailwind (`bg-nurea-bg/85`) et permet de
*dériver* les valeurs translucides au lieu de les recopier : le filet est
littéralement « le cuivre à 16 % ».

### Mode clair — hors charte

La charte ne décrit qu'une palette sombre. Le thème clair prolonge ses deux
seuls usages sur ivoire — le bordeaux et le gris de la carte de main — en
gardant ses paliers de contraste (≥ 7:1 pour tout texte courant).

Une conséquence structurante : **le cuivre tombe à 2,5:1 sur ivoire**. Il n'y
porte donc aucun texte, seulement des filets et des aplats, et l'accent devient
le bordeaux (10,4:1).

| Jeton | Clair | Contraste |
|---|---|---|
| `--nurea-bg` | `#FDF8F4` | — |
| `--nurea-text` | `#0A0508` | 19,2:1 |
| `--nurea-accent` | `#7B0B1D` | 10,4:1 |
| `--nurea-text-muted` | `#3D343A` | 11,4:1 |
| `--nurea-text-subtle` | `#544D58` | 7,7:1 |
| `--nurea-alert` | `#9B1020` | 8,0:1 |

## Typographie

Deux familles à faible contraste, chargées par
[`src/design/fonts.ts`](src/design/fonts.ts). Aucun délié fin : elles restent
nettes à 12 px sur écran de téléphone, ce que la didone ne faisait pas.

- **Newsreader** — titres et noms de parfum. Graisses 400 et 500, jamais plus.
- **Instrument Sans** — texte et interface. Graisses 400, 500, 600, jamais sous 400.

Une classe par rôle, définie dans `app/globals.css`. Les tailles sont fluides et
ne descendent jamais sous les minimums de la charte (Newsreader 20 px,
Instrument Sans 11 px).

| Classe | Police | Taille / interligne |
|---|---|---|
| `.nurea-title` | Newsreader 500 | 32 → 56 / 1,08 / −0,015 em |
| `.nurea-section-title` | Newsreader 500 | 28 → 40 / 1,1 |
| `.nurea-name` | Newsreader 500 | 20 → 24 / 1,3 |
| `.nurea-body` | Instrument 400 | 16 / 1,8 |
| `.nurea-label` | Instrument 600 | 11 / 0,18 em capitales |
| `.nurea-caption` | Instrument 400 | 12,5 / 1,75 |

**N'écrivez pas de taille en dur.** Une taille arbitraire (`text-[13.5px]`) est
le signe qu'un rôle manque — ajoutez-le ici plutôt que de le contourner.

## Grille & espacement

Base 4 px. Échelle : **8 · 16 · 24 · 40 · 72**. Aucune valeur hors échelle.

| Règle | Valeur |
|---|---|
| Marge de page | 72 px · 24 px sur mobile — classe `.nurea-page` |
| Largeur de texte | 640 px maximum — classe `.nurea-prose` |
| Gouttière | 24 px |
| Filets | 1 px, cuivre à 16 % |

Un filet entre deux blocs se pose de préférence par la **gouttière** : une
grille à `gap: 1px` sur fond `--nurea-border`, chaque cellule reprenant le fond
de page. Les blocs partagent alors littéralement leur bord, sans bordure à
attribuer à l'un ou à l'autre (`.nurea-editorial`, page contact, principes).

## Composants

Les briques vivent dans `src/components/ui/` :

- [`Button`](src/components/ui/Button.tsx) — trois variantes, pas une de plus :
  `solid` (aplat cuivre), `outline` (filet), `link` (texte souligné).
  `buttonClass()` habille un `next/link` sans recréer un composant polymorphe.
- [`Field`](src/components/ui/Field.tsx) — libellé, contrôle, erreur. L'état
  visuel dérive d'`aria-invalid` : il ne peut pas diverger de l'état annoncé.
- [`ScrollReveal`](src/components/ui/ScrollReveal.tsx) — opacité et 12 px de
  montée, une seule fois. **Pas de variante de direction** : la charte n'admet
  ni entrée latérale ni agrandissement.

**Un seul bouton plein par écran.** Sur l'accueil, c'est celui du bandeau
d'ouverture ; toutes les autres incitations sont au filet ou en lien texte.

### Fiche produit

Ordre imposé : **marque, nom, contenance**. Le prix n'apparaît jamais en
grille, seulement dans l'échange direct. Une ligne dont la donnée manque est
omise — mieux vaut une ligne absente qu'une contenance inventée.

### États

| État | Traitement |
|---|---|
| Repos | `--nurea-surface` |
| Survol | `--nurea-surface-hover` |
| Focus | filet cuivre 1 px, `outline-offset: -2px` |
| Épuisé | 40 % d'opacité |

## Images bi-thème

Règle métier : l'image principale **est** la variante sombre ; `imageLight` est
une variante claire facultative.

La bascule est faite **en CSS** (`dark:`), jamais en JavaScript — voir
[`PerfumeImage`](src/components/features/PerfumeImage.tsx) et
[`BrandLogo`](src/components/layout/BrandLogo.tsx). Les grilles restent ainsi
rendues côté serveur et rien ne clignote en attendant le thème résolu. Sans
variante claire — le cas courant — une seule image est demandée.

## Coque

La barre de navigation et le pied de page vivent dans
[`app/(shop)/layout.tsx`](app/(shop)/layout.tsx), qui rend aussi l'unique
`<main id="main-content">`. Les pages ne rendent que leur contenu : ni barre,
ni pied, ni `<main>`.

## Interdits

- Déformer, incliner ou faire pivoter le monogramme.
- Ombre portée, biseau, vernis, dégradé sur le logo.
- Poser le monogramme **nu** sur une photo — la version cerclée est obligatoire.
- Fond hors palette.
- Écrire « Nurea » sans accent aigu.
- Le cuivre ne porte jamais de texte courant sur fond ivoire.
