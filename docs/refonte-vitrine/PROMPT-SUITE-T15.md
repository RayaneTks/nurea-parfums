# Prompt — session Opus : T15, coder l'accueil (composition A « Couverture »)

À coller dans une session neuve (Opus 5.5, effort medium), après `/clear`. Origine : le gérant a
choisi la composition **A « Couverture »** sur la planche v2 le 21/10/2026 (B « trop chargée »), avec
une réserve : « très simple, bof ». La page codée doit donc être irréprochable là où une planche ne
peut rien montrer : vrai catalogue, fiche, gestes, finitions.

---

Contexte : dépôt Nuréa Parfums (C:\Users\User\Desktop\nurea-parfums), refonte de la vitrine publique,
DA « Nuancier nocturne ». Tu es l'exécutant : tu codes **T15 — Accueil : composition** sur la branche
`refonte/vitrine` (worktree `.claude/worktrees/refonte-vitrine`), selon `04-PLAN-EXECUTION.md` § B.10
(composition A) **à la lettre**. Tu ne réinventes pas la composition ; une question de goût → tu
t'arrêtes et le gérant rouvre une session Fable. Gestion (`app/admin`, `src/features`, `src/ui`,
`src/app-shell`, `src/server`) hors périmètre.

## Lecture, dans cet ordre

1. `docs/EQUIPE.md` (§ 4, § 5, journal § 8) et `AGENTS.md`.
2. `docs/refonte-vitrine/00-LISEZ-MOI.md` (§ État, « Remarques de T14 » et « T12–T13 »).
3. `docs/refonte-vitrine/04-PLAN-EXECUTION.md` : § A, § B (surtout **§ B.10**, B.3, B.4, B.5, B.7), **T15**, § E.
4. `DESIGN.md` § Accueil, `docs/refonte-vitrine/01-INVARIANTS.md` (H1, référencement, mentions).
5. La référence visuelle : `public/planche/accueil-v2.html` sur `refonte/planche` (bouton **A**),
   aperçu https://nureaparfums-git-refonte-planche-rayanetks-7861s-projects.vercel.app/planche/accueil-v2.html
   (sa CSS est un brouillon à traduire en classes de `app/globals.css` et Tailwind du dépôt, pas à copier).
6. Le code existant à réécrire : `src/components/features/Hero.tsx` (ancien gabarit photo + texte, à
   supprimer), `FeaturedSection.tsx`, `app/(shop)/page.tsx` ; et à réutiliser : `PerfumeImage.tsx`
   (bascule sombre/clair en CSS, vignette 640 via `src/lib/images/loader.ts`), `ambientStyle()`
   (`src/lib/catalog/ambient.ts`), `brandLineLabel` (`perfumePresentation.ts`), `PerfumeSheet`
   (ouverture par `?parfum=<id>` dans `useCatalogFilters`), `CatalogSection`, rôles `.t-display`,
   `.t-title`, `.t-subtitle`, `.t-body`, `.t-caption`, `.page-x`, `.amb`, `.press`.

Les docs se lisent par `git show origin/main:<fichier>` après `git fetch` (le dossier partagé peut
être en retard).

## Ce que tu codes (§ B.10, socle + A)

1. **`Hero.tsx`** : `<section>` dans `.page-x`, 24 px sous la barre ; H1 unique en `t-display`
   « Nuréa Parfums, Marseille » (« Nuréa Parfums, » insécable, « Marseille » en `--text-2` sur sa
   propre ligne) ; ligne de faits en `t-caption` à 8 px : « *N* parfums · *M* marques · Commande sur
   Snapchat », *N* et *M* passés par la page depuis le catalogue publié. Aucun bouton, aucune photo.
2. **`FeaturedSection.tsx`** : un **bandeau par parfum mis en avant** (2 au plus, `isFeatured`), bord à
   bord, fond `var(--amb)` posé par `ambientStyle()` (repli `--surface-1`), `padding-block` 24 / 32 / 48,
   premier bandeau à 24 px sous les faits, 12 px entre les deux. Dedans (`.page-x`) : marque en `t-body`
   `--text-2` (`brandLineLabel`), nom en `t-title` (`<h2>`, lien vers la fiche), visuel 2:3 `PerfumeImage`
   rayon `--r-md` dans un bouton vers la fiche (`?parfum=<id>`, même mécanique que la carte). Dès
   768 px : grille texte `1fr` / visuel 45 % (`column-gap` 32, centrés), **second bandeau en miroir** ;
   dès 1024 : visuel 40 %, `column-gap` 48. Premier visuel : `priority` + `preload`,
   `sizes="(min-width: 1024px) 40vw, (min-width: 768px) 45vw, 100vw"`. Appui `.press` sur le visuel,
   nom souligné au survol (pointeur fin). Aucune animation d'entrée (T18).
