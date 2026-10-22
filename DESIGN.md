---
name: Nuréa Parfums — Vitrine
version: 4
register: brand
source: docs/refonte-vitrine/04-PLAN-EXECUTION.md § B (DA « Nuancier nocturne », 20/10/2026)
---

# Nuréa Parfums — Système de design de la vitrine

Ce document décrit le registre **vitrine** (`app/(shop)/*`, `src/components/*`).
Le registre gestion a le sien : [`docs/admin/DESIGN.md`](docs/admin/DESIGN.md). Rien d'ici ne s'y
applique.

**Statut (20/10/2026).** La refonte est en cours. Ce document décrit le site **visé** ; tant que la
refonte n'est pas en ligne, le code de production montre encore l'ancien rendu. La source chiffrée
est [`docs/refonte-vitrine/04-PLAN-EXECUTION.md`](docs/refonte-vitrine/04-PLAN-EXECUTION.md) § B :
en cas d'écart, c'est lui qui a raison, et ce fichier qu'il faut corriger. Les règles de métier, de
droit et de référencement sont dans
[`docs/refonte-vitrine/01-INVARIANTS.md`](docs/refonte-vitrine/01-INVARIANTS.md).

Les valeurs existent à deux endroits, et à deux seulement :

| Où | Quoi | Pour qui |
|---|---|---|
| [`app/globals.css`](app/globals.css) | jetons CSS (primitifs `--n-*`, sémantiques `--bg`, `--text-1`…), règles de rôle | tout le rendu |
| [`src/design/brand.ts`](src/design/brand.ts) | hex des deux thèmes | ce qui ne lit pas de CSS : `next/og`, manifeste, `themeColor` |

Toute modification de l'un est reportée dans l'autre.

## Concept : « Nuancier nocturne »

**Une chambre neutre et calme, signée aux couleurs de Nuréa ; la couleur vive est celle du flacon qu'on
regarde.** Deux couleurs seulement : la **couleur de marque** (doré en sombre, bordeaux en clair, celles du
monogramme) et la **couleur d'ambiance** de chaque parfum, teinte dominante de son visuel, calculée, bornée,
posée sur la fiche et sur la carte pressée. Tout le reste est un
neutre chaud teinté, en deux thèmes symétriques. Structure, matière et mouvement s'inspirent des
interfaces d'Apple ; rien ne doit faire « site généré ».

## Couleurs

Deux couches : primitifs (`--n-*`), puis jetons sémantiques. Un thème ne redéfinit **que** le
sémantique. En CSS on écrit `oklch()` ; le hex sert à `brand.ts`.

**Thèmes.** Clair et sombre, `prefers-color-scheme` par défaut (sombre si le système ne dit rien),
bascule manuelle conservée.

| Jeton | Sombre | Clair | Rôle |
|---|---|---|---|
| `--bg` | `oklch(0.16 0.02 20)` `#150A0A` | `oklch(0.975 0.012 75)` `#FCF6EE` | fond de page |
| `--surface-1` | `oklch(0.21 0.019 20)` `#201515` | `oklch(0.945 0.014 72)` `#F3ECE3` | carte, champ, barre (opaque) |
| `--surface-2` | `oklch(0.26 0.018 20)` `#2C2120` | `oklch(0.91 0.010 65)` `#E9E0D6` | carte pressée, puce active, popover |
| `--line` | `oklch(0.34 0.016 22)` `#403534` | `oklch(0.84 0.018 62)` `#D3C8BF` | filet 1 px (décoratif) |
| `--text-1` | `oklch(0.95 0.016 75)` `#F5EDE3` | `oklch(0.22 0.025 20)` `#251616` | titres, noms, boutons |
| `--text-2` | `oklch(0.78 0.022 70)` `#C1B5A9` | `oklch(0.42 0.03 20)` `#5D4746` | texte courant, marque |
| `--text-3` | `oklch(0.66 0.024 65)` `#9D9083` | `oklch(0.48 0.03 20)` ≈ `#6E5757` | légendes, placeholder |
| `--error` | `oklch(0.74 0.13 20)` `#F28788` | `oklch(0.50 0.16 20)` `#AC2F3B` | erreur de formulaire seulement |
| `--focus` | = `--text-1` | = `--text-1` | anneau de focus 2 px, décalé 2 px |

