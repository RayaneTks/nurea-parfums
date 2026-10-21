# Équipe — le fil conducteur commun

**Toute session Claude qui travaille sur le projet Nuréa Parfums lit ce fichier au démarrage** (ce
dépôt et ses worktrees, la page du graphiste ; les autres projets du gérant ne sont pas concernés), avant sa propre
tâche. Il dit qui fait quoi, ce que chacun a le droit de toucher, comment on se passe le travail et
comment on rend compte au gérant. Il est tenu par le **pilote** (§ 2). En cas de conflit avec un
document de chantier, ce fichier gagne sur l'organisation ; `CLAUDE.md` gagne sur les règles
techniques.

Mis en place le 20/10/2026 à la demande du gérant : « toute l'équipe travaille sur le même fil
conducteur et tout le monde a conscience de tout le monde ».

## 1. Ce qui compte, dans l'ordre

1. **Ne rien casser en production** : base (elle tient l'argent), référencement, vitrine en ligne.
2. **La refonte de la vitrine** (DA « Nuancier nocturne », `docs/refonte-vitrine/`) jusqu'à sa mise
   en ligne (T23).
3. **Les visuels du catalogue** : chaque parfum publié avec son visuel sombre (et clair si possible).
4. La gestion (`app/admin`) : en production depuis le 22/09, **aucun chantier ouvert** ; correctif
   seulement à la demande du gérant.

Quand deux chantiers se gênent, l'ordre ci-dessus tranche, et le pilote arbitre (§ 6).

## 2. Qui fait quoi

| Chantier | Session | Touche | Ne touche jamais | Écrit en production ? | Document pilote |
|---|---|---|---|---|---|
| 21/10 | refonte | **Accroche finale du gérant** : « Votre parfum, sans le prix des grandes marques. » (`306fe06`). Elle compare le prix aux grandes marques : **avis juridique obligatoire avant la mise en ligne** (T23). |
| 21/10 | refonte | **Accroche de la hero** remplacée par « Votre parfum, sans le prix des grandes marques. » (`97b9da3`, choix du gérant) ; « Nuréa » en accent dans le titre retiré avec l'ancienne phrase. Avis juridique toujours attendu. |
| 21/10 | refonte | **T17 et index des Marques validés** par le gérant (« ok c bien »). Prochain : T18. |
| 20/10 | refonte | **Planche d'accueil T15 refusée** (gérant, iPhone) : « trop cheap », remarque de goût. Arrêt de l'exécution ; prochaine étape = session **Fable** (effort high) sur la composition de l'accueil, puis nouvelle planche. T14 reste valable (`00a0001`). |
| 20/10 | refonte | **Planche d'accueil T15** (`cee4774`, `refonte/planche`, `/planche/accueil.html` de l'aperçu) : ouverture « Nuréa Parfums, Marseille » + nuancier des teintes de flacons, 2 parfums mis en avant, chercher par marque, catalogue. **Attente du « oui » du gérant** avant tout code d'accueil. |
| **Pilotage** | session « refonte vitrine », planificateur (Fable pour la DA, Opus pour exécuter) | ce fichier, `docs/refonte-vitrine/`, arbitrages | — | non (décide, ne déploie pas seul) | ce fichier |
| **Refonte vitrine** | même session, branche `refonte/vitrine`, worktree `.claude/worktrees/refonte-vitrine` | `app/(shop)`, `src/components`, `app/globals.css`, `src/design/{brand,fonts}.ts`, `tailwind.config.ts`, `scripts/refonte-vitrine/`, colonnes `ambientHue`/`ambientChroma` | gestion ; `image`, `imageLight`, `status` des fiches ; l'artefact du graphiste | non avant T23, sauf la migration d'ambiance (§ 4.3) | `docs/refonte-vitrine/00-LISEZ-MOI.md` |
| **Visuels et page du graphiste** | session « visuels » (conversation de l'artefact) | `.tmp/outils-visuels/`, `.tmp/audit-visuels/`, la page `public/graphiste-k7q2m9xw4t.html` (https://nureaparfums.fr/graphiste-k7q2m9xw4t.html), images dans Storage `designer/*`, Storage `perfumes/*`, champs `image`/`imageLight`/`status` des fiches, `scripts/catalogue/`, les clés de cache de `src/lib/catalogue-service.ts` | le style de la vitrine, la gestion, les migrations | oui, sur `main`, fournée par fournée | mémoire `visuels-boite-a-outils.md` (à versionner, § 7) |
| **Gestion** | aucune session ouverte | `app/admin`, `src/features`, `src/ui`, `src/app-shell`, `src/server` | — | sur demande du gérant seulement | `PASSATION.md`, `docs/refonte/` |

Une nouvelle session qui ne sait pas où elle se range : elle le demande au gérant **avant** d'écrire,
et le pilote ajoute sa ligne ici.

## 3. Règles communes à toutes les sessions

- **Au démarrage** : `git fetch`, comparer à `origin/main`, lire le § 8 (journal) de ce fichier.
- **Base** : `.env` et `.env.local` pointent sur la **production**. L'URL se lit avant l'import de
  Prisma ; la production exige `--confirm-host` ; tout script qui écrit journalise l'ancienne
  valeur **avant** d'écrire (retour arrière). Jamais `prisma db push`, `prisma migrate reset`, ni
  `npm run build` tel quel.
- **Git** : `git add` fichier par fichier ; un commit = une unité de travail ; sujet
  `<chantier>(<tâche>): …` en français (`vitrine(T7): …`, `visuels(f11): …`) ; le corps dit ce qui a
  été **vérifié, en chiffres** ; fin par la ligne `Co-Authored-By` de la session. Pousser sur `main`
  = mettre en ligne.
- **Fichiers partagés** (risque de conflit) : `src/lib/catalogue-service.ts` (clés de cache),
  `src/lib/catalog/demo-catalogue.json`, `CLAUDE.md`, `MEMORY.md`. Toute modification d'un de ces
  fichiers laisse une ligne au journal (§ 8).
- **Secrets** : jamais dans un fichier, ni du dépôt ni de `.tmp/`. Une session qui en trouve un le
  signale au gérant sans le recopier.
- **Données** : rien d'inventé (ni note, ni famille, ni avis, ni rareté) ; **le nom fait foi** ; une
  fiche fausse est pire qu'une fiche manquante.
- **Vitrine** : Marque · Parfum · Ligne · Catalogue ; **aucune contenance affichée**, jamais de prix.

## 4. Contrats entre chantiers

### 4.1 Visuels → vitrine

Un visuel livré en base est : WebP **1024 × 1536** (2:3), variante **sombre obligatoire** dans
`image`, variante **claire facultative** dans `imageLight` (même scène, seule la lumière change),
vignette **`-640.webp`** à côté. Fiche en `DRAFT` tant qu'aucun visuel validé ne remplace la photo
du flacon d'origine (fond blanc). La vitrine ne lit que ces champs ; elle ne les écrit jamais.

### 4.2 Vitrine → visuels

La refonte ne change pas le format des visuels. Elle ajoute une **couleur d'ambiance** par parfum,
calculée sur le visuel sombre (`scripts/refonte-vitrine/ambiance.mjs`). Après la mise en ligne de la
refonte, chaque fournée se termine par :

```
npx dotenv -e .env -- node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte> --ids <ids>           (essai à blanc)
npx dotenv -e .env -- node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte> --ids <ids> --apply   (écriture, journalisée)
```

Un flacon sans couleur (noir, argent, transparent, fond blanc) donne « repli » : normal.

### 4.3 Base

Une seule migration attendue d'ici T23 : `20261020120000_perfume_ambient` (deux colonnes vides,
sans risque). Elle part sur `main` **seule**, au point de contrôle 2, pour que l'ambiance puisse
être écrite avant la refonte. La session visuels n'écrit que des données, jamais de schéma.

