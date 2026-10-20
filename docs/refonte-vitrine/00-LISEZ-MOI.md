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

## Reprise : phase 0, pas à pas

**Réglages de la session.** Session **vide** (le contexte de la préparation pesait 700 000 jetons :
tout est ici, pas besoin de le relire). Modèle Fable 5.1, effort `high` (`xhigh` seulement si la
planche déçoit). **Aucun sous-agent en parallèle**, `graphify` avant tout fichier. Le gérant est sur
un forfait à budget limité : vérifier `get_usage` (fenêtre de 5 h) avant un gros chantier et dire
la consommation à la fin.

1. Lire 01, 02, 03 dans l'ordre (pas les annexes, sauf besoin ponctuel).
2. Faire trancher au gérant les 3 décisions de `03-DA.md` § 7 : thème, logo/monogramme,
   « Ma sélection » + sélecteur de contenance.
3. Construire **une** page HTML autonome `.tmp/refonte-vitrine/planche/index.html` : même grille de
   6 parfums réels (données du catalogue public ou de `src/lib/catalog/demo-catalogue.json`) et même
   fiche, dans les directions retenues, avec trois couples typographiques. Les fichiers de polices à
   télécharger passent par un accord explicite du gérant (nom, source, taille).
4. Calculer la couleur d'ambiance des visuels réels (script jetable avec `sharp`, sortie JSON,
   contraste vérifié) et la montrer sur la planche.
5. La montrer **sur téléphone** (aperçu Vercel d'une branche, ou fichier ouvert directement).
6. Après choix seulement : réécrire `DESIGN.md`, `.impeccable.md`, `PRODUCT.md`,
   `docs/charte-graphique.html`, puis passer à la phase 1.

## À ne pas perdre (hors refonte)

- **Liste fournisseur** : 292 parfums, 73 marques, envoyée au gérant le 03/10 (sans mention masqué /
  visuel). À sa réponse : corriger l'orthographe en base et ajouter ce qui manque. Le fichier se
  régénère depuis la base (lecture seule).
- **Répertoire de recherche** (`src/lib/search/repertoire-parfums.json`, 3 741 références) : écrit de
  mémoire, **non vérifié** ligne à ligne ; manquent Zara, Matière Première, Zimaya, Orientica.
- **Vérifier la CI de `main`** après le dernier push (le test d'affichage prend ~30 min).

## Règle d'or

Le document amont avant le code. Tant que `DESIGN.md` décrit la charte v3, il est **faux** pour la
refonte : le réécrire est le premier geste de la phase 0, pas le dernier.
