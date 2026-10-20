# Benchmark DA / UX — refonte du catalogue Nuréa Parfums

Date : 20/10/2026. Méthode : navigateur intégré à 390 x 844 (mobile) puis 1024 x 768 (desktop), mesures par `getComputedStyle` (polices, tailles, interlignes, interlettrage, couleurs, rayons, dimensions d'images), captures, plus Awwwards pour les sites primés. Lecture seule : aucun cookie accepté, aucun formulaire, aucun achat, aucun contournement.

Captures (miniatures 195 x 422, échelle 0,5) : `scratchpad/benchmark-captures/*.jpg` (18 fichiers).

## 0. Limites honnêtes (à lire avant de s'appuyer sur les chiffres)

- **Murs de cookies à 390 px** : Aesop, Le Labo, Byredo, Diptyque, Luckyscent, Notino, Fragrantica, Chanel, Dior, Cartier, Parfums de Marly couvrent 40 à 80 % de l'écran à l'arrivée. Non acceptés : les mesures CSS sont valides, mais plusieurs captures montrent le mur, pas la page. Constat de fond : les marques de luxe cassent leur première impression avec un mur de consentement. Nuréa, sans pub tierce, peut éviter ça.
- **Aesop** : accueil en erreur serveur, puis contrôle anti-robot Cloudflare sur la page parfums (non contourné). Tokens de l'accueil seulement ; ni catalogue, ni fiche, ni desktop.
- **Le Labo** : portail « Select your location » avant tout contenu ; catalogue et fiche non atteints. **Byredo** : l'URL `/fragrance` renvoie une 404 ; j'ai mesuré la 404 (tokens fiables) et l'accueil desktop.
- **Desktop** : pour les 6 premiers sites, seulement capture d'accueil + quelques mesures (Apple en détail). Point faible de l'étude ; le mobile est le vrai sujet (la majorité de la clientèle).
- **Nishane** non visité, remplacé par Parfums de Marly. **Chanel, Dior** : catégorie seulement, pas de fiche ni de recherche testée.
- **Sites primés** : Awwwards n'affiche **aucune parfumerie primée en 2025-2026** (catégorie « perfume » : dernière entrée 2023, mention honorable). Pris : luxe/mode. Godly et Site Inspire non consultés. Pour Miu Miu et Santioni, données = fiche Awwwards (pas de mesure CSS) ; Cartier et Tengile mesurés en CSS.

---

## 1. Relevés par site

### 1.1 Apple (boutique `/fr/shop/buy-iphone`, accueil ; 390 puis 1024)
Mesures :
- Fond `#F5F5F7`, texte `#1D1D1F`, secondaire `#6E6E73`, cartes blanches.
- SF Pro Display (titres ≥ 19 px) / SF Pro Text (corps), poids 300/400/600. Le soin vient des réglages, pas d'une police libre.
- H1 : 390 px = 48/52 px, -0,144 px, poids 600 ; **1024 px = 80/84 px, -1,2 px (-0,015 em)**. L'interlettrage change selon la taille (optique).
- H3 de carte 24/28, +0,216 px, 600. Corps 17/25, **-0,374 px** (-0,022 em). Légende 14/20, -0,224 px.
- Signature : **titre à deux tons** (« Tous les modèles sont là. » `#1D1D1F` + « Faites votre choix. » `#6E6E73`).
- Navigation 48 px, `backdrop-filter: saturate(1.8) blur(20px)`, fond transparent ; rideau du menu `blur(20px)` + `rgba(232,232,237,0.4)`. C'est le verre d'Apple sur le web : un flou, une saturation, rien d'autre.
- Cartes de modèles : rayon **36 px**, carrousel horizontal, la carte suivante dépasse pour signaler le défilement. Étiquette « NOUVEAU » orange, 12 px, fonctionnelle.
- Transition lien/bouton : `color 0.32s cubic-bezier(0.4, 0, 0.6, 1)` (couleur seule).
- Accueil 390 : alternance plein écran clair / noir, un titre + une phrase + deux boutons par écran, produit centré, boutons en pilules. Boutique : 7 637 px de haut ; filtre = onglets textuels (catalogue court).
Excellent : retenue, deux gris + un accent, titres à deux tons, nav en verre. Banal : bandeau financement/reprise en tête. Cliché à éviter : copier le « verre » en panneau blanc translucide sur fond flou coloré.

### 1.2 Aesop (accueil 390, servi en erreur)
- Fond `#FFFEF2` (crème), texte `#333333`. SuisseIntl 400/500 + Zapf Humanist. Corps 14/22,4 (ligne 1,6) ; H1 24/31,9 ; H2 20/28 ; titre produit 14 px/700.
- Rayons 0. Vignettes 150 x 150 en carrousel. En-tête : logo à gauche + 4 icônes (recherche, magasin, panier avec compteur, menu), barre de catégories défilante dessous.
- Cookies : un seul bouton plein noir + liens soulignés.
Excellent : la crème `#FFFEF2` au lieu du blanc, ligne 1,6 sur 14 px. Rien d'autre de mesuré.

### 1.3 Le Labo (accueil, portail pays)
- **Bell Gothic Std** (400/700) + **Magda** (boutons). Corps 14/18,2 ; H1 30/39, 700. Liens de nav **15 px majuscules, interligne 37,5 px** (cible tactile correcte).
- Bandeaux de catégorie 350 x 158 (2,2:1), puis carrés 169. Rayon 0 sur le contenu ; boutons cookies en pilules noires. Page 2 576 px.
Excellent : identité typographique d'étiquette. Cliché : le décor « labo / apothicaire » est déjà le cliché de la niche (Le Labo, Byredo, Aesop).

### 1.4 Byredo (404 mesurée + accueil desktop)
- byredoSans 400/700. Corps 13/20, **+0,325 px** (0,025 em). H1 16/24 majuscules **+0,8 px** (0,05 em). H2 12/14,4 majuscules +1 px. Un composant modal utilise **Inter** (16/24, +1,6 px).
- En-tête 390 : « MENU » texte à gauche, logo centré, « CART (0) » texte à droite : des mots, pas d'icônes. Grille 2 colonnes, **carrés 189 x 189**. Boutons rectangulaires, rayon 2-6 px. Page 2 750 px.
- Desktop : héros plein écran sur photo (coffret de mini-flacons), logo découpé par la photo.
Excellent : micro-labels en majuscules tracking large, menu en mots. Banal : grille carrée 2 colonnes.

### 1.5 Diptyque (`/fr-fr/pages/parfums`, 390)
- Serif maison **Diptyque Saint Germain** (H1/H2 28/34 ; titres de produit 16/18) + **Apercu Pro** corps 16. Noir sur blanc.
- Tuiles de collection **362 x 278 (1,3:1), pleine largeur, empilées** : 7 756 px de page. Rayon 0. En-tête : burger + recherche à gauche, logo centré, compte + sac à droite.
Excellent : titre de produit en serif de 16 px, lisible. Faiblesse : 1 tuile par écran = parcours lent pour 300 références.

### 1.6 Maison Margiela Fragrances (accueil 390)
- **Courier New** (corps 14/18,2, nav, boutons) + **Helvetica Neue LT Std** majuscules (H1 28/28, H2 24/24 : interligne 1,0). Noir sur blanc.
- **Champ de recherche permanent sous l'en-tête** (« I'm looking for… » en Courier), puis nav de catégories défilante 12 px majuscules. Héros 390 x 693 (≈ 9:16). Rayons 20 px / 50 %.
Excellent : l'étiquette machine à écrire ; **recherche affichée d'office**. Cliché : Courier = 30 ans de mode conceptuelle.

