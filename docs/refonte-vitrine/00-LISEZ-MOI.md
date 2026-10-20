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
| 1 → 2 (S3) | **T5 faite** (coque : barre en verre, pied de page, 404, logotype ivoire/noir, `398f3c0`) et **T6 faite** (jeu d'essai `/essai-extremes`, dev seulement, `b52b376`). **T7 faite** (ambiance en base, essai à blanc, `8459575`). **Prochaine tâche : T8** (carte et visuel, effort high), session S4 |
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
