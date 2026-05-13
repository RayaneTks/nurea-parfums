<!-- Référence locale (racine) pour les tags Parent: .../AGENTS.md -->

# AGENTS.md (Root)

## Purpose
Ce fichier est la racine de la hiérarchie `AGENTS.md` utilisée par les skills (ex. `deepinit`) pour aider les agents à naviguer dans le dépôt.

## Key Files
- `CLAUDE.md` — contexte projet principal (architecture, règles métier, admin UX).
- `DEVELOPER.md` — commandes dev/prisma et rappels opérationnels.
- `.cursor/rules/project-memory.mdc` — mémoire persistante always-on.
- `.cursor/rules/design-engineering.mdc` — standards design/qualité UI non négociables.
- `docs/shared/agent-performance-loop.md` — protocole d'exécution et auto-correction continue.

## Subdirectories
- `docs/` — documentation de référence versionnée.
- `src/` — code applicatif.
- `app/` — routes, APIs et pages Next.js.
- `prisma/` — schéma et logique de persistance.

## For Agents
- Respecter les sections stables (Purpose / Key Files / Subdirectories / For Agents / Testing Requirements).
- Ne pas supprimer les blocs `<!-- MANUAL: ... -->` s'ils existent.
- Suivre une boucle stricte: comprendre -> implémenter -> vérifier -> documenter -> corriger.
- Pour toute évolution métier/admin, mettre à jour la mémoire projet (`CLAUDE.md`, `DEVELOPER.md`, `.cursor/rules/project-memory.mdc`) dans le même lot.
- Privilégier les garde-fous serveur (API/DB) avant les garde-fous UI.
- En cas d'ambiguïté métier, proposer une contre-proposition argumentée puis implémenter la version la plus robuste après validation.

## Testing Requirements
- Après modification code: exécuter `npm run lint`.
- Si la DB est impactée: appliquer synchronisation/migration Prisma et remonter le résultat exact.
- Si un test ne peut pas être exécuté (environnement), le signaler explicitement avec une marche à suivre.

