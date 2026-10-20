# Recherche skills / plugins / MCP pour la refonte vitrine Nuréa Parfums

Date de la recherche : 20/10/2026. Lecture web seule (WebFetch/WebSearch), rien installé ni exécuté.
Méthode : pages GitHub + API GitHub (dates de commit) + SKILL.md bruts quand possible. Les chiffres d'agrégateurs tiers (skillselion, vibeindex...) sont signalés comme peu fiables.
Limite : je n'ai pas pu lire l'intégralité des fichiers ni auditer les scripts ligne à ligne. Avant toute installation, relire le dossier `scripts/`, `hooks/` et le `package.json` du paquet concerné.

## Tableau récapitulatif

| # | Candidat | URL | Licence | Dernier commit/version | Popularité | Reco |
|---|---|---|---|---|---|---|
| 1 | impeccable (Paul Bakaus) | github.com/pbakaus/impeccable | Apache-2.0 | commit 20/10/2026, release cli-v4.7.0 le 19/10/2026 | 83,7k étoiles | INSTALLER (mise à jour de la version installée) |
| 2 | emilkowalski/skills | github.com/emilkowalski/skills | MIT | 11/10/2026 | 47,9k étoiles | INSTALLER (sélectif) |
| 3 | vercel-labs/agent-skills | github.com/vercel-labs/agent-skills | MIT | 28/08/2026 | 32,7k étoiles | INSTALLER (sélectif) |
| 4 | addyosmani/agent-skills | github.com/addyosmani/agent-skills | MIT | 13/10/2026 (v0.6.13) | 108,9k étoiles | OPTIONNEL (sélectif) |
| 5 | addyosmani/web-quality-skills | github.com/addyosmani/web-quality-skills | MIT | 24/08/2026 | ~3k étoiles | INSTALLER |
| 6 | Playwright MCP | github.com/microsoft/playwright-mcp | Apache-2.0 | non vérifié (README à jour) | 38,4k étoiles | INSTALLER |
| 7 | Chrome DevTools MCP | github.com/ChromeDevTools/chrome-devtools-mcp | Apache-2.0 | non vérifié | 53,9k étoiles | INSTALLER (télémétrie coupée) |
| 8 | shadcn/ui MCP | ui.shadcn.com/docs/mcp | MIT (shadcn/ui) | doc en ligne | non relevé | OPTIONNEL |
| 9 | Figma MCP (plugin officiel) | developers.figma.com/docs/figma-mcp-server | propriétaire | doc en ligne | n/a | OPTIONNEL (seulement si maquettes Figma) |
| 10 | anthropics/skills | github.com/anthropics/skills | Apache-2.0 (la plupart) | 09/10/2026 | 182,4k étoiles | OPTIONNEL (déjà couvert) |
| 11 | vercel-labs/web-interface-guidelines | github.com/vercel-labs/web-interface-guidelines | MIT | 05/10/2026 | ~1k étoiles | IGNORER en direct (déjà inclus via #3) |
| 12 | bergside/awesome-design-skills | via claudeskills.info | MIT (annoncée) | non vérifié | ~2k (agrégateur) | IGNORER |
| 13 | dylantarre/design-system-skills ; plugin87/ux-ui-agent-skills | non vérifiés | ? | non vérifié | faible | IGNORER (non vérifié) |
| 14 | rolemodel/rolemodel-skills (laws-of-ux) | via vibeindex.ai | ? | non vérifié | faible | IGNORER pour l'instant |
| 15 | Rauno, Josh Comeau, Refactoring UI, NN/g | aucune skill officielle trouvée | n/a | n/a | n/a | IGNORER (lire en humain) |

## Fiches

### 1. impeccable (pbakaus/impeccable)
- Auteur : Paul Bakaus (ex-Google Chrome/AMP, crédible). Apache-2.0.
- Activité : très forte (2 494 commits, commit du 20/10/2026, release cli-v4.7.0 du 19/10/2026).
- Contenu actuel (README) : UNE skill `impeccable` avec 24 commandes (`/impeccable audit`, `critique`, `polish`, `animate`, `harden`...), 61 règles de détection déterministes (CLI et extension navigateur, sans LLM), itération « live » dans le navigateur, `/impeccable init` qui écrit `PRODUCT.md`.
- Règles lues : bannir les Inter/polices surutilisées, pas de gris pur ni noir pur (teinter), pas de cartes imbriquées, pas de bounce/elastic, pas de dégradés violets, bordures latérales colorées, halos sombres, cibles tactiles trop petites, titres sautés.
- Risque : le CLI s'installe par `npx impeccable install` (exécution de code npm, donc supply chain). Sur Claude Code l'installeur ajoute un hook qui lance le détecteur à chaque édition de fichier UI. Un moteur Rust (`crates`) et un extension navigateur existent. Aucun signe d'obfuscation vu, mais je n'ai pas lu le code.
- Chevauchement : très fort avec la famille déjà installée (adapt, animate, audit, bolder...). La version installée est probablement l'ancienne forme (une skill par commande). La nouvelle forme apporte les détecteurs déterministes et le mode live, que l'ancienne n'a pas.
- Recommandation : INSTALLER via la marketplace Claude Code plutôt que `npx` (moins d'exécution tierce), puis retirer l'ancienne famille pour éviter les doublons. Vérifier le hook après installation.

### 2. emilkowalski/skills
- Auteur : Emil Kowalski (créateur de Sonner et Vaul, cours animations.dev, ingénieur design reconnu). MIT. Dernier commit 11/10/2026. 47,9k étoiles, 57 commits.
- 15 skills dont emil-design-eng, animate, review-animations, animation-performance, apple-design, pick-ui-library, prototype, break-ui, mobile-native, ask-sonner (aussi animate-expo, write-swift, orientées natif : inutiles ici).
- Règles lues dans emil-design-eng : pas d'animation sur les actions clavier fréquentes ; ease-out à l'entrée/sortie, jamais ease-in ; animations UI sous 300 ms (dropdown 150-250 ms, appui bouton 100-160 ms) ; `scale(0.97)` sur `:active`, entrées depuis `scale(0.95)` + opacité, jamais `scale(0)` ; animer seulement `transform`/`opacity`, pas de `transition: all`, survols derrière `@media (hover: hover) and (pointer: fine)`.
- Risque : contenu Markdown, pas de script vu dans emil-design-eng. Install par `npx skills@latest add` (exécute le CLI `skills`). Taille d'emil-design-eng : ~25 000 caractères.
- Chevauchement : la skill `apple-design` déjà installée a la même description que celle de ce dépôt (physique du mouvement, matières, typographie optique, WWDC « Designing Fluid Interfaces »). C'est probablement la même source : ne pas réinstaller. Apport nouveau : emil-design-eng, review-animations, animation-performance, break-ui.
- Attention charte : ce dépôt n'entre pas en conflit avec les règles de la vitrine (« survol : la couleur seule », « aucune ombre », « angles 0 »). Emil conseille des ombres semi-transparentes et des échelles : à filtrer au regard de `DESIGN.md`.
- Recommandation : INSTALLER seulement emil-design-eng, review-animations, animation-performance, break-ui.

### 3. vercel-labs/agent-skills
- Auteur : Vercel Labs, crédible (c'est le fabricant de Next.js, pertinent pour ce projet). MIT. 32,7k étoiles, 275 commits, dernier commit 28/08/2026 (guidance View Transitions React).
- Skills : web-design-guidelines (100+ règles accessibilité/perf/UX), react-best-practices (40+ règles perf React/Next), composition-patterns (composants composés, éviter la prolifération de props booléennes), plus d'autres dont `vercel-deploy-claimable`.
- Point d'attention (lu dans le SKILL.md) : web-design-guidelines **récupère ses règles à chaque exécution** depuis `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` via WebFetch. Donc contenu distant mutable (risque d'injection si le dépôt est compromis) mais en lecture seule et sur un domaine GitHub. À accepter en connaissance de cause.
- `vercel-deploy-claimable` : empaquette le projet et l'envoie à un service : NE PAS installer (le dépôt prod pointe sur la prod, voir CLAUDE.md).
- Recommandation : INSTALLER web-design-guidelines, react-best-practices et composition-patterns uniquement (pas toute la collection).

### 4. addyosmani/agent-skills
- Auteur : Addy Osmani (Google Chrome, très crédible). MIT. 108,9k étoiles, 702 commits, commit 13/10/2026 (plugin 0.6.13).
- 25 skills de cycle de vie (spec, TDD, revue, sécurité, CI, doc...). Pertinentes ici : frontend-ui-engineering, browser-testing-with-devtools, performance-optimization, code-simplification.
- Règles lues (frontend-ui-engineering) : utiliser les jetons du système de design plutôt que des pixels inventés ; éléments natifs (`<button>`), contraste 4,5:1 ; gérer tous les états (chargement/vide/erreur) ; tester à 320/768/1024/1440 ; anti-slop : éviter violet/indigo, dégradés lourds, arrondis uniformes, hero générique, grilles de cartes stock.
- Risque : le dépôt contient `scripts/` (13 scripts de validation), `hooks/` (hooks de cycle de vie pour l'adaptateur Claude Code) et workflows CI. Les hooks s'exécutent sur la machine : à lire avant.
- Chevauchement : AGENTS.md du projet impose déjà boucle comprendre/implémenter/vérifier, et des skills « ponytail », Addy Osmani y sont déjà référencés. Beaucoup de doublon process. Noter que la skill dit WCAG 2.1 AA, pas 2.2.
- Recommandation : OPTIONNEL. Copier à la main frontend-ui-engineering et performance-optimization plutôt que le plugin entier avec ses hooks.

### 5. addyosmani/web-quality-skills
- Auteur : Addy Osmani. MIT. ~3 000 étoiles (API GitHub), dernier push 24/08/2026, non archivé.
- 6 skills basées sur Lighthouse : web-quality-audit, performance, core-web-vitals, accessibility, seo, best-practices. Cibles lues via agrégateurs : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 ; Lighthouse Perf ≥ 90, A11y 100, SEO ≥ 95. Sources divergent sur WCAG 2.1 vs 2.2 : à vérifier dans le dépôt.
- Risque : Markdown, faible. Je n'ai pas lu les fichiers bruts : à relire avant installation.
- Chevauchement : partiel avec `optimize` et `audit` d'impeccable, mais ajoute SEO technique et Core Web Vitals chiffrés, utiles pour `docs/SEO.md`.
- Recommandation : INSTALLER.

### 6. Playwright MCP (Microsoft)
- 38,4k étoiles, Apache-2.0, maintenu par Microsoft. Commande documentée : `claude mcp add playwright npx @playwright/mcp@latest`.
- Contenu : pilotage par instantanés d'accessibilité, clic/saisie/navigation, émulation d'appareil et de viewport, captures, options `--caps` (réseau, stockage, trace, PDF).
- Risque (lu dans le README) : « not a security boundary » ; `browser_run_code_unsafe` équivaut à de l'exécution de code à distance ; ne jamais lier à `0.0.0.0`. Le projet a déjà `test:e2e` et `test:layout` (Playwright), donc l'infra existe. Ne pas activer les capacités inutiles ; éviter les profils persistants sur le Chrome personnel.
- Recommandation : INSTALLER (portée projet), sans `--caps` supplémentaires, pour captures mobiles et comparaison visuelle.

### 7. Chrome DevTools MCP
- 53,9k étoiles, Apache-2.0, organisation ChromeDevTools (Google). Config générique : `npx chrome-devtools-mcp@latest`.
- Contenu : traces de performance et insights, requêtes réseau, console avec stack traces mappées, captures, automatisation via Puppeteer. Lighthouse non mentionné sur la page : à vérifier dans la Tool Reference.
- Risque : statistiques d'usage activées par défaut (`--no-usage-statistics` pour couper), vérification de mise à jour npm, envoi possible d'URL de trace à l'API CrUX de Google (`--no-performance-crux`). Il expose le contenu du navigateur au client MCP : ne pas l'attacher à une session connectée à la gestion admin.
- Recommandation : INSTALLER avec les trois options de désactivation de télémétrie.

### 8. shadcn/ui MCP
- Doc officielle : `pnpm dlx shadcn@latest mcp init --client claude`, ou `.mcp.json` avec `npx shadcn@latest mcp`. Parcourt, cherche et installe des composants de registres.
- Chevauchement/risque : la vitrine a une règle « angles 0, aucune ombre » et ses propres briques ; l'admin interdit un second jeu de composants hors `src/ui/*`. Le MCP installe du code d'un registre dans le projet : utile seulement comme source de primitives accessibles (Radix déjà présent).
- Recommandation : OPTIONNEL.

### 9. Figma MCP
- Doc Figma : plugin `claude plugin install figma@claude-plugins-official`, ou `claude mcp add --transport http figma https://mcp.figma.com/mcp`, puis authentification OAuth via `/mcp`. Serveur distant (envoie des données Figma au service).
- Recommandation : OPTIONNEL, uniquement si une maquette Figma existe. Sinon inutile.

### 10. anthropics/skills
- 182,4k étoiles, dernier commit 09/10/2026. Dossiers (API GitHub) : frontend-design, web-artifacts-builder, theme-factory, canvas-design, brand-guidelines, webapp-testing, mcp-builder, skill-creator, claude-api, etc. docx/pdf/pptx/xlsx sont « source-available », pas open source.
- Utiles : frontend-design (déjà installée, vérifier qu'elle est à jour), webapp-testing (Playwright via scripts, redondant avec #6), theme-factory (thèmes prédéfinis : contraire de l'originalité voulue).
- Recommandation : OPTIONNEL : seulement remettre frontend-design à jour. Ignorer le reste.

### 11-15. Écartés
- web-interface-guidelines : repo de règles source de #3, inutile en doublon.
- bergside/awesome-design-skills, dylantarre/design-system-skills, plugin87/ux-ui-agent-skills, rolemodel-skills : seules sources trouvées sont des agrégateurs tiers, popularité invérifiable, pas de lecture du contenu. IGNORER tant qu'on n'a pas lu les dépôts sur GitHub. Les jetons de design ont déjà une source unique dans le projet.
- Rauno Freiberg, Josh Comeau, Refactoring UI, NN/g : aucune skill officielle trouvée. À consulter comme lectures humaines.
- Laws of UX : seul résultat = skill tierce (rolemodel), non vérifiée.
- Pas trouvé : skill dédiée au scroll-driven CSS, à la typographie fine, à la photographie produit ou au catalogue e-commerce de qualité. Le manque est réel : à couvrir par le brief `DESIGN.md` du projet.

## Angles morts et mises en garde
- Doublons : ne pas empiler impeccable (ancienne famille + nouvelle) ni deux versions d'apple-design. Plus de skills = plus de contexte consommé et d'instructions contradictoires.
- Conflit potentiel avec la charte : les guides généralistes recommandent ombres, arrondis et micro-interactions que `DESIGN.md` interdit (angles 0, aucune ombre, survol = couleur seule). La charte du projet prime.
- Tout installeur `npx` exécute du code tiers : préférer la marketplace Claude Code ou copier les Markdown à la main, après lecture.
- Le dépôt local pointe sur la production : ne donner aucun MCP navigateur à une session connectée à `/admin`.

## SHORTLIST (installer, par ordre de valeur)

1. **impeccable (version actuelle)** — `/plugin marketplace add pbakaus/impeccable` (méthode documentée ; alternative `npx impeccable install`, puis `npx impeccable update`). Apporte les 24 commandes consolidées, 61 détecteurs anti-slop déterministes et le mode live ; remplace l'ancienne famille installée.
2. **emilkowalski/skills (sélection : emil-design-eng, review-animations, animation-performance, break-ui)** — `npx skills@latest add emilkowalski/skills` (choisir uniquement ces skills). Donne les règles concrètes de motion et de finition d'interface.
3. **Playwright MCP** — `claude mcp add playwright npx @playwright/mcp@latest`. Captures et tests visuels mobiles réels de la refonte.
4. **Chrome DevTools MCP** — config `npx chrome-devtools-mcp@latest` avec `--no-usage-statistics` et `--no-performance-crux` (doc : github.com/ChromeDevTools/chrome-devtools-mcp). Traces de performance, console et réseau pour les Core Web Vitals.
5. **vercel-labs/agent-skills (web-design-guidelines, react-best-practices, composition-patterns)** — `npx skills add vercel-labs/agent-skills` (sélectionner ces trois). Revue de 100+ règles UI/accessibilité et bonnes pratiques React/Next.
6. **addyosmani/web-quality-skills** — `npx skills add addyosmani/web-quality-skills` (ou copie dans `~/.claude/skills/`). Audit Lighthouse, Core Web Vitals, accessibilité et SEO technique chiffrés.
7. **addyosmani/agent-skills (frontend-ui-engineering, performance-optimization seulement)** — plugin : `/plugin marketplace add addyosmani/agent-skills` puis `/plugin install agent-skills@addy-agent-skills` ; préférer la copie manuelle de ces deux skills pour éviter les hooks. Ajoute les garde-fous d'états, de responsive et de performance.
8. **anthropics/skills : frontend-design (mise à jour)** — dépôt github.com/anthropics/skills (méthode d'installation : marketplace de plugins Anthropic ; non vérifiée en détail). Remet la skill déjà installée à la version courante.
