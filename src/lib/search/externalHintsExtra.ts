/**
 * Entrées hors catalogue (tendances recherche, niches, TikTok, Golfe, designers).
 * Fusionné dans EXTERNAL_PERFUME_HINTS — similarCatalogIds = IDs mockPerfumes.
 */

import type { ExternalPerfumeHint } from "./externalSearchTypes";

export const EXTERNAL_HINTS_EXTRA: ExternalPerfumeHint[] = [
  {
    id: "cherry-bubbles-typo",
    queries: ["cherry bubbles", "cherry buble", "cherry bubblegum"],
    displayName: "Cherry Bubble Gum",
    caption:
      "Très demandé sur les réseaux — pas encore en ligne chez nous. Écrivez-nous : on vérifie la dispo ou une alternative gourmande.",
    similarCatalogIds: [11, 9, 10],
  },
  {
    id: "mugler-alien",
    queries: ["alien mugler", "mugler alien", "alien perfume", "thierry mugler alien"],
    displayName: "Mugler — Alien",
    caption:
      "Icône ambrée — pas au catalogue ; nous pouvons proposer un sourcing ou un parfum dans le même esprit.",
    similarCatalogIds: [9, 12, 20],
  },
  {
    id: "mugler-angel",
    queries: ["angel mugler", "mugler angel", "angel thierry mugler"],
    displayName: "Mugler — Angel",
    caption:
      "Gourmand patchouli culte — demandez la conciergerie pour commande ou alternative.",
    similarCatalogIds: [9, 26, 21],
  },
  {
    id: "viktor-spicebomb",
    queries: ["spicebomb", "spice bomb", "viktor rolf spicebomb", "victor and rolf spicebomb"],
    displayName: "Viktor & Rolf — Spicebomb",
    caption:
      "Épicé-boisé très connu — hors ligne ici ; orientation ou import possible.",
    similarCatalogIds: [10, 11, 13],
  },
  {
    id: "viktor-flowerbomb",
    queries: ["flowerbomb", "flower bomb", "viktor rolf flowerbomb"],
    displayName: "Viktor & Rolf — Flowerbomb",
    caption:
      "Floral oriental — contactez-nous pour une piste luxe proche.",
    similarCatalogIds: [9, 12, 19],
  },
  {
    id: "issey-miyake",
    queries: [
      "issey miyake",
      "leau dissey",
      "l eau d issey",
      "eau dissey",
    ],
    displayName: "Issey Miyake — L’Eau d’Issey",
    caption:
      "Grand classique frais — pas listé ; nous pouvons le chercher ou suggérer un équivalent.",
    similarCatalogIds: [11, 4, 14],
  },
  {
    id: "burberry-hero",
    queries: ["burberry hero", "hero burberry", "burberry perfume"],
    displayName: "Burberry — Hero",
    caption:
      "Designer britannique — sourcing ou boisé/cèdre en alternative.",
    similarCatalogIds: [10, 11, 14],
  },
  {
    id: "givenchy-gentleman",
    queries: ["gentleman givenchy", "givenchy gentleman", "gentleman reserve privee"],
    displayName: "Givenchy — Gentleman",
    caption:
      "Ligne homme — pas en catalogue ; demandez la variante souhaitée.",
    similarCatalogIds: [2, 17, 18],
  },
  {
    id: "givenchy-linterdit",
    queries: ["l interdit", "linterdit", "givenchy interdit", "interdit givenchy"],
    displayName: "Givenchy — L’Interdit",
    caption:
      "Floral tubéreuse — hors fiche ; conciergerie pour proposition.",
    similarCatalogIds: [9, 19, 12],
  },
  {
    id: "boss-bottled",
    queries: ["boss bottled", "hugo boss bottled", "bottled intense"],
    displayName: "Hugo Boss — Bottled",
    caption:
      "Gamme Boss chez nous en partie — précisez le flacon (Bottled, etc.).",
    similarCatalogIds: [8, 11, 22],
  },
  {
    id: "ralph-lauren-polo",
    queries: ["polo ralph lauren", "polo red", "polo blue", "ralph lauren polo"],
    displayName: "Ralph Lauren — Polo",
    caption:
      "Pas en ligne — boisés ou aromatiques proches sur demande.",
    similarCatalogIds: [10, 11, 14],
  },
  {
    id: "calvin-klein-ck",
    queries: ["ck one", "c k one", "calvin klein ck", "ck be"],
    displayName: "Calvin Klein — CK One",
    caption:
      "Classique 90s — commande ou frais alternatif.",
    similarCatalogIds: [11, 14, 22],
  },
  {
    id: "narciso-rodriguez",
    queries: ["narciso rodriguez", "narciso for her", "narciso poudree"],
    displayName: "Narciso Rodriguez — For Her",
    caption:
      "Muscs floraux — pas au catalogue ; nous orientons.",
    similarCatalogIds: [9, 12, 20],
  },
  {
    id: "jean-paul-gaultier-ultra",
    queries: ["ultra male", "ultra male jpg", "gaultier ultra"],
    displayName: "Jean Paul Gaultier — Ultra Male",
    caption:
      "Gourmand vanille — gamme JPG disponible ; demandez Ultra Male.",
    similarCatalogIds: [3, 11, 26],
  },
  {
    id: "lancome-idole",
    queries: ["lancome idole", "idôle", "lancôme idole", "idole lancome"],
    displayName: "Lancôme — Idôle",
    caption:
      "Floral rose musc — hors liste ; sourcing possible.",
    similarCatalogIds: [9, 12, 19],
  },
  {
    id: "estee-lauder",
    queries: ["estee lauder", "beautiful estee lauder", "pleasures estee"],
    displayName: "Estée Lauder",
    caption:
      "Maison cosmétique — pas d’article ici ; dites-nous la référence.",
    similarCatalogIds: [9, 14, 12],
  },
  {
    id: "jo-malone",
    queries: ["jo malone", "jo malone london", "wood sage sea salt"],
    displayName: "Jo Malone London",
    caption:
      "Coloniaux anglais — alternatives citronnées ou boisées.",
    similarCatalogIds: [4, 15, 11],
  },
  {
    id: "diptyque",
    queries: ["diptyque", "philosykos", "tam dao diptyque", "feu de bois diptyque"],
    displayName: "Diptyque",
    caption:
      "Maison parisienne — Tam Dao / oud ou boisés chez nous en piste.",
    similarCatalogIds: [13, 9, 4],
  },
  {
    id: "frederic-malle",
    queries: ["frederic malle", "portrait of a lady", "musc ravageur"],
    displayName: "Éditions de Parfums Frédéric Malle",
    caption:
      "Niche française — sourcing ou parfums dans le même registre.",
    similarCatalogIds: [9, 10, 12],
  },
  {
    id: "amouage",
    queries: ["amouage", "jubilation amouage", "reflection man", "amouage oud"],
    displayName: "Amouage",
    caption:
      "Oman / luxe — pas en ligne ; nous pouvons chercher la référence.",
    similarCatalogIds: [13, 9, 10],
  },
  {
    id: "xerjoff",
    queries: ["xerjoff", "naxos xerjoff", "naxos perfume", "40 knots xerjoff"],
    displayName: "Xerjoff",
    caption:
      "Niche italienne — Naxos ou oud gourmands : demandez-nous.",
    similarCatalogIds: [9, 12, 13],
  },
  {
    id: "nasomatto",
    queries: ["nasomatto", "black afgano", "nasomatto black"],
    displayName: "Nasomatto — Black Afgano",
    caption:
      "Cannabis / oud — très ciblé ; alternatives oud premium.",
    similarCatalogIds: [13, 9, 10],
  },
  {
    id: "roja-dove",
    queries: ["roja dove", "roja parfums", "elysium roja"],
    displayName: "Roja Parfums",
    caption:
      "Ultra-luxe — hors catalogue ; conciergerie pour import.",
    similarCatalogIds: [9, 10, 14],
  },
  {
    id: "clive-christian",
    queries: ["clive christian", "clive christian no 1"],
    displayName: "Clive Christian",
    caption:
      "Flacons prestige — sur commande uniquement.",
    similarCatalogIds: [9, 10, 14],
  },
  {
    id: "bond-no9",
    queries: ["bond no 9", "bond no9", "bond 9 perfume"],
    displayName: "Bond No. 9",
    caption:
      "New York niche — pas distribué ici ; nous cherchons pour vous.",
    similarCatalogIds: [9, 12, 11],
  },
  {
    id: "maison-margiela-replica",
    queries: ["replica maison margiela", "margiela replica", "jazz club replica"],
    displayName: "Maison Margiela — Replica",
    caption:
      "Scènes olfactives — alternatives cosy ou tabac.",
    similarCatalogIds: [9, 16, 11],
  },
  {
    id: "acqua-di-parma",
    queries: ["acqua di parma", "colonia acqua di parma", "blu mediterraneo"],
    displayName: "Acqua di Parma",
    caption:
      "Italien citronné — colognes proches en boutique.",
    similarCatalogIds: [4, 11, 14],
  },
  {
    id: "penhaligons",
    queries: ["penhaligons", "penhaligon s", "halfeti"],
    displayName: "Penhaligon’s",
    caption:
      "British baroque — pas listé ; floral rose / oud en alternatif.",
    similarCatalogIds: [9, 13, 12],
  },
  {
    id: "lattafa-asad",
    queries: ["asad lattafa", "lattafa asad", "asad perfume"],
    displayName: "Lattafa — Asad",
    caption:
      "Gourmand oriental viral — demandez un équivalent ou import.",
    similarCatalogIds: [11, 13, 9],
  },
  {
    id: "armaf-club-de-nuit",
    queries: ["club de nuit", "armaf club de nuit", "cdnim", "club de nuit intense"],
    displayName: "Armaf — Club de Nuit Intense",
    caption:
      "Souvent comparé à Aventus — voir Creed chez nous ou commande.",
    similarCatalogIds: [10, 11, 9],
  },
  {
    id: "al-rehab",
    queries: ["al rehab", "alrehab", "choco musk al rehab"],
    displayName: "Al Rehab",
    caption:
      "Roll-ons arabes — pas en ligne ; oud ou gourmands proches.",
    similarCatalogIds: [13, 16, 11],
  },
  {
    id: "maison-alhambra",
    queries: ["maison alhambra", "alhambra perfume", "clone perfume"],
    displayName: "Maison Alhambra",
    caption:
      "Inspirations de niche — orientation sur demande.",
    similarCatalogIds: [9, 14, 11],
  },
  {
    id: "fragrance-world",
    queries: ["fragrance world", "barakkat", "fragrance dubai"],
    displayName: "Fragrance World / Barakkat",
    caption:
      "Maison émiratie — alternatives oud ou commande.",
    similarCatalogIds: [13, 9, 10],
  },
  {
    id: "dior-poison",
    queries: ["hypnotic poison", "dior poison", "pure poison"],
    displayName: "Dior — Hypnotic Poison",
    caption:
      "Vanille ambrée iconique — gamme Dior sur demande.",
    similarCatalogIds: [2, 17, 18],
  },
  {
    id: "jimmy-choo",
    queries: ["jimmy choo", "jimmy choo perfume", "jimmy choo illicit"],
    displayName: "Jimmy Choo",
    caption:
      "Accessoire mode — pas en ligne ; floral chypré en alternative.",
    similarCatalogIds: [12, 19, 9],
  },
  {
    id: "carolina-herrera",
    queries: ["212 carolina herrera", "212 vip", "carolina herrera"],
    displayName: "Carolina Herrera — 212",
    caption:
      "Good Girl et autres lignes — sourcing possible.",
    similarCatalogIds: [11, 9, 12],
  },
  {
    id: "hugo-boss",
    queries: ["hugo boss", "boss the scent", "boss orange"],
    displayName: "Hugo Boss",
    caption:
      "Une partie de la gamme est chez nous — précisez la référence.",
    similarCatalogIds: [8, 11, 22],
  },
  {
    id: "azzaro-wanted",
    queries: ["wanted azzaro", "azzaro wanted", "wanted by night"],
    displayName: "Azzaro — Wanted",
    caption:
      "Aromatique boisé — gamme Azzaro disponible ; demandez Wanted.",
    similarCatalogIds: [6, 11, 1],
  },
  {
    id: "cartier-declaration",
    queries: ["declaration cartier", "déclaration cartier", "declaration cartier parfum"],
    displayName: "Cartier — Déclaration",
    caption:
      "Cyprès citronné — Pasha ou autres Cartier en boutique ; Déclaration sur demande.",
    similarCatalogIds: [14, 9, 10],
  },
  {
    id: "versace-eros-flame",
    queries: ["eros flame", "versace eros flame", "eros flame versace"],
    displayName: "Versace — Eros Flame",
    caption:
      "Eros est chez nous — Flame et autres déclinaisons sur demande.",
    similarCatalogIds: [11, 1, 9],
  },
  {
    id: "ysl-black-opium",
    queries: ["black opium", "ysl black opium", "black opium ysl"],
    displayName: "Yves Saint Laurent — Black Opium",
    caption:
      "Best-seller YSL — sourcing possible via conciergerie.",
    similarCatalogIds: [20, 17, 18],
  },
  {
    id: "mon-paris-ysl",
    queries: ["mon paris", "mon paris ysl", "ysl mon paris"],
    displayName: "Yves Saint Laurent — Mon Paris",
    caption:
      "Fruité chypré — pas listé ; alternatives YSL ou commande.",
    similarCatalogIds: [17, 18, 20],
  },
  {
    id: "sisley-eau-soir",
    queries: ["sisley", "eau du soir", "sisley eau du soir"],
    displayName: "Sisley — Eau du Soir",
    caption:
      "Chypré vert luxe — pas au catalogue ; nous pouvons le sourcer.",
    similarCatalogIds: [9, 14, 4],
  },
  {
    id: "elie-saab",
    queries: ["elie saab", "elie saab le parfum", "le parfum elie saab"],
    displayName: "Elie Saab — Le Parfum",
    caption:
      "Oriental floral — hors ligne ; demandez la conciergerie.",
    similarCatalogIds: [9, 12, 19],
  },
  {
    id: "dolce-gabbana-the-one",
    queries: ["the one", "d g the one", "dolce gabbana the one"],
    displayName: "Dolce & Gabbana — The One",
    caption:
      "Gamme D&G chez nous — The One sur demande.",
    similarCatalogIds: [24, 11, 26],
  },
  {
    id: "marc-antoine-barrois",
    queries: ["marc antoine barrois", "ganymede", "b683"],
    displayName: "Marc-Antoine Barrois — Ganymede",
    caption:
      "Niche française minimaliste — sourcing ou boisé musqué proche.",
    similarCatalogIds: [9, 10, 4],
  },
  {
    id: "ormonde-jayne",
    queries: ["ormonde jayne", "ormonde woman", "tolu ormonde"],
    displayName: "Ormonde Jayne",
    caption:
      "Niche britannique — pas listée ; alternatives florales ou boisées.",
    similarCatalogIds: [9, 12, 13],
  },
  {
    id: "serge-lutens",
    queries: ["serge lutens", "fille en aiguilles", "chergui"],
    displayName: "Serge Lutens",
    caption:
      "Maison parisienne — références sur commande.",
    similarCatalogIds: [9, 13, 12],
  },
  {
    id: "atelier-cologne",
    queries: ["atelier cologne", "orange sanguine", "clementine california"],
    displayName: "Atelier Cologne",
    caption:
      "Colognes concentrées — alternatives agrumes en boutique.",
    similarCatalogIds: [4, 11, 15],
  },
  {
    id: "maison-crivelli",
    queries: ["maison crivelli", "crivelli parfum"],
    displayName: "Maison Crivelli",
    caption:
      "Niche française récente — orientation sur demande.",
    similarCatalogIds: [9, 12, 11],
  },
  {
    id: "essential-parfums",
    queries: ["essential parfums", "bois imperial"],
    displayName: "Essential Parfums — Bois Impérial",
    caption:
      "Accessible niche — pas en ligne ; boisé frais proche possible.",
    similarCatalogIds: [10, 11, 4],
  },
  {
    id: "zara-rich-warm",
    queries: ["zara rich warm", "rich warm addictive", "zara ember"],
    displayName: "Zara — Rich Warm Addictive",
    caption:
      "Zara est chez nous — autres références Zara sur demande.",
    similarCatalogIds: [16, 11, 9],
  },
  {
    id: "mercedes-benz",
    queries: ["mercedes benz perfume", "mercedes perfume", "mercedes club"],
    displayName: "Mercedes-Benz Parfums",
    caption:
      "Designer auto — pas au catalogue ; aromatiques proches.",
    similarCatalogIds: [11, 10, 14],
  },
  {
    id: "bmw",
    queries: ["bmw perfume", "bmw fragrance"],
    displayName: "BMW Fragrances",
    caption:
      "Licensing — sourcing si la référence existe encore.",
    similarCatalogIds: [11, 22, 14],
  },
  {
    id: "porsche-design",
    queries: ["porsche design", "porsche perfume"],
    displayName: "Porsche Design",
    caption:
      "Pas listé — frais ou boisés en alternative.",
    similarCatalogIds: [10, 11, 14],
  },
  {
    id: "davidoff-cool-water",
    queries: ["cool water", "davidoff cool water"],
    displayName: "Davidoff — Cool Water",
    caption:
      "Grand classique frais — commande ou aquatique alternatif.",
    similarCatalogIds: [11, 14, 22],
  },
  {
    id: "paco-fame",
    queries: ["fame paco rabanne", "rabanne fame", "paco rabanne fame"],
    displayName: "Rabanne — Fame",
    caption:
      "Gamme Rabanne chez nous — Fame sur demande.",
    similarCatalogIds: [1, 11, 9],
    footnote: "none",
  },
  {
    id: "jean-paul-le-beau",
    queries: ["le beau", "le beau jpg", "gaultier le beau"],
    displayName: "Jean Paul Gaultier — Le Beau",
    caption:
      "Gamme JPG — Le Beau et autres en conciergerie.",
    similarCatalogIds: [3, 11, 26],
  },
  {
    id: "hermes-un-jardin",
    queries: ["un jardin sur le nil", "jardin mediterranee", "hermes jardin"],
    displayName: "Hermès — Un Jardin",
    caption:
      "Gamme Hermès disponible — précisez le jardin souhaité.",
    similarCatalogIds: [4, 14, 15],
  },
  {
    id: "louis-vuitton",
    queries: ["louis vuitton parfum", "lv perfume", "ombre nomade"],
    displayName: "Louis Vuitton Parfums",
    caption:
      "Exclusifs boutiques LV — nous pouvons tenter une piste.",
    similarCatalogIds: [9, 10, 14],
  },
  {
    id: "maison-celine",
    queries: ["celine parfum", "celine haute parfumerie", "celine black tie"],
    displayName: "Maison Celine",
    caption:
      "Haute parfumerie — hors catalogue ; dites-nous la note.",
    similarCatalogIds: [9, 14, 10],
  },
];
