# Refonte vitrine — playbook de savoir-faire

Statut : distillé le 20/10/2026 à partir de sources lues en entier (pas résumées de mémoire) :
les références du skill `frontend-design` (typographie, couleur, espace, mouvement, interaction,
responsive, rédaction), `apple-design` (WWDC, physique du mouvement), les règles d'Emil Kowalski
(*design engineering*, MIT), les *Web Interface Guidelines* de Vercel (MIT) et les critères
« casser l'interface » d'Emil Kowalski. Tout est reformulé ; rien n'est installé qui exécute du code.

**Comment s'en servir.** Chaque règle est un contrôle, pas une inspiration. Une règle qu'on enfreint
l'est *exprès*, avec une raison écrite dans le commit. Les règles qu'une machine peut vérifier le
sont déjà : `tests/architecture/anti-slop.test.ts`.

## 0. Les sept convictions

1. **Une idée forte, tenue partout.** « Luxueux, sombre, doré » n'est pas une idée : c'est le
   gabarit par défaut du secteur. Une DA, c'est un parti pris qu'un inconnu pourrait énoncer en une
   phrase après trente secondes sur le site.
2. **Les photos sont le produit.** Elles ont des fonds saturés, très différents d'un parfum à
   l'autre. L'interface est le cadre : neutre, précis, silencieux — sauf à un endroit choisi.
3. **Mobile d'abord, vraiment.** La grande majorité des visites, depuis Snapchat, au pouce, souvent
   en 4G (part exacte à relever dans les statistiques Vercel avant de la citer).
   On conçoit à 390 px, puis on *adapte* au bureau (on ne se contente pas d'étirer).
4. **La retenue est un choix de composition**, pas une absence : peu de tailles, peu de couleurs,
   beaucoup de contraste entre ce qui compte et ce qui ne compte pas.
5. **Le mouvement répond au geste** (appui, glissé, élan) ; il n'orne pas. Si on retire une
   animation et que rien ne se perd, elle n'avait pas lieu d'être.
6. **Chaque état est dessiné** : repos, survol, focus, appui, chargement, vide, erreur, succès,
   hors ligne. Le vide de recherche est une page de vente, pas une impasse.
7. **On ne ment pas dans l'interface** : pas de donnée inventée, pas de rareté factice, pas de
   notation fictive. Une ligne sans donnée vraie est omise.

## 1. Typographie

- **Peu de tailles, très contrastées.** Cinq rôles couvrent tout : légende, secondaire, texte,
  sous-titre, titre/affiche. Rapport entre rôles ≥ 1,25 (idéal 1,333 à 1,5) ; entre texte et
  grand titre ≥ 3:1. Quatorze, quinze, seize px côte à côte = hiérarchie boueuse.
- **Fluide pour les titres** (`clamp(min, base + vw, max)`), **fixe pour le texte** (1 rem ≥ 16 px).
  Jamais de `px` pour une taille : `rem`, pour respecter le réglage du téléphone.
- **Interlettrage dépendant de la taille** : négatif en grand (−0,01 à −0,03 em), neutre en texte,
  légèrement positif en petit ou en capitales. **Interlignage inverse de la taille** : serré en
  titre (1,05–1,2), aéré en texte (1,5–1,7) et **+0,05 à 0,1 en texte clair sur fond sombre**.
- **Une famille bien choisie vaut mieux que deux concurrentes.** Une seconde famille seulement pour
  un vrai contraste (serif/sans, géométrique/humaniste). Jamais deux sans-serif proches.
- **Polices : hors des défauts invisibles** (Inter, Roboto, Arial, Open Sans, Lato, Montserrat,
  Poppins — refusées par le test). Préférer une police **variable** à axes (optique `opsz`, graisse,
  largeur) : un fichier, un rendu qui s'adapte à la taille.
- **Auto-hébergées** via `next/font` (la CSP interdit tout CDN de polices). `font-display: swap`
  et repli métrique (`size-adjust`, `ascent-override`…) pour zéro saut de mise en page.
- **Finitions** : `text-wrap: balance` sur les titres, `pretty` sur le texte ; chiffres tabulaires
  pour tout ce qui s'aligne ; `font-kerning: normal` ; vraies typographies (« guillemets »,
  apostrophe courbe, `…`, espaces insécables dans « 50 ml », « Nuréa Parfums ») ; `hyphens: auto`
  avec `lang="fr"` pour les colonnes étroites.
