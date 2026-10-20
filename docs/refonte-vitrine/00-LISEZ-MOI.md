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
| 0. Décider : **T1 planche** (3 couples typo × 2 thèmes, 6 parfums, ambiance) → point de contrôle 1, puis T2 docs | **T1 faite** le 20/10 (branche `refonte/planche`, page `/planche/index.html` de l'aperçu Vercel) — **attente du point de contrôle 1** (choix du couple de polices, oui/non sur la direction, Ma sélection et sélecteur). Ensuite : T2. Note pour T4 : Bricolage pèse 128 Ko seule (budget 120) |
| 1 → 6 (T3 → T23, sessions S2 → S10) | à faire (`04-PLAN-EXECUTION.md` § D et § F) |

Décisions du 20/10 : direction **A+C « Nuancier nocturne »** ; **clair + sombre** ; **rien** de la
charte v3 n'est repris (seuls les logos/monogrammes, ivoire sur sombre, noir sur clair) ; vocabulaire
Marque · Parfum · Ligne · Contenance · Catalogue ; « Ma sélection » et sélecteur 10/50/80 retenus,
refusables au point de contrôle 1.

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

Le document amont avant le code. Tant que `DESIGN.md` décrit la charte v3, il est **faux** pour la
refonte : le réécrire (T2) est le premier geste après la planche validée (T1), jamais avant.
