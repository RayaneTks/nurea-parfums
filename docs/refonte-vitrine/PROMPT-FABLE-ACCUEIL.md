# Prompt — session Fable : composition de la page d'accueil (T15)

À coller dans une session neuve (Fable, effort high), après `/clear`. Origine : le gérant a refusé
la planche d'accueil de S7 le 20/10/2026 — « beaucoup trop cheap ». Remarque de goût → Fable
(04-PLAN-EXECUTION § E, règle de retour).

---

Contexte : dépôt Nuréa Parfums (C:\Users\User\Desktop\nurea-parfums). Refonte de la vitrine publique,
DA « Nuancier nocturne » (Fraunces + Figtree, clair + sombre, la seule couleur est celle du flacon).
Tu es la session de goût : tu redessines la **composition de la page d'accueil** (T15), tu l'écris
dans le document amont, tu la montres au gérant sur une planche, puis tu passes la main à
l'exécutant (Opus) qui la code. Tu ne codes pas l'application. Gestion (app/admin, src/features,
src/ui, src/app-shell, src/server) hors périmètre : n'y touche jamais.

## Lecture, dans cet ordre

1. `docs/EQUIPE.md` (§ 4, § 5, journal § 8) et `AGENTS.md`.
2. `docs/refonte-vitrine/00-LISEZ-MOI.md` (§ État, « Remarques de T14 »).
3. `docs/refonte-vitrine/04-PLAN-EXECUTION.md` : § A, § B en entier (c'est toi qui peux l'amender),
   T15, § E.
4. `DESIGN.md`, `docs/refonte-vitrine/03-DA.md`, `docs/refonte-vitrine/02-PLAYBOOK.md` (sections
   composition, hiérarchie, éditorial), `docs/refonte-vitrine/01-INVARIANTS.md` (H1, référencement,
   mentions).
