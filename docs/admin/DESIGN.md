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
| `--admin-text-subtle` | `#726B75` | Hints, placeholders, et **les libellés de chiffres en capitales de 11 px**. 4,62:1 sur le fond de page, 5,15:1 sur une carte. L'ancien `#8A828E` plafonnait à 3,32:1 : illisible dehors. |
| `--admin-accent` | `#7b0b1d` | **Bordeaux** — liens actifs, focus, indicateur tab |
| `--admin-accent-hover` | `#8f1428` | Hover accent |
| `--admin-accent-bg` | `rgba(123,11,29,0.08)` | Fond sélection légère |
| `--admin-accent-subtle` | `rgba(123,11,29,0.12)` | Sélection texte |
| `--admin-accent-ring` | `rgba(123,11,29,0.30)` | Anneaux focus alternatifs |
| `--admin-on-accent` | `#FFFFFF` | Texte et icône sur un aplat plein (accent, danger, success, warning) — remplace les `text-white` en dur, ≥ 5:1 sur chacun. |
| `--admin-success` | `#1e7d45` | Validé, payé |
| `--admin-warning` | `#a35b12` | Attention, retard |
| `--admin-danger` | `#b72938` | Erreur, suppression |
| `--admin-info` | `#3e5a7a` | Information neutre |
| `--admin-overlay` | `rgba(26,18,21,0.38)` | Backdrop des sheets et des dialogues |
| `--admin-viewer-backdrop` | `rgba(10,8,9,0.94)` | Visionneuse plein écran de `MediaGallery` — une image se juge sur du noir |

Chaque état sémantique expose aussi `*-bg`, `*-subtle`, `*-border` pour badges et alertes.

**Le bordeaux est le SEUL accent.** `success` marque l'accompli (payé, soldé, livré),
`warning` l'attente et le retard rattrapable — seul ton d'un montant non reçu —,
`danger` l'anomalie et l'irréversible, `info` le contexte neutre, rare. Aucun d'eux
ne décore.

**Ce tableau est une lecture, pas une source.** La source unique est
`src/design/tokens.ts` ; `globals.admin.css` n'en est que l'exposition en `--admin-*`,
et `tests/architecture/tokens-sync.test.ts` échoue dès qu'une variable diverge, manque,
est déclarée deux fois, ou qu'une couleur, un rayon, une durée ou un z-index est écrit
en dur dans `src/ui`.

**PWA** :

