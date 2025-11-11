import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeDrawer } from "./PerfumeDrawer";
import { BrandCard } from "./BrandCard";
import { perfumes, fullRangeBrands, categories, allBrands, Perfume, Brand } from "@/data/perfumes";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export const Catalogue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedBrand, setSelectedBrand] = useState("Tous");
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <section id="catalogue" className="min-h-screen bg-background py-12 md:py-20 border-t border-border/20">
      <div className="container max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        {/* Titre principal */}
        <div className="mb-10 md:mb-14 text-center">
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-foreground tracking-tight mb-3 font-light">
            Catalogue
          </h2>
        </div>

        {/* Barre de recherche premium */}
        <div className="mb-10 max-w-3xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary/70 transition-colors duration-300" />
            <input
              type="text"
              placeholder="Rechercher un parfum ou une marque"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 md:h-16 pl-14 pr-14 bg-background/50 border-b-2 border-border/30 text-foreground placeholder:text-muted-foreground/40 text-base focus:outline-none focus:border-primary/50 transition-all duration-300 font-light"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-12 space-y-4">
          {/* Filtres Catégories */}
          <div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-6 py-3 whitespace-nowrap text-sm font-light uppercase tracking-wider
                    transition-all duration-300 border-b-2 border-transparent
                    ${
                      selectedCategory === category
                        ? "text-foreground border-primary/50"
                        : "text-muted-foreground/50 hover:text-foreground/80 hover:border-primary/20"
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres Marques */}
          <div>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
              {allBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`
                    px-4 py-2 whitespace-nowrap text-xs font-light tracking-wide
                    transition-all duration-300 border border-transparent rounded-sm
                    ${
                      selectedBrand === brand
                        ? "text-foreground border-primary/30 bg-primary/5"
                        : "text-muted-foreground/40 hover:text-foreground/70 hover:border-primary/10 bg-background/30"
                    }
                  `}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultats ou message d'absence */}
        {showNoResults ? (
          <div className="text-center py-24 px-4">
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              Ce parfum ne figure pas encore dans notre catalogue en ligne. Contactez-nous sur Snapchat ou WhatsApp : 
              il se peut qu'il soit disponible ou arrive prochainement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Button
                size="lg"
                onClick={openSnapchat}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
              >
                <SnapchatIcon className="h-5 w-5" />
                Snapchat
              </Button>
              <Button
                size="lg"
                onClick={openWhatsApp}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
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
              <div className="mb-16 md:mb-20">
                <div className="mb-8 md:mb-10">
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground/90 mb-2 uppercase tracking-wider font-light">
                    Marques
                  </h3>
                  <p className="text-sm text-muted-foreground/50 font-light">
                    Gamme complète disponible
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                  {filteredBrands.map((brand) => (
                    <BrandCard 
                      key={brand.id} 
                      brand={brand}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Parfums individuels */}
            {filteredPerfumes.length > 0 && (
              <div>
                {filteredBrands.length > 0 && (
                  <div className="mb-8 md:mb-10">
                    <h3 className="font-serif text-2xl md:text-3xl text-foreground/90 mb-2 uppercase tracking-wider font-light">
                      Parfums
                    </h3>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
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

      <PerfumeDrawer
        perfume={selectedPerfume}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </section>
  );
};