### 1.7 Frédéric Malle (accueil 390)
- **Inter** Regular/Light/Medium (corps 14/19,9 ; H2 24/32). Barre noire : livraison offerte + « **2 échantillons** avec chaque commande ».
- **Images 390 x 603 (≈ 2:3) plein écran**, flacon éclairé en studio sur fond noir avec décor coloré (sphère rose, caisse rayée) : la meilleure référence pour vos photos sombres. Puis tuiles ~153 de large et visuel 350 x 427. Boutons pilule rayon 25 px. Page 6 259 px.
- Texte centré en blanc sur le bas sombre de la photo.
Excellent : la photo fait tout, l'interface s'efface. Banal : Inter.

### 1.8 Chanel Parfums (catégorie 390)
- Étiquettes **abchanel-corpo 600**, 12/18, +1 px, majuscules ; corps Helvetica 300, 14/18, +0,1 px, `#333` ; secondaire `#767676` ; blanc ; rayon 0.
- Action = lien majuscule 12 px souligné d'un filet, pas de bouton (« DÉCOUVRIR LE NOUVEAU PARFUM »). Carrousel de carrés 186 x 186. Page 5 374 px.
Excellent : une hiérarchie complète avec deux styles (12 majuscule tracking / 14 light) et du blanc.

### 1.9 Dior Beauté (`/fr_fr/beauty/parfums`, 390)
- **Atacama VF** (serif variable, **poids 352**, H1 40/52, **-0,8 px = -0,02 em**) + **Hellix** (corps 16/24,5 ; légende 12/14 majuscules `#7B8487`). Fond `#F8F8F8`, texte `#33383C`. Rayons 2-6 px. Page 2 540 px.
Excellent : poids non standard (352) = finesse ; fond gris très clair, pas blanc.

