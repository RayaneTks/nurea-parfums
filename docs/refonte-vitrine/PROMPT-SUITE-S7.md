# Prompt de passation — session S7 (T14, T15)

À coller tel quel dans une session neuve (Opus 5.5, effort medium), après `/clear`.

---

Contexte : dépôt Nuréa Parfums (C:\Users\User\Desktop\nurea-parfums). Refonte de la vitrine publique, DA « Nuancier nocturne ». Session S7 : T14, puis T15 jusqu'à la planche d'accueil montrée au gérant (pas de code d'accueil avant son « oui »). Tu exécutes, tu ne réinventes pas la DA. Gestion (app/admin, src/features, src/ui, src/app-shell, src/server) hors périmètre : n'y touche jamais.

Lecture, dans cet ordre, rien d'autre au départ : docs/EQUIPE.md (§ 4, § 5, journal § 8), AGENTS.md, docs/refonte-vitrine/00-LISEZ-MOI.md (§ État, « Remarques de T8 », « Remarques de T12–T13 »), docs/refonte-vitrine/04-PLAN-EXECUTION.md (T14, T15 ; § B pour les jetons et le mouvement). DESIGN.md, 01-INVARIANTS.md (référencement) et 02-PLAYBOOK.md seulement aux sections utiles. ponytail pour coder. Un skill à la fois.

Budget (quota limité, contrainte dure) : aucun sous-agent ; graphify query avant d'ouvrir un fichier inconnu (graphify query "<question>" --budget 1500 --graph C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json) ; pas de recherche web ; get_usage au début et à la fin. Contexte > ~150 000 jetons : commit de ce qui est propre, état noté dans 00-LISEZ-MOI.md § État, arrêt. Réponses en français, caveman ultra ; le gérant n'est pas développeur : mots simples. Chaque rendu finit par « Ce que tu dois faire » (action précise ou « rien »).

Acquis (réutiliser, ne pas refaire) :
- Worktree C:\Users\User\Desktop\nurea-parfums\.claude\worktrees\refonte-vitrine, branche refonte/vitrine (dernier commit f4bee0f). git fetch et comparer à origin/main au départ. node_modules = jonction : jamais rm -rf du worktree, jamais npm install dedans. Sans .env, la vitrine montre le catalogue de démo (voulu).
- PC 3 passé le 20/10 (fiche en feuille, gestes, Snapchat en 2 taps), après le correctif f4bee0f.
- Fiche : `PerfumeSheet` (`?parfum=<id>` dans `useCatalogFilters`) ; `OrderChannels` est partagé avec la fiche indexable `app/(shop)/parfums/[marque]/[parfum]/page.tsx`, que T14 met au même contenu. Ambiance : `ambientStyle(perfume)` (`src/lib/catalog/ambient.ts`), à réutiliser pour l'en-tête de marque (ambiance moyenne). Message Snapchat : `orderMessage()` (`src/lib/catalog/perfumePresentation.ts`).
- Gestes de feuille (`useSheetMotion`) : vers le haut défile toujours, vers le bas ferme seulement depuis le haut ou la poignée ; seuil `DISMISS_VELOCITY` (`src/lib/motion/physics.ts`). Ne jamais remettre `data-sheet-handle` sur un visuel.
- Ambiance en production (199 fiches sur 233). Aucune migration attendue d'ici T23. Ne pas relancer --apply.
- Dev : preview_start {name: "vitrine-dev"} (port 3000). Vérif navigateur : script Playwright (require depuis C:/Users/User/Desktop/nurea-parfums/node_modules/playwright), Chromium seulement (WebKit ne charge rien sur http://localhost, CSP). e2e vitrine : config jetable à la racine du worktree (testDir ./e2e, testMatch perfume-sheet, selection, catalog-filters + les nouveaux, baseURL http://localhost:3000, Pixel 7 + Desktop Chrome, workers 2), supprimée après. Gestes tactiles : CDP Input.dispatchTouchEvent (voir e2e/perfume-sheet.spec.ts). Fichiers en CRLF : éditer en normalisant les fins de ligne.
- T14 exige un diff de sitemap avant/après : jamais `npm run build` tel quel → `NUREA_SKIP_MIGRATE_DEPLOY=1` avec DATABASE_URL/DIRECT_URL factices (catalogue de démo), même commande avant et après.
- Aperçu Vercel : outil Vercel list_deployments, projet prj_aZNKbWeD80Sqe75jHRreVGKhS0sW, équipe team_856Q5M4QR2rbDUycym6qW3AV, branche refonte/vitrine : c'est le lien à donner au gérant (attendre l'état READY).
- Planche : branche refonte/planche, worktree .claude/worktrees/refonte-planche, même méthode que T1 (HTML autonome, vrais visuels).

Travail, dans l'ordre :

1. T14 — Page fiche indexable, page marque, index A→Z (04-PLAN-EXECUTION § T14, acceptation à la lettre) : `parfums/[marque]/[parfum]/page.tsx` au même contenu que la feuille, `parfums/[marque]/page.tsx` (en-tête à l'ambiance moyenne), `parfums/page.tsx`, `src/components/seo/Breadcrumbs.tsx`. URLs, canoniques, 308 et sitemap inchangés (tests SEO verts, diff de sitemap.xml avant/après = vide) ; MENTION_FLACONS présente ; JSON-LD par jsonLdHtml() ; pas de Product ; getSeoCatalogue sans repli. Vérifier 320/390 px, deux thèmes, scrollWidth === innerWidth, puis npm run typecheck, npm run lint, npm test. Commit « vitrine(T14): … » (git add fichier par fichier, corps = vérifié en chiffres + Cassé/Moche/Fragile, fin « Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> »), push de la branche.

2. T15 — Accueil, composition : d'abord la planche d'accueil sur refonte/planche (vraie page d'accueil : ouverture qui porte le H1 « Nuréa Parfums » et « Marseille », puis les 2 parfums mis en avant, la recherche, le catalogue ; interdit : « grande phrase + deux boutons + photo assombrie »). La montrer au gérant sur téléphone (lien de l'aperçu de la planche) avec la question « Cette page d'accueil, on part là-dessus ? ». Ne pas coder l'accueil avant son « oui ». Sur « oui » et s'il reste du budget : coder (Hero.tsx, FeaturedSection.tsx, app/(shop)/page.tsx), H1 unique, aucune modale ni bannière à l'arrivée, Snapchat en 4 taps depuis l'accueil (compteur e2e/helpers/tap.ts), mêmes vérifications, commit « vitrine(T15): … », push.

3. Docs sur main : 00-LISEZ-MOI.md § État (+ « Remarques de T14–T15 ») et une ligne au journal de docs/EQUIPE.md § 8 par événement. Passer par un worktree temporaire depuis origin/main (ne pas changer la branche du dossier partagé), le supprimer après.

Interdits : npm run build tel quel ; prisma db push ; prisma migrate reset ; toute écriture en base ; git add -A ; npx ou installation sans accord du gérant ; inventer une donnée (notes, familles, avis) ; afficher une contenance (ml) ou un prix ; classes nurea-* ou composants de la charte v3 ; modifier 04-PLAN-EXECUTION.md § B ; #000, #fff ; transition: all ; un second bouton primaire par écran ; toucher image/imageLight/status des fiches ou l'artefact du graphiste ; changer une URL indexable sans 308.

Retour du gérant : bug, lenteur, débordement, geste confus → exécution : corriger dans la session et re-soumettre. Un « non » de goût → s'arrêter, noter, dire : « Remarque de goût → session Fable (effort high) avec 04-PLAN-EXECUTION.md et cette remarque. »

Sortie de fin, ≤ 8 lignes au format de docs/EQUIPE.md § 5 : Fait (commits), Vérifié (chiffres), Ce que tu dois faire, Ensuite (T16–T17, session S8) ; plus la consommation (get_usage).

Commence : lis les fichiers, get_usage, git fetch, puis T14.