### 4.4 Clés de cache

La session visuels monte les clés sur `main` comme aujourd'hui et le note au journal. La branche
`refonte/vitrine` porte `public-catalogue-v20` ; à la fusion (T23), elle prend **le numéro au-dessus
de celui de `main`**. À T23, la refonte propose une clé unique, pour qu'il n'y ait plus trois
numéros à monter ensemble.

## 5. Rendre compte au gérant (format commun)

Le gérant n'est pas développeur. Chaque rendu, **8 lignes au plus** :

1. **Fait** : quoi, en mots simples (commit si code).
2. **Vérifié** : les chiffres (tests, nombres de fiches, captures).
3. **Ce que tu dois faire** : une action précise (regarder telle capture, répondre oui/non à telle
   question, générer telle image avec tel prompt), ou « rien, je continue ».
4. **Ensuite** : la prochaine étape.

Pas de jargon, pas de tableau de décisions à valider : les choix techniques se tranchent par la
session, les choix de goût par le gérant.

## 6. Arbitrage

Conflit entre chantiers, doute sur le périmètre, fichier partagé touché par deux sessions : on
**s'arrête**, on écrit la question au journal (§ 8, « Question »), on prévient le gérant en une
ligne. Le pilote tranche et écrit la décision au même endroit. Une question de goût sur la DA va à
une session Fable (effort high) avec `docs/refonte-vitrine/04-PLAN-EXECUTION.md`.

