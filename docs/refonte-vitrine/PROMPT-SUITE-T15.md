# Suite de T15 — l'accueil « La une » est codé ; ce qui reste à l'exécutant

État au 21/10/2026 : l'accueil a été **codé par Fable** (composition « La une », `04-PLAN-EXECUTION.md`
§ B.10, commit `140b8e5` sur `refonte/vitrine`). Il attend le point de contrôle du gérant sur
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
  (effort high). Cette fois, demander d'abord au gérant les ressources de § B.10 (a)–(c) (scènes 9:16,
  vidéo facultative, faits sur la maison) : la composition les attend.

## Ce que l'exécutant ne fait pas

Modifier § B.10, la composition, les rôles de texte de l'accueil, ou remettre un cadre, un bouton ou
un texte sur la scène. Toucher la gestion (`app/admin`, `src/features`, `src/ui`, `src/app-shell`,
`src/server`).
