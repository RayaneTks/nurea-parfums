import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeDrawer } from "./PerfumeDrawer";
import { BrandCard } from "./BrandCard";
import { BrandDrawer } from "./BrandDrawer";
import { perfumes, fullRangeBrands, categories, allBrands, Perfume, Brand } from "@/data/perfumes";
import { contactConfig } from "@/config/contact";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

interface CatalogueProps {
  onFilterButtonClick?: (openFilter: () => void) => void;
  onFiltersChange?: (hasFilters: boolean) => void;
  onFiltersCountChange?: (count: number) => void;
}

export const Catalogue = ({ onFilterButtonClick, onFiltersChange, onFiltersCountChange }: CatalogueProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedBrand, setSelectedBrand] = useState("Tous");
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [selectedBrandDrawer, setSelectedBrandDrawer] = useState<Brand | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const handleDetailsToggle = (perfumeId: string) => {
    setOpenDetailsId(prev => prev === perfumeId ? null : perfumeId);
  };

  // Fonction wrapper stable qui toggle toujours l'état actuel
  const toggleMobileFilters = useCallback(() => {
    setMobileFiltersOpen((prev) => !prev);
  }, []);

  // Exposer la fonction pour toggle le menu de filtres
  useEffect(() => {
    if (onFilterButtonClick) {
      // Créer une fonction wrapper qui appelle toujours setMobileFiltersOpen avec le toggle
      const wrapperFn = () => {
        setMobileFiltersOpen((prev) => !prev);
      };
      onFilterButtonClick(wrapperFn);
    }
  }, [onFilterButtonClick]);

  // Notifier les changements de filtres et compter le nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    return [
      searchTerm && "1",
      selectedCategory !== "Tous" && "1",
      selectedBrand !== "Tous" && "1"
    ].filter(Boolean).length;
  }, [selectedCategory, selectedBrand, searchTerm]);

  useEffect(() => {
    if (onFiltersChange) {
      const hasFilters = activeFiltersCount > 0;
      onFiltersChange(hasFilters);
    }
    if (onFiltersCountChange) {
      onFiltersCountChange(activeFiltersCount);
    }
  }, [activeFiltersCount, onFiltersChange, onFiltersCountChange]);

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
    // Sur mobile, naviguer vers la page produit détaillée
    if (isMobile) {
      const brand = encodeURIComponent(perfume.brand);
      const name = encodeURIComponent(perfume.name);
      navigate(`/parfums/${brand}/${name}`);
    } else {
      // Sur desktop, ouvrir le drawer
      setSelectedPerfume(perfume);
      setDrawerOpen(true);
    }
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
        {/* Navbar de filtres - Version Desktop */}
        {!isMobile && (
          <div className="sticky top-[56px] md:top-[64px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
              {/* Barre de recherche améliorée */}
              <div className="py-5 border-b border-border/10">
                <div className="max-w-[600px] mx-auto px-4">
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors duration-300 z-10" />
                    <input
                      type="text"
                      placeholder="Rechercher un parfum ou une marque"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-12 pl-12 pr-12 rounded-full bg-background/5 border border-primary/30 text-foreground placeholder:text-muted-foreground/40 text-base focus:outline-none focus:border-primary focus:bg-background/8 focus:shadow-[0_0_0_3px_rgba(183,148,90,0.1)] transition-all duration-300 font-light"
                    />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground/70 transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation horizontale scrollable */}
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent relative">
                <nav className="flex items-center gap-3 py-4 min-w-min px-4">
                  <button
                    onClick={() => {
                      setSelectedCategory("Tous");
                      setSelectedBrand("Tous");
                    }}
                    className={`
                      flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium
                      transition-all duration-300 whitespace-nowrap
                      border min-h-[44px]
                      ${
                        selectedCategory === "Tous" && selectedBrand === "Tous"
                          ? "bg-primary text-background border-primary"
                          : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                      }
                      focus:outline-2 focus:outline-primary focus:outline-offset-2
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
                        flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium
                        transition-all duration-300 whitespace-nowrap
                        border min-h-[44px]
                        ${
                          selectedCategory === category
                            ? "bg-primary text-background border-primary"
                            : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                        }
                        focus:outline-2 focus:outline-primary focus:outline-offset-2
                      `}
                    >
                      {category}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Filtres marques (optionnel, affiché si besoin) */}
              {selectedCategory !== "Tous" && (
                <div className="pb-4 border-b border-border/10">
                  <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent relative">
                    <div className="flex gap-3 min-w-min px-4">
                      {allBrands.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => setSelectedBrand(brand)}
                          className={`
                            flex-shrink-0 px-4 py-2 whitespace-nowrap text-xs font-medium
                            transition-all duration-300 border rounded-full min-h-[44px]
                            ${
                              selectedBrand === brand
                                ? "bg-primary text-background border-primary"
                                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                            }
                            focus:outline-2 focus:outline-primary focus:outline-offset-2
                          `}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        

        {/* Barre de recherche et filtres sticky mobile */}
        {isMobile && (
          <div className="sticky top-[56px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20 shadow-sm">
            <div className="container mx-auto px-4 py-2">
              {/* Barre de recherche améliorée */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 z-10" />
                <input
                  type="text"
                  placeholder="Rechercher un parfum ou une marque"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 rounded-full bg-background/5 border border-primary/30 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-primary focus:bg-background/8 focus:shadow-[0_0_0_3px_rgba(183,148,90,0.1)] transition-all font-light"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 active:text-foreground/70 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtres scrollables horizontaux avec touch targets 44px */}
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent relative">
                <div className="flex gap-2 min-w-min pb-1">
                  <button
                    onClick={() => {
                      setSelectedCategory("Tous");
                      setSelectedBrand("Tous");
                    }}
                    className={`
                      flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium
                      transition-all duration-300 whitespace-nowrap border min-h-[40px]
                      ${
                        selectedCategory === "Tous" && selectedBrand === "Tous"
                          ? "bg-primary text-background border-primary"
                          : "bg-primary/10 text-primary border-primary/30 active:bg-primary/20"
                      }
                    `}
                  >
                    Tous
                  </button>
                  {categories.filter(cat => cat !== "Tous").map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedBrand("Tous");
                      }}
                      className={`
                        flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium
                        transition-all duration-300 whitespace-nowrap border min-h-[40px]
                        ${
                          selectedCategory === category
                            ? "bg-primary text-background border-primary"
                            : "bg-primary/10 text-primary border-primary/30 active:bg-primary/20"
                        }
                      `}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu latéral mobile - Simple et épuré */}
        {isMobile && (
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="px-4 pt-5 pb-4 border-b border-border/20">
                  <SheetTitle className="text-left text-base font-light">Filtres</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                  {/* Catégories */}
                  <div>
                    <h3 className="text-xs font-medium mb-2.5 text-foreground/70 uppercase tracking-wider">Catégories</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedCategory("Tous");
                          setSelectedBrand("Tous");
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-light transition-colors ${
                          selectedCategory === "Tous" && selectedBrand === "Tous"
                            ? "bg-foreground text-background"
                            : "bg-background border border-border/30 text-foreground/70 active:bg-background/80"
                        }`}
                      >
                        Tous
                      </button>
                      {categories.filter(cat => cat !== "Tous").map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setSelectedBrand("Tous");
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-light transition-colors ${
                            selectedCategory === category
                              ? "bg-foreground text-background"
                              : "bg-background border border-border/30 text-foreground/70 active:bg-background/80"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Marques */}
                  {selectedCategory !== "Tous" && (
                    <div>
                      <h3 className="text-xs font-medium mb-2.5 text-foreground/70 uppercase tracking-wider">Marques</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedBrand("Tous")}
                          className={`px-3 py-1.5 rounded-md text-xs font-light transition-colors ${
                            selectedBrand === "Tous"
                              ? "bg-foreground text-background"
                              : "bg-background border border-border/30 text-foreground/70 active:bg-background/80"
                          }`}
                        >
                          Toutes
                        </button>
                        {allBrands.map((brand) => (
                          <button
                            key={brand}
                            onClick={() => setSelectedBrand(brand)}
                            className={`px-3 py-1.5 rounded-md text-xs font-light transition-colors ${
                              selectedBrand === brand
                                ? "bg-foreground text-background"
                                : "bg-background border border-border/30 text-foreground/70 active:bg-background/80"
                            }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bouton réinitialiser */}
                  {(selectedCategory !== "Tous" || selectedBrand !== "Tous" || searchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedCategory("Tous");
                        setSelectedBrand("Tous");
                        setSearchTerm("");
                      }}
                      className="w-full px-3 py-2 text-xs text-muted-foreground/70 active:text-foreground/80 font-light border border-border/30 rounded-md active:bg-background/80 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Contenu principal - Style inspiré des grands sites de parfums */}
        <div className="container max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-2 md:py-16 lg:py-20">
          {showNoResults ? (
            <div className="text-center py-12 md:py-24 px-4">
              <p className="text-sm md:text-xl text-foreground/70 mb-6 md:mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                Ce parfum ne figure pas encore dans notre catalogue en ligne. Contactez-nous sur Snapchat ou WhatsApp : 
                il se peut qu'il soit disponible ou arrive prochainement.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-md mx-auto">
                <Button
                  size={isMobile ? "default" : "lg"}
                  onClick={openSnapchat}
                  className="bg-[#FFFC00] active:bg-[#FFFC00]/90 text-background h-11 md:h-14 text-sm md:text-base rounded-none px-6 md:px-8 font-light uppercase tracking-wider flex items-center gap-2 md:gap-3"
                >
                  <SnapchatIcon className="h-4 w-4 md:h-5 md:w-5 text-background" />
                  Snapchat
                </Button>
                <Button
                  size={isMobile ? "default" : "lg"}
                  onClick={openWhatsApp}
                  className="bg-[#25D366] active:bg-[#25D366]/90 text-white h-11 md:h-14 text-sm md:text-base rounded-none px-6 md:px-8 font-light uppercase tracking-wider flex items-center gap-2 md:gap-3"
                >
                  <WhatsAppIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Marques complètes - Layout amélioré */}
              {filteredBrands.length > 0 && (
                <div className="mb-6 md:mb-24">
                  <div className="mb-4 md:mb-10 text-center px-2">
                    <h3 className="font-serif text-base md:text-2xl text-foreground/90 mb-2 md:mb-2 uppercase tracking-wider font-light">
                      Marques - Gamme complète
                    </h3>
                  </div>
                  
                  {/* Version Desktop : Grille optimisée avec minmax */}
                  {!isMobile && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-4 py-8 max-w-[1400px] mx-auto">
                      {filteredBrands.map((brand) => (
                        <BrandCard 
                          key={brand.id} 
                          brand={brand}
                          onClick={() => handleBrandClick(brand)}
                          variant="desktop"
                        />
                      ))}
                    </div>
                  )}

                  {/* Version Mobile : Carousel plein écran avec nom au-dessus */}
                  {isMobile && (
                    <div className="relative w-full -mx-3">
                      <Carousel
                        opts={{
                          align: "start",
                          loop: false,
                        }}
                        className="w-full"
                      >
                        <CarouselContent className="ml-0">
                          {filteredBrands.map((brand) => (
                            <CarouselItem key={brand.id} className="pl-3 basis-full">
                              <BrandCard 
                                brand={brand}
                                onClick={() => handleBrandClick(brand)}
                                variant="mobile"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {filteredBrands.length > 1 && (
                          <>
                            <CarouselPrevious className="left-2 bg-background/95 border-border/50 active:bg-background shadow-lg h-9 w-9 z-10" />
                            <CarouselNext className="right-2 bg-background/95 border-border/50 active:bg-background shadow-lg h-9 w-9 z-10" />
                          </>
                        )}
                      </Carousel>
                    </div>
                  )}
                </div>
              )}

              {/* Parfums individuels - Layout amélioré */}
              {filteredPerfumes.length > 0 && (
                <div>
                  {filteredBrands.length > 0 && (
                    <div className="mb-8 md:mb-10 text-center px-2">
                      <h3 className="font-serif text-lg md:text-2xl text-foreground/90 mb-2 md:mb-2 uppercase tracking-wider font-light">
                        Parfums
                      </h3>
                    </div>
                  )}
                  
                  {/* Version Desktop : Grille optimisée avec minmax et spacing */}
                  {!isMobile && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-4 py-8 max-w-[1400px] mx-auto">
                      {filteredPerfumes.map((perfume) => (
                        <PerfumeCard 
                          key={perfume.id} 
                          perfume={perfume}
                          onClick={() => handlePerfumeClick(perfume)}
                          variant="desktop"
                        />
                      ))}
                    </div>
                  )}

                  {/* Version Mobile : Grille 2 colonnes avec spacing optimisé */}
                  {isMobile && (
                    <div className="grid grid-cols-2 gap-3 px-4 py-4">
                      {filteredPerfumes.map((perfume) => (
                        <PerfumeCard 
                          key={perfume.id}
                          perfume={perfume}
                          onClick={() => handlePerfumeClick(perfume)}
                          variant="mobile"
                          isDetailsOpen={openDetailsId === perfume.id}
                          onDetailsToggle={handleDetailsToggle}
                        />
                      ))}
                    </div>
                  )}
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
