# Refonte de la vitrine — point d'entrée

Le **20/10/2026**, le gérant a décidé de refondre entièrement la vitrine (catalogue public) : la
charte graphique v3 (noir + cuivre, angles 0, aucune ombre) est abandonnée, la nouvelle DA est
moderne, « Apple design-like », originale, **sans aspect de site généré par IA**.

Périmètre : la vitrine seulement (`app/(shop)`, `src/components`, `app/globals.css`). **La gestion
(`app/admin`) n'est pas concernée.**

## À lire, dans l'ordre

| # | Document | Contenu |
|---|---|---|
| 01 | [`01-INVARIANTS.md`](01-INVARIANTS.md) | Ce qui ne change pas : métier, mentions légales, référencement, technique, filets de tests |
| 02 | [`02-PLAYBOOK.md`](02-PLAYBOOK.md) | Le savoir-faire à appliquer (typo, couleur, espace, mouvement, interaction, images, rédaction), la méthode en 7 phases et leurs portes de qualité |
| 03 | [`03-DA.md`](03-DA.md) | Constat de l'existant, trois directions, recommandation, fonctions signature, risques, critères d'acceptation, **décisions prises (§ 7)** |
| 04 | [`04-PLAN-EXECUTION.md`](04-PLAN-EXECUTION.md) | **Le plan que l'exécutant suit** : décisions verrouillées, DA chiffrée (palette OKLCH, ambiance, typo, échelles, verre, mouvement, états), fichiers, 23 tâches, 4 points de contrôle, 10 sessions, risques, « terminé » |
| — | [`PROMPT-OPUS.md`](PROMPT-OPUS.md) | Prompt autonome à coller dans une session vide Opus 5.5 (effort medium) pour exécuter, tâche par tâche |
| — | [`annexes/benchmark-da.md`](annexes/benchmark-da.md) | 14 sites mesurés, 10 principes, manifeste anti-« IA générique » de 20 points, 12 interactions |
| — | [`annexes/recherche-skills.md`](annexes/recherche-skills.md) | Skills et outils examinés ; ce qui est écarté et pourquoi |

## État

