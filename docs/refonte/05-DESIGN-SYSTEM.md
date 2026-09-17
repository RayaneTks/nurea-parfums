# 05 — Design system

**Date : 17 septembre 2026.**

**But du document.** Définir le design system de la refonte de « Nuréa Gestion » (PWA admin iOS de Nuréa Parfums) : identité, tokens, inventaire cible des primitives et des patterns, gestes et motion, règles d'écran, accessibilité. L'audit (`docs/refonte/01-AUDIT-EXISTANT.md`) a établi que l'identité visuelle et l'essentiel des règles existantes sont **bons** : ce document est une **consolidation évoluée et premium** de l'existant, pas une rupture. Tout ce qui change par rapport à l'existant est motivé et récapitulé en §7. Ce document est autoportant : un exécutant qui n'a jamais vu ce repo peut implémenter le design system avec cette seule série `docs/refonte/`.

**Docs amont** : `docs/refonte/00-README.md` (cadre, invariants), `docs/refonte/01-AUDIT-EXISTANT.md` (bugs et frictions UX cités ici), `docs/refonte/02-VISION-PRODUIT.md` (principes produit, vocabulaire canonique §6, nouveautés N1–N9).
**Docs aval** : `docs/refonte/06-ECRANS-PARCOURS.md` (compose les écrans avec ces briques), `docs/refonte/07-PLAN-EXECUTION.md` (ordonnance la construction). `03-MODELE-DONNEES.md` et `04-ARCHITECTURE.md` sont indépendants de ce document, à une exception : les emplacements de fichiers cités ici (`src/ui/*`, `src/design/*`, `src/app-shell/*`) sont l'arborescence de référence, que `04-ARCHITECTURE.md` reprend.

**Directive prioritaire du client** : la prise en main et l'aspect pratique priment. Chaque règle de ce document sert la vitesse et le confort d'une utilisation **à une main, debout, sur iPhone** — jamais le décor.

---

## 1. Atmosphère & identité (conservée, affinée)

### 1.1 Ce qui ne change pas (invariants)

L'app doit rester **la même app en mieux**. Ces sept points sont non négociables :

- **Registre `product`**, disjoint du registre vitrine `brand` jusque dans les feuilles de style. Aucun token `--nurea-*`, aucune police vitrine (Newsreader, Instrument Sans), aucun or/charbon. La feuille admin est autonome (`src/design/globals.admin.css`), chargée par `app/admin/layout.tsx` uniquement.
- **Bordeaux `#7B0B1D` sur neutres iOS `#F2F2F7`** : un seul accent, posé avec parcimonie (actions, états actifs, focus). La hiérarchie vient de la densité d'information et des états sémantiques, pas de la couleur décorative.
- **SF system** (`-apple-system…`), jamais de Google Fonts côté admin.
- **Light uniquement** (`color-scheme: light`) — y compris quand l'OS est en sombre. `theme_color` PWA reste `#F2F2F7` (l'heure iOS s'écrit en noir : lisible), `background_color` de lancement reste `#7B0B1D`.
- **Rail 430 px** centré, même sur desktop. Pas de breakpoints : tout est calibré 320–430 px.
- **Cinq onglets, pas de menu « Plus »** ; onglet Vendre accentué ; retour dérivé de la route (jamais de l'historique).
- **Français direct**, vocabulaire des chiffres canonique (02 §6) : Encaissé / À encaisser / Marge nette / Trésorerie, sans synonyme.

### 1.2 L'atmosphère cible : « app iOS native de confiance »

Référence mentale : Réglages, Notes, une app bancaire — **pas** une boutique de nuit ni un dashboard SaaS. Concrètement :

- Fond gris système, surfaces blanches, filets discrets (`rgba(0,0,0,0.08)`), ombres quasi imperceptibles.
- Les **chiffres sont les vedettes** : tabulaires (`.tnum`), gros quand ils dominent (Encaissé), alignés à droite dans les listes, toujours au vocabulaire canonique.
- Un écran = une intention. L'action principale est en bas, sous le pouce (`StickyAction`), unique et évidente.
- Le calme comme signal : **un état ne s'affiche que s'il est anormal** (§5.3). Un écran silencieux veut dire « tout va bien ».

### 1.3 L'affinage « premium »

Le premium ici n'est pas un habillage : c'est la **cohérence absolue** (aucune valeur en dur hors tokens, aucun composant hors `src/ui/*`), la **réponse immédiate au doigt** (press scale 100 ms, optimistic UI, squelettes exacts) et la **précision typographique** (tabular nums partout où il y a un montant, capitalisation française des dates, libellés de chiffres lisibles en plein soleil — contraste §2.1). Rien de plus.

---

## 2. Tokens

**Source de vérité : `src/design/tokens.ts`** (objet TypeScript). **`src/design/globals.admin.css` en est dérivé** et `tailwind.config.ts` l'étend. Règle de consolidation, née d'une divergence constatée par l'audit (le CSS avait corrigé `--admin-text-subtle` pour le contraste sans que `tokens.ts` suive) : **toute valeur existe dans `tokens.ts` d'abord**, la CSS ne fait que l'exposer en `--admin-*` — idéalement générée par script, au minimum vérifiée par un test de synchronisation (comparaison tokens ↔ variables CSS). Un composant ne code **jamais** une couleur, un rayon, une durée ou un z-index en dur : il consomme un token. L'existant violait cette règle en plusieurs points (§7).

Les variables **runtime** (`--admin-vh`, `--admin-vv-offset`, `--admin-keyboard-inset`) ont chacune **un seul écrivain** : le service viewport unique du shell (fusion des deux hooks concurrents de l'existant, décidée en 02 §4.6). Elles ne sont jamais redéclarées dans la feuille de style (les redéclarer masquerait la valeur du hook — piège documenté de l'existant, conservé en commentaire).

### 2.1 Couleurs

Palette conservée de l'existant, avec deux corrections et une suppression.

| Token | Valeur | Usage |
|---|---|---|
| `--admin-bg` | `#F2F2F7` | Fond app (gris système iOS) |
| `--admin-surface` | `#FFFFFF` | Cartes, sheets, champs |
| `--admin-surface-alt` | `#F9F8F6` | Variante de surface (zones secondaires) |
| `--admin-surface-muted` | `#EFEAE4` | Fonds atténués (segmented control, icône d'EmptyState) |
| `--admin-surface-hover` | `#E9E2DA` | Hover desktop (souris uniquement) |
| `--admin-border` | `rgba(0,0,0,0.08)` | Séparateurs, filets |
| `--admin-border-strong` | `rgba(0,0,0,0.14)` | Bordures de champs et boutons secondaires |
| `--admin-border-hover` | `color-mix(in srgb, var(--admin-text) 16%, transparent)` | Bordure de champ au hover desktop |
| `--admin-text` | `#111114` | Texte principal |
| `--admin-text-muted` | `#5F5862` | Texte secondaire |
| `--admin-text-subtle` | **`#726B75`** | Hints, placeholders, **libellés de chiffres en capitales 11 px** |
| `--admin-accent` | `#7B0B1D` | Bordeaux — actions, état actif, focus |
| `--admin-accent-hover` | `#8F1428` | Hover/active de l'accent |
| `--admin-accent-bg` | `rgba(123,11,29,0.08)` | Fond de sélection légère |
| `--admin-accent-subtle` | `rgba(123,11,29,0.12)` | Sélection de texte |
| `--admin-accent-ring` | `rgba(123,11,29,0.30)` | Anneau de focus |
| `--admin-success` | `#1E7D45` | Validé, payé, soldé |
| `--admin-warning` | `#A35B12` | En attente, retard, À encaisser |
| `--admin-danger` | `#B72938` | Erreur, destruction, créance ancienne |
| `--admin-info` | `#3E5A7A` | Information neutre |
| `--admin-overlay` | `rgba(26,18,21,0.38)` | Backdrop des sheets et modals |

Chaque couleur sémantique (`success`, `warning`, `danger`, `info`) expose aussi `*-bg` (fond ~10 %), `*-subtle` (fond ~8–10 %) et `*-border` (~22 %) pour badges, bandeaux et alertes — valeurs de l'existant reconduites telles quelles.

**Correction 1 — contraste des libellés.** `--admin-text-subtle` vaut **`#726B75`** (4,62:1 sur le fond de page, 5,15:1 sur une carte), et non le `#8A828E` (3,32:1) resté dans `tokens.ts` de l'existant. Ce jeton porte les libellés « ENCAISSÉ », « À ENCAISSER », « TRÉSORERIE » en capitales de 11 px — ce qu'il y a de plus dur à lire, sur un téléphone regardé dehors. `tokens.ts` est réaligné sur la valeur CSS corrigée.

**Correction 2 — sémantique fixée.** Pour fermer les ambiguïtés relevées par l'audit (retard tantôt ambre tantôt rouge selon l'écran) :

- **`warning` = l'attente et le retard rattrapable** : montants « À encaisser » (c'est le **seul** ton admis pour un montant non reçu), commandes en retard, stock bas. Raisonnement hérité de l'existant (« pourquoi ambre et pas rouge ») : un retard n'est pas une faute, le rouge doit rester rare pour rester alarmant.
- **`danger` = l'anomalie et l'irréversible** : erreurs, suppressions, créances > 30 jours, rupture de stock.
- **`success` = l'accompli** : payé, soldé, livré. Jamais pour décorer.
- **`info` = le contexte neutre**, rare.
- Un montant positif n'est pas « vert » par défaut : `success` signale un événement (paiement enregistré), pas une valeur.