## 7. Décisions du pilote pour la session visuels (20/10/2026)

Sa chaîne marche et produit : on n'en change pas le fond. On corrige ce qui la rend fragile.

| # | Décision | Pourquoi | Échéance |
|---|---|---|---|
| V1 | **Versionner les outils réutilisés** : `.tmp/outils-visuels/` → `scripts/visuels/` (convert, apply, publier, comparer, page), un commit par outil, avec un en-tête « usage » comme `scripts/catalogue/*`. Les scripts à usage unique (`_f8-*`, `_f9-*`) restent dans `.tmp/`. | `.tmp/` est hors git et local : un nettoyage ou un autre poste efface la chaîne, et une autre session la réécrirait de zéro. | avant T23 |
| V2 | **Sauvegarder la source de la page** (`data.json`, gabarit, modèle de prompt) dans `docs/visuels/` à chaque publication de l'artefact. | C'est la seule copie de 552 fiches de travail. | à la prochaine publication |
| V3 | **Une ligne au journal (§ 8) par fournée** : date, ids appliqués, ids publiés, clés de cache montées, commit. | La refonte doit savoir quels visuels ont changé (ambiance, captures). | dès maintenant |
| V4 | **Découper sa mémoire** : un fait par fichier (outils, page, règles de jugement, assets). | Un seul gros fichier se relit mal et finit par se contredire. | quand il la met à jour |
| V5 | **Rendre compte au format du § 5.** | Même fil pour le gérant. | dès maintenant |
| V6 | **Supprimer `.tmp/PROMPT-PASSATION.md`** (il contient des valeurs qui ressemblent à des clés) et faire vérifier par le gérant si ces clés sont réelles. | Un secret ne vit dans aucun fichier (§ 3). | dès maintenant |
| V7 | Style des scènes : **inchangé** jusqu'au point de contrôle 2. Les cartes de la refonte seront jugées avec les vrais visuels ; si les scènes dorées écrasent la couleur du flacon, le pilote rédigera une consigne de scène commune. | Constat du 20/10 : 41 % des ambiances tombent dans l'ambre/or (scènes très dorées), le reste suit bien la couleur du flacon. | PC 2 |

## 8. Journal (le plus récent en haut, une ligne par événement)