| Phase | État |
|---|---|
| Préparation (recherche, invariants, playbook, photo « avant », garde-fou anti-slop) | **faite** |
| Cadrage (décisions du gérant, DA chiffrée, plan, passation) — Fable, 20/10/2026 | **fait** — `03-DA.md` § 7, `04-PLAN-EXECUTION.md`, `PROMPT-OPUS.md` |
| 0. Décider : **T1 planche** (3 couples typo × 2 thèmes, 6 parfums, ambiance) → point de contrôle 1, puis T2 docs | **T1 faite, point de contrôle 1 passé** le 20/10 : direction validée, polices **Fraunces + Figtree**, **aucune contenance affichée**, vraie page d'accueil à venir (T15, sur planche). **T2 faite** le 20/10 : `DESIGN.md`, `.impeccable.md`, `PRODUCT.md`, `docs/charte-graphique.html`, `CLAUDE.md` § Règles Vitrine décrivent la nouvelle DA |
| 1. Fondations (S2) | **T3 faite** (jetons et thèmes, `9e2d3b6`) et **T4 faite** (Fraunces + Figtree, `a7bdfeb`), branche `refonte/vitrine`, worktree `.claude/worktrees/refonte-vitrine`. T5 et T6 faites en S3 (voir ligne suivante) |
| 1 → 2 (S3) | **T5 faite** (coque : barre en verre, pied de page, 404, logotype ivoire/noir, `398f3c0`) et **T6 faite** (jeu d'essai `/essai-extremes`, dev seulement, `b52b376`). **T7 faite** (ambiance en base, essai à blanc, `8459575`) |
| 2 (S4) | **T8 faite** (carte, visuel, squelette, bouton 8 états, icônes, `7e68b14`). **T9 faite** (grille, densité, « Charger la suite », rail A→Z, `985374a`). **Point de contrôle 2 passé** le 20/10 (accueil, fiche, bascule de thème validés sur iPhone, après corrections `296fc91` → `f4ba99c`). **T10 faite** (recherche en direct, état vide qui invite à écrire, `5f79c5c`) et **T11 faite** (feuille des marques avec « Voir N parfums », une puce par marque, `2b8cc4e`). Correctif carte en S5 (coupure entre les mots, `b0b54da`). **Migration d'ambiance en production** (`8ba4e33`, seule sur `main`) et `--apply` le 20/10 : 199 fiches publiées sur 233 ont leur couleur, 34 en repli (14,6 %). **T12 faite** (fiche en feuille, `?parfum=<id>`, précédent/suivant au glissé, Snapchat en 2 taps, `288cf48`) et **T13 faite** (« Ma sélection », un seul message Snapchat, `7d86433`). **Point de contrôle 3 passé** le 20/10 (iPhone), après correctif des gestes et du verre à la bascule de thème (`f4bee0f`). **T14 faite** (fiche indexable au contenu de la feuille, page marque à l'ambiance moyenne, index A→Z, `00a0001` ; sitemap identique avant/après). **T15 : planche d'accueil faite** (`cee4774`, branche `refonte/planche`, `public/planche/accueil.html` : ouverture H1 + nuancier, 2 parfums mis en avant, chercher par marque, catalogue ; Snapchat en 2 taps). **Réponse du gérant (20/10) : « non », remarque de goût : « la page d'accueil fait trop cheap ».** → session **Fable** (effort high), prompt : `PROMPT-FABLE-ACCUEIL.md` : redessiner la composition de l'accueil (§ B, T15), puis nouvelle planche. Aucun code d'accueil d'ici là. Planche refusée : `refonte/planche` `cee4774`, `/planche/accueil.html` (ouverture H1 + bande de teintes, 2 mis en avant sur ambiance, puces de marques, grille). **Fable, 21/10 : composition redessinée** (`04-PLAN-EXECUTION.md` § B.10 : diagnostic, deux compositions chiffrées, A « Couverture » et B « Nuancier ») et **planche v2 en ligne** (`refonte/planche`, `/planche/accueil-v2.html`, sélecteur A/B en haut). **Choix du gérant (21/10) : A « Couverture »** (« la B est trop chargée » ; réserve : « très simple, bof » — la page codée doit convaincre au PC). § B.10 réduit à A, B écartée. **T15 faite** (code de l'accueil, `3492c18`, `refonte/vitrine` : H1 et ligne de faits, bandeaux à l'ambiance, index des marques, catalogue ; LCP médian 1,8 s sombre / 2,0 s clair). **PC de l'accueil codé : « non », remarque de goût (21/10)** : « la hero section et tout ce qui est au-dessus du catalogue, donc la page d'accueil, c'est ultra cheap pour un site de parfum catalogue ». Troisième refus de l'accueil. → session **Fable** (effort high), prompt `PROMPT-FABLE-ACCUEIL-2.md` : demander d'abord au gérant 2–3 sites de référence, rouvrir les interdits de § B.10, planche v3 avec mouvement. Le code de T15 reste sur la branche, à réécrire ; aucun autre code d'accueil d'ici là. **Fable, 21/10, troisième passage** : le gérant refuse de donner un site modèle et demande une direction originale **codée directement**. Trois essais écartés dans la session (« La une » : l'affiche n'est pas une page d'accueil ; « Le comptoir » : ne pas reconstruire les fonctions ; « Vitrine » : les parfums à l'affiche ne sont pas la hero), puis brief définitif du gérant : **une vraie hero de marque**, visuels à créer si besoin. Composition **« Chambre »** écrite dans § B.10 et `DESIGN.md`, **codée sur `refonte/vitrine`** (`2978930`) : hero (surtitre, accroche « Les grands parfums, dans un flacon Nuréa. », faits, deux entrées, visuel de la chambre généré en deux lumières — `annexes/hero-chambre.md`), « À l'affiche » compact, rayon des marques ; LCP 1 320 / 1 576 ms, e2e 8/8. **Attente du PC du gérant** sur l'aperçu Vercel. Ressource non bloquante : une photographie réelle pour la hero (§ B.10). **Suite (21/10, Opus)** : composants rétablis (`025b9f0`) ; brief photo validé ; **hero « Flacon » codée** (`45d449d`) avec les 4 photos du gérant (écarts au brief notés en § B.10) ; plus de « Marseille » dans la copy (gérant) ; **copy provisoire**, avis juridique attendu (01-INVARIANTS § 1). LCP 1 532 / 1 064 ms, e2e 8/8. **Attente du PC du gérant** |
| 2 → 6 (T7 → T23, sessions S4 → S10) | à faire (`04-PLAN-EXECUTION.md` § D et § F) |

