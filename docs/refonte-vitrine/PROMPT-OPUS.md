# Prompt de passation — exécution de la refonte vitrine (Opus 5.5, effort `medium`)

Copier tout ce qui suit la ligne dans une session **vide** (`/clear`, `/model opus 5.5`, effort
`medium`). Le remplir : `<TÂCHE>` = la première tâche non faite selon `00-LISEZ-MOI.md` § État
(au départ : T1).

---

Contexte : dépôt Nuréa Parfums (`C:\Users\User\Desktop\nurea-parfums`). Refonte complète de la
vitrine publique, cadrée le 20/10/2026 par Fable. **Tu exécutes, tu ne réinventes pas la DA.** La
gestion (`app/admin`, `src/features`, `src/ui`, `src/app-shell`, `src/server`) est hors périmètre :
n'y touche jamais (sauf T7, strictement ce que la tâche liste).

**Lecture, dans cet ordre, rien d'autre au départ** : `AGENTS.md`, `docs/refonte-vitrine/00-LISEZ-MOI.md`,
`docs/refonte-vitrine/01-INVARIANTS.md`, `docs/refonte-vitrine/04-PLAN-EXECUTION.md`. Tu ouvres
`02-PLAYBOOK.md` ou `03-DA.md` seulement pour un point précis cité par la tâche. Les skills de
`.agents/skills/` : un seul à la fois, seulement si la table d'`AGENTS.md` le désigne (`ponytail`
pour coder ; pour une interface : `02-PLAYBOOK.md` puis `emil-design-eng`).

**Budget** (quota limité du gérant, contrainte dure) : aucun sous-agent ; `graphify query` avant tout
fichier (`graphify query "<question>" --budget 1500 --graph C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json`) ;
pas de recherche web ; captures seulement là où une tâche les exige ; `get_usage` au début et à la
fin, consommation dite à la fin. Si le contexte dépasse ~150 000 jetons : commit de ce qui est
propre, état noté dans `00-LISEZ-MOI.md` § État, arrêt. Réponses en français, style caveman ultra
(phrases courtes, pas de politesse ; clair et complet seulement pour un avertissement de sécurité,
une action irréversible, un commit, une doc).

**Règle d'or** : document amont → planche montrée au gérant → code. La tâche T1 (planche HTML) est
validée par le gérant **avant** toute réécriture de `DESIGN.md` et avant tout code de production.
Tant que le point de contrôle 1 n'est pas passé, `app/(shop)`, `src/` et `DESIGN.md` ne bougent pas.

**Interdits** : `npm run build` tel quel (toujours `NUREA_SKIP_MIGRATE_DEPLOY=1` avec
`DATABASE_URL`/`DIRECT_URL` factices) ; `prisma db push` ; `prisma migrate reset` ; `git add -A` ;
`npx` ou installation d'un outil sans accord du gérant ; télécharger une police sans avoir listé au
gérant nom, source et taille ; inventer une donnée (note, famille olfactive, avis, rareté) ; reprendre
un jeton, une classe ou un composant de la charte v3 ; modifier `04-PLAN-EXECUTION.md` § B (c'est
Fable qui le fait) ; `#000`, `#fff`, Inter/Roboto/Arial/Open Sans/Lato/Montserrat/Poppins ;
`transition: all` ; plus de 2 surfaces en verre.

**Méthode** : une tâche à la fois, dans l'ordre de `04-PLAN-EXECUTION.md` § D. Pour chaque tâche :
1. `git fetch` ; comparer à `origin/main` ; travailler dans le worktree
   `.claude/worktrees/refonte-vitrine` sur la branche `refonte/vitrine` (T1 : branche
   `refonte/planche`, jamais fusionnée).
2. Lire la tâche en entier : objectif, fichiers, spécification, acceptation.
3. Implémenter le plus petit changement qui remplit l'acceptation (`ponytail`).
4. Vérifier **par la commande ou le test que la tâche nomme**, puis `npm run typecheck`, `npm run
   lint`, `npm test`. Un test qu'on ne peut pas lancer est signalé avec la marche à suivre.
5. Commit de la tâche seule, `git add` fichier par fichier, message en français, sujet
   `vitrine(Tn): …`, corps = ce qui a été vérifié (chiffres), terminé par
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push de la branche.
6. Mettre à jour `00-LISEZ-MOI.md` § État (tâche faite, prochaine, remarques).
7. Si la tâche porte un point de contrôle (PC 1 après T1, PC 2 après T9, PC 3 après T12, PC 4
   après T22) : pousser la branche, donner l'URL de l'aperçu Vercel au gérant, poser **la question
   du § E, telle quelle**, et **s'arrêter**. Ne pas enchaîner la tâche suivante.
8. Une réponse « non » du gérant : si c'est de l'exécution (bug, texte, lenteur, état manquant),
   corriger et re-soumettre ; si c'est du **goût** (couleur, police, proportions, « ça fait
   généré »), **s'arrêter**, noter la remarque dans `00-LISEZ-MOI.md` § État et dire au gérant :
   « Remarque de goût → session Fable (effort high) avec `04-PLAN-EXECUTION.md` et cette remarque. »

**Sessions** : une phase par session (table § F de `04-PLAN-EXECUTION.md`), `/clear` entre deux.
Cette session fait **<TÂCHE>** et, si la phase le prévoit et qu'aucun point de contrôle ne bloque,
les tâches suivantes de la même phase. Rien d'autre.

**Sortie de fin de session**, ≤ 8 lignes : tâches faites (commit, branche), vérifications passées
(commandes et chiffres), ce qui attend le gérant (point de contrôle et sa question, ou rien),
consommation (`get_usage`), prochaine tâche à coller dans `<TÂCHE>` pour la session suivante.

Commence : lis les quatre fichiers, `get_usage`, puis <TÂCHE>.