### 1.10 Parfums de Marly (accueil 390)
- **Minion Pro** (H1 36/46,8, +0,6 px ; labels 12 px +0,96 px) + **Lato** (13 px majuscules +0,78 px). Texte `#121212`, fond blanc, rayon 0. Photo de campagne saisonnière (flacons dans un parc enneigé). Barre d'annonce noire avec flèches et bouton pause. Page 5 026 px.
Banal : serif classique + Lato. Excellent : photo d'ambiance qui suit la saison.

### 1.11 Luckyscent (accueil, `/collections/unisex`, fiche ; 390)
- **Lato 300** (corps 16/24) + **Neuton 300** (serif de titres). Rayons 2-4 px.
- **Grille : 3 colonnes à 390 px, vignettes 110 x 158 (0,70)**, 54 produits sur la première page, 6 visibles sans défiler. Carrousel « Trending In Unisex » avec **badges de rang #1 #2 #3**. Filtres : « Brands », « Scent Bar », « Filters ». Intro de catégorie repliée par « Read More ».
- **Fiche** : galerie en miniatures verticales, titre serif centré, marque soulignée, prix, **puces de taille « 100ml » / « 1ml Spray Sample »** (modèle proche de vos contenances), puis bloc : Gender, Concentration, Main Note, Country, Released, Fragrance Notes, **Fragrance Style (« Creamy, Gourmand, Sweet, Warm »)**, texte éditorial « The Scoop », « You May Also Like ».
Excellent : puces de tailles échantillon, style en 4 mots, rang. Faiblesse : photo blanche sur blanc, miniatures qui mangent 400 px avant le titre, interface Shopify standard.

### 1.12 Fragrantica (fiche Baccarat Rouge 540, 390)
- Tailwind v4, couleurs **oklch** (fond ≈ `oklch(0.21 0.006 286)`, texte `oklch(0.967 0.001 286)`), **aucune police web** (pile système). H1 24/32, poids **300**, -0,6 px. Légende 12/16.
- **Recherche très visible** sous l'en-tête, bande de chiffres (Perfumes 143K · Reviews 2.7M · Members 2.0M · Online 7.6K).
- Fiche : **accords principaux**, **pyramide** tête/cœur/fond, **votes** (love 13k, like 6.6k, ok 3.4k, dislike 4k, hate 3.1k), **« when to wear »** (hiver, printemps, été, automne, jour, nuit), note 3,74/5 sur 30 184 votes.
- Mur de cookies (238 partenaires) + **bloc d'affiliation Amazon/eBay avant la fiche** : les notes arrivent bien plus bas.
Excellent : vocabulaire (accords, saisons, jour/nuit). Faiblesse : la monétisation écrase le contenu ; aucune hiérarchie ; interface système.