Décisions du 20/10 : direction **A+C « Nuancier nocturne »** ; **clair + sombre** ; **rien** de la
charte v3 n'est repris (seuls les logos/monogrammes, ivoire sur sombre, noir sur clair) ; vocabulaire
Marque · Parfum · Ligne · Contenance · Catalogue ; « Ma sélection » et sélecteur 10/50/80 retenus,
refusables au point de contrôle 1.

### Remarques de S2 (20/10)

- Sur `refonte/vitrine`, la vitrine a perdu l'ancien style (jetons v3 supprimés en T3) : attendu, les
  composants sont réécrits de T5 à T17. Ne jamais fusionner cette branche avant T23.
- Classes neuves : rôles `.t-display` → `.t-caption`, `.page-x`, `.glass` (verre, seul emploi de
  `backdrop-filter`), `.amb` (ambiance), `.press` ; Tailwind : `bg-bg`, `bg-surface-1`, `text-fg-1`,
  `border-line`, `rounded-sm|md|lg|sheet`, `shadow-float`, `duration-dur-1…4`, `ease-soft|sheet|move`.
- **Build dans le worktree** : `npm run build` échoue (Turbopack refuse la jonction `node_modules`).
  Mesurer avec `NUREA_SKIP_MIGRATE_DEPLOY=1 DATABASE_URL=… DIRECT_URL=… node node_modules/next/dist/bin/next build --webpack`.
  Vercel n'est pas concerné.
- **Polices** : 85,5 Ko réellement chargés (fichiers latins seuls). `next/font` émet aussi
  latin-ext et vietnamien (89 Ko de plus), téléchargés seulement si une page affiche un caractère de
  leur plage.

### Remarques de S3 (20/10)

- **Barre haute** : collante (`sticky`), pas fixe — aucune page n'a à compenser sa hauteur. Le
  champ envoie `/?q=` (résultats en direct : T10). Le cœur diffuse `nurea:open-selection` et lit
  `nurea:selection:v1` ; la feuille et l'écriture viennent en T13 (événement
  `nurea:selection-change` à diffuser après chaque écriture, sinon le compteur ne bouge pas).
- **Point faible à trancher au PC 2** : sous 1024 px, « Marques », « La parfumerie » et « Contact »
  ne sont plus dans la barre (le plan n'y met que logo, recherche, cœur, thème) ; on ne les trouve
  qu'en pied de page. Contact est la page de commande : proposition → un lien « Contact » ou un
  menu court sur téléphone, à montrer sur la planche de T15.
- **Accueil** : la photo de fond actuelle et son texte posé dessus sont le gabarit interdit
  (DESIGN.md § Accueil). Elle disparaît en T15 ; si une image neuve est utile, le prompt sera
  fourni au gérant (génération ChatGPT).
- **Logotype** : `nurea-wordmark-ivory/black` (le logo horizontal portait un monogramme cuivre),
  variantes 640 px ajoutées et servies par `src/lib/images/loader.ts`.
- **Jeu d'essai** : `/essai-extremes?jeu=extremes|0|1|193` (le dossier `_extremes` prévu n'est
  pas routable sous Next). Relevé : cartes à hauteur 0 (anciennes classes), image cassée sans repli,
  nom de 60 caractères sans coupure → T8.
- **capture.mjs** : ses « gestes » (ouvrir une fiche, les filtres) échouent tant que le catalogue
  n'est pas réécrit : normal jusqu'à T11.
- **Dev depuis le worktree** : configuration `vitrine-dev` dans `.claude/launch.json` du dossier
  principal (`npm --prefix <worktree> run dev`) ; sans `.env` dans le worktree, la vitrine montre
  le catalogue de démonstration.

### Remarques de T7 (20/10)

- Essai à blanc sur la production (lecture seule) : **233** fiches publiées (le plan en comptait 193),
  34 en repli (14,6 %), tous sans couleur réelle (flacon noir, argent, transparent, photo d'origine
  sur fond blanc = visuel à venir, chantier visuels). Planche relue, aucun `--set`.
- **Correction du plan** : `--apply` « après le PC 2 » suppose la colonne en production. Décision :
  au PC 2, la migration `20261020120000_perfume_ambient` part **seule** sur `main` (schéma + migration,
  colonnes vides, sans risque), puis essai à blanc frais et `--apply`. Les visuels arrivés entre-temps
  sont ainsi pris en compte.
