Contexte : dépôt Nuréa Parfums (C:\Users\User\Desktop\nurea-parfums). Refonte de la vitrine publique, DA « Nuancier nocturne ». Tu exécutes, tu ne réinventes pas la DA. Gestion (app/admin, src/features, src/ui, src/app-shell, src/server) hors périmètre : n'y touche jamais.

Lecture, dans cet ordre, rien d'autre au départ : docs/EQUIPE.md (§ 4.3, § 5, journal § 8), AGENTS.md, docs/refonte-vitrine/00-LISEZ-MOI.md (§ État, « Remarques de T7 », « Remarques de T10–T11 »). ponytail pour coder. Un skill à la fois.

Budget (quota limité, contrainte dure) : aucun sous-agent ; graphify query avant d'ouvrir un fichier inconnu (graphify query "<question>" --budget 1500 --graph C:/Users/User/Desktop/nurea-parfums/graphify-out/graph.json) ; pas de recherche web ; get_usage au début et à la fin. Contexte > ~150 000 jetons : commit de ce qui est propre, état noté dans 00-LISEZ-MOI.md § État, arrêt. Réponses en français, caveman ultra ; le gérant n'est pas développeur : mots simples. Chaque rendu finit par « Ce que tu dois faire » (action précise ou « rien »).

Acquis (réutiliser, ne pas refaire) :
- Worktree C:\Users\User\Desktop\nurea-parfums\.claude\worktrees\refonte-vitrine, branche refonte/vitrine (dernier commit 2b8cc4e). node_modules = jonction : jamais rm -rf du worktree, jamais npm install dedans. Sans .env, la vitrine montre le catalogue de démo (voulu).
- T10 (5f79c5c) et T11 (2b8cc4e) faites et poussées ; docs sur main (f5d0b65). Le gérant a testé l'aperçu Vercel sur iPhone : recherche « Layt » → « Vous cherchez Layton de Parfums de Marly ? » OK ; filtre deux marques → 2 parfums, une puce par marque OK.
- Dev : preview_start {name: "vitrine-dev"} (port 3000). Vérif navigateur : script Playwright (require depuis C:/Users/User/Desktop/nurea-parfums/node_modules/playwright), Chromium seulement (WebKit ne charge rien sur http://localhost, CSP). e2e vitrine : config jetable (testDir ./e2e, baseURL http://localhost:3000, Pixel 7 + Desktop Chrome), supprimée après.
- Aperçu Vercel : outil Vercel list_deployments, projet prj_aZNKbWeD80Sqe75jHRreVGKhS0sW, équipe team_856Q5M4QR2rbDUycym6qW3AV, branche refonte/vitrine : c'est le lien à donner au gérant.

Travail, dans l'ordre :

1. Correctif carte (retour du gérant, capture iPhone) : « Blue Seduc-tion » — le nom du parfum est coupé par un tiret alors que le mot tient. Fichiers : src/components/features/PerfumeCard.tsx et PerfumeLinkCard.tsx (classes `hyphens-auto [overflow-wrap:anywhere]` sur `.card-name` / `.card-brand`), règles `.card-name` dans app/globals.css. Attendu : retour à la ligne entre les mots ; un mot n'est cassé que s'il dépasse la carte (nom de 60 caractères de /essai-extremes toujours sans débordement). Vérifier 320/390 px, densités 1/2/3, deux thèmes (scrollWidth === innerWidth), puis npm run typecheck, npm run lint, npm test. Commit « vitrine(T8): … » (git add fichier par fichier, corps = vérifié en chiffres + Cassé/Moche/Fragile, fin « Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> »), push de la branche.

2. Migration d'ambiance (00-LISEZ-MOI « Remarques de T7 », EQUIPE § 4.3) : écriture en PRODUCTION. Présenter au gérant en mots simples, puis attendre son « oui » explicite dans la conversation AVANT CHAQUE geste :
   a. migration 20261020120000_perfume_ambient seule sur main (schéma + migration, deux colonnes vides) ;
   b. essai à blanc frais de ambiance.mjs (lecture seule), chiffres montrés ;
   c. --apply.
   Un « oui » donné avant cette conversation ne vaut pas.

3. Docs sur main : 00-LISEZ-MOI.md § État et une ligne au journal de docs/EQUIPE.md § 8 par événement.

Interdits : npm run build tel quel ; prisma db push ; prisma migrate reset ; git add -A ; npx ou installation sans accord du gérant ; inventer une donnée ; afficher une contenance (ml) ou un prix ; classes nurea-* ou composants de la charte v3 ; modifier 04-PLAN-EXECUTION.md § B ; #000, #fff ; transition: all ; toucher image/imageLight/status des fiches ou l'artefact du graphiste.

Un « non » de goût du gérant → s'arrêter, noter, dire : « Remarque de goût → session Fable (effort high) avec 04-PLAN-EXECUTION.md et cette remarque. »

Sortie de fin, ≤ 8 lignes au format de docs/EQUIPE.md § 5 : Fait (commits), Vérifié (chiffres), Ce que tu dois faire, Ensuite (T12, session S6) ; plus la consommation (get_usage).

Commence : lis les fichiers, get_usage, puis le correctif carte.
