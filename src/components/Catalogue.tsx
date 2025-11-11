import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeDrawer } from "./PerfumeDrawer";
import { BrandCard } from "./BrandCard";
import { BrandDrawer } from "./BrandDrawer";
import { perfumes, fullRangeBrands, categories, allBrands, Perfume, Brand } from "@/data/perfumes";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export const Catalogue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedBrand, setSelectedBrand] = useState("Tous");
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [selectedBrandDrawer, setSelectedBrandDrawer] = useState<Brand | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);

  const filteredPerfumes = useMemo(() => {
    return perfumes.filter((perfume) => {
      const matchesSearch =
        perfume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perfume.brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        selectedCategory === "Tous" || perfume.category === selectedCategory;
      
      const matchesBrand =
        selectedBrand === "Tous" || perfume.brand === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [searchTerm, selectedCategory, selectedBrand]);

  const filteredBrands = useMemo(() => {
    return fullRangeBrands.filter((brand) => {
      const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Tous" || brand.category === selectedCategory;
      const matchesBrand = selectedBrand === "Tous" || brand.name === selectedBrand;
      
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [searchTerm, selectedCategory, selectedBrand]);

  const showNoResults = searchTerm && filteredPerfumes.length === 0 && filteredBrands.length === 0;

  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  const handlePerfumeClick = (perfume: Perfume) => {
    setSelectedPerfume(perfume);
    setDrawerOpen(true);
  };

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrandDrawer(brand);
    setBrandDrawerOpen(true);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <section id="catalogue" className="min-h-screen bg-background border-t border-border/10">
      <div className="w-full">
        {/* Navbar de filtres style Dior */}
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
          <div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            {/* Barre de recherche intégrée */}
            <div className="py-4 border-b border-border/10">
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-foreground/70 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Rechercher un parfum ou une marque"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-12 pr-12 bg-transparent border-b border-border/20 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-foreground/40 transition-all duration-300 font-light"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation horizontale style Dior */}
            <nav className="flex items-center justify-center gap-8 md:gap-12 py-4 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory("Tous");
                  setSelectedBrand("Tous");
                }}
                className={`
                  whitespace-nowrap text-sm font-light tracking-wide
                  transition-all duration-300 border-b-2 border-transparent pb-2
                  ${
                    selectedCategory === "Tous" && selectedBrand === "Tous"
                      ? "text-foreground border-foreground"
                      : "text-muted-foreground/60 hover:text-foreground/80 hover:border-foreground/30"
                  }
                `}
              >
                Voir Tout
              </button>
              {categories.filter(cat => cat !== "Tous").map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedBrand("Tous");
                  }}
                  className={`
                    whitespace-nowrap text-sm font-light tracking-wide
                    transition-all duration-300 border-b-2 border-transparent pb-2
                    ${
                      selectedCategory === category
                        ? "text-foreground border-foreground"
                        : "text-muted-foreground/60 hover:text-foreground/80 hover:border-foreground/30"
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </nav>

            {/* Filtres marques (optionnel, affiché si besoin) */}
            {selectedCategory !== "Tous" && (
              <div className="pb-4 border-b border-border/10">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {allBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      className={`
                        px-4 py-1.5 whitespace-nowrap text-xs font-light tracking-wide
                        transition-all duration-300 border border-transparent rounded-full
                        ${
                          selectedBrand === brand
                            ? "text-foreground border-foreground/30 bg-foreground/5"
                            : "text-muted-foreground/50 hover:text-foreground/70 hover:border-foreground/20"
                        }
                      `}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contenu principal - Style Dior avec images grandes */}
        <div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
          {showNoResults ? (
            <div className="text-center py-24 px-4">
              <p className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                Ce parfum ne figure pas encore dans notre catalogue en ligne. Contactez-nous sur Snapchat ou WhatsApp : 
                il se peut qu'il soit disponible ou arrive prochainement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Button
                  size="lg"
                  onClick={openSnapchat}
                  className="bg-[#FFFC00] hover:bg-[#FFFC00]/90 text-background h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
                >
                  <SnapchatIcon className="h-5 w-5" />
                  Snapchat
                </Button>
                <Button
                  size="lg"
                  onClick={openWhatsApp}
                  className="bg-[#25D366] hover:bg-[#25D366]/90 text-white h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Marques complètes */}
              {filteredBrands.length > 0 && (
                <div className="mb-20 md:mb-24">
                  <div className="mb-10 text-center">
                    <h3 className="font-serif text-xl md:text-2xl text-foreground/80 mb-2 uppercase tracking-wider font-light">
                      Marques - Gamme complète
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 lg:gap-10">
                    {filteredBrands.map((brand) => (
                      <BrandCard 
                        key={brand.id} 
                        brand={brand}
                        onClick={() => handleBrandClick(brand)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Parfums individuels - Layout style Dior */}
              {filteredPerfumes.length > 0 && (
                <div>
                  {filteredBrands.length > 0 && (
                    <div className="mb-10 text-center">
                      <h3 className="font-serif text-xl md:text-2xl text-foreground/80 mb-2 uppercase tracking-wider font-light">
                        Parfums
                      </h3>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 lg:gap-10">
                    {filteredPerfumes.map((perfume) => (
                      <PerfumeCard 
                        key={perfume.id} 
                        perfume={perfume}
                        onClick={() => handlePerfumeClick(perfume)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PerfumeDrawer
        perfume={selectedPerfume}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <BrandDrawer
        brand={selectedBrandDrawer}
        open={brandDrawerOpen}
        onOpenChange={setBrandDrawerOpen}
      />
    </section>
  );
};