- Après la refonte, chaque fournée de visuels se termine par `ambiance.mjs --ids … --apply` :
  contrat écrit dans `docs/EQUIPE.md` § 4.2.
- Constat pour le PC 2 : 41 % des ambiances tombent dans l'ambre/or (scènes très dorées). Juger les
  cartes avec les vrais visuels ; décision V7 de `docs/EQUIPE.md`.
- T8 doit dériver `--amb`/`--amb-light` de `ambientHue`/`ambientChroma` en TypeScript, avec la même
  règle que le script (§ B.3, étapes 5–6) et un test de parité contre `ambiance.mjs` (il exporte
  `stored` et, à exposer, `derive`).

### Remarques de T8 (20/10)

- **Carte** : `PerfumeCard` = `<article class="card">` ; le bouton du nom s'étend à toute la carte
  (`::after`), le cœur est un bouton à part. Règles dans `app/globals.css` (`.card`, `.card-open`,
  `.card-name`, conteneur : nom au pas `body` sous 9 rem). Survol/appui → `--card-press` =
  `--amb` / `--amb-light`, ou `--surface-2` en repli.
- **Ambiance** : `src/lib/catalog/ambient.ts` (`ambientStyle(perfume)` pose `--amb`/`--amb-light` en
  style en ligne). Parité avec `derive()` de `ambiance.mjs` : 1 008 cas. À réutiliser en T12 (fiche)
  et T14 (en-tête de marque).
- **Sélection** : `src/lib/selection.ts` (clé, événement, lecture tolérante, bascule) et
  `SelectionHeart.tsx` déjà écrits et testés ; la barre les lit. **T13 n'a plus qu'à faire la
  feuille** et le message Snapchat groupé.
- **Bouton** : API gardée (`variant`, `buttonClass`) + `state` (`loading` | `success` | `error`) et
  `feedback` ; `disabled` devient `aria-disabled` (reste au clavier). `SUCCESS_MS` = 1 600, la
  remise au repos est à la charge de l'appelant (T12 : « Nom copié »). Module sans `"use client"`.
- **Captures iPhone sur localhost sans style** : la CSP de la vitrine pose
  `upgrade-insecure-requests` ; WebKit passe alors `http://localhost` en https et rien ne charge.
  Juger les captures tablette/bureau, ou le navigateur intégré à 390 px. Production non concernée.
- Grille, « charger la suite » et `nurea-catalogue-grid` mort : T9. Tiroir de filtres à l'ancienne : T11.

### Remarques de T9 (20/10)

- **Retours du gérant au PC 2 (vidéo et captures iPhone), corrigés sur la branche** : fiche ouverte sans
  fond (`296fc91`) ; fiche en Times, car le portail vers `<body>` sortait du bloc qui porte les
  polices → **toute feuille, tout tiroir et toute fiche s'ouvre dans `vitrineRoot()`**
  (`src/lib/vitrineRoot.ts`, `877a68b`) ; visuel entier 2:3 et fond d'ambiance dans la fiche
  (`22ebe69`, étape vers T12) ; bouton clair/sombre dans la fiche, révélé en cercle
  (`ThemeToggle`, View Transitions, `6157f70`). T12 garde le geste, précédent/suivant et `?parfum=`.
