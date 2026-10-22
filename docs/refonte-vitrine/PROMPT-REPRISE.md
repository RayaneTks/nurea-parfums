# Prompt de reprise — refonte de la vitrine Nuréa (après /clear)

À coller tel quel dans une session neuve (Opus 5.5, effort high). Mis à jour le 22/10/2026 (refonte EN LIGNE ; parfums du moment en ligne ; voir REPRISE.md § Prochaines priorités).

---

Tu reprends la refonte de la vitrine de Nuréa Parfums (dépôt `C:\Users\User\Desktop\nurea-parfums`).
Tu es directeur artistique et développeur frontend senior : autonome sur les choix de composition, mais
dans la direction validée. Réponds en français, bref, en mots simples (le gérant n'est pas développeur) ;
chaque rendu finit par « Ce que tu dois faire ».

## 1. Lire d'abord, dans cet ordre (rien d'autre avant)

1. `git fetch`, puis `git show origin/main:docs/refonte-vitrine/REPRISE.md` — **l'état réel** : ce qui est
   validé, en cours, à corriger, les règles figées, les essais écartés, les priorités.
2. `CLAUDE.md` (racine) et `docs/EQUIPE.md` § 5 et § 8 (journal, haut du tableau).
3. Au besoin seulement : `04-PLAN-EXECUTION.md` § B (DA chiffrée) et § B.10 (accueil en vigueur),
   `DESIGN.md`, `01-INVARIANTS.md`. Pour explorer le code : `graphify query` (voir `CLAUDE.md`).

## 2. Où travailler

- Code : branche `refonte/vitrine`, worktree `.claude/worktrees/refonte-vitrine` (jamais fusionnée avant T23).
- Docs : sur `main`, par un worktree temporaire détaché sur `origin/main` (puis le supprimer) ; `git add`
  fichier par fichier ; pousser.
- Aperçu : https://nureaparfums-git-refonte-vitrine-rayanetks-7861s-projects.vercel.app/
- Mesures et tests : `scripts/refonte-vitrine/` (`bascule.mjs`, `alignement.mjs`, `lcp.mjs`,
  `captures-accueil.mjs`) ; e2e vitrine : `npm run test:e2e:vitrine` ; commandes exactes dans REPRISE.md.

## 3. Ce qui est acquis — ne pas rouvrir

- DA « Nuancier nocturne », Fraunces + Figtree, clair + sombre ; **composants du design system figés**
  (boutons, cartes, arrondis, champs, filtres, fiche, Ma sélection) ; catalogue validé.
- Accueil : **hero validée le 21/10** (photos du flacon Nuréa à l'étiquette NP,
  « Voir le catalogue » + Snapchat en bouton rond), **« À l'affiche » validé le 21/10** (deux bandeaux
  horizontaux en miroir), Marques en index typographique (validé le 21/10).
- **Suggestions sous le champ de recherche validées le 21/10** (`SearchBox`, T10 bis) : ne pas y revenir.
- Copy : jamais « le même parfum » (le parfum Nuréa n'est pas celui de la marque) ; plus de « Marseille » ;
  H1 « Nuréa, votre parfum / sans le prix des grandes marques. » (accroche du gérant du 21/10, ouverte par le nom pour Google, « Nuréa » en `--accent` ; **validé** ; avis juridique attendu).
- **Couleur de marque** (21/10) : doré `#C4956A` en sombre, bordeaux `#8B3A3A` en clair, jeton `--accent` ;
  barre et pied de page montrent le logo complet (monogramme + nom) ; fonds et encres forment le couple (nuit bordeaux + ivoire en sombre,
  ivoire + encre bordeaux en clair) ; l'accent marque ce qui agit et ce qui est choisi, jamais un décor.
- Un thème ne change que des couleurs ; ne jamais recadrer un visuel 2:3 dans un cadre fixe ; ne jamais
  générer un faux flacon Nuréa ; demander au gérant toute ressource visuelle manquante.
- Ne pas reproposer les essais écartés listés dans REPRISE.md.

## 4. Ta mission

**T16, le menu, T17 (vignettes de partage), l'index des Marques, T18 (mouvement), le titre de l'accueil et les chevrons de parfum voisin sont validés** (21/10) : ne pas y revenir. **T19 (audit) est faite** (`65e7ff9`, `annexes/audit-final.md`) : Lighthouse 99 / 100 / 92 / 100, LCP ≤ 2,16 s, INP ≤ 184 ms, CLS 0, axe 0 violation, zoom 200 % tenu. **T20 (filets e2e) est faite** (`8532241` : `e2e/vitrine/`, `playwright.vitrine.config.ts`, iPhone + Android + bureau, en fin de `npm run test:e2e`). **T21 (retrait des échafaudages) est faite** (`363ed27`). Ta mission : **T22** (PC 4 : le gérant ouvre l'aperçu depuis Snapchat ; captures avant/après déjà dans `.tmp/refonte-vitrine/{avant,apres}`, à refaire si la branche a changé) puis T23 (fusion ; ajouter `test:e2e:vitrine` à `CLAUDE.md`). Titre Google de l'accueil choisi par le gérant (`81bd363`). Les descriptions de `/parfums`, des pages marque et des fiches (« au meilleur prix à Marseille ») **restent telles quelles** (gérant, 21/10 : « on s'en fout des comparaisons ») : ne pas les reproposer.

Images : le gérant autorise la génération **sans aucun être vivant** (ni visage, ni main) ; flacon Nuréa copié sur la
photo réelle ; un écran de téléphone se génère **en vert chroma** puis reçoit une **capture réelle** (méthode et outils :
`annexes/photos-editoriales.md`, `scripts/refonte-vitrine/incruste-ecran.py`, `barre-etat.py`) ; chaque image en sombre
ET clair au même cadrage ; générations Codex **une à la fois** (d'autres sessions écrivent dans le même dossier) et
chaque image vérifiée avant usage. Le contenu Snapchat du gérant reste net (sa décision).

## 5. Méthode

- Mobile d'abord. Vérifier sur **captures réelles** (320 / 390 / 430 / 1280, clair et sombre) avant de
  présenter ; les envoyer au gérant.
- Avant tout rendu : `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e:vitrine` (sur build : `E2E_SERVER=start`) ; LCP sur build si la
  page change (build webpack, `next start -p 3004` après avoir vérifié qu'aucun vieux serveur n'écoute).
- Aucun automatisme de composition (micro-labels, points décoratifs, titres surdimensionnés, cartes qui
  débordent, onglets ou carrousels par facilité, dégradés décoratifs, slogans).
- À la fin de chaque étape : mettre à jour `REPRISE.md` (état), § B.10 si la composition change, une ligne
  au journal `docs/EQUIPE.md` § 8. Ne jamais lancer `npm run build` tel quel, `prisma db push` ni
  `prisma migrate reset`.

## 6. En attente côté gérant (ne pas bloquer dessus)

Avis juridique (accroche, présentation face aux marques, titre et description Google — propositions A/B dans `annexes/audit-final.md`) ; jugement de la hero
avec les nouvelles photos (reçues et en place le 21/10) ; 29 paires de visuels clair/sombre décalées
(session visuels, `annexes/alignement-clair-sombre.md`).