| Rôle | Couleur | Où |
|------|---------|-----|
| `theme_color` (barre d'état iOS/Android) | `#F2F2F7` | `manifests.ts`, `viewport.themeColor` |
| `background_color` (écran de lancement) | `#7B0B1D` | `manifests.ts` |
| Icônes | bordeaux plein + monogramme ivoire | `public/pwa/admin/*` |

`theme_color` suit le chrome de l'app, pas la marque : avec `apple-mobile-web-app-status-bar-style: default`, iOS écrit l'heure en **noir**, illisible sur bordeaux.

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
| `field` | 16px | 400 | **Saisie** (input, textarea, select) : sous 16 px, iOS Safari zoome au focus |
| `caption` | 13px | 400 | Métadonnées, secondary des lignes, messages sous un champ |
| `micro` | 11px | 500 | Libellés de chiffres en capitales (`text-subtle`), badges |

**Chiffres** : classe `.tnum` — tabular nums pour montants et compteurs.

**Tab bar labels** : 10 px, `font-bold` actif / `font-medium` inactif.

Chaque rôle a sa classe `.admin-type-<rôle>` dans la feuille — **jamais** de taille
arbitraire dans un composant. Une taille en dur signale un rôle manquant : l'ajouter
plutôt que le contourner.

## Spacing & Layout

Grille **4px** (`tokens.space`). Pas de breakpoints — calibré **320–430px**.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--admin-app-max-width` | `430px` | Rail max (iPhone 14 Pro Max) |
| `--admin-header-height` | `56px` | Header sticky |
| `--admin-tab-bar-height` | `88px` | Hauteur tab bar, safe area incluse |
| `--admin-touch-min` | `44px` | Cible tactile iOS HIG |
| `--admin-scroll-bottom-pad` | `tab-bar + 5rem` | Réserve basse des listes : tab bar **et** hauteur d'un CTA collant |
| `--admin-sticky-cta-pad` | `0.75rem + safe-area + keyboard-inset` | Barres d'action fixes |
| `--admin-keyboard-inset` | `0px` (dynamique) | Offset clavier virtuel |

**Shell** (`AdminShell.tsx`) :

- `height: 100%` + `overflow: hidden` sur `html`/`body`/`.admin-app-container` —
  **pas** de `100dvh`, qui casse le `position: fixed` de la tab bar en PWA iOS.
- Header sticky + `#admin-scroll-root.admin-shell-scroll` : zone de scroll unique.
- `admin-page-bottom-pad` / `admin-form-scroll-pad` sur le contenu.
- **Un seul écrivain** pour `--admin-vh`, `--admin-keyboard-inset` et
  `--admin-vv-offset` : le service viewport du shell, qui les pose sur `<html>`
  depuis `visualViewport`. Elles ne sont **jamais** déclarées dans la feuille — même
  à `0px`, la déclaration sur `.admin-theme` masquerait la valeur du service pour tous
  les descendants, et CTA et sheets passeraient sous le clavier iOS. Les lecteurs
  donnent leur repli : `var(--admin-keyboard-inset, 0px)`.
- Le pied de sheet ne compte **pas** l'inset clavier : il est déjà remonté par une
  marge basse égale à l'inset ; le compter deux fois gonflait le pied de 340 px.

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

Composant : `src/app-shell/TabBar.tsx`. Destinations : `src/app-shell/navigation.ts`.

**Structure** :

- Fixée `bottom-0`, `max-w-[var(--admin-app-max-width)]`, centrée, safe area incluse.
- **Cinq onglets, pas de menu « Plus »** — limite des HIG iOS. Un sixième onglet
  tronque les libellés ; un menu « Plus » cache la moitié de l'app derrière un tap.
- Actif : couleur `--admin-accent` + libellé `font-bold`. Pas de barre indicatrice.
- Icônes Lucide 23px ; libellés 10px.

**Onglets** :

| Label | Route | Match étendu |
|-------|-------|--------------|
| Accueil | `/admin` | + `/admin/journee`, `/admin/compta`, `/admin/lots`, `/admin/statistiques`, `/admin/reglages` |
| Commandes | `/admin/commandes` | préfixe |
| Vendre | `/admin/vendre` | préfixe — traitement accentué (action la plus fréquente) |
| Clients | `/admin/clients` | + `/admin/encaisser` |
| Catalogue | `/admin/catalogue` | préfixe (`parfums/*`, `marques/*`) |

**Il n'y a plus d'onglet Compta.** On entre dans la compta, la Trésorerie et les lots
**en touchant leur chiffre** sur l'Accueil : la compta se lit le soir, Clients et
« À encaisser » se touchent toute la journée. La liste ci-dessus doit rester
strictement égale à `ADMIN_TABS` — `tests/architecture/documentation.test.ts` et
`src/app-shell/__tests__/navigation.test.ts` le vérifient.

**Règle** : toute route `/admin/*` doit être rattachée à exactement un onglet via
`ADMIN_TABS[].match`. Sans quoi la barre n'affiche aucun état actif.

**Retour** : le header dérive l'écran parent de la route (`getParentScreen`), pas de
l'historique — un lien profond doit revenir dans l'app, pas en sortir. Les pages ne
rendent donc **jamais** leur propre lien retour.

**Visuel** :

- `backdrop-filter: saturate(180%) blur(20px)` + bordure haute `--admin-border`.
- `z-index: var(--admin-z-tab-bar)` (50) — sous les sheets (70+).

## Components

| Pattern | Notes |
|---------|-------|
| **Header** | `.admin-header-blur` — même blur que tab bar |
| **Sheets** | Vaul ; handle `.admin-sheet-handle` |
| **Sheets imbriquées** | Bande propre : elles partageaient celle des modales, et l'ordre des portails décidait laquelle passait devant |
| **Confirmations** | `ConfirmDialog` — texte fourni par l'appelant, focus sur « Annuler », erreur **dans la boîte** (jamais un toast inerte), corps défilant |
| **Command palette** | `cmdk` ; `Cmd+K` ou bouton Rechercher |
| **Toasts** | Portalisés vers `<body>`, au-dessus de tout — c'est souvent le toast qui explique pourquoi le reste ne répond pas |
| **Cartes** | `.admin-card-press` / `.tap-scale` — `:active scale(0.97)` |
| **Squelettes** | `.admin-skeleton` — pulse 1.6s |
| **Sticky CTA** | `.admin-sticky-cta-spacer` pour home indicator |
| **Progress nav** | `.admin-nav-route-progress` — barre indéterminée bordeaux |

**Radius** (`tokens.radius`) : `xs` 6px (micro-éléments), `sm` 8px (champs internes),
`md` 12px (**défaut des contrôles** : boutons, chips, steppers, segmented, champs),
`lg` 14px (cartes, CTA `lg`), `xl` 18px (sheets, dialogues), `2xl` 22px (palette),
`full` (pills, badges, poignées, avatars).

**Ombres** : `--admin-shadow-sm` à `--admin-shadow-xl` — teinte bordeaux légère.

### Bandes d'empilement

Une bande par couche, **jamais partagée** — l'ordre encode une hiérarchie
d'interruption. Les valeurs vivent dans `tokens.zIndex` et aucun composant n'écrit un
z-index littéral :

| Couche | z |
|---|---|
| Backdrop de sheet / sheet | 70 / 71 |
| Backdrop de sheet imbriquée / sheet imbriquée | 80 / 81 |
| Backdrop de modale / modale | 90 / 91 |
| Palette de commandes | 92 |
| Toast | 100 |

Le filet « Annuler » passe au-dessus d'une sheet ouverte, répond au doigt, et laisse
la sheet ouverte (`e2e/parcours/couches.spec.ts`).

## Motion

| Token | Valeur |
|-------|--------|
| `--admin-duration-fast` | `100ms` |
| `--admin-duration-default` | `200ms` |
| `--admin-duration-slow` | `260ms` |
| `--admin-duration-pulse` | `450ms` — pulse de confirmation après une écriture réussie |
| `--admin-duration-skeleton` | `1600ms` — seule animation autorisée au-delà de 400 ms |
| `--admin-easing-default` | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) |
| `--admin-easing-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` (ressort iOS) |

