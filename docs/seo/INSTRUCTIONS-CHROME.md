# Instructions pour Claude dans Chrome — référencement Nuréa Parfums

> **Mode d'emploi.** Ouvrir Claude Desktop avec l'extension Claude dans Chrome connectée, se
> connecter soi-même à son compte Google dans Chrome, puis coller **tout ce document** comme
> premier message. Faire une partie par séance : A et B le premier jour, C quand on a le temps
> de la valider, D et E ensuite.
>
> **Prérequis** : la version du site du 24/09/2026 est en ligne. Vérifier en ouvrant
> <https://nureaparfums.fr/sitemap.xml> : on doit y voir environ 157 adresses, dont des
> `/parfums/...`. S'il n'y en a que 3 ou 4, la mise en ligne n'est pas faite — s'arrêter là.

---

## Contexte (pour Claude)

Tu travailles pour **Nuréa Parfums**, une boutique de parfums de grandes marques à **Marseille**.
Site officiel : **https://nureaparfums.fr**. Commande par Snapchat (`@nureaparfums`), remise en
main propre à Marseille ou envoi en France. E-mail : `contact@nureaparfums.fr`. Pas de boutique
ouverte au public, pas de numéro de téléphone public, pas de prix affichés.

Le problème à résoudre : sur Google, une marque britannique homonyme, **Nurae Parfum**
(nuraeparfum.com, Stockport), passe devant nous sur `nurea parfum` et surtout `nureaparfum`. Nous
n'avons **aucun lien** avec elle. L'objectif : être premier sur toutes les écritures de notre
nom (`nuréa parfums`, `nurea parfum`, `nureaparfum`, `nureaparfums`…) et progresser sur
`parfum Marseille`.

Domaines : `nureaparfums.fr` (le site), `nureaparfum.fr` et `nureaparfums.com` (redirigent vers le
site). DNS chez **Amen** (amen.fr). Un enregistrement `google-site-verification` existe déjà sur
`nureaparfums.fr` : la propriété Search Console est probablement déjà validée.

### Règles de conduite — à respecter sans exception

1. **Tu ne saisis jamais de mot de passe, de code de validation ni de moyen de paiement.** Si une
   page en demande un, tu t'arrêtes et tu me le dis : je le fais moi-même.
2. **Tu ne crées aucun compte.** Si un service demande d'en créer un, tu t'arrêtes.
3. **Avant chaque bouton qui enregistre, envoie, publie ou valide** (« Envoyer », « Enregistrer »,
   « Publier », « Demander l'indexation », « Valider »), tu me montres ce qui va partir et tu
   attends mon « oui ».
4. **Tu ne supprimes rien** : ni propriété, ni utilisateur, ni sitemap, ni fiche.
5. **Tu n'inventes rien.** Pas d'adresse de rue, pas d'horaires, pas de numéro, pas d'avis. Si une
   information manque, tu me la demandes.
6. Tu **notes au fur et à mesure** ce que tu as vu et fait, et tu me rends à la fin de chaque partie
   un compte rendu court : fait / pas fait / à décider.

---

## Partie A — Google Search Console (≈ 30 min)

Adresse : <https://search.google.com/search-console>

### A1. La propriété

1. Ouvre le sélecteur de propriétés (en haut à gauche). Note les propriétés existantes.
2. Il doit exister une propriété **de type Domaine** nommée `nureaparfums.fr` (pas seulement
   `https://nureaparfums.fr/`). Si elle existe et est validée : passe à A2.
3. Si elle n'existe pas : « Ajouter une propriété » → **Domaine** → `nureaparfums.fr`. Google
   affiche un enregistrement TXT. **Arrête-toi et donne-le moi** : je l'ajouterai chez Amen (ou tu
   le feras avec moi dans l'espace client Amen, une fois que je m'y serai connecté). Puis
   « Valider ». Si la validation échoue, c'est la propagation DNS : réessayer une heure plus tard.
4. Paramètres → **Utilisateurs et autorisations** : vérifie que mon compte est **Propriétaire**.
   Note les autres utilisateurs, n'en supprime aucun.

### A2. Le plan du site

1. Menu **Sitemaps**. Note les sitemaps déjà envoyés et leur état.
2. Dans « Ajouter un sitemap », saisis `sitemap.xml` (l'adresse complète est
   `https://nureaparfums.fr/sitemap.xml`) → me demander → **Envoyer**.
