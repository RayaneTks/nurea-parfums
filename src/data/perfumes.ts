export interface Perfume {
  id: string;
  name: string;
  brand: string;
  category: string;
  tags?: string[];
  price?: string;
  availableSizes?: number[];
}

export const defaultSizes = [30, 50, 100];
export const allSizes = [25, 30, 35, 40, 50, 60, 80, 100, 120];

export const perfumes: Perfume[] = [
  // Grands classiques & best-sellers - Dior (toute la gamme)
  { id: "sauvage", name: "Sauvage", brand: "Dior", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "sauvage-elixir", name: "Sauvage Elixir", brand: "Dior", category: "Grands classiques" },
  { id: "dior-homme", name: "Dior Homme", brand: "Dior", category: "Grands classiques" },
  { id: "dior-homme-intense", name: "Dior Homme Intense", brand: "Dior", category: "Grands classiques" },
  { id: "fahrenheit", name: "Fahrenheit", brand: "Dior", category: "Grands classiques" },
  { id: "miss-dior", name: "Miss Dior", brand: "Dior", category: "Grands classiques" },
  { id: "jadore", name: "J'adore", brand: "Dior", category: "Grands classiques" },
  { id: "poison", name: "Poison", brand: "Dior", category: "Grands classiques" },
  { id: "pure-poison", name: "Pure Poison", brand: "Dior", category: "Grands classiques" },
  { id: "hypnotic-poison", name: "Hypnotic Poison", brand: "Dior", category: "Grands classiques" },

  // Grands classiques & best-sellers - Armani (toute la gamme)
  { id: "acqua-di-gio", name: "Acqua Di Giò", brand: "Armani", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "acqua-di-gio-profumo", name: "Acqua Di Giò Profumo", brand: "Armani", category: "Grands classiques" },
  { id: "code", name: "Code", brand: "Armani", category: "Grands classiques" },
  { id: "code-absolu", name: "Code Absolu", brand: "Armani", category: "Grands classiques" },
  { id: "stronger-with-you", name: "Stronger With You", brand: "Armani", category: "Grands classiques" },
  { id: "stronger-with-you-intensely", name: "Stronger With You Intensely", brand: "Armani", category: "Grands classiques" },
  { id: "si", name: "Sì", brand: "Armani", category: "Grands classiques" },
  { id: "si-intense", name: "Sì Intense", brand: "Armani", category: "Grands classiques" },
  { id: "giorgio-armani", name: "Giorgio Armani", brand: "Armani", category: "Grands classiques" },
  { id: "emporio-armani", name: "Emporio Armani", brand: "Armani", category: "Grands classiques" },

  // Grands classiques & best-sellers - Rabanne (toute la gamme)
  { id: "one-million", name: "1 Million", brand: "Rabanne", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "one-million-lucky", name: "1 Million Lucky", brand: "Rabanne", category: "Grands classiques" },
  { id: "one-million-privé", name: "1 Million Privé", brand: "Rabanne", category: "Grands classiques" },
  { id: "invictus", name: "Invictus", brand: "Rabanne", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "invictus-victory", name: "Invictus Victory", brand: "Rabanne", category: "Grands classiques" },
  { id: "phantom", name: "Phantom", brand: "Rabanne", category: "Grands classiques" },
  { id: "lady-million", name: "Lady Million", brand: "Rabanne", category: "Grands classiques" },
  { id: "ultra-violet", name: "Ultra Violet", brand: "Rabanne", category: "Grands classiques" },
  { id: "calandre", name: "Calandre", brand: "Rabanne", category: "Grands classiques" },

  // Grands classiques & best-sellers - Dolce & Gabbana (toute la gamme)
  { id: "light-blue", name: "Light Blue", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "light-blue-intense", name: "Light Blue Intense", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "the-one", name: "The One", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "the-one-intense", name: "The One Intense", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "k-dg", name: "K", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "k-edp", name: "K Eau de Parfum", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "intense", name: "Intense", brand: "Dolce & Gabbana", category: "Grands classiques" },
  { id: "pour-homme", name: "Pour Homme", brand: "Dolce & Gabbana", category: "Grands classiques" },

  // Grands classiques & best-sellers - Jean Paul Gaultier (toute la gamme)
  { id: "le-male", name: "Le Male", brand: "Jean Paul Gaultier", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "le-male-le-parfum", name: "Le Male Le Parfum", brand: "Jean Paul Gaultier", category: "Grands classiques" },
  { id: "scandal", name: "Scandal", brand: "Jean Paul Gaultier", category: "Grands classiques" },
  { id: "scandal-pour-homme", name: "Scandal Pour Homme", brand: "Jean Paul Gaultier", category: "Grands classiques" },
  { id: "classique", name: "Classique", brand: "Jean Paul Gaultier", category: "Grands classiques" },
  { id: "ultra-male", name: "Ultra Male", brand: "Jean Paul Gaultier", category: "Grands classiques" },

  // Grands classiques & best-sellers - Azzaro (toute la gamme)
  { id: "wanted", name: "Wanted", brand: "Azzaro", category: "Grands classiques" },
  { id: "wanted-by-night", name: "Wanted By Night", brand: "Azzaro", category: "Grands classiques" },
  { id: "azzaro-chrome", name: "Chrome", brand: "Azzaro", category: "Grands classiques" },
  { id: "chrome-extreme", name: "Chrome Extreme", brand: "Azzaro", category: "Grands classiques" },
  { id: "pour-homme-azzaro", name: "Pour Homme", brand: "Azzaro", category: "Grands classiques" },
  { id: "most-wanted", name: "Most Wanted", brand: "Azzaro", category: "Grands classiques" },

  // Grands classiques & best-sellers - Hugo Boss (toute la gamme)
  { id: "bottled", name: "Bottled", brand: "Hugo Boss", category: "Grands classiques" },
  { id: "bottled-intense", name: "Bottled Intense", brand: "Hugo Boss", category: "Grands classiques" },
  { id: "the-scent", name: "The Scent", brand: "Hugo Boss", category: "Grands classiques" },
  { id: "the-scent-absolute", name: "The Scent Absolute", brand: "Hugo Boss", category: "Grands classiques" },
  { id: "hugo", name: "Hugo", brand: "Hugo Boss", category: "Grands classiques" },
  { id: "hugo-red", name: "Hugo Red", brand: "Hugo Boss", category: "Grands classiques" },

  // Grands classiques & best-sellers - Lacoste (toute la gamme)
  { id: "blanc", name: "L'Homme Blanc", brand: "Lacoste", category: "Grands classiques" },
  { id: "rouge", name: "L'Homme Rouge", brand: "Lacoste", category: "Grands classiques" },
  { id: "lacoste-essential", name: "Essential", brand: "Lacoste", category: "Grands classiques" },
  { id: "lacoste-live", name: "L.12.12", brand: "Lacoste", category: "Grands classiques" },
  { id: "lacoste-pour-homme", name: "Pour Homme", brand: "Lacoste", category: "Grands classiques" },

  // Grands classiques & best-sellers - Guerlain (toute la gamme)
  { id: "homme-ideal", name: "L'Homme Idéal", brand: "Guerlain", category: "Grands classiques" },
  { id: "homme-ideal-intense", name: "L'Homme Idéal Intense", brand: "Guerlain", category: "Grands classiques" },
  { id: "shalimar", name: "Shalimar", brand: "Guerlain", category: "Grands classiques" },
  { id: "shalimar-souffle", name: "Shalimar Souffle", brand: "Guerlain", category: "Grands classiques" },
  { id: "samsara", name: "Samsara", brand: "Guerlain", category: "Grands classiques" },
  { id: "vetiver", name: "Vetiver", brand: "Guerlain", category: "Grands classiques" },
  { id: "habit-rouge", name: "Habit Rouge", brand: "Guerlain", category: "Grands classiques" },

  // Grands classiques & best-sellers - Hermès
  { id: "terre-hermes", name: "Terre d'Hermès", brand: "Hermès", category: "Grands classiques" },
  { id: "terre-hermes-eau-intense", name: "Terre d'Hermès Eau Intense Vétiver", brand: "Hermès", category: "Grands classiques" },
  { id: "voyage", name: "Voyage d'Hermès", brand: "Hermès", category: "Grands classiques" },
  { id: "un-jardin", name: "Un Jardin sur le Nil", brand: "Hermès", category: "Grands classiques" },
  { id: "twilly", name: "Twilly d'Hermès", brand: "Hermès", category: "Grands classiques" },
  { id: "h24", name: "H24", brand: "Hermès", category: "Grands classiques" },

  // Grands classiques & best-sellers - Yves Saint Laurent
  { id: "y-ysl", name: "Y", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "y-edp", name: "Y Eau de Parfum", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "y-elixir", name: "Y Elixir", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "la-nuit", name: "La Nuit de l'Homme", brand: "Yves Saint Laurent", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "la-nuit-bleu", name: "La Nuit de l'Homme Bleu Électrique", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "myslf", name: "MYSLF", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "libre", name: "Libre", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "libre-intense", name: "Libre Intense", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "opium", name: "Opium", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "opium-homme", name: "Opium Pour Homme", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "kouros", name: "Kouros", brand: "Yves Saint Laurent", category: "Grands classiques" },

  // Grands classiques & best-sellers - Versace
  { id: "eros", name: "Eros", brand: "Versace", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "eros-flame", name: "Eros Flame", brand: "Versace", category: "Grands classiques" },
  { id: "dylan-blue", name: "Dylan Blue", brand: "Versace", category: "Grands classiques" },
  { id: "the-dreamer", name: "The Dreamer", brand: "Versace", category: "Grands classiques" },
  { id: "blue-jeans", name: "Blue Jeans", brand: "Versace", category: "Grands classiques" },
  { id: "bright-crystal", name: "Bright Crystal", brand: "Versace", category: "Grands classiques" },
  { id: "pour-homme-versace", name: "Pour Homme", brand: "Versace", category: "Grands classiques" },
  { id: "man", name: "Man", brand: "Versace", category: "Grands classiques" },

  // Grands classiques & best-sellers - Autres grandes marques grand public
  { id: "polo-red", name: "Polo Red Intense", brand: "Ralph Lauren", category: "Grands classiques" },
  { id: "polo-blue", name: "Polo Blue", brand: "Ralph Lauren", category: "Grands classiques" },
  { id: "spicebomb", name: "Spicebomb", brand: "Viktor & Rolf", category: "Grands classiques" },
  { id: "spicebomb-extreme", name: "Spicebomb Extreme", brand: "Viktor & Rolf", category: "Grands classiques" },
  { id: "bad-boy", name: "Bad Boy", brand: "Carolina Herrera", category: "Grands classiques" },
  { id: "212", name: "212", brand: "Carolina Herrera", category: "Grands classiques" },
  { id: "gucci-oud", name: "Oud Intense", brand: "Gucci", category: "Grands classiques" },
  { id: "gucci-bloom", name: "Bloom", brand: "Gucci", category: "Grands classiques" },
  { id: "gucci-guilty", name: "Guilty", brand: "Gucci", category: "Grands classiques" },

  // Louis Vuitton
  { id: "lv-symphony", name: "Symphony", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-immensite", name: "L'Immensité", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-afternoon", name: "Afternoon Swim", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-route", name: "Sur la Route", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-contre-moi", name: "Contre Moi", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-mille-feux", name: "Mille Feux", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-nuit-feu", name: "Nuit de Feu", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },

  // Parfums de niche & haute parfumerie - Creed
  { id: "creed-aventus", name: "Aventus", brand: "Creed", category: "Niche", tags: ["Best-seller"] },
  { id: "creed-aventus-cologne", name: "Aventus Cologne", brand: "Creed", category: "Niche" },
  { id: "creed-silver-mountain", name: "Silver Mountain Water", brand: "Creed", category: "Niche" },
  { id: "creed-green-irish", name: "Green Irish Tweed", brand: "Creed", category: "Niche" },
  { id: "creed-millesime", name: "Millesime Imperial", brand: "Creed", category: "Niche" },

  // Parfums de niche & haute parfumerie - Maison Francis Kurkdjian
  { id: "baccarat-rouge", name: "Baccarat Rouge 540", brand: "Maison Francis Kurkdjian", category: "Niche", tags: ["Best-seller"] },
  { id: "baccarat-rouge-extrait", name: "Baccarat Rouge 540 Extrait", brand: "Maison Francis Kurkdjian", category: "Niche" },
  { id: "grand-soir", name: "Grand Soir", brand: "Maison Francis Kurkdjian", category: "Niche" },
  { id: "mfk-oud", name: "Oud Satin Mood", brand: "Maison Francis Kurkdjian", category: "Niche" },
  { id: "mfk-aqua", name: "Aqua Universalis", brand: "Maison Francis Kurkdjian", category: "Niche" },

  // Parfums de niche & haute parfumerie - Sospiro
  { id: "erba-pura", name: "Erba Pura", brand: "Sospiro", category: "Niche" },
  { id: "erba-gold", name: "Erba Gold", brand: "Sospiro", category: "Niche" },
  { id: "sospiro-vibrato", name: "Vibrato", brand: "Sospiro", category: "Niche" },

  // Parfums de niche & haute parfumerie - Tiziana Terenzi
  { id: "kirke", name: "Kirke", brand: "Tiziana Terenzi", category: "Niche" },
  { id: "tt-spirito", name: "Spirito Fiorentino", brand: "Tiziana Terenzi", category: "Niche" },
  { id: "tt-porpora", name: "Porpora", brand: "Tiziana Terenzi", category: "Niche" },

  // Parfums de niche & haute parfumerie - Nishane (sélection de la gamme)
  { id: "nishane-hacivat", name: "Hacivat", brand: "Nishane", category: "Niche" },
  { id: "nishane-anı", name: "Anı", brand: "Nishane", category: "Niche" },
  { id: "nishane-wulong", name: "Wulong Cha", brand: "Nishane", category: "Niche" },
  { id: "nishane-fan", name: "Fan Your Flames", brand: "Nishane", category: "Niche" },
  { id: "nishane-hundred", name: "Hundred Silent Ways", brand: "Nishane", category: "Niche" },

  // Parfums de niche & haute parfumerie - Xerjoff (toute la gamme)
  { id: "xerjoff-naxos", name: "Naxos", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-erba-pura", name: "Erba Pura", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-accento", name: "Accento", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-40knots", name: "40 Knots", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-casamorati", name: "Casamorati 1888", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-dama", name: "Dama Bianca", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-irisss", name: "Irisss", brand: "Xerjoff", category: "Niche" },
  { id: "xerjoff-starlight", name: "Starlight", brand: "Xerjoff", category: "Niche" },

  // Parfums de niche & haute parfumerie - Orto Parisi
  { id: "orto-parisi", name: "Megamare", brand: "Orto Parisi", category: "Niche" },
  { id: "orto-terroni", name: "Terroni", brand: "Orto Parisi", category: "Niche" },
  { id: "orto-viride", name: "Viride", brand: "Orto Parisi", category: "Niche" },
  { id: "orto-bergamask", name: "Bergamask", brand: "Orto Parisi", category: "Niche" },
  { id: "orto-seminalis", name: "Seminalis", brand: "Orto Parisi", category: "Niche" },

  // Tom Ford (Collection privée)
  { id: "tf-black-orchid", name: "Black Orchid", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-velvet-orchid", name: "Velvet Orchid", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-tobacco-vanille", name: "Tobacco Vanille", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée", "Best-seller"] },
  { id: "tf-vanille-fatale", name: "Vanille Fatale", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-soleil-blanc", name: "Soleil Blanc", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-soleil-neige", name: "Soleil Neige", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-cafe-rose", name: "Café Rose", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-neroli", name: "Neroli Portofino", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-bitter-peach", name: "Bitter Peach", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-ombre-leather", name: "Ombré Leather", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-oud-wood", name: "Oud Wood", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-fucking-fabulous", name: "Fucking Fabulous", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },

  // Autres références
  { id: "zara-tobacco", name: "Tobacco", brand: "Zara", category: "Autres" },
  { id: "zara-rich", name: "Rich Warm Addictive", brand: "Zara", category: "Autres" },
  { id: "bleu-seduction", name: "Bleu Séduction", brand: "Guess", category: "Autres" },
  { id: "oud-touch", name: "Oud Touch", brand: "Franck Olivier", category: "Autres" },
  { id: "eau-passion", name: "Eau Passion", brand: "Franck Olivier", category: "Autres" },
  { id: "sun-java-black", name: "Sun Java Black", brand: "Franck Olivier", category: "Autres" },
  { id: "sun-java-white", name: "Sun Java White", brand: "Franck Olivier", category: "Autres" },

  // Cartier
  { id: "declaration", name: "Déclaration", brand: "Cartier", category: "Cartier" },
  { id: "declaration-dun-soir", name: "Déclaration d'Un Soir", brand: "Cartier", category: "Cartier" },
  { id: "pasha", name: "Pasha", brand: "Cartier", category: "Cartier" },
  { id: "pasha-de-cartier", name: "Pasha de Cartier", brand: "Cartier", category: "Cartier" },
  { id: "carat", name: "Carat", brand: "Cartier", category: "Cartier" },
  { id: "la-panthere", name: "La Panthère", brand: "Cartier", category: "Cartier" },
  { id: "santos", name: "Santos", brand: "Cartier", category: "Cartier" },
  { id: "roadster", name: "Roadster", brand: "Cartier", category: "Cartier" },
];

export const categories = [
  "Tous",
  "Grands classiques",
  "Louis Vuitton",
  "Tom Ford",
  "Niche",
  "Cartier",
  "Autres"
];

export const brands = [
  "Tous",
  "Dior",
  "Armani",
  "Rabanne",
  "Dolce & Gabbana",
  "Jean Paul Gaultier",
  "Azzaro",
  "Hugo Boss",
  "Lacoste",
  "Guerlain",
  "Hermès",
  "Yves Saint Laurent",
  "Versace",
  "Ralph Lauren",
  "Viktor & Rolf",
  "Carolina Herrera",
  "Gucci",
  "Louis Vuitton",
  "Tom Ford",
  "Creed",
  "Maison Francis Kurkdjian",
  "Sospiro",
  "Tiziana Terenzi",
  "Nishane",
  "Xerjoff",
  "Orto Parisi",
  "Zara",
  "Guess",
  "Franck Olivier",
  "Cartier"
];