- **Press** : `tap-scale` / `admin-card-press` → `scale(0.97)` ~100ms (Emil).
- **Hover** : `.admin-lift` uniquement `@media (hover: hover) and (pointer: fine)`.
- **Jamais** : `transition: all` sur éléments tactiles ; bounce/elastic.
- **`prefers-reduced-motion`** : neutralise press, squelettes, pulse nav.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS + variables `--admin-*`
- Radix primitives via `src/ui/primitives/*`
- Lucide React (icônes)
- Vaul (bottom sheets), cmdk (palette), Recharts (chargé à la demande)
- **Pas** de shadcn vitrine, **pas** de GFS Didot

## Theme Mode

**Light uniquement** — `color-scheme: light` sur `body.admin-route` et `.admin-theme`. Pas de bascule dark.

## Anti-patterns (registre product)

- Réutiliser tokens `--nurea-*` ou palette or/charbon vitrine.
- Serif display, uppercase tracking large façon landing.
- Layout > 430px utile (tableaux larges non scrollables).
- Oublier safe area ou padding tab bar sur listes longues.
- `h-screen` ou `100dvh` sur le shell (casse `position: fixed` en PWA iOS).
- Deux chiffres qui mesurent la même somme sous deux noms sur un même écran.
- Répéter dans une ligne de liste une information déjà portée par son en-tête de
  groupe (statut, catégorie).
- Un badge d'état sur 100 % des lignes : n'afficher que l'état anormal.
- Deux chemins visibles simultanément vers la même destination (raccourci +
  onglet).
- Une barre de progression factice après navigation : elle mesure une attente
  imaginaire (abandonnée, 02 §4.6).
- Un composant de gestion écrit hors de `src/ui/*`.

## Invariants vérifiés automatiquement

La relecture d'écran par écran ne tient pas à l'échelle : elle rate ce qui ne
se voit qu'à 320 px, clavier ouvert, ou en fin de défilement. Ces règles sont
donc énoncées une fois et éprouvées sur **toutes** les routes, à trois
largeurs, par `e2e/layout-invariants.spec.ts`.

```bash
npm run test:layout
```

| Invariant | Ce qu'il empêche |
|-----------|------------------|
| `non-hydrate` | Un écran qui s'affiche parfaitement et ne réagit à rien. Cause n°1 : `useSearchParams()` sans frontière `<Suspense>`. |
| `overflow-horizontal` | Le défilement latéral, symptôme d'un élément trop large. |
| `hors-cadre` | Un élément qui sort du rail 430 px. |
| `texte-rogne` | `overflow: hidden` sans `text-overflow: ellipsis` : le mot est coupé net, rien n'indique qu'il manque du texte. |
| `cible-tactile` | Une cible sous 32 px. Entre 32 et 44 px : avertissement, pas d'échec. |
| `sous-la-barre-onglets` | Un contrôle qui reste masqué par la barre **une fois le bas atteint** — la réserve `--admin-scroll-bottom-pad` manque. |
| `champ-sous-clavier` / `cta-sous-clavier` | Un champ ou une action principale inatteignables clavier ouvert. |
| `sheet-ecrasee` | Une sheet dont la zone de contenu tombe sous 120 px clavier ouvert. |

