# Refonte vitrine — plan d'exécution

Statut : **cadrage figé le 20/10/2026** (Fable 5.1, session de cadrage). Ce document est la source
que l'exécutant (Opus 5.5, effort `medium`) suit sans réinventer. Il ne consulte Fable qu'aux points
de contrôle de § E, et seulement si **le goût** est en cause. Toute question de code se résout avec
`01-INVARIANTS.md`, `02-PLAYBOOK.md`, ce document et le dépôt.

Lecture minimale avant toute tâche : `AGENTS.md`, `00-LISEZ-MOI.md`, `01-INVARIANTS.md`, ce
document. `02-PLAYBOOK.md` et `03-DA.md` seulement sur un point précis (ils sont longs).

---

## A. Décisions verrouillées (20/10/2026)

| Sujet | Décision | Source |
|---|---|---|
| Direction | **« Nuancier nocturne »** : structure, matière, mouvement « Apple » ; la seule couleur vive est celle du parfum regardé | gérant, `03-DA.md` § 7 |
| Thèmes | **Clair et sombre**, `prefers-color-scheme` par défaut, bascule manuelle conservée | gérant |
| Héritage v3 | **Rien.** Aucun jeton, classe, composant, police, règle d'aspect repris. `app/globals.css`, `src/design/brand.ts`, `src/design/fonts.ts`, `src/components/**` sont **réécrits**, pas retouchés | gérant |
| Actifs de marque | Logos et monogrammes de `public/branding/` conservés, proportions intactes : **ivoire sur sombre, noir sur clair**. Variantes cuivre et bordeaux inutilisées | gérant (« tu as nos logos ») |
| Vocabulaire | Marque · Parfum · Ligne · Contenance · Catalogue. Jamais Maison, Galerie, Sillage. Boutons verbe + objet (« Commander sur Snapchat », « Écrire à Nuréa ») | Fable |
| Fonctions neuves | **« Ma sélection »** retenue. **Aucune contenance (ml) affichée nulle part** : ni sélecteur, ni « 10 · 50 · 80 ml » en carte, ni dans un texte, ni dans le message Snapchat. Le site reste un catalogue de ce qui est disponible ; le volume se discute sur Snapchat | gérant, PC 1 (20/10) |
| Polices | **C1 : Fraunces + Figtree** | gérant, PC 1 (20/10) |
| Accueil | Une **vraie page d'accueil** : section d'ouverture (hero) puis sections ; la planche T1 n'était qu'une maquette de la grille et de la fiche | gérant, PC 1 (20/10) |
| Données | Aucune famille olfactive, note, avis, rareté. Une ligne sans donnée vraie est omise | gérant (règle existante) |
| Photos | Visuels actuels conservés ; 64 fiches sans variante claire montrent le visuel sombre dans les deux thèmes | gérant |
| Périmètre | `app/(shop)`, `src/components`, `app/globals.css`, `src/design/{brand,fonts}.ts`, `app/not-found.tsx`, images OG, docs vitrine. **Rien** dans `app/admin`, `src/features`, `src/ui`, `src/app-shell`, `src/server` (sauf T7 : lecture d'une colonne) | `01-INVARIANTS.md` |

---

## B. DA verrouillée (valeurs, pas d'adjectifs)

### B.1 Concept

**Une chambre neutre et calme ; la seule couleur est celle du flacon qu'on regarde.** L'interface
ne possède aucun accent de marque : l'accent *est* la teinte dominante du visuel, calculée, bornée,
posée sur la fiche et sur la carte pressée. Tout le reste est un neutre teinté, chaud, en deux
thèmes symétriques.

### B.2 Palette (OKLCH source, hex dérivé, contrastes WCAG calculés)

Jetons à deux couches : primitifs (`--n-*`) puis sémantiques (`--bg`, `--text-1`…). Un thème ne
redéfinit **que** le sémantique. Les hex sont les valeurs calculées ci-dessous (script OKLCH →
sRGB, D65) ; en CSS on écrit `oklch()` et on garde le hex en commentaire pour `brand.ts` (OG,
manifeste, `themeColor`).

**Thème sombre** (par défaut si le système ne dit rien) :

| Jeton | OKLCH | Hex | Rôle | Contraste |
|---|---|---|---|---|
| `--bg` | `oklch(0.16 0.012 20)` | `#120B0B` | fond de page | — |
| `--surface-1` | `oklch(0.21 0.012 20)` | `#1E1616` | carte, champ, barre (opaque) | — |
| `--surface-2` | `oklch(0.26 0.012 20)` | `#2A2222` | carte pressée, puce active, popover | — |
| `--line` | `oklch(0.34 0.012 20)` | `#3E3635` | filet 1 px | 1,65:1 sur bg (décoratif) |
| `--text-1` | `oklch(0.95 0.008 60)` | `#F3EDE9` | titres, noms, boutons | 16,8:1 bg · 13,4:1 surface-2 |
| `--text-2` | `oklch(0.78 0.012 50)` | `#BEB5B1` | texte courant, marque | 9,7:1 bg · 7,7:1 surface-2 |
| `--text-3` | `oklch(0.66 0.014 40)` | `#9A908C` | légendes, placeholder | 6,3:1 bg · 5,0:1 surface-2 |
| `--error` | `oklch(0.74 0.13 20)` | `#F28788` | erreur de formulaire seulement | 8,0:1 bg |
| `--focus` | = `--text-1` | | anneau de focus 2 px, décalé 2 px | ≥ 3:1 partout |

**Thème clair** :

| Jeton | OKLCH | Hex | Rôle | Contraste |
|---|---|---|---|---|
| `--bg` | `oklch(0.975 0.006 70)` | `#F9F6F2` | fond de page | — |
| `--surface-1` | `oklch(0.945 0.008 70)` | `#F0ECE7` | carte, champ, barre | — |
| `--surface-2` | `oklch(0.91 0.010 65)` | `#E6E0DB` | pressé, actif, popover | — |
| `--line` | `oklch(0.84 0.012 60)` | `#D1C9C3` | filet 1 px | 1,52:1 bg |
| `--text-1` | `oklch(0.22 0.012 20)` | `#201818` | titres, noms, boutons | 16,2:1 bg · 13,3:1 surface-2 |
| `--text-2` | `oklch(0.42 0.014 20)` | `#554A4A` | texte courant | 7,9:1 bg · 6,5:1 surface-2 |
| `--text-3` | `oklch(0.48 0.014 20)` | ≈ `#655A5A` | légendes, placeholder | ≥ 5,9:1 bg · ≥ 4,9:1 surface-2 |
| `--error` | `oklch(0.50 0.16 20)` | `#AC2F3B` | erreur | 6,1:1 bg |
| `--focus` | = `--text-1` | | | |

Interdits (tenus par `anti-slop.test.ts`) : `#000`, `#fff`, violet/indigo, texte en dégradé.
Aucune autre couleur n'existe dans la vitrine. Le bordeaux et le cuivre du logo **ne sont pas des
jetons**.

### B.3 Couleur d'ambiance (algorithme, bornes, repli)

Par parfum, calculée **hors ligne** sur la vignette sombre `…-640.webp` (jamais dans le navigateur),
stockée en base (T7), lue par la vitrine comme deux jetons `--amb` (sombre) et `--amb-light`.

1. `sharp` : redimensionner en 64 × 96, sortie RGB brute.
2. Chaque pixel → OKLCH. **Ignorer** si `C < 0,04` (gris, noir, blanc) ou `L < 0,15` ou `L > 0,85`
   (fond noir, reflets).
3. Histogramme de teinte : 24 classes de 15°, poids = chroma. Classe dominante ± 1 voisine →
   teinte moyenne circulaire `h`, chroma **médiane** `c_src` des pixels retenus.
4. **Repli** : si les pixels retenus pèsent < 8 % de l'image → pas d'ambiance (`NULL`), la fiche
   reste sur `--surface-1`. Jamais une teinte inventée.
5. Dérivation :
   - sombre : `oklch(0.27 clamp(c_src × 0,6 ; 0,03 ; 0,08) h)`
   - clair : `oklch(0.93 clamp(c_src × 0,35 ; 0,02 ; 0,05) h)`
6. **Contrôle de contraste** (calculé, pas supposé) : `--text-1` ≥ 7:1 et `--text-3` ≥ 4,5:1 sur
   l'ambiance, dans chaque thème. Échec → L reculé de 0,01 vers `--bg` (5 pas max) ; toujours en
   échec → repli (`NULL`). Valeurs de référence calculées : à L 0,30 / C 0,08 (sombre) text-3 tombe
   à 4,50:1 ; à L 0,90 / C 0,05 (clair) il tombe à 4,41:1 — d'où les bornes 0,27 et 0,93.
7. Stockage : `Perfume.ambientHue` (`Int`, 0–359, nullable), `Perfume.ambientChroma`
   (`Decimal(4,3)`, nullable, = `c_src`). `NULL` = repli. Un forçage manuel passe par le script
   (`--set <id> <hue> <chroma>`) ; un champ dans la gestion est hors périmètre de cette refonte.
8. Où elle s'applique : **fond de la fiche** (feuille et page), **carte pressée / survolée**,
   **en-tête de la page marque** (moyenne circulaire des parfums de la marque, même repli).
   **Jamais** le fond de toute la page, jamais la barre, jamais le texte.

### B.4 Typographie

Contraintes : variable, licence libre (OFL), auto-hébergée via `next/font/google` (téléchargement
**au build**, servi depuis `'self'`, conforme CSP), hors liste anti-slop, **un seul serif ou aucun**,
jamais deux sans proches, jamais de monospace. Budget total **≤ 120 Ko** (woff2, sous-ensemble
`latin` + `latin-ext` si « Œ » l'exige) ; mesuré au build (`.next/static/media`), sinon on passe à
des instances statiques (2 graisses).

Trois couples candidats, **montrés sur la planche T1**. **Retenu au PC 1 (20/10) : C1, Fraunces + Figtree** ; C2 et C3 sont abandonnés (T4 n'installe que C1) :

| Couple | Titres et noms de parfum | Texte et interface | Pourquoi |
|---|---|---|---|
| **C1** | **Fraunces** (variable : `opsz` 9–144, `wght`, `SOFT`, `WONK` ; `SOFT` 0, `WONK` 0) | **Figtree** (variable `wght` 300–900) | Serif à axe optique, net en 20 px et dessiné en 48 px ; sans neutre, chiffres tabulaires |
| **C2** | **Bricolage Grotesque** seule (variable : `opsz` 12–96, `wdth` 75–100, `wght` 200–800) | la même, `opsz` 12, `wdth` 100 | Une famille, trois axes : les titres en `opsz` 96 / `wdth` 90 se distinguent du texte sans seconde police. Le choix le plus « original » |
| **C3** | **Literata** (variable : `opsz` 7–72, `wght` 200–900) | **Hanken Grotesk** (variable `wght` 100–900) | Serif de lecture, chaleureux ; grotesque sobre pour l'UI. Le choix le plus sûr |

Critères de choix sur téléphone (390 px, les deux thèmes) : (1) le nom d'un parfum long (« Hibiscus
Mahajád », « La Collection Privée ») tient sur deux lignes sans césure ; (2) les chiffres (compteurs)
s'alignent (chiffres tabulaires) ; (3) le texte courant à 1 rem reste lisible en `--text-2` sur
`--surface-1` ; (4) le titre à 3 rem ne « bave » pas en thème sombre. Choix noté dans `DESIGN.md`.

Graisses chargées : titres 400 et 500 ; texte 400, 500, 600. Jamais d'autre.

Réglages (`globals.css`, règles de rôle, pas de taille arbitraire) :

| Rôle | Taille | Graisse | Interlettrage | Interlignage | Usage |
|---|---|---|---|---|---|
| `display` | `clamp(3rem, 2rem + 4vw, 5rem)` | 400 | −0,02 em | 1,05 | H1 accueil, La parfumerie |
| `title` | `clamp(1.75rem, 1.25rem + 2vw, 2.5rem)` | 500 | −0,015 em | 1,15 | H1 des pages, nom en fiche |
| `subtitle` | `1.3125rem` | 500 | −0,005 em | 1,3 | H2, nom en carte |
| `body` | `1rem` (16 px) | 400 | 0 | 1,6 (les deux thèmes : une dimension ne dépend jamais du thème) | texte, marque en carte (`--text-2`) |
| `caption` | `0.75rem` | 500 | +0,02 em | 1,4 | contenance, compteur, mention légale |

Rapports : caption→body 1,33 ; body→subtitle 1,31 ; body→title 1,75 → 2,5 ; body→display 3 → 5.
`text-wrap: balance` sur `display`/`title`, `pretty` sur `body` ; `font-variant-numeric:
tabular-nums` sur tout ce qui s'aligne ; `hyphens: auto` + `lang="fr"` ; mesure ≤ 65 ch ;
espace insécable dans « Nuréa Parfums ». Repli métrique (`adjustFontFallback`, défaut
de `next/font`) obligatoire.

### B.5 Échelles

**Espacement** (base 4 px, nommé par relation) : `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-6` 24
· `-8` 32 · `-12` 48 · `-16` 64 · `-24` 96 ; respiration de section `--space-section:
clamp(3rem, 2rem + 4vw, 6rem)`. Gouttière de page : 16 px (390), 24 px (≥ 768), 32 px (≥ 1024),
contenu ≤ 1280 px. Grille : `gap` 12 px (2 col.), 16 px (3 col.).

**Rayons** : `--r-sm` 6 px (puce, badge) · `--r-md` 12 px (bouton, champ, visuel en carte) ·
`--r-lg` 20 px (carte, popover) · `--r-xl` 28 px (feuille, en haut seulement) · `--r-full` 999 px
(pastille de contenance, cœur). Règle concentrique : rayon intérieur = rayon extérieur − padding
(carte 20 − padding 8 = visuel 12).

**Ombre** : **une seule**, nommée, pour ce qui flotte (feuille, popover) : `--shadow-float: 0 12px
32px -8px oklch(0 0 0 / 0.35)` (sombre), `0 12px 32px -8px oklch(0.2 0.01 20 / 0.18)` (clair). Les
cartes n'en ont pas : filet `--line` 1 px ou clarté de surface.

**Couches** (z-index sémantique) : `--z-content` 0 · `--z-sticky` 10 · `--z-scrim` 20 ·
`--z-sheet` 30 · `--z-toast` 40. Jamais 999.

**Points de rupture** : 640 / 768 / 1024 (`min-width`). Densité de grille : 1 col. < 400 px au
choix de l'utilisateur, **2 par défaut** jusqu'à 767, 3 à 768, 4 à 1024.

### B.6 Matière (verre)

Exactement **deux** surfaces en verre, les deux fixes à l'écran, jamais sur du contenu qui défile :

| Surface | Valeurs | Repli |
|---|---|---|
| **Barre haute** (logo, recherche, thème) | `background: color-mix(in oklch, var(--surface-1) 72%, transparent)` ; `backdrop-filter: blur(12px) saturate(1.2)` ; filet bas `--line` ; bord haut 1 px `oklch(1 0 0 / 0.06)` (sombre seulement) | `@supports not (backdrop-filter: blur(1px))`, `prefers-reduced-transparency: reduce`, `prefers-contrast: more` → `--surface-1` à 96 % opaque, sans flou |
| **Barre d'action basse** (bouton Snapchat de la fiche, zone du pouce) | mêmes valeurs, `padding-bottom: env(safe-area-inset-bottom)` | idem |

La feuille de fiche est **opaque** (`--surface-1`) avec le fond d'ambiance. Budget du test : 6
emplois de `backdrop-filter` dans le code ; cible 2 (barre + barre basse), 4 de marge pour les
variantes.

### B.7 Mouvement (jetons)

```
--dur-1: 120ms   /* appui, couleur, bascule */
--dur-2: 200ms   /* survol, popover, puce */
--dur-3: 360ms   /* feuille, tiroir (sortie 270ms) */
--dur-4: 600ms   /* entrée au premier chargement, une fois */
--ease-out:   cubic-bezier(0.22, 1, 0.36, 1)   /* défaut */
--ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)
--ease-move:  cubic-bezier(0.77, 0, 0.175, 1)  /* élément déjà à l'écran */
--press: scale(0.97)
cascade : 40 ms par élément, plafond 400 ms (10 éléments)
ressort (feuille sous le doigt, src/lib/motion/physics.ts) : raideur 380, amortissement 39 (critique),
masse 1 ; fermeture si vitesse > 0,11 px/ms quelle que soit la distance ; rubber-band 0,55 au-delà du bord
```

On anime `transform`, `opacity`, `clip-path`, `background-color` ; jamais `width/height/top`.
Survol derrière `@media (hover: hover) and (pointer: fine)`. `prefers-reduced-motion: reduce` :
durées à 0 pour tout déplacement, fondus gardés à `--dur-1`. Entrée d'élément : `opacity 0 →
1` + `scale(0.95) → 1`, jamais depuis 0. Popover depuis son déclencheur (`transform-origin`).

### B.8 Les huit états (bouton primaire ; les autres composants dérivent les mêmes règles)

| État | Fond | Texte | Autre |
|---|---|---|---|
| repos | `--text-1` | `--bg` | rayon `--r-md`, hauteur 48 px, `font-weight` 500 |
| survol (pointeur fin) | `--text-1` à 90 % (`color-mix` avec `--bg`) | `--bg` | `--dur-2`, couleur seule |
| focus-visible | repos | repos | anneau 2 px `--focus`, `outline-offset` 2 px |
| appui | repos | repos | `--press` sur `--dur-1`, `--ease-out` |
| désactivé | `--surface-2` | `--text-3` | `cursor: not-allowed`, `aria-disabled`, reste au clavier |
| chargement | repos | repos | libellé → « … » + `aria-busy`, largeur figée (`min-width` du libellé), bouton inerte |
| erreur | repos | repos | message **sous** le bouton en `--error`, `aria-describedby`, focus sur le message |
| succès | repos | repos | libellé devient le résultat (« Nom copié ») pendant 1 600 ms, `aria-live="polite"` |

Bouton secondaire : fond `--surface-1`, filet `--line`, texte `--text-1`. Tertiaire : texte seul,
souligné au survol. **Un seul bouton primaire par écran.** Cibles ≥ 44 px (zone étendue par
`::before` si le visuel est plus petit). Tous les champs : étiquette visible, erreur sous le champ.

### B.9 Composants signature (spécification courte, détail dans la tâche)

- **Carte parfum** : visuel 2:3 (`--r-md`), puis marque en `body` `--text-2` (« Marque · Ligne »),
  nom en `subtitle` `--text-1`. **Aucune contenance.** Cœur
  « Ma sélection » 44 px en haut à droite du visuel, cerclé `--surface-1` à 80 %. Pressée : fond
  = ambiance. Jamais de prix.
- **Fiche** : feuille depuis le bas (`--r-xl`), poignée 36 × 4 px, fond ambiance, visuel 2:3 plein
  largeur, marque / nom (**aucune contenance, aucun sélecteur**),
  mention `MENTION_FLACONS`, barre basse en verre avec « Commander sur Snapchat » (copie « *Nom* (*Marque*) ») ; précédent/suivant par glissé horizontal ; URL `?parfum=<id>` sur l'accueil, page
  indexable `/parfums/<marque>/<nom>-<id>` au même contenu.
- **Recherche** : champ permanent dans la barre haute, résultats dès 2 caractères, état vide =
  « Vous cherchez *X* ? Écrivez-nous » avec message pré-rempli ; jamais « aucun résultat ».
- **Filtres** : feuille, compteur direct « Voir 42 parfums », puces actives supprimables sous la
  barre, tout dans l'URL.
- **Ma sélection** : `localStorage` (`nurea:selection:v1`, tableau d'ids), pastille compteur sur
  l'icône cœur de la barre, feuille listant les parfums, un bouton « Commander ces N parfums sur
  Snapchat » qui compose un seul message.

### B.10 Accueil (état au 21/10/2026)

Statut des sections, essais écartés, règles et priorités : **`REPRISE.md`**. Ici, la composition en vigueur
(code : branche `refonte/vitrine`, `Hero.tsx`, `FeaturedSection.tsx`, `BrandShelf.tsx`, styles `.hero*`,
`.bandeau*` de `app/globals.css`). Ordre : hero, « À l'affiche », Marques, catalogue (intouché).

**Hero.** La photographie du flacon Nuréa (`public/branding/hero/flacon-*`, deux lumières, portrait < 768 px,
paysage au-delà ; brief `annexes/brief-photo-hero.md`) est le fond de toute la hero ; le sol se fond dans la
page par un masque bas ; rien n'est assombri. Téléphone : hauteur = format de la photo (`125vw`) ; grille à
deux rangées, la première haute de 29 % (le bouchon commence à 30 % de la photo) : le H1 (`title`) s'y cale
en bas, les entrées suivent à 24 px sur une ligne — `Button` plein « Voir le catalogue » (`#collection`),
Snapchat en bouton rond 44 px (celui du cœur), icône seule et intitulé en `aria-label` ; dès 768 px, lien avec
texte, titre et entrées à gauche, hauteur `clamp(26rem, 50vh, 32rem)` puis `clamp(32rem, 80vh, 48rem)`. H1 =
accroche « Le parfum que vous aimez, dans un flacon Nuréa. » (formulation du gérant ; non verrouillée,
avis juridique attendu ; nomme « Nuréa », sans la ville). Chaque photo préchargée pour son thème et sa
largeur. Une seule entrée animée (`.enter`).

**À l'affiche** (référence du gérant, principe validé le 21/10). Deux bandeaux photographiques horizontaux
en miroir (`.bandeau`, `.bandeau-miroir`) : premier parfum mis en avant flacon à gauche, second flacon à
droite. Grille : le visuel **entier** (2:3, jamais recadré) sur toute la hauteur d'un côté, fondu par son bord
(masque 60 → 100 %) dans la même photo agrandie ×3 depuis son coin haut droit (ciel, lumière) et floutée
(24 px, 56 px dès 1024) ; voile `--bg` 62 % → 18 % côté texte ; marque (`body`), nom (`title`, sans césure ;
`subtitle` si le bandeau ≤ 20 rem), « Voir la fiche ». Tout le bandeau ouvre la fiche (bouton étendu, appui
`--press`) ; le nom est le lien vers la page indexable. `--r-lg` + `clip-path` arrondi (le flou débordait
des angles). 4:3 sur téléphone, 16:7 à 768, 16:9 sur 62 rem en quinconce dès 1024.

**Marques.** Index typographique : les 12 marques les plus fournies, nom en `subtitle` suivi du nombre de
parfums en `caption` (liens ≥ 44 px), « Toutes les marques » → `/parfums`.

**Mesures** (build webpack, profil T9, Pixel 7) : LCP ≈ 1,55 s sombre / 1,06 s clair (photo de la hero), CLS 0 ;
bascule clair/sombre 0 px pour un visuel identique ; e2e accueil 8/8.

Amendements de § B en vigueur : ambiance (§ B.3.8) aussi permise en passe-partout et fonds de section de
l'accueil, jamais toute la page ni la barre ; interlignage `body` commun aux deux thèmes (§ B.4) ; la hero
porte des entrées (bouton) et du texte posé sur la photo, dans sa zone vide, sans assombrissement.

---

## C. Cartographie des fichiers (par tâche)

| Zone | Fichiers aujourd'hui | Sort |
|---|---|---|
| Coque | `app/(shop)/layout.tsx`, `app/layout.tsx` (ne pas toucher : root minimal), `app/not-found.tsx`, `src/components/layout/{Navbar,Footer,BrandLogo}.tsx`, `src/components/providers/ThemeProvider.tsx` | réécrits (T5) |
| Jetons, polices | `app/globals.css` (744 l.), `src/design/brand.ts`, `src/design/fonts.ts`, `tailwind.config.ts` | réécrits (T3, T4) |
| Catalogue | `src/components/home/{CatalogSection,CatalogToolbar,CatalogEmptyState,CatalogFilterDrawer}.tsx`, `useCatalogFilters.ts`, `useExtendedSearch.ts`, `src/components/features/{PerfumeCard,PerfumeCardSkeleton,PerfumeImage,PerfumeDialog,PerfumeLinkCard,FeaturedSection,Hero,SnapchatOrderButton,OrderChannels}.tsx`, `src/components/ui/{Button,Field,Icons,ScrollReveal,ChannelSoon}.tsx` | réécrits (T8–T13) |
| Pages | `app/(shop)/page.tsx`, `parfums/page.tsx`, `parfums/[marque]/page.tsx`, `parfums/[marque]/[parfum]/page.tsx`, `marque/page.tsx`, `contact/page.tsx`, `legal/page.tsx` ; `src/components/editorial/*`, `src/components/features/ContactForm.tsx` | réécrits (T14–T17) |
| Images OG | `app/(shop)/opengraph-image.tsx`, `twitter-image.tsx`, `contact/`, `legal/`, `marque/` ; `app/(shop)/_og/` (police + logotype) | réécrits (T18) |
| Données (lecture seule sauf T7) | `src/lib/catalog/{getCatalogPerfumes,perfumePresentation,seoCatalogue,discoveryOrder}.ts`, `src/lib/catalogue-service.ts`, `src/lib/data.ts`, `src/lib/search/*`, `src/lib/seo/paths.ts`, `src/lib/mentions.ts`, `src/lib/images/{loader,thumbnails}.ts`, `src/lib/motion/physics.ts`, `src/hooks/useSheetMotion.ts` | **inchangés**, sauf ajout des champs d'ambiance (T7) |
| Ambiance (T7) | `prisma/schema.prisma` + migration, `scripts/refonte-vitrine/ambiance.mjs` (nouveau), `src/lib/catalog/getCatalogPerfumes.ts` et `src/lib/data.ts` (deux champs), `demo-catalogue.json` (régénéré) | ajout |
| Filets | `tests/architecture/anti-slop.test.ts` (inchangé), `css-registers.test.ts`, `e2e/catalog-filters.spec.ts` (sélecteurs à refaire), `e2e/layout-invariants.spec.ts` (gestion, inchangé) | T21 |
| Docs | `DESIGN.md`, `.impeccable.md`, `PRODUCT.md`, `docs/charte-graphique.html`, `CLAUDE.md` § Règles Vitrine, `docs/refonte-vitrine/00-LISEZ-MOI.md` | T2, puis T23 |
| Planche | `public/planche/index.html` + `public/planche/fonts/` (**branche `refonte/planche` seulement, jamais sur `main`**) ; `accueil.html` (refusée), `accueil-v2.html` (A et B) | T1, T15 |

---

## D. Tâches

Convention : **une tâche = un commit** (`git add` fichier par fichier). Après tout code :
`npm run typecheck && npm run lint && npm test`. Taille S < 1 h, M ½ journée, L 1 journée.
Modèle : Opus 5.5 ; effort `medium` sauf mention. `PC` = point de contrôle gérant (§ E).

### Phase 0 — décider

**T1 — Planche HTML** · L · Opus **high** · PC 1
- Objectif : une page autonome montrant à 390 px, dans les deux thèmes, **la même grille de 6 parfums réels et la même fiche** en trois variantes typographiques (C1, C2, C3), avec la couleur d'ambiance calculée sur les vraies photos, la carte pressée, le sélecteur de contenance, le cœur « Ma sélection », la barre haute en verre et son repli opaque.
- Fichiers : `public/planche/index.html` (CSS inline, aucun JS sauf bascule thème/couple et « appui »), `public/planche/fonts/*.woff2`, `scripts/refonte-vitrine/ambiance.mjs` (première version : calcul seul, sortie JSON, § B.3 étapes 1–6).
- Données : 6 parfums de `src/lib/catalog/demo-catalogue.json` — choisir **3 avec `imageLight`, 3 sans**, de fonds différents (bleu, rouge/rose, sombre), noms courts et longs. Images par leurs URL Supabase publiques (vignettes `-640.webp`).
- Polices : **avant tout téléchargement**, lister au gérant nom, source (dépôt GitHub de chaque fonderie ou Google Fonts) et taille ; télécharger après son accord ; `@font-face` local, `font-display: swap`.
- Spécification : § B intégral (palette, rôles de texte, rayons, verre, états). Trois onglets de couple, deux onglets de thème, un bouton « repli sans verre ». Six pastilles d'ambiance affichées avec leur contraste calculé.
- Acceptation : `node scripts/refonte-vitrine/ambiance.mjs --planche` écrit `public/planche/ambiance.json` avec, par parfum, `hue`, `chroma`, `dark`, `light`, `contrastText1`, `contrastText3` ≥ seuils ; la page s'ouvre sans console d'erreur ; aucun `#000/#fff`, aucune police de la liste anti-slop (`grep` manuel) ; aperçu Vercel de la branche `refonte/planche` ouvert **sur le téléphone du gérant**.
- Interdit : toucher `DESIGN.md`, `app/(shop)`, `src/`. La planche n'est pas du code de production.

**T2 — Documents amont** · M · Opus medium · après PC 1
- Objectif : rendre vrais les documents de design.
- Fichiers : `DESIGN.md` (réécrit depuis § B + choix du gérant), `.impeccable.md`, `PRODUCT.md` (vocabulaire, « Ma sélection », contenance), `docs/charte-graphique.html` (réécrit : palette, rôles, états, à partir de la planche), `CLAUDE.md` § « Règles Vitrine » (remplacer le bloc v3 par un renvoi à `DESIGN.md`).
- Acceptation : plus aucune mention de « cuivre », « angles 0 », « Newsreader », « Instrument Sans » dans ces fichiers (`grep -ril` vide) ; `npm test` vert.

### Phase 1 — fondations

**T3 — Jetons et thèmes** · M · Opus medium
- Fichiers : `app/globals.css` **réécrit de zéro** (primitifs `--n-*`, sémantiques, `[data-theme]`/`.dark`, `color-scheme`, échelles § B.5, mouvement § B.7, rôles de texte § B.4, `:focus-visible`, `prefers-*`), `src/design/brand.ts` (hex des deux thèmes, `THEME_COLOR` par thème), `tailwind.config.ts` (couleurs = `var(--…)`, rayons, durées ; supprimer tout jeton v3).
- Acceptation : `npm test` vert (anti-slop, css-registers) ; `grep -c "cuivre\|nurea-" app/globals.css` = 0 ; les 16 jetons sémantiques existent dans les deux thèmes (test unitaire `tests/architecture/vitrine-tokens.test.ts` à écrire : chaque jeton défini pour `:root` et `.dark`).

**T4 — Polices** · S · Opus medium
- Fichiers : `src/design/fonts.ts` (couple choisi, `next/font/google`, axes, graisses § B.4, `adjustFontFallback`), suppression de `app/(shop)/_og/InstrumentSans-Medium.ttf` et ajout de la police de titre en TTF statique pour `next/og`.
- Acceptation : `NUREA_SKIP_MIGRATE_DEPLOY=1 DATABASE_URL=postgresql://x DIRECT_URL=postgresql://x npm run build` passe ; total des `.woff2` de `.next/static/media` ≤ 120 Ko (commande `du` dans le commit) ; sinon instances statiques et re-mesure.

**T5 — Coque** · M · Opus medium
- Fichiers : `app/(shop)/layout.tsx`, `app/not-found.tsx`, `Navbar.tsx` (barre haute en verre § B.6 : logo, champ de recherche permanent, cœur avec compteur, bascule de thème), `Footer.tsx` (mentions `MENTION_FLACONS`/`MENTION_PHOTOS`, liens, « Nuréa » accentué), `BrandLogo.tsx` (ivoire/noir par CSS, jamais `useTheme`), `ThemeProvider.tsx` (`enableSystem`, `defaultTheme="system"`, `disableTransitionOnChange` conservé), lien d'évitement, `<main id="main-content">`.
- Acceptation : `npm test` vert ; `backdrop-filter` ≤ 2 occurrences ; captures 390/820/1440 × 2 thèmes par `node scripts/refonte-vitrine/capture.mjs http://localhost:3000 .tmp/refonte-vitrine/t5` sans débordement horizontal (vérifier `document.documentElement.scrollWidth === innerWidth` à 320 px dans le navigateur intégré).

### Phase 2 — composants du catalogue

**T6 — Jeu d'essai extrême** · S · Opus medium
- Fichiers : `e2e/fixtures/vitrine-extremes.json` (nom 60 caractères sans espace, marque d'une lettre, ligne très longue, accents É Œ ç, image cassée, 0/1/193 résultats) + page de test locale `app/(shop)/_extremes/page.tsx` **non indexée et retirée avant T23** (ou `?fixture=extremes` sur l'accueil, en dev seulement).
- Acceptation : la page rend sans erreur ; servira à chaque tâche suivante (« Cassé / Moche / Fragile » noté dans le commit).

**T7 — Couleur d'ambiance en base** · M · Opus medium
- Fichiers : `prisma/schema.prisma` (`ambientHue Int?`, `ambientChroma Decimal? @db.Decimal(4,3)`, CHECK 0–359 et 0–0,4), `prisma/migrations/<date>_perfume_ambient/migration.sql`, `scripts/refonte-vitrine/ambiance.mjs` (complété : `--dry-run` par défaut, `--apply`, `--set <id> <hue> <chroma>`, lit l'URL de base **avant** tout import Prisma, journalise chaque écriture), `src/lib/data.ts`, `src/lib/catalog/getCatalogPerfumes.ts`, `seoCatalogue.ts` (exposer les deux champs), `demo-catalogue.json` régénéré avec les champs.
- Acceptation : migration jouée sur la base locale (`TEST_DATABASE_URL=… npm run test:db` vert) ; essai à blanc sur les 193 fiches : rapport JSON avec taux de repli (attendu < 25 %) et **planche des 193 pastilles** `.tmp/refonte-vitrine/ambiance.html` relue par l'exécutant (teintes boueuses → `--set`) ; `--apply` seulement après le point de contrôle 2. Jamais `prisma db push`.

**T8 — Carte et visuel** · M · Opus **high**
- Fichiers : `PerfumeCard.tsx`, `PerfumeImage.tsx` (bascule `dark:` CSS, vignette 640 aux petites largeurs via `src/lib/images/loader.ts`, `blurDataURL`, `alt` informatif), `PerfumeCardSkeleton.tsx`, `src/components/ui/Button.tsx` (3 variantes, 8 états § B.8), `Icons.tsx`.
- Spécification § B.9 ; container queries pour la carte ; `:active` = fond ambiance ; cœur 44 px.
- Acceptation : 8 états visibles sur la page d'essai T6 ; `npm test` ; captures 2 thèmes ; aucun prix.

**T9 — Grille, pagination, densité** · M · Opus medium · PC 2 (première page mobile réelle)
- Fichiers : `CatalogSection.tsx`, `CatalogToolbar.tsx`, `useCatalogFilters.ts`, `app/(shop)/page.tsx`.
- Spécification : 2 colonnes par défaut, bascule 1/2/3 (`?densite=`), **« Charger la suite »** par 24 (`?n=`), URL conservée, première image `priority`, le reste paresseux ; rail A→Z en 3 colonnes et plus.
- Acceptation : accueil ≤ 60 images au premier rendu (compter `img` dans le navigateur intégré) ; `npm test` ; Lighthouse mobile sur build : LCP ≤ 2,5 s en 4G émulée (chiffre dans le commit).

**T10 — Recherche permanente et vide** · M · Opus medium
- Fichiers : `useExtendedSearch.ts`, `CatalogEmptyState.tsx`, `Navbar.tsx` (champ), `src/components/features/PerfumeLinkCard.tsx`.
- Acceptation : requête d'un parfum du répertoire absent du catalogue → carte « Vous cherchez *X* de *Y* ? Écrivez-nous » avec lien Contact pré-rempli ; `aria-live="polite"` ; jamais la chaîne « aucun résultat » (`grep -ri "aucun résultat" src/components` vide) ; e2e `recherche` vert.

**T11 — Filtres avec compteur** · M · Opus medium
- Fichiers : `CatalogFilterDrawer.tsx` (feuille Vaul ou `useSheetMotion`, opaque), puces, URL.
- Acceptation : bouton « Voir N parfums » mis à jour avant validation ; `e2e/catalog-filters.spec.ts` réécrit et vert.

### Phase 3 — fiche et pages du catalogue

**T12 — Fiche en feuille** · L · Opus **high** · PC 3
- Fichiers : `PerfumeDialog.tsx` → `PerfumeSheet.tsx` (feuille `useSheetMotion`, fond ambiance, précédent/suivant au glissé, `?parfum=<id>`), `SnapchatOrderButton.tsx` (barre basse en verre, copie « *Nom* (*Marque*) », succès 1 600 ms), `OrderChannels.tsx`, `ChannelSoon.tsx` (WhatsApp « bientôt », jamais cliquable).
- Acceptation : depuis une fiche, message prêt en **2 taps** (compteur `e2e/helpers/tap.ts`) ; fermeture au glissé rapide (> 0,11 px/ms) et au bouton et à Échap ; focus rendu au déclencheur ; `prefers-reduced-motion` : apparition en fondu ; `npm test`.

**T13 — Ma sélection** · M · Opus medium
- Fichiers : `src/components/features/Selection{Provider,Sheet,Heart}.tsx` (nouveaux), `src/lib/selection.ts` (lecture/écriture `localStorage`, pur, testé), `Navbar.tsx` (pastille).
- Acceptation : test unitaire de `selection.ts` ; un seul message Snapchat pour N parfums ; état vide de la feuille = invitation à parcourir ; aucun compte, aucune écriture serveur (`tests/architecture/server-actions.test.ts` vert).

**T14 — Page fiche indexable, page marque, index A→Z** · M · Opus medium
- Fichiers : `app/(shop)/parfums/[marque]/[parfum]/page.tsx`, `parfums/[marque]/page.tsx` (en-tête à l'ambiance moyenne), `parfums/page.tsx`, `src/components/seo/Breadcrumbs.tsx`.
- Acceptation : URLs, canoniques, 308, sitemap inchangés (`tests/` SEO verts, `npm run build` puis diff de `sitemap.xml` avant/après = vide) ; `MENTION_FLACONS` présente ; JSON-LD par `jsonLdHtml()` ; pas de `Product`.

### Phase 4 — pages éditoriales et aperçus

**T15 — Accueil : composition** · M · **faite par Fable le 21/10** (composition « Chambre », § B.10)
- Fichiers : `Hero.tsx` (hero de marque : surtitre, accroche, faits, deux entrées, visuel de la chambre en deux lumières), `FeaturedSection.tsx` (« À l'affiche », compact), `openPerfume.ts` (ouverture de la fiche par événement, partagé avec le catalogue), `BrandShelf.tsx` (rayon des marques en images, `topBrands` testé), `app/(shop)/page.tsx`, `app/globals.css` (`.hero*`, `.affiche*`, `.rail`, `.enter`, `.enter-visuel`), `src/lib/images/loader.ts` (déclinaisons 640 de la hero), `public/branding/hero/chambre-{nuit,jour}[-640].webp` (fabrication : `annexes/hero-chambre.md`). Supprimés : `Masthead.tsx`, `BrandIndex.tsx`.
- Historique : planche v1 refusée le 20/10, planche v2 → A choisie, A codée (`3492c18`) refusée le 21/10 ; troisième passage codé directement par Fable, trois essais écartés dans la session (« La une », « Le comptoir », « Vitrine ») avant le brief définitif du gérant (vraie hero de marque).
- Acceptation (vérifiée le 21/10) : H1 unique portant « Nuréa Parfums » et « Marseille » ; aucune modale à l'arrivée ; Snapchat en **2 taps** depuis « À l'affiche », **1 tap** depuis la hero (e2e `accueil-snapchat` 8/8) ; premier écran à 390 × 844 conforme au tableau de § B.10 ; `scrollWidth === innerWidth` à 390, 768, 1280 ; deux thèmes (deux lumières) ; **LCP 1 320 / 1 576 ms** (≤ 2,5 s) ; `typecheck`, `lint`, `test` (996) verts.
- Le PC sur la page codée tranche (aperçu Vercel de la branche, téléphone). « Non » d'exécution → l'exécutant corrige ; « non » de goût → Fable.

**T16 — La parfumerie, Contact, Légal, 404** · M · Opus medium
- Fichiers : `marque/page.tsx`, `contact/page.tsx`, `legal/page.tsx` (contenu juridique inchangé), `app/not-found.tsx`, `ContactForm.tsx` (étiquettes visibles, erreurs sous champ, premier champ en erreur focalisé, leurre et guard inchangés), `src/components/editorial/*` (réécrits ou supprimés ; `Seal`, `Monogram` : monogramme cerclé seulement sur photo).
- Acceptation : formulaire envoie via `src/actions/contact.ts` inchangé ; `MENTION_FLACONS` sur La parfumerie et Contact ; 404 renvoie à la recherche.

**T17 — Images OG** · S · Opus medium
- Fichiers : les 5 `opengraph-image.tsx`, `twitter-image.tsx`, `app/(shop)/_og/`.
- Acceptation : chaque route répond 200 en `image/png`, 1200 × 630, police de titre, logotype ivoire sur `--bg` sombre ; fiche parfum : visuel + ambiance.

### Phase 5 — mouvement et qualité

**T18 — Mouvement** · M · Opus medium
- Fichiers : `globals.css` (jetons déjà posés), `ScrollReveal.tsx` (entrée unique, cascade plafonnée), transitions de feuille, appui.
- Acceptation : trois passes (normal, ralenti ×4 dans les DevTools, `prefers-reduced-motion`) notées dans le commit ; aucune animation sur `width/height/top` (`grep` sur `transition:` et `@keyframes`) ; test au doigt sur téléphone (le gérant ou l'exécutant via aperçu).

**T19 — Audit et Core Web Vitals** · M · Opus medium
- Fichiers : corrections ponctuelles ; `docs/refonte-vitrine/annexes/audit-final.md` (nouveau).
- Acceptation : build de production local (`NUREA_SKIP_MIGRATE_DEPLOY=1` + URLs factices, catalogue de démo) ; Lighthouse mobile ≥ 90 / 100 / 95 ; LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 ; 0 violation AA (axe via Playwright) ; zoom 200 % tenu à 390 px ; anti-slop ≤ 3 dérogations.

**T20 — Filets e2e** · S · Opus medium
- Fichiers : `e2e/catalog-filters.spec.ts`, `e2e/parcours/recherche.spec.ts`, nouveau `e2e/parcours/fiche-snapchat.spec.ts` (2 taps), `e2e/fixtures/vitrine-extremes.json` conservé.
- Acceptation : `npm run test:e2e` vert localement.

### Phase 6 — mise en ligne

**T21 — Retrait des échafaudages** · S · Opus medium
- Supprimer `public/planche/` (branche), la page `_extremes` ; vérifier `app/robots.ts` sans adresse discrète ; `npm run verify`.

**T22 — Aperçu Vercel et captures « après »** · S · Opus medium · PC 4
- Branche poussée, aperçu ouvert **depuis Snapchat** sur le téléphone du gérant (verre, polices, feuille) ; `node scripts/refonte-vitrine/capture.mjs <url-aperçu> .tmp/refonte-vitrine/apres` ; comparaison avec `avant/`.

**T23 — Mise en ligne et docs** · S · Opus medium
- Fusion sur `main`, CI verte (test d'affichage ~30 min), `00-LISEZ-MOI.md` (état : terminé), `CLAUDE.md` relu, `graphify update .`.

---

## E. Points de contrôle gérant

| PC | Après | Ce que le gérant voit | Question (oui / non) |
|---|---|---|---|
| **1** | T1 | Planche sur son téléphone : 3 couples × 2 thèmes, 6 parfums, fiche, ambiance, verre et repli | « On part là-dessus, avec ce couple de polices ? Ma sélection et le sélecteur : on garde ? » |
| **2** | T9 | Accueil réel (aperçu Vercel de la branche) : barre, grille, cartes, pagination, les 193 pastilles d'ambiance | « La page d'accueil sur ton téléphone te plaît ? Les teintes sont justes ? » |
| **3** | T12 | Fiche en feuille, Snapchat en 2 taps | « La fiche et le geste de commande sont bons ? » |
| **4** | T22 | Site complet depuis Snapchat, captures avant/après | « On met en ligne ? » |

**Règle de retour.** Une réponse « non » se classe en deux :
- **Exécution** (bug, lenteur, texte faux, état manquant, débordement) → l'exécutant corrige dans la
  même session, re-soumet le même PC.
- **Goût** (couleur, police, proportions, « ça fait généré », composition) → l'exécutant **s'arrête**,
  note la remarque dans `00-LISEZ-MOI.md` § État, et le gérant ouvre une session **Fable** (effort
  `high`) avec ce document et la remarque ; Fable amende § B puis l'exécutant reprend. Jamais
  l'exécutant ne modifie § B lui-même.

Un PC se montre **sur téléphone** (aperçu Vercel d'une branche ; sans base il affiche le catalogue
de démonstration, ce qui suffit pour PC 1–3). Jamais une capture de bureau seule.

---

## F. Découpage en sessions

Une **phase par session**, `/clear` entre deux, Opus 5.5 effort `medium` (`high` pour T1, T8,
T12), un commit par tâche, `git fetch` et comparaison à `origin/main` au début de chaque session,
`get_usage` au début et à la fin. Chantier long → worktree `.claude/worktrees/refonte-vitrine`,
branche `refonte/vitrine` ; la planche vit sur `refonte/planche` (jamais fusionnée).

| Session | Tâches | Sortie attendue |
|---|---|---|
| S1 | T1 | planche en ligne, attente PC 1 |
| S2 | T2, T3, T4 | docs vrais, jetons, polices |
| S3 | T5, T6 | coque + jeu d'essai |
| S4 | T7, T8 | ambiance en base (à blanc), carte |
| S5 | T9, T10, T11 | accueil réel, attente PC 2 → `--apply` de T7 |
| S6 | T12, T13 | fiche, sélection, attente PC 3 |
| S7 | T14, T15 | pages catalogue, accueil composé |
| S8 | T16, T17 | éditorial, OG |
| S9 | T18, T19, T20 | mouvement, audit, e2e |
| S10 | T21, T22, T23 | mise en ligne, attente PC 4 |

Dix sessions, vingt-trois tâches. Une session qui dépasse ~150 000 jetons s'arrête, commit, note
l'état dans `00-LISEZ-MOI.md`, et la suivante reprend.

---

## G. Risques et plan B

| Risque | Détection | Plan B |
|---|---|---|
| **Verre dans le navigateur de Snapchat / Android modeste** (flou absent ou saccadé) | PC 1 et PC 4 depuis Snapchat ; FPS au défilement dans le navigateur intégré en CPU ×4 | Le repli opaque (§ B.6) est **déjà** dessiné et activé par `@supports` ; si saccade mesurée : `backdrop-filter` retiré partout, barres opaques à 96 %, aucune autre modification. Le site ne dépend pas du verre |
| **Teinte boueuse** (flacon doré sur brun, marbre) | Planche des 193 pastilles (T7), taux de repli > 25 % | Resserrer les bornes (C max 0,06 sombre) ; `--set` manuel pour les cas isolés ; si > 40 % de repli : ambiance limitée à la fiche, grille entièrement neutre |
| **332 images à l'accueil** | Compte d'`img` au premier rendu, LCP (T9, T19) | Pagination par 24 (T9) ; si LCP > 2,5 s malgré tout : 12 au premier rendu + vignettes 320 px (`toWebpThumbnail` nouvelle taille, script de rattrapage) |
| **Polices** : > 120 Ko, ou rendu baveux en sombre, ou « Œ » absent | `du` au build (T4) ; planche (T1) | Instances statiques 2 graisses ; sous-ensemble `latin` seul et « Œ » composé ; dernier recours : couple C3 (le plus sobre) |
| **64 fiches sans `imageLight`** en thème clair | Captures clair (T8) | Visuel sombre affiché tel quel dans un cadre `--surface-2` ; la teinte d'ambiance claire vient du même calcul. Régénération des visuels : chantier à part |
| **`next/font/google` sans réseau au build Vercel** | build | Déposer les woff2 dans `src/design/fonts/` et passer à `next/font/local` (même API) |
| **Aperçu Vercel sans base** (catalogue de démo) | normal | Suffit pour PC 1–3 ; PC 4 sur l'aperçu de `main` ou en production |
| **Dérive de goût de l'exécutant** | PC | Règle de retour § E : l'exécutant ne réinvente pas § B |

---

## H. Définition de « terminé » (reprend `03-DA.md` § 6)

- LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (mobile, 4G émulée, build de production) ; Lighthouse
  mobile performance ≥ 90, accessibilité 100, SEO ≥ 95.
- 0 violation WCAG 2.2 AA ; cibles ≥ 44 px ; 200 % de zoom tenu ; mouvement et transparence réduits
  respectés ; clavier complet ; contrastes de § B tenus **y compris sur l'ambiance**.
- `tests/architecture/anti-slop.test.ts` vert, ≤ 3 dérogations motivées ; `backdrop-filter` ≤ 2.
- Fiche → message Snapchat en 2 taps ; accueil → 4 taps ; « Ma sélection » → un message pour N.
- Recherche d'un parfum absent → invitation à écrire, jamais « aucun résultat ».
- **Aucune contenance (ml) affichée** sur la vitrine (`grep -rn " ml" app/\(shop\) src/components` sans résultat visible).
- Aucune modale, bannière ou fenêtre à l'arrivée.
- URLs, canoniques, sitemap, 308, JSON-LD, mentions légales : identiques (`01-INVARIANTS.md`).
- Deux thèmes complets, 193 fiches visibles dans chacun ; logos ivoire/noir, proportions intactes.
- `DESIGN.md`, `.impeccable.md`, `PRODUCT.md`, `docs/charte-graphique.html`, `CLAUDE.md` décrivent
  le site **tel qu'il est** ; `00-LISEZ-MOI.md` marque la refonte terminée.
- Captures 390 / 820 / 1440 « après » archivées à côté des « avant » ; `main` déployé, CI verte.