**Suppression — le cuivre.** `--admin-cuivre` (`#B4895E`, « accent secondaire (rare) ») n'a aucun rôle défini et invite à la décoration. Conformément à l'anti-référence « un jeton sans lecteur n'est pas livré » (02 §8), il disparaît : **le bordeaux est le seul accent**.

### 2.2 Typographie

Stack et features conservées :

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", system-ui, -apple-system-body, sans-serif;
font-feature-settings: "ss01", "cv11";
```

Rôles sémantiques (dans `tokens.ts`, consommés par `Text`/`Heading` — jamais de taille arbitraire dans un composant) :

| Rôle | Taille / poids / interligne | Usage |
|---|---|---|
| `display` | 32 px / 700 / 1.1 | Montant dominant d'un écran (Encaissé du dashboard) — rare |
| `h1` | 28 px / 700 / 1.15 | Titre de page |
| `h2` | 20 px / 600 / 1.25 | Titre de section, montant de tuile KPI secondaire |
| `h3` | 16 px / 600 / 1.3 | Sous-section, titre de sheet |
| `body` | 15 px / 400 / 1.4 | Texte courant, primary des lignes de liste (500 en liste) |
| `bodyEm` | 15 px / 600 / 1.4 | Emphase inline, montants de ligne |
| `caption` | 13 px / 400 / 1.4 | Métadonnées, secondary des lignes |
| `micro` | 11 px / 500 / 1.3 / tracking 0.04em | **Libellés de chiffres** (capitales, `--admin-text-subtle`), labels de tab bar (10 px en UI) |

Règles typographiques :

- **Tout chiffre porte `.tnum`** (`font-variant-numeric: tabular-nums lining-nums`) : montants, compteurs, quantités, heures. Sans exception — c'est ce qui permet aux colonnes de chiffres de s'aligner et aux montants de ne pas « sauter » quand ils changent.
- **Hiérarchie des montants** : `display` pour le montant dominant (un par écran maximum), `h2` pour les tuiles, `bodyEm` pour les lignes. Les centimes ne s'affichent pas sur les tuiles KPI (`compact`), s'affichent partout ailleurs.
- **Capitalisation française** : seule l'initiale de phrase est capitale. Jamais la classe CSS `capitalize` sur une date ou un titre (l'existant produisait « Mercredi 17 Septembre » — corrigé : « mercredi 17 septembre », capitale portée par le contexte de phrase).
- **Champs de saisie à 16 px minimum** (`input`, `textarea`, `select`) : en dessous, iOS Safari zoome au focus.

### 2.3 Espacement

Grille **4 px** conservée : `space` = 0 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 px (clés `0–20` de `tokens.ts`). Usage type : 16 px de padding latéral de page, 12 px entre champs d'une section, 16 px entre sections, 12 px de padding interne des lignes de liste.

### 2.4 Radius

L'audit du code révèle que **le rayon le plus utilisé (12 px) était absent de l'échelle** : les composants le codaient en dur (`rounded-[12px]` sur Button md, SegmentedControl, focus des ListRow). L'échelle est consolidée et les composants la consomment :

| Token | Valeur | Rôle |
|---|---|---|
| `xs` | 6 px | Micro-éléments rectangulaires (vignette 24 px) |
| `sm` | 8 px | Champs internes, petites vignettes |
| `md` | **12 px** | **Défaut des contrôles** : boutons, chips, steppers, segmented, champs, focus des lignes |
| `lg` | 14 px | Cartes, CTA `lg` |
| `xl` | 18 px | Sheets, modals |
| `2xl` | 22 px | Palette de commandes |
| `full` | 9999 px | Pills, badges, handles, avatars |

(L'ancien `md` 10 px disparaît : les contrôles qui l'utilisaient — Chip, Stepper, Button sm — passent à 12 px. Un rayon de moins, une cohérence de plus.)

### 2.5 Ombres

Quatre niveaux conservés (teinte bordeaux très légère), avec une discipline d'usage :

| Token | Usage exclusif |
|---|---|
| `--admin-shadow-sm` | Cartes, CTA primaire — le défaut, quasi invisible |
| `--admin-shadow-md` | Hover desktop (souris), menus contextuels |
| `--admin-shadow-lg` | Sheets |
| `--admin-shadow-xl` | Palette de commandes, modals |

La séparation vient d'abord des **filets et des fonds**, pas des ombres — une ombre marquée sur mobile est un anti-pattern du registre.

### 2.6 Motion

Tokens conservés :

| Token | Valeur | Usage |
|---|---|---|
| `--admin-duration-fast` | 100 ms | Press scale, feedback tactile |
| `--admin-duration-default` | 200 ms | Transitions de contrôle (couleur, opacité) |
| `--admin-duration-slow` | 260 ms | Entrées/sorties (sheets, menus) |
| `--admin-easing-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | ease-out-expo — tout par défaut |
| `--admin-easing-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets (ressort iOS) |
| `pressScale` | 0.97 | Échelle d'appui |

Les **règles** de motion sont en §4.4. Interdits absolus : `transition: all` (les classes legacy `.admin-ios-transition` et `.ios-transition` de l'existant, qui le faisaient, ne sont pas reconduites), bounce/elastic, toute animation > 400 ms hors squelettes.

### 2.7 Z-index

Registre unique dans `tokens.ts`, exposé en `--admin-z-*`. **Aucun composant n'écrit un z-index littéral** (la CommandPalette de l'existant codait `z-[80]`/`z-[90]` en dur — les valeurs coïncidaient « par chance » ; corrigé).

| Token | Valeur | Couche |
|---|---|---|
| `base` | 0 | Contenu |
| `appHeader` | 40 | Header sticky |
| `tabBar` | 50 | Tab bar |
| `tabBarMenu` | 52 | Menu contextuel ancré à la tab bar (absent de `tokens.ts` existant — ajouté) |
| `sheetBackdrop` / `sheet` | 70 / 71 | Sheets (au-dessus de la tab bar) |
| `modalBackdrop` / `modal` | 80 / 81 | Modals, ConfirmDialog, **sheets imbriquées** |
| `commandPalette` | 90 | Palette de commandes |
| `toast` | 95 | Toasts — au-dessus de tout |

(`fab` 55 disparaît : la cible n'a pas de FAB — l'action de création vit dans le header de liste ou la palette. Jeton sans lecteur = supprimé.)

### 2.8 Layout, safe areas et clavier (tokens de shell)

Conservés tels quels — c'est la partie la plus éprouvée de l'existant, y compris ses commentaires-pièges :

| Token | Valeur | Rôle |
|---|---|---|
| `--admin-app-max-width` | 430 px | Rail |
| `--admin-header-height` | 56 px | Header sticky |
| `--admin-tab-bar-height` | 88 px | Tab bar, **safe area incluse** (border-box) |
| `--admin-touch-min` | 44 px | Cible tactile minimale (HIG iOS) — `comfortable` 48 px, `large` 52 px pour les CTA |
| `--admin-scroll-bottom-pad` | tab bar + 5 rem | Réserve basse des listes (le dernier élément ne passe jamais sous la barre ni sous un CTA sticky) |
| `--admin-sticky-cta-pad` | 0.75 rem + safe area + inset clavier | Padding des barres d'action fixes |
| `--admin-sheet-footer-pad` | 0.75 rem + max(0, safe area − inset clavier) | Pied de sheet (l'inset clavier n'y figure pas : déjà compensé par la marge basse — le compter deux fois écrasait la liste, bug documenté de l'existant) |
| `--admin-vh`, `--admin-keyboard-inset` | runtime | Posés par **le** service viewport du shell sur `visualViewport` — un seul écrivain |

Règles de shell inchangées : `height: 100%` + `overflow: hidden` sur html/body/conteneur (**jamais** `100dvh`/`h-screen` : casse le `position: fixed` de la tab bar en PWA iOS) ; une **seule zone de scroll** (`#admin-scroll-root`) ; `viewportFit: cover` et classes `.admin-safe-top`/`.admin-safe-bottom`.

