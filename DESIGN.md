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

**Une chambre neutre et calme ; la seule couleur est celle du flacon qu'on regarde.** L'interface
n'a aucun accent de marque : l'accent *est* la teinte dominante du visuel (la **couleur
d'ambiance**), calculée, bornée, posée sur la fiche et sur la carte pressée. Tout le reste est un
neutre chaud teinté, en deux thèmes symétriques. Structure, matière et mouvement s'inspirent des
interfaces d'Apple ; rien ne doit faire « site généré ».

## Couleurs

Deux couches : primitifs (`--n-*`), puis jetons sémantiques. Un thème ne redéfinit **que** le
sémantique. En CSS on écrit `oklch()` ; le hex sert à `brand.ts`.

**Thèmes.** Clair et sombre, `prefers-color-scheme` par défaut (sombre si le système ne dit rien),
bascule manuelle conservée.

| Jeton | Sombre | Clair | Rôle |
|---|---|---|---|
| `--bg` | `oklch(0.16 0.012 20)` `#120B0B` | `oklch(0.975 0.006 70)` `#F9F6F2` | fond de page |
| `--surface-1` | `oklch(0.21 0.012 20)` `#1E1616` | `oklch(0.945 0.008 70)` `#F0ECE7` | carte, champ, barre (opaque) |
| `--surface-2` | `oklch(0.26 0.012 20)` `#2A2222` | `oklch(0.91 0.010 65)` `#E6E0DB` | carte pressée, puce active, popover |
| `--line` | `oklch(0.34 0.012 20)` `#3E3635` | `oklch(0.84 0.012 60)` `#D1C9C3` | filet 1 px (décoratif) |
| `--text-1` | `oklch(0.95 0.008 60)` `#F3EDE9` | `oklch(0.22 0.012 20)` `#201818` | titres, noms, boutons |
| `--text-2` | `oklch(0.78 0.012 50)` `#BEB5B1` | `oklch(0.42 0.014 20)` `#554A4A` | texte courant, marque |
| `--text-3` | `oklch(0.66 0.014 40)` `#9A908C` | `oklch(0.48 0.014 20)` ≈ `#655A5A` | légendes, placeholder |
| `--error` | `oklch(0.74 0.13 20)` `#F28788` | `oklch(0.50 0.16 20)` `#AC2F3B` | erreur de formulaire seulement |
| `--focus` | = `--text-1` | = `--text-1` | anneau de focus 2 px, décalé 2 px |

Contrastes calculés (WCAG) : `--text-1` ≥ 13:1, `--text-2` ≥ 6,5:1, `--text-3` ≥ 4,9:1 sur toutes
les surfaces, dans les deux thèmes ; `--error` ≥ 6:1 sur `--bg`.

**Aucune autre couleur n'existe dans la vitrine.** Jamais `#000` ni `#fff`, jamais de violet ou
d'indigo, jamais de texte en dégradé (tenu par `tests/architecture/anti-slop.test.ts`). Le bordeaux
et les autres teintes du logo **ne sont pas des jetons**.

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
| `body` | `1rem` | 400 | 0 | 1,6 (sombre : 1,65) | texte, marque en carte (`--text-2`) |
| `caption` | `0.75rem` | 500 | +0,02 em | 1,4 | compteur, mention légale |

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

- **Carte parfum** : visuel 2:3, puis la marque (`body`, `--text-2`, « Marque · Ligne »), puis le
  nom (`subtitle`, `--text-1`). Cœur « Ma sélection » 44 px en haut à droite du visuel. Pressée :
  fond d'ambiance. **Jamais de prix, jamais de contenance.**
- **Fiche** : feuille depuis le bas (`--r-xl`, poignée 36 × 4 px), fond d'ambiance, visuel 2:3 plein
  largeur, marque puis nom, mention `MENTION_FLACONS`, barre basse en verre avec « Commander sur
  Snapchat » (copie « *Nom* (*Marque*) »). Précédent / suivant au glissé horizontal. Adresse
  `?parfum=<id>` sur l'accueil ; page indexable `/parfums/<marque>/<nom>-<id>` au même contenu.
- **Recherche** : champ permanent dans la barre haute, résultats dès 2 caractères. Jamais « aucun
  résultat » : « Vous cherchez *X* ? Écrivez-nous », message pré-rempli.
- **Filtres** : feuille opaque, compteur direct « Voir 42 parfums », puces actives supprimables,
  tout dans l'adresse.
- **Ma sélection** : liste gardée sur l'appareil (`localStorage`, `nurea:selection:v1`), compteur
  sur le cœur de la barre, feuille qui liste les parfums et un bouton « Commander ces N parfums sur
  Snapchat » qui compose un seul message. Aucun compte, aucune écriture serveur.
- **Accueil** : composition **« Vitrine »** (Fable, 21/10/2026, `04-PLAN-EXECUTION.md` § B.10), après
  trois refus. Avant le catalogue : la **manchette** (H1 « Nuréa Parfums, Marseille » en `title`, les
  deux compteurs en `caption`, rien d'autre), puis chaque parfum mis en avant en **vitrine** — un
  objet posé sur un **champ de sa couleur** : le champ (ambiance, bord à bord) commence sous le haut
  du visuel 2:3, qui déborde, décalé vers la droite ; sur le champ, la marque en `body` puis le **nom
  en `display`** (le grand format typographique de la page est au produit) ; la seconde vitrine en
  miroir —, puis le **rayon des marques** (les 8 plus fournies, chacune montrée par un de ses
  flacons, glissé sur téléphone, 8 colonnes dès 1024 px), le catalogue, le pied de page. Bureau : la
  légende à gauche, centrée sur la hauteur du visuel. Mouvement : entrée à l'arrivée, une fois (champ,
  visuel, légende en cascade : l'objet se pose sur son champ), rien d'autre. Jamais le gabarit
  « grande phrase + deux boutons + photo assombrie », jamais de texte sur une photo, aucun bouton
  avant le catalogue, aucune fonction dupliquée (recherche, filtres, nouveautés restent dans la barre
  et le catalogue). Le visuel de la première vitrine est l'élément LCP : vignette 640, préchargé pour
  le thème du système ; nom et visuel ouvrent la fiche en feuille.

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

Logos et monogrammes de `public/branding/` : **ivoire sur sombre, noir sur clair**, bascule en CSS.
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