3. Vérifie l'état : « Opération effectuée » et un nombre d'URL découvertes proche de **157**.
   S'il affiche « Impossible de récupérer », réessaie une fois ; sinon note-le.

### A3. Demander l'indexation des pages clés

Google limite à une dizaine de demandes par jour. Dans cet ordre, pour chaque adresse : la coller
dans la barre **« Inspecter n'importe quelle URL »** en haut, attendre le résultat, puis :

- si « L'URL n'est pas sur Google » ou si la date d'exploration est antérieure au 24/09/2026 :
  **« Tester l'URL en direct »** → vérifier « L'URL est disponible pour Google » → me demander →
  **« Demander une indexation »** ;
- dans le détail « Couverture » → « URL canonique déclarée par l'utilisateur » et « URL canonique
  sélectionnée par Google » : **note-les**, elles doivent être identiques à l'adresse inspectée.

Jour 1 :

1. `https://nureaparfums.fr/`
2. `https://nureaparfums.fr/parfums`
3. `https://nureaparfums.fr/marque`
4. `https://nureaparfums.fr/parfums/maison-francis-kurkdjian/baccarat-rouge-540-9`
5. `https://nureaparfums.fr/parfums/chanel`
6. `https://nureaparfums.fr/parfums/louis-vuitton`
7. `https://nureaparfums.fr/parfums/tom-ford`
8. `https://nureaparfums.fr/parfums/yves-saint-laurent`
9. `https://nureaparfums.fr/parfums/dior`
10. `https://nureaparfums.fr/parfums/cartier`

Jours suivants (10 par jour) : les autres pages marque, prises sur <https://nureaparfums.fr/parfums>
(ordre : Carolina Herrera, Burberry, Versace, Creed, Maison Crivelli, Byredo, Nishane,
Giorgio Armani, Prada, puis le reste). Les fiches parfum n'ont pas besoin de demande : le sitemap
suffit, Google les trouvera en quelques jours à quelques semaines.

Si une adresse de la liste répond **introuvable (404)** : le nom a pu changer. Prends l'adresse
exacte sur la page de la marque, et note l'écart.

### A4. L'état de l'indexation (lecture seule)

1. **Indexation → Pages** : note le nombre de pages indexées / non indexées, et **chaque motif**
   de non-indexation avec 2 ou 3 exemples d'URL. Motifs attendus et normaux : « Page avec
   redirection » (les anciennes adresses), « Autre page avec balise canonique correcte » (les
   `/?q=` et `/?maison=` de l'accueil). Motifs à me signaler : « Introuvable (404) » sur une page
   `/parfums/...`, « Erreur serveur (5xx) », « Bloquée par robots.txt ».
2. **Expérience → Signaux Web essentiels** et **HTTPS** : note s'il y a des URL « médiocres ».
3. **Améliorations → Fils d'Ariane** (peut n'apparaître qu'après quelques jours) : note les erreurs.
4. **Sécurité et actions manuelles** : les deux doivent dire « Aucun problème détecté ». Sinon,
   arrête-toi et montre-moi.

### A5. Le point de départ des positions

**Performances → Résultats de recherche**, période « 3 derniers mois ». Onglet **Requêtes**.
Ajoute le filtre *Requête contient* `nur`. Relève dans un tableau : requête, clics, impressions,
position moyenne — pour toutes les lignes. Fais de même avec le filtre `parfum` + `marseille`.
Ce tableau est la **référence** : on le refera chaque semaine.

---

## Partie B — Bing Webmaster Tools (≈ 10 min)

Bing alimente aussi Ecosia, DuckDuckGo et une partie des moteurs de recherche des assistants IA.

1. <https://www.bing.com/webmasters> → je me connecte moi-même (compte Microsoft ou Google).
2. Choisis **« Importer depuis Google Search Console »** → autoriser (me demander) → sélectionner
   `nureaparfums.fr`. L'import reprend la propriété validée et le sitemap.
3. Vérifie dans **Sitemaps** que `https://nureaparfums.fr/sitemap.xml` apparaît ; sinon ajoute-le.
4. **Inspection d'URL** : soumets `https://nureaparfums.fr/` et `https://nureaparfums.fr/parfums`.

---

## Partie C — Fiche Google Business Profile (≈ 45 min, puis validation par Google)

C'est **le levier le plus fort** pour « parfum Marseille » et pour le panneau de marque à droite
des résultats. Adresse : <https://business.google.com/create>.

1. Vérifie d'abord qu'aucune fiche « Nuréa Parfums » n'existe déjà (recherche Google Maps
   « Nuréa Parfums Marseille »). S'il y en a une, arrête-toi et montre-la-moi.