---

## 3. Inventaire cible des composants

Tout composant d'interface vit dans `src/ui/primitives/` (briques neutres) ou `src/ui/patterns/` (compositions), le shell dans `src/app-shell/`. **Interdit** : un second jeu de composants admin ailleurs, ou un composant de feature qui réimplémente une brique. Les features (`src/features/<domaine>/components/`) ne font que composer.

Légende des états : tous les contrôles interactifs ont au minimum **repos / pressé (scale 0.97) / focus-visible (anneau accent) / désactivé (opacité 0.5, curseur interdit)** ; seuls les états supplémentaires sont listés.

### 3.1 Primitives (`src/ui/primitives/`)

| Brique | Rôle | Props clés | États / règles |
|---|---|---|---|
| `Text`, `Heading` | Typographie par rôle (§2.2) | `variant`, `tone`, `as` | Jamais de taille arbitraire ailleurs |
| `Stack`/`VStack`/`HStack`, `Box`, `Divider` | Mise en page sur la grille 4 px | `gap`, `padding` (tokens `space`) | — |
| `Card` | Surface de regroupement | `tone: surface\|alt\|accent\|muted`, `padding: 0–6`, `interactive`, `elevated` (défaut sm), `borderless` | `interactive` → press scale + hover desktop |
| `ListRow` | Ligne de liste standard, **min 56 px** | `leading`, `primary`, `secondary`, `trailing`, `chevron`, `href` ou `onClick` (exclusifs), `disabled`, `ariaLabel` | Texte tronqué avec ellipse (jamais coupé net) ; `trailing` = **un** montant `.tnum` ou **un** badge, pas les deux |
| `SwipeableRow` | **Nouveau** — enveloppe une `ListRow` d'actions par glissement (§4.2) | `leftAction?`, `rightAction?` (une action max par côté : `{icon, label, tone, onAction}`) | Révélation élastique ; jamais destructif sans confirmation ; chaque action a un chemin visible équivalent |
| `Button` | Action | `variant: primary\|secondary\|ghost\|danger\|text`, `size: sm(40px)\|md(44px)\|lg(52px)`, `isLoading`, `fullWidth`, `leadingIcon`, `trailingIcon`, `iconOnly` + `ariaLabel` | `isLoading` → spinner + `aria-busy`, clic inhibé. **Un seul `primary` visible par écran**. **Variante icône seule** (`iconOnly`) : carré de 44 px minimum quelle que soit l'icône, `ariaLabel` **obligatoire** (erreur de type sans lui) — œil de visibilité (06 E15), « Monter » / « Descendre » (06 S21), flèches de navigation de date |
| `Switch` | **Nouveau** — interrupteur iOS pour un réglage binaire à effet immédiat | `checked`, `onCheckedChange`, `label`, `description?`, `disabled`, `disabledReason?` | Radix Switch, `role="switch"` + `aria-checked` ; cible 44 px (rangée entière tapable) ; optimiste + rollback + toast portant la raison ; verrouillé : raison affichée en `description`, jamais un interrupteur grisé muet. Sert 06 E16, E17, S03, S16, S20 |
| `Checkbox` | **Nouveau** — sélection multiple dans une liste | `checked`, `onCheckedChange`, `ariaLabel` | `role="checkbox"` + `aria-checked` ; se pose en `leading` d'une `ListRow` dont **toute la rangée** bascule la case (cible ≥ 56 px) ; jamais pour un réglage à effet immédiat (→ `Switch`). Sert 06 S13 |
| `Input`, `Textarea` | Saisie | `label` via `FormField`, `variant: default\|elevated`, erreur | 16 px min (anti-zoom iOS) ; erreur = bordure `danger` + message sous le champ — jamais de shake |
| `MoneyInput` | **Nouveau** — saisie de montant € | `value`, `onChange`, `quickAmounts?` (raccourcis « La moitié », « Tout »), `max?` (plafond affiché) | `inputmode="decimal"`, `.tnum`, symbole € suffixe ; virgule et point acceptés ; sert « Reçu maintenant » (02 N1), CollectSheet, dépenses |
| `SearchField` | Recherche avec effacement | `value`, `onChange`, `placeholder` | Debounce et sync URL à la charge de l'appelant ; **reste monté tant qu'un filtre est actif** (corrige la recherche qui disparaissait quand elle réussissait) |
| `Stepper` | Quantité −/+ | `value`, `min`, `max`, `step`, `ariaLabel` | Boutons 44 px ; borne atteinte → bouton désactivé ; slot pour raccourci « Tout » (livraison) |
| `SegmentedControl` | Bascule exclusive 2–4 options | `options`, `value`, `onChange`, `fullWidth` | `role="radiogroup"` ; l'état vit dans l'URL quand il filtre une liste |
| `Chip` | Filtre avec compteur | `active`, `disabled`, compteur dans le libellé | `aria-pressed` ; **un chip à compteur 0 ne se rend pas** (§5.3) |
| `Badge` | Signal d'état **anormal** (§3.3) | `tone`, `size: sm(20px)\|md(24px)`, `dot` | Non interactif ; pill `full` |
| `Avatar` | Initiales client/parfum | `name`, `size` | Fond `surface-muted`, initiales accentuées correctes |
| `Sheet` | Bottom sheet (vaul) | `open`, `onOpenChange`, `title`, `description`, `trailing`, `closeButton` (défaut true), `handle` (défaut true), `maxVh` (défaut 92), `size: full\|auto` (défaut **full** — une sheet à mi-écran perd sa moitié haute dès que le clavier monte), `footer`, `dismissible` (false si formulaire modifié), `nested` | Hauteur = `--admin-vh` × maxVh + inset clavier (calcul documenté de l'existant, repris tel quel) ; z 70/71, imbriquée 80 |
| `StickyAction` | CTA de page collant | `background` (défaut true), `summary?` (ligne de résumé au-dessus du bouton), enfants = Button(s) | `bottom: max(tab bar, inset clavier)` ; dernier enfant du scroll ; porte l'unique `primary` de l'écran. `summary` : une ligne `caption` tronquée avec ellipse, qui dit ce que le CTA va écrire sans le répéter (« Espèces · 70 € resteront à encaisser », 06 E11) ; réserve basse recalculée pour que le dernier élément de la liste ne passe jamais dessous |
| `EmptyState` | État vide guidant | `icon`, `title`, `description`, `action` | **`action` obligatoire** sauf état « tout est fait » (§5.2) |
| `Skeleton`, `SkeletonRow`, `SkeletonList` | Chargement | dimensions | **Proportions exactes du contenu final** — rien ne se déplace à l'arrivée ; pulse 1,6 s |
| `Toast` | Notification transitoire | `type: success\|error\|info`, `message`, `duration` (défaut 3 s), `actionLabel`/`onAction` | Rendu par le provider du shell, z 95, au-dessus de la tab bar ; **un seul toast à la fois** |
| `WindowedList` | Liste virtualisée | `items`, `renderRow`, `initialCount` | Le rendu serveur ne rend que la première fenêtre (leçon mesurée : 539 Ko → 157 Ko) |

### 3.2 Patterns (`src/ui/patterns/`)

| Pattern | Rôle | Props clés / composition | Règles |
|---|---|---|---|
| `PageScaffold` | **Le** layout de toute page | `header?` (sticky top, safe area), `footer?`, `padding: 0\|3\|4\|5`, `formScroll` | Porte `#main-content`, la réserve basse et les calculs clavier. Une page ne refait **jamais** ces calculs — les refaire à la main, c'est les refaire faux |
| `SectionHeader` | Titre de page/section + action | `title`, `description?`, `action?` | L'action de création d'une liste vit ici (pas de FAB) |
| `ListSection` | **Nouveau (formalisé)** — liste sectionnée | `title`, `count?`, `amount?`, `collapsible?`, enfants = `ListRow[]` dans une `Card padding 0` | L'en-tête porte l'information commune du groupe (statut, urgence, lot) ; **une ligne ne répète jamais l'information de son en-tête** ; rangées séparées par `Divider`, bords partagés |
| `KpiTile` | **Nouveau (formalisé)** — tuile de chiffre | `label` (micro caps `text-subtle`), `value` (`Money compact`), `dominant?` (`display`), `href?`, `hint?` | Un montant ailleurs que chez lui est un **lien vers son écran d'action** (`href` : À encaisser → `/admin/encaisser`). **Sans `href`**, la tuile est en lecture seule : cas où l'action du chiffre est déjà un bouton visible du même écran (fiche client : tuile « À encaisser » + CTA « Encaisser », 06 E14) — jamais deux chemins vers la même destination (§5.3). **Sur l'écran de référence d'un chiffre** (Compta pour Encaissé et Marge nette, À encaisser pour son total), pas de tuile : `Money` + libellé, non cliquable — seul un tap qui **explique** le chiffre reste permis (détail de la Marge nette). Deux tuiles voisines parlent toujours le même périmètre (02 §6 — servies par la fonction canonique) |
| `BarChart` | **Nouveau** — graphe à barres d'un chiffre dans le temps (« Encaissé par semaine », par jour, par mois) | `series` (`{ label, value: MoneyString }[]`), `ariaLabel` | Barres `accent`, axe minimal, valeurs `.tnum` au tap ou en infobulle desktop ; **non rendu sous deux points** (§5.3) ; hauteur fixe (squelette exact) ; code chargé à la demande (hors du premier rendu) ; lecteur d'écran : tableau équivalent masqué visuellement. Sert 06 E03 |
| `Money` | Affichage d'un montant | `value`, `compact`, `signed`, `tone: default\|muted\|success\|danger\|warning\|accent\|inherit`, `bold` | `warning` est le **seul** ton d'un montant non reçu ; `inherit` sur fonds pleins ; formatage fr-FR, `.tnum` |
| `FormField` | Champ labellisé | `label`, `hint?`, `error?`, enfant = Input/Textarea/MoneyInput/select | Le message d'erreur est actionnable et en français |
| `FormSection` | Section de formulaire | `title?`, `description?`, `bare?` = Card + Stack | Gap et padding uniformes ; champs facultatifs regroupés dans une `CollapsibleSection` repliée |
| `CollapsibleSection` | Repli/dépli | `title`, `defaultOpen` | Chevron animé 200 ms ; état non persisté |
| `SelectSheet` | **Nouveau (généralisé)** — combobox plein écran en Sheet | `options` (recherche insensible aux accents), `recent?` (« Vendus récemment » en tête, 02 N7), `onCreate?` (création inline sans quitter le formulaire), `empty` (EmptyState avec création) | Généralise le `CustomerField` de l'existant (qui devient une spécialisation) ; sert aussi parfums, poches, lots. Un picker = **ce** pattern, jamais un `<select>` natif pour des données métier |
| `ConfirmDialog` | Confirmation bloquante | `title`, `description`, `confirmLabel`, `cancelLabel`, `tone: danger\|primary`, `onConfirm` (async → busy) | Radix Dialog, z 80/81 (passe au-dessus des sheets) ; **ouvert depuis une sheet imbriquée** (même couche 80) : monté après elle dans le portail, il s'affiche toujours au-dessus — garanti par l'ordre de montage et couvert par `npm run test:layout` ; la description **dit la vérité** sur les conséquences (« L'historique est conservé », « Un remboursement est ajouté en face ») ; sert aussi les « réserves » du cycle de statuts (tone `primary`) |
| `ErrorBanner` | Erreur de bloc/page | `message`, `onRetry?` | Inline dans le flux (jamais un toast seul pour une erreur de chargement) ; ton `danger`, message français + geste de correction |
| `InlineNameEditor` | Édition inline d'un nom | `value`, `onSave` (optimistic + rollback) | Tap sur le nom → champ ; échec → valeur restaurée + toast erreur |
| `ImageField`, `ImagePreview` | Upload et aperçu d'image | crop WebP client, URL signée | Le crop portrait ne s'applique **jamais** à un logo de marque (proportions intouchables — règle projet) |
| `DateLabel`, `RelativeTime` | Dates | `date`, format | Europe/Paris ; capitalisation française (§2.2) ; relatif < 7 jours (« hier », « il y a 3 j »), absolu au-delà |
| `ShareButton` | Partage | `payload` Web Share, repli copie presse-papiers + toast | Sert récap commande, reçu, relances (02 N5), récap de journée (02 N4) |
| `GiftToggle` | Bascule « Offert » | `checked`, `onChange` | Coché → prix forcé à 0, libellé « Offert » ; décoché → dernier prix restauré |

### 3.3 La règle des badges : **badge seulement si anormal**

Un badge signale ce qui **sort du cours normal** — jamais un état nominal :

- **Oui** : « Partiel » (livraison), « En retard », « X € dû », « Rupture », « Stock bas », « Offert », « Hors catalogue », « Clos » (lot dans une liste de lots ouverts par défaut).
- **Non** : « Visible » sur 99 lignes sur 99, « Payé » sur une liste où tout est payé, « En cours » quand c'est l'état par défaut de la section (l'en-tête de groupe le dit déjà).
- Corollaires : jamais deux badges sur une même ligne (choisir le plus urgent) ; un badge n'est jamais le seul véhicule de l'information pour un montant (le chiffre `Money tone` l'accompagne) ; l'état nominal se lit par **l'absence** de badge.

### 3.4 Shell (`src/app-shell/`)

Composants conservés de l'existant, avec leurs corrections décidées en 02 §4.6 :

- `AdminShell` : coque, une seule zone de scroll, bypass complet sur `/admin/login`.
- `AppHeader` (56 px, blur) : logo → `/admin` sur racine d'onglet, sinon **retour dérivé de `getParentScreen`** ; bouton recherche. Une page ne rend jamais son propre lien retour. Règle nouvelle (02 §8) : **onglet actif et bouton retour racontent le même trajet** — tout rattachement de `navigation.ts` respecte cette cohérence, vérifiée par le test de navigation.
- `TabBar` (88 px, blur, 5 onglets, Vendre accentué) : actif = couleur accent + libellé gras, icônes Lucide 23 px, libellés 10 px. Prop **`badge`** par onglet : point accent de 8 px sur l'icône et libellé accessible complété (« Vendre, brouillon en cours ») — seul usage v1 : le brouillon du composeur (06 §1.5). Jamais de compteur numérique sur un onglet.
- `CommandPalette` (z 90) : reconstruite sur **Radix Dialog** (focus trap, scroll lock et restauration de focus fournis — l'implémentation manuelle de l'existant disparaît) ; sélectionner un parfum ouvre sa **fiche**, pas le formulaire d'édition ; l'affordance ⌘K ne s'affiche que sur pointeur fin.
- `UndoProvider` : suppression différée 5 s avec toast « Annuler », survit aux navigations ; un nouveau `scheduleDelete` commit le précédent.
- `PullToRefresh` : §4.3.
- Service viewport **unique** (fusion `ViewportSync` + `useAdminKeyboardInset`) : seul écrivain de `--admin-vh` / `--admin-keyboard-inset`.
- `PwaInstallHint` : devient une **carte dismissible dans le flux du dashboard** (dismiss persisté en localStorage) — plus jamais une bannière fixe au-dessus du header qui comprimait l'écran le plus dense de l'app en permanence (friction relevée par l'audit).
- Feedback de navigation : la barre de progression factice de 600 ms disparaît, remplacée par les mécanismes de pending **réels** de Next (`useLinkStatus` / transitions) — un indicateur qui s'affiche seulement quand on attend vraiment.

---

## 4. Gestes & micro-interactions iOS

### 4.1 Le socle tactile

- **Press scale** : tout élément tapable rétrécit à **0.97 en 100 ms** (`ease-out-expo`) au toucher — c'est LE feedback de base, systématique (classe `tap-scale` / prop des primitives). `-webkit-tap-highlight-color: transparent` et `touch-action: manipulation` partout.
- **Hover = desktop seulement**, sous `@media (hover: hover) and (pointer: fine)`, et **couleur/ombre uniquement** — les hovers à déplacement de l'existant (`.admin-button-micro:hover` avec translateY + scale) ne sont pas reconduits : sur une app tactile, le mouvement au survol est un artefact.
- **Cibles ≥ 44 px** (`--admin-touch-min`). Un contrôle textuel compact reçoit `.admin-hit-target` (min-height 44 px sans toucher la typo) ; un contrôle volontairement plus petit porte `data-touch-exempt` avec le motif en commentaire. Vérifié par `npm run test:layout`.
- **Zone du pouce** : l'action principale d'un écran vit dans le tiers bas (`StickyAction`, tab bar, footer de sheet). Le haut de l'écran est pour lire, le bas pour agir.

### 4.2 Gestes retenus (et bornés)

| Geste | Où | Règles |
|---|---|---|
| **Tap** | Partout | Le geste par défaut. Tap sur un montant hors de son écran = navigation vers son écran d'action (`KpiTile` `href`) ; sur son écran de référence, un chiffre n'est pas cliquable, sauf pour ouvrir son détail (§3.2 `KpiTile`) |
| **Swipe-to-dismiss** | Sheets | Fourni par vaul ; désactivé (`dismissible: false`) dès qu'un formulaire est modifié — on ne perd pas une saisie d'un revers de pouce |
| **Swipe d'action sur ligne** | **Liste fermée** (06 §4.2) : Commandes, vue « À livrer » — vers la droite « Livrer », vers la gauche « Encaisser » (lignes à dû > 0) ; Commandes, vue « Livrées » — vers la gauche « Encaisser » (lignes à dû > 0) ; À encaisser — vers la gauche « Encaisser ». Aucun autre écran | **Retenu, mais borné** : une action max par côté ; **le glissement révèle, le tap exécute** (rien ne s'écrit au seul glissement) ; **aucune écriture d'argent sans sheet visible** (« Encaisser » ouvre la sheet d'encaissement ; « Livrer » avec un dû ouvre la sheet « Livrer ») ; jamais destructif ; toujours **redondant** avec un chemin visible (bouton de la fiche document, bouton-montant) — le swipe est un accélérateur pour qui le découvre, jamais le seul chemin |
| **Pull-to-refresh** | Toute liste/dashboard (haut de la zone de scroll) | §4.3 |
| **Long press** | **Non retenu** | Indécouvrable, en conflit avec le menu contextuel iOS dans une PWA |
| **Drag & drop** | **Non retenu** | Aucune tâche du §2 de la vision n'en a besoin |

### 4.3 Pull-to-refresh

Conservé de l'existant (listeners passifs, résistance élastique, seuil de déclenchement 64 px, flèche → spinner) avec **une correction** : l'indicateur reste visible **jusqu'à la fin réelle du rafraîchissement** (la promesse de `router.refresh` dans une transition), plus jamais un délai fixe de 600 ms qui mentait sur les connexions lentes. Minimum d'affichage 300 ms pour éviter le clignotement sur les réseaux rapides.

### 4.4 Règles motion

1. **Rapide et sortant** : tout feedback direct à 100 ms, transitions de contrôle à 200 ms, entrées/sorties (sheets, menus) à 260 ms, toujours en `ease-out` — l'interface répond, elle ne « joue » pas.
2. **Le mouvement suit le doigt** : les sheets suivent le drag (vaul), le pull-to-refresh suit le tirage. Aucune animation autonome pendant un geste.
3. **Rien ne bouge tout seul** : pas d'apparition décalée en cascade, pas de layout shift à l'hydratation (squelettes aux proportions exactes), pas de reflow quand un montant change (`.tnum`).
4. **Haptique visuelle** (le web iOS n'a pas d'API de vibration fiable — on la traduit à l'écran) : **appui** = press scale ; **succès** = pulse bordeaux unique de 450 ms sur l'élément concerné (généralisation du `admin-nav-arrival` de l'existant, renommé `admin-confirm-pulse`) + toast success ; **erreur** = bordure `danger` + message — **jamais de shake**.
5. **`prefers-reduced-motion: reduce`** neutralise press scale, pulses, squelettes animés et transitions de sheet (fondu simple) — déjà en place, reconduit systématiquement sur toute animation nouvelle.
6. **Un spinner seul est interdit** hors `Button isLoading` : un chargement d'écran ou de bloc montre un squelette.

---

## 5. Règles d'écran

### 5.1 Les quatre états obligatoires

**Chaque écran et chaque bloc streamé définit ses quatre états avant d'être considéré comme conçu** — `06-ECRANS-PARCOURS.md` les spécifie écran par écran :

1. **Contenu** — l'état nominal.
2. **Vide** — `EmptyState` avec **l'action suivante nommée** (« Créer un parfum », « Prendre une commande »). Deux vides se distinguent : le **vide de départ** (rien n'existe encore → action de création, en particulier le dashboard de première utilisation, absent de l'existant) et le **vide de filtre** (la recherche ne matche rien → « Effacer les filtres »). Exception : un vide « tout est fait » (aucune créance, rien à livrer) est une bonne nouvelle — il se dit en une ligne calme, sans bouton.
3. **Chargement** — squelette aux **proportions exactes** du contenu final, un `Suspense` par bloc (streaming) : le titre de l'écran s'affiche immédiatement (~50 ms), chaque bloc hydrate dès que SA requête répond. Le squelette reflète l'état **réel** attendu (le fallback à 3 tuiles pour un rendu à 2 de l'existant était un bug de layout shift).
4. **Erreur** — `ErrorBanner` inline à l'emplacement du bloc en échec (le reste de l'écran vit), message français actionnable + « Réessayer ». Une erreur de **mutation** = toast erreur + état restauré (rollback optimistic) ; une erreur de **chargement** = bannière, jamais un toast seul.

### 5.2 Optimistic UI, undo et vérité de l'écran

- Les mutations rapides et réversibles (bascule de visibilité, pointage de livraison, statut) s'affichent **immédiatement**, avec rollback + toast erreur en cas d'échec serveur.
- Toute suppression passe par `ConfirmDialog`, et quand c'est possible par le filet **undo 5 s** (`UndoProvider`).
- Après une écriture, l'écran reflète le nouvel état **sans re-navigation** : paiement enregistré ⇒ tuiles Dû/Payé, historique et statut à jour dans la foulée (principe 6 de la vision).

### 5.3 Ce qui ne s'affiche pas

Hérité de l'existant (sa meilleure doctrine), érigé en règle du système :

- Un filtre à compteur **0** n'est pas une option, c'est du bruit : il ne se rend pas. Une rangée de filtres qui ne discrimine rien rend sa hauteur à la liste.
- Un graphe sous **deux points** de mesure ne raconte rien : il ne s'affiche pas.
- Les **alertes** ne se montrent que s'il y a quelque chose à **faire** — et leur lien ouvre **exactement l'ensemble compté** (l'alerte « N en retard » de l'existant comptait PENDING+READY mais ouvrait une vue READY seule : interdit désormais par cette règle).
- Un **état** ne s'affiche que s'il est **anormal** (§3.3).
- Une tuile à zéro sans enjeu (mois sans vente) disparaît plutôt que d'afficher « 0 € ».
- **Deux chemins visibles simultanément** vers la même destination (raccourci + onglet sur le même écran) : interdit.

### 5.4 Densité et composition

- **Une ligne de liste** : 56 px min, deux lignes de texte max (primary + secondary tronqués avec ellipse), un `trailing` (montant `.tnum` **ou** badge). Ce qui ne tient pas dans la ligne appartient à la fiche.
- **Une ligne ne répète jamais** l'information portée par l'en-tête de son groupe (statut, urgence, lot, initiale).
- **Un écran, une action primaire** : un seul `Button primary` visible (généralement dans `StickyAction` ou le footer de sheet). Le reste est `secondary`/`ghost`/`text`.
- **Deux chiffres qui mesurent la même somme sous deux noms** sur un même écran : interdit (vocabulaire canonique 02 §6, une fonction serveur par chiffre).
- **Pas de tableaux larges** : le rail fait 430 px — toute donnée tabulaire devient une liste sectionnée. Rien ne défile horizontalement, hors carrousels de chips explicites.
- **Formulaires** : l'essentiel visible, le facultatif replié (`CollapsibleSection`) ; pré-remplissage par les mémoires de l'app (prix, taux, poche, lot — 02 §5) ; jamais de saisie inversée (on saisit ce qu'on constate).
- **Navigation** : toute route rattachée à exactement un onglet (`navigation.ts`), retour = parent de route, deep-links stables (`?vue=`, `?filter=`, `?q=` dans l'URL).

### 5.5 Invariants vérifiés automatiquement

`npm run test:layout` (`e2e/layout-invariants.spec.ts`) reste le filet du système : toutes les routes × 320/375/430 px × clavier ouvert/fermé — hydratation (`useSearchParams` sous `<Suspense>`), débordement horizontal, hors-cadre, texte rogné sans ellipse, cibles < 44 px, contenu sous la tab bar, champ/CTA sous le clavier, sheet écrasée (< 120 px utiles). **À lancer après toute modification d'UI admin.** Écrire un écran qui passe : une page = `PageScaffold`, une action de page = `StickyAction`, une sheet = `Sheet` — ces trois-là portent déjà les calculs.

### 5.6 Performance perçue (règles héritées, mesurées)

- Un aller-retour base ≈ 140 ms : **agréger côté base**, dédupliquer par `react.cache`, jamais trois `count` séparés.
- Le titre s'affiche immédiatement ; tout ce qui attend des données va sous `Suspense` (la Compta de l'existant est passée de 3,4 s à 35 ms ainsi).
- Une liste fenêtrée ne rend au serveur que sa première fenêtre.

---

## 6. Accessibilité

L'app a un utilisateur connu, mais l'accessibilité ici est d'abord de l'**ergonomie terrain** : plein soleil, une main, gestes imprécis, interruptions.

- **Contraste** : texte courant ≥ 4,5:1, texte large et composants UI ≥ 3:1 — d'où la correction `--admin-text-subtle` (§2.1). Tout nouveau couple couleur/fond se vérifie avant d'entrer dans `tokens.ts`.
- **La couleur n'est jamais seule** : un état porte toujours un texte ou une icône en plus du ton (badge « En retard », pas juste une ligne ambre ; `Money warning` accompagné du libellé « À encaisser »).
- **Focus visible** : `outline: 2px solid var(--admin-accent), offset 2px` global ; anneau `--admin-accent-ring` sur les contrôles. Jamais de `outline: none` sans remplacement.
- **Cibles tactiles** : 44 px minimum, vérifiées par test (§5.5).
- **Sémantique ARIA** portée par les primitives (et donc gratuite pour les features) : `role="radiogroup"`/`radio` (SegmentedControl), `aria-pressed` (Chip), `aria-busy` (Button isLoading), `aria-label` sur les contrôles à icône seule, `aria-current` (TabBar), `aria-expanded` (CollapsibleSection), dialogues Radix (focus trap, `aria-modal`, restauration du focus).
- **VoiceOver sur les montants** : `Money` expose le montant en toutes lettres (« 1 250 euros ») via `aria-label` — les chiffres tabulaires tronqués visuellement ne le sont jamais vocalement.
- **Zoom jamais bloqué** (`user-scalable` autorisé — WCAG, documenté dans le layout) ; champs ≥ 16 px pour éviter le zoom involontaire iOS.
- **`prefers-reduced-motion`** respecté sur toute animation (§4.4).
- **Langue** : `lang="fr"`, libellés et messages d'erreur en français, dates Europe/Paris en typographie française.

---

## 7. Différences vs existant — ce qui change et pourquoi

L'essentiel est **conservé** (palette, typo, grille, shell, tab bar, sheets vaul, squelettes, undo, invariants testés). Ce tableau liste tout ce qui change. « Audit » renvoie à `01-AUDIT-EXISTANT.md`.

| # | Changement | Existant | Cible | Pourquoi |
|---|---|---|---|---|
| 1 | Synchronisation tokens ↔ CSS | `tokens.ts` et `globals.admin.css` divergents (`text-subtle` #8A828E vs #726B75 ; `surface-hover`, `accent-subtle`, `overlay`, `*-border`… absents de `tokens.ts`) | `tokens.ts` source unique, CSS dérivée, test de synchronisation | Deux sources de vérité = divergence garantie (constatée) |
| 2 | `--admin-text-subtle` | #8A828E dans `tokens.ts` (3,32:1) | **#726B75** partout (4,62:1) | Porte les libellés de chiffres 11 px, lus dehors — contraste WCAG |
| 3 | Cuivre | `--admin-cuivre` « accent secondaire (rare) », sans rôle | **Supprimé** — bordeaux seul accent | Jeton sans lecteur ; invite à la décoration (anti-référence 02 §8) |
| 4 | Sémantique warning/danger | Retard tantôt ambre tantôt rouge selon l'écran | Règle fixée : warning = attente/retard, danger = anomalie/irréversible/> 30 j | Deux écrans ne doivent pas raconter deux gravités pour le même fait |
| 5 | Échelle de radius | `md` 10 px au token, mais 12 px codé en dur partout (Button, Segmented, ListRow) | `md` = **12 px**, 10 px supprimé, composants sur tokens | Le rayon le plus utilisé n'était pas dans l'échelle |
| 6 | Z-index | CommandPalette en `z-[80]`/`z-[90]` littéraux ; `fab` 55 sans FAB ; `tabBarMenu` 52 absent de `tokens.ts` | Registre complet dans `tokens.ts`, consommé par variable partout ; `fab` supprimé | Les valeurs coïncidaient « par chance » (audit) |
| 7 | Classes motion legacy | `.admin-ios-transition` (`transition: all`), `.admin-button-micro:hover` (translateY + scale), `.admin-lift` (déplacement au survol) | Supprimées ; hover desktop = couleur/ombre seulement | `transition: all` est un interdit du registre que sa propre feuille violait ; mouvement au hover = artefact sur app tactile |
| 8 | Barre de progression navigation | 600 ms factices à chaque navigation, même instantanée (placebo assumé) | Pending **réel** (`useLinkStatus`/transitions Next) | Un feedback qui ment n'informe pas (audit §4.6) |
| 9 | Pull-to-refresh | Spinner résolu après 600 ms fixes, données encore en vol | Attend la fin réelle du refresh (min 300 ms) | Même principe : le feedback dit la vérité |
| 10 | Service viewport | Deux hooks concurrents (`ViewportSync` + `useAdminKeyboardInset`) sur le même `visualViewport` | Un seul service, seul écrivain de `--admin-vh`/`--admin-keyboard-inset` | Deux sources de vérité pour le clavier iOS (audit §4.6) |
| 11 | CommandPalette | Focus-trap et overlay réimplémentés à la main | Radix Dialog (déjà dans le stack) ; parfum → fiche (pas le formulaire) ; ⌘K masqué au tactile | Radix fournit aria/scroll-lock/focus gratuits ; chercher pour consulter n'existait pas |
| 12 | Bannière d'installation PWA | Fixe au-dessus du header, comprime l'écran en permanence | Carte dismissible dans le flux du dashboard | Friction audit : l'écran le plus dense payait la bannière en continu |
| 13 | Nouveaux composants | Combobox client, tuiles KPI et listes sectionnées réimplémentées par feature | `SelectSheet`, `KpiTile`, `ListSection`, `MoneyInput`, `SwipeableRow` formalisés dans `src/ui/*` | Les features composaient sans briques : duplications et divergences (trois listes sectionnées différentes) |
| 14 | Règle badge | Anti-pattern documenté mais non outillé | Règle du composant `Badge` (§3.3) + revue systématique | « Marquer 99 lignes sur 99 noie le seul cas qui compte » |
| 15 | États vide | Dashboard sans état de première utilisation ; vides sans action | Quatre états obligatoires par écran, vide → action nommée | L'app doit orienter la première session (friction audit) |
| 16 | Dates | Classe `capitalize` (« Mercredi 17 Septembre ») | Typographie française via `DateLabel` ; Europe/Paris explicite | Incohérence relevée ; bornes temporelles au fuseau serveur (bugs audit) |
| 17 | Swipe d'action | Absent | Retenu, borné (une action/côté, redondant, jamais destructif sans confirmation) | Accélère les gestes quotidiens (pointer livré, encaisser) sans créer de chemin caché |
| 18 | Haptique visuelle succès | `admin-nav-arrival` limité à l'arrivée de navigation | Généralisé en `admin-confirm-pulse` (450 ms) sur toute écriture réussie | Confirmation perceptible d'une main, sans lire le toast |
| 19 | ConfirmDialog | Prop `nested` dépréciée sans effet | Supprimée | API honnête — un commentaire qui promet ce que le code ne fait pas est un bug (02 §8) |
| 20 | Toast | Composant monté par plusieurs features | Un seul rendu par le provider du shell, un toast à la fois, z 95 | Empilement et positions divergentes ; la tab bar ne doit jamais masquer un toast |
| 21 | Interrupteur et case à cocher | Absents de l'inventaire (bascules improvisées par écran) | Primitives `Switch` et `Checkbox` | Les écrans de 06 en ont besoin (visibilité, mise en avant, suivi du stock, remboursement, rattachement en masse) ; une brique partagée garde la cible 44 px et la sémantique ARIA |
| 22 | Bouton icône seule | Icônes tapables de tailles variables, parfois sans nom accessible | Variante `iconOnly` de `Button` : 44 px, `ariaLabel` obligatoire | Cibles tactiles et VoiceOver garantis par le type, pas par la relecture |
| 23 | Graphe | Graphe recharts propre à l'écran compta (01 §3.3), hors inventaire | Pattern `BarChart` chargé à la demande | Une seule brique de graphe, absente sous deux points, sans alourdir le premier rendu |
| 24 | Résumé du CTA | — | Prop `summary` de `StickyAction` | Le CTA dit l'effet complet (poche, reste à encaisser, lot) sans devenir illisible (06 arbitrage n°9) |
| 25 | Point de brouillon | — | Prop `badge` de `TabBar` | Une vente interrompue se retrouve d'un coup d'œil (06 §1.5) |
| 26 | Tuile de chiffre | `href` obligatoire | `href` facultatif ; lecture seule quand l'action est déjà sur l'écran ; pas de tuile sur l'écran de référence | Évite deux chemins visibles vers la même destination (§5.3) et les chiffres cliquables qui ramènent à l'écran courant |
| 27 | Glissements de ligne | « Commandes, créances » sans précision | Liste fermée de 06 §4.2 recopiée ici | Un exécutant qui lit 05 seul construit les mêmes gestes que 06 |

---

*Fin du document 05. Le document suivant (`06-ECRANS-PARCOURS.md`) compose ces briques écran par écran : architecture d'information, navigation, états (vide/chargement/erreur) et gestes de chaque écran, en respectant les objectifs de vitesse de `02-VISION-PRODUIT.md` §2.*
