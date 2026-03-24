/**
 * Parfums / marques souvent recherchés mais absents du catalogue local.
 * Alimenté à partir de tendances marché (niche, TikTok, best-sellers, maisons du Golfe).
 * Chaque entrée : requêtes reconnues + alternatives dans notre catalogue (IDs mockPerfumes).
 */

import { EXTERNAL_HINTS_EXTRA } from "./externalHintsExtra";
import type { ExternalPerfumeHint } from "./externalSearchTypes";

export type { ExternalPerfumeHint };

/** Message quand la requête ne correspond à aucune fiche connue (ni au catalogue). */
export const EXTERNAL_SEARCH_FALLBACK_MESSAGE =
  "Aucune correspondance dans notre base : cette requête ne ressemble pas à un parfum ou une maison que nous reconnaissons. Reformulez (nom exact, marque) ou écrivez-nous avec un peu de contexte — la conciergerie répondra plus vite avec un nom précis.";

export const EXTERNAL_PERFUME_HINTS: ExternalPerfumeHint[] = [
  /* —— Déjà demandés / viral niche —— */
  {
    id: "cherry-bubble",
    queries: [
      "cherry bubble",
      "cherry bubble gum",
      "bubble gum cherry",
      "cherry gum",
    ],
    displayName: "Cherry Bubble Gum",
    caption:
      "Ce jus gourmand fait souvent le buzz : il n’est pas encore au catalogue, mais écrivez-nous — nous vérifions la disponibilité ou une alternative tout aussi addictive.",
    similarCatalogIds: [11, 9, 10],
  },
  {
    id: "arabian-oud",
    queries: [
      "arabian oud",
      "arabian oud house",
      "arabian oud parfum",
      "arabian oud perfume",
      "world of arabian oud",
    ],
    displayName: "Arabian Oud",
    caption:
      "Grande maison du Golfe très recherchée : elle n’est pas encore sur notre vitrine en ligne, mais dites-nous la référence exacte — nous pouvons souvent la sourcer ou vous proposer un oud dans le même esprit.",
    similarCatalogIds: [13, 9, 16],
  },
  {
    id: "initio",
    queries: [
      "initio",
      "initio parfums",
      "atomic rose",
      "rehab initio",
      "side effect initio",
    ],
    displayName: "Initio Parfums Privés",
    caption:
      "Marque niche — sourcing ou alternative parmi nos sélections sur demande.",
    similarCatalogIds: [9, 10, 12],
  },
  {
    id: "lattafa-khamrah",
    queries: [
      "khamrah",
      "lattafa khamrah",
      "lattafa",
      "latafa",
    ],
    displayName: "Lattafa — Khamrah",
    caption:
      "Gourmand viral — pas au catalogue ; nous proposons des alternatives vanille-épices ou import.",
    similarCatalogIds: [11, 9, 26],
  },
  {
    id: "lattafa-yara",
    queries: ["yara lattafa", "lattafa yara", "yara perfume"],
    displayName: "Lattafa — Yara",
    caption:
      "Best-seller accessible — demandez la conciergerie pour équivalent ou commande.",
    similarCatalogIds: [11, 12, 9],
  },

  /* —— Best-sellers France / designer —— */
  {
    id: "sauvage",
    queries: ["sauvage", "dior sauvage", "sauvage dior", "sauvage elixir"],
    displayName: "Dior — Sauvage",
    caption:
      "Référence ultra-diffusée — notre gamme Dior couvre la maison ; demandez la variante souhaitée.",
    similarCatalogIds: [2, 17, 18],
  },
  {
    id: "bleu-chanel",
    queries: [
      "bleu de chanel",
      "bleu chanel",
      "chanel bleu",
      "bleu chanel homme",
    ],
    displayName: "Chanel — Bleu de Chanel",
    caption:
      "Chanel n’est pas listé ici — nous suggérons des signatures proches ou sourcing.",
    similarCatalogIds: [10, 14, 9],
  },
  {
    id: "chanel-n5",
    queries: [
      "chanel n5",
      "n°5",
      "no 5 chanel",
      "number 5 chanel",
      "coco chanel 5",
    ],
    displayName: "Chanel — N°5",
    caption:
      "Icone Chanel — contactez-nous pour commande ou alternative luxe.",
    similarCatalogIds: [9, 14, 10],
  },
  {
    id: "coco-mademoiselle",
    queries: ["coco mademoiselle", "coco mademoiselle chanel", "mademoiselle"],
    displayName: "Chanel — Coco Mademoiselle",
    caption:
      "Pas en ligne ici — conciergerie pour proposition ou import.",
    similarCatalogIds: [9, 12, 14],
  },
  {
    id: "jadore",
    queries: ["jadore", "j adore", "dior jadore", "j'adore", "jadore dior"],
    displayName: "Dior — J'adore",
    caption:
      "Gamme Dior disponible en partie — précisez le flacon souhaité.",
    similarCatalogIds: [2, 18],
  },
  {
    id: "miss-dior",
    queries: ["miss dior", "miss dior cherie", "missdior"],
    displayName: "Dior — Miss Dior",
    caption:
      "Ligne Dior femme — demandez la version (eau de parfum, etc.).",
    similarCatalogIds: [2, 19],
  },
  {
    id: "la-vie-est-belle",
    queries: [
      "la vie est belle",
      "lancome",
      "lancôme la vie est belle",
      "vie est belle",
    ],
    displayName: "Lancôme — La Vie Est Belle",
    caption:
      "Grand classique — pas listé ; nous pouvons le procurer ou suggérer un équivalent gourmand.",
    similarCatalogIds: [26, 21, 9],
  },
  {
    id: "libre-ysl",
    queries: ["libre ysl", "ysl libre", "libre yves saint laurent"],
    displayName: "Yves Saint Laurent — Libre",
    caption:
      "YSL est dans nos nouveautés — voir nos créations YSL ou demander Libre.",
    similarCatalogIds: [17, 18, 20],
  },
  {
    id: "black-opium",
    queries: ["black opium", "ysl black opium", "black opium ysl"],
    displayName: "Yves Saint Laurent — Black Opium",
    caption:
      "Best-seller YSL — sourcing possible via conciergerie.",
    similarCatalogIds: [20, 17, 18],
  },
  {
    id: "good-girl",
    queries: ["good girl", "carolina herrera good girl", "good girl perfume"],
    displayName: "Carolina Herrera — Good Girl",
    caption:
      "Pas au catalogue — alternatives orientales ou florales sur demande.",
    similarCatalogIds: [11, 9, 12],
  },
  {
    id: "acqua-di-gio",
    queries: [
      "acqua di gio",
      "acqua di gio armani",
      "acqua di gio homme",
    ],
    displayName: "Armani — Acqua di Giò",
    caption:
      "Gamme Armani — Stronger With You / sélections proches en boutique.",
    similarCatalogIds: [26, 21, 11],
  },
  {
    id: "dylan-blue",
    queries: ["dylan blue", "versace dylan blue", "dylan blue versace"],
    displayName: "Versace — Dylan Blue",
    caption:
      "Versace en sélection — Eros et gammes ; demandez Dylan Blue.",
    similarCatalogIds: [11, 1],
  },
  {
    id: "phantom",
    queries: ["phantom", "phantom rabanne", "paco rabanne phantom"],
    displayName: "Rabanne — Phantom",
    caption:
      "Gamme Rabanne complète chez nous — Phantom sur demande.",
    similarCatalogIds: [1, 11],
  },
  {
    id: "invictus",
    queries: ["invictus", "invictus paco rabanne", "invictus rabanne"],
    displayName: "Rabanne — Invictus",
    caption:
      "Classique Rabanne — inclus dans notre gamme marque.",
    similarCatalogIds: [1, 11],
  },
  {
    id: "le-male",
    queries: ["le male", "le male jpg", "jean paul gaultier le male"],
    displayName: "Jean Paul Gaultier — Le Mâle",
    caption:
      "Gamme JPG au catalogue — précisez la déclinaison.",
    similarCatalogIds: [3, 11],
  },
  {
    id: "scandal",
    queries: ["scandal", "scandal jpg", "scandal jean paul gaultier"],
    displayName: "Jean Paul Gaultier — Scandal",
    caption:
      "JPG — voir gamme complète ou commande Scandal.",
    similarCatalogIds: [3, 12],
  },
  {
    id: "light-blue",
    queries: [
      "light blue",
      "dolce gabbana light blue",
      "light blue dg",
    ],
    displayName: "Dolce & Gabbana — Light Blue",
    caption:
      "Gamme D&G chez nous — Light Blue sur demande.",
    similarCatalogIds: [24, 11],
  },
  {
    id: "terre-hermes",
    queries: [
      "terre hermes",
      "terre d hermes",
      "terre d'hermes",
      "hermes terre",
    ],
    displayName: "Hermès — Terre d'Hermès",
    caption:
      "Gamme Hermès disponible — Terre et autres lignes à préciser.",
    similarCatalogIds: [4, 14],
  },
  {
    id: "one-million",
    queries: ["1 million", "one million", "1million", "paco rabanne 1 million"],
    displayName: "Rabanne — 1 Million",
    caption:
      "Inclus dans la gamme Rabanne — commande possible.",
    similarCatalogIds: [1, 11],
  },

  /* —— Niche / TikTok / luxe —— */
  {
    id: "tom-ford-lost-cherry",
    queries: [
      "lost cherry",
      "tom ford lost cherry",
      "lost cherry tom ford",
    ],
    displayName: "Tom Ford — Lost Cherry",
    caption:
      "Très recherché — pas listé ; alternatives cerise / amande ou sourcing.",
    similarCatalogIds: [9, 11, 12],
  },
  {
    id: "tom-ford-oud-wood",
    queries: ["oud wood", "tom ford oud", "oud wood tom ford"],
    displayName: "Tom Ford — Oud Wood",
    caption:
      "Oud boisé iconique — voir nos oud ou commande.",
    similarCatalogIds: [13, 9, 10],
  },
  {
    id: "tom-ford-tobacco",
    queries: [
      "tobacco vanille",
      "tom ford tobacco",
      "tobacco vanille tom ford",
    ],
    displayName: "Tom Ford — Tobacco Vanille",
    caption:
      "Gourmand tabac — alternatives niche ou import.",
    similarCatalogIds: [9, 16, 11],
  },
  {
    id: "creed-silver",
    queries: [
      "silver mountain water",
      "silver mountain creed",
      "creed silver",
    ],
    displayName: "Creed — Silver Mountain Water",
    caption:
      "Creed — Aventus en sélection ; autres lignes sur demande.",
    similarCatalogIds: [10, 14, 4],
  },
  {
    id: "creed-green-irish",
    queries: [
      "green irish tweed",
      "green irish tweed creed",
      "git creed",
    ],
    displayName: "Creed — Green Irish Tweed",
    caption:
      "Pas en ligne — Creed Aventus disponible ; autres Creed via conciergerie.",
    similarCatalogIds: [10, 14, 11],
  },
  {
    id: "marly-layton",
    queries: ["layton", "layton parfums de marly", "parfums de marly layton"],
    displayName: "Parfums de Marly — Layton",
    caption:
      "Niche française — sourcing ou parfums dans le même esprit chez nous.",
    similarCatalogIds: [10, 11, 9],
  },
  {
    id: "marly-delina",
    queries: ["delina", "delina parfums de marly", "delina exclusive"],
    displayName: "Parfums de Marly — Delina",
    caption:
      "Floral rose iconique — alternatives luxe ou commande.",
    similarCatalogIds: [9, 12, 19],
  },
  {
    id: "marly-herod",
    queries: ["herod", "herod parfums de marly", "marly herod"],
    displayName: "Parfums de Marly — Herod",
    caption:
      "Tabac-prune — demandez un équivalent ou import.",
    similarCatalogIds: [9, 16, 10],
  },
  {
    id: "byredo",
    queries: [
      "byredo",
      "mojave ghost",
      "byredo mojave",
      "gypsy water",
    ],
    displayName: "Byredo",
    caption:
      "Maison suédoise — pas au catalogue ; suggestions niche proches.",
    similarCatalogIds: [9, 12, 15],
  },
  {
    id: "le-labo",
    queries: [
      "le labo",
      "santal 33",
      "santal 33 le labo",
      "another 13",
    ],
    displayName: "Le Labo",
    caption:
      "Santal 33 très demandé — nous pouvons orienter vers boisé / musc.",
    similarCatalogIds: [13, 9, 4],
  },
  {
    id: "kilian",
    queries: [
      "kilian",
      "angels share",
      "angel's share",
      "kilian angels",
      "black phantom kilian",
    ],
    displayName: "Kilian Paris",
    caption:
      "Gourmand / cognac — alternatives ou sourcing.",
    similarCatalogIds: [9, 11, 10],
  },
  {
    id: "montale",
    queries: [
      "montale",
      "black aoud montale",
      "montale intense cafe",
    ],
    displayName: "Montale",
    caption:
      "Oud et orientaux — voir nos oud ou commande Montale.",
    similarCatalogIds: [13, 9, 12],
  },
  {
    id: "mancera",
    queries: ["mancera", "cedrat boise", "mancera cedrat"],
    displayName: "Mancera",
    caption:
      "Marque du Golfe — alternatives citronnées-boisées.",
    similarCatalogIds: [10, 11, 13],
  },
  {
    id: "arianna-cloud",
    queries: [
      "cloud ariana",
      "ariana grande cloud",
      "cloud perfume",
    ],
    displayName: "Ariana Grande — Cloud",
    caption:
      "Gourmand populaire — équivalents jeunesse ou commande.",
    similarCatalogIds: [11, 26, 21],
  },
  {
    id: "sol-de-janeiro",
    queries: [
      "sol de janeiro",
      "cheirosa 68",
      "cheirosa",
      "brazilian crush",
    ],
    displayName: "Sol de Janeiro — Cheirosa",
    caption:
      "Brume / parfum corps viral — pas listé ; demandez-nous.",
    similarCatalogIds: [11, 12, 21],
  },
  {
    id: "prada-paradoxe",
    queries: ["paradoxe", "prada paradoxe", "paradoxe prada"],
    displayName: "Prada — Paradoxe",
    caption:
      "Prada — sourcing ou floral ambre alternatif.",
    similarCatalogIds: [9, 14, 12],
  },
  {
    id: "gucci-guilty",
    queries: ["gucci guilty", "guilty gucci", "gucci perfume guilty"],
    displayName: "Gucci — Guilty",
    caption:
      "Designer italien — commande possible.",
    similarCatalogIds: [11, 10, 14],
  },
  {
    id: "valentino-donna",
    queries: [
      "valentino donna",
      "born in roma",
      "valentino born in roma",
    ],
    displayName: "Valentino — Donna / Born in Roma",
    caption:
      "Pas en catalogue — alternatives florales luxe.",
    similarCatalogIds: [9, 19, 12],
  },
  {
    id: "dior-homme",
    queries: ["dior homme", "dior homme intense", "homme dior"],
    displayName: "Dior — Dior Homme",
    caption:
      "Gamme Dior homme — voir notre sélection Dior.",
    similarCatalogIds: [2, 17, 18],
  },

  /* —— Maisons orientales / oud —— */
  {
    id: "al-haramain",
    queries: ["al haramain", "haramain", "haramain perfume"],
    displayName: "Al Haramain",
    caption:
      "Maison du Golfe — alternatives oud en boutique.",
    similarCatalogIds: [13, 9, 16],
  },
  {
    id: "swiss-arabian",
    queries: ["swiss arabian", "swissarabian"],
    displayName: "Swiss Arabian",
    caption:
      "Orientaux accessibles — Oud Touch ou commande.",
    similarCatalogIds: [13, 16, 11],
  },
  {
    id: "rasasi",
    queries: ["rasasi", "rasasi hawas", "haw rasasi"],
    displayName: "Rasasi",
    caption:
      "Dubaï — pas listé ; conciergerie pour import.",
    similarCatalogIds: [13, 11, 10],
  },
  {
    id: "ajmal",
    queries: ["ajmal", "ajmal perfume", "ajmal oud"],
    displayName: "Ajmal",
    caption:
      "Maison indienne / Golfe — sourcing possible.",
    similarCatalogIds: [13, 9, 12],
  },
  {
    id: "rasayel",
    queries: ["rasayel", "rasayel oud"],
    displayName: "Rasayel Oud",
    caption:
      "Emirats — alternatives oud premium.",
    similarCatalogIds: [13, 9, 10],
  },
  {
    id: "ameenah",
    queries: ["ameenah", "ameenah oud"],
    displayName: "Ameenah",
    caption:
      "Maison oud — commande ou parfums proches.",
    similarCatalogIds: [13, 9],
  },
  {
    id: "ag-oud",
    queries: ["ag oud", "agoud", "ag oud emirates"],
    displayName: "AG Oud",
    caption:
      "Luxe émirati — orientation oud.",
    similarCatalogIds: [13, 10, 9],
  },

  /* —— Références « clubbing » / génériques —— */
  {
    id: "chanel-generic",
    queries: ["chanel parfum", "parfum chanel", "chanel fragrance"],
    displayName: "Chanel",
    caption:
      "La maison Chanel n’est pas listée article par article — dites-nous le flacon exact.",
    similarCatalogIds: [9, 10, 14],
  },
  {
    id: "guerlain-generic",
    queries: [
      "guerlain",
      "shalimar",
      "l homme ideal",
      "homme ideal guerlain",
    ],
    displayName: "Guerlain",
    caption:
      "Gamme Guerlain en partie chez nous — précisez la ligne.",
    similarCatalogIds: [7, 14, 9],
  },
  {
    id: "tom-ford-generic",
    queries: ["tom ford", "tom ford parfum", "tom ford perfume"],
    displayName: "Tom Ford",
    caption:
      "Tom Ford — sourcing par référence ou alternatives niche.",
    similarCatalogIds: [9, 10, 11],
  },
  {
    id: "chloe",
    queries: ["chloe", "chloé", "chloe perfume", "nomade chloe"],
    displayName: "Chloé",
    caption:
      "Pas au catalogue — floral rose / pivoine en alternative.",
    similarCatalogIds: [12, 19, 9],
  },
  {
    id: "marc-jacobs",
    queries: ["marc jacobs", "daisy marc jacobs", "daisy perfume"],
    displayName: "Marc Jacobs — Daisy",
    caption:
      "Jeune floral — suggestions ou commande.",
    similarCatalogIds: [11, 21, 12],
  },
  ...EXTERNAL_HINTS_EXTRA,
];
