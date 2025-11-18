import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeDrawer } from "./PerfumeDrawer";
import { BrandCard } from "./BrandCard";
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
  const [selectedGender, setSelectedGender] = useState<"homme" | "femme" | "tous">("tous");
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
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
      selectedBrand !== "Tous" && "1",
      selectedGender !== "tous" && "1"
    ].filter(Boolean).length;
  }, [selectedCategory, selectedBrand, selectedGender, searchTerm]);

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

      const matchesGender =
        selectedGender === "tous" || 
        !perfume.gender || 
        perfume.gender === "unisexe" ||
        perfume.gender === selectedGender;

      return matchesSearch && matchesCategory && matchesBrand && matchesGender;
    });
  }, [searchTerm, selectedCategory, selectedBrand, selectedGender]);

  // Grouper les parfums par marque pour une meilleure organisation
  const perfumesByBrand = useMemo(() => {
    const grouped: Record<string, typeof filteredPerfumes> = {};
    filteredPerfumes.forEach((perfume) => {
      if (!grouped[perfume.brand]) {
        grouped[perfume.brand] = [];
      }
      grouped[perfume.brand].push(perfume);
    });
    // Trier les marques par ordre alphabétique
    return Object.keys(grouped)
      .sort()
      .reduce((acc, brand) => {
        acc[brand] = grouped[brand];
        return acc;
      }, {} as Record<string, typeof filteredPerfumes>);
  }, [filteredPerfumes]);

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
      // Sauvegarder la position de scroll avant de naviguer
      const scrollPosition = window.scrollY;
      sessionStorage.setItem('catalogueScrollPosition', scrollPosition.toString());
      
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
    navigate(`/marques/${brand.id}`);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <section id="catalogue" className="min-h-screen bg-background border-t border-border/10">
      <div className="w-full">
        {/* Barre de recherche et filtre - Version Desktop */}
        {!isMobile && (
          <div className="sticky top-[56px] md:top-[64px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                {/* Espaceur gauche pour centrer */}
                <div className="flex-1"></div>
                
                {/* Barre de recherche centrée */}
                <div className="w-full max-w-[600px]">
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
                
                {/* Bouton filtre */}
                <div className="flex-1 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDesktopFiltersOpen(true)}
                    className={`min-h-[48px] min-w-[48px] rounded-full border-primary/30 ${
                      activeFiltersCount > 0
                        ? "bg-primary/20 border-primary/50"
                        : "bg-background/5 hover:bg-primary/10"
                    }`}
                  >
                    <Filter className="h-5 w-5 text-primary" />
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 text-sm font-medium text-primary">{activeFiltersCount}</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar Desktop pour les filtres */}
            <Sheet open={desktopFiltersOpen} onOpenChange={setDesktopFiltersOpen}>
              <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0 top-[64px] md:top-[64px] z-[101] h-[calc(100vh-64px)] border-l border-border/20">
                <div className="flex flex-col h-full">
                  <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/20 bg-background">
                    <SheetTitle className="text-left text-lg font-light text-foreground">Filtres</SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-background">
                    {/* Filtre Genre */}
                    <div>
                      <h3 className="text-sm font-medium mb-3 text-foreground uppercase tracking-wider">Genre</h3>
                      <div className="flex flex-wrap gap-2">
                        {(["tous", "homme", "femme"] as const).map((gender) => (
                          <button
                            key={gender}
                            onClick={() => setSelectedGender(gender)}
                            className={`px-4 py-2.5 rounded-full text-sm font-light transition-all duration-200 min-h-[44px] ${
                              selectedGender === gender
                                ? "bg-primary text-background border border-primary shadow-sm"
                                : "bg-background border border-border/40 text-foreground hover:bg-background/80 hover:border-primary/40 active:scale-[0.98]"
                            }`}
                          >
                            {gender === "tous" ? "Tous" : gender === "homme" ? "Homme" : "Femme"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Catégories */}
                    <div>
                      <h3 className="text-sm font-medium mb-3 text-foreground uppercase tracking-wider">Catégories</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory("Tous");
                            setSelectedBrand("Tous");
                          }}
                          className={`px-4 py-2.5 rounded-full text-sm font-light transition-all duration-200 min-h-[44px] ${
                            selectedCategory === "Tous" && selectedBrand === "Tous"
                              ? "bg-primary text-background border border-primary shadow-sm"
                              : "bg-background border border-border/40 text-foreground hover:bg-background/80 hover:border-primary/40 active:scale-[0.98]"
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
                            className={`px-4 py-2.5 rounded-full text-sm font-light transition-all duration-200 min-h-[44px] ${
                              selectedCategory === category
                                ? "bg-primary text-background border border-primary shadow-sm"
                                : "bg-background border border-border/40 text-foreground hover:bg-background/80 hover:border-primary/40 active:scale-[0.98]"
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
                        <h3 className="text-sm font-medium mb-3 text-foreground uppercase tracking-wider">Marques</h3>
                        <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                          {allBrands.map((brand) => (
                            <button
                              key={brand}
                              onClick={() => setSelectedBrand(brand)}
                              className={`px-4 py-2.5 rounded-full text-sm font-light transition-all duration-200 min-h-[44px] ${
                                selectedBrand === brand
                                  ? "bg-primary text-background border border-primary shadow-sm"
                                  : "bg-background border border-border/40 text-foreground hover:bg-background/80 hover:border-primary/40 active:scale-[0.98]"
                              }`}
                            >
                              {brand}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer avec bouton réinitialiser */}
                  <div className="px-6 py-4 border-t border-border/20">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory("Tous");
                        setSelectedBrand("Tous");
                        setSelectedGender("tous");
                        setSearchTerm("");
                      }}
                      className="w-full min-h-[44px]"
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        

        {/* Barre de recherche et filtre - Version Mobile */}
        {isMobile && (
          <div className="sticky top-[56px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20 shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Barre de recherche */}
                <div className="flex-1">
                  <div className="relative group">
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 active:text-foreground/70 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Bouton filtre */}
                <Button
                  variant="outline"
                  onClick={() => setMobileFiltersOpen(true)}
                  className={`relative min-h-[40px] min-w-[40px] rounded-full border-primary/30 p-0 ${
                    activeFiltersCount > 0
                      ? "bg-primary/20 border-primary/50"
                      : "bg-background/5 active:bg-primary/10"
                  }`}
                >
                  <Filter className="h-4 w-4 text-primary" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-background text-[10px] flex items-center justify-center font-medium">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Menu latéral mobile - Simple et épuré */}
        {isMobile && (
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0 top-[56px] z-[101] h-[calc(100vh-56px)] border-l border-border/20">
              <div className="flex flex-col h-full">
                <SheetHeader className="px-4 pt-5 pb-4 border-b border-border/20 bg-background">
                  <SheetTitle className="text-left text-base font-light text-foreground">Filtres</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-background">
                  {/* Filtre Genre */}
                  <div>
                    <h3 className="text-xs font-medium mb-2.5 text-foreground uppercase tracking-wider">Genre</h3>
                    <div className="flex flex-wrap gap-2">
                      {(["tous", "homme", "femme"] as const).map((gender) => (
                        <button
                          key={gender}
                          onClick={() => setSelectedGender(gender)}
                          className={`px-3 py-2 rounded-full text-xs font-light transition-all duration-200 min-h-[40px] ${
                            selectedGender === gender
                              ? "bg-primary text-background border border-primary shadow-sm"
                              : "bg-background border border-border/40 text-foreground active:bg-background/80 active:scale-[0.98]"
                          }`}
                        >
                          {gender === "tous" ? "Tous" : gender === "homme" ? "Homme" : "Femme"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catégories */}
                  <div>
                    <h3 className="text-xs font-medium mb-2.5 text-foreground uppercase tracking-wider">Catégories</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedCategory("Tous");
                          setSelectedBrand("Tous");
                        }}
                        className={`px-3 py-2 rounded-full text-xs font-light transition-all duration-200 min-h-[40px] ${
                          selectedCategory === "Tous" && selectedBrand === "Tous"
                            ? "bg-primary text-background border border-primary shadow-sm"
                            : "bg-background border border-border/40 text-foreground active:bg-background/80 active:scale-[0.98]"
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
                          className={`px-3 py-2 rounded-full text-xs font-light transition-all duration-200 min-h-[40px] ${
                            selectedCategory === category
                              ? "bg-primary text-background border border-primary shadow-sm"
                              : "bg-background border border-border/40 text-foreground active:bg-background/80 active:scale-[0.98]"
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
                      <h3 className="text-xs font-medium mb-2.5 text-foreground uppercase tracking-wider">Marques</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedBrand("Tous")}
                          className={`px-3 py-2 rounded-full text-xs font-light transition-all duration-200 min-h-[40px] ${
                            selectedBrand === "Tous"
                              ? "bg-primary text-background border border-primary shadow-sm"
                              : "bg-background border border-border/40 text-foreground active:bg-background/80 active:scale-[0.98]"
                          }`}
                        >
                          Toutes
                        </button>
                        {allBrands.map((brand) => (
                          <button
                            key={brand}
                            onClick={() => setSelectedBrand(brand)}
                            className={`px-3 py-2 rounded-full text-xs font-light transition-all duration-200 min-h-[40px] ${
                              selectedBrand === brand
                                ? "bg-primary text-background border border-primary shadow-sm"
                                : "bg-background border border-border/40 text-foreground active:bg-background/80 active:scale-[0.98]"
                            }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bouton réinitialiser */}
                  {(selectedCategory !== "Tous" || selectedBrand !== "Tous" || selectedGender !== "tous" || searchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedCategory("Tous");
                        setSelectedBrand("Tous");
                        setSelectedGender("tous");
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
                          loop: true,
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

              {/* Parfums individuels - Organisés par marque */}
              {filteredPerfumes.length > 0 && (
                <div>
                  {filteredBrands.length > 0 && (
                    <div className="mb-6 md:mb-8 text-center px-2">
                      <h3 className="font-serif text-lg md:text-xl text-foreground/90 mb-1 md:mb-2 uppercase tracking-wider font-light">
                        Parfums
                      </h3>
                    </div>
                  )}
                  
                  {/* Parfums groupés par marque */}
                  <div className="space-y-8 md:space-y-12">
                    {Object.entries(perfumesByBrand).map(([brand, brandPerfumes]) => (
                      <div key={brand} className="space-y-4 md:space-y-6">
                        {/* En-tête de marque */}
                        <div className="px-4 md:px-6">
                          <h4 className="font-serif text-base md:text-lg text-foreground/80 font-light border-b border-border/30 pb-2">
                            {brand}
                          </h4>
                        </div>
                        
                        {/* Version Desktop : Grille optimisée */}
                        {!isMobile && (
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-5 px-4 md:px-6 max-w-[1400px] mx-auto">
                            {brandPerfumes.map((perfume) => (
                              <PerfumeCard 
                                key={perfume.id} 
                                perfume={perfume}
                                onClick={() => handlePerfumeClick(perfume)}
                                variant="desktop"
                              />
                            ))}
                          </div>
                        )}

                        {/* Version Mobile : Grille 2 colonnes */}
                        {isMobile && (
                          <div className="grid grid-cols-2 gap-3 px-4">
                            {brandPerfumes.map((perfume) => (
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

    </section>
  );
};
