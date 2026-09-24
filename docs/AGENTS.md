<!-- Parent: ../AGENTS.md -->

# docs

## Purpose

Documentation versionnée du dépôt. Deux registres, comme le code : la **vitrine**
(`PRODUCT.md` et `DESIGN.md` à la racine du dépôt) et la **gestion** (`docs/admin/`,
plus le dossier pilote de la refonte `docs/refonte/`).

**Règle** : une documentation qui promet ce que le code ne fait pas est traitée comme
un bug (02 §8). Si un changement rend un document faux, on amende le document dans le
**même lot** — ou on ne fait pas le changement.

## Key Files

| File | Description |
|------|-------------|
| `admin/PRODUCT.md` | Contexte produit de Nuréa Gestion : utilisateurs, écrans, onglets, vocabulaire des chiffres, règles métier, contraintes PWA. |
| `admin/DESIGN.md` | Design system de la gestion (`register: product`) : jetons, typographie, empilement, motion, invariants d'affichage. |
| `refonte/00-README.md` | **Point d'entrée de la refonte** : cadre, méthode, avancement jalon par jalon, ce qui reste avant la bascule. |
| `refonte/01-AUDIT-EXISTANT.md` | Ce que faisait l'app d'avant. §3 est la **liste de non-régression** (141 capacités). |
| `refonte/02-VISION-PRODUIT.md` | Décisions produit, capacité par capacité (garder / simplifier / fusionner / abandonner) ; vocabulaire canonique. |
| `refonte/03-MODELE-DONNEES.md` | MCD, MLD Prisma, contraintes, stratégie de reprise des données. |
| `refonte/04-ARCHITECTURE.md` | Couches, pile d'écriture unique, transactions, cache, auth, PWA, tests. |
| `refonte/05-DESIGN-SYSTEM.md` | Jetons et primitives de la refonte — la source est `src/design/tokens.ts`. |
| `refonte/06-ECRANS-PARCOURS.md` | Écran par écran (E01…E21) et sheet par sheet (S01…S21), avec états et gestes. |
| `refonte/07-PLAN-EXECUTION.md` | Jalons, bascule, migration, critères d'acceptation. |
| `refonte/08-RECETTE.md` | **La recette** : chaque capacité de 01 §3, où elle vit, et le test qui la couvre — ou le geste exact à faire à la main. |
| `catalog-database.md` | Contrat de lecture du catalogue par la vitrine. |
| `admin-supabase-setup.md` | Compte de gestion, Supabase Storage, variables d'environnement. |
| `SECURITE.md` | Réponse à l'audit de sécurité du 23/09/2026, et ce qui reste à faire hors du code (comptes, 2FA). |
| `charte-graphique.html` | La charte graphique v3, page autonome (ouvrir dans un navigateur). |
| `ux-audit-mobile-first-2026-03.md` | **Historique** — conventions de mars 2026, antérieures à la charte v3 et à la refonte. |
| `shared/agent-tiers.md` | Tiers d'agents et règles de délégation. |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `admin/` | Produit et design de Nuréa Gestion. |
| `refonte/` | Dossier pilote de la refonte, 00 → 08. Se lit dans l'ordre. |
| `shared/` | Documentation commune d'orchestration. |

## For Agents

### Working In This Directory

- **Lire `CLAUDE.md` avant tout** : il décrit le dépôt tel qu'il est aujourd'hui.
- Ne pas recopier dans un document une liste qui vit déjà dans le code ou dans un
  test : deux listes divergent toujours. Renvoyer à la source (par exemple les termes
  bannis, qui vivent dans `tests/architecture/vocabulaire.test.ts`).
- Amender le document **amont** avant de coder contre lui (règle d'or de
  `refonte/00-README.md`).
- Ne pas modifier `refonte/01` à `refonte/07` pour raconter l'app autrement qu'elle
  n'est — les corriger, en revanche, quand ils la décrivent faux.

### Testing Requirements

`npx vitest run --project arch` — en particulier :

| Test | Ce qu'il tient |
|---|---|
| `tests/architecture/documentation.test.ts` | `CLAUDE.md`, `docs/admin/PRODUCT.md` et `docs/admin/DESIGN.md` ne nomment aucun élément de l'ancienne gestion, nomment les repères vivants, et donnent les mêmes cinq onglets que `src/app-shell/navigation.ts`. |
| `tests/architecture/vocabulaire.test.ts` | Aucun terme banni dans un texte d'écran. |
| `tests/architecture/tokens-sync.test.ts` | `docs/admin/DESIGN.md` parle de jetons qui existent (la source est `src/design/tokens.ts`). |
| `tests/architecture/routes-builders.test.ts` | Toute route documentée a sa page, et réciproquement. |

Le reste se valide par lecture et cohérence des liens.

## Dependencies

### Internal

- `CLAUDE.md` (racine) — contexte projet, chargé automatiquement.
- `src/app-shell/navigation.ts` et `src/app-shell/routes.ts` — sources de vérité de
  l'architecture d'information ; `admin/PRODUCT.md` les décrit, ne les remplace pas.
- `src/design/tokens.ts` — source de vérité des jetons ; `admin/DESIGN.md` les
  commente, ne les redéfinit pas.
