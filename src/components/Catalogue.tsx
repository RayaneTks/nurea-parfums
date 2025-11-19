import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, Filter, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, ArrowLeft, ArrowUpDown } from "lucide-react";
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
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [expandedFilterSections, setExpandedFilterSections] = useState<Record<string, boolean>>({
    genre: true,
    category: true,
    brand: false,
  });
  const [filterPage, setFilterPage] = useState<"main" | "genre" | "category" | "brand">("main");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const isMobile = useIsMobile();

  const toggleFilterSection = (section: string) => {
    setExpandedFilterSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
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

  // Calculer les compteurs pour chaque option de filtre
  const filterCounts = useMemo(() => {
    // Compteur par genre
    const genderCounts = {
      tous: perfumes.length,
      homme: perfumes.filter(p => p.gender === "homme" || !p.gender || p.gender === "unisexe").length,
      femme: perfumes.filter(p => p.gender === "femme" || !p.gender || p.gender === "unisexe").length,
    };

    // Compteur par catégorie
    const categoryCounts: Record<string, number> = {};
    categories.forEach(cat => {
      if (cat === "Tous") {
        categoryCounts[cat] = perfumes.length;
      } else {
        categoryCounts[cat] = perfumes.filter(p => p.category === cat).length;
      }
    });

    // Compteur par marque (seulement si une catégorie est sélectionnée)
    const brandCounts: Record<string, number> = {};
    if (selectedCategory !== "Tous") {
      allBrands.forEach(brand => {
        if (brand === "Tous") {
          brandCounts[brand] = filteredPerfumes.length;
        } else {
          brandCounts[brand] = perfumes.filter(p => 
            p.brand === brand && 
            (selectedCategory === "Tous" || p.category === selectedCategory)
          ).length;
        }
      });
    }

    return { genderCounts, categoryCounts, brandCounts };
  }, [perfumes, categories, allBrands, selectedCategory, filteredPerfumes]);

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
        {/* Barre avec bouton filtres et nombre de produits - Version Desktop */}
        {!isMobile && (
          <div className="sticky top-[56px] md:top-[64px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                {/* Bouton Afficher/Masquer les filtres */}
                <button
                  onClick={() => setDesktopFiltersOpen(!desktopFiltersOpen)}
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-light uppercase tracking-wider text-sm"
                >
                  {desktopFiltersOpen ? (
                    <>
                      <ChevronLeft className="h-4 w-4" />
                      <span>Masquer les filtres</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <span>Afficher les filtres</span>
                    </>
                  )}
                </button>
                
                {/* Nombre de produits */}
                <div className="text-foreground/80 text-sm font-light">
                  {filteredPerfumes.length + filteredBrands.length} Produit{filteredPerfumes.length + filteredBrands.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Desktop pour les filtres */}
        {!isMobile && (
          <div className="flex">
            {/* Sidebar gauche pour les filtres */}
            {desktopFiltersOpen && (
              <div className="w-[280px] flex-shrink-0 border-r border-border/20 bg-background">
                <div className="sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto">
                  <div className="p-6">
                    {/* Barre de recherche pour les marques */}
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                        <input
                          type="text"
                          placeholder="Chercher une marque"
                          value={brandSearchTerm}
                          onChange={(e) => setBrandSearchTerm(e.target.value)}
                          className="w-full py-2 pr-10 border-b border-border/40 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary text-sm font-light"
                        />
                      </div>
                    </div>

                    {/* Filtre Genre */}
                    <div className="mb-6 border-b border-border/20 pb-4">
                      <button
                        onClick={() => toggleFilterSection("genre")}
                        className="w-full flex items-center justify-between mb-3 text-left"
                      >
                        <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">GENRE</h3>
                        {expandedFilterSections.genre ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedFilterSections.genre && (
                        <div className="space-y-2">
                          {(["tous", "homme", "femme"] as const).map((gender) => (
                            <label key={gender} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-background/50 rounded px-2 -mx-2">
                              <input
                                type="radio"
                                name="gender-desktop"
                                checked={selectedGender === gender}
                                onChange={() => setSelectedGender(gender)}
                                className="w-4 h-4 text-primary border-border/40 focus:ring-primary/50"
                              />
                              <span className="text-sm text-foreground font-light flex-1">
                                {gender === "tous" ? "Tous" : gender === "homme" ? "Homme" : "Femme"}
                              </span>
                              <span className="text-xs text-muted-foreground/60">
                                ({filterCounts.genderCounts[gender]})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Catégories */}
                    <div className="mb-6 border-b border-border/20 pb-4">
                      <button
                        onClick={() => toggleFilterSection("category")}
                        className="w-full flex items-center justify-between mb-3 text-left"
                      >
                        <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">CATÉGORIE</h3>
                        {expandedFilterSections.category ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedFilterSections.category && (
                        <div className="space-y-2">
                          {categories.map((category) => (
                            <label key={category} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-background/50 rounded px-2 -mx-2">
                              <input
                                type="radio"
                                name="category-desktop"
                                checked={selectedCategory === category}
                                onChange={() => {
                                  setSelectedCategory(category);
                                  setSelectedBrand("Tous");
                                }}
                                className="w-4 h-4 text-primary border-border/40 focus:ring-primary/50"
                              />
                              <span className="text-sm text-foreground font-light flex-1 capitalize">
                                {category}
                              </span>
                              <span className="text-xs text-muted-foreground/60">
                                ({filterCounts.categoryCounts[category] || 0})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Marques */}
                    {selectedCategory !== "Tous" && (
                      <div className="mb-6">
                        <button
                          onClick={() => toggleFilterSection("brand")}
                          className="w-full flex items-center justify-between mb-3 text-left"
                        >
                          <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">MARQUE</h3>
                          {expandedFilterSections.brand ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {expandedFilterSections.brand && (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {allBrands
                              .filter((brand) => 
                                brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
                              )
                              .map((brand) => {
                                const count = filterCounts.brandCounts[brand] || 0;
                                return (
                                  <label key={brand} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-background/50 rounded px-2 -mx-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedBrand === brand}
                                      onChange={() => setSelectedBrand(brand === selectedBrand ? "Tous" : brand)}
                                      className="w-4 h-4 text-primary border-border/40 focus:ring-primary/50"
                                    />
                                    <span className="text-sm text-foreground font-light flex-1">
                                      {brand}
                                    </span>
                                    <span className="text-xs text-muted-foreground/60">
                                      ({count})
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Contenu principal */}
            <div className="flex-1">
              <div className="container max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-2 md:py-16 lg:py-20">
                {showNoResults ? (
                  <div className="text-center py-12 md:py-24 px-4">
                    <p className="text-sm md:text-xl text-foreground/70 mb-6 md:mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                      Ce parfum ne figure pas encore dans notre catalogue en ligne. Contactez-nous sur Snapchat ou WhatsApp : 
                      il se peut qu'il soit disponible ou arrive prochainement.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-md mx-auto">
                      <Button
                        size="lg"
                        onClick={openSnapchat}
                        className="bg-[#FFFC00] active:bg-[#FFFC00]/90 text-background h-11 md:h-14 text-sm md:text-base rounded-none px-6 md:px-8 font-light uppercase tracking-wider flex items-center gap-2 md:gap-3"
                      >
                        <SnapchatIcon className="h-4 w-4 md:h-5 md:w-5 text-background" />
                        Snapchat
                      </Button>
                      <Button
                        size="lg"
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
                    {/* Marques complètes */}
                    {filteredBrands.length > 0 && (
                      <div className="mb-6 md:mb-24">
                        <div className="mb-4 md:mb-10 text-center px-2">
                          <h3 className="font-serif text-base md:text-2xl text-foreground/90 mb-2 md:mb-2 uppercase tracking-wider font-light">
                            Marques - Gamme complète
                          </h3>
                        </div>
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
                      </div>
                    )}

                    {/* Parfums individuels - Groupés par marque */}
                    {filteredPerfumes.length > 0 && (
                      <div>
                        {filteredBrands.length > 0 && (
                          <div className="mb-6 md:mb-12 text-center px-2">
                            <h3 className="font-serif text-base md:text-2xl text-foreground/90 mb-2 md:mb-4 uppercase tracking-wider font-light">
                              Parfums individuels
                            </h3>
                          </div>
                        )}
                        
                        {Object.entries(perfumesByBrand).map(([brand, brandPerfumes]) => (
                          <div key={brand} className="mb-8 md:mb-16">
                            {/* En-tête de marque */}
                            <div className="px-4 md:px-6 flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-8">
                              <div className="flex-1 h-px bg-border/30"></div>
                              <div className="text-center">
                                <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-1 font-light">Parfums</p>
                                <h4 className="font-serif text-sm md:text-base text-foreground/80 font-light whitespace-nowrap">
                                  {brand} ({brandPerfumes.length})
                                </h4>
                              </div>
                              <div className="flex-1 h-px bg-border/30"></div>
                            </div>

                            {/* Grille de parfums */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 px-3 md:px-4">
                              {brandPerfumes.map((perfume) => (
                                <PerfumeCard
                                  key={perfume.id}
                                  perfume={perfume}
                                  onClick={() => handlePerfumeClick(perfume)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barre Trier et Filtrer - Version Mobile */}
        {isMobile && (
          <div className="sticky top-[56px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20 shadow-sm">
            <div className="flex items-center border-t border-border/20">
              {/* Bouton Trier */}
              <button
                className="flex-1 flex items-center justify-center gap-2 py-4 px-4 border-r border-border/20 hover:bg-background/30 active:bg-background/50 transition-colors"
              >
                <ArrowUpDown className="h-5 w-5 text-primary" />
                <span className="text-foreground font-bold text-sm uppercase tracking-wider">Trier</span>
              </button>
              
              {/* Bouton Filtrer */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 relative hover:bg-background/30 active:bg-background/50 transition-colors ${
                  activeFiltersCount > 0 ? "bg-primary/10" : ""
                }`}
              >
                <Filter className="h-5 w-5 text-primary" />
                <span className="text-foreground font-bold text-sm uppercase tracking-wider">Filtrer</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary text-background text-[9px] flex items-center justify-center font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Menu latéral mobile - Style Sephora */}
        {isMobile && (
          <Sheet open={mobileFiltersOpen} onOpenChange={(open) => {
            setMobileFiltersOpen(open);
            if (!open) {
              setFilterPage("main");
              setBrandSearchTerm("");
            }
          }}>
            <SheetContent side="right" className="w-full max-w-sm p-0 top-0 h-screen border-l border-border/20">
              <div className="flex flex-col h-full bg-background">
                {/* Page principale FILTRES */}
                {filterPage === "main" && (
                  <>
                    {/* Header avec FILTRES centré - Style dark */}
                    <div className="bg-background border-b border-border/30 px-4 py-4 flex items-center justify-between">
                      <div className="w-6"></div>
                      <h2 className="text-foreground font-serif text-base uppercase tracking-wider font-light">FILTRES</h2>
                      <button
                        onClick={() => setMobileFiltersOpen(false)}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Fermer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Liste des filtres avec chevrons - Style dark */}
                    <div className="flex-1 overflow-y-auto bg-background">
                      <button
                        onClick={() => setFilterPage("genre")}
                        className="w-full flex items-center justify-between px-4 py-4 border-b border-border/20 text-left hover:bg-background/50 transition-colors"
                      >
                        <span className="text-foreground font-light text-sm">Genre</span>
                        <ChevronRight className="h-5 w-5 text-primary/60" />
                      </button>
                      <button
                        onClick={() => setFilterPage("category")}
                        className="w-full flex items-center justify-between px-4 py-4 border-b border-border/20 text-left hover:bg-background/50 transition-colors"
                      >
                        <span className="text-foreground font-light text-sm">Catégorie</span>
                        <ChevronRight className="h-5 w-5 text-primary/60" />
                      </button>
                      <button
                        onClick={() => setFilterPage("brand")}
                        className="w-full flex items-center justify-between px-4 py-4 border-b border-border/20 text-left hover:bg-background/50 transition-colors"
                      >
                        <span className="text-foreground font-light text-sm">Marques</span>
                        <ChevronRight className="h-5 w-5 text-primary/60" />
                      </button>
                    </div>
                  </>
                )}

                {/* Page Genre */}
                {filterPage === "genre" && (
                  <>
                    {/* Header avec retour - Style dark */}
                    <div className="bg-background border-b border-border/30 px-4 py-4 flex items-center justify-between">
                      <button
                        onClick={() => setFilterPage("main")}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Retour"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <h2 className="text-foreground font-serif text-base uppercase tracking-wider font-light">GENRE</h2>
                      <button
                        onClick={() => {
                          setMobileFiltersOpen(false);
                          setFilterPage("main");
                        }}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Fermer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Liste des genres avec radio buttons - Style dark */}
                    <div className="flex-1 overflow-y-auto bg-background px-4 py-4">
                      {(["tous", "homme", "femme"] as const).map((gender) => (
                        <label key={gender} className="flex items-center gap-3 py-3 cursor-pointer border-b border-border/20 hover:bg-background/30 transition-colors">
                          <input
                            type="radio"
                            name="gender-mobile"
                            checked={selectedGender === gender}
                            onChange={() => setSelectedGender(gender)}
                            className="w-5 h-5 text-primary border-border/40 focus:ring-primary/50"
                          />
                          <span className="text-foreground text-sm flex-1 font-light">
                            {gender === "tous" ? "Tous" : gender === "homme" ? "Homme" : "Femme"}
                          </span>
                          <span className="text-muted-foreground/60 text-sm">
                            ({filterCounts.genderCounts[gender]})
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Footer avec bouton ENREGISTRER - Style dark */}
                    <div className="bg-background border-t border-border/30 px-4 py-4">
                      <Button
                        onClick={() => {
                          setFilterPage("main");
                        }}
                        className="w-full min-h-[48px] bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 rounded-none font-light uppercase"
                      >
                        ENREGISTRER
                      </Button>
                    </div>
                  </>
                )}

                {/* Page Catégorie */}
                {filterPage === "category" && (
                  <>
                    {/* Header avec retour - Style dark */}
                    <div className="bg-background border-b border-border/30 px-4 py-4 flex items-center justify-between">
                      <button
                        onClick={() => setFilterPage("main")}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Retour"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <h2 className="text-foreground font-serif text-base uppercase tracking-wider font-light">CATÉGORIE</h2>
                      <button
                        onClick={() => {
                          setMobileFiltersOpen(false);
                          setFilterPage("main");
                        }}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Fermer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Liste des catégories avec radio buttons - Style dark */}
                    <div className="flex-1 overflow-y-auto bg-background px-4 py-4">
                      {categories.map((category) => (
                        <label key={category} className="flex items-center gap-3 py-3 cursor-pointer border-b border-border/20 hover:bg-background/30 transition-colors">
                          <input
                            type="radio"
                            name="category-mobile"
                            checked={selectedCategory === category}
                            onChange={() => {
                              setSelectedCategory(category);
                              setSelectedBrand("Tous");
                            }}
                            className="w-5 h-5 text-primary border-border/40 focus:ring-primary/50"
                          />
                          <span className="text-foreground text-sm flex-1 capitalize font-light">
                            {category}
                          </span>
                          <span className="text-muted-foreground/60 text-sm">
                            ({filterCounts.categoryCounts[category] || 0})
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Footer avec bouton ENREGISTRER - Style dark */}
                    <div className="bg-background border-t border-border/30 px-4 py-4">
                      <Button
                        onClick={() => {
                          setFilterPage("main");
                        }}
                        className="w-full min-h-[48px] bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 rounded-none font-light uppercase"
                      >
                        ENREGISTRER
                      </Button>
                    </div>
                  </>
                )}

                {/* Page Marques */}
                {filterPage === "brand" && (
                  <>
                    {/* Header avec retour - Style dark */}
                    <div className="bg-background border-b border-border/30 px-4 py-4 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setFilterPage("main");
                          setBrandSearchTerm("");
                        }}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Retour"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <h2 className="text-foreground font-serif text-base uppercase tracking-wider font-light">MARQUES</h2>
                      <button
                        onClick={() => {
                          setMobileFiltersOpen(false);
                          setFilterPage("main");
                          setBrandSearchTerm("");
                        }}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        aria-label="Fermer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Barre de recherche - Style dark */}
                    <div className="px-4 py-3 border-b border-border/20 bg-background">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                        <input
                          type="text"
                          placeholder="Chercher une marque"
                          value={brandSearchTerm}
                          onChange={(e) => setBrandSearchTerm(e.target.value)}
                          className="w-full py-2 pr-10 border-b border-border/40 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary text-sm font-light"
                        />
                      </div>
                    </div>
                    
                    {/* Liste des marques filtrées avec radio buttons - Style dark */}
                    <div className="flex-1 overflow-y-auto bg-background px-4 py-2">
                      {allBrands
                        .filter((brand) => 
                          brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
                        )
                        .map((brand) => {
                          const count = filterCounts.brandCounts[brand] || 0;
                          return (
                            <label key={brand} className="flex items-center gap-3 py-3 cursor-pointer border-b border-border/20 hover:bg-background/30 transition-colors">
                              <input
                                type="radio"
                                name="brand-mobile"
                                checked={selectedBrand === brand}
                                onChange={() => setSelectedBrand(brand)}
                                className="w-5 h-5 text-primary border-border/40 focus:ring-primary/50"
                              />
                              <span className="text-foreground text-sm flex-1 uppercase font-light">
                                {brand}
                              </span>
                              <span className="text-muted-foreground/60 text-sm">
                                ({count})
                              </span>
                            </label>
                          );
                        })}
                    </div>

                    {/* Footer avec bouton ENREGISTRER - Style dark */}
                    <div className="bg-background border-t border-border/30 px-4 py-4">
                      <Button
                        onClick={() => {
                          setFilterPage("main");
                          setBrandSearchTerm("");
                        }}
                        className="w-full min-h-[48px] bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 rounded-none font-light uppercase"
                      >
                        ENREGISTRER
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Contenu principal Mobile */}
        {isMobile && (
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
                {/* Marques complètes - Mobile */}
                {filteredBrands.length > 0 && (
                  <div className="mb-6 md:mb-24">
                    <div className="mb-4 md:mb-10 text-center px-2">
                      <h3 className="font-serif text-base md:text-2xl text-foreground/90 mb-2 md:mb-2 uppercase tracking-wider font-light">
                        Marques - Gamme complète
                      </h3>
                    </div>
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
                  </div>
                )}

                {/* Parfums individuels - Mobile */}
                {filteredPerfumes.length > 0 && (
                  <div>
                    {filteredBrands.length > 0 && (
                      <div className="mb-6 md:mb-8 text-center px-2">
                        <h3 className="font-serif text-lg md:text-xl text-foreground/90 mb-1 md:mb-2 uppercase tracking-wider font-light">
                          Parfums
                        </h3>
                      </div>
                    )}
                    {Object.entries(perfumesByBrand).map(([brand, brandPerfumes]) => (
                      <div key={brand} className="mb-8 md:mb-16">
                        <div className="px-4 md:px-6 flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-8">
                          <div className="flex-1 h-px bg-border/30"></div>
                          <div className="text-center">
                            <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-1 font-light">Parfums</p>
                            <h4 className="font-serif text-sm md:text-base text-foreground/80 font-light whitespace-nowrap">
                              {brand} ({brandPerfumes.length})
                            </h4>
                          </div>
                          <div className="flex-1 h-px bg-border/30"></div>
                        </div>
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
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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