- **Mesure** : 45–75 caractères (`max-width` en `ch`).

## 2. Couleur et thème

- **OKLCH**, pas HSL : les paliers ont l'air égaux. Baisser la chroma vers le blanc et le noir.
- **Neutres teintés** (chroma 0,005–0,02 vers la teinte de la marque) ; **jamais** `#000`/`#fff`
  (refusé par le test). Une couleur d'accent **rare** : elle marche parce qu'elle est rare (60-30-10
  en poids visuel, pas en pixels).
- **Gris sur fond coloré = mort** : utiliser une teinte plus sombre du fond.
- **Contrastes** : texte 4,5:1 (7:1 visé), grand texte et composants 3:1, **placeholder compris**.
- **Jetons à deux couches** : primitifs (`--ink-900`) puis sémantiques (`--text`, `--surface-1`,
  `--accent`). Un thème ne redéfinit que le sémantique.
- **Le sombre n'est pas le clair inversé** : profondeur par la clarté des surfaces (pas d'ombre),
  accents désaturés, graisse de texte légèrement réduite, jamais de noir pur (L 12–18 %).
- **Le thème est une décision de marque, pas un réglage par défaut.** « Sombre avec accents qui
  brillent » est le tic n°1. Les photos de Nuréa vivent sur fond sombre *ou* saturé : si le thème
  clair est conservé, 129 fiches sur 193 ont une variante claire, 64 n'en ont pas — il faut un plan
  pour elles (cadre neutre, voir 03).
- **L'alpha est un aveu** de palette incomplète : définir des couleurs de recouvrement explicites.
  Exceptions : anneaux de focus, états.
- **Daltonisme** : le sens ne passe jamais par la couleur seule.

## 3. Espace et composition

- **Base 4 px** (4, 8, 12, 16, 24, 32, 48, 64, 96) ; jetons nommés par relation (`--space-sm`), pas
  par valeur. `gap` plutôt que marges. Espacement **fluide** (`clamp`) pour les grandes respirations.
- **Le rythme est la composition** : serré entre éléments liés (8–12), généreux entre blocs
  (48–96), **varié** à l'intérieur d'une section. Un espacement égal partout = aucune hiérarchie.
- **Hiérarchie à 2–3 dimensions** : taille ET graisse ET espace (ou couleur, ou position). Test du
  plissement d'yeux : primaire, secondaire et regroupements doivent rester lisibles flous.
- **Les cartes ne sont pas obligatoires.** Un regroupement se fait d'abord par proximité et
  alignement. Jamais de carte dans une carte. Jamais la même grille d'icônes-titre-texte répétée.
- **Asymétrie intentionnelle**, alignement à gauche plutôt que tout centré, rupture de grille *une*
  fois pour marquer un moment.
- **Grille auto-ajustée** (`repeat(auto-fit, minmax(…, 1fr))`) et **container queries** pour les
  composants : une carte s'adapte à son conteneur, pas à l'écran.
- **Couches** : une échelle sémantique de z-index (contenu → collant → fond de feuille → feuille →
  toast), jamais 999.
- **Optique** : un bord de texte à `margin-left: 0` paraît rentré (−0,05 em) ; une icône
  géométriquement centrée paraît décalée (lecture : décaler à la main, seulement si ça se voit).

## 4. Mouvement

**Durées (réconciliation des sources).**