### 1.13 Notino (catégorie Parfums, 390) — contre-exemple
- Roboto ; H1 20/24 poids 500. **10 265 produits**, page de **20 264 px** (24 écrans). Bandeau d'application, modale de cookies, sous-nav « Cartes cadeaux », 8 onglets (Tout / femme / homme / unisexes / coffrets / cosmétiques parfumés / enfants / accessoires), **6 puces de filtre** (Prix, Emballage, Marque, Type de parfum, Cadeaux et promotions, Évaluation), tri « Le plus pertinent ».
- Cartes : marque, nom, descriptif long, note « 4,7 (100) », « 5 variantes de 23,50 € », étiquettes **« Sponsorisé »**, **« Promo »**, **« Cadeaux offerts »**, mention légale « recommandé et sponsorisé par notre partenaire commercial » dans la grille.
Constat : six messages concurrents par carte, quatre niveaux d'information avant le nom du parfum, 7 petites images par écran (98-155 px). Aucun silence.

### 1.14 Sites primés (Awwwards, 2026)
| Site | Prix | Nouveauté (fiche Awwwards) | Mesures |
|---|---|---|---|
| Cartier — Le Chœur des Pierres | SOTD 20/10/2026 (global 7,51), Dev Award 7,84 (animations 8,60) | Parcours immersif, vidéo d'accueil, « gouaché reveal », WebGL ; palette `#FAFAFA` / `#000000` | Fancy Cut Pro (serif) + Brilliant Cut Pro (sans) ; corps 18/28, +0,5 px ; labels 12/14,4 majuscules |
| Santioni Spirits | SOTD 05/10/2026 (8,09) | Univers illustré type bande dessinée, « verser » à la souris, 2 couleurs `#592223` / `#C82924`, son | Créativité 8,5 ; usabilité 7,54 ; accessibilité 6,6 |
| Miu Miu — A House that we shaped | SOTD 25/08/2026 (7,41) | Three.js, on interagit avec des objets de la maison ; `#0C0F60` / `#265ADF` | Usabilité 7,09 (la plus basse) |
| Tengile MalaMala | SOTD 03/10/2026 (7,22) | « Quiet luxury », galerie vidéo, préchargeur, frise animée ; `#FBF8F6` + olive `#5C6E21` | **Mesuré** : fond `#F5EEE9`, texte `#373F1D` ; **PP Fragment variable** (poids 220 / 310) ; H1 48,75/43,9 (**interligne 0,9**), -0,975 px (-0,02 em), majuscules ; corps Inter 16/20 ; rayons 2-4 px ; page 12 734 px ; préchargeur plein écran olive |

Lecture : les sites immersifs (WebGL, 3D) perdent des points sur l'usabilité (7,09 à 7,54) et l'accessibilité (6,6). Les tendances réellement neuves ici : poids variables non standards, interligne très serré sur les titres, deux couleurs maximum, mouvement piloté par le geste, vidéo plutôt que 3D. **Aucune parfumerie primée en 2025-2026 : il y a un espace.**

---

## 2. Dix principes transférables

