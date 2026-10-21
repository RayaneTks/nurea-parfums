# Audit final de la vitrine (T19, 21/10/2026)

Branche `refonte/vitrine`, commit `65e7ff9`. Build de production local (`next build --webpack`,
`NUREA_SKIP_MIGRATE_DEPLOY=1`, URLs factices, catalogue de démo de 111 parfums), servi par
`next start -p 3004`. Lighthouse par PageSpeed Insights sur l'aperçu Vercel de la branche.

Rejouer : `node scripts/refonte-vitrine/audit.mjs` (axe, zoom 200 %, contraste sur photo, CLS),
`node scripts/refonte-vitrine/inp.mjs`, `node scripts/refonte-vitrine/lcp.mjs <url> <dark|light>`.

## Résultat contre l'acceptation de T19

| Critère | Seuil | Mesuré | |
|---|---|---|---|
| Lighthouse mobile — performances | ≥ 90 | **99** | tenu |
| Lighthouse — accessibilité | 100 | **100** | tenu |
| Lighthouse — bonnes pratiques | ≥ 95 | 92 sur l'aperçu | voir § Bonnes pratiques |
| Lighthouse — SEO | — | **100** | |
| LCP (4G lente, CPU ×4, Pixel 7, médiane de 3) | ≤ 2,5 s | accueil 2,16 s sombre / 1,28 s clair ; `/parfums` 0,92 / 0,90 ; page marque 0,88 / 0,94 ; fiche 2,06 / 2,05 ; `/marque` 2,4 / 2,1 et `/contact` 0,85 (T16) | tenu |
| INP (CPU ×4, 9 gestes × 2 thèmes) | ≤ 200 ms | pire 184 ms (ouvrir une fiche, clair) ; menu 48, filtre 104, thème 104, recherche 120 | tenu, marge faible sur la fiche |
| CLS | ≤ 0,1 | **0** sur les 8 pages, deux thèmes | tenu |
| axe WCAG 2.2 A/AA | 0 violation | 0 sur 8 pages + fiche ouverte + menu ouvert, deux thèmes ; 1 signalement accepté (§ axe) | tenu |
| Zoom 200 % à 390 px (195 px CSS) | rien ne déborde | 195/195 sur les 8 pages | tenu après correction |
| Anti-slop | ≤ 3 dérogations | **0** `slop-ok` | tenu |

## Corrections faites (`65e7ff9`)

- **404 sans titre** : l'onglet et le lecteur d'écran n'annonçaient que l'adresse. Titre « Page introuvable — Nuréa Parfums ».
- **Suggestions de recherche** : chaque option contenait un lien (élément interactif dans un autre).
  L'option est désormais le lien lui-même ; comportement inchangé (clic, clavier, Ctrl+clic, appui long).
- **Zoom 200 %** (téléphone de 390 px zoomé = 195 px CSS) :
  - accueil : sous 280 px, la hero passe en colonne (titre, actions, puis la photo entière) ; « grandes marques. »
    peut alors se couper ; au-dessus de 280 px, rendu identique au validé ;
  - `/marque`, `/contact` : colonne photo des trois temps plafonnée à 40 % (7 rem dès 320 px, comme avant) ;
  - catalogue : le tri et la taille des visuels, puis l'en-tête « Catalogue · N parfums », passent à la ligne ;
  - barre haute non collante sous 280 px (sur trois lignes, elle prenait 37 % de l'écran).
- **Avertissement `images.qualities`** du mode dev : les props `quality` étaient sans effet (le chargeur
  `src/lib/images/loader.ts` choisit des fichiers prêts et ignore la qualité). Retirées.
- **e2e « tri par marque »** rouge sur téléphone : le site triait juste ; le test lisait `innerText`, vide
  pour les cartes hors écran (`content-visibility: auto`). Lit `textContent`.
- **e2e « dérouler et fermer »** : 10/10 vert sous 5 processus parallèles sur build. L'instabilité venait
  du serveur de dev (compilation à la volée sous charge) : lancer les e2e sur un build.

## axe — signalement accepté

`target-size` sur un lien de l'index des Marques **quand le panneau de suggestions est ouvert** : le
panneau le recouvre. Toucher hors du panneau le ferme d'abord ; la cible n'est pas utilisable à ce
moment-là par construction. Rien à corriger.

## Contraste sur la photo de la hero (axe le laisse « à vérifier »)

Mesuré en effaçant le texte et en lisant chaque pixel du fond sous lui (pire pixel / 5e centile).
Titre en grand texte (seuil 3:1), lien Snapchat (4,5:1).

| | 320 | 390 | 430 | 1280 |
|---|---|---|---|---|
| Sombre — titre | 13,8 | 5,2 / 13,9 | 5,0 / 13,8 | 16,8 |
| Sombre — « Nuréa » | 6,8 | 6,0 | 6,0 | 7,5 |
| Clair — titre | 13,4 | 13,3 | 13,3 | 7,3 |
| Clair — « Nuréa » | 6,3 | 5,9 | 5,9 | **3,5** |
| Snapchat (les deux) | ≥ 13,3 | ≥ 13,3 | ≥ 13,3 | ≥ 7,2 |

Tout passe. Point faible : « Nuréa » en bordeaux sur la photo claire à 1280 px (3,5:1, grand texte : conforme,
sans marge).

## Bonnes pratiques (92 sur l'aperçu)

Seule erreur : le script de la barre de retours Vercel (`vercel.live/…/feedback.js`), que Vercel injecte
**sur les aperçus uniquement**, est bloqué par notre CSP (`script-src 'self' 'unsafe-inline'`). C'est la CSP
qui fait son travail ; la production n'injecte pas ce script. À remesurer sur la production après T23.

## Titre et description Google de l'accueil — proposition, **non publiée** (avis juridique attendu)

Aujourd'hui (`app/(shop)/page.tsx`, et `DEFAULT_DESCRIPTION` de `src/lib/site.ts` pour les pages sans
description propre) :

- titre : « Nuréa Parfums — Parfums de grandes marques à Marseille »
- description : « …les plus grandes marques de parfum pour homme et femme, au meilleur prix… »

Faux sur le fond : Nuréa ne vend pas les parfums des marques. Et « Marseille » ne décrit plus la clientèle
(Snapchat, envois dans toute la France).

Proposition A (sans aucune comparaison — publiable dès l'accord du gérant) :

- titre (58 car.) : « Nuréa Parfums — Catalogue de parfums, commande sur Snapchat »
- description (≈150 car.) : « Nuréa Parfums : notre catalogue de parfums pour homme et femme, chacun dans
  son flacon Nuréa. Commande sur Snapchat, remise en main propre à Marseille ou envoi partout en France. »

Proposition B (reprend l'accroche du H1 — attend l'avis juridique, comme le H1) :

- titre (≈55 car.) : « Nuréa — Votre parfum, sans le prix des grandes marques »
- description : celle de A.

« Marseille » reste dans la description seulement comme fait (remise en main propre), utile à la recherche
locale ; à retirer si le gérant préfère. `DEFAULT_DESCRIPTION` suit la même décision.

## Hors périmètre, noté

- Lighthouse non installé localement (installation soumise à l'accord du gérant) ; l'API PageSpeed sans clé
  était à court de quota, la page web pagespeed.web.dev a servi. Une seule page mesurée par Lighthouse (l'accueil) ;
  les autres par les scripts.
- Production (233 fiches, base réelle) non mesurée : le build local tourne sur le catalogue de démo (111).
  LCP et INP de la grille à remesurer sur l'aperçu final (T22).