| Usage | Durée |
|---|---|
| Retour d'appui, bascule, couleur | 100–160 ms |
| Info-bulle, petit menu, survol | 125–250 ms |
| Feuille, tiroir, boîte | 250–450 ms (≤ 500) |
| Entrée au chargement / révélation | 500–800 ms, une fois |
| Sortie | ≈ 75 % de l'entrée |
| Décalage de cascade | 30–80 ms par élément, **plafonné** (10 éléments ≈ 500 ms) |

**Courbes.** Défaut : *ease-out exponentielle* (`cubic-bezier(0.23, 1, 0.32, 1)` ou
`(0.22, 1, 0.36, 1)`). Tiroir : `(0.32, 0.72, 0, 1)`. Déplacement d'un élément déjà à l'écran :
ease-in-out forte `(0.77, 0, 0.175, 1)`. **Jamais** `ease-in` seul sur une interface (il retarde le
premier mouvement). Jamais `ease` par défaut. `linear` seulement pour du mouvement constant.

**Ce qu'on anime.** `transform` et `opacity` ; `clip-path` et `filter` pour les révélations ;
**jamais** `width/height/padding/margin/top/left`. Hauteur variable : `grid-template-rows 0fr→1fr`.
Pas de `transition: all`. `will-change` seulement après avoir *mesuré* un défaut. Pas de
`setState` à chaque image : écrire dans `ref.current.style`.

**Quand animer.** Jamais ce que l'on fait des dizaines de fois par jour (palette, touches
clavier) ; occasionnel (feuille, toast) = animation standard ; rare (premier chargement, vide
spécial) = moment de plaisir. Une animation a une raison : continuité spatiale, état, explication,
retour d'appui, ou éviter un changement brutal. Rien de décoratif ne bloque l'interaction.

**Appui et entrée.** `scale(0.97)` sur `:active` (0,95–0,98). Une entrée ne part jamais de
`scale(0)` : `scale(0.95)` + `opacity: 0`. Un popover grandit **depuis son déclencheur**
(`transform-origin`) ; une boîte modale depuis son centre. Déplacements en pourcentage
(`translateY(100%)`) pour s'adapter à la taille.

**Ressort.** Seulement sous le doigt ou pour de la matière décorative : glissé avec élan, feuille
qui se ferme, suivi du curseur. Amortissement 1 par défaut ; un soupçon de rebond (≤ 0,2) *si et
seulement si* le geste en portait. Jamais de rebond sur un état. Un ressort **garde la vitesse**
quand on l'interrompt ; un keyframe repart de zéro. Moteur déjà écrit et testé :
`src/lib/motion/physics.ts` + `src/hooks/useSheetMotion.ts`.

**Geste.** Suivi 1:1 du doigt, capture du pointeur, un seul doigt actif ; fermer sur **vitesse**
(> ~0,11 px/ms) quelle que soit la distance ; résistance progressive au bord (rubber-band) plutôt
qu'un butoir ; tout geste a une alternative visible (bouton) et clavier. Sortie par où l'on est
entré.

**Matière (Apple).** Un verre dépoli sert **une** surface (barre, feuille) pour y faire passer le
contenu dessous ; flou < 20 px (coûteux sous Safari), 2–5 px suffit à adoucir un fondu. Bord haut
clair pour dire la lumière. Jamais une matière claire sur une autre matière claire. Respecter
`prefers-reduced-transparency` (opaque) et `prefers-contrast`. Le test limite l'usage à 6 endroits.

**Mouvement réduit.** On garde fondus et couleurs (ils expliquent), on retire le déplacement et la
parallaxe. Tout est derrière `@media (prefers-reduced-motion: reduce)`.

**Survol.** Uniquement derrière `@media (hover: hover) and (pointer: fine)`. Sur écran tactile, le
retour est l'appui (`:active`), pas un survol collé.

**Révision.** Ralentir ×2–5 ou pas à pas dans les DevTools ; relire le lendemain ; tester **au
doigt** sur un vrai téléphone (la souris ment).