1. **Une couleur dominante par écran, tirée de l'objet.** Observé : Frédéric Malle (flacon noir + sphère rose + caisse rayée), Santioni (2 couleurs). Application : à chaque parfum, une teinte d'ambiance extraite de la photo Nuréa qui colore le fond de la fiche et le halo de la vignette. Le catalogue change de couleur en défilant.
2. **La recherche est l'interface, pas une icône.** Observé : champ permanent chez Margiela et Fragrantica ; loupe chez Apple (10 produits, suffisant). Application : champ visible au-dessus de la grille, 48 px, suggestions instantanées (marque, parfum, note), état vide utile.
3. **Titre à deux tons.** Observé : Apple, `#1D1D1F` + `#6E6E73`. Application : « 312 parfums. » en clair, « Dites-nous lequel. » en atténué. Une idée par titre.
4. **Verre uniquement pour la couche qui flotte, jamais pour le contenu.** Observé : menu Apple = `saturate(1.8) blur(20px)`, 48 px. Application : barre de recherche collée, sélecteur de contenance, bouton Snapchat. Les cartes sont opaques ; jamais verre sur verre.
5. **Typographie : poids et interlettrage non standards, réglés par taille.** Observé : Dior 352 / -0,02 em ; Tengile 220 / interligne 0,9 / -0,02 em ; Apple -1,2 px à 80 px, -0,374 px à 17 px. Application : fontes variables, titres 300-400, tracking négatif croissant avec la taille, labels 11-12 px majuscules +0,06 à 0,1 em, corps 1,5.
6. **Une ligne de données vraie vaut mieux qu'un graphique.** Observé : Luckyscent « Fragrance Style » en 4 mots ; Fragrantica noie ses accords sous l'affiliation. Application : sous le nom, 3 mots (famille, note principale, ambiance) uniquement si la donnée est vérifiée ; rien d'inventé.
7. **Les tailles comme puces de choix, sans prix.** Observé : Luckyscent « 100ml | 1ml Spray Sample », Malle « 2 échantillons ». Application : 10 / 50 / 80 ml en contrôle segmenté qui prépare le message Snapchat.
8. **Densité réglable.** Observé : Luckyscent 3 colonnes (110 x 158), Byredo 2 colonnes carrées (189), Diptyque 1 colonne (362 x 278), Malle 1 image plein écran (390 x 603). Application : 2 colonnes par défaut (2:3, comme vos vignettes 640 x 960), interrupteur 1 / 2 / 3.
9. **Un seul appel à l'action par écran, en langage naturel.** Observé : Apple (bleu plein + contour), Chanel (lien souligné) ; Notino en empile six. Application : « Écrire sur Snapchat » en pilule persistante, le reste en liens.
10. **Du silence.** Observé : Chanel (12/14, blanc), Aesop (crème), Dior (`#F8F8F8`) ; Notino à l'opposé. Application : 16 px de gouttière à 390, 56-72 px entre blocs, un seul titre au-dessus de chaque grille, pas de phrase d'ambiance générique.

---

## 3. Manifeste anti-« AI slop » (20 points vérifiables)

(O = observé dans mes mesures ; K = connu des sites génériques de 2026, non mesuré ici.)

1. Pas de **trois cartes d'icônes identiques** (pastille + titre + deux lignes). (K)
2. Pas de **dégradé violet / bleu / rose** en fond, sur un titre ou un bouton. (K)
3. Pas d'**eyebrow creux** (« NOUVEAU », « EXCLUSIF », « DÉCOUVREZ ») qui ne porte aucune information. Apple n'en met qu'un, devant un produit réellement nouveau. (O)
4. Pas d'**Inter / Roboto / pile système** pour l'identité. Même Malle, Tengile (corps), Byredo (modale) et Fragrantica laissent Inter ou le système traîner : c'est précisément la marque d'un site non dessiné. (O)
5. Pas de **rayon uniforme de 12 px partout**. Le rayon suit le rôle (36 px carte chez Apple, pilule pour l'action, 0 pour l'image). Trois rayons au maximum, chacun justifié. (O/K)
6. Pas de **carte en verre sur bulles floues colorées**. Le verre sert à une barre flottante, pas à décorer un héros. (K)
7. Pas de **lueur (glow) néon** derrière titres ou boutons. Halo uniquement en couleur extraite de la photo. (K)
8. Pas d'**icônes en pastille ronde pastel**. Trait 1,5 px cohérent, ou des mots (Byredo : « MENU », « CART »). (O)
9. Pas de **copy sans fait** (« voyage sensoriel », « univers », « sillage ») : chaque phrase contient un nom, une note ou une contenance. Test : remplacer « Nuréa » par une autre marque ; si la phrase marche encore, la supprimer.
10. Pas de **héros « grosse phrase + deux boutons + flou »** interchangeable.
11. Pas de **grille de cartes à bordure + ombre + coins arrondis** identiques. La photo est la carte.
12. Pas de **statistiques ou avis inventés** (« +12 000 clients », « 4,9/5 »). (K)
13. Pas d'**emojis comme icônes**. (K)
14. Pas de **pied de page à 4 colonnes de liens vides** ni de newsletter/« durabilité » qui n'existent pas.
15. Pas de **dark mode « noir pur + accent néon + gris à 40 % »** : contraste ≥ 4,5:1 sur chaque gris, fond `#0B0B0F` et non `#000` en grandes surfaces. (K)
16. Pas de **parallaxe, scroll-jacking ni fade-up identique sur chaque bloc**. Un mouvement répond à un geste ou signale un changement d'état. Les sites immersifs perdent en usabilité (Miu Miu 7,09, Santioni 7,54). (O)
17. Pas de **marquee de logos de marques** pour remplir ; la liste des marques est un outil de navigation. (K)
18. Pas de **bouton fantôme identique à l'action principale** : un bouton plein par écran. (O : Apple, Chanel)
19. Pas de **ton marketing automatique** : titres en trois temps (« Découvrez. Explorez. Ressentez. »), tirets cadratins en cascade, « Votre voyage olfactif commence ici ». Écrire comme une personne qui conseille.
20. Pas de **mur de modales** à l'arrivée (cookies + pays + appli + newsletter). 11 sites sur 14 visités couvrent l'écran avant le contenu. Nuréa : aucune modale, aucune bannière d'installation, aucun pop-up. (O)

