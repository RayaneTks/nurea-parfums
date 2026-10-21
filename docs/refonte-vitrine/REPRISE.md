# Reprise — état de la refonte de la vitrine (à lire en premier)

Prompt de reprise après `/clear` : `PROMPT-REPRISE.md`.

Mis à jour le 21/10/2026 (T16 codée, attente PC ; prochain : T17). Ce fichier dit **où on en est** ; le détail chiffré est dans
`04-PLAN-EXECUTION.md` § B (DA) et § B.10 (accueil), les règles dans `CLAUDE.md`, `DESIGN.md`,
`01-INVARIANTS.md`. Ne rien décider ici qui n'y soit pas écrit.

## Nuréa en deux lignes

Parfumerie qui vend **son propre parfum**, inspiré des parfums que les clients aiment, **dans un flacon
Nuréa** — **pas** le parfum de la marque transvasé (gérant, 21/10). Clients venus de **Snapchat** ; le site
sert de catalogue (mis en story) et de vitrine pro ; commande sur Snapchat, envoi partout en France.
Aucun prix, aucune contenance affichés.

## Où est le code

| Quoi | Où |
|---|---|
| Refonte (code) | branche `refonte/vitrine`, worktree `.claude/worktrees/refonte-vitrine` — **jamais fusionnée avant T23** |
| Docs de la refonte | `main` (`docs/refonte-vitrine/`, `DESIGN.md`, `CLAUDE.md`) — écrire par un worktree temporaire sur `origin/main` |
| Aperçu | https://nureaparfums-git-refonte-vitrine-rayanetks-7861s-projects.vercel.app/ (catalogue de démo, sans base) |
| Accueil | `app/(shop)/page.tsx` → `Hero.tsx`, `FeaturedSection.tsx` (« À l'affiche »), `BrandShelf.tsx` (Marques), `CatalogSection` (catalogue, intouché) — `src/components/features/` |
| Suggestions de la barre de recherche | `src/components/layout/SearchBox.tsx` (champ + panneau), `searchEvents.ts`, `src/lib/search/suggestions.ts` (réponse → rangées), `useExtendedSearch.ts` ; e2e `e2e/recherche-suggestions.spec.ts` |
| Ouvrir une fiche depuis l'accueil | `openPerfume.ts` (événement + rejeu avant hydratation), écouté par `CatalogSection` |
| Styles de l'accueil | `app/globals.css` : `.hero*`, `.affiche`, `.bandeau*`, `.affiche-nom`, `.enter` |
| Photos de la hero | `public/branding/hero/flacon-{portrait,paysage}-{sombre,clair}[-640/-1280].webp`, déclinaisons dans `src/lib/images/loader.ts` |
| Tests utiles | `e2e/parcours/accueil-snapchat.spec.ts`, `tests/architecture/vitrine-tokens.test.ts`, `anti-slop.test.ts` |
| Outils de mesure | `scripts/refonte-vitrine/` : `bascule.mjs` (position d'une image avant/après bascule de thème), `alignement.mjs` (décalage du sujet entre variantes claire/sombre), `lcp.mjs`, `captures-accueil.mjs`, `pw-accueil.config.ts` (branche `refonte/vitrine`) |

Mesurer : build `NUREA_SKIP_MIGRATE_DEPLOY=1 DATABASE_URL=postgresql://x DIRECT_URL=postgresql://x node
node_modules/next/dist/bin/next build --webpack` (Turbopack refuse la jonction `node_modules` du worktree),
puis `next start -p 3004` — **vérifier d'abord qu'aucun vieux serveur n'écoute sur 3004** (`netstat -ano`) :
il servirait une CSS disparue. e2e accueil (serveur de dev sur 3000) : `node node_modules/@playwright/test/cli.js
test -c scripts/refonte-vitrine/pw-accueil.config.ts parcours/accueil-snapchat.spec.ts`.

## État des sections

| Section | État | Ce qui est en place |
|---|---|---|
| DA « Nuancier nocturne », Fraunces + Figtree, deux thèmes | **validé** (PC 1, 20/10) | jetons `globals.css` + `brand.ts` |
| Couleur de marque : doré (sombre) / bordeaux (clair) | **décidé** (gérant, 21/10) ; en place : **couple Nuréa** sur toute la vitrine (fonds, encres, accent ; `0133fc6`), logo complet monogramme + nom dans la barre et le pied de page (`a141675`), accent sur ce qui agit et ce qui est choisi (`DESIGN.md` § Couleurs)  ; dans la hero, **l'étiquette du flacon** porte le monogramme dans la couleur du thème (photos du 21/10, `cd64c4d`) ; le mot **« Nuréa » du titre en accent** (`606ff14`, exception notée dans `DESIGN.md` § Couleurs) ; pas de second monogramme décoratif (doublon de l'étiquette et de la barre) ; **à valider par le gérant sur captures** | `globals.css`, `brand.ts`, `BrandLogo.tsx` |
| Composants (boutons, cartes, champs, filtres, feuille, Ma sélection) | **validé** (PC 2–3) | `src/components/ui`, `PerfumeCard`, `PerfumeSheet`… — **ne pas les redessiner** |
| Catalogue (grille, filtres, recherche, fiche, Snapchat 2 taps) | **validé** | `CatalogSection` et ses pièces |
| Suggestions sous le champ de recherche (demande du gérant, 21/10) | **validé** (gérant, 21/10, `61cb116`) | jusqu'à 5 parfums avec visuel, « Voir les N parfums », sinon « Vous cherchez X ? Écrivez-nous » ; une rangée ouvre la fiche ; clavier complet (§ T10 bis) |
| Hero | **validé** (gérant, 21/10, « ok » après les photos à l'étiquette et « Nuréa » en accent) | photo du flacon Nuréa en fond (photos du gérant du 21/10 : flacon rempli, étiquette au monogramme, clair/sombre alignés à 0 px ; verrerie et petits flacons autour, que le brief excluait — choix du gérant) ; sous 375 px la photo descend de `--space-8` pour que Snapchat ne touche pas le bouchon ; titre puis « Voir le catalogue » + Snapchat en bouton rond 44 px sur une ligne, au-dessus et à gauche du flacon ; accroche « Le parfum que vous aimez, dans un flacon Nuréa. » (formulation du gérant, **non verrouillée**, avis juridique attendu) |
| À l'affiche | **validé** (21/10, « globalement ok » après finitions) | deux bandeaux horizontaux en miroir (Symphony flacon à gauche, Afternoon Swim flacon à droite) ; visuel entier fondu dans sa propre photo floutée (coin haut droit ×3) ; nom intégré sur un voile `--bg` ; tout le bandeau ouvre la fiche ; 4:3 mobile, 16:9 sur 62 rem en quinconce sur bureau |
| Marques | **en cours**, pas encore jugé | index typographique : 12 marques, nom + nombre, « Toutes les marques » → `/parfums` |
| La parfumerie, Contact, Légal, 404 (T16) | **codé** (21/10, `2ae7205`, `79410b9`) — **attente PC du gérant** | pages réécrites dans la DA ; photos éditoriales générées sans être vivant (demande du gérant) : atelier + une photo par temps de commande, écrans réels du catalogue et du profil Snapchat incrustés (`annexes/photos-editoriales.md`) ; 404 avec recherche ; « 10, 50 ou 80 ml » retiré ; FAQ : « nous vendons les grandes marques… au meilleur prix » retiré (faux) ; LCP /marque 2,4 / 2,1 s, /contact 0,85 s |
| OG, mouvement, audit, mise en ligne | **à faire** | T17 → T23 (`04-PLAN-EXECUTION.md`) |

## Règles à ne pas remettre en cause sans justification

- **Couleur de marque Nuréa (décision du gérant, 21/10/2026)** : les deux couleurs du monogramme — **doré `#C4956A` en thème sombre, bordeaux `#8B3A3A` en thème clair** — sont le jeton `--accent` (`--on-accent` pour le texte posé dessus ; 7,3:1 et 7,1:1 sur le fond, ≥ 5,8:1 sur toutes les surfaces). Elles portent l'identité de la maison : logotype, monogramme, moments de marque de l'accueil. Garde-fous : jamais en fond de toute la page, jamais en dégradé ni en bordure décorative, jamais à la place de l'ambiance (qui reste la couleur de chaque parfum) ; l'usage détaillé dans l'accueil est le prochain chantier.
- **Composants du design system figés** : la liberté créative porte sur la composition de l'accueil
  (hero, hiérarchie, mise en scène), jamais sur boutons, cartes, arrondis, champs, filtres, états.
- **Anti-automatismes** (refus explicites du gérant) : micro-label en capitales au-dessus d'un titre,
  mention « Marque · Ville », points décoratifs, numérotations, titres surdimensionnés, cartes qui débordent
  d'une section, texte qui défile, onglets ou carrousels par facilité, dégradés décoratifs, bordures dorées,
  slogans « poétiques ». Test : un élément qui irait tel quel sur cinquante sites générés n'apporte rien.
- **Copy** : jamais « le même parfum », « identique », « équivalent » ; toute accroche qui rapproche Nuréa
  d'une marque attend un avis juridique (C. conso. L122-2). **Plus de « Marseille »** dans la copy de
  l'accueil. Pas de texte marketing inutile.
- **Thèmes** : un thème ne change **que des couleurs** ; aucune dimension (interlignage, espacement, rayon)
  dans un bloc de thème — sinon la bascule déplace la page (tenu par `vitrine-tokens.test.ts`).
- **Visuels** : jamais recadrer un visuel 2:3 de parfum dans un cadre fixe (les flacons ne sont pas au même
  endroit d'un visuel à l'autre : un cadre coupe le bouchon de l'un ou la base de l'autre) ; jamais déformer ;
  bascule clair/sombre en CSS, jamais `useTheme`. Si un visuel manque : **demander la ressource au gérant**
  plutôt que compenser par du décoratif ; ne jamais générer un faux flacon Nuréa.
- **Firefox** : jamais `transform: scale` pour agrandir une image sous un flou — Firefox la peint entière à la taille agrandie (bascule de thème gelée 200 ms, défilement lourd). Agrandir par la mise en page, dans un cadre rogné (`.bandeau-fond-cadre`). Mesurer dans le vrai Firefox (installé, piloté par WebDriver BiDi, profil vierge).
- **Performance** : rien ne doit concurrencer l'image LCP de la hero (les 24 miniatures de marques le
  faisaient : 3,7 s) ; mesurer sur build, pas en dev.
- Mobile d'abord ; vérifier sur captures réelles à 320, 390, 430 et 1280, clair et sombre ; e2e accueil vert.

## Essais écartés à l'accueil (ne pas reproposer)

Hero : titre seul sur un aplat (planche v1, composition A codée) ; affiche d'un parfum bord à bord (« La
une ») ; « comment commander » + rayon des nouveautés (fonctions dupliquées) ; parfums à l'affiche comme hero
(« Vitrine ») ; nature morte générée sans flacon, en deux blocs (« Chambre ») ; étiquette défilante, bouton
à angles droits (« L'étiquette », hors DS). À l'affiche : grandes cartes du catalogue ; onglets ; diptyque
asymétrique ; recadrage 4:3 ou carré ; photo + bande de couleur unie ; affiches verticales empilées. Marques :
lignes d'annuaire ; rayon de flacons ; tuiles à la couleur moyenne (toutes ambrées) ; tuiles avec
miniatures (répétaient les produits).

## Problèmes connus et corrections

| Problème | État |
|---|---|
| Images qui bougent à la bascule de thème (même fichier) | **corrigé** 21/10 : interlignage commun (1,65/1,6 avant) ; 0 px mesuré |
| Variantes claire/sombre décalées dans les fichiers (29 paires sur 103, liste : `annexes/alignement-clair-sombre.md`) | **à corriger** par la session visuels (refaire au même cadrage) ; production (233 fiches) pas encore mesurée |
| Photos de la hero : sans étiquette, flacon vide, décalées entre clair et sombre (4,25 px / 10,10 px), définition sous le brief | **corrigé** 21/10 (`cd64c4d`) : photos du gérant, liseré vert de 3 px rogné à droite, 0 px de décalage ; plus lourdes → WebP 74, LCP 2 112 / 1 292 ms (1 532 / 1 064 avant, budget 2 500) |
| Firefox (PC) : site lent, animation de bascule de thème absente | **corrigé** 21/10 (`7b1d3cb`) : fond flou d'« À l'affiche » agrandi par `transform: scale(3)` ; première bascule 200 → 50 ms, animation fluide ; rendu identique. Edge n'était pas touché |
| e2e `catalog-filters` « le tri par marque… réordonne la grille » échoue sur téléphone (Pixel 7) | **à corriger** : déjà présent avant `cd64c4d` (même échec sur l'aperçu Vercel) ; hors hero |
| Titre et description Google de l'accueil (« grandes marques… à Marseille… au meilleur prix ») | **à revoir** avec l'avis juridique |

## Prochaines priorités

1. **T16 — La parfumerie, Contact, Légal, 404** (`04-PLAN-EXECUTION.md`) : réécrire ces pages dans la DA
   validée (composants figés, mobile d'abord), `MENTION_FLACONS` sur La parfumerie et Contact, formulaire
   par `src/actions/contact.ts` inchangé, 404 qui renvoie à la recherche. Point de contrôle gérant sur captures.
2. Puis T17 → T23. Avis juridique toujours attendu (accroche, présentation face aux marques) — ne pas bloquer.
3. Marques (index typographique de l'accueil) : pas encore jugé par le gérant ; à lui montrer avec T16.