5. Ce qui a été refusé, pour ne pas le refaire : branche `refonte/planche`, commit `cee4774`,
   `public/planche/accueil.html` (aperçu :
   https://nureaparfums-git-refonte-planche-rayanetks-7861s-projects.vercel.app/planche/accueil.html).
   Ce qui a plu (PC 1 à 3) : `public/planche/index.html` (T1), la fiche en feuille, la bascule de
   thème en cercle, la page marque à l'ambiance (aperçu de la branche `refonte/vitrine`).

Les docs se lisent par `git show origin/main:<fichier>` après `git fetch` (le dossier partagé peut
être en retard).

## La planche refusée, et pourquoi elle fait « cheap » (hypothèses à juger, pas à recopier)

Composition refusée : barre haute (logo, cœur, thème, champ de recherche) → titre « Nuréa Parfums,
Marseille » seul sur fond uni + une phrase + une fine bande de 15 teintes pastel + compteurs → « Mis
en avant » : 2 cartes côte à côte sur leur ambiance → « Chercher par marque » : 8 pastilles → grille
2 colonnes + « Charger la suite ».

Pistes de diagnostic :
- **Premier écran sans image** : le titre et un paragraphe sur un fond plat ; les visuels — le plus
  fort atout du site, des scènes 1024 × 1536 rendues pour chaque parfum — n'arrivent qu'en bas.
- **La bande de teintes** se lit comme une barre de progression ou un dégradé décoratif, pas comme
  un nuancier.
- **Tout a le même poids** : quatre sections empilées, même titre de section, même marge ; aucun
  moment fort, aucune échelle contrastée, aucun rythme éditorial.
- **Les « mis en avant » ressemblent à la grille** (mêmes cartes, juste colorées) : rien ne dit
  « choisi ».
- **Les pastilles de marques** font interface générique (filtres, tags), pas parfumerie.
- Rien ne signe la maison : ni le logotype/monogramme en grand, ni une mise en page qu'on
  reconnaîtrait.

## Ce que tu produis

1. **Diagnostic court** (5 lignes) de ce qui fait cheap, puis **la composition** : ordre des
   sections, ce que montre le premier écran à 390 × 844 (au pixel près : ce qui est visible au-dessus
   de la ligne de flottaison), échelles typographiques et d'image par section, comportement au
   défilement, mouvement (jetons § B.7), les deux thèmes, le passage à 768 et 1280 px. Chiffré, comme
   § B — pas d'adjectifs. Tu l'écris dans `04-PLAN-EXECUTION.md` (T15 et, si besoin, § B : tu es seul
   à pouvoir l'amender) et dans `DESIGN.md` § Accueil.
2. **Une planche** : `public/planche/accueil-v2.html` sur la branche `refonte/planche` (worktree
   `.claude/worktrees/refonte-planche`), HTML autonome, mêmes jetons que `index.html`, **vrais
   visuels** (vignettes `-640.webp` de `src/lib/catalog/demo-catalogue.json`, sombre et clair) et
   vraies ambiances. Le gérant n'a pas su dire précisément ce qui manque : **deux compositions
   franchement différentes** sur la même planche (sélecteur en haut), pas plus. Reprendre la bascule
   de thème en cercle de la vraie vitrine pour qu'il juge avec le vrai geste. Vérifier 320/390/1280,
   deux thèmes, `scrollWidth === innerWidth`, aucune image cassée. Push, attendre l'aperçu Vercel
   (projet `prj_aZNKbWeD80Sqe75jHRreVGKhS0sW`, équipe `team_856Q5M4QR2rbDUycym6qW3AV`, état READY).
3. **Question au gérant**, sur téléphone : « Laquelle des deux pour la page d'accueil, A ou B ? (ou
   aucune) ». Un « aucune » → noter sa raison, refaire. Un choix → l'écrire dans les docs.
4. Sur son choix : `00-LISEZ-MOI.md` § État, une ligne au journal de `docs/EQUIPE.md` § 8, et
   `docs/refonte-vitrine/PROMPT-SUITE-T15.md` pour l'exécutant (Opus, effort medium) : coder
   `Hero.tsx`, `FeaturedSection.tsx`, `app/(shop)/page.tsx` selon la composition retenue, critères
   d'acceptation de T15, vérifications (320/390, deux thèmes, typecheck, lint, test, e2e Snapchat en
   4 taps depuis l'accueil).

## Contraintes (non négociables)

- **H1 unique** portant « Nuréa Parfums » et « Marseille » (référencement, 01-INVARIANTS). Aucune
  modale ni bannière à l'arrivée. Message Snapchat prêt en **4 taps au plus** depuis l'accueil.
- **Interdit** : le gabarit « grande phrase + deux boutons + photo assombrie ». Un seul bouton plein
  par écran. Aucun tic d'interface générée (`tests/architecture/anti-slop.test.ts`).
- **Données vraies seulement** : nom, marque, gamme, visuels sombre/clair, couleur d'ambiance, « mis
  en avant » (2 au plus), visuel de collection de marque, nombres de parfums et de marques. **Jamais**
  de notes olfactives, familles, avis, prix, contenance (ml), ni « nouveauté » non attestée. Toute
  surface qui montre un flacon porte `MENTION_FLACONS` (texte exact dans `src/lib/mentions.ts`).
- Jetons seulement (aucun `#000`/`#fff`, aucune couleur hors § B), Fraunces + Figtree, graisses de
  § B.4. Mobile d'abord (390 px), cibles de 44 px. Performance : LCP actuel de l'accueil 1,9 s ;
  l'optimiseur d'images de Vercel est fermé, on choisit entre l'original et la vignette 640 —
  une grande image au premier écran doit tenir dans ce budget (dire laquelle, à quelle largeur).
- La recherche reste le champ permanent de la barre haute ; le catalogue (filtres, densité,
  « Charger la suite », fiche en feuille, Ma sélection) est fait et validé : la composition le
  garde, elle peut changer ce qui le précède et comment on y entre.

## Règles de travail

- Budget limité : aucun sous-agent ; `graphify query "<question>" --budget 1500 --graph
  C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json` avant d'ouvrir un fichier inconnu ;
  recherche web seulement pour une référence précise ; `get_usage` au début et à la fin. Contexte
  > ~150 000 jetons : commit de ce qui est propre, état noté, arrêt.
- Git : `git fetch` et comparer à `origin/main` au départ ; docs sur `main` par un worktree
  temporaire (puis le supprimer), `git fetch` + rebase avant push ; `git add` fichier par fichier,
  jamais `-A`. Ne jamais changer la branche du dossier partagé. Ne jamais lancer `npm run build`,
  `prisma db push`, `prisma migrate reset`, ni écrire en base. Aucune installation, aucun `npx`.
- Réponses en français, brèves ; le gérant n'est pas développeur : mots simples. Chaque rendu,
  8 lignes au plus au format de `docs/EQUIPE.md` § 5, finit par « Ce que tu dois faire ».
