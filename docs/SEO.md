# Référencement — Nuréa Parfums

État au 24/09/2026. Ce document dit ce que le **site** fait pour être trouvé, ce qu'il **ne peut
pas** faire seul, et ce qu'on peut honnêtement en attendre. Les gestes à faire hors du code sont
dans [`seo/INSTRUCTIONS-CHROME.md`](seo/INSTRUCTIONS-CHROME.md), écrits pour être exécutés par
Claude dans Chrome.

## 1. Le problème, relevé le 22 et le 24/09/2026

| Recherche | Où on sortait | Qui passait devant |
|---|---|---|
| `nurea parfums` | 1er | — |
| `nurea parfum` | 2e | Nurae Parfum (Stockport, Royaume-Uni) |
| `nureaparfum` | absent | Nur Parfum, **Nurae Parfum** (nuraeparfum.com), Nura Parfums |
| `parfum marseille` | non mesuré | parfumeries physiques (Sephora, Marionnaud…) |

Deux causes, et elles n'ont pas le même remède :

1. **L'homonyme.** « Nurae » et « Nuréa » ne diffèrent que par deux lettres permutées, et Nurae
   possède `nuraeparfum.com` — un domaine qui est presque mot pour mot la requête `nureaparfum`.
   Google corrige vers ce qu'il connaît le mieux. Le remède : que Google connaisse **mieux** Nuréa
   — une entité nette (nom, ville, activité, profils), et plus de pages qui la portent.
2. **Quatre pages.** Le site n'exposait que l'accueil, /marque, /contact et /legal. Tout le
   catalogue vivait dans une seule page, en surimpression : aucune adresse par marque ni par
   parfum, donc rien à montrer pour « parfum Dior Marseille » ou « Baccarat Rouge 540 Marseille ».

## 2. Ce que le site fait maintenant

### Des pages pour chaque marque et chaque parfum

| Adresse | Répond à | Exemple |
|---|---|---|
| `/parfums` | « marques de parfum Marseille » | index A→Z, 46 marques |
| `/parfums/<marque>` | « parfum Dior Marseille » | `/parfums/tom-ford` |
| `/parfums/<marque>/<nom>-<id>` | « Baccarat Rouge 540 Marseille » | `/parfums/maison-francis-kurkdjian/baccarat-rouge-540-9` |

Le plan du site passe de **4 à ~157 adresses**, avec les images des flacons (Google Images).

Règles tenues, et pourquoi :

- **L'identifiant fait foi, pas le nom** (`src/lib/seo/paths.ts`). Les noms se corrigent (audit du
  23/09 : une douzaine de renommages). Une adresse périmée redirige en 308 vers la bonne — un lien
  partagé en story ne meurt jamais.
- **Une panne de base répond 500, jamais 404** (`getSeoCatalogue`, `src/lib/catalogue-service.ts`).
  Un 404 est une consigne de désindexation ; un 500 est un incident que Google réessaie.
- **Rien d'inventé.** Ni prix (il ne se donne qu'en message privé), ni notes olfactives. Pas de
  balisage `Product` : sans prix, Google le déclarerait en erreur dans la Search Console.
- **Chaque fiche de grille des pages marque est un vrai lien.** Les cartes de l'accueil sont des
  boutons (surimpression) : un robot ne clique pas. Le détail de l'accueil gagne un lien « Voir la
  fiche du parfum », qui sert aussi à partager une référence précise.
- **Maillage** : « Marques » dans la barre de navigation et le pied de page → chaque marque →
  chaque parfum → ses voisins de marque ; chaque marque cite douze autres marques.

### Une entité nette pour Google

- **Titre de l'accueil** : « Nuréa Parfums — Parfums de grandes marques à Marseille ».
- **Titre de page (H1) de l'accueil** : il disait « L'excellence du parfum » — aucun des mots
  qu'on tape. Il porte maintenant « Nuréa Parfums · Parfumerie à Marseille », sans changer le dessin.
- **Données structurées** : `OnlineStore` (une *boutique*, là où Nurae est une *marque*), ville
  Marseille, zone servie Marseille + France, noms alternatifs (`Nurea Parfums`, `Nureaparfum`,
  `nureaparfums.fr`…), `WebSite` avec les mêmes noms — c'est ce que Google lit pour choisir le
  nom du site affiché au-dessus du résultat.
