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
| 03 | [`03-DA.md`](03-DA.md) | Constat de l'existant, trois directions, recommandation, fonctions signature, risques, critères d'acceptation, décisions à prendre |
| — | [`annexes/benchmark-da.md`](annexes/benchmark-da.md) | 14 sites mesurés, 10 principes, manifeste anti-« IA générique » de 20 points, 12 interactions |
| — | [`annexes/recherche-skills.md`](annexes/recherche-skills.md) | Skills et outils examinés ; ce qui est écarté et pourquoi |

## État

| Phase | État |
|---|---|
| Préparation (recherche, invariants, playbook, photo « avant », garde-fou anti-slop) | **faite** |
| 0. Décider (DA sur planche, thème, polices, vocabulaire) | à faire — décisions en `03-DA.md` § 7 |
| 1 → 6 | à faire (`02-PLAYBOOK.md` § 11) |

## Outils prêts

- `tests/architecture/anti-slop.test.ts` : refuse les tics d'interface générée (dérogation : `slop-ok: <raison>`).
- `src/lib/motion/physics.ts` et `src/hooks/useSheetMotion.ts` : ressort, élan, feuille qui suit le doigt (déjà en production).
- `node scripts/refonte-vitrine/capture.mjs <url> <dossier>` : photo du site (iPhone WebKit, tablette, bureau ; sombre et clair). La photo « avant » (65 captures, ~140 Mo) est dans `.tmp/refonte-vitrine/avant/`, hors dépôt : à refaire avec ce script si le dossier manque.
- 24 skills versionnés (`.agents/skills/`, texte seulement) et la table « quel skill pour quelle tâche » dans `AGENTS.md`. Provenance et versions : `.agents/skills/PROVENANCE.md`.
- Carte du code : `graphify query "<question>" --graph C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json`.

## Règle d'or

Le document amont avant le code. Tant que `DESIGN.md` décrit la charte v3, il est **faux** pour la
refonte : le réécrire est le premier geste de la phase 0, pas le dernier.
