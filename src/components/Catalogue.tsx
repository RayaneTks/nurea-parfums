import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import { PerfumeCard } from "@/components/PerfumeCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { contactConfig } from "@/config/contact";
import { categories, fullRangeBrands, perfumes, type Perfume } from "@/data/perfumes";
import { buildBrandPath, buildProductPath, type GenderFilter, normalizeText, searchableCategories } from "@/lib/catalog";
import { buildSnapchatUrl, buildWhatsappUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";

interface CatalogueProps {
  id?: string;
  title?: string;
  subtitle?: string;
  initialSearchTerm?: string;
  initialCategory?: string;
  initialBrand?: string;
  initialGender?: GenderFilter;
  showQuickLinks?: boolean;
}

type SortOption = "relevance" | "az" | "za" | "best";

const genderOptions: Array<{ value: GenderFilter; label: string }> = [
  { value: "tous", label: "Tous" },
  { value: "homme", label: "Homme" },
  { value: "femme", label: "Femme" },
];

const matchesGender = (perfume: Perfume, selectedGender: GenderFilter) => {
  if (selectedGender === "tous") return true;
  if (!perfume.gender || perfume.gender === "unisexe") return true;
  return perfume.gender === selectedGender;
};

const getRelevanceScore = (perfume: Perfume, normalizedQuery: string) => {
  if (!normalizedQuery) return 3;

  const name = normalizeText(perfume.name);
  const brand = normalizeText(perfume.brand);

  if (name === normalizedQuery) return 0;
  if (brand === normalizedQuery) return 1;
  if (name.startsWith(normalizedQuery)) return 2;
  if (brand.startsWith(normalizedQuery)) return 3;
  if (name.includes(normalizedQuery)) return 4;
  if (brand.includes(normalizedQuery)) return 5;
  return 6;
};

export const Catalogue = ({
  id = "catalogue",
  title = "Catalogue",
  subtitle = "Explorez les parfums par categorie, marque et genre.",
  initialSearchTerm = "",
  initialCategory = "Tous",
  initialBrand = "Tous",
  initialGender = "tous",
  showQuickLinks = true,
}: CatalogueProps) => {
  const navigate = useNavigate();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedGender, setSelectedGender] = useState<GenderFilter>(initialGender);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  useEffect(() => setSearchTerm(initialSearchTerm), [initialSearchTerm]);
  useEffect(() => setSelectedCategory(initialCategory), [initialCategory]);
  useEffect(() => setSelectedBrand(initialBrand), [initialBrand]);
  useEffect(() => setSelectedGender(initialGender), [initialGender]);

  const normalizedSearch = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const availableBrands = useMemo(() => {
    const perfumeBrands = perfumes
      .filter((perfume) => (selectedCategory === "Tous" ? true : perfume.category === selectedCategory))
      .filter((perfume) => matchesGender(perfume, selectedGender))
      .map((perfume) => perfume.brand);

    const rangeBrands = fullRangeBrands
      .filter((brand) => (selectedCategory === "Tous" ? true : brand.category === selectedCategory))
      .map((brand) => brand.name);

    return ["Tous", ...Array.from(new Set([...perfumeBrands, ...rangeBrands])).sort((a, b) => a.localeCompare(b, "fr"))];
  }, [selectedCategory, selectedGender]);

  useEffect(() => {
    if (!availableBrands.includes(selectedBrand)) {
      setSelectedBrand("Tous");
    }
  }, [availableBrands, selectedBrand]);

  const filteredPerfumes = useMemo(() => {
    const filtered = perfumes.filter((perfume) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(perfume.name).includes(normalizedSearch) ||
        normalizeText(perfume.brand).includes(normalizedSearch);

      const matchesCategory = selectedCategory === "Tous" || perfume.category === selectedCategory;
      const matchesBrand = selectedBrand === "Tous" || perfume.brand === selectedBrand;
      const genderMatch = matchesGender(perfume, selectedGender);

      return matchesSearch && matchesCategory && matchesBrand && genderMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "za") return b.name.localeCompare(a.name, "fr");
      if (sortBy === "best") {
        const aBest = a.tags?.includes("Best-seller") ? 1 : 0;
        const bBest = b.tags?.includes("Best-seller") ? 1 : 0;
        if (aBest !== bBest) return bBest - aBest;
        return a.name.localeCompare(b.name, "fr");
      }

      const scoreDiff = getRelevanceScore(a, normalizedSearch) - getRelevanceScore(b, normalizedSearch);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [normalizedSearch, selectedCategory, selectedBrand, selectedGender, sortBy]);

  const filteredFullRangeBrands = useMemo(
    () =>
      fullRangeBrands.filter((brand) => {
        const matchesSearch = !normalizedSearch || normalizeText(brand.name).includes(normalizedSearch);
        const matchesCategory = selectedCategory === "Tous" || brand.category === selectedCategory;
        const matchesBrand = selectedBrand === "Tous" || selectedBrand === brand.name;
        return matchesSearch && matchesCategory && matchesBrand;
      }),
    [normalizedSearch, selectedCategory, selectedBrand]
  );

  const groupedPerfumes = useMemo(() => {
    const grouped = filteredPerfumes.reduce<Record<string, Perfume[]>>((acc, perfume) => {
      if (!acc[perfume.brand]) acc[perfume.brand] = [];
      acc[perfume.brand].push(perfume);
      return acc;
    }, {});

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [filteredPerfumes]);

  const snapchatUrl = buildSnapchatUrl(contactConfig.snapchat.url);
  const whatsappUrl = buildWhatsappUrl(contactConfig.whatsapp.url);

  const clearFacetFilters = () => {
    setSelectedCategory("Tous");
    setSelectedBrand("Tous");
    setSelectedGender("tous");
    setSortBy("relevance");
  };

  const resetAll = () => {
    setSearchTerm("");
    clearFacetFilters();
  };

  const noResults = filteredPerfumes.length === 0 && filteredFullRangeBrands.length === 0;

  return (
    <section id={id} className="border-t border-border/30 bg-gradient-to-b from-background via-background to-card/20 px-3 py-12 sm:px-4 sm:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <header className="space-y-3">
          <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-primary/90">
            Le carnet Nurea
          </p>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </header>

        {showQuickLinks && (
          <div className="mt-6 rounded-2xl border border-border/35 bg-card/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Acces rapide</p>
              <Link to="/marques" className="text-xs text-primary hover:text-primary/80">
                Toutes les marques
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("Tous");
                  setSelectedBrand("Tous");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  selectedCategory === "Tous"
                    ? "border-primary/45 bg-primary/15 text-primary"
                    : "border-border/45 bg-background/70 text-foreground/90 hover:border-primary/35"
                )}
              >
                Tout voir
              </button>
              {searchableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedBrand("Tous");
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    selectedCategory === category
                      ? "border-primary/45 bg-primary/15 text-primary"
                      : "border-border/45 bg-background/70 text-foreground/90 hover:border-primary/35"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border/35 bg-card/30 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un parfum, une marque..."
                className="h-11 w-full rounded-md border border-border/50 bg-background/80 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/65 focus:border-primary focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  aria-label="Vider la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <label className="relative">
              <span className="sr-only">Trier</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="h-11 min-w-[170px] rounded-md border border-border/50 bg-background/80 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="relevance">Trier: Pertinence</option>
                <option value="az">Trier: Nom A-Z</option>
                <option value="za">Trier: Nom Z-A</option>
                <option value="best">Trier: Best seller</option>
              </select>
            </label>

            <div className="flex gap-2 sm:justify-end lg:hidden">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 flex-1">
                    <Filter className="h-4 w-4" />
                    Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[90vw] max-w-sm">
                  <SheetHeader>
                    <SheetTitle className="font-serif text-2xl font-medium">Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-5 py-3">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categorie</p>
                      <select
                        value={selectedCategory}
                        onChange={(event) => {
                          setSelectedCategory(event.target.value);
                          setSelectedBrand("Tous");
                        }}
                        className="h-11 w-full rounded-md border border-border/50 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Marque</p>
                      <select
                        value={selectedBrand}
                        onChange={(event) => setSelectedBrand(event.target.value)}
                        className="h-11 w-full rounded-md border border-border/50 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        {availableBrands.map((brandName) => (
                          <option key={brandName} value={brandName}>
                            {brandName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Genre</p>
                      <div className="grid grid-cols-3 gap-2">
                        {genderOptions.map((gender) => (
                          <button
                            key={gender.value}
                            type="button"
                            onClick={() => setSelectedGender(gender.value)}
                            className={cn(
                              "h-10 rounded-md border text-xs",
                              selectedGender === gender.value
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border/45 bg-background text-foreground/80"
                            )}
                          >
                            {gender.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" className="h-11 border-primary/45 text-primary hover:bg-primary/10" onClick={resetAll}>
                        Reinitialiser
                      </Button>
                      <Button className="h-11" onClick={() => setMobileFilterOpen(false)}>
                        Appliquer
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredPerfumes.length + filteredFullRangeBrands.length} resultat
              {filteredPerfumes.length + filteredFullRangeBrands.length > 1 ? "s" : ""}
            </span>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
              >
                Recherche: {searchTerm}
                <X className="h-3 w-3" />
              </button>
            )}

            {selectedCategory !== "Tous" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("Tous")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
              >
                {selectedCategory}
                <X className="h-3 w-3" />
              </button>
            )}

            {selectedBrand !== "Tous" && (
              <button
                type="button"
                onClick={() => setSelectedBrand("Tous")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
              >
                {selectedBrand}
                <X className="h-3 w-3" />
              </button>
            )}

            {selectedGender !== "tous" && (
              <button
                type="button"
                onClick={() => setSelectedGender("tous")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
              >
                {selectedGender === "homme" ? "Homme" : "Femme"}
                <X className="h-3 w-3" />
              </button>
            )}

            {(searchTerm || selectedCategory !== "Tous" || selectedBrand !== "Tous" || selectedGender !== "tous" || sortBy !== "relevance") && (
              <button type="button" onClick={resetAll} className="text-xs text-primary hover:text-primary/80">
                Tout effacer
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden rounded-2xl border border-border/35 bg-card/30 p-4 lg:block">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categorie</p>
                <div className="grid gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedBrand("Tous");
                      }}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        selectedCategory === category
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/45 bg-background/70 text-foreground/85 hover:border-primary/35"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Marque</p>
                <select
                  value={selectedBrand}
                  onChange={(event) => setSelectedBrand(event.target.value)}
                  className="h-11 w-full rounded-md border border-border/50 bg-background/80 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {availableBrands.map((brandName) => (
                    <option key={brandName} value={brandName}>
                      {brandName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Genre</p>
                <div className="grid grid-cols-3 gap-2">
                  {genderOptions.map((gender) => (
                    <button
                      key={gender.value}
                      type="button"
                      onClick={() => setSelectedGender(gender.value)}
                      className={cn(
                        "h-10 rounded-md border text-xs",
                        selectedGender === gender.value
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/45 bg-background text-foreground/80"
                      )}
                    >
                      {gender.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="h-11 w-full border-primary/45 text-primary hover:bg-primary/10" onClick={clearFacetFilters}>
                Reinitialiser les filtres
              </Button>
            </div>
          </aside>

          <div className="space-y-8">
            {noResults && (
              <div className="rounded-2xl border border-border/35 bg-card/30 p-6 text-center sm:p-8">
                <h3 className="font-serif text-2xl text-foreground">Aucun resultat pour cette recherche</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                  Essayez un autre mot-cle ou reinitialisez les filtres. Vous pouvez aussi nous contacter directement.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:mx-auto sm:max-w-sm">
                  <Button variant="outline" className="h-11 border-primary/45 text-primary hover:bg-primary/10" onClick={resetAll}>
                    Effacer recherche et filtres
                  </Button>
                  {snapchatUrl ? (
                    <Button asChild className="h-11 bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90">
                      <a href={snapchatUrl} target="_blank" rel="noreferrer">
                        Snapchat
                      </a>
                    </Button>
                  ) : (
                    <Button disabled className="h-11 bg-[#FFFC00] text-black">
                      Snapchat indisponible
                    </Button>
                  )}
                  {whatsappUrl ? (
                    <Button asChild className="h-11 bg-[#25D366] text-white hover:bg-[#25D366]/90">
                      <a href={whatsappUrl} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button disabled className="h-11 bg-[#25D366] text-white">
                      WhatsApp indisponible
                    </Button>
                  )}
                </div>
              </div>
            )}

            {filteredFullRangeBrands.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-2xl text-foreground">Marques en gamme complete</h3>
                  <Link to="/marques" className="text-xs text-primary hover:text-primary/80">
                    Toutes les marques
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFullRangeBrands.map((brand) => (
                    <BrandCard key={brand.id} brand={brand} onClick={() => navigate(`/marques/${brand.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {groupedPerfumes.map(([brandName, brandPerfumes]) => (
              <section key={brandName} className="space-y-4">
                <div className="flex items-end justify-between gap-3 border-b border-border/30 pb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Maison</p>
                    <h3 className="font-serif text-2xl text-foreground">{brandName}</h3>
                  </div>
                  <Link to={buildBrandPath(brandName)} className="text-xs text-primary hover:text-primary/80">
                    Voir la page marque
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {brandPerfumes.map((perfume) => (
                    <PerfumeCard key={perfume.id} perfume={perfume} variant="mobile" onClick={() => navigate(buildProductPath(perfume))} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