| Date | Chantier | Événement |
|---|---|---|
| 21/10 | refonte | **T17 codée** (`dcbb5a9`, `refonte/vitrine`) : vignettes de partage — site = photo réelle du flacon Nuréa + logo complet, sans « Marseille » ni « grandes marques » ; fiche = visuel entier sur son ambiance + mention des flacons ; JPEG 50–75 Ko (WhatsApp) ; og:image rétablie sur `/parfums`. Index des Marques montré. **Attente PC du gérant.** |
| 21/10 | refonte | **T16 validée** (« ok good ») avec les téléphones refaits, menu validé. Prompt de reprise réorienté sur T17. |
| 21/10 | refonte | **Menu validé** par le gérant. **Téléphones des photos refaits** (`d362aa5`) après son « pas pro » : écran vert à la génération, vraie capture de l'appli Snapchat qu'il a fournie, **stories nettes à sa demande** malgré leurs prix (exception voulue, notée dans `annexes/photos-editoriales.md`, risque comparatif signalé). **Attente PC.** |
| 21/10 | refonte | **Menu sur téléphone** (`29ed262`, `refonte/vitrine`, signalé par le gérant) : sous 1024 px la barre n'avait aucun lien ; bouton Menu à droite, feuille par le bas (4 pages + Commander sur Snapchat) ; barre tenue sur une ligne dès 320 px. **Attente PC du gérant.** |
| 21/10 | refonte | **T16 codée** (`2ae7205`, `79410b9`, `refonte/vitrine`) : La parfumerie, Contact, Légal, 404 dans la DA (elles s'affichaient sans style) ; photos éditoriales générées sans être vivant, écrans réels du catalogue et de Snapchat incrustés (stories floutées : elles portent des prix) ; 404 avec recherche ; contenances et « grandes marques au meilleur prix » retirés. **Attente PC du gérant.** e2e accueil non relancé (serveur de dev figé). |
| 21/10 | refonte | **Suggestions de recherche validées** par le gérant (« ça me paraît correct »). Prompt de reprise réorienté sur T16. |
| 21/10 | refonte | **Suggestions sous le champ de recherche** (`61cb116`, `refonte/vitrine`, demande du gérant) : jusqu'à 5 parfums avec visuel, « Voir les N parfums », sinon l'invitation à écrire ; une rangée ouvre la fiche (feuille sur l'accueil, page ailleurs) ; combobox accessible. Via l'API de recherche existante, aucune dépendance. **Attente avis du gérant.** |
| 21/10 | refonte | **Lenteur Firefox corrigée** (`7b1d3cb`, `refonte/vitrine`) : fond flou des bandeaux « À l'affiche » agrandi par la mise en page au lieu de `transform: scale(3)` ; bascule de thème de nouveau animée dans Firefox, rendu identique. **Attente test du gérant sur Firefox.** |
| 21/10 | refonte | **Hero validée** par le gérant (« ok »). Signalé ensuite : animation absente et site très lent sur PC — en cours. |
| 21/10 | refonte | **« Nuréa » du titre de la hero en couleur de marque** (`606ff14`, `refonte/vitrine`) ; exception écrite dans `DESIGN.md` § Couleurs. **Attente PC du gérant.** |
| 21/10 | refonte | **Nouvelles photos de la hero en place** (`cd64c4d`, `refonte/vitrine`) : flacon rempli, étiquette NP doré (sombre) / bordeaux (clair), clair/sombre alignés à 0 px ; liseré vert rogné ; LCP 2 112 / 1 292 ms ; Snapchat dégagé du bouchon sous 375 px. Pas de second monogramme dans la hero. **Attente PC du gérant.** e2e tri par marque (téléphone) rouge, antérieur. |
| 21/10 | refonte | **Logo complet dans la barre** (demande du gérant) : monogramme NP + nom, doré/ivoire en sombre, bordeaux/noir en clair, 40 px de haut, aussi au pied de page et sur la 404 (`a141675`, `refonte/vitrine`). |
| 21/10 | refonte | **Couple Nuréa sur toute la vitrine** : fonds et encres retintés (sombre = nuit bordeaux + encres ivoire + doré ; clair = papier ivoire + encre bordeaux + bordeaux), contrastes inchangés ; accent sur bouton principal, focus, filtres actifs, cases, pastille, page en cours (`0133fc6`, `refonte/vitrine`). La gestion n'est pas touchée. |
| 21/10 | refonte | **Couleur de marque Nuréa** (décision du gérant) : doré `#C4956A` en thème sombre, bordeaux `#8B3A3A` en thème clair — jetons `--accent`/`--on-accent`, logotype de la barre à ces couleurs (`c33c2fe`, `refonte/vitrine`) ; `DESIGN.md`, 03, 04, `PRODUCT.md`, `REPRISE.md`, `PROMPT-REPRISE.md` à jour. Usage dans l'accueil : prochaine session. |
| 21/10 | refonte | **« À l'affiche » validé par le gérant** (« globalement ok »). Mémoire finalisée : `REPRISE.md` à jour, prompt de reprise `docs/refonte-vitrine/PROMPT-REPRISE.md`. Prochaine priorité : renforcer l'identité Nuréa sur l'accueil. |
| 21/10 | refonte | **Finitions d'« À l'affiche »** (`a9d344c`) : angles nets (`clip-path`), fond pris dans le ciel de chaque photo (fini l'orange artificiel d'Afternoon Swim), espacements. **Mémoire consolidée** : `docs/refonte-vitrine/REPRISE.md` (à lire en premier), § B.10 condensé, outils de mesure versionnés (`scripts/refonte-vitrine/`, `4defbd2`). **Attente validation du gérant.** |
| 21/10 | refonte | **À l'affiche selon la référence du gérant** (`c62d3a6`, `refonte/vitrine`) : deux bandeaux photographiques horizontaux en miroir (visuel entier fondu dans sa photo floutée, nom intégré à la scène). Captures envoyées au gérant. **Attente de sa réponse.** |
| 21/10 | refonte | **Accueil finalisé** (`fdc9409`, `refonte/vitrine`) : « À l'affiche » en deux compositions horizontales (photos entières), marques en index typographique, Snapchat en bouton rond dans la hero. **Déplacement à la bascule de thème corrigé** pour les visuels identiques (cause : interlignage 1,65 / 1,6 selon le thème ; 0 px après, test d'architecture ajouté). Les paires de fichiers décalés (annexe) restent à refaire par la session visuels. **Attente PC du gérant.** |
| 21/10 | refonte | **Accueil repris** (`35ecbc6`, `refonte/vitrine`) : hero en un bloc au-dessus du flacon, « À l'affiche » en diptyque asymétrique (les deux vedettes visibles), marques en une rangée ; catalogue atteint à 1 428 px sur téléphone. LCP 1 616 / 1 072 ms. **Attente PC du gérant.** |
| 21/10 | refonte → visuels | **Variantes claire/sombre décalées** : à la bascule de thème, des visuels bougent parce que le sujet n'est pas au même endroit dans les deux fichiers (contrat § 4.1 non tenu) — 29 paires sur 103 mesurées (catalogue de démo) et les photos de la hero. Liste, méthode et script : `docs/refonte-vitrine/annexes/alignement-clair-sombre.md`. À refaire au même cadrage que la sombre ; aucune compensation CSS. Accueil repris (`f93e624`) : hero unifiée, « À l'affiche » en panneau, marques en collections. **Attente PC du gérant.** |
| 21/10 | refonte | **Hero « Flacon » codée** (`45d449d`, `refonte/vitrine`) avec les photos du flacon fournies par le gérant (mur fondu dans la page, texte sur la zone vide) ; plus de « Marseille » dans la copy (règle du H1 amendée dans `CLAUDE.md` et 01-INVARIANTS) ; copy provisoire, avis juridique attendu. LCP 1 532 / 1 064 ms. Photos : sans étiquette, vides, définition sous le brief — remplaçables fichier pour fichier. **Attente PC du gérant.** |
| 21/10 | refonte | **Accueil : brief photo du flacon Nuréa validé** (`annexes/brief-photo-hero.md`) ; composants de l'accueil rétablis (`025b9f0`). **Point juridique ouvert** : le parfum Nuréa n'est pas celui de la marque — jamais « le même parfum » ; rapprocher un produit d'un parfum de marque (nom + photo du flacon d'origine) peut tomber sous la publicité comparative illicite (C. conso. L122-2) : avis d'avocat recommandé, concerne aussi le catalogue et la description du site. **Attente gérant** : photo, décision sur l'accroche. |
| 21/10 | refonte | **Accueil, troisième passage (Fable), codé** (`2978930`, `refonte/vitrine`) : composition « Chambre » (§ B.10 réécrit, `DESIGN.md` à jour) — vraie hero de marque (surtitre, accroche, faits, « Voir le catalogue » + Snapchat, visuel de la chambre en deux lumières, **généré** avec l'outil ChatGPT du gérant, prompts dans `annexes/hero-chambre.md`), « À l'affiche » compact, rayon des marques ; trois essais écartés avant dans la session (« La une », « Le comptoir », « Vitrine »). Snapchat en 1 tap (hero) / 2 taps (affiche), LCP 1 320 / 1 576 ms. **Attente PC du gérant** (aperçu Vercel, téléphone). Rien ne touche la gestion ni les visuels du catalogue. |
| 21/10 | refonte | **PC accueil codé : « non »** (goût) : « ultra cheap pour un site de parfum catalogue », tout ce qui précède le catalogue. Troisième refus de l'accueil. Suite : session Fable, `PROMPT-FABLE-ACCUEIL-2.md` (références du gérant d'abord). Le reste de la refonte n'est pas en cause. |
| 21/10 | refonte | **T15 faite** (`3492c18`, `refonte/vitrine`) : accueil A « Couverture » codé (H1, bandeaux à l'ambiance, index des marques), Snapchat en 2 taps, LCP 1,8 s (sombre) / 2,0 s (clair). Supprimé : photo d'accueil `public/branding/visuel-hero*`. **Attente PC du gérant.** Rien ne touche la gestion ni les visuels. |
| 21/10 | refonte | **Accueil : le gérant choisit A « Couverture »** (B « trop chargée » ; réserve « très simple, bof »). § B.10 réduit à A, `DESIGN.md` § Accueil à jour, `PROMPT-SUITE-T15.md` écrit. Prochaine session : T15 (code) sur `refonte/vitrine`. Rien ne touche la gestion ni les visuels. |
| 21/10 | refonte | **Accueil redessiné (Fable)** après le refus de la planche T15 : diagnostic et deux compositions chiffrées dans `04-PLAN-EXECUTION.md` § B.10 (A « Couverture » : le parfum mis en avant sur un bandeau à son ambiance ; B « Nuancier » : mur de visuels rangés par teinte) ; planche v2 `refonte/planche`, `/planche/accueil-v2.html`. Attente du choix du gérant (A, B, aucune). Aucun code d'accueil d'ici là ; rien ne touche la gestion ni les visuels. |
| 20/10 | visuels | Fournée 12 (Givenchy Gentleman, Hot Couture, série Louis Vuitton) : 12 parfums OK appliqués et publiés (384, 385, 387, 177, 277, 278 sombre seul, 276, 273, 279, 274, 280, 456, 281). Gentlemen Only (386) : le visuel reçu est celui de l'Intense, donné à 387 ; 386 reste à créer. Corrections de la page revues : un changement de décor ou de personnage est un choix, pas une erreur (Babycat, Vanilla Powder, Silver Mountain Water) ; Supreme Bouquet (307) : dernier flacon officiel = « GOLD / SUPREME BOUQUET », repassé à refaire. Clés : `public-catalogue-v23`, `seo-catalogue-v19`, `unlisted-perfumes-v13` ; 307 renommé « Gold Supreme Bouquet » (nom officiel YSL). |
| 20/10 | refonte | **T14 faite** (`00a0001`, `refonte/vitrine`) : fiche `/parfums/<marque>/<nom>-<id>` au contenu de la feuille, page marque à l'ambiance moyenne, index A→Z ; URLs, canoniques, 308 inchangés, sitemap identique (151 adresses). S7 arrêtée au plafond de contexte : **T15 à reprendre** en session neuve (`PROMPT-SUITE-S7.md`, étape 2). |
| 20/10 | refonte | **PC 3 passé** (gérant, iPhone) : fiche, gestes, Snapchat en 2 taps. Correctif avant le « oui » (`f4bee0f`) : dérouler et fermer la fiche séparés, barre opaque pendant la bascule de thème. Suite : S7 (T14, T15), `docs/refonte-vitrine/PROMPT-SUITE-S7.md`. |
| 20/10 | visuels | Fournée 11 (livraison `nurea-visuels-alien-a-black-vanilla`, 85 parfums dont 30 déjà en ligne) : 42 parfums relus OK, appliqués, publiés ; 13 à refaire non appliqués (520, 525, 528, 531, 535 à 540, 542, 543, 554 : mauvais bouchon ou jus ; Zara surtout). Sans visuel : 527, 562. Clés sur `main` : `public-catalogue-v21`, `seo-catalogue-v17`, `unlisted-perfumes-v11` (la refonte porte v20 : prendre ≥ v22 au rebase). Page : 39 à refaire, 231 validés, 283 à créer. |
| 20/10 | refonte | **T13 faite** (`7d86433`, `refonte/vitrine`) : « Ma sélection » en feuille sur l'accueil (`?selection=1`), un seul message Snapchat pour N parfums, rien côté serveur. **Attente PC 3** (fiche et commande, iPhone). |
| 20/10 | refonte | **T12 faite** (`288cf48`, `refonte/vitrine`) : fiche en feuille `?parfum=<id>`, précédent/suivant au glissé, Snapchat en 2 taps (copie « Nom (Marque) »), fermeture à 0,11 px/ms. |
| 20/10 | refonte | **Ambiance écrite en production** : `ambiance.mjs --apply`, 233 fiches publiées, 199 avec couleur, 34 en repli (recompté en base). Journal des anciennes valeurs : `.tmp/refonte-vitrine/ambiance-journal-2026-10-20T20-23-19-078Z.json` (worktree refonte). Visuels : chaque fournée finit par `--ids … --apply` (§ 4.2). |
| 20/10 | refonte | **Migration `20261020120000_perfume_ambient` en production** (`8ba4e33`, seule sur `main`) : colonnes `ambientHue`/`ambientChroma`, CHECK `perfume_ambient_ck`. Rien ne les lit encore sur `main`. Aucune autre migration attendue d'ici T23 (§ 4.3). |
| 20/10 | refonte | Correctif carte sur `refonte/vitrine` (`b0b54da`) : nom et marque coupés entre les mots, plus « Seduc-tion ». |
| 20/10 | refonte | **T11 faite** (`2b8cc4e`) : feuille « Marques » neuve, bouton « Voir N parfums » à jour avant validation, une puce par marque ; `e2e/catalog-filters.spec.ts` réécrit, 8/8. Reste avant T12 : migration d'ambiance seule sur `main` puis `--apply`, sur « oui » du gérant. |
| 20/10 | refonte | **T10 faite** (`5f79c5c`) : recherche en direct depuis la barre haute (accueil), état vide « Vous cherchez *X* de *Y* ? Écrivez-nous » avec contact pré-rempli, plus jamais « aucun résultat » ; `PerfumeLinkCard` au dessin neuf. |
| 20/10 | visuels | Page du graphiste déplacée de l'artefact Claude (refusé au partage public : trop d'images intégrées) vers le site : `public/graphiste-k7q2m9xw4t.html` (noindex, adresse cachée), 984 images dans `catalog/designer/NNN.webp`. Maj = `node scripts/visuels/page.mjs` puis copie dans `public/` + push `main`. Ne pas supprimer `designer/`. |
| 20/10 | refonte | **PC 2 passé** (gérant, iPhone) : accueil, fiche (visuel entier, fond d'ambiance), bascule clair/sombre en cercle. Branche `refonte/vitrine` à `f4ba99c`. Suite : T10, T11, puis migration d'ambiance seule sur `main` (accord du gérant). |
| 20/10 | refonte | T9 faite sur `refonte/vitrine` (`985374a`) : grille 2 colonnes, densité, « Charger la suite » par 24, rail A→Z. Accueil 55 images (332 avant), LCP 1,9 s. **PC 2 en attente du gérant** (aperçu Vercel de la branche). |
| 20/10 | refonte | T8 faite sur `refonte/vitrine` (`7e68b14`) : carte parfum (fond d'ambiance au survol/appui, cœur « Ma sélection »), visuel (repli si photo introuvable), squelette, bouton 8 états. Rien en production. Prochaine : T9 (grille, PC 2). |
| 20/10 | refonte | T7 faite sur `refonte/vitrine` (`8459575`) : colonnes d'ambiance + script, essai à blanc seulement. Migration sur `main` prévue au PC 2, seule. |
| 20/10 | pilotage | Création de ce fichier. Décisions V1 à V7 pour la session visuels. |
| 20/10 | refonte | T5 (coque) et T6 (jeu d'essai) sur `refonte/vitrine`. T7 en cours : colonnes d'ambiance (migration `20261020120000_perfume_ambient`, pas encore en production), clé `public-catalogue-v20` sur la branche. Essai à blanc sur 233 fiches publiées : 34 en repli (14,6 %), dont les ~50 photos de flacon d'origine sur fond blanc (visuels à venir). |
| 20/10 | visuels | Fournée 10 (détail) : appliqués 368, 357, 369, 169, 370, 372, 373, 374, 376, 377, 115, 114, 379, 380, 381 (tous publiés sauf 380, déjà en ligne) ; non publiés, à refaire : 153, 168, 178, 383 ; 7 visuels retirés (311, 313, 315, 352, 361, 363, 366) ; 31 visuels d'autres sessions (46, 491 à 519, 558) relus fidèles. Clés `public-catalogue-v19`, `seo-catalogue-v15`, `unlisted-perfumes-v9`. Commit `4fc066e`. V1 : outils dans `scripts/visuels/`. V2 : source de la page dans `docs/visuels/`. V6 : passation supprimée. Page du graphiste en version 19. |
| 20/10 | visuels | Fournée 10 appliquée. Clés sur `main` au 20/10 : `public-catalogue-v19`, `seo-catalogue-v15`, `unlisted-perfumes-v9`. |
