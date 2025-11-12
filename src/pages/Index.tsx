import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Catalogue } from "@/components/Catalogue";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

const Index = () => {
  const filterMenuRef = useRef<(() => void) | null>(null);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const setOpenFilterMenu = useCallback((fn: () => void) => {
    filterMenuRef.current = fn;
  }, []);

  const handleFilterClick = useCallback(() => {
    if (filterMenuRef.current) {
      filterMenuRef.current();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onFilterClick={handleFilterClick} hasActiveFilters={hasActiveFilters} activeFiltersCount={activeFiltersCount} />
      <main>
        <Hero />
        <Catalogue onFilterButtonClick={setOpenFilterMenu} onFiltersChange={setHasActiveFilters} onFiltersCountChange={setActiveFiltersCount} />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
