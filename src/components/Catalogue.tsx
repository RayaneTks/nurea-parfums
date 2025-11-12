import { useState, useMemo } from "react";
import { Search, X, Filter } from "lucide-react";
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export const Catalogue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedBrand, setSelectedBrand] = useState("Tous");
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [selectedBrandDrawer, setSelectedBrandDrawer] = useState<Brand | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

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
        {/* Navbar de filtres - Version Desktop */}
        {!isMobile && (
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

              {/* Navigation horizontale */}
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
        )}

        {/* Barre de recherche mobile - Compacte et moins sticky */}
        {isMobile && (
          <div className="sticky top-[52px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
            <div className="px-3 py-1.5">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-9 bg-background/50 border border-border/30 rounded-lg text-foreground placeholder:text-muted-foreground/40 text-xs focus:outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10 transition-all duration-300 font-light"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground/70 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border/30"
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle className="text-left">Filtres</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      {/* Catégories */}
                      <div>
                        <h3 className="text-sm font-medium mb-3 text-foreground/80">Catégories</h3>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedCategory("Tous");
                              setSelectedBrand("Tous");
                              setMobileFiltersOpen(false);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-light transition-all ${
                              selectedCategory === "Tous" && selectedBrand === "Tous"
                                ? "bg-foreground text-background"
                                : "bg-background/50 border border-border/30 text-foreground/70 hover:border-foreground/50"
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
                                setMobileFiltersOpen(false);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-light transition-all ${
                                selectedCategory === category
                                  ? "bg-foreground text-background"
                                  : "bg-background/50 border border-border/30 text-foreground/70 hover:border-foreground/50"
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
                          <h3 className="text-sm font-medium mb-3 text-foreground/80">Marques</h3>
                          <div className="flex flex-wrap gap-2">
                            {allBrands.map((brand) => (
                              <button
                                key={brand}
                                onClick={() => {
                                  setSelectedBrand(brand);
                                  setMobileFiltersOpen(false);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-light transition-all ${
                                  selectedBrand === brand
                                    ? "bg-foreground text-background"
                                    : "bg-background/50 border border-border/30 text-foreground/70 hover:border-foreground/50"
                                }`}
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal - Style Dior avec images grandes */}
        <div className="container max-w-7xl mx-auto px-2 md:px-6 lg:px-8 py-4 md:py-16 lg:py-20">
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
              {/* Marques complètes - Layout amélioré */}
              {filteredBrands.length > 0 && (
                <div className="mb-20 md:mb-24">
                  <div className="mb-10 text-center">
                    <h3 className="font-serif text-xl md:text-2xl text-foreground/80 mb-2 uppercase tracking-wider font-light">
                      Marques - Gamme complète
                    </h3>
                  </div>
                  
                  {/* Version Desktop : Grille de 3 colonnes */}
                  {!isMobile && (
                    <div className="grid grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
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

                  {/* Version Mobile : Carousel */}
                  {isMobile && (
                    <div className="relative w-full">
                      <Carousel
                        opts={{
                          align: "center",
                          loop: false,
                        }}
                        className="w-full"
                      >
                        <CarouselContent className="ml-0">
                          {filteredBrands.map((brand) => (
                            <CarouselItem key={brand.id} className="pl-0 basis-full">
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
                            <CarouselPrevious className="left-2 bg-background/95 border-border/50 hover:bg-background shadow-lg h-9 w-9 z-10" />
                            <CarouselNext className="right-2 bg-background/95 border-border/50 hover:bg-background shadow-lg h-9 w-9 z-10" />
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
                    <div className="mb-10 text-center">
                      <h3 className="font-serif text-xl md:text-2xl text-foreground/80 mb-2 uppercase tracking-wider font-light">
                        Parfums
                      </h3>
                    </div>
                  )}
                  
                  {/* Version Desktop : Grille de 3 colonnes */}
                  {!isMobile && (
                    <div className="grid grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
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

                  {/* Version Mobile : Carousel */}
                  {isMobile && (
                    <div className="relative w-full">
                      <Carousel
                        opts={{
                          align: "center",
                          loop: false,
                        }}
                        className="w-full"
                      >
                        <CarouselContent className="ml-0">
                          {filteredPerfumes.map((perfume) => (
                            <CarouselItem key={perfume.id} className="pl-0 basis-full">
                              <PerfumeCard 
                                perfume={perfume}
                                onClick={() => handlePerfumeClick(perfume)}
                                variant="mobile"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {filteredPerfumes.length > 1 && (
                          <>
                            <CarouselPrevious className="left-2 bg-background/95 border-border/50 hover:bg-background shadow-lg h-9 w-9 z-10" />
                            <CarouselNext className="right-2 bg-background/95 border-border/50 hover:bg-background shadow-lg h-9 w-9 z-10" />
                          </>
                        )}
                      </Carousel>
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