---

## 4. Trois directions artistiques

Toutes pensées pour des photos de flacons sombres/ambiance, 390 px, sans prix en grille. Polices toutes disponibles sur Google Fonts / Fontsource (fontes variables : *wght*, *opsz*).

### Direction A — « VERRE NOCTURNE » (Apple-like)
- **Idée forte** : une chambre noire où les flacons flottent sous un verre dépoli ; ce qui bouge ou se choisit est en verre, ce qui se lit est opaque et net.
- **Palette** : fond `#0B0B0F` ; surface `#14141A` ; surface haute `#1C1C24` ; filet `rgba(255,255,255,0.08)` ; texte `#F5F5F7` ; secondaire `#A1A1A9` ; accent unique **ambre `#E8B76A`** (état actif, focus, jamais en aplat) ; verre `rgba(30,30,38,0.55)` + `backdrop-filter: blur(20px) saturate(1.8)` (valeurs Apple mesurées) + arête `inset 0 1px 0 rgba(255,255,255,0.18)`. Variante claire dérivée : fond `#F5F5F7`, texte `#1D1D1F`.
- **Typographie** : **Hanken Grotesk** (*wght* 100-900) ; titres 40-56 px poids 300-350, interligne 1,05, -0,02 em ; corps 16-17 px / 1,5, -0,01 em ; labels 11-12 px poids 500 majuscules +0,08 em. **Geist Mono** pour contenances et références (10 / 50 / 80 ml), chiffres tabulaires. Alternative : Schibsted Grotesk.
- **Images** : plein cadre 2:3, pas de cadre ; halo de couleur extrait de la photo (flou 80 px, 18 %) sous la vignette ; rayon 20 px images, 14 px verre, pilule pour actions ; liseré spéculaire 1 px pour « élever » un flacon sombre sur fond sombre.
- **Mouvement signature** : feuille physique : la fiche monte du bas comme une feuille iOS, suit le doigt, se ferme en glissant ; ressort (rigidité ≈ 300, amortissement ≈ 30, ~350 ms), interruptible. Le curseur de contenance glisse avec un léger rebond. Aucune animation d'entrée au scroll.
- **Mémorable** : le halo qui change de teinte quand on touche une contenance ; la barre de recherche en verre qui s'étire en liste de résultats.
- **Risques** : (1) verre sur grille de 300 images = coût GPU sur Android d'entrée de gamme et dans le navigateur interne de Snapchat → au plus 2 éléments flous à l'écran, jamais sur du contenu défilant ; (2) la « réfraction » SVG (feDisplacementMap) ne marche que sous Chromium, pas Safari/iOS : ne pas l'utiliser ; (3) lisibilité du verre sur photo claire : opacité ≥ 0,55 ; (4) c'est la direction que tout le monde copie depuis iOS 26 : l'originalité doit venir de la couleur d'ambiance et du ton, pas de la matière.