Contrastes calculés (WCAG) : `--text-1` ≥ 13:1, `--text-2` ≥ 6,5:1, `--text-3` ≥ 4,9:1 sur toutes
les surfaces, dans les deux thèmes ; `--error` ≥ 6:1 sur `--bg`.

**Aucune autre couleur n'existe dans la vitrine.** Jamais `#000` ni `#fff`, jamais de violet ou
d'indigo, jamais de texte en dégradé (tenu par `tests/architecture/anti-slop.test.ts`).

**Couleur de marque Nuréa (décision du gérant, 21/10/2026)** : les deux couleurs du monogramme — **doré `#C4956A` en thème sombre, bordeaux `#8B3A3A` en thème clair** — sont le jeton `--accent` (`--on-accent` pour le texte posé dessus ; 7,3:1 et 7,1:1 sur le fond, ≥ 5,8:1 sur toutes les surfaces). Elles portent l'identité de la maison : logotype, monogramme, moments de marque de l'accueil. Garde-fous : jamais en fond de toute la page, jamais en dégradé ni en bordure décorative, jamais à la place de l'ambiance (qui reste la couleur de chaque parfum) ; dans l'accueil : le logo de la barre, l'étiquette NP de la photo du flacon.

**Le couple Nuréa** (21/10/2026) : chaque thème est un couple du monogramme, et les deux se répondent. **Sombre** : une nuit teintée bordeaux (fonds, teinte 20) sous des encres ivoire-champagne (textes, teinte 65 → 75) et le doré. **Clair** : un papier ivoire (fonds, teinte 62 → 75) sous une encre noir-bordeaux (textes, teinte 20) et le bordeaux. Le fond d'un thème est de la famille d'encre de l'autre. Les luminances n'ont pas bougé : les contrastes sont ceux d'avant.

**Où vit l'accent** — ce qui agit et ce qui est choisi, rien d'autre : le bouton principal (`solid`, survol `--accent-hover`), l'anneau clavier (`--focus`), un filtre ou une densité actifs (filet et texte accent sur `--accent-wash`), une case cochée, la pastille de la sélection, la page en cours dans la barre, le lien d'évitement, la sélection de texte, le souligné des liens au survol. Aucun titre en accent (l'exception du mot « Nuréa » dans le titre de la hero est tombée avec l'accroche du 21/10). Les titres, le texte courant, les cartes et les fonds restent neutres.

| Jeton | Sombre | Clair | Rôle |
|---|---|---|---|
| `--accent` | `oklch(0.704 0.081 63.4)` `#C4956A` (doré) | `oklch(0.458 0.111 22.5)` `#8B3A3A` (bordeaux) | couleur de marque |
| `--on-accent` | = `--bg` sombre | = `--bg` clair | texte sur l'accent |
| `--accent-hover` | vers `--text-1` (plus clair) | vers `--text-1` (plus profond) | survol du bouton principal |
| `--accent-wash` | accent à 14 % | accent à 14 % | fond d'un état choisi |

### Couleur d'ambiance

Une teinte par parfum, calculée **hors ligne** sur la vignette sombre `…-640.webp` (jamais dans le
navigateur), stockée en base (`Perfume.ambientHue`, `Perfume.ambientChroma`, nullables) et lue
comme deux jetons : `--amb` (sombre) et `--amb-light`.

- Dérivation : sombre `oklch(0.27 clamp(c × 0,6 ; 0,03 ; 0,08) h)`, clair
  `oklch(0.93 clamp(c × 0,35 ; 0,02 ; 0,05) h)`.
- Contraste **calculé** sur l'ambiance : `--text-1` ≥ 7:1 et `--text-3` ≥ 4,5:1, sinon on recule
  vers `--bg`, puis on renonce.
- **Repli** : pas assez de couleur dans la photo, ou contraste impossible → `NULL`, la fiche reste
  sur `--surface-1`. Jamais une teinte inventée.
- Où : fond de la fiche (feuille et page), carte pressée ou survolée, en-tête de la page marque
  (moyenne des parfums de la marque). **Jamais** le fond de toute la page, la barre ou le texte.