3. **`src/components/features/BrandIndex.tsx`** (nouveau) : les 8 marques les plus fournies (par nombre
   de fiches publiées, puis nom), `<ul>` au filet `--line` (au-dessus de la première ligne et entre les
   lignes), chaque ligne un `<Link>` de 56 px min vers `/parfums/<slug>` (`src/lib/seo/paths.ts`), nom
   en `t-subtitle`, compteur « *n* parfums » en `t-caption` à droite ; 1 colonne < 768, 2 à 768
   (`column-gap` 32), 4 à 1024. Dessous, deux liens tertiaires de 44 px : « Toutes les marques, de A à
   Z » (`/parfums`), « Un parfum manque ? Écrivez-nous » (`/contact`). Titre de section « Marques » en
   `t-title`.
4. **`app/(shop)/page.tsx`** : ordre Hero → FeaturedSection → BrandIndex → CatalogSection (titre
   « Catalogue » en `t-title` + compteur en `t-caption` ; la section elle-même ne change pas). Compteurs
   et top 8 calculés côté serveur depuis `getCachedCatalogue()`. Métadonnées inchangées.
5. Supprimer ce qui ne sert plus : la photo de fond (`public/branding/visuel-hero*.webp` et ses variantes
   dans `src/lib/images/loader.ts`), `--nurea-hero-scrim` s'il subsiste, tout bouton de l'ancienne
   ouverture. Vérifier `tests/architecture/anti-slop.test.ts` et `css-registers.test.ts`.

Vocabulaire : Marque · Parfum · Ligne · Catalogue. Jamais Maison, Galerie, Sillage, « Découvrir ».
Aucune contenance, aucun prix, aucune note, aucun avis, aucune « nouveauté ».

## Acceptation (T15)

- H1 unique portant « Nuréa Parfums » et « Marseille » ; aucune modale ni bannière à l'arrivée.
- Premier écran à 390 × 844 conforme au tableau A de § B.10 à ± 8 px (H1 137→238, faits 246→263,
  marque 311→333, nom 335→367, visuel dès 383 : ≥ 450 px du visuel visibles).
- `document.documentElement.scrollWidth === innerWidth` à 320 ; deux thèmes ; visuel sombre cadré en
  thème clair quand il n'a pas de variante claire (règle de T8).
- Depuis l'accueil, message Snapchat prêt en **4 taps au plus** (attendu : 2 — visuel → fiche →
  « Commander sur Snapchat »). Ajouter `e2e/parcours/accueil-snapchat.spec.ts` (config jetable comme
  en T12–T13, voir « Remarques de T12–T13 »).
- LCP ≤ 2,5 s sur build local au profil de T9 (4G lente, CPU ×4, `next start -p 3001`,
  `node node_modules/next/dist/bin/next build --webpack` avec `NUREA_SKIP_MIGRATE_DEPLOY=1` et des
  URL locales) ; élément LCP = le visuel du premier bandeau ; chiffre dans le commit.
- `npm run typecheck && npm run lint && npm test` verts ; captures 390 / 820 / 1440 × 2 thèmes par
  `node scripts/refonte-vitrine/capture.mjs <url> .tmp/refonte-vitrine/t15`.
- Un commit (`vitrine(T15): …`), `git add` fichier par fichier, push de `refonte/vitrine`, aperçu
  Vercel READY, **PC sur le téléphone du gérant** : « L'accueil codé te plaît ? » Un « non » de goût →
  s'arrêter, noter dans `00-LISEZ-MOI.md`, session Fable.

## Règles de travail

- Budget limité : aucun sous-agent ; `graphify query "<question>" --budget 1500 --graph
  C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json` avant d'ouvrir un fichier inconnu ;
  `get_usage` au début et à la fin. Contexte > ~150 000 jetons : commit de ce qui est propre, état noté
  dans `00-LISEZ-MOI.md`, arrêt.
- Git : `git fetch` et comparer à `origin/main` au départ ; `refonte/vitrine` doit reprendre la clé
  `public-catalogue` **au-dessus de celle de `main`** au rebase (EQUIPE § 4.4) ; docs sur `main` par un
  worktree temporaire. Ne jamais changer la branche du dossier partagé. Jamais `npm run build` tel quel,
  jamais `prisma db push` ni `migrate reset`, aucune écriture en base, aucune installation, aucun `npx`.
- À la fin : `00-LISEZ-MOI.md` § État (T15 faite, commit), une ligne au journal de `docs/EQUIPE.md`
  § 8, `DESIGN.md` relu (il doit décrire la page telle qu'elle est).
- Réponses en français, brèves ; le gérant n'est pas développeur : mots simples. Chaque rendu, 8
  lignes au plus au format de `docs/EQUIPE.md` § 5, finit par « Ce que tu dois faire ».