## 5. Interaction et états

- **Huit états par élément interactif** : repos, survol, focus, appui, désactivé, chargement,
  erreur, succès. Survol ≠ focus : le clavier ne voit jamais le survol.
- **Focus** : `:focus-visible`, 2–3 px, contraste 3:1, décalé, identique partout. Jamais
  `outline: none` seul.
- **Formulaires** : étiquette visible (un placeholder n'est pas une étiquette), validation à la
  sortie du champ, erreur *sous* le champ avec `aria-describedby`, premier champ en erreur focalisé,
  `autocomplete` et `inputmode` justes, collage jamais bloqué, bouton actif jusqu'à l'envoi.
- **États vides** : reconnaître, expliquer la valeur, **proposer l'action** (ici : écrire à Nuréa).
- **Squelettes** plutôt que roues ; chargement spécifique (« Recherche dans 3 700 références… »).
- **Défaire plutôt que confirmer** ; confirmation seulement pour l'irréversible.
- **Natif d'abord** : `<dialog>`, `popover`, `inert`, `<details>` ; `touch-action: manipulation` ;
  `overscroll-behavior: contain` dans les feuilles ; zones de sécurité (`env(safe-area-inset-*)`,
  `viewport-fit=cover`).
- **L'état vit dans l'URL** (filtres, tri, recherche, ligne ouverte) : lien partageable, retour
  navigateur, clic-molette. Les liens restent des liens.

## 6. Responsive

Mobile d'abord (`min-width`), 3 points de rupture au plus (640 / 768 / 1024), dictés par le contenu.
`pointer: coarse` pour agrandir les cibles, `hover: none` pour retirer le survol. Ne jamais
amputer une fonction sur mobile : l'*adapter*. Tester à **320, 390, 430, 768, 1024, 1440** et à
**200 % de zoom**, en portrait ET paysage, et sur un vrai iPhone + un Android modeste.

## 7. Images et performance (propre à Nuréa)

- Ratio 2:3 fixe, `width`/`height` explicites, `blurDataURL`, `sizes` juste ; **première image
  prioritaire, le reste paresseux**. Vignette 640×960 servie aux petites largeurs ; original
  1024×1536 au maximum — **ne jamais agrandir au-delà** (flou).
- **193 fiches = 332 images et 2 300 nœuds DOM à l'accueil aujourd'hui** (mesuré). Cible : charger
  par paliers (pagination/« charger la suite » ou virtualisation > 50 éléments), URL conservée.
- **Core Web Vitals** (cibles de la refonte) : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 ; Lighthouse
  mobile : performance ≥ 90, accessibilité 100, SEO ≥ 95. Mesurés sur le build, pas en `next dev`.
- Préconnexion au stockage d'images, polices préchargées, vidéo en boucle muette plutôt que GIF
  (avec image fixe de repli), aucune bibliothèque d'animation si le CSS suffit.
- Le texte long ne casse jamais la mise en page : troncature/clamp/césure, `min-width: 0` sur les
  enfants flex. Prévoir court, moyen, très long.

## 8. Rédaction

Un mot qui n'apporte rien disparaît. Verbe + objet sur les boutons (« Écrire à Nuréa », pas « OK »,
pas « Envoyer »). Erreur = ce qui s'est passé + pourquoi + comment s'en sortir, sans accuser. Vide =
action. Un seul terme par chose, glossaire tenu (Marque, Parfum, Ligne, Contenance). Ne pas répéter
le titre dans l'introduction. Pas d'humour dans les erreurs. Nombres en chiffres, formats `Intl`.
Pas d'eyebrow creux (« DÉCOUVRIR », « NOTRE SÉLECTION ») : un petit libellé nomme, il n'annonce pas.

## 9. Accessibilité (en plus du plancher de 01)