Algorithme complet : `04-PLAN-EXECUTION.md` § B.3 ; script : `scripts/refonte-vitrine/ambiance.mjs`.

## Typographie

Couple choisi au point de contrôle 1 (20/10/2026) : **Fraunces + Figtree**. Toutes deux variables,
licence libre (OFL), auto-hébergées par `next/font/google` (téléchargées au build, servies depuis
le site, conformes à la CSP). Budget total des fichiers de police : **≤ 120 Ko**, mesuré au build.

| Police | Rôle | Réglages | Graisses |
|---|---|---|---|
| **Fraunces** | titres, noms de parfum | axe optique `opsz` actif, `SOFT` 0, `WONK` 0 | 400, 500 |
| **Figtree** | texte et interface | chiffres tabulaires | 400, 500, 600 |

Jamais d'autre graisse, jamais une troisième famille, jamais de monospace.

| Rôle | Taille | Graisse | Interlettrage | Interlignage | Usage |
|---|---|---|---|---|---|
| `display` | `clamp(3rem, 2rem + 4vw, 5rem)` | 400 | −0,02 em | 1,05 | H1 de l'accueil, La parfumerie |
| `title` | `clamp(1.75rem, 1.25rem + 2vw, 2.5rem)` | 500 | −0,015 em | 1,15 | H1 des pages, nom en fiche |
| `subtitle` | `1.3125rem` | 500 | −0,005 em | 1,3 | H2, nom en carte |
| `body` | `1rem` | 400 | 0 | 1,6 | texte, marque en carte (`--text-2`) |
| `caption` | `0.75rem` | 500 | +0,02 em | 1,4 | compteur, mention légale |

Un thème ne change **que des couleurs** : aucune dimension (interlignage, espacement, rayon) ne dépend
du thème, sinon la bascule déplace la page (tenu par `tests/architecture/vitrine-tokens.test.ts`).

Une règle par rôle ; **aucune taille en dur** (une taille arbitraire signale un rôle manquant).
`text-wrap: balance` sur `display`/`title`, `pretty` sur `body` ; `tabular-nums` sur ce qui
s'aligne ; `hyphens: auto` avec `lang="fr"` ; mesure ≤ 65 caractères ; espace insécable dans
« Nuréa Parfums ». Repli métrique (`adjustFontFallback`) obligatoire.

Interdites : Inter, Roboto, Arial, Open Sans, Lato, Montserrat, Poppins.

## Espace, formes, couches

- **Espacement** (base 4 px) : `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-6` 24 · `-8` 32 ·
  `-12` 48 · `-16` 64 · `-24` 96 ; entre sections `--space-section: clamp(3rem, 2rem + 4vw, 6rem)`.
- **Page** : gouttière 16 px (téléphone), 24 px (≥ 768), 32 px (≥ 1024) ; contenu ≤ 1280 px.
- **Grille** : 2 colonnes par défaut sur téléphone (1 au choix sous 400 px), 3 à 768, 4 à 1024 ;
  écart 12 px (2 col.), 16 px (3 col. et plus). Points de rupture 640 / 768 / 1024.
- **Rayons** : `--r-sm` 6 px (puce, badge) · `--r-md` 12 px (bouton, champ, visuel en carte) ·
  `--r-lg` 20 px (carte, popover) · `--r-xl` 28 px (feuille, en haut seulement) · `--r-full`
  (cœur, pastille compteur). Règle concentrique : rayon intérieur = rayon extérieur − marge.
- **Ombre** : une seule, `--shadow-float`, pour ce qui flotte (feuille, popover). Les cartes n'en
  ont pas : filet `--line` ou clarté de surface.
- **Couches** : `--z-content` 0 · `--z-sticky` 10 · `--z-scrim` 20 · `--z-sheet` 30 · `--z-toast` 40.

## Matière (verre)

Exactement **deux** surfaces en verre, fixes à l'écran, jamais sur du contenu qui défile :
la **barre haute** (logo, recherche, Ma sélection, thème) et la **barre d'action basse** de la
fiche (bouton Snapchat, zone du pouce, `env(safe-area-inset-bottom)`).