### Direction B — « CAHIER D'ATELIER » (étiquette et papier)
- **Idée forte** : le catalogue est le cahier d'un parfumeur ; chaque fiche est une étiquette collée sur le flacon, avec numéro et contenances.
- **Palette** : papier `#E9E3D6` ; encre `#15130F` ; filet encre 14 % ; secondaire `#6B655A` ; accent **vermillon `#E4452B`** (un tampon par page) ; plaques photo `#0E0D0B` encadrées de marge de papier.
- **Typographie** : **Bricolage Grotesque** (*wght* 200-800, *opsz*, *wdth*) titres 36-52 px poids 400, -0,02 em ; **Geist Mono** 12 px pour numéros d'étiquette (« N° 047 », « 10 · 50 · 80 ML »), majuscules +0,04 em.
- **Images** : plaque 2:3 sur papier ; légende mono sous l'image (« FLACON ORIGINAL — PHOTO NURÉA PARFUMS » = vos mentions légales devenues décor) ; numéro incrusté. Pas de rayon, pas d'ombre, filets 1 px.
- **Mouvement signature** : « tamponnage » : la contenance choisie se tamponne (échelle 1,06 → 1, 140 ms, ease-out) ; changement de fiche = glissement horizontal sec (240 ms, `cubic-bezier(0.2,0,0,1)`).
- **Mémorable** : numéros, tampons, mention légale transformée en élément graphique.
- **Risques** : (1) c'est le cliché de la niche (Le Labo, Aesop, Byredo, Diptyque) donc le moins original ; (2) papier clair + photos sombres = deux univers qui cohabitent mal, chaque photo doit être cadrée ; (3) vos photos d'ambiance deviennent des taches noires ; (4) le mode sombre dérivé perd la chaleur.

### Direction C — « NUANCIER » (couleur ambiante)
- **Idée forte** : feuilleter 300 parfums comme un nuancier ; l'écran entier prend la couleur du flacon regardé.
- **Palette** : base `#0A0A0C` ; texte `#F2F0EC` ; secondaire `#9B978F` ; **teinte de chaque parfum** extraite à l'import (dominante ramenée à L 22-30 % en OKLCH), appliquée en fond de fiche (`color-mix(in oklch, var(--parfum) 28%, #0A0A0C)`) et en filet de 3 px sous la vignette. Aucun accent fixe : l'accent est la teinte du parfum.
- **Typographie** : **Bodoni Moda** (*wght* 400-900, *opsz* 6-96) pour les noms, 28-44 px poids 400, optical size maximal, -0,01 em (didone : contraste fin/épais de la mode) ; **Schibsted Grotesk** (*wght* 400-900) pour l'interface 15-16 px ; labels 11 px majuscules +0,1 em. Ne jamais descendre sous 24 px en Bodoni.
- **Images** : plein cadre 2:3 sans cadre, fondu vers la teinte du parfum sur les 40 % bas de la photo (sert de fond au texte).
- **Mouvement signature** : le fond glisse d'une teinte à l'autre pendant le défilement (interpolation OKLCH 400 ms, `cubic-bezier(0.3,0,0.2,1)`), comme Apple Music. Pas de parallaxe.
- **Mémorable** : un catalogue dont la palette est celle de la collection ; filtre bonus « par couleur » (24 teintes).
- **Risques** : (1) dépend de la qualité d'extraction (un flacon doré sur décor brun donne une teinte boueuse) → teinte forçable par parfum dans la gestion ; (2) contraste à calculer à chaque teinte ; (3) effet fatigant sur 300 fiches → le limiter à la fiche et à l'en-tête de grille ; (4) grille monotone si beaucoup de teintes proches.

### Recommandation
**A comme coque (verre, mouvement, structure) + le mécanisme « couleur ambiante » de C comme signature, sans le didone.**
- La demande est « Apple design-like » : seule A l'incarne, et sa retenue protège contre les clichés de la niche (B est le plus documenté : Le Labo, Aesop, Diptyque).
- Vos photos sont des flacons sombres : A et C les font briller ; B les enferme dans des cadres de papier.
- A seule est peu originale (iOS 26 est copié partout). Le halo de teinte tiré de chaque photo donne ce que ni Apple ni la niche ne font : un catalogue dont la couleur change avec le produit, sans contenu inventé.
- Coût : un script d'extraction de teinte à l'import, un champ `ambiance` modifiable dans la gestion, du CSS (`color-mix`, `backdrop-filter`), un seul niveau de verre, aucune bibliothèque.
- Vigilance : tester le verre dans le navigateur interne de Snapchat et sur Android d'entrée de gamme avant de valider.

---

## 5. Douze interactions / composants signature (sans achat)

