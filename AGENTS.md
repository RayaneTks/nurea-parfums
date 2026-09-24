<!-- Référence locale (racine) pour les tags Parent: .../AGENTS.md -->

# AGENTS.md (Root)

## Purpose
Ce fichier est la racine de la hiérarchie `AGENTS.md` utilisée par les skills (ex. `deepinit`) pour aider les agents à naviguer dans le dépôt.

## Key Files
- `CLAUDE.md` — contexte projet principal (architecture, règles métier, règles de base de données vitales).
- `DEVELOPER.md` — commandes sûres, base de test locale, ce qu'il ne faut jamais lancer.
- `PASSATION.md` — état du chantier et reprise.
- `DESIGN.md` / `PRODUCT.md` — vitrine ; `docs/admin/` — gestion.
- `.cursor/rules/project-memory.mdc` — mémoire persistante always-on.
- `.cursor/rules/design-engineering.mdc` — standards design/qualité UI non négociables.

## Subdirectories
- `docs/` — documentation de référence versionnée.
- `src/` — code applicatif.
- `app/` — routes, APIs et pages Next.js.
- `prisma/` — schéma et migrations : source de vérité de la base.
- `e2e/` — tests Playwright, dont les invariants d'affichage de l'admin.

## For Agents
- Respecter les sections stables (Purpose / Key Files / Subdirectories / For Agents / Testing Requirements).
- Ne pas supprimer les blocs `<!-- MANUAL: ... -->` s'ils existent.
- Suivre une boucle stricte: comprendre -> implémenter -> vérifier -> documenter -> corriger.
- Pour toute évolution métier/admin, mettre à jour la mémoire projet (`CLAUDE.md`, `DEVELOPER.md`, `.cursor/rules/project-memory.mdc`) dans le même lot. Une documentation qui promet ce que le code ne fait pas est un bug.
- Privilégier les garde-fous serveur (API/DB) avant les garde-fous UI.
- En cas d'ambiguïté métier, proposer une contre-proposition argumentée puis implémenter la version la plus robuste après validation.

## Testing Requirements
- Après modification code : `npm run typecheck`, `npm run lint`, `npm test`.
- Si la base est impactée : écrire une **migration** dans `prisma/migrations/` et la tester sur la base locale (`npm run test:db`). **Jamais** `prisma db push` ni `prisma migrate reset` : `.env` pointe sur la production (voir `CLAUDE.md`).
- Si un test ne peut pas être exécuté (environnement), le signaler explicitement avec une marche à suivre.