- **FAQ de /marque** : l'orthographe officielle, les écritures en un mot, et la mise au point
  « Nurae Parfum est une marque britannique sans lien avec nous ». Une nouvelle question : « Où
  acheter un parfum de grande marque à Marseille ? ».
- **Domaines de repli** : `nureaparfum.fr`, `nureaparfums.com` et `www.` redirigent déjà
  (vérifié le 24/09).

### Nettoyages techniques

- `lastmod` du sitemap : il datait tout de « maintenant » à chaque lecture — Google finit par
  l'ignorer pour tout le site. Il porte désormais la vraie date de modification, ou rien.
- Le layout ne pose plus de canonique ni de hreflang de repli : une page qui aurait oublié le
  sien déclarait l'accueil comme original, c'est-à-dire demandait à ne pas être indexée.

## 3. Ce que le code ne peut pas faire — et qui compte autant

Par ordre d'effet attendu. Détail pas à pas : [`seo/INSTRUCTIONS-CHROME.md`](seo/INSTRUCTIONS-CHROME.md).

1. **Fiche Google Business Profile** (Google Maps). C'est *le* levier de « parfum Marseille » et
   du panneau de marque à droite des résultats. Zone desservie Marseille, adresse masquée.
   Validation par Google obligatoire (vidéo ou courrier) : **seul le gérant peut la faire**.
2. **Des avis clients réels** sur cette fiche. Jamais d'avis achetés ou écrits soi-même : c'est
   interdit, détecté, et sanctionné par la suppression de la fiche.
3. **Search Console** : sitemap soumis, indexation demandée pour les pages clés, suivi hebdomadaire.
4. **Profils sociaux au nom exact** « Nuréa Parfums » (Instagram, TikTok, Facebook), bio
   « Parfumerie à Marseille », lien vers nureaparfums.fr. Puis ajouter leurs adresses dans
   `sameAs` (`src/components/seo/JsonLd.tsx`) — c'est ce qui relie les comptes à l'entité.
5. **Des liens entrants** : annuaires locaux (PagesJaunes, Apple Plans, Bing Places), presse et
   comptes marseillais. Un lien vaut par sa pertinence, pas par son nombre : jamais de pack acheté.
6. **Le domaine `nureaparfum.com`** (libre au 24/09, vérifié ; `nurea-parfums.fr` aussi) : c'est la faute de frappe la plus proche du
   domaine de Nurae. L'acheter chez Amen, comme les autres, et le rediriger vers nureaparfums.fr.

## 4. Ce qu'on peut honnêtement attendre

Personne ne peut promettre « premier sur toutes les recherches » — une agence qui le promet ment.
Voici ce qui est réaliste :

| Recherche | Attendu | Délai | Dépend de |
|---|---|---|---|
| `nuréa parfums`, `nurea parfums` | 1er, panneau de marque | 1 à 4 semaines | indexation + fiche Google |
| `nurea parfum`, `nuréa parfum` | 1er | 2 à 8 semaines | idem + profils sociaux |
| `nureaparfum`, `nureaparfums` | haut de page, 1er possible | 1 à 3 mois | fiche Google, liens, clics |
| `<marque> Marseille`, `<parfum> Marseille` | 1re page sur une partie | 1 à 3 mois | indexation des ~157 pages |
| `parfum Marseille`, `parfumerie Marseille` | progression, pas de garantie | 3 à 12 mois | fiche Google, avis, liens |

Pourquoi « parfum Marseille » est le plus dur : le bloc Maps est tenu par des boutiques avec
vitrine, et Google y favorise la proximité. Une boutique sans vitrine y entre par les avis et la
régularité de sa fiche, lentement.

## 5. Suivi

Chaque lundi, dans la Search Console → Performances → Requêtes, filtrer sur `nur` et noter la
position moyenne de : `nurea parfums`, `nurea parfum`, `nureaparfum`, `nureaparfums`,
`parfum marseille`. Une ligne par semaine suffit pour voir la tendance.