1. **Recherche permanente en verre** (48 px sous l'en-tête). Suggestions groupées parfums / marques / notes, vignette + « marque · contenances ». État vide : « Pas de "xyz" ici. On le cherche pour vous ? » + bouton « Demander sur Snapchat ». (Margiela, Fragrantica)
2. **Sélecteur de contenance 10 / 50 / 80 ml** en contrôle segmenté en verre, curseur qui glisse, 80 présélectionné ; le choix alimente le message Snapchat. Pas de prix. (Luckyscent)
3. **Bouton « Écrire sur Snapchat » persistant** : pilule en verre en zone du pouce, libellé contextuel (« Demander Nom, 50 ml »), texte copié dans le presse-papier + ouverture de Snapchat, avec retour « Message copié ».
4. **Rail alphabétique A→Z** à droite de la grille (comme les contacts iOS) pour parcourir 300 références sans filtre.
5. **Familles olfactives en puces défilantes** sous la recherche (boisé, ambré, vanillé, floral, frais, épicé, cuiré, gourmand…), compteur en direct. N'afficher que les familles vérifiées. (Luckyscent « Fragrance Style », Fragrantica accords)
6. **Feuille de filtres** (marque, famille, contenance, nouveauté) avec bouton « Voir 42 parfums » mis à jour en direct, filtres actifs en puces supprimables. (Notino a les filtres mais pas le compteur direct.)
7. **Densité 1 / 2 / 3 colonnes** (2 par défaut) avec transition continue ; la vue 1 colonne = plein écran 2:3 façon Frédéric Malle ; réglage mémorisé localement.
8. **Fiche en feuille adressable** : feuille qui monte du bas, URL partageable `/parfums/marque/nom-id`, glisser pour fermer, précédent/suivant par glissement horizontal, le bouton retour du navigateur ferme la feuille.
9. **Comparer deux parfums** : bouton « Comparer » sur deux vignettes → deux colonnes (famille, note principale, concentration, contenances, style en 4 mots). Maximum 2.
10. **« Parfums proches »** : 6 vignettes de même famille/marque en carrousel accroché (la suivante dépasse de 40 px, comme Apple). Sources vraies uniquement.
11. **Partage Snapchat d'une fiche** : lien court + visuel Open Graph 9:16 généré côté serveur (photo, nom, contenances), prêt pour une story.
12. **« Mes envies »** : un cœur par vignette alimente une liste locale (sans compte, `localStorage` entouré de try/catch) ; le bouton Snapchat de la liste compose un seul message (« Je voudrais : Nom A (50 ml), Nom B (10 ml) »). Le panier sans panier ni prix.

Bonus : « Du hasard » (un parfum au hasard dans une famille) ; étiquette « Nouveau cette semaine » en tête de grille, seulement si c'est vrai.

---

## 6. Points d'attention pour la réalisation

- Grille : à 390 px, gouttière 16 px, écart 12 px → 2 colonnes de 173 px, vignette 173 x 260 en 2:3 ; 4 à 5 parfums visibles sans défiler (Luckyscent en montre 6 en 3 colonnes de 110 x 158, mais trop petit pour des photos d'ambiance).
- Vignettes : conserver `…-640.webp` (640 x 960) ; rien à l'optimiseur Vercel (quota épuisé).
- Verre : `backdrop-filter: blur(20px) saturate(1.8)` ; repli `background: rgba(20,20,26,0.92)` sous `@supports not (backdrop-filter: blur(1px))` ; jamais sur des éléments défilants.
- Mouvement : `prefers-reduced-motion` → fondu 120 ms ; durées 140 ms (état), 240 ms (changement), 350-450 ms (feuilles) ; pas de survol sur mobile, réponse à l'appui (échelle 0,98, 90 ms).
- Navigateur Snapchat : `env(safe-area-inset-*)`, `dvh`, éviter `position: sticky` dans un conteneur `overflow` ; à tester en vrai (non vérifié ici).
- Accessibilité : contraste ≥ 4,5:1 sur chaque teinte ambiante (calcul à l'import), cibles ≥ 44 px, focus visible.
- Zéro modale à l'arrivée ; si des cookies tiers deviennent nécessaires, un bandeau bas de 56 px, pas un mur.
