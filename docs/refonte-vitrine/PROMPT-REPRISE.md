# Prompt de reprise — refonte de la vitrine Nuréa (après /clear)

À coller tel quel dans une session neuve (Opus, effort high). Écrit le 21/10/2026.

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
  `captures-accueil.mjs`, `pw-accueil.config.ts`) ; commandes exactes dans REPRISE.md.

## 3. Ce qui est acquis — ne pas rouvrir

- DA « Nuancier nocturne », Fraunces + Figtree, clair + sombre ; **composants du design system figés**
  (boutons, cartes, arrondis, champs, filtres, fiche, Ma sélection) ; catalogue validé.
- Accueil : hero (photo du flacon Nuréa, titre, « Voir le catalogue » + Snapchat en bouton rond),
  **« À l'affiche » validé le 21/10** (deux bandeaux horizontaux en miroir), Marques en index typographique.
- Copy : jamais « le même parfum » (le parfum Nuréa n'est pas celui de la marque) ; plus de « Marseille » ;
  l'accroche « Le parfum que vous aimez, dans un flacon Nuréa. » reste provisoire (avis juridique attendu).
- Un thème ne change que des couleurs ; ne jamais recadrer un visuel 2:3 dans un cadre fixe ; ne jamais
  générer un faux flacon Nuréa ; demander au gérant toute ressource visuelle manquante.
- Ne pas reproposer les essais écartés listés dans REPRISE.md.

## 4. Ta mission

Priorité donnée par le gérant : **renforcer l'identité Nuréa sur la page d'accueil**, sans refonte et sans
toucher aux composants ni aux sections validées. Commence par un court audit (ce qui dit « Nuréa » aujourd'hui,
ce qui manque), propose **une** direction argumentée, puis exécute. Ensuite : T16 → T23
(`04-PLAN-EXECUTION.md`), un point de contrôle gérant à chaque étape visuelle.

## 5. Méthode

- Mobile d'abord. Vérifier sur **captures réelles** (320 / 390 / 430 / 1280, clair et sombre) avant de
  présenter ; les envoyer au gérant.
- Avant tout rendu : `npm run typecheck`, `npm run lint`, `npm test`, e2e accueil ; LCP sur build si la
  page change (build webpack, `next start -p 3004` après avoir vérifié qu'aucun vieux serveur n'écoute).
- Aucun automatisme de composition (micro-labels, points décoratifs, titres surdimensionnés, cartes qui
  débordent, onglets ou carrousels par facilité, dégradés décoratifs, slogans).
- À la fin de chaque étape : mettre à jour `REPRISE.md` (état), § B.10 si la composition change, une ligne
  au journal `docs/EQUIPE.md` § 8. Ne jamais lancer `npm run build` tel quel, `prisma db push` ni
  `prisma migrate reset`.

## 6. En attente côté gérant (ne pas bloquer dessus)

Avis juridique (accroche, présentation face aux marques, titre et description Google) ; photos de la hero
refaites (étiquette, flacon rempli, même cadrage clair/sombre) ; 29 paires de visuels clair/sombre décalées
(session visuels, `annexes/alignement-clair-sombre.md`).
