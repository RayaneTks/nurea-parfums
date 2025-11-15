import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { BestSellers } from "@/components/BestSellers";
import { WhyNurea } from "@/components/WhyNurea";
import { HowToOrder } from "@/components/HowToOrder";
import { Catalogue } from "@/components/Catalogue";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

const Index = () => {
  const filterMenuRef = useRef<(() => void) | null>(null);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const location = useLocation();

  const setOpenFilterMenu = useCallback((fn: () => void) => {
    filterMenuRef.current = fn;
  }, []);

  const handleFilterClick = useCallback(() => {
    if (filterMenuRef.current) {
      filterMenuRef.current();
    }
  }, []);

  // Scroller vers le catalogue si on arrive depuis une autre page avec le hash
  useEffect(() => {
    if (location.hash === "#catalogue" || location.state?.scrollToCatalogue) {
      setTimeout(() => {
        const catalogueSection = document.getElementById("catalogue");
        catalogueSection?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <Header onFilterClick={handleFilterClick} hasActiveFilters={hasActiveFilters} activeFiltersCount={activeFiltersCount} />
      <main>
        <Hero />
        <BestSellers />
        <WhyNurea />
        <HowToOrder />
        <Catalogue onFilterButtonClick={setOpenFilterMenu} onFiltersChange={setHasActiveFilters} onFiltersCountChange={setActiveFiltersCount} />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