Valeurs : fond `color-mix(in oklch, var(--surface-1) 72%, transparent)`, `backdrop-filter:
blur(12px) saturate(1.2)`, filet `--line`. **Repli opaque** (`--surface-1` à 96 %, sans flou) si le
navigateur ne sait pas flouter, ou si l'utilisateur demande moins de transparence ou plus de
contraste. La feuille de fiche est **opaque**. Le site ne dépend jamais du verre.

## Mouvement

L'écran répond au doigt comme un objet. Moteur pur et testé :
[`src/lib/motion/physics.ts`](src/lib/motion/physics.ts), branché par
[`useSheetMotion`](src/hooks/useSheetMotion.ts). Aucune bibliothèque.

| Jeton | Valeur | Pour |
|---|---|---|
| `--dur-1` | 120 ms | appui, couleur, bascule |
| `--dur-2` | 200 ms | survol, popover, puce |
| `--dur-3` | 360 ms (sortie 270 ms) | feuille, tiroir |
| `--dur-4` | 600 ms | entrée au premier chargement, une fois |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | défaut |
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | feuille |
| `--ease-move` | `cubic-bezier(0.77, 0, 0.175, 1)` | élément déjà à l'écran qui se déplace |
| `--press` | `scale(0.97)` | appui |

- Cascade : 40 ms par élément, plafond 400 ms. Entrée : opacité 0 → 1 et `scale(0.95)` → 1, jamais
  depuis 0. Popover depuis son déclencheur.
- Feuille sous le doigt : ressort raideur 380, amortissement critique (39), masse 1 ; fermeture si
  le glissé dépasse 0,11 px/ms ; résistance 0,55 au-delà du bord.
- On anime `transform`, `opacity`, `clip-path`, `background-color` ; jamais `width`, `height`,
  `top`. Jamais `transition: all`. Survol seulement sous `@media (hover: hover) and (pointer: fine)`.
- **Mouvement réduit** : plus aucun déplacement ; fondus gardés à `--dur-1`.
- **Ancres** : un lien vers un endroit de la page (« Voir le catalogue ») fait **glisser** la page
  (`SmoothAnchors`, défilement natif doux), jamais un saut ; saut immédiat en mouvement réduit.
- **Givre** (parfums de saison, demandes du gérant du 22/10/2026) : seule exception décorative du
  mouvement. Le givre, ce sont des **flocons dessinés** (motif de 14 flocons
  variés placés à la main, en masque, peint en `--frost`), jamais une grille d'icônes identiques. Quand la bande ou le bouton paraît, il pousse par `clip-path` à `--dur-4` puis
  reste ; sur le bouton un reflet le traverse une fois et le flocon tourne d'un sixième de tour (deux au
  survol souris). `--frost` : glace claire en sombre, acier glacé en clair ; nulle part ailleurs.

## États (bouton primaire ; les autres composants suivent les mêmes règles)

| État | Rendu |
|---|---|
| repos | fond `--text-1`, texte `--bg`, rayon `--r-md`, hauteur 48 px, graisse 500 |
| survol (pointeur fin) | fond `--text-1` mêlé à 90 % au `--bg`, `--dur-2`, couleur seule |
| focus clavier | anneau 2 px `--focus`, décalé 2 px |
| appui | `--press`, `--dur-1` |
| désactivé | fond `--surface-2`, texte `--text-3`, `aria-disabled`, reste atteignable au clavier |
| chargement | libellé « … », `aria-busy`, largeur figée, inerte |
| erreur | message **sous** le bouton en `--error`, relié par `aria-describedby` |
| succès | le libellé devient le résultat (« Nom copié ») 1 600 ms, `aria-live="polite"` |

Bouton secondaire : fond `--surface-1`, filet `--line`, texte `--text-1`. Tertiaire : texte seul,
souligné au survol. **Un seul bouton primaire par écran.** Cibles tactiles ≥ 44 px. Tout champ a
une étiquette visible et son erreur dessous.

## Composants signature

