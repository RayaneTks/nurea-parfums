# Suite de T15 — l'accueil « Flacon » est codé ; ce qui reste à l'exécutant

État au 21/10/2026 : l'accueil a été **codé par Fable** (composition « Flacon », `04-PLAN-EXECUTION.md`
§ B.10, commit `45d449d` sur `refonte/vitrine`). Il attend le point de contrôle du gérant sur
l'aperçu Vercel de la branche, sur son téléphone. Ce fichier remplace l'ancien prompt T15 (composition A,
refusée).

## Selon la réponse du gérant

- **« Oui »** : T15 est close. Reprendre `PROMPT-OPUS.md` à **T16** (La parfumerie, Contact, Légal, 404).
  Noter le « oui » dans `00-LISEZ-MOI.md` § État et au journal de `docs/EQUIPE.md` § 8.
- **« Non » d'exécution** (bug, lenteur, texte faux, débordement) : corriger sur `refonte/vitrine`,
  re-soumettre le même PC. Vérifications minimales : `npm run typecheck && npm run lint && npm test`,
  e2e `e2e/parcours/accueil-snapchat.spec.ts` (config jetable `.tmp/refonte-vitrine/t15/pw.config.ts`,
  serveur de dev sur 3000), LCP par `.tmp/refonte-vitrine/t15/lcp.mjs` sur un build webpack servi par
  `next start -p 3004` — **vérifier d'abord qu'aucun vieux serveur n'écoute sur 3004** (`netstat -ano`).
- **« Non » de goût** : s'arrêter, noter la remarque dans `00-LISEZ-MOI.md` § État ; session Fable
  (effort high), avec la remarque exacte du gérant : trois compositions ont déjà été refusées, puis deux
  essais dans la session Fable du 21/10 (§ B.10, historique) — lire ce qui a été refusé avant de dessiner.

## Ce que l'exécutant ne fait pas

Modifier § B.10, la composition, l'accroche ou les rôles de texte de la hero ; poser du texte sur le
visuel ou l'assombrir ; remplacer le visuel de la chambre sans la décision du gérant (§ B.10, ressource) ; ajouter avant le catalogue une fonction qui existe déjà ailleurs (recherche,
filtres, nouveautés, comment commander). Toucher la gestion (`app/admin`, `src/features`, `src/ui`, `src/app-shell`,
`src/server`).