2. **Nom de l'établissement** : `Nuréa Parfums` — exactement, sans rien ajouter. Pas de
   « Nuréa Parfums Marseille pas cher » : ajouter des mots-clés au nom est interdit par Google et
   fait suspendre les fiches.
3. **Catégorie principale** : `Parfumerie`. Pas de catégorie secondaire sans me demander.
4. **Lieu que les clients peuvent visiter ?** → **Non** (pas de vitrine ouverte au public).
5. **Zone desservie** : `Marseille`. Puis demande-moi quelles communes voisines je dessers
   réellement (Aix-en-Provence ? Aubagne ? La Ciotat ? Vitrolles ?) — n'en ajoute aucune de toi-même.
6. **Coordonnées** : site web `https://nureaparfums.fr`. Téléphone : demande-moi ; s'il n'y en a
   pas, laisse vide.
7. **Validation** : Google proposera une vidéo, un appel ou un courrier. **C'est moi qui la fais.**
   Arrête-toi à cette étape et dis-moi ce que Google demande.
8. Une fois la fiche validée (à une séance suivante) :
   - **Description** (à coller telle quelle, 621 caractères sur 750 permis) :

     > Nuréa Parfums est une parfumerie marseillaise qui vous propose les parfums des plus grandes
     > marques au meilleur prix : Chanel, Dior, Louis Vuitton, Tom Ford, Yves Saint Laurent,
     > Maison Francis Kurkdjian, Creed et bien d'autres, pour homme et pour femme. Chaque référence
     > est choisie une par une. La commande se fait en direct, sur Snapchat (@nureaparfums) ou par
     > le formulaire du site : nous répondons à vos questions, confirmons le prix et la
     > disponibilité, puis convenons de la remise en main propre à Marseille ou de l'envoi partout
     > en France. Le catalogue complet, marque par marque, est en ligne sur nureaparfums.fr.

   - **Horaires** : demande-les-moi ; sans réponse, ne rien mettre.
   - **Photos** : je te fournirai logo, couverture et photos réelles. N'utilise aucune image
     trouvée sur Internet.
   - **Lien d'avis** : Accueil de la fiche → « Demander des avis » → copie le lien et donne-le-moi.
     Je l'enverrai **moi-même** à de vrais clients. Tu n'écris, ne demandes et n'achètes aucun avis.

---

## Partie D — Profils et annuaires (au fil de l'eau)

Tu ne crées aucun compte (règle 2) : je crée les comptes, tu m'aides à les remplir.

1. **Snapchat** `@nureaparfums` : dans le profil public, le lien du site doit être
   `https://nureaparfums.fr`. Vérifie avec moi.
2. **Instagram, TikTok, Facebook** : même nom exact `Nuréa Parfums`, identifiant `nureaparfums`
   si libre, bio « Parfumerie à Marseille · Grandes marques au meilleur prix », lien
   `https://nureaparfums.fr`. Note chaque adresse de profil créée : **elles doivent m'être
   remontées** pour être ajoutées au site (champ `sameAs`).
3. **Apple Business Connect** (<https://businessconnect.apple.com>) et **Bing Places**
   (<https://www.bingplaces.com>, importe depuis Google Business Profile) : mêmes nom, catégorie,
   zone et site que la fiche Google — mot pour mot.
4. **PagesJaunes** (<https://www.pagesjaunes.fr/pros>) : mêmes informations.

La règle d'or : **nom, ville et site identiques partout**, à la lettre. C'est cette cohérence qui
fait comprendre à Google que tous ces profils sont la même entité — et pas Nurae.

---

## Partie E — Suivi hebdomadaire (chaque lundi, 10 min)

1. Search Console → Performances → Requêtes, filtre `nur` : ajoute une ligne au tableau de A5.
2. Search Console → Indexation → Pages : le nombre de pages indexées doit monter vers ~157.
3. Recherche Google en navigation privée, depuis Marseille si possible, et note notre position sur :
   `nuréa parfums`, `nurea parfum`, `nureaparfum`, `nureaparfums`, `nurea parfums marseille`,
   `parfum marseille`, `parfumerie marseille`.
4. Signale-moi tout recul de plus de 3 places, toute nouvelle erreur, et tout nouveau site qui
   utiliserait notre nom.
