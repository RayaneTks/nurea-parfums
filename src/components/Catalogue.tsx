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
    <section id="catalogue" className="min-h-screen bg-background py-20 md:py-28 border-t border-border/10">
      <div className="container max-w-7xl mx-auto px-4 md:px-8">
        {/* Titre principal */}
        <div className="mb-12 md:mb-16 text-center">
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-foreground tracking-tight mb-4 font-light">
            Catalogue
          </h2>
        </div>

        {/* Barre de recherche premium */}
        <div className="mb-10 max-w-3xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary/70 transition-colors duration-300" />
            <input
              type="text"
              placeholder="Rechercher un parfum ou une marque"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-12 bg-background/50 border-b border-border/30 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-primary/40 transition-all duration-300 font-light"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtres Catégories */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-5 py-2 whitespace-nowrap text-xs font-light uppercase tracking-[0.15em]
                  transition-all duration-300 border-b border-transparent
                  ${
                    selectedCategory === category
                      ? "text-primary border-primary"
                      : "text-muted-foreground/50 hover:text-foreground/70 hover:border-primary/20"
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres Marques */}
        <div className="mb-12">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {allBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`
                  px-4 py-1.5 whitespace-nowrap text-xs font-light tracking-wide
                  transition-all duration-300
                  ${
                    selectedBrand === brand
                      ? "text-primary border-b border-primary"
                      : "text-muted-foreground/40 hover:text-foreground/60"
                  }
                `}
              >
                {brand}
              </button>
            ))}
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
              <div className="mb-20">
                <h3 className="font-serif text-xl md:text-2xl text-foreground/90 mb-10 uppercase tracking-[0.15em] font-light border-b border-border/20 pb-4">
                  Marques - Gamme complète
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
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
                  <h3 className="font-serif text-xl md:text-2xl text-foreground/90 mb-10 uppercase tracking-[0.15em] font-light border-b border-border/20 pb-4">
                    Parfums
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
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
