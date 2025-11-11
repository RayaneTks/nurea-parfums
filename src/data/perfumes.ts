export interface Perfume {
  id: string;
  name: string;
  brand: string;
  category: string;
  tags?: string[];
  price?: string;
  availableSizes?: number[];
}

export interface Brand {
  id: string;
  name: string;
  category: string;
  fullRange: boolean; // true si toute la gamme est disponible
}

export const defaultSizes = [30, 50, 100];
export const allSizes = [25, 30, 35, 40, 50, 60, 80, 100, 120];

// Parfums individuels
export const perfumes: Perfume[] = [
  // Creed
  { id: "creed-aventus", name: "Aventus", brand: "Creed", category: "Niche", tags: ["Best-seller"] },

  // Tiziana Terenzi
  { id: "kirke", name: "Kirke", brand: "Tiziana Terenzi", category: "Niche" },

  // Gucci
  { id: "gucci-oud", name: "Oud Intense", brand: "Gucci", category: "Grands classiques" },

  // Carolina Herrera
  { id: "bad-boy", name: "Bad Boy", brand: "Carolina Herrera", category: "Grands classiques" },

  // Maison Francis Kurkdjian
  { id: "baccarat-rouge", name: "Baccarat Rouge 540", brand: "Maison Francis Kurkdjian", category: "Niche", tags: ["Best-seller"] },
  { id: "grand-soir", name: "Grand Soir", brand: "Maison Francis Kurkdjian", category: "Niche" },

  // Tom Ford
  { id: "tf-velvet-orchid", name: "Velvet Orchid", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-tobacco-vanille", name: "Tobacco Vanille", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée", "Best-seller"] },
  { id: "tf-vanille-fatale", name: "Vanille Fatale", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-soleil-blanc", name: "Soleil Blanc", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-cafe-rose", name: "Café Rose", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-neroli", name: "Neroli Portofino", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-soleil-neige", name: "Soleil Neige", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-bitter-peach", name: "Bitter Peach", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },
  { id: "tf-black-orchid", name: "Black Orchid", brand: "Tom Ford", category: "Tom Ford", tags: ["Collection privée"] },

  // Franck Olivier
  { id: "oud-touch", name: "Oud Touch", brand: "Franck Olivier", category: "Autres" },
  { id: "eau-passion", name: "Eau Passion", brand: "Franck Olivier", category: "Autres" },
  { id: "sun-java-black", name: "Sun Java Black", brand: "Franck Olivier", category: "Autres" },
  { id: "sun-java-white", name: "Sun Java White", brand: "Franck Olivier", category: "Autres" },

  // Cartier
  { id: "declaration", name: "Déclaration", brand: "Cartier", category: "Cartier" },
  { id: "pasha", name: "Pasha", brand: "Cartier", category: "Cartier" },
  { id: "carat", name: "Carat", brand: "Cartier", category: "Cartier" },
  { id: "la-panthere", name: "La Panthère", brand: "Cartier", category: "Cartier" },

  // Versace
  { id: "eros", name: "Eros", brand: "Versace", category: "Grands classiques", tags: ["Best-seller"] },
  { id: "dylan-blue", name: "Dylan Blue", brand: "Versace", category: "Grands classiques" },
  { id: "the-dreamer", name: "The Dreamer", brand: "Versace", category: "Grands classiques" },
  { id: "blue-jeans", name: "Blue Jeans", brand: "Versace", category: "Grands classiques" },

  // Ralph Lauren
  { id: "polo-red", name: "Polo Red Intense", brand: "Ralph Lauren", category: "Grands classiques" },

  // Viktor & Rolf
  { id: "spicebomb", name: "Spicebomb", brand: "Viktor & Rolf", category: "Grands classiques" },

  // Guess
  { id: "bleu-seduction", name: "Bleu Séduction", brand: "Guess", category: "Autres" },

  // Louis Vuitton
  { id: "lv-symphony", name: "Symphony", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-immensite", name: "L'Immensité", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-afternoon", name: "Afternoon Swim", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-route", name: "Sur la Route", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-contre-moi", name: "Contre Moi", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-mille-feux", name: "Mille Feux", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },
  { id: "lv-nuit-feu", name: "Nuit de Feu", brand: "Louis Vuitton", category: "Louis Vuitton", tags: ["Collection privée"] },

  // Zara
  { id: "zara-tobacco", name: "Tobacco", brand: "Zara", category: "Autres" },

  // Sospiro
  { id: "erba-pura", name: "Erba Pura", brand: "Sospiro", category: "Niche" },
  { id: "erba-gold", name: "Erba Gold", brand: "Sospiro", category: "Niche" },

  // Yves Saint Laurent
  { id: "myslf", name: "MYSLF", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "y-ysl", name: "Y", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "y-elixir", name: "Y Elixir", brand: "Yves Saint Laurent", category: "Grands classiques" },
  { id: "la-nuit", name: "La Nuit de l'Homme", brand: "Yves Saint Laurent", category: "Grands classiques", tags: ["Best-seller"] },

  // Nishane (sélection)
  { id: "nishane-hacivat", name: "Hacivat", brand: "Nishane", category: "Niche" },

  // Orto Parisi
  { id: "orto-parisi", name: "Megamare", brand: "Orto Parisi", category: "Niche" },

  // Hermès (sélection)
  { id: "terre-hermes", name: "Terre d'Hermès", brand: "Hermès", category: "Grands classiques" },
];

// Marques avec toute la gamme disponible
export const fullRangeBrands: Brand[] = [
  { id: "rabanne", name: "Rabanne", category: "Grands classiques", fullRange: true },
  { id: "dolce-gabbana", name: "Dolce & Gabbana", category: "Grands classiques", fullRange: true },
  { id: "jean-paul-gaultier", name: "Jean Paul Gaultier", category: "Grands classiques", fullRange: true },
  { id: "azzaro", name: "Azzaro", category: "Grands classiques", fullRange: true },
  { id: "lacoste", name: "Lacoste", category: "Grands classiques", fullRange: true },
  { id: "guerlain", name: "Guerlain", category: "Grands classiques", fullRange: true },
  { id: "dior", name: "Dior", category: "Grands classiques", fullRange: true },
  { id: "armani", name: "Armani", category: "Grands classiques", fullRange: true },
  { id: "hugo-boss", name: "Hugo Boss", category: "Grands classiques", fullRange: true },
  { id: "xerjoff", name: "Xerjoff", category: "Niche", fullRange: true },
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

// Liste de toutes les marques (parfums individuels + marques complètes)
export const allBrands = [
  "Tous",
  ...new Set([
    ...perfumes.map(p => p.brand),
    ...fullRangeBrands.map(b => b.name)
  ])
].sort((a, b) => a === "Tous" ? -1 : b === "Tous" ? 1 : a.localeCompare(b));