Sémantique native avant ARIA ; un nom accessible pour chaque icône-bouton ; `alt` qui *informe*
(« Sauvage, Dior, flacon bleu ») et `alt=""` pour la décoration ; titres hiérarchiques ; lien
d'évitement ; annonces `aria-live="polite"` pour les résultats de recherche ; focus rendu au
déclencheur à la fermeture d'une feuille ; cibles ≥ 44 px (zone cliquable étendue par `::before`
si l'élément est petit) ; contenu jamais masqué par un en-tête collant.

## 10. Casser l'interface avant qu'elle casse

Jeu d'essai extrême **versionné** (comme `e2e/fixtures`) : nom de 60 caractères sans espace,
marque d'une lettre, parfum sans ligne, ligne très longue, 0/1/193 résultats, image absente ou
cassée, accents (É, Œ, ç), 320 px, 200 % de zoom, mode clair/sombre, mouvement réduit, contraste
renforcé, hors ligne. Chaque défaut est classé *Cassé / Moche / Fragile*. Le jeu reste comme test
de non-régression.

## 11. Processus et portes de qualité

| Phase | Contenu | Porte (rien ne passe sans) |
|---|---|---|
| 0. Décider | DA retenue, thème, polices, vocabulaire ; **réécrire `DESIGN.md`, `.impeccable.md`, `PRODUCT.md` et la charte HTML d'abord** | Le gérant a validé la DA sur planche (captures) |
| 1. Fondations | jetons OKLCH, polices, échelle de texte, espacement, mouvement, thèmes, coque (barre, pied) | `typecheck`, `lint`, `npm test` (dont anti-slop), captures 390/820/1440 |
| 2. Composants | carte parfum, grille, recherche + filtres, fiche (feuille + page), vide, héros | critique design (skill `critique`), 8 états dessinés, stress (10) |
| 3. Pages | accueil/catalogue, marque, index A→Z, fiche indexable, La parfumerie, Contact, Légal, 404, images OG | SEO inchangé (URLs, canoniques, sitemap), mentions présentes |
| 4. Mouvement | appui, feuilles, entrées, transitions de page | 3 passes : normal, ralenti ×4, mouvement réduit ; test au doigt |
| 5. Qualité | audit complet, Lighthouse mobile, e2e à jour, comparaison avant/après | CWV atteints, 0 violation AA, `test:layout` et e2e verts |
| 6. Mise en ligne | aperçu Vercel relu sur téléphone, puis `main` | CI verte, captures « après » archivées |

Boucle de travail, toujours : **comprendre → concevoir sur planche → implémenter → mesurer →
critiquer → corriger.** Une planche (captures ou page HTML) est montrée au gérant *avant* d'écrire
les composants de la phase.

## 12. Outils : quoi pour quoi

| Besoin | Outil déjà disponible |
|---|---|
| Direction, critique de DA | skills `critique`, `frontend-design`, `teach-impeccable` (contexte) |
| Typo, espace, couleur, mouvement | `typeset`, `arrange`, `colorize`, `animate`, `apple-design` |
| Finitions et durcissement | `polish`, `harden`, `adapt`, `distill`, `quieter`/`bolder` |
| Garde-fou machine | `tests/architecture/anti-slop.test.ts` |
| Voir le rendu | navigateur intégré, `scripts/refonte-vitrine/capture.mjs` (WebKit iPhone, Chromium), `npm run test:layout` |
| Cartographie du code | `graphify query …` |
| Idées de style, **jamais l'autorité** | `ui-ux-pro-max` : pour « parfumerie de luxe » il a proposé *page d'appli avec boutons App Store*, *Cormorant/Montserrat* et *noir + or* — exactement le cliché à fuir |

Écartés après lecture : l'installeur d'`impeccable` v4 (hook qui télécharge et exécute un binaire à
chaque modification, télémétrie active par défaut, installation globale) ; les MCP Playwright et
DevTools (doublons du navigateur intégré et de Playwright du dépôt) ; tout skill sans source lisible.