**Simulation du clavier** : le clavier iOS ne rétrécit pas le viewport de mise
en page, seulement `visualViewport`. Les tests forcent `--admin-vh` et
`--admin-keyboard-inset`, exactement ce que pose `ViewportService` sur l'appareil.

**Écrire un écran qui passe** :

- une page = `PageScaffold` (réserve basse) ; une action de page =
  `StickyAction` ; une sheet = `Sheet`. Ces trois-là portent déjà les calculs
  de safe area et de clavier — les refaire à la main, c'est les refaire faux ;
- tout composant client utilisant `useSearchParams()` doit être sous
  `<Suspense>` dans sa page ;
- un contrôle textuel compact reçoit `.admin-hit-target` (44 px de surface,
  typographie inchangée) ;
- un contrôle volontairement plus petit porte `data-touch-exempt` **avec le
  motif en commentaire**, pour que la liste d'avertissements reste lisible.

## Coût réseau et base

Deux constats mesurés qui doivent guider toute évolution.

**Un aller-retour vers la base coûte ~140 ms.** La base est distante ; ce qui
rend un écran lent est le NOMBRE de requêtes, pas leur complexité. Trois
`count` séparés coûtent 420 ms *même lancés en parallèle*. On agrège donc côté
base (`COUNT(*) FILTER (WHERE …)`) plutôt que d'additionner des requêtes.

Les agrégats partagés entre plusieurs blocs d'un même écran passent par
`react.cache` : sans ça, deux blocs demandant la trésorerie la paient deux fois.

**Un écran doit afficher son titre immédiatement.** Le premier pixel arrive en
~50 ms ; tout ce qui attend des données va sous une frontière `Suspense`, avec
un squelette aux proportions du contenu pour que rien ne se déplace à
l'arrivée. Une page qui `await` tout avant de rendre laisse un écran vide
pendant des secondes — c'était le cas de la Compta, 3,4 s.

**Le rendu serveur d'une liste fenêtrée ne doit pas partir de la liste
entière.** Sans fenêtre à mesurer, il rend TOUT : le catalogue envoyait ses 99
lignes dans le HTML, dont 251 Ko de `srcset`, pour neuf lignes visibles. Le
premier rendu se limite à ce qui remplit l'écran.

| Écran | Avant | Après |
|---|---|---|
| Tableau de bord, rendu complet | 2796 ms | 1306 ms |
| Compta, titre lisible | 3,4 s | 35 ms |
| Catalogue, poids HTML | 539 Ko | 157 Ko |

## Ce qui ne s'affiche pas

Une commande qui ne mène nulle part occupe une place et fait douter.

- Un filtre dont le compteur vaut 0 n'est pas une option, c'est du bruit. Une
  rangée de filtres qui ne discrimine rien — un seul choix, ou plusieurs
  désignant le même ensemble — disparaît et rend sa hauteur à la liste.
- Un graphe sous deux points de mesure ne raconte rien : il ne s'affiche pas.
- Les alertes ne se montrent que s'il y a quelque chose à faire.
- Un état n'est affiché que lorsqu'il est ANORMAL. Marquer « visible » sur 99
  lignes sur 99 noie le seul cas qui compte.

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
| [`src/app-shell/navigation.ts`](../../src/app-shell/navigation.ts) | Onglets et écrans parents — source de vérité de l'architecture d'information. |
| [`src/app-shell/routes.ts`](../../src/app-shell/routes.ts) | Inventaire des écrans et constructeurs d'URL. |
| [`src/app-shell/TabBar.tsx`](../../src/app-shell/TabBar.tsx) | Rendu de la navigation principale. |
| [`src/app-shell/pwa/service-worker.ts`](../../src/app-shell/pwa/service-worker.ts) | Source du service worker, rendue par `app/admin-sw.js/route.ts`. |
| [`scripts/build-admin-pwa-assets.mjs`](../../scripts/build-admin-pwa-assets.mjs) | Génération icônes + écrans de lancement iOS. |
| [`src/app-shell/AdminShell.tsx`](../../src/app-shell/AdminShell.tsx) | Layout shell. |
| [`app/admin/layout.tsx`](../../app/admin/layout.tsx) | Viewport, manifeste, metadata PWA. |
| [`e2e/layout-invariants.spec.ts`](../../e2e/layout-invariants.spec.ts) | Invariants d'affichage, toutes routes × trois largeurs. |
| [`tests/architecture/tokens-sync.test.ts`](../../tests/architecture/tokens-sync.test.ts) | Jetons, bandes d'empilement, valeurs en dur. |
| [`docs/refonte/05-DESIGN-SYSTEM.md`](../refonte/05-DESIGN-SYSTEM.md) | Le design system de la refonte, en entier. |