- **Parfums du moment** (accueil, entre « À l'affiche » et Marques) : une **bande pleine largeur en
  dégradé** — le fond de la page glisse vers `--saison-fond` (bleu nuit `#0D2436` en sombre, glace
  `#DEEBF8` en clair) puis y revient, sans bord ni filet. Titre « Notre sélection pour les **jours
  froids** », la fin en `--frost` (même geste que « Nuréa » en `--accent` dans la hero). Flocons dessinés
  (six branches et barbes, tailles et inclinaisons variées, placés à la main) aux coins haut gauche et
  bas droit, fondus vers l'intérieur, immobiles. La sélection de `saison.ts` en cartes du catalogue,
  deux rangées repliées (4 / 6 / 8), puis le bouton givré « Voir les *N* parfums » ↔ « Afficher moins ».
  **Écartés** (gérant et audit, 22/10) : neige qui tombe, flocon devant le titre, grille d'astérisques
  identiques, bloc à bords nets, phrase « *N* parfums choisis pour… ».
- **Carte parfum** : visuel 2:3, puis la marque (`body`, `--text-2`, « Marque · Ligne »), puis le
  nom (`subtitle`, `--text-1`). Cœur « Ma sélection » 44 px en haut à droite du visuel. Pressée :
  fond d'ambiance. **Jamais de prix, jamais de contenance.**
- **Fiche** : feuille depuis le bas (`--r-xl`, poignée 36 × 4 px), fond d'ambiance, visuel 2:3 plein
  largeur, marque puis nom, mention `MENTION_FLACONS`, barre basse en verre avec « Commander sur
  Snapchat » (copie « *Nom* (*Marque*) »). Précédent / suivant au glissé horizontal ; sur téléphone, un chevron fin (`fg-2`, 20 px) de chaque côté du visuel, dans la marge, l'annonce et se touche (cible 44 px), absent en bout de liste (demande du gérant, 21/10). Adresse
  `?parfum=<id>` sur l'accueil ; page indexable `/parfums/<marque>/<nom>-<id>` au même contenu.
- **Navigation** : dès 1024 px, les quatre liens (Catalogue, Marques, La parfumerie, Contact) dans la barre haute ; en deçà, un bouton **Menu** tout à droite de la barre ouvre une feuille par le bas (tiroir à droite sur tablette) : les quatre pages en `title`, la page en cours en `--accent`, « Commander sur Snapchat » en seul bouton plein (`MobileMenu`). Ni barre d'onglets fixe (elle mangerait le catalogue et heurterait la barre d'action de la fiche), ni troisième ligne dans la barre. Sous 360 px, logo à 32 px de haut pour tenir sur une ligne.
- **Recherche** : champ permanent dans la barre haute, résultats dès 2 caractères. Jamais « aucun
  résultat » : « Vous cherchez *X* ? Écrivez-nous », message pré-rempli.
  **Suggestions** (21/10/2026, `SearchBox`) : dès 2 caractères, un panneau sous le champ — `--surface-1`,
  filet `--line`, `--r-lg`, ombre `--shadow-float`, entrée `--dur-2` — propose jusqu'à **cinq parfums**
  (vignette 2:3 de 36 px, marque en `caption` `--text-2`, nom en `body` `--text-1`), puis « Voir les
  N parfums » ; quand rien ne répond, une seule rangée « Vous cherchez *X* de *Y* ? Écrivez-nous »
  (« Écrivez-nous » en accent : c'est ce qui agit). Rangée survolée ou active : `--surface-2`. Une
  rangée est un vrai lien ; sur l'accueil elle ouvre la feuille, ailleurs la page du parfum. Motif
  combobox WAI-ARIA (flèches, Entrée, Échap, `aria-activedescendant`). Jamais de prix ni de contenance
  dans une rangée ; pas de mise en gras de la partie tapée.
- **Filtres** : feuille opaque, compteur direct « Voir 42 parfums », puces actives supprimables,
  tout dans l'adresse.
- **Ma sélection** : liste gardée sur l'appareil (`localStorage`, `nurea:selection:v1`), compteur
  sur le cœur de la barre, feuille qui liste les parfums et un bouton « Commander ces N parfums sur
  Snapchat » qui compose un seul message. Aucun compte, aucune écriture serveur.
- **Accueil** : composition **« Flacon »** (21/10/2026, `04-PLAN-EXECUTION.md` § B.10). **Hero** : la
  photographie du flacon Nuréa en fond, en deux lumières et deux cadrages ; sur téléphone, le titre puis
  les deux entrées sur une ligne (`Button` plein « Voir le catalogue », Snapchat en bouton rond 44 px),
  au-dessus et à gauche du flacon. **À l'affiche** : deux bandeaux photographiques horizontaux en miroir —
  le visuel entier d'un côté, fondu dans la même photo floutée qui porte la marque et le nom en `title` ;
  en quinconce sur bureau. **Marques** : un index typographique (12 noms
  et leur nombre de parfums, « Toutes les marques »), sans images. Puis le catalogue. Composants et
  arrondis du design system inchangés ; aucun onglet, surtitre, compteur décoratif ni texte qui défile.

## Fiche produit

Ordre imposé : **marque, puis nom**. **Aucune contenance (ml) affichée sur la vitrine** (décision
du gérant, 20/10/2026) : ni sélecteur, ni « 10 · 50 · 80 ml », ni dans un texte, ni dans le message
Snapchat ; le volume se discute dans l'échange. Le prix n'apparaît jamais. Une ligne dont la donnée
manque est omise, jamais inventée (ni note, ni famille olfactive, ni avis, ni rareté).

Un parfum peut appartenir à une **ligne** de sa marque (« La Collection Privée » chez Dior, « Private
Blend » chez Tom Ford) : l'étiquette devient **« Marque · Ligne »**, partout où la marque s'affiche
(`brandLineLabel`, `src/lib/catalog/perfumePresentation.ts`). Sans ligne, la marque seule.

## Mentions

Deux mentions dues au client, tenues dans **un** fichier,
[`src/lib/mentions.ts`](src/lib/mentions.ts), jamais recopiées :

- **Les flacons** (`MENTION_FLACONS`) — les photographies montrent les flacons d'origine des
  marques ; le parfum est remis dans un flacon Nuréa personnalisé. Aucun visuel du flacon Nuréa sur
  le site. À dire là où l'on regarde une photo de flacon : fiche parfum, Contact, La parfumerie,
  pied de page.
- **Les photographies** (`MENTION_PHOTOS`) — réalisées par Nuréa Parfums, reproduction interdite
  sans accord écrit. Pied de page et informations légales.

## Images bi-thème

L'image principale **est** la variante sombre ; `imageLight` est une variante claire facultative.
Sans elle, le visuel sombre s'affiche dans les deux thèmes. La bascule se fait **en CSS**, jamais en
JavaScript (`useTheme`) : les grilles restent rendues côté serveur et rien ne clignote. Format
WebP, 2:3, vignette 640 × 960 servie aux petites largeurs.

## Logos

Logos et monogrammes de `public/branding/` : **doré sur sombre, bordeaux sur clair** (couleurs de marque,
21/10/2026). Barre, pied de page et 404 montrent le **logo complet** — monogramme NP dans son cercle puis
le nom : `nurea-logo-horizontal-dark` (monogramme doré, nom ivoire) en sombre, `nurea-logo-horizontal-light`
(monogramme bordeaux, nom noir) en clair, à 40 px de haut (`BrandLogo.tsx`) ; bascule en CSS. La gestion garde
ses propres logos.
Les variantes colorées ne servent plus. Interdits : déformer, incliner, faire pivoter, ombrer,
dégrader le logo ; poser le monogramme **nu** sur une photo (version cerclée) ; écrire « Nurea »
sans accent.

## Coque

La barre haute et le pied de page vivent dans [`app/(shop)/layout.tsx`](app/(shop)/layout.tsx), qui
rend aussi l'unique `<main id="main-content">` et le lien d'évitement. Les pages ne rendent que leur
contenu.

## Écriture

- Vocabulaire : **Marque · Parfum · Ligne · Contenance · Catalogue**. Jamais « Maison », « Galerie »,
  « Sillage ».
- Boutons : verbe + objet (« Commander sur Snapchat », « Écrire à Nuréa »).
- Pas d'étiquette creuse (« DÉCOUVRIR ») ; interdits : « N'hésitez pas », « Bienvenue sur »,
  « Cliquez ici ».

## Accessibilité

WCAG 2.2 AA au moins ; cibles ≥ 44 px ; focus visible partout ; `prefers-reduced-motion`,
`prefers-reduced-transparency`, `prefers-contrast` respectés ; zoom jamais bloqué, page tenue à
200 % ; texte en `rem` ; un seul `<h1>` par page ; texte de remplacement sur chaque visuel.