- **Adresse** : `?n=` (24 par page, borné à 960) et `?densite=1|3` (2 par défaut, rien d'écrit) en
  plus des filtres ; changer recherche, tri ou marques repart de la page 1, la densité non.
  `readFilters` / `writeFilters` exportés et testés.
- **Grille** : `ul/li`, colonnes par densité dans `CatalogSection` (`GRID`, `SIZES`). Une carte dans
  une case en flex doit garder `w-full` (le conteneur de requête n'a pas de largeur propre).
- **Barre d'outils** dans le flux, sans champ de recherche (la barre haute a le sien). Le bouton
  « Marques » ouvre encore l'ancien tiroir : T11.
- **Mesure** : Lighthouse n'est pas installé ; `LCP` mesuré par Playwright au même profil (4G lente,
  processeur ×4) sur un build local (`next start -p 3001`, configuration `vitrine-prod` du
  `.claude/launch.json` principal). Médiane 1 872 ms, élément = visuel d'accueil (T15).

### Remarques de T15 (21/10)

- **Ouvrir la fiche depuis un bandeau** : `FeaturedSection` émet `OPEN_PERFUME_EVENT` ; `CatalogSection`
  l'annule et pose `?parfum=<id>`. Un tap fait avant que le catalogue soit hydraté est gardé
  (`takePendingPerfume`) et rejoué à son montage. Le nom est un vrai lien vers la page indexable
  (sans JavaScript, nouvel onglet).
- **LCP** (5,8 s au premier essai → 1,8 / 2,0 s) : écart technique à § B.10 sur `sizes`, « 213px » sur
  téléphone et non « 100vw » (un écran ×2,6–×3 prenait l'original au lieu de la vignette 640) ;
  visuel LCP et logo préchargés pour le seul thème du système (`preloadByTheme`, React préchargeait
  d'office les deux variantes) ; cartes du catalogue en `content-visibility: auto` (sous réseau lent,
  Chrome chargeait les premières cartes avec le visuel). Effet visible : une capture pleine page
  montre la grille vide hors écran ; au défilement, les cartes se dessinent normalement.
- **Mesure** : `.tmp/refonte-vitrine/t15/lcp.mjs` (worktree), build webpack, `next start -p 3004`
  (3001 pris par une autre session). Captures téléphone par Chromium : `capture.mjs` passe par WebKit,
  sans style sur `localhost` (CSP, voir T8).
- **e2e** : `e2e/parcours/accueil-snapchat.spec.ts` (2 taps, H1, tap pendant l'hydratation, nom).
  `catalog-filters.spec.ts` lit désormais le compteur sous l'en-tête (l'en-tête porte le total).
  Suite vitrine 37/37 ; sous charge, un geste au doigt de `perfume-sheet` échoue parfois (1 passe
  sur 3, test différent à chaque fois), vert isolé.
- **Aperçu Vercel** (sans base) : l'index des marques mène à `/parfums/<marque>`, qui répond 404 sans
  base (T14, voulu) ; en production ces pages existent.
- Ouverts : le second bandeau n'a pas de préchargement (hors premier écran, voulu) ; branche toujours
  basée sur `ffe54e3` (34 commits de `main` derrière, docs et visuels) — rebase et clé de cache à T23.

### Remarques de T14 (20/10)

- **Build de contrôle** : `next build` (Turbopack) refuse la jonction `node_modules` du worktree
  (« Symlink … points out of the filesystem root »). Passer par
  `node node_modules/next/dist/bin/next build --webpack` avec `NUREA_SKIP_MIGRATE_DEPLOY=1` et des
  `DATABASE_URL`/`DIRECT_URL` locales. Sitemap : `.next/server/app/sitemap.xml.body`.
- **Voir les pages SEO en local** : sans base, `getSeoCatalogue()` rend vide (404 sur marque et fiche,
  voulu). La base locale jetable `nurea_test` a été remplie du catalogue de démo (36 marques, 111
  parfums, `updatedAt` fixe au 02/10) ; une suite `test:db` la recrée. `next start -p 3002` avec ces
  URL (le port 3001 sert à une autre session).
- **Ambiance de marque** : `averageAmbient()` (`src/lib/catalog/ambient.ts`) — moyenne circulaire
  pondérée par la chroma ; repli si aucune ambiance ou si les teintes s'opposent (longueur < 0,5).
- Ouverts : la rangée de lettres de l'index tient sur 3 lignes à 390 px ; le visuel de collection de
  la page marque garde son ancien format (2:3 plafonné à 20 rem).

### Remarques de T12–T13 (20/10)

- **Fiche** : `PerfumeSheet` (ex-`PerfumeDialog`), pilotée par `?parfum=<id>` dans `useCatalogFilters`
  (comme les filtres). Glissé horizontal = parfum voisin de la liste affichée ; `useSheetMotion` laisse
  désormais tout geste plus large que haut. Seuil de fermeture : `DISMISS_VELOCITY` = 110 px/s
  (`src/lib/motion/physics.ts`, § B.7), partagé avec la feuille des marques.
- **Message Snapchat** : `orderMessage()` (`perfumePresentation.ts`) = « Nom (Marque) », une ligne par
  parfum ; `SnapchatOrderButton` prend `message`, `label`, `hint`, `copiedLabel`.
- **Ma sélection** : pas de `SelectionProvider` (choix technique). La liste reste dans `localStorage`
  (`useSelectionIds`, `src/hooks/useSelection.ts`) ; la feuille `SelectionSheet` vit sur l'accueil (seule
  page qui a tout le catalogue), ouverte par `?selection=1` ; le cœur de la barre y mène d'ailleurs.
- **e2e vitrine** : `e2e/perfume-sheet.spec.ts` et `e2e/selection.spec.ts` (gestes tactiles par CDP,
  presse-papiers observé par un faux `navigator.clipboard`). Config jetable comme en T10–T11.
- Ouverts : visuel du voisin non préchargé (bref fondu au glissé) ; aucun indice visible que la fiche
  se feuillette ; à 320 px, le bouton groupé tient sur deux lignes ; un parfum retiré du catalogue reste
  compté par la pastille.

### Remarques de T10–T11 (20/10)

- **Recherche** : sur l'accueil, la barre diffuse la saisie (`SEARCH_EVENT`, vide sous 2 caractères), le
  catalogue filtre et renvoie sa requête (`QUERY_SYNC_EVENT`) quand une puce l'efface. Hors accueil, le
  champ envoie `/?q=`. Une frappe avant l'hydratation du catalogue n'est pas transmise.
- **État vide** : chaque cas finit sur « Écrivez-nous », contact pré-rempli (`parfum`, `marque`). La
  page Contact elle-même reste à l'ancienne (T16).
- **e2e vitrine en local** : le harnais complet exige la base e2e et se connecte à la gestion ; pour la
  vitrine seule, une config jetable (`testDir: ./e2e`, `baseURL` du serveur de dev, Pixel 7 + Chrome
  bureau) suffit. WebKit ne charge rien sur `http://localhost` (CSP, voir T8).
- `e2e/parcours/recherche.spec.ts` est celui de la gestion ; le parcours recherche de la vitrine s'écrit en T21.

## Outils prêts

- `tests/architecture/anti-slop.test.ts` : refuse les tics d'interface générée (dérogation : `slop-ok: <raison>`).
- `src/lib/motion/physics.ts` et `src/hooks/useSheetMotion.ts` : ressort, élan, feuille qui suit le doigt (déjà en production).
- `node scripts/refonte-vitrine/capture.mjs <url> <dossier>` : photo du site (iPhone WebKit, tablette, bureau ; sombre et clair). La photo « avant » (65 captures, ~140 Mo) est dans `.tmp/refonte-vitrine/avant/`, hors dépôt : à refaire avec ce script si le dossier manque.
- 24 skills versionnés (`.agents/skills/`, texte seulement) et la table « quel skill pour quelle tâche » dans `AGENTS.md`. Provenance et versions : `.agents/skills/PROVENANCE.md`.
- Carte du code : `graphify query "<question>" --graph C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json`.

## Reprise : exécution

Session **vide**, `/model opus 5.5`, effort `medium` (`high` pour T1, T8, T12) : coller
`PROMPT-OPUS.md` en remplaçant `<TÂCHE>` par la prochaine tâche de la table ci-dessus. Une phase par
session, un commit par tâche, `get_usage` au début et à la fin. Les polices à télécharger passent par
un accord explicite du gérant (nom, source, taille). Un « non » de goût à un point de contrôle
renvoie vers une session **Fable** (effort `high`) qui amende `04-PLAN-EXECUTION.md` § B.

## À ne pas perdre (hors refonte)

- **Liste fournisseur** : 292 parfums, 73 marques, envoyée au gérant le 03/10 (sans mention masqué /
  visuel). À sa réponse : corriger l'orthographe en base et ajouter ce qui manque. Le fichier se
  régénère depuis la base (lecture seule).
- **Répertoire de recherche** (`src/lib/search/repertoire-parfums.json`, 3 741 références) : écrit de
  mémoire, **non vérifié** ligne à ligne ; manquent Zara, Matière Première, Zimaya, Orientica.
- **Vérifier la CI de `main`** après le dernier push (le test d'affichage prend ~30 min).

## Règle d'or

Le document amont avant le code. `DESIGN.md` décrit la nouvelle DA depuis T2 (20/10) : le code
de la vitrine le rattrape tâche par tâche (T3 → T23).
