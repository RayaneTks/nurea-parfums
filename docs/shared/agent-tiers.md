# Agent tiers (délégation OMC)

Ce fichier est référencé par les skills **`ralph`** et **`ultrawork`**. Il fixe une convention **observable** pour choisir un palier de modèle / un rôle d’agent lorsque le runtime OMC permet la sélection explicite.

## Paliers (simplifié)

| Palier | Usage typique | Quand l’utiliser |
|--------|---------------|------------------|
| **LOW** | Recherche locale, lecture ciblée, grep, tâches à faible risque | Question fermée, fichier connu, pas de design d’API |
| **MEDIUM** | Implémentation standard, refactors localisés, tests unitaires | Changement borné, critères de done clairs |
| **HIGH** | Architecture, débogage causal, sécurité, incohérences système | Risque élevé, plusieurs sous-systèmes, ambiguïté |

## Règles opérationnelles

1. **Ne pas** sur-déléguer en HIGH pour une recherche de symbole ; **ne pas** sous-déléguer en LOW pour une migration de schéma.
2. Toujours passer un **critère de fin** testable au sous-agent (commande, fichier, assertion).
3. Si le runtime n’expose pas les paliers : utiliser les **agents nommés** du dépôt (`.claude/agents/`) comme rôles sémantiques et garder la même discipline de preuve.

## Agents locaux (référence)

Les définitions vivent sous `.claude/agents/` (fichiers `.md`). La liste peut évoluer ; en cas de divergence, **le fichier sur disque fait foi**.
